// Lineage .spr sprite decoder (client Sprite*.pak), checked against the existing monster frames (data/island-monster-data.js).
// Without the 0xFF palette header, pixels are RGB555 u16 instead of palette bytes.
// Layout: [0xFF, u8 palette size (0 = 256), palette RGB555…] (only when the first byte is 0xFF), u8 frame count,
// frames: 4 × int16 + 4 bytes + u16 n + n × (x int8, y int8, type u8, block u16),
// u32 block count, block offsets u32[], u32 data size, block data: (xo, yo, w, h) + h rows of [segments, (skip bytes, length, palette indices…)].
// A part sits on the 24×12 diamond grid: px = 24*(x - floor(x/2) + y), py = 12*(y - floor(x/2)) — same as the S32 floor cells.
function parseSpr(buf) {
  if (buf.toString('latin1', 0, 4) === 'SPR_') buf = buf.subarray(5); // newer files: "SPR_0" header, rest identical
  let o = 0;
  const u8 = () => buf[o++], i8 = () => { const v = buf.readInt8(o); o++; return v; }, i16 = () => { const v = buf.readInt16LE(o); o += 2; return v; }, u16 = () => { const v = buf.readUInt16LE(o); o += 2; return v; }, u32 = () => { const v = buf.readUInt32LE(o); o += 4; return v; };
  let palette = null;
  if (buf[0] === 0xff) { o = 1; const pn = u8() || 256; palette = []; for (let i = 0; i < pn; i++) palette.push(u16()); }
  const count = u8();
  const frames = [];
  for (let f = 0; f < count; f++) {
    const a = i16(), b = i16(), c = i16(), d = i16(); o += 4;
    const n = u16(), parts = [];
    for (let k = 0; k < n; k++) parts.push({ x: i8(), y: i8(), type: u8(), block: u16() });
    frames.push({ box: [a, b, c, d], parts });
  }
  const blocks = u32(), offs = []; for (let i = 0; i < blocks; i++) offs.push(u32());
  o += 4; const base = o;
  return { palette, frames, offs, base, buf };
}
const c5 = v => Math.floor(v * 255 / 31);
// Render one frame: returns {x, y, w, h, px} with (x, y) = top-left relative to the sprite anchor and RGBA pixels.
function renderFrame(spr, index) {
  const f = spr.frames[index]; if (!f) return null;
  const dots = []; let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  for (const p of f.parts) {
    const ox = 24 * (p.x - Math.floor(p.x / 2) + p.y), oy = 12 * (p.y - Math.floor(p.x / 2));
    let o = spr.base + spr.offs[p.block]; const b = spr.buf;
    const xo = b[o++], yo = b[o++]; o++; const h = b[o++];
    for (let row = 0; row < h; row++) {
      let x = xo; for (let s = 0, segs = b[o++]; s < segs; s++) {
        x += b[o++] / 2; const len = b[o++];
        for (let k = 0; k < len; k++) { const idx = spr.palette ? b[o++] : (o += 2, b.readUInt16LE(o - 2)), px = ox + x + k, py = oy + yo + row; dots.push(px, py, spr.palette ? spr.palette[idx] : idx, p.type);
          if (px < minX) minX = px; if (px > maxX) maxX = px; if (py < minY) minY = py; if (py > maxY) maxY = py; }
        x += len;
      }
    }
  }
  if (!dots.length) return { x: 0, y: 0, w: 1, h: 1, px: Buffer.alloc(4) };
  const w = maxX - minX + 1, h = maxY - minY + 1, px = Buffer.alloc(w * h * 4);
  for (let i = 0; i < dots.length; i += 4) { const q = ((dots[i + 1] - minY) * w + dots[i] - minX) * 4, v = dots[i + 2]; px[q] = c5(v >> 10 & 31); px[q + 1] = c5(v >> 5 & 31); px[q + 2] = c5(v & 31); px[q + 3] = 255; }
  return { x: minX, y: minY, w, h, px };
}
module.exports = { parseSpr, renderFrame };
