// Convert original client maps (map/<id>/*.s32 + Tile.pak) into assets/native-world/<id>/ chunks,
// append the new TIL blocks to the atlas64 pages, and write data/native-dungeon-maps.js
// (map name, bounds, server passability from <core>/maps/<id>.txt, collision from S32 attributes, DB map rules).
// Formats were checked against the existing Map 0/4 conversion: all 624 S32 chunks and 6,011 sampled tiles match byte-for-byte.
// Usage: node tools/native-map/build.js [--client DIR] [--core DIR] 1 2 7 8 ...
const fs = require('fs'), path = require('path'), vm = require('vm'), crypto = require('crypto');
const ROOT = path.resolve(__dirname, '../..');
const { openPak } = require('../client-pak/l1pak.js');
const { rgbaPng } = require('../client-pak/img2png.js');
const { parseS32, decodeBlock } = require('./formats.js');

const args = process.argv.slice(2), opt = { client: 'C:/Users/User/Desktop/天地劫天堂', core: 'C:/Users/User/Desktop/天地劫天堂(核心)' }, ids = [];
for (let i = 0; i < args.length; i++) { if (args[i] === '--client') opt.client = args[++i]; else if (args[i] === '--core') opt.core = args[++i]; else ids.push(+args[i]); }
if (!ids.length) { console.log('usage: node tools/native-map/build.js [--client DIR] [--core DIR] <mapId...>'); process.exit(1); }
if (ids.some(id => id === 0 || id === 4)) throw Error('Map 0／4 已有專用資料，這個工具只轉其他地圖');

const NW = path.join(ROOT, 'assets/native-world'), MANIFEST = path.join(NW, 'manifest-atlas64.json'), DATA = path.join(ROOT, 'data/native-dungeon-maps.js');
const manifest = JSON.parse(fs.readFileSync(MANIFEST, 'utf8'));
const PER = manifest.atlasTiles || 64, COLS = manifest.atlasColumns || 8;

function table(file) {
  const c = { GameDatabase: { register: (n, cols, rows) => { c.T = { cols, rows }; } } }; vm.createContext(c);
  vm.runInContext(fs.readFileSync(path.join(ROOT, 'data/database', file), 'utf8'), c);
  return c.T.rows.map(r => Object.fromEntries(c.T.cols.map((col, i) => [col.name, r[i]])));
}
const mapids = new Map(table('table-078.js').map(r => [+r.mapid, r]));
const dungeon = table('table-054.js'), getback = table('table-072.js');

const chunkPos = name => { const hi = parseInt(name.slice(0, 4), 16), lo = parseInt(name.slice(4, 8), 16); return [32704 + (hi - 0x7fff) * 64, 32704 + (lo - 0x7fff) * 64]; };
const s32Files = id => { const dir = path.join(opt.client, 'map', String(id)); return fs.existsSync(dir) ? fs.readdirSync(dir).filter(f => /^[0-9a-f]{8}\.s32$/i.test(f)).sort() : []; };

// 1. Existing (til, block) -> atlas id, rebuilt from every converted S32 chunk.
const tileIds = new Map(); let pairs = 0;
const keyOf = (til, idx) => til * 256 + idx;
for (const [mid, m] of Object.entries(manifest.maps)) { // includes maps being rebuilt, so their tiles keep the same ids
  for (const [, , name] of m.chunks) {
    const file = path.join(NW, mid, name + '.json'); if (!fs.existsSync(file)) continue;
    const j = JSON.parse(fs.readFileSync(file, 'utf8')); if (!/\.s32$/i.test(j.source)) continue;
    const src = path.join(opt.client, 'map', mid, j.source); if (!fs.existsSync(src)) continue;
    const r = parseS32(fs.readFileSync(src));
    r.floor.forEach(([til, idx], i) => tileIds.set(keyOf(til, idx), j.floor[i]));
    r.extra.forEach(([, , til, idx], i) => tileIds.set(keyOf(til, idx), j.extra[i * 3 + 2]));
    r.groups.forEach(([, blocks], g) => blocks.forEach(([, , , til, idx], k) => tileIds.set(keyOf(til, idx), j.groups[g][1][k * 4 + 3])));
    pairs++;
  }
}
console.log('既有區塊對照', tileIds.size, '（來自', pairs, '個 S32）');

