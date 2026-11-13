// 屠龍勇者：小遊戲分頁（ARCHITECTURE.md 第 334 節）
// 目前收錄「生存者挑戰」（survivor.html，第 331 節的獨立原型）：用 iframe 全螢幕蓋在遊戲上，跟角色完全分開（不讀角色、不存檔、沒有獎勵）。
// 依賴：載入時 TABS／PANEL_FNS（ui-panels）；執行期 GAME_VERSION、$。入口：手機右抽屜、PC 地圖左側圓鈕（ui-frame.js）。

TABS.minigame = ['🎮', '小遊戲'];
PANEL_FNS.minigame = renderMiniGames;

function renderMiniGames() {
    return `<div class="panel"><h4>🎮 小遊戲</h4><small class="muted">休閒小遊戲：不使用你的角色、不影響存檔，也沒有獎勵。玩的時候掛機照常進行。</small></div>
        <div class="panel"><h4>⚔️ 生存者挑戰</h4>
            <p>怪物會從四面八方大量湧出圍攻你，每 30 秒進入下一波：怪物越來越強，而且每一波抽到不同能力（疾風、分裂、自爆、劇毒、衝鋒、閃現…），每 5 波出現首領。</p>
            <p>攻擊全自動，撿經驗石升級、三選一強化（劍氣斬、魔法飛彈、守護飛劍、天雷、聖光爆…），看你能撐到第幾波。電腦用 WASD／方向鍵移動，手機按住畫面拖曳。</p>
            <button onclick="openMiniSurvivor()">開始遊玩</button>
        </div>`;
}
function openMiniSurvivor() {
    closeMiniGame();
    const d = document.createElement('div');
    d.id = 'minigame-layer';
    d.style.cssText = 'position:fixed;inset:0;z-index:9500;background:#0b0a0d';
    d.innerHTML = `<iframe src="survivor.html?v=${GAME_VERSION}" title="生存者挑戰" style="position:absolute;inset:0;width:100%;height:100%;border:0" allow="fullscreen"></iframe>
        <button onclick="closeMiniGame()" style="position:absolute;bottom:calc(10px + env(safe-area-inset-bottom));left:10px;z-index:1;background:rgba(20,16,24,.85);color:#ddd;border:1px solid #5a4a3a;border-radius:6px;padding:6px 10px;font-size:13px">✕ 離開小遊戲</button>`;
    document.body.appendChild(d);
    const f = d.querySelector('iframe');
    f.addEventListener('load', () => { try { f.contentWindow.focus(); } catch (e) {} });
}
function closeMiniGame() { const d = $('minigame-layer'); if (d) d.remove(); }
