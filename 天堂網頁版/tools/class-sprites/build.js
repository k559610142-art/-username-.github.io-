// New player classes (龍騎士／幻術師／戰士): cut every weapon stance from the client .spr into
// assets/character-actions/<avatar>/<DIR>/<clip>[_s]_<n>.png (same layout as the existing classes) and write
// data/extra-class-data.js (avatars for CHARACTER_ACTION_ASSETS, walk profiles for SPRITE_MOVEMENT, portraits).
// Timings: client list.spr (Text.pak); server action length: DB spr_action (framecount, framerate).
// 戰士 (12490／12494) has no list.spr entry in this client; its .spr files follow the 龍騎士 layout, so the
// 龍騎士 entry of the same gender is used as the template (every referenced frame is checked to exist).
// Usage: node tools/class-sprites/build.js [--client DIR]
const fs = require('fs'), path = require('path'), vm = require('vm');
const ROOT = path.resolve(__dirname, '../..');
const { openPak } = require('../client-pak/l1pak.js');
const { rgbaPng } = require('../client-pak/img2png.js');
const { parseSpr, renderFrame } = require('../native-monsters/spr.js');
const { parseList } = require('../native-monsters/listspr.js');
const args = process.argv.slice(2); let client = 'C:/Users/User/Desktop/天地劫天堂';
for (let i = 0; i < args.length; i++) if (args[i] === '--client') client = args[++i];

const AVATARS = [
  { name: '男龍騎士', role: '龍騎士', gender: 0, gfx: 6658, weapons: { unarmed: 0, sword1: 4, blunt: 11, chainsword: 24, sword2: 50 } },
  { name: '女龍騎士', role: '龍騎士', gender: 1, gfx: 6661, weapons: { unarmed: 0, sword1: 4, blunt: 11, chainsword: 24, sword2: 50 } },
  { name: '男幻術師', role: '幻術師', gender: 0, gfx: 6671, weapons: { unarmed: 0, blunt: 11, bow: 20, wand: 40, kiringku: 58 } },
  { name: '女幻術師', role: '幻術師', gender: 1, gfx: 6650, weapons: { unarmed: 0, blunt: 11, bow: 20, wand: 40, kiringku: 58 } },
  { name: '男戰士', role: '戰士', gender: 0, gfx: 12490, layout: true, weapons: { unarmed: 0, sword1: 4, blunt: 11, spear: 24, sword2: 50 } },
  { name: '女戰士', role: '戰士', gender: 1, gfx: 12494, layout: true, weapons: { unarmed: 0, sword1: 4, blunt: 11, spear: 24, sword2: 50 } },
];
// 戰士 has no list.spr entry. Its 36 file groups (×8 directions) were identified by rendering the frames:
// weapon blocks start at 112 (雙斧 → 斧), 160 (男: 巨斧／女: 單手劍 → 單手劍), 208 (長矛), 248 (雙手大劍).
// Male blocks are breath, attack, …, walk, damage; female blocks are breath, walk, damage, attack. Action ids → file group:
// Action lengths come from DB spr_action (12490／12494 rows); frames share the ticks evenly.
const WARRIOR = {
  12490: { 0: 40, 1: 8, 2: 48, 3: 0, 8: 64, 18: 72, 11: 144, 12: 120, 13: 152, 14: 112, 4: 192, 5: 168, 6: 200, 7: 160, 24: 232, 25: 216, 26: 240, 27: 208, 50: 272, 51: 256, 52: 280, 53: 248 },
  12494: { 0: 8, 1: 32, 2: 16, 3: 0, 8: 104, 18: 72, 11: 120, 12: 136, 13: 128, 14: 112, 4: 168, 5: 184, 6: 176, 7: 160, 24: 216, 25: 232, 26: 224, 27: 208, 50: 256, 51: 272, 52: 264, 53: 248 },
};
const ACTION_NAMES = { 0: 'walk', 1: 'attack', 2: 'damage', 3: 'breath', 8: 'death', 18: 'spell dir' };
const NEW_WEAPONS = { chainsword: { label: '鎖鏈劍', base: 24 }, kiringku: { label: '奇古獸', base: 58 } };
const DIRS = ['NW', 'N', 'NE', 'E', 'SE', 'S', 'SW', 'W'];
const TICK_MS = 40;

