// 真實技能／距離／淨化與原生Canvas隔離驗證，不連線、不存正式角色。
const fs=require('fs'),path=require('path'),vm=require('vm'),assert=require('assert/strict');
const prefix=fs.readFileSync(path.join(__dirname,'test-mercenary.js'),'utf8').split('ctx.assert = assert;')[0];
const ctx=new Function('require','__dirname',prefix+'\nreturn ctx;')(require,__dirname);ctx.assert=assert;
vm.runInContext(`
SIM_MODE=false;lootMode='legacy';saveGame=()=>{};refreshUI=()=>{};showToast=()=>{};sfx=()=>{};sfxHit=()=>{};
function setup(){
 gameNow=10000;scene=null;createPlayer('技能隔離','knight',CLASSES.knight.base);player.lv=40;player.baseHp=1000;player.loc={type:'zone',id:'island'};player.hunting=true;
 const m=player.mercenary={cls:'arcane',lv:30,exp:0,hp:100,mp:300,active:true,dead:false,equip:{},skills:['','','',''],cds:{}};
 m.hp=mercStats(m).hp;m.mp=mercStats(m).mp;player.hp=calcStats().maxHp;
 const mon={id:'venomSpider',hp:100000,maxHp:100000,ac:0,mr:0,dmg:[40,40],magic:{p:1,dmg:[40,40],name:'毒液'},name:'測試蛛',boss:false};
 hunt={state:'fight',mon,mobs:[mon]};return {m,mon};
}
let {m,mon}=setup();
mercEffectSet(mon,'slow',4);mercEffectSet(mon,'weaken',6);assert(mercEffectOn(mon,'slow')&&mercEffectOn(mon,'weaken'));
gameNow+=4000;assert(!mercEffectOn(mon,'slow'));assert(mercEffectOn(mon,'weaken'));gameNow+=2000;assert(!mercEffectOn(mon,'weaken'));
// 真正魔法命中、全盾擋下、閃避和SIM拒絕；淨化不清玩家正面buff。
({m,mon}=setup());mercEnemyStatus(mon,true,0,player);assert.equal(Object.keys(mercNegative(player)).length,0);
mercEnemyStatus(mon,false,40,player);assert.equal(Object.keys(mercNegative(player)).length,0);
mercEnemyStatus(mon,true,40,player);assert(mercNegative(player).poison);const hp=player.hp;gameNow+=1000;mercDebuffTick();assert.equal(player.hp,hp-5);
const once=player.hp;mercDebuffTick();assert.equal(player.hp,once);player.hp=2;gameNow+=1000;mercDebuffTick();assert.equal(player.hp,1);
player.buffs.good={until:gameNow+10000};m.skills=['purify','','',''];assert(mercCast('purify',mon));assert(!mercNegative(player).poison);assert(player.buffs.good);
gameNow+=13000;assert(!mercCast('purify',mon));
mon.id='frostWitch';const before=calcStats().atkMs;mercEnemyStatus(mon,true,30,player);assert.equal(calcStats().atkMs,before*1.2);
mercEnemyStatus(mon,true,30,m);assert(mercNegative(m).slow);m.skills=['cleanse','','',''];assert(mercCast('cleanse',mon));assert(!mercNegative(m).slow);
gameNow+=4000;assert.equal(calcStats().atkMs,before);
mon.id='venomSpider';mercEnemyStatus(mon,true,20,m);player.loc={type:'town',id:'talking'};mercDebuffTick();assert(!mercNegative(m).poison);
SIM_MODE=true;mercEnemyStatus(mon,true,20,player);assert(!mercNegative(player).poison);SIM_MODE=false;
// 真正monsterAttack路徑：強制魔法命中玩家；傭兵全盾擋下時不附毒。
({m,mon}=setup());mercEnemyAttackOriginal=mercEnemyAttack;mercEnemyAttack=()=>false;chance=()=>true;monsterAttack(calcStats(),mon);assert(mercNegative(player).poison);mercEnemyAttack=mercEnemyAttackOriginal;
mercState(m).buffs.shield={power:9999,until:gameNow+10000};mercTakeDamageOriginal=mercTakeDamage;chance=()=>false;
mercEnemyStatus(mon,true,mercTakeDamage(20),m);assert(!mercNegative(m).poison);
// 所有距離用傭兵座標、牆擋、近戰／弓／魔法不同；不夠距離不扣MP不進CD。
({m,mon}=setup());scene={grid:Array.from({length:20},()=>Array(20).fill(0)),mw:20,mh:20,pl:{x:2,y:2,rx:2,ry:2},mons:[{inst:mon,x:8,y:2,rx:8,ry:2}],mercenary:{owner:m,rx:2,ry:2,path:[],dir:'right'}};
assert(!mercInRange(mon,1));assert(!mercInRange(mon,4));assert(mercInRange(mon,8));scene.grid[2][5]=1;assert(!mercInRange(mon,8));scene.grid[2][5]=0;
m.skills=['heavy','firebolt','',''];const mp=m.mp;assert(!mercCast('heavy',mon));assert(!mercCast('firebolt',mon));assert.equal(m.mp,mp);assert(!m.cds.heavy);
scene.mercenary.rx=5;assert(mercCast('firebolt',mon));assert(m.cds.firebolt>gameNow);
gameNow+=1000;scene.mercenary.rx=7;assert(mercCast('heavy',mon));
// 追到合法攻擊格，使用真正findPath；不能停在距離外卻一直重找同一個鄰格。
m.skills=['heavy','','',''];scene.mercenary.rx=2;scene.mercenary.ry=2;inHuntZone=()=>true;
for(let i=0;i<80;i++){gameNow+=100;sceneMercTick(100);}assert(mercInRange(mon,1));assert(scene.mercenary.rx<8);
// 四格後排的急救優先，平血多怪時群攻優先，無目標搜尋期間仍能治療。
({m,mon}=setup());m.skills=['firebolt','might','heal','purify'];player.hp=1;assert.equal(mercSkillOrder(m)[0],'heal');mercTick(100);assert(m.cds.heal>gameNow);assert(!m.cds.firebolt);
({m,mon}=setup());m.skills=['heavy','nova','',''];hunt.mobs.push({...mon});assert.equal(mercSkillOrder(m)[0],'nova');
player.hp=1;m.skills=['heal','','',''];hunt.state='search';mercTick(100);assert(m.cds.heal>gameNow);
// 場景群攻忽略範圍外目標，持續DoT不因目標換掉而消失。
({m,mon}=setup());const far={...mon},near={...mon};hunt.mobs=[mon,far,near];m.skills=['nova','','',''];
scene={grid:Array.from({length:20},()=>Array(20).fill(0)),pl:{rx:1,ry:1},mons:[{inst:mon,rx:2,ry:1},{inst:far,rx:15,ry:1},{inst:near,rx:3,ry:1}],mercenary:{owner:m,rx:1,ry:1,path:[]}};
assert(mercCast('nova',mon));assert(mon.hp<100000&&near.hp<100000);assert.equal(far.hp,100000);
assert(mercStatusText(m).includes('烈焰新星：12秒'));gameNow+=12000;assert(mercStatusText(m).includes('烈焰新星：就緒'));
const hpNear=mon.hp;hunt.mon=far;m.skills=['firebolt','','',''];mercRuntime.delete(m);mercTick(100);assert(mon.hp<hpNear);assert(m.cds.firebolt>gameNow);assert.equal(far.hp,100000);
m.equip.weapon={id:'shortBow',ench:0};assert.equal(mercWeaponRange(m),8);delete m.equip.weapon;assert.equal(mercWeaponRange(m),1);
SIM_MODE=true;assert.equal(mercActive(),null);SIM_MODE=false;
console.log('PASS：獨立緩速衰弱、命中狀態／毒傷下限／淨化／過期／回村／SIM、真實敵方攻擊、射程與牆擋／不扣魔、真實尋路接敵、救命／群攻／搜尋治療、群攻範圍及即時冷卻。');
`,ctx);

