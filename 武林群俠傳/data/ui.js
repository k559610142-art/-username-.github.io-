// 浪跡江湖：HUD、快捷欄、各視窗與玩家操作（ARCHITECTURE.md 第 12 節）
// 規則：onclick 只呼叫這裡的頂層函式；視窗內容只在 markDirty 後重畫，HUD 每幀只改文字與寬度
let panel = null;          // 目前開啟的視窗 id（null＝沒開）
let dirty = true;
let logs = [];
let createSel = { sect: 'xuanxiao', g: 'm', hair: 0, skin: 0, name: '' };

function $(id) { return document.getElementById(id); }
function esc(s) { return String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c])); }
function markDirty() { dirty = true; refreshStats(); }

function addLog(html, cls) {
    logs.unshift(`<div class="log-line ${cls || ''}">${html}</div>`);
    if (logs.length > 40) logs.length = 40;
    const el = $('log'); if (el) el.innerHTML = logs.join('');
}
function showToast(msg) {
    const el = document.createElement('div');
    el.className = 'toast'; el.textContent = msg;
    document.body.appendChild(el);
    setTimeout(() => el.remove(), 1800);
}

// 遊戲內確認框（不用原生 confirm）
let confirmCb = null;
function gameConfirm(msg, cb) { confirmCb = cb; $('modal-msg').innerHTML = msg; $('modal').classList.add('show'); }
function confirmOk() { $('modal').classList.remove('show'); const cb = confirmCb; confirmCb = null; if (cb) cb(); }
function confirmCancel() { $('modal').classList.remove('show'); confirmCb = null; }

function addToBag(it) {
    if (!it || G.bag.length >= BAG_MAX) return false;
    G.bag.push(it); dirty = true; return true;
}

// ── 建立角色 ──
function renderCreate() {
    const s = createSel;
    const preview = { sect: s.sect, look: { g: s.g, hair: s.hair, skin: s.skin }, equip: {} };
    let h = `<div class="create"><h2>浪跡江湖</h2><p class="muted">選擇門派與外觀，踏入江湖。</p>
    <div class="create-main"><div class="create-preview">${avatarSvg(preview, { size: 150, cls: 'idle' })}</div><div class="create-opts">
    <label>俠名 <input type="text" maxlength="8" value="${esc(s.name)}" placeholder="最多 8 字" oninput="setCreateName(this.value)"></label>
    <div class="opt-row"><span>性別</span>${LOOK_GENDER.map(x => `<button class="mini ${s.g === x.id ? '' : 'secondary'}" onclick="pickLook('g','${x.id}')">${x.name}</button>`).join('')}</div>
    <div class="opt-row"><span>髮色</span>${LOOK_HAIR.map((c, i) => `<button class="swatch ${s.hair === i ? 'on' : ''}" style="background:${c}" onclick="pickLook('hair',${i})"></button>`).join('')}</div>
    <div class="opt-row"><span>膚色</span>${LOOK_SKIN.map((c, i) => `<button class="swatch ${s.skin === i ? 'on' : ''}" style="background:${c}" onclick="pickLook('skin',${i})"></button>`).join('')}</div>
    </div></div><div class="sect-grid">`;
    for (const id in SECTS) {
        const x = SECTS[id];
        h += `<div class="sect-card ${s.sect === id ? 'on' : ''}" style="--c:${x.color}" onclick="pickSect('${id}')">
        <b>${x.icon} ${x.name}</b><small>${x.desc}</small><small class="muted">內功：${x.skills.map(k => k.name).join('、')}</small></div>`;
    }
    h += `</div><p class="muted small">外功（刀、槍、爪）各派共用，到柳溪鎮武館用修為習得。</p><button class="big" onclick="confirmCreate()">踏入江湖</button></div>`;
    $('create').innerHTML = h;
    $('create').style.display = '';
    $('game').style.display = 'none';
}
function setCreateName(v) { createSel.name = v; }
function pickSect(id) { createSel.sect = id; renderCreate(); }
function pickLook(k, v) { createSel[k] = v; renderCreate(); }
function confirmCreate() {
    const name = (createSel.name || '').trim();
    if (!name) { showToast('請輸入俠名'); return; }
    G = newPlayer(name, createSel.sect, { g: createSel.g, hair: createSel.hair, skin: createSel.skin });
    G.equip.weapon = makeGear('weapon', 1, 0, 'blade');
    const s = calcStats(G); G.hp = s.hp; G.mp = s.mp;
    saveGame(); startGame();
    addLog(`${esc(name)} 拜入${SECTS[G.sect].name}，來到柳溪鎮。點地面移動、點怪物攻擊，數字鍵 1～8 施放快捷欄。`, 'gold');
}

