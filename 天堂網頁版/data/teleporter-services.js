// Recreated web dialogue bound to the original npcaction IDs and XML route actions.
const TeleporterServices=(()=>{
 const overlay=document.querySelector('#panel'),content=document.querySelector('#panelContent');let busy=false,session=0;
 const style=document.createElement('style');style.textContent='.teleporter-routes{display:grid;gap:10px}.teleporter-routes button{min-height:52px;padding:12px;text-align:left;background:#24342a;border:1px solid #a28b55;color:#f0dfb7;font-size:16px}.teleporter-routes button:disabled{opacity:.5}.teleporter-message{min-height:24px;color:#e6bd77}.teleporter-description{font-size:16px;line-height:1.8}';document.head.append(style);
 function available(id){return window.gameFlowState==='playing'&&!CharacterActions.dead&&IslandMonsters.serviceNearby(id,6)&&!IslandNpcAi.cursed&&!window.playerItemState?.rooted&&!window.playerItemState?.paralyzed;}
 async function travel(id,action){
  if(busy||!available(id))return {ok:false,message:'請先走到傳送師身邊。'};
  const route=TELEPORTER_DATA.routes.find(r=>r.npcId===id&&r.action===action);if(!route)return {ok:false,message:'找不到傳送路線。'};
  const money=()=>OwnedInventory.snapshot.filter(e=>e.key==='etcitem:40308'&&!e.slot).reduce((n,e)=>n+e.count,0);if(money()<route.price)return {ok:false,message:'天幣不足，需要 '+route.price.toLocaleString()+' 天幣。'};
  busy=true;
  try{
   await WorldMaps.prepare(route.mapId,route.x,route.y);
   if(!available(id))return {ok:false,message:'已離開傳送師，未扣除天幣。'};
   const next=OwnedInventory.snapshot;let cost=route.price;for(let i=next.length-1;i>=0&&cost;i--){const e=next[i];if(e.key!=='etcitem:40308'||e.slot)continue;const n=Math.min(cost,e.count);cost-=n;e.count-=n;if(!e.count)next.splice(i,1);}if(cost)return {ok:false,message:'天幣不足，傳送取消。'};
   const before={mapId:window.activeMapId||0,x:worldX,y:worldY};WorldMaps.activate(route.mapId);
   if(!OwnedInventory.applyChange(next,{position:{x:route.x,y:route.y}})){WorldMaps.activate(before.mapId);worldX=before.x;worldY=before.y;resetMovementState();recenter();return {ok:false,message:'儲存失敗，傳送與扣款已取消。'};}
   WorldMaps.arrived();overlay.hidden=true;return {ok:true,mapId:route.mapId,x:route.x,y:route.y,price:route.price};
  }catch(e){return {ok:false,message:e.message||'傳送失敗，未扣除天幣。'};}finally{busy=false;}
 }
 function open(id){
  const npc=TELEPORTER_DATA.people.find(p=>p.id===id);if(!npc)return false;const token=++session;
  cancelPointerGesture({preserveNavigation:true});overlay.classList.remove('classic-panel','reference-menu-panel','game-catalog-panel','npc-shop-panel','map-overview-panel');overlay.setAttribute('aria-label','傳送師 · '+npc.name);overlay.querySelector('#close').hidden=false;overlay.hidden=false;
  const heading=uiElement('h2','','傳送師 · '+npc.name),intro=uiElement('p','teleporter-description',npc.id===50015?'要前往亞丁大陸嗎？請選擇目的地。':npc.id===50017?'我可以送你前往火田村莊。':'要返回說話之島嗎？請選擇目的地。'),list=uiElement('div','teleporter-routes'),message=uiElement('p','teleporter-message');list.dataset.dialog=npc.priceDialog;intro.dataset.dialog=npc.dialog;
  if(!available(id))message.textContent='請先走到傳送師身邊（6 格內）。';
  for(const r of TELEPORTER_DATA.routes.filter(r=>r.npcId===id)){const b=uiElement('button','',r.name+'　'+r.price.toLocaleString()+' 天幣');b.type='button';b.dataset.action=r.action;b.disabled=!available(id);b.onclick=async()=>{for(const e of list.children)e.disabled=true;message.textContent='準備傳送…';const result=await travel(id,r.action);if(session!==token)return;if(!result.ok){message.textContent=result.message;for(const e of list.children)e.disabled=!available(id);}};list.append(b);}
  content.replaceChildren(heading,intro,list,message);overlay.scrollTop=0;return true;
 }
 return {open,travel,get busy(){return busy;}};
})();window.TeleporterServices=TeleporterServices;

