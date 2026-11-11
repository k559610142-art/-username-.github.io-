// 龍騎士／幻術師／戰士 support, debuff and passive skills (ids from data/extra-class-skills.js).
// Numbers come from Server_Game_2.jar: skill/skillmode/* (MIRROR_IMAGE dodge+5, ILLUSION_AVATAR dmg+10, AWAKEN_ANTHARAS AC−3,
// AWAKEN_VALAKAS hit+5, ILLUSION_LICH SP+2, INSIGHT stats+1, PANIC stats−1, GIGANTIC maxHP×level/2%, PHANTASM sleep, DESPERADO stun,
// THUNDER_GRAB stun, BONE_BREAK stun 1/2, TOMAHAWK level/2+6 per second, MIND_BREAK SP×3.8+5), L1SkillUse (護衛毀滅 AC+10,
// 驚悚死神 str/int−3, 幻覺：歐吉 dmg+4 hit+4, 幻覺：鑽石高崙 AC−8), L1AttackList (龍之護鎧 −5, 耐力 −2 damage),
// MprExecutor (專注 MP+2), L1AttackPc (燃燒擊砍 +10, 粉碎 17% +max(2,lv−43), 狂暴 2% +2×, 護甲身軀 −AC/10),
// L1AttackNpc (泰坦 10% counter at HP ≤ 40%), L1PcInstance.receiveDamage (致命身軀 23% counter).
// Durations, costs, range and probability: DB `skills`. This web version has no hit roll or monster AC, so hit／AC-on-target
// effects (護衛毀滅, 恐懼無助, 驚悚死神, 恐慌, 覺醒：巴拉卡斯 hit) only show their status.
const ClassBuffs=(()=>{
 const sk=id=>playerSkillData.skills[id];
 const buffs=new Map(),cooldowns=new Map(),debuffs=new WeakMap();let owner=null,gigantic=0,cubes=[],tomahawks=[];
 const now=()=>movementTime();
 const knows=id=>OwnedInventory.owner===window.activeCharacterId&&OwnedInventory.skills.ids.includes(id);
 const on=id=>(buffs.get(id)||0)>now();
 const level=()=>window.activeCharacterLevel||1;
 const say=t=>{document.querySelector('#log').textContent=t;return false;};
 const SELF={181:1,182:1,185:1,186:1,190:1,191:1,194:1,195:1,201:1,204:1,206:1,209:1,211:1,213:1,214:1,216:1,218:1,219:1,226:1};
 const TARGET={183:1,188:1,193:1,202:1,212:1,217:1,228:1,230:1};
 const ATTACK={187:1,207:1,229:1};
 const AREA={205:1,210:1,215:1,220:1,225:1};
 const PASSIVE={233:1,234:1,235:1,236:1,237:1,238:1,239:1};
 const handles=id=>!!(SELF[id]||TARGET[id]||ATTACK[id]||AREA[id]||PASSIVE[id]);

 // ---- stat hooks (db-game-rules / native-combat-rules / player-class-stats / island-combat / island-npc-ai) ----
 function damageBonus(ranged){return ranged?0:(on(204)?4:0)+(on(219)?10:0);}
 function reduction(){let n=(on(181)?5:0)+(on(211)?2:0);if(knows(236)){const ac=window.NativeCombatRules?.armorClass?.()??0;n+=Math.max(0,Math.trunc(-ac/10));}return n;}
 function ac(){return (on(185)?-3:0)+(on(214)?-8:0);}
 function dodge(){return on(201)?5:0;}
 function mpr(){return on(206)?2:0;}
 function sp(){return on(209)?2:0;}
 function stats(){const v=on(216)?1:0;return {str:v,con:v,dex:v,wis:v,int:v};}
 function maxHp(){return gigantic;}
 // Extra damage on a melee／bow hit.
 function onHit(mob,ranged){
  let add=0;
  if(!ranged&&on(182)){add+=10;buffs.delete(182);}
  if(!ranged){const bonus=Math.max(2,2+level()-45);
   if(knows(233)&&Math.random()<.17){add+=bonus;IslandMonsters.playEffect(12487,mob.x,mob.y,now());}
   if(knows(234)&&Math.random()<.02){add+=bonus*2;IslandMonsters.playEffect(12489,mob.x,mob.y,now());}}
  return add;
 }
 // Damage a monster is about to deal to the player; returns what is left.
 function onHurt(mob,amount,skill){
  if(amount<=0)return amount;
  const titan=skill?(knows(239)?239:0):Math.max(Math.abs(mob.x-worldX),Math.abs(mob.y-worldY))>1?(knows(238)?238:0):(knows(237)?237:0);
  if(titan&&hp<=Math.trunc(maxHp/100)*40&&Math.random()<.1){IslandMonsters.damage(mob,amount);IslandMonsters.playEffect(12555,worldX,worldY,now());return 0;}
  if(on(191)&&Math.random()<.23){IslandMonsters.damage(mob,amount);IslandMonsters.playEffect(sk(191).gfx,worldX,worldY,now());}
  return amount;
 }
 // Monster AI checks (island-npc-ai): silenced monsters only melee, rooted monsters do not walk.
 const silenced=mob=>(debuffs.get(mob)?.[202]||0)>now();
 const rooted=mob=>(debuffs.get(mob)?.[228]||0)>now();
 function stun(mob,ms){mob.ready=Math.max(mob.ready||0,now()+ms);}
 function mark(mob,id,ms){let d=debuffs.get(mob);if(!d){d={};debuffs.set(mob,d);}d[id]=now()+ms;}
 // Extra effect after an attack skill cast by player-skills.js.
 function afterCast(id,mob){
  if(!mob?.hp)return;
  if(id===192&&Math.random()<.6)stun(mob,4000);
  if(id===208&&Math.random()<.5)stun(mob,sk(208).duration*1000);
 }

 // ---- casting ----
 function ready(id,skill){const t=now();if(t<(cooldowns.get(id)||0))return false;cooldowns.set(id,t+(skill.reuse||0));return true;}
 function pay(skill){return OwnedInventory.castCost(skill);}
 function targetInRange(skill){const mob=IslandMonsters.target,range=skill.range>0?skill.range:3;
  return mob?.hp&&Math.max(Math.abs(mob.x-worldX),Math.abs(mob.y-worldY))<=range&&IslandCombat.clearShot(worldX,worldY,mob.x,mob.y)?mob:null;}
 function cast(id){
  const skill=sk(id);if(!skill||!knows(id))return false;
  if(PASSIVE[id])return say('「'+skill.name+'」是被動技能，學會後自動生效。');
  if(CharacterActions.dead||window.gameFlowState!=='playing'||characterMovementBlocked()||movementAnimating()||!TransformCards.canCast)return false;
  if(now()<(cooldowns.get(id)||0))return false;
  let mob=null;
  if(TARGET[id]||ATTACK[id]){mob=targetInRange(skill);if(!mob)return say('請先選擇範圍內的目標。');}
  if(!pay(skill))return say('魔力、體力或材料不足。');
  if(!CharacterActions.play('skill'))return false;
  ready(id,skill);const t=now(),dur=(skill.duration||0)*1000;
  IslandMonsters.playEffect(skill.gfx,mob?mob.x:worldX,mob?mob.y:worldY,t);
  if(SELF[id]){
   buffs.set(id,t+dur);
   if(id===186){window.activePotionBuffs=window.activePotionBuffs||{};window.activePotionBuffs.brave=Math.max(Number(window.activePotionBuffs.brave)||0,Date.now()+dur);window.NativePotions?.sync();}
   if(id===226){const base=window.activeVitalGrowth?.maxHp||maxHp;gigantic=Math.trunc(base*(level()/2)/100);DBGameRules.syncVitals();window.stats?.();}
  }
  if(TARGET[id]){
   mark(mob,id,dur);
   if(id===212)stun(mob,dur);               // 幻想: sleep
   if(id===230)stun(mob,dur);               // 亡命之徒: stun
  }
  if(id===187){const p=PlayerClassStats.read(),max=Math.max(1,p.weapon?.damage[0]||2);for(let i=0;i<3;i++)IslandMonsters.damage(mob,1+Math.floor(Math.random()*max)+p.meleeBonus+damageBonus(false));}
  if(id===207){const p=PlayerClassStats.read();IslandMonsters.damage(mob,Math.max(1,Math.round(5+(p.sp||0)*3.8)));}
  if(id===229&&Math.random()<.9)tomahawks.push({mob,until:t+dur,next:t+1000,dmg:Math.trunc(level()/2)+6});
  if(id===205)cubes.push({x:worldX,y:worldY,until:t+dur,next:t+4000,dmg:skill.damage[0]||10,r:skill.area||3});
  if(AREA[id]&&id!==205)for(const m of IslandMonsters.around(worldX,worldY,skill.area||3))IslandMonsters.playEffect(skill.gfx,m.x,m.y,t);
  return true;
 }

 // ---- timers, reset and status bar ----
 const bar=document.createElement('div');bar.className='class-buff-bar';bar.hidden=true;
 const style=document.createElement('style');style.textContent='.class-buff-bar{position:absolute;left:8px;top:96px;z-index:30;display:flex;flex-wrap:wrap;gap:3px;max-width:240px;pointer-events:none}.class-buff-bar img{width:26px;height:26px;border:1px solid #b79b5a;border-radius:3px;background:#0b1410}';
 document.head.append(style);document.querySelector('.game')?.append(bar);
 function reset(){if(gigantic){gigantic=0;DBGameRules.syncVitals();window.stats?.();}buffs.clear();cooldowns.clear();cubes=[];tomahawks=[];}
 let barKey='';
 function tick(){
  const active=window.gameFlowState==='playing'?window.activeCharacterId:null;
  if(active!==owner){reset();owner=active;}
  if(!active)return;
  if(CharacterActions.dead&&buffs.size)reset();
  const t=now();
  if(gigantic&&!on(226)){gigantic=0;DBGameRules.syncVitals();window.stats?.();}
  for(const c of cubes)if(t>=c.next&&t<c.until){c.next+=4000;for(const m of IslandMonsters.around(c.x,c.y,c.r))IslandMonsters.damage(m,c.dmg);}
  cubes=cubes.filter(c=>t<c.until);
  for(const h of tomahawks)if(t>=h.next&&t<h.until&&h.mob.hp){h.next+=1000;IslandMonsters.damage(h.mob,h.dmg);}
  tomahawks=tomahawks.filter(h=>t<h.until&&h.mob.hp);
  const ids=[...buffs.keys()].filter(on);const key=ids.join(',');
  if(key!==barKey){barKey=key;bar.replaceChildren(...ids.map(id=>{const img=document.createElement('img');img.alt=img.title=sk(id).name;img.src=interfaceCatalog.skills.find(s=>s.id===id)?.icon||'';return img;}));}
  bar.hidden=!ids.length;
 }
 setInterval(tick,250);
 return {handles,cast,afterCast,damageBonus,reduction,ac,dodge,mpr,sp,stats,maxHp,onHit,onHurt,silenced,rooted,active:id=>on(id)};
})();window.ClassBuffs=ClassBuffs;
