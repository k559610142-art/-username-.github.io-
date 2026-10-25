// 屠龍勇者：PWA（ARCHITECTURE.md 第 12 節）—— 註冊 Service Worker、安裝說明、新版本提示、持久儲存
// main.js 啟動時呼叫 initPwa()；設定分頁「📲 安裝到主畫面」→ openInstallGuide()
// 新版本：啟動、每分鐘、回前景／恢復連線時檢查開發版與正式合併版，玩家點提示才更新。

const PWA_UPDATE_CHECK_MS = 60 * 1000;
let pwaInstallEvent = null;   // Android／電腦 Chrome、Edge 的安裝事件，按按鈕時才跳出
let pwaLastCheck = -Infinity;
let pwaCheckBusy = false;

function isStandaloneApp() {
    return (window.matchMedia && matchMedia('(display-mode: standalone)').matches) || navigator.standalone === true;
}
function pwaIsIOS() {
    return /iphone|ipad|ipod/i.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
}
function pwaInAppBrowser() { return /Line\/|FBAN|FBAV|Instagram|MicroMessenger/i.test(navigator.userAgent); }

window.addEventListener('beforeinstallprompt', e => { e.preventDefault(); pwaInstallEvent = e; });
window.addEventListener('appinstalled', () => { pwaInstallEvent = null; showToast('📲 已安裝' + GAME_TITLE); });

function initPwa() {
    if ('serviceWorker' in navigator && /^https?:$/.test(location.protocol)) {
        navigator.serviceWorker.register('sw.js?v=' + encodeURIComponent(GAME_VERSION), { scope: './' })
            .catch(e => console.warn('Service Worker 註冊失敗：', e));
    }
    // 請瀏覽器不要在空間不足時清掉存檔（localStorage）
    try {
        if (navigator.storage && navigator.storage.persisted) {
            navigator.storage.persisted().then(p => { if (!p && navigator.storage.persist) navigator.storage.persist(); }).catch(() => {});
        }
    } catch (e) {}
    setInterval(checkNewVersion, PWA_UPDATE_CHECK_MS);
    document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') checkNewVersion(); });
    window.addEventListener('focus', checkNewVersion);
    window.addEventListener('online', checkNewVersion);
    checkNewVersion();
    // iPhone 主畫面版與 Safari 的存檔是分開的：第一次從主畫面開、沒有存檔時提醒一次
    try {
        if (isStandaloneApp() && pwaIsIOS() && !hasSave() && !localStorage.getItem('dragonSlayer_pwa_hint')) {
            localStorage.setItem('dragonSlayer_pwa_hint', '1');
            setTimeout(() => gameAlert('📲 歡迎使用主畫面版', 'iPhone 的主畫面版和 Safari 的存檔是分開的。\n如果你在 Safari 已經有角色：在標題畫面按「☁️ 登入／註冊」，登入同一個帳號，角色會從雲端下載。'), 1200);
        }
    } catch (e) {}
}

// z後延伸aa，不能直接按字串比較；忽略較舊快取或回退頁面。
function pwaNewerVersion(ver, current) {
    const a = /^(\d{8})([a-z]+)$/.exec(ver), b = /^(\d{8})([a-z]+)$/.exec(current);
    if (!a || !b) return false;
    const seq = s => Array.from(s).reduce((n, c) => n * 26 + c.charCodeAt(0) - 96, 0);
    return a[1] > b[1] || (a[1] === b[1] && seq(a[2]) > seq(b[2]));
}
// 網路輪詢用真實時間節流，不跟隨戰鬥模擬時鐘；前景最多每15秒一次。
async function checkNewVersion() {
    if (document.visibilityState === 'hidden' || navigator.onLine === false || pwaCheckBusy || Date.now() - pwaLastCheck < 15000) return;
    pwaLastCheck = Date.now();
    pwaCheckBusy = true;
    const abort = new AbortController(), timeout = setTimeout(() => abort.abort(), 10000);
    try {
        const res = await fetch('index.html', { cache: 'no-store', signal: abort.signal });
        if (!res.ok) return;
        const html = await res.text();
        const m = html.match(/<script\b[^>]*\bsrc=["']data\/(?:config|game)\.js\?v=(\d{8}[a-z]+)["']/i);
        if (m && pwaNewerVersion(m[1], GAME_VERSION)) showUpdateBanner(m[1]);
    } catch (e) {} finally { clearTimeout(timeout); pwaCheckBusy = false; }
}

function showUpdateBanner(ver) {
    const old = $('pwa-update');
    if (old) {
        if (!old.disabled && pwaNewerVersion(ver, old.dataset.version)) {
            old.dataset.version = ver;
            old.textContent = `🔄 有新的更新檔（v${ver}），點此更新`;
            old.title = `新版本 ${ver}；點擊後儲存並重新載入`;
        }
        return;
    }
    const b = document.createElement('button');
    b.id = 'pwa-update';
    b.type = 'button';
    b.dataset.version = ver;
    b.setAttribute('aria-live', 'polite');
    b.textContent = `🔄 有新的更新檔（v${ver}），點此更新`;
    b.title = `新版本 ${ver}；點擊後儲存並重新載入`;
    b.onclick = () => {
        if (b.disabled) return;
        b.disabled = true;
        b.textContent = '更新中…';
        saveGame();
        location.reload();
    };
    document.body.appendChild(b);
}

async function openInstallGuide() {
    if (isStandaloneApp()) { gameAlert('📲 安裝到主畫面', '你現在就是從主畫面開啟的版本，不需要再安裝。'); return; }
    if (pwaInstallEvent) {
        const ev = pwaInstallEvent;
        pwaInstallEvent = null;
        ev.prompt();
        try { await ev.userChoice; } catch (e) {}
        return;
    }
    let msg;
    if (pwaInAppBrowser()) {
        msg = '目前是在 LINE／Facebook 等 App 內建的瀏覽器，無法安裝。\n\n請按右上角「⋯」選「用預設瀏覽器開啟」（iPhone 用 Safari、Android 用 Chrome），再按一次「📲 安裝到主畫面」。';
    } else if (pwaIsIOS()) {
        msg = 'iPhone／iPad 安裝方式（請用 Safari）：\n1. 按畫面下方的「分享」按鈕（方框加向上箭頭）\n2. 往下找「加入主畫面」\n3. 按右上角「新增」\n\n⚠️ 主畫面版和 Safari 的存檔是分開的：安裝前先登入雲端帳號，打開主畫面版後登入同一個帳號，角色會從雲端下載。';
    } else {
        msg = '安裝方式：\n・Android Chrome：按右上角「⋮」→「安裝應用程式」或「加到主畫面」\n・電腦 Chrome／Edge：網址列右側的安裝圖示，或選單 →「安裝黑暗大陸」\n\n找不到安裝選項的話，可能是瀏覽器還在準備，玩一下再試一次。';
    }
    gameAlert('📲 安裝到主畫面', msg);
}
