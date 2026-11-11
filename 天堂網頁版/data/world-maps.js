// Map metadata and collision bytes use the original world's coordinates.
// Map 0／4 have hand-built scene data; every other map comes from native-dungeon-maps.js (tools/native-map/build.js).
const WorldMaps=(()=>{
 const maps=new Map([[0,{info:window.TALKING_ISLAND,scene:window.ISLAND_SCENE,root:'assets/talking-island/',preview:'全島場景預覽.jpg'}],[4,{info:window.MAINLAND_MAP,scene:window.MAINLAND_SCENE,root:'assets/maps/mainland_south/',preview:window.MAINLAND_SCENE.preview.file}]]);
 for(const map of maps.values())map.terrain=Uint8Array.from(atob(map.info.tiles),c=>c.charCodeAt(0));
 const blank='data:image/gif;base64,R0lGODlhAQABAAAAACH5BAEKAAEALAAAAAABAAEAAAICTAEAOw==';
 function unpack(runs,size){const data=new Uint8Array(size);let at=0;for(let i=0;i<runs.length;i+=2){data.fill(runs[i],at,at+runs[i+1]);at+=runs[i+1]}return data;}
 function get(id){
  if(maps.has(id))return maps.get(id);
  const d=window.NATIVE_DUNGEON_MAPS?.[id];if(!d)return null;
  const full=[(d.width+d.height)*24,(d.width+d.height)*12];
  const m={dungeon:true,info:{id,name:d.name,width:d.width,height:d.height,startX:d.startX,startY:d.startY,spawn:d.spawn||{x:d.startX+(d.width>>1),y:d.startY+(d.height>>1)}},scene:{pages:[],paging:{fullNativePixels:full}},root:'assets/native-world/',preview:null,terrain:unpack(d.terrain,d.width*d.height)};
  maps.set(id,m);return m;
 }
 function cell(id,x,y){const m=get(id);if(!m)return 0;const tx=x-m.info.startX,ty=y-m.info.startY;return tx<0||ty<0||tx>=m.info.width||ty>=m.info.height?0:m.terrain[ty*m.info.width+tx];}
 function activate(id){const m=get(id);if(!m)return false;window.activeMapId=id;island=m.info;scene=m.scene;terrain=m.terrain;root=m.root;cache.clear();terrainForegroundRoot.replaceChildren();terrainRasterView=null;renderedSceneView=null;paintedView=null;terrainDirty=true;sceneStarted=false;preview.src=m.preview?m.root+m.preview:blank;document.querySelector('.location strong').textContent=island.name;document.querySelector('.location small').textContent='MAP '+id;return true;}
 function loadImage(src){return new Promise((resolve,reject)=>{const img=new Image();img.onload=()=>resolve(img);img.onerror=()=>reject(Error('目的地場景讀取失敗，天幣未扣除。'));img.src=src;});}
 async function prepare(id,x,y){if(window.NativeWorld)return NativeWorld.prepare(id,x,y);const m=get(id);if(!m||m.dungeon||!cell(id,x,y)||(cell(id,x,y)&128))throw Error('目的地目前無法抵達，天幣未扣除。');const dx=x-m.info.startX,dy=y-m.info.startY,px=(dx+dy)*24+(id===4?24:0),py=(dy-dx+m.info.width)*12;const rect=game.getBoundingClientRect(),z=viewportLayout(rect.width,rect.height).defaultZoom,rx=rect.width/(2*z)+400,ry=rect.height/z+400;const pages=m.scene.pages.filter(p=>p.pixelOrigin[0]<px+rx&&p.pixelOrigin[0]+3072>px-rx&&p.pixelOrigin[1]<py+ry&&p.pixelOrigin[1]+1536>py-ry);await Promise.all([loadImage(m.root+m.preview),...pages.flatMap(p=>[p.file,p.foreground].filter(Boolean).map(f=>loadImage(m.root+f)))]);return true;}
 function arrived(){IslandCombat.resetAfterTeleport();IslandCombat.stop();IslandMonsters.setTarget(null);cancelPointerGesture();stopMovement();cancelNavigation();resetMovementState();CharacterActions.reset(CharacterActions.weapon);recenter();refreshCharacter();updateTargetControls();}
 // Cross-map move: load the destination first, then switch and save position (with `inventory` when the move also uses an item).
 async function travel(id,x,y,inventory=OwnedInventory.snapshot){
  await prepare(id,x,y);
  const before={mapId:window.activeMapId||0,x:worldX,y:worldY};activate(id);
  if(!OwnedInventory.applyChange(inventory,{position:{x,y}})){activate(before.mapId);worldX=before.x;worldY=before.y;resetMovementState();recenter();return false;}
  arrived();return true;
 }
 function name(id){return get(id)?.info.name||'地圖 '+id;}
 window.activeMapId=0;
 return {cell,activate,prepare,arrived,travel,name,has:id=>!!get(id),isDungeon:id=>!!get(id)?.dungeon};
})();window.WorldMaps=WorldMaps;
