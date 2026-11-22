// 畫出某個外觀編號每一組 .spr 的所有影格（每組一列），用來人工辨認動作（list.spr 沒登錄的新外觀）。
// 用法：node tools/native-monsters/preview-groups.js <輸出資料夾> <gfx>[,<gfx>…] [--dir 5] [--client DIR]
// 輸出 <gfx>.png：第 n 列 = 第 n 組（檔名 <gfx>-<n*8+dir>.spr），每格寬高 = 該 gfx 最大影格。
const fs = require('fs'), path = require('path');
const { openPak } = require('../client-pak/l1pak.js');
const { rgbaPng } = require('../client-pak/img2png.js');
const { parseSpr, renderFrame } = require('./spr.js');
const args = process.argv.slice(2), opt = { client: 'C:/Users/User/Desktop/天地劫天堂', dir: 5 };
const [outDir, list] = args; for (let i = 2; i < args.length; i++) { if (args[i] === '--dir') opt.dir = +args[++i]; else if (args[i] === '--client') opt.client = args[++i]; }
const paks = ['Sprite.idx', ...Array.from({ length: 16 }, (_, i) => 'Sprite' + String(i).padStart(2, '0') + '.idx')].map(f => openPak(path.join(opt.client, f)));
const idx = new Map(); for (const p of paks) for (const r of p.records) if (/\.spr$/i.test(r.name)) idx.set(r.name.toLowerCase(), [p, r]);
fs.mkdirSync(outDir, { recursive: true });
for (const gfx of list.split(',').map(Number)) {
  const rows = [];
  for (let g = 0; ; g += 8) {
    const e = idx.get(gfx + '-' + (g + opt.dir) + '.spr') || idx.get(gfx + '-' + g + '.spr'); if (!e) break;
    const s = parseSpr(e[0].read(e[1])); rows.push(s.frames.map((_, i) => renderFrame(s, i)));
  }
  let cw = 1, ch = 1, maxN = 1; for (const r of rows) { maxN = Math.max(maxN, r.length); for (const f of r) { cw = Math.max(cw, f.w); ch = Math.max(ch, f.h); } }
  const W = maxN * (cw + 2), H = rows.length * (ch + 2), px = Buffer.alloc(W * H * 4);
  for (let i = 0; i < W * H; i++) { px[i * 4] = 40; px[i * 4 + 1] = 60; px[i * 4 + 2] = 40; px[i * 4 + 3] = 255; }
  rows.forEach((r, ry) => r.forEach((f, fx) => {
    const ox = fx * (cw + 2), oy = ry * (ch + 2);
    for (let y = 0; y < f.h; y++) for (let x = 0; x < f.w; x++) { const s = (y * f.w + x) * 4; if (f.px[s + 3] < 20) continue; const d = ((oy + y) * W + ox + x) * 4; f.px.copy(px, d, s, s + 4); }
  }));
  fs.writeFileSync(path.join(outDir, gfx + '.png'), rgbaPng(W, H, px));
  console.log(gfx, 'groups', rows.length, 'frames', rows.map(r => r.length).join('/'), 'cell', cw + 'x' + ch);
}
