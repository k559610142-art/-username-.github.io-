// 屠龍勇者：回憶蠟燭（ARCHITECTURE.md 第 335、337 節）
// 2026-11-13 第二版（使用者）：使用後先重新分配出生配點（75＋萬能藥點），人物回到 Lv.1，再在視窗裡原地一級一級升回原本等級，
//   每級 HP／MP 重新隨機（洗血洗魔）；體力／精神照一般升級算（含裝備、詞綴、buff）。1～50 可一鍵升到 50，
//   51 級起每級拿 1 點，要先配完才能升下一級。結果照收不能反悔。進行中狀態存在 player.candleRb＝{ lv 目標等級, exp 原經驗, extra 其他來源點數, oldHp, oldMp }。
// 依賴：載入時 ITEMS、ITEM_IMG（icons.js）；執行期 player、CLASSES、STAT_KEYS、calcStats、conHpBonus、wisMpBonus、addStatPoint、openDialog、gameConfirm、consumeItem…

const CANDLE_ID = 'memoryCandle';
ITEMS[CANDLE_ID] = {
    name: '回憶蠟燭', cat: 'scroll', candle: true, wt: 0.1, sell: 0,   // 鑽石商人 100 鑽石（candle_buy）
    desc: '點燃後回到出生的那一刻：重新分配出生配點（75 點＋萬能藥點數），人物回到 1 級，再原地一級一級升回原本等級。每級 HP／MP 重新計算（洗血洗魔），51 級起的點數重新分配。只能在村莊使用，結果不能反悔。',
};

let candleState = null;   // { owner, stats＝正在分配的能力值 }

function candleBase() { return { ...CLASSES[player.cls].base }; }
function candleTotal() { return CREATE_TOTAL + (player.elixirs || 0); }
function candleLeft(s) { return candleTotal() - STAT_KEYS.reduce((a, k) => a + s[k], 0); }
// 用掉的萬能藥點數＝超過 18 的部分（出生規則單項最高 18）
function candleElixirUsed(s) { return STAT_KEYS.reduce((a, k) => a + Math.max(0, s[k] - CREATE_STAT_MAX), 0); }
// 目前已經加進能力值的升級點數（總和扣掉出生 75 與萬能藥）
function candleLevelSpent() { return Math.max(0, STAT_KEYS.reduce((a, k) => a + player.stats[k], 0) - CREATE_TOTAL - (player.elixirs || 0)); }

