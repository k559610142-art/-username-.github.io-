// Region backgrounds are pre-rendered lossless pictures. Collision and world coordinates stay native.
const RegionBackground=(()=>{
 const base='assets/region-background/',index=window.REGION_BACKGROUND_INDEX,dataCache=new Map(),stateCache=new Map(),stateReceivers=new Map(),images=new Map(),queue=[],receivers=new Map();
 let active=false,loading=false,current=null,currentId=null,viewNow=null,hidden=new Set(),cover=[],imageRevision=0,inFlight=0,warmKey='',lastForeground='',foregroundBox=null,originX=null,originY=null;
 const fill=document.createElement('div'),root=document.createElement('div'),front=document.createElement('canvas'),pen=front.getContext('2d');
 fill.className='region-background-fill';fill.style.cssText='position:absolute;inset:0;background:#101b17;pointer-events:none';
 root.className='region-background-pages';root.style.cssText='position:absolute;left:0;top:0;transform-origin:0 0;will-change:transform;pointer-events:none';
 front.className='region-background-foreground';front.style.cssText='position:absolute;inset:0;width:100%;height:100%;pointer-events:none;z-index:2';
 canvas.before(fill,root);game.append(front);fill.hidden=root.hidden=front.hidden=true;
 const nodes=new Map();
 const touch=()=>{imageRevision++;schedule();};
 function pump(){
  while(inFlight<6&&queue.length){
   const item=queue.shift();if(item.started)continue;item.started=true;inFlight++;
   const finish=()=>{inFlight--;pump();touch();};
   item.image.onload=()=>{
    const decoded=()=>{item.ready=true;item.bytes=item.image.naturalWidth*item.image.naturalHeight*4;item.resolve(item);finish();};
    if(item.image.decode)item.image.decode().then(decoded,decoded);else decoded();
   };
   item.image.onerror=()=>{item.failed=true;item.reject(Error('無法讀取分區地圖圖片：'+item.file));finish();};
   item.image.src=base+item.file;
  }
 }
 function image(file,priority=false){
  let item=images.get(file);
  if(item){item.used=movementTime();if(priority&&!item.started){const at=queue.indexOf(item);if(at>=0){queue.splice(at,1);queue.unshift(item);}pump();}return item;}
  const bitmap=new Image();bitmap.decoding='async';bitmap.draggable=false;
  item={file,image:bitmap,ready:false,failed:false,started:false,used:movementTime(),bytes:0};
  item.promise=new Promise((resolve,reject)=>{item.resolve=resolve;item.reject=reject;});item.promise.catch(()=>{});
  images.set(file,item);if(priority)queue.unshift(item);else queue.push(item);pump();return item;
 }
 window.__regionBackgroundReceive=(id,value)=>{const receive=receivers.get(id);if(receive){receivers.delete(id);receive(value);}};
 function mapData(id){
  if(dataCache.has(id))return dataCache.get(id);
  const entry={ready:false,value:null,error:null,promise:null};dataCache.set(id,entry);
  const descriptor=index?.maps[id];
  entry.promise=(!descriptor?Promise.reject(Error('這張地圖尚未轉換分區底圖。')):location.protocol==='file:'?new Promise((resolve,reject)=>{
   receivers.set(id,resolve);const script=document.createElement('script');script.src=base+descriptor.file+'.js';script.onload=()=>script.remove();script.onerror=()=>{receivers.delete(id);script.remove();reject(Error('分區地圖資料讀取失敗。'));};document.head.append(script);
  }):fetch(base+descriptor.file).then(response=>{if(!response.ok)throw Error('分區地圖資料讀取失敗。');return response.json();})).then(value=>{entry.ready=true;entry.value=value;touch();return value;}).catch(error=>{entry.error=error;touch();throw error;});
  entry.promise.catch(()=>{});return entry;
 }
 function visiblePages(data,v,margin=0){
  const size=data.size,left=(-v.ox-margin)/v.zoom,right=(v.width-v.ox+margin)/v.zoom,top=(-v.oy-margin)/v.zoom,bottom=(v.height-v.oy+margin)/v.zoom,result=[];
  for(let y=Math.floor(top/size);y<=Math.floor((bottom-.001)/size);y++)for(let x=Math.floor(left/size);x<=Math.floor((right-.001)/size);x++){const page=data.pages[x+','+y];if(page)result.push(page);}
  return result;
 }
 function stateKey(data,x,y){const a=x-data.startX,b=y-data.startY;return Math.floor(((a+b)*24+24)/data.size)+','+Math.floor(((b-a+data.width)*12)/data.size);}
 window.__regionStateReceive=(id,key,value)=>{const receive=stateReceivers.get(id+'|'+key);if(receive){stateReceivers.delete(id+'|'+key);receive(value);}};
 function regionState(data,key){
  if(!data.statePages?.[key])return {ready:true,promise:Promise.resolve()};
  const cacheKey=data.id+'|'+key;if(stateCache.has(cacheKey))return stateCache.get(cacheKey);
  const entry={ready:false,error:null,promise:null},file=data.statePages[key];stateCache.set(cacheKey,entry);
  entry.promise=(location.protocol==='file:'?new Promise((resolve,reject)=>{
   stateReceivers.set(cacheKey,resolve);const script=document.createElement('script');script.src=base+file+'.js';script.onload=()=>script.remove();script.onerror=()=>{script.remove();stateReceivers.delete(cacheKey);reject(Error('區域遮擋資料讀取失敗。'));};document.head.append(script);
  }):fetch(base+file).then(response=>{if(!response.ok)throw Error('區域遮擋資料讀取失敗。');return response.json();})).then(value=>{Object.assign(data.cells,value.cells);Object.assign(data.groups,value.groups);entry.ready=true;touch();}).catch(error=>{entry.error=error;touch();throw error;});
  entry.promise.catch(()=>{});return entry;
 }
 function stateAt(data,x,y){const cell=data.cells[Math.round(y)+','+Math.round(x)];return cell||{hidden:[],cover:[]};}
 function pageFile(data,page,mask){const key=page.groups.filter(group=>mask.has(group)).join('|');return data.id+'/'+(page.variants[key]||page.variants['']);}
 function trim(keep){
  let bytes=0;for(const item of images.values())bytes+=item.bytes;
  if(images.size<=72&&bytes<=160*1024*1024)return;
  const candidates=[...images.values()].filter(item=>item.ready&&!keep.has(item.file)&&!nodes.has(item.file)).sort((a,b)=>a.used-b.used);
  for(const item of candidates){if(images.size<=72&&bytes<=160*1024*1024)break;images.delete(item.file);bytes-=item.bytes;item.image.onload=item.image.onerror=null;item.image.src='';}
 }
 function prefetch(data,v,wx,wy){
  const key=[data.id,Math.floor(v.px/512),Math.floor(v.py/512),wx,wy].join('|');if(key===warmKey)return;warmKey=key;
  const keep=new Set();
  for(const page of visiblePages(data,v,512)){
   regionState(data,Math.floor(page.x/data.size)+','+Math.floor(page.y/data.size));
   const file=data.id+'/'+page.variants[''];keep.add(file);image(file);
   for(const file of page.coverFiles||[]){keep.add(data.id+'/'+file);image(data.id+'/'+file);}
  }
  // Warm roof-free versions before reaching a doorway, without fetching every indoor variant in the region.
  const masks=new Map();for(let dy=-6;dy<=6;dy++)for(let dx=-6;dx<=6;dx++){const state=stateAt(data,wx+dx,wy+dy);if(state.hidden.length)masks.set(state.hidden.join('|'),new Set(state.hidden));}
  for(const page of visiblePages(data,v,128))for(const mask of masks.values()){const file=pageFile(data,page,mask);keep.add(file);image(file);}
  trim(keep);
 }
 function showPages(data,v,mask){
  const wanted=new Set();let ready=true,failed=false;
  const baseX=Math.floor(v.px/data.size)*data.size,baseY=Math.floor(v.py/data.size)*data.size;
  const shifted=baseX!==originX||baseY!==originY;originX=baseX;originY=baseY;
  const required=visiblePages(data,v,128),shown=visiblePages(data,v,320),must=new Set(required);
  for(const page of shown){
   const file=pageFile(data,page,mask),item=image(file,must.has(page));wanted.add(file);
   if(!item.ready){if(must.has(page)){ready=false;failed||=item.failed;}continue;}
   if(!nodes.has(file)){
    const img=item.image;img.style.cssText='position:absolute;max-width:none;max-height:none;pointer-events:none;image-rendering:pixelated';img.dataset.regionX=page.x;img.dataset.regionY=page.y;img.style.left=(page.x-baseX)+'px';img.style.top=(page.y-baseY)+'px';img.style.width=page.w+'px';img.style.height=page.h+'px';root.append(img);nodes.set(file,img);
   }
  }
  // Keep an old roof image until its replacement has decoded. Never swap in a blank page.
  for(const [file,img]of nodes){if(shifted){img.style.left=(Number(img.dataset.regionX)-baseX)+'px';img.style.top=(Number(img.dataset.regionY)-baseY)+'px';}if(wanted.has(file))continue;const samePage=shown.find(page=>Number(img.dataset.regionX)===page.x&&Number(img.dataset.regionY)===page.y);if(samePage&&!images.get(pageFile(data,samePage,mask))?.ready)continue;img.remove();nodes.delete(file);}
  root.style.width=data.size+'px';root.style.height=data.size+'px';root.style.transform='translate3d('+(v.ox+baseX*v.zoom)+'px,'+(v.oy+baseY*v.zoom)+'px,0) scale('+v.zoom+')';return {ready,failed};
 }
 function intersects(piece,v,bounds){const x=piece.x*v.zoom+v.ox,y=piece.y*v.zoom+v.oy;return x<bounds.left+bounds.width&&x+piece.w*v.zoom>bounds.left&&y<bounds.top+bounds.height&&y+piece.h*v.zoom>bounds.top;}
 function paintCover(target,v,ids,bounds){
  if(!current)return;
  target.save();target.beginPath();target.rect(bounds.left,bounds.top,bounds.width,bounds.height);target.clip();
  for(const group of ids){if(hidden.has(group))continue;for(const piece of current.groups[group]||[]){
   if(!intersects(piece,v,bounds))continue;const item=image(current.id+'/'+piece.file,true);if(!item.ready)continue;
   target.drawImage(item.image,piece.sx||0,piece.sy||0,piece.w,piece.h,piece.x*v.zoom+v.ox,piece.y*v.zoom+v.oy,piece.w*v.zoom,piece.h*v.zoom);
  }}target.restore();
 }
 function drawForeground(v){
  if(!active||!current)return;const dpr=Math.min(devicePixelRatio||1,2),w=Math.round(v.width*dpr),h=Math.round(v.height*dpr);
  if(front.width!==w||front.height!==h){front.width=w;front.height=h;lastForeground='';foregroundBox=null;}
  const box={left:v.width/2+(parseFloat(characterBody.style.left)||0),top:v.height*v.anchorY+(parseFloat(characterBody.style.top)||0),width:parseFloat(characterBody.style.width)||0,height:parseFloat(characterBody.style.height)||0};
  const signature=[current.id,v.ox,v.oy,v.zoom,characterCurrentPath,cover.join('|'),[...hidden].join('|'),imageRevision,box.left,box.top,box.width,box.height].join('/');if(signature===lastForeground)return;lastForeground=signature;
  pen.setTransform(dpr,0,0,dpr,0,0);pen.imageSmoothingEnabled=false;if(foregroundBox)pen.clearRect(foregroundBox.left-2,foregroundBox.top-2,foregroundBox.width+4,foregroundBox.height+4);
  foregroundBox=null;if(!cover.length)return;paintCover(pen,v,cover,box);foregroundBox=box;
 }
 function render(v,dpr,time){
  if(window.gameFlowState!=='playing'){active=loading=false;fill.hidden=root.hidden=front.hidden=true;return false;}
  active=true;viewNow=v;const id=window.activeMapId||0,entry=mapData(id);
  fill.hidden=root.hidden=false;terrainRaster.hidden=true;terrainForegroundRoot.hidden=true;
  if(currentId!==id){currentId=id;current=null;originX=originY=null;root.replaceChildren();nodes.clear();warmKey='';pen.clearRect(0,0,front.width,front.height);foregroundBox=null;lastForeground='';}
  if(!entry.ready){loading=true;actor.hidden=true;front.hidden=true;status.hidden=false;status.textContent=entry.error?.message||'讀取分區地圖…';return true;}
  current=entry.value;const p=visualWorldPosition(time),wx=Math.round(p.x),wy=Math.round(p.y),local=regionState(current,stateKey(current,wx,wy));
  if(!local.ready){loading=true;status.hidden=false;status.textContent=local.error?.message||'讀取區域遮擋資料…';if(!sceneStarted)actor.hidden=true;return true;}
  const state=stateAt(current,wx,wy);hidden=new Set(state.hidden);cover=state.cover;
  const result=showPages(current,v,hidden);loading=!result.ready;prefetch(current,v,wx,wy);
  const left=v.width/2+'px',top=v.height*v.anchorY+'px';if(actor.style.left!==left)actor.style.setProperty('left',left,'important');if(actor.style.top!==top)actor.style.setProperty('top',top,'important');
  if(result.ready||sceneStarted){actor.hidden=false;front.hidden=false;sceneStarted=true;renderedSceneView=v;terrainDirty=false;}
  status.hidden=result.ready;status.textContent=result.failed?'分區地圖圖片讀取失敗，請重新載入。':'預載相鄰區域…';
  const coordinate=worldX+', '+worldY+' · '+(((tile(worldX,worldY)&48)===16)?'安全區':'一般區'),label=document.querySelector('#coordinates');if(label&&label.textContent!==coordinate)label.textContent=coordinate;
  return true;
 }
 async function prepare(id,x,y){
  const data=await mapData(id).promise;await regionState(data,stateKey(data,x,y)).promise;
  const box=game.getBoundingClientRect(),layout=viewportLayout(box.width,box.height),a=x-data.startX,b=y-data.startY,px=(a+b)*24+24,py=(b-a+data.width)*12,v={width:box.width,height:box.height,anchorY:layout.anchorY,zoom:layout.defaultZoom,px,py,ox:box.width/2-px*layout.defaultZoom,oy:box.height*layout.anchorY-py*layout.defaultZoom},state=stateAt(data,x,y),mask=new Set(state.hidden);
  await Promise.all(visiblePages(data,v,128).map(page=>image(pageFile(data,page,mask),true).promise));
  for(const group of state.cover)for(const piece of data.groups[group]||[])image(id+'/'+piece.file);
  return true;
 }
 const oldRefresh=refreshCharacter;refreshCharacter=function(...args){const result=oldRefresh.apply(this,args);if(active&&viewNow)drawForeground(viewNow);return result;};
 return {render,prepare,paintEntity(target,v,wx,wy,bounds){if(active&&current)paintCover(target,v,stateAt(current,wx,wy).cover,bounds);},get active(){return active;},get loading(){return loading;},get stats(){return {source:'pre-rendered region background pictures',maps:Object.keys(index?.maps||{}).length,loadedMaps:dataCache.size,images:images.size,pending:queue.length+inFlight,mapId:currentId};}};
})();window.RegionBackground=RegionBackground;