// 2. Convert maps.
const pak = openPak(path.join(opt.client, 'Tile.idx')), pakByName = new Map(pak.records.map(r => [r.name.toLowerCase(), r])), tilCache = new Map();
const til = n => { if (!tilCache.has(n)) { const r = pakByName.get(n + '.til'); tilCache.set(n, r ? pak.read(r) : null); } return tilCache.get(n); };
let nextId = manifest.atlas.length * PER; const newTiles = []; const blend = new Set(manifest.blendTiles || []);
function idFor(t, idx) {
  const k = keyOf(t, idx); if (tileIds.has(k)) return tileIds.get(k);
  const data = til(t), d = data && decodeBlock(data, idx);
  const id = nextId++; tileIds.set(k, id); newTiles.push([id, d ? d.px : Buffer.alloc(64 * 64 * 4)]);
  if (d && d.type & 0x20) blend.add(id);
  return id;
}
const rle = arr => { const out = []; for (let i = 0; i < arr.length;) { let j = i; while (j < arr.length && arr[j] === arr[i]) j++; out.push(arr[i], j - i); i = j; } return out; };
const old = fs.existsSync(DATA) ? (() => { const c = { window: {} }; vm.createContext(c); vm.runInContext(fs.readFileSync(DATA, 'utf8'), c); return c.window.NATIVE_DUNGEON_MAPS || {}; })() : {};
const out = { ...old };

const towns = { 1: 0 }; // L1TownLocation town id -> map (others are on Map 4, see teleport-map-rules.js)
for (const id of ids) {
  const info = mapids.get(id), files = s32Files(id);
  if (!info || !files.length) { console.log('略過 Map', id, info ? '（客戶端沒有 S32）' : '（DB 沒有 mapids）'); continue; }
  const startX = info.startX, startY = info.startY, width = info.endX - info.startX + 1, height = info.endY - info.startY + 1;
  const dir = path.join(NW, String(id)); fs.rmSync(dir, { recursive: true, force: true }); fs.mkdirSync(dir, { recursive: true });
  const collision = new Uint8Array(width * height), chunks = [];
  for (const f of files) {
    const name = f.slice(0, 8).toLowerCase(), [cx, cy] = chunkPos(name), buf = fs.readFileSync(path.join(opt.client, 'map', String(id), f));
    if (cx + 64 <= startX || cy + 64 <= startY || cx >= startX + width || cy >= startY + height) continue;
    const r = parseS32(buf);
    const j = {
      x: cx, y: cy,
      floor: r.floor.map(([t, i]) => idFor(t, i)),
      extra: r.extra.flatMap(([x, y, t, i]) => [x, y, idFor(t, i)]),
      groups: r.groups.map(([gid, blocks]) => [gid, blocks.flatMap(([x, y, l, t, i]) => [x, y, l, idFor(t, i)])]),
      events: r.events.flat(), attrs: r.attrs, source: f, sha256: crypto.createHash('sha256').update(buf).digest('hex'),
    };
    fs.writeFileSync(path.join(dir, name + '.json'), JSON.stringify(j));
    chunks.push([cx, cy, name]);
    for (let y = 0; y < 64; y++) for (let x = 0; x < 64; x++) {
      const gx = cx + x - startX, gy = cy + y - startY; if (gx < 0 || gy < 0 || gx >= width || gy >= height) continue;
      const a = r.attrs[y * 128 + x * 2], b = r.attrs[y * 128 + x * 2 + 1];
      collision[gy * width + gx] = 128 | (b & 1 ? 0 : 1) | (a & 1 ? 0 : 2);
    }
  }
  manifest.maps[id] = { startX, startY, width, height, chunks };
  // Server passability (same source as TALKING_ISLAND.tiles): rows are y, columns x.
  const terrain = new Uint8Array(width * height), txt = path.join(opt.core, 'maps', id + '.txt');
  if (fs.existsSync(txt)) fs.readFileSync(txt, 'utf8').trim().split(/\r?\n/).forEach((row, y) => row.split(',').forEach((v, x) => { if (x < width && y < height) terrain[y * width + x] = +v; }));
  else for (let i = 0; i < terrain.length; i++) terrain[i] = collision[i] ? 15 : 0;
  const open = (x, y) => { const t = terrain[(y - startY) * width + (x - startX)]; return t && !(t & 128); };
  const entry = dungeon.find(d => +d.new_mapid === id && open(+d.new_x, +d.new_y));
  let spawn = entry ? { x: +entry.new_x, y: +entry.new_y } : null;
  for (let i = 0; !spawn && i < terrain.length; i++) if (terrain[i] && !(terrain[i] & 128) && collision[i]) spawn = { x: startX + i % width, y: startY + Math.floor(i / width) };
  const gb = getback.find(g => +g.area_mapid === id);
  const home = gb ? (+gb.getback_mapid || gb.getback_x1 ? { mapId: +gb.getback_mapid, points: [[gb.getback_x1, gb.getback_y1], [gb.getback_x2, gb.getback_y2], [gb.getback_x3, gb.getback_y3]].filter(([x, y]) => x && y) } : { town: +gb.getback_townid, townElf: +gb.getback_townid_elf || 0 }) : null;
  out[id] = {
    id, name: String(info.locationname).replace(/^\[[^\]]*\]\s*/, '').trim(), startX, startY, width, height, spawn,
    rules: { teleportable: !!info.teleportable, escapable: !!info.escapable, markable: !!info.markable, usableItem: !!info.usable_item },
    home, terrain: rle(terrain), collision: rle(collision),
  };
  console.log('Map', id, out[id].name, width + 'x' + height, chunks.length, '塊');
}

