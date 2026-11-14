const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
const read=name=>fs.readFileSync(path.join(__dirname,'../data',name),'utf8');
function fixture(){
 let cell=16,dungeon=false;const c={window:{gameFlowState:'playing',activeMapId:4},worldX:10,worldY:10,CharacterActions:{dead:false},tile:()=>cell,movementTime:()=>1000,IslandMonsters:{around:()=>[],botList:[]}};
 c.window.WorldMaps={isDungeon:()=>dungeon};vm.createContext(c);vm.runInContext(read('npc-context.js'),c);
 const b={x:12,y:10,hp:100,spawn:{mapId:4,npc:{hp:100}},fp:{look:{role:'騎士',weapon:'sword1'},potions:8}};
 return {c,b,api:c.window.NpcContext,set town(v){cell=v?16:1;},set dungeon(v){dungeon=v;}};
}
test('村莊、野外、地監使用各自台詞；不隨機宣稱升級、強化或掉寶',()=>{
 const f=fixture();assert.ok(f.api.ambient(f.b).includes('先整理背包'));assert.ok(!f.api.ambient(f.b).some(s=>/地監|這層|說話之島|骷髏|衝|升等|爆了/.test(s)));
 f.town=false;let lines=f.api.ambient(f.b);assert.ok(lines.includes('附近沒什麼怪，再往前找找'));assert.ok(!lines.some(s=>/村裡|這層/.test(s)));
 f.dungeon=true;lines=f.api.ambient(f.b);assert.ok(lines.includes('這層慢慢走'));assert.ok(!lines.some(s=>/上樓|下一層|爆了一個|奇岩/.test(s)));
 f.c.IslandMonsters.around=()=>Array.from({length:5},()=>({hp:10,spawn:{npc:{name:'骷髏'}}}));lines=f.api.ambient(f.b);assert.ok(lines.includes('前面有骷髏，小心一點'));assert.ok(lines.includes('這邊怪不少，小心一點'));
});
test('戰鬥、撤退、重傷、擺攤、交易及死亡不閒聊，也不插話邀組',()=>{
 for(const state of [{pk:true},{retreatUntil:9999},{target:{hp:10}},{partyTarget:{hp:10}},{stall:{}},{social:'trade'},{hidden:true},{vanish:9000}]){
  const f=fixture();Object.assign(f.b.fp,state);assert.equal(f.api.ambient(f.b).length,0);assert.equal(f.api.available(f.b),false);
 }
 const f=fixture();f.b.hp=20;assert.equal(f.api.ambient(f.b).length,0);f.b.hp=100;f.c.CharacterActions.dead=true;assert.equal(f.api.ambient(f.b).length,0);
});
test('補給、職業與地名需要實際條件；附近沒王不會喊王出了',()=>{
 const f=fixture();assert.ok(!f.api.ambient(f.b).includes('誰有多的紅水'));f.b.fp.potions=1;assert.ok(f.api.ambient(f.b).includes('誰有多的紅水'));
 assert.ok(!f.api.ambient(f.b).some(s=>s.includes('補點箭')));f.b.fp.look.weapon='bow';assert.ok(f.api.ambient(f.b).includes('出發前先補點箭'));
 f.c.window.activeMapId=f.b.spawn.mapId=0;f.c.IslandMonsters.botList=Array.from({length:5},()=>({x:11,y:11,spawn:{mapId:0},fp:{}}));assert.ok(f.api.ambient(f.b).some(s=>s.includes('說話之島村莊')));
 f.c.window.activeMapId=f.b.spawn.mapId=4;assert.ok(!f.api.ambient(f.b).some(s=>s.includes('說話之島')));assert.equal(f.api.reply(f.b,'死亡騎士出了嗎'),'我這附近沒看到王。');
 f.town=false;assert.match(f.api.reply(f.b,'買賣交易'),/回村/);
});
test('玩家順飛離開或換圖，舊區域 NPC 不再被聽見或回話',()=>{
 const f=fixture();assert.ok(f.api.canHear(f.b));f.c.worldX=1000;assert.equal(f.api.canHear(f.b),false);assert.equal(f.api.reply(f.b,'你好'),null);
 f.c.worldX=10;f.c.window.activeMapId=0;assert.equal(f.api.canHear(f.b),false);
});
function populationFixture(){
 let clock=0;const old={x:10,y:10,spawn:{mapId:4,npc:{name:'原區域路人'}},fp:{lastSeen:0},step:{end:800}},list=[old],made=[];
 const c={window:{gameFlowState:'playing',activeMapId:4},sceneStarted:true,looks:[{}],enabled:true,redOn:true,worldX:10,worldY:10,
  movementTime:()=>clock,rnd:(a,b)=>(a+b)/2,safe:()=>true,dist:(ax,ay,bx,by)=>Math.max(Math.abs(ax-bx),Math.abs(ay-by)),
  mapNow:null,arrivalAt:0,nextArrival:0,lastObserver:null,recentlyDeparted:new Map(),used:new Set(['原區域路人']),claimed:new WeakMap(),
  IslandMonsters:{botList:list,removeAlly:b=>{const i=list.indexOf(b);if(i>=0)list.splice(i,1);}},
  bots:()=>list.filter(b=>b.spawn.mapId===c.window.activeMapId),stallTick(){},spotNear:(x,y)=>[x+25,y],
  make:(x,y,red)=>{made.push({x,y,red});},place(){throw Error('不能把舊路人搬到玩家附近');},Math};
 vm.createContext(c);const source=read('fake-players.js');vm.runInContext(source.slice(source.indexOf(' function areaDemand('),source.indexOf(' setInterval(maintain,2000);')),c);
 return {c,old,made,list,advance:ms=>clock+=ms};
}
test('順飛不搬動舊 NPC，新區域等候後才出現自己的路人',()=>{
 const f=populationFixture();f.c.maintain();f.advance(2000);f.c.worldX=f.c.worldY=1000;f.c.maintain();assert.equal(f.old.x,10);assert.equal(f.old.y,10);assert.equal(f.made.length,0);
 f.advance(11000);f.c.maintain();assert.equal(f.made.length,1);assert.equal(f.made[0].x,1025);assert.equal(f.old.x,10);
});
test('長期離開的路人才會退場，冷卻名字不立即在下一個區域重用',()=>{
 const f=populationFixture();f.c.maintain();f.c.worldX=f.c.worldY=1000;f.advance(10000);f.c.maintain();assert.ok(f.list.includes(f.old));f.advance(301000);f.c.maintain();assert.ok(!f.list.includes(f.old));assert.ok(f.c.recentlyDeparted.get('原區域路人')>f.c.movementTime());
});
test('不同區域有不同人口密度，野外允許沒有路人',()=>{
 const f=populationFixture(),counts=new Set();for(let x=0;x<20;x++)counts.add(f.c.areaDemand(4,x*64,1000,false));assert.ok(counts.has(0));assert.ok(counts.size>=3);assert.ok(f.c.areaDemand(4,1000,1000,true)>=6);
});
test('新路人的選名也遵守退場冷卻，不只檢查舊存檔',()=>{
 const c={roster:[],used:new Set(),recentlyDeparted:new Map([['舊路人',99999]]),movementTime:()=>1000,lookOf:()=>null,stallNames:()=>new Set(),looks:[{avatar:'hero',role:'騎士',weapon:'sword1',id:1,attackMs:640}],A:{avatars:{hero:{gender:0}}},CLASS_NAMES:{騎士:{any:[],m:[],f:[]}},NAMES:['舊路人','新路人'],GENDER_NAMES:[[],[]],pick:a=>a[0],Math,ri:a=>a,rnd:a=>a,rollClan:()=>null,RANGED:{},safe:()=>false,window:{activeMapId:4},preloadLook(){},remember(){},IslandMonsters:{addAlly(){}}};
 vm.createContext(c);const source=read('fake-players.js');vm.runInContext(source.slice(source.indexOf(' function make('),source.indexOf(' const preloaded=')),c);
 assert.equal(c.make(10,10).spawn.npc.name,'新路人');
});
test('假人消失後回自己原區域，不改在順飛後的玩家身邊重生',()=>{
 const calls=[],c={spotNear:(...args)=>{calls.push(args);return [102,202];},place:(b,x,y)=>{b.x=x;b.y=y;}};vm.createContext(c);const source=read('fake-players.js'),start=source.indexOf('  if(f.vanish){'),end=source.indexOf('  if(!f.stall&&survival',start);
 vm.runInContext('function revive(mob,now){const f=mob.fp;'+source.slice(start,end)+'}',c);
 const b={homeX:100,homeY:200,hp:1,spawn:{npc:{hp:100}},fp:{vanish:1000,hidden:true}};c.revive(b,2000);assert.equal(calls[0][0],100);assert.equal(calls[0][1],200);assert.equal(b.x,102);assert.equal(b.fp.hidden,false);
});
