// 屠龍勇者：娃娃升級卷軸（後台計算；ARCHITECTURE.md 第 333 節，SQL tools/doll-upgrade.sql）
// 對娃娃使用：T4→T3→T2→T1→T0，從下一階的娃娃裡自己選一隻當作進化目標。成功率 5%，失敗維持原樣、沒有懲罰（卷軸用掉）。
// 卷軸數量存在伺服器（不是背包道具，改存檔加不了）；成功與否由伺服器擲骰（doll_upgrade），成功後遊戲把同一個道具實體（uid、強化值不變）換成目標娃娃。
// 取得：無限塔（survivor.js）第 10 層起每 5 層擊殺該層首領，向伺服器領 1 張（inf_claim，伺服器檢查這一趟與時間）。要登入帳號。
// 依賴（執行期）：player、DOLLS、findAnyInst、openDialog、dollAbilityHtml、marketRpc、lootChar、cloudLoggedIn…

const DOLL_UP_NAME = '娃娃升級卷軸';
const DOLL_UP_RATE = 0.05;   // 成功率 5%（實際由伺服器擲）
const DOLL_UP_NEXT = { T4: 'T3', T3: 'T2', T2: 'T1', T1: 'T0' };

let dollScrolls = null;   // 伺服器上的卷軸張數（null＝還沒讀到）
let dollUpState = null;   // { owner, uid＝要升級的娃娃, target＝選的進化目標 id, result, err, busy }

function dollUpOnline() { return typeof isCloudConfigured === 'function' && isCloudConfigured() && typeof cloudLoggedIn === 'function' && cloudLoggedIn(); }
function dollUpErrText(e) {
    const m = String((e && (e.message || e.details || e.hint)) || e || '');
    if (/does not exist|could not find|schema cache/i.test(m)) return '伺服器還沒開放娃娃升級（需要先安裝 tools/doll-upgrade.sql）';
    if (/no scrolls/.test(m)) return `沒有${DOLL_UP_NAME}了`;
    if (/bad upgrade|unknown doll/.test(m)) return '這隻娃娃不能升級成選的目標';
    if (/too early/.test(m)) return '這一趟進塔的時間不足，伺服器不發卷軸';
    if (/already claimed/.test(m)) return '這一層的卷軸已經領過了';
    if (/bad run/.test(m)) return '這一趟挑戰紀錄已失效（重新進塔或倒下後會重新計算）';
    if (/banned/.test(m)) return '帳號已被封鎖';
    if (/not logged in/.test(m)) return '請先登入帳號';
    return '連線失敗，請稍後再試';
}
function dollQualityOf(inst) { const d = inst && ITEMS[inst.id]; return d && d.doll && DOLLS[d.doll] ? DOLLS[d.doll].quality : ''; }
// 可以升級的娃娃：背包與裝備中（倉庫裡的要先取出），T0 已是最高
function dollUpCandidates() {
    const list = player.inv.filter(x => ITEMS[x.id] && ITEMS[x.id].cat === 'doll');
    if (player.equip.doll) list.unshift(player.equip.doll);
    return list.filter(x => DOLL_UP_NEXT[dollQualityOf(x)]);
}
function dollUpTargets(quality) { return Object.keys(DOLLS).filter(id => DOLLS[id].quality === DOLL_UP_NEXT[quality]); }

// 讀伺服器上的卷軸張數
async function dollScrollRefresh() {
    if (!dollUpOnline()) { dollScrolls = null; renderDollUp(); return; }
    const owner = player;
    try { const n = await marketRpc('doll_scroll_status', { p_char: lootChar() }); if (player === owner) dollScrolls = n; }
    catch (e) { if (dollUpState) dollUpState.err = dollUpErrText(e); }
    renderDollUp();
}

