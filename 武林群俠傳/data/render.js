// 浪跡江湖：地圖畫面繪製（canvas）、小地圖、點擊輸入（ARCHITECTURE.md 第 11 節）
// 地面先畫成離屏背景快取；樹、石、房屋、NPC、怪物、玩家每幀依 y 排序繪製（越下面越前面）
let cv = null, ctx = null, mini = null, mctx = null, camX = 0, camY = 0, viewW = 0, viewH = 0, dpr = 1;

function initCanvas() {
    cv = $('world'); ctx = cv.getContext('2d');
    mini = $('minimap'); mctx = mini.getContext('2d');
    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);
    cv.addEventListener('pointerdown', e => {
        if (!W) return;
        const r = cv.getBoundingClientRect();
        clickWorld(e.clientX - r.left + camX, e.clientY - r.top + camY);
    });
    mini.addEventListener('pointerdown', e => {
        if (!W) return;
        const r = mini.getBoundingClientRect(), m = MAPS[W.mapId];
        cmdMoveTo((e.clientX - r.left) / r.width * m.w, (e.clientY - r.top) / r.height * m.h);
        e.stopPropagation();
    });
}

function resizeCanvas() {
    const wrap = $('world-wrap');
    if (!wrap) return;
    dpr = Math.min(2, window.devicePixelRatio || 1);
    viewW = wrap.clientWidth; viewH = wrap.clientHeight;
    cv.width = viewW * dpr; cv.height = viewH * dpr;
    cv.style.width = viewW + 'px'; cv.style.height = viewH + 'px';
}

// ── 地面背景（每張地圖畫一次） ──
function mapBackground(id) {
    const m = MAPS[id];
    if (m.bg) return m.bg;
    const c = document.createElement('canvas'); c.width = m.w; c.height = m.h;
    const g = c.getContext('2d'), rng = seededRng(m.seed * 7 + 1);
    g.fillStyle = m.ground; g.fillRect(0, 0, m.w, m.h);
    for (let i = 0; i < m.w * m.h / 9000; i++) {
        g.fillStyle = m.ground2; g.globalAlpha = 0.25 + rng() * 0.35;
        g.beginPath(); g.ellipse(rng() * m.w, rng() * m.h, 20 + rng() * 60, 10 + rng() * 30, rng() * 3, 0, 7); g.fill();
    }
    g.globalAlpha = 1;
    // 東西向大路（城鎮則是十字路＋廣場）
    g.fillStyle = m.path;
    g.beginPath(); g.moveTo(0, m.h / 2 - 50);
    for (let x = 0; x <= m.w; x += 100) g.lineTo(x, m.h / 2 - 50 + Math.sin(x / 300 + m.seed) * 18);
    for (let x = m.w; x >= 0; x -= 100) g.lineTo(x, m.h / 2 + 50 + Math.sin(x / 300 + m.seed) * 18);
    g.fill();
    if (m.town) {
        g.fillRect(m.w / 2 - 55, 0, 110, m.h);
        g.beginPath(); g.arc(m.spawn.x, m.spawn.y, 150, 0, 7); g.fill();
        g.strokeStyle = '#0002'; g.lineWidth = 2;
        for (let r = 40; r < 150; r += 36) { g.beginPath(); g.arc(m.spawn.x, m.spawn.y, r, 0, 7); g.stroke(); }
    }
    // 小草
    g.strokeStyle = '#0003'; g.lineWidth = 1.5;
    for (let i = 0; i < m.w * m.h / 4000; i++) {
        const x = rng() * m.w, y = rng() * m.h;
        g.beginPath(); g.moveTo(x, y); g.lineTo(x - 3, y - 7); g.moveTo(x, y); g.lineTo(x + 3, y - 6); g.stroke();
    }
    m.bg = c;
    return c;
}

