// 天地劫天堂系統：魔法娃娃（召喚跟隨）、BOSS 靈魂附魔（武器附魔、攻擊時機率發動）、武魂（裝備後背後出現虛影）。
// 資料：gameCatalogData.dolls、tdj-systems-data.js；紀錄依角色存在 localStorage。取得方式目前是測試按鈕。
window.TdjSystems = (() => {
  const dolls = gameCatalogData.dolls;
  const dollById = new Map(dolls.map(d => [d.id, d]));
  const enchantById = new Map(bossEnchantData.map(e => [e.id, e]));
  const wuhunById = new Map(wuhunData.map(w => [w.id, w]));
  let owner = '', state = null;
  const blank = () => ({dolls: {owned: {}, active: null}, enchant: {stones: {}, weapon: null}, wuhun: {owned: {}, active: null, ringSlots:Array(6).fill(null), ringV:2}});
  // 魂槽升階（2026-11-15 使用者設計）：品級順序；第 i 槽只能獻祭第 i 階武魂（放入即消耗、不能拿回、不給能力）；裝備第 N 階武魂要前 N 槽都已獻祭
  const WUHUN_TIERS = ['下品', '上品', '極品', '千年', '萬年', '上古', '四神獸'];
  function ringMissing(w) { const t = WUHUN_TIERS.indexOf(w?.tier); const out = []; for (let i = 0; i < Math.min(Math.max(t, 0), 6); i++) if (state.wuhun.ringSlots[i] == null) out.push(WUHUN_TIERS[i]); return out; }
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
        for (const [k, n] of Object.entries(saved.wuhun?.owned || {})) if (wuhunById.has(+k) && Number.isSafeInteger(n) && n > 0) state.wuhun.owned[k] = n;
        if (state.wuhun.owned[saved.wuhun?.active]) state.wuhun.active = saved.wuhun.active;
        if (saved.wuhun?.ringV === 2) { for (let i = 0; i < 6; i++) { const id = Number(saved.wuhun?.ringSlots?.[i]), rw = wuhunById.get(id); if (rw && WUHUN_TIERS.indexOf(rw.tier) === i) state.wuhun.ringSlots[i] = id; } }
        else for (const [id, n] of Object.entries(saved.wuhun?.ringOwned || {})) if (wuhunById.has(+id) && Number.isSafeInteger(n) && n > 0) state.wuhun.owned[id] = Math.min(2147483647, (state.wuhun.owned[id] || 0) + n); // 舊版魂環（多餘武魂煉的）退回成武魂
        if (state.wuhun.active && ringMissing(wuhunById.get(+state.wuhun.active)).length) state.wuhun.active = null; // 魂槽條件不夠的武魂先卸下

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
    '@keyframes tdjFlash{0%{opacity:0;transform:scale(1.2)}25%{opacity:.85;transform:scale(1.8)}100%{opacity:0;transform:scale(2.2)}}' +
    // 魂環光圈（2026-11-15 使用者要「武魂光暈特效在人物腳底浮現」）：環位每放一個魂環＝腳底一圈，照品級上色；外框壓扁成地面透視，流光轉、整圈呼吸
    '.tdj-rings{position:absolute;left:0;top:0;width:0;height:0;--s:1}' +
    '.tdj-ring{position:absolute;left:calc(var(--r) * var(--s) * -1px);top:calc(var(--r) * var(--s) * -1px);width:calc(var(--r) * var(--s) * 2px);height:calc(var(--r) * var(--s) * 2px);transform:translateY(calc(var(--s) * (2px - var(--rise, 0) * 1px))) scaleY(.42);animation:tdjRingPulse 2.6s ease-in-out infinite;animation-delay:var(--d)}' +
    // 以 SVG 顯示原始六色參考圖：只校正幾何與去除黑底，保留 RGB；外層壓成地面透視。
    '.tdj-ring>svg{position:absolute;left:-19.44%;top:-19.44%;width:138.89%;height:138.89%;max-width:none;pointer-events:none;animation:tdjRingSpin var(--t) linear infinite;filter:none}' +
    '.tdj-ring-far{clip-path:inset(-30% -30% 50% -30%)}.tdj-ring-near{clip-path:inset(50% -30% -30% -30%)}.tdj-dragon-ring{transform:translateY(calc(var(--s) * var(--rise) * -1px));animation:none}.tdj-dragon-ring>svg{animation:none}' +
    '.tdj-rings.idle .tdj-ring{opacity:.35;animation:none}' +
    '@keyframes tdjRingSpin{to{transform:rotate(360deg)}}' +
    '@keyframes tdjRingPulse{0%,100%{opacity:1}50%{opacity:1}}';
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
  // 魂環顏色（依武魂品級；仿「十年白、百年黃、千年紫、萬年黑、十萬年紅」，上古紅、四神獸金）：[環色, 光暈]
  const ringColors = {下品: ['#f8fbff', '#e8efffff'], 上品: ['#ffca16', '#ffb820ee'], 極品: ['#b635ff', '#ad27ffef'], 千年: ['#7515d8', '#7816d8dd'],
    萬年: ['#e51625', '#d80818df'], 上古: ['#ff202b', '#ff1228f0'], 四神獸: ['#ffcc33', '#ffe9a0cc']};
  let ringLayer = null, ringFrontLayer = null;
  function buildRings() {
    ringLayer = null;
    const slots = state.wuhun.ringSlots || [];
    const rings = slots.map(id => id === null ? null : wuhunById.get(+id)).filter(Boolean);
    if (!rings.length) return;
    const box = document.createElement('div');
    box.className = 'tdj-rings' + (state.wuhun.active ? '' : ' idle'); // 沒裝武魂＝魂環加成沒生效，光圈淡、不動
    const foreground = document.createElement('div');
    foreground.className = box.className + ' tdj-rings-front';
    function surround(ring, upright = false) {
      if (upright) { box.prepend(ring); return; }
      const near = ring.cloneNode(true);
      ring.classList.add('tdj-ring-far');
      near.classList.add('tdj-ring-near');
      box.prepend(ring); foreground.append(near);
    }
    rings.forEach((w, i) => {
      const [c, g] = ringColors[w.tier] || ringColors.下品;
      const ring = document.createElement('div');
      const level = WUHUN_TIERS.indexOf(w.tier);
      ring.className = 'tdj-ring';ring.dataset.tier=w.tier;
      ring.style.cssText = '--r:' + SoulRingVisuals.layout[level].radius + ';--rise:' + SoulRingVisuals.layout[level].rise + ';--c:' + c + ';--g:' + g + ';--t:' + (16 + i * 4) + 's;--d:' + (-i * .4) + 's';
      const pic = SoulRingVisuals.create(WUHUN_TIERS.indexOf(w.tier) + 1);
      if (i % 2) pic.style.animationDirection = 'reverse';
      // 使用核准預覽的透明素材，紫環與黑環保留加深的實體環帶。
      ring.append(pic);
      ring.title = w.name.replace('武魂', '魂環');
      surround(ring); // 六環由腳下逐層升高；前半圈繞到人物前面。
    });
    const activeSoul = wuhunById.get(+state.wuhun.active);
    if (SoulRingVisuals.dragonEnabled(slots, activeSoul?.tier)) {
      const dragon = document.createElement('div');
      dragon.className = 'tdj-ring tdj-dragon-ring';
      dragon.style.cssText = '--r:' + SoulRingVisuals.dragonLayout.radius + ';--d:0s;--rise:' + SoulRingVisuals.dragonLayout.rise;
      dragon.append(SoulRingVisuals.create(7));
      surround(dragon);
    }
    back.prepend(box); // 最底層：在人物、武魂虛影下面
    front.prepend(foreground);
    ringFrontLayer = foreground;
    ringLayer = box;
    positionRings();
  }
  function positionRings() {
    if (ringFrontLayer) ringFrontLayer.style.setProperty('--s', String((typeof characterRenderScale === 'function' ? characterRenderScale() : 1)));
    if (ringLayer) ringLayer.style.setProperty('--s', String((typeof characterRenderScale === 'function' ? characterRenderScale() : 1)));
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
    back.replaceChildren(); front.replaceChildren(); ringLayer = ringFrontLayer = null;
    if (!owner || window.gameFlowState !== 'playing') return;
    const w = wuhunById.get(+state.wuhun.active);
    buildRings();
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

  function refreshSoulStats(){window.DBGameRules?.syncVitals();window.stats?.();}
  function changeRings(kind,id){
    if(!playing()||window.CharacterActions?.dead||kind!=='offer')return false;
    const w=wuhunById.get(+id),s=state.wuhun,slot=WUHUN_TIERS.indexOf(w?.tier);
    if(!w||slot<0||slot>=6){toast('四神獸武魂不能當祭品。');return false;}
    for(let i=0;i<slot;i++)if(s.ringSlots[i]==null){toast('要先在第 '+(i+1)+' 槽獻祭'+WUHUN_TIERS[i]+'武魂。');return false;}
    const spare=(s.owned[w.id]||0)-(String(s.active)===String(w.id)?1:0);
    if(spare<1){toast(String(s.active)===String(w.id)?'裝備中的這隻不能獻祭，請先卸下或再取得一隻。':'沒有可獻祭的'+w.name+'。');return false;}
    const old=JSON.parse(JSON.stringify(state));
    s.owned[w.id]--;if(!s.owned[w.id])delete s.owned[w.id];s.ringSlots[slot]=w.id;
    try{localStorage.setItem(key(owner),JSON.stringify(state));}catch(error){state=old;toast('儲存失敗，魂槽未變更。');return false;}
    toast('獻祭 '+w.name+'，第 '+(slot+1)+' 魂槽點亮（'+w.tier+'）');
    refreshSoulStats();render();return true; // render：腳底魂環光圈跟著換
  }
  // ---- 武魂 ----
  function getWuhun(id) {
    if (!playing()) { toast('請先進入遊戲角色。'); return null; }
    const w = id ? wuhunById.get(+id) : pick(wuhunData); state.wuhun.owned[w.id] = (state.wuhun.owned[w.id] || 0) + 1; save(); return w;
  }
  function equipWuhun(id) {
    if (!playing()) return false;
    const w = wuhunById.get(+id); if (!w || !state.wuhun.owned[id]) { toast('還沒有這個武魂。'); return false; }
    const missing = ringMissing(w); if (missing.length) { toast('裝備' + w.tier + '武魂前，要先在魂槽獻祭：' + missing.join('、') + '武魂。'); return false; }
    state.wuhun.active = String(id); save(); refreshSoulStats();render(); flash(wuhunImage(w));
    window.dispatchEvent?.(new Event('wuhun-equipment-change'));
    toast('裝備 ' + w.name + '（' + w.fx.slice(0, 4).join('、') + '）'); return true;
  }
  function unequipWuhun() { if (!playing() || !state.wuhun.active) return false; state.wuhun.active = null; save(); refreshSoulStats();render(); window.dispatchEvent?.(new Event('wuhun-equipment-change')); toast('卸下武魂'); return true; }

  // 進出遊戲、換角色時重畫
  const baseRefresh = refreshCharacter;
  refreshCharacter = function (...args) { const before = owner; ensure(); if (before !== owner) render(); const result = baseRefresh.apply(this, args); drawPhantom(args[0] ?? movementTime()); positionDoll(); positionRings(); return result; };

  // 2026-11-17：背包裡的魔法娃娃／武魂道具（扭蛋機、製作取得）雙擊 → 收進圖鑑變成擁有（道具消失、擁有數 +1）。
  //  原本擁有數只能靠圖鑑測試按鈕增加，扭蛋抽到的道具只會躺在背包裡。
  function useItem(uid) {
    const e = window.OwnedInventory?.items.find(x => x.uid === uid);
    if (!e || e.item?.kind !== 'etcitem') return null;
    const dollId = (typeof DOLL_ID_ALIASES !== 'undefined' && DOLL_ID_ALIASES[e.item.id]) || e.item.id;
    const doll = dollById.get(+dollId), soul = doll ? null : wuhunById.get(+e.item.id);
    if (!doll && !soul) return null;
    if (!playing()) { toast('請先進入遊戲角色。'); return false; }
    if (!OwnedInventory.discard([uid])) { toast('這個道具目前無法收進圖鑑。'); return false; }
    const n = e.count || 1;
    if (doll) state.dolls.owned[doll.id] = Math.min(2147483647, (state.dolls.owned[doll.id] || 0) + n);
    else state.wuhun.owned[soul.id] = Math.min(2147483647, (state.wuhun.owned[soul.id] || 0) + n);
    save(); render();
    toast((doll ? '魔法娃娃「' + doll.name + '」' : '武魂「' + soul.name + '」') + '已收進圖鑑' + (n > 1 ? ' ×' + n : '') + '，可到圖鑑' + (doll ? '召喚' : '裝備') + '。');
    return true;
  }
  const get = () => (ensure(), state);
  return {
    useItem,
    dolls: {draw: drawDoll, summon, dismiss, image: dollImage, owned: id => get().dolls.owned[id] || 0, get active() { return get().dolls.active; }},
    enchant: {get: getStone, enchant, current: currentEnchant, image: enchantImage, stones: id => get().enchant.stones[id] || 0},
    wuhun: {changeRings,tiers:WUHUN_TIERS,ringMissing:id=>(ensure(),ringMissing(wuhunById.get(+id))),get ringState(){ensure();return JSON.parse(JSON.stringify({slots:state.wuhun.ringSlots}));},get: getWuhun, equip: equipWuhun, unequip: unequipWuhun, image: wuhunImage, baseGfx: wuhunBaseGfx, owned: id => get().wuhun.owned[id] || 0, get active() { return get().wuhun.active; }},
    onAttack, render
  };
})();
