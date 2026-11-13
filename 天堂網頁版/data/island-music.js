// 背景音樂：照天地劫客戶端 music.def（tools/music/build.js → data/music-zones-data.js、assets/music/music<N>.mp3）。
//   登入／選角＝music0；建角＝各職業的曲子（System Setting）；遊戲中＝目前地圖＋座標對到的區域（第一個符合的區域優先，整張地圖那行墊底），
//   沒列到的地圖放 Hunting；死亡放 Death。一個區域列好幾首＝照地圖編號挑第一首，播完換下一首。換曲時淡出淡入。
const IslandMusic = (() => {
  const key = 'lineage-web-music', VOLUME = .35, FADE_MS = 900;
  const data = window.MUSIC_ZONES || { sys: {}, zones: {}, tracks: [0] };
  const CLASS_KEY = { '王族': 'Prince', '騎士': 'Knight', '妖精': 'Elf', '法師': 'Magician', '黑暗妖精': 'Darkelf', '龍騎士': 'DragonKnight', '幻術師': 'illusionist', '戰士': 'Knight' };
  const players = [new Audio(), new Audio()];
  for (const a of players) { a.preload = 'none'; a.volume = 0; a.addEventListener('ended', () => next(a)); }
  let enabled = true, active = 0, list = null, listKey = '', index = 0, fadeTimer = 0;
  try { enabled = localStorage.getItem(key) !== 'off'; } catch {}

  const sys = (name, fallback) => [data.sys[name] ?? fallback];
  // 目前該放的曲目清單（與辨識用的 key：同一個區域就不重新開始）
  function wanted() {
    const state = window.gameFlowState;
    if (state === 'creation') { const role = typeof creationDraft !== 'undefined' && creationDraft?.role; const k = CLASS_KEY[role] || 'Prince'; return ['class:' + k, sys(k, 1)]; }
    if (state !== 'playing') return ['title', sys('Title', 0)];
    if (window.CharacterActions?.dead) return ['death', sys('Death', 120)];
    const map = window.activeMapId || 0, x = typeof worldX !== 'undefined' ? worldX : 0, y = typeof worldY !== 'undefined' ? worldY : 0;
    const zones = data.zones[map] || [];
    for (let i = 0; i < zones.length; i++) {
      const z = zones[i], tracks = z[z.length - 1];
      if (!tracks.length) continue;
      if (z.length === 1 || (x >= Math.min(z[0], z[2]) && x <= Math.max(z[0], z[2]) && y >= Math.min(z[1], z[3]) && y <= Math.max(z[1], z[3]))) return ['zone:' + map + ':' + i, tracks];
    }
    return ['hunt', sys('Hunting', 6)];
  }
  const src = n => 'assets/music/music' + n + '.mp3';
  function fadeTo(target) {
    clearInterval(fadeTimer);
    const from = players.filter((a, i) => i !== active || !target);
    const to = target ? players[active] : null, step = 50 / FADE_MS * VOLUME;
    fadeTimer = setInterval(() => {
      let done = true;
      for (const a of from) { a.volume = Math.max(0, a.volume - step); if (a.volume > 0) done = false; else if (!a.paused) a.pause(); }
      if (to) { to.volume = Math.min(VOLUME, to.volume + step); if (to.volume < VOLUME) done = false; }
      if (done) clearInterval(fadeTimer);
    }, 50);
  }
  function start(n) {
    active = 1 - active;
    const a = players[active];
    a.loop = list.length === 1;
    if (!a.src.endsWith(src(n))) a.src = src(n);
    a.currentTime = 0; a.volume = 0;
    a.play().catch(() => {});
    fadeTo(true);
  }
  function next(a) { if (a !== players[active] || !list || list.length < 2) return; index = (index + 1) % list.length; start(list[index]); }
  function sync() {
    if (!enabled || document.hidden) { listKey = ''; list = null; fadeTo(false); return; }
    const [k, tracks] = wanted();
    if (k === listKey) { const a = players[active]; if (a.paused && a.src) a.play().catch(() => {}); return; }
    listKey = k; list = tracks; index = (window.activeMapId || 0) % tracks.length;
    start(list[index]);
  }

  setInterval(sync, 1000);
  for (const ev of ['visibilitychange']) document.addEventListener(ev, sync);
  for (const ev of ['click', 'pointerdown', 'keydown', 'touchend']) document.addEventListener(ev, sync, { passive: true });
  window.addEventListener('pagehide', () => { for (const a of players) a.pause(); listKey = ''; });
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
  return { sync, get scene() { return listKey; }, get track() { return players[active].src; } };
})();
window.IslandMusic = IslandMusic;
