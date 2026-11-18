// 背景音樂：照天地劫客戶端 music.def（tools/music/build.js → data/music-zones-data.js、assets/music/music<N>.mp3）。
//   登入／選角＝music0；建角＝各職業的曲子（System Setting）；遊戲中＝目前地圖＋座標對到的區域（第一個符合的區域優先，整張地圖那行墊底），
//   沒列到的地圖放 Hunting；死亡放 Death。一個區域列好幾首＝照地圖編號挑第一首，播完換下一首。換曲時淡出淡入。
const IslandMusic = (() => {
  const key = 'lineage-web-music', VOLUME = .35, FADE_MS = 900;
  const data = window.MUSIC_ZONES || { sys: {}, zones: {}, tracks: [0] };
  // 2026-11-18 使用者：原版 music.def 沒列到的 12 張地圖補配音樂（照性質相近的地圖挑，不改產生檔 music-zones-data.js）
  const EXTRA = {
    3: [64],               // 甘特之屋：小型地監
    16: [11],              // 哈汀研究所：跟象牙塔同屬魔法研究
    17: [65, 66],          // 娜魯帕洞穴：洞穴類
    62: [24],              // 伊娃神殿：跟伊娃王國同一首
    70: [30],              // 遺忘之島：島嶼曲（同說話之島野外）
    301: [36],             // 傲慢之塔地下水路：水道（同海底隧道）
    305: [67, 68],         // 布魯迪卡洞穴：洞穴類
    330: [58],             // 礦物洞穴：礦坑（同侏儒洞穴）
    401: [44],             // 大洞穴隱遁者地區：同隱遁者村莊外圍
    807: [65, 64, 66],     // 新版古魯丁地監：同古魯丁地下監獄
    1700: [30],            // 忘卻島：島嶼曲
    3301: [63, 64, 65, 66, 67, 68, 69] // 新傲慢之塔：同傲慢之塔
  };
  for (const [map, tracks] of Object.entries(EXTRA)) if (!data.zones[map]) data.zones[map] = [[tracks]];
  const CLASS_KEY = { '王族': 'Prince', '騎士': 'Knight', '妖精': 'Elf', '法師': 'Magician', '黑暗妖精': 'Darkelf', '龍騎士': 'DragonKnight', '幻術師': 'illusionist', '戰士': 'Knight' };
  const players = [new Audio(), new Audio()];
  for (const a of players) { a.preload = 'none'; a.volume = 0; a.addEventListener('ended', () => next(a)); }
  let enabled = true, active = 0, list = null, listKey = '', index = 0, fadeTimer = 0, fadeUntil = 0;
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
    // 2026-11-18 修：iPhone（iOS Safari）不能用程式改音量（volume 永遠是 1），舊寫法「淡出到 0 才暫停」永遠不暫停 → 選角音樂與遊戲音樂重疊。
    //  改成依時間淡出：時間到一律暫停要關掉的那首，不看 volume。
    const to = target ? players[active] : null, t0 = Date.now();
    for (const a of from) if (a.paused) a.volume = 0;
    const startVol = from.map(a => a.volume);
    fadeUntil = Date.now() + FADE_MS + 200;
    fadeTimer = setInterval(() => {
      const k = Math.min(1, (Date.now() - t0) / FADE_MS);
      from.forEach((a, i) => { try { a.volume = Math.max(0, startVol[i] * (1 - k)); } catch {} if (k >= 1 && !a.paused) a.pause(); });
      if (to) try { to.volume = VOLUME * k; } catch {}
      if (k >= 1) clearInterval(fadeTimer);
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
    // 2026-11-17 使用者：登入畫面只放登入影片自己的配樂（data/login-video.js），不放 music0
    if (window.gameFlowState === 'login') { if (listKey !== 'login') { listKey = 'login'; list = null; fadeTo(false); } return; }
    const [k, tracks] = wanted();
    if (k === listKey) { const a = players[active]; if (a.paused && a.src) a.play().catch(() => {}); return; }
    listKey = k; list = tracks; index = (window.activeMapId || 0) % tracks.length;
    start(list[index]);
  }

  // 2026-11-18 使用者：手機登入畫面也要能關音樂 → 登入／選角／建角畫面右上角放一顆喇叭鈕（跟設定裡的「遊戲音樂」同一個開關，也管登入配樂）
  function setEnabled(on) {
    enabled = !!on;
    try { localStorage.setItem(key, enabled ? 'on' : 'off'); } catch {}
    if (!enabled) window.LoginBgm?.pause();
    sync();
  }
  const muteBtn = document.createElement('button');
  muteBtn.type = 'button'; muteBtn.className = 'entry-music-toggle';
  muteBtn.style.cssText = 'position:fixed;top:max(10px,env(safe-area-inset-top));right:max(10px,env(safe-area-inset-right));z-index:9999;min-width:44px;height:40px;padding:0 10px;border:1px solid #b8975a;border-radius:20px;background:#120d08cc;color:#f3e6c2;font:600 14px system-ui;cursor:pointer;box-shadow:0 2px 8px #000a';
  muteBtn.onclick = e => { e.stopPropagation(); setEnabled(!enabled); };
  document.body.append(muteBtn);
  function refreshMute() {
    muteBtn.hidden = window.gameFlowState === 'playing';
    muteBtn.textContent = enabled ? '🔊 音樂' : '🔇 靜音';
    muteBtn.setAttribute('aria-pressed', String(!enabled));
    muteBtn.setAttribute('aria-label', enabled ? '關閉音樂' : '開啟音樂');
  }
  setInterval(refreshMute, 300); refreshMute();
  // 2026-11-18 使用者：手機仍有兩首背景音樂同時播 → 保險：每秒檢查，只允許「目前該播的那首」出聲，
  //  另一個播放器（淡出期間除外）、離開登入畫面後的登入配樂、登入影片，一律暫停。
  function guard() {
    const inGame = window.gameFlowState !== 'login';
    if (Date.now() > fadeUntil) players.forEach((a, i) => { if ((i !== active || !list || !enabled || document.hidden) && !a.paused) a.pause(); });
    if (inGame || !enabled) { const b = window.LoginBgm; if (b && !b.paused) b.pause(); }
    if (inGame) { const v = document.querySelector('.login-video'); if (v && !v.paused) { v.muted = true; v.pause(); } }
  }
  setInterval(guard, 1000);
  document.addEventListener('visibilitychange', guard);
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
    button.onclick = () => { setEnabled(!enabled); refresh(); };
    refresh();
    document.querySelector('#panelContent').append(button);
  };
  return { sync, setEnabled, guard, get playing() { return players.filter(a => !a.paused).map(a => a.src.split('/').pop()); }, get enabled() { return enabled; }, get scene() { return listKey; }, get track() { return players[active].src; } };
})();
window.IslandMusic = IslandMusic;
