// Parse the client's list.spr (Text.pak): "#gfx count name  id.name(dirs frames,G.F:D…) …".
// G = sprite file group (file = <gfx>-<G+heading>.spr when dirs = 1), F = frame in that file, D = duration in 1/24 s.
// Markers after a frame ([sound, <sound, ]effect, ! hit, > step) are ignored here except '!' (hit frame).
function parseList(text) {
  const out = new Map();
  for (const chunk of text.split(/\r?\n(?=#\d)/)) {
    const m = chunk.match(/^#(\d+)\s+(\d+)\s+(.*)$/s); if (!m) continue;
    const gfx = +m[1], body = m[3].replace(/\r?\n/g, ' '), actions = {};
    let name = body.match(/^\s*([^\d(][^(]*?)\s+\d+\./)?.[1] || body.split(/\s{2,}/)[0];
    for (const a of body.matchAll(/(\d+)\.([^()\d][^()]*?)\((\d+)\s+(\d+),([^)]*)\)/g)) {
      const frames = [];
      for (const f of a[5].trim().split(/\s+/)) { const fm = f.match(/^(\d+)\.(\d+):(\d+)/); if (fm) frames.push({ group: +fm[1], frame: +fm[2], dur: +fm[3], hit: f.includes('!') }); }
      actions[+a[1]] = { name: a[2].trim(), dirs: +a[3], frames };
    }
    const ref = body.match(/(\d+)\.\w[^(]*\((\d+)\)/g);
    out.set(gfx, { gfx, sprites: +m[2], name: (name || '').trim(), actions, raw: body.slice(0, 400) });
  }
  return out;
}
module.exports = { parseList };
