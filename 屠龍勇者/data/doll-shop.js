// 娃娃鑽石商店：一般玩家可看，購買由伺服器核對GM並放入共用倉庫。
const DOLL_SHOP_PRICE = 500;
let dollShopCatalog = null, dollShopUser = null, dollShopBusy = false, dollShopErr = '';
const dollShopRequests = new Map();
function openDollShop() { openTownSub('dollShop'); dollShopLoad(); }
function dollShopRefresh() { if (player && tabOpen('town') && townSub === 'dollShop') renderPanel(); }
function dollShopCanBuy() { return !!(cloudLoggedIn() && !cloudBan && dollShopUser === cloudUser.id && dollShopCatalog && dollShopCatalog.canBuy); }
function renderDollShop() {
    const rows = Object.entries(DOLLS).map(([key, d]) => {
        const id = 'doll_' + key, product = dollShopCatalog && dollShopCatalog.items.find(x => x.id === id);
        const price = product ? product.price : DOLL_SHOP_PRICE;
        return `<div class="list-row"><div class="item-info">${itemThumbHtml(id)}<b class="${itemClass({id})}">${esc(d.name)}</b><small>💎 ${fmt(price)}</small>${dollAbilityHtml(id)}</div><button class="mini" onclick="dollShopBuy('${id}')" ${dollShopBusy || !dollShopCanBuy() || !product ? 'disabled' : ''}>購買</button></div>`;
    }).join('');
    return `<div class="panel"><b>🧚 娃娃商人・露米</b><p>目前僅 GM 可以購買，一般玩家可查看商品。每次購買一隻，請至帳號共用倉庫取出（沿用倉庫取出費用）。</p><small class="muted">一次僅出場一隻並提供能力。持有鑽石：💎 ${diaCount == null ? '—' : fmt(diaCount)}</small>${dollShopErr ? `<p class="bad">${esc(dollShopErr)}</p>` : ''}<button class="mini secondary" onclick="dollShopLoad()">重新讀取</button></div><div class="list storage-list">${rows}</div>`;
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
    const p = dollShopCatalog.items.find(x => x.id === id);
    if (!p || !ITEMS[id] || ITEMS[id].cat !== 'doll') return;
    const owner = player, uid = cloudUser.id;
    gameConfirm('購買魔法娃娃', `花費 ${p.price} 鑽石購買「${p.name}」？\n購買後放入帳號共用倉庫。`, () => {
        if (player === owner && cloudUser && cloudUser.id === uid && inTown()) dollShopPurchase(id, p.price, uid);
    }, '確認購買');
}
async function dollShopPurchase(id, price, uid) {
    if (dollShopBusy || !inTown() || !dollShopCanBuy() || cloudUser.id !== uid) return;
    const key = uid + '|' + id;
    if (!dollShopRequests.has(key)) dollShopRequests.set(key, crypto.randomUUID());
    dollShopBusy = true; dollShopErr = ''; dollShopRefresh();
    try {
        const r = await marketRpc('doll_shop_buy', { p_item: id, p_price: price, p_request: dollShopRequests.get(key) });
        dollShopRequests.delete(key);
        if (!cloudUser || cloudUser.id !== uid) return;
        diaCount = r.diamonds; vaultData = null;
        showToast('已購買 ' + r.name + '，請到帳號共用倉庫取出', 3500);
    } catch (e) {
        if (!cloudUser || cloudUser.id !== uid) return;
        const m = String(e && e.message || e);
        dollShopErr = /not admin/.test(m) ? '目前僅 GM 可以購買' : /not enough diamonds/.test(m) ? '鑽石不足' : /vault full/.test(m) ? '共用倉庫已滿，未扣鑽石' : /price changed/.test(m) ? '商品價格已變更，請重新讀取後再確認' : cloudErrText(e);
        showToast(dollShopErr);
    } finally { dollShopBusy = false; dollShopRefresh(); }
}
