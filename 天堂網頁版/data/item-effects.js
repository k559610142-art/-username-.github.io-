// 道具效果（2026-11-14）：補上原本「此道具需要目標或尚未接入的功能」的兩類道具。owned-inventory.js use() 在 NativePotions 後呼叫 ItemEffects.use。
//  經驗藥水：DB classname event.ExpNN 600（130%～800%，600 秒；倍率照道具名稱的 %，DB 有兩筆名稱與編號對調以名稱為準）；
//   經驗寶石 event.SExpNN（倍率照名稱「1.3倍」，1800 秒）。效果存在 activePotionBuffs.exp（到期時間）＋expRate／expIcon，
//   擊殺經驗 × expRate（player-progression.js roll），倒下不會消失；已有更高倍率時不能喝，同倍率或更高就覆蓋並重新計時。
//  魔法卷軸：DB classname magicreel.MagicReel_Spell／Buff／Armor／Weapon <技能編號>：自身輔助魔法（ClassBuffs.selfBuff，例：魔法屏障 31、
//   保護罩 3、冥想術 32、神聖疾走 52）用 ClassBuffs.grant 直接生效；治癒類（初級／中級／高級／全部治癒術）照技能數值補血。
//   不用學會、不耗魔力，用一張扣一張；攻擊用的 MagicReel_Long（光箭、冰箭…）還沒接。
const ItemEffects=(()=>{
 const defs=()=>ITEM_USE_RULES.definitions;
 function parse(e){
  const h=String(defs()[e.key]?.handler||'').trim(),name=e.item?.name||'';
  let m=h.match(/^event\.(S?)Exp(\d+)(?:\s+(\d+))?/);
  if(m){const pct=name.match(/(\d+)%/),times=name.match(/(\d+(?:\.\d+)?)倍/);const rate=pct?Number(pct[1])/100:times?Number(times[1]):Number(m[2])/10;
   return {kind:'exp',rate,sec:Number(m[3])||(m[1]?1800:600)};}
  m=h.match(/^magicreel\.MagicReel_(Spell|Buff|Armor|Weapon)\s+(\d+)/);
  if(m)return {kind:'scroll',skill:Number(m[2])};
  return null;
 }
 const say=t=>{document.querySelector('#log').textContent=t;return false;};
 function consume(e,effect={}){const next=OwnedInventory.snapshot,row=next.find(i=>i.uid===e.uid);if(!row||row.count<1)return false;row.count--;if(!row.count)next.splice(next.indexOf(row),1);return OwnedInventory.applyChange(next,effect);}
 function useExp(e,p){
  const buffs={...(window.activePotionBuffs||{})},active=Number(buffs.exp)>Date.now(),cur=active?Number(buffs.expRate)||1:1;
  if(active&&p.rate<cur)return say('已經有更高的經驗加成（'+Math.round(cur*100)+'%），不能使用。');
  buffs.exp=Date.now()+p.sec*1000;buffs.expRate=p.rate;buffs.expIcon=e.item?.icon||'';
  if(!consume(e,{potionBuffs:buffs}))return false;
  window.NativePotions?.sync();IslandMonsters.playEffect(750,worldX,worldY,movementTime());
  say('使用 '+e.item.name+'：經驗 '+Math.round(p.rate*100)+'%，'+Math.round(p.sec/60)+' 分鐘。');return true;
 }
 function useScroll(e,p){
  const skill=playerSkillData.skills[p.skill];if(!skill)return say('這張魔法卷軸的魔法不存在。');
  if(!window.TransformCards?.canCast)return say('目前的變身無法使用魔法。');
  if(/治癒|恢復/.test(skill.name)&&skill.damage?.some(Boolean)){
   if(CharacterActions.dead||characterMovementBlocked()||movementAnimating())return false;
   let amount=skill.damage[0];for(let i=0;i<skill.damage[2];i++)amount+=1+Math.floor(Math.random()*Math.max(1,skill.damage[1]));
   if(!CharacterActions.play('skill'))return false;
   if(!consume(e,{hp:Math.min(maxHp,hp+amount)}))return false;
   IslandMonsters.playEffect(skill.gfx,worldX,worldY,movementTime());say('使用 '+e.item.name+'：體力 +'+amount+'。');return true;}
  if(!window.ClassBuffs?.selfBuff(p.skill))return say('「'+skill.name+'」卷軸還不能使用（目前只接自身輔助與治癒魔法）。');
  if(!ClassBuffs.grant(p.skill))return false;
  if(!consume(e))return false;
  const d=skill.duration||0;say('使用 '+e.item.name+'：'+skill.name+' '+(d<60?d+' 秒':Math.round(d/60*10)/10+' 分鐘')+'。');return true;
 }
 function use(uid){const e=OwnedInventory.items.find(i=>i.uid===uid);if(!e||e.slot)return null;const p=parse(e);if(!p)return null;
  if(window.gameFlowState!=='playing'||CharacterActions.dead)return false;
  const rule=defs()[e.key]||{},lv=window.activeCharacterLevel||1;if(lv<(rule.minLevel||0)||rule.maxLevel&&lv>rule.maxLevel)return say('等級不符合道具限制。');
  return p.kind==='exp'?useExp(e,p):useScroll(e,p);}
 const expRate=()=>Number(window.activePotionBuffs?.exp)>Date.now()?Number(window.activePotionBuffs.expRate)||1:1;
 return {use,parse,expRate,isExp:e=>parse(e)?.kind==='exp'};
})();window.ItemEffects=ItemEffects;
