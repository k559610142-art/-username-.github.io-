// Baseline formulas transcribed from this game's L1AttackNpc, L1AttackMode and CalcStat.
const NativeCombatRules=(()=>{
 const integer=(n,fallback=0)=>Number.isFinite(n)?Math.trunc(n):fallback;
 const rand=(n,rng)=>Math.floor(rng()*Math.max(1,n));
 function poly(){return DBGameRules.rows('system_poly_orginal').find(r=>r.gfxId===window.activeTransformCard?.p?.gfx)||{};}
 function vitals(){const gear=OwnedInventory.items.filter(e=>e.slot),sets=EquipmentSets.read(gear),p=poly();return {baseHp:window.activeVitalGrowth?.maxHp||0,baseMp:window.activeVitalGrowth?.maxMp||0,gearHp:gear.reduce((n,e)=>n+(e.item.bonuses?.hp||0),0),gearMp:gear.reduce((n,e)=>n+(e.item.bonuses?.mp||0),0),setHp:sets.hp||0,setMp:sets.mp||0,polyHp:p.addMaxHP||0,polyMp:p.addMaxMP||0};}
 function armorClass(){const profile=PlayerClassStats.read(),dex=profile.attributes.dex||0,divisor=dex<10?8:dex<13?7:dex<16?6:dex<18?5:4;return 10-Math.trunc(profile.level/divisor)+(profile.equipmentSets.ac||0)+OwnedInventory.items.filter(e=>e.slot&&e.item.kind==='armor').reduce((n,e)=>n+(e.item.ac||0)-integer(e.enchant),0)+(poly().addAc||0)+(window.playerItemState?.acModifier||0)+(window.ClassBuffs?.ac()||0);}
 function defense(){const p=PlayerClassStats.read(),wis=p.attributes.wis||0,mrWis=wis<15?0:wis<17?3:wis===17?6:wis===18?10:wis===19?15:wis===20?21:wis===21?28:wis===22?37:wis===23?47:50,extra=poly();return {ac:armorClass(),role:job,dodge:(window.playerItemState?.dodge||0)+(window.ClassBuffs?.dodge()||0),reduction:Math.max(0,DBGameRules.reduction()+(extra.reduction_dmg||0)),magicReduction:Math.max(0,DBGameRules.reduction()+(extra.reduction_magic_dmg||0)),mr:Math.max(0,Math.trunc(p.level/2)+mrWis+({王族:10,妖精:25,法師:15}[job]||0)+OwnedInventory.items.filter(e=>e.slot).reduce((n,e)=>n+(e.item.sourceRules?.m_def||0),0)+(p.equipmentSets.mr||0)+(extra.addMr||0))};}
 function physical(npc,def=defense(),rng=Math.random,skill=null){
  const level=Math.max(1,integer(npc.level,1)),hitRate=level+5+integer(npc.hit),die=rand(20,rng)+1,attackDie=die+hitRate-3-Math.max(0,def.dodge||0),defendDie=def.ac>=0?10-def.ac:11+rand(-def.ac,rng);const hit=attackDie>hitRate+19||attackDie>hitRate&&attackDie>defendDie;
  if(!hit)return {hit:false,damage:0,critical:false,acDefense:0};
  const strength=Math.max(0,integer(npc.str)),strDamage=strength<10?2:Math.floor(strength/2)-2;
  let raw=rand(level,rng)+strDamage;const critical=rand(100,rng)<15;if(critical)raw*=2;raw+=integer(npc.dmgup);raw=Math.trunc(raw*(skill?.leverage||10)/10);
  const cap=Math.max(0,Math.trunc(Math.max(0,10-def.ac)/({騎士:2,妖精:3,王族:5,法師:5}[def.role]||5))),acDefense=cap?rand(cap,rng)+Math.max(1,cap>>3):0;
  return {hit:true,damage:Math.max(0,Math.trunc(raw-acDefense-(def.reduction||0))),critical,acDefense,raw};
 }
 function magical(npc,skill,def=defense(),rng=Math.random){const [base,sides,dice]=skill?.spell?.damage||[0,0,0];let raw=base;for(let i=0;i<dice&&sides;i++)raw+=1+rand(sides,rng);if(!raw)raw=Math.max(1,Math.floor((npc.str+npc.level)/10));raw=Math.max(0,raw-(def.magicReduction||0));const factor=def.mr<100?1-Math.floor(def.mr/2)*.01:.6-Math.floor(def.mr/10)*.01;return {hit:true,damage:Math.max(0,Math.trunc(raw*Math.max(0,factor)*(skill?.leverage||10)/10)),magic:true};}
 let lastResult=null;function resolve(mob,skill){return lastResult=skill?.type===2?magical(mob.spawn.npc,skill):physical(mob.spawn.npc,undefined,undefined,skill);}
 return {armorClass,defense,vitals,physical,magical,resolve,get lastResult(){return lastResult;}};
})();window.NativeCombatRules=NativeCombatRules;
