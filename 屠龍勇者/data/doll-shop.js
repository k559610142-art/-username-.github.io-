// 娃娃鑽石商店：一般玩家可看，購買由伺服器核對GM並放入共用倉庫。
const DOLL_SHOP_PRICE = 500;
const DOLL_DISMANTLE_CRYSTALS = 50;
let dollShopTab = 'buy';
let dollShopCatalog = null, dollShopUser = null, dollShopBusy = false, dollShopErr = '';
const dollShopRequests = new Map();
function openDollShop() { openTownSub('dollShop'); dollShopLoad(); }
function setDollShopTab(tab) {
    if (tab !== 'buy' && tab !== 'dismantle') return;
    dollShopTab = tab; dollShopRefresh();
}
function dollLegendGear(it) {
    const d = it && ITEMS[it.id];
    return !!(d && ['weapon', 'armor'].includes(d.cat) && it.q === 'legend' && it.n === 1);
}
function renderDollDismantle() {
    const list = player.inv.filter(dollLegendGear);
    return `<div class="panel"><b>分解傳說裝備</b><p>每件傳說品質裝備可分解成 ${DOLL_DISMANTLE_CRYSTALS} 個魔法結晶。裝備及其強化、詞綴與附魔會消失。</p><small class="muted">只接受背包內的傳說武器、防具及飾品；已裝備的不列出，鎖定的不能分解。召喚娃娃需50個結晶，每30分鐘自動扣料續召，不足時收回。</small><p>${itemThumbHtml('magicCrystal')}持有魔法結晶：${fmt(countItem('magicCrystal'))}</p></div><div class="list storage-list">${list.map(it => `<div class="list-row"><div class="item-info">${itemThumbHtml(it.id)}<b class="${itemClass(it)}">${esc(itemName(it))}</b><small>魔法結晶 ×${DOLL_DISMANTLE_CRYSTALS}${it.sellLocked ? '・已鎖定' : ''}</small></div><button class="mini" ${it.sellLocked ? 'disabled' : ''} onclick="dollDismantle(${it.uid})">分解</button></div>`).join('') || '<p class="muted">背包沒有可列出的傳說裝備。</p>'}</div>`;
}
function dollDismantleHere() { return player && inTown() && tabOpen('town') && townSub === 'dollShop' && dollShopTab === 'dismantle'; }
function dollDismantle(uid) {
    if (!dollDismantleHere()) return;
    const it = findInv(uid);
    if (!dollLegendGear(it)) return;
    if (it.sellLocked) { showToast('請先解鎖裝備再分解'); return; }
    const owner = player, snapshot = JSON.stringify(it);
    gameConfirm('確認分解傳說裝備', `確定分解「${itemName(it)}」？\n裝備及其強化、詞綴與附魔將永久消失。\n取得魔法結晶 ×${DOLL_DISMANTLE_CRYSTALS}。`, () => {
        if (player !== owner || !dollDismantleHere()) return;
        const now = findInv(uid);
        if (!dollLegendGear(now) || now.sellLocked) return;
        if (now !== it || JSON.stringify(now) !== snapshot) { showToast('裝備已變更，請重新確認分解'); return; }
        const crystals = countItem('magicCrystal');
        if (!Number.isSafeInteger(crystals) || crystals < 0 || crystals > Number.MAX_SAFE_INTEGER - DOLL_DISMANTLE_CRYSTALS) return;
        if (!addItem('magicCrystal', DOLL_DISMANTLE_CRYSTALS)) return;
        removeInst(uid);
        addLog(`🧚 分解 ${itemName(it)}，取得魔法結晶 ×${DOLL_DISMANTLE_CRYSTALS}`, 'sys');
        showToast(`分解完成，魔法結晶 +${DOLL_DISMANTLE_CRYSTALS}`);
        saveGame(); refreshUI();
    }, '確認分解');
}
function dollShopRefresh() { if (player && tabOpen('town') && townSub === 'dollShop') renderPanel(); }
function dollShopCanBuy() { return !!(cloudLoggedIn() && !cloudBan && dollShopUser === cloudUser.id && dollShopCatalog && dollShopCatalog.canBuy); }
function dollShopProduct(id) {
    const d = ITEMS[id];
    if (!d || !DOLLS[d.doll] || DOLLS[d.doll].quality !== 'T4') return null;
    return dollShopCatalog && dollShopCatalog.items.find(x => x.id === id && x.price === DOLL_SHOP_PRICE);
}
function renderDollShop() {
    const tabs = `<div class="chips"><button class="chip-btn ${dollShopTab === 'buy' ? 'active' : ''}" onclick="setDollShopTab('buy')">購買娃娃</button><button class="chip-btn ${dollShopTab === 'dismantle' ? 'active' : ''}" onclick="setDollShopTab('dismantle')">分解傳說裝備</button></div>`;
    if (dollShopTab === 'dismantle') return tabs + renderDollDismantle();
    const rows = Object.entries(DOLLS).filter(([, d]) => d.quality === 'T4').map(([key, d]) => {
        const id = 'doll_' + key, product = dollShopProduct(id);
        const price = DOLL_SHOP_PRICE;
        return `<div class="list-row"><div class="item-info">${itemThumbHtml(id)}<b class="${itemClass({id})}">${esc(d.name)}</b><small>💎 ${fmt(price)}</small>${dollAbilityHtml(id)}</div><button class="mini" onclick="dollShopBuy('${id}')" ${dollShopBusy || !dollShopCanBuy() || !product ? 'disabled' : ''}>購買</button></div>`;
    }).join('');
    return tabs + `<div class="panel"><b>🧚 娃娃商人・露米</b><p>僅販售 T4 娃娃，每隻 500 鑽石。目前僅 GM 可以購買，一般玩家可查看商品。每次購買一隻，請至帳號共用倉庫取出（沿用倉庫取出費用）。</p><small class="muted">一次僅出場一隻並提供能力。持有鑽石：💎 ${diaCount == null ? '—' : fmt(diaCount)}</small>${dollShopErr ? `<p class="bad">${esc(dollShopErr)}</p>` : ''}<button class="mini secondary" onclick="dollShopLoad()">重新讀取</button></div><div class="list storage-list">${rows}</div>`;
}
async function dollShopLoad() {
    const uid = cloudUser && cloudUser.id || '';
    dollShopErr = '';
    try {
        const r = await marketRpc('doll_shop_status');
        if ((cloudUser && cloudUser.id || '') !== uid) return;
        dollShopCatalog = r; dollShopUser = uid;
        if (uid && Number.isFinite(r.diamonds)) diaCount = r.diamonds;
    } catch (e) {
        if ((cloudUser && cloudUser.id || '') !== uid) return;
        dollShopCatalog = null; dollShopUser = uid;
        dollShopErr = /doll_shop_status|function|schema cache/i.test(String(e && e.message || e)) ? '娃娃商店尚未安裝，請管理者執行 doll-shop.sql。' : cloudErrText(e);
    }
    dollShopRefresh();
}
function dollShopBuy(id) {
    if (!inTown() || !dollShopCanBuy() || dollShopBusy) return;
    const p = dollShopProduct(id);
    if (!p || !ITEMS[id] || ITEMS[id].cat !== 'doll') return;
    const owner = player, uid = cloudUser.id;
    gameConfirm('購買魔法娃娃', `花費 ${p.price} 鑽石購買「${p.name}」？\n購買後放入帳號共用倉庫。`, () => {
        if (player === owner && cloudUser && cloudUser.id === uid && inTown()) dollShopPurchase(id, p.price, uid);
    }, '確認購買');
}
async function dollShopPurchase(id, price, uid) {
    if (dollShopBusy || !inTown() || !dollShopCanBuy() || cloudUser.id !== uid || price !== DOLL_SHOP_PRICE || !dollShopProduct(id)) return;
    const key = uid + '|' + id;
    if (!dollShopRequests.has(key)) dollShopRequests.set(key, crypto.randomUUID());
    dollShopBusy = true; dollShopErr = ''; dollShopRefresh();
    try {
        const r = await marketRpc('doll_shop_buy', { p_item: id, p_price: price, p_request: dollShopRequests.get(key) });
        dollShopRequests.delete(key);
        if (!cloudUser || cloudUser.id !== uid) return;
        diaCount = r.diamonds; vaultData = null;
        showToast('已購買 ' + r.name + '，請到帳號共用倉庫取出', 3500);
        titleRefresh();   // 第一次買娃娃送稱號「伺服器育養員」（titles.js）
    } catch (e) {
        if (!cloudUser || cloudUser.id !== uid) return;
        const m = String(e && e.message || e);
        dollShopErr = /not admin/.test(m) ? '目前僅 GM 可以購買' : /not enough diamonds/.test(m) ? '鑽石不足' : /vault full/.test(m) ? '共用倉庫已滿，未扣鑽石' : /price changed/.test(m) ? '商品價格已變更，請重新讀取後再確認' : cloudErrText(e);
        showToast(dollShopErr);
    } finally { dollShopBusy = false; dollShopRefresh(); }
}