// ── HUD（每幀） ──
function renderHud(now) {
    const s = W.stats, need = expNeed(G.lv);
    setBar('b-hp', 't-hp', G.hp, s.hp);
    setBar('b-mp', 't-mp', G.mp, s.mp);
    $('b-exp').style.width = (G.exp / need * 100).toFixed(2) + '%';
    $('t-exp').textContent = `Lv.${G.lv}　${(G.exp / need * 100).toFixed(1)}%`;
    const t = W.target;
    if (t && t.state !== 'dead') {
        $('target').style.display = '';
        $('tg-name').innerHTML = `${t.boss ? '<b class="bad">首領</b> ' : ''}${t.name} <span class="muted">Lv.${t.lv}</span> <small class="muted">${t.dtype === 'inner' ? '內功' : '外功'}</small>`;
        setBar('b-tg', 't-tg', t.hp, t.maxHp);
    } else $('target').style.display = 'none';
    $('buffs').innerHTML = W.buffs.map(b => `<span class="buff">${b.name} ${Math.ceil(b.t)}s</span>`).join('') + (W.revive > 0 ? `<span class="buff bad">重傷 ${Math.ceil(W.revive)}s</span>` : '');
    for (let i = 0; i < HOTBAR_SIZE; i++) {
        const id = G.hotbar[i], cd = $('cd' + i);
        if (!cd) continue;
        if (!id) { cd.style.height = '0'; continue; }
        if (id.startsWith('pot:')) { cd.style.height = (W.potCd / POT_CD * 100) + '%'; $('hn' + i).textContent = G.pots[id.slice(4)]; continue; }
        const sk = skillDef(id), left = W.cds[id] || 0;
        cd.style.height = sk ? (left / sk.cd * 100) + '%' : '0';
        $('hk' + i).classList.toggle('off', !!skillReady(id) && skillReady(id) !== '冷卻中');
    }
    $('btn-hunt').classList.toggle('on', G.autoHunt);
}
function setBar(bar, txt, v, max) {
    $(bar).style.width = clamp(v / max * 100, 0, 100) + '%';
    $(txt).textContent = `${fmt(Math.max(0, v))}/${fmt(max)}`;
}

// 不常變的 HUD 部分（dirty 時才重畫）
function renderHudStatic() {
    $('hud-name').innerHTML = `<b>${esc(G.name)}</b> <span style="color:${sectOf(G).color}">${sectOf(G).name}</span>`;
    $('hud-money').innerHTML = `<span class="gold">💰${fmt(G.silver)}</span> <span class="xw">✨${fmt(G.xiuwei)}</span>`;
    $('hud-map').textContent = MAPS[G.map].name;
    let h = '';
    for (let i = 0; i < HOTBAR_SIZE; i++) {
        const id = G.hotbar[i];
        let icon = '', name = '';
        if (id && id.startsWith('pot:')) { const c = CONSUMABLES[id.slice(4)]; icon = c.icon; name = c.name; }
        else if (id) { const sk = skillDef(id); icon = sk.kind === 'inner' ? sectOf(G).icon : '⚔️'; name = sk.name; }
        h += `<button class="hk ${id ? '' : 'empty'}" id="hk${i}" onclick="pressHotkey(${i})"><i class="cd" id="cd${i}"></i><span class="hk-key">${i + 1}</span><span class="hk-icon">${icon}</span><span class="hk-name">${name}</span><span class="hk-n" id="hn${i}"></span></button>`;
    }
    $('hotbar').innerHTML = h;
}

function pressHotkey(i) {
    const id = G.hotbar[i];
    if (!id) { openPanel('skill'); return; }
    if (id.startsWith('pot:')) usePotion(id.slice(4));
    else useSkill(id);
}

