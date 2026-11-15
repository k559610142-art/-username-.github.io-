window.PlayerAbilityRules=(()=>{
 const clamp=(n,a,b)=>Math.max(a,Math.min(b,n)),score=n=>clamp(Math.trunc(Number(n)||0),0,127);
 const strengthDamage=n=>Math.max(2,Math.floor(score(n)/2)-2);
 const intelligencePower=n=>Math.max(0,Math.floor(score(n)/5)-2);
 function manaReduction(n){n=score(n);if(n<8)return 0;let v=5;for(let i=8;i<=n;i++)if(i%3===0||i%3===2)v++;return Math.min(30,v);}
 const originalManaReduction=n=>clamp(Math.floor((score(n)-12)/3),0,3);
 function magicCritical(n,items=[]){const extra=items.filter(e=>e.slot).reduce((sum,e)=>sum+(e.item.kind==='armor'?(PLAYER_ABILITY_DATA.armor[e.item.id]?.critical||0):(e.item.sourceRules?.magic_critical||0)),0);return clamp(10+(score(n)>=35?Math.floor((score(n)-30)/5):0)+extra,0,100);}
 function resistances(items,sets={}){const out={earth:0,fire:0,water:0,wind:0},buff=window.ClassBuffs?.resistances?.()||{};for(const k of Object.keys(out)){out[k]=(sets['defense_'+k]||0)+(buff[k]||0);for(const e of items.filter(e=>e.slot)){const native=e.item.kind==='armor'?PLAYER_ABILITY_DATA.armor[e.item.id]:null;out[k]+=native?.[k]??e.item.sourceRules?.['defense_'+k]??0;}}return out;}
 const element=skill=>({1:'earth',2:'fire',4:'water',8:'wind'}[skill?.attr??skill?.spell?.attr??PLAYER_ABILITY_DATA.skills[skill?.id]?.attr]||null);
 const elementalFactor=(skill,res={})=>{const k=element(skill);return k?1-.0032*clamp(Number(res[k])||0,-100,100):1;};
 const mrFactor=mr=>Math.max(0,mr<100?1-Math.floor(Math.max(0,mr)/2)*.01:.6-Math.floor(mr/10)*.01);
 function manaCost(skill,profile=PlayerClassStats.read()){const base=Math.max(0,Number(skill.mp)||0);if(!base)return 0;return Math.max(1,Math.floor(base*(100-manaReduction(profile.attributes.int))/100)-originalManaReduction(window.playerAttributes?.int));}
 function magicAmount(skill,mob,{healing=false,raw,rng=Math.random,profile=PlayerClassStats.read()}={}){
  let amount=raw;if(amount===undefined){amount=skill.damage?.[0]||0;for(let i=0;i<(skill.damage?.[2]||0);i++)amount+=1+Math.floor(rng()*Math.max(1,skill.damage[1]));}
  const power=intelligencePower(profile.attributes.int)+(profile.sp||0);amount=Math.max(0,Math.floor(amount*Math.max(0,1+power*.05)));
  const critical=!healing&&rng()*100<magicCritical(profile.attributes.int,window.OwnedInventory?.items||[]);if(critical)amount=Math.floor(amount*1.5);
  if(!healing){const n=mob?.spawn?.npc||{};amount=Math.floor(amount*mrFactor(Number(n.mr)||0)*elementalFactor(skill,n.elements||{}));}
  return {amount:Math.max(0,amount),critical,power};
 }
 return {strengthDamage,intelligencePower,manaReduction,originalManaReduction,magicCritical,resistances,element,elementalFactor,mrFactor,manaCost,magicAmount};
})();
