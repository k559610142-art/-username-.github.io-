// Parse the client's music.def (Text.pak): System Setting (Login=82; Prince=1 …) and blocks
//   LOC map [x1 y1 x2 y2] [\ map …]  (several LOC lines per block allowed; a line starting with "\" continues the previous one)
//   MUSIC n n … [\ n …]               (all numbers = the block's playlist)
// Returns { sys: {Login: 82, …}, zones: [{map, rect: [x1,y1,x2,y2] | null, tracks: [n…]}] } in file order.
function parseMusicDef(text) {
  const lines = text.split(/\r?\n/).map(l => l.replace(/;.*$/, '').replace(/\t/g, ' ').trimEnd());
  const joined = [];
  for (const l of lines) {
    if (/^\s*\\/.test(l) && joined.length) joined[joined.length - 1] += ' ' + l.trim();
    else joined.push(l);
  }
  const sys = {}; const sm = text.match(/System Setting Begin([\s\S]*?)SystemMenu/);
  if (sm) for (const m of sm[1].matchAll(/(\w+)\s*=\s*(\d+)/g)) sys[m[1]] = +m[2];
  const zones = []; let locs = [], tracks = null;
  const flush = () => { if (locs.length && tracks && tracks.length) for (const l of locs) zones.push({ ...l, tracks }); locs = []; tracks = null; };
  for (const l of joined) {
    const t = l.trim(); if (!t) { flush(); continue; }
    const m = t.match(/^(\w+)\s*(.*)$/); if (!m) continue;
    const key = m[1].toUpperCase();
    if (key === 'LOC') {
      if (tracks) flush();
      for (const part of m[2].split('\\')) {
        const n = part.trim().split(/\s+/).filter(Boolean).map(Number);
        if (!n.length || n.some(isNaN)) continue;
        locs.push({ map: n[0], rect: n.length >= 5 ? n.slice(1, 5) : null });
      }
    } else if (key === 'MUSIC') tracks = m[2].split(/[\s\\,]+/).filter(Boolean).map(Number).filter(n => !isNaN(n));
  }
  flush();
  return { sys, zones };
}
module.exports = { parseMusicDef };
