// 全部37款素材通過打包後才執行；不動戰鬥模板／任務／存檔。
const fs=require('fs'),assert=require('assert/strict');
const specs=JSON.parse(fs.readFileSync('tools/monster-src/quest-boss-v1/specs.json','utf8'));
const audit=JSON.parse(fs.readFileSync('tools/monster-art-audit-20261102.json','utf8'));
const sprites={},names={};
for(const s of specs){
 const m=JSON.parse(fs.readFileSync('images/monsters/quest-v1/'+s.key+'.json','utf8'));assert.equal(m.cells.length,12);assert(fs.existsSync(m.sprite.src));
 const id=s.key==='valakas'?'valakas':'quest-'+s.key;sprites[id]=m.sprite;if(s.key!=='valakas')names[s.name]=id;
}
for(const q of audit.quests.filter(q=>q.name.endsWith('的試煉之影'))){const id='quest-shadow-'+q.cls;sprites[id]={actor:q.cls,size:48,shadow:true};names[q.name]=id;}
assert.equal(Object.keys(names).length,48);assert.equal(Object.keys(sprites).length,49);for(const q of audit.quests)assert(names[q.name]);
const read=p=>fs.readFileSync(p,'utf8').replace(/\r\n/g,'\n');
function once(s,a,b){assert.equal(s.split(a).length,2,'找不到唯一修改位置 '+a.slice(0,80));return s.replace(a,b);}
let art=read('data/scene-art.js');assert(!art.includes('const SCENE_QUEST_ART'));
art=once(art,'function sceneMonsterArt(m) {','const SCENE_QUEST_ART = '+JSON.stringify(names,null,4)+';\nconst SCENE_QUEST_SPRITES = '+JSON.stringify(sprites,null,4)+';\nObject.assign(SCENE_ART_MONSTERS, SCENE_QUEST_SPRITES);\nfunction sceneMonsterArt(m) {');
art=once(art,"    const name = (m.inst ? m.inst.name : m.name) || '', art = SCENE_TOWER_ART[name.replace(/\\s*[（(].*$/, '')];", "    const name = (m.inst ? m.inst.name : m.name) || '';\n    if ((m.mid === 'questBoss' || m.inst && m.inst.questBoss) && SCENE_QUEST_ART[name]) return SCENE_QUEST_ART[name];\n    const art = SCENE_TOWER_ART[name.replace(/\\s*[（(].*$/, '')];");
let ui=read('data/ui-scene.js');
ui=once(ui,'function monSpriteImg(mid) { return mid && MON_SPRITES[mid] ? spriteImage(MON_SPRITES[mid].src || `images/monsters/${mid}.png`) : null; }',`const MONSTER_ART_CACHE_LIMIT = 4;
let monsterArtCache = [];
function monSpriteSpec(mid, attack) {
    const ms = mid && MON_SPRITES[mid];
    if (!ms || !ms.actor) return ms;
    const actor = CLASSES[ms.actor].sprite, a = actor[attack === true ? 'attack' : 'walk'];
    const counts = s => ['down', 'right', 'up'].map(d => s.frames[d]);
    return { ...ms, src: a.src, cw: a.cellW, ch: a.cellH, body: actor.charH,
        n: [...counts(actor.walk), ...counts(actor.attack)], foot: actor.foot || [a.cellW / 2, a.cellH], actorRows: true };
}
function monSpriteImg(mid, attack) {
    const ms = monSpriteSpec(mid, attack);
    if (!ms) return null;
    if (ms.actor) { const actor = CLASSES[ms.actor].sprite; spriteImage(actor.walk.src); spriteImage(actor.attack.src); }
    if (ms.src && ms.src.startsWith('images/monsters/quest-v1/')) {
        monsterArtCache = monsterArtCache.filter(src => src !== ms.src);
        monsterArtCache.push(ms.src);
        while (monsterArtCache.length > MONSTER_ART_CACHE_LIMIT) delete spriteCache[monsterArtCache.shift()];
    }
    return spriteImage(ms.src || \`images/monsters/\${mid}.png\`);
}`);
ui=once(ui,"    if (zz && zz.mons) zz.mons.forEach(monSpriteImg);","    if (zz && zz.mons) zz.mons.forEach(monSpriteImg);\n    if (zz && zz.boss) monSpriteImg(zz.boss);");
ui=once(ui,"Object.keys(SCENE_ART_MONSTERS).forEach(monSpriteImg)","Object.keys(SCENE_ART_MONSTERS).filter(mid => mid.startsWith('art-')).forEach(monSpriteImg)");
ui=once(ui,'        best.mid = inst.id;','        best.mid = inst.id;\n        monSpriteImg(sceneMonsterArt(best));');
ui=once(ui,'const art = sceneMonsterArt(m), img = monSpriteImg(art);','const art = sceneMonsterArt(m), img = monSpriteImg(art, m.atk > 0);');
ui=once(ui,'const f = m.face || \'down\', ms = MON_SPRITES[art], row =','const f = m.face || \'down\', ms = monSpriteSpec(art, m.atk > 0), row =');
ui=once(ui,'const frameY = ms.cols ? Math.floor((row * 2 + fr) / ms.cols) * ms.ch : row * ms.ch;',`const frameY = ms.cols ? Math.floor((row * 2 + fr) / ms.cols) * ms.ch : (ms.actorRows ? row % 3 : row) * ms.ch;
            const drawX = ms.foot ? sx - ms.foot[0] * dw / ms.cw : sx - dw / 2;
            const drawY = (ms.foot ? sy + 13 - ms.foot[1] * dh / ms.ch : sy + 13 - dh) - bob;
            const box = ms.foot ? [drawX - 4, drawY - 4, drawX + dw + 4, drawY + dh + 2] : [sx - dw / 2 - 4, sy + 13 - dh - 4, sx + dw / 2 + 4, sy + 15];`);
