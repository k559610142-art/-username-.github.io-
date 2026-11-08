// Modeless game windows: equipment, inventory, status, skills and settings keep their own DOM.
const FloatingWindows=(()=>{
 const windows=new Map(),root=document.querySelector('#panel'),content=document.querySelector('#panelContent'),originalPanel=panel,originalClose=closePanel;
 const titles={bag:'背包',equipment:'裝備',status:'人物狀態',magic:'魔法',settings:'操作設定'};
 let active=null,level=40,suppressRoot=0,owner=null;
 const style=document.createElement('style');style.textContent='.floating-game-window{position:absolute;box-sizing:border-box;pointer-events:auto;color:#e3dcc3}.reference-game .floating-game-window>.classic-window{width:100%!important;height:100%!important;max-width:100%!important;max-height:100%!important;box-sizing:border-box;margin:0}.floating-game-window .classic-window-header,.floating-window-header{cursor:move;touch-action:none;user-select:none}.floating-game-window .classic-window-header{position:sticky;top:0;z-index:2;background:#1c303de8}.floating-game-window[data-window-type=bag]>.classic-window{display:flex;flex-direction:column}.floating-settings{border:1px solid #a49159;border-radius:5px;background:#14231ff5;box-shadow:0 7px 25px #0009;overflow:hidden}.floating-window-header{height:44px;display:flex;align-items:center;justify-content:space-between;padding:0 10px;background:#22352b;border-bottom:1px solid #8b8353;box-sizing:border-box}.floating-window-header h2{font-size:17px;margin:0;color:#e8c685}.floating-window-header button{width:36px;min-height:36px;padding:1px;background:#24352c;border:1px solid #948363;border-radius:3px;color:#f2dfb9;font-size:22px}.floating-window-content{height:calc(100% - 44px);overflow:auto;box-sizing:border-box;padding:12px;scrollbar-color:#ad9f7a #1a2a27}.floating-window-content button,.floating-window-content select,.floating-window-content input{min-height:40px;border:1px solid #95834b;border-radius:3px;background:#24352d;color:#eee1bd;padding:6px 10px}.floating-window-content p{font-size:13px;line-height:1.7}.floating-window-content label{font-size:13px}.floating-window-content .screen-settings{margin-top:0}.floating-window-content .screen-settings button{min-height:40px}.floating-game-window .classic-pager button{background:#21352f;color:#e5d5ae;border:1px solid #8a8260}.floating-game-window:focus{outline:none}';document.head.append(style);
 function front(rec){if(!rec)return;active=rec.type;rec.frame.style.zIndex=String(++level);if(['bag','equipment','status','magic'].includes(rec.type))classicTab=rec.type;}
 function geometry(rec,initial=false){
  const g=game.getBoundingClientRect(),W=g.width,H=g.height,side=Math.min(310,Math.max(220,W*.28)),width=rec.type==='settings'?Math.max(280,Math.min(600,W-2*side-32)):side;
  const top=Math.min(80,Math.max(58,H*.1)),q=shortcuts.getBoundingClientRect(),bottom=q.top>g.top+top+140?q.top-g.top-8:H-8;
  rec.width=Math.min(width,W-12);rec.height=Math.max(150,Math.min(rec.type==='settings'?560:620,bottom-top));
  if(initial||!rec.userPlaced){rec.x=rec.type==='equipment'?8:rec.type==='bag'?W-rec.width-8:(W-rec.width)/2;rec.y=top+(W<800&&rec.type==='settings'?18:0);}
  rec.x=Math.max(4,Math.min(W-rec.width-4,rec.x));rec.y=Math.max(4,Math.min(H-rec.height-4,rec.y));
  Object.assign(rec.frame.style,{left:rec.x+'px',top:rec.y+'px',width:rec.width+'px',height:rec.height+'px'});
 }
 function settingsBody(){
  const saved={attributes:[...root.attributes].map(a=>[a.name,a.value]),nodes:[...content.childNodes],scroll:root.scrollTop,closeHidden:document.querySelector('#close').hidden,previous};
  const fragment=document.createDocumentFragment();fragment.append(...saved.nodes);suppressRoot++;
  let nodes;
  try{originalPanel('settings');nodes=[...content.childNodes];for(const n of nodes)n.remove();}
  finally{content.replaceChildren(fragment);for(const a of [...root.attributes])root.removeAttribute(a.name);for(const [k,v]of saved.attributes)root.setAttribute(k,v);document.querySelector('#close').hidden=saved.closeHidden;root.scrollTop=saved.scroll;previous=saved.previous;queueMicrotask(()=>suppressRoot--);}
  const body=uiElement('div','floating-window-content');body.append(...nodes);body.querySelector('h2')?.remove();if(body.firstElementChild?.tagName==='SMALL')body.firstElementChild.remove();return body;
 }
 function render(rec){
  if(rec.dragging){rec.pendingRefresh=true;return;}
  const old=rec.frame.querySelector('.classic-window,.floating-window-content'),scroll=old?.scrollTop||0,gridScroll=rec.frame.querySelector('.classic-grid-scroll')?.scrollTop||0,focused=rec.frame.contains(document.activeElement)?document.activeElement:null,focusLabel=focused?.getAttribute('aria-label'),selection=focused?.selectionStart;
  let node;
  if(rec.type==='settings'){
   node=uiElement('div','floating-window-header');const title=uiElement('h2','',titles.settings),close=uiElement('button','','×');close.type='button';close.setAttribute('aria-label','關閉操作設定');close.onclick=()=>closeWindow(rec.type);node.append(title,close);rec.frame.replaceChildren(node,settingsBody());
  }else{
   loadPreviewEquipment();node=rec.type==='bag'?renderInventoryPane():rec.type==='equipment'?renderEquipmentPane():rec.type==='status'?renderStatusPane():renderMagicPane();if(rec.type==='bag')node.classList.add('inventory-window');if(rec.type==='equipment')node.classList.add('equipment-window');node.querySelector('.classic-close').onclick=()=>closeWindow(rec.type);rec.frame.replaceChildren(node);node=node.querySelector('.classic-window-header');
  }
  const restored=rec.frame.querySelector('.classic-window,.floating-window-content');if(restored)restored.scrollTop=scroll;const grid=rec.frame.querySelector('.classic-grid-scroll');if(grid)grid.scrollTop=gridScroll;
  if(focusLabel){const input=[...rec.frame.querySelectorAll('input,select,textarea')].find(el=>el.getAttribute('aria-label')===focusLabel);if(input){input.focus({preventScroll:true});if(typeof selection==='number'&&input.type==='search')input.setSelectionRange(selection,selection);}}
  bindDrag(rec,node);
 }
 function bindDrag(rec,head){
  let drag=null;
  head.addEventListener('pointerdown',e=>{if(e.button!==0||e.target.closest('button,input,select,a'))return;e.preventDefault();front(rec);rec.dragging=true;rec.userPlaced=true;drag={id:e.pointerId,x:e.clientX,y:e.clientY,left:rec.x,top:rec.y};head.setPointerCapture(e.pointerId);});
  head.addEventListener('pointermove',e=>{if(!drag||drag.id!==e.pointerId)return;rec.x=drag.left+e.clientX-drag.x;rec.y=drag.top+e.clientY-drag.y;geometry(rec);window.BagDetails?.position();});
  const end=()=>{drag=null;rec.dragging=false;if(rec.pendingRefresh){rec.pendingRefresh=false;render(rec);}};head.addEventListener('pointerup',end);head.addEventListener('pointercancel',end);head.addEventListener('lostpointercapture',end);
 }
 function open(type){
  if(window.gameFlowState!=='playing')return;
  if(owner!==window.activeCharacterId){closeAll();owner=window.activeCharacterId;}
  cancelPointerGesture({preserveNavigation:true});
  if(!root.hidden&&content.querySelector('.reference-menu-grid'))originalClose();
  let rec=windows.get(type);if(!rec){const frame=uiElement('section','floating-game-window'+(type==='settings'?' floating-settings':''));frame.dataset.windowType=type;frame.setAttribute('role','dialog');frame.setAttribute('aria-modal','false');frame.setAttribute('aria-label',titles[type]);frame.tabIndex=-1;rec={type,frame,x:0,y:0};windows.set(type,rec);game.append(frame);geometry(rec,true);render(rec);}else render(rec);
  root.setAttribute('aria-modal','false');front(rec);rec.frame.focus({preventScroll:true});
 }
 function closeWindow(type){const rec=windows.get(type);if(!rec)return;if(type==='bag')window.BagDetails?.hide();rec.frame.remove();windows.delete(type);if(active===type)active=null;}
 function closeAll(){for(const type of [...windows.keys()])closeWindow(type);}
 function refreshInventory(){for(const rec of windows.values())if(rec.type!=='settings')render(rec);}
 panel=function(type){if(Object.hasOwn(titles,type))return open(type);return originalPanel(type);};
 closePanel=function(){if(active&&windows.has(active))return closeWindow(active);return originalClose();};
 document.querySelector('#close').onclick=()=>{active=null;originalClose()};
 game.addEventListener('pointerdown',e=>{const host=e.target.closest('.floating-game-window');if(host){front(windows.get(host.dataset.windowType));}else if(!e.target.closest('.bag-detail-floating'))active=null;},true);
 function frontRoot(){if(!suppressRoot&&!root.hidden){active=null;root.style.setProperty('z-index',String(++level),'important');root.setAttribute('aria-modal','false');}}
 root.addEventListener('pointerdown',frontRoot,true);new MutationObserver(frontRoot).observe(root,{attributes:true,attributeFilter:['hidden']});new MutationObserver(frontRoot).observe(content,{childList:true});
 addEventListener('keydown',e=>{if(e.key!=='Escape')return;const rec=active&&windows.get(active);if(rec){e.preventDefault();e.stopImmediatePropagation();closeWindow(rec.type);}},true);
 new ResizeObserver(()=>{for(const rec of windows.values())geometry(rec);}).observe(game);
 return {open,close:closeWindow,closeAll,refreshInventory,frontLevel:()=>++level,get types(){return [...windows.keys()]}};
})();window.FloatingWindows=FloatingWindows;