function openMemoryCandle() {
    if (!player) return;
    if (player.candleRb) { candleRbOpen(); return; }   // 回憶進行中：繼續升級
    if (countItem(CANDLE_ID) <= 0) { showToast('沒有回憶蠟燭'); return; }
    if (!inTown()) { showToast('請在村莊裡點燃回憶蠟燭'); return; }
    candleState = { owner: player, stats: candleBase() };
    openDialog('🕯️ 回憶蠟燭', '<div id="candle-box"></div>', [{ text: '取消', cls: 'secondary' }]);
    renderCandle();
}
function renderCandle() {
    const S = candleState, box = $('candle-box');
    if (!S || S.owner !== player || !box) return;
    const s = S.stats, base = candleBase(), left = candleLeft(s), elx = player.elixirs || 0, used = candleElixirUsed(s);
    const rows = STAT_KEYS.map(k => {
        const canUp = left > 0 && s[k] < STAT_CAP && (s[k] < CREATE_STAT_MAX || used < elx);
        return `<div class="set-row"><span>${STAT_NAMES[k]} <small class="muted">（目前 ${player.stats[k]}）</small></span>
            <span><button class="mini secondary" onclick="candleAdj('${k}',-1)" ${s[k] <= base[k] ? 'disabled' : ''}>−</button>
            <b style="display:inline-block;min-width:2.2em;text-align:center">${s[k]}</b>
            <button class="mini" onclick="candleAdj('${k}',1)" ${canUp ? '' : 'disabled'}>＋</button></span></div>`;
    }).join('');
    box.innerHTML = `<p>第 1 步：重新分配出生配點：<b>${CREATE_TOTAL}</b> 點＋萬能藥 <b>${elx}</b> 點＝共 <b>${candleTotal()}</b> 點。出生規則單項最高 ${CREATE_STAT_MAX}，萬能藥的點數可以讓單項超過 ${CREATE_STAT_MAX}（萬能藥點已用 ${used}/${elx}）。</p>
        ${rows}
        <p>剩餘點數：<b class="${left ? 'bad' : 'good'}">${left}</b></p>
        <p class="muted">第 2 步：人物回到 <b>Lv.1</b>，再原地升回 <b>Lv.${player.lv}</b>。每級 HP／MP 重新隨機（體力、精神含裝備與增益都算），51 級起每級 1 點要重新分配。經驗值、萬能藥次數不變，<b class="bad">結果不能反悔</b>。</p>
        <button onclick="candleApply()" ${left ? 'disabled' : ''}>確定，點燃回憶蠟燭</button> <button class="secondary" onclick="candleReset()">重設</button>`;
}
function candleAdj(k, d) {
    const S = candleState; if (!S || S.owner !== player || !STAT_KEYS.includes(k)) return;
    const s = S.stats, v = s[k] + d;
    if (v < candleBase()[k] || v > STAT_CAP) return;
    if (d > 0 && (candleLeft(s) <= 0 || (s[k] >= CREATE_STAT_MAX && candleElixirUsed(s) >= (player.elixirs || 0)))) return;
    s[k] = v;
    renderCandle();
}
function candleReset() { const S = candleState; if (!S || S.owner !== player) return; S.stats = candleBase(); renderCandle(); }
function candleApply() {
    const S = candleState; if (!S || S.owner !== player || player.candleRb) return;
    const s = S.stats, base = candleBase();
    const ok = candleLeft(s) === 0 && candleElixirUsed(s) <= (player.elixirs || 0) && STAT_KEYS.every(k => s[k] >= base[k] && s[k] <= STAT_CAP);
    if (!ok) { showToast('點數還沒分配完'); return; }
    if (!inTown()) { showToast('請在村莊裡點燃回憶蠟燭'); return; }
    const text = STAT_KEYS.map(k => `${STAT_NAMES[k]} ${player.stats[k]}→${s[k]}`).join('、');
    gameConfirm('🕯️ 回憶蠟燭', `出生配點：${text}\n人物會回到 Lv.1，再原地升回 Lv.${player.lv}，HP／MP 重新計算，結果不能反悔。確定嗎？`, () => {
        if (candleState !== S || S.owner !== player || player.candleRb || !inTown()) return;
        if (!consumeItem(CANDLE_ID)) { showToast('沒有回憶蠟燭'); return; }
        if (player.hunting) stopHunt();
        const target = player.lv, earned = Math.max(0, target - BONUS_STAT_LEVEL + 1);
        const extra = Math.max(0, candleLevelSpent() + (player.statPoints || 0) - earned);   // 不是升級來的點數（若有）回憶完再還
        const old = { hp: player.baseHp, mp: player.baseMp };
        player.candleRb = { lv: target, exp: player.exp, extra, oldHp: old.hp, oldMp: old.mp };
        player.stats = { ...s };
        player.statPoints = 0;
        player.lv = 1;
        player.exp = 0;
        const c = CLASSES[player.cls], st = calcStats();
        player.baseHp = c.startHp + conHpBonus(st.con);
        player.baseMp = c.startMp + wisMpBonus(st.wis);
        candleRbFill();
        addLog(`🕯️ 點燃回憶蠟燭，回到 Lv.1（出生配點：${text}）`, 'sys');
        candleState = null;
        saveGame(); refreshUI();
        candleRbOpen();
    }, '點燃');
}

