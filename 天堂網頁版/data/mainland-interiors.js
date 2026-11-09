// Native SEG/S32 Layer5 type-1 cells select the original roofless interior.
const MainlandInteriors=(()=>{
 const cells=new Map(MAINLAND_INTERIORS_DATA.cells.map(([x,y,id])=>[x+','+y,id])),rooms=new Map(MAINLAND_INTERIORS_DATA.rooms.map(r=>[r.id,r])),pictures=new Map();let active=null;const bins=new Map();for(const r of rooms.values()){for(let y=Math.floor(r.y/1024);y<=Math.floor((r.y+r.height)/1024);y++)for(let x=Math.floor(r.x/1024);x<=Math.floor((r.x+r.width)/1024);x++){const key=x+','+y;if(!bins.has(key))bins.set(key,[]);bins.get(key).push(r)}}
 const root=document.createElement('div');root.className='native-building-interior';root.style.cssText='position:absolute;left:0;top:0;pointer-events:none;transform-origin:0 0';root.hidden=true;actor.before(root);
 function picture(file){let img=pictures.get(file);if(!img){img=new Image();img.onload=()=>{sync();window.MainlandOcclusion?.draw()};img.src='assets/maps/mainland_south/interiors-continent1/'+file;pictures.set(file,img)}return img}
 function sync(now=movementTime()){
  const view=renderedSceneView;if(window.NativeWorld?.active){active=null;root.hidden=true;return;}
  if(window.gameFlowState!=='playing'||window.activeMapId!==4||!sceneStarted||!view){active=null;root.hidden=true;return}
  const p=visualWorldPosition(now),room=rooms.get(cells.get(Math.round(p.x)+','+Math.round(p.y)))||null;active=room;
  // Warm nearby roofs before entering so their original interior is ready immediately.
  const nearby=new Set();for(let y=Math.floor((-view.oy/view.zoom-400)/1024);y<=Math.floor(((-view.oy+view.height)/view.zoom+400)/1024);y++)for(let x=Math.floor((-view.ox/view.zoom-400)/1024);x<=Math.floor(((-view.ox+view.width)/view.zoom+400)/1024);x++)for(const r of bins.get(x+','+y)||[])nearby.add(r);for(const r of nearby)if(r.x<(-view.ox+view.width)/view.zoom+400&&r.x+r.width>-view.ox/view.zoom-400&&r.y<(-view.oy+view.height)/view.zoom+400&&r.y+r.height>-view.oy/view.zoom-400)picture(r.file);
  root.hidden=!room;if(!room)return;
  const img=picture(room.file);if(root.firstChild!==img){root.replaceChildren(img);img.style.cssText='position:absolute;max-width:none;pointer-events:none';for(const o of room.objects)picture(o.file)}
  root.style.transform=`translate3d(${view.ox}px,${view.oy}px,0) scale(${view.zoom})`;Object.assign(img.style,{left:room.x+'px',top:room.y+'px',width:room.width+'px',height:room.height+'px'});
 }
 function replaces(o){return active&&(active.hidden.includes(o.file)||(o.x<active.x+active.width&&o.x+o.width>active.x&&o.y<active.y+active.height&&o.y+o.height>active.y))}
 function paintOcclusion(pen,view,foot,left,top,right,bottom){if(!active)return;const p=visualWorldPosition(movementTime()),covered=NativeMapCoverage.at(p.x,p.y);for(const o of active.objects){if(!covered.has(o.file.replace(/^object-/,'')))continue;if(foot[1]>=o.depth||o.x>=right||o.y>=bottom||o.x+o.width<=left||o.y+o.height<=top)continue;const img=picture(o.file);if(img.complete&&img.naturalWidth)pen.drawImage(img,o.x*view.zoom+view.ox,o.y*view.zoom+view.oy,o.width*view.zoom,o.height*view.zoom)}}
 return {sync,replaces,paintOcclusion,get active(){return active}};
})();window.MainlandInteriors=MainlandInteriors;

