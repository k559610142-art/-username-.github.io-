// 玩家擺攤（2026-11-14）：目錄「擺攤」打開。只能在村莊（安全區）擺；從背包選道具（不含穿戴中、金幣、不能丟棄的），自訂數量與單價，最多 8 項，可寫招牌標語。
//  擺攤中：不能移動、不能 AUTO 打怪（scene-renderer.js stepWorld／move、navigation.js navigateTo、island-combat.js begin 會擋），頭上顯示招牌；
//   道具仍在背包，賣出時才用 OwnedInventory.trade(賣) 扣掉並收金幣（被你自己用掉就自動下架）。不存檔，重新整理就收攤。
//  買家是附近 20 格內的假人（data/fake-players.js）：每 6～14 秒有一個假人來看貨，照「你的單價 ÷ 參考價」決定買不買
//   （參考價＝NPC 商店最低價，沒有就用自動販賣價 ×4，再沒有用 100）：比 ≤ 0.8 幾乎必買、1 倍約六成；一次買 1～3 成存量（最多 50 個）。
//   防洗錢（使用者 2026-11-14）：商店買得到的東西開價超過商店價就沒人買；商店沒賣的超過參考價 1.5 倍沒人買（不再有「天價也有 3% 會買」）。
const PlayerStall=(()=>{
 const el=(t,c,x)=>uiElement(t,c,x),MAX=8;
 let active=false,items=[],title='',win=null,nextBuyer=0,sign=null,earned=0;
 const safeHere=()=>(tile(worldX,worldY)&48)===16;
 const gold=()=>OwnedInventory.items.filter(e=>e.key==='etcitem:40308').reduce((n,e)=>n+e.count,0);
 const haveCount=key=>OwnedInventory.items.filter(e=>e.key===key&&!e.slot).reduce((n,e)=>n+e.count,0);
 let refPrices=null;
 const inShop=key=>{ref(key);return refPrices.has(Number(key.split(':')[1]));};
 function ref(key){
  if(!refPrices){refPrices=new Map();for(const rows of [...Object.values((typeof NATIVE_NPC_DIALOGS!=='undefined'?NATIVE_NPC_DIALOGS:null)?.shops||{}),(typeof islandNpcServiceData!=='undefined'?islandNpcServiceData:null)?.shop||[]])for(const [id,,buy,pack,,ench] of rows){if(!(buy>0)||ench)continue;const u=buy/Math.max(1,pack|0);if(!refPrices.has(id)||u<refPrices.get(id))refPrices.set(id,u);}}
  const id=Number(key.split(':')[1]);if(refPrices.has(id))return Math.max(1,Math.round(refPrices.get(id)));
  const sell=(typeof AUTO_SELL_DATA!=='undefined'?AUTO_SELL_DATA:null)?.prices?.[key];return sell>0?sell*4:100;}
 function sellable(){const seen=new Map();for(const e of OwnedInventory.items){if(e.slot||e.key==='etcitem:40308'||!OwnedInventory.canDiscard(e.uid))continue;const r=seen.get(e.key);if(r)r.count+=e.count;else seen.set(e.key,{key:e.key,item:e.item,count:e.count});}return [...seen.values()];}
 // ---- 擺攤中：招牌、不能移動 ----
 function showSign(){sign?.remove();if(!active)return;const box=document.querySelector('#actor .ovh');sign=el('div','ps-sign','【擺攤】'+(title||'歡迎光臨'));(box||document.querySelector('#actor'))?.prepend(sign);}
 function start(){
  if(!safeHere())return toast('只能在村莊（安全區）擺攤。');
  items=items.filter(it=>haveCount(it.key)>0&&it.qty>0&&it.price>0);if(!items.length)return toast('請先放上要賣的道具。');
  if(typeof IslandCombat!=="undefined"&&IslandCombat.mode)IslandCombat.stop();if(typeof cancelNavigation==='function')cancelNavigation();
  active=true;earned=0;nextBuyer=movementTime()+rnd(5000,10000);showSign();render();toast('開始擺攤。');window.GameChat?.say('【擺攤】你在 '+worldX+', '+worldY+' 開始擺攤。','sys');}
 function stop(quiet){if(!active)return;active=false;sign?.remove();sign=null;render();if(!quiet){toast('收攤了'+(earned?'，這次賺了 '+earned.toLocaleString()+' 金幣。':'。'));if(earned)window.GameChat?.say('【擺攤】收攤，這次共賺 '+earned.toLocaleString()+' 金幣。','sys');}}
 const rnd=(a,b)=>a+Math.random()*(b-a),pick=a=>a[Math.floor(Math.random()*a.length)];
 // ---- 假人來買 ----
 function tick(){
  if(!active)return;
  if(window.gameFlowState!=='playing'||CharacterActions.dead||!safeHere()){stop();return;}
  if(!document.querySelector('#actor .ps-sign'))showSign();
  const now=movementTime();if(now<nextBuyer)return;nextBuyer=now+rnd(6000,14000);
  items=items.filter(it=>{it.qty=Math.min(it.qty,haveCount(it.key));return it.qty>0;});if(!items.length){stop();toast('攤位的東西賣完了，自動收攤。');return;}
  const bots=((typeof IslandMonsters!=="undefined"?IslandMonsters.botList:null)||[]).filter(b=>(b.spawn.mapId||0)===(window.activeMapId||0)&&!b.fp?.red&&!b.fp?.stall&&!b.fp?.hidden&&Math.max(Math.abs(b.x-worldX),Math.abs(b.y-worldY))<=20);
  if(!bots.length)return;
  const buyer=pick(bots),it=pick(items),ratio=it.price/ref(it.key),chance=ratio>(inShop(it.key)?1:1.5)?0:Math.max(.05,Math.min(.95,1.2-ratio*.6));
  if(Math.random()>=chance){if(Math.random()<.25)window.FakePlayers&&say(buyer,pick(['太貴了吧','便宜一點啦','看看而已','老闆算便宜點']));return;}
  const n=Math.max(1,Math.min(it.qty,Math.ceil(it.qty*rnd(.1,.3)),Math.round(rnd(5,50)))),/* 一次最多買 50 個 */total=it.price*n,name=it.item.name;
  const err=OwnedInventory.trade(it.key,n,total,true);if(err){toast('擺攤交易失敗：'+err);return;}
  it.qty-=n;earned+=total;if(it.qty<=0)items.splice(items.indexOf(it),1);
  say(buyer,pick(['老闆 我買了','謝啦','剛好缺這個','買了買了']));
  window.GameChat?.say('【擺攤】'+buyer.spawn.npc.name+' 向你買了 '+name+' ×'+n+'，獲得 '+total.toLocaleString()+' 金幣。','drop');
  render();if(!items.length){stop();toast('攤位的東西賣完了，自動收攤。');}}
 function say(bot,text){bot.bubble={text,until:movementTime()+4000};window.GameChat?.say(bot.spawn.npc.name+'：'+text,'say');}
 setInterval(tick,1000);
 // ---- 視窗 ----
 const css=document.createElement('style');css.textContent=`
 .ps-win{position:absolute;left:50%;top:50%;transform:translate(-50%,-50%);width:min(420px,94%);max-height:88%;display:flex;flex-direction:column;box-sizing:border-box;padding:8px 10px 10px;pointer-events:auto;color:#e8dcc0;
  background:linear-gradient(#1b1d21,#121417);border:1px solid #6e5a33;border-radius:10px;box-shadow:inset 0 0 0 1px #000,0 10px 30px #000c}
 .ps-head{flex:none;display:flex;align-items:center;justify-content:center;position:relative;height:30px}
 .ps-head h2{margin:0;font-size:17px;letter-spacing:3px;color:#f0cf7c}
 .ps-head button{position:absolute;right:0;top:2px;width:26px;height:24px;min-height:0!important;padding:0!important;background:linear-gradient(#4a3d26,#2a2216)!important;border:1px solid #9b8150!important;border-radius:4px;color:#f0dcae!important}
 .ps-body{flex:1;min-height:0;overflow:auto;scrollbar-width:thin;scrollbar-color:#7a6740 #121416}
 .ps-sub{margin:8px 2px 4px;font-size:12px;color:#a08a5c}
 .ps-row{display:flex;align-items:center;gap:6px;padding:5px 6px;margin-bottom:4px;background:#0e0f11;border:1px solid #2e2c28;border-radius:6px;font-size:13px}
 .ps-row img{width:28px;height:28px;object-fit:contain;image-rendering:pixelated;flex:none}
 .ps-row .nm{flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
 .ps-row input{width:62px;height:26px;min-height:0!important;padding:0 4px!important;font-size:12px;background:#17191c!important;border:1px solid #4a4336!important;border-radius:4px;color:#e6dcc2!important}
 .ps-row button,.ps-actions button{min-height:0!important;height:28px;padding:0 10px!important;font-size:12px!important;background:linear-gradient(#5e4c2a,#3b2f1b)!important;color:#ffe2a0!important;border:1px solid #a3864d!important;border-radius:5px!important}
 .ps-row small{color:#8d8470;font-size:11px}
 .ps-title{width:100%;box-sizing:border-box;height:30px;padding:0 8px!important;margin-bottom:6px;font-size:13px;background:#0e0f11!important;border:1px solid #3d3a33!important;border-radius:6px;color:#e6dcc2!important}
 .ps-actions{flex:none;display:flex;gap:8px;margin-top:8px}.ps-actions button{flex:1;height:34px;font-size:14px!important}
 .ps-msg{flex:none;margin-top:6px;text-align:center;font-size:12px;color:#c9bd9c;min-height:16px}
 .ps-sign{display:inline-block;margin:0 auto 2px;padding:1px 8px;font:12px sans-serif;color:#2a1c06;background:linear-gradient(#ffe7a6,#e2b450);border:1px solid #7a5a1a;border-radius:4px;box-shadow:0 1px 3px #000a;white-space:nowrap}`;document.head.append(css);
 let msg=null,body=null;
 function render(){if(!win)return;body.replaceChildren();
  if(active){body.append(el('div','ps-sub','擺攤中：'+(title||'歡迎光臨')+'（這次已賺 '+earned.toLocaleString()+' 金幣）'));
   for(const it of items){const r=el('div','ps-row');r.append(itemIcon(it.item),el('span','nm',it.item.name),el('small','','×'+it.qty+' · 單價 '+it.price.toLocaleString()));body.append(r);}
   if(!items.length)body.append(el('div','ps-sub','（全部賣完了）'));}
  else{
   const t=el('input','ps-title');t.maxLength=16;t.placeholder='招牌標語（例：便宜賣紅水）';t.value=title;t.oninput=()=>{title=t.value.trim();};body.append(t);
   body.append(el('div','ps-sub','攤位（最多 '+MAX+' 項，單價自己訂，越接近商店價越好賣）'));
   for(const it of items){const r=el('div','ps-row'),q=el('input'),p=el('input'),del=el('button','','取下');q.type=p.type='number';q.min='1';p.min='1';q.value=String(it.qty);p.value=String(it.price);q.title='數量';p.title='單價';
    q.onchange=()=>{it.qty=Math.max(1,Math.min(haveCount(it.key),Math.floor(Number(q.value)||1)));q.value=String(it.qty);};p.onchange=()=>{it.price=Math.max(1,Math.min(99999999,Math.floor(Number(p.value)||1)));p.value=String(it.price);};
    del.type='button';del.onclick=()=>{items.splice(items.indexOf(it),1);render();};
    r.append(itemIcon(it.item),el('span','nm',it.item.name),el('small','','數量'),q,el('small','','單價'),p,del);body.append(r);}
   if(!items.length)body.append(el('div','ps-sub','（還沒放東西）'));
   body.append(el('div','ps-sub','背包（點「放上」加到攤位，參考價＝商店價）'));
   for(const s of sellable().filter(s=>!items.some(i=>i.key===s.key))){const r=el('div','ps-row'),add=el('button','','放上');add.type='button';
    add.onclick=()=>{if(items.length>=MAX){msg.textContent='攤位最多 '+MAX+' 項。';return;}items.push({key:s.key,item:s.item,qty:s.count,price:ref(s.key)});render();};
    r.append(itemIcon(s.item),el('span','nm',s.item.name),el('small','','×'+s.count+' · 參考 '+ref(s.key).toLocaleString()),add);body.append(r);}
  }
  actions.replaceChildren();const b=el('button','',active?'收攤':'開始擺攤');b.type='button';b.onclick=()=>active?stop():start();actions.append(b);
  msg.textContent=active?'擺攤中不能移動；附近的玩家會來買。':safeHere()?'目前金幣 '+gold().toLocaleString():'要在村莊（安全區）才能擺攤。';}
 let actions=null;
 function open(){if(window.gameFlowState!=='playing')return false;if(win){win.style.zIndex=String(FloatingWindows.frontLevel());render();return true;}
  win=el('section','ps-win');win.setAttribute('role','dialog');win.setAttribute('aria-label','擺攤');win.style.zIndex=String(FloatingWindows.frontLevel());
  const h=el('div','ps-head'),x=el('button','','✕');x.type='button';x.setAttribute('aria-label','關閉擺攤');x.onclick=close;h.append(el('h2','','擺攤'),x);
  body=el('div','ps-body');actions=el('div','ps-actions');msg=el('div','ps-msg');win.append(h,body,actions,msg);game.append(win);render();return true;}
 function close(){win?.remove();win=null;}
 addEventListener('keydown',e=>{if(e.key==='Escape'&&win)close();});
 return {open,close,start,stop,tick,browseNow(){nextBuyer=0;tick();},get active(){return active;},get items(){return items;},get earned(){return earned;}};
})();window.PlayerStall=PlayerStall;
