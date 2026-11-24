const BagDetails=(()=>{
 let current=null,pane=null,selectedUid=null,selectedState='';
 const style=document.createElement('style');style.textContent='.reference-game .bag-detail-floating{position:fixed;z-index:30;box-sizing:border-box;margin:0;padding:10px;background:#102332f5;border:1px solid #96896a;box-shadow:0 3px 16px #0009;overflow:auto;pointer-events:auto;overflow-wrap:anywhere}.reference-game .bag-detail-floating small{display:block}.reference-game .bag-detail-floating strong{font-size:14px}.reference-game .bag-detail-floating .classic-use{display:block;width:100%;min-height:40px;margin-top:6px;padding:6px;color:#e8d7a9;background:#263427;border:1px solid #8a7c4a;border-radius:3px;font-size:12px}';style.textContent+='.bag-gear-properties{display:grid;grid-template-columns:minmax(74px,auto) minmax(0,1fr);gap:5px 9px;margin:7px 0;padding:8px;color:#f2e7d0;background:#081724a0;border:1px solid #bba06a55;border-radius:4px;font-size:12px;line-height:1.45}.bag-gear-properties dt{color:#c4c8c2}.bag-gear-properties dd{margin:0;overflow-wrap:anywhere}.bag-gear-properties dd:empty{display:none}.classic-weapon-soul{color:#d9a8ff}';style.textContent += ".reference-game .bag-detail-floating{padding:0 12px 12px;border-radius:6px;background:#102332;font:14px/1.5 system-ui,sans-serif;overflow-wrap:break-word;overscroll-behavior:contain}\n.reference-game .bag-detail-floating .classic-detail-heading{position:sticky;top:0;z-index:1;display:flex;align-items:center;gap:8px;padding:7px 0;background:#102332;border-bottom:1px solid #96896a66}\n.reference-game .bag-detail-floating .classic-detail-heading img{width:32px;height:32px;object-fit:contain}\n.reference-game .bag-detail-floating .classic-detail-heading strong{flex:1;min-width:0;font-size:15px}\n.bag-detail-floating p{margin:5px 0}\n.bag-detail-close{min-height:44px;padding:4px 9px;flex:none;color:#f2e7d0;background:#263427;border:1px solid #8a7c4a;border-radius:4px;font:inherit}\n.bag-detail-floating .bag-gear-properties{grid-template-columns:minmax(0,1fr) minmax(0,1fr);gap:3px 10px;padding:6px 8px;font-size:14px}\n.bag-detail-actions{display:flex;flex-wrap:wrap;gap:6px;margin-top:6px}\n.reference-game .bag-detail-floating .bag-detail-actions button{flex:1 0 auto;width:auto;margin:0;min-height:44px;font-size:13px}";document.head.append(style);
 function hide(){selectedUid=null;selectedState='';if(current){current.remove();current=null;}pane=null;}
 function raise(){if(current&&pane?.isConnected)current.style.zIndex=String(window.FloatingWindows?.frontLevel()||30);}
 function position(){
  if(!current||!pane?.isConnected)return hide();
  const g=game.getBoundingClientRect(),p=pane.getBoundingClientRect(),width=Math.min(300,g.width-16);
  const adjacent=p.left-g.left>=width+16;
  current.style.width=width+'px';
  current.style.maxHeight=Math.min(g.height-16,Math.max(200,g.height*.55))+'px';
  const height=current.getBoundingClientRect().height;
  current.style.left=(adjacent?p.left-width-8:g.left+(g.width-width)/2)+'px';
  current.style.top=(adjacent?Math.max(g.top+8,Math.min(p.top,g.bottom-height-8)):g.bottom-height-8)+'px';
 }
 function show(detail,entry,bringToFront=true,origin){
  const next=detail===current?pane:origin;
  if(!next)return;
  if(current&&current!==detail)hide();
  pane=next;selectedUid=entry.uid;selectedState=JSON.stringify(entry);
  if(current!==detail){current=detail;detail.classList.add('bag-detail-floating');game.append(detail);}
  const close=document.createElement('button');
  close.type='button';close.className='bag-detail-close';close.textContent='關閉';close.onclick=hide;
  detail.querySelector('.classic-detail-heading').append(close);
  const actions=document.createElement('div');actions.className='bag-detail-actions';
  actions.append(...detail.querySelectorAll(':scope > .classic-use'));detail.append(actions);
  position();
  if(bringToFront)raise();
 }
 function restore(next){
  if(!current)return;
  const entry=OwnedInventory.items.find(item=>item.uid===selectedUid);
  if(!entry)return hide();
  pane=next;
  // 掛機補給或打怪更新背包時保留介紹節點，避免中斷正在操作的按鈕。
  if(JSON.stringify(entry)===selectedState){position();return;}
  const scroll=current.scrollTop;
  showItemDetails(entry.item,current,entry,false);
  current.scrollTop=scroll;
 }
 new MutationObserver(()=>{if(current&&(!pane?.isConnected))hide()}).observe(game,{attributes:true,childList:true,subtree:true,attributeFilter:['hidden']});
 addEventListener('resize',position);return {show,hide,position,raise,restore};
})();window.BagDetails=BagDetails;
