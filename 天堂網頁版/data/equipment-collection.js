function renderEquipmentCollection(sidebar,results,cards,detail,search,referenceSets,initialTab='weapon') {
  const gear = INTERFACE_CATALOG.items.filter(item=>item.kind==='weapon'||item.kind==='armor');
  const key = item => item.kind+':'+item.id;
  const byKey = new Map(gear.map(item=>[key(item),item]));
  const rows = {
    weapon:gear.filter(i=>i.kind==='weapon'),
    armor:gear.filter(i=>i.kind==='armor'),
    sets:EquipmentSets.definitions,
    references:referenceSets
  };
  const tabs=[['weapon','武器區'],['armor','防具區'],['sets','套裝配對'],['references','卡片收藏']];
  const tabButtons=new Map(), pager=uiElement('nav','game-catalog-tabs');
  pager.setAttribute('aria-label','收藏分頁');
  results.append(pager);
  const pageSize=36;
  let tab=initialTab,page=0,selected=null;
  function show(row,items) {
    selected=row;
    detail.replaceChildren();
    for(const button of cards.children)button.setAttribute('aria-pressed',String(button.collectionRow===row));
    if(!row){if(tab!=='references'||rows.references.length)detail.append(uiElement('p','','沒有符合條件的項目。'));return;}
    detail.append(uiElement('h3','',row.name));
    if(tab==='sets'){
      const progress=EquipmentSets.progress(row,items);
      const collected=progress.filter(part=>part.collected).length;
      const active=EquipmentSets.read(items).active.includes(row.name);
      detail.append(uiElement('strong','',EquipmentSets.label(row.bonus)||'無額外能力'),uiElement('p','',collected===row.keys.length?'圖鑑配對加成已生效':'已開圖 '+collected+'／'+row.keys.length+(active?' · 穿戴套裝加成已生效':'')),uiElement('small','','需求物品全部加入圖鑑後，配對加成永久生效，不需穿戴。'));
      for(const [i,required] of row.keys.entries()){
        const item=byKey.get(required),status=progress[i];
        const line=uiElement('p',''),icon=uiElement('span','item-slot');
        icon.style.cssText='display:inline-grid;width:32px;height:32px;vertical-align:middle;margin-right:8px';
        icon.append(itemIcon(item));
        icon.classList.toggle('collection-item-locked',!status.collected);
        line.append(icon,document.createTextNode((item?.name||required)+' · '+(status.collected?'已開圖':status.equipped?'未開圖 · 請先卸下':status.owned?'未開圖 · 可加入':'未開圖 · 尚未持有')));
        if(item&&!status.collected)line.append(catalogButton('查看物品',()=>{tab=item.kind;page=0;selected=item;search.value='';refresh();}));
        detail.append(line);
      }
      return;
    }
    if(tab==='references'){
      detail.append(uiElement('strong','',row.effect),uiElement('h4','','需求卡片'));
      for(const name of row.required)detail.append(uiElement('p','',name));
      const link=uiElement('a','','查看官方公告');
      link.href=row.source;link.target='_blank';link.rel='noopener noreferrer';detail.append(link);
      return;
    }
    const icon=uiElement('div','item-slot');
    icon.style.cssText='width:56px;height:56px';
    icon.append(itemIcon(row));
    const matches=items.filter(i=>i.key===key(row));
    const owned=matches.reduce((total,i)=>total+i.count,0);
    const unlocked=!!window.OwnedInventory?.hasCollection(key(row));
    icon.classList.toggle('collection-item-locked',!unlocked);
    detail.append(icon,uiElement('p','',owned?'已持有 × '+owned+(matches.some(i=>i.slot)?' · 已穿戴':''):'尚未持有'),
      uiElement('p','',row.kind==='weapon'?'武器傷害（小型／大型） '+row.damage.join('／'):'防具 AC '+row.ac),
      uiElement('p','','適用職業 '+(row.allowed.join('、')||'未設定')));
    const candidate=matches.find(entry=>!entry.slot);
    const register=catalogButton(unlocked?'已加入圖鑑':'加入圖鑑',()=>{if(window.OwnedInventory?.collect(candidate?.uid))refresh();});
    register.disabled=unlocked||!candidate;
    detail.append(uiElement('p','',unlocked?'已開圖 · 收藏永久保留':'未開圖 · 加入時消耗 1 件未穿戴道具'),register);
    const sets=EquipmentSets.definitions.filter(set=>set.keys.includes(key(row)));
    for(const set of sets)detail.append(catalogButton('查看 '+set.name,()=>{
      tab='sets';page=0;search.value='';selected=set;refresh();
    }));
  }
  function refresh(){
    search.hidden=tab==='references'&&!rows.references.length;
    const items=window.OwnedInventory?.items||[];
    const query=search.value.trim().toLowerCase();
    const visible=rows[tab].filter(row=>{
      const terms=[row.name,row.id,...(row.required||[]),...(row.keys||[]).map(k=>byKey.get(k)?.name)];
      return terms.join(' ').toLowerCase().includes(query);
    });
    const pages=Math.max(1,Math.ceil(visible.length/pageSize));
    if(selected&&visible.includes(selected))page=Math.floor(visible.indexOf(selected)/pageSize);
    page=Math.min(page,pages-1);
    const current=visible.slice(page*pageSize,(page+1)*pageSize);
    for(const [id,button] of tabButtons)button.setAttribute('aria-pressed',String(tab===id));
    cards.className=tab==='weapon'||tab==='armor'?'game-catalog-cards':'game-catalog-sets';
    cards.replaceChildren();
    for(const row of current){
      const tile=catalogButton('',()=>show(row,items),'game-catalog-card');
      tile.collectionRow=row;
      if(tab==='weapon'||tab==='armor'){
        const icon=itemIcon(row);
        icon.classList.add('game-catalog-portrait');
        const unlocked=!!window.OwnedInventory?.hasCollection(key(row));
        tile.classList.add(unlocked?'collection-unlocked':'collection-locked');
        tile.append(icon,uiElement('small','',unlocked?'已開圖':'未開圖'));
      }else if(tab==='sets'){
        const n=EquipmentSets.progress(row,items).filter(p=>p.collected).length;
        tile.classList.add(n===row.keys.length?'collection-unlocked':'collection-locked');
        tile.append(uiElement('small','',n===row.keys.length?'配對已生效':'已開圖 '+n+'／'+row.keys.length));
      }
      tile.append(uiElement('span','',row.name));
      if(tab==='sets'||tab==='references')tile.append(uiElement('small','',row.bonus?EquipmentSets.label(row.bonus):row.effect));
      cards.append(tile);
    }
    show(current.includes(selected)?selected:current[0],items);
    const prev=catalogButton('上一頁',()=>{page--;selected=null;refresh();}),next=catalogButton('下一頁',()=>{page++;selected=null;refresh();});
    prev.disabled=page===0;next.disabled=page===pages-1;
    pager.hidden=pages===1;
    pager.replaceChildren(prev,uiElement('small','',(page+1)+'／'+pages),next);
  }
  for(const [id,label] of tabs){
    const button=catalogButton(label+'（'+rows[id].length+'）',()=>{tab=id;page=0;selected=null;search.value='';refresh();});
    tabButtons.set(id,button);sidebar.append(button);
  }
  search.placeholder='搜尋裝備、套裝或需求道具';
  search.setAttribute('aria-label',search.placeholder);
  search.oninput=()=>{page=0;selected=null;refresh();};
  window.refreshEquipmentCollection=()=>{if(cards.isConnected)refresh();};
  refresh();
}
