// NPC clothes: town NPC looks in the client are bare bodies; list.spr "105.clothes(n id…)" names the hair / shirt / pants /
// shoes (and glow) sprites drawn over the body with the same action, direction file and frame index.
// This re-cuts every NPC look that has clothes (spawns with resident:true or a non-L1Monster template) with the layers
// composited in list order, keeping the feet where the existing frames put them.
// Output: assets/native-monsters/npc-dressed-<gfx>-<n>.png, data/npc-clothes-data.js (overrides islandMonsterFrames).
// Usage: node tools/npc-clothes/build.js [--client DIR] [--preview OUT.png]
const fs = require('fs'), path = require('path'), vm = require('vm');
const ROOT = path.resolve(__dirname, '../..');
const { openPak } = require('../client-pak/l1pak.js');
const { rgbaPng } = require('../client-pak/img2png.js');
const { parseSpr, renderFrame } = require('../native-monsters/spr.js');
const { parseList } = require('../native-monsters/listspr.js');

const args = process.argv.slice(2), opt = { client: 'C:/Users/User/Desktop/天地劫天堂', preview: '', monsters: false };
for (let i = 0; i < args.length; i++) { if (args[i] === '--client') opt.client = args[++i]; else if (args[i] === '--preview') opt.preview = args[++i]; else if(args[i] === '--monsters') opt.monsters=true; else if(args[i] === '--deaths') opt.deaths=true; }

