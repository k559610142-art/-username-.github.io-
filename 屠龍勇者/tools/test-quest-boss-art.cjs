// 真實腳本／記憶體角色；不連線、不讀寫玩家存檔。
const fs=require('fs'),path=require('path'),vm=require('vm'),assert=require('assert/strict'),crypto=require('crypto');
const root=path.resolve(__dirname,'..'),source=path.join(__dirname,'monster-src/quest-boss-v1');
const specs=JSON.parse(fs.readFileSync(path.join(source,'specs.json'),'utf8')),before=JSON.parse(fs.readFileSync(path.join(source,'before.json'),'utf8'));
const prefix=fs.readFileSync(path.join(__dirname,'test-mercenary.js'),'utf8').split('ctx.assert = assert;')[0];
const ctx=new Function('require','__dirname',prefix+'\nreturn ctx;')(require,__dirname);Object.assign(ctx,{assert,before});
vm.runInContext(`
SIM_MODE=true;assert.equal(SAVE_SCHEMA,25);assert.equal(GAME_VERSION,'20261102d');
assert.equal(JSON.stringify({monsters:MONSTERS,quests:CLASS_QUESTS,classes:Object.fromEntries(Object.entries(CLASSES).map(([k,v])=>[k,v.sprite]))}),JSON.stringify(before),'戰鬥模板／任務與職業模型不可改動');
assert.equal(Object.keys(SCENE_QUEST_ART).length,48);assert.equal(Object.keys(SCENE_QUEST_SPRITES).length,49);assert.equal(Object.keys(SCENE_ART_MONSTERS).length,70);
let questCount=0;
for(const [cls,qs]of Object.entries(CLASS_QUESTS)){
 createPlayer('首領外型測試',cls,CLASSES[cls].base);player.lv=99;
 for(const [ch,q]of qs.entries())if(q.goal.type==='boss'){
  player.quests={ch,active:true,prog:q.goal.after,bossDone:false};const z=ZONE_BY_ID[q.goal.zone],m=questBossFor(z);assert(m&&m.questBoss);assert.equal(m.id,'questBoss');assert.equal(m.name,q.goal.boss.name);
  const id=sceneMonsterArt({mid:m.id,inst:m});assert.equal(id,SCENE_QUEST_ART[m.name]);assert(MON_SPRITES[id]);
  if(m.name.endsWith('的試煉之影')){assert.equal(MON_SPRITES[id].actor,cls);assert(MON_SPRITES[id].shadow);for(const atk of [false,true]){const s=monSpriteSpec(id,atk);assert.equal(s.src,CLASSES[cls].sprite[atk?'attack':'walk'].src);assert(s.actorRows);}}
  player.quests.prog--;assert.equal(questBossFor(z),null);player.quests.prog++;player.quests.bossDone=true;assert.equal(questBossFor(z),null);questCount++;
 }
}
assert.equal(questCount,48);assert.equal(sceneMonsterArt({mid:'valakas',inst:makeMonster('valakas')}),'valakas');
for(const name of [...TOWER_THEMES.flat(),...TOWER_BOSSES])assert(sceneMonsterArt({mid:'tower-audit',inst:{name,towerFloor:1}}).startsWith('art-'));
assert.equal(sceneMonsterArt({mid:'questBoss',inst:{name:'拳聖烈（全力）'}}),'quest-fist-saint');
monSpriteImg('goblin');const oldImg=spriteCache['images/monsters/goblin.png'];
for(const id of Object.keys(SCENE_QUEST_SPRITES).filter(id=>!SCENE_QUEST_SPRITES[id].actor)){monSpriteImg(id);assert(monsterArtCache.length<=4);}
assert.equal(monsterArtCache.length,4);assert.equal(Object.keys(spriteCache).filter(src=>src.startsWith('images/monsters/quest-v1/')).length,4);assert.equal(spriteCache['images/monsters/goblin.png'],oldImg);
monSpriteImg('valakas');const same=spriteCache[MON_SPRITES.valakas.src];monSpriteImg('valakas');assert.equal(spriteCache[MON_SPRITES.valakas.src],same);assert.equal(monsterArtCache.length,4);
const savedImage=spriteImage,seen=[];spriteImage=src=>{seen.push(src);return null;};createPlayer('預載測試','knight',CLASSES.knight.base);player.loc={type:'zone',id:'tower',floor:50};buildScene();
assert.equal(seen.filter(src=>src.startsWith('images/monsters/quest-v1/')).length,0,'塔不可大量預載任務首領');assert.equal(new Set(seen.filter(src=>src.startsWith('images/monsters/rework/'))).size,21);
seen.length=0;player.loc={type:'zone',id:'lairValakas'};buildScene();assert(seen.includes(MON_SPRITES.valakas.src),'龍穴預載火龍');spriteImage=savedImage;
console.log('PASS：48個正式任務首領產生／條件／名稱解析、12職業暗影完整動作、火龍／塔怪解析、數值不變；4套LRU與塔預載隔離。');
`,ctx);
(async()=>{
 const runtime=path.join(process.env.USERPROFILE,'.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules');
 const sharp=require(path.join(runtime,'sharp')),{createCanvas,loadImage}=require(path.join(runtime,'@napi-rs/canvas'));
 const images={},hashes=new Set(),sw=fs.readFileSync(path.join(root,'sw.js'),'utf8');let total=0;
 for(const s of specs){
  const m=JSON.parse(fs.readFileSync(path.join(root,'images/monsters/quest-v1',s.key+'.json'),'utf8')),sp=m.sprite,file=path.join(root,sp.src),meta=await sharp(file).metadata();
  assert.equal(meta.width,sp.cw*4);assert.equal(meta.height,sp.ch*3);assert(meta.hasAlpha);assert.equal(m.cells.length,12);assert(sw.includes(sp.src));images[sp.src]=await loadImage(file);
  assert.deepEqual(m.cells.map(c=>c.sourceIndex),[0,1,4,5,8,9,2,3,6,7,10,11]);
  for(const c of m.cells){
   const raw=await sharp(file).extract({left:c.slot%4*sp.cw,top:Math.floor(c.slot/4)*sp.ch,width:sp.cw,height:sp.ch}).ensureAlpha().raw().toBuffer(),single=await sharp(path.join(source,s.key,'frames',String(c.slot).padStart(2,'0')+'.png')).ensureAlpha().raw().toBuffer();assert(raw.equals(single));
   const hash=crypto.createHash('sha256').update(raw).digest('hex');assert.equal(hash,c.sha256);assert(!hashes.has(hash),'重複分鏡');hashes.add(hash);
   let clear=0,visible=0;for(let y=0;y<sp.ch;y++)for(let x=0;x<sp.cw;x++){const a=raw[(y*sp.cw+x)*4+3];if(a===0)clear++;if(a>32)visible++;if(x<2||y<2||x>=sp.cw-2||y>=sp.ch-2)assert.equal(a,0,'缺透明安全邊');}assert(clear>sp.cw*sp.ch*.35);assert(visible>1500);total++;
  }
  assert((await sharp(path.join(root,m.portrait)).metadata()).hasAlpha);
 }
 assert.equal(total,444);
 const classSprites=vm.runInContext('Object.values(CLASSES).map(c=>c.sprite)',ctx);
 for(const s of classSprites)for(const a of ['walk','attack']){const sp=s[a],file=path.join(root,sp.src);assert(fs.existsSync(file));images[sp.src]=await loadImage(file);assert(images[sp.src].width>=Math.max(...Object.values(sp.frames))*sp.cellW);assert(images[sp.src].height>=3*sp.cellH);}
 for(const id of ['goblin','antharas','fafurion','lindvior'])images['images/monsters/'+id+'.png']=await loadImage(path.join(root,'images/monsters',id+'.png'));
 const playerArt='images/sprites/morph/infernal-blade-sovereign-v1/walk.png';images[playerArt]=await loadImage(path.join(root,playerArt));ctx.artImages=images;
 vm.runInContext(`spriteImage=src=>artImages[src]||null;createPlayer('繪圖驗證','knight',CLASSES.knight.base);player.lv=99;addItem('shortSword');equipItem(player.inv.find(i=>i.id==='shortSword').uid,true);addItem('polyScroll');assert.equal(usePotion('polyScroll','m14'),'');player.loc={type:'zone',id:'lairValakas'};buildScene();scene.bg=null;scene.gates=null;scene.engaged=null;`,ctx);
 const subjects=vm.runInContext(`[{mid:'valakas',inst:makeMonster('valakas')},...Object.values(CLASS_QUESTS).flatMap(qs=>qs.filter(q=>q.goal.type==='boss').map(q=>({mid:'questBoss',inst:{...buildMonster('questBoss',q.goal.boss),questBoss:true}})))]`,ctx);
 let renders=0;
 for(const subject of subjects){
  ctx.subject=subject;const cv=createCanvas(1600,640),g=cv.getContext('2d');
  for(const[di,dir]of ['down','right','up','left'].entries())for(const[ai,attack]of [false,true].entries()){
   const tile=createCanvas(400,320);Object.assign(ctx,{paint:tile.getContext('2d'),direction:dir,attacking:attack});
   vm.runInContext(`{const v={down:[0,1],right:[1,0],up:[0,-1],left:[-1,0]}[direction];scene.pl.x=scene.pl.rx=20+v[0]*2;scene.pl.y=scene.pl.ry=9+v[1]*2;scene.pl.anim=null;scene.pl.path=[];gameNow=150;const m={x:20+(attacking?0:v[0]),y:9+(attacking?0:v[1]),rx:20,ry:9,mid:subject.mid,name:subject.inst.name,icon:subject.inst.icon,inst:attacking?subject.inst:null,atk:attacking?95:0,dead:false,dying:0};scene.mons=[m];sceneDraw(paint,400,320);}`,ctx);
   g.drawImage(tile,di*400,ai*320);renders++;
  }
  const key=vm.runInContext('sceneMonsterArt({mid:subject.mid,inst:subject.inst})',ctx);fs.writeFileSync(path.join(source,key+'-game-render.png'),cv.toBuffer('image/png'));
 }
 assert.equal(renders,392);
 // 新渲染器對既有怪物須逐像素相同；比較修改前的正式sceneDraw。
 ctx.beforeDraw=vm.runInContext('('+fs.readFileSync(path.join(source,'sceneDraw-before.txt'),'utf8')+')',ctx);
 for(const id of ['goblin','antharas','fafurion','lindvior']){
  ctx.oldId=id;vm.runInContext(`scene.pl.x=scene.pl.rx=20;scene.pl.y=scene.pl.ry=11;scene.mons=[{x:20,y:9,rx:20,ry:9,mid:oldId,name:MONSTERS[oldId].name,icon:MONSTERS[oldId].icon,inst:makeMonster(oldId),atk:95,dead:false,dying:0}];gameNow=150;`,ctx);
  const a=createCanvas(400,320),b=createCanvas(400,320);ctx.paint=a.getContext('2d');vm.runInContext('beforeDraw(paint,400,320)',ctx);ctx.paint=b.getContext('2d');vm.runInContext('sceneDraw(paint,400,320)',ctx);assert(a.data().equals(b.data()),'舊怪物畫面改變 '+id);
 }
 // 正式團隊重播繪圖：火龍須使用新圖集，舊三龍保持逐像素相同。
 ctx.beforeRaidDraw=vm.runInContext('('+fs.readFileSync(path.join(source,'raidSceneDraw-before.txt'),'utf8')+')',ctx);
 for(const id of ['antharas','fafurion','lindvior','valakas']){
  ctx.raidBoss=id;vm.runInContext(`raidReplayPos=()=>500;raidReplay={key:'art-'+raidBoss,res:{boss:makeMonster(raidBoss),members:[],frames:[[0,1],[1000,1]],marks:[],duration:10000,win:true}};raidSceneSt=null;`,ctx);
  const a=createCanvas(560,340),b=createCanvas(560,340);ctx.paint=a.getContext('2d');vm.runInContext('beforeRaidDraw(paint,560,340)',ctx);vm.runInContext('raidSceneSt=null',ctx);
  const g=b.getContext('2d'),drawImage=g.drawImage.bind(g),calls=[];g.drawImage=(...args)=>{if(args[0]===images['images/monsters/quest-v1/valakas.png'])calls.push(args);return drawImage(...args);};ctx.paint=g;vm.runInContext('raidSceneDraw(paint,560,340)',ctx);
  if(id!=='valakas')assert(a.data().equals(b.data()),'舊龍重播畫面改變 '+id);else{
   assert.equal(calls.length,1);const[,sx,sy,sw,sh,dx,dy,dw,dh]=calls[0],raw=await sharp(path.join(root,'images/monsters/quest-v1/valakas.png')).extract({left:sx,top:sy,width:sw,height:sh}).ensureAlpha().raw().toBuffer();let l=sw,t=sh,r=0,bb=0;
   for(let y=0;y<sh;y++)for(let x=0;x<sw;x++)if(raw[(y*sw+x)*4+3]>32){l=Math.min(l,x);t=Math.min(t,y);r=Math.max(r,x);bb=Math.max(bb,y);}
   assert(dx+l*dw/sw>=0&&dx+r*dw/sw<=560&&dy+t*dh/sh>=0&&dy+bb*dh/sh<=340,'火龍重播外型不得被畫布裁邊');fs.writeFileSync(path.join(source,'valakas-raid-render.png'),b.toBuffer('image/png'));
  }
 }
 console.log('PASS：37RGBA圖集／444唯一格逐byte／透明安全邊／離線清單，49個出場設定392組正式繪圖；舊怪／舊三龍及團隊重播像素回歸。');
})().catch(e=>{console.error(e);process.exit(1);});
