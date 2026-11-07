const IslandNpcServices = (() => {
  const panel = document.querySelector('#panel');
  const content = document.querySelector('#panelContent');
  const catalog = new Map(INTERFACE_CATALOG.items.map(item=>[item.id,item]));
  const button = (label,action) => {
    const control = uiElement('button','classic-use',label);
    control.type = 'button';
    control.onclick = action;
    return control;
  };
  function open(id) {
    if (CharacterActions.dead || window.gameFlowState !== 'playing') return;
    if(DBGameRules.craftNpcs().has(id))return DBGameRules.openCrafting(id);
    const warehouse = id === 60001;
    const title = warehouse ? '倉庫管理員 · 朵琳' : '雜貨商 · 潘朵拉';
    let secondary = false;
    cancelPointerGesture({preserveNavigation:true});
    panel.classList.remove('classic-panel','reference-menu-panel','game-catalog-panel');
    panel.setAttribute('aria-label',title);
    panel.querySelector('#close').hidden = false;
    panel.hidden = false;
    const heading = uiElement('h2','',title);
    const tabs = uiElement('div','');
    const list = uiElement('div','');
    list.style.cssText = 'display:grid;gap:6px;max-height:50dvh;overflow:auto';
    const message = uiElement('p','');
    message.setAttribute('role','status');
    const primary = button(warehouse?'存入道具':'購買',()=>{secondary=false;render();});
    const other = button(warehouse?'領取道具':'出售',()=>{secondary=true;render();});
    tabs.append(primary,other);
    const intro = uiElement('p','',warehouse ? islandNpcServiceData.feeLine : '依天地劫潘朵拉的商品與天幣價格交易。');
    content.replaceChildren(heading,intro,tabs,message,list);
    function render(note='') {
      const purse = OwnedInventory.items.find(e=>e.key==='etcitem:40308')?.count||0;
      message.textContent = (note?note+'　':'')+'持有天幣 '+purse;
      primary.setAttribute('aria-pressed',String(!secondary));
      other.setAttribute('aria-pressed',String(secondary));
      list.replaceChildren();
      if (warehouse) {
        const rows = secondary ? OwnedInventory.storedItems : OwnedInventory.items.filter(e=>!e.slot);
        for (const item of rows) {
          const label = (secondary?'領取 ':'存入 ')+item.item.name+' × '+item.count;
          list.append(button(label,()=>render(OwnedInventory.transfer(item.uid,secondary,islandNpcServiceData.fee)||'已完成。')));
        }
      } else {
        for (const [itemId,,buy,pack,sell,enchant] of islandNpcServiceData.shop) {
          const item = catalog.get(itemId), price = secondary?sell:buy, count = secondary?1:Math.max(1,pack);
          if (!item || price < 0 || enchant || secondary&&!OwnedInventory.items.some(e=>!e.slot&&e.item.id===itemId)) continue;
          const key=item.kind+':'+item.id;
          list.append(button(item.name+' × '+count+' · '+price+' 天幣',()=>render(OwnedInventory.trade(key,count,price,secondary)||'交易完成。')));
        }
      }
      if (!list.children.length) list.append(uiElement('p','',warehouse ? '沒有可移動的道具。' : '沒有可交易的道具。'));
    }
    render();
    primary.focus();
  }
  return {open};
})();
