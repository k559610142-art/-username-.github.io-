window.PlayerAbilityRules=(()=>{
 const clamp=(n,a,b)=>Math.max(a,Math.min(b,n)),score=n=>clamp(Math.trunc(Number(n)||0),0,127);
 const strengthDamage=n=>Math.max(2,Math.floor(score(n)/2)-2);
 const intelligencePower=n=>Math.max(0,Math.floor(score(n)/5)-2);
 function manaReduction(n){n=score(n);if(n<8)return 0;let v=5;for(let i=8;i<=n;i++)if(i%3===0||i%3===2)v++;return Math.min(30,v);}
 const originalManaReduction=n=>clamp(Math.floor((score(n)-12)/3),0,3);
 function magicCritical(n,items=[]){const extra=items.filter(e=>e.slot).reduce((sum,e)=>sum+(e.item.kind==='armor'?(PLAYER_ABILITY_DATA.armor[e.item.id]?.critical||0):(e.item.sourceRules?.magic_critical||0)),0);return clamp(10+(score(n)>=35?Math.floor((score(n)-30)/5):0)+extra,0,100);}
 function resistances(items,sets={}){const out={earth:0,fire:0,water:0,wind:0},buff=window.ClassBuffs?.resistances?.()||{};for(const k of Object.keys(out)){out[k]=(sets['defense_'+k]||0)+(buff[k]||0)+(window.SoulRings?.bonuses()[k]||0);for(const e of items.filter(e=>e.slot)){const native=e.item.kind==='armor'?PLAYER_ABILITY_DATA.armor[e.item.id]:null;out[k]+=native?.[k]??e.item.sourceRules?.['defense_'+k]??0;}}return out;}
 function statusResistances(items){const out={stone:0,freeze:0,stun:0,sleep:0,sustain:0,blind:0};for(const e of items.filter(e=>e.slot))for(const k of Object.keys(out))out[k]+=(e.item.kind==='armor'?PLAYER_ABILITY_DATA.armor[e.item.id]?.control?.[k]:undefined)??e.item.sourceRules?.['regist_'+k]??0;const doll=window.DollEffects?.status()||{};for(const k of Object.keys(out))out[k]+=doll[k]||0;const extra=window.ClassBuffs?.statusResistances?.()||{};for(const k of Object.keys(out))out[k]+=extra[k]||0;return out;}
 const element=skill=>({1:'earth',2:'fire',4:'water',8:'wind'}[skill?.attr??skill?.spell?.attr??PLAYER_ABILITY_DATA.skills[skill?.id]?.attr]||null);
 const elementalFactor=(skill,res={})=>{const k=element(skill);return k?1-.0032*clamp(Number(res[k])||0,-100,100):1;};
 const mrFactor=mr=>Math.max(0,mr<100?1-Math.floor(Math.max(0,mr)/2)*.01:.6-Math.floor(mr/10)*.01);
 const helmetSpells={20013:[26,43],20014:[1,19],20015:[12,13,42]};
 function helmetSkills(){
  if(typeof job==='undefined'||job!=='騎士')return [];
  const inventory=window.OwnedInventory;
  if(!inventory||inventory.owner!==window.activeCharacterId)return [];
  const available=new Set();
  for(const {item} of inventory.items){
   const id=item.id>=120013&&item.id<=120015?item.id-100000:item.id;
   for(const skill of helmetSpells[id]||[])available.add(skill);
  }
  return [...available];
 }
 function manaCost(skill,profile=PlayerClassStats.read()){
  const base=Math.max(0,Number(skill.mp)||0);if(!base)return 0;
  if(skill.fixedMp)return base;
  let cost=Math.floor(base*(100-manaReduction(profile.attributes.int))/100);
  if(helmetSkills().includes(skill.id))cost=Math.floor(cost/2);
  return Math.max(1,cost-originalManaReduction(window.initialPlayerAttributes?.int??window.playerAttributes?.int));
 }
 function magicHitBonus(){const items=window.OwnedInventory?.items||[],soul=window.SoulRings?.bonuses()||{};return items.filter(e=>e.slot).reduce((n,e)=>n+(Number(e.item.sourceRules?.magic_hit_modifier)||0),0)+(window.PlayerClassStats?.read()?.equipmentSets?.magic_hit_modifier||0)+(soul.magicHit||0);}
 function statusChance(skill,mob,{profile=PlayerClassStats.read()}={}){
  const n=window.ClassBuffs?.targetNpc?.(mob)||mob?.spawn?.npc||{},raw=n.raw||{},meta=PLAYER_ABILITY_DATA.skills[skill?.id]||{},level=Number(profile.level??window.activeCharacterLevel)||1,targetLevel=Number(n.level)||1;
  const kind=/石化|木乃伊/.test(skill?.name||'')?'stone':/冰|寒|凍/.test(skill?.name||'')?'freeze':/暈|昏|衝擊|擊暈/.test(skill?.name||'')?'stun':/睡|沉睡/.test(skill?.name||'')?'sleep':/束縛|定身|纏繞/.test(skill?.name||'')?'sustain':'blind';
  const resist=Math.max(0,Number(n.status?.[kind]??raw['regist_'+kind])||0);if(resist>=100)return 0;
  const physical=meta.type===1||[87,183,188,193,230].includes(skill?.id),power=intelligencePower(profile.attributes?.int);
  const dice=Number(meta.probabilityDice)||0,base=Number(meta.probabilityBase)||0;
  const rate=physical?50+(level-targetLevel)*2:((dice?((dice+1)/2)*Math.max(1,Math.floor(level/6)+power):50)+base+(level-targetLevel)+magicHitBonus()*2-Math.max(0,Number(n.mr)||0)/2);
  return clamp(rate-resist,5,95);
 }
 function statusHits(skill,mob,{rng=Math.random,...options}={}){return rng()*100<statusChance(skill,mob,options);}
 const magicAccuracy=profile=>2*(intelligencePower(profile.attributes.int)+magicHitBonus());
 function magicDamageChance(profile,mob){
  const target=window.ClassBuffs?.targetNpc?.(mob)||mob.spawn.npc;
  const level=Number(target.level)||1,mr=Math.max(0,Number(target.mr)||0);
  return clamp(85+(profile.level-level)+magicAccuracy(profile)-mr/2,5,95);
 }
 function magicAmount(skill,mob,{healing=false,raw,rng=Math.random,profile=PlayerClassStats.read()}={}){
  if(!healing&&mob?.spawn?.npc&&rng()*100>=magicDamageChance(profile,mob))return {amount:0,critical:false,power:0,hit:false};
  let amount=raw;if(amount===undefined){amount=skill.damage?.[0]||0;for(let i=0;i<(skill.damage?.[2]||0);i++)amount+=1+Math.floor(rng()*Math.max(1,skill.damage[1]));}
  const power=healing?intelligencePower(profile.attributes.wis):intelligencePower(profile.attributes.int)+(profile.sp||0);amount=Math.max(0,Math.floor(amount*Math.max(0,1+power*.05)));
  const critical=!healing&&rng()*100<magicCritical(profile.attributes.int,window.OwnedInventory?.items||[]);if(critical)amount=Math.floor(amount*1.5);
  if(!healing){
   const target=mob?.spawn?.npc?(window.ClassBuffs?.targetNpc?.(mob)||mob.spawn.npc):{};
   amount=Math.floor(amount*mrFactor(Number(target.mr)||0)*elementalFactor(skill,target.elements||{}));
  }
  return {amount:Math.max(0,amount),critical,power,hit:true};
 }
 return {strengthDamage,intelligencePower,manaReduction,originalManaReduction,magicCritical,resistances,statusResistances,element,elementalFactor,mrFactor,manaCost,helmetSkills,magicAmount,magicHitBonus,magicAccuracy,magicDamageChance,statusChance,statusHits};
})();
