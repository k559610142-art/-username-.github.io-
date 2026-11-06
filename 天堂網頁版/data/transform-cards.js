// 變身卡：收集到的卡才能變身。卡冊資料在 transform-cards-data.js，動畫在 assets/transform-anim/<名稱>/。
// 收集紀錄依角色保存在本機（localStorage），抽卡目前為測試用（免費）。
window.TransformCards = (() => {
  const book = transformCardBook;
  const byName = new Map(book.map(card => [card.n, card]));
  const gradeWeights = {1: 40, 2: 28, 3: 18, 4: 9, 5: 4, 6: 0.9, 7: 0.1, 8: 0};
  const frameMs = 130;
  let owner = '', state = {owned: {}, active: null};

  const storageKey = id => 'lineage-web-transform-cards-v1:' + id;
  function ensure() {
    const id = window.activeCharacterId || '';
    if (id === owner) return !!id;
    owner = id;
    state = {owned: {}, active: null};
    if (!id) return false;
    try {
      const saved = JSON.parse(localStorage.getItem(storageKey(id)) || 'null');
      if (saved && typeof saved.owned === 'object') {
        for (const [name, count] of Object.entries(saved.owned)) if (byName.has(name) && Number.isSafeInteger(count) && count > 0) state.owned[name] = count;
        if (saved.active && state.owned[saved.active]) state.active = saved.active;
      }
    } catch (error) { /* 讀不到就從空卡冊開始 */ }
    applyEffects();
    return true;
  }
  function save() {
    if (!owner) return;
    try { localStorage.setItem(storageKey(owner), JSON.stringify(state)); } catch (error) { /* 私密模式等存不了時只在本次有效 */ }
  }
  function pickCard() {
    const total = Object.values(gradeWeights).reduce((a, b) => a + b, 0);
    let roll = Math.random() * total, grade = 1;
    for (const [g, weight] of Object.entries(gradeWeights)) { roll -= weight; if (roll < 0) { grade = Number(g); break; } }
    let pool = book.filter(card => card.g === grade);
    if (!pool.length) pool = book.filter(card => card.g === 1);
    return pool[Math.floor(Math.random() * pool.length)];
  }
  function draw(times = 1) {
    if (window.gameFlowState !== 'playing' || !ensure()) { toast('請先進入遊戲角色再抽卡。'); return []; }
    const got = [];
    for (let i = 0; i < times; i++) { const card = pickCard(); state.owned[card.n] = (state.owned[card.n] || 0) + 1; got.push(card); }
    save();
    return got;
  }
  function speedPct(card, label) {
    for (const effect of card?.fx || []) { const m = new RegExp('^' + label + ' \\+(\\d+)%').exec(effect); if (m) return Number(m[1]); }
    return 0;
  }
  function applyEffects() {
    const card = state.active ? byName.get(state.active) : null;
    window.playerMovementModifiers = window.playerMovementModifiers || {};
    window.playerMovementModifiers.polyMovePct = speedPct(card, '移動速度');
    window.activeTransformCard = card || null;
    if (card?.wk) loadAtlas(card.wk, card.wx);
  }
  // ---- 3.63 變身設定（L1PolyMorph）：最低等級、可用武器／防具遮罩、能否施法 ----
  const weaponFlags = {dagger: 1, sword: 2, tohandsword: 4, blunt: 8, tohandblunt: 8, spear: 16, singlespear: 16, staff: 32, tohandstaff: 32, edoryu: 64, claw: 128, bow: 256, singlebow: 256, gauntlet: 256, kiringku: 512, chainsword: 1024};
  const armorFlags = {helm: 1, amulet: 2, earring: 4, T: 8, armor: 16, cloak: 32, belt: 64, shield: 128, glove: 256, ring: 512, boots: 1024, guarder: 2048};
  const weaponNames = {1: '匕首', 2: '單手劍', 4: '雙手劍', 8: '斧／鈍器', 16: '矛', 32: '魔杖', 64: '雙刀', 128: '鋼爪', 256: '弓', 512: '奇古獸', 1024: '鎖鏈劍'};
  const armorNames = {1: '頭盔', 2: '項鍊', 4: '耳環', 8: '內衣', 16: '盔甲', 32: '斗篷', 64: '腰帶', 128: '盾牌', 256: '手套', 512: '戒指', 1024: '長靴', 2048: '臂甲'};
  function canEquip(item, card = window.activeTransformCard) {
    const p = card?.p;
    if (!p || !item) return true;
    if (item.kind === 'weapon') { const flag = weaponFlags[item.type]; return flag === undefined || (p.w & flag) !== 0; }
    if (item.kind === 'armor') { const flag = armorFlags[item.type]; return flag === undefined || (p.a & flag) !== 0; }
    return true;
  }
  function describe(mask, names) {
    const all = Object.keys(names).every(bit => mask & bit);
    if (all) return '全部';
    const list = Object.entries(names).filter(([bit]) => mask & bit).map(([, name]) => name);
    return list.length ? list.join('、') : '不能裝備';
  }
  function rules(card) {
    const p = card.p;
    if (!p) return null;
    return {level: p.lv, magic: !!p.m, weapons: describe(p.w, weaponNames), armors: describe(p.a, armorNames), en: p.en, rebirth: p.rb || 0, bonus: card.pb || null};
  }

  function activate(name) {
    if (!ensure()) { toast('請先進入遊戲角色。'); return false; }
    const card = byName.get(name);
    if (!card || !state.owned[name]) { toast('還沒收集到這張變身卡。'); return false; }
    const level = Number(window.activeCharacterLevel) || 1;
    if (card.p && level < card.p.lv) { toast('等級 ' + card.p.lv + ' 以上才能變身為 ' + name + '。'); return false; }
    if (typeof characterMovementBlocked === 'function' && characterMovementBlocked()) { toast('請等目前動作結束。'); return false; }
    // 照 3.63 規則：變身後不能用的裝備自動卸下（被詛咒的卸不下就不能變身）。
    const blocked = (window.OwnedInventory?.items || []).filter(entry => entry.slot && !canEquip(entry.item, card));
    for (const entry of blocked) {
      if (!OwnedInventory.unequip(entry.uid)) { toast(entry.item.name + ' 無法卸下，不能變身。'); return false; }
    }
    state.active = name; save(); applyEffects(); morphStarted = movementTime(); refreshCharacter();
    toast('變身為 ' + name + '（' + card.fx.slice(0, 3).join('、') + '）' + (blocked.length ? '，已卸下 ' + blocked.map(entry => entry.item.name).join('、') : ''));
    return true;
  }
  function deactivate() {
    if (!ensure() || !state.active) return false;
    state.active = null; save(); applyEffects(); refreshCharacter();
    toast('解除變身');
    return true;
  }

  // ---- 變身外觀：蓋在人物位置上，原本職業圖先藏起來 ----
  const morphLayer = document.createElement('div');
  morphLayer.className = 'transform-morph';
  morphLayer.hidden = true;
  const morphShadow = document.createElement('img'), morphBody = document.createElement('img');
  for (const img of [morphShadow, morphBody]) { img.alt = ''; img.draggable = false; img.decoding = 'async'; morphLayer.append(img); }
  morphShadow.className = 'transform-morph-shadow';
  morphBody.className = 'transform-morph-body';
  characterActor.prepend(morphLayer);
  const morphStyle = document.createElement('style');
  morphStyle.textContent = '.transform-morph{position:absolute;left:0;top:0;width:0;height:0;pointer-events:none}.transform-morph img{position:absolute;image-rendering:auto}.transform-morph-shadow{opacity:.6}.transform-morph[hidden]{display:none}';
  document.head.append(morphStyle);
  let morphStarted = 0;
  const framePath = (card, clip, i, shadow) => 'assets/transform-anim/' + encodeURIComponent(card.n) + '/' + clip + (shadow ? '_s_' : '_') + i + (i === 0 ? '.png' : '.webp');
  const flipHeadings = new Set(['W', 'SW', 'NW']);

  // 秋月天堂怪物圖集（8 方向）：d0～d7 依天堂朝向，對應遊戲的 heading。
  const atlasDirs = {NW: 'd0', N: 'd1', NE: 'd2', E: 'd3', SE: 'd4', S: 'd5', SW: 'd6', W: 'd7'};
  const atlasCache = new Map();
  const atlasShadow = document.createElement('div'), atlasBody = document.createElement('div');
  atlasShadow.className = 'transform-atlas transform-morph-shadow';
  atlasBody.className = 'transform-atlas';
  const atlasLight = document.createElement('div');
  atlasLight.className = 'transform-atlas transform-atlas-light';
  atlasLight.hidden = true;
  const extras = document.createElement('div');
  extras.hidden = true;
  extras.className = 'transform-composite-extras';
  const compositeLayers = {shadow: atlasShadow, light: atlasLight, extras};
  morphLayer.append(atlasShadow, atlasBody, atlasLight, extras);
  morphStyle.textContent += '.transform-atlas{position:absolute;background-repeat:no-repeat}.transform-atlas[hidden]{display:none}.transform-atlas-light{mix-blend-mode:screen}';
  // 圖集的 foot 不一定是腳底（秋月圖集腳浮在上方、spr 匯出的陷在下方）：改用 8 方向待機幀腳底的中位數當地面。
  function atlasGround(data) {
    const bottoms = [];
    for (let d = 0; d < 8; d++) {
      const fr = data.frames['d' + d + '/idle'] || data.frames['d' + d + '/walk'] || [];
      if (fr.length) bottoms.push(Math.max(...fr.map(f => f[5] + f[3])));
    }
    if (!bottoms.length) return data.foot;
    bottoms.sort((a, b) => a - b);
    return bottoms[Math.floor(bottoms.length / 2)] - 1;
  }
  function loadAtlas(gfx, ext = 'webp') {
    if (atlasCache.has(gfx)) return atlasCache.get(gfx);
    const entry = {ready: false, data: null, url: 'assets/transform-walk/' + gfx + '.' + ext};
    atlasCache.set(gfx, entry);
    const img = new Image();
    Promise.all([transformAtlasIndex[gfx] || fetch('assets/transform-walk/' + gfx + '.json').then(r => r.json()), new Promise((ok, fail) => { img.onload = ok; img.onerror = fail; img.src = entry.url; })])
      .then(([data]) => { entry.data = data; entry.size = img.naturalWidth; entry.ground = atlasGround(data); entry.ready = true; if (window.activeTransformCard?.wk === gfx) refreshCharacter(); })
      .catch(() => { entry.failed = true; });
    return entry;
  }
  // 天堂走路幀本身帶「走一格」的位移；遊戲已經在移動人物，畫面要把這段位移扣掉才不會滑一下再跳回。
  function placeAtlas(el, atlas, frame, scale, shift = [0, 0]) {
    if (!frame) { el.hidden = true; return; }
    const [x, y, w, h, fx, fy] = frame, cw = atlas.data.cw, dx = fx - shift[0], dy = fy - shift[1];
    el.hidden = false;
    el.style.backgroundImage = 'url("' + atlas.url + '")';
    el.style.backgroundPosition = (-x * scale) + 'px ' + (-y * scale) + 'px';
    el.style.backgroundSize = (atlas.size || 1024) * scale + 'px auto';
    el.style.width = w * scale + 'px'; el.style.height = h * scale + 'px';
    el.style.left = (dx - cw / 2) * scale + 'px'; el.style.top = (dy - (atlas.ground ?? atlas.data.foot)) * scale + 'px';
  }
  function walkPhase(now) {
    if (typeof characterWalkUntil === 'undefined' || now >= characterWalkUntil) return null;
    return Math.max(0, Math.min(.999, (now - characterWalkStarted) / Math.max(1, characterWalkDuration)));
  }

  let displayedNativeCard = null;
  function drawMorph(now) {
    const card = window.activeTransformCard;
    let clip = 'idle', elapsed = now - morphStarted, loop = true;
    const action = typeof characterActionState !== 'undefined' ? characterActionState : null;
    const acting = action && now >= action.started && now < action.until && ['attack', 'skill', 'hurt', 'death'].includes(action.action);
    if (acting && card.f[action.action]) { clip = action.action; elapsed = now - action.started; loop = false; }
    const scale = typeof characterRenderScale === 'function' ? characterRenderScale() : 1;
    const heading = typeof characterHeading === 'string' ? characterHeading : 'E';
    const phase = acting ? null : walkPhase(now);
    const weapon = MonsterActions.equippedWeapon();
    MonsterActions.warmWeapon(card.p?.gfx, heading, weapon);
    const pose = MonsterActions.pose(now);
    if (MonsterActions.draw(atlasBody, card.p?.gfx, heading, pose, scale, weapon, compositeLayers)) {
      displayedNativeCard = card;
      morphBody.hidden = morphShadow.hidden = true;
      return;
    }
    if (displayedNativeCard === card && MonsterActions.hasClip(card.p?.gfx, heading, pose.clip, weapon)) return;
    displayedNativeCard = null;
    atlasLight.hidden = extras.hidden = true;
    // 有 8 方向圖集：待機、走路、攻擊全部用圖集，走路時才不會從網站大圖換成小圖、腳離地像在飄。
    const atlas = card.wk ? loadAtlas(card.wk, card.wx) : null;
    const useAtlas = !!atlas?.ready;
    atlasBody.hidden = atlasShadow.hidden = !useAtlas;
    morphBody.hidden = !!useAtlas;
    if (useAtlas) {
      morphShadow.hidden = true;
      const dir = atlasDirs[heading] || 'd5';
      const name = phase !== null ? 'walk' : acting && atlas.data.frames[dir + '/' + action.action] ? action.action : 'idle';
      const frames = atlas.data.frames[dir + '/' + name] || atlas.data.frames[dir + '/idle'] || (atlas.data.frames[dir + '/walk'] || []).slice(0, 1);
      const index = phase !== null ? Math.floor(phase * frames.length) : name !== 'idle' && acting ? Math.min(frames.length - 1, Math.floor((now - action.started) * frames.length / Math.max(1, action.duration))) : Math.floor(elapsed / (frameMs * 1.5)) % frames.length;
      const shift = name === 'walk' ? MonsterActions.walkOffset(frames, heading, index, true) : [0, 0];
      placeAtlas(atlasBody, atlas, frames[index], scale, shift);
      const shadows = atlas.data.frames[dir + '/' + name + '_s'];
      placeAtlas(atlasShadow, atlas, shadows?.[index], scale, shift);
      return;
    }
    // 網站單方向動畫：有 walk 的用 walk，沒有的用待機加踏步擺動。
    let bob = 0;
    if (phase !== null && card.f.walk) { clip = 'walk'; elapsed = phase * card.f.walk * frameMs; loop = true; }
    else if (phase !== null) bob = -Math.abs(Math.sin(phase * Math.PI * 2)) * 4 * scale;
    const count = card.f[clip] || 1, step = Math.floor(loop ? elapsed / frameMs : elapsed * count / Math.max(1, action.duration));
    const frame = loop ? step % count : Math.min(count - 1, step);
    const flip = flipHeadings.has(heading);
    const body = framePath(card, clip, frame, false);
    if (morphBody.dataset.src !== body) { morphBody.dataset.src = body; morphBody.src = body; }
    const shadowCount = card.s[clip] || 0;
    if (frame < shadowCount) {
      const shadow = framePath(card, clip, frame, true);
      if (morphShadow.dataset.src !== shadow) { morphShadow.dataset.src = shadow; morphShadow.src = shadow; }
      morphShadow.hidden = false;
    } else morphShadow.hidden = true;
    for (const img of [morphBody, morphShadow]) {
      const w = (img.naturalWidth || 0) * scale, h = (img.naturalHeight || 0) * scale;
      img.style.width = w + 'px'; img.style.height = h + 'px';
      img.style.left = (-w / 2) + 'px'; img.style.top = (-h * 0.86 + bob) + 'px';
      img.style.transform = flip ? 'scaleX(-1)' : 'none';
    }
  }
  const baseRefresh = refreshCharacter;
  refreshCharacter = function (frameTime = movementTime()) {
    ensure();
    const morphed = !!window.activeTransformCard && window.gameFlowState === 'playing' && (!characterDead || MonsterActions.hasClip(window.activeTransformCard.p?.gfx, characterHeading, 'death'));
    morphLayer.hidden = !morphed;
    characterBody.style.visibility = morphed ? 'hidden' : '';
    baseRefresh(frameTime);
    if (morphed) drawMorph(frameTime);
    else displayedNativeCard = null;
  };

  return {
    book, draw, activate, deactivate, gradeWeights, canEquip, rules,
    get canCast() { ensure(); return window.activeTransformCard?.p?.m !== 0; },
    owned: name => (ensure(), state.owned[name] || 0),
    get collected() { ensure(); return Object.keys(state.owned).length; },
    get active() { ensure(); return state.active; },
    portrait: card => 'assets/transform-portraits/' + card.p.gfx + '.png'
  };
})();