// ── 視窗 ──
const PANELS = {
    char: ['角色', paneChar], skill: ['武學', paneSkill], bag: ['行囊', paneBag], map: ['江湖地圖', paneMap], set: ['設定', paneSet],
    shop: ['藥鋪', paneShop], smith: ['鐵匠鋪', paneSmith], outer: ['武館・外功', paneOuter], travel: ['驛站', paneTravel],
};
function openPanel(id) { panel = panel === id ? null : id; dirty = true; }
function closePanel() { panel = null; dirty = true; }
function openNpc(n) { panel = n.open; dirty = true; }

function renderPanel() {
    const box = $('panel');
    if (!panel) { box.style.display = 'none'; return; }
    const [title, fn] = PANELS[panel];
    const scroll = $('panel-body') ? $('panel-body').scrollTop : 0;
    box.style.display = '';
    box.innerHTML = `<div class="panel-head"><b>${title}</b><button class="mini secondary" onclick="closePanel()">✕</button></div><div class="panel-body" id="panel-body">${fn()}</div>`;
    $('panel-body').scrollTop = scroll;
}

function statRow(name, v) { return `<div class="stat"><span class="muted">${name}</span><b>${v}</b></div>`; }

function paneChar() {
    const s = calcStats(G);
    let h = `<div class="char-wrap"><div class="char-av">${avatarSvg(G, { size: 120, cls: 'idle' })}</div><div class="equip-list">`;
    for (const sl of SLOTS) {
        const it = G.equip[sl.id];
        h += `<div class="equip-slot"><span class="muted">${sl.name}</span>${it ? `<div>${gearLabel(it)} <small class="muted">${slotName(it)}・Lv.${it.lv}</small><br><small>${gearStatText(it)}</small></div>
        <div class="btns"><button class="mini secondary" onclick="unequip('${sl.id}')">卸下</button></div>` : '<div class="muted">（空）</div>'}</div>`;
    }
    h += `</div></div><h4>屬性　<small class="muted">戰力 ${fmt(combatPower(G))}</small></h4><div class="stats">
    ${statRow('氣血', fmt(s.hp))}${statRow('真氣', fmt(s.mp))}${statRow('外功攻擊', fmt(s.outer))}${statRow('內功攻擊', fmt(s.inner))}
    ${statRow('防禦', fmt(s.def))}${statRow('兵器', WEAPON_TYPES[s.wtype].name + '（射程 ' + s.range + '）')}
    ${statRow('命中', s.hit.toFixed(1) + '%')}${statRow('會心', s.crit.toFixed(1) + '%')}${statRow('閃避', s.dodge.toFixed(1) + '%')}${statRow('出手間隔', s.atkInterval.toFixed(2) + 's')}
    ${statRow('聚氣加速', s.cast.toFixed(1) + '%')}${statRow('回血', s.regen.toFixed(2) + '%/s')}
    ${statRow('卸勁', s.xiejin.toFixed(1) + '%')}${statRow('化勁', s.huajin.toFixed(1) + '%')}</div>
    <p class="muted small">卸勁：機率讓近身外功傷害減半。化勁：按比例減少遠程內功傷害。</p>
    <h4>屬性點 <span class="gold">${G.points}</span> <label class="small"><input type="checkbox" ${G.autoAttr ? 'checked' : ''} onchange="toggleAutoAttr()"> 依門派自動配點</label></h4><div class="attrs">`;
    for (const a of ATTRS) h += `<div class="attr"><b>${a.name} ${G.attr[a.id]}</b><small class="muted">${a.desc}</small><button class="mini" ${G.points ? '' : 'disabled'} onclick="addAttr('${a.id}')">＋</button></div>`;
    h += `</div><h4>外觀</h4><div class="opt-row"><span>髮色</span>${LOOK_HAIR.map((c, i) => `<button class="swatch ${G.look.hair === i ? 'on' : ''}" style="background:${c}" onclick="changeLook('hair',${i})"></button>`).join('')}</div>
    <div class="opt-row"><span>膚色</span>${LOOK_SKIN.map((c, i) => `<button class="swatch ${G.look.skin === i ? 'on' : ''}" style="background:${c}" onclick="changeLook('skin',${i})"></button>`).join('')}</div>
    <p class="muted small">累計擊殺 ${G.stat.kills}・首領 ${G.stat.bosses}・重傷 ${G.stat.deaths}</p>`;
    return h;
}

