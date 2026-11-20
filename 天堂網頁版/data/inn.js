// 2026-11-20 旅館：旅館老闆對話 inn 的「租房間／租會議廳／退租／進入房間或會議廳」（原本回「這項服務目前尚未接入」）。
// 照原版：房間一人 300 天幣、會議廳 600 天幣且只有王族能租，租期 4 小時，期限內退還鑰匙退 20% 租金；拿到旅館鑰匙（etcitem 40312）。
// 網頁版沒有旅館房間地圖：「進入房間」改成在老闆身邊休息 3 秒、體力魔力全滿。鑰匙只能在租的那間旅館用。
// 租用紀錄放 localStorage（innRental:角色 id）；紀錄遺失時鑰匙視為過期，退租只收回鑰匙不退錢。
const InnServices=(()=>{
 const KEY='etcitem:40312',MONEY='etcitem:40308',HOURS=4,PRICE={room:300,hall:600},NAME={room:'房間',hall:'會議廳'};
 let resting=false;
 const store=()=>'innRental:'+(window.activeCharacterId||'');
 function rental(){try{const r=JSON.parse(localStorage.getItem(store())||'null');return r&&typeof r==='object'?r:null}catch{return null}}
 function setRental(r){try{r?localStorage.setItem(store(),JSON.stringify(r)):localStorage.removeItem(store())}catch{}}
 const keys=()=>OwnedInventory.snapshot.filter(e=>e.key===KEY&&!e.slot);
 const money=()=>OwnedInventory.snapshot.filter(e=>e.key===MONEY&&!e.slot).reduce((n,e)=>n+e.count,0);
 const near=id=>IslandMonsters.serviceNearby(id,6);
 const fmtLeft=ms=>{const m=Math.max(1,Math.ceil(ms/60000));return m>=60?Math.floor(m/60)+' 小時 '+(m%60)+' 分':m+' 分'};
 // 目前有效的租用：有紀錄、鑰匙還在背包、沒過期
 function active(){const r=rental();if(!r)return null;if(!keys().some(e=>e.uid===r.uid))return null;return r}
 function reply(id,text,extra=[]){NativeNpcDialogs.show(id,'inn');NativeNpcDialogs.message(text);const box=document.querySelector('#panelContent');for(const b of extra)box.append(b);return true}
 function button(label,fn){const b=uiElement('button','',label);b.type='button';b.onclick=fn;return b}
 function rent(id,type){
  if(!near(id))return reply(id,'請先走到旅館老闆身邊。');
  if(type==='hall'&&job!=='王族')return reply(id,'王子和公主才能租用會議廳。');
  const r=active();if(r&&r.until>Date.now())return reply(id,r.type==='hall'?'真是抱歉，你已經租借過會議廳了。':'對不起，你已經有租房間了。');
  const price=PRICE[type];if(money()<price)return reply(id,'對不起，你手中的天幣不夠哦！需要 '+price.toLocaleString()+' 天幣。');
  const next=OwnedInventory.snapshot;
  // 過期或紀錄遺失的舊鑰匙先收回
  for(let i=next.length-1;i>=0;i--)if(next[i].key===KEY&&!next[i].slot)next.splice(i,1);
  let cost=price;for(let i=next.length-1;i>=0&&cost;i--){const e=next[i];if(e.key!==MONEY||e.slot)continue;const n=Math.min(cost,e.count);cost-=n;e.count-=n;if(!e.count)next.splice(i,1)}
  if(cost)return reply(id,'對不起，你手中的天幣不夠哦！');
  const uid='item-inn-'+Date.now().toString(36);next.push({uid,key:KEY,count:1,slot:null});
  if(!OwnedInventory.applyChange(next))return reply(id,'租用失敗，未扣除天幣。');
  setRental({npcId:id,type,price,uid,until:Date.now()+HOURS*3600000});
  return reply(id,'租好了'+NAME[type]+'，花費 '+price.toLocaleString()+' 天幣，拿到一把旅館鑰匙。時間是 '+HOURS+' 個小時，期限內退還鑰匙退還 20% 租金。請選「進入房間或會議廳」好好休息。');
 }
 function giveBack(id){
  const r=rental(),owned=keys();
  if(!owned.length){setRental(null);return reply(id,'你沒有租房間。')}
  const mine=r&&r.npcId===id&&owned.some(e=>e.uid===r.uid);
  if(r&&owned.some(e=>e.uid===r.uid)&&r.npcId!==id)return reply(id,'這不是我們旅館的鑰匙，請拿回原本租的旅館退租。');
  const refund=mine&&r.until>Date.now()?Math.floor(r.price*.2):0;
  const next=OwnedInventory.snapshot.filter(e=>!(e.key===KEY&&!e.slot));
  if(refund){const m=next.find(e=>e.key===MONEY&&!e.slot);if(m)m.count+=refund;else next.push({uid:'item-inn-r'+Date.now().toString(36),key:MONEY,count:refund,slot:null})}
  if(!OwnedInventory.applyChange(next))return reply(id,'退租失敗，鑰匙仍在背包。');
  setRental(null);
  return reply(id,refund?'謝謝你。這裡還給你 '+refund.toLocaleString()+' 天幣。謝謝光臨。':'謝謝你。租期已經過了，收回鑰匙，沒有退款。謝謝光臨。');
 }
 function enter(id){
  if(resting)return reply(id,'正在休息中…');
  const r=active();
  if(!r)return reply(id,'你沒有這裡的鑰匙，請先租房間。');
  if(r.npcId!==id)return reply(id,'這不是我們旅館的鑰匙。');
  if(r.until<=Date.now())return reply(id,'鑰匙的租期已經過了，請先退租再重新租用。');
  if(!near(id))return reply(id,'請先走到旅館老闆身邊。');
  if(hp>=maxHp&&mp>=maxMp)return reply(id,'你的體力和魔力都是滿的。（剩餘租期 '+fmtLeft(r.until-Date.now())+'）');
  resting=true;reply(id,'在'+NAME[r.type]+'裡休息中…');
  setTimeout(()=>{resting=false;
   if(window.gameFlowState!=='playing'||CharacterActions.dead||!near(id)){toast('離開旅館，休息中斷。');return}
   if(OwnedInventory.applyChange(OwnedInventory.snapshot,{hp:maxHp,mp:maxMp})){toast('在旅館好好休息了一番，體力與魔力全部恢復。');const panel=document.querySelector('#panel');if(!panel.hidden&&document.querySelector('#panelContent .native-dialog[data-dialog="inn"]'))NativeNpcDialogs.message('休息好了，體力與魔力全部恢復。（剩餘租期 '+fmtLeft(r.until-Date.now())+'）')}
  },3000);
  return true;
 }
 function handle(id,action){
  if(action==='room'||action==='hall'){const type=action,price=PRICE[type];
   if(type==='hall'&&job!=='王族')return reply(id,'王子和公主才能租用會議廳。');
   return reply(id,'這裡的'+NAME[type]+'一人 '+price.toLocaleString()+' 天幣，租期 '+HOURS+' 小時。要租用嗎？（目前持有 '+money().toLocaleString()+' 天幣）',[button('確定租用',()=>rent(id,type))]);}
  if(action==='return')return giveBack(id);
  if(action==='enter')return enter(id);
  return false;
 }
 return {handle,actions:['room','hall','return','enter'],get rental(){return active()}};
})();window.InnServices=InnServices;
