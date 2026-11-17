// DEXD / DEXH transcribed from the supplied core's L1AttackList.load().
window.PlayerRangedRules=(()=>{
 const clamp=(n,min,max)=>Math.max(min,Math.min(max,n));
 function dexBonus(value){const dex=clamp(Math.trunc(Number(value)||0),0,127);return {damage:Math.max(2,Math.floor(dex/3)),hit:dex<8?-3:dex-10};}
 function hitBonus(dex,items,sets){
  const gear=items.filter(e=>e.slot).reduce((sum,e)=>{const r=e.item.sourceRules||{};return sum+(e.slot==='weapon'?(r.hitmodifier??r.hit_modifier??0)+Math.floor((e.enchant||0)/2):(r.bow_hit_modifier||0));},0);
  const poly=window.DBGameRules?.rows('system_poly_orginal').find(r=>r.gfxId===window.activeTransformCard?.p?.gfx);
  return dexBonus(dex).hit+gear+(sets.bow_hit_modifier||0)+(poly?.addBowHit||0)+(window.ClassBuffs?.rangedHitBonus?.()||0);
 }
 // One d20 roll: level + bow hit + target AC; natural 1 misses, natural 20 hits.
 function meleeHitBonus(str,items,sets={}){const gear=items.filter(e=>e.slot).reduce((sum,e)=>{const r=e.item.sourceRules||{};return sum+(r.hitmodifier??r.hit_modifier??0)+(e.slot==='weapon'?Math.floor((e.enchant||0)/2):0);},0);const poly=window.DBGameRules?.rows('system_poly_orginal').find(r=>r.gfxId===window.activeTransformCard?.p?.gfx);return Math.floor((Number(str||0)-10)/2)+gear+(sets.hit_modifier||0)+(poly?.addHit||0)+(window.ClassBuffs?.meleeHitBonus?.()||0);}
 function meleeChance(profile,mob){const n=mob?.spawn?.npc||{};return clamp((Number(profile.level)+Number(profile.meleeHitBonus||0)+10+Number(n.ac||0)-Math.max(0,Number(n.dodge??n.raw?.dodge)||0))*5,5,95);}
 function meleeHits(profile,mob,rng=Math.random){return Math.floor(rng()*20)+1>20-meleeChance(profile,mob)/5;}
 function chance(profile,mob){return clamp((Number(profile.level)+Number(profile.rangedHitBonus||0)+10+Number(mob?.spawn?.npc?.ac||0)-Math.max(0,Number(mob?.spawn?.npc?.er??mob?.spawn?.npc?.raw?.er)||0))*5,5,95);}
 function hits(profile,mob,rng=Math.random){return Math.floor(rng()*20)+1>20-chance(profile,mob)/5;}
 return {dexBonus,hitBonus,chance,hits,meleeHitBonus,meleeChance,meleeHits};
})();