// uid：從娃娃的道具視窗打開時直接選好那隻
function openDollUpgrade(uid) {
    if (!player) return;
    dollUpState = { owner: player, uid: uid || 0, target: '', result: '', err: '', busy: false };
    openDialog('🎎 ' + DOLL_UP_NAME, '<div id="doll-up"></div>', [{ text: '關閉', cls: 'secondary' }]);
    renderDollUp();
    dollScrollRefresh();
}
function renderDollUp() {
    const S = dollUpState, box = $('doll-up');
    if (!S || S.owner !== player || !box) return;
    const online = dollUpOnline(), left = dollScrolls;
    const head = `<p>${online ? `持有${DOLL_UP_NAME}：<b>${left == null ? '讀取中…' : fmt(left)}</b> 張（存在伺服器）` : '<span class="bad">要登入帳號才能使用娃娃升級卷軸</span>'}｜成功率 <b>${Math.round(DOLL_UP_RATE * 100)}%</b>，失敗娃娃維持原樣</p>`
        + `<small class="muted">卷軸取得：無限塔第 10 層起每 5 層（10、15、20、25…）擊殺該層首領各 1 張。</small>`
        + (S.err ? `<p class="bad">${esc(S.err)}</p>` : '') + (S.result ? `<p role="status">${S.result}</p>` : '');
    const inst = S.uid && findAnyInst(S.uid);
    if (!inst || !DOLL_UP_NEXT[dollQualityOf(inst)]) {
        // 第一步：選要升級的娃娃
        S.uid = 0; S.target = '';
        const rows = dollUpCandidates().map(x => `<div class="list-row"><div>${itemThumbHtml(x.id)} <b class="${itemClass(x)}">${esc(itemName(x))}</b> <small>${dollQualityOf(x)} → ${DOLL_UP_NEXT[dollQualityOf(x)]}</small>${player.equip.doll === x ? ' <small class="good">裝備中</small>' : ''}</div><button onclick="dollUpPickDoll(${x.uid})">選擇</button></div>`).join('');
        box.innerHTML = head + '<p>選擇要升級的娃娃：</p><div class="list">' + (rows || '<p class="muted">沒有可以升級的娃娃（倉庫裡的請先取出；T0 已是最高階）</p>') + '</div>';
        return;
    }
    // 第二步：選進化目標
    const q = dollQualityOf(inst), nq = DOLL_UP_NEXT[q];
    const rows = dollUpTargets(q).map(id => {
        const it = 'doll_' + id, on = S.target === id;
        return `<div class="list-row"${on ? ' style="outline:1px solid #ffd86b"' : ''}><div>${itemThumbHtml(it)} <b class="doll-${nq}">${esc(DOLLS[id].name)}</b><small>${dollAbilityHtml(it)}</small></div><button class="${on ? '' : 'secondary'}" onclick="dollUpPickTarget('${id}')">${on ? '已選' : '選這隻'}</button></div>`;
    }).join('');
    const tgt = S.target && DOLLS[S.target];
    const can = tgt && online && left > 0 && !S.busy;
    box.innerHTML = head + `<p>升級：<b class="${itemClass(inst)}">${esc(itemName(inst))}</b>（${q}）→ 選一隻 ${nq} 當作進化目標：</p><div class="list">${rows}</div>`
        + `<p>${tgt ? `成功的話會變成 <b class="doll-${nq}">${esc(tgt.name)}</b>。` : '請先選擇進化目標。'}</p>`
        + `<button onclick="dollUpDo()" ${can ? '' : 'disabled'}>${S.busy ? '伺服器擲骰中…' : '使用卷軸（5%）'}</button> <button class="secondary" onclick="dollUpBack()" ${S.busy ? 'disabled' : ''}>換一隻娃娃</button>`;
}
function dollUpPickDoll(uid) { const S = dollUpState; if (!S || S.busy) return; S.uid = uid; S.target = ''; S.result = ''; S.err = ''; renderDollUp(); }
function dollUpPickTarget(id) { const S = dollUpState; if (!S || S.busy || !DOLLS[id]) return; S.target = id; renderDollUp(); }
function dollUpBack() { const S = dollUpState; if (!S || S.busy) return; S.uid = 0; S.target = ''; S.result = ''; S.err = ''; renderDollUp(); }
// 使用：伺服器扣卷軸、擲 5%；成功才在本機把娃娃換成目標
async function dollUpDo() {
    const S = dollUpState;
    if (!S || S.owner !== player || S.busy) return;
    const inst = findAnyInst(S.uid), q = dollQualityOf(inst);
    const ok = inst && (player.equip.doll === inst || player.inv.includes(inst)) && DOLL_UP_NEXT[q] && DOLLS[S.target] && DOLLS[S.target].quality === DOLL_UP_NEXT[q];
    if (!ok) { S.err = '娃娃或目標已變動，請重新選擇'; S.uid = 0; renderDollUp(); return; }
    if (!dollUpOnline()) { S.err = '請先登入帳號'; renderDollUp(); return; }
    if (dollScrolls != null && dollScrolls <= 0) { S.err = `沒有${DOLL_UP_NAME}了`; renderDollUp(); return; }
    const from = inst.id, to = 'doll_' + S.target, before = itemName(inst), owner = player;
    S.busy = true; S.err = ''; S.result = ''; renderDollUp();
    let r;
    try { r = await marketRpc('doll_upgrade', { p_char: lootChar(), p_from: from, p_to: to }); }
    catch (e) { S.busy = false; S.err = dollUpErrText(e); renderDollUp(); dollScrollRefresh(); return; }
    S.busy = false;
    if (player !== owner) return;
    dollScrolls = r.scrolls;
    if (r.ok) {
        // 擲骰期間娃娃被換掉／丟掉就不套用（伺服器已扣卷軸；極少見，記紀錄）
        if (inst.id !== from || !(player.equip.doll === inst || player.inv.includes(inst))) { S.err = '升級成功，但那隻娃娃已經不在身上，無法套用'; addLog(`🎎 娃娃升級成功但娃娃已不在身上：${before}`, 'sys'); renderDollUp(); return; }
        inst.id = to;
        if (player.equip.doll === inst) {
            if (typeof dollResetTransient === 'function') dollResetTransient();
            clampHpMp();
            if (typeof scene !== 'undefined' && scene) scene.doll = null;   // 跟隨的娃娃換外觀
        }
        S.result = `<span class="good">🎉 升級成功！${esc(before)} 進化成 <b class="doll-${DOLLS[S.target].quality}">${esc(DOLLS[S.target].name)}</b></span>`;
        addLog(`🎎 娃娃升級成功：${before} → ${DOLLS[S.target].name}`, 'win');
        sfx('treasure');
        S.uid = 0; S.target = '';
        saveGame();
        if (typeof cloudFlush === 'function') cloudFlush(true).catch(() => {});   // 成功的娃娃盡快上傳
    } else {
        S.result = `<span class="bad">升級失敗，${esc(before)} 維持原樣。</span>`;
        addLog(`🎎 娃娃升級失敗：${before} 維持原樣`, 'sys');
    }
    refreshUI();
    renderDollUp();
}