// 每種召喚物與特效用原生Canvas實際繪製，保存可檢視的動畫接觸表。
const runtime=path.join(process.env.USERPROFILE,'.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules');
const {createCanvas}=require(path.join(runtime,'@napi-rs/canvas'));
const canvas=createCanvas(900,660),g=canvas.getContext('2d');ctx.paint=g;
g.fillStyle='#17202d';g.fillRect(0,0,900,660);
vm.runInContext(`
const ids=MERC_RUNE_ROWS.summon.map(x=>x[0]);
ids.forEach((id,i)=>{for(let f=0;f<4;f++){const x=90+(i%3)*300+f*58,y=75+Math.floor(i/3)*100;mercDrawSummon(paint,id,x,y,100+f*150,f===2);}paint.fillStyle='#f6e9cf';paint.font='14px sans-serif';paint.fillText(id,30+(i%3)*300,110+Math.floor(i/3)*100);});
({m,mon}=setup());scene={pl:{rx:3,ry:3},mons:[{inst:mon,rx:6,ry:3}],mercenary:{owner:m,rx:3,ry:3,path:[]}};
for(const [i,id]of ['firebolt','frost','lightning','heavy','heal','shield','poison','star'].entries()){
 const r=mercState(m);r.vfx=[];mercSkillVfx(id,mon);gameNow+=250;
 paint.save();paint.translate((i%4)*220,330+Math.floor(i/4)*160);sceneDrawMercEffects(paint,3*TILE,3*TILE,m,scene.mercenary);paint.restore();
}
`,ctx);
fs.writeFileSync(path.join(__dirname,'mercenary-skills-preview.png'),canvas.toBuffer('image/png'));
console.log('PASS：9款原創召喚物四階段與8組實際技能Canvas渲染，預覽 mercenary-skills-preview.png。');
