// 角色持有物品；原始物品定義不是背包內容。所有變更與角色狀態一併保存。
window.OwnedInventory=(()=>{
 const catalog=new Map(INTERFACE_CATALOG.items.map(i=>[i.kind+':'+i.id,i])),rules=ITEM_USE_RULES,cooldowns=new Map();
 let owner='',entries=[],warehouse=[],skillState={ids:[],element:''},sequence=0;
 const money='etcitem:40308';
 const clone=a=>JSON.parse(JSON.stringify(a)),level=()=>Number(window.activeCharacterLevel)||1;
 const slots=['weapon','helm','armor','tshirt','cloak','glove','boots','shield','necklace','belt','earring','ring1','ring2','ring3','ring4'];
 function slotFor(item){if(item.kind==='weapon')return 'weapon';if(item.kind!=='armor')return null;return {helmet:'helm',shirt:'tshirt',gloves:'glove',amulet:'necklace',ring:'ring1',ring2:'ring1'}[item.type]||(['helm','armor','tshirt','cloak','glove','boots','shield','necklace','belt','earring'].includes(item.type)?item.type:null)}
 const definition=e=>catalog.get(e.key),config=e=>({...rules.definitions[e.key],bless:e.bless??rules.definitions[e.key]?.bless});
 function validate(rows,role=null,charLevel=1){
  if(!Array.isArray(rows)||rows.length>=rules.maxSizeExclusive)return '背包格式或容量有誤';
  const ids=new Set(),used=new Set();for(const e of rows){
   if(!e||typeof e.uid!=='string'||!e.uid||e.uid.length>80||ids.has(e.uid)||!catalog.has(e.key)||!Number.isSafeInteger(e.count)||e.count<=0||e.count>2147483647)return '背包物品資料有誤';ids.add(e.uid);
   const r=config(e),item=definition(e);if(!r)return '道具設定不存在';if(!r.stackable&&e.count!==1)return '非堆疊物品數量有誤';if(e.slot!==undefined&&e.slot!==null&&typeof e.slot!=='string')return '穿戴欄位格式有誤';
   if(e.slot){if(!slots.includes(e.slot)||used.has(e.slot)||!(e.slot===slotFor(item)||/^ring[1-4]$/.test(e.slot)&&slotFor(item)==='ring1'))return '穿戴欄位資料有誤';used.add(e.slot);if(role&&!item.allowed.includes(role))return '穿戴物品不符合職業';if(role&&(r.minLevel>charLevel||r.maxLevel&&charLevel>r.maxLevel))return '穿戴物品不符合等級'}
  }const weapon=rows.find(e=>e.slot==='weapon');if(weapon&&definition(weapon).twoHand&&used.has('shield'))return '雙手武器與盾牌不能同時穿戴';if(role&&([...used].filter(s=>s.startsWith('ring')).length>(charLevel>=81?4:charLevel>=76?3:2)||charLevel<76&&(used.has('ring3')||used.has('ring4'))||charLevel<81&&used.has('ring4')))return '戒指欄位不符合角色等級';return null;
 }
 function visualMode(rows){const weapon=rows.find(e=>e.slot==='weapon'),item=weapon&&definition(weapon),modes=CharacterActions.available.weapons;if(!item)return 'unarmed';if(modes.includes(item.mode))return item.mode;if(/staff/.test(item.type)&&modes.includes('blunt'))return 'blunt';return 'unarmed'}
 function sync(){window.DBGameRules?.syncVitals();potions=entries.filter(e=>window.NativePotions?.isHealing(e.key)||rules.handlers[config(e).handler]?.kind==='hpGaussian').reduce((n,e)=>n+e.count,0);stats();if(typeof updateReferenceHud==='function')updateReferenceHud()}
 function refresh(){sync();if(document.querySelector('#panel.classic-panel:not([hidden])')&&typeof classicTab!=='undefined'&&['bag','equipment','status'].includes(classicTab))panel(classicTab)}
 function transact(next,effect={}){
  if(window.gameFlowState!=='playing'||!owner||owner!==window.activeCharacterId)return false;const error=validate(next,job,level());if(error){toast(error);return false}
  const old=entries,oldStorage=warehouse,oldSkills=skillState,oldBuffs=window.activePotionBuffs,oldHp=hp,oldMp=mp,oldMode=CharacterActions.weapon;entries=clone(next);warehouse=effect.warehouse??warehouse;skillState=effect.skills??skillState;window.activePotionBuffs=effect.potionBuffs??window.activePotionBuffs;hp=effect.hp??hp;mp=effect.mp??mp;
  const mode=visualMode(entries);if(mode!==oldMode||CharacterActions.dead!==(hp<=0))CharacterActions.reset(mode);
  if(!window.GameEntry?.saveActive()){entries=old;warehouse=oldStorage;skillState=oldSkills;window.activePotionBuffs=oldBuffs;hp=oldHp;mp=oldMp;if(CharacterActions.weapon!==oldMode||CharacterActions.dead!==(oldHp<=0))CharacterActions.reset(oldMode);sync();toast('儲存失敗，物品與狀態未變更。');return false}
  refresh();return true;
 }
 function reward(gain,loot){
  let next=clone(entries);
  for(const drop of loot){
   const candidate=clone(next);
   if(!addItems(candidate,drop.key,drop.count))return false;
   next=candidate;
  }
  const oldExperience=window.activeCharacterExperience,oldLevel=window.activeCharacterLevel;
  const previousVitals={hp,mp,maxHp,maxMp,growth:window.activeVitalGrowth};
  const experience=Math.min(PlayerProgression.maxExperience,oldExperience+gain);
  window.activeCharacterExperience=experience;
  window.activeCharacterLevel=PlayerProgression.levelFor(experience);
  PlayerGrowth.advance(window.activeCharacterLevel);
  const result=transact(next,{skills:DBGameRules.automaticSkills(job,window.activeCharacterLevel,skillState)});
  if(!result){window.activeCharacterExperience=oldExperience;window.activeCharacterLevel=oldLevel;hp=previousVitals.hp;mp=previousVitals.mp;maxHp=previousVitals.maxHp;maxMp=previousVitals.maxMp;window.activeVitalGrowth=previousVitals.growth;sync();}
  return result;
 }
 function consumeArrow(){
  const next=clone(entries),index=next.findIndex(e=>definition(e).type==='arrow');
  if(index<0)return false;
  if(--next[index].count===0)next.splice(index,1);
  return transact(next);
 }
 function activate(rows=[],storage=[],skills={ids:[],element:''}){const error=validate(rows,job,level());if(error)throw Error(error);owner=window.activeCharacterId||'';entries=clone(rows);warehouse=clone(storage);skillState=DBGameRules.automaticSkills(job,level(),clone(skills));cooldowns.clear();CharacterActions.reset(visualMode(entries));sync()}
 function learnSkill(uid,skill){
  const next=clone(entries);
  if(!deduct(next,uid,1))return false;
  return transact(next,{skills:{...skillState,ids:[...skillState.ids,skill]}});
 }
 function setElfElement(element){
  if(job!=='妖精'||level()<30||skillState.element||!['地','風','水','火'].includes(element))return false;
  return transact(clone(entries),{skills:{...skillState,element}});
 }
 function castCost(skill,nextHp){
  const next=clone(entries);
  if(mp<skill.mp||hp<=skill.hp)return false;
  if(skill.materialCount&&!deduct(next,next.find(e=>e.key==='etcitem:'+skill.material)?.uid,skill.materialCount))return false;
  return transact(next,{hp:nextHp??hp-skill.hp,mp:mp-skill.mp});
 }
 function addItems(next,key,count){
  if(!Number.isSafeInteger(count)||count<=0||count>2147483647)return false;
  const r=rules.definitions[key];if(!catalog.has(key)||!r)return false;let uid;
  if(r.stackable&&next.some(e=>e.key===key)){const e=next.find(e=>e.key===key);if(e.count+count>2147483647)return false;e.count+=count;uid=e.uid}
  else{if(next.length+(r.stackable?1:count)>=rules.maxSizeExclusive){toast('背包容量不足。');return false}for(let i=0;i<(r.stackable?1:count);i++){do{uid='item-'+Date.now().toString(36)+'-'+(++sequence).toString(36)}while(next.some(e=>e.uid===uid));next.push({uid,key,count:r.stackable?count:1,slot:null})}}
  return uid;
 }
 function receive(kind,id,count=1){
  const next=clone(entries),uid=addItems(next,kind+':'+id,count);
  return uid&&transact(next)?uid:false;
 }
 function deduct(next,uid,count){
  const i=next.findIndex(e=>e.uid===uid&&!e.slot);
  if(i<0||next[i].count<count)return false;
  next[i].count-=count;
  if(!next[i].count)next.splice(i,1);
  return true;
 }
 function pay(next,count){
  return count===0||deduct(next,next.find(e=>e.key===money)?.uid,count);
 }
 function validateWarehouse(rows){
  return validate(rows)|| (rows.some(e=>e.slot)?'倉庫含有穿戴中的物品':null);
 }
 function transfer(uid,withdraw,fee){
  const next=clone(entries),storage=clone(warehouse);
  const from=withdraw?storage:next,to=withdraw?next:storage;
  const item=from.find(e=>e.uid===uid&&!e.slot);
  if(!item)return '找不到物品，或物品正在穿戴。';
  if(withdraw&&!pay(next,fee))return '需要 '+fee+' 天幣。';
  if(!addItems(to,item.key,item.count))return '欄位不足或堆疊已滿。';
  deduct(from,uid,item.count);
  return transact(next,{warehouse:storage})?'':'存檔失敗，物品未移動。';
 }
 function trade(key,count,price,sell){
  const next=clone(entries);
  if(sell){
   const row=next.find(e=>e.key===key&&!e.slot&&e.count>=count);
   if(!row||!deduct(next,row.uid,count))return '背包沒有可出售的物品。';
   if(price&&!addItems(next,money,price))return '背包無法收取天幣。';
  }else{
   if(!pay(next,price))return '天幣不足。';
   if(!addItems(next,key,count))return '背包欄位不足或堆疊已滿。';
  }
  return transact(next)?'':'存檔失敗，交易未完成。';
 }
 function unequip(uid){const e=entries.find(e=>e.uid===uid);if(!e?.slot)return false;const r=config(e);if(r.bless===2){toast('被詛咒的裝備無法卸下。');return false}if(characterMovementBlocked()||movementAnimating()){toast('請等目前動作結束。');return false}
  if(e.slot==='tshirt'&&entries.some(i=>['armor','cloak'].includes(i.slot))||e.slot==='armor'&&entries.some(i=>i.slot==='cloak')){toast('請先脫下外層裝備。');return false}
  const next=clone(entries);next.find(i=>i.uid===uid).slot=null;return transact(next);
 }
 function prepareTransform(card){
  if(characterMovementBlocked()||movementAnimating())return false;
  const blocked=entries.filter(e=>e.slot&&!TransformCards.canEquip(definition(e),card));
  if(blocked.some(e=>config(e).bless===2))return false;
  const ids=new Set(blocked.map(e=>e.uid));
  return !ids.size||transact(entries.map(e=>ids.has(e.uid)?{...e,slot:null}:e));
 }
 function equip(uid){
  const e=entries.find(e=>e.uid===uid);if(!e)return false;if(e.slot)return unequip(uid);const item=definition(e),r=config(e),slot=slotFor(item);if(!slot)return false;
  if(!item.allowed.includes(job)){toast('目前職業無法使用這項裝備。');return false}if(window.TransformCards&&!TransformCards.canEquip(item)){toast('目前的變身無法裝備這項物品。');return false}if(level()<r.minLevel||r.maxLevel&&level()>r.maxLevel){toast('角色等級不符合道具限制。');return false}if(characterMovementBlocked()||movementAnimating()){toast('請等目前動作結束。');return false}
  if(item.kind==='weapon'&&[65,133,191,192].includes(item.id)){toast('這項任務武器不能在說話之島使用。');return false}
  const current=entries.find(i=>i.slot===slot),weapon=entries.find(i=>i.slot==='weapon');
  if(slot==='weapon'&&item.twoHand&&entries.some(i=>i.slot==='shield')||slot==='shield'&&weapon&&definition(weapon).twoHand){toast('雙手武器與盾牌不能同時裝備。');return false}
  if(slot==='tshirt'&&entries.some(i=>['armor','cloak'].includes(i.slot))||slot==='armor'&&entries.some(i=>i.slot==='cloak')){toast('請先脫下外層裝備。');return false}
  const next=clone(entries);let target=slot;
  if(slot==='ring1'){const limit=level()>=81?4:level()>=76?3:2;target=['ring1','ring2','ring3','ring4'].slice(0,limit).find(s=>!entries.some(i=>i.slot===s));if(!target){toast('目前等級的戒指欄位已滿。');return false}}
  else if(current){if(slot!=='weapon'){toast('這個欄位已有裝備，請先卸下。');return false}if(config(current).bless===2){toast('手上的武器被詛咒，無法更換。');return false}next.find(i=>i.uid===current.uid).slot=null}
  next.find(i=>i.uid===uid).slot=target;return transact(next);
 }
 function gaussian(){return Math.sqrt(-2*Math.log(Math.max(Number.MIN_VALUE,Math.random())))*Math.cos(2*Math.PI*Math.random())}
 function use(uid){
  if(window.gameFlowState!=='playing'||owner!==window.activeCharacterId)return false;const e=entries.find(i=>i.uid===uid);if(!e){toast('背包中沒有這個物品。');return false}if(CharacterActions.dead){toast('倒地時無法使用物品。');return false}
  if(window.PlayerSkills?.isBook(e.key))return PlayerSkills.learn(uid);
  const potionUse=window.NativePotions?.use(uid);if(potionUse!==undefined&&potionUse!==null)return potionUse;
  const nativeUse=window.DBGameRules?.useItem(uid);if(nativeUse!==undefined&&nativeUse!==null)return nativeUse;
  const item=definition(e),r=config(e);if(item.kind!=='etcitem')return equip(uid);if(level()<r.minLevel||r.maxLevel&&level()>r.maxLevel){toast('等級不符合道具限制。');return false}
  const handler=rules.handlers[r.handler];if(!handler){toast('此道具需要目標或尚未接入的功能，物品未消耗。');return false}if(window.playerItemState?.decayPotion){toast('喉嚨灼熱，無法喝東西。');return false}
  const now=movementTime();if(r.delayId&&(cooldowns.get(r.delayId)||0)>now){toast('道具使用冷卻中。');return false}
  const effects=window.playerItemState||{};let nextHp=hp,nextMp=mp;
  if(handler.kind==='hpGaussian'){let amount=Math.trunc(handler.base*(gaussian()/handler.deviationDivisor+1));if(effects.healPotionBonusPct>0)amount+=Math.trunc(amount*effects.healPotionBonusPct/100);if(effects.pollutedWater)amount>>=1;if(effects.waterDragonHalf)amount>>=1;if(effects.waterDragonInvert)amount*=-1;nextHp=Math.max(0,Math.min(maxHp,hp+amount))}
  else nextMp=Math.min(maxMp,mp+handler.base+Math.floor(Math.random()*handler.range));
  const next=clone(entries);const used=next.find(i=>i.uid===uid);used.count--;if(used.count===0)next.splice(next.indexOf(used),1);
  if(!transact(next,{hp:nextHp,mp:nextMp}))return false;if(r.delayId&&r.delayMs)cooldowns.set(r.delayId,now+r.delayMs);if(window.playerItemState)window.playerItemState.absoluteBarrier=false;toast('使用 '+item.name);return true;
 }
 function usePotion(){const e=entries.find(i=>i.key==='etcitem:40010')||entries.find(i=>window.NativePotions?.isHealing(i.key)||rules.handlers[config(i).handler]?.kind==='hpGaussian');if(!e){toast('背包中沒有回復藥水。');return false}return use(e.uid)}
 document.querySelector('#heal').onclick=usePotion;potions=0;
 return {activate,validate,validateWarehouse,get healingItems(){return entries.filter(e=>window.NativePotions?.isHealing(e.key)||rules.handlers[config(e).handler]?.kind==='hpGaussian').map(e=>({...e,item:definition(e)}))},applyChange:transact,reward,learnSkill,setElfElement,castCost,get skills(){return clone(skillState)},prepareTransform,transfer,trade,receive,get warehouse(){return clone(warehouse)},get storedItems(){return warehouse.map(e=>({...e,item:definition(e)}))},use,equip,unequip,usePotion,consumeArrow,slotFor,deactivate(){owner='';entries=[];warehouse=[];skillState={ids:[],element:''};cooldowns.clear();potions=0},get owner(){return owner},get snapshot(){return clone(entries)},get equippedWeaponType(){const weapon=entries.find(e=>e.slot==='weapon');return weapon?definition(weapon).type:null},get items(){return entries.map(e=>({...e,item:definition(e)}))}};
})();
