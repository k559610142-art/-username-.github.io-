// 2026-11-20 旅館：旅館老闆對話 inn 只留「租房間」「退房間」（使用者要求拿掉租會議廳、進入房間）。
// 照原版：房間 300 天幣、租期 4 小時、期限內退還鑰匙退 20% 租金；拿到旅館鑰匙（etcitem 40312），鑰匙只能在租的那間旅館用。
// 效果：鑰匙有效期間，站在租的那間旅館老闆 RANGE 格內，自然回魔加快 MP_SPEED 倍（player-class-stats.js tick 讀 InnServices.mpBoost()），不是立即回滿。
// 租用紀錄放 localStorage（innRental:角色 id）；紀錄遺失時鑰匙視為過期，退房只收回鑰匙不退錢。
const InnServices=(()=>{
 const KEY='etcitem:40312',MONEY='etcitem:40308',HOURS=4,PRICE=300,RANGE=12,MP_SPEED=4;
 let inside=false;
 const store=()=>'innRental:'+(window.activeCharacterId||'');
 function rental(){try{const r=JSON.parse(localStorage.getItem(store())||'null');return r&&typeof r==='object'?r:null}catch{return null}}
 function setRental(r){try{r?localStorage.setItem(store(),JSON.stringify(r)):localStorage.removeItem(store())}catch{}}
 const keys=()=>(window.OwnedInventory?.snapshot||[]).filter(e=>e.key===KEY&&!e.slot);
 const money=()=>OwnedInventory.snapshot.filter(e=>e.key===MONEY&&!e.slot).reduce((n,e)=>n+e.count,0);
 const near=(id,range=6)=>IslandMonsters.serviceNearby(id,range);
 const fmtLeft=ms=>{const m=Math.max(1,Math.ceil(ms/60000));return m>=60?Math.floor(m/60)+' 小時 '+(m%60)+' 分':m+' 分'};
 // 目前有效的租用：有紀錄、鑰匙還在背包、沒過期
 function active(){const r=rental();if(!r||r.until<=Date.now())return null;if(!keys().some(e=>e.uid===r.uid))return null;return r}
 function reply(id,text,extra=[]){NativeNpcDialogs.show(id,'inn');NativeNpcDialogs.message(text);const box=document.querySelector('#panelContent');for(const b of extra)box.append(b);return true}
 function button(label,fn){const b=uiElement('button','',label);b.type='button';b.onclick=fn;return b}
 // native-npc-dialogs.js show(id,'inn') 之後呼叫：只留租房間、退房間
 function trim(host){for(const b of host.querySelectorAll('button')){const a=b.dataset.action;if(a==='hall'||a==='enter'){const br=b.nextSibling;b.remove();if(br?.nodeName==='BR')br.remove()}else if(a==='return')b.textContent='退房間'}
  const r=active();if(r)host.append(uiElement('p','','你已租了房間（剩餘 '+fmtLeft(r.until-Date.now())+'），帶著鑰匙待在旅館附近，魔力恢復加快。'))}
 function rent(id){
  if(!near(id))return reply(id,'請先走到旅館老闆身邊。');
  if(active())return reply(id,'對不起，你已經有租房間了。');
  if(money()<PRICE)return reply(id,'對不起，你手中的天幣不夠哦！需要 '+PRICE.toLocaleString()+' 天幣。');
  const next=OwnedInventory.snapshot;
  for(let i=next.length-1;i>=0;i--)if(next[i].key===KEY&&!next[i].slot)next.splice(i,1); // 過期或紀錄遺失的舊鑰匙先收回
  let cost=PRICE;for(let i=next.length-1;i>=0&&cost;i--){const e=next[i];if(e.key!==MONEY||e.slot)continue;const n=Math.min(cost,e.count);cost-=n;e.count-=n;if(!e.count)next.splice(i,1)}
  if(cost)return reply(id,'對不起，你手中的天幣不夠哦！');
  const uid='item-inn-'+Date.now().toString(36);next.push({uid,key:KEY,count:1,slot:null});
  if(!OwnedInventory.applyChange(next))return reply(id,'租用失敗，未扣除天幣。');
  setRental({npcId:id,type:'room',price:PRICE,uid,until:Date.now()+HOURS*3600000});
  return reply(id,'租好了房間，花費 '+PRICE.toLocaleString()+' 天幣，拿到一把旅館鑰匙。時間是 '+HOURS+' 個小時，帶著鑰匙待在旅館附近，魔力會恢復得比較快。期限內退房還你 20% 租金。');
 }
 function giveBack(id){
  const r=rental(),owned=keys();
  if(!owned.length){setRental(null);return reply(id,'你沒有租房間。')}
  const valid=r&&owned.some(e=>e.uid===r.uid);
  if(valid&&r.npcId!==id)return reply(id,'這不是我們旅館的鑰匙，請拿回原本租的旅館退房。');
  const refund=valid&&r.until>Date.now()?Math.floor(r.price*.2):0;
  const next=OwnedInventory.snapshot.filter(e=>!(e.key===KEY&&!e.slot));
  if(refund){const m=next.find(e=>e.key===MONEY&&!e.slot);if(m)m.count+=refund;else next.push({uid:'item-inn-r'+Date.now().toString(36),key:MONEY,count:refund,slot:null})}
  if(!OwnedInventory.applyChange(next))return reply(id,'退房失敗，鑰匙仍在背包。');
  setRental(null);
  return reply(id,refund?'謝謝你。這裡還給你 '+refund.toLocaleString()+' 天幣。謝謝光臨。':'謝謝你。租期已經過了，收回鑰匙，沒有退款。謝謝光臨。');
 }
 // 自然回魔倍數：鑰匙有效、在同一張地圖、離租的旅館老闆 RANGE 格內
 function mpBoost(){const r=active();const now=!!(r&&near(r.npcId,RANGE));if(now!==inside){inside=now;if(window.gameFlowState==='playing'&&r)toast(now?'進入旅館，魔力恢復加快。':'離開旅館，魔力恢復回到一般速度。')}return now?MP_SPEED:1}
 function handle(id,action){
  if(action==='room')return reply(id,'這裡的房間一人 '+PRICE.toLocaleString()+' 天幣，租期 '+HOURS+' 小時。要租用嗎？（目前持有 '+money().toLocaleString()+' 天幣）',[button('確定租用',()=>rent(id))]);
  if(action==='return')return giveBack(id);
  return false;
 }
 return {handle,trim,mpBoost,actions:['room','return'],get rental(){return active()}};
})();window.InnServices=InnServices;
