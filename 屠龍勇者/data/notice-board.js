// 村莊遊戲告示牌（2026-11-03，ARCHITECTURE.md 第 279 節）：每個村莊廣場一塊木頭告示牌（格子 12,9），點名牌打開「贊助人／目前遊戲經費」。
// 內容由管理者在 gm.html「📋 告示牌」編輯（tools/notice-board.sql 的 notice_get／gm_notice_set），沒登入也讀得到；讀過 5 分鐘內再開不重抓。
// 依賴 ui（openDialog）、ui-scene（TOWN_NPCS、drawNpcPlate 的 n.draw）、scene-art（SCENE_ART_BGS 村莊）、cloud（cloudSb）、market（marketRpc）
const NOTICE_CACHE_MS = 5 * 60 * 1000;
let noticeData = null, noticeAt = 0;
function noticeText(s, empty) { return s && s.trim() ? esc(s.trim()).replace(/\n/g, '<br>') : `<span class="muted">${empty}</span>`; }
function noticeHtml(d) {
    if (!d) return '<p class="muted">暫時讀不到告示內容，請稍後再看。</p>';
    return `<div class="panel"><h4>🤝 贊助人</h4><p style="margin:0">${noticeText(d.sponsors, '（目前還沒有公告）')}</p></div>
        <div class="panel"><h4>💰 目前遊戲經費</h4><p style="margin:0">${noticeText(d.funds, '（目前還沒有公告）')}</p></div>
        <small class="muted">感謝每一位支持黑暗大陸的冒險者。</small>`;
}
async function openNoticeBoard() {
    const show = () => openDialog('📋 遊戲告示牌', noticeHtml(noticeData));
    if (noticeData && Date.now() - noticeAt < NOTICE_CACHE_MS) { show(); return; }
    if (typeof cloudSb === 'undefined' || !cloudSb) { show(); return; }
    try { noticeData = await marketRpc('notice_get'); noticeAt = Date.now(); } catch (e) { console.warn('告示牌讀取失敗', e); }
    show();
}
// 畫一塊木頭告示牌：sx, sy＝格子中心（畫面座標）
function drawNoticeBoard(ctx, sx, sy) {
    ctx.save();
    ctx.fillStyle = 'rgba(0,0,0,0.4)'; ctx.beginPath(); ctx.ellipse(sx, sy + 12, 20, 5, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#4a3020'; ctx.strokeStyle = '#1e120a'; ctx.lineWidth = 1;
    for (const px of [sx - 17, sx + 13]) { ctx.fillRect(px, sy - 30, 4, 42); ctx.strokeRect(px, sy - 30, 4, 42); }
    const gr = ctx.createLinearGradient(0, sy - 40, 0, sy - 6); gr.addColorStop(0, '#a87a48'); gr.addColorStop(1, '#6e4a28');
    ctx.fillStyle = gr; ctx.fillRect(sx - 24, sy - 40, 48, 32); ctx.lineWidth = 2; ctx.strokeStyle = '#2e1c0e'; ctx.strokeRect(sx - 24, sy - 40, 48, 32);
    ctx.fillStyle = '#5a3a1e'; ctx.fillRect(sx - 27, sy - 44, 54, 5);   // 上方小屋簷
    ctx.fillStyle = '#efe2c0';   // 兩張貼紙
    ctx.fillRect(sx - 19, sy - 35, 17, 22); ctx.fillRect(sx + 2, sy - 33, 17, 19);
    ctx.fillStyle = '#9a8a6a';
    for (let i = 0; i < 4; i++) { ctx.fillRect(sx - 17, sy - 31 + i * 5, 13, 1.5); if (i < 3) ctx.fillRect(sx + 4, sy - 29 + i * 5, 13, 1.5); }
    ctx.fillStyle = '#b02a1a'; ctx.beginPath(); ctx.arc(sx - 10.5, sy - 35, 1.8, 0, Math.PI * 2); ctx.arc(sx + 10.5, sy - 33, 1.8, 0, Math.PI * 2); ctx.fill();   // 圖釘
    ctx.restore();
}

TOWN_NPCS.push({ role: '告示牌', icon: '📋', x: 12, y: 9, draw: drawNoticeBoard, act: () => openNoticeBoard(),
    names: { talking: '遊戲告示牌', gludio: '遊戲告示牌', giran: '遊戲告示牌', aden: '遊戲告示牌' } });
for (const key of ['village', 'ash', 'darkgold', 'aden']) if (SCENE_ART_BGS[key] && SCENE_ART_BGS[key].npcs) SCENE_ART_BGS[key].npcs.push({ role: '告示牌', x: 12, y: 9, painted: false });