ui=once(ui,'                hurtFx();\n                if (f === \'left\')',"                hurtFx();\n                if (ms.shadow) { ctx.globalAlpha *= 0.82; ctx.filter = 'brightness(0.55) sepia(1) saturate(3) hue-rotate(190deg)'; ctx.shadowColor = '#a58cff'; ctx.shadowBlur = 3; }\n                if (f === 'left')");
assert.equal(ui.split('sx - dw / 2, sy + 13 - dh - bob').length,3);ui=ui.replaceAll('sx - dw / 2, sy + 13 - dh - bob','drawX, drawY');
ui=once(ui,'            top = sy + 13 - dh - 4;','            top = ms.foot ? sy + 13 - (ms.size || (big ? 62 : 42)) - 4 : sy + 13 - dh - 4;');
ui=once(ui,'drawOccPatch(ctx, sx - dw / 2 - 4, sy + 13 - dh - 4, sx + dw / 2 + 4, sy + 15, m.ry, camX, camY)','drawOccPatch(ctx, ...box, m.ry, camX, camY)');
let raid=read('data/raid.js');raid=once(raid,'            const fx = ms.cols ?',`            const drawX = ms.foot ? bx - ms.foot[0] * dw / ms.cw : bx - dw / 2;
            const drawY = ms.foot ? by + 4 * S - ms.foot[1] * dh / ms.ch : by + 4 * S - dh;
            const fx = ms.cols ?`);assert.equal(raid.split('bx - dw / 2, by + 4 * S - dh').length,3);raid=raid.replaceAll('bx - dw / 2, by + 4 * S - dh','drawX, drawY');
raid=once(raid,'const dh = (ms.size || 62) * ms.ch / ms.body * S * 1.35, dw = ms.cw * dh / ms.ch;','const bodySize = ms.foot ? Math.min(ms.size || 62, 90) : ms.size || 62;\n            const dh = bodySize * ms.ch / ms.body * S * 1.35, dw = ms.cw * dh / ms.ch;');
let sw=read('sw.js');sw=once(sw,'            const assets = await caches.open(ASSETS);','            const assets = await caches.open(ASSETS);\n            await Promise.all('+JSON.stringify(specs.map(s=>'images/monsters/quest-v1/'+s.key+'.png'))+'.map(u => assets.add(u).catch(() => {})));');
// 先完成所有替換／素材檢查，再寫正式檔案。
assert(read('data/config.js').includes("20261102b"),'版本已被其他工作更新，請重新核對');
for(const[p,s]of [['data/scene-art.js',art],['data/ui-scene.js',ui],['data/raid.js',raid],['sw.js',sw]])fs.writeFileSync(p,s);
for(const p of ['index.html','data/config.js','tools/test-guild-integration.cjs','tools/test-remaining-morphs.cjs'])fs.writeFileSync(p,read(p).replaceAll('20261102b','20261102c'));
console.log('Integrated 37 original models +12 class shadows, 48 quest names, version20261102c; schema unchanged.');
