// 屠龍勇者：回憶蠟燭（ARCHITECTURE.md 第 335 節）
// 使用後重新分配「出生配點」：能力值回到職業最低值，重新分配 出生 75 點（CREATE_TOTAL）＋萬能藥點數（player.elixirs）。
//   出生規則：單項最高 18（CREATE_STAT_MAX）；萬能藥的點數可以讓單項超過 18，最高 STAT_CAP（35）。
//   51 級以後的升級點數（使用者 2026-11-13 選擇）：全部退回成可分配點數（player.statPoints），照平常在人物狀態加回去。
//   等級、萬能藥使用次數、HP／MP 成長都不變。
// 依賴：載入時 ITEMS、ITEM_IMG（icons.js）；執行期 player、CLASSES、STAT_KEYS、openDialog、gameConfirm、consumeItem…

const CANDLE_ID = 'memoryCandle';
ITEMS[CANDLE_ID] = {
    name: '回憶蠟燭', cat: 'scroll', candle: true, wt: 0.1, sell: 0,   // 鑽石商人 100 鑽石（candle_buy）
    desc: '點燃後回想出生的那一刻：重新分配出生配點（75 點）＋萬能藥的點數。51 級以後的升級點數會退回成可分配點數，再自行加回。等級與萬能藥使用次數不變。',
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
    if (!player || countItem(CANDLE_ID) <= 0) { showToast('沒有回憶蠟燭'); return; }
    candleState = { owner: player, stats: candleBase() };
    openDialog('🕯️ 回憶蠟燭', '<div id="candle-box"></div>', [{ text: '取消', cls: 'secondary' }]);
    renderCandle();
}
function renderCandle() {
    const S = candleState, box = $('candle-box');
    if (!S || S.owner !== player || !box) return;
    const s = S.stats, base = candleBase(), left = candleLeft(s), elx = player.elixirs || 0, used = candleElixirUsed(s), lvPts = candleLevelSpent();
    const rows = STAT_KEYS.map(k => {
        const canUp = left > 0 && s[k] < STAT_CAP && (s[k] < CREATE_STAT_MAX || used < elx);
        return `<div class="set-row"><span>${STAT_NAMES[k]} <small class="muted">（目前 ${player.stats[k]}）</small></span>
            <span><button class="mini secondary" onclick="candleAdj('${k}',-1)" ${s[k] <= base[k] ? 'disabled' : ''}>−</button>
            <b style="display:inline-block;min-width:2.2em;text-align:center">${s[k]}</b>
            <button class="mini" onclick="candleAdj('${k}',1)" ${canUp ? '' : 'disabled'}>＋</button></span></div>`;
    }).join('');
    box.innerHTML = `<p>重新分配出生配點：<b>${CREATE_TOTAL}</b> 點＋萬能藥 <b>${elx}</b> 點＝共 <b>${candleTotal()}</b> 點。出生規則單項最高 ${CREATE_STAT_MAX}，萬能藥的點數可以讓單項超過 ${CREATE_STAT_MAX}（萬能藥點已用 ${used}/${elx}）。</p>
        ${rows}
        <p>剩餘點數：<b class="${left ? 'bad' : 'good'}">${left}</b></p>
        <p class="muted">51 級以後加的 <b>${lvPts}</b> 點升級點數會退回成可分配點數（目前未分配 ${player.statPoints || 0} 點，使用後共 ${(player.statPoints || 0) + lvPts} 點），之後在人物狀態自行加回。等級、萬能藥使用次數不變。</p>
        <button onclick="candleApply()" ${left ? 'disabled' : ''}>確定重新配點（用掉 1 支回憶蠟燭）</button> <button class="secondary" onclick="candleReset()">重設</button>`;
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
    const S = candleState; if (!S || S.owner !== player) return;
    const s = S.stats, base = candleBase();
    const ok = candleLeft(s) === 0 && candleElixirUsed(s) <= (player.elixirs || 0) && STAT_KEYS.every(k => s[k] >= base[k] && s[k] <= STAT_CAP);
    if (!ok) { showToast('點數還沒分配完'); return; }
    const text = STAT_KEYS.map(k => `${STAT_NAMES[k]} ${player.stats[k]}→${s[k]}`).join('、');
    gameConfirm('🕯️ 回憶蠟燭', `確定這樣重新配點嗎？\n${text}\n51 級後的升級點數退回 ${candleLevelSpent()} 點，請到人物狀態再加回去。`, () => {
        if (candleState !== S || S.owner !== player) return;
        if (!consumeItem(CANDLE_ID)) { showToast('沒有回憶蠟燭'); return; }
        const refund = candleLevelSpent();
        player.stats = { ...s };
        player.statPoints = (player.statPoints || 0) + refund;
        clampHpMp();
        addLog(`🕯️ 使用回憶蠟燭重新配點：${text}${refund ? `；退回升級點數 ${refund} 點` : ''}`, 'sys');
        showToast(refund ? `重新配點完成，退回 ${refund} 點升級點數` : '重新配點完成', 3000);
        candleState = null;
        closeDialog();
        saveGame(); refreshUI();
    }, '確定');
}

// ───────── 鑽石商人販售（2026-11-13 使用者決定：100 鑽石一支；tools/memory-candle.sql 的 candle_buy，放進帳號共用倉庫）─────────
const CANDLE_PRICE = 100;
function candleShopRow() {
    return `<div class="list-row"><div class="item-info">${itemThumbHtml(CANDLE_ID)}<b>回憶蠟燭</b><small>💎 ${CANDLE_PRICE}・1 支</small><small class="muted">重新分配出生配點（75 點＋萬能藥點數），升級點數退回可分配。</small></div><button class="mini" onclick="candleBuy()" ${dollShopBusy || !dollShopCanBuy() ? 'disabled' : ''}>購買</button></div>`;
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
