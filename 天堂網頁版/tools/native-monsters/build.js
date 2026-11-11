// Dungeon monsters: DB spawnlist rows for the converted maps (data/native-dungeon-maps.js) + sprite sheets for every
// monster look that data/island-monster-data.js does not have yet, cut from the client Sprite*.pak with list.spr timings.
// Output: assets/native-monsters/dungeon-mob-<gfx>-<n>.png, data/dungeon-monster-data.js.
// Usage: node tools/native-monsters/build.js [--client DIR] [--check]
//   --check only compares freshly cut frames with existing Map 0／4 frames (size / position) and exits.
const fs = require('fs'), path = require('path'), vm = require('vm');
const ROOT = path.resolve(__dirname, '../..');
const { openPak } = require('../client-pak/l1pak.js');
const { rgbaPng } = require('../client-pak/img2png.js');
const { parseSpr, renderFrame } = require('./spr.js');
const { parseList } = require('./listspr.js');

const args = process.argv.slice(2), opt = { client: 'C:/Users/User/Desktop/天地劫天堂', check: false };
for (let i = 0; i < args.length; i++) { if (args[i] === '--client') opt.client = args[++i]; else if (args[i] === '--check') opt.check = true; }

const game = {}; vm.createContext(game);
vm.runInContext(fs.readFileSync(path.join(ROOT, 'data/island-monster-data.js'), 'utf8').replace(/^const (\w+)\s*=/gm, 'var $1='), game);
vm.runInContext(fs.readFileSync(path.join(ROOT, 'data/native-dungeon-maps.js'), 'utf8').replace(/window\./g, 'this.'), game);
const templates = game.islandMonsterTemplates, existing = game.islandMonsterFrames, groups = game.islandMonsterGroups;
function table(file) { const c = { GameDatabase: { register: (n, cols, rows) => { c.T = { cols, rows }; } } }; vm.createContext(c); vm.runInContext(fs.readFileSync(path.join(ROOT, 'data/database', file), 'utf8'), c); return c.T.rows.map(r => Object.fromEntries(c.T.cols.map((col, i) => [col.name, r[i]]))); }

// Sprite files: name -> [pak, record]
const paks = ['Sprite.idx', ...Array.from({ length: 16 }, (_, i) => 'Sprite' + String(i).padStart(2, '0') + '.idx')].map(f => openPak(path.join(opt.client, f)));
const sprIndex = new Map(); for (const p of paks) for (const r of p.records) if (/\.spr$/i.test(r.name)) sprIndex.set(r.name.toLowerCase(), [p, r]);
const sprCache = new Map();
const spr = name => { if (!sprCache.has(name)) { const e = sprIndex.get(name); sprCache.set(name, e ? parseSpr(e[0].read(e[1])) : null); } return sprCache.get(name); };
const text = openPak(path.join(opt.client, 'Text.idx')), list = parseList(text.read(text.records.find(r => r.name === 'list.spr')).toString('latin1'));

const KEYS = { idle: [3, 0], walk: [0], attack: [1], cast: [18, 19], special: [30] };
// Existing frames put the anchor on the lowest pixel of all the look's frames (feet on the ground line).
function yShift(clips) { const mode = process.env.YMODE || 'median'; const bottoms = []; for (const [key, list] of Object.entries(clips)) { if (!key.endsWith('/idle') || mode === 'idle0' && key !== 'd0/idle') continue; for (const f of list) { const r = renderFrame(spr(f.file), f.frame); bottoms.push(r.y + r.h); } } bottoms.sort((x, y) => x - y); const v = mode === 'median' ? bottoms[bottoms.length >> 1] : mode === 'min' ? bottoms[0] : bottoms[bottoms.length - 1]; return -(v ?? 0); }
const ms = d => Math.round(d * 1000 / 24 * 10) / 10;
function clipsFor(gfx) {
  const e = list.get(gfx); if (!e) return null;
  const out = {};
  for (let dir = 0; dir < 8; dir++) for (const [key, ids] of Object.entries(KEYS)) {
    const id = ids.find(i => e.actions[i]?.frames.length); if (id === undefined) continue;
    const a = e.actions[id], frames = [];
    for (const f of a.frames) { const file = gfx + '-' + (f.group + (a.dirs ? dir : 0)) + '.spr'; const s = spr(file); if (!s || !s.frames[f.frame]) { frames.length = 0; break; } frames.push({ file, frame: f.frame, dur: ms(f.dur) }); }
    if (frames.length) out['d' + dir + '/' + key] = frames;
  }
  return out['d0/idle'] || out['d0/walk'] ? out : null;
}

