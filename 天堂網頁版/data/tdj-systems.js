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
        for (const [k, n] of Object.entries(saved.dolls?.owned || {})) if (dollById.has(+k) && n > 0) state.dolls.owned[k] = n;
        if (state.dolls.owned[saved.dolls?.active]) state.dolls.active = saved.dolls.active;
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
  const wuhunImage = w => w.img || imageByName(w.core);

  // ---- 畫面：娃娃跟在旁邊、武魂虛影在背後、附魔發動時 BOSS 閃現 ----
  const style = document.createElement('style');
  style.textContent = '.tdj-layer{position:absolute;left:0;top:0;width:0;height:0;pointer-events:none}' +
    '.tdj-phantom{position:absolute;opacity:.42;filter:drop-shadow(0 0 10px #ffd27a) brightness(1.25);animation:tdjFloat 3.2s ease-in-out infinite;transform-origin:50% 100%}' +
    '.tdj-phantom.tdj-aura{width:120px;height:150px;left:-60px;top:-150px;border-radius:50%;background:radial-gradient(closest-side,var(--tdj-aura,#ffd27a88),transparent);opacity:.7;filter:none}' +
    '.tdj-doll{position:absolute;animation:tdjBob 1.6s ease-in-out infinite;filter:drop-shadow(0 2px 2px #0008)}' +
    '.tdj-doll-name{position:absolute;white-space:nowrap;font:11px sans-serif;color:#ffe9a8;text-shadow:0 1px 2px #000;transform:translateX(-50%)}' +
    '.tdj-flash{position:absolute;opacity:0;animation:tdjFlash 1s ease-out forwards;filter:drop-shadow(0 0 14px #ff5a3a) brightness(1.4)}' +
    '@keyframes tdjFloat{0%,100%{transform:translateY(0) scale(1.55)}50%{transform:translateY(-8px) scale(1.6)}}' +
    '@keyframes tdjBob{0%,100%{transform:translateY(0)}50%{transform:translateY(-6px)}}' +
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
  function render() {
    back.replaceChildren(); front.replaceChildren();
    if (!owner || window.gameFlowState !== 'playing') return;
    const w = wuhunById.get(+state.wuhun.active);
    if (w) {
      const src = wuhunImage(w);
      if (src) { const img = new Image(); img.className = 'tdj-phantom'; img.src = src; img.alt = ''; placeImage(img, 1, 0.92); back.append(img); }
      else { const aura = document.createElement('div'); aura.className = 'tdj-phantom tdj-aura'; aura.style.setProperty('--tdj-aura', tierColor[w.tier] || '#ffd27a88'); back.append(aura); }
    }
    const d = dollById.get(+state.dolls.active);
    if (d) {
      const holder = document.createElement('div'); holder.style.cssText = 'position:absolute;left:-58px;top:-30px';
      const src = dollImage(d);
      if (src) { const img = new Image(); img.className = 'tdj-doll'; img.src = src; img.alt = ''; placeImage(img, 0.8, 1); holder.append(img); }
      const label = document.createElement('div'); label.className = 'tdj-doll-name'; label.textContent = d.name.replace(/^.*：/, ''); label.style.top = '4px'; holder.append(label);
      front.append(holder);
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
  refreshCharacter = function (...args) { const before = owner; ensure(); if (before !== owner) render(); return baseRefresh.apply(this, args); };

  const get = () => (ensure(), state);
  return {
    dolls: {draw: drawDoll, summon, dismiss, image: dollImage, owned: id => get().dolls.owned[id] || 0, get active() { return get().dolls.active; }},
    enchant: {get: getStone, enchant, current: currentEnchant, image: enchantImage, stones: id => get().enchant.stones[id] || 0},
    wuhun: {get: getWuhun, equip: equipWuhun, unequip: unequipWuhun, image: wuhunImage, owned: id => get().wuhun.owned[id] || 0, get active() { return get().wuhun.active; }},
    onAttack, render
  };
})();