// ───────── 第 2 步：原地升級（player.candleRb 進行中）─────────
let candleRbLast = '';
function candleRbFill() { const st = calcStats(); player.hp = st.maxHp; player.mp = st.maxMp; }
function candleRbLevel() {
    const R = player.candleRb; if (!R || player.lv >= R.lv) return null;
    const c = CLASSES[player.cls];
    player.lv++;
    const st = calcStats();
    // 二轉成長只用在 61 級以後（二轉任務 60 級起），避免回憶時連低等級都吃到二轉加成
    const g = player.lv > 60 && typeof advGrowth === 'function' ? advGrowth : () => 1;
    const hp = Math.round((rand(c.hp[0], c.hp[1]) + conHpBonus(st.con)) * g('hp'));
    const mp = Math.round((rand(c.mp[0], c.mp[1]) + wisMpBonus(st.wis)) * g('mp'));
    player.baseHp += hp;
    player.baseMp += mp;
    if (player.lv >= BONUS_STAT_LEVEL) player.statPoints++;
    return { hp, mp };
}
function candleRbUp(to) {
    const R = player && player.candleRb; if (!R) return;
    if (player.lv >= BONUS_STAT_LEVEL && player.statPoints > 0) { showToast('先把能力點數分配完'); return; }
    const end = Math.min(R.lv, to === 'cap' ? BONUS_STAT_LEVEL - 1 : player.lv + 1);
    let hp = 0, mp = 0, n = 0;
    while (player.lv < end) { const r = candleRbLevel(); if (!r) break; hp += r.hp; mp += r.mp; n++; }
    if (!n) return;
    candleRbLast = `${n > 1 ? `連升 ${n} 級` : '升級'}：HP +${hp}、MP +${mp}`;
    candleRbFill();
    sfx('levelup');
    saveGame(); refreshUI(); candleRbRender();
}
function candleRbStat(k) {
    if (!player || !player.candleRb || !STAT_KEYS.includes(k)) return;
    addStatPoint(k);
    candleRbFill();
    saveGame(); refreshUI(); candleRbRender();
}
function candleRbDone() {
    const R = player && player.candleRb; if (!R || player.lv < R.lv) return;
    const hp = player.baseHp - R.oldHp, mp = player.baseMp - R.oldMp, sg = v => (v >= 0 ? '+' : '') + v;
    player.exp = R.exp;
    player.statPoints = (player.statPoints || 0) + (R.extra || 0);
    delete player.candleRb;
    candleRbLast = '';
    candleRbFill();
    addLog(`🕯️ 回憶完成：Lv.${player.lv}，HP ${R.oldHp}→${player.baseHp}（${sg(hp)}）、MP ${R.oldMp}→${player.baseMp}（${sg(mp)}）`, 'lvup');
    showToast(`回憶完成：HP ${sg(hp)}、MP ${sg(mp)}`, 3500);
    closeDialog();
    saveGame(); refreshUI();
}
function candleRbOpen() {
    if (!player || !player.candleRb) return;
    openDialog('🕯️ 回憶中', '<div id="candle-rb"></div>', []);
    candleRbRender();
}
function candleRbRender() {
    const R = player && player.candleRb, box = $('candle-rb');
    if (!R || !box) return;
    const st = calcStats(), pts = player.statPoints || 0, needPts = player.lv >= BONUS_STAT_LEVEL && pts > 0, done = player.lv >= R.lv;
    const capTo = Math.min(R.lv, BONUS_STAT_LEVEL - 1);
    const rows = needPts ? STAT_KEYS.map(k => `<div class="set-row"><span>${STAT_NAMES[k]}</span><span><b style="display:inline-block;min-width:2.2em;text-align:center">${player.stats[k]}</b>
        <button class="mini" onclick="candleRbStat('${k}')" ${player.stats[k] >= STAT_CAP ? 'disabled' : ''}>＋</button></span></div>`).join('') : '';
    box.innerHTML = `<p>等級 <b>Lv.${player.lv}</b> / 目標 Lv.${R.lv}</p>
        <p>HP 上限 <b>${player.baseHp}</b> <small class="muted">（原本 ${R.oldHp}）</small>　MP 上限 <b>${player.baseMp}</b> <small class="muted">（原本 ${R.oldMp}）</small></p>
        <p class="muted">升級時體力 ${st.con}（每級 HP +${conHpBonus(st.con)}）、精神 ${st.wis}（每級 MP +${wisMpBonus(st.wis)}），含裝備與增益。</p>
        ${candleRbLast ? `<p class="good">${candleRbLast}</p>` : ''}
        ${needPts ? `<p class="bad">還有 ${pts} 點能力點數，分配完才能再升級：</p>${rows}` : ''}
        ${done ? `<button onclick="candleRbDone()">完成回憶</button>` : `<button onclick="candleRbUp(1)" ${needPts ? 'disabled' : ''}>升 1 級</button>${player.lv < capTo ? ` <button class="secondary" onclick="candleRbUp('cap')">直接升到 Lv.${capTo}</button>` : ''}`}
        ${done && needPts ? '<p class="muted">剩下的點數也可以之後在人物狀態分配。</p>' : ''}`;
}
// 回憶沒做完不能離開：視窗被其他對話框蓋掉或重新載入，就再打開（main.js 的 gameTick 呼叫）
function candleRbKeep() {
    if (!player || !player.candleRb || $('candle-rb')) return;
    const dl = $('dialog-layer');
    if (dl && !dl.classList.contains('active')) candleRbOpen();
}

