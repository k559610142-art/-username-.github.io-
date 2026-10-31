// 帳號稱號（2026-11-01，ARCHITECTURE.md 第 257 節）
// 伺服器 dragon_my_titles()（tools/doll-shop.sql）決定這個帳號有哪些稱號，同帳號所有角色自動配戴。
// 伺服器育養員：帳號第一次在娃娃商人買娃娃就獲得（dragon_doll_shop_orders 有紀錄即可）。
// 顯示：地圖頭頂（ui-scene.js）、團隊副本戰鬥畫面（raid.js，快照帶 titleShown）、角色裝備視窗、人物選單。
const TITLES = { serverKeeper: { name: '伺服器育養員' } };
const TITLE_CACHE_KEY = 'dragonSlayer_titles';   // 上次讀到的 { uid, list }，離線或還沒讀完時先用
let accTitles = null;

function titleCacheRead() {
    if (accTitles) return accTitles;
    try {
        const v = JSON.parse(localStorage.getItem(TITLE_CACHE_KEY) || 'null');
        if (v && typeof v.uid === 'string' && Array.isArray(v.list)) accTitles = v;
    } catch (e) { /* 讀不到就當沒有 */ }
    return accTitles;
}

// 目前帳號配戴的稱號 id；沒登入、停權或沒有稱號回傳 null
function accTitle() {
    if (!cloudLoggedIn() || cloudBan) return null;
    const t = titleCacheRead();
    return t && t.uid === cloudUser.id ? t.list.find(id => TITLES[id]) || null : null;
}

async function titleRefresh() {
    if (!cloudLoggedIn()) return;
    const uid = cloudUser.id;
    try {
        const { data, error } = await cloudTimeout(cloudSb.rpc('dragon_my_titles'));
        if (error) throw error;
        if (!cloudUser || cloudUser.id !== uid) return;
        accTitles = { uid, list: Array.isArray(data) ? data.filter(id => TITLES[id]) : [] };
        try { localStorage.setItem(TITLE_CACHE_KEY, JSON.stringify(accTitles)); } catch (e) { /* 存不了下次再讀 */ }
        if (player) refreshUI();
        else if (typeof renderCharSelect === 'function' && $('char-grid')) renderCharSelect();
    } catch (e) { /* 還沒安裝 SQL 或連不上：維持原本的 */ }
}

// 介面用（角色裝備、人物選單）：彩虹流動字＋火光，樣式在 index.html 的 .acc-title
function titleBadgeHtml(id) {
    const d = id && TITLES[id];
    return d ? `<span class="acc-title"><b>${esc(d.name)}</b></span>` : '';
}

// 地圖上畫在名字上方：七彩漸層字左右流動，七彩火苗往上飄（使用者選的 A 款，tools/title-fire-preview.html）
// fx：呼叫端保存的 { parts, last }；size：字的大小（px）
function titleFxDraw(ctx, id, cx, cy, fx, size = 16) {
    const d = TITLES[id];
    if (!d) return;
    const now = performance.now(), dt = Math.min(50, now - (fx.last || now));
    fx.last = now;
    if (!fx.parts) fx.parts = [];
    ctx.save();
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.font = `900 ${size}px "Microsoft JhengHei","PingFang TC","Noto Sans TC",sans-serif`;
    const w = ctx.measureText(d.name).width, k = size / 16;
    // 火苗：每秒約 300 顆，最多 160 顆
    for (let n = dt * 0.3; n > 0 && fx.parts.length < 160; n--) {
        if (n < 1 && Math.random() > n) break;
        fx.parts.push({ x: cx + (Math.random() - 0.5) * w, y: cy + (2 + Math.random() * 5) * k, vx: (Math.random() - 0.5) * 12 * k, vy: -(18 + Math.random() * 16) * k,
            life: 0, max: 600 + Math.random() * 500, r: (2.6 + Math.random() * 2.6) * k, c: `hsl(${(now / 6 + Math.random() * 360) % 360},100%,60%)` });
    }
    ctx.globalCompositeOperation = 'lighter';
    fx.parts = fx.parts.filter(q => (q.life += dt) < q.max);
    for (const q of fx.parts) {
        const t = q.life / q.max, r = q.r * (1.6 - t);
        q.x += q.vx * dt / 1000; q.y += q.vy * dt / 1000;
        ctx.globalAlpha = (1 - t) * 0.9;
        const g = ctx.createRadialGradient(q.x, q.y, 0, q.x, q.y, r);
        g.addColorStop(0, '#fff'); g.addColorStop(0.35, q.c); g.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.fillStyle = g; ctx.beginPath(); ctx.arc(q.x, q.y, r, 0, Math.PI * 2); ctx.fill();
    }
    ctx.globalCompositeOperation = 'source-over'; ctx.globalAlpha = 1;
    const g = ctx.createLinearGradient(cx - w / 2, 0, cx + w / 2, 0), off = (now / 1500) % 1;
    for (let i = 0; i <= 6; i++) g.addColorStop(i / 6, `hsl(${(i / 6 + off) * 360},100%,62%)`);
    ctx.lineWidth = 4 * k; ctx.strokeStyle = '#000'; ctx.lineJoin = 'round';
    ctx.strokeText(d.name, cx, cy);
    ctx.shadowColor = 'rgba(255,160,60,0.9)'; ctx.shadowBlur = 10 * k;
    ctx.fillStyle = g; ctx.fillText(d.name, cx, cy);
    ctx.restore();
}
