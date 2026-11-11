// Lineage client map formats used by tools/native-map/build.js.
// S32: layer1 64x128 half-cells [u8 block, u16 til, u8], layer2 u16 count × [x,y,block,til(u16),u8],
//      layer3 8192 × u16 attributes (two per cell; bit 1 = blocked edge), layer4 i32 groups × (u16 id, u16 n, n × [x,y,layer,block,til(u16),u8]),
//      layer5 i32 events × [x,y,u16 group,u8 type], layer6 i32 til list, then client-only layers.
// TIL: i32 n, (n+1) × i32 offsets, blocks: u8 type; type&2 = RLE sprite (xo,yo,w,h, rows of [skip/2,count,pixels]), else 24px half-diamond (type&1 = left aligned).
//      Pixels are RGB555; 0 is transparent; channels expand with floor(v*255/31). type&0x20 = blended (drawn translucent at runtime).
function parseS32(buf) {
  let o = 0;
  const u8 = () => buf[o++], u16 = () => { const v = buf.readUInt16LE(o); o += 2; return v; }, i32 = () => { const v = buf.readInt32LE(o); o += 4; return v; };
  const floor = []; for (let i = 0; i < 8192; i++) { const idx = u8(), til = u16(); u8(); floor.push([til, idx]); }
  const extra = []; for (let i = 0, n = u16(); i < n; i++) { const x = u8(), y = u8(), idx = u8(), til = u16(); u8(); extra.push([x, y, til, idx]); }
  const attrs = []; for (let i = 0; i < 8192; i++) attrs.push(u16());
  const groups = []; for (let i = 0, n = i32(); i < n; i++) { const gid = u16(), bc = u16(), blocks = []; for (let k = 0; k < bc; k++) { const x = u8(), y = u8(), layer = u8(), idx = u8(), til = u16(); u8(); blocks.push([x, y, layer, til, idx]); } groups.push([gid, blocks]); }
  const events = []; for (let i = 0, n = i32(); i < n; i++) events.push([u8(), u8(), u16(), u8()]);
  return { floor, extra, attrs, groups, events };
}
const c5 = v => Math.floor(v * 255 / 31);
function decodeBlock(til, idx) {
  const n = til.readInt32LE(0); if (idx >= n) return null;
  let o = 4 + (n + 1) * 4 + til.readInt32LE(4 + idx * 4);
  const px = Buffer.alloc(64 * 64 * 4);
  const put = (x, y, v) => { if (!v || x < 0 || y < 0 || x >= 64 || y >= 64) return; const q = (y * 64 + x) * 4; px[q] = c5(v >> 10 & 31); px[q + 1] = c5(v >> 5 & 31); px[q + 2] = c5(v & 31); px[q + 3] = 255; };
  const type = til[o++];
  if (!(type & 2)) {
    for (let y = 0; y < 23; y++) { const w = y <= 11 ? (y + 1) * 2 : (23 - y) * 2, x0 = type & 1 ? 0 : 24 - w; for (let k = 0; k < w; k++, o += 2) put(x0 + k, y, til.readUInt16LE(o)); }
  } else {
    const xo = til[o++], yo = til[o++]; o++; const h = til[o++];
    for (let y = 0; y < h; y++) { let x = xo; for (let s = 0, segs = til[o++]; s < segs; s++) { x += til[o++] / 2; const cnt = til[o++]; for (let k = 0; k < cnt; k++, o += 2) put(x + k, y + yo, til.readUInt16LE(o)); x += cnt; } }
  }
  return { type, px };
}
// SEG (older map blocks, used where no .s32 exists): same layers with byte-sized tile references —
// floor 8192 × [u8 block, u8 til], u16 n × [x, y, block, til], 8192 × u8 attributes, i32 groups × (u16 id, u16 n, n × [x, y, layer, block, til]),
// i32 events × [x, y, u16 group, u8 type]. Checked against the 39 SEG chunks of the original Map 4 conversion.
function parseSeg(buf) {
  let o = 0;
  const u8 = () => buf[o++], u16 = () => { const v = buf.readUInt16LE(o); o += 2; return v; }, i32 = () => { const v = buf.readInt32LE(o); o += 4; return v; };
  const floor = []; for (let i = 0; i < 8192; i++) { const idx = u8(), til = u8(); floor.push([til, idx]); }
  const extra = []; for (let i = 0, n = u16(); i < n; i++) { const x = u8(), y = u8(), idx = u8(), til = u8(); extra.push([x, y, til, idx]); }
  const attrs = []; for (let i = 0; i < 8192; i++) attrs.push(u8());
  const groups = []; for (let i = 0, n = i32(); i < n; i++) { const gid = u16(), bc = u16(), blocks = []; for (let k = 0; k < bc; k++) { const x = u8(), y = u8(), layer = u8(), idx = u8(), til = u8(); blocks.push([x, y, layer, til, idx]); } groups.push([gid, blocks]); }
  const events = []; for (let i = 0, n = i32(); i < n; i++) events.push([u8(), u8(), u16(), u8()]);
  return { floor, extra, attrs, groups, events };
}
module.exports = { parseS32, parseSeg, decodeBlock };
