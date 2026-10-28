// 四款鐮刀變身：真實卷軸／能力／動畫與144格透明圖集，記憶體角色，不連外。
const fs=require('fs'),path=require('path'),vm=require('vm'),assert=require('assert/strict'),crypto=require('crypto');
const root=path.resolve(__dirname,'..'),specs=JSON.parse(fs.readFileSync(path.join(__dirname,'sprite-src/morph/scythe-forms-v1.json'),'utf8'));
const prefix=fs.readFileSync(path.join(__dirname,'test-mercenary.js'),'utf8').split('ctx.assert = assert;')[0];
const ctx=new Function('require','__dirname',prefix+'\nreturn ctx;')(require,__dirname);ctx.assert=assert;ctx.specs=specs;
vm.runInContext(`
SIM_MODE=true;assert.equal(MORPH_FORMS.length,36);assert.equal(SAVE_SCHEMA,20);assert.equal(ITEMS.polyScroll.sec,1800);assert.equal(ITEMS.polyScroll.price,10000);
assert.equal(MORPH_BY_ID.m11.sprite,'abyssDualDemon');assert.equal(MORPH_BY_ID.m20.sprite,'abyssGoatEnvoy');
const levels=[15,35,52,70],hits=[2,3,5,7],speeds=[.06,.1,.15,.2];
for(const [i,x]of specs.entries()){
 createPlayer('鐮刀變身測試','demon',CLASSES.demon.base);player.lv=levels[i]-1;addItem('reaperScythe');assert(equipItem(player.inv.find(it=>it.id==='reaperScythe').uid,true));player.loc={type:'zone',id:'island'};buildScene();
 addItem('polyScroll',4);const before=countItem('polyScroll');assert.match(usePotion('polyScroll',x.id),new RegExp(String(levels[i])));assert.equal(countItem('polyScroll'),before);
 player.lv=levels[i];assert.equal(usePotion('polyScroll',x.id),'');assert.equal(countItem('polyScroll'),before-1);assert.equal(playerSprite(),MORPHS[x.key]);assert.equal(player.settings.lastMorph,x.id);
 assert.equal(MORPH_BY_ID[x.id].group,'scythe');assert.equal(MORPH_BY_ID[x.id].lv,levels[i]);assert.equal(JSON.stringify(MORPH_BY_ID[x.id].fx),JSON.stringify({hit:hits[i],dmg:hits[i],spdMul:speeds[i]}));assert.equal(morphWeaponErr(MORPH_BY_ID[x.id]),'');
 const mon={x:scene.pl.x+1,y:scene.pl.y,rx:scene.pl.x+1,ry:scene.pl.y,mid:'skeleton',lastHp:100,inst:{hp:90,maxHp:100}};scene.mons=[mon];scene.engaged=mon;gameLog.length=0;
 for(const dir of ['down','right','up','left']){scene.pl.dir=dir;scene.pl.anim=null;mon.lastHp=100;mon.inst.hp=90;scene.lastPlayerHp=player.hp;sceneReadEvents();assert.equal(scene.pl.anim.name,'attack');assert.equal(scene.pl.anim.dur,560);scene.pl.anim.t=210;playAnim('hit');assert.equal(scene.pl.anim.name,'attack');assert.equal(scene.pl.anim.t,210);}
 scene.pl.anim=null;mon.lastHp=mon.inst.hp;gameLog.push({seq:999999,cls:'miss',msg:'你的攻擊沒有命中'});scene.lastSeq=0;sceneReadEvents();assert.equal(scene.pl.anim.name,'attack');
 gameLog.push({seq:1000000,cls:'magic',msg:'🔮 施放測試魔法'});sceneReadEvents();assert.equal(scene.pl.anim.name,'cast');assert.equal(scene.pl.anim.dur,440);
 scene.pl.anim=null;scene.lastPlayerHp=player.hp+1;sceneReadEvents();assert.equal(scene.pl.anim.name,'hit');assert.equal(scene.pl.anim.dur,300);
 player.buffs.morph.until=gameNow;assert.equal(playerMorph(),null);assert.equal(usePotion('polyScroll'),'');assert.equal(player.buffs.morph.form,x.id);assert.equal(countItem('polyScroll'),before-2);
}
console.log('PASS：四階門檻／不足不扣卷、36款／舊變身／schema、基礎加成、四向命中／MISS／施法／受傷、攻擊不中斷、到期及上次選擇。');
`,ctx);
(async()=>{
 const runtime=path.join(process.env.USERPROFILE,'.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules');
 const sharp=require(path.join(runtime,'sharp')),{createCanvas,loadImage}=require(path.join(runtime,'@napi-rs/canvas'));
 const allHashes=new Set(),images={};let total=0;
 for(const x of specs){const dir=path.join(root,'images/sprites/morph',x.dir),source=path.join(__dirname,'sprite-src/morph',x.dir),manifest=JSON.parse(fs.readFileSync(path.join(dir,'manifest.json'),'utf8'));assert.equal(manifest.form,x.id);assert.deepEqual(manifest.footAnchor,[192,270]);
  for(const[a,n]of[['walk',4],['attack',4],['cast',2],['hit',2]]){const spec=manifest.actions[a],file=path.join(root,spec.src),png=fs.readFileSync(file);assert.equal(png.readUInt32BE(16),384*n);assert.equal(png.readUInt32BE(20),960);assert.equal(png[25],6);assert(fs.readFileSync(path.join(root,'sw.js'),'utf8').includes(spec.src));images[spec.src]=await loadImage(file);assert.equal(spec.cells.length,n*3);
   for(const cell of spec.cells){const row=['down','right','up'].indexOf(cell.direction),raw=await sharp(file).extract({left:cell.frame*384,top:row*320,width:384,height:320}).ensureAlpha().raw().toBuffer(),frame=await sharp(path.join(source,'build',cell.file)).ensureAlpha().raw().toBuffer();assert(raw.equals(frame));const hash=crypto.createHash('sha256').update(raw).digest('hex');assert(!allHashes.has(hash),'重複影格 '+x.name+' '+a+' '+cell.direction);allHashes.add(hash);let clear=0,visible=0;for(let i=3;i<raw.length;i+=4){if(!raw[i])clear++;if(raw[i]>32)visible++;}assert(clear>384*320*.35);assert(visible>1500);total++;}
  }
 }
 assert.equal(total,144);ctx.artImages=images;
 vm.runInContext(`spriteImage=src=>artImages[src]||null;scene.bg=null;scene.gates=null;scene.mons=[];scene.engaged=null;player.lv=70;addItem('polyScroll',20);`,ctx);
 for(const x of specs){ctx.formId=x.id;ctx.key=x.key;vm.runInContext(`assert.equal(usePotion('polyScroll',formId),'');MORPHS[key].drawH=96;`,ctx);const cv=createCanvas(1280,960),g=cv.getContext('2d');
  for(const[di,d]of ['down','right','up','left'].entries())for(const[ai,a]of ['walk','attack','cast','hit'].entries()){const tile=createCanvas(320,240);ctx.paint=tile.getContext('2d');ctx.direction=d;ctx.action=a;vm.runInContext(`{scene.pl.dir=direction;const s=playerSprite()[action];scene.pl.path=action==='walk'?[[scene.pl.x+1,scene.pl.y]]:[];scene.walkClock=s.ms*1.5;scene.pl.anim=action==='walk'?null:{name:action,t:s.ms*(action==='attack'?2:1),dur:s.frames.down*s.ms};sceneDraw(paint,320,240);}`,ctx);g.drawImage(tile,di*320,ai*240);}
  fs.writeFileSync(path.join(__dirname,'sprite-src/morph',x.dir,'game-render.png'),cv.toBuffer('image/png'));
 }
 console.log('PASS：16圖集、144格RGBA透明／唯一／來源逐byte與離線預載；正式sceneDraw四款四向四動作64組。');
})().catch(e=>{console.error(e);process.exit(1);});
