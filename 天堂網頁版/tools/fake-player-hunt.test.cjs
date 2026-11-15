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
