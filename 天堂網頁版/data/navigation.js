// 點地尋路：使用原始地圖的八方向通行規則，不直接改寫到目的地。
let navigationPath=[],navigationTarget=null;
const navigationDirections=[[1,-1],[1,0],[1,1],[0,1],[-1,1],[-1,0],[-1,-1],[0,-1]];
function findWalkingPath(startX,startY,targetX,targetY){
  const ox=island.startX,oy=island.startY,w=island.width,h=island.height;
  if(!Number.isInteger(targetX)||!Number.isInteger(targetY)||!tile(targetX,targetY))return null;
  const start=(startY-oy)*w+startX-ox,goal=(targetY-oy)*w+targetX-ox;
  if(start===goal)return [];
  const previous=new Int32Array(w*h);previous.fill(-1);previous[start]=start;
  const queue=new Int32Array(w*h);let head=0,tail=0;queue[tail++]=start;
  while(head<tail){const cell=queue[head++],x=cell%w+ox,y=Math.floor(cell/w)+oy;
    for(const [dx,dy] of navigationDirections){const nx=x+dx,ny=y+dy;if(nx<ox||ny<oy||nx>=ox+w||ny>=oy+h)continue;const next=(ny-oy)*w+nx-ox;if(previous[next]!==-1||!canTraverse(x,y,dx,dy))continue;previous[next]=cell;
      if(next===goal){const route=[];for(let c=goal;c!==start;c=previous[c])route.push([c%w+ox,Math.floor(c/w)+oy]);return route.reverse()}
      queue[tail++]=next;
    }
  }
  return null;
}
function cancelNavigation(){navigationPath=[];navigationTarget=null;paintNavigationTarget()}
function advanceNavigation(now=movementTime(),continuous=false){if(!document.querySelector('#panel').hidden){cancelNavigation();return}if(!movementReady(now)||(typeof characterMovementBlocked==='function'&&characterMovementBlocked()))return;const due=lastMovementAt+lastMovementDuration;const started=continuous&&now-due<=32?due:now;const next=navigationPath.shift();if(!next){cancelNavigation();return}if(!stepWorld(next[0]-worldX,next[1]-worldY,now,started)){cancelNavigation();toast('前方無法通行，請重新選擇位置');return}if(!navigationPath.length)cancelNavigation()}
function navigateTo(x,y,quiet=false){if(window.gameFlowState!=='playing'||typeof characterDead!=='undefined'&&characterDead)return false;if(navigationTarget&&navigationTarget[0]===x&&navigationTarget[1]===y&&navigationPath.length)return true;const route=findWalkingPath(worldX,worldY,x,y);if(!route){if(!quiet)toast('這個位置沒有可通行的路徑');return false}cancelNavigation();if(!route.length)return true;navigationPath=route;navigationTarget=[x,y];advanceNavigation();paintNavigationTarget();if(navigationPath.length)schedule();return true}
function screenToWorld(point){const view=getRenderedSceneView();return unproject((point.x-view.ox)/view.zoom,(point.y-view.oy)/view.zoom).map(Math.round)}
const navigationMarker=document.createElement('div');navigationMarker.setAttribute('aria-hidden','true');navigationMarker.className='navigation-target';navigationMarker.hidden=true;game.append(navigationMarker);
const navigationStyle=document.createElement('style');navigationStyle.textContent='.navigation-target{position:absolute;width:30px;height:16px;border:2px solid #f0d086;border-radius:50%;box-shadow:0 0 10px #ffe2a1aa;transform:translate(-50%,-50%);pointer-events:none;z-index:1}#terrain{cursor:default}';document.head.append(navigationStyle);
function paintNavigationTarget(){navigationMarker.hidden=!navigationTarget;if(!navigationTarget)return;const view=getRenderedSceneView(),[tx,ty]=project(...navigationTarget);navigationMarker.style.left=(view.ox+tx*view.zoom)+'px';navigationMarker.style.top=(view.oy+ty*view.zoom)+'px'}
const navigationDraw=draw;draw=function(frameTime){navigationDraw(frameTime);paintNavigationTarget()};
addEventListener('blur',cancelNavigation);addEventListener('pagehide',cancelNavigation);document.addEventListener('visibilitychange',()=>{if(document.hidden)cancelNavigation()});
