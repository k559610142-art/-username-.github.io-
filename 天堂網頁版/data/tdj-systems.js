// 天地劫天堂系統：魔法娃娃（召喚跟隨）、BOSS 靈魂附魔（武器附魔、攻擊時機率發動）、武魂（裝備後背後出現虛影）。
// 資料：gameCatalogData.dolls、tdj-systems-data.js；紀錄依角色存在 localStorage。取得方式目前是測試按鈕。
window.TdjSystems = (() => {
  const dolls = gameCatalogData.dolls;
  const dollById = new Map(dolls.map(d => [d.id, d]));
  const enchantById = new Map(bossEnchantData.map(e => [e.id, e]));
  const wuhunById = new Map(wuhunData.map(w => [w.id, w]));
  let restoredEnchant = null;
  let owner = '', state = null;
  const blank = () => ({dolls: {owned: {}, active: null}, enchant: {stones: {}, weapons: Object.create(null)}, wuhun: {owned: {}, active: null, ringSlots:Array(6).fill(null), ringV:2, rings: {}}});
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
      const savedEnchant = restoredEnchant?.owner === id ? restoredEnchant.value ?? saved?.enchant : saved?.enchant;
      if (savedEnchant) {
        for (const [k, n] of Object.entries(savedEnchant.stones || {})) if (enchantById.has(+k) && n > 0) state.enchant.stones[k] = n;
        const w = savedEnchant.weapon;
        const weapons = {...savedEnchant.weapons};
        if (typeof w?.uid === 'string' && !Object.hasOwn(weapons, w.uid)) weapons[w.uid] = w;
        for (const [uid, record] of Object.entries(weapons)) {
          const id = record?.id, lv = record?.lv;
          if (uid && Number.isInteger(lv) && lv >= 1 && enchantById.get(id)?.levels[lv - 1]) {
            state.enchant.weapons[uid] = {id, lv};
          }
        }
      }
      if (saved) {
        for (const [k, n] of Object.entries(saved.dolls?.owned || {})) {const canonical=DOLL_ID_ALIASES[k]||+k;if(dollById.has(canonical)&&Number.isSafeInteger(n)&&n>0)state.dolls.owned[canonical]=Math.min(2147483647,(state.dolls.owned[canonical]||0)+n);}
        const activeDoll=DOLL_ID_ALIASES[saved.dolls?.active]||saved.dolls?.active;if(state.dolls.owned[activeDoll])state.dolls.active=String(activeDoll);
        for (const [k, n] of Object.entries(saved.wuhun?.owned || {})) if (wuhunById.has(+k) && Number.isSafeInteger(n) && n > 0) state.wuhun.owned[k] = n;
        if (state.wuhun.owned[saved.wuhun?.active]) state.wuhun.active = saved.wuhun.active;
        if (saved.wuhun?.ringV === 2) { for (let i = 0; i < 6; i++) { const id = Number(saved.wuhun?.ringSlots?.[i]), rw = wuhunById.get(id); if (rw && WUHUN_TIERS.indexOf(rw.tier) === i) state.wuhun.ringSlots[i] = id; } }
        else for (const [id, n] of Object.entries(saved.wuhun?.ringOwned || {})) if (wuhunById.has(+id) && Number.isSafeInteger(n) && n > 0) state.wuhun.owned[id] = Math.min(2147483647, (state.wuhun.owned[id] || 0) + n); // 舊版魂環（多餘武魂煉的）退回成武魂
        for (const [t, n] of Object.entries(saved.wuhun?.rings || {})) if (+t >= 0 && +t < 6 && Number.isSafeInteger(n) && n > 0) state.wuhun.rings[t] = n; // 融合出的魂環（2026-11-17）
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
    '.tdj-layer.tdj-mobile-effects .tdj-ring,.tdj-layer.tdj-mobile-effects .tdj-ring>svg,.tdj-layer.tdj-mobile-effects .tdj-phantom{animation:none}' +
    '.tdj-mobile-effects .tdj-dragon-glow{border:2px solid #ffd16b88;border-radius:50%;box-sizing:border-box;transform:translateY(calc(var(--s) * var(--rise) * -1px)) scaleY(.42)}' +
    '@keyframes tdjRingSpin{to{transform:rotate(360deg)}}' +
    '@keyframes tdjRingPulse{0%,100%{opacity:1}50%{opacity:1}}';
  document.head.append(style);
  const back = document.createElement('div'), front = document.createElement('div');
  back.className = front.className = 'tdj-layer';
  const lightEffects=window.matchMedia('(pointer: coarse) and (max-width: 1024px), (max-width: 650px)');
  lightEffects.addEventListener('change',()=>render());
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
  let ringLayer = null, ringFrontLayer = null, ringScale = '';
  function buildRings() {
    ringLayer = null;
    ringScale = '';
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
      if(lightEffects.matches)dragon.classList.add('tdj-dragon-glow');
      else dragon.append(SoulRingVisuals.create(7));
      surround(dragon,true);
    }
    back.prepend(box); // 最底層：在人物、武魂虛影下面
    front.prepend(foreground);
    ringFrontLayer = foreground;
    ringLayer = box;
    positionRings();
  }
  function positionRings() {
    if(!ringLayer)return;
    const scale=String(characterRenderScale());
    if(scale===ringScale)return;
    ringScale=scale;
    ringLayer.style.setProperty('--s',scale);
    ringFrontLayer.style.setProperty('--s',scale);
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
    if (!phantom || document.hidden || window.gameFlowState !== 'playing') return;
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
    const lightweight=lightEffects.matches;
    back.classList.toggle('tdj-mobile-effects',lightweight);
    front.classList.toggle('tdj-mobile-effects',lightweight);
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
      if (!lightweight && MonsterActions.has(w.skin)) {
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
  function flash(src, {skipOnMobile=false}={}) {
    if (!src || (skipOnMobile && lightEffects.matches)) return;
    const img = new Image(); img.className = 'tdj-flash'; img.src = src; img.alt = '';
    placeImage(img, 1, 0.9); back.append(img); setTimeout(() => img.remove(), 1100);
  }

  // ---- 魔法娃娃 ----
  function drawDoll() {
    if (!playing()) { toast('請先進入遊戲角色。'); return null; }
    const d = pick(dolls); state.dolls.owned[d.id] = (state.dolls.owned[d.id] || 0) + 1; save(); return d;
  }
  // 2026-11-17 使用者：召喚要扣材料（多為魔法結晶體×100，商人有賣）；召喚時間到自動再扣一次續召，材料不夠才解除。
  //  續召到期時間存在 state.dolls.until（毫秒）；離線期間不扣，回來時從現在重新計時。
  function payDoll(d) {
    const need = d.materials || [], next = window.OwnedInventory?.snapshot; if (!next) return false;
    for (const [mid, n] of need) { let left = n; for (const e of next) { if (left <= 0) break; if (e.key !== 'etcitem:' + mid || e.slot) continue; const take = Math.min(left, e.count || 1); e.count = (e.count || 1) - take; left -= take; } if (left > 0) return false; }
    return OwnedInventory.applyChange(next.filter(e => (e.count ?? 1) > 0));
  }
  const matText = d => (d.materials || []).map(([mid, n]) => (INTERFACE_CATALOG.items.find(i => i.kind === 'etcitem' && i.id === mid)?.name || '道具') + '×' + n).join('、');
  function summon(id) {
    if (!playing()) return false;
    const d = dollById.get(+id); if (!d || !state.dolls.owned[id]) { toast('還沒有這隻魔法娃娃。'); return false; }
    if (d.materials?.length && !payDoll(d)) { toast('召喚需要 ' + matText(d) + '，材料不足（魔法結晶體可向雜貨商購買）。'); return false; }
    state.dolls.active = String(id); state.dolls.until = Date.now() + (d.time || 1800) * 1000; save(); render();
    toast('召喚 ' + d.name.replace(/^.*：/, '') + '（' + (d.effects.slice(0, 3).join('、') || '無能力') + '）'); return true;
  }
  setInterval(() => {
    if (!playing() || !state.dolls.active) return; const d = dollById.get(+state.dolls.active); if (!d) return;
    if (!state.dolls.until) { state.dolls.until = Date.now() + (d.time || 1800) * 1000; save(); return; }
    if (Date.now() < state.dolls.until) return;
    if (!d.materials?.length || payDoll(d)) { state.dolls.until = Date.now() + (d.time || 1800) * 1000; save(); toast('魔法娃娃召喚時間到，自動消耗 ' + matText(d) + ' 繼續召喚。'); }
    else { state.dolls.active = null; state.dolls.until = 0; save(); render(); window.DBGameRules?.syncVitals(); window.stats?.(); toast('魔法娃娃召喚時間到，' + matText(d) + ' 不足，娃娃已離開。'); }
  }, 1000);
  function dismiss() { if (!playing() || !state.dolls.active) return false; state.dolls.active = null; state.dolls.until = 0; save(); render(); toast('魔法娃娃已解除召喚'); return true; }

  // ---- 娃娃進化／分解（2026-11-22 使用者定案）----
  //  進化：消耗本階娃娃 1 隻＋魔法娃娃成長藥劑，升 2/3/4/5/6 階要 1/2/3/4/5 瓶，成功率 60/40/20/10/5%；失敗只扣藥劑、娃娃不降階。召喚中的那隻不能用。
  //  分解：每種至少留 1 隻（召喚中的也不能分），依系列第一階品階給藥劑 一般1 高級2 稀有3 英雄5 傳說10 神話20 超越40，進化階段再加已投入藥劑的一半。
  //  掉落：BOSS 必掉 1～3 瓶、一般怪 0.3% 掉 1 瓶（player-progression.js roll 呼叫 potionDrop）。
  const DOLL_POTION = 60219, POTION_KEY = 'etcitem:' + DOLL_POTION;
  const EVOLVE_COST = [1, 2, 3, 4, 5], EVOLVE_RATE = [60, 40, 20, 10, 5];
  const SPLIT_POTIONS = {一般: 1, 高級: 2, 稀有: 3, 英雄: 5, 傳說: 10, 神話: 20, 超越: 40};
  function stageOf(id) {
    const fam = window.DollEvolution?.family(id), path = fam?.paths.find(p => p.includes(+id));
    return path ? {path, index: path.indexOf(+id)} : null;
  }
  function evolveInfo(id) {
    const s = stageOf(id); if (!s || s.index >= s.path.length - 1) return null;
    return {next: dollById.get(s.path[s.index + 1]), potions: EVOLVE_COST[s.index], rate: EVOLVE_RATE[s.index], stage: s.index + 2};
  }
  function splitPotions(id) {
    const tier = typeof dollTier === 'function' ? dollTier(id) : '一般', k = stageOf(id)?.index || 0;
    return (SPLIT_POTIONS[tier] || 1) + Math.floor(EVOLVE_COST.slice(0, k).reduce((a, b) => a + b, 0) / 2);
  }
  const potionCount = () => (window.OwnedInventory?.items || []).filter(e => e.key === POTION_KEY && !e.slot).reduce((n, e) => n + e.count, 0);
  const freeDolls = id => (state.dolls.owned[id] || 0) - (String(state.dolls.active) === String(id) ? 1 : 0);
  function takePotions(n) {
    const next = OwnedInventory.snapshot; let left = n;
    for (const e of next) { if (left <= 0) break; if (e.key !== POTION_KEY || e.slot) continue; const t = Math.min(left, e.count); e.count -= t; left -= t; }
    return left <= 0 && OwnedInventory.applyChange(next.filter(e => e.count > 0));
  }
  function evolveDoll(id) {
    if (!playing()) return false;
    const d = dollById.get(+id), info = evolveInfo(id);
    if (!d || !info) { toast('這隻娃娃已達最高階。'); return false; }
    if (freeDolls(d.id) < 1) { toast(state.dolls.owned[d.id] ? '召喚中的娃娃不能進化，請先解除召喚。' : '還沒有這隻魔法娃娃。'); return false; }
    if (potionCount() < info.potions) { toast('進化需要魔法娃娃成長藥劑 ' + info.potions + ' 瓶（目前 ' + potionCount() + ' 瓶）。'); return false; }
    if (!takePotions(info.potions)) { toast('儲存失敗，進化未進行。'); return false; }
    const ok = Math.random() * 100 < info.rate;
    if (ok) {
      if (!--state.dolls.owned[d.id]) delete state.dolls.owned[d.id];
      state.dolls.owned[info.next.id] = Math.min(2147483647, (state.dolls.owned[info.next.id] || 0) + 1);
    }
    save(); render();
    toast(ok ? '進化成功！' + d.name + ' → ' + info.next.name : '進化失敗（成功率 ' + info.rate + '%），消耗成長藥劑 ' + info.potions + ' 瓶，' + d.name + ' 保留。');
    if (ok) flash(dollImage(info.next));
    return ok;
  }
  function splitDoll(id) {
    if (!playing()) return false;
    const d = dollById.get(+id); if (!d) return false;
    if ((state.dolls.owned[d.id] || 0) < 2) { toast('每種娃娃至少要保留 1 隻才能分解。'); return false; }
    const n = splitPotions(d.id);
    state.dolls.owned[d.id]--;
    if (!OwnedInventory.receive('etcitem', DOLL_POTION, n)) { state.dolls.owned[d.id]++; toast('背包空間不足或儲存失敗，娃娃未分解。'); return false; }
    save(); render(); toast('分解 ' + d.name + '，獲得魔法娃娃成長藥劑 ' + n + ' 瓶。'); return true;
  }
  function potionDrop(mob) {
    if (!mob?.spawn || mob.spawn.resident || mob.spawn.ally || mob.spawn.bot) return [];
    const n = isBossMob(mob) ? 1 + Math.floor(Math.random() * 3) : Math.random() < 0.003 ? 1 : 0;
    return n ? [{key: POTION_KEY, count: n, name: '魔法娃娃成長藥劑'}] : [];
  }

  // ---- BOSS 靈魂附魔 ----
  const equippedWeapon = () => (window.OwnedInventory?.items || []).find(e => e.slot === 'weapon');
  function getStone(id) {
    if (!playing()) { toast('請先進入遊戲角色。'); return null; }
    const e = id ? enchantById.get(+id) : pick(bossEnchantData);
    return e && creditEnchantLoot([{key:'etcitem:' + e.id,count:1}], () => window.GameEntry.saveActive()) ? e : null;
  }
  function isEnchantLoot(drop) {
    return enchantById.has(Number(/^etcitem:(\d+)$/.exec(drop.key)?.[1]));
  }
  function creditEnchantLoot(loot, commit) {
    if (!loot.length) return commit();
    if (!playing()) return false;
    const previous = state.enchant.stones, next = {...previous};
    for (const {key, count} of loot) {
      const id = Number(key.slice('etcitem:'.length));
      const total = (next[id] || 0) + count;
      if (!Number.isSafeInteger(count) || count <= 0 || total > 2147483647) return false;
      next[id] = total;
    }
    state.enchant.stones = next;
    let committed = false;
    try {
      committed = commit();
      return committed;
    } finally {
      if (!committed) state.enchant.stones = previous;
    }
  }
  // 2026-11-22 使用者要求：附魔是附在「武器」上，跟著武器走（卸下、換角色、放倉庫都保留），不是附在玩家身上。
  // 紀錄存在背包／倉庫的武器物件 entry.soul = {id, lv}；舊版存在角色 state.enchant.weapons[uid] 的，進遊戲時搬到對應武器上。
  const validSoul = s => s && Number.isInteger(s.lv) && s.lv >= 1 && enchantById.get(s.id)?.levels[s.lv - 1] ? s : null;
  function soulInfo(entry) {
    const s = validSoul(entry?.soul); if (!s) return null;
    const data = enchantById.get(s.id);
    return {id: s.id, lv: s.lv, data, level: data.levels[s.lv - 1]};
  }
  function migrateLegacySouls() {
    const inv = window.OwnedInventory;
    if (!state || !inv || inv.owner !== owner || !Object.keys(state.enchant.weapons).length) return;
    const legacy = state.enchant.weapons, rows = inv.snapshot, storage = inv.warehouse;
    for (const e of [...rows, ...storage]) if (legacy[e.uid] && !validSoul(e.soul)) e.soul = {id: legacy[e.uid].id, lv: legacy[e.uid].lv};
    state.enchant.weapons = Object.create(null);
    if (inv.applyChange(rows, {warehouse: storage})) save(); else state.enchant.weapons = legacy;
  }
  function setWeaponSoul(uid, soul) {
    const rows = OwnedInventory.snapshot, e = rows.find(r => r.uid === uid);
    if (!e) return false;
    if (soul) e.soul = soul; else delete e.soul;
    return OwnedInventory.applyChange(rows);
  }
  function currentEnchant() {
    if (!ensure()) return null;
    migrateLegacySouls();
    const weapon = equippedWeapon(), s = soulInfo(weapon);
    return s && {...s, uid: weapon.uid, weapon};
  }
  function enchant(id) {
    if (!playing()) return false;
    migrateLegacySouls();
    const e = enchantById.get(+id), weapon = equippedWeapon();
    if (!state.enchant.stones[id]) { toast('沒有' + e.stone + '。'); return false; }
    if (!weapon) { toast('請先裝備武器再附魔。'); return false; }
    const applied = soulInfo(weapon);
    const cur = applied?.id === e.id ? applied.lv : 0;
    if (cur >= e.levels.length) { toast('已經是最高階 ' + e.levels[cur - 1].name + '。'); return false; }
    const next = e.levels[cur];
    const previous = state.enchant;
    state.enchant = {stones:{...previous.stones}, weapons:{...previous.weapons}};
    state.enchant.stones[id]--; if (!state.enchant.stones[id]) delete state.enchant.stones[id];
    const ok = Math.random() * 100 < next.rate;
    const saved = ok ? setWeaponSoul(weapon.uid, {id: e.id, lv: cur + 1}) : window.GameEntry.saveActive();
    if (!saved) { state.enchant = previous; toast('儲存失敗，附魔石未消耗。'); return false; }
    toast(ok ? '強大的 BOSS 靈魂技能附魔成功了：' + weapon.item.name + ' 獲得 ' + next.name : '很抱歉，您的附魔失敗了（成功率 ' + next.rate + '%）。');
    if (ok) flash(enchantImage(e));
    return ok;
  }
  // 2026-11-21 BOSS 附魔石改傷害型（使用者規劃）：等級只提高發動率（data 的 proc），傷害固定不隨等級變。
  // dmg 額外傷害區間、hits 連打段數、lowHp 自身血量 <30% 傷害×2、dot [每次,間隔ms,持續ms]、area 範圍格數、
  // vuln [受傷加成%,ms]、drain 回血、mp 回魔、repeat 再普攻次數、armor 破壞盔甲 ms、execute 怪物血量 <30% ×N、stun 暈眩 ms、pct 扣目前血量%（BOSS 上限 cap）
  const ENCHANT_FX = {
    62000: {dmg: [20, 35], hits: 2, text: '風刃連打 2 段，每段 20～35'},
    62001: {dmg: [40, 80], lowHp: 2, text: '火焰 40～80；自身血量低於 30% 時傷害 ×2'},
    62002: {dmg: [50, 90], text: '落雷 50～90'},
    62003: {dot: [10, 1000, 6000], text: '中毒：每秒 10，持續 6 秒（再中毒重算時間）'},
    62004: {dmg: [25, 45], area: 2, text: '冰矛：目標周圍 2 格內每隻怪物 25～45'},
    62005: {dmg: [30, 50], vuln: [10, 5000], text: '蛛毒 30～50，並讓怪物 5 秒內受到的傷害 +10%'},
    62006: {dmg: [35, 60], text: '暗影 35～60（必中）'},
    62007: {dmg: [25, 65], drain: 15, text: '吸血 25～65，並回血最多 15'},
    62008: {dmg: [20, 40], mp: 5, text: '弱化 20～40，並回魔 5'},
    62009: {repeat: 2, text: '立刻再普通攻擊 2 次'},
    62010: {dot: [6, 1000, 10000], armor: 10000, text: '疾病：每秒 6，持續 10 秒，期間怪物防禦降低（普攻傷害提高）'},
    62011: {dmg: [30, 50], execute: 3, text: '骷髏毀壞 30～50；怪物血量低於 30% 時 ×3'},
    62012: {dmg: [40, 70], stun: 500, text: '衝擊 40～70，並暈眩 0.5 秒'},
    62013: {pct: 3, cap: 300, text: '扣怪物目前血量 3%（打 BOSS 一次最多 300）'},
    62014: {dmg: [35, 60], area: 1, text: '鐮刀橫掃：目標身邊 1 格內每隻怪物 35～60'},
    62015: {dmg: [60, 100], text: '地獄火 60～100'}
  };
  const enchantDots = [];
  const rand = ([a, b]) => a + Math.floor(Math.random() * (b - a + 1));
  // 首領判斷和自動輔助／假人相同：名字有 BOSS，或單隻生成且體力 1500 以上
  const isBossMob = m => /BOSS/i.test(m.spawn?.npc?.name || '') || (m.spawn?.count === 1 && (m.spawn?.npc?.hp || 0) >= 1500);
  const hittable = m => m?.hp > 0 && !m.spawn.ally && !m.spawn.resident && (!m.spawn.bot || window.FakePlayers?.canAttack(m));
  function rollEnchantProc(mob, base = 0) {
    const cur = currentEnchant(); if (!cur || !mob) return;
    if (Math.random() * 100 >= cur.level.proc) return;
    const fx = ENCHANT_FX[cur.data.id] || {};
    let damage = fx.dmg ? rand(fx.dmg) : 0;
    if (fx.lowHp && hp < maxHp * 0.3) damage *= fx.lowHp;
    if (fx.execute && mob.spawn?.npc?.hp > 0 && mob.hp < mob.spawn.npc.hp * 0.3) damage *= fx.execute;
    if (fx.pct) { damage = Math.max(1, Math.floor(mob.hp * fx.pct / 100)); if (isBossMob(mob)) damage = Math.min(fx.cap, damage); }
    return {cur, fx, mob, base, damage};
  }
  function later(ms, fn) { const who = window.activeCharacterId; setTimeout(() => { if (playing() && window.activeCharacterId === who && !CharacterActions.dead) fn(); }, ms); }
  function addDot(mob, id, [dmg, every, dur]) {
    const t = movementTime(), old = enchantDots.find(d => d.mob === mob && d.id === id);
    if (old) { old.until = t + dur; return; }
    enchantDots.push({mob, id, dmg, every, next: t + every, until: t + dur, who: window.activeCharacterId});
  }
  setInterval(() => {
    if (!enchantDots.length) return;
    const t = movementTime(), on = window.gameFlowState === 'playing';
    for (let i = enchantDots.length - 1; i >= 0; i--) {
      const d = enchantDots[i];
      if (!on || d.who !== window.activeCharacterId || !d.mob.hp || t >= d.until) { enchantDots.splice(i, 1); continue; }
      if (t >= d.next) { d.next += d.every; IslandMonsters.damage(d.mob, d.dmg); }
    }
  }, 250);
  function applyEnchantProc({cur, fx, mob, base, damage}) {
    flash(enchantImage(cur.data));
    const t = movementTime(), notes = [];
    if (damage) notes.push('額外傷害 ' + damage);
    if (fx.hits > 1) for (let i = 1; i < fx.hits; i++) later(150 * i, () => { if (mob.hp) IslandMonsters.damage(mob, rand(fx.dmg)); });
    if (fx.repeat && base > 0) { for (let i = 1; i <= fx.repeat; i++) later(160 * i, () => { if (mob.hp) IslandMonsters.damage(mob, base); }); notes.push('連擊 ' + fx.repeat + ' 次'); }
    if (fx.dot && mob.hp) { addDot(mob, cur.data.id, fx.dot); notes.push(fx.dot[0] + '/秒 持續 ' + fx.dot[2] / 1000 + ' 秒'); }
    if (fx.armor && mob.hp) window.ClassBuffs?.mark?.(mob, 112, fx.armor);
    if (fx.vuln && mob.hp) mob.enchantVuln = {pct: fx.vuln[0], until: t + fx.vuln[1]};
    if (fx.stun && mob.hp) mob.ready = Math.max(mob.ready || 0, t + fx.stun);
    if (fx.area) {
      let n = 0;
      for (const m of IslandMonsters.all || []) {
        if (m === mob || !hittable(m) || (m.spawn.mapId || 0) !== (mob.spawn.mapId || 0) || Math.max(Math.abs(m.x - mob.x), Math.abs(m.y - mob.y)) > fx.area) continue;
        IslandMonsters.damage(m, rand(fx.dmg)); n++;
      }
      if (n) notes.push('波及 ' + n + ' 隻');
    }
    let changed = false;
    const healed = fx.drain ? Math.min(fx.drain, Math.max(0, maxHp - hp)) : 0;
    if (healed > 0) { hp += healed; changed = true; notes.push('吸血 ' + healed); }
    const mana = fx.mp ? Math.min(fx.mp, Math.max(0, maxMp - mp)) : 0;
    if (mana > 0) { mp += mana; changed = true; notes.push('回魔 ' + mana); }
    if (changed) { window.stats?.(); window.GameEntry?.saveActive(); }
    toast(cur.level.name + ' 發動「' + cur.data.skill + '」' + (notes.length ? '，' + notes.join('、') : ''), 'journal');
  }

  function refreshSoulStats(){window.DBGameRules?.syncVitals();window.stats?.();}
  // 武魂提煉（2026-11-17 使用者設計）：同品階武魂（不必同一種）湊滿數量提煉成一個該色魂環；魂環放進對應魂槽才點亮。
  //  下品3→白、上品3→綠、極品5→藍、千年5→紅、萬年8→紫、上古10→金。裝備中的那隻不會被拿去提煉。原本直接獻祭武魂的方式取消。
  const RING_COST=[3,3,5,5,8,10],RING_COLOR=['白色','綠色','藍色','紅色','紫色','金色'];
  function spareOf(t){const tier=WUHUN_TIERS[t];return wuhunData.filter(w=>w.tier===tier).map(w=>({w,n:(state.wuhun.owned[w.id]||0)-(String(state.wuhun.active)===String(w.id)?1:0)})).filter(x=>x.n>0);}
  function fuseRing(t){
    if(!playing()||window.CharacterActions?.dead||!(t>=0&&t<6))return false;
    const need=RING_COST[t],list=spareOf(t).sort((a,b)=>b.n-a.n),total=list.reduce((n,x)=>n+x.n,0);
    if(total<need){toast('提煉'+RING_COLOR[t]+'魂環需要 '+need+' 個'+WUHUN_TIERS[t]+'武魂（可用 '+total+' 個，裝備中的不算）。');return false;}
    const old=JSON.parse(JSON.stringify(state));let left=need;
    for(const {w,n} of list){const take=Math.min(n,left);state.wuhun.owned[w.id]-=take;if(!state.wuhun.owned[w.id])delete state.wuhun.owned[w.id];left-=take;if(!left)break;}
    state.wuhun.rings[t]=(state.wuhun.rings[t]||0)+1;
    try{localStorage.setItem(key(owner),JSON.stringify(state));}catch(error){state=old;toast('儲存失敗，提煉未完成。');return false;}
    toast('武魂提煉成功：獲得'+RING_COLOR[t]+'魂環');render();return true;
  }
  // 五個同階武魂融合為隨機下一階；失敗消耗材料，裝備中的一個保留。
  const SOUL_FUSION_RATES=Object.freeze([80,60,40,25,10,5]);
  function fuseSoul(t){
    if(!playing()||window.CharacterActions?.dead||!Number.isInteger(t)||t<0||t>=6)return false;
    const pool=wuhunData.filter(w=>w.tier===WUHUN_TIERS[t+1]),list=spareOf(t).sort((a,b)=>b.n-a.n);
    const total=list.reduce((n,x)=>n+x.n,0);if(total<5||!pool.length){toast('武魂融合需要 5 個'+WUHUN_TIERS[t]+'武魂（裝備中的不算）。');return false;}
    const old=JSON.parse(JSON.stringify(state));let left=5;
    for(const {w,n} of list){const take=Math.min(n,left);state.wuhun.owned[w.id]-=take;if(!state.wuhun.owned[w.id])delete state.wuhun.owned[w.id];left-=take;if(!left)break;}
    const success=Math.random()*100<SOUL_FUSION_RATES[t],reward=success?pick(pool):null;
    if(reward){const count=state.wuhun.owned[reward.id]||0;if(count>=2147483647){state=old;toast('武魂數量已達上限，融合取消。');return false;}state.wuhun.owned[reward.id]=count+1;}
    try{localStorage.setItem(key(owner),JSON.stringify(state));}catch(error){state=old;toast('儲存失敗，武魂融合取消，材料未消耗。');return false;}
    toast(success?'武魂融合成功：獲得'+reward.name:'武魂融合失敗：消耗 5 個'+WUHUN_TIERS[t]+'武魂，未獲得武魂。');render();return {success,reward:reward?.id||null};
  }
  function placeRing(slot){
    if(!playing()||window.CharacterActions?.dead||!(slot>=0&&slot<6))return false;const s=state.wuhun;
    if(s.ringSlots[slot]!=null){toast('這個魂槽已經點亮。');return false;}
    for(let i=0;i<slot;i++)if(s.ringSlots[i]==null){toast('要先點亮第 '+(i+1)+' 槽（'+RING_COLOR[i]+'魂環）。');return false;}
    if(!(s.rings[slot]>0)){toast('沒有'+RING_COLOR[slot]+'魂環，請先用 '+RING_COST[slot]+' 個'+WUHUN_TIERS[slot]+'武魂提煉。');return false;}
    const old=JSON.parse(JSON.stringify(state));s.rings[slot]--;if(!s.rings[slot])delete s.rings[slot];
    s.ringSlots[slot]=wuhunData.find(w=>w.tier===WUHUN_TIERS[slot])?.id??null; // 魂槽記一隻該品階武魂當外觀代表（光圈顏色用）
    try{localStorage.setItem(key(owner),JSON.stringify(state));}catch(error){state=old;toast('儲存失敗，魂槽未變更。');return false;}
    toast(RING_COLOR[slot]+'魂環放入第 '+(slot+1)+' 魂槽，魂槽啟動！');refreshSoulStats();render();return true;
  }
  function changeRings(kind,id){
    if(kind==='place')return placeRing(+id);if(kind==='fuse')return fuseRing(+id);
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
    const missing = ringMissing(w); if (missing.length) { toast('裝備' + w.tier + '武魂前，要先在魂槽放入：' + missing.map(t => RING_COLOR[WUHUN_TIERS.indexOf(t)]).join('、') + '魂環（武魂提煉取得）。'); return false; }
    state.wuhun.active = String(id); save(); refreshSoulStats();render(); flash(wuhunImage(w),{skipOnMobile:true});
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
    const n = e.count || 1;
    const owned = doll ? state.dolls.owned : state.wuhun.owned;
    const card = doll || soul;
    if((owned[card.id]||0)+n>2147483647){toast('圖鑑持有數已達上限。');return false;}
    if (!OwnedInventory.discard([uid], {allowDolls:!!doll})) { toast('這個道具目前無法收進圖鑑。'); return false; }
    owned[card.id] = (owned[card.id] || 0) + n;
    save(); render();
    toast((doll ? '魔法娃娃「' + doll.name + '」' : '武魂「' + soul.name + '」') + '已收進圖鑑' + (n > 1 ? ' ×' + n : '') + '，可到圖鑑' + (doll ? '召喚' : '裝備') + '。');
    return true;
  }
  const get = () => (ensure(), state);
  return {
    useItem,
    isEnchantLoot, creditEnchantLoot,
    restoreEnchant(id,value){restoredEnchant={owner:id,value};owner='';},
    get enchantSnapshot(){return ensure() ? state.enchant : undefined;},
    dolls: {draw: drawDoll, summon, dismiss, image: dollImage, owned: id => get().dolls.owned[id] || 0, get active() { return get().dolls.active; },
      evolve: evolveDoll, split: splitDoll, evolveInfo, splitPotions, potionDrop, potions: () => (ensure(), potionCount())},
    enchant: {get: getStone, enchant, current: currentEnchant, image: enchantImage, effectText: id => ENCHANT_FX[+id]?.text || '', soulOf: soulInfo, soulLabel: entry => { const s = soulInfo(entry); return s ? s.level.name + '（攻擊發動 ' + s.level.proc + '%）' : ''; }, stones: id => get().enchant.stones[id] || 0},
    wuhun: {fuseSoul,fusionRates:SOUL_FUSION_RATES,changeRings,ringCost:RING_COST,ringColor:RING_COLOR,rings:()=>(ensure(),{...state.wuhun.rings}),spare:t=>(ensure(),spareOf(+t).reduce((n,x)=>n+x.n,0)),tiers:WUHUN_TIERS,ringMissing:id=>(ensure(),ringMissing(wuhunById.get(+id))),get ringState(){ensure();return JSON.parse(JSON.stringify({slots:state.wuhun.ringSlots}));},get: getWuhun, equip: equipWuhun, unequip: unequipWuhun, image: wuhunImage, baseGfx: wuhunBaseGfx, owned: id => get().wuhun.owned[id] || 0, get active() { return get().wuhun.active; }},
    rollEnchantProc, applyEnchantProc, render
  };
})();