function drawTree(o, m) {
    ctx.fillStyle = '#0004'; ctx.beginPath(); ctx.ellipse(o.x, o.y + 4, o.r * 0.9, o.r * 0.35, 0, 0, 7); ctx.fill();
    ctx.fillStyle = '#5a3a22'; ctx.fillRect(o.x - 4, o.y - o.r * 0.9, 8, o.r);
    const c = m.treeColor || '#3f6a32';
    ctx.fillStyle = c; ctx.beginPath(); ctx.arc(o.x, o.y - o.r * 1.4, o.r, 0, 7); ctx.fill();
    ctx.fillStyle = '#ffffff18'; ctx.beginPath(); ctx.arc(o.x - o.r * 0.3, o.y - o.r * 1.7, o.r * 0.5, 0, 7); ctx.fill();
}
function drawRock(o, m) {
    ctx.fillStyle = '#0004'; ctx.beginPath(); ctx.ellipse(o.x, o.y + 3, o.r, o.r * 0.35, 0, 0, 7); ctx.fill();
    ctx.fillStyle = m.rockColor || '#8a8070'; ctx.beginPath(); ctx.ellipse(o.x, o.y - o.r * 0.4, o.r, o.r * 0.75, 0, 0, 7); ctx.fill();
    ctx.fillStyle = '#ffffff22'; ctx.beginPath(); ctx.ellipse(o.x - o.r * 0.3, o.y - o.r * 0.7, o.r * 0.4, o.r * 0.25, 0, 0, 7); ctx.fill();
}
function drawHouse(o) {
    const h = o.house;
    ctx.fillStyle = '#0005'; ctx.fillRect(h.x + 8, h.y + h.h - 6, h.w, 14);
    ctx.fillStyle = '#c8b090'; ctx.fillRect(h.x, h.y + h.h * 0.35, h.w, h.h * 0.65);
    ctx.fillStyle = '#5a3a22'; ctx.fillRect(h.x + h.w / 2 - 18, h.y + h.h - 50, 36, 50);
    ctx.fillStyle = h.roof;
    ctx.beginPath(); ctx.moveTo(h.x - 20, h.y + h.h * 0.4); ctx.lineTo(h.x + 20, h.y); ctx.lineTo(h.x + h.w - 20, h.y); ctx.lineTo(h.x + h.w + 20, h.y + h.h * 0.4); ctx.fill();
    ctx.fillStyle = '#2a1c10'; ctx.fillRect(h.x + h.w / 2 - 40, h.y + h.h * 0.4, 80, 24);
    ctx.fillStyle = '#e8c066'; ctx.font = 'bold 15px "Noto Serif TC", serif'; ctx.textAlign = 'center';
    ctx.fillText(h.label, h.x + h.w / 2, h.y + h.h * 0.4 + 17);
}

function drawPortal(p, t) {
    ctx.save(); ctx.translate(p.x, p.y);
    ctx.fillStyle = '#7a4ac855'; ctx.beginPath(); ctx.ellipse(0, 0, 38, 18, 0, 0, 7); ctx.fill();
    ctx.strokeStyle = '#c9a8ff'; ctx.lineWidth = 3;
    for (let i = 0; i < 3; i++) { ctx.beginPath(); ctx.ellipse(0, 0, 32 - i * 9, 15 - i * 4, 0, t * 2 + i, t * 2 + i + 4); ctx.stroke(); }
    ctx.restore();
    label(p.name, p.x, p.y - 30, '#d8c0ff');
}

function label(text, x, y, color, size) {
    ctx.font = `bold ${size || 13}px "Noto Sans TC", sans-serif`; ctx.textAlign = 'center';
    ctx.lineWidth = 3; ctx.strokeStyle = '#000a'; ctx.strokeText(text, x, y);
    ctx.fillStyle = color || '#fff'; ctx.fillText(text, x, y);
}

function hpBar(x, y, w, ratio, color) {
    ctx.fillStyle = '#000a'; ctx.fillRect(x - w / 2 - 1, y - 1, w + 2, 6);
    ctx.fillStyle = color; ctx.fillRect(x - w / 2, y, w * clamp(ratio, 0, 1), 4);
}

