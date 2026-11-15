const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const source=fs.readFileSync(require('node:path').join(__dirname,'../data/fake-players.js'),'utf8');
function fixture(){
 const calls=[],steps=[];
 const c={window:{gameFlowState:'playing',activeCharacterId:'hero'},worldX:100,worldY:100,
  CharacterActions:{dead:false},canFight:()=>true,safe:()=>false,
  IslandCombat:{clearShot:()=>true},IslandMonsters:{around:(x,y,r)=>{calls.push([x,y,r]);return [];},target:null},
  dist:(x,y,a,b)=>Math.max(Math.abs(x-a),Math.abs(y-b)),rnd:()=>1000,ri:()=>1,survival:()=>false,
  claimed:new WeakMap(),isBoss:()=>false,wander:()=>{},say:()=>{},face:()=>{},pick:a=>a[0],RED_WIN:[],RED_LINES:[]};
 vm.createContext(c);vm.runInContext(source.slice(source.indexOf(' function update(mob,now,stepToward)'),source.indexOf(' function monsterHurt('))+';this.run=update;this.pkTest=pk;',c);
 const mob={x:104,y:100,hp:100,spawn:{npc:{name:'路人',hp:100,level:20,ranged:1}},fp:{red:true,chatAt:Infinity,state:'hunt',think:Infinity,pkCd:0,ready:Infinity}};
 return {c,mob,calls,steps,step:(m,x,y)=>{steps.push([x,y]);return true;}};
}
test('紅名假人靠近玩家也不主動鎖定或追隨',()=>{const f=fixture();for(const x of [100,102,106]){f.c.worldX=x;f.c.run(f.mob,5000,f.step);}assert.equal(f.mob.fp.pk,undefined);assert.deepEqual(f.steps,[]);});
test('搜尋 BOSS 以假人自身位置為中心',()=>{const f=fixture();f.mob.fp.red=false;f.c.run(f.mob,5000,f.step);assert.deepEqual(f.calls[0],[104,100,14]);});
test('受到玩家攻擊後仍可追近反擊，距離過遠則停戰',()=>{const f=fixture();Object.assign(f.mob.fp,{pk:true,enemyId:'hero'});assert.equal(f.c.pkTest(f.mob,5000,f.step),true);assert.deepEqual(f.steps,[[100,100]]);f.c.worldX=50;assert.equal(f.c.pkTest(f.mob,6000,f.step),false);assert.equal(f.mob.fp.pk,false);});

function enablePatrol(f){
 Object.assign(f.mob,{homeX:104,homeY:100});Object.assign(f.mob.fp,{red:false,bossLook:Infinity,think:0,since:0});
 f.c.Math=Object.create(Math);f.c.Math.random=()=>.8;
 vm.runInContext(source.slice(source.indexOf(' function wander('),source.indexOf(' function canFight(')),f.c);
}
test('找不到可打的怪物時仍可巡邏，不被搜尋冷卻永久卡住',()=>{
 const f=fixture();enablePatrol(f);f.c.run(f.mob,5000,f.step);assert(f.steps.length>0);assert(f.mob.fp.think>5000);
});
test('遠處搜尋也排除玩家正在打的怪，不會走到玩家身旁發呆',()=>{
 const f=fixture();enablePatrol(f);const monster={x:100,y:100,hp:100,spawn:{npc:{level:10}}};f.c.IslandMonsters.target=monster;f.c.IslandMonsters.around=()=>[monster];
 f.c.run(f.mob,5000,f.step);assert.equal(f.mob.fp.target,undefined);assert(!f.steps.some(([x,y])=>x===100&&y===100));assert(f.steps.length>0);
});
test('前往怪物途中被玩家鎖定時取消舊目標，改為自行巡邏',()=>{
 const f=fixture();enablePatrol(f);const monster={x:116,y:100,hp:100,spawn:{npc:{level:10}}};Object.assign(f.mob.fp,{huntGoal:monster,goal:[116,100],route:[[115,100]]});f.c.IslandMonsters.target=monster;f.c.IslandMonsters.around=()=>[monster];
 f.c.run(f.mob,5000,f.step);assert.equal(f.mob.fp.huntGoal,null);assert.equal(f.mob.fp.route,null);assert(!f.steps.some(([x,y])=>x===116&&y===100));
});
