// 浪跡江湖：啟動與主迴圈（ARCHITECTURE.md 第 2 節）
let lastT = 0, saveAcc = 0, canvasReady = false;

function startGame() {
    $('create').style.display = 'none';
    $('game').style.display = '';
    if (!canvasReady) { initCanvas(); canvasReady = true; } else resizeCanvas();
    W = null;
    enterMap(G.map, G.x, G.y);
    const off = applyOffline();
    gainExp(0);
    refreshStats();
    G.hp = Math.min(Math.max(G.hp, 1), W.stats.hp); G.mp = Math.min(G.mp, W.stats.mp);
    if (off) {
        const h = (off.sec / 3600).toFixed(1);
        if (off.idle) addLog(`離線 ${h} 小時（沒有在野外掛機，無離線收益）`);
        else if (off.tooHard) addLog(`離線 ${h} 小時，此地怪物太強，沒有收益。`, 'warn');
        else addLog(`離線 ${h} 小時：擊殺 ${off.kills}、經驗 ${fmt(off.exp)}、銀兩 ${fmt(off.silver)}、修為 ${fmt(off.xiuwei)}、裝備 ${off.items} 件`, 'gold');
    }
    $('log').innerHTML = logs.join('');
    markDirty();
}

function loop(t) {
    requestAnimationFrame(loop);
    const dt = Math.min(0.25, (t - lastT) / 1000);   // 切分頁回來不一次跳太多
    lastT = t;
    if (!G || !W) return;
    // 固定 50ms 一步更新世界
    let left = dt;
    while (left > 0) { const step = Math.min(left, 0.05); worldTick(step); left -= step; }
    if (dirty) { dirty = false; renderHudStatic(); renderPanel(); }
    render(t);
    renderHud(t);
    if ((saveAcc += dt) > 10) { saveAcc = 0; saveGame(); }
}

window.addEventListener('keydown', e => {
    if (!G || !W || e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA' || e.target.tagName === 'SELECT') return;
    if (e.key >= '1' && e.key <= String(HOTBAR_SIZE)) { pressHotkey(+e.key - 1); e.preventDefault(); }
    else if (e.key === 'Escape') closePanel();
    else if (e.key === 'h' || e.key === 'H') toggleHunt();
    else if (e.key === 'c' || e.key === 'C') openPanel('char');
    else if (e.key === 'k' || e.key === 'K') openPanel('skill');
    else if (e.key === 'b' || e.key === 'B') openPanel('bag');
    else if (e.key === 'm' || e.key === 'M') openPanel('map');
});

window.addEventListener('load', () => {
    G = loadGame();
    if (G) startGame(); else renderCreate();
    requestAnimationFrame(loop);
});
window.addEventListener('beforeunload', saveGame);
document.addEventListener('visibilitychange', () => { if (document.hidden) saveGame(); });
