// 天地劫天堂系統：魔法娃娃（召喚跟隨）、BOSS 靈魂附魔（武器附魔、攻擊時機率發動）、武魂（裝備後背後出現虛影）。
// 資料：gameCatalogData.dolls、tdj-systems-data.js；紀錄依角色存在 localStorage。取得方式目前是測試按鈕。
window.TdjSystems = (() => {
  const dolls = gameCatalogData.dolls;
  const dollById = new Map(dolls.map(d => [d.id, d]));
  const enchantById = new Map(bossEnchantData.map(e => [e.id, e]));
  const wuhunById = new Map(wuhunData.map(w => [w.id, w]));
  let owner = '', state = null;
  const blank = () => ({dolls: {owned: {}, active: null}, enchant: {stones: {}, weapon: null}, wuhun: {owned: {}, active: null}});
  const key = id => 'lineage-web-tdj-systems-v1:' + id;
  function ensure() {
    const id = window.activeCharacterId || '';
    if (id === owner && state) return !!id;
    owner = id; state = blank();
    if (!id) return false;
    try {
      const saved = JSON.parse(localStorage.getItem(key(id)) || 'null');
      if (saved) {
        for (const [k, n] of Object.entries(saved.dolls?.owned || {})) {const canonical=DOLL_ID_ALIASES[k]||+k;if(dollById.has(canonical)&&Number.isSafeInteger(n)&&n>0)state.dolls.owned[canonical]=Math.min(2147483647,(state.dolls.owned[canonical]||0)+n);}
        const activeDoll=DOLL_ID_ALIASES[saved.dolls?.active]||saved.dolls?.active;if(state.dolls.owned[activeDoll])state.dolls.active=String(activeDoll);
        for (const [k, n] of Object.entries(saved.enchant?.stones || {})) if (enchantById.has(+k) && n > 0) state.enchant.stones[k] = n;
        const w = saved.enchant?.weapon;
        if (w && enchantById.has(w.id) && w.lv >= 1 && w.lv <= 5) state.enchant.weapon = {id: w.id, lv: w.lv, uid: w.uid};
        for (const [k, n] of Object.entries(saved.wuhun?.owned || {})) if (wuhunById.has(+k) && n > 0) state.wuhun.owned[k] = n;
        if (state.wuhun.owned[saved.wuhun?.active]) state.wuhun.active = saved.wuhun.active;
      }
    } catch (error) { /* 讀不到就從空白開始 */ }
    queueMicrotask(render);
    return true;
  }
  function save() { if (owner) try { localStorage.setItem(key(owner), JSON.stringify(state)); } catch (error) { /* 存不了只在本次有效 */ } }
  const playing = () => window.gameFlowState === 'playing' && ensure();
  const pick = list => list[Math.floor(Math.random() * list.length)];
  const dollImage = d => d && (catalogPortraits['dolls-' + d.id]?.[0] || d.img) ? 'assets/interface/catalog-portraits/' + (catalogPortraits['dolls-' + d.id]?.[0] || d.img) : null;
  function imageByName(name) {
    const d = dolls.find(x => x.name.replace(/^.*：/, '') === name && dollImage(x));
    return d ? dollImage(d) : null;
  }
  const enchantImage = e => e.img || imageByName(e.boss);
  // 原版怪物外觀編號來自天地劫 TW13081901.txt。
  const wuhunVisuals = {
  "39265": {
    "gfx": 14084,
    "file": "wuhun-39265.png"
  },
  "39266": {
    "gfx": 16861,
    "file": "wuhun-39266.png"
  },
  "39267": {
    "gfx": 16287,
    "file": "wuhun-39267.png"
  },
  "39268": {
    "gfx": 11490,
    "file": "wuhun-39268.png"
  },
  "39269": {
    "gfx": 12607,
    "file": "wuhun-39269.png"
  },
  "39270": {
    "gfx": 14239,
    "file": "wuhun-39270.png"
  },
  "39271": {
    "gfx": 7539,
    "file": "wuhun-39271.png"
  },
  "39272": {
    "gfx": 8036,
    "file": "wuhun-39272.png"
  },
  "39273": {
    "gfx": 7864,
    "file": "wuhun-39273.png"
  },
  "39274": {
    "gfx": 15492,
    "file": "wuhun-39274.png"
  },
  "39275": {
    "gfx": 16633,
    "file": "wuhun-39275.png"
  },
  "39276": {
    "gfx": 16704,
    "file": "wuhun-39276.png"
  },
  "39277": {
    "gfx": 16674,
    "file": "wuhun-39277.png"
  },
  "39278": {
    "gfx": 16662,
    "file": "wuhun-39278.png"
  },
  "39279": {
    "gfx": 16896,
    "file": "wuhun-39279.png"
  },
  "39280": {
    "gfx": 16930,
    "file": "wuhun-39280.png"
  },
  "39281": {
    "gfx": 16621,
    "file": "wuhun-39281.png"
  },
  "39282": {
    "gfx": 16578,
    "file": "wuhun-39282.png"
  },
  "39283": {
    "gfx": 16872,
    "file": "wuhun-39283.png"
  },
  "39284": {
    "gfx": 16734,
    "file": "wuhun-39284.png"
  },
  "39285": {
    "gfx": 22021,
    "file": "wuhun-39285.png"
  },
  "39286": {
    "gfx": 10851,
    "file": "wuhun-39286.png"
  },
  "39291": {
    "gfx": 4851,
    "file": "wuhun-39291.png"
  },
  "39292": {
    "gfx": 7559,
    "file": "wuhun-39292.png"
  },
  "39293": {
    "gfx": 12589,
    "file": "wuhun-39293.png"
  },
  "39294": {
    "gfx": 5072,
    "file": "wuhun-39294.png"
  },
  "39295": {
    "gfx": null,
    "file": "wuhun-39295.png"
  },
  "39296": {
    "gfx": null,
    "file": "wuhun-39296.png"
  },
  "39297": {
    "gfx": null,
    "file": "wuhun-39297.png"
  },
  "39298": {
    "gfx": 13106,
    "file": "wuhun-39298.png"
  },
  "39299": {
    "gfx": 16905,
    "file": "wuhun-39299.png"
  },
  "39300": {
    "gfx": 13177,
    "file": "wuhun-39300.png"
  },
  "39301": {
    "gfx": 12895,
    "file": "wuhun-39301.png"
  },
  "39302": {
    "gfx": 12846,
    "file": "wuhun-39302.png"
  },
  "39303": {
    "gfx": 2118,
    "file": "wuhun-39303.png"
  },
  "39304": {
    "gfx": 14179,
    "file": "wuhun-39304.png"
  },
  "39305": {
    "gfx": 10573,
    "file": "wuhun-39305.png"
  },
  "39306": {
    "gfx": 8128,
    "file": "wuhun-39306.png"
  },
  "39307": {
    "gfx": 2749,
    "file": "wuhun-39307.png"
  },
  "39308": {
    "gfx": 2738,
    "file": "wuhun-39308.png"
  },
  "39309": {
    "gfx": 2741,
    "file": "wuhun-39309.png"
  },
  "39310": {
    "gfx": 2747,
    "file": "wuhun-39310.png"
  },
  "39311": {
    "gfx": 3415,
    "file": "wuhun-39311.png"
  },
  "39312": {
    "gfx": 2308,
    "file": "wuhun-39312.png"
  },
  "39313": {
    "gfx": 854,
    "file": "wuhun-39313.png"
  }
};
  const wuhunImage = w => wuhunVisuals[w.id]?.file ? "assets/interface/wuhun/" + wuhunVisuals[w.id].file : null;
  const wuhunBaseGfx = w => wuhunVisuals[w.id]?.gfx ?? null;

  // ---- 畫面：娃娃跟在旁邊、武魂虛影在背後、附魔發動時 BOSS 閃現 ----
  const style = document.createElement('style');
  style.textContent = '.tdj-layer{position:absolute;left:0;top:0;width:0;height:0;pointer-events:none}' +
    '.tdj-phantom{position:absolute;opacity:.48;image-rendering:pixelated;animation:tdjFloat 3.2s ease-in-out infinite;transform-origin:50% 100%}' +
    '.tdj-phantom-animated{animation:none;background-repeat:no-repeat}.tdj-phantom-group{position:absolute;left:0;top:0;opacity:.48;transform-origin:0 0}.tdj-phantom-group.phoenix-phantom{opacity:.64}.tdj-phantom-group .tdj-phantom-animated{opacity:1}.tdj-phantom-fx{opacity:.85}' +
    '.tdj-phantom.tdj-aura{width:56px;height:14px;left:-28px;top:-7px;border-radius:50%;background:radial-gradient(closest-side,var(--tdj-aura,#ffd27a88),transparent);opacity:.38;animation:none}' +
    '.tdj-doll{position:absolute;transform:translate(-50%,-100%);width:calc(27px * var(--character-size-factor,1));height:calc(30px * var(--character-size-factor,1));object-fit:contain;object-position:bottom center;pointer-events:none;filter:drop-shadow(0 2px 2px #0008)}' +
    '.tdj-flash{position:absolute;opacity:0;animation:tdjFlash 1s ease-out forwards;filter:drop-shadow(0 0 14px #ff5a3a) brightness(1.4)}' +
    '@keyframes tdjFloat{0%,100%{transform:translateY(0) scale(1.35)}50%{transform:translateY(-4px) scale(1.35)}}' +
    '@keyframes tdjFlash{0%{opacity:0;transform:scale(1.2)}25%{opacity:.85;transform:scale(1.8)}100%{opacity:0;transform:scale(2.2)}}';
  document.head.append(style);
  const back = document.createElement('div'), front = document.createElement('div');
  back.className = front.className = 'tdj-layer';
  back.style.zIndex = '0'; front.style.zIndex = '3';
  characterActor.prepend(back); characterActor.append(front);
  const tierColor = {下品: '#9fd0ff88', 上品: '#8fffb088', 極品: '#d698ff88', 千年: '#ffb35a88', 萬年: '#ff7b7b88', 上古: '#ffe27a99', 四神獸: '#7ee8e099'};
  function placeImage(img, wScale, anchorY) {
    const fit = () => { const s = (typeof characterRenderScale === 'function' ? characterRenderScale() : 1) * wScale, w = img.naturalWidth * s, h = img.naturalHeight * s; img.style.width = w + 'px'; img.style.height = h + 'px'; img.style.left = (-w / 2) + 'px'; img.style.top = (-h * anchorY) + 'px'; };
    if (img.complete && img.naturalWidth) fit(); else img.onload = fit;
  }
  let phantom = null, dollSprite = null;
  // Projected one-tile offsets behind the actor, based on the direction it faces.
  const dollBehind = {N: [0, 24], NE: [-24, 12], E: [-48, 0], SE: [-24, -12],
    S: [0, -24], SW: [24, -12], W: [48, 0], NW: [24, 12]};
  function positionDoll() {
    if (!dollSprite) return;
    const [x, y] = dollBehind[characterHeading];
    dollSprite.style.left = (x * zoom) + 'px';
    dollSprite.style.top = (y * zoom) + 'px';
    const layer = y < 0 ? back : front;
    if (dollSprite.parentNode !== layer) layer.append(dollSprite);
  }
  function drawPhantom(now) {
    if (!phantom || window.gameFlowState !== 'playing') return;
    const {sprite, fallback, gfx, layers, group, fx} = phantom;
    const scale = characterRenderScale();
    const phoenix = gfx === 22003;
    const [offsetX, offsetY] = phoenix ? [22, 9] : [7, 5];
    group.style.transform = 'translate(' + offsetX * scale + 'px,' + offsetY * scale + 'px) scale(' + (phoenix ? .58 : .9) + ')';
    const {pose, effects} = WuhunAutoCast.update(phantom, now, MonsterActions.pose(now), !document.hidden && document.querySelector('#panel').hidden);
    const drawn = MonsterActions.draw(sprite, gfx, pose.heading || characterHeading, pose, scale, null, layers)
      || MonsterActions.draw(sprite, gfx, characterHeading, {clip: 'idle', time: now}, scale, null, layers);
    sprite.hidden = !drawn;
    if (fallback) fallback.hidden = drawn;
    // Paint the dark pass first, then the colored flame and highlights.
    const orderedEffects = [...effects.filter(([attr]) => attr === 128), ...effects.filter(([attr]) => attr !== 128)];
    orderedEffects.forEach(([attribute, frame], i) => {
      let node = fx.children[i];
      if (!node) {
        node = document.createElement('div');
        node.className = 'transform-atlas tdj-phantom-fx';
        fx.append(node);
      }
      node.style.mixBlendMode = attribute === 8 ? 'screen' : 'normal';
      node.style.opacity = attribute === 128 ? '.42' : '';
      node.hidden = !MonsterActions.paintSprite(node, frame, frame[1] + offsetX, frame[2] + offsetY, scale);
    });
    for (let i = effects.length; i < fx.children.length; i++) fx.children[i].hidden = true;
  }
  function render() {
    const previousPhantom = phantom;
    phantom = dollSprite = null;
    back.replaceChildren(); front.replaceChildren();
    if (!owner || window.gameFlowState !== 'playing') return;
    const w = wuhunById.get(+state.wuhun.active);
    if (w) {
      const src = wuhunImage(w);
      const color = tierColor[w.tier] || '#ffd27a88';
      const aura = () => {
        const glow = document.createElement('div');
        glow.className = 'tdj-phantom tdj-aura';
        glow.style.setProperty('--tdj-aura', color);
        return glow;
      };
      let fallback;
      if (src) {
        const img = new Image();
        img.className = 'tdj-phantom';
        img.alt = '';
        img.style.setProperty('--tdj-aura', color);
        fallback = img;
        img.onerror = () => { const glow = aura(); img.replaceWith(glow); if (phantom?.fallback === img) phantom.fallback = glow; };
        img.onload = () => placeImage(img, 1, 1.12);
        back.append(img);
        img.src = src;
      } else { fallback = aura(); back.append(fallback); }
      if (MonsterActions.has(w.skin)) {
        const sprite = document.createElement('div');
        sprite.className = 'tdj-phantom tdj-phantom-animated';
        sprite.style.setProperty('--tdj-aura', color);
        sprite.hidden = true;
        const group = document.createElement('div'), fx = document.createElement('div');
        group.className = 'tdj-phantom-group' + (w.skin === 22003 ? ' phoenix-phantom' : '');
        const layers = {shadow: document.createElement('div'), light: document.createElement('div'), extras: document.createElement('div')};
        layers.shadow.className = layers.light.className = 'transform-atlas';
        layers.shadow.hidden = layers.light.hidden = layers.extras.hidden = true;
        group.append(layers.shadow, sprite, layers.light, layers.extras);
        back.append(group, fx);
        const activeCast = previousPhantom?.owner === owner && previousPhantom.gfx === w.skin ? previousPhantom : null;
        phantom = {sprite, fallback, gfx: w.skin, owner, layers, group, fx, cast: activeCast?.cast, nextCast: activeCast?.nextCast};
        MonsterActions.preload(w.skin, characterHeading, ['skill', 'bossCastGesture', 'bossCastStart', 'bossCastLoop', 'bossCastEnd']);
        drawPhantom(movementTime());
      }
    }
    const d = dollById.get(+state.dolls.active);
    const dollSrc = d && dollImage(d);
    if (dollSrc) {
      const img = new Image();
      img.className = 'tdj-doll';
      img.alt = d.name.replace(/^.*：/, '');
      img.draggable = false;
      img.src = dollSrc;
      dollSprite = img;
      positionDoll();
    }
  }
  function flash(src) {
    if (!src) return;
    const img = new Image(); img.className = 'tdj-flash'; img.src = src; img.alt = '';
    placeImage(img, 1, 0.9); back.append(img); setTimeout(() => img.remove(), 1100);
  }

  // ---- 魔法娃娃 ----
  function drawDoll() {
    if (!playing()) { toast('請先進入遊戲角色。'); return null; }
    const d = pick(dolls); state.dolls.owned[d.id] = (state.dolls.owned[d.id] || 0) + 1; save(); return d;
  }
  function summon(id) {
    if (!playing()) return false;
    const d = dollById.get(+id); if (!d || !state.dolls.owned[id]) { toast('還沒有這隻魔法娃娃。'); return false; }
    state.dolls.active = String(id); save(); render();
    toast('召喚 ' + d.name.replace(/^.*：/, '') + '（' + (d.effects.slice(0, 3).join('、') || '無能力') + '）'); return true;
  }
  function dismiss() { if (!playing() || !state.dolls.active) return false; state.dolls.active = null; save(); render(); toast('魔法娃娃已解除召喚'); return true; }

  // ---- BOSS 靈魂附魔 ----
  const equippedWeapon = () => (window.OwnedInventory?.items || []).find(e => e.slot === 'weapon');
  function getStone(id) {
    if (!playing()) { toast('請先進入遊戲角色。'); return null; }
    const e = id ? enchantById.get(+id) : pick(bossEnchantData); state.enchant.stones[e.id] = (state.enchant.stones[e.id] || 0) + 1; save(); return e;
  }
  function currentEnchant() {
    ensure();
    const w = state.enchant.weapon, weapon = equippedWeapon();
    if (!w || !weapon || weapon.uid !== w.uid) return null;
    return {...w, data: enchantById.get(w.id), level: enchantById.get(w.id).levels[w.lv - 1], weapon};
  }
  function enchant(id) {
    if (!playing()) return false;
    const e = enchantById.get(+id), weapon = equippedWeapon();
    if (!state.enchant.stones[id]) { toast('沒有' + e.stone + '。'); return false; }
    if (!weapon) { toast('請先裝備武器再附魔。'); return false; }
    const cur = state.enchant.weapon && state.enchant.weapon.uid === weapon.uid && state.enchant.weapon.id === e.id ? state.enchant.weapon.lv : 0;
    if (cur >= e.levels.length) { toast('已經是最高階 ' + e.levels[cur - 1].name + '。'); return false; }
    const next = e.levels[cur];
    state.enchant.stones[id]--; if (!state.enchant.stones[id]) delete state.enchant.stones[id];
    const ok = Math.random() * 100 < next.rate;
    if (ok) state.enchant.weapon = {id: e.id, lv: cur + 1, uid: weapon.uid};
    save();
    toast(ok ? '強大的 BOSS 靈魂技能附魔成功了：' + weapon.item.name + ' 獲得 ' + next.name : '很抱歉，您的附魔失敗了（成功率 ' + next.rate + '%）。');
    if (ok) flash(enchantImage(e));
    return ok;
  }
  function onAttack() {
    const cur = currentEnchant(); if (!cur) return;
    if (Math.random() * 100 >= cur.level.proc) return;
    flash(enchantImage(cur.data));
    const extra = cur.level.dmg || cur.level.rnd ? '，傷害 ' + cur.level.dmg + '～' + (cur.level.dmg + cur.level.rnd) + (cur.level.drain ? '、吸血 ' + cur.level.drain : '') : '';
    toast(cur.level.name + ' 發動「' + cur.data.skill + '」' + extra, 'journal');
  }

  // ---- 武魂 ----
  function getWuhun(id) {
    if (!playing()) { toast('請先進入遊戲角色。'); return null; }
    const w = id ? wuhunById.get(+id) : pick(wuhunData); state.wuhun.owned[w.id] = (state.wuhun.owned[w.id] || 0) + 1; save(); return w;
  }
  function equipWuhun(id) {
    if (!playing()) return false;
    const w = wuhunById.get(+id); if (!w || !state.wuhun.owned[id]) { toast('還沒有這個武魂。'); return false; }
    state.wuhun.active = String(id); save(); render(); flash(wuhunImage(w));
    toast('裝備 ' + w.name + '（' + w.fx.slice(0, 4).join('、') + '）'); return true;
  }
  function unequipWuhun() { if (!playing() || !state.wuhun.active) return false; state.wuhun.active = null; save(); render(); toast('卸下武魂'); return true; }

  // 進出遊戲、換角色時重畫
  const baseRefresh = refreshCharacter;
  refreshCharacter = function (...args) { const before = owner; ensure(); if (before !== owner) render(); const result = baseRefresh.apply(this, args); drawPhantom(args[0] ?? movementTime()); positionDoll(); return result; };

  const get = () => (ensure(), state);
  return {
    dolls: {draw: drawDoll, summon, dismiss, image: dollImage, owned: id => get().dolls.owned[id] || 0, get active() { return get().dolls.active; }},
    enchant: {get: getStone, enchant, current: currentEnchant, image: enchantImage, stones: id => get().enchant.stones[id] || 0},
    wuhun: {get: getWuhun, equip: equipWuhun, unequip: unequipWuhun, image: wuhunImage, baseGfx: wuhunBaseGfx, owned: id => get().wuhun.owned[id] || 0, get active() { return get().wuhun.active; }},
    onAttack, render
  };
})();