if (opt.check) {
  let ok = 0, bad = 0; const ex = [];
  for (const g of Object.keys(existing)) {
    const clips = clipsFor(+g), old = existing[g]['d2/idle']; if (!clips || !old || !clips['d2/idle']) continue;
    const f = clips['d2/idle'][0], r = renderFrame(spr(f.file), f.frame), o = old[0], Y = yShift(clips);
    if (r.w === o[3] && r.h === o[4] && r.x === o[1] && Math.abs(r.y + Y - o[2]) <= 1 && f.dur === o[5]) ok++; else { bad++; if (ex.length < 10) ex.push([g, [r.x, r.y + Y, r.w, r.h, f.dur], o.slice(1, 6)]); }
  }
  console.log('與既有待機首幀相符', ok, '不符', bad); for (const e of ex) console.log(JSON.stringify(e)); process.exit(0);
}

// Spawns for the converted maps.
const maps = new Set(Object.keys(game.NATIVE_DUNGEON_MAPS).map(Number));
const spawns = table('table-141.js').filter(r => maps.has(+r.mapid) && templates[r.npc_templateid] && +r.count > 0).map(r => ({
  mapId: +r.mapid, spawnId: +r.id, zone: r.location, count: +r.count, npcId: +r.npc_templateid, group: +r.group_id || 0,
  point: [+r.locx, +r.locy], random: [+r.randomx, +r.randomy], bounds: [+r.locx1, +r.locy1, +r.locx2, +r.locy2], heading: +r.heading || 0,
  respawn: [+r.min_respawn_delay, +r.max_respawn_delay], movement: +r.movement_distance || 0,
}));
const looks = new Set(); for (const s of spawns) { looks.add(templates[s.npcId].gfx); for (const [id] of groups[s.group]?.members || []) if (templates[id]) looks.add(templates[id].gfx); }
const need = [...looks].filter(g => !existing[g]).sort((a, b) => a - b);

// Cut and pack.
const SHEET = 2048, frames = {}, files = [], missing = [];
let sheet = null, sheetNo = 0, cx = 0, cy = 0, rowH = 0;
const sheets = [];
function newSheet(gfx) { sheet = { name: 'dungeon-mob-' + gfx + '-' + sheetNo++ + '.png', px: Buffer.alloc(SHEET * SHEET * 4), h: 0 }; sheets.push(sheet); cx = cy = rowH = 0; }
for (const gfx of need) {
  const clips = clipsFor(gfx); if (!clips) { missing.push(gfx); continue; }
  sheetNo = 0; newSheet(gfx); const placed = new Map(), Y_SHIFT = yShift(clips); frames[gfx] = {};
  for (const [key, list] of Object.entries(clips)) frames[gfx][key] = list.map(f => {
    const id = f.file + '#' + f.frame; let p = placed.get(id);
    if (!p) {
      const r = renderFrame(spr(f.file), f.frame);
      if (cx + r.w > SHEET) { cx = 0; cy += rowH + 1; rowH = 0; }
      if (cy + r.h > SHEET) newSheet(gfx);
      for (let y = 0; y < r.h; y++) r.px.copy(sheet.px, ((cy + y) * SHEET + cx) * 4, y * r.w * 4, (y + 1) * r.w * 4);
      p = [sheet.name, r.x, r.y + Y_SHIFT, r.w, r.h, cx, cy]; placed.set(id, p);
      sheet.h = Math.max(sheet.h, cy + r.h); cx += r.w + 1; rowH = Math.max(rowH, r.h);
    }
    return [p[0], p[1], p[2], p[3], p[4], f.dur, p[5], p[6], SHEET];
  });
}
const outDir = path.join(ROOT, 'assets/native-monsters');
for (const f of fs.readdirSync(outDir)) if (/^dungeon-mob-/.test(f)) fs.unlinkSync(path.join(outDir, f));
for (const s of sheets) { const h = Math.max(1, s.h); fs.writeFileSync(path.join(outDir, s.name), rgbaPng(SHEET, h, s.px.subarray(0, SHEET * h * 4))); files.push(s.name); }
fs.writeFileSync(path.join(ROOT, 'data/dungeon-monster-data.js'),
  '// Generated by tools/native-monsters/build.js: DB spawnlist rows for converted dungeon maps and monster frames cut from the client .spr (list.spr timings).\n' +
  'const dungeonMonsterSpawns=' + JSON.stringify(spawns) + ';\n' +
  'const dungeonMonsterFrames=' + JSON.stringify(frames) + ';\n' +
  'for(const f of ' + JSON.stringify(files) + ')nativeMonsterFiles.add(f);\n' +
  'for(const [g,clips]of Object.entries(dungeonMonsterFrames))if(!islandMonsterFrames[g])islandMonsterFrames[g]=clips;\n' +
  'for(const s of dungeonMonsterSpawns)islandMonsterSpawns.push({...s,npc:islandMonsterTemplates[s.npcId]});\n');
console.log('生怪', spawns.length, '筆，怪物外觀', looks.size, '種（新切', Object.keys(frames).length, '種、沒有圖', missing.length, missing.join(' ') + '）圖檔', files.length);
