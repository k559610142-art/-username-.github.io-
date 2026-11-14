const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
const read=name=>fs.readFileSync(path.join(__dirname,'../data',name),'utf8');
test('地圖區塊選擇快取跨畫面重用，保留整個快取範圍需要的邊緣區塊',()=>{
 const source=read('native-world.js'),c={};vm.createContext(c);vm.runInContext(source.slice(source.indexOf(' const chunkLayouts='),source.indexOf(" const layer=document.createElement('canvas')")),c);
 const m={startX:0,startY:0,width:256,chunks:[]};for(let x=0;x<8;x++)for(let y=0;y<8;y++)m.chunks.push([x*64,y*64,x+'-'+y]);
 const v={ox:0,oy:0,zoom:1,width:1280,height:720},selection=c.selectChunks(m,v);
 for(let delta=0;delta<64;delta++){
  const view={...v,ox:delta,oy:delta};assert.equal(c.selectChunks(m,view),selection);
  for(const e of m.chunks){const x=(e[0]+e[1])*24,y=(e[1]-e[0]+m.width)*12-12;if(x+view.ox<view.width+384&&x+3264+view.ox>-384&&y-1200+view.oy<view.height+256&&y+1200+view.oy>-256)assert.ok(selection.near.includes(e));}
 }
 assert.notEqual(c.selectChunks(m,{...v,ox:64}),selection);
});
test('怪物停在同一格只查一次遮擋資料，沒有遮擋的空結果也快取',()=>{
 let scans=0;const c={active:true,rasterView:{mapId:4},window:{activeMapId:4},entityCoverCache:new Map(),chunks:new Map([['a',{key:'a',cover:{get(){scans++;return [];}}}]]),foregroundGroups:new Map()};vm.createContext(c);const s=read('native-world.js');vm.runInContext(s.slice(s.indexOf(' function paintEntity('),s.indexOf(' function render(')),c);
 for(let i=0;i<120;i++)c.paintEntity({}, {},10,10,{});assert.equal(scans,1);c.paintEntity({}, {},11,10,{});assert.equal(scans,2);c.entityCoverCache.clear();c.paintEntity({}, {},11,10,{});assert.equal(scans,3);
 c.window.activeMapId=0;c.paintEntity({}, {},12,10,{});assert.equal(scans,3,'換圖尚未完成時不沿用舊圖遮擋');
});
test('人物前景不重畫相同姿勢，只清除人物範圍，不清空整張畫布',()=>{
 const clears=[];let paints=0;const c={devicePixelRatio:1,front:{width:1280,height:720},window:{activeMapId:4},rasterView:{mapId:4},characterBody:{style:{left:'-60',top:'-80',width:'120',height:'90'}},characterCurrentPath:'idle0',eventKey:'4|10,10',foregroundRevision:1,foregroundSignature:'',foregroundRect:null,cover:new Set(['tree']),foregroundGroups:new Map([['tree',[[1,1,1]]]]),inBox:()=>true,tileImage:()=>paints++,fp:{setTransform(){},clearRect:(...args)=>clears.push(args),save(){},beginPath(){},rect(){},clip(){},restore(){}}};
 vm.createContext(c);const s=read('native-world.js');vm.runInContext(s.slice(s.indexOf(' function drawForeground('),s.indexOf(' function inBox(')),c);const v={width:1280,height:720,anchorY:.48,ox:0,oy:0,zoom:1};
 for(let i=0;i<60;i++)c.drawForeground(v,i*16);assert.equal(paints,1);c.drawForeground({...v,ox:1},1000);assert.equal(paints,2);assert.ok(clears.every(r=>r[2]<=124&&r[3]<=94));
 c.cover.clear();c.eventKey='4|11,10';c.drawForeground({...v,ox:1},1016);assert.equal(paints,2);assert.equal(clears.length,2);
});
test('角色同一影格不反覆寫入 DOM；換影格仍即時更新',()=>{
 let writes=0,shows=0;const resources=new Map(),style=new Proxy({},{set(o,k,v){writes++;o[k]=v;return true;}}),label={textContent:'hero'},data={weapons:['sword1'],size:[100,120],footY:100,directions:{N:{sword1_walk:4}},shadows:{N:{sword1_walk:0}}};
 const c={movementTime:()=>0,activeCharacterAvatar:()=> 'hero',activeCharacterActions:()=>data,activeCharacterWeapon:()=> 'sword1',preloadCharacterWalkSet(){},characterIdentity:'hero/N/sword1',characterHeading:'N',characterActionState:null,characterDead:false,characterWalkUntil:1000,characterWalkStarted:0,characterWalkDuration:640,characterWalkProfile:{},getActiveWalkProfile:()=>({}),walkFrameIndex:t=>t<160?0:1,preloadFullCharacterClip(){},fullCharacterPath:(a,h,clip,i)=>clip+i,characterFrameResource:file=>{if(!resources.has(file))resources.set(file,{ready:true,img:{file}});return resources.get(file);},characterRenderScale:()=>1,characterWalkCorrection:()=>({x:0,y:0}),characterBody:{style},characterShadow:{style},displayedCharacterSignature:'',displayedCharacterBody:null,characterActor:{querySelector:()=>label},window:{activeCharacterName:'hero'},ensureFullCharacterAnimation(){}};
 c.showDecodedCharacterFrame=body=>{shows++;c.displayedCharacterBody=body.img;};vm.createContext(c);const s=read('character-actions.js');vm.runInContext(s.slice(s.indexOf('refreshCharacter=function('),s.indexOf('function playCharacterAction(')),c);
 c.refreshCharacter(0);const first=writes;for(let t=16;t<160;t+=16)c.refreshCharacter(t);assert.equal(writes,first);assert.equal(shows,1);c.refreshCharacter(200);assert.equal(shows,2);
});
test('地圖同座標反覆重繪不反覆存檔，走路定期存、停下即存',()=>{
 let saves=0;const c={window:{activeCharacterId:'hero',activeMapId:4},worldX:10,worldY:10,zoom:1,panX:0,panY:0,lastViewSavedAt:-Infinity,lastSavedViewSignature:'',saveView:()=>saves++};vm.createContext(c);const s=read('scene-renderer.js');vm.runInContext(s.slice(s.indexOf('function saveViewIfChanged('),s.indexOf('function schedule(')),c);
 for(let i=0;i<60;i++)c.saveViewIfChanged(i*16,true);assert.equal(saves,1);c.worldX=11;c.saveViewIfChanged(2000,false);assert.equal(saves,1);c.saveViewIfChanged(6000,false);assert.equal(saves,2);c.worldX=12;c.saveViewIfChanged(6100,true);assert.equal(saves,3);
});
function statusFixture(){
 let clock=1000;function element(){return {style:{},dataset:{},children:[],append(...nodes){this.children.push(...nodes);},replaceChildren(...nodes){this.children=nodes;},setAttribute(k,v){this[k]=v;}};}
 const game=element(),c={window:{activeCharacterId:'hero',gameFlowState:'playing',activePotionBuffs:{}},document:{createElement:element,querySelector:()=>null},game,CharacterActions:{dead:false},movementTime:()=>clock,worldX:10,worldY:10,tile:()=>1,IslandCombat:{clearShot:()=>true},IslandMonsters:{playEffect(){}},ResizeObserver:class{observe(){}},setInterval(){},ITEM_USE_RULES:{definitions:{},handlers:{}},activePotionBuffs:{},Date};
 vm.createContext(c);vm.runInContext(read('island-npc-ai.js'),c);vm.runInContext(read('native-potions.js'),c);const ai=c.window.IslandNpcAi,native=c.window.NativePotions;ai.playerActive();
 const mob={x:11,y:10,homeX:11,homeY:10,hp:100,spawn:{npc:{attack:1000,ranged:1,mp:20,skills:[]},movement:12}};ai.reset(mob);
 return {c,ai,native,bar:game.children.find(e=>e.className==='native-potion-buffs'),apply(id,duration){mob.alert=true;mob.windup={at:clock,range:1,skill:{id,spell:{duration}}};ai.update(mob,clock,[mob],[],()=>false);},advance:ms=>clock+=ms};
}
test('怪物實際施放石化後立即顯示負面圖示及倒數，到期自動移除',()=>{
 const f=statusFixture();f.apply(33,3);assert.equal(f.ai.cursed,true);let icons=f.bar.children.filter(e=>e.className==='negative-buff');assert.equal(icons.length,1);assert.equal(icons[0].dataset.effect,'petrify');assert.equal(icons[0].children[0].src,'assets/interface/skills/33.png');assert.equal(icons[0].children[1].textContent,3);
 f.advance(1600);f.native.sync();icons=f.bar.children.filter(e=>e.className==='negative-buff');assert.equal(icons[0].children[1].textContent,2);f.advance(1500);f.native.sync();assert.equal(f.ai.cursed,false);assert.equal(f.bar.children.length,0);
});
test('石化與緩速可同時顯示，解除、死亡、切角色會移除圖示',()=>{
 const f=statusFixture();f.apply(33,10);f.apply(29,10);assert.equal(f.bar.children.length,2);f.ai.cure();assert.equal(f.bar.children.length,0);
 f.apply(33,10);f.c.CharacterActions.dead=true;f.native.sync();assert.equal(f.bar.children.length,0);f.c.CharacterActions.dead=false;f.c.window.activeCharacterId='other';f.native.sync();assert.equal(f.bar.children.length,0);
});
