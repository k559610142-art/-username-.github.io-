// 製作工匠視窗（2026-11-14）：目錄「製作」打開。配方來自 DB system_item_blend（DBGameRules.rows），
// 只列出成品和所有材料都在道具目錄（INTERFACE_CATALOG）裡的配方（其餘是伺服器自訂道具，遊戲裡沒有）。
// 分頁：全部／可製作／武器／防具／飾品／材料／寵物／道具／煉金；搜尋成品、材料、NPC 名稱。
// 隨時隨地都能製作（DBGameRules.craft(npcId,id,true)，使用者決定），材料、等級、職業、成功率照原配方。
const CraftingWindow=(()=>{
 const el=(t,c,x)=>uiElement(t,c,x);
 const byId=new Map(INTERFACE_CATALOG.items.map(i=>[i.id,i]));
 const split=v=>String(v??'').split(',').filter(Boolean).map(Number);
 const roleCode={'王族':0,'騎士':1,'法師':2,'妖精':3};
 const TABS=[['all','全部'],['can','可製作'],['weapon','武器'],['armor','防具'],['acc','飾品'],['material','材料'],['pet','寵物'],['item','道具'],['alchemy','煉金']];
 const ACC=new Set(['ring','amulet','earring','belt','necklace']);
 function category(item){
  if(/項圈|寵物|哨子/.test(item.name))return 'pet';
  if(item.kind==='weapon')return 'weapon';
  if(item.kind==='armor')return ACC.has(item.type)?'acc':'armor';
  if(item.type==='material')return 'material';
  if(item.type==='potion'||/藥水|靈藥|煉金/.test(item.name))return 'alchemy';
  return 'item';
 }
 let recipes=null;
 function load(){if(recipes)return recipes;recipes=[];
  for(const r of DBGameRules.craftRecipes()){const item=byId.get(r.new_item),mats=split(r.materials);
   if(!item||!mats.length||mats.some(id=>!byId.has(id)))continue;
   recipes.push({r,item,cat:category(item),mats:mats.map((id,i)=>({item:byId.get(id),count:split(r.materials_count)[i]||1,enchant:split(r.materials_enchants)[i]||0})),
    text:(item.name+' '+r.note+' '+String(r.npcname).replace(/\^/g,' ')+' '+mats.map(id=>byId.get(id).name).join(' ')).toLowerCase()});}
  return recipes;}
 const have=(m)=>OwnedInventory.items.filter(e=>!e.slot&&e.item.id===m.item.id&&(!m.enchant||(e.enchant||0)===m.enchant)).reduce((n,e)=>n+e.count,0);
 const fits=x=>!(x.r.checkLevel>(window.activeCharacterLevel||1))&&!(x.r.checkClass&&x.r.checkClass!==roleCode[job]);
 const craftable=x=>fits(x)&&hp>x.r.hpConsume&&mp>=x.r.mpConsume&&x.mats.every(m=>have(m)>=m.count);
 // 很多成品是伺服器自訂道具、遊戲裡沒有背包圖：改顯示類別徽章（不是只有一個字）
 const BADGE={weapon:'⚔',armor:'🛡',acc:'💍',material:'◆',pet:'🐾',item:'📦',alchemy:'⚗'};
 function pic(item,cat,cls){const box=el('span',cls||'pic');if(item.icon)box.append(itemIcon(item));else{box.classList.add('badge');box.append(el('b','',BADGE[cat]||'◇'));}return box;}
 const npcName=x=>String(x.r.npcname||'').replace(/\^/g,' ');

 const css=document.createElement('style');css.textContent=`
 .craft-window{position:absolute;left:50%;top:50%;transform:translate(-50%,-50%);width:min(460px,94%);height:min(620px,90%);display:flex;flex-direction:column;box-sizing:border-box;padding:8px 10px 10px;pointer-events:auto;color:#e8dcc0;
  background:linear-gradient(#1b1d21,#121417);border:1px solid #6e5a33;box-shadow:inset 0 0 0 1px #000,0 0 0 1px #2a2418,0 10px 30px #000c;border-radius:10px}
 .craft-window .craft-head{flex:none;display:flex;align-items:center;justify-content:center;position:relative;height:30px}
 .craft-window .craft-head h2{margin:0;font-size:17px;letter-spacing:3px;color:#f0cf7c;text-shadow:0 1px 2px #000}
 .craft-window .craft-head button{position:absolute;right:0;top:2px;width:26px;height:24px;min-height:0!important;padding:0!important;font-size:13px;background:linear-gradient(#4a3d26,#2a2216)!important;border:1px solid #9b8150!important;border-radius:4px;color:#f0dcae!important}
 .craft-tabs{flex:none;display:grid;grid-template-columns:repeat(auto-fill,minmax(62px,1fr));gap:5px;margin:8px 0 6px}
 .craft-tabs button{min-height:0!important;height:30px;padding:0!important;font-size:13px!important;background:linear-gradient(#24262a,#1a1b1e)!important;color:#cbbd9c!important;border:1px solid #3d3a33!important;border-radius:6px!important}
 .craft-tabs button[aria-selected=true]{background:linear-gradient(#5a4726,#3a2e19)!important;color:#ffe2a0!important;border-color:#b08d4c!important}
 .craft-search{flex:none;height:32px;box-sizing:border-box;margin-bottom:8px;padding:0 10px!important;font-size:13px;background:#0e0f11!important;border:1px solid #3d3a33!important;border-radius:6px;color:#e6dcc2!important}
 .craft-grid{flex:1;min-height:0;overflow-y:auto;overflow-x:hidden;display:grid;grid-template-columns:repeat(auto-fill,minmax(84px,1fr));grid-auto-rows:98px;gap:7px;align-content:start;padding-top:6px;border-top:1px solid #2c2a25;scrollbar-width:thin;scrollbar-color:#7a6740 #121416}
 .craft-card{position:relative;display:flex!important;flex-direction:column;align-items:center;justify-content:flex-start;gap:4px;height:98px!important;min-height:0!important;max-height:none!important;width:auto!important;box-sizing:border-box;padding:8px 4px 6px!important;background:linear-gradient(#1d1e21,#151618)!important;border:1px solid #34312b!important;border-radius:8px!important;color:#e8dcc0!important}
 .craft-card.ok{border-color:#4f7a3a!important;background:linear-gradient(#1f2a1c,#151a14)!important}
 .craft-card .pic{width:44px;height:44px;display:flex;align-items:center;justify-content:center;background:#0b0c0d;border:1px solid #3a362e;border-radius:6px}
 .craft-card .pic img{max-width:38px;max-height:38px;image-rendering:pixelated}
 .craft-card .nm{font-size:12px;line-height:1.25;text-align:center;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden;word-break:break-all}
 .craft-card.ok::after{content:'';position:absolute;right:6px;top:6px;width:8px;height:8px;border-radius:50%;background:#4ee36a;box-shadow:0 0 5px #4ee36a}
 .craft-card .pic.badge,.craft-detail .pic.badge{background:radial-gradient(circle at 50% 40%,#3a3022,#141210)}
 .pic.badge b,.mini b{font-size:22px;filter:sepia(.6) saturate(1.4);opacity:.85}
 .craft-mat .mini{width:28px;height:28px;display:flex;align-items:center;justify-content:center}.craft-mat .mini b{font-size:16px}
 .craft-empty{grid-column:1/-1;text-align:center;color:#857d6a;font-size:12px;padding:20px 0}
 .craft-detail{flex:1;min-height:0;overflow:auto;padding-top:6px;border-top:1px solid #2c2a25}
 .craft-detail .top{display:flex;gap:10px;align-items:center;margin-bottom:8px}
 .craft-detail .top .pic{width:56px;height:56px;display:flex;align-items:center;justify-content:center;background:#0b0c0d;border:1px solid #6e5a33;border-radius:8px}
 .craft-detail .top .pic img{max-width:48px;max-height:48px;image-rendering:pixelated}
 .craft-detail h3{margin:0 0 3px;font-size:15px;color:#f0cf7c}
 .craft-detail small{color:#9d9583;font-size:12px;line-height:1.5}
 .craft-mats{display:grid;gap:5px;margin:8px 0}
 .craft-mat{display:flex;align-items:center;gap:8px;padding:5px 8px;background:#0e0f11;border:1px solid #2e2c28;border-radius:6px;font-size:13px}
 .craft-mat img{width:28px;height:28px;object-fit:contain;image-rendering:pixelated}
 .craft-mat .n{margin-left:auto;font-variant-numeric:tabular-nums}
 .craft-mat .n.short{color:#ff7a6a}.craft-mat .n.enough{color:#8fe08a}
 .craft-actions{display:flex;gap:8px;margin-top:8px}
 .craft-actions button{flex:1;height:34px;min-height:0!important;font-size:14px!important;border-radius:6px!important;background:linear-gradient(#5e4c2a,#3b2f1b)!important;color:#ffe2a0!important;border:1px solid #a3864d!important}
 .craft-actions button:disabled{opacity:.45}
 .craft-actions .back{flex:0 0 80px;background:linear-gradient(#2a2b2e,#1e1f22)!important;color:#cbbd9c!important;border-color:#3d3a33!important}
 .craft-result{margin-top:8px;text-align:center;font-size:13px;color:#f0dcae;min-height:18px}`;document.head.append(css);

 let win=null,tab='all',query='',body=null,tabsBox=null,search=null,current=null;
 function card(x){const b=el('button','craft-card'+(craftable(x)?' ok':''));b.type='button';b.append(pic(x.item,x.cat),el('span','nm',x.r.note||x.item.name));b.title=x.item.name+' · '+npcName(x);b.onclick=()=>{current=x;render();};return b;}
 function list(){const q=query.trim().toLowerCase(),out=load().filter(x=>(tab==='all'||(tab==='can'?craftable(x):x.cat===tab))&&(!q||x.text.includes(q)));
  out.sort((a,b)=>(craftable(b)-craftable(a))||(!!b.item.icon-!!a.item.icon)||(fits(b)-fits(a)));
  const grid=el('div','craft-grid');for(const x of out.slice(0,300))grid.append(card(x));
  if(!out.length)grid.append(el('div','craft-empty',tab==='can'?'目前材料不夠做任何東西。':'沒有符合的配方。'));
  else if(out.length>300)grid.append(el('div','craft-empty','只顯示前 300 筆，請用搜尋縮小範圍。'));return grid;}
 function detail(x){const d=el('div','craft-detail'),top=el('div','top'),info=el('div');
  const r=x.r,cnt=r.new_item_counts>1?' ×'+r.new_item_counts:'',enc=r.new_item_Enchantlvl?'+'+r.new_item_Enchantlvl+' ':'';
  info.append(el('h3','',enc+(r.note||x.item.name)+cnt),el('small','','製作 NPC：'+npcName(x)+' · 成功率 '+r.rnd+'%'+(r.checkLevel?' · 需要等級 '+r.checkLevel:'')+(r.hpConsume?' · 消耗體力 '+r.hpConsume:'')+(r.mpConsume?' · 消耗魔力 '+r.mpConsume:'')));top.append(pic(x.item,x.cat),info);
  const mats=el('div','craft-mats');for(const m of x.mats){const row=el('div','craft-mat'),n=have(m);row.append(m.item.icon?itemIcon(m.item):pic(m.item,category(m.item),'mini'),el('span','',(m.enchant?'+'+m.enchant+' ':'')+m.item.name),el('span','n '+(n>=m.count?'enough':'short'),n.toLocaleString()+' / '+m.count.toLocaleString()));mats.append(row);}
  const actions=el('div','craft-actions'),back=el('button','back','返回'),make=el('button','','製作'),result=el('div','craft-result');back.type=make.type='button';
  back.onclick=()=>{current=null;render();};
  const why=!fits(x)?'職業或等級不符合條件。':!craftable(x)?'材料不足。':'';make.disabled=!!why;result.textContent=why;
  make.onclick=()=>{const msg=DBGameRules.craft(r.npcid,r.id,true);current=x;render();body.querySelector('.craft-result').textContent=msg;};
  actions.append(back,make);d.append(top,el('small','','材料（身上數量 / 需要數量）'),mats,actions,result);return d;}
 function render(){if(!win)return;for(const b of tabsBox.children)b.setAttribute('aria-selected',String(b.dataset.tab===tab));const y=body.firstChild?.scrollTop||0;body.replaceChildren(current?detail(current):list());if(!current&&body.firstChild)body.firstChild.scrollTop=y;}
 function open(){if(window.gameFlowState!=='playing')return false;if(win){win.style.zIndex=String(FloatingWindows.frontLevel());return true;}
  win=el('section','craft-window');win.setAttribute('role','dialog');win.setAttribute('aria-label','製作工匠');win.style.zIndex=String(FloatingWindows.frontLevel());
  const h=el('div','craft-head'),x=el('button','','✕');x.type='button';x.setAttribute('aria-label','關閉製作');x.onclick=close;h.append(el('h2','','製作工匠'),x);
  tabsBox=el('div','craft-tabs');for(const [k,l] of TABS){const b=el('button','',l);b.type='button';b.dataset.tab=k;b.onclick=()=>{tab=k;current=null;render();};tabsBox.append(b);}
  search=el('input','craft-search');search.type='search';search.placeholder='搜尋道具、材料、NPC';search.value=query;search.oninput=()=>{query=search.value;current=null;render();};
  body=el('div');body.style.cssText='flex:1;min-height:0;display:flex;flex-direction:column';win.append(h,tabsBox,search,body);game.append(win);render();return true;}
 function close(){win?.remove();win=null;current=null;}
 addEventListener('keydown',e=>{if(e.key==='Escape'&&win)close();});
 return {open,close,get count(){return load().length;}};
})();window.CraftingWindow=CraftingWindow;