function drawMob(m, now) {
    const size = m.boss ? 56 : 36;
    const shake = now - m.hitAt < 120 ? rand(-3, 3) : 0;
    ctx.fillStyle = '#0005'; ctx.beginPath(); ctx.ellipse(m.x, m.y, size * 0.45, size * 0.15, 0, 0, 7); ctx.fill();
    if (W.target === m) {
        ctx.strokeStyle = '#ff5a4a'; ctx.lineWidth = 2;
        ctx.beginPath(); ctx.ellipse(m.x, m.y, size * 0.6, size * 0.22, 0, 0, 7); ctx.stroke();
    }
    if (m.boss) { ctx.fillStyle = '#e0605a33'; ctx.beginPath(); ctx.arc(m.x, m.y - size / 2, size * 0.75, 0, 7); ctx.fill(); }
    ctx.save(); ctx.translate(m.x + shake, m.y - (m.state === 'wander' || m.fighting ? Math.abs(Math.sin(now / 120 + m.id)) * 3 : 0));
    ctx.scale(-m.dir, 1);   // emoji 預設面向左
    ctx.font = `${size}px "Segoe UI Emoji","Apple Color Emoji","Noto Color Emoji",sans-serif`; ctx.textAlign = 'center'; ctx.textBaseline = 'bottom';
    ctx.fillText(m.icon, 0, 4);
    ctx.restore(); ctx.textBaseline = 'alphabetic';
    const col = m.lv > G.lv + 4 ? '#ff6a5a' : m.lv > G.lv + 1 ? '#ffb05a' : m.lv < G.lv - 5 ? '#aaa' : '#fff';
    label(`${m.name} Lv.${m.lv}`, m.x, m.y - size - 10, m.boss ? '#ffcf4d' : col, m.boss ? 14 : 12);
    if (m.hp < m.maxHp || m.fighting) hpBar(m.x, m.y - size - 6, m.boss ? 70 : 44, m.hp / m.maxHp, '#d8453a');
    if (m.stun > 0) label('暈', m.x + 22, m.y - size + 8, '#ffe27a', 12);
    if (m.dots.length) label('毒', m.x - 22, m.y - size + 8, '#9fd86a', 12);
}

function drawNpc(n, now) {
    ctx.fillStyle = '#0005'; ctx.beginPath(); ctx.ellipse(n.x, n.y, 16, 6, 0, 0, 7); ctx.fill();
    ctx.font = '34px "Segoe UI Emoji","Apple Color Emoji","Noto Color Emoji",sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'bottom';
    ctx.fillText(n.icon, n.x, n.y + 4 - Math.abs(Math.sin(now / 600)) * 2);
    ctx.textBaseline = 'alphabetic';
    label(n.name, n.x, n.y - 44, '#ffe27a', 13);
    label('💬', n.x + 26, n.y - 30, '#fff', 14);
}

function drawPlayer(now) {
    const me = W.me, img = avatarImage(G);
    const w = 64, h = 85;
    ctx.fillStyle = '#0006'; ctx.beginPath(); ctx.ellipse(me.x, me.y, 18, 6, 0, 0, 7); ctx.fill();
    if (W.casting) {
        const k = W.casting.t / W.casting.total, col = '#7ab8ff';
        ctx.strokeStyle = col; ctx.lineWidth = 3; ctx.globalAlpha = 0.5 + 0.5 * Math.sin(now / 60);
        ctx.beginPath(); ctx.ellipse(me.x, me.y, 26 + k * 10, 9 + k * 3, 0, 0, 7); ctx.stroke(); ctx.globalAlpha = 1;
    }
    ctx.save();
    ctx.translate(me.x, me.y);
    if (W.revive > 0) { ctx.rotate(-Math.PI / 2); ctx.globalAlpha = 0.5; }
    let bob = 0, lunge = 0, tilt = 0;
    if (me.walking) bob = -Math.abs(Math.sin(now / 90)) * 4;
    if (now - W.actAt < 180) { lunge = 8; tilt = 0.12; }
    if (now - W.hurtAt < 120) lunge = -4;
    ctx.scale(me.dir, 1);
    ctx.rotate(tilt);
    if (img.complete) ctx.drawImage(img, -w / 2 + lunge, -h + 4 + bob, w, h);
    ctx.restore();
    label(G.name, me.x, me.y - h - 4, '#9fe0ff', 13);
    if (W.casting) {
        const k = W.casting.t / W.casting.total;
        hpBar(me.x, me.y + 10, 56, k, '#7ab8ff');
        label(skillDef(W.casting.id).name, me.x, me.y + 28, '#bfe0ff', 11);
    }
}

