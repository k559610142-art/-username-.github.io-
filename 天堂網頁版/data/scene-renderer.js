let island=window.TALKING_ISLAND,scene=window.ISLAND_SCENE,terrain=Uint8Array.from(atob(island.tiles),c=>c.charCodeAt(0));
let worldX=island.spawn.x,worldY=island.spawn.y,zoom=.85,panX=0,panY=0;
let zoomChosen=false;
const viewStorageKey='lineage-web-locked-camera-v3';
try{const saved=JSON.parse(localStorage.getItem(viewStorageKey)||localStorage.getItem('lineage-web-fixed-scene-v2')||'null');if(saved&&Number.isInteger(saved.x)&&Number.isInteger(saved.y)&&saved.x>=32256&&saved.x<=32767&&saved.y>=32768&&saved.y<=33279&&tile(saved.x,saved.y)){worldX=saved.x;worldY=saved.y;if(Number.isFinite(saved.zoom)&&saved.zoom>=.3&&saved.zoom<=1.5){zoom=saved.zoom;zoomChosen=!!saved.zoomChosen}panX=Number.isFinite(saved.panX)?Math.max(-24576,Math.min(24576,saved.panX)):0;panY=Number.isFinite(saved.panY)?Math.max(-12288,Math.min(12288,saved.panY)):0}}catch{}
function saveView(){if(window.GameEntry?.saveActive)window.GameEntry.saveActive();try{localStorage.setItem(viewStorageKey,JSON.stringify({x:worldX,y:worldY,zoom,zoomChosen,panX,panY}))}catch{}}
addEventListener('pagehide',saveView);
const referenceSceneHeight = 480;
// Use the same native-pixel scale for terrain and actors, retaining the current actor size.
const referenceSceneZoom = .85 * 1.55;
function viewportLayout(w,h) {
  return {anchorY: .48, defaultZoom: 1};
}
function setZoom(){return zoom}
function recenter(){panX=0;panY=0;schedule()}
const game=document.querySelector('.game'),canvas=document.createElement('canvas');canvas.id='terrain';game.prepend(canvas);const ctx=canvas.getContext('2d');let root='assets/talking-island/';
const style=document.createElement('style');style.textContent=`#terrain{position:absolute;inset:0;width:100%;height:100%;background:#17251d}.grid,.path,.note{display:none}.actor{left:50%!important;top:48%!important;transition:none;margin-top:-32px}.maptools{position:absolute;right:20px;top:160px;display:flex;gap:6px}.maptools button{background:#142820e8;border:1px solid #b3c29277;border-radius:12px;color:#eef2df;min-width:44px;min-height:44px;font-size:18px}.maplegend{position:absolute;top:138px;left:20px;color:#e4ead5;background:#10251dd9;padding:8px 12px;font-size:11px;border-radius:10px;pointer-events:none}.fullmap{width:100%;height:auto;display:block;margin:12px auto;background:#000}.mapcaption{font-size:12px;color:#bdcbb2;line-height:1.7}.scene-status{position:absolute;left:50%;top:68%;transform:translateX(-50%);background:#10251dd9;padding:8px 14px;border-radius:20px;font-size:12px;pointer-events:none}.actor .body{transform:scale(.8);transform-origin:bottom center}.footer-note{background:#10251dc9;padding:2px 8px;border-radius:8px}@media(max-width:650px){.maptools{right:10px;top:145px}.maplegend{left:10px;top:120px;font-size:10px}.location strong{font-size:19px}.footer-note{font-size:8px}}`;document.head.append(style);
document.querySelector('.location').innerHTML='<small>MAP 0 / TALKING ISLAND</small><strong>說話之島</strong><small id="coordinates"></small>';
document.querySelector('.footer-note').textContent='場景：秋月天堂本機客戶端 · 通行：原模擬器 · 人物為示意';
const tools=document.createElement('div');tools.className='maptools';tools.innerHTML='<button id="overview" aria-label="全島地圖">地圖</button><button id="zoomIn" aria-label="放大地圖">＋</button><button id="zoomOut" aria-label="縮小地圖">−</button>';game.append(tools);
const legend=document.createElement('div');legend.className='maplegend';legend.textContent='說話之島村莊 · 原場景分頁';game.append(legend);
const status=document.createElement('div');status.className='scene-status';status.setAttribute('role','status');game.append(status);
let lastViewSavedAt=-Infinity;let sceneStarted=false, terrainDirty=true, paintedView=null;const cache=new Map();let frame=0;const preview=new Image();preview.onload=()=>{terrainDirty=true;schedule()};preview.src=window.GAME_ASSETS?.[root+'全島場景預覽.jpg']||root+'全島場景預覽.jpg';
function schedule(){if(!frame)frame=requestAnimationFrame(frameTime=>{frame=0;if(typeof navigationPath!=='undefined'&&navigationPath.length)advanceNavigation(frameTime,true);draw(frameTime);if(typeof refreshCharacter==='function')refreshCharacter(frameTime);const animating=movementAnimating();const navigating=typeof navigationPath!=='undefined'&&navigationPath.length>0;if(!animating&&!navigating||movementTime()-lastViewSavedAt>=1000){saveView();lastViewSavedAt=movementTime()}const target=project(worldX,worldY),needsFinalFrame=window.NativeWorld?.active&&renderedSceneView&&!animating&&!navigating&&(Math.abs(renderedSceneView.px-target[0])>.01||Math.abs(renderedSceneView.py-target[1])>.01);if(animating||navigating||needsFinalFrame)schedule()})}
function image(file){if(cache.has(file))return cache.get(file);const img=new Image();img.decoding='async';const item={img,ready:false,error:false};cache.set(file,item);img.onload=()=>{const ready=()=>{item.ready=true;terrainDirty=true;schedule()};if(typeof img.decode==='function')img.decode().then(ready,ready);else ready()};img.onerror=()=>{item.error=true;terrainDirty=true;schedule()};img.src=window.GAME_ASSETS?.[root+file]||root+file;return item}
function tile(wx,wy){const tx=wx-island.startX,ty=wy-island.startY;return tx<0||ty<0||tx>=island.width||ty>=island.height?0:terrain[ty*island.width+tx]}
function cameraPosition(){const p=visualWorldPosition();return project(p.x,p.y)}
let renderedSceneView=null;
function sceneViewAt(w,h,now=movementTime()){const layout=viewportLayout(w,h),scale=layout.defaultZoom,p=visualWorldPosition(now),[px,py]=project(p.x,p.y);return {width:w,height:h,anchorY:layout.anchorY,zoom:scale,px,py,ox:w/2-px*scale,oy:h*layout.anchorY-py*scale}}
var sceneBoxCache=null;new ResizeObserver(()=>{sceneBoxCache=null}).observe(game);addEventListener('resize',()=>{sceneBoxCache=null});
function getRenderedSceneView(){const r=sceneBoxCache||(sceneBoxCache=game.getBoundingClientRect());return renderedSceneView&&renderedSceneView.width===r.width&&renderedSceneView.height===r.height?renderedSceneView:sceneViewAt(r.width,r.height)}
function project(wx,wy){const x=wx-island.startX,y=wy-island.startY;return [(x+y)*24+24,(y-x+island.width)*12]}
function unproject(px,py){const a=(px-24)/24,b=py/12-island.width;return [island.startX+(a-b)/2,island.startY+(a+b)/2]}
function canTraverse(fromX,fromY,dx,dy){const exact=window.NativeCollision?.canTraverse(fromX,fromY,dx,dy);if(exact!==null&&exact!==undefined)return exact;const native=window.MainlandPassability?.canTraverse(fromX,fromY,dx,dy);if(native!==null&&native!==undefined)return native;const a=tile(fromX,fromY),b=tile(fromX+dx,fromY+dy);if(!b||(b&128))return false;if(dx===1&&dy===0)return !!(a&1);if(dx===-1&&dy===0)return !!(b&1);if(dx===0&&dy===-1)return !!(a&2);if(dx===0&&dy===1)return !!(b&2);if(dx===1&&dy===-1)return !!((tile(fromX,fromY-1)&1)||(tile(fromX+1,fromY)&2));if(dx===1&&dy===1)return !!(tile(fromX,fromY+1)&1);if(dx===-1&&dy===1)return !!(b&3);if(dx===-1&&dy===-1)return !!(tile(fromX-1,fromY)&2);return false}
function canStep(dx,dy){return canTraverse(worldX,worldY,dx,dy)}
function paintTerrainImage(img,left,top,width,height,view,pen=ctx){
  const scaleX=width/img.naturalWidth,scaleY=height/img.naturalHeight;
  const x=Math.max(0,Math.floor(-left/scaleX)),y=Math.max(0,Math.floor(-top/scaleY));
  const right=Math.min(img.naturalWidth,Math.ceil((view.width-left)/scaleX));
  const bottom=Math.min(img.naturalHeight,Math.ceil((view.height-top)/scaleY));
  if(right<=x||bottom<=y)return;
  pen.drawImage(img,x,y,right-x,bottom-y,left+x*scaleX,top+y*scaleY,(right-x)*scaleX,(bottom-y)*scaleY);
}
const terrainRaster=document.createElement('canvas'),terrainRasterPen=terrainRaster.getContext('2d',{alpha:false});
// Keep the opaque cached terrain on its own compositor layer. The original canvas remains the input surface.
terrainRaster.setAttribute('aria-hidden','true');terrainRaster.style.cssText='position:absolute;left:0;top:0;pointer-events:none;will-change:transform;transform-origin:0 0';game.insertBefore(terrainRaster,canvas);canvas.style.opacity='0';
const terrainForegroundRoot=document.createElement('div');terrainForegroundRoot.setAttribute('aria-hidden','true');terrainForegroundRoot.style.cssText='position:absolute;left:0;top:0;pointer-events:none;transform-origin:0 0;will-change:transform';canvas.before(terrainForegroundRoot);
function paintForegroundLayers(view,layers){
 const visible=new Set();for(const {p,item,layer}of layers){if(layer!=='foreground'||!item.ready)continue;const img=item.img;visible.add(img);if(img.parentNode!==terrainForegroundRoot){img.draggable=false;img.style.cssText='position:absolute;left:0;top:0;max-width:none;max-height:none;pointer-events:none;transform-origin:0 0;will-change:transform;image-rendering:pixelated';terrainForegroundRoot.append(img);delete img.dataset.terrainGeometry;}
 const signature=p.pixelOrigin[0]+','+p.pixelOrigin[1]+','+view.zoom;if(img.dataset.terrainGeometry!==signature){img.style.width=img.naturalWidth+'px';img.style.height=img.naturalHeight+'px';img.style.transform='translate3d('+(p.pixelOrigin[0]*view.zoom)+'px,'+(p.pixelOrigin[1]*view.zoom)+'px,0) scale('+(3072*view.zoom/img.naturalWidth)+','+(1536*view.zoom/img.naturalHeight)+')';img.dataset.terrainGeometry=signature;}
 }for(const img of [...terrainForegroundRoot.children])if(!visible.has(img))img.remove();terrainForegroundRoot.style.transform='translate3d('+view.ox+'px,'+view.oy+'px,0)';
}
const terrainPadding=256;
let terrainRasterView=null;
function paintCachedTerrain(view,layers,dpr,dirty){
  const previous=terrainRasterView;
  const shiftX=previous?(previous.px-view.px)*view.zoom:0;
  const shiftY=previous?(previous.py-view.py)*view.zoom:0;
  const rebuild=dirty||!previous||previous.width!==view.width||previous.height!==view.height||
    previous.zoom!==view.zoom||previous.dpr!==dpr||
    Math.abs(shiftX)>terrainPadding*.6||Math.abs(shiftY)>terrainPadding*.6;
  if(rebuild){
    const expanded={...view,width:view.width+terrainPadding*2,height:view.height+terrainPadding*2,
      ox:view.ox+terrainPadding,oy:view.oy+terrainPadding};
    const width=Math.ceil(expanded.width*dpr),height=Math.ceil(expanded.height*dpr);
    if(terrainRaster.width!==width||terrainRaster.height!==height){terrainRaster.width=width;terrainRaster.height=height;}
    terrainRasterPen.setTransform(dpr,0,0,dpr,0,0);terrainRasterPen.imageSmoothingEnabled=false;
    terrainRasterPen.fillStyle='#101b17';
    terrainRasterPen.fillRect(0,0,expanded.width,expanded.height);
    if(preview.complete&&preview.naturalWidth)paintTerrainImage(preview,expanded.ox,expanded.oy,(scene.paging?.fullNativePixels?.[0]||24576)*view.zoom,(scene.paging?.fullNativePixels?.[1]||12288)*view.zoom,expanded,terrainRasterPen);
    for(const {p,item,layer} of layers)if(item.ready&&layer!=='foreground')paintTerrainImage(item.img,p.pixelOrigin[0]*view.zoom+expanded.ox,p.pixelOrigin[1]*view.zoom+expanded.oy,3072*view.zoom,1536*view.zoom,expanded,terrainRasterPen);
    terrainRaster.style.width=expanded.width+'px';terrainRaster.style.height=expanded.height+'px';
    terrainRasterView={...view,dpr};
  }
  const offsetX=(terrainRasterView.px-view.px)*view.zoom;
  const offsetY=(terrainRasterView.py-view.py)*view.zoom;
  terrainRaster.style.transform='translate3d('+(-terrainPadding+offsetX)+'px,'+(-terrainPadding+offsetY)+'px,0)';paintForegroundLayers(view,layers);
}
function draw(frameTime=movementTime()){const rect=sceneBoxCache||(sceneBoxCache=game.getBoundingClientRect()),/* 效能：用 ResizeObserver 維護的快取，不每幀強制排版 */w=rect.width,h=rect.height,layout=viewportLayout(w,h),dpr=Math.min(devicePixelRatio||1,2),cw=Math.round(w*dpr),ch=Math.round(h*dpr);zoom=layout.defaultZoom;panX=0;panY=0;const view=sceneViewAt(w,h,frameTime),{px,py,ox,oy}=view;
if(window.NativeWorld?.render(view,dpr,frameTime))return;
if(terrainDirty===false&&paintedView&&paintedView.px===px&&paintedView.py===py&&paintedView.worldX===worldX&&paintedView.worldY===worldY&&paintedView.width===w&&paintedView.height===h&&canvas.width===cw&&canvas.height===ch)return;
const pageVisible=(p,margin)=>{const [x,y]=p.pixelOrigin;return x*zoom+ox<w+margin&&y*zoom+oy<h+margin&&(x+3072)*zoom+ox>-margin&&(y+1536)*zoom+oy>-margin};
const nearby=scene.pages.filter(p=>pageVisible(p,terrainPadding+96)),needed=new Set();let pending=0,errors=0;
const layers=[];for(const layer of ['file','foreground'])for(const p of nearby){if(!p[layer])continue;needed.add(p[layer]);const item=image(p[layer]);if(!pageVisible(p,terrainPadding))continue;layers.push({p,item,layer});if(item.error)errors++;else if(!item.ready)pending++}
// Commit a complete scene in one frame; never swap a cropped fallback, overview and partial layers.
if(sceneStarted||(!pending&&!errors)||(errors&&preview.complete&&preview.naturalWidth)){sceneStarted=true;if(canvas.width!==cw||canvas.height!==ch){canvas.width=cw;canvas.height=ch}ctx.setTransform(dpr,0,0,dpr,0,0);paintCachedTerrain(view,layers,dpr,terrainDirty);const actor=document.querySelector('#actor');actor.hidden=false;renderedSceneView=view;paintedView={...view,worldX,worldY};terrainDirty=false;actor.style.setProperty('left',(w/2)+'px','important');actor.style.setProperty('top',(h*layout.anchorY)+'px','important');}
for(const [file,item] of cache)if(!needed.has(file)&&cache.size>24){item.img.onload=null;item.img.onerror=null;item.img.src='';cache.delete(file)}
{const coord=`${worldX}, ${worldY} · ${((tile(worldX,worldY)&48)===16)?'安全區':'一般區'}`,el=document.querySelector('#coordinates');if(el.textContent!==coord)el.textContent=coord}status.hidden=!pending&&!errors;status.textContent=errors?'部分場景圖片讀取失敗，請確認完整解壓縮':`載入附近場景… ${pending}`;
}
function stepWorld(dx,dy,now=movementTime(),started=now){if(window.gameFlowState!=='playing'||window.PlayerStall?.active||window.NativeWorld?.loading||(typeof characterMovementBlocked==='function'&&characterMovementBlocked())||!movementReady(now))return false;if(!canStep(dx,dy))return false;startVisualStep(worldX+dx,worldY+dy,now,started);recenter();if(typeof onCharacterStep==='function')onCharacterStep(dx,dy);schedule();return true}
move=function(dx,dy,now=movementTime(),continuous=false){if(window.PlayerStall?.active)return false;if(typeof cancelNavigation==='function'&&navigationPath.length)cancelNavigation();if(!movementReady(now))return false;const d=dx===0&&dy===-1?[1,-1]:dx===0&&dy===1?[-1,1]:dx===1?[1,1]:[-1,-1],due=lastMovementAt+lastMovementDuration,started=continuous&&now-due>=0&&now-due<=Math.min(250,lastMovementDuration*.5)?due:now;return stepWorld(...d,now,started)};
document.querySelector('#zoomIn').onclick=()=>setZoom(zoom+.12);document.querySelector('#zoomOut').onclick=()=>setZoom(zoom-.12);
document.querySelector('#overview').onclick=()=>{previous=document.activeElement;document.querySelector('#panel').hidden=false;document.querySelector('#panelContent').innerHTML='<h2>說話之島 · 全島場景</h2><canvas class="fullmap" id="fullmap" width="2048" height="1024"></canvas><p class="mapcaption">說話之島。通行與安全區資料採用天地劫 Map 0，場景圖像採用目前的說話之島素材。</p><button id="home">回到村莊</button>';const c=document.querySelector('#fullmap').getContext('2d');const paint=()=>{c.drawImage(preview,0,0,2048,1024);const p=project(worldX,worldY);c.fillStyle='#fff';c.strokeStyle='#d24936';c.lineWidth=3;c.beginPath();c.arc(p[0]/12,p[1]/12,6,0,Math.PI*2);c.fill();c.stroke()};if(preview.complete&&preview.naturalWidth)paint();else preview.addEventListener('load',paint,{once:true});document.querySelector('#home').onclick=()=>{worldX=island.spawn.x;worldY=island.spawn.y;recenter();closePanel();toast('已回到說話之島村莊（本機展示）')};document.querySelector('#close').focus()};
function fixedSceneResize(){schedule()}
new ResizeObserver(fixedSceneResize).observe(game);fixedSceneResize();document.querySelector('#log').textContent='說話之島場景已接入。方向鍵／觸控移動；右上「地圖」查看全島。';
