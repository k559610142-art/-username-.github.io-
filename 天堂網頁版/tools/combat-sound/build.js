// Monster combat sounds: data/combat-sound-data.js only had markers for a few looks, so most monsters fell back to the
// generic 701 hit sound (e.g. 毒蠍 1047 damage "[216", 妖魔殭屍 1121 "[417" were missing).
// This adds every monster look (data/island-monster-data.js + dungeon-monster-data.js) that has no entry yet, reading the
// "[id" sound markers of list.spr actions (attack 1, damage 2, death 8, cast 18/19, special 30) and copying the WAVs
// from the client Sound folder into assets/combat-sound. Existing entries are kept as they are.
// Phase = start time of the marked frame / action length (same as the existing data, e.g. gfx 0 attack 9/20 = 0.45).
// Usage: node tools/combat-sound/build.js [--client DIR]
const fs = require('fs'), path = require('path'), vm = require('vm');
const ROOT = path.resolve(__dirname, '../..');
const { openPak } = require('../client-pak/l1pak.js');
const args = process.argv.slice(2), opt = { client: 'C:/Users/User/Desktop/天地劫天堂' };
for (let i = 0; i < args.length; i++) if (args[i] === '--client') opt.client = args[++i];

const g = {}; vm.createContext(g);
for (const f of ['island-monster-data.js', 'dungeon-monster-data.js', 'combat-sound-data.js'])
  vm.runInContext(fs.readFileSync(path.join(ROOT, 'data', f), 'utf8').replace(/^const (\w+)\s*=/gm, 'var $1=').replace(/^for\(.*$/gm, ''), g);
const data = g.combatSoundData;

const text = openPak(path.join(opt.client, 'Text.idx')), raw = text.read(text.records.find(r => r.name === 'list.spr')).toString('latin1');
const entries = new Map();
for (const chunk of raw.split(/\r?\n(?=#\d)/)) { const m = chunk.match(/^#(\d+)\s+\d+(?:=\d+)?\s+(.*)$/s); if (m) entries.set(+m[1], m[2].replace(/\r?\n/g, ' ')); }
const ACTIONS = new Set([1, 2, 8, 18, 19, 30]);
function markers(body) {
  const out = {};
  for (const a of body.matchAll(/(\d+)\.[^()\d][^()]*?\(\d+\s+\d+,([^)]*)\)/g)) {
    if (!ACTIONS.has(+a[1])) continue;
    const frames = a[2].trim().split(/\s+/).map(f => ({ dur: +(f.match(/^\d+\.\d+:(\d+)/)?.[1] || 0), sounds: [...f.matchAll(/\[(\d+)/g)].map(s => +s[1]) }));
    const total = frames.reduce((s, f) => s + f.dur, 0); let t = 0; const ev = [];
    for (const f of frames) { if (f.sounds.length) ev.push([total ? t / total : 0, f.sounds]); t += f.dur; }
    if (ev.length) out[a[1]] = ev;
  }
  return out;
}

const looks = new Set(Object.values(g.islandMonsterTemplates).map(t => t.gfx));
const soundDir = path.join(opt.client, 'Sound'), outDir = path.join(ROOT, 'assets/combat-sound');
const have = new Set(fs.readdirSync(outDir).map(f => +f.replace(/\.wav$/i, '')));
let added = 0, copied = 0, bytes = 0; const missing = new Set();
for (const gfx of [...looks].sort((a, b) => a - b)) {
  if (data[gfx] || !entries.has(gfx)) continue;
  const m = markers(entries.get(gfx));
  for (const ev of Object.values(m)) for (const e of ev) e[1] = e[1].filter(id => {
    if (have.has(id)) return true;
    const src = path.join(soundDir, id + '.wav'); if (!fs.existsSync(src)) { missing.add(id); return false; }
    fs.copyFileSync(src, path.join(outDir, id + '.wav')); have.add(id); copied++; bytes += fs.statSync(src).size; return true;
  });
  for (const [k, ev] of Object.entries(m)) { const kept = ev.filter(e => e[1].length); if (kept.length) m[k] = kept; else delete m[k]; }
  if (Object.keys(m).length) { data[gfx] = m; added++; }
}
const file = path.join(ROOT, 'data/combat-sound-data.js'), head = fs.readFileSync(file, 'utf8').split('\n')[0];
fs.writeFileSync(file, head + '\nconst combatSoundData = ' + JSON.stringify(data) + ';\n');
console.log('新增外觀', added, '複製 WAV', copied, (bytes / 1e6).toFixed(1) + ' MB', '客戶端沒有的音效', [...missing].join(',') || '無');
