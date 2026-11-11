// Support, debuff, control and passive skills for all seven classes (attack／heal skills stay in player-skills.js).
// Numbers come from Server_Game_2.jar:
//  skillmode/*: MIRROR_IMAGE dodge+5, ILLUSION_AVATAR dmg+10, AWAKEN_ANTHARAS AC−3, AWAKEN_VALAKAS hit+5, ILLUSION_LICH SP+2,
//   INSIGHT stats+1, PANIC stats−1, GIGANTIC maxHP×level/2%, PHANTASM sleep, DESPERADO stun, THUNDER_GRAB stun, BONE_BREAK stun 1/2,
//   TOMAHAWK level/2+6 per second, MIND_BREAK SP×3.8+5, HASTE, BLOODLUST brave, AQUA_PROTECTER, FOE_SLAYER.
//  L1SkillUse: 通暢氣脈術 dex+5, 體魄強健術 str+5, 狂暴術 AC+10, 弱化術 −5 dmg, 疾病術 −6 dmg, 灼熱武器 dmg+5 hit+5,
//   閃亮之盾 AC−8, 魔法防禦 MR+10, 淨化精神 wis+3, 火焰武器 dmg+4, 風之神射 bow hit+6, 大地防護 AC−6, 暴風之眼 bow+2,
//   烈炎武器 dmg+6, 暴風神射 bow+5, 鋼鐵防護 AC−10, 風之疾走／神聖疾走 brave, 地面障礙 move stop, 護衛毀滅 AC+10,
//   驚悚死神 str/int−3, 幻覺：歐吉 dmg+4 hit+4, 幻覺：鑽石高崙 AC−8.
//  L1AttackList (龍之護鎧 −5, 耐力 −2 damage), MprExecutor (專注 MP+2), L1AttackPc (燃燒擊砍 +10, 粉碎 17% +max(2,lv−43),
//   狂暴 2% +2×, 護甲身軀 −AC/10), L1AttackNpc (泰坦 10% counter at HP ≤ 40%), L1PcInstance.receiveDamage (致命身軀 23% counter).
//  Common L1J values where the jar keeps them in shared code: 保護罩 AC−2, 鎧甲護持 AC−3, 神聖武器 dmg+1, 擬似魔法武器 dmg+2,
//   祝福魔法武器 dmg+2, 狂暴術 dmg+5, 勇猛意志 dmg+5, 冥想術 MP+5, 聖結界 half damage, 靈魂昇華 max HP／MP +20%,
//   增幅防禦 reduction (lv−50)/5+1, 反擊屏障 DB probability 25%, 毒咒 5 every 3 s.
// Durations, costs, materials, range, area and cooldowns: DB `skills`.
// This web version has no hit roll, monster AC or elements, so effects that only change those show their status only.
const ClassBuffs=(()=>{
 const sk=id=>playerSkillData.skills[id];
 const buffs=new Map(),cooldowns=new Map(),debuffs=new WeakMap();let owner=null,cubes=[],dots=[],barrierSet=false;
 const now=()=>movementTime();
 const knows=id=>OwnedInventory.owner===window.activeCharacterId&&OwnedInventory.skills.ids.includes(id);
 const on=id=>(buffs.get(id)||0)>now();
 const level=()=>window.activeCharacterLevel||1;
 const say=t=>{document.querySelector('#log').textContent=t;return false;};
 // Self buffs: ac, red(uction), dmg (melee), bow (ranged dmg), dodge, mpr, mr, sp, stats, speed, plus flags handled in code.
 const SELF={
  2:{},3:{ac:-2},8:{dmg:1},12:{dmg:2},14:{},21:{ac:-3},26:{stats:{dex:5}},31:{counterMagic:1},32:{mpr:5},42:{stats:{str:5}},
  43:{speed:'haste'},48:{dmg:2},52:{speed:'brave'},54:{speed:'haste'},55:{ac:10,dmg:5},68:{immune:1},78:{barrier:1},79:{spirit:1},
  88:{red:'reductionArmor'},89:{},90:{},91:{counter:.25},114:{dmg:5},115:{ac:-8},117:{dmg:5},119:{},
  129:{mr:10},134:{},137:{stats:{wis:3}},138:{},147:{},148:{dmg:4},149:{},150:{speed:'elfBrave'},151:{ac:-6},155:{},156:{bow:2},
  158:{},159:{},160:{dodge:5},163:{dmg:6},166:{bow:5},168:{ac:-10},
  181:{red:5},182:{burning:1},185:{ac:-3},186:{speed:'brave'},190:{},191:{mortal:1},194:{},195:{},
  201:{dodge:5},204:{dmg:4},206:{mpr:2},209:{sp:2},211:{red:2},213:{},214:{ac:-8},216:{stats:{str:1,con:1,dex:1,wis:1,int:1}},
  218:{},219:{dmg:10},226:{gigantic:1},
 };
 // Monster debuffs: mobDmg (less damage dealt), stun／sleep, silence, root, slow, dot.
 const TARGET={
  11:{dot:[5,3000]},20:{},29:{slow:1},33:{stun:1},40:{},47:{mobDmg:5},56:{mobDmg:6},64:{silence:1},66:{stun:1},113:{},
  133:{},152:{root:1},153:{},157:{stun:1},167:{slow:1},
  183:{},188:{},193:{},202:{silence:1},212:{stun:1},217:{},228:{root:1},230:{stun:1},
 };
 const AREA_TARGET={76:{slow:1},161:{silence:1}};
 const ATTACK={187:1,207:1,229:1};
 const AREA={205:1,210:1,215:1,220:1,225:1};
 const PASSIVE={233:1,234:1,235:1,236:1,237:1,238:1,239:1};
 // Utility skills (skillmode BODY_TO_MIND mp+2, BLOODY_SOUL mp+15, TELEPORT／MASS_TELEPORT, TELEPORT_TO_MATHER, CURE_POISON,
 // REMOVE_CURSE; L1J 魔力奪取 5–14 MP, 起死回生術 kills undead at 50%). Summon kinds go to data/summons.js.
 // `need` = needs another system and only explains why.
 const UTIL={5:'teleport',69:'teleport',131:'mother',9:'cure',37:'purify',44:'purify',153:'purify',23:'sense',18:'turnUndead',39:'drain',
  130:'mp2',146:'mp15',60:'invisible',67:'poly',13:'none',27:'none',71:'none',
  36:'tame',41:'zombie',51:'summon',145:'release',154:'elemental',162:'greater',61:'need:隊友',75:'need:隊友',116:'need:血盟',118:'need:血盟',73:'need:製作'};
 const UTIL_TARGET={18:1,23:1,39:1,27:1,71:1,153:1};
 const handles=id=>!!(SELF[id]||TARGET[id]||AREA_TARGET[id]||ATTACK[id]||AREA[id]||PASSIVE[id]||UTIL[id]);
 let invisible=false;
 const active=()=>[...buffs.keys()].filter(on).map(id=>SELF[id]||{});
 const sum=key=>active().reduce((n,e)=>n+(typeof e[key]==='number'?e[key]:0),0);

 // ---- stat hooks (db-game-rules / native-combat-rules / player-class-stats / island-combat / island-npc-ai) ----
 function damageBonus(ranged){return ranged?sum('bow'):sum('dmg');}
 function reduction(){let n=sum('red');if(on(88))n+=Math.max(1,Math.trunc((level()-50)/5)+1);
  if(knows(236)){const ac=window.NativeCombatRules?.armorClass?.()??0;n+=Math.max(0,Math.trunc(-ac/10));}return n;}
 function ac(){return sum('ac');}
 function dodge(){return sum('dodge');}
 function mpr(){return sum('mpr');}
 function mr(){return sum('mr');}
 function sp(){return sum('sp');}
 function stats(){const out={};for(const e of active())for(const [k,v]of Object.entries(e.stats||{}))out[k]=(out[k]||0)+v;return out;}
 function base(){return window.activeVitalGrowth||{maxHp:0,maxMp:0};}
 function maxHpBonus(){return (on(226)?Math.trunc(base().maxHp*(level()/2)/100):0)+(on(79)?Math.trunc(base().maxHp/5):0);}
 function maxMpBonus(){return on(79)?Math.trunc(base().maxMp/5):0;}
 // Extra damage on a melee／bow hit.
 function onHit(mob,ranged){
  let add=0;invisible=false;
  if(!ranged&&on(182)){add+=10;buffs.delete(182);}
  if(!ranged){const bonus=Math.max(2,2+level()-45);
   if(knows(233)&&Math.random()<.17){add+=bonus;IslandMonsters.playEffect(12487,mob.x,mob.y,now());}
   if(knows(234)&&Math.random()<.02){add+=bonus*2;IslandMonsters.playEffect(12489,mob.x,mob.y,now());}}
  return add;
 }
 // Damage a monster is about to deal to the player; returns what is left.
 function onHurt(mob,amount,skill){
  if(amount<=0)return amount;
  const d=debuffs.get(mob)||{},t=now();
  for(const [id,until]of Object.entries(d))if(until>t&&TARGET[id]?.mobDmg)amount=Math.max(0,amount-TARGET[id].mobDmg);
  if(amount<=0)return 0;
  if(on(78))return 0;
  if(skill&&on(31)){buffs.delete(31);IslandMonsters.playEffect(sk(31).gfx,worldX,worldY,t);return 0;}
  const melee=!skill&&Math.max(Math.abs(mob.x-worldX),Math.abs(mob.y-worldY))<=1;
  if(melee&&on(91)&&Math.random()<.25){IslandMonsters.damage(mob,amount);IslandMonsters.playEffect(sk(91).gfx,worldX,worldY,t);return 0;}
  const titan=skill?(knows(239)?239:0):!melee?(knows(238)?238:0):(knows(237)?237:0);
  if(titan&&hp<=Math.trunc(maxHp/100)*40&&Math.random()<.1){IslandMonsters.damage(mob,amount);IslandMonsters.playEffect(12555,worldX,worldY,t);return 0;}
  if(on(191)&&Math.random()<.23){IslandMonsters.damage(mob,amount);IslandMonsters.playEffect(sk(191).gfx,worldX,worldY,t);}
  if(on(68))amount=Math.trunc(amount/2);
  return amount;
 }
 // Monster AI checks (island-npc-ai).
 const has=(mob,flag)=>{const d=debuffs.get(mob);if(!d)return false;const t=now();return Object.entries(d).some(([id,until])=>until>t&&(TARGET[id]||AREA_TARGET[id])?.[flag]);};
 const silenced=mob=>has(mob,'silence');
 const rooted=mob=>has(mob,'root');
 const slowed=mob=>has(mob,'slow');
 function stun(mob,ms){mob.ready=Math.max(mob.ready||0,now()+ms);}
 function mark(mob,id,ms){let d=debuffs.get(mob);if(!d){d={};debuffs.set(mob,d);}d[id]=now()+ms;}
 // Extra effect after an attack skill cast by player-skills.js.
 function afterCast(id,mob){
  if(!mob?.hp)return;
  if(id===192&&Math.random()<.6)stun(mob,4000);
  if(id===208&&Math.random()<.5)stun(mob,sk(208).duration*1000);
 }
 function speed(kind,until){window.activePotionBuffs=window.activePotionBuffs||{};window.activePotionBuffs[kind]=Math.max(Number(window.activePotionBuffs[kind])||0,until);window.NativePotions?.sync();}
 function vitals(){DBGameRules.syncVitals();window.stats?.();}

 // ---- casting ----
 function targetInRange(skill){const mob=IslandMonsters.target,range=skill.range>0?skill.range:3;
  return mob?.hp&&Math.max(Math.abs(mob.x-worldX),Math.abs(mob.y-worldY))<=range&&IslandCombat.clearShot(worldX,worldY,mob.x,mob.y)?mob:null;}
 function applyTarget(mob,id,dur,t){
  const e=TARGET[id]||AREA_TARGET[id];mark(mob,id,dur);
  if(e.stun)stun(mob,dur);
  if(e.dot)dots.push({mob,until:t+dur,next:t+e.dot[1],every:e.dot[1],dmg:e.dot[0]});
 }
 // Random passable cell within 200 (same rule as the teleport scroll), honouring the map's teleportable flag.
 function landing(){
  const rule=TeleportMapRules[window.activeMapId||0];if(rule&&!rule.teleportable)return null;
  const l=Math.max(island.startX,worldX-200),r=Math.min(island.startX+island.width-1,worldX+200),tp=Math.max(island.startY,worldY-200),b=Math.min(island.startY+island.height-1,worldY+200);
  for(let i=0;i<1024;i++){const x=l+Math.floor(Math.random()*(r-l+1)),y=tp+Math.floor(Math.random()*(b-tp+1));if(TeleportScrolls.canLand(x,y))return {x,y};}
  return null;
 }
 function utility(id,skill){
  const kind=UTIL[id];
  if(kind.startsWith('need:'))return say('「'+skill.name+'」需要'+kind.slice(5)+'系統，網頁版目前還沒有。');
  if(kind==='teleport'&&!landing())return say('這個地區無法使用瞬間移動。');
  const summon=['summon','tame','zombie','elemental','greater','release'].includes(kind)?window.Summons?.prepare(kind,skill):null;
  if(typeof summon==='string')return say(summon);
  if(kind==='mother'&&!WorldMaps.has(4))return false;
  let mob=null;if(UTIL_TARGET[id]){mob=targetInRange(skill);if(!mob)return say('請先選擇範圍內的目標。');}
  if(!OwnedInventory.castCost(skill))return say('魔力、體力或材料不足。');
  if(!CharacterActions.play('skill'))return false;
  const t=now();cooldowns.set(id,t+(skill.reuse||0));invisible=kind==='invisible';
  IslandMonsters.playEffect(skill.gfx,mob?mob.x:worldX,mob?mob.y:worldY,t);
  if(kind==='teleport'){const p=landing();if(p&&OwnedInventory.applyChange(OwnedInventory.snapshot,{position:p})){WorldMaps.arrived();window.DungeonPortals?.settle();IslandMonsters.playEffect(169,worldX,worldY,now());}}
  if(kind==='mother')WorldMaps.travel(4,33051,32337).then(ok=>{if(ok)window.DungeonPortals?.settle();});
  if(kind==='cure'||kind==='purify'){if(window.playerItemState){delete playerItemState.poison;delete playerItemState.poisoned;}if(kind==='purify')window.IslandNpcAi?.cure?.();}
  if(kind==='sense')say(mob.spawn.npc.name+'　體力 '+mob.hp+' / '+mob.spawn.npc.hp+'　等級 '+mob.spawn.npc.level);
  if(kind==='turnUndead'){const u=mob.spawn.npc.raw?.undead??mob.spawn.npc.undead;if(u===1&&Math.random()<.5)IslandMonsters.damage(mob,mob.hp);else say('沒有效果。');}
  if(kind==='drain'){const gain=Math.min(5+Math.floor(Math.random()*10),Math.max(0,mob.mp??99));if(mob.mp!==undefined)mob.mp-=gain;mp=Math.min(maxMp,mp+gain);window.stats?.();}
  if(kind==='mp2'||kind==='mp15'){mp=Math.min(maxMp,mp+(kind==='mp2'?2:15));window.stats?.();}
  if(kind==='poly')window.openGameCatalog?.('transforms');
  if(typeof summon==='function')summon();
  if(kind==='none')say('「'+skill.name+'」在這個網頁版沒有可作用的對象。');
  return true;
 }
 function cast(id){
  const skill=sk(id);if(!skill||!knows(id))return false;
  if(PASSIVE[id])return say('「'+skill.name+'」是被動技能，學會後自動生效。');
  if(UTIL[id]){if(CharacterActions.dead||window.gameFlowState!=='playing'||characterMovementBlocked()||movementAnimating()||!TransformCards.canCast||now()<(cooldowns.get(id)||0))return false;return utility(id,skill);}
  invisible=false;
  if(CharacterActions.dead||window.gameFlowState!=='playing'||characterMovementBlocked()||movementAnimating()||!TransformCards.canCast)return false;
  if(now()<(cooldowns.get(id)||0))return false;
  let mob=null;
  if(TARGET[id]||ATTACK[id]){mob=targetInRange(skill);if(!mob)return say('請先選擇範圍內的目標。');}
  if(!OwnedInventory.castCost(skill))return say('魔力、體力或材料不足。');
  if(!CharacterActions.play('skill'))return false;
  const t=now(),dur=(skill.duration||0)*1000;cooldowns.set(id,t+(skill.reuse||0));
  IslandMonsters.playEffect(skill.gfx,mob?mob.x:worldX,mob?mob.y:worldY,t);
  if(SELF[id]){
   const e=SELF[id];buffs.set(id,t+dur);
   if(e.speed)speed(e.speed,Date.now()+dur);
   if(e.barrier&&window.playerItemState&&!playerItemState.absoluteBarrier){playerItemState.absoluteBarrier=true;barrierSet=true;}
   if(e.gigantic||e.spirit)vitals();
  }
  if(TARGET[id])applyTarget(mob,id,dur,t);
  if(AREA_TARGET[id])for(const m of IslandMonsters.around(worldX,worldY,skill.area||3)){applyTarget(m,id,dur,t);IslandMonsters.playEffect(skill.gfx,m.x,m.y,t);}
  if(id===187){const p=PlayerClassStats.read(),max=Math.max(1,p.weapon?.damage[0]||2);for(let i=0;i<3;i++)IslandMonsters.damage(mob,1+Math.floor(Math.random()*max)+p.meleeBonus+damageBonus(false));}
  if(id===207){const p=PlayerClassStats.read();IslandMonsters.damage(mob,Math.max(1,Math.round(5+(p.sp||0)*3.8)));}
  if(id===229&&Math.random()<.9)dots.push({mob,until:t+dur,next:t+1000,every:1000,dmg:Math.trunc(level()/2)+6});
  if(id===205)cubes.push({x:worldX,y:worldY,until:t+dur,next:t+4000,dmg:skill.damage[0]||10,r:skill.area||3});
  if(AREA[id]&&id!==205)for(const m of IslandMonsters.around(worldX,worldY,skill.area||3))IslandMonsters.playEffect(skill.gfx,m.x,m.y,t);
  return true;
 }

 // ---- timers, reset and status bar ----
 const bar=document.createElement('div');bar.className='class-buff-bar';bar.hidden=true;
 const style=document.createElement('style');style.textContent='.class-buff-bar{position:absolute;left:8px;top:96px;z-index:30;display:flex;flex-wrap:wrap;gap:3px;max-width:240px;pointer-events:none}.class-buff-bar img{width:26px;height:26px;border:1px solid #b79b5a;border-radius:3px;background:#0b1410}';
 document.head.append(style);document.querySelector('.game')?.append(bar);
 let vitalsKey='';
 function reset(){const hadVitals=on(226)||on(79);buffs.clear();cooldowns.clear();cubes=[];dots=[];invisible=false;
  if(barrierSet&&window.playerItemState){playerItemState.absoluteBarrier=false;}barrierSet=false;if(hadVitals)vitals();}
 let barKey='';
 function tick(){
  const current=window.gameFlowState==='playing'?window.activeCharacterId:null;
  if(current!==owner){reset();owner=current;}
  if(!current)return;
  if(CharacterActions.dead&&buffs.size)reset();
  const t=now();
  if(barrierSet&&!on(78)){if(window.playerItemState)playerItemState.absoluteBarrier=false;barrierSet=false;}
  const vk=(on(226)?'g':'')+(on(79)?'s':'');if(vk!==vitalsKey){vitalsKey=vk;vitals();}
  for(const c of cubes)if(t>=c.next&&t<c.until){c.next+=4000;for(const m of IslandMonsters.around(c.x,c.y,c.r))IslandMonsters.damage(m,c.dmg);}
  cubes=cubes.filter(c=>t<c.until);
  for(const h of dots)if(t>=h.next&&t<h.until&&h.mob.hp){h.next+=h.every;IslandMonsters.damage(h.mob,h.dmg);}
  dots=dots.filter(h=>t<h.until&&h.mob.hp);
  const ids=[...buffs.keys()].filter(on);const key=ids.join(',');
  if(key!==barKey){barKey=key;bar.replaceChildren(...ids.map(id=>{const img=document.createElement('img');img.alt=img.title=sk(id).name;img.src=interfaceCatalog.skills.find(s=>s.id===id)?.icon||'';return img;}));}
  bar.hidden=!ids.length;
 }
 setInterval(tick,250);
 return {handles,cast,afterCast,invisible:()=>invisible,reveal:()=>{invisible=false;},damageBonus,reduction,ac,dodge,mpr,mr,sp,stats,maxHp:maxHpBonus,maxMp:maxMpBonus,onHit,onHurt,silenced,rooted,slowed,active:id=>on(id)};
})();window.ClassBuffs=ClassBuffs;
