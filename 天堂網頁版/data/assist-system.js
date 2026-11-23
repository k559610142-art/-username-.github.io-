// 輔助系統（2026-11-13 第 1 期；第 2 期加「補給→自動購買」：用完時用商店最低價扣金幣買）：取代畫面左上「自動喝水」鈕，打開分頁視窗（狩獵／補給／魔法／名單）。
//  狩獵：掛機索敵範圍（IslandCombat.setAutoRange）、AUTO 沒怪 N 秒自動用瞬間移動卷軸、體力低於 N% 用回家卷軸回村（AutoPotion 原有）
//  補給：自動補血道具（AutoPotion 原有）、綠水／勇水類／慎重藥水／藍水 效果沒了自動喝（只用身上有的，NativePotions.durationState 判斷種類）
//  魔法：攻擊技能（AUTO／攻擊目標時魔力 ≥ N% 施放）、治癒魔法（AutoPotion 的補血技能）、輔助魔法（ClassBuffs.selfBuff，效果沒了就補）
//  名單：每張地圖各自的怪物名單，「不打」＝AUTO 不主動找（被打仍還手）、「瞬移」＝附近 8 格出現就用瞬間移動卷軸離開
//  第 3 期：撐不住先瞬移（一分鐘內第 3 次改回村，auto-potion.js 讓出回村判斷）、補血喝完改喝別種（auto-potion.js healFallback）、
//   死亡後自動再變身（TransformCards）、開怪技能、範圍技能、洗魔（心靈轉換 130）、召喚分頁（召喚術 51／召喚屬性精靈 154／強力 162，
//   戴召喚控制戒指時用 Summons.useLast 召喚上次手選的）。遊戲沒有的系統（寵物、夥伴、武器耐久、水中、中毒、木乃伊、經驗藥水效果）不做。
//  2026-11-18 第 4 期（使用者「1～6 全做」）：自動吃食物（飽食度）、回村後回原地續掛（用瞬間移動卷軸傳回）、背包／負重快滿處理、
//   掛機統計（統計分頁）、設定方案 3 組＋複製給同帳號其他角色（方案分頁）、名單「優先打」（island-combat.js 選目標時先找）。
//  2026-11-18 第 5 期：危險迴避（附近有首領／其他玩家就瞬移）、自動召喚魔法娃娃（記住上次召喚的那隻；手動解除召喚就暫停）。
//  設定存在角色存檔 assist 欄位（entry-flow.js saveActiveCharacter／enterSelectedCharacter）。
const AssistSystem=(()=>{
 const el=(t,c,x)=>uiElement(t,c,x);
 const catalog=new Map(INTERFACE_CATALOG.items.map(i=>[i.kind+':'+i.id,i]));
 const CURES=[['skill','解毒術'],['etcitem:40017','解毒藥水'],['etcitem:40507','安特樹枝']];
 const POTIONS=[['haste','綠色藥水（加速）',['haste']],['brave','二段加速（勇水／精靈餅乾）',['brave','elfBrave']],['cake','三段加速（巧克力蛋糕）',['braveX']],['wisdom','慎重藥水',['wisdom']],['blue','藍色藥水（魔力回復）',['blue']]];
 // 自動購買（第 2 期）：用完（身上 0 個）時從商店買，價格取所有 NPC 商店裡最便宜的那一家（NATIVE_NPC_DIALOGS.shops＋islandNpcServiceData.shop，[道具, 順序, 買價, 一組幾個, 賣價, 強化]）
 const SHOP=new Map();
 for(const rows of [...Object.entries(NATIVE_NPC_DIALOGS.shops||{}).filter(([id])=>id!=='70089'&&(NATIVE_NPC_DIALOGS.actions[id]?.currency||40308)===40308).map(([,rows])=>rows),islandNpcServiceData.shop||[]])for(const [id,,buy,pack,,ench] of rows){if(!(buy>=0)||ench)continue;const n=Math.max(1,pack|0),b=SHOP.get(id);if(!b||buy/n<b.price/b.pack)SHOP.set(id,{price:buy,pack:n});}
 const ARROW_RESTOCK_AT=100;
 const ARROW_KEYS=['etcitem:40743','etcitem:40744','etcitem:40746'];
 const QTY=[1,5,10,20,50,100,200,500,1000];
 // 2026-11-18 使用者：商店沒賣或職業不能用時（例如騎士的慎重藥水）也顯示該道具的圖，不要只有購物車
 const BUY_ICON={tp:'etcitem:40100',home:'etcitem:40081',haste:'etcitem:40018',brave:'etcitem:40014',wisdom:'etcitem:40016',blue:'etcitem:40015',arrow:'etcitem:40743',cake:'etcitem:49138',meat:'etcitem:40056',barrier:'etcitem:40889',antidote:'etcitem:40017'};
 const BUYS=[['tp','一般瞬間移動卷軸',10],['home','傳送回家的卷軸',5],['haste','綠色藥水',5],['brave','二段加速',5],['cake','巧克力蛋糕（三段加速）',5],['meat','肉',20],['barrier','魔法屏障卷軸',5],['antidote','解毒藥水',5],['wisdom','慎重藥水',5],['blue','藍色藥水',5],['arrow','箭（裝備弓時）',1000]];
 const DIRECT_BUYS=new Set([...POTIONS.map(([key])=>key),'meat','antidote','barrier']);
 const base=()=>({retaliateRed:false,noMobTp:false,noMobSec:10,tpScrollType:'normal',potions:Object.fromEntries(POTIONS.map(([k])=>[k,false])),attackOn:false,attackSkill:null,attackMp:30,buffs:[],list:{},escape:false,healFallback:false,arrowBuyKey:ARROW_KEYS[0],cureOn:false,cureMethod:CURES[0][0],morph:false,morphCard:null,morphLost:false,openOn:false,openSkill:null,openMp:50,aoeOn:false,aoeSkill:null,aoeRange:3,aoeCount:3,aoeMp:50,mindOn:false,mindHp:80,mindMp:40,summonOn:false,ringOn:false,expAuto:false,barrierScroll:false,eatOn:false,eatAt:30,returnOn:false,returnHp:80,returnSpot:null,fullOn:false,fullWeight:80,fullSlots:10,fullAct:'home',presets:[null,null,null],dangerOn:false,dangerBoss:true,dangerPlayer:'red',dangerRange:8,dollOn:false,dollId:null,pick:Object.fromEntries(POTIONS.map(([k])=>[k,null])),buy:Object.fromEntries(BUYS.map(([k,,n])=>[k,{on:false,n}]))});
 let stoneQueue=null;
 let buyOpen=false;
 let state=base(),owner='',dialog=null,tab='hunt',idleSince=0,lastTp=0,retry=new Map(),escapes=[],lostMorph=null,seenMorph=null,lastOpen=null;
 const int=(v,lo,hi,d)=>Number.isInteger(v)?Math.max(lo,Math.min(hi,v)):d;
 function validate(v){const s=base();if(!v||typeof v!=='object')return s;
  if(['auto','normal','blessed'].includes(v.tpScrollType))s.tpScrollType=v.tpScrollType;s.noMobTp=v.noMobTp===true;s.noMobSec=int(v.noMobSec,3,60,10);for(const k of Object.keys(s.potions))s.potions[k]=v.potions?.[k]===true;
  s.attackOn=v.attackOn===true;s.attackSkill=Number.isInteger(v.attackSkill)&&playerSkillData.skills[v.attackSkill]?v.attackSkill:null;s.attackMp=int(v.attackMp,0,99,30);
  s.buffs=Array.isArray(v.buffs)?[...new Set(v.buffs.filter(id=>Number.isInteger(id)&&playerSkillData.skills[id]))]:[];
  for(const k of ['retaliateRed','escape','healFallback','cureOn','morph','openOn','aoeOn','mindOn','summonOn','ringOn','expAuto','barrierScroll'])s[k]=v[k]===true;
  if(ARROW_KEYS.includes(v.arrowBuyKey))s.arrowBuyKey=v.arrowBuyKey;
  if(CURES.some(([method])=>method===v.cureMethod))s.cureMethod=v.cureMethod;
  for(const k of ['eatOn','returnOn','fullOn'])s[k]=v[k]===true;s.eatAt=int(v.eatAt,1,224,30);
  s.returnHp=int(v.returnHp,10,100,80);const rs=v.returnSpot;s.returnSpot=rs&&Number.isInteger(rs.mapId)&&Number.isInteger(rs.x)&&Number.isInteger(rs.y)?{mapId:rs.mapId,x:rs.x,y:rs.y}:null;
  s.fullWeight=int(v.fullWeight,30,100,80);s.fullSlots=int(v.fullSlots,0,60,10);s.fullAct=v.fullAct==='stop'?'stop':'home';
  if(Array.isArray(v.presets))s.presets=[0,1,2].map(i=>{const p=v.presets[i];return p&&typeof p==='object'&&p.assist&&typeof p.assist==='object'?{name:typeof p.name==='string'?p.name.slice(0,20):'方案 '+(i+1),at:Number.isFinite(p.at)?p.at:0,assist:p.assist,autoPotion:p.autoPotion&&typeof p.autoPotion==='object'?p.autoPotion:null,range:Number.isInteger(p.range)?p.range:null}:null;});
  s.dangerOn=v.dangerOn===true;s.dangerBoss=v.dangerBoss!==false;s.dangerPlayer=['off','red','all'].includes(v.dangerPlayer)?v.dangerPlayer:'red';s.dangerRange=int(v.dangerRange,3,20,8);
  s.dollOn=v.dollOn===true;s.dollId=typeof v.dollId==='string'&&v.dollId.length<20?v.dollId:null;
  s.morphCard=typeof v.morphCard==='string'&&v.morphCard.length<80?v.morphCard:null;s.morphLost=v.morphLost===true; // 記憶的變身卡（2026-11-18）
  const skillOk=id=>Number.isInteger(id)&&playerSkillData.skills[id]?id:null;s.openSkill=skillOk(v.openSkill);s.aoeSkill=skillOk(v.aoeSkill);
  s.openMp=int(v.openMp,0,99,50);s.aoeRange=int(v.aoeRange,1,8,3);s.aoeCount=int(v.aoeCount,2,10,3);s.aoeMp=int(v.aoeMp,0,99,50);s.mindHp=int(v.mindHp,1,99,80);s.mindMp=int(v.mindMp,1,99,40);
  for(const k of Object.keys(s.pick))s.pick[k]=typeof v.pick?.[k]==='string'&&catalog.has(v.pick[k])?v.pick[k]:null;
  // 舊存檔若指定三段加速道具，就把該選擇移到新的三段設定。
  if(s.pick.brave&&ITEM_USE_RULES.definitions[s.pick.brave]?.handler?.includes('BraveCake')){
   if(!Object.hasOwn(v.pick,'cake'))s.pick.cake=s.pick.brave;
   if(!Object.hasOwn(v.potions||{},'cake')){s.potions.cake=s.potions.brave;s.potions.brave=false;}
   s.pick.brave=null;
  }
  for(const [k] of BUYS){const b=v.buy?.[k];if(b)s.buy[k]={on:b.on===true,n:QTY.includes(b.n)?b.n:s.buy[k].n};}
  if(v.list&&typeof v.list==='object')for(const [map,names] of Object.entries(v.list)){if(!names||typeof names!=='object')continue;const m={};for(const [n,mode] of Object.entries(names))if(['skip','tp','first'].includes(mode))m[n]=mode;if(Object.keys(m).length)s.list[map]=m;}
  return s;}
 function activate(v){stoneQueue=null;state=validate(v);owner=window.activeCharacterId||'';idleSince=0;lastTp=0;retry.clear();escapes=[];lostMorph=null;seenMorph=null;lastOpen=null;base0=null;returning=false;resetStats();close();}
 function save(next){if(window.gameFlowState!=='playing'||owner!==window.activeCharacterId)return false;const old=state;state=validate({...state,...next});if(!GameEntry.saveActive()){state=old;return false;}return true;}
 const mapList=()=>state.list[String(window.activeMapId||0)]||{};
 function skip(mob){const m=mapList()[mob?.spawn?.npc?.name];return m==='skip'||m==='tp';}
 // 名單「優先打」（2026-11-18）：island-combat.js 找目標時先找這些
 function prefer(){if(owner!==window.activeCharacterId)return null;const names=Object.entries(mapList()).filter(([,m])=>m==='first').map(([n])=>n);return names.length?mob=>names.includes(mob?.spawn?.npc?.name):null;}

 // ---- 動作 ----
 const owned=()=>OwnedInventory.owner===owner?OwnedInventory.items.filter(e=>!e.slot):[];
 const handler=e=>ITEM_USE_RULES.definitions[e.key]?.handler||'';
 const learned=()=>OwnedInventory.owner===owner?PlayerSkills.availableIds():[];
 const busy=()=>characterMovementBlocked()||movementAnimating();
 const tpScrollBless=entry=>entry.bless??ITEM_USE_RULES.definitions[entry.key]?.bless;
 function teleportScrolls(){
  const scrolls=owned().filter(e=>handler(e)==='teleport.Move_Reel');
  const normal=scrolls.filter(e=>tpScrollBless(e)===1),blessed=scrolls.filter(e=>tpScrollBless(e)===0);
  return state.tpScrollType==='normal'?normal:state.tpScrollType==='blessed'?blessed:[...normal,...blessed];
 }
 function teleportScrollIcon(){return teleportScrolls()[0]?.key||(state.tpScrollType==='blessed'?'etcitem:140100':'etcitem:40100');}
 function teleport(){const s=teleportScrolls()[0];if(!s||movementTime()-lastTp<2000)return false;lastTp=movementTime();const ok=TeleportScrolls.random(s.uid);if(ok){idleSince=movementTime();IslandCombat.resetAfterTeleport?.();}return ok;}
 function potionFor(kind){const kinds=POTIONS.find(p=>p[0]===kind)[2];if(kinds.some(k=>Number(window.activePotionBuffs?.[k])>Date.now()+1500))return null;
  const ok=e=>kinds.includes(NativePotions.durationState(e.key)?.key),pick=state.pick[kind];
  return owned().find(e=>ok(e)&&(!pick||e.key===pick))||null;}
 // 每種補給：身上算哪些道具、要買哪一個（商店有賣、職業能用的最便宜那個）
 const kindsOf=k=>POTIONS.find(p=>p[0]===k)?.[2];
 function matcher(k){
  if(k==='tp')return key=>ITEM_USE_RULES.definitions[key]?.handler==='teleport.Move_Reel'&&ITEM_USE_RULES.definitions[key]?.bless===1;
  if(k==='home')return key=>ITEM_USE_RULES.definitions[key]?.handler==='teleport.GoHome_Reel';
  if(k==='meat'||k==='barrier'||k==='antidote')return key=>key===BUY_ICON[k];
  if(k==='arrow')return key=>key===state.arrowBuyKey;
  const kinds=kindsOf(k);return key=>kinds.includes(NativePotions.durationState(key)?.key);
 }
 const shopProducts=Array.from(SHOP,([id,offer])=>({key:'etcitem:'+id,id,...offer})).filter(p=>catalog.has(p.key));
 function product(k){const match=matcher(k);let best=null;for(const p of shopProducts){if(!match(p.key))continue;if(!best||p.price/p.pack<best.price/best.pack)best=p;}return best;}
 function quote(p,n){const packs=Math.ceil(n/p.pack);return {count:packs*p.pack,cost:packs*p.price};}
 function healingOffers(){
  return shopProducts.filter(p=>NativePotions.isHealing(p.key)).map(p=>({key:p.key,...quote(p,100)})).sort((a,b)=>a.cost-b.cost);
 }
 const bowEquipped=()=>{const w=OwnedInventory.items.find(e=>e.slot==='weapon');return ['bow','singlebow'].includes(w?.item?.type);};
 let buyNotice=0;
 function directSupply(kind){
  if(kind==='meat')return {enabled:state.eatOn,key:BUY_ICON.meat};
  if(kind==='antidote')return {enabled:state.cureOn&&state.cureMethod!=='skill',key:state.cureMethod};
  if(kind==='barrier')return {enabled:state.barrierScroll,key:BUY_ICON.barrier};
  return {enabled:state.potions[kind],key:state.pick[kind]};
 }
 function directOffer(kind,key){
  if(!key)return product(kind);
  if(kind!=='antidote'&&!matcher(kind)(key))return null;
  return shopProducts.find(offer=>offer.key===key)||null;
 }
 function supplyPrice(kind,key){
  const offer=directOffer(kind,key);
  if(!offer)return kind==='wisdom'&&job!=='法師'?'限法師使用':'商店未販售';
  const {count,cost}=quote(offer,state.buy[kind].n);
  return (key?'':catalog.get(offer.key).name+' · ')+'補貨 ×'+count+' · '+cost.toLocaleString()+' 天幣';
 }
 function autoBuy(now){
  for(const [k] of BUYS){
   const b=state.buy[k],direct=DIRECT_BUYS.has(k)?directSupply(k):null;
   if(!(direct?direct.enabled:b.on)||(retry.get('buy'+k)||0)>now)continue;
   if(k==='arrow'&&!bowEquipped())continue;
   const match=direct?.key?key=>key===direct.key:matcher(k);
   const remaining=OwnedInventory.items.reduce((sum,e)=>sum+(!e.slot&&match(e.key)?e.count:0),0);
   if(remaining>(k==='arrow'?ARROW_RESTOCK_AT:0))continue;
   const p=direct?directOffer(k,direct.key):product(k);
   retry.set('buy'+k,now+5000);if(!p)continue;
   const {count,cost}=quote(p,b.n),err=OwnedInventory.trade(p.key,count,cost,false);
   if(err){retry.set('buy'+k,now+30000);if(now-buyNotice>30000){buyNotice=now;toast('自動購買 '+catalog.get(p.key).name+' 失敗：'+err);}}
   else{toast('自動購買 '+catalog.get(p.key).name+' ×'+count+'（'+cost.toLocaleString()+' 金幣）');return true;}}
  return false;
 }
 const pctOf=(v,m)=>m?v*100/m:0;
 const attackSkills=ids=>ids.filter(id=>PlayerSkills.supports(id)&&!/治癒|恢復/.test(playerSkillData.skills[id].name)&&!ClassBuffs.handles(id)||[132,187,207,218,229].includes(id));
 const summonSkill=()=>[51,162,154].find(id=>learned().includes(id))||null;
 function lowHp(){const ap=AutoPotion.snapshot;return ap.homeEnabled&&maxHp&&hp*100<=maxHp*ap.homeThreshold&&(tile(worldX,worldY)&48)!==16;}
 // 撐不住先瞬移：一分鐘內前兩次用瞬間移動卷軸，第 3 次用回家卷軸
 function escape(now){if(!state.escape||!lowHp()||(retry.get('esc')||0)>now)return false;retry.set('esc',now+1500);escapes=escapes.filter(t=>now-t<60000);
  if(escapes.length<2&&teleportScrolls().length){if(teleport()){escapes.push(now);return true;}return false;} // 瞬移冷卻中就等，不提早回村
  const home=owned().find(e=>handler(e)==='teleport.GoHome_Reel');if(home&&TeleportScrolls.use(home.uid)){escapes=[];return true;}return false;}
 // ---- 第 4 期 ----
 const foods=()=>owned().filter(e=>ITEM_USE_RULES.definitions[e.key]?.useType==='food');
 function weightPct(){return ItemProperties.weightPercent(OwnedInventory.items,window.PlayerClassStats?.read?.().attributes||window.playerAttributes,window.ClassBuffs?.maxWeight);}
 const BAG_MAX=180,bagLeft=()=>BAG_MAX-OwnedInventory.items.length;
 let fullHome=false,returnAt=0,returning=false,notice=0;
 const say=(t,now)=>{if(now-notice>20000){notice=now;toast(t);}};
 // 回村時記住掛機地點：AUTO 中用回家卷軸（低血回村、撐不住回村）就記下，補完再傳回來
 const tsUse=TeleportScrolls.use.bind(TeleportScrolls);
 TeleportScrolls.use=function(uid,...rest){
  const e=OwnedInventory.items.find(x=>x.uid===uid),home=e&&ITEM_USE_RULES.definitions[e.key]?.handler==='teleport.GoHome_Reel';
  const spot={mapId:window.activeMapId||0,x:worldX,y:worldY},wasAuto=IslandCombat.mode==='auto';const r=tsUse(uid,...rest);
  if(r&&home&&wasAuto&&state.returnOn&&!fullHome&&owner===window.activeCharacterId){IslandCombat.stop();save({returnSpot:spot});returnAt=movementTime()+4000;}
  return r;};
 const canReturnTo=id=>WorldMaps.has(id)&&!!(TeleportMapRules[id]?.markable||TeleportMapRules[id]?.teleportable);
 function goBack(now){
  const s=state.returnSpot;if(!canReturnTo(s.mapId)){toast('掛機地點（'+WorldMaps.name(s.mapId)+'）不能用卷軸傳回，請自己走回去。');save({returnSpot:null});return false;}
  const sc=teleportScrolls()[0];if(!sc){say('回原地需要瞬間移動卷軸（可開「補給 → 自動購買」）。',now);return false;}
  if(window.IslandNpcAi?.cursed||window.playerItemState?.teleportBlocked||window.playerItemState?.rooted||window.playerItemState?.paralyzed)return false;
  const next=OwnedInventory.snapshot,i=next.findIndex(e=>e.uid===sc.uid);if(i<0)return false;if(--next[i].count===0)next.splice(i,1);
  returning=true;
  WorldMaps.travel(s.mapId,s.x,s.y,next).then(ok=>{returning=false;if(!ok){toast('回原地失敗，卷軸未消耗。');return;}
   window.DungeonPortals?.settle?.();save({returnSpot:null});IslandCombat.resetAfterTeleport?.();IslandMonsters.playEffect?.(169,worldX,worldY,movementTime());
   idleSince=movementTime();setTimeout(()=>{if(!CharacterActions.dead)IslandCombat.begin('auto');},400);toast('已回到掛機地點，繼續 AUTO。');}).catch(()=>{returning=false;toast('回原地失敗，卷軸未消耗。');});
  return true;}
 // ---- 第 5 期 ----
 // 首領判斷和假人系統一樣（fake-players.js isBoss）：名字有 BOSS，或單隻生成且體力 1500 以上
 const isBoss=m=>!m.spawn?.bot&&(/BOSS/i.test(m.spawn?.npc?.name||'')||(m.spawn?.count===1&&(m.spawn?.npc?.hp||0)>=1500));
 const dangerOf=m=>m.hp>0&&(state.dangerBoss&&isBoss(m)?'首領 '+m.spawn.npc.name:m.spawn?.bot&&(state.dangerPlayer==='all'||state.dangerPlayer==='red'&&m.fp?.red)?'玩家 '+(m.spawn.npc?.name||m.fp?.name||''):'');
 function danger(now,auto){if(!state.dangerOn||!auto||(retry.get('danger')||0)>now)return false;
  let why='';for(const m of IslandMonsters.around(worldX,worldY,state.dangerRange)){why=dangerOf(m);if(why)break;}if(!why)return false;
  retry.set('danger',now+2500);if(teleport()){toast('危險迴避：附近出現'+why+'，已瞬移。');return true;}say('危險迴避：附近出現'+why+'，但沒有瞬間移動卷軸或這裡不能瞬移。',now);return false;}
 // 魔法娃娃：記住上次召喚的；沒有娃娃時自動召喚（材料不足就每分鐘再試）；自己按「解除召喚」就暫停，直到再手動召喚
 let dollPaused=false;
 if(window.TdjSystems?.dolls?.dismiss){const dis=TdjSystems.dolls.dismiss.bind(TdjSystems.dolls);TdjSystems.dolls.dismiss=function(...a){const r=dis(...a);if(r)dollPaused=true;return r;};}
 const dollName=id=>{const d=typeof gameCatalogData!=='undefined'&&gameCatalogData.dolls?.find(x=>String(x.id)===String(id));return d?d.name.replace(/^.*：/,''):'娃娃 '+id;};
 function autoDoll(now){const dolls=window.TdjSystems?.dolls;if(!dolls)return false;const cur=dolls.active;
  if(cur){dollPaused=false;if(String(cur)!==state.dollId)save({dollId:String(cur)});return false;}
  if(!state.dollOn||!state.dollId||dollPaused||(retry.get('doll')||0)>now)return false;retry.set('doll',now+60000);
  if(!dolls.owned(state.dollId)){say('自動召喚：已經沒有'+dollName(state.dollId)+'。',now);return false;}
  return dolls.summon(state.dollId);}
 function phase4(now,auto){
  if(danger(now,auto))return true;
  if(autoDoll(now))return true;
  // 自動吃食物：飽食度低於門檻
  if(state.eatOn&&window.Satiety&&(retry.get('eat')||0)<=now){const v=Satiety.value();if(v!==null&&v<state.eatAt){retry.set('eat',now+4000);const list=foods(),f=list.find(e=>e.key===BUY_ICON.meat)||list[0];
   if(f){if(OwnedInventory.use(f.uid))return true;}else say('飽食度偏低，但身上沒有食物。',now);}}
  // 背包／負重快滿
  if(state.fullOn&&auto&&(retry.get('full')||0)<=now){const w=weightPct(),left=bagLeft();
   if(w>=state.fullWeight||left<=state.fullSlots){retry.set('full',now+30000);const why=w>=state.fullWeight?'負重 '+w+'%':'背包只剩 '+left+' 格';
    if(state.fullAct==='home'){const h=owned().find(e=>handler(e)==='teleport.GoHome_Reel');fullHome=true;const ok=h&&TeleportScrolls.use(h.uid);fullHome=false;IslandCombat.stop();toast(why+'，'+(ok?'已回村並':'')+'停止掛機（請整理背包）。');}
    else{IslandCombat.stop();toast(why+'，已停止掛機（請整理背包）。');}
    return true;}}
  // 回原地：在村裡體力回到門檻就傳回去
  if(state.returnSpot){
   if(!state.returnOn){save({returnSpot:null});return false;}
   if(auto&&!returning){save({returnSpot:null});return false;} // 自己又開了 AUTO 就不回去
   if(!returning&&now>=returnAt&&pctOf(hp,maxHp)>=state.returnHp&&!busy()&&(retry.get('ret')||0)<=now){retry.set('ret',now+5000);if(goBack(now))return true;}}
  return false;}
 // 掛機統計（AUTO 中才算）
 const stats={ms:0,kills:0,exp:0,coins:0,deaths:0,items:{},since:Date.now()};let base0=null,lastT=0,wasDead=false;
 function counts(){const m={};for(const e of owned())m[e.key]=(m[e.key]||0)+e.count;return m;}
 function track(){
  if(window.gameFlowState!=='playing'||owner!==window.activeCharacterId||OwnedInventory.owner!==owner){base0=null;return;}
  const t=Date.now(),auto=IslandCombat.mode==='auto',exp=Number(window.activeCharacterExperience)||0,dead=!!CharacterActions.dead||hp<=0;
  if(dead&&!wasDead&&(auto||stats.ms))stats.deaths++;wasDead=dead;
  if(base0&&auto){stats.ms+=Math.min(2000,t-lastT);if(exp>base0.exp)stats.exp+=exp-base0.exp;const c=counts();
   for(const [k,n] of Object.entries(c)){const d=n-(base0.c[k]||0);if(d<=0)continue;if(k==='etcitem:40308')stats.coins+=d;else stats.items[k]=(stats.items[k]||0)+d;}}
  lastT=t;}
 function snap(){if(window.gameFlowState!=='playing'||owner!==window.activeCharacterId)return;base0={exp:Number(window.activeCharacterExperience)||0,c:counts()};}
 const award=PlayerProgression.award.bind(PlayerProgression);PlayerProgression.award=function(mob){const ok=award(mob);if(ok&&IslandCombat.mode==='auto'&&owner===window.activeCharacterId)stats.kills++;return ok;};
 function resetStats(){Object.assign(stats,{ms:0,kills:0,exp:0,coins:0,deaths:0,items:{},since:Date.now()});}
 function autoCure(now){
  if(!state.cureOn||!window.IslandNpcAi?.poisoned||(retry.get('cure')||0)>now)return false;
  if(state.cureMethod==='skill'){
   if(!PlayerSkills.knows(9))return false;
   const skill=playerSkillData.skills[9];
   if(mp<(window.PlayerAbilityRules?.manaCost(skill)??skill.mp))return false;
   retry.set('cure',now+1000);
   return PlayerSkills.cast(9,{support:true});
  }
  const item=owned().find(e=>e.key===state.cureMethod&&!e.slot);
  if(!item)return false;
  retry.set('cure',now+1000);
  return OwnedInventory.use(item.uid);
 }
 function tick(){
  if(window.gameFlowState!=='playing'||owner!==window.activeCharacterId||OwnedInventory.owner!==owner)return;
  // 倒地的同一刻變身就被取消（TransformCards.onDeath），所以平常就記住目前變身；活著時自己取消變身則清掉，不會被自動變回去
  // 2026-11-18 使用者：記憶使用的變身卡 → 變身中的卡存進設定（morphCard，跟著角色存檔、重新整理也在）；倒地時記下 morphLost，復活後變回記憶的那張
  if(CharacterActions.dead||hp<=0){stoneQueue=null;fullHome=false;if(seenMorph)lostMorph=seenMorph;seenMorph=null;if(state.morphCard&&!state.morphLost)save({morphLost:true});return;}
  if(!lostMorph)seenMorph=TransformCards.active||null;
  if(TransformCards.active&&TransformCards.active!==state.morphCard)save({morphCard:TransformCards.active,morphLost:false});
  else if(TransformCards.active&&state.morphLost)save({morphLost:false});
  if(!lostMorph&&state.morphLost&&state.morph&&state.morphCard)lostMorph=state.morphCard;
  const now=movementTime(),auto=IslandCombat.mode==='auto';
  if(escape(now))return;
  if(autoBuy(now))return;
  if(phase4(now,auto))return;
  // 名單：瞬移
  const tpNames=Object.entries(mapList()).filter(([,m])=>m==='tp').map(([n])=>n);
  if(tpNames.length&&IslandMonsters.around(worldX,worldY,8).some(m=>tpNames.includes(m.spawn.npc.name))&&teleport())return;
  // 沒怪自動瞬移
  if(auto&&state.noMobTp){if(IslandMonsters.target?.hp||!idleSince)idleSince=now;else if(now-idleSince>=state.noMobSec*1000){idleSince=now;if(teleport())return;}}else idleSince=0;
  const actionBusy=busy();
  if(!actionBusy&&autoCure(now))return;
  // 藥水不需要等走路或普攻動畫結束，掛機時也能補上其他狀態。
  for(const [kind] of POTIONS){if(!state.potions[kind]||(retry.get('p'+kind)||0)>now)continue;const e=potionFor(kind);if(!e)continue;retry.set('p'+kind,now+1500);if(OwnedInventory.use(e.uid))return;}
  if(actionBusy)return;
  if(stoneQueue){
   const queue=stoneQueue;
   if(!learned().includes(100)){stoneQueue=null;return;}
   ClassBuffs.cast(100,{stoneTier:queue.tier,onStone:result=>{
    if(result.error){stoneQueue=null;return;}
    queue.remaining--;
    if(!queue.remaining)stoneQueue=null;
   }});
   return;
  }
  // 死亡後自動再變身（變身卡）
  if(lostMorph){const name=state.morphCard||lostMorph;if(!state.morph||TransformCards.active){lostMorph=null;if(state.morphLost&&!state.morph)save({morphLost:false});}else if((retry.get('morph')||0)<=now){retry.set('morph',now+5000);if(TransformCards.owned(name)&&TransformCards.activate(name)){lostMorph=null;save({morphLost:false});return;}if(!TransformCards.owned(name)){lostMorph=null;save({morphLost:false});}}}
  // 洗魔：心靈轉換
  if(state.mindOn&&learned().includes(130)&&pctOf(hp,maxHp)>=state.mindHp&&pctOf(mp,maxMp)<state.mindMp&&(retry.get('mind')||0)<=now){retry.set('mind',now+1500);if(ClassBuffs.cast(130))return;}
  // 召喚：身邊沒有召喚物時（掛機中）
  if(state.summonOn&&auto&&!Summons.list.length&&(retry.get('sum')||0)<=now){const id=summonSkill();retry.set('sum',now+5000);
   if(id&&(id!==51||!Summons.hasRing()||state.ringOn&&Summons.useLast())&&ClassBuffs.cast(id))return;}
  // 經驗藥水：AUTO 打怪中效果沒了就喝，高的先喝
  if(state.expAuto&&auto&&!(Number(window.activePotionBuffs?.exp)>Date.now())&&(retry.get('exp')||0)<=now){retry.set('exp',now+2000);
   const best=owned().map(e=>({e,p:window.ItemEffects?.parse(e)})).filter(x=>x.p?.kind==='exp').sort((a,b)=>b.p.rate-a.p.rate)[0];if(best&&OwnedInventory.use(best.e.uid))return;}
  // 魔法屏障卷軸：沒有魔法屏障時用
  if(state.barrierScroll&&!ClassBuffs.active(31)&&(retry.get('bar')||0)<=now){retry.set('bar',now+3000);
   const sc=owned().find(e=>{const p=window.ItemEffects?.parse(e);return p?.kind==='scroll'&&p.skill===31;});if(sc&&OwnedInventory.use(sc.uid))return;}
  // 輔助魔法
  for(const id of state.buffs){if(!learned().includes(id)||ClassBuffs.active(id)||(retry.get('b'+id)||0)>now)continue;const s=playerSkillData.skills[id];if(mp<(window.PlayerAbilityRules?.manaCost(s)??s.mp??0)||hp<=(s.hp||0))continue;retry.set('b'+id,now+3000);if(ClassBuffs.cast(id))return;}
  // 攻擊技能
  const t=IslandMonsters.target,id=state.attackSkill,fighting=IslandCombat.mode&&t?.hp;
  // 開怪技能：換到新目標（滿血）先放一次
  if(fighting&&t!==lastOpen){if(state.openOn&&state.openSkill&&learned().includes(state.openSkill)&&t.hp>=t.spawn.npc.hp&&pctOf(mp,maxMp)>=state.openMp){if(PlayerSkills.cast(state.openSkill)){lastOpen=t;return;}}else lastOpen=t;}
  // 範圍技能：周圍 N 格有 M 隻以上
  if(fighting&&state.aoeOn&&state.aoeSkill&&learned().includes(state.aoeSkill)&&pctOf(mp,maxMp)>=state.aoeMp&&(retry.get('aoe')||0)<=now&&IslandMonsters.around(worldX,worldY,state.aoeRange).length>=state.aoeCount){retry.set('aoe',now+1000);if(PlayerSkills.cast(state.aoeSkill))return;}
  if(state.attackOn&&id&&learned().includes(id)&&IslandCombat.mode&&t?.hp&&maxMp&&mp*100>=maxMp*state.attackMp&&(retry.get('a')||0)<=now){retry.set('a',now+800);PlayerSkills.cast(id);}
 }
 let lastRender=0;setInterval(()=>{track();tick();snap();if(dialog&&tab==='stats'&&Date.now()-lastRender>2000){lastRender=Date.now();render();}},300);

 // ---- 介面 ----
 const css=document.createElement('style');css.textContent=`
 /* 輔助鈕用使用者提供的圖（assets/interface/assist-button.png，金框太陽法陣＋「輔助」字，已去背），文字只留給讀屏 */
 .assist-hud{position:absolute;z-index:12;width:54px;height:74px;padding:0!important;min-height:0!important;border:0!important;border-radius:0!important;background:url(assets/interface/assist-button.png) center/contain no-repeat!important;pointer-events:auto;cursor:pointer;filter:drop-shadow(0 2px 3px #000b);transition:filter .15s,transform .1s}
 .assist-hud>*{position:absolute!important;width:1px;height:1px;overflow:hidden;clip:rect(0 0 0 0);white-space:nowrap}
 .assist-hud:active{transform:scale(.95)}
 .assist-hud[aria-pressed=true]{filter:drop-shadow(0 0 6px #ffd77a) drop-shadow(0 2px 3px #000b) brightness(1.12)}
 .auto-potion-hud{display:none!important}
 .assist-window{position:absolute;left:50%;top:50%;transform:translate(-50%,-50%);width:min(420px,94%);max-height:86%;display:flex;flex-direction:column;box-sizing:border-box;padding:0 7px 7px;color:#d8cfb8;pointer-events:auto;
  background:linear-gradient(90deg,#6e5a33 0,#c9a85e 2px,#3b3020 4px,transparent 5px,transparent calc(100% - 5px),#3b3020 calc(100% - 4px),#c9a85e calc(100% - 2px),#6e5a33 100%),linear-gradient(#17191c,#121416);box-shadow:0 0 0 1px #000,0 8px 24px #000b;border-radius:3px}
 .assist-window>.assist-header{flex:none;min-height:44px;margin:0 -7px;display:flex;align-items:center;justify-content:space-between;padding:0 8px;background:linear-gradient(#2c2a26,#1b1a18);border-bottom:1px solid #5b4b2c}
 .assist-window>.assist-header h2{margin:0;font-size:15px;letter-spacing:6px;color:#efd9a4}
 .assist-window>.assist-header button{min-width:64px;min-height:34px!important;padding:2px 8px!important;font-size:13px;white-space:nowrap;background:linear-gradient(#4a3d26,#2a2216)!important;border:1px solid #9b8150!important;border-radius:2px;color:#f0dcae!important}
 .assist-body{flex:1;min-height:0;overflow:auto;padding-top:2px;scrollbar-width:thin;scrollbar-color:#7a6740 #121416}
 .assist-body .qy-set-row select{max-width:150px}
 .assist-note{margin:6px 4px;font-size:11px;color:#857d6a;line-height:1.5;text-align:center}
 .assist-buffs{display:grid;grid-template-columns:1fr 1fr;gap:0}
 .assist-buffs .qy-set-row{border-bottom:1px solid #1f1e1b}
 .assist-mob{display:flex;align-items:center;gap:6px}
 .assist-body .qy-set-row .ico.item{width:32px;height:32px;flex:none;display:flex;align-items:center;justify-content:center;background:#0a0b0c;border:1px solid #4a4336;border-radius:3px}
 .assist-body .qy-set-row .ico.item img{max-width:28px;max-height:28px;image-rendering:pixelated}
 .assist-body .qy-set-row .ico.item.dim img{opacity:.4;filter:grayscale(.6)}
 .assist-body .assist-drawer{display:flex;align-items:center;justify-content:space-between;width:100%;min-height:38px;margin:8px 0 4px;padding:6px 10px;border:1px solid #4a4336;background:#20201c;color:#e6cd92;text-align:left}
 .assist-body .assist-drawer::after{content:'▸'}.assist-body .assist-drawer[aria-expanded=true]::after{content:'▾'}
 .assist-body button.assist-shop-icon{width:36px;height:36px;flex:none;padding:0;border:1px solid #9b8150;border-radius:3px;background:#0a0b0c;color:#f0dcae}
 .assist-shop-icon .ico.item{width:100%;height:100%;border:0}
 .assist-body .qy-set-row .ico.item .missing-item-icon{font-size:12px;color:#cdbb8a}`;document.head.append(css);

 const hud=el('button','assist-hud');hud.type='button';hud.setAttribute('aria-label','輔助系統');
 hud.innerHTML='<svg viewBox="0 0 32 32" aria-hidden="true"><circle cx="16" cy="16" r="4"/><path d="M16 3v5M16 24v5M3 16h5M24 16h5M6.8 6.8l3.5 3.5M21.7 21.7l3.5 3.5M6.8 25.2l3.5-3.5M21.7 10.3l3.5-3.5"/></svg>';hud.append(el('span','','輔助'));
 hud.onclick=()=>dialog?close():open();game.append(hud);
 // 位置：左上頭像框（.hud）右邊、和框頂對齊；奇岩式介面照舊按鈕的 top。每次重算，不靠舊鈕的 ResizeObserver
 function place(){hud.hidden=window.gameFlowState!=='playing';if(hud.hidden)return;const g=game.getBoundingClientRect(),box=document.querySelector('.hud')?.getBoundingClientRect(),bar=document.querySelector('.hud .bar')?.getBoundingClientRect();if(!box||!box.width)return;const right=Math.max(box.right,bar?.right||0);hud.style.left=Math.max(4,Math.min(g.width-58,right-g.left+8))+'px';hud.style.top=(game.classList.contains('classic-hud')?12:Math.max(4,box.top-g.top))+'px';}
 setInterval(place,500);new ResizeObserver(place).observe(game);

 function switcher(on,fn,label){const s=el('button','qy-switch');s.type='button';s.setAttribute('role','switch');s.setAttribute('aria-label',label);s.setAttribute('aria-checked',String(!!on));s.onclick=()=>{const want=s.getAttribute('aria-checked')!=='true';if(fn(want)!==false)s.setAttribute('aria-checked',String(want));};return s;}
 function slider(value,min,max,fn,unit,label){const box=el('span','assist-mob'),r=el('input'),v=el('span','val',value+unit);r.type='range';r.min=String(min);r.max=String(max);r.value=String(value);r.setAttribute('aria-label',label);r.oninput=()=>{v.textContent=r.value+unit;};r.onchange=()=>{if(fn(Number(r.value))===false){r.value=String(value);v.textContent=value+unit;}else value=Number(r.value);};box.append(r,v);return box;}
 function row(icon,label,note,...c){const r=el('div','qy-set-row'),t=el('div','txt',label);if(note)t.append(el('small','',note));r.append(typeof icon==='string'?el('span','ico',icon):icon,t,...c);return r;}
 // 道具圖（沒有道具時用文字圖示）
 // 技能圖（interfaceCatalog.skills 的 icon，和快捷欄同一張）
 // 沒選／沒學會時改顯示代表技能（fallback 給技能編號）的圖並變暗，表示還沒啟用
 function sico(id,fallback){const find=x=>typeof x==='number'&&(interfaceCatalog.skills.find(s=>s.id===x&&s.icon)||null);const sk=find(id),alt=sk?null:find(fallback);const use=sk||alt;
  if(!use)return el('span','ico',typeof fallback==='string'?fallback:'');const box=el('span','ico item'+(sk?'':' dim'));box.append(itemIcon(use));box.title=sk?use.name:'（未選）'+use.name;return box;}
 function ico(key,fallback){const item=key&&catalog.get(key);if(!item)return el('span','ico',fallback);const box=el('span','ico item');box.append(itemIcon(item));box.title=item.name;return box;}
 const firstKey=pred=>owned().find(pred)?.key||null;
 const group=(...rows)=>{const g=el('div','qy-set-group');g.append(...rows);return g;};
 const head=t=>el('div','qy-set-head',t);
 const count=pred=>owned().filter(pred).reduce((n,e)=>n+e.count,0);

 function huntPage(){const p=el('div'),ap=AutoPotion.snapshot,tp=teleportScrolls().reduce((sum,e)=>sum+e.count,0),home=count(e=>handler(e)==='teleport.GoHome_Reel');
  const scrollType=el('select');scrollType.setAttribute('aria-label','自動瞬移使用卷軸');
  for(const [key,label] of [['auto','一般優先，沒了用祝福'],['normal','一般瞬間移動卷軸'],['blessed','祝福瞬間移動卷軸']]){
   scrollType.append(new Option(label,key,false,key===state.tpScrollType));
  }
  scrollType.onchange=()=>{if(save({tpScrollType:scrollType.value}))render();else scrollType.value=state.tpScrollType;};
  p.append(head('AUTO 掛機'),group(
   row('⚔️','反擊紅人','AUTO 中被紅名玩家擊中時反擊，結束後繼續打怪',switcher(state.retaliateRed,on=>save({retaliateRed:on}),'反擊紅人')),
   row(ico(teleportScrollIcon(),'🌀'),'自動瞬移使用卷軸','可用 '+tp+' 張',scrollType),
   row('🎯','掛機索敵範圍','AUTO 時會往多遠的怪物走過去',slider(IslandCombat.autoRange,12,48,v=>{IslandCombat.setAutoRange(v);},' 格','掛機索敵範圍')),
   row(ico(teleportScrollIcon(),'🌀'),'沒怪 '+state.noMobSec+' 秒自動瞬移','用瞬間移動卷軸（身上 '+tp+' 張）',slider(state.noMobSec,3,60,v=>save({noMobSec:v})&&void render(),' 秒','沒怪幾秒瞬移'),switcher(state.noMobTp,on=>save({noMobTp:on}),'沒怪自動瞬移')),
   row(ico(firstKey(e=>handler(e)==='teleport.GoHome_Reel')||product('home')?.key,'🏠'),'體力低於 '+ap.homeThreshold+'% 時回村','用回家卷軸（身上 '+home+' 張）',slider(ap.homeThreshold,1,99,v=>AutoPotion.configure({homeThreshold:v})&&void render(),'%','回村體力門檻'),switcher(ap.homeEnabled,on=>AutoPotion.configure({homeEnabled:on}),'低血回村')),
   row(ico(teleportScrollIcon(),'🏃'),'撐不住先瞬移，3 次就回村','體力低於回村門檻時先用瞬間移動卷軸；一分鐘內逃到第 3 次才用回家卷軸（要開上面的回村）',switcher(state.escape,on=>save({escape:on}),'撐不住先瞬移'))));
  const rs=state.returnSpot,cancel=el('button','act','取消');cancel.type='button';cancel.onclick=()=>{save({returnSpot:null});render();};
  {const pl=el('select');pl.setAttribute('aria-label','其他玩家靠近時');pl.append(new Option('不管玩家','off',false,state.dangerPlayer==='off'),new Option('紅名玩家','red',false,state.dangerPlayer==='red'),new Option('所有玩家','all',false,state.dangerPlayer==='all'));pl.onchange=()=>save({dangerPlayer:pl.value});
   p.append(head('危險迴避'),group(
    row(ico(teleportScrollIcon(),'⚠️'),'附近有危險就瞬移','AUTO 中 '+state.dangerRange+' 格內出現首領或其他玩家時，用瞬間移動卷軸離開（要打首領時請先關掉）',switcher(state.dangerOn,on=>save({dangerOn:on}),'危險迴避')),
    row('👹','首領靠近','名字有 BOSS，或單隻出現、體力 1500 以上的怪',switcher(state.dangerBoss,on=>save({dangerBoss:on}),'首領靠近就瞬移')),
    row('🧍','其他玩家靠近',null,pl),
    row('📏','範圍 '+state.dangerRange+' 格',null,slider(state.dangerRange,3,20,v=>save({dangerRange:v})&&void render(),' 格','危險迴避範圍'))));}
  p.append(head('回村後回原地'),group(
   row(ico(teleportScrollIcon(),'↩️'),'回村補給後自動回原地續掛','AUTO 中因低血用回家卷軸回村時記住地點；在村裡體力回到 '+state.returnHp+'% 就用 1 張瞬間移動卷軸傳回去，自動開 AUTO',switcher(state.returnOn,on=>save({returnOn:on,...(on?{}:{returnSpot:null})})&&void render(),'回村後回原地')),
   row('❤️','體力回到 '+state.returnHp+'% 才回去',null,slider(state.returnHp,10,100,v=>save({returnHp:v})&&void render(),'%','回原地體力門檻')),
   ...(rs?[row('📍','等待回原地：'+WorldMaps.name(rs.mapId)+' '+rs.x+','+rs.y,canReturnTo(rs.mapId)?'體力夠了就傳回去':'這張地圖不能用卷軸傳回',cancel)]:[])));
  const w=weightPct(),left=bagLeft(),act=el('select');act.setAttribute('aria-label','背包快滿時');act.append(new Option('回村並停止掛機','home',false,state.fullAct==='home'),new Option('只停止掛機','stop',false,state.fullAct==='stop'));act.onchange=()=>save({fullAct:act.value});
  p.append(head('背包／負重快滿'),group(
   row('🎒','負重 '+state.fullWeight+'% 以上或背包剩 '+state.fullSlots+' 格以下時處理','目前負重 '+w+'%、背包 '+OwnedInventory.items.length+'/'+BAG_MAX+'（剩 '+left+' 格）。這種回村不會自動回原地',act,switcher(state.fullOn,on=>save({fullOn:on}),'背包快滿處理')),
   row('⚖️','負重門檻 '+state.fullWeight+'%',null,slider(state.fullWeight,30,100,v=>save({fullWeight:v})&&void render(),'%','負重門檻')),
   row('📦','剩 '+state.fullSlots+' 格以下',null,slider(state.fullSlots,0,60,v=>save({fullSlots:v})&&void render(),' 格','背包剩餘格數'))),
   el('p','assist-note','巡邏範圍從開 AUTO 的地方算起；瞬間移動卷軸不能用的地區不會瞬移。開「自動出售」（背包）可以讓垃圾撿到就換成天幣，減少回村次數。'));return p;}

 function stoneSupplyRows(){
  const key='etcitem:40321',offer=SHOP.get(40321),qty=el('select'),buy=el('button','act','購買');
  qty.setAttribute('aria-label','二級黑魔石購買數量');
  for(const n of QTY)qty.append(new Option('×'+n,String(n)));
  const purchase=row(ico(key,'◆'),'購買二級黑魔石',offer?offer.price.toLocaleString()+' 天幣／組':'商店未販售',qty,buy);
  buy.type='button';buy.disabled=!offer;
  buy.onclick=()=>{
   const {count,cost}=quote(offer,Number(qty.value));
   const error=OwnedInventory.trade(key,count,cost,false);
   toast(error||'已購買二級黑魔石 ×'+count);
  };

  const tier=el('select'),amount=el('input'),refine=el('button','act','提煉'),max=el('button','act','最大');
  tier.setAttribute('aria-label','提煉目標階級');
  for(const [n,label] of [[3,'三級'],[4,'四級'],[5,'五級']])tier.append(new Option(label,String(n)));
  amount.type='number';amount.min='1';amount.step='1';amount.value='1';
  amount.style.width='4em';amount.setAttribute('aria-label','提煉嘗試次數');
  function run(quantity){
   if(stoneQueue){toast('正在提煉黑魔石，剩下 '+stoneQueue.remaining+' 次。');return;}
   if(!learned().includes(100)){toast('請先學會提煉魔石。');return;}
   if(quantity!==null&&(!Number.isSafeInteger(quantity)||quantity<1)){toast('請輸入有效的提煉次數。');return;}
   const target=Number(tier.value),skill=playerSkillData.skills[100];
   const cost=window.PlayerAbilityRules?.manaCost(skill)??skill.mp;
   const available=count(e=>e.key==='etcitem:'+(40318+target));
   const remaining=Math.min(quantity??Infinity,available,cost>0?Math.floor(mp/cost):Infinity);
   if(!remaining){toast(available?'魔力不足。':'背包裡沒有上一級黑魔石。');return;}
   stoneQueue={tier:target,remaining};
   toast('開始逐顆提煉，共 '+remaining+' 次。');
  }
  refine.type=max.type='button';
  refine.onclick=()=>run(amount.valueAsNumber);
  max.onclick=()=>run(null);
  return [purchase,row('◆','提煉黑魔石','消耗上一級黑魔石與魔力，最大依現有材料及魔力計算',tier,amount,refine,max)];
 }
 function supplyPage(){const p=el('div');
  p.append(head('補血'),AutoPotion.healingControls());
  const mind=learned().includes(130);
  p.append(head('洗魔魔法'),mind?group(row(sico(130,'🔄'),'用體力換魔力（心靈轉換）','體力高於 '+state.mindHp+'%、魔力低於 '+state.mindMp+'% 時施放',switcher(state.mindOn,on=>save({mindOn:on}),'自動心靈轉換')),
   row('❤️','體力高於 '+state.mindHp+'%',null,slider(state.mindHp,1,99,v=>save({mindHp:v})&&void render(),'%','洗魔體力門檻')),
   row('💧','魔力低於 '+state.mindMp+'%',null,slider(state.mindMp,1,99,v=>save({mindMp:v})&&void render(),'%','洗魔魔力門檻'))):el('p','assist-note','還沒有學會心靈轉換。'));
  const satiety=window.Satiety?.value?.(),meatCount=count(e=>e.key===BUY_ICON.meat&&!e.slot);
  p.append(head('食物'),group(
   row(ico(BUY_ICON.meat,'🍖'),'飽食度低於 '+state.eatAt+' 時自動吃',
    '目前飽食度 '+(satiety??'—')+'／'+(window.Satiety?.MAX||225)+' · 身上肉 '+meatCount+' 個 · '+supplyPrice('meat',BUY_ICON.meat),
    switcher(state.eatOn,on=>save({eatOn:on}),'自動吃食物')),
   row('🍽️','門檻 '+state.eatAt,null,slider(state.eatAt,1,224,v=>save({eatAt:v})&&void render(),'','吃食物門檻'))));
  const cure=el('select'),method=state.cureMethod;
  cure.setAttribute('aria-label','解除中毒方式');
  for(const [value,label] of CURES)cure.append(new Option(value==='skill'?label:label+' · '+supplyPrice('antidote',value),value,false,value===method));
  cure.onchange=()=>{if(save({cureMethod:cure.value}))render();else cure.value=method;};
  const cureNote=method==='skill'?(PlayerSkills.knows(9)?'中毒時施放解毒術':'尚未學會解毒術'):'中毒時使用 · 身上 '+count(e=>e.key===method&&!e.slot)+' 個 · '+supplyPrice('antidote',method);
  p.append(group(row(method==='skill'?sico(9,'🧪'):ico(method,'🧪'),'解除中毒',cureNote,cure,switcher(state.cureOn,on=>save({cureOn:on}),'自動解除中毒'))));
  const rows=POTIONS.map(([kind,label,kinds])=>{const ok=e=>kinds.includes(NativePotions.durationState(e.key)?.key),n=count(ok),keys=[...new Set([...owned().filter(ok).map(e=>e.key),...shopProducts.filter(ok).map(e=>e.key)])];
   const pick=state.pick[kind],shown=keys.includes(pick)?pick:keys[0]||product(kind)?.key||BUY_ICON[kind];
   const sel=el('select');sel.setAttribute('aria-label',label+' 喝哪一種');sel.append(new Option('自動（先喝身上有的）',''));
   for(const k of keys)sel.append(new Option(catalog.get(k).name+' ×'+count(e=>e.key===k)+' · '+supplyPrice(kind,k),k,false,k===pick));
   if(pick&&!keys.includes(pick))sel.append(new Option(catalog.get(pick).name+' ×0',pick,false,true));
   sel.onchange=()=>{save({pick:{...state.pick,[kind]:sel.value||null}});render();};
   const enabled=switcher(state.potions[kind],on=>save({potions:{...state.potions,[kind]:on}}),label);
   if(kind==='wisdom'&&job!=='法師')sel.disabled=enabled.disabled=true;
   return row(ico(shown,'🧪'),label,'效果沒了自動喝 · 身上 '+n+' 個 · '+supplyPrice(kind,pick),sel,enabled);});
  p.append(head('狀態藥水'),group(...rows),el('p','assist-note','啟用後，庫存用完會按標示價格扣天幣補貨。只會購買目前職業可用的藥水。'));
  const expItems=owned().filter(e=>window.ItemEffects?.parse(e)?.kind==='exp');
  const barrier=owned().filter(e=>{const q=window.ItemEffects?.parse(e);return q?.kind==='scroll'&&q.skill===31;});
  p.append(head('其他補給'),group(
   row(ico('etcitem:990103',''),'經驗藥水','打怪（AUTO）時效果沒了自動喝 · 高的先喝 · 身上 '+expItems.reduce((n,e)=>n+e.count,0)+' 個',switcher(state.expAuto,on=>save({expAuto:on}),'自動喝經驗藥水')),
   row(ico(barrier[0]?.key||'etcitem:40889','📜'),'魔法屏障卷軸','沒有魔法屏障時自動用 · 身上 '+barrier.reduce((n,e)=>n+e.count,0)+' 張 · '+supplyPrice('barrier',BUY_ICON.barrier),switcher(state.barrierScroll,on=>save({barrierScroll:on}),'自動用魔法屏障卷軸')),
   ...stoneSupplyRows()));
  const cur=TransformCards.active;p.append(head('變身'),group(row('🎭','死亡後自動再變身','記憶的變身卡：'+(state.morphCard||'（還沒有，變身一次就會記住）')+'。'+(cur?'目前變身：'+cur+'。':'目前沒有變身。')+'倒地後變身會消失，復活後自動變回記憶的那張變身卡（重新整理也會記得）',switcher(state.morph,on=>save({morph:on}),'死亡後自動再變身'))));
  const buyRows=BUYS.filter(([key])=>!DIRECT_BUYS.has(key)).map(([k,label])=>{const b=state.buy[k],pr=product(k),qty=el('select');qty.setAttribute('aria-label',label+' 購買數量');
   for(const n of QTY)qty.append(new Option('×'+n,String(n),false,n===b.n));qty.onchange=()=>{save({buy:{...state.buy,[k]:{...b,n:Number(qty.value)}}});render();};
   const order=pr?quote(pr,b.n):null,note=pr?catalog.get(pr.key).name+' · 一次 '+order.count+' 個 '+order.cost.toLocaleString()+' 金幣':'商店沒賣或目前職業不能用';
   const sw=switcher(b.on,on=>pr||!on?save({buy:{...state.buy,[k]:{...b,on}}}):(toast('商店沒賣這項，無法自動購買。'),false),'自動購買 '+label);
   const itemRow=row(ico(pr?.key||(k==='arrow'?state.arrowBuyKey:BUY_ICON[k]),'🛒'),label,
    (k==='arrow'?'剩 '+ARROW_RESTOCK_AT+' 支以下自動買':'用完時自動買')+' · '+note,qty,sw);
   if(k==='arrow'){
    const type=el('select');type.setAttribute('aria-label','自動購買箭矢種類');
    for(const key of ARROW_KEYS)type.append(new Option(catalog.get(key).name,key,false,key===state.arrowBuyKey));
    type.onchange=()=>{if(save({arrowBuyKey:type.value})){retry.delete('buyarrow');render();}else type.value=state.arrowBuyKey;};
    itemRow.insertBefore(type,qty);
   }
   return itemRow;});
  const purse=OwnedInventory.items.find(e=>e.key==='etcitem:40308')?.count||0;
  const drawer=el('button','assist-drawer','自動購買'),content=el('div');
  drawer.type='button';drawer.setAttribute('aria-label','自動購買');content.id='assist-auto-buy';drawer.setAttribute('aria-controls',content.id);
  function syncDrawer(){drawer.setAttribute('aria-expanded',String(buyOpen));content.hidden=!buyOpen;}
  drawer.onclick=()=>{buyOpen=!buyOpen;syncDrawer();};
  syncDrawer();content.append(group(...buyRows),el('p','assist-note','箭矢剩 100 支以下、其他道具用完時自動補貨，價格取天幣商店最低價。目前金幣 '+purse.toLocaleString()+'。'));
  p.append(drawer,content);return p;}

 function magicPage(){const p=el('div'),ids=learned(),sk=id=>playerSkillData.skills[id];
  const pickSkill=(field,label)=>{const s=el('select');s.setAttribute('aria-label',label);s.append(new Option('（選擇'+label+'）',''));for(const id of attackSkills(ids))s.append(new Option(sk(id).name+' · MP '+sk(id).mp,String(id),false,state[field]===id));s.onchange=()=>{save({[field]:s.value?Number(s.value):null});render();};return s;};
  const atk=pickSkill('attackSkill','攻擊技能');
  p.append(head('開怪技能'),group(row(sico(state.openSkill,4),'開怪技能','換到新目標（滿血）先放一次',pickSkill('openSkill','開怪技能')),row('💧','魔力 '+state.openMp+'% 以上',null,slider(state.openMp,0,99,v=>save({openMp:v})&&void render(),'%','開怪技能魔力門檻'),switcher(state.openOn,on=>save({openOn:on}),'自動開怪技能'))));
  p.append(head('範圍技能'),group(row(sico(state.aoeSkill,53),'範圍技能','周圍 '+state.aoeRange+' 格有 '+state.aoeCount+' 隻以上時施放',pickSkill('aoeSkill','範圍技能')),
   row('📏','範圍 '+state.aoeRange+' 格',null,slider(state.aoeRange,1,8,v=>save({aoeRange:v})&&void render(),' 格','範圍格數')),
   row('👥',state.aoeCount+' 隻以上',null,slider(state.aoeCount,2,10,v=>save({aoeCount:v})&&void render(),' 隻','怪物數量')),
   row('💧','魔力 '+state.aoeMp+'% 以上',null,slider(state.aoeMp,0,99,v=>save({aoeMp:v})&&void render(),'%','範圍技能魔力門檻'),switcher(state.aoeOn,on=>save({aoeOn:on}),'自動範圍技能'))));
  p.append(head('攻擊魔法'),group(row(sico(state.attackSkill,4),'攻擊技能','打怪時魔力 '+state.attackMp+'% 以上施放',atk),row('💧','魔力門檻',null,slider(state.attackMp,0,99,v=>save({attackMp:v})&&void render(),'%','攻擊技能魔力門檻'),switcher(state.attackOn,on=>save({attackOn:on}),'自動攻擊技能'))));
  const buffIds=ids.filter(id=>ClassBuffs.selfBuff(id));
  if(buffIds.length){const g=el('div','qy-set-group assist-buffs');for(const id of buffIds)g.append(row(sico(id,''),sk(id).name,null,switcher(state.buffs.includes(id),on=>save({buffs:on?[...state.buffs,id]:state.buffs.filter(x=>x!==id)}),sk(id).name)));p.append(head('輔助魔法'),g,el('p','assist-note','效果沒了就補；沒開 AUTO 也會。'));}
  else p.append(head('輔助魔法'),el('p','assist-note','還沒有學會可以自動施放的輔助魔法。'));
  return p;}

 function summonPage(){const p=el('div'),id=summonSkill(),last=Summons.lastName,list=Summons.list;
  {const cur=window.TdjSystems?.dolls?.active,mem=state.dollId;
   p.append(head('魔法娃娃'),group(row('🧸','沒有娃娃時自動召喚','記住的娃娃：'+(mem?dollName(mem):'（還沒有，召喚一次就會記住）')+'。'+(cur?'目前召喚：'+dollName(cur)+'。':'目前沒有召喚。')+(dollPaused?'（你手動解除了召喚，暫停到下次手動召喚）':'')+'需要材料的娃娃，材料不足時每分鐘再試一次',switcher(state.dollOn,on=>save({dollOn:on}),'自動召喚魔法娃娃'))));}
  p.append(head('自動召喚'),group(
   row(sico(id,job==='妖精'?154:51),'沒有召喚物時自動施放',id?playerSkillData.skills[id].name+' · 掛機（AUTO）時身邊沒有召喚物就施放':'還沒學會召喚術／召喚屬性精靈',switcher(state.summonOn,on=>id||!on?save({summonOn:on}):(toast('還沒學會召喚魔法。'),false),'自動召喚')),
   row(ico('armor:20284','💍'),'戴召喚控制戒指時召喚上次手選的',last?'上次手選：'+last:'先手動用一次召喚控制戒指選單選怪物',switcher(state.ringOn,on=>save({ringOn:on}),'召喚控制戒指自動召喚'))));
  p.append(head('目前召喚物'),list.length?group(...list.map(a=>row('',a.name,'體力 '+a.hp))):el('p','assist-note','（沒有）'),
   el('p','assist-note','法師用「召喚術」依等級召喚；妖精用「召喚屬性精靈」召喚自己屬性的精靈。沒戴戒指時直接召喚；戴戒指但沒開上面的選項時不會自動召喚（避免一直跳出選單）。寵物、夥伴系統這個遊戲還沒有。'));
  return p;}

 function listPage(){const p=el('div'),map=String(window.activeMapId||0),cur=mapList();
  const names=[...new Set(islandMonsterSpawns.filter(s=>(s.mapId||0)===(window.activeMapId||0)&&!s.resident&&s.npc&&s.npc.kind==='L1Monster').map(s=>s.npc.name))].filter(n=>!cur[n]).sort();
  const pick=el('select');pick.setAttribute('aria-label','選擇怪物');pick.append(new Option('（請選擇）',''));for(const n of names)pick.append(new Option(n,n));
  const add=el('button','act','加入');add.type='button';add.onclick=()=>{if(!pick.value)return;save({list:{...state.list,[map]:{...cur,[pick.value]:'skip'}}});render();};
  p.append(head('怪物名單（'+(WorldMaps.name?.(window.activeMapId||0)||'目前地圖')+'）'),group(row('👾','加入怪物',null,pick,add)));
  const rows=Object.entries(cur).map(([n,mode])=>{const s=el('select');s.setAttribute('aria-label',n+' 處理方式');s.append(new Option('優先打','first',false,mode==='first'),new Option('不打','skip',false,mode==='skip'),new Option('瞬移','tp',false,mode==='tp'));s.onchange=()=>save({list:{...state.list,[map]:{...cur,[n]:s.value}}});
   const del=el('button','act','移除');del.type='button';del.onclick=()=>{const next={...cur};delete next[n];const list={...state.list};if(Object.keys(next).length)list[map]=next;else delete list[map];save({list});render();};return row('',n,null,s,del);});
  p.append(rows.length?group(...rows):el('p','assist-note','（沒有）'),el('p','assist-note','沒加進來的怪都會打；「優先打」AUTO 找目標時先找牠（範圍內沒有才打別的）；「瞬移」看到就用瞬間移動卷軸離開；「不打」被牠打時還是會還手。每張地圖各自設定。'));return p;}

 // 統計分頁：AUTO 中的時間、擊殺、經驗、天幣、掉落、死亡（重新整理或換角色會歸零）
 function statsPage(){const p=el('div'),h=stats.ms/3600000,per=n=>h>=0.01?Math.round(n/h).toLocaleString()+'／小時':'—',tm=Math.floor(stats.ms/1000);
  const fmt=tm>=3600?Math.floor(tm/3600)+' 小時 '+Math.floor(tm%3600/60)+' 分':Math.floor(tm/60)+' 分 '+tm%60+' 秒';
  p.append(head('本次掛機（AUTO 中才計算）'),group(row('⏱️','掛機時間',fmt),row('⚔️','擊殺 '+stats.kills.toLocaleString()+' 隻',per(stats.kills)),row('✨','經驗 +'+stats.exp.toLocaleString(),per(stats.exp)),
   row(ico('etcitem:40308','💰'),'天幣 +'+stats.coins.toLocaleString(),per(stats.coins)+'（含自動出售；自動購買花掉的不扣）'),row('💀','死亡 '+stats.deaths+' 次',null)));
  const items=Object.entries(stats.items).sort((a,b)=>b[1]-a[1]).slice(0,30);
  p.append(head('獲得道具'),items.length?group(...items.map(([k,n])=>row(ico(k,'📦'),(catalog.get(k)?.name||k)+' ×'+n.toLocaleString(),null))):el('p','assist-note','（還沒有）'));
  const reset=el('button','act','統計歸零');reset.type='button';reset.onclick=()=>{resetStats();render();};p.append(group(row('🔄','重新開始計算','重新整理或換角色也會歸零',reset)));return p;}
 // 方案分頁：3 組設定一鍵切換；把目前設定複製給同帳號其他角色
 function capture(){const a=JSON.parse(JSON.stringify(state));for(const k of ['presets','returnSpot','morphCard','morphLost'])delete a[k];return {assist:a,autoPotion:{...AutoPotion.snapshot},range:IslandCombat.autoRange};}
 function applyPreset(p){const keep={presets:state.presets,returnSpot:state.returnSpot,morphCard:state.morphCard,morphLost:state.morphLost};if(!save({...base(),...p.assist,...keep}))return false;
  if(p.autoPotion&&!AutoPotion.configure(p.autoPotion,true))return false;
  if(Number.isInteger(p.range))IslandCombat.setAutoRange(p.range);return true;}
 function copyTo(id){if(!GameEntry.saveActive())return '目前角色存檔失敗。';const chars=GameEntry.characters,i=chars.findIndex(c=>c?.id===id);if(i<0)return '找不到角色。';
  const c=chars[i],d=capture(),old=c.assist&&typeof c.assist==='object'?c.assist:{};
  chars[i]={...c,assist:{...d.assist,presets:old.presets||[null,null,null],morphCard:old.morphCard||null,morphLost:false,returnSpot:null},autoPotion:{...(c.autoPotion||{key:null,threshold:50,enabled:false}),threshold:d.autoPotion.threshold,homeEnabled:d.autoPotion.homeEnabled,homeThreshold:d.autoPotion.homeThreshold}};
  try{entryCharacters=CharacterStore.save(entryAccount,chars);}catch(e){return '儲存失敗：'+(e.message||e);}return '';}
 function presetPage(){const p=el('div');
  const rows=state.presets.map((pr,i)=>{const saveB=el('button','act','存入'),use=el('button','act','套用'),del=el('button','act','清除');saveB.type=use.type=del.type='button';
   saveB.onclick=()=>{const list=[...state.presets];list[i]={name:'方案 '+(i+1),at:Date.now(),...capture()};if(save({presets:list}))toast('目前設定已存入方案 '+(i+1)+'。');render();};
   use.disabled=!pr;use.onclick=()=>{if(pr&&applyPreset(pr))toast('已套用方案 '+(i+1)+'。');render();};
   del.disabled=!pr;del.onclick=()=>{const list=[...state.presets];list[i]=null;save({presets:list});render();};
   return row(['①','②','③'][i],'方案 '+(i+1),pr?'存於 '+new Date(pr.at).toLocaleString():'（空）',saveB,use,del);});
  p.append(head('設定方案（例如練功／打王）'),group(...rows),el('p','assist-note','方案包含輔助系統全部設定、補血與回村門檻、掛機索敵範圍（不含變身卡記憶）。'));
  const others=(GameEntry.characters||[]).filter(c=>c&&c.id!==window.activeCharacterId);
  p.append(head('複製給同帳號其他角色'),others.length?group(...others.map(c=>{const b=el('button','act','複製');b.type='button';b.onclick=()=>{const err=copyTo(c.id);toast(err||'目前的輔助設定已複製給 '+c.name+'。');};return row('👤',c.name,c.role+' · Lv.'+(c.level||1),b);})):el('p','assist-note','（同帳號沒有其他角色）'),
   el('p','assist-note','會覆蓋對方的輔助設定與補血、回村門檻（對方選的補血道具、方案、變身卡記憶保留）；對方沒學會的技能不會施放。'));return p;}
 const PAGES=[['hunt','狩獵',huntPage],['supply','補給',supplyPage],['magic','魔法',magicPage],['summon','召喚',summonPage],['list','名單',listPage],['stats','統計',statsPage],['preset','方案',presetPage]];
 let body=null,tabs=null;
 function render(){if(!dialog)return;const y=body.scrollTop;body.replaceChildren(PAGES.find(p=>p[0]===tab)[2]());body.scrollTop=y;for(const b of tabs.children)b.setAttribute('aria-selected',String(b.dataset.tab===tab));}
 function open(){if(window.gameFlowState!=='playing')return false;if(dialog){dialog.style.zIndex=String(FloatingWindows.frontLevel());return true;}
  dialog=el('section','assist-window');dialog.setAttribute('role','dialog');dialog.setAttribute('aria-label','輔助系統');dialog.style.zIndex=String(FloatingWindows.frontLevel());
  const h=el('div','assist-header'),x=el('button','assist-close','關閉 ✕');x.type='button';x.setAttribute('aria-label','關閉輔助系統');x.onclick=close;h.append(el('h2','','輔助系統'),x);
  tabs=el('div','qy-set-tabs');for(const [k,l] of PAGES){const b=el('button','',l);b.type='button';b.dataset.tab=k;b.onclick=()=>{tab=k;body.scrollTop=0;render();};tabs.append(b);}
  body=el('div','assist-body');dialog.append(h,tabs,body);game.append(dialog);hud.setAttribute('aria-pressed','true');render();return true;}
 function close(){dialog?.remove();dialog=null;buyOpen=false;hud.setAttribute('aria-pressed','false');}
 addEventListener('keydown',e=>{if(e.key==='Escape'&&dialog)close();});
 return {activate,open,close,skip,prefer,tick,healingOffers,get stats(){return JSON.parse(JSON.stringify(stats));},get retaliateRed(){return state.retaliateRed&&owner===window.activeCharacterId;},get escapeFirst(){return state.escape&&owner===window.activeCharacterId;},get healFallback(){return state.healFallback&&owner===window.activeCharacterId;},get snapshot(){return JSON.parse(JSON.stringify(state));}};
})();window.AssistSystem=AssistSystem;
