const IslandNpcServices = (() => {
  const panel = document.querySelector('#panel');
  const iconOverrides={"592":"assets/interface/client-icons/592.png","3847":"assets/interface/client-icons/3847.png","4074":"assets/interface/client-icons/4074.png","4076":"assets/interface/client-icons/4076.png","5783":"assets/interface/client-icons/5783.png","5826":"assets/interface/client-icons/5826.png","7090":"assets/interface/client-icons/7090.png","8519":"assets/interface/client-icons/8519.png","9137":"assets/interface/client-icons/9137.png","9138":"assets/interface/client-icons/9138.png","15008":"assets/interface/client-icons/15008.png"};
  for(const item of INTERFACE_CATALOG.items)if(!item.icon&&iconOverrides[item.gfx])item.icon=iconOverrides[item.gfx];
  const content = document.querySelector('#panelContent');
  const catalog = new Map(INTERFACE_CATALOG.items.map(item=>[item.id,item]));
  const dollCatalog = new Map(INTERFACE_CATALOG.items.filter(item=>item.kind==='etcitem'&&DOLL_RESALE_PRICES.has(item.id)).map(item=>[item.id,item]));
  const button = (label,action) => {
    const control = uiElement('button','classic-use',label);
    control.type = 'button';
    control.onclick = action;
    return control;
  };
  function open(id,service=null) {
    if (CharacterActions.dead || window.gameFlowState !== 'playing') return;
    if(!service)return NativeNpcDialogs.open(id);
    if(service==='craft')return CraftingWindow.open(); // 製作只在玩家身上的製作清單
    if(islandMonsterTemplates[id]?.kind==='L1Dwarf')return WarehouseWindow.open(islandNpcServiceData.fee);
    const shopRows=NativeNpcDialogs.shop(id);if(!shopRows.length){NativeNpcDialogs.open(id);return NativeNpcDialogs.message('此 NPC 沒有設定商品。')}if((NativeNpcDialogs.profile(id)?.currency||40308)!==40308){NativeNpcDialogs.open(id);return NativeNpcDialogs.message('此商店使用特殊貨幣，目前尚未接入交易。')}
    const title = NativeNpcDialogs.title(id);
    let secondary = service==='sell';
    cancelPointerGesture({preserveNavigation:true});
    panel.classList.remove('classic-panel','reference-menu-panel','game-catalog-panel');
    panel.setAttribute('aria-label',title);
    panel.querySelector('#close').hidden = false;
    panel.hidden = false;
    const heading = uiElement('h2','',title);
    const tabs = uiElement('div','npc-shop-tabs');
    const list = uiElement('div','npc-shop-list');
    panel.classList.add('npc-shop-panel');panel.classList.toggle('npc-shop-compact',game.getBoundingClientRect().height<300);
    list.style.cssText = 'display:grid;gap:6px;max-height:50dvh;overflow:auto';
    const message = uiElement('p','');
    message.setAttribute('role','status');
    const primary = button('購買',()=>{secondary=false;render();});
    const other = button('出售',()=>{secondary=true;render();});
    tabs.append(primary,other);
    const intro = uiElement('p','','商品與價格依此 NPC 的原始設定。');
    content.replaceChildren(heading,intro,tabs,message,list);
    function render(note='') {
      const purse = OwnedInventory.items.find(e=>e.key==='etcitem:40308')?.count||0;
      message.textContent = (note?note+'　':'')+'持有天幣 '+purse;
      primary.setAttribute('aria-pressed',String(!secondary));
      other.setAttribute('aria-pressed',String(secondary));
      list.replaceChildren();
      const rows=secondary?[...shopRows,...Array.from(DOLL_RESALE_PRICES,([id,price])=>[id,0,-1,1,price,0]).filter(([id])=>!shopRows.some(row=>row[0]===id&&row[4]>=0&&!row[5]))]:shopRows;
      for (const [itemId,,buy,pack,sell,enchant] of rows) {
        const item = (secondary?dollCatalog.get(itemId):null)||catalog.get(itemId);
        const price = secondary?sell:buy, count = secondary?1:Math.max(1,pack);
        if (!item || price < 0 || enchant || secondary&&!OwnedInventory.items.some(e=>!e.slot&&e.item.id===itemId)) continue;
        const key=item.kind+':'+item.id;
        const row=uiElement('div','npc-shop-row'),product=uiElement('div','npc-shop-product'),image=itemIcon(item),info=uiElement('div','npc-shop-info'),name=uiElement('strong','',item.name),unit=uiElement('small','',count>1?'每組 '+count+' 個':'每個');
        row.dataset.itemId=String(item.id);product.append(image,info);info.append(name,unit);
        const controls=uiElement('div','npc-shop-controls'),priceText=uiElement('span','npc-shop-unit-price',price.toLocaleString()+' 天幣／'+(count>1?'組':'個')),picker=uiElement('div','npc-shop-quantity'),less=button('−',()=>change(-1)),more=button('＋',()=>change(1)),quantity=uiElement('input'),total=uiElement('strong','npc-shop-total'),action=button(secondary?'出售':'購買',()=>{
          const n=readQuantity();if(n===null)return;render(OwnedInventory.trade(key,count*n,price*n,secondary)||'交易完成。');
        });
        quantity.type='number';quantity.min='1';quantity.step='1';quantity.value='1';quantity.inputMode='numeric';quantity.setAttribute('aria-label',item.name+(count>1?'購買組數':'數量'));less.setAttribute('aria-label','減少數量');more.setAttribute('aria-label','增加數量');
        const owned=OwnedInventory.items.filter(e=>e.key===key&&!e.slot).reduce((sum,e)=>sum+e.count,0),limit=Math.max(0,Math.min(9999,Math.floor(2147483647/count),price?Math.floor(2147483647/price):9999,secondary?owned:price?Math.floor(purse/price):9999));quantity.max=String(Math.max(1,limit));
        function readQuantity(){const n=Number(quantity.value);return Number.isSafeInteger(n)&&n>=1&&n<=limit?n:null;}
        function update(){const n=readQuantity();total.textContent=n===null?'數量超出範圍':'合計 '+(price*n).toLocaleString()+' 天幣'+(count>1?' · '+(count*n).toLocaleString()+' 個':'');action.disabled=n===null;less.disabled=Number(quantity.value)<=1;more.disabled=Number(quantity.value)>=limit;}
        function change(delta){quantity.value=String(Math.max(1,Math.min(Math.max(1,limit),(Number(quantity.value)||1)+delta)));update();}
        quantity.oninput=update;picker.append(less,quantity,more);controls.append(priceText,picker,total,action);row.append(product,controls);list.append(row);update();
      }
      if (!list.children.length) list.append(uiElement('p','','沒有可交易的道具。'));
    }
    render();
    primary.focus();
  }
  new MutationObserver(()=>{if(panel.hidden||!content.querySelector('.npc-shop-list'))panel.classList.remove('npc-shop-panel','npc-shop-compact')}).observe(panel,{attributes:true,childList:true,subtree:true,attributeFilter:['hidden']});
  new ResizeObserver(()=>{if(panel.classList.contains('npc-shop-panel'))panel.classList.toggle('npc-shop-compact',game.getBoundingClientRect().height<300)}).observe(game);
  return {open};
})();