// 快捷欄指派下拉
function hotbarSelect(id) {
    const at = G.hotbar.indexOf(id);
    return `<select onchange="assignHotkey('${id}',this.value)"><option value="">快捷欄</option>${G.hotbar.map((_, i) => `<option value="${i}" ${at === i ? 'selected' : ''}>${i + 1}</option>`).join('')}</select>`;
}

function skillRow(sk, learnFn) {
    const lv = G.skills[sk.id] || 0, locked = G.lv < sk.unlock, max = lv >= SKILL_MAX, cost = skillCost(Math.max(1, lv));
    const info = [`真氣 ${sk.mp}`, `冷卻 ${sk.cd}s`];
    if (sk.cast) info.push(`聚氣 ${sk.cast}s`);
    if (sk.kind === 'inner') info.push(sk.range ? `射程 ${sk.range}` : '自身');
    if (sk.mul) info.push(`倍率 ${skillLvVal(sk.mul, sk.perLv, Math.max(1, lv)).toFixed(2)}${sk.hits ? '×' + sk.hits : ''}${sk.aoe ? '・範圍' : ''}`);
    return `<div class="list-row"><div><b>${sk.name}</b> <span class="muted">${lv ? '第 ' + lv + ' 重' : '未習得'}</span><br><small>${sk.desc}</small><br><small class="muted">${info.join('・')}</small></div>
    <div class="btns">${lv ? hotbarSelect(sk.id) : ''}<button class="mini" ${locked || max || G.xiuwei < cost ? 'disabled' : ''} onclick="${learnFn}('${sk.id}')">${locked ? sk.unlock + ' 級' : max ? '圓滿' : (lv ? '升級' : '習得') + ' ' + fmt(cost)}</button></div></div>`;
}

function paneSkill() {
    const sect = sectOf(G);
    let h = `<p class="muted small">修為 <b class="xw">${fmt(G.xiuwei)}</b>（打怪獲得）。內功在此修練；外功到柳溪鎮武館學。<br>
    <label><input type="checkbox" ${G.huntSkills ? 'checked' : ''} onchange="toggleHuntSkills()"> 掛機時自動施放快捷欄武學</label></p>
    <h4>${sect.name}・內功</h4>`;
    for (const sk of sect.skills) h += skillRow(SKILL_INDEX[sk.id], 'upSkill');
    const L = G.inner, ic = skillCost(L + 1) * 2;
    h += `<h4>心法</h4><div class="list-row"><div><b>${sect.inner.name}</b> <span class="muted">第 ${L} 重</span><br><small>${sect.inner.desc}</small></div>
    <button class="mini" ${L >= SKILL_MAX || G.xiuwei < ic ? 'disabled' : ''} onclick="upInner()">${L >= SKILL_MAX ? '圓滿' : '修練 ' + fmt(ic)}</button></div><h4>已學外功</h4>`;
    let any = false;
    for (const wt in OUTER_SKILLS) for (const sk of OUTER_SKILLS[wt]) if (G.skills[sk.id]) {
        any = true;
        h += `<div class="list-row"><div><b>${sk.name}</b> <span class="muted">${WEAPON_TYPES[wt].name}・第 ${G.skills[sk.id]} 重</span></div><div class="btns">${hotbarSelect(sk.id)}</div></div>`;
    }
    if (!any) h += '<p class="muted">尚未學外功。</p>';
    h += `<h4>丹藥</h4>`;
    for (const k in CONSUMABLES) h += `<div class="list-row"><div>${CONSUMABLES[k].icon} ${CONSUMABLES[k].name} <span class="muted">×${G.pots[k]}</span></div><div class="btns">${hotbarSelect('pot:' + k)}</div></div>`;
    return h;
}

function paneOuter() {
    const wt = weaponType(G);
    let h = `<p class="muted small">外功各派共用，需裝備對應兵器才能施放。目前兵器：<b>${WEAPON_TYPES[wt].name}</b>。修為 <b class="xw">${fmt(G.xiuwei)}</b></p>`;
    for (const t in OUTER_SKILLS) {
        h += `<h4>${WEAPON_TYPES[t].name}法</h4>`;
        for (const sk of OUTER_SKILLS[t]) h += skillRow(SKILL_INDEX[sk.id], 'upSkill');
    }
    return h;
}

