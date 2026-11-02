// 八款補完：正式卷軸、事件、繪圖及288格素材；記憶體角色，不連外。
const fs=require('fs'),path=require('path'),vm=require('vm'),assert=require('assert/strict'),crypto=require('crypto');
const root=path.resolve(__dirname,'..'),specs=JSON.parse(fs.readFileSync(path.join(__dirname,'sprite-src/morph/remaining-eight-v1.json'),'utf8'));
const before=JSON.parse(fs.readFileSync(path.join(__dirname,'sprite-src/morph/remaining-eight-before.json'),'utf8'));
const prefix=fs.readFileSync(path.join(__dirname,'test-mercenary.js'),'utf8').split('ctx.assert = assert;')[0];
const ctx=new Function('require','__dirname',prefix+'\nreturn ctx;')(require,__dirname);Object.assign(ctx,{assert,specs,before});
vm.runInContext(`
SIM_MODE=true;assert.equal(SAVE_SCHEMA,25);assert.equal(GAME_VERSION,'20261102c');
assert.equal(JSON.stringify(MORPH_FORMS.map(({sprite,...f})=>f)),JSON.stringify(before),'原36款數值、等級、說明不可變');
assert.equal(new Set(MORPH_FORMS.map(f=>f.sprite)).size,36);
assert.equal(ITEMS.polyScroll.sec,1800);assert.equal(ITEMS.polyScroll.price,10000);
for(const x of specs){
 const f=MORPH_BY_ID[x.id];assert.equal(f.sprite,x.key);
 createPlayer('八款變身測試','knight',CLASSES.knight.base);addItem('shortSword');assert(equipItem(player.inv.find(i=>i.id==='shortSword').uid,true));
 player.loc={type:'zone',id:'island'};buildScene();addItem('polyScroll',4);const n=countItem('polyScroll');
 player.lv=f.lv-1;assert.match(usePotion('polyScroll',x.id),new RegExp(String(f.lv)));assert.equal(countItem('polyScroll'),n);
 player.lv=f.lv;assert.equal(usePotion('polyScroll',x.id),'');assert.equal(countItem('polyScroll'),n-1);assert.equal(playerSprite(),MORPHS[x.key]);assert.equal(player.settings.lastMorph,x.id);
 assert.equal(morphWeaponErr(f),'');if(MORPH_GROUPS[f.group].oneHand)assert.match(morphWeaponErr(f,{id:'shortBow'}),/雙手/);
 const mon={x:scene.pl.x+1,y:scene.pl.y,rx:scene.pl.x+1,ry:scene.pl.y,mid:'skeleton',lastHp:100,inst:{hp:90,maxHp:100}};
 scene.mons=[mon];scene.engaged=mon;gameLog.length=0;
 for(const dir of ['down','right','up','left']){scene.pl.dir=dir;scene.pl.anim=null;mon.lastHp=100;mon.inst.hp=90;scene.lastPlayerHp=player.hp;sceneReadEvents();assert.equal(scene.pl.anim.name,'attack');assert.equal(scene.pl.anim.dur,560);scene.pl.anim.t=210;playAnim('hit');assert.equal(scene.pl.anim.t,210);assert.equal(scene.pl.anim.name,'attack');}
 scene.pl.anim=null;mon.lastHp=mon.inst.hp;gameLog.push({seq:999999,cls:'miss',msg:'你的攻擊沒有命中'});scene.lastSeq=0;sceneReadEvents();assert.equal(scene.pl.anim.name,'attack');
 gameLog.push({seq:1000000,cls:'magic',msg:'🔮 施放測試魔法'});sceneReadEvents();assert.equal(scene.pl.anim.name,'cast');assert.equal(scene.pl.anim.dur,440);
 scene.pl.anim=null;scene.lastPlayerHp=player.hp+1;sceneReadEvents();assert.equal(scene.pl.anim.name,'hit');assert.equal(scene.pl.anim.dur,300);
 player.buffs.morph.until=gameNow;assert.equal(playerMorph(),null);assert.equal(usePotion('polyScroll'),'');assert.equal(player.buffs.morph.form,x.id);assert.equal(countItem('polyScroll'),n-2);
}
for(const f of MORPH_FORMS)for(const a of ['walk','attack','cast','hit'])assert(MORPHS[f.sprite][a].src);
console.log('PASS：八款卷軸扣量、等級、武器限制、命中／MISS／施法／受傷、到期記憶；36款獨立外觀與原數值不變。');
`,ctx);
(async()=>{
 const runtime=path.join(process.env.USERPROFILE,'.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules');
 const sharp=require(path.join(runtime,'sharp')),{createCanvas,loadImage}=require(path.join(runtime,'@napi-rs/canvas'));
 const hashes=new Set(),images={},sw=fs.readFileSync(path.join(root,'sw.js'),'utf8');let total=0;
 const registration=JSON.parse(fs.readFileSync(path.join(__dirname,'sprite-src/morph/remaining-eight-registration.json'),'utf8'));assert.equal(registration.length,288);
 for(const x of specs){
  const dir=path.join(root,'images/sprites/morph',x.dir),source=path.join(__dirname,'sprite-src/morph',x.dir),m=JSON.parse(fs.readFileSync(path.join(dir,'manifest.json'),'utf8'));
  assert.equal(m.id,x.id);assert.equal(m.key,x.key);assert.deepEqual(m.foot,[m.cellW/2,270]);assert.equal(m.charH,160);assert.equal(m.drawH,48);assert.equal(m.left,'mirror right');assert.equal(m.cellW,x.id==='m26'?448:384);
  assert(sw.includes(m.portrait));assert.equal((await sharp(path.join(root,m.portrait)).metadata()).hasAlpha,true);
  ctx.key=x.key;ctx.manifest=m;vm.runInContext(`for(const a of ['walk','attack','cast','hit'])assert.equal(JSON.stringify(MORPHS[key][a]),JSON.stringify(manifest.actions[a]));assert.equal(JSON.stringify(MORPHS[key].foot),JSON.stringify(manifest.foot));`,ctx);
  for(const[a,n]of [['walk',4],['attack',4],['cast',2],['hit',2]]){
   const sp=m.actions[a],file=path.join(root,sp.src),png=fs.readFileSync(file);assert.equal(png.readUInt32BE(16),m.cellW*n);assert.equal(png.readUInt32BE(20),960);assert.equal(png[25],6);assert(sw.includes(sp.src));images[sp.src]=await loadImage(file);
   for(const[d,dirName]of ['down','right','up'].entries())for(let i=0;i<n;i++){
    const raw=await sharp(file).extract({left:i*m.cellW,top:d*m.cellH,width:m.cellW,height:m.cellH}).ensureAlpha().raw().toBuffer();
    const single=await sharp(path.join(source,'build/frames',a+'-'+dirName+'-'+String(i+1).padStart(2,'0')+'.png')).ensureAlpha().raw().toBuffer();assert(raw.equals(single));
    const hash=crypto.createHash('sha256').update(raw).digest('hex');assert(!hashes.has(hash),'重複影格 '+x.id+' '+a+' '+dirName+' '+i);hashes.add(hash);
    let clear=0,visible=0;for(let y=0;y<m.cellH;y++)for(let p=0;p<m.cellW;p++){const alpha=raw[(y*m.cellW+p)*4+3];if(!alpha)clear++;if(alpha>32)visible++;if(y<2||y>=m.cellH-2||p<2||p>=m.cellW-2)assert.equal(alpha,0,'輸出格缺安全邊');}
    assert(clear>m.cellW*m.cellH*.35);assert(visible>1500);total++;
   }
  }
 }
 assert.equal(total,288);ctx.artImages=images;
 vm.runInContext(`spriteImage=src=>artImages[src]||null;scene.bg=null;scene.gates=null;scene.mons=[];scene.engaged=null;player.lv=70;addItem('polyScroll',20);`,ctx);
 for(const x of specs){
  ctx.formId=x.id;ctx.key=x.key;vm.runInContext(`assert.equal(usePotion('polyScroll',formId),'');MORPHS[key].drawH=96;`,ctx);
  const cv=createCanvas(1280,960),g=cv.getContext('2d');
  for(const[di,d]of ['down','right','up','left'].entries())for(const[ai,a]of ['walk','attack','cast','hit'].entries()){
   const tile=createCanvas(320,240);Object.assign(ctx,{paint:tile.getContext('2d'),direction:d,action:a});
   vm.runInContext(`{scene.pl.dir=direction;const s=playerSprite()[action];scene.pl.path=action==='walk'?[[scene.pl.x+1,scene.pl.y]]:[];scene.walkClock=s.ms*1.5;scene.pl.anim=action==='walk'?null:{name:action,t:s.ms*(action==='attack'?2:1),dur:s.frames.down*s.ms};sceneDraw(paint,320,240);}`,ctx);g.drawImage(tile,di*320,ai*240);
  }
  fs.writeFileSync(path.join(__dirname,'sprite-src/morph',x.dir,'game-render.png'),cv.toBuffer('image/png'));vm.runInContext('MORPHS[key].drawH=48',ctx);
 }
 for(const f of vm.runInContext('MORPH_FORMS.map(f=>MORPHS[f.sprite])',ctx))for(const a of ['walk','attack','cast','hit'])assert(fs.existsSync(path.join(root,f[a].src)));
 console.log('PASS：32RGBA圖集／288唯一格／逐byte來源／透明安全邊／40檔離線預載；正式sceneDraw八款四向四動作128組。');
})().catch(e=>{console.error(e);process.exit(1);});
