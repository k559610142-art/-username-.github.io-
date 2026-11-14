const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),os=require('node:os'),vm=require('node:vm');
const {collect,blend,createPainter,renderPage,writeImage}=require('./region-background/build.cjs');
const {createCanvas,loadImage}=require('@napi-rs/canvas'),sharp=require('sharp');
const ROOT=path.resolve(__dirname,'..'),read=name=>fs.readFileSync(path.join(ROOT,'data',name),'utf8');
test('分區底圖保留室內隱藏組合、怪物遮擋格及原始物件排序',()=>{
 const map={startX:0,startY:0,width:64,height:64,chunks:[[0,0,'a']]},chunk={x:0,y:0,floor:[0],extra:[],groups:[[10,[0,0,3,1]],[11,[1,0,4,2]]],events:[0,0,10,1,2,0,11,2]},data=collect(4,map,()=>chunk),page=data.pages.get('0,0');
 assert.deepEqual(data.cells.get('0,0').hidden,['4:0,0:10']);assert.deepEqual(data.cells.get('0,1').cover,['4:0,0:11']);assert.ok(page.variants.has(''));assert.ok(page.variants.has('4:0,0:10'));assert.deepEqual(page.objects.map(r=>r.depth),[3,4]);
});
test('分區合成與現有原始地圖 worker 的像素結果一致（含原生混色圖塊）',async()=>{
 const manifest=JSON.parse(fs.readFileSync(path.join(ROOT,'assets/native-world/manifest-atlas64.json'),'utf8')),painter=createPainter(manifest),normal=0,special=manifest.blendTiles[0],rows=[{x:16,y:16,t:normal},{x:32,y:32,t:special}];await painter.preload(rows);
 const a=createCanvas(128,128),b=createCanvas(128,128),pa=a.getContext('2d'),pb=b.getContext('2d');for(const p of [pa,pb]){p.fillStyle='#314253';p.fillRect(0,0,128,128);}
 for(const row of rows)painter.paint(pa,row,0,0);
 const tiles=new Map();for(const id of [normal,special]){const atlas=await loadImage(path.join(ROOT,'assets/native-world',manifest.atlas[Math.floor(id/manifest.atlasTiles)])),tile=createCanvas(64,64),slot=id%manifest.atlasTiles;tile.getContext('2d').drawImage(atlas,slot%manifest.atlasColumns*64,Math.floor(slot/manifest.atlasColumns)*64,64,64,0,0,64,64);tiles.set(id,tile);}
 const c={window:{}};vm.createContext(c);vm.runInContext(read('native-world-worker.js'),c);const code=c.window.NATIVE_WORLD_WORKER_SOURCE,pc={self:{pen:pb,surface:b,tiles,blends:new Set(manifest.blendTiles),sources:new Map(),sp:createCanvas(64,64).getContext('2d')}};vm.createContext(pc);vm.runInContext(code.slice(code.indexOf('function paint(')),pc);for(const r of rows)pc.paint([r.x,r.y,r.t],{zoom:1,ox:0,oy:0});
 assert.deepEqual(Buffer.from(pa.getImageData(0,0,128,128).data),Buffer.from(pb.getImageData(0,0,128,128).data));
});
test('無損 WebP 分區圖保留原始像素與透明度',async()=>{
 const directory=fs.mkdtempSync(path.join(os.tmpdir(),'lineage-region-')),file=path.join(directory,'page.webp'),canvas=createCanvas(32,32),pen=canvas.getContext('2d');pen.fillStyle='#ab4f27';pen.fillRect(0,0,16,32);
 try{await writeImage(file,canvas);const decoded=await sharp(fs.readFileSync(file)).ensureAlpha().raw().toBuffer();assert.deepEqual(decoded,Buffer.from(pen.getImageData(0,0,32,32).data));}finally{if(fs.existsSync(file))fs.unlinkSync(file);fs.rmdirSync(directory);}
});
test('室內版本僅重算建築範圍，像素與整頁重畫相同',async()=>{
 const manifest=JSON.parse(fs.readFileSync(path.join(ROOT,'assets/native-world/manifest-atlas64.json'),'utf8')),painter=createPainter(manifest);
 const page={x:0,y:0,floors:[{x:0,y:0,t:0}],objects:[{x:24,y:24,t:12,group:'roof'},{x:40,y:40,t:manifest.blendTiles[0],group:'other'}]};await painter.preload([...page.floors,...page.objects]);
 const outside=renderPage(page,painter),full=renderPage(page,painter,['roof']),patched=renderPage(page,painter,['roof'],outside);
 assert.deepEqual(Buffer.from(full.getContext('2d').getImageData(0,0,1024,1024).data),Buffer.from(patched.getContext('2d').getImageData(0,0,1024,1024).data));
});
test('跨越分區邊界的普通與混色圖塊無接縫、無像素遺失',async()=>{
 const manifest=JSON.parse(fs.readFileSync(path.join(ROOT,'assets/native-world/manifest-atlas64.json'),'utf8')),painter=createPainter(manifest),rows=[{x:1008,y:24,t:12},{x:1016,y:48,t:manifest.blendTiles[0]}];await painter.preload(rows);
 const left=renderPage({x:0,y:0,floors:rows,objects:[]},painter),right=renderPage({x:1024,y:0,floors:rows,objects:[]},painter),expected=createCanvas(2048,1024),pen=expected.getContext('2d'),joined=createCanvas(128,128),j=joined.getContext('2d');pen.fillStyle='#101b17';pen.fillRect(0,0,2048,1024);for(const row of rows)painter.paint(pen,row,0,0);
 j.drawImage(left,960,0,64,128,0,0,64,128);j.drawImage(right,0,0,64,128,64,0,64,128);assert.deepEqual(Buffer.from(j.getImageData(0,0,128,128).data),Buffer.from(pen.getImageData(960,0,128,128).data));
});
test('遮擋小圖打包時，混色不得污染相鄰圖格',()=>{
 const canvas=createCanvas(32,16),pen=canvas.getContext('2d');pen.fillStyle='#abcdef';pen.fillRect(0,0,32,16);const source=new Uint8ClampedArray(64*64*4).fill(255),before=pen.getImageData(16,0,16,16).data;blend(pen,source,0,0,{x:0,y:0,w:16,h:16});assert.deepEqual(pen.getImageData(16,0,16,16).data,before);
});
function runtimeFixture(split=false){
 const requests=[],draws=[],all=[];
 function element(tag){const node={tag,dataset:{},setAttribute(k,v){this[k]=v;},style:{setProperty(k,v){this[k]=v;}},children:[],append(...nodes){for(const n of nodes){n.parent=this;this.children.push(n);}},replaceChildren(...nodes){this.children=[];this.append(...nodes);},remove(){if(this.parent)this.parent.children=this.parent.children.filter(n=>n!==this);},before(){},getContext(){return {setTransform(){},clearRect(){},save(){},beginPath(){},rect(){},clip(){},restore(){},drawImage:(...args)=>draws.push(args)};}};all.push(node);return node;}
 const data={id:4,startX:0,startY:0,width:64,height:64,size:1024,pages:{'0,0':{x:0,y:0,w:1024,h:1024,groups:['roof'],variants:{'':'outside.webp',roof:'inside.webp'},coverFiles:['cover.webp']}},groups:{roof:[{file:'cover.webp',sx:0,sy:0,x:200,y:600,w:200,h:100}]},cells:{'10,10':{hidden:['roof'],cover:['roof']},'10,11':{hidden:[],cover:['roof']}}};
 class FakeImage{constructor(){Object.assign(this,element('img'));this.naturalWidth=this.naturalHeight=1024;}set src(value){this._src=value;if(value){requests.push(value);queueMicrotask(()=>this.onload?.());}}get src(){return this._src;}decode(){return Promise.resolve();}}
 const region={cells:data.cells,groups:data.groups};if(split){data.statePages={'0,0':'4/state_0_0.json'};data.cells={};data.groups={};}
 const game=element('game');game.getBoundingClientRect=()=>({width:640,height:480});const actor=element('actor'),c={window:{REGION_BACKGROUND_INDEX:{maps:{4:{file:'4/map.json'}}},gameFlowState:'playing',activeMapId:4},document:{createElement:element,querySelector:()=>null,head:element('head')},game,actor,canvas:element('canvas'),Image:FakeImage,location:{protocol:'http:'},fetch:async file=>{requests.push(file);return {ok:true,json:async()=>file.includes('state_')?region:data};},schedule(){},movementTime:()=>1000,terrainRaster:{},terrainForegroundRoot:{},sceneStarted:false,terrainDirty:true,status:{},worldX:10,worldY:10,visualWorldPosition:()=>({x:c.worldX,y:c.worldY}),tile:()=>1,viewportLayout:()=>({anchorY:.48,defaultZoom:1}),refreshCharacter(){},devicePixelRatio:1,characterBody:{style:{left:'-60',top:'-80',width:'120',height:'100'}},characterCurrentPath:'idle0'};
 vm.createContext(c);vm.runInContext(read('region-background.js'),c);const view={width:640,height:480,anchorY:.48,zoom:1,px:504,py:768,ox:-184,oy:-537};
 return {c,api:c.window.RegionBackground,requests,draws,all,view};
}
test('新地圖主路徑只載分區圖片與少量資料，進屋切換圖片，不下載原始圖集',async()=>{
 const f=runtimeFixture();await f.api.prepare(4,10,10);f.api.render(f.view,1,1000);assert.equal(f.api.loading,false);assert.equal(f.c.actor.hidden,false);const root=f.all.find(n=>n.className==='region-background-pages');assert.ok(root.children.some(n=>n.src.endsWith('inside.webp')));
 f.c.worldX=11;await f.api.prepare(4,11,10);f.api.render(f.view,1,1100);assert.ok(root.children.some(n=>n.src.endsWith('outside.webp')));assert.ok(!root.children.some(n=>n.src.endsWith('inside.webp')));
 assert.ok(f.requests.every(url=>url.startsWith('assets/region-background/')));assert.ok(!f.requests.some(url=>/atlas|\.til|\.s32|native-world/.test(url)));
 const before=f.requests.length;for(let i=0;i<120;i++)f.api.render(f.view,1,1100+i*16);assert.equal(f.requests.length,before,'已讀取的區域不重複下載');
});
test('建築資料按當前區域讀取並快取，仍選到正確室內圖片',async()=>{
 const f=runtimeFixture(true);await f.api.prepare(4,10,10);f.api.render(f.view,1,1000);const root=f.all.find(n=>n.className==='region-background-pages');assert.ok(root.children.some(n=>n.src.endsWith('inside.webp')));assert.equal(f.requests.filter(url=>url.endsWith('state_0_0.json')).length,1);
 await f.api.prepare(4,10,10);assert.equal(f.requests.filter(url=>url.endsWith('state_0_0.json')).length,1);assert.equal(f.api.loading,false);
});
test('主遊戲 NativeWorld 入口已轉交分區圖片，原始圖集與繪圖 worker 不啟動',async()=>{
 const f=runtimeFixture(true);f.c.window.MAINLAND_SCENE={preview:{file:'unused.jpg'}};f.c.window.NATIVE_WORLD_WORKER_SOURCE='must not run';f.c.OffscreenCanvas=function(){throw Error('不應啟動原始地圖 worker');};
 vm.runInContext(read('native-world.js'),f.c);const world=f.c.window.NativeWorld;await world.prepare(4,10,10);world.render(f.view,1,1000);assert.equal(world.active,true);assert.match(world.stats.source,/region background/);assert.ok(f.requests.every(url=>url.startsWith('assets/region-background/')));
});
test('相鄰分區尚未讀完時保留行走路線，讀完後接續前進',()=>{
 let steps=0;const c={window:{NativeWorld:{loading:true}},movementTime:()=>1000,movementReady:()=>true,characterMovementBlocked:()=>false,lastMovementAt:0,lastMovementDuration:640,navigationPath:[[1,0]],worldX:0,worldY:0,stepWorld:()=>{steps++;return true;},cancelNavigation(){},toast(){}};vm.createContext(c);const source=read('navigation.js');vm.runInContext(source.slice(source.indexOf('function advanceNavigation('),source.indexOf('// Reverse an in-flight edge')),c);
 c.advanceNavigation(1000,true);assert.equal(steps,0);assert.equal(c.navigationPath.length,1);c.window.NativeWorld.loading=false;c.advanceNavigation(1000,true);assert.equal(steps,1);assert.equal(c.navigationPath.length,0);
});
