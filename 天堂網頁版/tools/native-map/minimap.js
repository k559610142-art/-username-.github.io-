// 地監／室內地圖的小地圖縮圖（使用者 2026-11-17：小地圖沒有場地縮圖）。
// 讀 assets/native-world/<id>/*.json 的地板、補塊與物件，用 atlas64 圖塊在 1/4 解析度合成，再縮成 1/16 存成
// assets/native-world/<id>/minimap.png，並把座標寫進 data/dungeon-minimaps.js（原點與原生像素尺寸）。
// 座標與 data/native-world.js 的 pixel() 相同：px=(a+b+x-floor(x/2)+y)*24、py=(b-a+width+y-floor(x/2))*12-12。
// Usage: node tools/native-map/minimap.js [mapId ...]（不給就全部）
const fs = require('fs'), path = require('path'), zlib = require('zlib');
const ROOT = path.resolve(__dirname, '../..'), NW = path.join(ROOT, 'assets/native-world');
const { rgbaPng } = require('../client-pak/img2png.js');
const manifest = JSON.parse(fs.readFileSync(path.join(NW, 'manifest-atlas64.json'), 'utf8'));
const PER = manifest.atlasTiles || 64, COLS = manifest.atlasColumns || 8, Q = 4, OUT = 4; // 合成 1/4，輸出再縮 1/4 → 1/16

