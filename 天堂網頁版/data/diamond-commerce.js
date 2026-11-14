// 鑽石商城與扭蛋框架；價格與正式獎池由營運設定後才開放。
const DiamondCommerce=(()=>{
 const el=(tag,cls,text)=>{const n=document.createElement(tag);n.className=cls||'';if(text!==undefined)n.textContent=text;return n;};
 const button=(text,fn)=>{const b=el('button','dc-button',text);b.type='button';b.onclick=fn;return b;};
 const names={mall:'商城',gacha:'時裝扭蛋',exchange:'交易所'};
 const shopTabs=['鑽石商店','試煉商店','AI 會員'];
 const gachaTabs=['龍脈星晶','扭蛋機','一番賞','我的時裝','髮型','寵物'];
 let win=null,mode='mall',tab=0,notice='',market=null,busy=false,generation=0;
 const level=()=>Number(window.activeCharacterLevel)||1;
 const balance=()=>window.GameEntry?.characters.find(c=>c?.id===window.activeCharacterId)?.diamonds||0;
 function close(){generation++;win?.remove();win=null;}
 function icon(file,cls=''){const img=el('img',cls);img.src='assets/interface/reference-skin/'+file+'.png';img.alt='';return img;}
 function render(){
  if(!win)return;win.replaceChildren();const head=el('div','dc-heading');head.append(el('strong','',''+names[mode]),el('span','dc-wallet','💎 鑽石 '+balance().toLocaleString()));const x=button('✕',close);x.className='dc-close';x.setAttribute('aria-label','關閉'+names[mode]);head.append(x);win.append(head);
  const nav=el('nav','dc-main-tabs');nav.setAttribute('aria-label','鑽石功能');for(const [key,label]of Object.entries(names)){const b=button(label,()=>open(key));b.classList.toggle('selected',key===mode);nav.append(b);}win.append(nav);
  const body=el('div','dc-body');win.append(body);
  if(mode==='exchange')exchange(body);else{
   const tabs=el('nav','dc-tabs');for(const [i,label]of (mode==='mall'?shopTabs:gachaTabs).entries()){const b=button(label,()=>{tab=i;notice='';render();});b.classList.toggle('selected',i===tab);tabs.append(b);}body.append(tabs);
   if(mode==='mall')shop(body);else gacha(body);
  }
  const status=el('p','dc-notice',notice);status.setAttribute('role','status');win.append(status);
 }
 function shop(body){
  if(tab){body.append(el('div','dc-empty',shopTabs[tab]+'商品準備中｜使用貨幣：鑽石'));return;}
  const layout=el('div','dc-shop-layout'),aside=el('aside','dc-recommend');aside.append(el('h3','','推薦商品'),icon('shop'),el('p','','精選商品即將上架'),el('span','dc-price','💎 鑽石'));layout.append(aside);
  const grid=el('div','dc-products');for(const [name,file]of [['成長補給禮包','bag'],['變身禮包','transform'],['冒險卷軸禮包','memory'],['龍脈星晶','doll'],['強化補給禮包','craft.svg'],['會員禮包','character']]){
   const card=el('article','dc-product');card.append(file.includes('.')?el('span','dc-art','✦'):icon(file),el('h3','',name),el('span','dc-price','💎 價格待設定'));const b=button('尚未上架',()=>{});b.disabled=true;card.append(b);grid.append(card);
  }layout.append(grid);body.append(layout);
 }
 function gacha(body){
  if(tab>=3){body.append(el('div','dc-empty',gachaTabs[tab]+'收藏尚無資料'));return;}
  const box=el('div','dc-gacha'),art=el('div','dc-crystal','✦'),detail=el('div','dc-gacha-detail');art.setAttribute('aria-hidden','true');detail.append(el('h2','',gachaTabs[tab]),el('p','','凝聚龍脈星光的水晶，召喚時裝、髮型、寵物與稀有道具。'),el('p','dc-muted','獎池、各獎項機率與保底規則待設定；正式開放前不會扣除鑽石。'));
  const rates=button('查看獎池與機率',()=>{notice='目前尚未設定正式獎池與機率。';render();});detail.append(rates);const actions=el('div','dc-draw-actions');for(const count of [1,10]){const b=button('召喚 '+count+' 次（鑽石價格待設定）',()=>{});b.disabled=true;actions.append(b);}detail.append(actions);box.append(art,detail);body.append(box);
 }
 function exchange(body){
  if(level()<30){body.append(el('div','dc-empty','🔒 交易所於 30 等開放｜目前 '+level()+' 等'));return;}
  body.append(el('p','dc-muted','使用鑽石交易 · 商品上架 24 小時'));
  if(!window.LocalServerClient?.online){body.append(el('div','dc-empty','請登入本機多人伺服器使用交易所。'));return;}
  const tabs=el('nav','dc-tabs');for(const [i,label]of ['購買商品','我的上架','上架商品'].entries()){const b=button(label,()=>{tab=i;notice='';render();});b.classList.toggle('selected',tab===i);tabs.append(b);}body.append(tabs);
  if(tab===2){
   const form=el('form','dc-list-form'),select=el('select');select.setAttribute('aria-label','上架道具');for(const item of OwnedInventory.items.filter(e=>!e.slot&&e.key!=='etcitem:40308'&&OwnedInventory.canDiscard(e.uid))){const o=el('option','',item.item.name+' × '+item.count);o.value=item.uid;select.append(o);}const qty=el('input'),price=el('input');for(const [input,label]of [[qty,'上架數量'],[price,'總售價（鑽石）']]){input.type='number';input.min='1';input.max='2147483647';input.step='1';input.value='1';input.setAttribute('aria-label',label);const wrap=el('label','',label);wrap.append(input);form.append(wrap);}form.prepend(select);const submit=button(busy?'處理中…':'確認上架',()=>{});submit.type='submit';submit.disabled=busy||!select.options.length;form.append(submit);form.onsubmit=e=>{e.preventDefault();const count=Number(qty.value),amount=Number(price.value);if(!Number.isSafeInteger(count)||count<1||!Number.isSafeInteger(amount)||amount<1){notice='請輸入正整數數量與鑽石售價。';render();return;}if(confirm('上架 '+count+' 個道具，總售價 '+amount+' 鑽石？'))act('/api/auction/list',{itemUid:select.value,count,price:amount});};body.append(form);return;
  }
  const grid=el('div','dc-products dc-market-products');const rows=(market?.auctions||[]).filter(a=>tab===1?a.character_id===window.activeCharacterId:a.currency==='diamond'&&a.expires>Date.now());
  if(!market){body.append(el('p','','讀取商品中…'));return;}if(!rows.length)grid.append(el('div','dc-empty','目前沒有上架商品。'));
  for(const a of rows){const item=INTERFACE_CATALOG.items.find(i=>i.kind+':'+i.id===a.item.key),card=el('article','dc-product');card.append(icon('bag'),el('h3','',(item?.name||a.item.key)+' × '+a.item.count),el('span','dc-price',a.currency==='diamond'?'💎 '+a.price.toLocaleString():'舊版天幣商品｜請下架重售'));const own=a.character_id===window.activeCharacterId,b=button(own?'下架':busy?'處理中…':'購買',()=>{if(confirm(own?'下架並由郵件取回商品？':'花費 '+a.price+' 鑽石購買此商品？'))act(own?'/api/auction/cancel':'/api/auction/buy',{auctionId:a.id});});b.disabled=busy||!own&&a.price>balance();card.append(b);grid.append(card);}body.append(grid);
 }
 async function load(){const token=generation;try{const result=await LocalServerClient.market();if(win&&token===generation){market=result;render();}}catch(e){if(win&&token===generation){notice=e.message;market={auctions:[]};render();}}}
 async function act(route,data){if(busy||level()<30)return;busy=true;render();try{await LocalServerClient.act(route,data);notice='操作完成。';await load();}catch(e){notice=e.message;}finally{busy=false;render();}}
 function open(type='mall'){if(window.gameFlowState!=='playing')return;mode=Object.hasOwn(names,type)?type:'mall';tab=0;notice='';generation++;if(!win){win=el('section','diamond-commerce');win.setAttribute('role','dialog');win.setAttribute('aria-label','鑽石商城、扭蛋與交易所');document.querySelector('.game').append(win);}render();if(mode==='exchange'&&level()>=30&&window.LocalServerClient?.online){market=null;render();load();}win.querySelector('.dc-close').focus();}
 document.addEventListener('keydown',e=>{if(e.key==='Escape'&&win){e.preventDefault();close();}});
 return {open,close,get balance(){return balance();}};
})();window.DiamondCommerce=DiamondCommerce;