function paneBag() {
    let h = `<div class="opt-row"><span>行囊 ${G.bag.length}/${BAG_MAX}</span><span>擊殺時自動賣出</span><select onchange="setAutoSell(this.value)">
    <option value="-1" ${G.autoSell < 0 ? 'selected' : ''}>不賣</option>${QUALITY.slice(0, 3).map((q, i) => `<option value="${i}" ${G.autoSell === i ? 'selected' : ''}>${q.name}以下</option>`).join('')}</select>
    <button class="mini secondary" onclick="sellBelow(1)">賣良品以下</button></div>`;
    const list = G.bag.slice().sort((a, b) => b.q - a.q || b.lv - a.lv);
    if (!list.length) h += '<p class="muted">行囊空空。打怪會掉落裝備。</p>';
    for (const it of list) {
        const cur = G.equip[it.slot], diff = gearScore(it) - (cur ? gearScore(cur) : 0);
        h += `<div class="list-row"><div>${gearLabel(it)} <small class="muted">${slotName(it)}・Lv.${it.lv}</small> <small class="${diff > 0 ? 'good' : 'bad'}">${diff > 0 ? '▲' : '▼'}${Math.abs(diff)}</small><br><small>${gearStatText(it)}</small></div>
        <div class="btns"><button class="mini" ${it.lv > G.lv ? 'disabled' : ''} onclick="equipItem('${it.id}')">${it.lv > G.lv ? 'Lv 不足' : '裝備'}</button><button class="mini secondary" onclick="sellItem('${it.id}')">賣 ${sellPrice(it)}</button></div></div>`;
    }
    return h;
}

function paneMap() {
    let h = '<p class="muted small">走到地圖邊緣的傳送陣前往相鄰地圖；也可在柳溪鎮驛站付銀兩直達。點小地圖可自動走過去。</p>';
    for (const id of MAP_ORDER) {
        const m = MAPS[id];
        h += `<div class="list-row ${G.map === id ? 'here' : ''}"><div><b>${m.name}</b> <span class="muted">${mapLvText(m)}</span>${G.map === id ? ' <span class="gold">◀ 所在地</span>' : ''}<br>
        <small class="muted">${m.town ? 'NPC：' + m.npcs.map(n => n.name).join('、') : m.mobs.map(g => `${g.name} ${g.lv}`).join('、') + `・首領 ${m.boss.name} ${m.boss.lv}`}</small></div></div>`;
    }
    return h;
}

function paneShop() {
    let h = '';
    for (const k in CONSUMABLES) {
        const c = CONSUMABLES[k];
        h += `<div class="list-row"><div>${c.icon} <b>${c.name}</b> <span class="muted">持有 ${G.pots[k]}</span><br><small>${c.desc}・每個 ${c.price} 兩</small></div>
        <div class="btns"><button class="mini" onclick="buyPot('${k}',10)">買 10</button><button class="mini" onclick="buyPot('${k}',50)">買 50</button></div></div>`;
    }
    h += `<h4>自動用藥（冷卻 ${POT_CD} 秒）</h4><div class="opt-row"><span>氣血低於</span><input type="number" min="0" max="90" value="${G.autoPot.hp}" onchange="setAutoPot('hp',this.value)">%</div>
    <div class="opt-row"><span>真氣低於</span><input type="number" min="0" max="90" value="${G.autoPot.mp}" onchange="setAutoPot('mp',this.value)">%</div>`;
    return h;
}

function paneSmith() {
    let h = `<p class="muted small">強化身上裝備。+7 以上失敗會掉一級；兵器 +5 以上會發光。銀兩 <b class="gold">${fmt(G.silver)}</b></p>`;
    for (const sl of SLOTS) {
        const it = G.equip[sl.id];
        if (!it) { h += `<div class="list-row"><div class="muted">${sl.name}：（空）</div></div>`; continue; }
        const top = it.plus >= ENHANCE_MAX;
        h += `<div class="list-row"><div>${gearLabel(it)}<br><small>${gearStatText(it)}</small><br><small class="muted">${top ? '已強化到頂' : `成功率 ${ENHANCE_RATE[it.plus]}%`}</small></div>
        <button class="mini" ${top || G.silver < enhanceCost(it) ? 'disabled' : ''} onclick="enhanceItem('${sl.id}')">強化 ${fmt(enhanceCost(it))}兩</button></div>`;
    }
    return h;
}