function drawFx() {
    for (const f of W.fx) {
        if (f.ring) {
            ctx.strokeStyle = f.cls === 'inner' ? '#7ab8ff' : '#ffcf4d'; ctx.lineWidth = 3; ctx.globalAlpha = f.t / 0.4;
            ctx.beginPath(); ctx.ellipse(f.x, f.y, f.r * (1.2 - f.t), f.r * 0.4 * (1.2 - f.t), 0, 0, 7); ctx.stroke();
            ctx.globalAlpha = 1; continue;
        }
        const colors = { crit: '#ffcf4d', hurt: '#ff6a5a', heal: '#7fe07a', miss: '#ccc', skill: '#bfe0ff', loot: '#ffb347', lvup: '#ffe27a', dot: '#9fd86a', inner: '#9fd0ff' };
        const c = f.cls.split(' ')[0];
        ctx.globalAlpha = Math.min(1, f.t * 2);
        label(f.text, f.x, f.y, colors[c] || '#fff', f.cls.includes('crit') ? 18 : f.cls === 'lvup' ? 20 : 14);
        ctx.globalAlpha = 1;
    }
}

function render(now) {
    if (!W || !ctx) return;
    const m = MAPS[W.mapId];
    camX = clamp(W.me.x - viewW / 2, 0, Math.max(0, m.w - viewW));
    camY = clamp(W.me.y - viewH / 2, 0, Math.max(0, m.h - viewH));
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.fillStyle = '#111'; ctx.fillRect(0, 0, viewW, viewH);
    ctx.translate(-Math.round(camX), -Math.round(camY));
    ctx.drawImage(mapBackground(W.mapId), 0, 0);
    if (W.moveTo) { ctx.strokeStyle = '#fff8'; ctx.lineWidth = 2; ctx.beginPath(); ctx.ellipse(W.moveTo.x, W.moveTo.y, 12, 5, 0, 0, 7); ctx.stroke(); }
    for (const p of m.portals) drawPortal(p, now / 1000);
    // 依 y 排序繪製（只畫畫面內的）
    const vis = o => o.x > camX - 150 && o.x < camX + viewW + 150 && o.y > camY - 60 && o.y < camY + viewH + 200;
    const list = [];
    for (const o of buildObstacles(W.mapId)) if (o.type === 'house' || vis(o)) list.push({ y: o.type === 'house' ? o.y + o.h / 2 : o.y, f: () => o.type === 'tree' ? drawTree(o, m) : o.type === 'rock' ? drawRock(o, m) : drawHouse(o) });
    for (const n of m.npcs || []) list.push({ y: n.y, f: () => drawNpc(n, now) });
    for (const mob of W.mobs) if (mob.state !== 'dead' && vis(mob)) list.push({ y: mob.y, f: () => drawMob(mob, now) });
    list.push({ y: W.me.y, f: () => drawPlayer(now) });
    list.sort((a, b) => a.y - b.y);
    for (const it of list) it.f();
    drawFx();
    renderMinimap();
}

function renderMinimap() {
    const m = MAPS[W.mapId], mw = mini.width, mh = mini.height, sx = mw / m.w, sy = mh / m.h;
    mctx.drawImage(mapBackground(W.mapId), 0, 0, mw, mh);
    mctx.fillStyle = '#0003'; mctx.fillRect(0, 0, mw, mh);
    mctx.strokeStyle = '#fff6'; mctx.strokeRect(camX * sx, camY * sy, viewW * sx, viewH * sy);
    const dot = (x, y, c, r) => { mctx.fillStyle = c; mctx.beginPath(); mctx.arc(x * sx, y * sy, r, 0, 7); mctx.fill(); };
    for (const p of m.portals) dot(p.x, p.y, '#c9a8ff', 4);
    for (const n of m.npcs || []) dot(n.x, n.y, '#ffe27a', 3);
    for (const mob of W.mobs) if (mob.state !== 'dead') dot(mob.x, mob.y, mob.boss ? '#ff3a2a' : '#e07a5a', mob.boss ? 4 : 1.6);
    dot(W.me.x, W.me.y, '#fff', 3.5);
}
