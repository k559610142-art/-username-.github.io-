// 異界地圖排程：最多六種地圖，各列依張數刷完才換下一列（第126節）。
// 載入於ui-frame後；maps／combat只在執行期呼叫本檔，排程不參與離線模擬。
const MAP_QUEUE_MAX = 6;
function mapQueueGet() {
    if (!player.mapQueue) player.mapQueue = { slots: [], state: 'idle', index: 0, active: false, reason: '' };
    return player.mapQueue;
}
function mapQueueNormalize(p) {
    const q = p.mapQueue;
    if (!q || !Array.isArray(q.slots)) { p.mapQueue = null; return; }
    const seen = new Set();
    q.slots = q.slots.slice(0, MAP_QUEUE_MAX).map(s => {
        if (!s || typeof s.key !== 'string' || !Array.isArray(s.uids)) return null;
        const uids = s.uids.filter(u => {
            if (!Number.isSafeInteger(u) || u < 1 || seen.has(u)) return false;
            seen.add(u); return true;
        });
        return { key: s.key, name: String(s.name || '異界地圖'), uids,
            done: Math.max(0, Math.floor(Number(s.done) || 0)), failed: Math.max(0, Math.floor(Number(s.failed) || 0)),
            skipped: Math.max(0, Math.floor(Number(s.skipped) || 0)), craftSkip: Math.max(0, Math.floor(Number(s.craftSkip) || 0)) };
    });
    q.index = clamp(Math.floor(Number(q.index) || 0), 0, MAP_QUEUE_MAX);
    q.active = q.active === true;
    const wasRunning = q.state === 'running';
    q.state = ['idle', 'paused', 'done'].includes(q.state) ? q.state : 'paused';
    q.reason = wasRunning ? '重新登入，等待自動接續' : String(q.reason || '');
    if (q.active || wasRunning) p.hunting = false;
    if (q.active && (!q.slots[q.index] || !(p.mapRun || p.mapPortal) || (p.mapRun || p.mapPortal).queueSlot !== q.index)) {
        q.active = false; q.state = 'paused'; q.reason = '目前地圖已關閉，請確認後繼續';
    }
}
function mapQueueChoices(index) {
    const q = mapQueueGet(), used = new Set(q.slots.filter((s, i) => s && i !== index).map(s => s.key));
    // 未鑑定地圖也能排程（第254節）：同階級的未鑑定合成一種，輪到時才在村莊自動鑑定
    return groupMaps(player.inv.filter(x => ITEMS[x.id] && ITEMS[x.id].cat === 'map')).filter(g => !used.has(mapKindKey(g.x)));
}
function mapQueueChoose(index) {
    if (mapQueueGet().state !== 'idle') return;
    const groups = mapQueueChoices(index);
    const html = '<small class="muted">普通白色・魔法藍色・稀有黃色・未鑑定（輪到時自動鑑定）</small><div class="list map-queue-choices">' + (groups.map(g => `<button class="map-queue-choice" onclick="mapQueuePick(${index},${g.x.uid})"><b class="${itemClass(g.x)}">${esc(itemName(g.x))}</b><small>${esc(mapZoneFor(ITEMS[g.x.id].tier).name)}・持有 ${g.count} 張</small></button>`).join('') || '<p class="muted">沒有可安排的地圖</p>') + '</div>';
    openDialog('地圖 ' + (index + 1) + '：選擇地圖', html, [{ text: '關閉', cls: 'secondary' }]);
}
function mapQueueDetail(index, selected = false) {
    if (!Number.isInteger(index) || index < 0 || index >= MAP_QUEUE_MAX) return;
    let x;
    if (selected) {
        const sel = $('map-queue-select-' + index);
        x = sel && findInv(Number(sel.value));
        if (!x || !ITEMS[x.id] || ITEMS[x.id].cat !== 'map') { showToast('請先選擇地圖'); return; }
    } else {
        const s = mapQueueGet().slots[index];
        if (!s) return;
        // key 已保留完整種類，卷軸用完仍能查看，不新增存檔欄位。
        const [id, q, mods, nm] = s.key.split('|');
        if (q === 'unidentified') x = { id, unidentified: true };
        else {
            if (!ITEMS[id] || ITEMS[id].cat !== 'map' || (q && !QUALITY[q])) return;
            x = { id, q, mm: (mods || '').split(',').filter(k => MAP_MODS[k]), nm };
        }
        if (!ITEMS[id] || ITEMS[id].cat !== 'map') return;
    }
    openDialog('地圖 ' + (index + 1) + '：詳情', '<b class="' + itemClass(x) + '">' + esc(itemName(x)) + '</b><br>' + mapDescHtml(x));
}
function mapQueuePick(index, uid) {
    if (mapQueueGet().state !== 'idle') return;
    const g = mapQueueChoices(index).find(g => g.x.uid === uid), sel = $('map-queue-select-' + index), btn = $('map-queue-pick-' + index);
    if (!g || !sel || !btn) return;
    sel.value = String(uid);
    btn.innerHTML = `<span class="${itemClass(g.x)}">${esc(itemName(g.x))}</span>・${esc(mapZoneFor(ITEMS[g.x.id].tier).name)}（${g.count} 張） ▾`;
    mapQueueSelectChanged(index);
    closeDialog();
}
function mapQueueSet(index) {
    const q = mapQueueGet();
    if (q.state !== 'idle' || !Number.isInteger(index) || index < 0 || index >= MAP_QUEUE_MAX) return;
    const sel = $('map-queue-select-' + index), qty = $('map-queue-qty-' + index);
    const x = sel && findInv(Number(sel.value)), n = qty && Number(qty.value);
    if (!x || !ITEMS[x.id] || ITEMS[x.id].cat !== 'map') { showToast('請先選擇地圖'); return; }
    const key = mapKindKey(x), g = mapQueueChoices(index).find(g => mapKindKey(g.x) === key);
    if (!g || !Number.isSafeInteger(n) || n < 1 || n > g.count) { showToast('張數需為整數，且不能超過背包持有數量'); return; }
    const uids = player.inv.filter(x => ITEMS[x.id].cat === 'map' && mapKindKey(x) === key).slice(0, n).map(x => x.uid);
    q.slots[index] = { key, name: itemName(x) + '・' + mapZoneFor(ITEMS[x.id].tier).name, uids, done: 0, failed: 0, skipped: 0, craftSkip: 0 };
    saveGame(); refreshUI();
}
function mapQueueSelectChanged(index) {
    const sel = $('map-queue-select-' + index), qty = $('map-queue-qty-' + index);
    if (!sel || !qty) return;
    const g = mapQueueChoices(index).find(g => g.x.uid === Number(sel.value));
    qty.max = g ? g.count : 1;
    qty.value = Math.max(1, Math.min(Number(qty.value) || 1, Number(qty.max)));
}
function mapQueueRemove(index) {
    const q = mapQueueGet();
    if (q.state !== 'idle') return;
    q.slots[index] = null; saveGame(); refreshUI();
}
function mapQueueMove(index, delta) {
    const q = mapQueueGet(), to = index + delta;
    if (q.state !== 'idle' || to < 0 || to >= MAP_QUEUE_MAX) return;
    [q.slots[index], q.slots[to]] = [q.slots[to] || null, q.slots[index] || null];
    saveGame(); refreshUI();
}
function mapQueueAutoPause(reason) {
    const q = player && player.mapQueue;
    if (SIM_MODE || !q || q.state !== 'running') return;
    q.state = 'paused'; q.reason = reason || '掛機已停止';
    addLog('📋 地圖排程暫停：' + q.reason, 'warn');
}
function mapQueueLost(reason) {
    const q = player && player.mapQueue;
    if (SIM_MODE || !q || !q.active) return;
    const s = q.slots[q.index];
    if (s) s.failed++;
    q.active = false;
    mapQueueAutoPause(reason || '目前地圖已關閉');
    if (q.state === 'paused') q.reason = reason || '目前地圖已關閉';
}
function mapQueueCompleted(r) {
    const q = player && player.mapQueue;
    if (SIM_MODE || !q || !q.active || r.queueSlot !== q.index) return;
    const s = q.slots[q.index];
    if (s) s.done++;
    q.active = false;
}
// 「怪物清空後不打首領」（第184節）：勾選存在 player.settings.mapSkipBoss（取消排程也保留），執行中隨時可切換。
// 排程中的地圖怪物清空（或接續時首領已現身）→ 不打首領、地圖關閉不給通關獎勵、直接回村，下一輪 mapQueueTick 開下一張。
function mapQueueSkipBossOn() { return !!(player && player.settings.mapSkipBoss); }
function mapQueueSetSkipBoss(on) {
    player.settings.mapSkipBoss = !!on;
    saveGame();
    showToast(on ? '📋 排程地圖清完怪物後不打首領，直接回村換下一張' : '📋 排程地圖清完怪物後照常挑戰首領');
}
function mapQueueSkipBoss(r) {
    const q = player && player.mapQueue;
    if (SIM_MODE || !mapQueueSkipBossOn() || !q || q.state !== 'running' || !q.active || !r || r !== player.mapRun || r.queueSlot !== q.index || r.left > 0) return false;
    const s = q.slots[q.index], z = ZONE_BY_ID[r.zone];
    if (s) s.skipped++;
    q.active = false;
    player.mapRun = null;
    addLog(`📋 ${r.name}的怪物已清空，依排程設定不打首領，直接回村換下一張`, 'boss');
    moveToTown(z.town);
    return true;
}
// ───────── 自動打造地圖（第254節）─────────
// 全部排程共用一份設定 player.settings.mapCraft；輪到哪張才處理哪張，不會一次洗整疊。
// 普通可依設定用點化石／晉升石升級；有勾選的不要詞綴時，魔法用重鑄石、稀有用混沌石重洗，直到乾淨或用到上限。財寶圖不改造。
const MAP_CRAFT_DEFAULT = { on: false, bad: [], aug: false, regal: false, max: 5, keep: 0, giveup: true };
function mapCraftCfg() {
    const c = Object.assign({}, MAP_CRAFT_DEFAULT, player.settings.mapCraft || {});
    c.on = c.on === true; c.aug = c.aug === true; c.regal = c.regal === true; c.giveup = c.giveup !== false;
    c.bad = [...new Set(Array.isArray(c.bad) ? c.bad : [])].filter(k => MAP_MODS[k]);
    c.max = clamp(Math.floor(Number(c.max) || 0), 0, 99); c.keep = clamp(Math.floor(Number(c.keep) || 0), 0, 9999);
    return player.settings.mapCraft = c;
}
function mapCraftSet(k, v) {
    const c = mapCraftCfg();
    if (['on', 'aug', 'regal', 'giveup'].includes(k)) c[k] = !!v;
    else if (k === 'max' || k === 'keep') c[k] = v;
    else if (MAP_MODS[k]) c.bad = v ? [...c.bad, k] : c.bad.filter(x => x !== k);
    else return;
    mapCraftCfg(); saveGame();
}
// 回傳 'open'（照開）或 'skip'（仍有不要的詞綴且設定略過）
function mapCraftAuto(x) {
    const c = mapCraftCfg();
    if (!c.on || isTreasureMap(x) || x.unidentified === true) return 'open';
    let used = 0;
    const use = cid => countItem(cid) > c.keep && used < c.max && currencyCan(cid, x) && !useCurrency(cid, x.uid) && ++used;
    if (!x.q && c.aug) use('curAug');
    if (x.q === 'magic' && c.regal) use('curRegal');
    const dirty = () => (x.mm || []).some(k => c.bad.includes(k));
    while (dirty() && use(x.q === 'magic' ? 'curAlt' : 'curChaos'));
    if (used) addLog(`📋 自動打造：用了 ${used} 顆通貨 → ${itemName(x)}`, 'sys');
    return dirty() && c.giveup ? 'skip' : 'open';
}
function mapCraftHtml() {
    const c = mapCraftCfg(), chk = (k, on) => `${on ? 'checked' : ''} onchange="mapCraftSet('${k}',this.checked)"`;
    return `<div class="panel map-craft"><b>⚒️ 自動打造地圖（全部排程共用）</b><small class="muted">每次輪到一張地圖才處理那一張：未鑑定先自動鑑定，再依下面設定用通貨洗詞綴。傳奇財寶圖不改造。</small>
        <label class="set-row"><span>啟用自動打造</span><input type="checkbox" ${chk('on', c.on)}></label>
        <small>❌ 勾選不要的詞綴（出現就用通貨重洗：魔法用重鑄石、稀有用混沌石）</small>
        <div class="map-craft-mods">${MAP_MOD_KEYS.map(k => `<label class="map-craft-mod"><input type="checkbox" ${chk(k, c.bad.includes(k))}><span>${MAP_MODS[k].icon} ${MAP_MODS[k].name}<small>${esc(MAP_MODS[k].desc)}</small></span></label>`).join('')}</div>
        <label class="set-row"><span>普通地圖用點化石升成魔法</span><input type="checkbox" ${chk('aug', c.aug)}></label>
        <label class="set-row"><span>魔法地圖用晉升石升成稀有</span><input type="checkbox" ${chk('regal', c.regal)}></label>
        <div class="btn-row"><label>每張最多用 <input type="number" inputmode="numeric" min="0" max="99" value="${c.max}" onchange="mapCraftSet('max',this.value)"> 顆</label><label>每種通貨保留 <input type="number" inputmode="numeric" min="0" value="${c.keep}" onchange="mapCraftSet('keep',this.value)"> 顆不用</label></div>
        <label class="set-row"><span>用到上限仍有不要的詞綴就略過這張（不勾＝照樣開圖）</span><input type="checkbox" ${chk('giveup', c.giveup)}></label></div>`;
}
function mapQueueSupplyReason() {
    if (barHealAuto() && healPotionCount() === 0) return '藥水用完，請先補給';
    const st = calcStats();
    if (invWeight() >= st.weightMax * player.settings.weightPct / 100) return '負重過高，請先整理背包';
    const w = st.weapon && WEAPON_TYPES[st.weapon.type];
    if (w && w.ranged && countItem(w.ammo) + countItem(w.ammo === 'arrow' ? 'silverArrow' : 'silverBullet') === 0) return '彈藥用完，請先補給';
    return '';
}
function mapQueueStart() {
    const q = mapQueueGet();
    if (q.state === 'running' || q.state === 'done') return;
    if (!q.active && !q.slots.some(s => s && s.uids.length)) {
        if (q.slots.some(s => s && (s.done || s.failed))) {
            q.state = 'done'; q.reason = '安排的卷軸已全部使用'; saveGame(); refreshUI();
        } else showToast('請先安排地圖與張數');
        return;
    }
    const r = player.mapRun || player.mapPortal;
    if (r && (!q.active || r.queueSlot !== q.index)) { showToast('請先完成或關閉目前的異界地圖'); return; }
    if (player.mapRun && !inMapRun()) { showToast('目前不在排程異界區域，請先返回原區域或取消排程'); return; }
    if (!r && !inTown()) { showToast('請先回村莊開始地圖排程'); return; }
    if (walkHome) { showToast('正在步行回村'); return; }
    const why = mapQueueSupplyReason();
    if (why) { showToast(why); return; }
    if (!lootCanPlay()) return;
    q.state = 'running'; q.reason = '';
    if (q.active && r) {
        if (player.mapPortal) { scene = null; enterMapPortal(); }
        else if (!player.hunting) startHunt();
    } else {
        q.active = false;
        mapQueueTick();
    }
    saveGame(); refreshUI();
}
function mapQueuePause() {
    const q = player.mapQueue;
    if (!q || q.state !== 'running') return;
    mapQueueAutoPause('手動暫停');
    if (q.active && player.hunting) stopHunt('⏸ 暫停地圖排程');
    saveGame(); refreshUI();
}
function mapQueueCancel() {
    if (!player.mapQueue) return;
    const owner = player, expected = player.mapQueue;
    gameConfirm('取消地圖排程', '清除全部排程？未使用的卷軸仍在背包，目前地圖進度會保留並停止掛機。', () => {
        if (player !== owner || player.mapQueue !== expected) return;
        const q = player.mapQueue;
        if (!q) return;
        if (q.active && player.hunting) stopHunt('⏹ 取消地圖排程');
        for (const r of [player.mapRun, player.mapPortal]) if (r) delete r.queueSlot;
        player.mapQueue = null;
        saveGame(); refreshUI();
    }, '取消排程');
}
function mapQueueTick() {
    const q = player && player.mapQueue;
    if (SIM_MODE || !q) return;
    // 讀檔先停止離線模擬，正式上線且連線就緒後，接回仍在野外的原排程地圖。
    if (q.state === 'paused' && ['重新登入，等待自動接續', '重新進入角色，請按繼續'].includes(q.reason)
        && q.active && player.mapRun && player.mapRun.queueSlot === q.index && inMapRun() && player.hp > 0 && !walkHome) {
        if (offlineHold || !['legacy', 'active'].includes(lootMode) || !lootCanPlay()) return;
        const why = mapQueueSupplyReason();
        if (why) { q.reason = why; saveGame(); return; }
        mapQueueStart();
        return;
    }
    if (q.state !== 'running') return;
    if (q.active) {
        if (player.mapRun && player.hunting && inMapRun() && mapQueueSkipBoss(player.mapRun)) { saveGame(); return; }   // 中途才勾選、或接續時首領已現身
        if (!player.mapRun && !player.mapPortal) mapQueueLost('目前地圖已關閉');
        else if (player.mapPortal || !player.hunting) mapQueueAutoPause('已回村或停止掛機，請按繼續');
        else if (!inMapRun()) { mapQueueAutoPause('已離開排程異界區域'); stopHunt(); }
        return;
    }
    while (q.index < MAP_QUEUE_MAX && (!q.slots[q.index] || !q.slots[q.index].uids.length)) q.index++;
    if (q.index >= MAP_QUEUE_MAX) {
        q.state = 'done'; q.reason = '全部地圖已刷完';
        addLog('📋 地圖排程完成！', 'boss'); saveGame(); return;
    }
    if (!inTown() || player.mapRun || player.mapPortal || walkHome) { mapQueueAutoPause('要在村莊且沒有其他異界，才能開下一張'); saveGame(); return; }
    const why = mapQueueSupplyReason();
    if (why) { mapQueueAutoPause(why); saveGame(); return; }
    if (!lootCanPlay()) { mapQueueAutoPause('後端掉寶連線尚未就緒，請稍後繼續'); saveGame(); return; }
    const s = q.slots[q.index], uid = s.uids[0], x = findInv(uid);
    if (!x || !ITEMS[x.id] || ITEMS[x.id].cat !== 'map' || mapKindKey(x) !== s.key) {
        mapQueueAutoPause('安排的卷軸已不在背包或已被改造，請取消後重新安排'); saveGame(); return;
    }
    // 一次只處理輪到的這一張：未鑑定先鑑定，再依共用設定自動打造（第254節）
    if (x.unidentified === true) identifyMapInst(x);
    if (mapCraftAuto(x) === 'skip') {
        s.uids.shift(); s.craftSkip++;
        addLog(`📋 ${itemName(x)}仍有不要的詞綴，略過這張（留在背包）`, 'warn');
        saveGame(); return;
    }
    q.active = true;
    s.uids.shift();
    // 同一個tick通關回村又開圖，大地圖key可能相同，需清掉前張的角色位置。
    scene = null;
    openMap(uid, true);
    if (player.mapRun) player.mapRun.queueSlot = q.index;
    else { if (mapKindKey(x) === s.key) s.uids.unshift(uid); q.active = false; mapQueueAutoPause('無法開啟地圖'); }   // 已鑑定／打造過的這張留在背包，不再放回排程
    saveGame();
}
function mapQueueLiveHtml() {
    const q = mapQueueGet(), names = { idle: '尚未開始', running: '執行中', paused: '已暫停', done: '已完成' };
    const r = q.active && (player.mapRun || player.mapPortal);
    return `<b>📋 ${names[q.state]}</b>${q.reason ? `<small>${esc(q.reason)}</small>` : ''}${r ? `<small>目前第 ${q.index + 1} 格・<span class="${(QUALITY[r.q] || {}).cls || ''}">${esc(r.name)}</span>・${r.left > 0 ? `剩 ${fmt(r.left)} / ${fmt(r.total)} 隻` : '等待擊倒首領'}</small>` : ''}
        <div class="btn-row"><button onclick="mapQueueStart()" ${q.state === 'running' || q.state === 'done' ? 'disabled' : ''}>▶ ${q.state === 'paused' ? '繼續' : '開始'}</button><button class="secondary" onclick="mapQueuePause()" ${q.state === 'running' ? '' : 'disabled'}>⏸ 暫停</button><button class="danger" onclick="mapQueueCancel()">⏹ 取消</button></div>`;
}
function mapQueueRowStatus(i) {
    const q = mapQueueGet(), s = q.slots[i];
    const active = q.active && q.index === i;
    return s ? `共 ${s.done + s.failed + s.skipped + (s.craftSkip || 0) + s.uids.length + (active ? 1 : 0)} 張・完成 ${s.done} 次${s.skipped ? `・略過首領 ${s.skipped} 次` : ''}${s.craftSkip ? `・詞綴不合略過 ${s.craftSkip} 張` : ''}${s.failed ? `・中斷 ${s.failed} 次` : ''}・${active ? '進行中 1 張・' : ''}待刷 ${s.uids.length} 張` : '尚未安排';
}
function updateMapQueueLive() {
    const el = $('map-queue-live');
    if (!el || !player) return;
    setHtmlStable(el, mapQueueLiveHtml());
    for (let i = 0; i < MAP_QUEUE_MAX; i++) { const row = $('map-queue-status-' + i); if (row) row.textContent = mapQueueRowStatus(i); }
}
function renderMapQueue() {
    const q = mapQueueGet(), editable = q.state === 'idle';
    let h = `<div class="panel"><small>最多安排 6 種地圖，依第 1～6 格順序刷完。相同區域、階級、品質與詞綴的卷軸可放多張；未鑑定地圖依階級合成一種，輪到時自動鑑定。每次進圖才扣 1 張。</small><small class="muted">死亡、回村或補給不足會暫停；重開遊戲保留排程，需按繼續。取消不會扣掉未使用的卷軸。</small>
        <label class="set-row"><span>👹 怪物清空後不打首領，直接回村換下一張（沒有通關獎勵）</span><input type="checkbox" ${mapQueueSkipBossOn() ? 'checked' : ''} onchange="mapQueueSetSkipBoss(this.checked)"></label></div>${mapCraftHtml()}<div id="map-queue-live" class="panel">${mapQueueLiveHtml()}</div><div class="map-queue-grid">`;
    for (let i = 0; i < MAP_QUEUE_MAX; i++) {
        const s = q.slots[i], groups = mapQueueChoices(i);
        h += `<div class="panel map-queue-row"><b>地圖 ${i + 1}${s ? '：<span class="' + ((QUALITY[s.key.split('|')[1]] || {}).cls || '') + '">' + esc(s.name) + '</span>' : ''}</b><small id="map-queue-status-${i}">${esc(mapQueueRowStatus(i))}</small>
            ${s ? `<button class="mini secondary" onclick="mapQueueDetail(${i})">詳情</button>` : ''}<fieldset ${editable ? '' : 'disabled hidden'}><input type="hidden" id="map-queue-select-${i}" value="${s && groups.find(g => mapKindKey(g.x) === s.key) ? groups.find(g => mapKindKey(g.x) === s.key).x.uid : ''}"><button id="map-queue-pick-${i}" class="map-queue-picker secondary" aria-label="地圖 ${i + 1}" onclick="mapQueueChoose(${i})">${s ? '<span class="' + ((QUALITY[s.key.split('|')[1]] || {}).cls || '') + '">' + esc(s.name) + '</span>' : '選擇背包地圖'} ▾</button>
            <button class="mini secondary" onclick="mapQueueDetail(${i},true)">查看所選地圖</button><div class="btn-row"><input id="map-queue-qty-${i}" type="number" inputmode="numeric" min="1" value="${s ? Math.max(1, s.uids.length) : 1}" aria-label="地圖 ${i + 1} 張數"><span>張</span><button class="mini" onclick="mapQueueSet(${i})">設定</button><button class="mini secondary" onclick="mapQueueMove(${i},-1)" ${i ? '' : 'disabled'}>↑</button><button class="mini secondary" onclick="mapQueueMove(${i},1)" ${i < MAP_QUEUE_MAX - 1 ? '' : 'disabled'}>↓</button><button class="mini secondary" onclick="mapQueueRemove(${i})">清空</button></div></fieldset></div>`;
    }
    return h + '</div><small class="muted">開始後要更換地圖或張數，請先取消排程再重新設定。排程中的卷軸請留在背包。</small>';
}
TABS.mapQueue = ['📋', '地圖排程'];
PANEL_FNS.mapQueue = renderMapQueue;
