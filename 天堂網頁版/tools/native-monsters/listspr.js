// Parse the client's list.spr (Text.pak): "#gfx count name  id.name(dirs frames,G.F:D…) …".
// G = sprite file group (file = <gfx>-<G+heading>.spr when dirs = 1), F = frame in that file, D = duration in 1/24 s.
// Markers after a frame ([sound, <sound, ]effect, ! hit, > step) are ignored here except '!' (hit frame).
function parseList(text) {
  const out = new Map();
  for (const chunk of text.split(/\r?\n(?=#\d)/)) {
    const m = chunk.match(/^#(\d+)\s+(\d+)(?:=(\d+))?\s+(.*)$/s); if (!m) continue; // "32=877": 32 sprites read from 877-*.spr (src)
    const gfx = +m[1], body = m[4].replace(/\r?\n/g, ' '), actions = {};
    let name = body.match(/^\s*([^\d(][^(]*?)\s+\d+\./)?.[1] || body.split(/\s{2,}/)[0];
    for (const a of body.matchAll(/(\d+)\.([^()\d]*?)\((\d+)\s+(\d+),([^)]*)\)/g)) {
      const frames = [];
      for (const f of a[5].trim().split(/\s+/)) { const fm = f.match(/^(\d+)\.(\d+):(\d+)/); if (fm) frames.push({ group: +fm[1], frame: +fm[2], dur: +fm[3], hit: f.includes('!') }); }
      actions[+a[1]] = { name: a[2].trim(), dirs: +a[3], frames };
    }
    // 105.clothes(n id…): layers drawn over this body with the same action / frame layout (town NPCs are bare bodies + clothes).
    const cl = body.match(/105\.[^(]*\(([\d\s]+)\)/), clothes = cl ? cl[1].trim().split(/\s+/).slice(1).map(Number) : [];
    let shadow=+(body.match(/101\.[^(]*\((\d+)\)/)?.[1]||0),attr=+(body.match(/104\.[^(]*\((\d+)\)/)?.[1]||0),frameRate=+(body.match(/110\.[^(]*\((\d+)\)/)?.[1]||24);
    // Some named records mix parenthesized actions with bare numeric metadata.
    // Parse those fields even when the named actions above already succeeded.
    shadow=+(body.match(/(?:^|\s)101\s+(\d+)(?=\s|$)/)?.[1]||shadow);
    attr=+(body.match(/(?:^|\s)104\s+(\d+)(?=\s|$)/)?.[1]||attr);
    frameRate=+(body.match(/(?:^|\s)110\s+(\d+)(?=\s|$)/)?.[1]||frameRate);
    if(!cl){const numericClothes=body.match(/(?:^|\s)105\s+(\d+)((?:\s+\d+)+)/);if(numericClothes)clothes.push(...numericClothes[2].trim().split(/\s+/).slice(0,+numericClothes[1]).map(Number));}
    // The same client also contains compact numeric definitions (no action names or punctuation).
    if(!Object.keys(actions).length){
      const numeric=body.replace(/\d+\.[^()]*\([^)]*\)/g,' ').match(/(?:^|\s)(?:110\s+\d+\s+)?[0-9]+\s+[018]\s+\d+\s+[0-9]+\s+[0-9]+\s+[0-9]+[\s\S]*/)?.[0];
      const tokens=(numeric||'').trim().split(/\s+/);let p=0;
      while(p<tokens.length){const id=parseInt(tokens[p++],10);if(!Number.isFinite(id))break;
        if(id===105){const n=parseInt(tokens[p++],10);for(let i=0;i<n;i++)clothes.push(parseInt(tokens[p++],10));}
        else if(id>=100){const v=parseInt(tokens[p++],10);if(id===101)shadow=v;if(id===104)attr=v;if(id===110)frameRate=v;}
        else{const dirs=parseInt(tokens[p++],10),n=parseInt(tokens[p++],10);if(![0,1,8].includes(dirs)||!Number.isInteger(n)||n<0||n>1000)break;const frames=[];for(let i=0;i<n;i++){const group=parseInt(tokens[p++],10),frame=parseInt(tokens[p++],10),token=tokens[p++]||'',dur=parseInt(token,10);if(![group,frame,dur].every(Number.isFinite))break;frames.push({group,frame,dur,hit:token.includes('!')});}if(frames.length===n)actions[id]={name:'action '+id,dirs,frames};}
      }
    }
    out.set(gfx, { gfx, sprites: +m[2], name: (name || '').trim(), src: +(m[3] || m[1]), actions, clothes:[...new Set(clothes)], shadow, attr, frameRate, raw: body });
  }
  return out;
}
module.exports = { parseList };
