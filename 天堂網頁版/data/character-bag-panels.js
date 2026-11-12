// 角色視窗＋背包：照網頁奇岩城的畫面排版重寫（只對照截圖的位置與分頁，程式與樣式為本專案自寫）。
//  角色（status）：能力／隊伍／血盟／好友 分頁；能力 = 六項能力 3×2、等級經驗體力魔力防禦魔防正義、負重飽食條、戰鬥數值
//  背包（bag）：全部(數量)／武器／防具／道具／裝備欄 分頁；負重條＋格數＋防禦；4 欄大格；底部工具鈕
//  裝備欄（equipment 也開這裡）：名字等級職業、HP／MP 條、左右兩排裝備格夾著人物、下方戒指與 3×3 數值
(()=>{
 const css=document.createElement('style');css.textContent=`
 .reference-game .classic-window.qy-win{display:flex!important;flex-direction:column;padding:0 7px 7px!important;border:0!important;border-image:none!important;border-radius:3px;
  background:linear-gradient(90deg,#6e5a33 0,#c9a85e 2px,#3b3020 4px,transparent 5px,transparent calc(100% - 5px),#3b3020 calc(100% - 4px),#c9a85e calc(100% - 2px),#6e5a33 100%),linear-gradient(#17191c,#121416)!important;
  box-shadow:0 0 0 1px #000,0 8px 24px #000b!important;overflow:hidden!important;color:#d8cfb8;font-size:12px;container-type:inline-size}
 .reference-game .qy-win>.classic-window-header{position:relative!important;display:flex;align-items:center;justify-content:center;height:30px!important;min-height:30px!important;margin:0 -7px!important;padding:0!important;
  background:linear-gradient(#2c2a26,#1b1a18)!important;border-bottom:1px solid #5b4b2c;box-shadow:inset 0 1px 0 #6b5a36}
 .reference-game .qy-win>.classic-window-header h2{position:static;width:auto;height:auto;clip:auto;margin:0;font-size:15px;letter-spacing:6px;color:#efd9a4;text-shadow:0 1px 2px #000}
 .reference-game .qy-win>.classic-window-header .classic-close{position:absolute!important;right:5px;top:4px;width:34px!important;height:21px!important;min-height:0!important;padding:0!important;font-size:0!important;
  background:linear-gradient(#4a3d26,#2a2216)!important;border:1px solid #9b8150!important;border-radius:2px;color:#f0dcae!important;opacity:1}
 .reference-game .qy-win>.classic-window-header .classic-close::after{content:'關閉';font-size:11px}
 .qy-tabs{display:flex;gap:2px;margin:6px 0 0;flex:none}
 .qy-tabs button{flex:1;min-width:0;min-height:24px!important;padding:2px 0!important;font-size:12px!important;white-space:nowrap;overflow:hidden;
  background:linear-gradient(#2a2b2e,#1e1f22)!important;color:#9d9583!important;border:1px solid #3c3a35!important;border-radius:2px!important}
 .qy-tabs button[aria-selected=true]{background:linear-gradient(#5e4c2a,#3b2f1b)!important;color:#ffe2a0!important;border-color:#a3864d!important}
 .qy-tabs sup{font-size:9px;color:#d9c48f;margin-left:2px}
 .qy-body{flex:1;min-height:0;overflow:auto;margin-top:6px;scrollbar-width:thin;scrollbar-color:#7a6740 #121416}
 .qy-box{background:#0d0f11;border:1px solid #2e2c28;border-radius:2px;padding:4px 6px;margin-bottom:5px}
 .qy-stats{display:grid;grid-template-columns:1fr 1fr;gap:3px;padding:3px}
 .qy-stat{display:flex;justify-content:space-between;align-items:center;padding:3px 8px;background:#1a1c1f;border:1px solid #2c2b27;border-radius:2px;color:#b7ad95}
 .qy-stat b{font-size:13px;font-variant-numeric:tabular-nums}
 .qy-stat.str b{color:#ff6a50}.qy-stat.dex b{color:#69d86a}.qy-stat.con b{color:#f0a64a}.qy-stat.int b{color:#7aaaff}.qy-stat.wis b{color:#b98cff}.qy-stat.cha b{color:#ff86c4}
 .qy-row{display:flex;justify-content:space-between;align-items:center;padding:3px 4px;font-variant-numeric:tabular-nums}
 .qy-row span{color:#9d9583}.qy-row b{color:#efe6cf;font-weight:normal}
 .qy-meter{position:relative;height:6px;margin:1px 4px 4px;background:#2b2720;border:1px solid #1a1814;overflow:hidden}
 .qy-meter i{position:absolute;inset:0 auto 0 0;background:linear-gradient(#e9c06a,#a77a2a)}
 .qy-empty{padding:30px 8px;text-align:center;color:#857d6a;line-height:1.8}
 /* 背包 */
 .qy-bag-info{display:flex;align-items:center;gap:6px;margin-top:5px;flex:none;font-size:11px;color:#9d9583;white-space:nowrap}
 .qy-bag-info .w{flex:1 1 50px;min-width:0;overflow:hidden}.qy-bag-info>span{flex:none}.qy-bag-info{font-size:10.5px;gap:4px}.qy-bag-info .cap{padding:0 5px}.qy-bag-info .w .qy-meter{margin:2px 0 0}
 .qy-bag-info b{color:#efe6cf;font-weight:normal}
 .qy-bag-info .cap{padding:1px 6px;background:#0d0f11;border:1px solid #2e2c28;border-radius:9px}
 .qy-win.qy-bag .classic-grid-scroll{flex:1;min-height:90px;max-height:none!important;margin:5px 0 0!important;padding:4px!important;overflow:auto!important;background:#0d0f11!important;border:1px solid #2e2c28!important;scrollbar-width:thin;scrollbar-color:#7a6740 #121416}
 .qy-win.qy-bag .classic-item-grid{display:grid!important;grid-template-columns:repeat(4,1fr)!important;grid-auto-rows:auto!important;gap:4px!important;width:auto!important;height:auto!important;padding:0!important}
 .qy-win.qy-bag .classic-item-grid .item-slot{position:relative;width:auto!important;height:auto!important;min-width:0!important;min-height:0!important;aspect-ratio:1!important;margin:0!important;padding:4px!important;
  background:radial-gradient(#25272b,#17181b)!important;border:1px solid #34322d!important;border-radius:3px;box-shadow:inset 0 0 6px #000!important;box-sizing:border-box}
 .qy-win.qy-bag .classic-item-grid .item-slot img{width:100%!important;height:100%!important;object-fit:contain}
 .qy-win.qy-bag .classic-item-grid .item-slot.empty{background:#141518!important;border-color:#23221f!important}
 .qy-win.qy-bag .classic-item-grid .item-slot:not(.empty):hover,.qy-win.qy-bag .classic-item-grid .item-slot[aria-pressed=true]{border-color:#d7b464!important}
 .qy-win.qy-bag .inventory-count{position:absolute;right:3px;bottom:1px;font-size:11px;color:#fff;text-shadow:0 0 2px #000,1px 1px 0 #000}
 .qy-win.qy-bag .equipped-mark{position:absolute;left:2px;top:1px;font-size:9px;padding:0 3px;background:#2f6bd0;color:#fff;border-radius:2px}
 .qy-win.qy-bag .missing-item-icon{display:flex;align-items:center;justify-content:center;width:100%;height:100%;font-size:14px;color:#c9b98e}
 .qy-win.qy-bag .classic-pager{display:none!important}
 .qy-bag-foot{display:flex;align-items:center;gap:4px;margin-top:5px;flex:none}
 .qy-win.qy-bag .qy-bag-foot>.classic-filter{flex:1 1 0!important;min-width:0!important;margin:0!important;display:flex}
 .qy-win.qy-bag .classic-filter select{display:none}
 .qy-bag-foot input{width:100%!important;min-width:0!important;box-sizing:border-box;min-height:28px!important;padding:2px 6px!important;font-size:12px;background:#0d0f11!important;border:1px solid #3c3a35!important;color:#d8cfb8!important}
 .qy-bag-foot>:not(.classic-filter){display:flex!important;gap:3px;flex:none;width:auto!important;margin:0!important;padding:0!important;background:transparent!important;border:0!important;position:static!important;transform:none!important}
 .qy-bag-foot button{width:32px!important;height:30px!important;min-height:0!important;min-width:0!important;padding:2px!important;margin:0!important;flex:none;background:linear-gradient(#3a3020,#221c13)!important;border:1px solid #8a6f40!important;border-radius:3px}
 .qy-bag-foot .inventory-tools-count:empty{display:none}
 .qy-win.qy-bag.qy-equip-view .classic-grid-scroll,.qy-win.qy-bag.qy-equip-view .qy-bag-foot,.qy-win.qy-bag.qy-equip-view .qy-bag-info{display:none!important}
 .qy-win.qy-bag:not(.qy-equip-view) .qy-equip{display:none}
 /* 裝備欄 */
 .qy-equip{flex:1;min-height:0;overflow:auto;margin-top:6px;padding:6px;background:#0d0f11;border:1px solid #2e2c28;scrollbar-width:thin}
 .qy-eq-name{text-align:center;color:#efe6cf;line-height:1.3}.qy-eq-name small{display:block;color:#9d9583;font-size:11px}
 .qy-eq-bar{position:relative;height:12px;margin:3px 22% 0;background:#2b2720;border:1px solid #000}
 .qy-eq-bar i{position:absolute;inset:0 auto 0 0}.qy-eq-bar.hp i{background:linear-gradient(#e05a4c,#8f1a14)}.qy-eq-bar.mp i{background:linear-gradient(#5d8ee6,#1d419b)}
 .qy-eq-bar span{position:relative;display:block;text-align:center;font-size:9px;line-height:12px;color:#fff;text-shadow:1px 1px 0 #000}
 .qy-doll{display:grid;grid-template-columns:16% 1fr 16%;gap:4px;margin-top:6px}
 .qy-doll-col{display:grid;gap:4px;align-content:start}
 .qy-doll-figure{display:flex;align-items:flex-end;justify-content:center;overflow:hidden;background:radial-gradient(ellipse at 50% 80%,#2c2618,transparent 70%)}
 .qy-doll-figure{position:relative}.qy-doll-figure img{position:absolute;bottom:0;left:50%;transform:translateX(-50%);height:100%;max-width:none;object-fit:contain}
 .qy-ring-row{display:grid;grid-template-columns:repeat(5,16%);justify-content:space-between;margin-top:4px}
 .qy-win .equipment-slot{position:relative!important;inset:auto!important;width:auto!important;height:auto!important;aspect-ratio:1;min-height:0!important;margin:0!important;padding:3px!important;display:flex;align-items:center;justify-content:center;
  background:radial-gradient(#25272b,#17181b)!important;border:1px solid #3c3a35!important;border-radius:3px;box-sizing:border-box;transform:none!important;cursor:pointer}
 .qy-win .equipment-slot img{width:100%;height:100%;object-fit:contain}
 .qy-win .equipment-slot .slot-symbol{font-size:10px;color:#5f5a4e;line-height:1.1;text-align:center}
 .qy-win .equipment-slot:hover,.qy-win .equipment-slot:focus-visible{border-color:#d7b464!important}
 .qy-eq-stats{display:grid;grid-template-columns:repeat(3,1fr);gap:2px 8px;margin-top:6px;padding-top:5px;border-top:1px solid #2e2c28}
 .qy-eq-stats div{display:flex;justify-content:space-between;color:#9d9583}.qy-eq-stats b{color:#efe6cf;font-weight:normal}
 @container (max-width:250px){.qy-tabs button{font-size:11px!important;letter-spacing:-.5px}.qy-bag-info{flex-wrap:wrap}.qy-bag-info .w{flex-basis:100%}.qy-eq-stats{grid-template-columns:1fr 1fr}}
 `;document.head.append(css);

 const el=(tag,cls,text)=>uiElement(tag,cls,text);
 function maxWeight(a){return Math.max(0,Math.floor(1500+Math.floor(((a.str||0)+(a.con||0)-18)/2)*150))}
 function carried(){let t=0;for(const e of window.OwnedInventory?.items||[])t+=(e.item?.weight??0)*(e.count||1);return Math.round(t/1000)}
 function weightPct(){const a=PlayerClassStats.read().attributes||{},mw=maxWeight(a);return mw?Math.min(100,Math.round(carried()/mw*100)):0}
 function expInfo(){const lv=window.activeCharacterLevel||1,exp=window.activeCharacterExperience||0,t=typeof killRewardData!=='undefined'?killRewardData.thresholds:null;const a=t?.find(r=>r[0]===lv)?.[1],b=t?.find(r=>r[0]===lv+1)?.[1];return {exp,pct:Number.isFinite(a)&&Number.isFinite(b)&&b>a?Math.max(0,Math.min(100,(exp-a)/(b-a)*100)):0}}
 function row(label,value,key){const r=el('div','qy-row');r.append(el('span','',label));const b=el('b','',String(value??'—'));if(key)b.dataset.qyVital=key;r.append(b);return r}
 function meter(pct){const m=el('div','qy-meter'),i=el('i');i.style.width=Math.max(0,Math.min(100,pct))+'%';m.append(i);return m}
 function tabs(list,current,pick){const bar=el('div','qy-tabs');bar.setAttribute('role','tablist');for(const [key,label,badge]of list){const b=el('button','',label);b.type='button';b.dataset.key=key;b.setAttribute('role','tab');b.setAttribute('aria-selected',String(key===current));if(badge!==undefined)b.append(el('sup','',String(badge)));b.onclick=()=>{for(const x of bar.children)x.setAttribute('aria-selected',String(x===b));pick(key)};bar.append(b)}return bar}
 function portrait(){const rules=window.CreationRules?.classes?.[job],file=rules?.portraits?.[characterGender?1:0]||rules?.portraits?.[0];const img=el('img');img.alt='';img.src=file?'assets/entry/'+file:currentPortrait();img.onerror=()=>img.remove();return img}

 // ---------- 角色（status） ----------
 let charTab='ability';
 function abilityTab(){const p=PlayerClassStats.read(),a=p.attributes||{},d=window.NativeCombatRules?.defense?.()||{},x=expInfo(),frag=document.createDocumentFragment();
  const st=el('div','qy-box qy-stats');for(const [k,l]of [['str','力量'],['int','智力'],['dex','敏捷'],['wis','精神'],['con','體質'],['cha','魅力']]){const s=el('div','qy-stat '+k);s.append(el('span','',l),el('b','',String(a[k]??'—')));st.append(s)}frag.append(st);
  const box=el('div','qy-box');box.append(row('等級',p.level),row('經驗值',x.exp.toLocaleString()+' ('+x.pct.toFixed(2)+'%)'),row('體力',hp+' / '+maxHp,'hp'),row('魔力',mp+' / '+maxMp,'mp'),
   row('防禦',previewArmorClass()),row('魔防',(d.mr||0)+'%'),row('正義值',window.activeCharacterLawful??0));frag.append(box);
  const w=weightPct(),bars=el('div','qy-box');bars.append(row('負重程度',w+'%'),meter(w),row('飽食程度','—'),meter(0));frag.append(bars);
  const more=el('div','qy-box');more.append(row('近距離傷害','+'+(p.meleeBonus||0)),row('遠距離傷害','+'+(p.rangedBonus||0)),row('武器傷害',p.weapon?.damage?.join(' / ')??'空手'),row('魔攻',p.sp||0),row('閃避',d.dodge||0),row('自然回血',p.hpRecoveryText),row('自然回魔',p.mpRecoveryText));frag.append(more);return frag}
 const SOCIAL={party:['隊伍','目前沒有隊伍。'],clan:['血盟','尚未加入血盟。'],friend:['好友','好友名單是空的。']};
 function characterPane(){const pane=makeClassicWindow('角色');pane.classList.add('qy-win','qy-char','status-window');
  const body=el('div','qy-body'),fill=()=>body.replaceChildren(charTab==='ability'?abilityTab():el('div','qy-empty',SOCIAL[charTab][1]));
  pane.append(tabs([['ability','能力'],['party','隊伍'],['clan','血盟'],['friend','好友']],charTab,k=>{charTab=k;fill()}),body);fill();return pane}
 renderStatusPane=characterPane;

 // ---------- 背包（bag）＋裝備欄 ----------
 let bagView='items';
 inventoryPageSize=999;
 catalogMatches=function(){return OwnedInventory.items.filter(e=>(catalogKind==='all'||e.item.kind===catalogKind)&&(!catalogQuery||e.item.name.includes(catalogQuery)||String(e.item.id)===catalogQuery))};
 if(!['all','weapon','armor','etcitem'].includes(catalogKind))catalogKind='all';
 const baseEquipment=renderEquipmentPane,baseInventory=renderInventoryPane;
 function equipView(){const box=el('div','qy-equip'),p=PlayerClassStats.read(),a=p.attributes||{},d=window.NativeCombatRules?.defense?.()||{};
  const name=el('div','qy-eq-name',window.activeCharacterName||job);name.append(el('small','','Lv.'+p.level+' '+job));box.append(name);
  for(const [k,v,m]of [['hp',hp,maxHp],['mp',mp,maxMp]]){const bar=el('div','qy-eq-bar '+k),i=el('i');i.style.width=(m?Math.max(0,Math.min(100,v/m*100)):0)+'%';const s=el('span','',k.toUpperCase()+' '+v+' / '+m);s.dataset.qyBar=k;bar.append(i,s);box.append(bar)}
  const source=baseEquipment(),buttons=new Map();[...source.querySelectorAll('.equipment-slot')].forEach((b,i)=>{b.removeAttribute('style');buttons.set(equipmentSlots[i]?.[0],b)});
  const col=keys=>{const c=el('div','qy-doll-col');for(const k of keys){const b=buttons.get(k);if(b)c.append(b)}return c};
  const doll=el('div','qy-doll'),fig=el('div','qy-doll-figure');fig.append(portrait());doll.append(col(['helm','cloak','tshirt','armor','glove']),fig,col(['earring','necklace','belt','shield','boots']));box.append(doll);
  const rings=el('div','qy-ring-row');for(const k of ['weapon','ring1','ring2','ring3','ring4']){const b=buttons.get(k);if(b)rings.append(b)}box.append(rings);
  const s=el('div','qy-eq-stats');for(const [l,v]of [['力量',a.str],['敏捷',a.dex],['體質',a.con],['智力',a.int],['精神',a.wis],['魅力',a.cha],['防禦',previewArmorClass()],['魔防',d.mr||0],['正義',window.activeCharacterLawful??0]]){const c=el('div');c.append(el('span','',l),el('b','',String(v??'—')));s.append(c)}box.append(s);return box}
 function padGrid(grid){const items=grid.querySelectorAll('.item-slot:not(.empty)').length,blanks=[...grid.querySelectorAll('.item-slot.empty')],want=Math.max(24,Math.ceil(items/4)*4)-items;
  if(blanks.length===want)return;for(const b of blanks.slice(want))b.remove();for(let i=blanks.length;i<want;i++){const b=el('div','item-slot empty');b.setAttribute('aria-hidden','true');grid.append(b)}}
 renderInventoryPane=function(){const pane=baseInventory();pane.classList.add('qy-win','qy-bag');pane.classList.toggle('qy-equip-view',bagView==='equip');
  const header=pane.querySelector('.classic-window-header'),filter=pane.querySelector('.classic-filter'),scroll=pane.querySelector('.classic-grid-scroll'),grid=pane.querySelector('.classic-item-grid'),query=filter?.querySelector('input'),tools=pane.lastElementChild;
  const bar=tabs([['all','全部',OwnedInventory.items.length],['weapon','武器'],['armor','防具'],['etcitem','道具'],['equip','裝備欄']],bagView==='equip'?'equip':catalogKind,k=>{
   if(k==='equip'){bagView='equip';pane.classList.add('qy-equip-view');pane.querySelector('.qy-equip')?.replaceWith(equipView());return}
   bagView='items';pane.classList.remove('qy-equip-view');catalogKind=k;query?.dispatchEvent(new Event('input'))});
  const info=el('div','qy-bag-info'),w=weightPct(),wd=el('div','w');wd.append('負重 ',el('b','',w+'%'),meter(w));const cap=el('span','cap');cap.append('格數 ',el('b','',OwnedInventory.items.length+'/180'));const ac=el('span');ac.append('防禦 ',el('b','',String(previewArmorClass())));info.append(wd,cap,ac);
  const foot=el('div','qy-bag-foot');if(filter)foot.append(filter);if(tools&&tools!==filter&&tools!==scroll&&!tools.classList.contains('classic-item-detail'))foot.append(tools);
  header.after(bar,info);info.after(scroll||el('div'),foot);foot.after(equipView());
  if(grid){padGrid(grid);new MutationObserver(()=>padGrid(grid)).observe(grid,{childList:true})}
  return pane};
 // 裝備（E）開背包的裝備欄；人物狀態開角色視窗（借用左側 equipment 視窗位置，跟奇岩一樣角色在左、背包在右）
 renderEquipmentPane=characterPane;
 const prevPanel=panel;panel=function(type){if(type==='equipment'){bagView='equip';return prevPanel('bag')}if(type==='status')return prevPanel('equipment');if(type==='bag'&&!document.querySelector('.qy-bag'))bagView='items';return prevPanel(type)};

 // HP／MP 變動時更新已開啟的視窗
 const baseStats=stats;stats=function(...args){const out=baseStats.apply(this,args);
  for(const [key,v,m]of [['hp',hp,maxHp],['mp',mp,maxMp]]){for(const b of document.querySelectorAll('[data-qy-vital="'+key+'"]'))b.textContent=v+' / '+m;
   for(const s of document.querySelectorAll('[data-qy-bar="'+key+'"]')){s.textContent=key.toUpperCase()+' '+v+' / '+m;s.previousSibling.style.width=(m?Math.max(0,Math.min(100,v/m*100)):0)+'%'}}return out};
})();