const paks = ['Sprite.idx', ...Array.from({ length: 16 }, (_, i) => 'Sprite' + String(i).padStart(2, '0') + '.idx')].map(f => openPak(path.join(client, f)));
const sprIndex = new Map(); for (const p of paks) for (const r of p.records) if (/\.spr$/i.test(r.name)) sprIndex.set(r.name.toLowerCase(), [p, r]);
const sprCache = new Map();
const spr = name => { if (!sprCache.has(name)) { const e = sprIndex.get(name); sprCache.set(name, e ? parseSpr(e[0].read(e[1])) : null); } return sprCache.get(name); };
const text = openPak(path.join(client, 'Text.idx')), list = parseList(text.read(text.records.find(r => r.name === 'list.spr')).toString('latin1'));
const sprAction = (() => { const c = { GameDatabase: { register: (n, cols, rows) => { c.T = { cols, rows }; } } }; vm.createContext(c); vm.runInContext(fs.readFileSync(path.join(ROOT, 'data/database/table-152.js'), 'utf8'), c); const m = new Map(); for (const r of c.T.rows) m.set(r[0] + ':' + r[1], { count: +r[2], rate: +r[3] }); return m; })();

const out = { avatars: {}, profiles: {}, portraits: {} };
for (const av of AVATARS) {
  let entry = list.get(av.gfx), shadowId = 0;
  if (av.layout) {
    entry = { actions: {} }; shadowId = av.gfx + 1; // 12491／12495: shadow files with the same 288-file layout
    for (const [id, g] of Object.entries(WARRIOR[av.gfx])) {
      const s = spr(av.gfx + '-' + g + '.spr'); if (!s) continue;
      const n = s.frames.length, server = sprAction.get(av.gfx + ':' + id), total = server ? server.count : n * 4;
      entry.actions[id] = { name: ACTION_NAMES[id] || 'action ' + id, dirs: 1, frames: Array.from({ length: n }, (_, i) => ({ group: g, frame: i, dur: Math.floor(total / n) + (i < total % n ? 1 : 0) })) };
    }
  } else {
    if (!entry) throw Error('list.spr 沒有 ' + av.gfx);
    shadowId = +(entry.raw.match(/101\.shadow\((\d+)\)/) || [])[1] || 0;
  }
  // clip -> list.spr action id
  const clips = {};
  for (const [key, base] of Object.entries(av.weapons)) { clips[key + '_walk'] = base; clips[key + '_attack'] = base + 1; clips[key + '_hurt'] = base + 2; clips[key + '_idle'] = base + 3; }
  clips.death = 8; clips.skill = entry.actions[18] ? 18 : 19;
  // Render everything first to size the canvas.
  const rendered = {}; let missing = 0;
  for (const [clip, id] of Object.entries(clips)) {
    const a = entry.actions[id]; if (!a) { delete clips[clip]; continue; }
    rendered[clip] = {};
    for (let d = 0; d < 8; d++) {
      rendered[clip][d] = a.frames.map(f => {
        const file = av.gfx + '-' + (f.group + (a.dirs ? d : 0)) + '.spr', s = spr(file), r = s && renderFrame(s, f.frame);
        if (!r) { missing++; return null; }
        const sh = shadowId ? spr(shadowId + '-' + (f.group + (a.dirs ? d : 0)) + '.spr') : null;
        return { r, s: sh && sh.frames[f.frame] ? renderFrame(sh, f.frame) : null, ticks: f.dur, group: f.group, frame: f.frame };
      });
    }
  }
  if (missing) console.log(av.name, '缺', missing, '格');
  const idle = Object.values(rendered.unarmed_idle).flat().filter(Boolean).map(f => f.r);
  const med = a => a.sort((x, y) => x - y)[a.length >> 1];
  const ax = Math.round(med(idle.map(r => r.x + r.w / 2))), foot = med(idle.map(r => r.y + r.h));
  let half = 0, top = Infinity, bottom = -Infinity;
  for (const c of Object.values(rendered)) for (const fr of Object.values(c)) for (const f of fr) if (f) for (const r of [f.r, f.s].filter(Boolean)) { half = Math.max(half, ax - r.x, r.x + r.w - ax); top = Math.min(top, r.y); bottom = Math.max(bottom, r.y + r.h); }
  half += 2; const W = half * 2, H = bottom - top + 2, ox = half - ax, oy = 1 - top;
  const dir = path.join(ROOT, 'assets/character-actions', av.name); fs.rmSync(dir, { recursive: true, force: true });
  const directions = {}, shadows = {}, extraFrames = {}, timelines = {};
  const draw = r => { const px = Buffer.alloc(W * H * 4); for (let y = 0; y < r.h; y++) r.px.copy(px, ((y + r.y + oy) * W + r.x + ox) * 4, y * r.w * 4, (y + 1) * r.w * 4); return rgbaPng(W, H, px); };
  for (let d = 0; d < 8; d++) {
    const D = DIRS[d]; fs.mkdirSync(path.join(dir, D), { recursive: true }); directions[D] = {}; shadows[D] = {}; extraFrames[D] = {};
    for (const [clip, frames] of Object.entries(rendered)) {
      const list2 = frames[d].filter(Boolean); directions[D][clip] = list2.length; shadows[D][clip] = 0;
      list2.forEach((f, i) => { fs.writeFileSync(path.join(dir, D, clip + '_' + i + '.png'), draw(f.r)); });
      // shadows only when every frame has one (the renderer indexes them by the same frame number)
      if (list2.length && list2.every(f => f.s)) { list2.forEach((f, i) => fs.writeFileSync(path.join(dir, D, clip + '_s_' + i + '.png'), draw(f.s))); shadows[D][clip] = list2.length; }
    }
  }
  for (const [clip, id] of Object.entries(clips)) {
    const a = entry.actions[id], ticks = a.frames.reduce((n, f) => n + f.dur, 0), server = sprAction.get(av.gfx + ':' + id);
    timelines[clip] = { frameMapping: 'source', rawFrames: a.frames.map(f => ({ group: f.group, frame: f.frame, ticks: f.dur })), actionId: id, sourceName: a.name,
      frames: a.frames.map((f, i) => ({ clip, frame: i, ticks: f.dur })), sourceTicks: ticks, serverTicks: server ? server.count : null, frameRate: 24, durationMs: (server ? server.count : ticks) * TICK_MS };
  }
  out.avatars[av.name] = { role: av.role, gender: av.gender, spriteId: av.gfx, size: [W, H], footY: foot - top + 1, directions, shadows, timelines, weapons: Object.keys(av.weapons), extraFrames };
  // Walk speed profile (same shape as SPRITE_MOVEMENT).
  const actions = {};
  for (const base of Object.values(av.weapons)) { const a = entry.actions[base]; if (!a) continue; const server = sprAction.get(av.gfx + ':' + base), ticks = a.frames.reduce((n, f) => n + f.dur, 0);
    actions[base] = { name: a.name, frames: a.frames.map(f => ({ imageGroup: f.group, imageFrame: f.frame, ticks: f.dur })), sourceTicks: ticks, serverTicks: server ? server.count : ticks, frameRate: 24, stepMs: (server ? server.count : ticks) * TICK_MS }; }
  out.profiles[av.role + ':' + av.gender] = { role: av.role, gender: av.gender, spriteId: av.gfx, actions };
  // Portrait: south-facing idle, scaled ×4 on a transparent canvas.
  const p = rendered.unarmed_idle[5][0].r, S = 4, pw = p.w * S, ph = p.h * S, px = Buffer.alloc(pw * ph * 4);
  for (let y = 0; y < ph; y++) for (let x = 0; x < pw; x++) p.px.copy(px, (y * pw + x) * 4, ((y / S | 0) * p.w + (x / S | 0)) * 4, ((y / S | 0) * p.w + (x / S | 0)) * 4 + 4);
  const pf = 'class-' + av.gfx + '.png'; fs.writeFileSync(path.join(ROOT, 'assets/entry', pf), rgbaPng(pw, ph, px)); out.portraits[av.name] = pf;
  console.log(av.name, av.gfx, '畫布', W + 'x' + H, 'footY', out.avatars[av.name].footY, '動作', Object.keys(clips).length, '影子', shadowId || '無');
}
fs.writeFileSync(path.join(ROOT, 'data/extra-class-data.js'),
  '// Generated by tools/class-sprites/build.js: 龍騎士／幻術師／戰士 action frames (client .spr + list.spr) and walk profiles.\n' +
  'Object.assign(CHARACTER_ACTION_ASSETS.weapons,' + JSON.stringify(NEW_WEAPONS) + ');\n' +
  'Object.assign(CHARACTER_ACTION_ASSETS.avatars,' + JSON.stringify(out.avatars) + ');\n' +
  'Object.assign(SPRITE_MOVEMENT.profiles,' + JSON.stringify(out.profiles) + ');\n' +
  'Object.assign(window.CHARACTER_ASSETS.jobs,' + JSON.stringify(Object.fromEntries([...new Set(AVATARS.map(a => a.role))].map(r => [r, [0, 1].map(g => AVATARS.find(a => a.role === r && a.gender === g).name)]))) + ');\n' +
  'window.EXTRA_CLASS_PORTRAITS=' + JSON.stringify(out.portraits) + ';\n');
