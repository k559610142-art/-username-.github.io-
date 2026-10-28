// 11金變專屬圖：實際卷軸使用、等級門檻、戰鬥動作、到期與圖集；隔離存檔／網路。
const fs=require('fs'),path=require('path'),vm=require('vm'),assert=require('assert/strict');
const root=path.resolve(__dirname,'..');
const ctx=vm.createContext({console,assert,Image:function(){},setTimeout:()=>0,clearTimeout(){},setInterval:()=>0,clearInterval(){},
 localStorage:{getItem:()=>null,setItem(){throw Error('不准寫存檔');},removeItem(){throw Error('不准刪存檔');}},
 document:{addEventListener(){},getElementById:()=>null,querySelector:()=>null,documentElement:{style:{}}},window:{addEventListener(){},innerWidth:1280,innerHeight:720},navigator:{},fetch(){throw Error('不准連線');}});
for(const[,file]of fs.readFileSync(path.join(root,'index.html'),'utf8').matchAll(/<script src="(data\/[^"?]+\.js)\?v=/g)){
 if(file==='data/main.js'||file==='data/pwa.js')continue;
 vm.runInContext(fs.readFileSync(path.join(root,file),'utf8'),ctx,{filename:file});
}
vm.runInContext(String.raw`
SIM_MODE=true;createPlayer('雙刀變身測試','darkelf',CLASSES.darkelf.base);player.lv=70;addItem('dualBlade');equipItem(player.inv.find(it=>it.id==='dualBlade').uid,true);
player.loc={type:'zone',id:'island'};buildScene();
assert.equal(ITEMS.polyScroll.price,10000);assert.equal(ITEMS.polyScroll.sec,1800);
const fxBefore=JSON.stringify(MORPH_BY_ID.m11.fx);
addItem('polyScroll',2);const scrolls=countItem('polyScroll');
player.lv=69;assert.match(usePotion('polyScroll','m11'),/70/);assert.equal(countItem('polyScroll'),scrolls);player.lv=70;addItem('dualBlade');equipItem(player.inv.find(it=>it.id==='dualBlade').uid,true);
assert.equal(MORPH_BY_ID.m11.group,'dual');assert.equal(MORPH_BY_ID.m11.lv,70);
assert.equal(JSON.stringify(MORPH_BY_ID.m11.fx),JSON.stringify({hit:7,dmg:7,spdMul:0.20,dodge:0.05}));
assert.equal(MORPH_BY_ID.m10.sprite,'brudikaShadow');
assert.equal(usePotion('polyScroll','m11'),'');assert.equal(countItem('polyScroll'),scrolls-1);
assert.equal(player.buffs.morph.form,'m11');assert.equal(player.settings.lastMorph,'m11');
assert.equal(playerSprite(),MORPHS.abyssDualDemon);assert.equal(playerMorph().name,'深淵雙刃魔神');
assert.equal(MORPH_FORMS.length,32);assert.equal(SAVE_SCHEMA,20);
const m={x:scene.pl.x+1,y:scene.pl.y,rx:scene.pl.x+1,ry:scene.pl.y,mid:'skeleton',lastHp:100,inst:{hp:90,maxHp:100}};
scene.mons=[m];scene.engaged=m;gameLog.length=0;
for(const dir of ['down','right','up','left']){
 scene.pl.dir=dir;scene.pl.anim=null;m.lastHp=100;m.inst.hp=90;scene.lastPlayerHp=player.hp;
 sceneReadEvents();assert.equal(scene.pl.anim.name,'attack');assert.equal(scene.pl.anim.dur,560);
 scene.pl.anim.t=210;playAnim('hit');assert.equal(scene.pl.anim.name,'attack');assert.equal(scene.pl.anim.t,210);
}
scene.pl.anim=null;m.lastHp=m.inst.hp;gameLog.push({seq:999999,cls:'miss',msg:'你的攻擊沒有命中'});scene.lastSeq=0;
sceneReadEvents();assert.equal(scene.pl.anim.name,'attack');
gameLog.push({seq:1000000,cls:'magic',msg:'🔮 施放測試魔法'});sceneReadEvents();
assert.equal(scene.pl.anim.name,'cast');assert.equal(scene.pl.anim.dur,440);
scene.pl.anim=null;scene.lastPlayerHp=player.hp+1;sceneReadEvents();
assert.equal(scene.pl.anim.name,'hit');assert.equal(scene.pl.anim.dur,300);
player.buffs.morph.until=gameNow;assert.equal(playerMorph(),null);
assert.equal(usePotion('polyScroll'),'');assert.equal(player.buffs.morph.form,'m11');
assert.equal(countItem('polyScroll'),scrolls-2);assert.equal(JSON.stringify(MORPH_BY_ID.m11.fx),fxBefore);
for(const[id,key]of[['m01','wolfRanger'],['m02','moonRanger'],['m03','hellfireArcher'],['m04','skyValkyrie'],['m05','dwarfGunner']])assert.equal(MORPH_BY_ID[id].sprite,key);
player.buffs.morph.form='m07';assert.equal(playerMorph(),MORPHS.wolfRanger);
console.log('PASS：卷軸扣量／上次選擇、m11專屬外觀、四向命中／MISS／施法／受傷、到期與其他變身回歸。');
`,ctx);
const dir=path.join(root,'images/sprites/morph/abyss-dual-demon-v1');
const manifest=JSON.parse(fs.readFileSync(path.join(dir,'manifest.json'),'utf8'));
assert.deepEqual(manifest.footAnchor,[192,270]);
for(const[a,n]of[['walk',4],['attack',4],['cast',2],['hit',2]]){
 const src=manifest.actions[a].src,png=fs.readFileSync(path.join(root,src));
 assert.equal(png.readUInt32BE(16),384*n);assert.equal(png.readUInt32BE(20),960);assert.equal(png[25],6);
 assert(fs.readFileSync(path.join(root,'sw.js'),'utf8').includes(src));
 assert.equal(manifest.actions[a].cells.length,n*3);
}
console.log('PASS：四張RGBA圖集、36格來源及離線預載。');

