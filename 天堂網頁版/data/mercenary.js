// 傭兵團（2026-11-16 使用者設計，取代選單「排行」）：規則在 mercenary-data.js，扣款與發點數在本機多人伺服器 /api/merc/*。
//  登記傭兵：把目前角色資料（名字、職業、性別、等級、HP、武器）上傳到公告板，自訂每小時鑽石價格。
//  雇用：雇主付鑽石（公會抽 20%，其餘給傭兵本人），公會另發傭兵點數給傭兵本人（時間越長越多）。
//   跟隨＝傭兵由假人 AI 操控（fake-players.js hireBot＋npc-social.js adopt），跟著你打你正在打的怪，合約到期離開；
//   任務＝傭兵不出現在畫面，時間到在「我的傭兵」領取經驗與金幣。
//  點數商店：用傭兵點數換道具（商品在 mercenary-data.js）。鑽石百貨公司的錢包旁顯示傭兵點數。
const Mercenary=(()=>{
 const R=window.MERCENARY_RULES,el=(tag,cls,text)=>{const n=document.createElement(tag);n.className=cls||'';if(text!==undefined)n.textContent=text;return n;};
 const button=(text,fn)=>{const b=el('button','dc-button',text);b.type='button';b.onclick=fn;return b;};
 const TABS=['傭兵公告板','登記傭兵','我的傭兵','點數商店','傭兵任務'];
 let win=null,tab=0,notice='',board=null,mine=null,busy=false,generation=0,bot=null,armed=null;
 const me=()=>window.GameEntry?.characters.find(c=>c?.id===window.activeCharacterId)||null;
 const contract=()=>me()?.mercContract||null;
 const online=()=>!!window.LocalServerClient?.online;
 const fmtTime=ms=>{ms=Math.max(0,ms);const h=Math.floor(ms/3600000),m=Math.floor(ms%3600000/60000),s=Math.floor(ms%60000/1000);return (h?h+' 小時 ':'')+(h||m?m+' 分 ':'')+(h?'':s+' 秒');};
 const itemOf=key=>INTERFACE_CATALOG.items.find(i=>i.kind+':'+i.id===key);
 function close(){generation++;armed=null;win?.remove();win=null;}
 function render(){
  if(!win)return;const c=me();win.replaceChildren();
  const head=el('div','dc-heading');head.append(el('strong','','傭兵團'),el('span','dc-wallet','💎 鑽石 '+(c?.diamonds||0).toLocaleString()),el('span','dc-wallet dc-merc-points','⚔ 傭兵點數 '+(c?.mercPoints||0).toLocaleString()));
  const x=button('✕',close);x.className='dc-close';x.setAttribute('aria-label','關閉傭兵團');head.append(x);win.append(head);
  const nav=el('nav','dc-tabs');for(const [i,label]of TABS.entries()){const b=button(label,()=>{tab=i;notice='';armed=null;render();if(i<2||i===4)load();});b.classList.toggle('selected',i===tab);nav.append(b);}win.append(nav);
  const body=el('div','dc-body merc-body');win.append(body);
  if(tab===4)missionView(body);
  else if(!online())body.append(el('div','dc-empty','傭兵團需要登入本機多人伺服器：其他玩家上傳的傭兵、鑽石與傭兵點數都由伺服器保管。'));
  else [boardView,registerView,contractView,shopView][tab](body);
  const status=el('p','dc-notice',notice);status.setAttribute('role','status');win.append(status);
 }
 function boardView(body){
  body.append(el('p','dc-muted','雇用費用由你支付鑽石，傭兵公會抽 '+Math.round(R.feeRate*100)+'% 手續費。跟隨：傭兵跟著你打怪；任務：時間到領經驗與金幣。'));
  if(!board){body.append(el('div','dc-empty','載入中…'));return;}
  const k=contract(),active=k&&(k.mode==='follow'?k.until>Date.now():!k.claimed);
  if(active)body.append(el('div','dc-empty','你已經雇用了 '+k.name+'，合約結束或解約後才能再雇用。'));
  if(!board.length){body.append(el('div','dc-empty','目前沒有其他玩家登記傭兵。'));return;}
  const grid=el('div','dc-products merc-grid');
  for(const m of board){
   const card=el('article','dc-product merc-card');card.append(el('h3','',m.name),el('p','merc-meta',m.role+'｜Lv.'+m.level+(m.maxHp?'｜HP '+m.maxHp:'')),el('p','merc-meta','被雇用 '+m.hires+' 次'),el('span','dc-price','💎 '+m.price+' / 小時'));
   const hours=el('select','merc-select');hours.setAttribute('aria-label','雇用時數');for(const h of R.hours){const o=el('option','',h+' 小時');o.value=h;hours.append(o);}
   const mode=el('select','merc-select');mode.setAttribute('aria-label','雇用方式');for(const [v,l]of [['follow','跟隨打怪'],...R.missions.map(t=>['mission:'+t.id,'任務：'+t.name])]){const o=el('option','',l);o.value=v;mode.append(o);}
   const cost=el('p','merc-cost'),go=button('雇用',()=>{const h=+hours.value,total=m.price*h;if(armed!==m.id){armed=m.id;go.textContent='確認支付 💎'+total;return;}armed=null;const [kind,mission]=mode.value.split(':');run('/api/merc/hire',{mercId:m.id,hours:h,mode:kind,missionId:mission||null},'已雇用 '+m.name+'。');});
   const sync=()=>{const h=+hours.value;cost.textContent='合計 💎 '+(m.price*h)+'｜傭兵本人得點數 +'+R.points(h);armed=null;go.textContent='雇用';};hours.onchange=sync;mode.onchange=sync;sync();
   go.disabled=busy||active;card.append(hours,mode,cost,go);grid.append(card);
  }
  body.append(grid);
 }
 function registerView(body){
  const c=me();if(!c)return;
  body.append(el('p','dc-muted','把目前角色的資料（職業、等級、HP、武器）上傳到傭兵公告板。被雇用時由 AI 操控你的角色分身，你不用在線；雇主付的鑽石（扣除 '+Math.round(R.feeRate*100)+'% 手續費）和公會發的傭兵點數會直接進你的角色，信件會通知你。'));
  const box=el('div','merc-register');
  box.append(el('p','merc-meta','目前角色：'+c.name+'｜'+c.role+'｜Lv.'+(window.activeCharacterLevel||c.level||1)));
  if(mine)box.append(el('p','merc-meta','已登記：每小時 💎 '+mine.price+'｜等級 '+mine.level+'｜被雇用 '+mine.hires+' 次'),...(mine.busyUntil?[el('p','merc-meta','目前被雇用中（合約到 '+new Date(mine.busyUntil).toLocaleTimeString([], {hour:'2-digit',minute:'2-digit'})+'），期間不會出現在公告板，也不能撤下。')]:[]));else if(board)box.append(el('p','merc-meta','尚未登記傭兵。'));
  const price=el('input','merc-input');price.type='number';price.min=R.priceMin;price.max=R.priceMax;price.value=mine?.price||R.suggestPrice(window.activeCharacterLevel||1);price.setAttribute('aria-label','每小時鑽石價格');
  const row=el('label','merc-price-row');row.append('每小時價格 💎 ',price);box.append(row);
  box.append(el('p','merc-meta','傭兵點數：1 小時 +'+R.points(1)+'、2 小時 +'+R.points(2)+'、4 小時 +'+R.points(4)+'、8 小時 +'+R.points(8)));
  const up=button(mine?'更新資料與價格':'上傳成為傭兵',()=>{const p=Math.round(+price.value);if(!(p>=R.priceMin&&p<=R.priceMax)){notice='價格要在 '+R.priceMin+'～'+R.priceMax+' 鑽石之間。';render();return;}run('/api/merc/register',{price:p},'已上傳目前角色資料到傭兵公告板。',true);});
  up.disabled=busy;box.append(up);
  if(mine){const off=button('撤下傭兵',()=>run('/api/merc/withdraw',{},'已從公告板撤下。',true));off.disabled=busy||!!mine.busyUntil;box.append(off);}
  body.append(box);
 }
 function contractView(body){
  const k=contract(),now=Date.now();
  if(!k){body.append(el('div','dc-empty','目前沒有雇用傭兵，到「傭兵公告板」挑一位吧。'));return;}
  const box=el('div','merc-register'),mission=R.missions.find(m=>m.id===k.missionId);
  box.append(el('h3','',k.name+'｜'+k.role+'｜Lv.'+k.level),el('p','merc-meta',k.mode==='follow'?'跟隨打怪':'任務：'+(mission?.name||'')+(mission?'（'+mission.note+'）':'')),el('p','merc-meta','雇用 '+k.hours+' 小時，支付 💎 '+k.cost));
  if(k.mode==='follow'){box.append(el('p','merc-meta',k.until>now?'剩餘 '+fmtTime(k.until-now):'合約已到期'));const end=button('解約',()=>run('/api/merc/dismiss',{},'已解約，傭兵離開了。'));end.disabled=busy;box.append(end);}
  else{
   const reward=R.missionReward(k.level,k.hours,k.missionId),done=k.until<=now,bar=el('div','merc-bar'),fill=el('span');fill.style.width=Math.min(100,Math.round((now-k.start)/(k.until-k.start)*100))+'%';bar.append(fill);
   box.append(bar,el('p','merc-meta',done?'任務完成！':'剩餘 '+fmtTime(k.until-now)),el('p','merc-meta','獎勵：經驗 +'+reward.experience.toLocaleString()+'、金幣 +'+reward.gold.toLocaleString()));
   const claim=button('領取獎勵',claimReward);claim.disabled=busy||!done;box.append(claim);
   const end=button('放棄任務',()=>run('/api/merc/dismiss',{},'已放棄任務。'));end.disabled=busy;box.append(end);
  }
  body.append(box);
 }
 function missionView(body){
  const k=contract(),active=!!(k&&(k.mode==='follow'?k.until>Date.now():!k.claimed)),tokens=()=> (window.OwnedInventory?.items||[]).filter(e=>e.key==='etcitem:990102'&&!e.slot).reduce((n,e)=>n+e.count,0);
  body.append(el('h2','','可接傭兵任務'),el('p','dc-muted','選擇任務、雇用傭兵與派遣時數。每次需 1 個傭兵任務令牌及雇用鑽石；任務完成後在「我的傭兵」領取經驗與金幣。'));
  if(!online())body.append(el('p','dc-muted','登入本機多人伺服器後即可選擇傭兵並接取任務。'));
  if(active){body.append(el('p','merc-meta','目前已有傭兵合約，完成或解約後才能接取下一個任務。'));if(k.mode==='mission')contractView(body);}
  const grid=el('div','dc-products merc-grid merc-missions');
  for(const mission of R.missions){
   const card=el('article','dc-product merc-card'),merc=el('select','merc-select'),hours=el('select','merc-select');merc.setAttribute('aria-label',mission.name+'的傭兵');hours.setAttribute('aria-label',mission.name+'的任務時數');
   for(const m of board||[]){const opt=el('option','',m.name+'｜Lv.'+m.level+'｜💎'+m.price+'/小時');opt.value=m.id;merc.append(opt);}
   if(!merc.options.length){const opt=el('option','',online()?(board?'目前沒有可雇用傭兵':'載入傭兵中…'):'登入後選擇傭兵');opt.value='';merc.append(opt);}
   for(const h of R.hours){const opt=el('option','',h+' 小時');opt.value=h;hours.append(opt);}
   const reward=el('p','merc-meta'),cost=el('p','merc-cost'),reason=el('p','merc-meta');
   const selected=()=>board?.find(m=>String(m.id)===merc.value),canTake=()=>online()&&!busy&&!active&&!!selected()&&tokens()>0&&(me()?.diamonds||0)>=selected().price*Number(hours.value);
   const take=button('接取任務',()=>{if(!canTake())return;const m=selected(),h=Number(hours.value),key='mission:'+mission.id+':'+m.id+':'+h;if(armed!==key){armed=key;take.textContent='確認支付 💎'+m.price*h+' ＋令牌 ×1';return;}armed=null;run('/api/merc/hire',{mercId:m.id,hours:h,mode:'mission',missionId:mission.id},'已接取「'+mission.name+'」，由 '+m.name+' 執行。',true);});
   const sync=()=>{armed=null;take.textContent='接取任務';const m=selected(),h=Number(hours.value);if(m){const r=R.missionReward(m.level,h,mission.id);reward.textContent='獎勵：經驗 +'+r.experience.toLocaleString()+'、金幣 +'+r.gold.toLocaleString();cost.textContent='費用：💎 '+m.price*h+' ＋令牌 ×1';}else{reward.textContent='獎勵依傭兵等級與派遣時數計算';cost.textContent='每次消耗傭兵任務令牌 ×1，另付傭兵雇用費';}
    reason.textContent=!online()?'需登入多人伺服器':active?'已有進行中的傭兵合約':!m?(board?'目前沒有可雇用傭兵':'正在載入傭兵'):tokens()<1?'缺少傭兵任務令牌（每日任務全部完成可得）':(me()?.diamonds||0)<m.price*h?'鑽石不足':'可接取｜持有令牌 '+tokens()+' 個';take.disabled=!canTake();merc.disabled=hours.disabled=!online()||busy||active;};
   merc.onchange=hours.onchange=sync;sync();card.append(el('h3','',mission.name),el('p','merc-meta',mission.note),merc,hours,reward,cost,reason,take);grid.append(card);
  }
  body.append(grid);
 }
 function shopView(body){
  const c=me();body.append(el('p','dc-muted','傭兵點數由傭兵公會發放：你的角色登記成傭兵並被雇用就會得到，雇用時間越長點數越多。'));
  const grid=el('div','dc-products merc-grid');
  for(const s of R.shop){const item=itemOf(s.key),card=el('article','dc-product merc-card'),img=el('img','merc-item-icon');img.alt='';if(item?.icon)img.src=item.icon;
   const buy=button('兌換',()=>run('/api/merc/shop',{itemId:s.id},'已兌換 '+(item?.name||s.key)+' × '+s.count+'。'));buy.disabled=busy||(c?.mercPoints||0)<s.cost;
   card.append(img,el('h3','',(item?.name||s.key)+' × '+s.count),el('span','dc-price','⚔ '+s.cost+' 點'),buy);grid.append(card);}
  body.append(grid);
 }
 async function load(){if(!online()||window.gameFlowState!=='playing')return;const token=generation;try{const r=await LocalServerClient.call('/api/merc/board');if(win&&token===generation){board=r.board;mine=r.mine;render();}}catch(e){if(win&&token===generation){notice=e.message;board=[];render();}}}
 async function run(route,data,ok,reload=false){if(busy)return;busy=true;render();try{await LocalServerClient.act(route,data);notice=ok;}catch(e){notice=e.message;}finally{busy=false;}reopen();if(reload||tab===0||tab===4)load();}
 // act() 會重新安裝存檔並重進遊戲，視窗要重新掛回畫面
 function reopen(){if(window.gameFlowState!=='playing'){close();return;}if(!win||!document.body.contains(win)){win=null;open(tab,true);}else render();}
 async function claimReward(){if(busy)return;busy=true;render();try{const r=await LocalServerClient.act('/api/merc/claim',{});const reward=r.reward||{experience:0,gold:0};if(reward.experience&&window.OwnedInventory)OwnedInventory.reward(reward.experience,[]);notice='任務完成：經驗 +'+reward.experience.toLocaleString()+'、金幣 +'+reward.gold.toLocaleString()+'。';window.GameChat?.say('傭兵任務完成，獲得經驗 '+reward.experience.toLocaleString()+'、金幣 '+reward.gold.toLocaleString()+'。','system');}catch(e){notice=e.message;}finally{busy=false;}reopen();}
 function open(startTab=0,keepNotice=false){if(window.gameFlowState!=='playing')return;tab=startTab;if(!keepNotice)notice='';generation++;armed=null;
  if(!win){win=el('section','diamond-commerce mercenary-window');win.setAttribute('role','dialog');win.setAttribute('aria-label','傭兵團');document.querySelector('.game').append(win);}
  render();win.querySelector('.dc-close')?.focus();if(tab<2||tab===4)load();}
 // ---- 跟隨型傭兵：照合約生成／維持／到期離開 ----
 function landing(){for(let i=0;i<40;i++){const r=2+Math.floor(Math.random()*3),a=Math.random()*Math.PI*2,x=Math.round(worldX+Math.cos(a)*r),y=Math.round(worldY+Math.sin(a)*r);if(TeleportScrolls.canLand(x,y)&&!IslandMonsters.occupied(x,y))return [x,y];}return null;}
 function release(text){if(!bot)return;window.NpcSocial?.dismiss(bot);IslandMonsters.removeAlly(bot);bot=null;if(text)window.GameChat?.say(text,'system');}
 // 2026-11-18 使用者：合約到期通知雇主（跳提示＋系統訊息）；每份合約只通知一次（記在瀏覽器），離線期間到期的話下次上線通知
 function notifyExpired(){const k=contract();if(!k?.id||k.until>Date.now()||k.claimed)return;const key='lineage-merc-notified:'+k.id;try{if(localStorage.getItem(key))return;localStorage.setItem(key,'1');}catch{}
  const text=k.mode==='mission'?'傭兵任務完成：'+k.name+' 的「'+(R.missions.find(m=>m.id===k.missionId)?.name||'任務')+'」，請到 傭兵團 → 我的傭兵 領取獎勵。':'傭兵合約到期：'+k.name+' 向你道別後離開了，可以到傭兵團雇用新的傭兵。';
  if(typeof toast==='function')toast(text);window.GameChat?.say(text,'system');}
 function tick(){
  if(win&&(tab===2||tab===4&&contract()?.mode==='mission'))render();
  if(window.gameFlowState==='playing')notifyExpired();
  if(window.gameFlowState!=='playing'||!window.FakePlayers?.hireBot||!window.NpcSocial?.adopt){bot=null;return;}
  const k=contract();
  if(!k||k.mode!=='follow'||k.until<=Date.now()){if(bot&&bot.fp?.merc)release(null);return;}
  if(bot&&(bot.fp?.merc!==k.id||!IslandMonsters.botList.includes(bot)))bot=null;
  if(!bot){bot=IslandMonsters.botList.find(b=>b.fp?.merc===k.id)||null;
   if(!bot){const spot=landing();if(!spot)return;bot=FakePlayers.hireBot(k,spot[0],spot[1]);if(!bot)return;IslandMonsters.playEffect(169,bot.x,bot.y,movementTime());window.GameChat?.say('傭兵 '+k.name+' 報到，接下來 '+fmtTime(k.until-Date.now())+'跟著你行動。','system');}}
  if(bot.fp.hidden||bot.fp.vanish)return;
  if(!NpcSocial.party.includes(bot))NpcSocial.adopt(bot);
 }
 const style=document.createElement('style');style.textContent='.dc-merc-points{color:#f0c674;margin-left:14px}.merc-body{overflow:auto}.merc-grid{grid-template-columns:repeat(3,minmax(0,1fr))}.merc-card{min-height:0;gap:8px}.merc-card h3{margin:0;color:#f3dfa6}.merc-meta{margin:0;color:#cbb88a;font-size:14px}.merc-select,.merc-input{width:100%;min-height:36px;background:#122431;color:#eee1b8;border:1px solid #8a8c6c;box-sizing:border-box}.merc-cost{margin:0;color:#99dffc;font-size:13px}.merc-register{display:flex;flex-direction:column;gap:10px;max-width:520px}.merc-price-row{display:flex;align-items:center;gap:8px;white-space:nowrap}.merc-bar{height:12px;background:#0b1116;border:1px solid #68522e;border-radius:6px;overflow:hidden}.merc-bar span{display:block;height:100%;background:linear-gradient(90deg,#b8862f,#f0c674)}.merc-item-icon{width:40px;height:40px;object-fit:contain;image-rendering:pixelated}@media (max-width:700px){.merc-grid{grid-template-columns:repeat(2,minmax(0,1fr))}.dc-merc-points{margin-left:8px}}';document.head.append(style);
 setInterval(tick,1500);
 document.addEventListener('keydown',e=>{if(e.key==='Escape'&&win){e.preventDefault();close();}});
 return {open,close,tick,get contract(){return contract();}};
})();window.Mercenary=Mercenary;
