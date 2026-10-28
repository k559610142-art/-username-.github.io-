// 玩家／傭兵紅圈：真實場景移動與傷害，記憶體角色、禁止連線與存檔。
const fs=require('fs'),path=require('path'),vm=require('vm'),assert=require('assert/strict');
const prefix=fs.readFileSync(path.join(__dirname,'test-mercenary.js'),'utf8').split('ctx.assert = assert;')[0];
const ctx=new Function('require','__dirname',prefix+'\nreturn ctx;')(require,__dirname);ctx.assert=assert;
vm.runInContext(`
SIM_MODE=false;lootMode='legacy';saveGame=()=>{};refreshUI=()=>{};sfx=()=>{};sfxHit=()=>{};worldVfxBoss=()=>{};resonanceOnHurt=()=>{};
mapMonTarget=()=>0;sceneReadEvents=()=>{};
function setup(){
 createPlayer('紅圈隔離','knight',CLASSES.knight.base);gameNow=10000;player.lv=40;player.loc={type:'zone',id:'island'};player.hunting=true;player.settings.autoDodge=true;player.hp=1000;
 const m=player.mercenary={cls:'bulwark',lv:30,hp:1000,mp:100,active:true,dead:false,equip:{},skills:['','','',''],cds:{}};
 const mon={id:'orc',name:'測試首領',hp:100000,maxHp:100000,boss:true,dmg:[40,40],teleCd:99999,atkCd:99999,stunUntil:0};
 hunt={state:'fight',mon,mobs:[mon],pCd:10000,warned:{},tele:{mob:mon,name:'紅圈',start:gameNow,until:gameNow+1600}};
 scene={mw:14,mh:14,grid:Array.from({length:14},()=>Array(14).fill(0)),bg:{big:false},spawnCd:99999,mons:[{x:8,y:6,rx:8,ry:6,inst:mon,cd:99999,dead:false}],effects:[],floats:[],manualUntil:0,dodging:false,
 pl:{x:6,y:6,rx:6,ry:6,path:[],dir:'right',idleCd:10000},mercenary:{owner:m,rx:6,ry:7,path:[],dir:'right'}};
 scene.tele={ref:hunt.tele,x:6,y:6,r:1.5,react:0};return {m,t:hunt.tele};
}
let {m,t}=setup();
// 真正sceneUpdate讓雙方逃出圈外，安全後不追近戰目標、不跟隨回圈內。
for(let i=0;i<12;i++){gameNow+=100;sceneUpdate(100);}
assert(!sceneTeleContains(scene.tele,scene.pl.rx,scene.pl.ry));assert(!sceneTeleContains(scene.tele,scene.mercenary.rx,scene.mercenary.ry));
const positions=[scene.pl.rx,scene.pl.ry,scene.mercenary.rx,scene.mercenary.ry];
for(let i=0;i<3;i++){gameNow+=100;sceneUpdate(100);}
assert.deepEqual([scene.pl.rx,scene.pl.ry,scene.mercenary.rx,scene.mercenary.ry],positions);assert(scene.dodging&&scene.mercenary.dodging);
gameNow=t.until;t.dodged=false;bossSkillTick(100);assert.equal(player.hp,1000);assert.equal(m.hp,1000);
sceneUpdate(100);assert(!scene.dodging&&!scene.mercenary.dodging);assert(player.hunting);
// 60fps途中跨出圈緣仍要走完安全格，不能清路後又插值彈回圈內。
({m,t}=setup());for(let i=0;i<90;i++){gameNow+=16;sceneUpdate(16);}
assert(!sceneTeleContains(scene.tele,scene.pl.rx,scene.pl.ry,.4));assert(!sceneTeleContains(scene.tele,scene.pl.x,scene.pl.y,.4));
assert(!sceneTeleContains(scene.tele,scene.mercenary.rx,scene.mercenary.ry,.4));
// 命中按實際座標分開判斷，不能只靠玩家dodged，也不能讓玩家盾替傭兵擋圈。
chance=()=>false;
for(const [pOut,mOut]of [[true,false],[false,true],[false,false],[true,true]]){
 ({m,t}=setup());player.settings.autoDodge=false;scene.pl.rx=pOut?3:6;scene.mercenary.rx=mOut?3:6;scene.mercenary.ry=6;
 sceneTeleTick(100);gameNow=t.until;t.seenAt=gameNow;t.dodged=!pOut;bossSkillTick(100);
 assert.equal(player.hp<1000,!pOut);assert.equal(m.hp<1000,!mOut);
}
const absorbOriginal=bossEnchantAbsorb;let absorbed=0;bossEnchantAbsorb=d=>{absorbed++;return 0;};
({m,t}=setup());player.settings.autoDodge=false;sceneTeleTick(100);gameNow=t.until;t.seenAt=gameNow;bossSkillTick(100);assert.equal(player.hp,1000);assert(m.hp<1000);assert.equal(absorbed,1);
bossEnchantAbsorb=absorbOriginal;
// 傭兵與玩家的整條閃避路線都只能留在同一個地圖分區。
({m,t}=setup());scene.bg={big:true,regions:[{zone:'island'},{zone:'forest'}],_regOf:Array.from({length:14},()=>Array.from({length:14},(_,x)=>x<6?1:0))};
sceneTeleTick(100);sceneMercTick(100);assert(scene.pl.path.length&&scene.mercenary.path.length);assert(scene.pl.path.every(([x,y])=>inHuntZone(x,y)));assert(scene.mercenary.path.every(([x,y])=>inHuntZone(x,y)));
// 手動走路優先；傭兵仍自行閃避。關閉設定兩者均不自動接管路線。
({m,t}=setup());scene.manualUntil=gameNow+2500;scene.pl.path=[[7,6]];sceneTeleTick(100);assert.deepEqual(scene.pl.path,[[7,6]]);assert(!scene.dodging);sceneMercTick(100);assert(scene.mercenary.dodging);
({m,t}=setup());player.settings.autoDodge=false;sceneTeleTick(100);sceneMercTick(100);assert(!scene.dodging&&!scene.mercenary.dodging);
// 閃避途中被怪物堵住，重新找路，不一直卡在舊路線。
({m,t}=setup());sceneTeleTick(100);const blocked=scene.pl.path[0];scene.mons.push({x:blocked[0],y:blocked[1],dead:false});gameNow+=250;sceneTeleTick(100);assert(scene.pl.path.length);assert(!scene.pl.path.some(p=>p[0]===blocked[0]&&p[1]===blocked[1]));
// 完全無路雙方留在原地承傷；下一輪障礙消失可重試，不能跨牆或瞬移逃走。
({m,t}=setup());scene.grid=scene.grid.map(row=>row.map(()=>1));scene.grid[6][6]=0;scene.mercenary.rx=6;scene.mercenary.ry=6;
sceneTeleTick(100);sceneMercTick(100);assert.equal(scene.pl.path.length,0);assert.equal(scene.mercenary.path.length,0);
gameNow=t.until;sceneTeleTick(100);bossSkillTick(100);assert(player.hp<1000&&m.hp<1000);assert(player.hunting);
({m,t}=setup());scene.grid=scene.grid.map(row=>row.map(()=>1));scene.grid[6][6]=0;sceneTeleTick(100);assert.equal(scene.pl.path.length,0);scene.grid[6][5]=0;scene.grid[6][4]=0;gameNow+=250;sceneTeleTick(100);assert(scene.pl.path.length);
// 背景沿原設定機率、SIM不讓傭兵參戰。
({m,t}=setup());scene=null;chance=()=>true;gameNow=t.until;bossSkillTick(100);assert.equal(player.hp,1000);assert.equal(m.hp,1000);
({m,t}=setup());scene=null;chance=()=>false;SIM_MODE=true;gameNow=t.until;bossSkillTick(100);assert(player.hp<1000);assert.equal(m.hp,1000);SIM_MODE=false;
console.log('PASS：真實場景雙方逃圈／安全停留／結束恢復、四種獨立命中、手動與設定、堵路重找／無路承傷／重試、背景與SIM隔離。');
`,ctx);
