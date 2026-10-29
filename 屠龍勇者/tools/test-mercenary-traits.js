// 傭兵六職業特色（第224節）；隔離正式角色及連線。
const fs=require('fs'),path=require('path'),vm=require('vm'),assert=require('assert/strict');
const prefix=fs.readFileSync(path.join(__dirname,'test-mercenary.js'),'utf8').split('ctx.assert = assert;')[0];
const ctx=new Function('require','__dirname',prefix+'\nreturn ctx;')(require,__dirname);ctx.assert=assert;
vm.runInContext(`
SIM_MODE=false;createPlayer('特色隔離','knight',CLASSES.knight.base);player.loc={type:'zone',id:'island'};scene=null;
function mk(cls,skills=['','','','']){mercRuntime.delete(player.mercenary||{});const m=player.mercenary={cls,lv:49,hp:1,mp:1,active:true,dead:false,equip:{},skills,cds:{}};const st=mercStats(m);m.hp=st.hp;m.mp=st.mp;player.hp=calcStats().maxHp;player.mp=calcStats().maxMp;return m;}
const wolf=()=>({hp:100000,maxHp:100000,mr:47,ac:-37,dmg:[50,50]});
for(const k of Object.keys(MERC_CLASSES))assert(MERC_TRAITS[k]&&MERC_TRAITS[k].text,k);
// 契靈師：召喚×1.5、上限3隻；其他職業×1、上限2隻
let m=mk('spirit',['wolf','hawk','golem','thunderSpirit']);hunt={state:'fight',mon:wolf(),mobs:[]};hunt.mobs=[hunt.mon];
for(const id of m.skills){gameNow+=1100;m.mp=999;assert(mercCast(id,hunt.mon),id);}
let r=mercState(m);assert.equal(r.summons.length,3);assert.equal(r.summons.find(x=>x.id==='hawk').power,.8*1.5);
m=mk('war',['wolf','hawk','golem','']);hunt.mon=wolf();hunt.mobs=[hunt.mon];
for(const id of ['wolf','hawk','golem']){gameNow+=1100;m.mp=999;mercCast(id,hunt.mon);}
r=mercState(m);assert.equal(r.summons.length,2);assert.equal(r.summons[0].power,.8);
// 秘法使：魔法技能×1.3＋無視30%魔防；契靈師對照組
m=mk('arcane',['lightning','','','']);let mon=wolf();hunt.mon=mon;hunt.mobs=[mon];gameNow+=1100;mercCast('lightning',mon);
assert.equal(100000-mon.hp,Math.round(31*3*1.3*(1-47*.7/200)));
m=mk('spirit',['lightning','','','']);mon=wolf();hunt.mon=mon;hunt.mobs=[mon];gameNow+=1100;mercCast('lightning',mon);
assert.equal(100000-mon.hp,Math.round(27*3*(1-47/200)));
// 征戰者：物理技能×1.3；魔法技能不加
m=mk('war',['flurry','firebolt','','']);mon=wolf();hunt.mon=mon;hunt.mobs=[mon];gameNow+=1100;mercCast('flurry',mon);
assert.equal(100000-mon.hp,Math.round(26*3.5*1.3-37/5));
mon=wolf();hunt.mon=mon;hunt.mobs=[mon];gameNow+=1100;mercCast('firebolt',mon);assert.equal(100000-mon.hp,Math.round(19*2*(1-47/200)));
// 征戰者普攻：15%暴擊×1.5（固定亂數）
const realRandom=Math.random;m=mk("war");player.hunting=true;hunt.state="fight";let hits=[];
for(const v of [0.01,0.99]){Math.random=()=>v;mon=wolf();hunt.mon=mon;hunt.mobs=[mon];mercState(m).attackAt=0;mercState(m).skillAt=gameNow+99999;mercTick(16);hits.push(100000-mon.hp);}
Math.random=realRandom;assert.deepEqual(hits,[Math.round(26*1.5-37/5),Math.round(26-37/5)]);
// 荒野行者：閃避15%、攻速+20%、每秒回血5
m=mk('wild');let st=mercStats(m);assert.equal(st.dodge,.15);assert.equal(st.speed,1000);
m.hp=100;mercState(m).regenAt=0;player.hunting=false;mercTick(16);assert.equal(m.hp,105);
st=mercStats(mk('spirit'));assert.equal(st.dodge,0);assert.equal(st.speed,1200);
// 壁壘衛士：受傷−20%、怪物選中40%
m=mk('bulwark');Math.random=()=>.99;assert.equal(mercTakeDamage(104),Math.round((104-12/3)*.8));
Math.random=()=>.39;scene=null;assert(mercEnemyAttack(wolf()));m=mk('spirit');assert(!mercEnemyAttack(wolf()));Math.random=realRandom;
// 祈願使：治療×1.5、輔助增益持續+50%；護衛類不延長
m=mk('wish',['might','cover','','']);st=mercStats(m);assert.equal(st.heal,1.5);
gameNow+=1100;mercCast('might',hunt.mon);assert.equal(mercState(m).buffs.might.until-gameNow,12000*1.5);
gameNow+=1100;mercCast('cover',hunt.mon);assert.equal(mercState(m).buffs.cover.until-gameNow,8000);
m=mk('spirit',['might','','','']);gameNow+=1100;mercCast('might',hunt.mon);assert.equal(mercState(m).buffs.might.until-gameNow,12000);
// 管理頁顯示職業特色
m=mk('arcane');assert(renderMercenary().includes(MERC_TRAITS.arcane.text));
console.log('test-mercenary-traits OK');
`,ctx);
