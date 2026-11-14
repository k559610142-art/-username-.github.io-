// 點地尋路：使用原始地圖的八方向通行規則，不直接改寫到目的地。
let navigationPath=[],navigationTarget=null;
const navigationDirections=[[1,-1],[1,0],[1,1],[0,1],[-1,1],[-1,0],[-1,-1],[0,-1]];
let walkingSearch=null;
function findWalkingPath(startX,startY,targetX,targetY){
 const ox=island.startX,oy=island.startY,w=island.width,h=island.height,cell=tile(targetX,targetY);
 if(!Number.isInteger(targetX)||!Number.isInteger(targetY)||(!cell||(cell&128))&&!window.NativeCollision?.isEntrance(window.activeMapId||0,targetX,targetY))return null;
 if(startX===targetX&&startY===targetY)return [];
 if(window.NavigationConnectivity&&!NavigationConnectivity.canReach(startX,startY,targetX,targetY))return null;
 const straight=[];let sx=startX,sy=startY;
 while(sx!==targetX||sy!==targetY){const dx=Math.sign(targetX-sx),dy=Math.sign(targetY-sy);if(!canTraverse(sx,sy,dx,dy))break;sx+=dx;sy+=dy;straight.push([sx,sy]);}
 if(sx===targetX&&sy===targetY)return straight;
 if(!walkingSearch||walkingSearch.size!==w*h)walkingSearch={size:w*h,stamp:0,marks:new Uint32Array(w*h),closed:new Uint32Array(w*h),cost:new Int32Array(w*h),previous:new Int32Array(w*h),heap:new Int32Array(w*h),position:new Int32Array(w*h),heuristic:new Int32Array(w*h)};
 const data=walkingSearch;if(++data.stamp>=4294967295){data.marks.fill(0);data.closed.fill(0);data.stamp=1;}const stamp=data.stamp;
 const start=(startY-oy)*w+startX-ox,goal=(targetY-oy)*w+targetX-ox,heap=data.heap;let count=0;
 const less=(a,b)=>data.cost[a]+data.heuristic[a]<data.cost[b]+data.heuristic[b]||data.cost[a]+data.heuristic[a]===data.cost[b]+data.heuristic[b]&&data.heuristic[a]<data.heuristic[b];
 function push(id){let i=data.position[id];if(i<0)i=count++;while(i){const parent=(i-1)>>1;if(!less(id,heap[parent]))break;heap[i]=heap[parent];data.position[heap[i]]=i;i=parent;}heap[i]=id;data.position[id]=i;}
 function pop(){const first=heap[0],last=heap[--count];data.position[first]=-1;if(count){let i=0;while(i*2+1<count){let child=i*2+1;if(child+1<count&&less(heap[child+1],heap[child]))child++;if(!less(heap[child],last))break;heap[i]=heap[child];data.position[heap[i]]=i;i=child;}heap[i]=last;data.position[last]=i;}return first;}
 data.marks[start]=stamp;data.cost[start]=0;data.previous[start]=start;const heuristic=(x,y)=>Math.max(Math.abs(targetX-x),Math.abs(targetY-y));const initial=heuristic(startX,startY);data.heuristic[start]=initial;data.position[start]=-1;push(start);
 while(count){const id=pop();if(data.closed[id]===stamp)continue;if(id===goal){const route=[];for(let p=goal;p!==start;p=data.previous[p])route.push([p%w+ox,Math.floor(p/w)+oy]);return route.reverse();}data.closed[id]=stamp;const x=id%w+ox,y=Math.floor(id/w)+oy;
  for(const [dx,dy]of navigationDirections){const nx=x+dx,ny=y+dy;if(nx<ox||ny<oy||nx>=ox+w||ny>=oy+h||!canTraverse(x,y,dx,dy))continue;const next=(ny-oy)*w+nx-ox,cost=data.cost[id]+1;if(data.closed[next]===stamp||data.marks[next]===stamp&&data.cost[next]<=cost)continue;if(data.marks[next]!==stamp){data.position[next]=-1;data.heuristic[next]=heuristic(nx,ny);}data.marks[next]=stamp;data.cost[next]=cost;data.previous[next]=id;push(next);}
 }
 return null;
}
function cancelNavigation(){navigationPath=[];navigationTarget=null;paintNavigationTarget()}
function advanceNavigation(now=movementTime(),continuous=false){if(!movementReady(now)||(typeof characterMovementBlocked==='function'&&characterMovementBlocked()))return;const due=lastMovementAt+lastMovementDuration;const started=continuous&&now-due<=Math.min(250,lastMovementDuration*.5)?due:now;/* 畫面偶爾卡一下（≤250ms）時下一步仍接在上一步結束點，不會停頓後才起步 */const next=navigationPath.shift();if(!next){cancelNavigation();return}if(!stepWorld(next[0]-worldX,next[1]-worldY,now,started)){cancelNavigation();toast('前方無法通行，請重新選擇位置');return}if(!navigationPath.length)cancelNavigation()}
// Reverse an in-flight edge from the current visual position, retaining native speed.
function reverseWalkingEdge(targetX,targetY,now=movementTime()){
 if(!movementAnimating(now)||characterMovementBlocked())return null;
 const old=movementTween,p=visualWorldPosition(now),dx=old.toX-old.fromTileX,dy=old.toY-old.fromTileY;
 if(!dx&&!dy||(targetX-p.x)*dx+(targetY-p.y)*dy>=-.001||!canTraverse(old.toX,old.toY,-dx,-dy))return null;
 const route=findWalkingPath(old.fromTileX,old.fromTileY,targetX,targetY);if(!route)return null;
 const length=Math.hypot(dx,dy),distance=Math.hypot(p.x-old.fromTileX,p.y-old.fromTileY),duration=Math.max(1,MovementConfig.stepMs*distance/length);
 const x=old.fromTileX,y=old.fromTileY;worldX=x;worldY=y;
 movementTween={fromX:p.x,fromY:p.y,fromTileX:old.toX,fromTileY:old.toY,toX:x,toY:y,started:now,duration};markMovementStep(now,duration);
 onCharacterStep(-dx,-dy);characterWalkDuration=MovementConfig.stepMs;characterWalkUntil=now+duration;
 return route;
}
// A click on a wall edge should still approach the nearest reachable ground.
function resolveWalkingClick(x,y){
 const direct=findWalkingPath(worldX,worldY,x,y);if(direct)return {x,y,route:direct};if(window.activeMapId!==4)return null;
 const [px,py]=project(x,y);for(let radius=1;radius<=3;radius++){
  const candidates=[];for(let dy=-radius;dy<=radius;dy++)for(let dx=-radius;dx<=radius;dx++){if(Math.max(Math.abs(dx),Math.abs(dy))!==radius)continue;const tx=x+dx,ty=y+dy;if(!tile(tx,ty)||(tile(tx,ty)&128)||window.NavigationConnectivity&&!NavigationConnectivity.canReach(worldX,worldY,tx,ty))continue;const q=project(tx,ty);candidates.push({x:tx,y:ty,score:Math.hypot(q[0]-px,q[1]-py),distance:Math.max(Math.abs(tx-worldX),Math.abs(ty-worldY))});}
  candidates.sort((a,b)=>a.score-b.score||a.distance-b.distance);for(const p of candidates){const route=findWalkingPath(worldX,worldY,p.x,p.y);if(route)return {...p,route};}
 }return null;
}
function navigateTo(x,y,quiet=false){if(window.gameFlowState!=='playing'||typeof characterDead!=='undefined'&&characterDead)return false;if(window.PlayerStall?.active){if(!quiet)toast('擺攤中不能移動，請先收攤。');return false}if(navigationTarget&&navigationTarget[0]===x&&navigationTarget[1]===y&&navigationPath.length)return true;const target=resolveWalkingClick(x,y);if(!target){if(!quiet)toast('這個位置沒有可通行的路徑');return false}x=target.x;y=target.y;const route=target.route;const reversed=reverseWalkingEdge(x,y);cancelNavigation();if(reversed){navigationPath=reversed;navigationTarget=reversed.length?[x,y]:null;paintNavigationTarget();schedule();return true;}if(!route.length)return true;navigationPath=route;navigationTarget=[x,y];advanceNavigation();paintNavigationTarget();if(navigationPath.length)schedule();return true}
function screenToWorld(point){const view=getRenderedSceneView();return unproject((point.x-view.ox)/view.zoom,(point.y-view.oy)/view.zoom).map(Math.round)}
const navigationMarker=document.createElement('div');navigationMarker.setAttribute('aria-hidden','true');navigationMarker.className='navigation-target';navigationMarker.hidden=true;game.append(navigationMarker);
const navigationStyle=document.createElement('style');navigationStyle.textContent='.navigation-target{position:absolute;width:30px;height:16px;border:2px solid #f0d086;border-radius:50%;box-shadow:0 0 10px #ffe2a1aa;transform:translate(-50%,-50%);pointer-events:none;z-index:1}#terrain{cursor:default}';document.head.append(navigationStyle);
function paintNavigationTarget(){navigationMarker.hidden=!navigationTarget;if(!navigationTarget)return;const view=getRenderedSceneView(),[tx,ty]=project(...navigationTarget);navigationMarker.style.left=(view.ox+tx*view.zoom)+'px';navigationMarker.style.top=(view.oy+ty*view.zoom)+'px'}
const navigationDraw=draw;draw=function(frameTime){navigationDraw(frameTime);paintNavigationTarget()};
const pauseManualNavigation=()=>{if(window.IslandCombat?.mode!=='auto')cancelNavigation()};addEventListener('blur',pauseManualNavigation);addEventListener('pagehide',cancelNavigation);document.addEventListener('visibilitychange',()=>{if(document.hidden)pauseManualNavigation()});

