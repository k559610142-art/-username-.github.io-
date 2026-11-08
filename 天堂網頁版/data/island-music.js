const IslandMusic = (() => {
  const key = 'lineage-web-music';
  const track = new Audio('assets/music/music0.mp3');
  track.loop = true;
  track.volume = .35;
  track.preload = 'none';
  let enabled = true;
  try { enabled = localStorage.getItem(key) !== 'off'; } catch {}

  function sync() {
    if (!enabled || window.gameFlowState !== 'playing') {
      track.pause();
    } else if (track.paused) {
      track.play().catch(() => {});
    }
  }

  document.addEventListener('visibilitychange', sync);
  document.addEventListener('click', sync);
  window.addEventListener('pagehide', () => track.pause());
  window.addEventListener('pageshow', sync);

  const originalPanel = panel;
  panel = function (type) {
    originalPanel(type);
    if (type !== 'settings') return;
    const button = document.createElement('button');
    button.type = 'button';
    const refresh = () => {
      button.textContent = '遊戲音樂 ' + (enabled ? '開啟' : '關閉');
      button.setAttribute('aria-pressed', String(enabled));
    };
    button.onclick = () => {
      enabled = !enabled;
      try { localStorage.setItem(key, enabled ? 'on' : 'off'); } catch {}
      refresh();
      sync();
    };
    refresh();
    document.querySelector('#panelContent').append(button);
  };
  return {sync};
})();
window.IslandMusic = IslandMusic;
