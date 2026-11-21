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
// Combat uses effective target stats without modifying shared monster templates; effects expire or reset on character change.
const ClassBuffs=(()=>{
 const sk=id=>playerSkillData.skills[id];
 const buffs=new Map(),cooldowns=new Map();let debuffs=new WeakMap();let owner=null,cubes=[],dots=[],barrierSet=false;
 const now=()=>movementTime();
 const knows=id=>OwnedInventory.owner===window.activeCharacterId&&OwnedInventory.skills.ids.includes(id);
 const on=id=>owner===window.activeCharacterId&&(buffs.get(id)||0)>now();
 const level=()=>window.activeCharacterLevel||1;
 const say=t=>{document.querySelector('#log').textContent=t;return false;};
 // Self buffs: ac, red(uction), dmg (melee), bow (ranged dmg), dodge, mpr, mr, sp, stats, speed, plus flags handled in code.
 const SELF={
  2:{},3:{ac:-2},8:{dmg:1},12:{dmg:2},14:{},21:{ac:-3},26:{stats:{dex:5}},31:{counterMagic:1},32:{mpr:5},42:{stats:{str:5}},
  43:{speed:'haste'},48:{dmg:2,hit:5},52:{speed:'brave'},54:{speed:'haste'},55:{ac:10,dmg:5},68:{immune:1},78:{barrier:1},79:{spirit:1},
  88:{red:'reductionArmor'},89:{},90:{},91:{counter:.25},114:{dmg:5},115:{ac:-8},117:{dmg:5},119:{},
  129:{mr:10},134:{},137:{stats:{wis:3}},138:{},147:{},148:{dmg:4},149:{bowHit:6},150:{speed:'elfBrave'},151:{ac:-6},155:{},156:{bow:2,bowHit:2},
  158:{},159:{},160:{dodge:5},163:{dmg:6},166:{bow:5},168:{ac:-10},
  181:{red:5},182:{burning:1},185:{ac:-3,hit:5},186:{speed:'brave'},190:{},191:{mortal:1},194:{},195:{},
  201:{dodge:5},204:{dmg:4,hit:4},206:{mpr:2},209:{sp:2},211:{red:2},213:{},214:{ac:-8},216:{stats:{str:1,con:1,dex:1,wis:1,int:1}},
  218:{},219:{dmg:10},226:{gigantic:1},
  // 黑妖（2026-11-17 補學法術；L1J 常見數值）：附加劇毒觸發中毒、毒性抵抗阻止感染；影之防護 AC−3、行走加速＝加速、燃燒鬥志 dmg+3、
  //  雙重破壞 dmg+4、暗影閃避 閃避+5、暗影之牙 dmg+5、力量提升 str+2、敏捷提升 dex+2、迴避提升 閃避+5
  // 精靈魔法第 6 階（2026-11-17 補）：體能激發 AC−3、水之元氣 MP 回復+3、屬性之火 dmg+3、精準射擊 遠攻命中+6、烈焰之魂 dmg+5、能量激發 dmg+2
  169:{ac:-3},170:{mpr:3},171:{dmg:3},174:{bowHit:6},175:{dmg:5},176:{dmg:2},
  98:{},99:{ac:-3},101:{speed:'haste'},102:{dmg:3},104:{},105:{dmg:4},106:{dodge:5},107:{dmg:5},109:{stats:{str:2}},110:{stats:{dex:2}},111:{dodge:5},
 };
 // Monster debuffs: mobDmg (less damage dealt), stun／sleep, silence, root, slow, dot.
 const TARGET={
  11:{dot:[5,3000]},20:{},29:{slow:1},33:{stun:1},40:{},47:{mobDmg:5},56:{mobDmg:6},64:{silence:1},66:{stun:1},113:{},
  133:{},152:{root:1},153:{},157:{stun:1},167:{slow:1},
  173:{mobDmg:3},103:{stun:1},112:{armorBreak:1},183:{},188:{},193:{},202:{silence:1},212:{stun:1},217:{},228:{root:1},230:{stun:1},
 };
 const AREA_TARGET={76:{slow:1},161:{silence:1}};
 const ATTACK={108:1,187:1,207:1,229:1};
 const AREA={205:1,210:1,215:1,220:1,225:1};
 const PASSIVE={233:1,234:1,235:1,236:1,237:1,238:1,239:1};
 // Utility skills (skillmode BODY_TO_MIND mp+2, BLOODY_SOUL mp+15, TELEPORT／MASS_TELEPORT, TELEPORT_TO_MATHER, CURE_POISON,
 // REMOVE_CURSE; L1J 魔力奪取 5–14 MP, 起死回生術 kills undead at 50%). Summon kinds go to data/summons.js.
 // `need` = needs another system and only explains why.
 const UTIL={5:'teleport',69:'teleport',131:'mother',9:'cure',37:'purify',44:'purify',153:'purify',23:'sense',18:'turnUndead',39:'drain',
  130:'mp2',146:'mp15',60:'invisible',97:'invisible',100:'bringStone',67:'poly',13:'detect',27:'target',71:'target',
  36:'tame',41:'zombie',51:'summon',145:'release',154:'elemental',162:'greater',61:'resurrect',75:'resurrect',116:'clan',118:'clan',73:'enchant'};
 const UTIL_TARGET={18:1,23:1,39:1,27:1,71:1,153:1};
 // Formerly disabled spells now have mechanical hooks below. King guard has no core values:
 // this edition defines it as a learned passive AC -2 / MR +10.
 Object.assign(SELF,{2:{light:1},14:{weight:1.5},89:{hit:3,spikes:1},90:{bowDodge:15},134:{reflect:.1},155:{speed:'brave'},158:{hpr:15},159:{ac:-7},190:{ac:-3,status:{freeze:10}},195:{hit:5,status:{stun:10}}});
 delete SELF[119];delete SELF[194];delete SELF[213];delete SELF[218];PASSIVE[119]=1;
 Object.assign(TARGET,{20:{blind:1},40:{blind:1},27:{weaponBreak:1},71:{decay:1},113:{focus:1},133:{elementDown:50},153:{erase:1},183:{ac:10},188:{dodge:-5},193:{stats:{str:-3,int:-3}},217:{stats:{str:-1,con:-1,dex:-1,wis:-1,int:-1}}});
 delete UTIL[27];delete UTIL[71];delete UTIL[153];UTIL[13]=UTIL[194]=UTIL[213]='detect';UTIL[165]='resurrect';ATTACK[218]=1;ATTACK[132]=1;AREA[63]=1;
 const handles=id=>!!(SELF[id]||TARGET[id]||AREA_TARGET[id]||ATTACK[id]||AREA[id]||PASSIVE[id]||UTIL[id]);
 let invisible=false;
 const active=()=>[...buffs.keys()].filter(on).map(id=>SELF[id]||{});
 const sum=key=>active().reduce((n,e)=>n+(typeof e[key]==='number'?e[key]:0),0);

 // ---- stat hooks (db-game-rules / native-combat-rules / player-class-stats / island-combat / island-npc-ai) ----
 function resistances(){const out={earth:0,fire:0,water:0,wind:0};for(const c of cubes)if(c.mapId===(window.activeMapId||0)&&c.until>now()&&Math.max(Math.abs(worldX-c.x),Math.abs(worldY-c.y))<=c.r&&c.id!==63){const key={205:'fire',210:'earth',215:'wind'}[c.id];if(key)out[key]=30;}if(on(138))for(const k of Object.keys(out))out[k]+=10;const k={'地':'earth','火':'fire','水':'water','風':'wind'}[OwnedInventory.skills.element];if(on(147)&&k)out[k]+=50;return out;}
 function meleeHitBonus(){return sum('hit');}
 function rangedHitBonus(){return sum('bowHit');}
 function damageBonus(ranged){return ranged?sum('bow'):sum('dmg');}
 function reduction(){let n=sum('red');if(on(88))n+=Math.max(1,Math.trunc((level()-50)/5)+1);
  if(knows(236)){const ac=window.NativeCombatRules?.armorClass?.()??0;n+=Math.max(0,Math.trunc(-ac/10));}return n;}
 function ac(){return sum('ac')+(knows(119)?-2:0);}
 function dodge(){return sum('dodge');}
 function mpr(){return sum('mpr');}
 function hpr(){return sum('hpr');}
 function maxWeight(base){return Math.floor(base*(on(14)?1.5:1));}
 function statusResistances(){const r={};for(const e of active())for(const [k,v]of Object.entries(e.status||{}))r[k]=(r[k]||0)+v;return r;}
 function targetNpc(mob){const base=mob?.spawn?.npc||{},n={...base,dodge:base.dodge??base.raw?.dodge??0,er:base.er??base.raw?.er??0,elements:{...(base.elements||{})}},d=debuffs.get(mob)||{};for(const [id,until]of Object.entries(d)){if(until<=now())continue;const e=TARGET[id]||AREA_TARGET[id]||{};n.ac=(n.ac||0)+(e.ac||0);if(e.dodge){n.dodge=(n.dodge||0)+e.dodge;n.er=(n.er||0)+e.dodge;}for(const [k,v]of Object.entries(e.stats||{}))n[k]=Math.max(0,(n[k]||0)+v);if(e.elementDown){const element=d.element||'earth';n.elements[element]=(n.elements[element]||0)-e.elementDown;}if(e.erase)n.mr=Math.floor((n.mr||0)/2);if(e.blind)n.hit=(n.hit||0)-10;}
  n.hit=(n.hit||0)+Math.floor(((n.dex||0)-(base.dex||0))/2);n.mr=Math.max(0,(n.mr||0)+((n.wis||0)-(base.wis||0))*2);n.magicMultiplier=Math.max(.1,1+((n.int||0)-(base.int||0))*.05);
  n.dmgup=(n.dmgup||0)-(d.weaponDamage||0);return n;
 }
 function consumeErase(mob){const d=debuffs.get(mob);if(d)delete d[153];}
 function vision(mob){return has(mob,'blind')?1:14;}
 function canUsePotions(mob){return !has(mob,'decay');}
 function focusTarget(){return focused?.hp&&(focused.spawn.mapId||0)===(window.activeMapId||0)&&has(focused,'focus')?focused:null;}
 let focused=null;
 function detect(skill){let count=0;for(const m of IslandMonsters.all||[]){if(!m.hp||(m.spawn.mapId||0)!==(window.activeMapId||0)||Math.max(Math.abs(m.x-worldX),Math.abs(m.y-worldY))>14||!IslandCombat.clearShot(worldX,worldY,m.x,m.y))continue;
  // Invisible/buried monsters are distinct from dead, offline and despawned NPCs.
  if(m.invisible||m.hiddenStatus||m.spawn.npc.invisible&&!(m.revealedUntil>now())){m.invisible=false;m.hiddenStatus=0;m.revealedUntil=now()+16000;count++;if(skill.id===213&&!m.spawn.ally)IslandMonsters.damage(m,1);IslandMonsters.playEffect(skill.gfx,m.x,m.y,now());}}
  say(skill.name+'：已偵測周圍，現形 '+count+' 個目標。');
 }
 function breakWeapon(mob){let d=debuffs.get(mob);if(!d){d={};debuffs.set(mob,d);}d.weaponDamage=Math.min(5,(d.weaponDamage||0)+1);d[27]=Infinity;}
 function mr(){return sum('mr')+(knows(119)?10:0);}
 function sp(){return sum('sp');}
 function stats(){const out={};for(const e of active())for(const [k,v]of Object.entries(e.stats||{}))out[k]=(out[k]||0)+v;return out;}
 function base(){return window.activeVitalGrowth||{maxHp:0,maxMp:0};}
 function maxHpBonus(){return (on(226)?Math.trunc(base().maxHp*(level()/2)/100):0)+(on(79)?Math.trunc(base().maxHp/5):0);}
 function maxMpBonus(){return on(79)?Math.trunc(base().maxMp/5):0;}
 // Extra damage on a melee／bow hit.
 function onHit(mob,ranged){
  let add=0;invisible=false;mob.allyTarget=null;
  if(!ranged&&on(182)){add+=10;buffs.delete(182);}
  // 黑妖（2026-11-17）：附加劇毒＝近戰 1/3 機率讓目標中毒（每 3 秒 5 點，9 秒）；破壞盔甲中的目標受到的普攻傷害 +（等級/2＋5）
  if(!ranged&&on(98)&&Math.random()<1/3){const t=now();dots.push({mob,until:t+9000,next:t+3000,every:3000,dmg:5});}
  if(has(mob,'armorBreak'))add+=Math.trunc(level()/2)+5;
  if(!ranged){const bonus=Math.max(2,2+level()-45);
   if(knows(233)&&Math.random()<.17){add+=bonus;IslandMonsters.playEffect(12487,mob.x,mob.y,now());}
   if(knows(234)&&Math.random()<.02){add+=bonus*2;IslandMonsters.playEffect(12489,mob.x,mob.y,now());}}
  return add;
 }
 // Damage a monster is about to deal to the player; returns what is left.
 function blocksNegative(skill){if(on(78))return true;if(skill&&on(31)){buffs.delete(31);IslandMonsters.playEffect(sk(31).gfx,worldX,worldY,now());return true;}return false;}
 function onHurt(mob,amount,skill){
  if(amount<=0)return amount;
  const d=debuffs.get(mob)||{},t=now();
  for(const [id,until]of Object.entries(d))if(until>t&&TARGET[id]?.mobDmg)amount=Math.max(0,amount-TARGET[id].mobDmg);
  if(amount<=0)return 0;
  if(on(78))return 0;
  if(skill&&on(31)){buffs.delete(31);IslandMonsters.playEffect(sk(31).gfx,worldX,worldY,t);return 0;}
  if(skill&&on(134)&&Math.random()<.1){buffs.delete(134);IslandMonsters.damage(mob,amount);IslandMonsters.playEffect(sk(134).gfx,mob.x,mob.y,t);return 0;}
  const melee=!skill&&Math.max(Math.abs(mob.x-worldX),Math.abs(mob.y-worldY))<=1;
  if(melee&&on(89)&&Math.random()<.1)breakWeapon(mob);
  if(!skill&&!melee&&on(90)&&OwnedInventory.items.some(e=>e.slot&&e.item.type==='shield')&&Math.random()<.15)return 0;
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
  if(id===192&&PlayerAbilityRules.statusHits({...sk(id),id},mob))stun(mob,4000);
  if(id===208&&PlayerAbilityRules.statusHits({...sk(id),id},mob))stun(mob,sk(208).duration*1000);
 }
 function speed(kind,until){window.activePotionBuffs=window.activePotionBuffs||{};if(kind==='brave')delete window.activePotionBuffs.elfBrave;if(kind==='elfBrave')delete window.activePotionBuffs.brave;window.activePotionBuffs[kind]=Math.max(Number(window.activePotionBuffs[kind])||0,until);window.NativePotions?.sync();}
 function vitals(){DBGameRules.syncVitals();window.stats?.();}

 // ---- casting ----
 function targetInRange(skill){const mob=IslandMonsters.target,range=skill.range>0?skill.range:skill.id===132?12:skill.id===113?14:3;
  return mob?.hp&&!mob.spawn.ally&&(!mob.spawn.resident||mob.spawn.npc.hp>0)&&(!mob.spawn.bot||window.FakePlayers?.canAttack(mob))&&Math.max(Math.abs(mob.x-worldX),Math.abs(mob.y-worldY))<=range&&IslandCombat.clearShot(worldX,worldY,mob.x,mob.y)?mob:null;}
 function applyTarget(mob,id,dur,t){
  if(mob.spawn.bot&&!window.FakePlayers?.canAttack(mob))return;
  const hit=PlayerAbilityRules.statusHits({...sk(id),id},mob);if(id!==153)consumeErase(mob);
  if(!hit){mob.rangedMissUntil=t+650;window.IslandNpcAi?.provoke(mob,[]);return false;}
  const e=TARGET[id]||AREA_TARGET[id];mark(mob,id,dur||1000);
  if(e.weaponBreak)breakWeapon(mob);
  if(e.elementDown)debuffs.get(mob).element=({'地':'earth','火':'fire','水':'water','風':'wind'}[OwnedInventory.skills.element]||'earth');
  if(e.focus){focused=mob;for(const ally of window.NpcSocial?.party||[])if(ally.fp?.partyOwner===window.activeCharacterId)ally.fp.partyTarget=mob;}
  if(e.blind){mob.windup=null;mob.alert=false;}
  if(e.erase){mob.mp=Math.max(0,mob.mp||0);mob.windup=null;}
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
 function utility(id,skill,{pay,stoneTier,onStone}={}){
  const kind=UTIL[id];
  if(['resurrect','clan','enchant'].includes(kind))return say('技能模組尚未載入，請重新整理；未消耗資源。');
  if(kind==='teleport'&&!landing())return say('這個地區無法使用瞬間移動。');
  const summon=['summon','tame','zombie','elemental','greater','release'].includes(kind)?window.Summons?.prepare(kind,skill):null;
  if(typeof summon==='string')return say(summon);
  if(summon?.menu)return true;
  if(kind==='mother'&&!WorldMaps.has(4))return false;
  let mob=null;if(UTIL_TARGET[id]){mob=targetInRange(skill);if(!mob)return say('請先選擇範圍內的目標。');}
  let stoneResult;
  if(kind==='bringStone'&&[3,4,5].includes(stoneTier)){
   const cost=window.PlayerAbilityRules?.manaCost(skill)??skill.mp;
   stoneResult=OwnedInventory.bringStone(stoneTier,cost);
   onStone?.(stoneResult);
   if(stoneResult.error)return say(stoneResult.error);
  }else if(!(pay?pay():OwnedInventory.castCost(skill)))return say('魔力、體力或材料不足。');
  if(!CharacterActions.play('skill'))return false;
  const t=now();cooldowns.set(id,t+(skill.reuse||0));invisible=kind==='invisible';
  IslandMonsters.playEffect(skill.gfx,mob?mob.x:worldX,mob?mob.y:worldY,t);
  if(kind==='teleport'){const p=landing();if(p&&OwnedInventory.applyChange(OwnedInventory.snapshot,{position:p})){WorldMaps.arrived();window.DungeonPortals?.settle();IslandMonsters.playEffect(169,worldX,worldY,now());}}
  if(kind==='mother')WorldMaps.travel(4,33051,32337).then(ok=>{if(ok)window.DungeonPortals?.settle();});
  if(kind==='cure'||kind==='purify'){window.IslandNpcAi?.curePoison?.();if(window.playerItemState){delete playerItemState.poison;delete playerItemState.poisoned;}if(id===37)window.IslandNpcAi?.cureStone?.();}
  if(kind==='sense')say(mob.spawn.npc.name+'　體力 '+mob.hp+' / '+mob.spawn.npc.hp+'　等級 '+mob.spawn.npc.level);
  if(kind==='turnUndead'){const u=mob.spawn.npc.raw?.undead??mob.spawn.npc.undead;if(u===1&&PlayerAbilityRules.statusHits({...skill,id},mob))IslandMonsters.damage(mob,mob.hp);else say('沒有效果。');}
  if(kind==='drain'&&!PlayerAbilityRules.statusHits({...skill,id},mob)){say('魔法未生效。');return true;}
  if(kind==='drain'){const gain=Math.min(5+Math.floor(Math.random()*10),Math.max(0,mob.mp??99));if(mob.mp!==undefined)mob.mp-=gain;mp=Math.min(maxMp,mp+gain);window.stats?.();}
  if(kind==='bringStone'){const r=stoneResult??OwnedInventory.bringStone();if(r.error)say(r.error);else say(r.ok?'提煉成功！得到'+['一','二','三','四','五'][r.to-1]+'級黑魔石。':'提煉失敗，'+['一','二','三','四','五'][r.from-1]+'級黑魔石碎掉了。');}
  if(kind==='mp2'||kind==='mp15'){mp=Math.min(maxMp,mp+(kind==='mp2'?2:15));window.stats?.();}
  if(kind==='poly')window.openGameCatalog?.('transforms');
  if(typeof summon==='function')summon();
  if(kind==='detect')detect({...skill,id});
  return true;
 }
 function cast(id,options={}){
  const skill=sk(id);if(!skill||!options.scroll&&!knows(id))return false;
  if(owner!==window.activeCharacterId){reset();owner=window.activeCharacterId;}

  if(PASSIVE[id])return say('「'+skill.name+'」是被動技能，學會後自動生效。');
  if(window.SkillUtilities?.handles(id))return SkillUtilities.cast(id,skill,options);
  if(UTIL[id]){if(CharacterActions.dead||window.gameFlowState!=='playing'||characterMovementBlocked()||movementAnimating()||!TransformCards.canCast||now()<(cooldowns.get(id)||0))return false;return utility(id,skill,options);}
  const pay=options.pay;
  invisible=false;
  if(CharacterActions.dead||window.gameFlowState!=='playing'||characterMovementBlocked()||movementAnimating()||!TransformCards.canCast)return false;
  if(now()<(cooldowns.get(id)||0))return false;
  // 2026-11-20 手動施放可對他人放的增益（DB target＝buff 且有持續時間）：有輔助目標就放在對方身上
  if(options.support&&SELF[id]&&!PASSIVE[id]&&skill.target==='buff'&&(skill.duration||0)>0){const ally=supportTarget(skill);if(ally===false)return false;if(ally)return castAlly(id,skill,ally,pay);}
  if(id===132&&!['bow','singlebow'].includes(OwnedInventory.equippedWeaponType))return say('三重矢需要裝備弓。');
  if(id===90&&!OwnedInventory.items.some(e=>e.slot&&e.item.type==='shield'))return say('堅固防護需要裝備盾牌。');
  let mob=null;
  if(id===133&&!OwnedInventory.skills.element)return say('請先選擇精靈屬性。');
  if(TARGET[id]||ATTACK[id]){mob=targetInRange(skill);if(!mob)return say('請先選擇範圍內的目標。');}
  if(!(pay?pay():OwnedInventory.castCost(id===132?{...skill,arrows:3}:skill)))return say('魔力、體力、箭矢或材料不足。');
  if(!CharacterActions.play('skill'))return false;
  const t=now(),dur=(skill.duration||0)*1000;cooldowns.set(id,t+(skill.reuse||0));
  IslandMonsters.playEffect(skill.gfx,mob?mob.x:worldX,mob?mob.y:worldY,t);
  if(SELF[id]){
   const e=SELF[id];
   if([185,190,195].includes(id))for(const other of [185,190,195])buffs.delete(other);
   if([150,155].includes(id))for(const other of [150,155])buffs.delete(other);
   buffs.set(id,t+dur);
   if(e.speed)speed(e.speed,Date.now()+dur);
   if(e.barrier&&window.playerItemState&&!playerItemState.absoluteBarrier){playerItemState.absoluteBarrier=true;barrierSet=true;}
   if(e.gigantic||e.spirit)vitals();
  }
  if(id===132){const p=PlayerClassStats.read(),max=Math.max(1,p.weapon?.damage[0]||2);for(let i=0;i<3;i++){if(PlayerRangedRules.hits(p,mob))IslandMonsters.damage(mob,Math.max(0,1+Math.floor(Math.random()*max)+p.rangedBonus));else mob.rangedMissUntil=t+650;}window.CombatSound?.playerAttack?.({duration:500});}
  if(id===218){const missing=Math.max(0,maxHp-hp),damage=Math.floor(missing/5);if(damage>0)IslandMonsters.damage(mob,damage);}
  if(TARGET[id])applyTarget(mob,id,dur,t);
  if(AREA_TARGET[id])for(const m of IslandMonsters.around(worldX,worldY,skill.area||3)){if(!IslandCombat.clearShot(worldX,worldY,m.x,m.y))continue;applyTarget(m,id,dur,t);IslandMonsters.playEffect(skill.gfx,m.x,m.y,t);}
  // 會心一擊（黑妖）：一次重擊＝武器最大傷害×2＋近戰加成
  if((id===108||id===187||id===229)&&!PlayerRangedRules.meleeHits(PlayerClassStats.read(),mob)){mob.rangedMissUntil=t+650;window.IslandNpcAi?.provoke(mob,[]);return true;}
  if(id===108){const p=PlayerClassStats.read(),max=Math.max(1,p.weapon?.damage[0]||2);IslandMonsters.damage(mob,max*2+p.meleeBonus);}
  if(id===187){const p=PlayerClassStats.read(),max=Math.max(1,p.weapon?.damage[0]||2);for(let i=0;i<3;i++)IslandMonsters.damage(mob,1+Math.floor(Math.random()*max)+p.meleeBonus+damageBonus(false));}
  if(id===207){const result=PlayerAbilityRules.magicAmount({...skill,id},mob,{raw:Math.floor((PlayerClassStats.read().sp||0)*3.8+5)});if(result.critical)mob.magicCriticalUntil=t+650;if(result.amount>0)IslandMonsters.damage(mob,result.amount);}
  if(id===229&&Math.random()<.9)dots.push({mob,until:t+dur,next:t+1000,every:1000,dmg:Math.trunc(level()/2)+6});
  // 2026-11-17 戰士裝雙斧（右手 weapon2）時連副手斧一起丟：另外 90% 機率再上一層持續傷害，數值一半
  if(id===229&&OwnedInventory.items.some(e=>e.slot==='weapon2')&&Math.random()<.9){dots.push({mob,until:t+dur,next:t+1000,every:1000,dmg:Math.max(1,Math.trunc((Math.trunc(level()/2)+6)/2))});IslandMonsters.playEffect(skill.gfx,mob.x,mob.y,t+150);}
  if([63,205,210,215,220].includes(id)){cubes=cubes.filter(c=>c.id!==id);cubes.push({id,mapId:window.activeMapId||0,x:worldX,y:worldY,until:t+dur,next:t+4000,dmg:skill.damage[0]||10,r:skill.area||3});}
  if(id===225)for(const m of IslandMonsters.around(worldX,worldY,skill.area||3))if(IslandCombat.clearShot(worldX,worldY,m.x,m.y)){IslandMonsters.damage(m,50);window.IslandNpcAi?.provoke?.(m,[]);}
  if(AREA[id]&&id!==205)for(const m of IslandMonsters.around(worldX,worldY,skill.area||3))IslandMonsters.playEffect(skill.gfx,m.x,m.y,t);
  return true;
 }

 // ---- 2026-11-20 輔助目標（隊友／召喚物／其他玩家）：治癒與增益放在對方身上 ----
 //  效果換算（夥伴沒有完整角色數值，用簡化規則）：AC 每 −2 少受 1 傷害、傷害減免直接扣、閃避每點 2% 完全閃掉、聖結界受傷減半、
 //  靈魂昇華受傷 ×0.83（≈血量 +20%）；加傷／弓傷直接加、力量每 2 點 +1、敏捷每 5 點 +1、加速／勇敢類傷害 ×1.25（≈出手變快）、生命之泉每 5 秒回血。
 let allyBuffs=new WeakMap();
 function supportTarget(skill){
  const mob=IslandMonsters.support;if(!mob)return null;
  const range=skill.range>0?skill.range:10;
  if(Math.max(Math.abs(mob.x-worldX),Math.abs(mob.y-worldY))>range||!IslandCombat.clearShot(worldX,worldY,mob.x,mob.y)){say('輔助目標太遠或被擋住（按 SELF 可改放自己）。');window.toast?.('輔助目標太遠或被擋住（按 SELF 可改放自己）。');return false;}
  return mob;
 }
 function castAlly(id,skill,ally,pay){
  if(!(pay?pay():OwnedInventory.castCost(skill)))return say('魔力、體力、箭矢或材料不足。');
  if(!CharacterActions.play('skill'))return false;
  const t=now(),dur=(skill.duration||0)*1000;cooldowns.set(id,t+(skill.reuse||0));invisible=false;
  IslandMonsters.playEffect(skill.gfx,ally.x,ally.y,t);
  let map=allyBuffs.get(ally);if(!map)allyBuffs.set(ally,map=new Map());
  if([150,155].includes(id))for(const other of [150,155])map.delete(other);
  map.set(id,t+dur);window.toast?.('對 '+(ally.fp?.name||ally.spawn.npc.name)+' 施放「'+skill.name+'」');
  return true;
 }
 function allyMods(mob){
  const map=mob&&allyBuffs.get(mob);if(!map)return null;const t=now(),out={ac:0,dmg:0,red:0,dodge:0,str:0,dex:0,speed:false,immune:false,spirit:false,hpr:0};let any=false;
  for(const [id,until]of map){if(until<=t){map.delete(id);continue;}const e=SELF[id]||{};any=true;
   out.ac+=e.ac||0;out.dmg+=(e.dmg||0)+(e.bow||0);out.red+=typeof e.red==='number'?e.red:0;out.dodge+=(e.dodge||0)+(e.bowDodge||0);out.str+=e.stats?.str||0;out.dex+=e.stats?.dex||0;
   if(e.speed)out.speed=true;if(e.immune)out.immune=true;if(e.spirit)out.spirit=true;out.hpr+=e.hpr||0;}
  return any?out:null;
 }
 function allyOut(mob,amount){const m=allyMods(mob);if(!m||!(amount>0))return amount;let v=amount+m.dmg+Math.floor(m.str/2)+Math.floor(m.dex/5);if(m.speed)v*=1.25;return Math.max(0,Math.floor(v));}
 function allyIn(mob,amount){const m=allyMods(mob);if(!m||!(amount>0))return amount;if(m.dodge>0&&Math.random()<m.dodge*.02)return 0;let v=amount-m.red-Math.floor(-m.ac/2);if(m.immune)v/=2;if(m.spirit)v*=.83;return Math.max(0,Math.floor(v));}
 setInterval(()=>{for(const mob of [...(window.Summons?.mobs||[]),...(window.NpcSocial?.party||[]),...(IslandMonsters.support?[IslandMonsters.support]:[])]){const m=allyMods(mob);if(!m?.hpr||!(mob.hp>0))continue;mob.hp=Math.min(Number(mob.spawn.npc.hp)||mob.hp,mob.hp+m.hpr);}},5000);
 // 魔法卷軸（data/item-effects.js）：不用學會、不耗魔力，直接得到自身輔助效果（照技能持續時間）
 function grant(id){
  if(owner!==window.activeCharacterId){reset();owner=window.activeCharacterId;}
  const skill=sk(id);if(!skill||!SELF[id]||PASSIVE[id]||UTIL[id])return false;
  if(CharacterActions.dead||window.gameFlowState!=='playing'||characterMovementBlocked()||movementAnimating())return false;
  if(!CharacterActions.play('skill'))return false;
  const t=now(),dur=(skill.duration||0)*1000,e=SELF[id];invisible=false;
  IslandMonsters.playEffect(skill.gfx,worldX,worldY,t);buffs.set(id,t+dur);
  if(e.speed)speed(e.speed,Date.now()+dur);
  if(e.barrier&&window.playerItemState&&!playerItemState.absoluteBarrier){playerItemState.absoluteBarrier=true;barrierSet=true;}
  if(e.gigantic||e.spirit)vitals();
  return true;
 }

 // ---- timers, reset and status bar ----
 const bar=document.createElement('div');bar.className='class-buff-bar';bar.hidden=true;
 const style=document.createElement('style');style.textContent='.class-buff-bar{position:absolute;left:8px;top:96px;z-index:30;display:flex;flex-wrap:wrap;gap:3px;max-width:240px;pointer-events:none}.class-buff-bar[hidden]{display:none!important}.class-buff-bar img{width:26px;height:26px;border:1px solid #b79b5a;border-radius:3px;background:#0b1410}';
 style.textContent+='.game.spell-daylight::after{content:"";position:absolute;left:50%;top:45%;width:min(60vw,600px);height:min(60vw,600px);transform:translate(-50%,-50%);border-radius:50%;background:radial-gradient(ellipse,#ffec9e18,transparent 68%);backdrop-filter:brightness(1.15);mask-image:radial-gradient(ellipse,#000,transparent 70%);pointer-events:none;z-index:2}';
 document.head.append(style);document.querySelector('.game')?.append(bar);
 let vitalsKey='';
 function reset(){document.querySelector('.game')?.classList.remove('spell-daylight');const hadVitals=on(226)||on(79);buffs.clear();cooldowns.clear();cubes=[];dots=[];invisible=false;focused=null;debuffs=new WeakMap();
  if(barrierSet&&window.playerItemState){playerItemState.absoluteBarrier=false;}barrierSet=false;if(hadVitals)vitals();}
 let barKey='';
 function tick(){
  const current=window.gameFlowState==='playing'?window.activeCharacterId:null;
  if(current!==owner){reset();owner=current;}
  if(!current)return;
  if(CharacterActions.dead){reset();bar.hidden=true;document.querySelector('.game')?.classList.remove('spell-daylight');return;}
  const t=now();
  document.querySelector('.game')?.classList.toggle('spell-daylight',on(2));
  if(barrierSet&&!on(78)){if(window.playerItemState)playerItemState.absoluteBarrier=false;barrierSet=false;}
  const vk=(on(226)?'g':'')+(on(79)?'s':'');if(vk!==vitalsKey){vitalsKey=vk;vitals();}
  for(const c of cubes)if(t>=c.next&&t<c.until&&c.mapId===(window.activeMapId||0)){c.next=t+4000;
   if(c.id===63||c.id===220){const heal=c.id===63?3:25,extraMp=c.id===220?5:0;if(hp>0&&Math.max(Math.abs(worldX-c.x),Math.abs(worldY-c.y))<=c.r&&IslandCombat.clearShot(worldX,worldY,c.x,c.y)){hp=Math.min(maxHp,hp+heal);mp=Math.min(maxMp,mp+extraMp);window.stats?.();window.GameEntry?.saveActive?.();}
    const allies=[...(window.Summons?.mobs||[]),...(window.NpcSocial?.party||[])];for(const m of allies)if(m.hp>0&&(m.spawn.mapId||0)===c.mapId&&Math.max(Math.abs(m.x-c.x),Math.abs(m.y-c.y))<=c.r&&IslandCombat.clearShot(c.x,c.y,m.x,m.y))m.hp=Math.min(m.spawn.npc.hp,m.hp+heal);window.GameEntry?.saveActive?.();}
   if(c.id!==63)for(const m of IslandMonsters.around(c.x,c.y,c.r)){if(!IslandCombat.clearShot(c.x,c.y,m.x,m.y))continue;
    if(c.id===215){stun(m,1000);continue;}if(c.id===220){m.mp=Math.max(0,(m.mp||0)-5);IslandMonsters.damage(m,25);continue;}
    const result=PlayerAbilityRules.magicAmount({...sk(c.id),id:c.id,attr:c.id===210?1:2},m,{raw:c.dmg});if(result.critical)m.magicCriticalUntil=t+650;if(result.amount>0)IslandMonsters.damage(m,result.amount);}}

  cubes=cubes.filter(c=>t<c.until);
  for(const h of dots)if(t>=h.next&&t<h.until&&h.mob.hp){h.next+=h.every;IslandMonsters.damage(h.mob,h.dmg);}
  dots=dots.filter(h=>t<h.until&&h.mob.hp);
  const ids=[...buffs.keys()].filter(on);const key=ids.join(',');
  if(key!==barKey){barKey=key;bar.replaceChildren(...ids.map(id=>{const img=document.createElement('img');img.alt=img.title=sk(id).name;img.src=interfaceCatalog.skills.find(s=>s.id===id)?.icon||'';return img;}));}
  bar.hidden=!ids.length;
  window.NativePotions?.layout?.();
 }
 setInterval(tick,250);
 return {supportTarget,allyOut,allyIn,allyBuffs:mob=>{const map=mob&&allyBuffs.get(mob);return map?[...map].filter(([,u])=>u>now()).map(([id])=>id):[];},handles,implemented:id=>handles(id),cast,grant,afterCast,invisible:()=>invisible,reveal:()=>{invisible=false;},hpr,maxWeight,statusResistances,targetNpc,consumeErase,vision,canUsePotions,focusTarget,clearTarget:mob=>{debuffs.delete(mob);if(focused===mob)focused=null;},resistances,rangedHitBonus,meleeHitBonus,damageBonus,reduction,ac,dodge,mpr,mr,sp,stats,maxHp:maxHpBonus,maxMp:maxMpBonus,onHit,onHurt,blocksNegative,silenced,rooted,slowed,mark,active:id=>on(id),selfBuff:id=>!!SELF[id]&&!PASSIVE[id]&&!UTIL[id]&&(sk(id)?.duration||0)>0};
})();window.ClassBuffs=ClassBuffs;
