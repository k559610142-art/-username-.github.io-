// Portable paid travel; destination images load before a single inventory/position save.
window.PortableTeleport=(()=>{
 const routes=window.PORTABLE_TELEPORT_ROUTES||[],byId=new Map(routes.map(r=>[r.id,r]));
 const categories=[['village','村莊'],['field','外圍'],['island','島嶼'],['tower','高塔'],['dungeon','地監']];
 // 2026-11-22 島嶼／高塔／地監依 route.group 分組：點分組才列出樓層（只有一層的直接進詳細頁）
 let win=null,body=null,notice=null,tab='village',query='',selected=null,group=null,busy=false,session=0;
 const el=(tag,cls,text)=>{const n=document.createElement(tag);n.className=cls||'';if(text!==undefined)n.textContent=text;return n;};
 const button=(text,fn,cls='pt-button')=>{const n=el('button',cls,text);n.type='button';n.onclick=fn;return n;};
 const quick=button('',()=>{if(typeof closePanel==='function')closePanel();open();},'pt-quick');
 quick.setAttribute('aria-label','隨身傳送');quick.title='隨身傳送';
 const icon=el('img');icon.src='assets/interface/reference-skin/memory.png';icon.alt='';icon.draggable=false;
 quick.append(icon,el('span','','隨身傳送'));document.querySelector('.game').append(quick);
 const syncQuick=()=>{quick.hidden=window.gameFlowState!=='playing';};syncQuick();setInterval(syncQuick,500);
 const gold=()=>OwnedInventory.snapshot.filter(e=>e.key==='etcitem:40308'&&!e.slot).reduce((n,e)=>n+e.count,0);
 function blocked(){
  if(window.gameFlowState!=='playing'||!window.activeCharacterId)return '請先進入遊戲。';
  if(CharacterActions.dead)return '死亡時無法傳送。';
  if(window.PlayerStall?.active)return '請先收攤再傳送。';
  const state=window.playerItemState||{};
  if(window.IslandNpcAi?.cursed||state.teleportBlocked||state.rooted||state.paralyzed)return '目前狀態無法傳送。';
  const id=window.activeMapId||0,rules=(typeof TeleportMapRules!=='undefined'?TeleportMapRules[id]:null)||window.NATIVE_DUNGEON_MAPS?.[id]?.rules;
  if(!rules?.escapable||!rules.usableItem)return '目前地圖禁止隨身傳送。';
  return '';
 }
 function landing(route){
  for(let radius=0;radius<=8;radius++)for(let dy=-radius;dy<=radius;dy++)for(let dx=-radius;dx<=radius;dx++){
   if(Math.max(Math.abs(dx),Math.abs(dy))!==radius)continue;const x=route.x+dx,y=route.y+dy,t=WorldMaps.cell(route.mapId,x,y);
   if(!t||(t&128))continue;if(route.mapId===(window.activeMapId||0)&&IslandMonsters.occupied(x,y))continue;
   if(![[1,0],[-1,0],[0,1],[0,-1]].some(([a,b])=>{const result=window.NativeCollision?.canTraverse(x,y,a,b,route.mapId);return result===undefined||result===null?!!(t&15):result;}))continue;
   return {x,y};
  }return null;
 }
 function routeDrops(route){return [...new Set([...(window.DBGameRules?.supplementalDropNames(route.mapId)||[]),...route.drops])];}
 function matches(route,text){const q=text.trim().toLowerCase();return !q||[route.name,...route.monsters,...routeDrops(route)].some(s=>s.toLowerCase().includes(q));}
 async function travel(id){
  if(busy)return {ok:false,message:'正在準備傳送，請稍候。'};const route=byId.get(Number(id));if(!route)return {ok:false,message:'找不到傳送地點。'};
  let error=blocked();if(error)return {ok:false,message:error};const level=Number(window.activeCharacterLevel)||1;
  if(level<route.minLevel||level>route.maxLevel)return {ok:false,message:'此地點限制 Lv.'+route.minLevel+'～'+route.maxLevel+'。'};
  if(gold()<route.price)return {ok:false,message:'天幣不足，需要 '+route.price.toLocaleString()+' 天幣。'};
  if(typeof stopMovement==='function')stopMovement();if(typeof cancelNavigation==='function')cancelNavigation();window.IslandCombat?.stop();
  const owner=window.activeCharacterId,before={mapId:window.activeMapId||0,x:worldX,y:worldY},token=session;
  busy=true;let switched=false;render('正在讀取目的地…');
  try{
   const point=landing(route);if(!point)return {ok:false,message:'目的地沒有可用落點，未扣除天幣。'};
   await WorldMaps.prepare(route.mapId,point.x,point.y);
   if(token!==session||owner!==window.activeCharacterId||(window.activeMapId||0)!==before.mapId||worldX!==before.x||worldY!==before.y)return {ok:false,message:'角色或位置已變更，傳送取消，未扣除天幣。'};
   error=blocked();if(error)return {ok:false,message:error};const spot=landing(route);if(!spot||spot.x!==point.x||spot.y!==point.y)return {ok:false,message:'落點已變更，請重新傳送。'};
   const next=OwnedInventory.snapshot;let cost=route.price;for(let i=next.length-1;i>=0&&cost;i--){const row=next[i];if(row.key!=='etcitem:40308'||row.slot)continue;const amount=Math.min(cost,row.count);cost-=amount;row.count-=amount;if(!row.count)next.splice(i,1);}if(cost)return {ok:false,message:'天幣不足，傳送取消。'};
   if(!WorldMaps.activate(route.mapId))return {ok:false,message:'目的地目前無法開啟，未扣除天幣。'};switched=true;
   if(!OwnedInventory.applyChange(next,{position:point})){WorldMaps.activate(before.mapId);worldX=before.x;worldY=before.y;resetMovementState();recenter();switched=false;return {ok:false,message:'儲存失敗，傳送與扣款已取消。'};}switched=false;
   WorldMaps.arrived();IslandMonsters.playEffect(169,point.x,point.y,movementTime(),{follow:'player'});close();return {ok:true,price:route.price,mapId:route.mapId,...point};
  }catch(error){if(switched){WorldMaps.activate(before.mapId);worldX=before.x;worldY=before.y;resetMovementState();recenter();}return {ok:false,message:error.message||'讀取失敗，未扣除天幣。'};}finally{busy=false;if(win)render();}
 }
 function render(message=''){
  if(!win)return;notice.textContent=message;body.replaceChildren();win.querySelector('.pt-wallet').textContent='天幣 '+gold().toLocaleString();
  for(const b of win.querySelectorAll('[data-category]')){b.setAttribute('aria-selected',String(b.dataset.category===tab));b.disabled=busy;}
  if(selected){
   const route=selected;body.append(button(group?'‹ 返回 '+group:'‹ 返回地點列表',()=>{selected=null;render();}));body.append(el('h3','',route.name),el('p','pt-muted',WorldMaps.name(route.mapId)+' · '+route.x+', '+route.y));
   if(route.levels)body.append(el('p','', '附近怪物 Lv.'+route.levels.join('～')));
   if(route.minLevel>1||route.maxLevel<100)body.append(el('p','', '進入等級 Lv.'+route.minLevel+'～'+route.maxLevel));
   const go=button(busy?'讀取目的地中…':'傳送 · '+route.price.toLocaleString()+' 天幣',async()=>{const result=await travel(route.id);if(win&&!result.ok)render(result.message);},'pt-button pt-go');go.disabled=busy||!!blocked()||gold()<route.price;body.append(go);
   if(route.category==='island'&&route.monsterDetails?.length){body.append(el('h4','','原始怪物配置'));for(const m of route.monsterDetails)body.append(el('p','pt-monster',m.name+' · Lv.'+m.level+' · HP '+m.hp.toLocaleString()+' · '+m.count+' 隻 · 重生 '+m.respawn.join('～')+' 秒'));}else body.append(el('p','pt-muted',route.monsters.length?'怪物：'+route.monsters.slice(0,12).join('、'):'村莊／傳送據點'));
   body.append(el('h4','','掉落物'));const drops=el('div','pt-drops'),q=query.trim().toLowerCase(),available=routeDrops(route),filtered=available.filter(n=>n.toLowerCase().includes(q)),shown=(q&&filtered.length?filtered:available).slice(0,40);for(const name of shown)drops.append(el('span','',name));if(!shown.length)drops.append(el('p','pt-muted','此據點附近沒有已登錄的怪物掉落。'));body.append(drops);return;
  }
  const visible=routes.filter(r=>r.category===tab&&matches(r,query)&&(!group||r.group===group));
  if(group&&!query.trim()){body.append(button('‹ 返回'+(categories.find(c=>c[0]===tab)?.[1]||'')+'列表',()=>{group=null;render();}));body.append(el('h3','pt-group-title',group));}
  else if(!query.trim()){
   const groups=new Map();for(const r of visible){const k=r.group||'#'+r.id;if(!groups.has(k))groups.set(k,[]);groups.get(k).push(r);}
   if([...groups.values()].some(list=>list.length>1||list[0].group)){
    for(const list of groups.values()){
     if(list.length===1){const route=list[0],row=button('',()=>{selected=route;render();},'pt-route'),left=el('span','pt-destination');left.append(el('strong','',route.name),el('small','',route.levels?'Lv.'+route.levels.join('～'):route.category==='village'?'村莊／據點':'傳送據點'));row.append(left,el('span','pt-cost','◆ '+route.price.toLocaleString()),el('span','pt-arrow','›'));row.disabled=busy;body.append(row);continue;}
     const lv=list.flatMap(r=>r.levels||[]),prices=list.map(r=>r.price),row=button('',()=>{group=list[0].group;render();},'pt-route pt-group'),left=el('span','pt-destination');
     left.append(el('strong','',list[0].group),el('small','',list.length+(list.every(r=>/樓|dF/.test(r.name))?' 層':' 處')+(lv.length?' · Lv.'+Math.min(...lv)+'～'+Math.max(...lv):'')));
     row.append(left,el('span','pt-cost','◆ '+Math.min(...prices).toLocaleString()+(Math.max(...prices)>Math.min(...prices)?'～':'')),el('span','pt-arrow','›'));row.disabled=busy;body.append(row);
    }
    if(!visible.length)body.append(el('p','pt-empty','此分類沒有符合條件的地點。'));return;
   }
  }
  for(const route of visible){const row=button('',()=>{selected=route;render();},'pt-route'),left=el('span','pt-destination');left.append(el('strong','',route.name),el('small','',route.levels?'Lv.'+route.levels.join('～'):route.category==='village'?'村莊／據點':'傳送據點'));row.append(left,el('span','pt-cost','◆ '+route.price.toLocaleString()),el('span','pt-arrow','›'));row.disabled=busy;body.append(row);}
  if(!visible.length)body.append(el('p','pt-empty','此分類沒有符合條件的地點。'));
 }
 function close(){session++;win?.remove();win=body=notice=null;}
 function open(){
  if(window.gameFlowState!=='playing')return;session++;if(win){render();return;}win=el('section','portable-teleport');win.setAttribute('role','dialog');win.setAttribute('aria-label','隨身傳送');
  const head=el('div','pt-head');head.append(el('h2','','狩獵場'),button('✕',close,'pt-close'));head.lastChild.setAttribute('aria-label','關閉隨身傳送');
  const search=el('input','pt-search');search.type='search';search.placeholder='搜尋掉落物、怪物、地點';search.setAttribute('aria-label',search.placeholder);search.value=query;search.oninput=()=>{query=search.value;selected=null;if(query.trim())group=null;render();};
  const tabs=el('div','pt-tabs');tabs.setAttribute('role','tablist');for(const [key,label]of categories){const b=button(label,()=>{tab=key;selected=null;group=null;render();});b.dataset.category=key;b.setAttribute('role','tab');tabs.append(b);}
  body=el('div','pt-body');notice=el('p','pt-notice');notice.setAttribute('role','status');win.append(head,search,tabs,body,el('div','pt-wallet'),notice);document.querySelector('.game').append(win);selected=null;render();head.lastChild.focus();
 }
 document.addEventListener('keydown',e=>{if(e.key==='Escape'&&win){e.preventDefault();close();}});
  return {open,close,travel,matches,destination(id){const route=byId.get(Number(id));return route?landing(route):null;},get routes(){return routes;},get busy(){return busy;}};
})();