// 無限塔（survivor.js）：買票進塔時已向伺服器登記這一趟（inf_run_start → run.runId）；擊殺第 10、15、20…層首領時領卷軸
function dollScrollClaim(run, floor) {
    if (!dollUpOnline()) { addLog(`🎁 擊殺第 ${floor} 層首領：登入帳號才能領取${DOLL_UP_NAME}`, 'sys'); return; }
    if (!run.runId) { addLog(`🎁 擊殺第 ${floor} 層首領，但這一趟沒有向伺服器登記（伺服器還沒安裝），無法領取${DOLL_UP_NAME}`, 'sys'); return; }
    const owner = player;
    marketRpc('inf_claim', { p_char: lootChar(), p_run: run.runId, p_floor: floor }).then(r => {
        if (player !== owner) return;
        dollScrolls = r.scrolls;
        addLog(`🎁 擊殺第 ${floor} 層首領，獲得${DOLL_UP_NAME} ×1（持有 ${r.scrolls} 張）`, 'win');
        showToast(`🎁 獲得${DOLL_UP_NAME} ×1（持有 ${r.scrolls} 張）`, 3000);
        sfx('treasure');
    }).catch(e => addLog(`🎁 第 ${floor} 層的${DOLL_UP_NAME}沒有領到：${dollUpErrText(e)}`, 'sys'));
}