function decPng(file) {
  const b = fs.readFileSync(file); let i = 8, w, h, ct, d = [];
  while (i < b.length) { const l = b.readUInt32BE(i), t = b.toString('latin1', i + 4, i + 8), c = b.subarray(i + 8, i + 8 + l); if (t === 'IHDR') { w = c.readUInt32BE(0); h = c.readUInt32BE(4); ct = c[9]; } if (t === 'IDAT') d.push(c); i += 12 + l; }
  const bpp = ct === 6 ? 4 : 3, raw = zlib.inflateSync(Buffer.concat(d)), st = w * bpp, px = Buffer.alloc(w * h * 4), prev = Buffer.alloc(st), cur = Buffer.alloc(st);
  for (let y = 0; y < h; y++) {
    const f = raw[y * (st + 1)], row = raw.subarray(y * (st + 1) + 1, (y + 1) * (st + 1));
    for (let x = 0; x < st; x++) { const a = x >= bpp ? cur[x - bpp] : 0, b2 = prev[x], c = x >= bpp ? prev[x - bpp] : 0; let v = row[x];
      if (f === 1) v += a; else if (f === 2) v += b2; else if (f === 3) v += (a + b2) >> 1; else if (f === 4) { const p = a + b2 - c, pa = Math.abs(p - a), pb = Math.abs(p - b2), pc = Math.abs(p - c); v += pa <= pb && pa <= pc ? a : pb <= pc ? b2 : c; } cur[x] = v & 255; }
    for (let x = 0; x < w; x++) { px[(y * w + x) * 4] = cur[x * bpp]; px[(y * w + x) * 4 + 1] = cur[x * bpp + 1]; px[(y * w + x) * 4 + 2] = cur[x * bpp + 2]; px[(y * w + x) * 4 + 3] = bpp === 4 ? cur[x * bpp + 3] : 255; }
    cur.copy(prev);
  }
  return { w, h, px };
}
const pages = new Map(), small = new Map(), S = 64 / Q;
function tile(t) { // 64×64 圖塊縮成 16×16（含透明）
  if (small.has(t)) return small.get(t);
  const p = Math.floor(t / PER), file = manifest.atlas[p]; let out = null;
  if (file) { if (!pages.has(p)) { try { pages.set(p, decPng(path.join(NW, file))); } catch { pages.set(p, null); } } const pg = pages.get(p);
    if (pg) { const i = t % PER, ox = (i % COLS) * 64, oy = Math.floor(i / COLS) * 64; out = new Float32Array(S * S * 4);
      for (let y = 0; y < S; y++) for (let x = 0; x < S; x++) { let r = 0, g = 0, b = 0, a = 0; for (let yy = 0; yy < Q; yy++) for (let xx = 0; xx < Q; xx++) { const k = ((oy + y * Q + yy) * pg.w + ox + x * Q + xx) * 4, al = pg.px[k + 3]; r += pg.px[k] * al; g += pg.px[k + 1] * al; b += pg.px[k + 2] * al; a += al; }
        const o = (y * S + x) * 4; if (a) { out[o] = r / a; out[o + 1] = g / a; out[o + 2] = b / a; } out[o + 3] = a / (Q * Q) / 255; } } }
  small.set(t, out); return out;
}
const index = {};
const dataFile = path.join(ROOT, 'data/dungeon-minimaps.js');
if (fs.existsSync(dataFile)) { const m = fs.readFileSync(dataFile, 'utf8').match(/DUNGEON_MINIMAPS=(\{.*\});/s); if (m) Object.assign(index, JSON.parse(m[1])); }
const ids = process.argv.slice(2).map(Number); const list = ids.length ? ids : Object.keys(manifest.maps).map(Number).filter(id => id !== 0 && id !== 4);
for (const id of list) {
  const m = manifest.maps[id]; if (!m) { console.log('skip', id); continue; }
  const pieces = []; let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  for (const [cx, cy, key] of m.chunks) {
    const f = path.join(NW, String(id), key + '.json'); if (!fs.existsSync(f)) continue; const c = JSON.parse(fs.readFileSync(f, 'utf8'));
    const a = c.x - m.startX, b = c.y - m.startY, ox = (a + b) * 24, oy = (b - a + m.width) * 12 - 12;
    const add = (x, y, t, layer) => { const px = ox + (x - Math.floor(x / 2) + y) * 24, py = oy + (y - Math.floor(x / 2)) * 12; pieces.push([px, py, t, layer]); minX = Math.min(minX, px); minY = Math.min(minY, py); maxX = Math.max(maxX, px + 64); maxY = Math.max(maxY, py + 64); };
    for (let i = 0; i < c.floor.length; i++) add(i % 128, Math.floor(i / 128), c.floor[i], -1);
    for (let i = 0; i < c.extra.length; i += 3) add(c.extra[i], c.extra[i + 1], c.extra[i + 2], -1);
    for (const [, p] of c.groups) for (let i = 0; i < p.length; i += 4) add(p[i], p[i + 1], p[i + 3], p[i + 2]);
  }
  if (!pieces.length) { console.log('empty', id); continue; }
  pieces.sort((p, q) => p[3] - q[3]);
  const W = Math.ceil((maxX - minX) / Q), H = Math.ceil((maxY - minY) / Q), buf = new Float32Array(W * H * 3);
  for (const [px, py, t] of pieces) { const s = tile(t); if (!s) continue; const bx = Math.round((px - minX) / Q), by = Math.round((py - minY) / Q);
    for (let y = 0; y < S; y++) { const Y = by + y; if (Y < 0 || Y >= H) continue; for (let x = 0; x < S; x++) { const X = bx + x; if (X < 0 || X >= W) continue; const o = (y * S + x) * 4, al = s[o + 3]; if (!al) continue; const d = (Y * W + X) * 3; buf[d] = s[o] * al + buf[d] * (1 - al); buf[d + 1] = s[o + 1] * al + buf[d + 1] * (1 - al); buf[d + 2] = s[o + 2] * al + buf[d + 2] * (1 - al); } } }
  const w = Math.ceil(W / OUT), h = Math.ceil(H / OUT), px = Buffer.alloc(w * h * 4);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) { let r = 0, g = 0, b = 0, n = 0; for (let yy = 0; yy < OUT; yy++) for (let xx = 0; xx < OUT; xx++) { const X = x * OUT + xx, Y = y * OUT + yy; if (X >= W || Y >= H) continue; const d = (Y * W + X) * 3; r += buf[d]; g += buf[d + 1]; b += buf[d + 2]; n++; } const o = (y * w + x) * 4; px[o] = r / n; px[o + 1] = g / n; px[o + 2] = b / n; px[o + 3] = 255; }
  fs.writeFileSync(path.join(NW, String(id), 'minimap.png'), rgbaPng(w, h, px));
  index[id] = [minX, minY, maxX - minX, maxY - minY];
  console.log(id, w + 'x' + h, 'pages', pages.size);
  if (pages.size > 400) pages.clear();
}
fs.writeFileSync(dataFile, '// Generated by tools/native-map/minimap.js: 地監小地圖縮圖 assets/native-world/<id>/minimap.png 的原生像素範圍 [左, 上, 寬, 高]。\nwindow.DUNGEON_MINIMAPS=' + JSON.stringify(index) + ';\n');