const game = {}; vm.createContext(game);
for (const f of ['island-monster-data.js', 'dungeon-monster-data.js'])
  vm.runInContext(fs.readFileSync(path.join(ROOT, 'data', f), 'utf8').replace(/^const (\w+)\s*=/gm, 'var $1=').replace(/^for\(.*$/gm, ''), game);
const templates = game.islandMonsterTemplates;
const oldFrames = gfx => game.islandMonsterFrames[gfx] || game.dungeonMonsterFrames[gfx];

const paks = ['Sprite.idx', ...Array.from({ length: 16 }, (_, i) => 'Sprite' + String(i).padStart(2, '0') + '.idx')].map(f => openPak(path.join(opt.client, f)));
const sprIndex = new Map(); for (const p of paks) for (const r of p.records) if (/\.spr$/i.test(r.name)) sprIndex.set(r.name.toLowerCase(), [p, r]);
const sprCache = new Map();
const spr = name => { if (!sprCache.has(name)) { const e = sprIndex.get(name); sprCache.set(name, e ? parseSpr(e[0].read(e[1])) : null); } return sprCache.get(name); };
const text = openPak(path.join(opt.client, 'Text.idx')), list = parseList(text.read(text.records.find(r => r.name === 'list.spr')).toString('latin1'));
// 104.attr / 104.type: 8 = screen (glow, black = clear), 128 = multiply (darkening; cannot be baked into a sprite, skipped).
const layerMode = id => +((list.get(id)?.raw || '').match(/104\.(?:attr|type)\((\d+)\)/)?.[1] || 0);
const screenLayer = id => layerMode(id) === 8;

// NPC looks with clothes.
const looks = new Map();
const addLook = (npc, resident) => { if (npc && (opt.deaths ? npc.kind === 'L1Monster' && !!oldFrames(npc.gfx) && !!list.get(npc.gfx)?.actions[8] : (opt.monsters ? npc.kind === 'L1Monster' && !!oldFrames(npc.gfx) : resident || npc.kind !== 'L1Monster') && list.get(npc.gfx)?.clothes.length)) looks.set(npc.gfx, (looks.get(npc.gfx) || new Set()).add(npc.name)); };
for (const s of game.islandMonsterSpawns) addLook(s.npc, s.resident);
for (const s of game.dungeonMonsterSpawns) addLook(templates[s.npcId], s.resident);

const KEYS = opt.deaths ? {death:[8]} : { idle: [3, 0], walk: [0], attack: [1], cast: [18, 19], special: [30] };
const ms = d => Math.round(d * 1000 / 24 * 10) / 10;
function clipsFor(gfx) {
  const e = list.get(gfx), out = {};
  for (let dir = 0; dir < 8; dir++) for (const [key, ids] of Object.entries(KEYS)) {
    const id = ids.find(i => e.actions[i]?.frames.length); if (id === undefined) continue;
    const a = e.actions[id], frames = [];
    for (const f of a.frames) { const g = f.group + (a.dirs ? dir : 0), file = e.src + '-' + g + '.spr', s = spr(file); if (!s || !s.frames[f.frame]) { frames.length = 0; break; } frames.push({ g, frame: f.frame, dur: ms(f.dur) }); }
    if (frames.length) out['d' + dir + '/' + key] = frames;
  }
  return out['d0/idle'] || out['d0/walk'] || out['d0/death'] ? out : null;
}

const c5 = v => Math.floor(v * 255 / 31);
// Body frame + every clothes layer's frame at the same group / index, composited around the shared anchor.
function dressed(gfx, g, frame) {
  const layers = [[list.get(gfx).src, false], ...list.get(gfx).clothes.filter(id => layerMode(id) !== 128).map(id => [list.get(id)?.src || id, screenLayer(id)])], parts = [];
  for (const [id, screen] of layers) { const s = spr(id + '-' + g + '.spr'); const r = s && s.frames[frame] && renderFrame(s, frame); if (r && r.w > 1) parts.push([r, screen]); }
  if(!parts.length)return {x:0,y:0,w:1,h:1,px:Buffer.alloc(4)};
  const x0 = Math.min(...parts.map(([r]) => r.x)), y0 = Math.min(...parts.map(([r]) => r.y));
  const w = Math.max(...parts.map(([r]) => r.x + r.w)) - x0, h = Math.max(...parts.map(([r]) => r.y + r.h)) - y0, px = Buffer.alloc(w * h * 4);
  for (const [r, screen] of parts) for (let y = 0; y < r.h; y++) for (let x = 0; x < r.w; x++) {
    const s = (y * r.w + x) * 4; if (!r.px[s + 3]) continue;
    let R = r.px[s], G = r.px[s + 1], B = r.px[s + 2], A = 255;
    if (screen) { const l = Math.max(R, G, B); if (!l) continue; A = l; R = R * 255 / l; G = G * 255 / l; B = B * 255 / l; } // glow: black = clear
    const d = ((r.y - y0 + y) * w + r.x - x0 + x) * 4, a = A / 255, da = px[d + 3] / 255, oa = a + da * (1 - a);
    px[d] = Math.round((R * a + px[d] * da * (1 - a)) / oa); px[d + 1] = Math.round((G * a + px[d + 1] * da * (1 - a)) / oa); px[d + 2] = Math.round((B * a + px[d + 2] * da * (1 - a)) / oa); px[d + 3] = Math.round(oa * 255);
  }
  return { x: x0, y: y0, w, h, px };
}

// Feet stay where the existing frames had them: shift = old idle first frame y − bare body y (median rule for new looks).
function yShift(gfx, clips) {
  if(opt.deaths){const entry=list.get(gfx),a=entry.actions[3]||entry.actions[0];if(a)for(const dir of [2,0]){const old=oldFrames(gfx)?.['d'+dir+'/idle'];if(!old)continue;const f=a.frames[0],body=spr(entry.src+'-'+(f.group+(a.dirs?dir:0))+'.spr'),r=body&&renderFrame(body,f.frame);if(r)return old[0][2]-r.y;}}

  const old = oldFrames(gfx);
  for (const key of ['d2/idle', 'd0/idle', 'd2/walk', 'd0/walk']) if (old?.[key] && clips[key]) { const f = clips[key][0], r = renderFrame(spr(list.get(gfx).src + '-' + f.g + '.spr'), f.frame); return old[key][0][2] - r.y; }
  const bottoms = []; for (const [key, l] of Object.entries(clips)) if (key.endsWith('/idle')) for (const f of l) { const r = renderFrame(spr(list.get(gfx).src + '-' + f.g + '.spr'), f.frame); bottoms.push(r.y + r.h); }
  bottoms.sort((a, b) => a - b); return -(bottoms[bottoms.length >> 1] || 0);
}

const SHEET = 2048, frames = {}, sheets = [], report = [];
let sheet, cx, cy, rowH;
function newSheet(gfx, n) { sheet = { name: (opt.deaths?'monster-death-':opt.monsters?'monster-layer-':'npc-dressed-') + gfx + '-' + n + '.png', px: Buffer.alloc(SHEET * SHEET * 4), h: 0 }; sheets.push(sheet); cx = cy = rowH = 0; }
for (const gfx of [...looks.keys()].sort((a, b) => a - b)) {
  const clips = clipsFor(gfx); if (!clips) { report.push(gfx + ' 無動作，略過'); continue; }
  let n = 0; newSheet(gfx, n++); const placed = new Map(), Y = yShift(gfx, clips); frames[gfx] = {};
  for (const [key, l] of Object.entries(clips)) frames[gfx][key] = l.map(f => {
    const id = f.g + '#' + f.frame; let p = placed.get(id);
    if (!p) {
      const r = dressed(gfx, f.g, f.frame);
      if (cx + r.w > SHEET) { cx = 0; cy += rowH + 1; rowH = 0; }
      if (cy + r.h > SHEET) newSheet(gfx, n++);
      for (let y = 0; y < r.h; y++) r.px.copy(sheet.px, ((cy + y) * SHEET + cx) * 4, y * r.w * 4, (y + 1) * r.w * 4);
      p = [sheet.name, r.x, r.y + Y, r.w, r.h, cx, cy]; placed.set(id, p);
      sheet.h = Math.max(sheet.h, cy + r.h); cx += r.w + 1; rowH = Math.max(rowH, r.h);
    }
    return [p[0], p[1], p[2], p[3], p[4], f.dur, p[5], p[6], SHEET];
  });
  // 原始 death 的第一張是靜態屍體姿勢；播放時移到末尾，避免先閃屍體再倒下。
  if(opt.deaths)for(const [key,l]of Object.entries(clips))if(l.length>1&&l[0].g===l.at(-1).g&&l[0].frame>l.at(-1).frame)frames[gfx][key].push(frames[gfx][key].shift());
  if(opt.deaths)for(const s of sheets)if(s.px){const h=Math.max(1,s.h);fs.writeFileSync(path.join(ROOT,'assets/native-monsters',s.name),rgbaPng(SHEET,h,s.px.subarray(0,SHEET*h*4)));s.px=null;}
  report.push(gfx + ' ' + [...looks.get(gfx)].slice(0, 4).join('、') + ' 圖層 ' + list.get(gfx).clothes.join(',') + (oldFrames(gfx) ? '' : '（新外觀）'));
}

const outDir = path.join(ROOT, 'assets/native-monsters');
for (const f of fs.readdirSync(outDir)) if (!opt.monsters && !opt.deaths && /^npc-dressed-/.test(f)) fs.unlinkSync(path.join(outDir, f));
for (const s of sheets) { if(!s.px)continue; const h = Math.max(1, s.h); fs.writeFileSync(path.join(outDir, s.name), rgbaPng(SHEET, h, s.px.subarray(0, SHEET * h * 4))); }
fs.writeFileSync(path.join(ROOT, opt.deaths?'data/monster-death-data.js':opt.monsters?'data/monster-layer-data.js':'data/npc-clothes-data.js'),
  '// Generated by tools/npc-clothes/build.js'+(opt.deaths?' --deaths':opt.monsters?' --monsters':'')+': native 105.clothes body layers and screen glow, aligned to original frames.\n' +
  'const '+(opt.deaths?'monsterDeathFrames':opt.monsters?'monsterLayerFrames':'npcClothesFrames')+'=' + JSON.stringify(frames) + ';\n' +
  'for(const f of ' + JSON.stringify(sheets.map(s => s.name)) + ')nativeMonsterFiles.add(f);\n' +
  (opt.deaths?'for(const [gfx,clips]of Object.entries(monsterDeathFrames))Object.assign(islandMonsterFrames[gfx]||={},clips);\n':'Object.assign(islandMonsterFrames,'+(opt.monsters?'monsterLayerFrames':'npcClothesFrames')+');\n'));
console.log(report.join('\n')); console.log('外觀', Object.keys(frames).length, '圖檔', sheets.length);

// --preview: first idle frame of every look, old (left) vs dressed (right), on a grey strip for eyeballing.
if (opt.preview) {
  const cells = Object.keys(frames).map(g => { const f = frames[g]['d4/idle']?.[0] || frames[g]['d0/idle']?.[0] || Object.values(frames[g])[0][0]; const s = sheets.find(s => s.name === f[0]); return { f, s }; });
  const CW = 140, CH = 160, cols = 10, W = CW * cols, H = CH * Math.ceil(cells.length / cols), out = Buffer.alloc(W * H * 4);
  for (let i = 0; i < out.length; i += 4) { out[i] = out[i + 1] = out[i + 2] = 96; out[i + 3] = 255; }
  cells.forEach(({ f, s }, i) => {
    const ox = (i % cols) * CW + CW / 2 + f[1], oy = Math.floor(i / cols) * CH + CH - 10 + f[2];
    for (let y = 0; y < f[4]; y++) for (let x = 0; x < f[3]; x++) { const q = ((f[7] + y) * SHEET + f[6] + x) * 4, a = s.px[q + 3] / 255; if (!a) continue; const X = ox + x, Yy = oy + y; if (X < 0 || Yy < 0 || X >= W || Yy >= H) continue; const d = (Yy * W + X) * 4; for (let c = 0; c < 3; c++) out[d + c] = Math.round(s.px[q + c] * a + out[d + c] * (1 - a)); }
  });
  fs.writeFileSync(opt.preview, rgbaPng(W, H, out));
}