function navigateToAny(targets,radius){
  if(window.gameFlowState!=='playing'||!targets.length)return false;
  const width=island.width,ox=island.startX,oy=island.startY;
  const id=(x,y)=>(y-oy)*width+x-ox;
  const start=id(worldX,worldY),goals=new Set(targets.map(([x,y])=>id(x,y)));
  if(goals.has(start))return true;
  const previous=new Int32Array(width*island.height);previous.fill(-1);previous[start]=start;
  const queue=[start];let found=null;
  for(let head=0;head<queue.length&&found===null;head++){
    const cell=queue[head],x=cell%width+ox,y=Math.floor(cell/width)+oy;
    for(const [dx,dy]of navigationDirections){
      const nx=x+dx,ny=y+dy;
      if(nx<ox||ny<oy||nx>=ox+width||ny>=oy+island.height||Math.max(Math.abs(nx-worldX),Math.abs(ny-worldY))>radius||!canTraverse(x,y,dx,dy))continue;
      const next=id(nx,ny);if(previous[next]!==-1)continue;
      previous[next]=cell;
      if(goals.has(next)){found=next;break;}
      queue.push(next);
    }
  }
  if(found===null)return false;
  const route=[];for(let cell=found;cell!==start;cell=previous[cell])route.push([cell%width+ox,Math.floor(cell/width)+oy]);
  route.reverse();cancelNavigation();navigationPath=route;navigationTarget=route.at(-1);
  advanceNavigation();paintNavigationTarget();if(navigationPath.length)schedule();return true;
}
