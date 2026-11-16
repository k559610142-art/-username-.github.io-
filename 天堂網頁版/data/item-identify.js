// 鑑定卷軸（Appraisal_Reel；使用者 2026-11-16 選「只鑑定祝福／詛咒」）。
// 怪物掉落的祝福／詛咒物品在背包標 unid（owned-inventory.js addItems），只顯示原名；
// 使用鑑定卷軸 → 選一件未鑑定物品 → 消耗 1 張卷軸、拿掉 unid，名稱顯示「祝福…」或「受詛咒的…」。
// 載入順序：owned-inventory.js、blessed-item-names.js 之後；OwnedInventory.use 會先問 ItemIdentify.use。
const ItemIdentify=(()=>{
 const overlay=document.querySelector('#panel'),content=document.querySelector('#panelContent');
 const isScroll=key=>ITEM_USE_RULES.definitions[key]?.handler==='Appraisal_Reel';
 const pending=()=>OwnedInventory.items.filter(e=>e.unid&&e.item?.unidentified);
 function identify(scrollUid,targetUid){
  if(window.gameFlowState!=='playing'||CharacterActions.dead)return '';
  const next=OwnedInventory.snapshot,scroll=next.find(e=>e.uid===scrollUid),target=next.find(e=>e.uid===targetUid);
  if(!scroll||!isScroll(scroll.key))return '鑑定卷軸已用完。';if(!target?.unid)return '這件物品不需要鑑定。';
  delete target.unid;
  // 鑑定後和同種已鑑定的堆疊物品合併
  const rule=ITEM_USE_RULES.definitions[target.key],twin=rule?.stackable&&next.find(e=>e!==target&&e.key===target.key&&!e.unid&&!e.slot);
  if(twin){twin.count+=target.count;next.splice(next.indexOf(target),1);}
  if(--scroll.count===0)next.splice(next.indexOf(scroll),1);
  const item=INTERFACE_CATALOG.items.find(i=>i.kind+':'+i.id===target.key);
  if(!OwnedInventory.applyChange(next))return '儲存失敗，物品未變更。';
  toast('鑑定結果：'+(item?.name||'物品'));return item?.cursed?'這是受詛咒的物品！':'鑑定完成：'+(item?.name||'');
 }
 function open(scrollUid){
  const list=pending();if(!list.length){toast('背包裡沒有需要鑑定的物品。');return true;}
  cancelPointerGesture({preserveNavigation:true});
  overlay.classList.remove('classic-panel','reference-menu-panel','game-catalog-panel','map-overview-panel','bookmark-panel');overlay.classList.add('identify-panel');overlay.hidden=false;overlay.setAttribute('aria-label','鑑定卷軸');overlay.querySelector('#close').hidden=false;
  const title=uiElement('h2','identify-heading','鑑定卷軸'),note=uiElement('p','identify-note','選擇一件未鑑定的物品，消耗 1 張鑑定卷軸查明祝福或詛咒。'),message=uiElement('p','identify-message'),rows=uiElement('div','identify-list');message.setAttribute('role','status');
  content.replaceChildren(title,note,message,rows);
  function render(info=''){
   message.textContent=info;rows.replaceChildren();const items=pending(),scrolls=OwnedInventory.items.filter(e=>isScroll(e.key)).reduce((n,e)=>n+e.count,0);
   note.textContent='選擇一件未鑑定的物品，消耗 1 張鑑定卷軸（剩 '+scrolls+' 張）查明祝福或詛咒。';
   for(const e of items){const line=uiElement('div','identify-row'),icon=document.createElement('img'),name=uiElement('span','',e.item.name+(e.count>1?' × '+e.count:'')+'（未鑑定）'),go=uiElement('button','','鑑定');
    icon.src=e.item.icon||'';icon.alt='';go.type='button';go.disabled=!scrolls;go.onclick=()=>{const scroll=OwnedInventory.items.find(i=>isScroll(i.key));render(scroll?identify(scroll.uid,e.uid):'鑑定卷軸已用完。');};line.append(icon,name,go);rows.append(line);}
   if(!items.length)rows.append(uiElement('p','identify-note','沒有其他需要鑑定的物品。'));
  }
  render();overlay.scrollTop=0;return true;
 }
 const style=document.createElement('style');style.textContent='.reference-game #panel.identify-panel{z-index:25!important}.identify-heading{margin-right:100px!important}.identify-note,.identify-message{color:#dbc99c;font-size:14px}.identify-message{color:#f0d77a;min-height:1.2em}.identify-list{display:flex;flex-direction:column;gap:6px}.identify-row{display:flex;align-items:center;gap:10px;padding:6px 8px;background:#122431;border:1px solid #4a5560}.identify-row img{width:32px;height:32px;object-fit:contain}.identify-row span{flex:1;color:#eee1b8}.identify-row button{min-height:40px;min-width:72px}';document.head.append(style);
 new MutationObserver(()=>{if(overlay.hidden||!content.querySelector('.identify-heading'))overlay.classList.remove('identify-panel')}).observe(overlay,{attributes:true,childList:true,subtree:true,attributeFilter:['hidden']});
 // 回傳 null＝不是鑑定卷軸，交給其他道具處理
 function use(uid){const e=OwnedInventory.items.find(i=>i.uid===uid);if(!e||!isScroll(e.key))return null;if(window.gameFlowState!=='playing'||CharacterActions.dead)return false;return open(uid);}
 return {use,identify,open,get pending(){return pending()}};
})();window.ItemIdentify=ItemIdentify;