// ───────── 鑽石商人販售（2026-11-13 使用者決定：100 鑽石一支；tools/memory-candle.sql 的 candle_buy，放進帳號共用倉庫）─────────
const CANDLE_PRICE = 100;
function candleShopRow() {
    return `<div class="list-row"><div class="item-info">${itemThumbHtml(CANDLE_ID)}<b>回憶蠟燭</b><small>💎 ${CANDLE_PRICE}・1 支</small><small class="muted">重新配出生點並回到 1 級原地升回，洗 HP／MP 與 51 級後點數。</small></div><button class="mini" onclick="candleBuy()" ${dollShopBusy || !dollShopCanBuy() ? 'disabled' : ''}>購買</button></div>`;
}
function candleBuy() {
    if (!inTown() || !dollShopCanBuy() || dollShopBusy) return;
    const owner = player, uid = cloudUser.id;
    gameConfirm('購買回憶蠟燭', `花費 ${CANDLE_PRICE} 鑽石購買「回憶蠟燭」×1？\n放入帳號共用倉庫，取出後在背包使用。`, () => {
        if (player === owner && cloudUser && cloudUser.id === uid && inTown()) candlePurchase(uid);
    }, '確認購買');
}
async function candlePurchase(uid) {
    if (dollShopBusy || !inTown() || !dollShopCanBuy() || cloudUser.id !== uid) return;
    const key = uid + '|memoryCandle';
    if (!dollShopRequests.has(key)) dollShopRequests.set(key, crypto.randomUUID());   // 斷線重試沿用同一個請求，只交付一次
    dollShopBusy = true; dollShopErr = ''; dollShopRefresh();
    try {
        const r = await marketRpc('candle_buy', { p_price: CANDLE_PRICE, p_request: dollShopRequests.get(key) });
        dollShopRequests.delete(key);
        if (!cloudUser || cloudUser.id !== uid) return;
        diaCount = r.diamonds; vaultData = null;
        showToast('已購買回憶蠟燭，請到帳號共用倉庫取出', 3500);
    } catch (e) {
        if (!cloudUser || cloudUser.id !== uid) return;
        const m = String(e && e.message || e);
        dollShopErr = /candle_buy|schema cache/i.test(m) ? '回憶蠟燭尚未開放，請管理者執行 memory-candle.sql' : /banned/.test(m) ? '帳號已被停權，無法購買' : /not logged in/.test(m) ? '請先登入帳號' : /not enough diamonds/.test(m) ? '鑽石不足' : /vault full/.test(m) ? '共用倉庫已滿，未扣鑽石' : /price changed/.test(m) ? '商品價格已變更，請重新讀取後再確認' : cloudErrText(e);
        showToast(dollShopErr);
    } finally { dollShopBusy = false; dollShopRefresh(); }
}
