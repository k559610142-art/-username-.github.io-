// Stairs and map entrances from the DB `dungeon` / `dungeon_random` tables: stepping onto a source cell moves the player
// to the destination map. Destinations without converted scenery (native-dungeon-maps.js) only show a notice.
// Also adds map rules (teleport / home scroll) for the converted maps from DB mapids + getback.
const DungeonPortals=(()=>{
 const portals=new Map();let ready=false,busy=false,last='',notified='';
 const key=(m,x,y)=>m+':'+x+','+y;
 async function load(){
  try{
   const [fixed,random]=await Promise.all([GameDatabase.rows('dungeon'),GameDatabase.rows('dungeon_random').catch(()=>[])]);
   for(const r of fixed)portals.set(key(+r.src_mapid,+r.src_x,+r.src_y),{targets:[[+r.new_mapid,+r.new_x,+r.new_y]],note:r.note});
   for(const r of random){const targets=[1,2,3,4,5].map(i=>[+r['new_mapid'+i],+r['new_x'+i],+r['new_y'+i]]).filter(t=>t[1]&&t[2]);if(targets.length)portals.set(key(+r.src_mapid,+r.src_x,+r.src_y),{targets,note:r.note});}
   const cells=new Map();for(const k of portals.keys()){const m=+k.slice(0,k.indexOf(':'));if(!cells.has(m))cells.set(m,[]);cells.get(m).push(k.slice(k.indexOf(':')+1).split(',').map(Number));}
   for(const [m,list]of cells)NativeCollision.addEntrances(m,list);
   ready=true;
  }catch(e){console.warn('樓梯傳送資料讀取失敗',e);}
 }
 // Home scroll from a converted map: DB getback (fixed points or town id → L1TownLocation points used by Map 0／4 rules).
 function homeTarget(d){
  const h=d.home;if(!h)return null;
  if(h.points?.length)return {mapId:h.mapId,points:h.points};
  const town=(typeof job!=='undefined'&&job==='妖精'&&h.townElf)?h.townElf:h.town;
  if(town===1)return {mapId:0,points:TeleportMapRules[0]?.homeLocations||[]};
  const region=TeleportMapRules[4]?.homeRegions?.find(r=>r.town===town);
  return region?{mapId:4,points:region.locations}:{mapId:4,points:TeleportMapRules[4]?.homeLocations||[]};
 }
 for(const [id,d]of Object.entries(window.NATIVE_DUNGEON_MAPS||{}))if(!TeleportMapRules[id])TeleportMapRules[id]={...d.rules,homeTarget:()=>homeTarget(d)};
 function blocked(){return window.gameFlowState!=='playing'||CharacterActions.dead||TeleporterServices.busy||busy;}
 async function enter(p){
  const [mapId,x,y]=p.targets[Math.floor(Math.random()*p.targets.length)];
  if(!WorldMaps.has(mapId)){const msg='這個入口通往的地區尚未開放。';if(notified!==last){toast(msg);notified=last;}return;}
  busy=true;
  try{
   if(await WorldMaps.travel(mapId,x,y))last=key(mapId,worldX,worldY);else toast('移動失敗，請再試一次。');
  }catch(e){console.error(e);toast('目的地讀取失敗，請再試一次。');}
  finally{busy=false;}
 }
 let playing=false;
 function check(){
  const now=window.gameFlowState==='playing';if(!now){playing=false;return;}
  const k=key(window.activeMapId||0,worldX,worldY);
  if(!playing){playing=true;last=k;return;}
  if(!ready||blocked()||k===last)return;
  last=k;const p=portals.get(k);if(p)enter(p);
 }
 setInterval(check,100);
 load();
 return {get ready(){return ready},get busy(){return busy},portalAt:(m,x,y)=>portals.get(key(m,x,y))||null,homeTarget,
  sources:m=>[...portals.keys()].filter(k=>k.startsWith(m+':')).map(k=>k.slice(k.indexOf(':')+1).split(',').map(Number)),
  // First seen position after login / teleport counts as already visited, so standing on a stair does not fire again.
  settle(){last=key(window.activeMapId||0,worldX,worldY);}};
})();window.DungeonPortals=DungeonPortals;
