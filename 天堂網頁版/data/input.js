// 方向按鈕與鍵盤；切換視窗、開啟選單或離開頁面時停止長按。
const movementIntervals = new Set();
function stopMovement() { if(typeof cancelNavigation==='function'&&window.IslandCombat?.mode!=='auto')cancelNavigation(); for (const id of movementIntervals) clearInterval(id); movementIntervals.clear(); }
document.querySelectorAll('[data-move]').forEach(button => {
  let repeat;
  const stop = () => { clearInterval(repeat); movementIntervals.delete(repeat); };
  button.addEventListener('pointerdown', event => {
    if (!$('#panel').hidden || (event.pointerType === 'mouse' && event.button !== 0)) return;
    event.preventDefault(); button.setPointerCapture(event.pointerId);
    const direction = button.dataset.move.split(',').map(Number);
    stop(); move(...direction);
    repeat = setInterval(() => move(...direction), MovementConfig.pollMs); movementIntervals.add(repeat);
  });
  for (const type of ['pointerup', 'pointercancel', 'lostpointercapture']) button.addEventListener(type, stop);
});
addEventListener('blur', stopMovement);
addEventListener('pagehide', stopMovement);
document.addEventListener('visibilitychange', () => { if (document.hidden) stopMovement(); });
addEventListener('keydown',e=>{if(!$('#panel').hidden||e.target.closest?.('input,select,textarea,[contenteditable=true]'))return;const d={ArrowUp:[0,-1],ArrowDown:[0,1],ArrowLeft:[-1,0],ArrowRight:[1,0]}[e.key];if(d){e.preventDefault();move(...d)}});
