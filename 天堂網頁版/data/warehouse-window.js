// Account warehouse. The NPC entry point shares the same inventory transaction as other item actions.
window.WarehouseWindow = (() => {
  const COINS = 'etcitem:40308';
  const kinds = {weapon:'武器',armor:'防具',etcitem:'道具'};
  const types = {
    dagger:'匕首',sword:'單手劍',tohandsword:'雙手劍',bow:'弓',singlebow:'弓',
    blunt:'鈍器',staff:'魔杖',spear:'長矛',chainsword:'鎖鏈劍',kiringku:'奇古獸',
    helm:'頭盔',armor:'盔甲',tshirt:'內衣',T:'內衣',cloak:'斗篷',glove:'手套',
    boots:'長靴',shield:'盾牌',guarder:'臂甲',ring:'戒指',ring2:'戒指',
    necklace:'項鍊',amulet:'項鍊',earring:'耳環',belt:'腰帶',
    food:'食物',potion:'藥水',arrow:'箭矢',scroll:'卷軸',gem:'寶石',material:'材料',other:'其他'
  };
  const element = (tag, className, text) => uiElement(tag,className,text);
  const amount = field => field.validity.badInput?NaN:field.value.trim()===''?null:Number(field.value);
  const movable = entry => !entry.slot&&!entry.locked;
  const coinCount = rows => rows.reduce((sum,entry)=>sum+(entry.key===COINS&&movable(entry)?entry.count:0),0);

  function open(fee){
    const overlay=document.querySelector('#panel'), content=document.querySelector('#panelContent');
    const closeControl=overlay.querySelector('#close');
    cancelPointerGesture({preserveNavigation:true});
    overlay.classList.remove('classic-panel','npc-shop-panel','native-dialog-panel','reference-menu-panel','game-catalog-panel');
    overlay.setAttribute('aria-label','共用倉庫');
    overlay.hidden=false;
    closeControl.hidden=true;

    const host=element('section','shared-warehouse');
    const button=(text,cls,action)=>{
      const control=element('button',cls,text);
      control.type='button';control.onclick=action;return control;
    };
    const header=element('div','warehouse-heading'),heading=element('div');
    heading.append(element('h2','','共用倉庫'),element('p','','帳號內的角色共用同一個倉庫'));
    const close=button('關閉','warehouse-close',()=>closeControl.click());
    header.append(heading,close);

    const funds=element('section','warehouse-funds'),balances=element('div','warehouse-balances');
    const bagMoney=element('strong'),storeMoney=element('strong');
    function balance(label,value){
      const block=element('span');block.append(element('small','',label),value);return block;
    }
    balances.append(balance('背包天幣',bagMoney),balance('倉庫天幣',storeMoney));
    const cash=element('input');cash.type='number';cash.min='1';cash.step='1';cash.inputMode='numeric';
    cash.placeholder='天幣數量';cash.setAttribute('aria-label','天幣數量');
    const cashControls=element('div','warehouse-cash-controls');
    function moveCash(withdraw,all){
      const sum=all?coinCount(withdraw?OwnedInventory.storedItems:OwnedInventory.items):amount(cash);
      const error=OwnedInventory.transferMoney(sum,withdraw);
      render(error||((withdraw?'取出 ':'存入 ')+sum.toLocaleString()+' 天幣。'),!!error);
    }
    cashControls.append(cash,button('存入 ▶','warehouse-deposit',()=>moveCash(false,false)),
      button('◀ 取出','warehouse-withdraw',()=>moveCash(true,false)),
      button('全存','',()=>moveCash(false,true)),button('全取','',()=>moveCash(true,true)));
    funds.append(balances,cashControls);

    const filters=element('div','warehouse-filters');
    const kind=element('select'),type=element('select'),wearable=element('input'),search=element('input'),quantity=element('input');
    wearable.type='checkbox';search.type='search';search.placeholder='道具名稱';
    quantity.type='number';quantity.min='1';quantity.step='1';quantity.inputMode='numeric';quantity.placeholder='整疊';
    function field(text,control,cls=''){
      const label=element('label',cls);label.append(element('span','',text),control);return label;
    }
    kind.append(new Option('全部',''),...Object.entries(kinds).map(([key,label])=>new Option(label,key)));
    filters.append(field('分類',kind),field('種類',type),field('只列可穿戴',wearable,'warehouse-checkbox'),
      field('搜尋',search,'warehouse-search'),field('數量',quantity));
    const bulk=button('批次存入','warehouse-deposit',()=>{
      const rows=OwnedInventory.items.filter(entry=>matches(entry)&&movable(entry));
      if(!rows.length)return render('目前篩選下沒有可存入的物品。',true);
      if(!confirm('將目前篩選下的 '+rows.length+' 格道具整疊存入共用倉庫？'))return;
      const error=OwnedInventory.storeBatch(rows.map(entry=>entry.uid));
      render(error||'已存入 '+rows.length+' 格道具。',!!error);
    });
    const sort=button('整理倉庫','',()=>{
      const error=OwnedInventory.sortWarehouse();render(error||'倉庫已整理。',!!error);
    });
    filters.append(bulk,sort);

    const hint=element('p','warehouse-hint','點背包道具存入，點倉庫道具取出。數量留空會移動整疊。'+(fee?' 每次取出道具需 '+fee.toLocaleString()+' 天幣。':''));
    const note=element('p','warehouse-feedback');note.setAttribute('role','status');
    const columns=element('div','warehouse-columns');
    function column(label,cls){
      const wrap=element('section','warehouse-column '+cls),bar=element('div','warehouse-column-heading');
      const count=element('span'),rows=element('div','warehouse-list');
      bar.append(element('h3','',label),count);wrap.append(bar,rows);columns.append(wrap);
      return {rows,count};
    }
    const bag=column('背包 · 點擊存入','warehouse-bag'),storage=column('共用倉庫 · 點擊取出','warehouse-store');
    host.append(header,funds,filters,hint,note,columns);content.replaceChildren(host);

    function canWear(entry){
      const item=entry.item,rule=ITEM_USE_RULES.definitions[entry.key],level=window.activeCharacterLevel||1;
      return !!OwnedInventory.slotFor(item)&&item.allowed.includes(job)&&level>=(rule?.minLevel||0)&&(!rule?.maxLevel||level<=rule.maxLevel);
    }
    function matches(entry){
      const item=entry.item;
      return entry.key!==COINS&&(!kind.value||item.kind===kind.value)&&(!type.value||item.type===type.value)
        &&(!wearable.checked||canWear(entry))&&item.name.toLowerCase().includes(search.value.trim().toLowerCase());
    }
    function renderColumn(column,rows,withdraw){
      const previousScroll=column.rows.scrollTop;
      const listed=rows.filter(matches);
      column.rows.replaceChildren(...listed.map(entry=>{
        const enchant=entry.enchant?(entry.enchant>0?'+':'')+entry.enchant+' ':'';
        const caption=enchant+entry.item.name;
        const row=button('', 'warehouse-item',()=>{
          const error=OwnedInventory.transfer(entry.uid,withdraw,fee,amount(quantity));
          render(error||((withdraw?'已取出 ':'已存入 ')+caption+'。'),!!error);
        });
        row.title=caption;
        row.setAttribute('aria-label',(withdraw?'取出 ':'存入 ')+caption);
        const marker=entry.locked?'鎖定':entry.slot?'已穿戴':entry.count>1?entry.count.toLocaleString():'';
        row.append(itemIcon(entry.item),element('span','warehouse-item-name',caption),element('small','',marker));
        row.disabled=!movable(entry);
        return row;
      }));
      if(!listed.length)column.rows.append(element('p','warehouse-empty','沒有符合條件的物品'));
      column.rows.scrollTop=previousScroll;
      column.count.textContent=withdraw?rows.length+' / '+OwnedInventory.warehouseCapacity:listed.length+' 格';
    }
    function render(message='',error=false){
      const owned=OwnedInventory.items,stored=OwnedInventory.storedItems;
      bagMoney.textContent=coinCount(owned).toLocaleString();
      storeMoney.textContent=coinCount(stored).toLocaleString();
      note.textContent=message;note.classList.toggle('is-error',error);
      renderColumn(bag,owned,false);renderColumn(storage,stored,true);
    }
    function updateTypes(){
      const categories=new Set([...OwnedInventory.items,...OwnedInventory.storedItems]
        .filter(entry=>entry.key!==COINS&&(!kind.value||entry.item.kind===kind.value)).map(entry=>entry.item.type).filter(Boolean));
      type.replaceChildren(new Option('全部',''),...[...categories].sort().map(key=>new Option(types[key]||'其他',key)));
      render();
    }
    kind.onchange=updateTypes;type.onchange=wearable.onchange=search.oninput=()=>render();
    updateTypes();close.focus({preventScroll:true});
    return true;
  }
  return {open};
})();
