// 道具效果（2026-11-14）：補上原本「此道具需要目標或尚未接入的功能」的兩類道具。owned-inventory.js use() 在 NativePotions 後呼叫 ItemEffects.use。
//  經驗藥水：DB classname event.ExpNN 600（130%～800%，600 秒；倍率照道具名稱的 %，DB 有兩筆名稱與編號對調以名稱為準）；
//   經驗寶石 event.SExpNN（倍率照名稱「1.3倍」，1800 秒）。效果存在 activePotionBuffs.exp（到期時間）＋expRate／expIcon，
//   擊殺經驗 × expRate（player-progression.js roll），倒下不會消失；已有更高倍率時不能喝，同倍率或更高就覆蓋並重新計時。
//  魔法卷軸：DB classname magicreel.MagicReel_Spell／Buff／Armor／Weapon <技能編號>：自身輔助魔法（ClassBuffs.selfBuff，例：魔法屏障 31、
//   保護罩 3、冥想術 32、神聖疾走 52）用 ClassBuffs.grant 直接生效；治癒類（初級／中級／高級／全部治癒術）照技能數值補血。
//   不用學會、不耗魔力，用一張扣一張；攻擊用的 MagicReel_Long（光箭、冰箭…）還沒接。
const ItemEffects=(()=>{
 const defs=()=>ITEM_USE_RULES.definitions;
 const elements={
  'etcitem:56264':{attr:2,label:'火',names:['火之','烈焰','火靈','炎獄','焚天']},
  'etcitem:56263':{attr:4,label:'水',names:['水之','海嘯','水靈','冰獄','冰封']},
  'etcitem:56262':{attr:1,label:'地',names:['地之','崩裂','地靈','裂地','撼地']},
  'etcitem:56261':{attr:8,label:'風',names:['風之','暴風','風靈','雷嵐','颶風']}
 };
 const ranks=[{damage:1,rate:70},{damage:3,rate:50},{damage:5,rate:35},{damage:8,rate:20},{damage:12,rate:10}];
 function elementInfo(entry){
  const element=elements[entry?.attributeScroll],rank=ranks[entry?.attributeRank-1];
  return element&&rank?{...rank,attr:element.attr,label:element.label,name:element.names[entry.attributeRank-1],level:entry.attributeRank}:null;
 }
 function elementalHit(entry,mob){
  const info=elementInfo(entry);
  if(!info)return 0;
  const factor=window.PlayerAbilityRules?.elementalFactor({attr:info.attr},mob?.spawn?.npc?.elements)||1;
  return Math.floor(info.damage*factor);
 }
 function attributeError(scroll,target){
  if(target?.item?.kind!=='weapon'||target.count!==1)return '請選擇一把武器。';
  if(target.attributeScroll&&target.attributeScroll!==scroll.key)return '武器已有其他屬性，卷軸未消耗。';
  return target.attributeRank>=ranks.length?'武器已達 5 階，卷軸未消耗。':'';
 }
 const accessoryTypes=new Set(['necklace','amulet','earring','ring','ring2','belt']);
 const enchantKind=key=>key.startsWith('etcitem:')?({
  40074:'armor',140074:'armor',240074:'armor',40087:'weapon',140087:'weapon',240087:'weapon',
  49147:'accessory',49148:'accessory'
 })[Number(key.slice(8))]:undefined;
 function canEnchant(entry,kind){
  const item=entry?.item;
  if(!item||entry.count!==1||(item.sourceRules?.safenchant??0)<0)return false;
  const targetKind=item.kind==='armor'&&accessoryTypes.has(item.type)?'accessory':item.kind;
  return targetKind===kind;
 }
 const enchantLabel=entry=>{const n=entry.enchant||0;return (n>=0?'+':'')+n+' '+entry.item.name;};
 function enchantOutcome(current,safe,kind,bless){
  if(bless===2)return current>-7?{change:-1}:{destroyed:true};
  if(current>=safe){
   const divisor=kind==='weapon'?3:safe===0?current+2:current;
   const chance=Math.floor((kind==='weapon'?103:100)/(divisor*(current>=9?2:1)));
   const roll=1+Math.floor(Math.random()*100);
   if(roll>=chance)return current>=9&&roll<chance*2?{change:0}:{destroyed:true};
  }
  let change=1;
  if(bless===0&&current<=5){
   const roll=1+Math.floor(Math.random()*100);
   change=current<=2?(roll>=77?3:roll>=33?2:1):roll<50?2:1;
  }
  return {change};
 }
 function applyEnchant(scrollUid,targetUid,kind){
  if(window.gameFlowState!=='playing'||CharacterActions.dead)return false;
  const target=OwnedInventory.items.find(e=>e.uid===targetUid),scroll=OwnedInventory.items.find(e=>e.uid===scrollUid);
  if(kind==='attribute'){
   if(!scroll||scroll.slot||!elements[scroll.key])return say('卷軸已變更，請重新選擇。');
   const error=attributeError(scroll,target);
   if(error)return say(error);
   const next=OwnedInventory.snapshot,row=next.find(e=>e.uid===targetUid),used=next.find(e=>e.uid===scrollUid);
   const rank=row.attributeRank||0,success=Math.random()*100<ranks[rank].rate;
   if(--used.count===0)next.splice(next.indexOf(used),1);
   if(success){row.attributeScroll=scroll.key;row.attributeRank=rank+1;}
   if(!OwnedInventory.applyChange(next))return false;
   toast(success?'屬性強化成功：'+elementInfo(row).name+'（'+row.attributeRank+' 階）。':'屬性強化失敗，維持原階級。');
   return true;
  }
  if(!scroll||scroll.slot||enchantKind(scroll.key)!==kind||!canEnchant(target,kind))return say('卷軸或裝備已變更，請重新選擇。');
  const rule=defs()[scroll.key],bless=scroll.bless??rule.bless;
  const current=target.enchant||0,safe=target.item.sourceRules?.safenchant??0;
  const {destroyed,change}=scroll.key==='etcitem:49147'?{change:1}:enchantOutcome(current,safe,kind,bless);
  const next=OwnedInventory.snapshot,row=next.find(e=>e.uid===targetUid),used=next.find(e=>e.uid===scrollUid);
  if(--used.count===0)next.splice(next.indexOf(used),1);
  if(destroyed)next.splice(next.indexOf(row),1);else row.enchant=current+change;
  if(!OwnedInventory.applyChange(next))return false;
  const message=destroyed?'強化失敗，'+enchantLabel(target)+' 已消失。':change?'強化結果：'+enchantLabel({...target,enchant:row.enchant})+'。':'強化值維持原樣。';
  toast(message);
  return true;
 }
 function openEnchant(scroll,kind){
  const items=OwnedInventory.items.filter(e=>kind==='attribute'?e.item.kind==='weapon'&&e.count===1:canEnchant(e,kind));
  if(!items.length){toast(kind==='accessory'?'背包裡沒有可強化的飾品。':'背包裡沒有可用這張卷軸強化的裝備。');return false;}
  const overlay=document.querySelector('#panel'),content=document.querySelector('#panelContent');
  cancelPointerGesture({preserveNavigation:true});
  overlay.classList.remove('classic-panel','reference-menu-panel','game-catalog-panel','npc-shop-panel','map-overview-panel','bookmark-panel');
  overlay.classList.add('native-dialog-panel');
  const title={weapon:'武器強化',armor:'盔甲強化',accessory:'飾品強化',attribute:'武器屬性強化'}[kind];
  overlay.setAttribute('aria-label',title);overlay.querySelector('#close').hidden=false;overlay.hidden=false;
  const dialog=uiElement('div','native-dialog enchant-scroll-dialog'),select=uiElement('select');
  const note=uiElement('p','','選擇裝備後，消耗 1 張卷軸。'),submit=uiElement('button','','確認強化');
  select.setAttribute('aria-label','選擇強化裝備');select.append(new Option('選擇裝備',''));
  for(const item of items)select.append(new Option(enchantLabel(item)+(item.slot?'（已穿戴）':''),item.uid));
  submit.type='button';submit.disabled=true;
  select.onchange=()=>{
   const item=items.find(e=>e.uid===select.value);
   submit.disabled=!item;
   if(!item){note.textContent='選擇裝備後，消耗 1 張卷軸。';return;}
   if(kind==='attribute'){
    const error=attributeError(scroll,item),rank=item.attributeRank||0;
    submit.disabled=!!error;
    note.textContent=error||('升至 '+(rank+1)+' 階，成功率 '+ranks[rank].rate+'%，普攻屬性傷害 +'+ranks[rank].damage+'。');
    return;
   }
   if(scroll.key==='etcitem:49147'){note.textContent='消耗 1 張卷軸，強化值必定增加 1。';return;}
   const safe=item.item.sourceRules?.safenchant??0,bless=scroll.bless??defs()[scroll.key].bless;
   note.textContent='安全強化值 +'+safe+'。'+(bless===2?(item.enchant||0)<=-7?'這件裝備可能消失。':'詛咒卷軸會降低 1 點強化值。':(item.enchant||0)>=safe?'超過安全範圍，失敗時裝備可能消失。':'使用卷軸強化這件裝備。');
  };
  submit.onclick=()=>{if(applyEnchant(scroll.uid,select.value,kind))overlay.hidden=true;};
  dialog.append(uiElement('p','',scroll.item.name),select,note,submit);
  content.replaceChildren(uiElement('h2','',title),dialog);overlay.scrollTop=0;
  return true;
 }
 function parse(e){
  const h=String(defs()[e.key]?.handler||'').trim(),name=e.item?.name||'';
  if(h==='Scroll_CurseRemoval')return {kind:'removeCurse'};
  let m=h.match(/^event\.(S?)Exp(\d+)(?:\s+(\d+))?/);
  if(m){const pct=name.match(/(\d+)%/),times=name.match(/(\d+(?:\.\d+)?)倍/);const rate=pct?Number(pct[1])/100:times?Number(times[1]):Number(m[2])/10;
   return {kind:'exp',rate,sec:Number(m[3])||(m[1]?1800:600)};}
  m=h.match(/^magicreel\.MagicReel_(Spell|Buff|Armor|Weapon|Long)\s+(\d+)/);
  if(m)return {kind:'scroll',skill:Number(m[2])};
  return null;
 }
 const say=t=>{document.querySelector('#log').textContent=t;return false;};
 function consume(e,effect={}){const next=OwnedInventory.snapshot,row=next.find(i=>i.uid===e.uid);if(!row||row.count<1)return false;row.count--;if(!row.count)next.splice(next.indexOf(row),1);return OwnedInventory.applyChange(next,effect);}
 function removeCurse(scroll,rule){
  const blessed=(scroll.bless??rule.bless)===0;
  const next=OwnedInventory.snapshot;
  const targets=next.filter(entry=>{
   if(!/^(weapon|armor):/.test(entry.key)||!blessed&&!entry.slot)return false;
   return (entry.bless??defs()[entry.key]?.bless)===2;
  });
  if(!targets.length)return say(blessed?'背包裡沒有受詛咒的裝備。':'身上沒有穿戴受詛咒的裝備。');
  const used=next.find(entry=>entry.uid===scroll.uid);
  if(!used||used.count<1)return false;
  if(--used.count===0)next.splice(next.indexOf(used),1);
  for(const target of targets)target.bless=1;
  if(!OwnedInventory.applyChange(next))return false;
  toast('已解除 '+targets.length+' 件裝備的詛咒。');
  return true;
 }
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
  if(/治癒|恢復|體力回復|生命的祝福/.test(skill.name)&&skill.damage?.some(Boolean)){
   if(CharacterActions.dead||characterMovementBlocked()||movementAnimating())return false;
   if(window.GroupHealing?.isGroup(skill)&&window.LocalServerClient?.online)return GroupHealing.castOnline(skill,{scrollUid:e.uid});
   const amount=PlayerAbilityRules.magicAmount(skill,null,{healing:true}).amount;
   if(!CharacterActions.play('skill'))return false;
   if(!consume(e,{hp:Math.min(maxHp,hp+amount)}))return false;
   window.GroupHealing?.applyAllies(skill,amount);
   IslandMonsters.playEffect(skill.gfx,worldX,worldY,movementTime());say('使用 '+e.item.name+'：體力 +'+amount+'。');return true;}
  if(window.PlayerSkills?.supports(p.skill))return PlayerSkills.cast(p.skill,{scroll:true,scrollUid:e.uid,pay:()=>consume(e)});
  if(!window.ClassBuffs?.selfBuff(p.skill))return say('「'+skill.name+'」卷軸還不能使用（目前只接自身輔助與治癒魔法）。');
  if(!ClassBuffs.grant(p.skill))return false;
  if(!consume(e))return false;
  const d=skill.duration||0;say('使用 '+e.item.name+'：'+skill.name+' '+(d<60?d+' 秒':Math.round(d/60*10)/10+' 分鐘')+'。');return true;
 }
 function use(uid){const e=OwnedInventory.items.find(i=>i.uid===uid);if(!e||e.slot)return null;const kind=elements[e.key]?'attribute':enchantKind(e.key);if(kind)return window.gameFlowState==='playing'&&!CharacterActions.dead&&openEnchant(e,kind);const p=parse(e);if(!p)return null;
  if(window.gameFlowState!=='playing'||CharacterActions.dead)return false;
  const rule=defs()[e.key]||{},lv=window.activeCharacterLevel||1;if(lv<(rule.minLevel||0)||rule.maxLevel&&lv>rule.maxLevel)return say('等級不符合道具限制。');
  if(p.kind==='removeCurse')return removeCurse(e,rule);
  return p.kind==='exp'?useExp(e,p):useScroll(e,p);}
 const expRate=()=>Number(window.activePotionBuffs?.exp)>Date.now()?Number(window.activePotionBuffs.expRate)||1:1;
 return {use,parse,expRate,elementInfo,elementalHit,isExp:e=>parse(e)?.kind==='exp'};
})();window.ItemEffects=ItemEffects;