// 3. Atlas pages for new tiles (fetch path only; file:// .png.js copies are not made for these maps).
const pages = new Map();
for (const [id, px] of newTiles) { const p = Math.floor(id / PER); if (!pages.has(p)) pages.set(p, Buffer.alloc(COLS * 64 * COLS * 64 * 4)); const page = pages.get(p), s = id % PER, ox = (s % COLS) * 64, oy = Math.floor(s / COLS) * 64;
  for (let y = 0; y < 64; y++) px.copy(page, ((oy + y) * COLS * 64 + ox) * 4, y * 64 * 4, (y + 1) * 64 * 4); }
for (const [p, buf] of pages) { const file = 'atlas64/p-' + p + '.png'; fs.writeFileSync(path.join(NW, file), rgbaPng(COLS * 64, COLS * 64, buf)); manifest.atlas[p] = file; }
manifest.tileBlocks = manifest.atlas.length * PER; manifest.blendTiles = [...blend].sort((a, b) => a - b);
fs.writeFileSync(MANIFEST, JSON.stringify(manifest));
fs.writeFileSync(MANIFEST + '.js', "window.__nativeWorldReceive('manifest-atlas64.json'," + JSON.stringify(manifest) + ');');
const sorted = Object.fromEntries(Object.entries(out).sort((a, b) => a[0] - b[0]));
fs.writeFileSync(DATA, '// Generated by tools/native-map/build.js: dungeon/indoor maps beyond Map 0／4 (bounds, server passability, S32 collision, DB rules). Runs are [value,count,...].\nwindow.NATIVE_DUNGEON_MAPS_VERSION=' + JSON.stringify(manifest.atlas.length + '-' + Object.keys(sorted).length) + ';\nwindow.NATIVE_DUNGEON_MAPS=' + JSON.stringify(sorted) + ';\n');
console.log('新增圖塊', newTiles.length, '新頁', pages.size, '目前頁數', manifest.atlas.length);