// 原生Canvas實際sceneDraw，另檢查所有36格alpha及圖集對應。
async function verifyArt(){
 const runtime=path.join(process.env.USERPROFILE,'.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules');
 const sharp=require(path.join(runtime,'sharp')),{createCanvas,loadImage}=require(path.join(runtime,'@napi-rs/canvas')),crypto=require('crypto');
 const hashes=new Set(),loaded={};let total=0;
 for(const[action,spec]of Object.entries(manifest.actions)){
  const file=path.join(root,spec.src);loaded[spec.src]=await loadImage(file);
  for(const cell of spec.cells){const row=['down','right','up'].indexOf(cell.direction),png=await sharp(file).extract({left:cell.frame*384,top:row*320,width:384,height:320}).ensureAlpha().raw().toBuffer(),frame=await sharp(path.join(__dirname,'sprite-src/morph/abyss-dual-demon-v1/build',cell.file)).ensureAlpha().raw().toBuffer();assert(png.equals(frame));const hash=crypto.createHash('sha256').update(png).digest('hex');assert(!hashes.has(hash));hashes.add(hash);let clear=0,visible=0;for(let i=3;i<png.length;i+=4){if(!png[i])clear++;if(png[i]>32)visible++;}assert(clear>384*320*.35);assert(visible>1500);total++;}
 }
 assert.equal(total,36);ctx.loaded=loaded;
 vm.runInContext(`spriteImage=src=>loaded[src]||null;addItem('polyScroll',1);assert.equal(usePotion('polyScroll','m11'),'');scene.bg=null;scene.gates=null;scene.mons=[];scene.engaged=null;MORPHS.abyssDualDemon.drawH=96;`,ctx);
 const contact=createCanvas(1280,960),g=contact.getContext('2d');
 for(const[di,d]of ['down','right','up','left'].entries())for(const[ai,a]of ['walk','attack','cast','hit'].entries()){
  const cv=createCanvas(320,240);ctx.paint=cv.getContext('2d');ctx.selectedDirection=d;ctx.selectedAction=a;
  vm.runInContext(`{scene.pl.dir=selectedDirection;const spec=playerSprite()[selectedAction];scene.pl.path=selectedAction==='walk'?[[scene.pl.x+1,scene.pl.y]]:[];scene.walkClock=spec.ms*1.5;scene.pl.anim=selectedAction==='walk'?null:{name:selectedAction,t:spec.ms*(selectedAction==='attack'?2:1),dur:spec.frames.down*spec.ms};sceneDraw(paint,320,240);}`,ctx);g.drawImage(cv,di*320,ai*240);
 }
 fs.writeFileSync(path.join(__dirname,'sprite-src/morph/abyss-dual-demon-v1/game-render.png'),contact.toBuffer('image/png'));
 console.log('PASS：36格RGBA透明／不重複／圖集逐byte，正式sceneDraw四方向四動作共16組繪圖。');
}
verifyArt().catch(e=>{console.error(e);process.exit(1);});
