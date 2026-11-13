// 輔助系統（2026-11-13 第 1 期；第 2 期加「補給→自動購買」：用完時用商店最低價扣金幣買）：取代畫面左上「自動喝水」鈕，打開分頁視窗（狩獵／補給／魔法／名單）。
//  狩獵：掛機索敵範圍（IslandCombat.setAutoRange）、AUTO 沒怪 N 秒自動用瞬間移動卷軸、體力低於 N% 用回家卷軸回村（AutoPotion 原有）
//  補給：自動補血道具（AutoPotion 原有）、綠水／勇水類／慎重藥水／藍水 效果沒了自動喝（只用身上有的，NativePotions.durationState 判斷種類）
//  魔法：攻擊技能（AUTO／攻擊目標時魔力 ≥ N% 施放）、治癒魔法（AutoPotion 的補血技能）、輔助魔法（ClassBuffs.selfBuff，效果沒了就補）
//  名單：每張地圖各自的怪物名單，「不打」＝AUTO 不主動找（被打仍還手）、「瞬移」＝附近 8 格出現就用瞬間移動卷軸離開
//  第 3 期：撐不住先瞬移（一分鐘內第 3 次改回村，auto-potion.js 讓出回村判斷）、補血喝完改喝別種（auto-potion.js healFallback）、
//   死亡後自動再變身（TransformCards）、開怪技能、範圍技能、洗魔（心靈轉換 130）、召喚分頁（召喚術 51／召喚屬性精靈 154／強力 162，
//   戴召喚控制戒指時用 Summons.useLast 召喚上次手選的）。遊戲沒有的系統（寵物、夥伴、武器耐久、水中、中毒、木乃伊、經驗藥水效果）不做。
//  設定存在角色存檔 assist 欄位（entry-flow.js saveActiveCharacter／enterSelectedCharacter）。
const AssistSystem=(()=>{
 const el=(t,c,x)=>uiElement(t,c,x);
 const catalog=new Map(INTERFACE_CATALOG.items.map(i=>[i.kind+':'+i.id,i]));
 const POTIONS=[['haste','綠色藥水（加速）',['haste']],['brave','勇敢藥水類（勇水／精靈餅乾／巧克力蛋糕）',['brave','elfBrave','braveX']],['wisdom','慎重藥水',['wisdom']],['blue','藍色藥水（魔力回復）',['blue']]];
 // 自動購買（第 2 期）：用完（身上 0 個）時從商店買，價格取所有 NPC 商店裡最便宜的那一家（NATIVE_NPC_DIALOGS.shops＋islandNpcServiceData.shop，[道具, 順序, 買價, 一組幾個, 賣價, 強化]）
 const SHOP=new Map();
 for(const rows of [...Object.values(NATIVE_NPC_DIALOGS.shops||{}),islandNpcServiceData.shop||[]])for(const [id,,buy,pack,,ench] of rows){if(!(buy>=0)||ench)continue;const n=Math.max(1,pack|0),b=SHOP.get(id);if(!b||buy/n<b.price/b.pack)SHOP.set(id,{price:buy,pack:n});}
 const QTY=[1,5,10,20,50,100,200,500,1000];
 const BUYS=[['tp','瞬間移動卷軸',10],['home','傳送回家的卷軸',5],['heal','補血道具（補給選的那種）',100],['haste','綠色藥水',5],['brave','勇敢藥水類',5],['wisdom','慎重藥水',5],['blue','藍色藥水',5],['arrow','箭（裝備弓時）',1000]];
 const base=()=>({noMobTp:false,noMobSec:10,potions:{haste:false,brave:false,wisdom:false,blue:false},attackOn:false,attackSkill:null,attackMp:30,buffs:[],list:{},escape:false,healFallback:false,morph:false,openOn:false,openSkill:null,openMp:50,aoeOn:false,aoeSkill:null,aoeRange:3,aoeCount:3,aoeMp:50,mindOn:false,mindHp:80,mindMp:40,summonOn:false,ringOn:false,buy:Object.fromEntries(BUYS.map(([k,,n])=>[k,{on:false,n}]))});
 let state=base(),owner='',dialog=null,tab='hunt',idleSince=0,lastTp=0,retry=new Map(),escapes=[],lostMorph=null,seenMorph=null,lastOpen=null;
 const int=(v,lo,hi,d)=>Number.isInteger(v)?Math.max(lo,Math.min(hi,v)):d;
 function validate(v){const s=base();if(!v||typeof v!=='object')return s;
  s.noMobTp=v.noMobTp===true;s.noMobSec=int(v.noMobSec,3,60,10);for(const k of Object.keys(s.potions))s.potions[k]=v.potions?.[k]===true;
  s.attackOn=v.attackOn===true;s.attackSkill=Number.isInteger(v.attackSkill)&&playerSkillData.skills[v.attackSkill]?v.attackSkill:null;s.attackMp=int(v.attackMp,0,99,30);
  s.buffs=Array.isArray(v.buffs)?[...new Set(v.buffs.filter(id=>Number.isInteger(id)&&playerSkillData.skills[id]))]:[];
  for(const k of ['escape','healFallback','morph','openOn','aoeOn','mindOn','summonOn','ringOn'])s[k]=v[k]===true;
  const skillOk=id=>Number.isInteger(id)&&playerSkillData.skills[id]?id:null;s.openSkill=skillOk(v.openSkill);s.aoeSkill=skillOk(v.aoeSkill);
  s.openMp=int(v.openMp,0,99,50);s.aoeRange=int(v.aoeRange,1,8,3);s.aoeCount=int(v.aoeCount,2,10,3);s.aoeMp=int(v.aoeMp,0,99,50);s.mindHp=int(v.mindHp,1,99,80);s.mindMp=int(v.mindMp,1,99,40);
  for(const [k] of BUYS){const b=v.buy?.[k];if(b)s.buy[k]={on:b.on===true,n:QTY.includes(b.n)?b.n:s.buy[k].n};}
  if(v.list&&typeof v.list==='object')for(const [map,names] of Object.entries(v.list)){if(!names||typeof names!=='object')continue;const m={};for(const [n,mode] of Object.entries(names))if(['skip','tp'].includes(mode))m[n]=mode;if(Object.keys(m).length)s.list[map]=m;}
  return s;}
 function activate(v){state=validate(v);owner=window.activeCharacterId||'';idleSince=0;lastTp=0;retry.clear();escapes=[];lostMorph=null;seenMorph=null;lastOpen=null;close();}
 function save(next){if(window.gameFlowState!=='playing'||owner!==window.activeCharacterId)return false;const old=state;state=validate({...state,...next});if(!GameEntry.saveActive()){state=old;return false;}return true;}
 const mapList=()=>state.list[String(window.activeMapId||0)]||{};
 function skip(mob){const m=mapList()[mob?.spawn?.npc?.name];return m==='skip'||m==='tp';}

 // ---- 動作 ----
 const owned=()=>OwnedInventory.owner===owner?OwnedInventory.items.filter(e=>!e.slot):[];
 const handler=e=>ITEM_USE_RULES.definitions[e.key]?.handler||'';
 const learned=()=>OwnedInventory.owner===owner?OwnedInventory.skills.ids:[];
 const busy=()=>characterMovementBlocked()||movementAnimating();
 function teleport(){const s=owned().find(e=>handler(e)==='teleport.Move_Reel');if(!s||movementTime()-lastTp<2000)return false;lastTp=movementTime();const ok=TeleportScrolls.random(s.uid);if(ok){idleSince=movementTime();IslandCombat.resetAfterTeleport?.();}return ok;}
 function potionFor(kind){const kinds=POTIONS.find(p=>p[0]===kind)[2];if(kinds.some(k=>Number(window.activePotionBuffs?.[k])>Date.now()+1500))return null;
  return owned().find(e=>kinds.includes(NativePotions.durationState(e.key)?.key))||null;}
 // 每種補給：身上算哪些道具、要買哪一個（商店有賣、職業能用的最便宜那個）
 const kindsOf=k=>POTIONS.find(p=>p[0]===k)?.[2];
 function matcher(k){
  if(k==='tp')return key=>ITEM_USE_RULES.definitions[key]?.handler==='teleport.Move_Reel';
  if(k==='home')return key=>ITEM_USE_RULES.definitions[key]?.handler==='teleport.GoHome_Reel';
  if(k==='heal'){const want=AutoPotion.snapshot.key;return key=>!!want&&key===want;}
  if(k==='arrow')return key=>catalog.get(key)?.type==='arrow';
  const kinds=kindsOf(k);return key=>kinds.includes(NativePotions.durationState(key)?.key);
 }
 function product(k){const match=matcher(k);let best=null;for(const [id,s] of SHOP){const key='etcitem:'+id;if(!catalog.has(key)||!match(key))continue;if(k==='arrow'&&id!==40743&&id!==40744)continue;if(!best||s.price/s.pack<best.price/best.pack)best={key,id,...s};}return best;}
 const bowEquipped=()=>{const w=OwnedInventory.items.find(e=>e.slot==='weapon');return ['bow','singlebow'].includes(w?.item?.type);};
 let buyNotice=0;
 function autoBuy(now){
  for(const [k,label] of BUYS){const b=state.buy[k];if(!b?.on||(retry.get('buy'+k)||0)>now)continue;if(k==='arrow'&&!bowEquipped())continue;
   const match=matcher(k);if(OwnedInventory.items.some(e=>match(e.key)&&e.count>0))continue;
   const p=product(k);retry.set('buy'+k,now+5000);if(!p)continue;
   const packs=Math.ceil(b.n/p.pack),err=OwnedInventory.trade(p.key,packs*p.pack,packs*p.price,false);
   if(err){retry.set('buy'+k,now+30000);if(now-buyNotice>30000){buyNotice=now;toast('自動購買 '+catalog.get(p.key).name+' 失敗：'+err);}}
   else{toast('自動購買 '+catalog.get(p.key).name+' ×'+(packs*p.pack)+'（'+(packs*p.price).toLocaleString()+' 金幣）');return true;}}
  return false;
 }
 const pctOf=(v,m)=>m?v*100/m:0;
 const attackSkills=ids=>ids.filter(id=>PlayerSkills.supports(id)&&!/治癒|恢復/.test(playerSkillData.skills[id].name)&&!ClassBuffs.handles(id)||[187,207,229].includes(id));
 const summonSkill=()=>[51,162,154].find(id=>learned().includes(id))||null;
 function lowHp(){const ap=AutoPotion.snapshot;return ap.homeEnabled&&maxHp&&hp*100<=maxHp*ap.homeThreshold&&(tile(worldX,worldY)&48)!==16;}
 // 撐不住先瞬移：一分鐘內前兩次用瞬間移動卷軸，第 3 次用回家卷軸
 function escape(now){if(!state.escape||!lowHp()||(retry.get('esc')||0)>now)return false;retry.set('esc',now+1500);escapes=escapes.filter(t=>now-t<60000);
  if(escapes.length<2&&owned().some(e=>handler(e)==='teleport.Move_Reel')){if(teleport()){escapes.push(now);return true;}return false;} // 瞬移冷卻中就等，不提早回村
  const home=owned().find(e=>handler(e)==='teleport.GoHome_Reel');if(home&&TeleportScrolls.use(home.uid)){escapes=[];return true;}return false;}
 function tick(){
  if(window.gameFlowState!=='playing'||owner!==window.activeCharacterId||OwnedInventory.owner!==owner)return;
  // 倒地的同一刻變身就被取消（TransformCards.onDeath），所以平常就記住目前變身；活著時自己取消變身則清掉，不會被自動變回去
  if(CharacterActions.dead||hp<=0){if(seenMorph)lostMorph=seenMorph;seenMorph=null;return;}
  if(!lostMorph)seenMorph=TransformCards.active||null;
  const now=movementTime(),auto=IslandCombat.mode==='auto';
  if(escape(now))return;
  if(autoBuy(now))return;
  // 名單：瞬移
  const tpNames=Object.entries(mapList()).filter(([,m])=>m==='tp').map(([n])=>n);
  if(tpNames.length&&IslandMonsters.around(worldX,worldY,8).some(m=>tpNames.includes(m.spawn.npc.name))&&teleport())return;
  // 沒怪自動瞬移
  if(auto&&state.noMobTp){if(IslandMonsters.target?.hp||!idleSince)idleSince=now;else if(now-idleSince>=state.noMobSec*1000){idleSince=now;if(teleport())return;}}else idleSince=0;
  if(busy())return;
  // 死亡後自動再變身（變身卡）
  if(lostMorph){const name=lostMorph;if(!state.morph||TransformCards.active)lostMorph=null;else if((retry.get('morph')||0)<=now){retry.set('morph',now+5000);if(TransformCards.owned(name)&&TransformCards.activate(name)){lostMorph=null;return;}}}
  // 洗魔：心靈轉換
  if(state.mindOn&&learned().includes(130)&&pctOf(hp,maxHp)>=state.mindHp&&pctOf(mp,maxMp)<state.mindMp&&(retry.get('mind')||0)<=now){retry.set('mind',now+1500);if(ClassBuffs.cast(130))return;}
  // 召喚：身邊沒有召喚物時（掛機中）
  if(state.summonOn&&auto&&!Summons.list.length&&(retry.get('sum')||0)<=now){const id=summonSkill();retry.set('sum',now+5000);
   if(id&&(id!==51||!Summons.hasRing()||state.ringOn&&Summons.useLast())&&ClassBuffs.cast(id))return;}
  // 補給：效果沒了自動喝
  for(const [kind] of POTIONS){if(!state.potions[kind]||(retry.get('p'+kind)||0)>now)continue;const e=potionFor(kind);if(!e)continue;retry.set('p'+kind,now+1500);if(OwnedInventory.use(e.uid))return;}
  // 輔助魔法
  for(const id of state.buffs){if(!learned().includes(id)||ClassBuffs.active(id)||(retry.get('b'+id)||0)>now)continue;const s=playerSkillData.skills[id];if(mp<(s.mp||0)||hp<=(s.hp||0))continue;retry.set('b'+id,now+3000);if(ClassBuffs.cast(id))return;}
  // 攻擊技能
  const t=IslandMonsters.target,id=state.attackSkill,fighting=IslandCombat.mode&&t?.hp;
  // 開怪技能：換到新目標（滿血）先放一次
  if(fighting&&t!==lastOpen){if(state.openOn&&state.openSkill&&learned().includes(state.openSkill)&&t.hp>=t.spawn.npc.hp&&pctOf(mp,maxMp)>=state.openMp){if(PlayerSkills.cast(state.openSkill)){lastOpen=t;return;}}else lastOpen=t;}
  // 範圍技能：周圍 N 格有 M 隻以上
  if(fighting&&state.aoeOn&&state.aoeSkill&&learned().includes(state.aoeSkill)&&pctOf(mp,maxMp)>=state.aoeMp&&(retry.get('aoe')||0)<=now&&IslandMonsters.around(worldX,worldY,state.aoeRange).length>=state.aoeCount){retry.set('aoe',now+1000);if(PlayerSkills.cast(state.aoeSkill))return;}
  if(state.attackOn&&id&&learned().includes(id)&&IslandCombat.mode&&t?.hp&&maxMp&&mp*100>=maxMp*state.attackMp&&(retry.get('a')||0)<=now){retry.set('a',now+800);PlayerSkills.cast(id);}
 }
 setInterval(tick,300);

 // ---- 介面 ----
 const css=document.createElement('style');css.textContent=`
 .assist-hud{position:absolute;z-index:12;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:1px;width:54px;height:54px;padding:3px!important;min-height:0!important;background:#122029c9!important;color:#f4dfa4!important;border:1px solid #b6a576!important;border-radius:4px!important;pointer-events:auto;font-size:11px!important;line-height:1.1}
 .assist-hud svg{width:26px;height:26px;fill:none;stroke:#eee;stroke-width:1.7}
 .assist-hud[aria-pressed=true]{border-color:#e3c65d!important;box-shadow:0 0 6px #e3c65d99}
 .auto-potion-hud{display:none!important}
 .assist-window{position:absolute;left:50%;top:50%;transform:translate(-50%,-50%);width:min(420px,94%);max-height:86%;display:flex;flex-direction:column;box-sizing:border-box;padding:0 7px 7px;color:#d8cfb8;pointer-events:auto;
  background:linear-gradient(90deg,#6e5a33 0,#c9a85e 2px,#3b3020 4px,transparent 5px,transparent calc(100% - 5px),#3b3020 calc(100% - 4px),#c9a85e calc(100% - 2px),#6e5a33 100%),linear-gradient(#17191c,#121416);box-shadow:0 0 0 1px #000,0 8px 24px #000b;border-radius:3px}
 .assist-window header{flex:none;height:30px;margin:0 -7px;display:flex;align-items:center;justify-content:center;position:relative;background:linear-gradient(#2c2a26,#1b1a18);border-bottom:1px solid #5b4b2c}
 .assist-window header h2{margin:0;font-size:15px;letter-spacing:6px;color:#efd9a4}
 .assist-window header button{position:absolute;right:5px;top:4px;width:24px;height:21px;min-height:0!important;padding:0!important;font-size:13px;background:linear-gradient(#4a3d26,#2a2216)!important;border:1px solid #9b8150!important;border-radius:2px;color:#f0dcae!important}
 .assist-body{flex:1;min-height:0;overflow:auto;padding-top:2px;scrollbar-width:thin;scrollbar-color:#7a6740 #121416}
 .assist-body .qy-set-row select{max-width:150px}
 .assist-note{margin:6px 4px;font-size:11px;color:#857d6a;line-height:1.5;text-align:center}
 .assist-buffs{display:grid;grid-template-columns:1fr 1fr;gap:0}
 .assist-buffs .qy-set-row{border-bottom:1px solid #1f1e1b}
 .assist-mob{display:flex;align-items:center;gap:6px}`;document.head.append(css);

 const hud=el('button','assist-hud');hud.type='button';hud.setAttribute('aria-label','輔助系統');
 hud.innerHTML='<svg viewBox="0 0 32 32" aria-hidden="true"><circle cx="16" cy="16" r="4"/><path d="M16 3v5M16 24v5M3 16h5M24 16h5M6.8 6.8l3.5 3.5M21.7 21.7l3.5 3.5M6.8 25.2l3.5-3.5M21.7 10.3l3.5-3.5"/></svg>';hud.append(el('span','','輔助'));
 hud.onclick=()=>dialog?close():open();game.append(hud);
 function place(){const src=document.querySelector('.auto-potion-hud');hud.hidden=window.gameFlowState!=='playing';if(!src)return;hud.style.left=src.style.left;hud.style.top=src.style.top;const top=getComputedStyle(src).top;if(game.classList.contains('classic-hud'))hud.style.top=top;}
 setInterval(place,500);

 function switcher(on,fn,label){const s=el('button','qy-switch');s.type='button';s.setAttribute('role','switch');s.setAttribute('aria-label',label);s.setAttribute('aria-checked',String(!!on));s.onclick=()=>{const want=s.getAttribute('aria-checked')!=='true';if(fn(want)!==false)s.setAttribute('aria-checked',String(want));};return s;}
 function slider(value,min,max,fn,unit,label){const box=el('span','assist-mob'),r=el('input'),v=el('span','val',value+unit);r.type='range';r.min=String(min);r.max=String(max);r.value=String(value);r.setAttribute('aria-label',label);r.oninput=()=>{v.textContent=r.value+unit;};r.onchange=()=>{if(fn(Number(r.value))===false){r.value=String(value);v.textContent=value+unit;}else value=Number(r.value);};box.append(r,v);return box;}
 function row(icon,label,note,...c){const r=el('div','qy-set-row'),t=el('div','txt',label);if(note)t.append(el('small','',note));r.append(el('span','ico',icon),t,...c);return r;}
 const group=(...rows)=>{const g=el('div','qy-set-group');g.append(...rows);return g;};
 const head=t=>el('div','qy-set-head',t);
 const count=pred=>owned().filter(pred).reduce((n,e)=>n+e.count,0);

 function huntPage(){const p=el('div'),ap=AutoPotion.snapshot,tp=count(e=>handler(e)==='teleport.Move_Reel'),home=count(e=>handler(e)==='teleport.GoHome_Reel');
  p.append(head('AUTO 掛機'),group(
   row('🎯','掛機索敵範圍','AUTO 時會往多遠的怪物走過去',slider(IslandCombat.autoRange,12,48,v=>{IslandCombat.setAutoRange(v);},' 格','掛機索敵範圍')),
   row('🌀','沒怪 '+state.noMobSec+' 秒自動瞬移','用瞬間移動卷軸（身上 '+tp+' 張）',slider(state.noMobSec,3,60,v=>save({noMobSec:v})&&void render(),' 秒','沒怪幾秒瞬移'),switcher(state.noMobTp,on=>save({noMobTp:on}),'沒怪自動瞬移')),
   row('🏠','體力低於 '+ap.homeThreshold+'% 時回村','用回家卷軸（身上 '+home+' 張）',slider(ap.homeThreshold,1,99,v=>AutoPotion.configure({homeThreshold:v})&&void render(),'%','回村體力門檻'),switcher(ap.homeEnabled,on=>AutoPotion.configure({homeEnabled:on}),'低血回村')),
   row('🏃','撐不住先瞬移，3 次就回村','體力低於回村門檻時先用瞬間移動卷軸；一分鐘內逃到第 3 次才用回家卷軸（要開上面的回村）',switcher(state.escape,on=>save({escape:on}),'撐不住先瞬移'))));
  p.append(el('p','assist-note','巡邏範圍從開 AUTO 的地方算起；瞬間移動卷軸不能用的地區不會瞬移。'));return p;}

 function supplyPage(){const p=el('div'),ap=AutoPotion.snapshot;
  const heal=el('select');heal.setAttribute('aria-label','補血道具');heal.append(new Option('（選擇補血道具）',''));
  for(const key of [...new Set(OwnedInventory.healingItems.map(e=>e.key))])heal.append(new Option(catalog.get(key).name+' ×'+count(e=>e.key===key),key,false,ap.key===key&&!ap.skillId));
  heal.onchange=()=>{if(heal.value&&!AutoPotion.configure({key:heal.value,skillId:null}))heal.value='';render();};
  p.append(head('補血'),group(
   row('❤️','自動喝補血道具',null,heal),
   row('🔁','喝完先喝身上別種','選的補血道具用完時，改喝身上其他補血藥水',switcher(state.healFallback,on=>save({healFallback:on}),'喝完先喝身上別種')),
   row('📉','體力低於 '+ap.threshold+'% 時喝',null,slider(ap.threshold,1,99,v=>AutoPotion.configure({threshold:v})&&void render(),'%','補血門檻'),switcher(ap.enabled,on=>AutoPotion.configure({enabled:on})||(toast('請先選擇補血道具或治癒魔法。'),false),'自動補血'))));
  const rows=POTIONS.map(([kind,label,kinds])=>{const n=count(e=>kinds.includes(NativePotions.durationState(e.key)?.key));return row('🧪',label,'效果沒了自動喝 · 身上 '+n+' 個',switcher(state.potions[kind],on=>save({potions:{...state.potions,[kind]:on}}),label));});
  p.append(head('狀態藥水'),group(...rows),el('p','assist-note','職業不能喝的（例如勇水限騎士、戰士）會自動略過。'));
  const cur=TransformCards.active;p.append(head('變身'),group(row('🎭','死亡後自動再變身',(cur?'目前變身：'+cur+'。':'目前沒有變身。')+'倒地後變身會消失，復活後自動變回死亡前的那張變身卡',switcher(state.morph,on=>save({morph:on}),'死亡後自動再變身'))));
  const buyRows=BUYS.map(([k,label])=>{const b=state.buy[k],pr=product(k),qty=el('select');qty.setAttribute('aria-label',label+' 購買數量');
   for(const n of QTY)qty.append(new Option('×'+n,String(n),false,n===b.n));qty.onchange=()=>{save({buy:{...state.buy,[k]:{...b,n:Number(qty.value)}}});render();};
   const packs=pr?Math.ceil(b.n/pr.pack):0,note=pr?catalog.get(pr.key).name+' · 一次 '+(packs*pr.pack)+' 個 '+(packs*pr.price).toLocaleString()+' 金幣':k==='heal'&&!AutoPotion.snapshot.key?'先在上面選補血道具':'商店沒賣或目前職業不能用';
   const sw=switcher(b.on,on=>pr||!on?save({buy:{...state.buy,[k]:{...b,on}}}):(toast('商店沒賣這項，無法自動購買。'),false),'自動購買 '+label);
   return row('🛒',label,'用完時自動買 · '+note,qty,sw);});
  const purse=OwnedInventory.items.find(e=>e.key==='etcitem:40308')?.count||0;
  p.append(head('自動購買'),group(...buyRows),el('p','assist-note','身上用完（0 個）時直接扣金幣購買，價格取各地商店最便宜的。目前金幣 '+purse.toLocaleString()+'。'));return p;}

 function magicPage(){const p=el('div'),ids=learned(),ap=AutoPotion.snapshot,sk=id=>playerSkillData.skills[id];
  const pickSkill=(field,label)=>{const s=el('select');s.setAttribute('aria-label',label);s.append(new Option('（選擇'+label+'）',''));for(const id of attackSkills(ids))s.append(new Option(sk(id).name+' · MP '+sk(id).mp,String(id),false,state[field]===id));s.onchange=()=>save({[field]:s.value?Number(s.value):null});return s;};
  const atk=pickSkill('attackSkill','攻擊技能');
  const healSk=el('select');healSk.setAttribute('aria-label','治癒魔法');healSk.append(new Option('（不用治癒魔法）',''));
  for(const id of ids.filter(id=>PlayerSkills.supports(id)&&/治癒|恢復/.test(sk(id).name)))healSk.append(new Option(sk(id).name+' · MP '+sk(id).mp,String(id),false,ap.skillId===id));
  healSk.onchange=()=>{if(healSk.value){if(!AutoPotion.configure({skillId:Number(healSk.value),key:null}))healSk.value='';}else{const k=OwnedInventory.healingItems[0]?.key;AutoPotion.configure(k?{skillId:null,key:k}:{skillId:null,key:null,enabled:false});}render();};
  p.append(head('開怪技能'),group(row('🎯','開怪技能','換到新目標（滿血）先放一次',pickSkill('openSkill','開怪技能')),row('💧','魔力 '+state.openMp+'% 以上',null,slider(state.openMp,0,99,v=>save({openMp:v})&&void render(),'%','開怪技能魔力門檻'),switcher(state.openOn,on=>save({openOn:on}),'自動開怪技能'))));
  p.append(head('範圍技能'),group(row('💥','範圍技能','周圍 '+state.aoeRange+' 格有 '+state.aoeCount+' 隻以上時施放',pickSkill('aoeSkill','範圍技能')),
   row('📏','範圍 '+state.aoeRange+' 格',null,slider(state.aoeRange,1,8,v=>save({aoeRange:v})&&void render(),' 格','範圍格數')),
   row('👥',state.aoeCount+' 隻以上',null,slider(state.aoeCount,2,10,v=>save({aoeCount:v})&&void render(),' 隻','怪物數量')),
   row('💧','魔力 '+state.aoeMp+'% 以上',null,slider(state.aoeMp,0,99,v=>save({aoeMp:v})&&void render(),'%','範圍技能魔力門檻'),switcher(state.aoeOn,on=>save({aoeOn:on}),'自動範圍技能'))));
  p.append(head('攻擊魔法'),group(row('⚡','攻擊技能','打怪時魔力 '+state.attackMp+'% 以上施放',atk),row('💧','魔力門檻',null,slider(state.attackMp,0,99,v=>save({attackMp:v})&&void render(),'%','攻擊技能魔力門檻'),switcher(state.attackOn,on=>save({attackOn:on}),'自動攻擊技能'))));
  p.append(head('治癒魔法'),group(row('✚','體力低於 '+ap.threshold+'% 時施放','和「補給」的補血門檻共用',healSk)));
  const mind=ids.includes(130);
  p.append(head('洗魔魔法'),mind?group(row('🔄','用體力換魔力（心靈轉換）','體力高於 '+state.mindHp+'%、魔力低於 '+state.mindMp+'% 時施放',switcher(state.mindOn,on=>save({mindOn:on}),'自動心靈轉換')),
   row('❤️','體力高於 '+state.mindHp+'%',null,slider(state.mindHp,1,99,v=>save({mindHp:v})&&void render(),'%','洗魔體力門檻')),
   row('💧','魔力低於 '+state.mindMp+'%',null,slider(state.mindMp,1,99,v=>save({mindMp:v})&&void render(),'%','洗魔魔力門檻'))):el('p','assist-note','還沒有學會心靈轉換。'));
  const buffIds=ids.filter(id=>ClassBuffs.selfBuff(id));
  if(buffIds.length){const g=el('div','qy-set-group assist-buffs');for(const id of buffIds)g.append(row('',sk(id).name,null,switcher(state.buffs.includes(id),on=>save({buffs:on?[...state.buffs,id]:state.buffs.filter(x=>x!==id)}),sk(id).name)));p.append(head('輔助魔法'),g,el('p','assist-note','效果沒了就補；沒開 AUTO 也會。'));}
  else p.append(head('輔助魔法'),el('p','assist-note','還沒有學會可以自動施放的輔助魔法。'));
  return p;}

 function summonPage(){const p=el('div'),id=summonSkill(),last=Summons.lastName,list=Summons.list;
  p.append(head('自動召喚'),group(
   row('🐾','沒有召喚物時自動施放',id?playerSkillData.skills[id].name+' · 掛機（AUTO）時身邊沒有召喚物就施放':'還沒學會召喚術／召喚屬性精靈',switcher(state.summonOn,on=>id||!on?save({summonOn:on}):(toast('還沒學會召喚魔法。'),false),'自動召喚')),
   row('💍','戴召喚控制戒指時召喚上次手選的',last?'上次手選：'+last:'先手動用一次召喚控制戒指選單選怪物',switcher(state.ringOn,on=>save({ringOn:on}),'召喚控制戒指自動召喚'))));
  p.append(head('目前召喚物'),list.length?group(...list.map(a=>row('',a.name,'體力 '+a.hp))):el('p','assist-note','（沒有）'),
   el('p','assist-note','法師用「召喚術」依等級召喚；妖精用「召喚屬性精靈」召喚自己屬性的精靈。沒戴戒指時直接召喚；戴戒指但沒開上面的選項時不會自動召喚（避免一直跳出選單）。寵物、夥伴系統這個遊戲還沒有。'));
  return p;}

 function listPage(){const p=el('div'),map=String(window.activeMapId||0),cur=mapList();
  const names=[...new Set(islandMonsterSpawns.filter(s=>(s.mapId||0)===(window.activeMapId||0)&&!s.resident&&s.npc&&s.npc.kind==='L1Monster').map(s=>s.npc.name))].filter(n=>!cur[n]).sort();
  const pick=el('select');pick.setAttribute('aria-label','選擇怪物');pick.append(new Option('（請選擇）',''));for(const n of names)pick.append(new Option(n,n));
  const add=el('button','act','加入');add.type='button';add.onclick=()=>{if(!pick.value)return;save({list:{...state.list,[map]:{...cur,[pick.value]:'skip'}}});render();};
  p.append(head('怪物名單（'+(WorldMaps.name?.(window.activeMapId||0)||'目前地圖')+'）'),group(row('👾','加入怪物',null,pick,add)));
  const rows=Object.entries(cur).map(([n,mode])=>{const s=el('select');s.setAttribute('aria-label',n+' 處理方式');s.append(new Option('不打','skip',false,mode==='skip'),new Option('瞬移','tp',false,mode==='tp'));s.onchange=()=>save({list:{...state.list,[map]:{...cur,[n]:s.value}}});
   const del=el('button','act','移除');del.type='button';del.onclick=()=>{const next={...cur};delete next[n];const list={...state.list};if(Object.keys(next).length)list[map]=next;else delete list[map];save({list});render();};return row('',n,null,s,del);});
  p.append(rows.length?group(...rows):el('p','assist-note','（沒有）'),el('p','assist-note','沒加進來的怪都會打；「瞬移」看到就用瞬間移動卷軸離開，「不打」被牠打時還是會還手。每張地圖各自設定。'));return p;}

 const PAGES=[['hunt','狩獵',huntPage],['supply','補給',supplyPage],['magic','魔法',magicPage],['summon','召喚',summonPage],['list','名單',listPage]];
 let body=null,tabs=null;
 function render(){if(!dialog)return;const y=body.scrollTop;body.replaceChildren(PAGES.find(p=>p[0]===tab)[2]());body.scrollTop=y;for(const b of tabs.children)b.setAttribute('aria-selected',String(b.dataset.tab===tab));}
 function open(){if(window.gameFlowState!=='playing')return false;if(dialog){dialog.style.zIndex=String(FloatingWindows.frontLevel());return true;}
  dialog=el('section','assist-window');dialog.setAttribute('role','dialog');dialog.setAttribute('aria-label','輔助系統');dialog.style.zIndex=String(FloatingWindows.frontLevel());
  const h=el('header'),x=el('button','','✕');x.type='button';x.setAttribute('aria-label','關閉輔助系統');x.onclick=close;h.append(el('h2','','輔助系統'),x);
  tabs=el('div','qy-set-tabs');for(const [k,l] of PAGES){const b=el('button','',l);b.type='button';b.dataset.tab=k;b.onclick=()=>{tab=k;body.scrollTop=0;render();};tabs.append(b);}
  body=el('div','assist-body');dialog.append(h,tabs,body);game.append(dialog);hud.setAttribute('aria-pressed','true');render();return true;}
 function close(){dialog?.remove();dialog=null;hud.setAttribute('aria-pressed','false');}
 addEventListener('keydown',e=>{if(e.key==='Escape'&&dialog)close();});
 return {activate,open,close,skip,tick,get escapeFirst(){return state.escape&&owner===window.activeCharacterId;},get healFallback(){return state.healFallback&&owner===window.activeCharacterId;},get snapshot(){return JSON.parse(JSON.stringify(state));}};
})();window.AssistSystem=AssistSystem;