function travelCost(id) { return MAPS[id].town ? 0 : 20 + MAPS[id].mobs[0].lv * 8; }
function paneTravel() {
    let h = '<p class="muted small">付銀兩直接坐車到各地圖入口。</p>';
    for (const id of MAP_ORDER) {
        if (id === 'town') continue;
        const m = MAPS[id], c = travelCost(id);
        h += `<div class="list-row"><div><b>${m.name}</b> <span class="muted">${mapLvText(m)}</span></div><button class="mini" ${G.silver < c ? 'disabled' : ''} onclick="travelTo('${id}')">${c} 兩</button></div>`;
    }
    return h;
}

function paneSet() {
    return `<h4>存檔</h4><p class="muted small">每 10 秒自動存在這台裝置的瀏覽器。換裝置請用匯出／匯入。<br>離線時若在野外開著掛機，回來可領 ${OFFLINE_RATE * 100}% 收益（最多 ${OFFLINE_MAX_H} 小時）。</p>
    <div class="btns"><button onclick="doSave()">立即存檔</button><button class="secondary" onclick="doExport()">匯出</button><button class="secondary" onclick="doImport()">匯入</button><button class="secondary" onclick="goTown()">回城</button></div>
    <textarea id="save-text" placeholder="匯出的存檔字串會出現在這裡；匯入時貼上後按「匯入」"></textarea>
    <h4>操作說明</h4><p class="small muted">點地面移動・點怪物攻擊・點 NPC 對話・點小地圖自動走過去<br>數字鍵 1～8 施放快捷欄・Esc 關閉視窗・H 開關掛機</p>
    <h4>危險操作</h4><button class="danger" onclick="resetGame()">刪除角色重新開始</button>
    <p class="muted small">版本 ${GAME_VERSION}</p>`;
}

// ── 玩家操作（皆為頂層函式，供 onclick 使用） ──
function addAttr(k) { if (G.points <= 0) return; G.attr[k]++; G.points--; markDirty(); }
function toggleAutoAttr() { G.autoAttr = !G.autoAttr; if (G.autoAttr) autoAllocate(); markDirty(); }
function changeLook(k, v) { G.look[k] = v; markDirty(); }
function toggleHuntSkills() { G.huntSkills = !G.huntSkills; markDirty(); }
function toggleHunt() {
    if (G.lv < AUTO_HUNT_LV) { showToast(`${AUTO_HUNT_LV} 級開放自動練功`); return; }
    G.autoHunt = !G.autoHunt;
    if (!G.autoHunt) { W.target = null; W.moveTo = null; }
    showToast(G.autoHunt ? '開始自動練功' : '停止自動練功');
    if (G.autoHunt && MAPS[G.map].town) showToast('請先到野外地圖');
    markDirty();
}

function assignHotkey(id, v) {
    const old = G.hotbar.indexOf(id);
    if (old >= 0) G.hotbar[old] = null;
    if (v !== '') G.hotbar[+v] = id;
    markDirty();
}

function upSkill(id) {
    const sk = skillDef(id), lv = G.skills[id] || 0, cost = skillCost(Math.max(1, lv));
    if (!sk || G.lv < sk.unlock || lv >= SKILL_MAX || G.xiuwei < cost) return;
    G.xiuwei -= cost; G.skills[id] = lv + 1;
    if (lv === 0) {
        const empty = G.hotbar.indexOf(null);
        if (empty >= 0) G.hotbar[empty] = id;
        addLog(`習得武學「${sk.name}」`, 'gold');
    }
    markDirty();
}
function upInner() {
    const cost = skillCost(G.inner + 1) * 2;
    if (G.inner >= SKILL_MAX || G.xiuwei < cost) return;
    G.xiuwei -= cost; G.inner++;
    addLog(`${sectOf(G).inner.name}修練至第 ${G.inner} 重`, 'gold');
    markDirty();
}

