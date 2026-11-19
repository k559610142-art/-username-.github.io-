// Play original client sounds at their animation markers or on confirmed damage.
const CombatSound = (() => {
  const key = 'lineage-web-combat-sound';
  const clips = new Map();
  const playing = new Set();
  const recent = new Map();
  let enabled = true;
  try { enabled = localStorage.getItem(key) !== 'off'; } catch {}

  // 2026-11-19 iPhone 站著打怪 FPS 掉到 8～12、每次出手／被打卡 80～160ms：原本每個音效用 <audio> 元素，
  //  每次 currentTime=0 再 play()，iOS Safari 這樣會卡住主執行緒。改用 Web Audio：每個音效只下載解碼一次（解碼不在主執行緒），
  //  之後每次播放只是開一個 BufferSource，幾乎不花時間。不支援 Web Audio 的瀏覽器才退回舊的 <audio> 播法。
  //  iOS 要在使用者觸控時建立／喚醒 AudioContext，所以掛在 pointerdown／touchend／keydown 上。
  const AC = window.AudioContext || window.webkitAudioContext;
  let ctx = null;
  const buffers = new Map(), sources = new Set();
  function audio() {
    if (!AC) return null;
    if (!ctx) { try { ctx = new AC(); } catch { return null; } }
    if (ctx.state === 'suspended') ctx.resume().catch(() => {});
    return ctx;
  }
  for (const type of ['pointerdown', 'touchend', 'keydown']) addEventListener(type, () => { if (enabled) audio(); }, {capture: true, passive: true});
  function load(id, c) {
    const entry = {buffer: null, failed: false, wanted: 0, volume: 0};
    buffers.set(id, entry);
    fetch('assets/combat-sound/' + id + '.wav').then(r => r.ok ? r.arrayBuffer() : Promise.reject(r.status))
      .then(data => new Promise((ok, fail) => c.decodeAudioData(data, ok, fail)))
      .then(buffer => { entry.buffer = buffer; if (performance.now() - entry.wanted < 250) start(entry, entry.volume); })
      .catch(() => { entry.failed = true; });
    return entry;
  }
  function start(entry, volume) {
    const c = ctx;
    if (!c || !entry.buffer || sources.size >= 10 || !enabled || document.hidden) return;
    try {
      const source = c.createBufferSource(), gain = c.createGain();
      source.buffer = entry.buffer; gain.gain.value = volume;
      source.connect(gain); gain.connect(c.destination);
      source.onended = () => sources.delete(source);
      sources.add(source); source.start();
    } catch {}
  }
  function play(id, volume) {
    if (!enabled || document.hidden || window.gameFlowState !== 'playing' || playing.size >= 10) return;
    const now = performance.now();
    if (now - (recent.get(id) ?? -Infinity) < 60) return;
    recent.set(id, now);
    const c = audio();
    if (c) {
      const entry = buffers.get(id) || load(id, c);
      if (entry.buffer) start(entry, volume);
      else if (!entry.failed) { entry.wanted = now; entry.volume = volume; }
      return;
    }
    let clip = clips.get(id);
    if (!clip) {
      clip = new Audio('assets/combat-sound/'+id+'.wav');
      clip.addEventListener('ended', () => playing.delete(clip));
      clip.addEventListener('error', () => playing.delete(clip));
      clips.set(id, clip);
    }
    clip.volume = volume;
    clip.currentTime = 0;
    playing.add(clip);
    clip.play().catch(() => playing.delete(clip));
  }

  const choose = sounds => sounds[Math.floor(Math.random()*sounds.length)];
  function schedule(events, start, duration, volume, valid) {
    const owner = window.activeCharacterId;
    for (const [phase,sounds] of events || []) {
      const fire = () => {
        if (window.activeCharacterId === owner && valid()) play(choose(sounds),volume);
      };
      const delay = start + duration * phase - movementTime();
      if (delay > 5) setTimeout(fire,delay);
      else fire();
    }
  }

  function playerEvents(offset) {
    const base = activeWeaponWalkAction()+offset;
    const morph = combatSoundData[window.activeTransformCard?.p?.gfx];
    const avatar = combatSoundData[activeCharacterActions().spriteId];
    return morph?.[base] || morph?.[offset] || avatar?.[base] || avatar?.[offset];
  }

  function hit(events, volume) {
    const sounds = events?.[0]?.[1];
    play(sounds?.length ? choose(sounds) : 701,volume);
  }

  function stop() {
    for (const clip of playing) clip.pause();
    playing.clear();
    for (const source of sources) { try { source.stop(); } catch {} }
    sources.clear();
  }
  document.addEventListener('visibilitychange', () => {if (document.hidden) stop();});
  window.addEventListener('pagehide',stop);
  const originalPanel = panel;
  panel = function (type) {
    originalPanel(type);
    if (type !== 'settings') return;
    const button = document.createElement('button');
    button.type = 'button';
    const refresh = () => {
      button.textContent = '戰鬥音效 ' + (enabled ? '開啟' : '關閉');
      button.setAttribute('aria-pressed', String(enabled));
    };
    button.onclick = () => {
      enabled = !enabled;
      if (!enabled) stop();
      try { localStorage.setItem(key,enabled ? 'on' : 'off'); } catch {}
      refresh();
    };
    refresh();
    document.querySelector('#panelContent').append(button);
  };

  return {
    playerAttack(action) {
      schedule(playerEvents(1) || [[.35,[701]]],action.started,action.duration,.45,
        () => characterActionState===action);
    },
    playerHit(dead) {
      const avatar = combatSoundData[activeCharacterActions().spriteId];
      const morph = combatSoundData[window.activeTransformCard?.p?.gfx];
      hit((dead && (morph?.[8] || avatar?.[8])) || playerEvents(2),.58);
    },
    monsterAttack(mob,skill,duration) {
      const clips = combatSoundData[mob.spawn.npc.gfx];
      const action = mob.action;
      const code = skill?.action || (skill?.type===2 ? skill.spell?.action || 19 : 1);
      schedule(clips?.[code] || clips?.[1] || [[.35,[701]]],action.start,duration,.36,
        () => mob.hp>0 && mob.action===action && mob.alert);
    },
    monsterHit(mob) {
      const clips = combatSoundData[mob.spawn.npc.gfx];
      hit((!mob.hp && clips?.[8]) || clips?.[2],.55);
    }
  };
})();
