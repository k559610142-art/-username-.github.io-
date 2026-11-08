// Restore native legacy SEG object coverage over actors standing behind those objects.
const MainlandOcclusion=(()=>{
 const nameStyle=document.createElement('style');nameStyle.textContent='#actor>small{z-index:3}';document.head.append(nameStyle);
 const surface=document.createElement('canvas'),pen=surface.getContext('2d'),pictures=new Map();surface.className='mainland-occlusion';surface.setAttribute('aria-hidden','true');surface.style.cssText='position:absolute;inset:0;width:100%;height:100%;pointer-events:none;z-index:2';game.append(surface);
 function draw(now=movementTime()){
  const body=characterBody,view=renderedSceneView;if(!view)return;const g={width:view.width,height:view.height,left:0,top:0},b={left:view.width/2+(parseFloat(body.style.left)||0),top:view.height*view.anchorY+(parseFloat(body.style.top)||0),width:parseFloat(body.style.width)||0,height:parseFloat(body.style.height)||0};surface.hidden=window.gameFlowState!=='playing'||window.activeMapId!==4||!sceneStarted;if(surface.hidden||!b?.width||!b.height)return;
  const dpr=Math.min(devicePixelRatio||1,2),w=Math.round(g.width*dpr),h=Math.round(g.height*dpr);if(surface.width!==w||surface.height!==h){surface.width=w;surface.height=h;}pen.setTransform(dpr,0,0,dpr,0,0);pen.clearRect(0,0,g.width,g.height);pen.imageSmoothingEnabled=false;
  const p=visualWorldPosition(now),foot=project(p.x,p.y),left=(b.left-g.left-view.ox)/view.zoom,top=(b.top-g.top-view.oy)/view.zoom,right=left+b.width/view.zoom,bottom=top+b.height/view.zoom;
  pen.save();pen.beginPath();pen.rect(b.left-g.left,b.top-g.top,b.width,b.height);pen.clip();let covering=0;
  for(const o of MAINLAND_OCCLUDERS){if(foot[1]>=o.depth||o.x>=right||o.y>=bottom||o.x+o.width<=left||o.y+o.height<=top)continue;let img=pictures.get(o.file);if(!img){img=new Image();img.onload=()=>draw();img.src='assets/maps/mainland_south/occluders/'+o.file;pictures.set(o.file,img);}if(img.complete&&img.naturalWidth){pen.drawImage(img,o.x*view.zoom+view.ox,o.y*view.zoom+view.oy,o.width*view.zoom,o.height*view.zoom);covering++;}}
  pen.restore();surface.dataset.covering=String(covering);
 }
 const old=refreshCharacter;refreshCharacter=function(...args){const result=old.apply(this,args);draw(args[0]??movementTime());return result;};
 return {draw,get covering(){return Number(surface.dataset.covering||0);}};
})();window.MainlandOcclusion=MainlandOcclusion;