function equipItem(id) {
    const i = G.bag.findIndex(x => x.id === id); if (i < 0) return;
    const it = G.bag[i]; if (it.lv > G.lv) return;
    G.bag.splice(i, 1);
    if (G.equip[it.slot]) G.bag.push(G.equip[it.slot]);
    G.equip[it.slot] = it;
    markDirty();
    G.hp = Math.min(G.hp, W.stats.hp); G.mp = Math.min(G.mp, W.stats.mp);
}
function unequip(slot) {
    if (!G.equip[slot]) return;
    if (G.bag.length >= BAG_MAX) { showToast('行囊已滿'); return; }
    G.bag.push(G.equip[slot]); G.equip[slot] = null; markDirty();
}
function sellItem(id) {
    const it = G.bag.find(x => x.id === id); if (!it) return;
    const doSell = () => { const j = G.bag.indexOf(it); if (j < 0) return; G.bag.splice(j, 1); G.silver += sellPrice(it); markDirty(); };
    if (it.q >= 3 || it.plus > 0) gameConfirm(`確定賣出 ${gearLabel(it)}？`, doSell); else doSell();
}
function sellBelow(q) {
    const list = G.bag.filter(x => x.q <= q && x.plus === 0);
    if (!list.length) { showToast('沒有可賣的裝備'); return; }
    let sum = 0; for (const it of list) sum += sellPrice(it);
    gameConfirm(`賣出 ${list.length} 件${QUALITY[q].name}以下裝備，得 ${sum} 兩？`, () => {
        G.bag = G.bag.filter(x => !list.includes(x)); G.silver += sum; markDirty();
    });
}
function setAutoSell(v) { G.autoSell = +v; markDirty(); }

function enhanceItem(slot) {
    const it = G.equip[slot]; if (!it || it.plus >= ENHANCE_MAX) return;
    const cost = enhanceCost(it);
    if (G.silver < cost) { showToast('銀兩不足'); return; }
    G.silver -= cost;
    const rate = ENHANCE_RATE[it.plus];
    if (Math.random() * 100 < rate) { it.plus++; addLog(`強化成功！${gearLabel(it)}`, 'good'); showToast('強化成功'); }
    else if (it.plus >= 7) { it.plus--; addLog(`強化失敗，${gearLabel(it)} 掉了一級`, 'bad'); showToast('強化失敗，掉一級'); }
    else { addLog(`強化失敗（成功率 ${rate}%）`, 'bad'); showToast('強化失敗'); }
    markDirty();
}

function buyPot(k, n) {
    const price = CONSUMABLES[k].price * n;
    if (G.silver < price) { showToast('銀兩不足'); return; }
    G.silver -= price; G.pots[k] += n; markDirty();
}
function setAutoPot(k, v) { G.autoPot[k] = clamp(+v || 0, 0, 90); markDirty(); }

function travelTo(id) {
    const c = travelCost(id);
    if (G.silver < c) { showToast('銀兩不足'); return; }
    G.silver -= c; panel = null;
    const p = MAPS[id].portals[0];
    enterMap(id, p.tx, p.ty);
    addLog(`坐車抵達 ${MAPS[id].name}`); markDirty();
}
function goTown() {
    if (W.revive > 0 || G.map === 'town') return;
    enterMap('town'); panel = null; addLog('回到柳溪鎮'); markDirty();
}

function doSave() { saveGame(); showToast('已存檔'); }
function doExport() { $('save-text').value = exportSave(); showToast('已匯出，請複製保存'); }
function doImport() {
    const txt = $('save-text').value;
    if (!txt.trim()) { showToast('請先貼上存檔字串'); return; }
    gameConfirm('匯入會覆蓋目前角色，確定？', () => {
        if (importSaveText(txt)) { startGame(); showToast('匯入成功'); } else showToast('存檔字串無效');
    });
}
function resetGame() {
    gameConfirm('<b class="bad">角色將永久刪除</b>，確定重新開始？', () => {
        try { localStorage.removeItem(SAVE_KEY); } catch (e) { }
        G = null; W = null; logs = []; panel = null; renderCreate();
    });
}
