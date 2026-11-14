const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
const read=name=>fs.readFileSync(path.join(__dirname,'../data',name),'utf8');
test('長按不依賴鍵盤重複，遲到的畫面仍從上一步結束時間續走；放開停止續步',()=>{
 let clock=0,serial=0;const callbacks=new Map(),events=new Map(),starts=[];
 const c={window:{gameFlowState:'playing'},globalThis:null,performance:{now:()=>clock},worldX:0,worldY:0,
  SPRITE_MOVEMENT:{profiles:{'騎士:0':{actions:{0:{stepMs:640}}}}},$:()=>({hidden:true}),document:{querySelectorAll:()=>[],addEventListener(){}},
  addEventListener:(key,fn)=>events.set(key,fn),requestAnimationFrame:fn=>{callbacks.set(++serial,fn);return serial;},cancelAnimationFrame:id=>callbacks.delete(id),clearInterval(){},navigationPath:[],cancelNavigation(){},
  stepWorld(dx,dy,time,started){starts.push(started);vm.runInContext('startVisualStep(worldX+'+dx+',worldY+'+dy+','+time+','+started+')',c);return true;}};
 c.globalThis=c;vm.createContext(c);vm.runInContext(read('movement-config.js'),c);c.MovementConfig=c.window.MovementConfig;
 const scene=read('scene-renderer.js');vm.runInContext(scene.slice(scene.indexOf('move=function('),scene.indexOf("document.querySelector('#zoomIn')")),c);vm.runInContext(read('input.js'),c);
 const event={key:'ArrowRight',target:{closest:()=>null},preventDefault(){}};events.get('keydown')(event);
 for(clock=17;clock<=2000;clock+=17){const pending=[...callbacks];callbacks.clear();for(const [,fn]of pending)fn(clock);if(clock===320)events.get('keydown')(event);}
 assert.deepEqual(starts,[0,640,1280,1920]);events.get('keyup')(event);
 for(clock=2016;clock<2800;clock+=16){const pending=[...callbacks];callbacks.clear();for(const [,fn]of pending)fn(clock);}
 assert.equal(starts.length,4);assert.equal(callbacks.size,0);
});
test('目前武器八方向走路圖片不被其他動作淘汰，重複載入命中快取',()=>{
 const cache=new Map(),resources=new Map();let loads=0;const directions={};
 for(const heading of ['N','NE','E','SE','S','SW','W','NW']){directions[heading]={sword1_walk:4};for(let i=0;i<10;i++)directions[heading]['clip'+i+'_idle']=2;}
 const c={fullCharacterCache:cache,characterFrameResources:resources,fullCharacterAssets:{avatars:{hero:{directions,shadows:directions}}},activeCharacterWeapon:()=> 'sword1',fullCharacterPath:(a,h,k,i,s)=>[a,h,k,i,s].join('/'),characterFrameResource:file=>{if(!resources.has(file)){loads++;resources.set(file,{});}return resources.get(file);}};
 vm.createContext(c);const source=read('character-actions.js');vm.runInContext(source.slice(source.indexOf('function preloadFullCharacterClip('),source.indexOf('function preloadCharacterWalkSet(')),c);
 for(const heading of Object.keys(directions))c.preloadFullCharacterClip('hero',heading,'sword1_walk');
 for(let i=0;i<10;i++)for(const heading of Object.keys(directions))c.preloadFullCharacterClip('hero',heading,'clip'+i+'_idle');
 assert.ok(cache.size<=48);const before=loads;for(const heading of Object.keys(directions)){assert.ok(cache.has('hero/'+heading+'/sword1_walk'));c.preloadFullCharacterClip('hero',heading,'sword1_walk');}assert.equal(loads,before);
});
test('死亡時固定當下位置，播放後保持最後有效屍體影格，屍體至少停留到動畫結束',()=>{
 const frames=[['fall',0,0,30,40,100],['corpse',0,0,40,15,100],['empty',0,0,1,1,100]],c={islandMonsterFrames:{1:{'d0/death':frames}},movementTime:()=>1050,selected:null,loadSheet(){},Math};
 vm.createContext(c);const source=read('island-monsters.js');vm.runInContext(source.slice(source.indexOf('  function markDead('),source.indexOf('  function damage(')),c);vm.runInContext(source.slice(source.indexOf('  function spriteFrame('),source.indexOf('  function draw(')),c);
 const b={x:1,y:1,hp:0,heading:0,step:{x:2,y:1,start:1000,end:1100},spawn:{npc:{gfx:1},respawn:[0,0]}};c.markDead(b);assert.equal(b.death.x,1.5);assert.equal(b.step,null);assert.ok(b.respawnAt>=b.death.end+1500);
 assert.equal(c.spriteFrame(b,1050,0)[0][0],'fall');assert.equal(c.spriteFrame(b,1200,0)[0][0],'corpse');assert.equal(c.spriteFrame(b,2000,0)[0][0],'corpse');
});
test('假人尋路有搜尋上限，不會因不可到達目標遍歷整張地圖',()=>{
 let probes=0;const c={island:{startX:0,startY:0,width:80,height:80},tile:()=>1,window:{},canTraverse:(x,y,dx,dy)=>{probes++;return x+dx<40;}};vm.createContext(c);const source=read('navigation.js');vm.runInContext(source.slice(0,source.indexOf('function cancelNavigation(')),c);assert.equal(c.findWalkingPath(10,10,60,60,{maxNodes:20}),null);assert.ok(probes<200);assert.ok(c.findWalkingPath(10,10,15,15,{maxNodes:20}));
});
