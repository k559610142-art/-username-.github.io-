// White icon-only tools for the owned inventory.
const InventoryTools=(()=>{
 let owner=null,selecting=false,selected=new Set(),toolbar=null,pane=null;
 const drawings={sort:'M5 6h14M5 12h10M5 18h6M19 12v9m-3-3 3 3 3-3',trash:'M3 6h18M9 6V3h6v3M5 6l1 15h12l1-15M10 10v7m4-7v7',check:'m4 12 5 5L20 6',cancel:'m6 6 12 12M18 6 6 18'};
 function button(label,glyph,action){const b=uiElement('button','inventory-tool');b.type='button';b.title=label;b.setAttribute('aria-label',label);b.innerHTML='<svg viewBox="0 0 24 24" aria-hidden="true"><path d="'+drawings[glyph]+'"/></svg>';b.onclick=action;return b;}
 function reset(){selecting=false;selected.clear();}
 function toggle(uid){if(!OwnedInventory.canDiscard(uid))return;selected.has(uid)?selected.delete(uid):selected.add(uid);}
 function update(){if(!toolbar)return;const sort=toolbar.querySelector('[data-tool=sort]'),trash=toolbar.querySelector('[data-tool=trash]'),check=toolbar.querySelector('[data-tool=check]'),cancel=toolbar.querySelector('[data-tool=cancel]'),count=toolbar.querySelector('.inventory-tools-count');sort.disabled=selecting;trash.setAttribute('aria-pressed',String(selecting));check.hidden=!selecting;cancel.hidden=!selecting;check.disabled=!selected.size;count.textContent=selecting?String(selected.size):'';count.setAttribute('aria-label','已選擇 '+selected.size+' 格');}
 function confirmDelete(){
  const entries=OwnedInventory.items.filter(e=>selected.has(e.uid));
  if(!entries.length||entries.some(e=>!OwnedInventory.canDiscard(e.uid)))return;
  if(!confirm('確定刪除以下 '+entries.length+' 格物品？堆疊物品將刪除整組，無法復原。\n\n'+entries.map(e=>e.item.name+' × '+e.count).join('\n')))return;
  const ids=entries.map(e=>e.uid);reset();if(!OwnedInventory.discard(ids)){selecting=true;selected=new Set(ids);panel('bag');}
 }
 function mount(next,refresh){
  if(owner!==window.activeCharacterId){owner=window.activeCharacterId;reset();}
  selected=new Set([...selected].filter(uid=>OwnedInventory.canDiscard(uid)));
  pane=next;toolbar=uiElement('div','inventory-tools');toolbar.setAttribute('role','toolbar');toolbar.setAttribute('aria-label','背包工具');
  const sort=button('整理背包','sort',()=>OwnedInventory.sortInventory());sort.dataset.tool='sort';
  const trash=button('選擇刪除','trash',()=>{selecting=!selecting;selected.clear();lastInventoryTap=null;refresh()});trash.dataset.tool='trash';
  const check=button('確認刪除所選物品','check',confirmDelete);check.dataset.tool='check';
  const cancel=button('取消選擇刪除','cancel',()=>{reset();refresh()});cancel.dataset.tool='cancel';
  const count=uiElement('span','inventory-tools-count');count.setAttribute('aria-live','polite');const auto=button('自動販賣','sort',()=>AutoSell.open());auto.innerHTML='<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 4h2l2 11h11l3-8H6M9 20h.01M17 20h.01M13 2v8m-3-3 3 3 3-3"/></svg>';auto.dataset.tool='auto-sell';toolbar.append(sort,trash,auto,check,cancel,count);update();return toolbar;
 }
 function fit(){
  const current=document.querySelector('.inventory-window');if(!current||current.closest('.floating-game-window'))return;
  const g=game.getBoundingClientRect(),p=current.getBoundingClientRect(),top=document.querySelector('#panel').getBoundingClientRect().top,q=shortcuts.getBoundingClientRect();
  let bottom=g.bottom-8;if(q.right>p.left&&q.left<p.right)bottom=Math.min(bottom,q.top-8);
  const compact=g.height<260;current.classList.toggle('inventory-tools-compact',compact);current.style.position=compact?'fixed':'';current.style.top=compact?(g.top+4)+'px':'';current.style.left=compact?Math.max(g.left+4,g.right-Math.min(310,g.width-8)-4)+'px':'';let height=Math.max(170,bottom-top);if(compact)height=g.height-8;current.style.height=height+'px';current.style.maxHeight=height+'px';
 }
 new ResizeObserver(fit).observe(game);
 new MutationObserver(()=>{if(!document.querySelector('.inventory-window'))reset();}).observe(game,{attributes:true,childList:true,subtree:true,attributeFilter:['hidden']});
 return {mount,update,fit,toggle,get selecting(){return selecting},get selected(){return selected}};
})();window.InventoryTools=InventoryTools;
