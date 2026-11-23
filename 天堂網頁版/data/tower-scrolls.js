// 傲慢之塔移動卷軸／傳送符（2026-11-22 使用者：舊版傲慢之塔 10 樓、新傲慢之塔 10 樓；高樓層用卷軸上去，怪物掉卷軸與傳送符）。
// 2026-11-22 使用者修正：傳送符不開放；2～10 樓卷軸只靠怪物掉落；兩座塔的 1 樓都用狩獵場（隨身傳送）過去，所以新塔 1 樓卷軸 84001 也不用。
// 舊版塔（地圖 110、120…200）：第 n 層使用原版第 n×10 樓。
//   移動卷軸 40104～40112（11F～91F）→ 2～10 樓、40113（100F）→ 10 樓，用完消失。
// 新傲慢之塔（地圖 3301～3310）：移動卷軸 84002～84010 用完消失。各種傳送符（46011～、40280～、40289～、84031～、84041～）按了只提示不開放。
//   落點用 DB etcitem_teleport 的座標；頂樓卷軸 84011（地圖 7100）還沒轉，暫不能用。
// 掉落（player-progression.js roll 呼叫 drop）：塔內每一樓的怪物 1% 掉「上一層樓」的移動卷軸（10 樓掉 10 樓卷軸）。
const TowerScrolls=(()=>{
 const OLD=100,NEW=3300,dest=new Map(); // itemId → {mapId, x, y, keep}
 const oldFloor=f=>Math.min(10,Math.max(1,Math.ceil(f/10)));
 for(let i=0;i<9;i++)dest.set(40104+i,{mapId:OLD+10*oldFloor(11+i*10)});
 dest.set(40113,{mapId:200});
 // 新傲慢之塔落點（DB etcitem_teleport）
 const NEW_SPOT={1:[32797,32799],2:[32797,32799],3:[32797,32799],4:[32668,32864],5:[32668,32864],6:[32717,32871],7:[32668,32864],8:[32668,32864],9:[32668,32864],10:[32797,32799]};
 for(let n=2;n<=10;n++){const [x,y]=NEW_SPOT[n];dest.set(84000+n,{mapId:NEW+n,x,y});}
 const charm=id=>id>=46011&&id<=46020||id>=40280&&id<=40297||id>=84031&&id<=84050;
 let busy=false;
 const toast=t=>{const log=document.querySelector('#log');if(log)log.textContent=t;return false;};
 function blocked(){
  if(window.gameFlowState!=='playing'||!window.activeCharacterId)return '請先進入遊戲。';
  if(CharacterActions.dead)return '死亡時無法傳送。';
  if(window.PlayerStall?.active)return '請先收攤再傳送。';
  const s=window.playerItemState||{};if(window.IslandNpcAi?.cursed||s.teleportBlocked||s.rooted||s.paralyzed)return '目前狀態無法傳送。';
  const id=window.activeMapId||0,rules=(typeof TeleportMapRules!=='undefined'?TeleportMapRules[id]:null)||window.NATIVE_DUNGEON_MAPS?.[id]?.rules;
  if(rules&&!rules.usableItem)return '這個地區無法使用道具。';
  return '';
 }
 function landing(mapId,x0,y0){
  for(let r=0;r<=12;r++)for(let dy=-r;dy<=r;dy++)for(let dx=-r;dx<=r;dx++){
   if(Math.max(Math.abs(dx),Math.abs(dy))!==r)continue;const x=x0+dx,y=y0+dy,t=WorldMaps.cell(mapId,x,y);if(!t||(t&128))continue;
   if(mapId===(window.activeMapId||0)&&IslandMonsters.occupied(x,y))continue;
   if(![[1,0],[-1,0],[0,1],[0,-1]].some(([a,b])=>{const ok=window.NativeCollision?.canTraverse(x,y,a,b,mapId);return ok===undefined||ok===null?!!(t&15):ok;}))continue;
   return {x,y};
  }return null;
 }
 function use(uid){
  const e=OwnedInventory.items.find(i=>i.uid===uid),id=e?.item?.id;
  if(id===84011)return toast('傲慢之塔頂樓尚未開放。');
  if(charm(id))return toast('傲慢之塔傳送符目前不開放。');
  if(id===84001)return toast('新傲慢之塔 1 樓請用狩獵場傳送前往。');
  const d=dest.get(id);if(!d||e.slot)return null;
  if(busy)return toast('正在傳送中…');const why=blocked();if(why)return toast(why);
  if(!WorldMaps.has(d.mapId))return toast(WorldMaps.name(d.mapId)+' 目前無法前往。');
  const spawn=window.NATIVE_DUNGEON_MAPS?.[d.mapId]?.spawn,spot=landing(d.mapId,d.x??spawn?.x,d.y??spawn?.y);if(!spot)return toast('目的地沒有可用落點，物品未消耗。');
  const next=OwnedInventory.snapshot;if(!d.keep){const row=next.find(i=>i.uid===uid);if(!row)return false;if(--row.count<=0)next.splice(next.indexOf(row),1);}
  if(typeof stopMovement==='function')stopMovement();if(typeof cancelNavigation==='function')cancelNavigation();window.IslandCombat?.stop();
  busy=true;const name=e.item.name;
  WorldMaps.travel(d.mapId,spot.x,spot.y,next).then(ok=>{if(!ok)return toast('傳送失敗，物品未消耗。');window.DungeonPortals?.settle?.();if(window.playerItemState)playerItemState.absoluteBarrier=false;
   IslandMonsters.playEffect(169,worldX,worldY,movementTime(),{follow:'player'});toast('使用 '+name+'：抵達 '+WorldMaps.name(d.mapId)+'。');})
   .catch(err=>toast((err?.message||'傳送失敗').replace('天幣未扣除','物品未消耗')))
   .finally(()=>{busy=false;});
  return true;
 }
 // 掉落：舊塔第 n 層（地圖 100+10n）、新塔第 n 樓（地圖 3300+n）
 const SCROLL_RATE=0.01;
 function drop(mob){
  const s=mob?.spawn;if(!s||s.resident||s.ally||s.bot)return [];const m=s.mapId||0,out=[];
  let scroll=null;
  if(m===101||m>=110&&m<=200&&m%10===0){const n=m===101?1:(m-OLD)/10;scroll=n<10?40103+n:40113;}
  else if(m>=3301&&m<=3310){const n=m-3300;scroll=84000+Math.min(10,n+1);}
  else return out;
  const add=id=>{const it=window.INTERFACE_CATALOG?.items.find(i=>i.id===id);if(it)out.push({key:'etcitem:'+id,count:1,name:it.name});};
  if(Math.random()<SCROLL_RATE)add(scroll);
  return out;
 }
 return {use,drop,destination:id=>dest.get(id)||null};
})();window.TowerScrolls=TowerScrolls;
