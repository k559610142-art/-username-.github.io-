// 角色視窗＋背包（版面參考網頁奇岩城：左邊角色、右邊背包，皆為分頁式深色面板；程式與樣式為本專案自寫）。
//  角色：能力／裝備／詳細 三個分頁（status 與 equipment 都開這個視窗）
//  背包：全部／武器／防具／道具／穿戴中 分頁，上方負重、格數、防禦，5 欄可捲動
(()=>{
 const css=document.createElement('style');css.textContent=`
 .reference-game .classic-window.qy-win{display:flex!important;flex-direction:column;padding:0!important;border:1px solid #6b604a!important;border-image:none!important;border-radius:4px;background:linear-gradient(#1d2126,#15181c)!important;box-shadow:0 6px 22px #000a,inset 0 0 0 1px #0008!important;overflow:hidden!important;color:#ddd3bb;font-size:12px}
 .reference-game .qy-win>.classic-window-header{position:relative!important;display:flex;align-items:center;justify-content:center;height:30px!important;min-height:30px!important;margin:0!important;padding:0!important;background:linear-gradient(#2b2f35,#1e2227)!important;border-bottom:1px solid #4d4636}
 .reference-game .qy-win>.classic-window-header h2{position:static;width:auto;height:auto;clip:auto;margin:0;font-size:14px;letter-spacing:4px;color:#e9c97e;text-shadow:0 1px 0 #000}
 .reference-game .qy-win>.classic-window-header .classic-close{position:absolute!important;right:4px;top:3px;width:36px!important;height:22px!important;min-height:0!important;padding:0!important;font-size:11px!important;line-height:20px;background:#3a3122!important;border:1px solid #8b7448!important;border-radius:2px;color:#f0dcae!important;opacity:1}
 .reference-game .qy-win>.classic-window-header .classic-close::after{content:'關閉'}
 .reference-game .qy-win>.classic-window-header .classic-close{font-size:0!important}
 .reference-game .qy-win>.classic-window-header .classic-close::after{font-size:11px}
 .qy-tabs{display:flex;gap:2px;padding:6px 6px 0;border-bottom:1px solid #3d3a32;flex:none}
 .qy-tabs button{flex:1;min-height:26px!important;padding:2px 0!important;font-size:12px!important;background:#24282e!important;color:#a99f88!important;border:1px solid #3d3a32!important;border-bottom:0!important;border-radius:3px 3px 0 0!important}
 .qy-tabs button[aria-selected=true]{background:#3a3223!important;color:#f3d48b!important;border-color:#8b7448!important}
 .qy-body{flex:1;min-height:0;overflow:auto;padding:8px;scrollbar-width:thin;scrollbar-color:#6b604a #15181c}
 .qy-card{background:#0f1215;border:1px solid #33302a;border-radius:3px;padding:6px 8px;margin-bottom:6px}
 .qy-stats{display:grid;grid-template-columns:1fr 1fr;gap:4px}
 .qy-stat{display:flex;justify-content:space-between;align-items:center;padding:3px 8px;background:#1a1e23;border:1px solid #2e2c27;border-radius:2px}
 .qy-stat b{font-size:14px;font-variant-numeric:tabular-nums}
 .qy-stat.str b{color:#ff7a5c}.qy-stat.dex b{color:#7ee07a}.qy-stat.con b{color:#f5b65b}.qy-stat.int b{color:#78b7ff}.qy-stat.wis b{color:#c99bff}.qy-stat.cha b{color:#ff9fd0}
 .qy-row{display:flex;justify-content:space-between;align-items:center;padding:3px 2px;border-bottom:1px solid #24221e;font-variant-numeric:tabular-nums}
 .qy-row:last-child{border-bottom:0}
 .qy-row span{color:#a99f88}.qy-row b{color:#efe4c8;font-weight:normal}
 .qy-name{display:flex;justify-content:space-between;align-items:baseline;margin-bottom:6px}
 .qy-name strong{font-size:15px;color:#f3d48b}.qy-name small{color:#a99f88}
 .qy-meter{position:relative;height:8px;margin-top:3px;background:#2a2620;border-radius:4px;overflow:hidden}
 .qy-meter i{position:absolute;inset:0 auto 0 0;background:linear-gradient(90deg,#b98a2e,#f2c45f)}
 .qy-meter.hp i{background:linear-gradient(90deg,#8e1f1f,#e04a3a)}.qy-meter.mp i{background:linear-gradient(90deg,#1c3f8e,#3f86e0)}
 /* 裝備分頁 */
 .qy-doll{display:grid;grid-template-columns:1fr 1.5fr 1fr;gap:5px;align-items:stretch}
 .qy-doll-col{display:grid;gap:5px}
 .qy-doll-figure{display:flex;align-items:flex-end;justify-content:center;background:radial-gradient(ellipse at 50% 70%,#3a3223,#111417 70%);border:1px solid #33302a;border-radius:3px;overflow:hidden;min-height:150px}
 .qy-doll-figure img{max-width:100%;max-height:230px;object-fit:contain}
 .qy-ring-row{display:grid;grid-template-columns:repeat(5,1fr);gap:5px;margin-top:5px}
 .qy-win .equipment-slot{position:relative!important;inset:auto!important;width:auto!important;height:auto!important;aspect-ratio:1;min-height:0!important;margin:0!important;padding:3px!important;display:flex;align-items:center;justify-content:center;background:#1a1e23!important;border:1px solid #3d3a32!important;border-radius:3px;box-sizing:border-box;transform:none!important;cursor:pointer}
 .qy-win .equipment-slot img{width:100%;height:100%;object-fit:contain}
 .qy-win .equipment-slot .slot-symbol{font-size:10px;color:#6f6858;line-height:1.1;text-align:center}
 .qy-win .equipment-slot:hover,.qy-win .equipment-slot:focus-visible{border-color:#d7b464!important}
 /* 背包 */
 .qy-bag-info{display:grid;grid-template-columns:1.4fr 1fr 1fr;gap:4px;padding:6px 6px 0;flex:none;font-size:11px;color:#a99f88}
 .qy-bag-info>div{background:#0f1215;border:1px solid #33302a;border-radius:2px;padding:3px 5px;white-space:nowrap;overflow:hidden}
 .qy-bag-info b{color:#efe4c8;font-weight:normal}
 .qy-win.qy-bag .classic-grid-scroll{flex:1;min-height:0;max-height:none!important;margin:6px!important;padding:4px!important;overflow:auto!important;background:#0f1215!important;border:1px solid #33302a!important;border-radius:3px;scrollbar-width:thin;scrollbar-color:#6b604a #15181c}
 .qy-win.qy-bag .classic-item-grid{display:grid!important;grid-template-columns:repeat(5,1fr)!important;grid-auto-rows:auto!important;gap:3px!important;width:auto!important;height:auto!important;padding:0!important}
 .qy-win.qy-bag .classic-item-grid .item-slot{position:relative;width:auto!important;height:auto!important;min-width:0!important;min-height:0!important;aspect-ratio:1!important;margin:0!important;padding:3px!important;background:#1a1e23!important;border:1px solid #2e2c27!important;border-radius:3px;box-shadow:none!important;box-sizing:border-box}
 .qy-win.qy-bag .classic-item-grid .item-slot img{width:100%!important;height:100%!important;object-fit:contain}
 .qy-win.qy-bag .classic-item-grid .item-slot.empty{background:#14171b!important;border-color:#24221e!important}
 .qy-win.qy-bag .classic-item-grid .item-slot:not(.empty):hover,.qy-win.qy-bag .classic-item-grid .item-slot[aria-pressed=true]{border-color:#d7b464!important}
 .qy-win.qy-bag .inventory-count{position:absolute;right:2px;bottom:1px;font-size:10px;color:#fff;text-shadow:0 0 2px #000,1px 1px 0 #000}
 .qy-win.qy-bag .equipped-mark{position:absolute;left:2px;top:1px;font-size:9px;padding:0 2px;background:#8b6a24;color:#fff;border-radius:2px}
 .qy-win.qy-bag .missing-item-icon{display:flex;align-items:center;justify-content:center;width:100%;height:100%;font-size:13px;color:#c9b98e;background:#262a30;border-radius:2px}
 .qy-win.qy-bag .classic-pager{display:none!important}
 .qy-win.qy-bag .classic-filter{display:flex;gap:4px;margin:0 6px 6px!important;flex:none}
 .qy-win.qy-bag .classic-filter select{display:none}
 .qy-win.qy-bag .classic-filter input{flex:1;min-height:26px!important;padding:2px 6px!important;font-size:12px;background:#0f1215!important;border:1px solid #3d3a32!important;color:#ddd3bb!important}
 .qy-win.qy-bag>:not(.classic-window-header):not(.qy-tabs):not(.qy-bag-info):not(.classic-grid-scroll):not(.classic-filter):not(.classic-item-detail){flex:none;margin:0 6px 6px!important}
 .qy-win.qy-bag button{font-size:12px}
 .reference-game .classic-window.qy-win{container-type:inline-size}
 .qy-tabs button{min-width:0;white-space:nowrap;overflow:hidden}
 .qy-bag-foot{display:flex;align-items:center;gap:4px;margin:0 6px 6px;flex:none}
 .qy-win.qy-bag .qy-bag-foot>.classic-filter{flex:1 1 0!important;min-width:0!important;margin:0!important}
 .qy-bag-foot>*{margin:0!important}
 .qy-bag-foot .inventory-tools{position:static!important;transform:none!important;inset:auto!important}
 .qy-bag-foot .inventory-tools-count:empty{display:none}
 .qy-bag-foot input{width:100%!important;min-width:0!important;box-sizing:border-box}
 .qy-bag-foot button{width:30px!important;height:30px!important;min-height:0!important;min-width:0!important;padding:2px!important;margin:0!important;flex:none}
 .qy-bag-foot>:not(.classic-filter){display:flex!important;gap:3px;flex:none;width:auto!important;padding:0!important;background:transparent!important;border:0!important}
 .qy-bag-foot button img,.qy-bag-foot button svg{max-height:20px}
 .qy-win.qy-bag .classic-grid-scroll{min-height:96px}
 @container (max-width:230px){.qy-tabs button{font-size:11px!important;letter-spacing:-.5px}.qy-bag-info{grid-template-columns:1fr 1fr}.qy-bag-info>div:first-child{grid-column:1/-1}.qy-doll-figure img{max-height:160px}}
 `;document.head.append(css);

 const el=(tag,cls,text)=>uiElement(tag,cls,text);
 function maxWeight(a){return Math.max(0,Math.floor(1500+Math.floor(((a.str||0)+(a.con||0)-18)/2)*150))}
 function carried(){let t=0;for(const e of window.OwnedInventory?.items||[])t+=(e.item?.weight??0)*(e.count||1);return Math.round(t/1000)}
 function weightPct(){const a=PlayerClassStats.read().attributes||{},mw=maxWeight(a);return mw?Math.min(100,Math.round(carried()/mw*100)):0}
 function expInfo(){const lv=window.activeCharacterLevel||1,exp=window.activeCharacterExperience||0,t=typeof killRewardData!=='undefined'?killRewardData.thresholds:null;const a=t?.find(r=>r[0]===lv)?.[1],b=t?.find(r=>r[0]===lv+1)?.[1];const pct=Number.isFinite(a)&&Number.isFinite(b)&&b>a?Math.max(0,Math.min(100,(exp-a)/(b-a)*100)):0;return {exp,pct}}
 const MAGIC_DIV={王族:10,騎士:50,妖精:8,法師:4,黑暗妖精:12,黑妖:12,龍騎士:9,幻術師:6};
 function row(label,value,key){const r=el('div','qy-row');r.append(el('span','',label));const b=el('b','',String(value??'—'));if(key)b.dataset.qyVital=key;r.append(b);return r}
 function meter(pct,cls){const m=el('div','qy-meter'+(cls?' '+cls:'')),i=el('i');i.style.width=Math.max(0,Math.min(100,pct))+'%';m.append(i);return m}
 function tabs(list,current,pick){const bar=el('div','qy-tabs');bar.setAttribute('role','tablist');for(const [key,label]of list){const b=el('button','',label);b.type='button';b.setAttribute('role','tab');b.setAttribute('aria-selected',String(key===current));b.onclick=()=>pick(key);bar.append(b)}return bar}
 function portrait(){const rules=window.CreationRules?.classes?.[job],file=rules?.portraits?.[characterGender?1:0]||rules?.portraits?.[0];const img=el('img');img.alt='';img.src=file?'assets/entry/'+file:currentPortrait();img.onerror=()=>img.remove();return img}

 // ---------- 角色 ----------
 let charTab='ability';
 const baseEquipment=renderEquipmentPane;
 function abilityTab(){const p=PlayerClassStats.read(),a=p.attributes||{},d=window.NativeCombatRules?.defense?.()||{},x=expInfo(),frag=document.createDocumentFragment();
  const head=el('div','qy-card'),name=el('div','qy-name');name.append(el('strong','',window.activeCharacterName||job),el('small','',job+'　Lv.'+p.level));head.append(name);
  const grid=el('div','qy-stats');for(const [k,l]of [['str','力量'],['int','智力'],['dex','敏捷'],['wis','精神'],['con','體質'],['cha','魅力']]){const s=el('div','qy-stat '+k);s.append(el('span','',l),el('b','',String(a[k]??'—')));grid.append(s)}head.append(grid);frag.append(head);
  const card=el('div','qy-card');card.append(row('等級',p.level),row('經驗值',x.exp.toLocaleString()+'（'+x.pct.toFixed(2)+'%）'));card.append(meter(x.pct));
  card.append(row('體力',hp+' / '+maxHp,'hp'),meter(maxHp?hp/maxHp*100:0,'hp'),row('魔力',mp+' / '+maxMp,'mp'),meter(maxMp?mp/maxMp*100:0,'mp'));
  card.append(row('防禦 AC',previewArmorClass()),row('魔法防禦',(d.mr||0)+'%'),row('魔攻',p.sp||0),row('魔法等級',Math.floor((p.level||1)/(MAGIC_DIV[job]||50))),row('閃避',d.dodge||0));frag.append(card);
  const w=weightPct(),wc=el('div','qy-card');wc.append(row('負重程度',w+'%'),meter(w));frag.append(wc);return frag}
 function equipTab(){const source=baseEquipment(),buttons=new Map();for(const b of source.querySelectorAll('.equipment-slot'))b.removeAttribute('style');
  [...source.querySelectorAll('.equipment-slot')].forEach((b,i)=>buttons.set(equipmentSlots[i]?.[0],b));
  const pick=keys=>{const col=el('div','qy-doll-col');for(const k of keys){const b=buttons.get(k);if(b)col.append(b)}return col};
  const doll=el('div','qy-doll'),fig=el('div','qy-doll-figure');fig.append(portrait());doll.append(pick(['helm','cloak','armor','glove','boots']),fig,pick(['earring','necklace','tshirt','belt','shield']));
  const rings=el('div','qy-ring-row');for(const k of ['weapon','ring1','ring2','ring3','ring4']){const b=buttons.get(k);if(b)rings.append(b)}
  const card=el('div','qy-card');card.append(row('防禦 AC',previewArmorClass()),row('穿戴件數',OwnedInventory.items.filter(e=>e.slot).length),el('small','','點裝備格卸下；在背包雙擊裝備穿戴。'));
  const frag=document.createDocumentFragment();frag.append(doll,rings,card);return frag}
 function detailTab(){const p=PlayerClassStats.read(),v=window.NativeCombatRules?.vitals?.()||{},g=window.activeVitalGrowth||{},card=el('div','qy-card');
  card.append(row('近距傷害加成',p.meleeBonus),row('遠距傷害加成',p.rangedBonus),row('武器傷害（小／大）',p.weapon?.damage?.join(' / ')??'空手'),
   row('基礎 HP／MP',(g.maxHp??maxHp)+' / '+(g.maxMp??maxMp)),row('裝備 HP／MP',(v.gearHp||0)+' / '+(v.gearMp||0)),row('套裝 HP／MP',(v.setHp||0)+' / '+(v.setMp||0)),row('變身 HP／MP',(v.polyHp||0)+' / '+(v.polyMp||0)),
   row('自然回血',p.hpRecoveryText),row('自然回魔',p.mpRecoveryText),row('初始體質／精神',playerAttributes.con+' / '+playerAttributes.wis),
   row('套裝加成',p.equipmentSets?.active?.length?p.equipmentSets.active.join('、'):'未生效'));return card}
 function characterPane(){const pane=makeClassicWindow('角色');pane.classList.add('qy-win','qy-char','equipment-window');
  const body=el('div','qy-body');const fill=()=>{body.replaceChildren(charTab==='equip'?equipTab():charTab==='detail'?detailTab():abilityTab())};
  const bar=tabs([['ability','能力'],['equip','裝備'],['detail','詳細']],charTab,k=>{charTab=k;for(const b of bar.children)b.setAttribute('aria-selected',String(b.textContent===({ability:'能力',equip:'裝備',detail:'詳細'})[k]));fill()});
  pane.append(bar,body);fill();return pane}
 renderEquipmentPane=characterPane;renderStatusPane=characterPane;
 // 人物狀態與裝備是同一個視窗：status 改開 equipment 並切到能力分頁
 const prevPanel=panel;panel=function(type){if(type==='status'){charTab='ability';return prevPanel('equipment')}if(type==='equipment'&&!document.querySelector('.qy-char'))charTab='equip';return prevPanel(type)};

 // ---------- 背包 ----------
 inventoryPageSize=999;
 const BAG_TABS=[['all','全部'],['weapon','武器'],['armor','防具'],['etcitem','道具'],['equipped','穿戴中']];
 catalogMatches=function(){return OwnedInventory.items.filter(e=>(catalogKind==='all'||(catalogKind==='equipped'?!!e.slot:e.item.kind===catalogKind))&&(!catalogQuery||e.item.name.includes(catalogQuery)||String(e.item.id)===catalogQuery))};
 const baseInventory=renderInventoryPane;
 function padGrid(grid){const items=grid.querySelectorAll('.item-slot:not(.empty)').length,blanks=[...grid.querySelectorAll('.item-slot.empty')],want=Math.max(35,Math.ceil(items/5)*5)-items;
  if(blanks.length===want)return;for(const b of blanks.slice(want))b.remove();for(let i=blanks.length;i<want;i++){const b=el('div','item-slot empty');b.setAttribute('aria-hidden','true');grid.append(b)}}
 renderInventoryPane=function(){const pane=baseInventory();pane.classList.add('qy-win','qy-bag');
  const header=pane.querySelector('.classic-window-header'),filter=pane.querySelector('.classic-filter'),scroll=pane.querySelector('.classic-grid-scroll'),grid=pane.querySelector('.classic-item-grid'),query=filter?.querySelector('input');
  const bar=tabs(BAG_TABS,catalogKind,k=>{catalogKind=k;for(const [i,b]of [...bar.children].entries())b.setAttribute('aria-selected',String(BAG_TABS[i][0]===k));query?.dispatchEvent(new Event('input'))});
  const info=el('div','qy-bag-info'),w=weightPct(),wd=el('div');wd.append('負重 ',el('b','',w+'%'));wd.append(meter(w));const n=el('div');n.append('格數 ',el('b','',OwnedInventory.items.length+'/180'));const ac=el('div');ac.append('防禦 ',el('b','',String(previewArmorClass())));info.append(wd,n,ac);
  header.after(bar,info);if(scroll)bar.parentNode.insertBefore(scroll,info.nextSibling);
  // 搜尋框和整理／刪除／販賣按鈕併成一排，矮螢幕也留得下格子區
  const tools=pane.lastElementChild,foot=el('div','qy-bag-foot');if(filter)foot.append(filter);if(tools&&tools!==filter&&tools!==scroll&&!tools.classList.contains('classic-item-detail'))foot.append(tools);scroll?.after(foot);
  if(grid){padGrid(grid);new MutationObserver(()=>padGrid(grid)).observe(grid,{childList:true})}
  return pane};

 // HP／MP 變動時更新已開啟的角色視窗
 const baseStats=stats;stats=function(...args){const out=baseStats.apply(this,args);for(const [key,text]of [['hp',hp+' / '+maxHp],['mp',mp+' / '+maxMp]])for(const b of document.querySelectorAll('[data-qy-vital="'+key+'"]')){b.textContent=text;const m=b.parentNode.nextElementSibling;if(m?.classList.contains('qy-meter'))m.firstChild.style.width=Math.max(0,Math.min(100,key==='hp'?hp/maxHp*100:mp/maxMp*100))+'%'}return out};
})();
