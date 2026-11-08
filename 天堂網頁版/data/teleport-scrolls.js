// Move_Reel: one scroll, same-map random passable location within 200 tiles.
const TeleportScrolls=(()=>{
 const cooldowns=new Map();
 function canLand(x,y){return (x!==worldX||y!==worldY)&&!!tile(x,y)&&!(tile(x,y)&128)&&!IslandMonsters.occupied(x,y)&&navigationDirections.some(([dx,dy])=>canTraverse(x,y,dx,dy));}
 function landing(){
  const left=Math.max(island.startX,worldX-200),right=Math.min(island.startX+island.width-1,worldX+200),top=Math.max(island.startY,worldY-200),bottom=Math.min(island.startY+island.height-1,worldY+200),width=right-left+1,height=bottom-top+1;
  for(let i=0;i<1024;i++){const x=left+Math.floor(Math.random()*width),y=top+Math.floor(Math.random()*height);if(canLand(x,y))return {x,y};}
  for(let y=top;y<=bottom;y++)for(let x=left;x<=right;x++)if(canLand(x,y))return {x,y};
  return null;
 }
 function use(uid,destination=null,random=false){
  const entry=OwnedInventory.items.find(e=>e.uid===uid),rule=entry&&ITEM_USE_RULES.definitions[entry.key];if(!['teleport.Move_Reel','teleport.GoHome_Reel'].includes(rule?.handler))return null;
  const home=rule.handler==='teleport.GoHome_Reel';
  if(window.gameFlowState!=='playing'||CharacterActions.dead)return false;
  const map=TeleportMapRules[window.activeMapId||0];if(!(home?map?.escapable:map?.teleportable)||!map?.usableItem){toast(home?'這個地區無法使用回家卷軸。':'這個地區無法使用瞬間移動。');return false;}
  if(IslandNpcAi.cursed||window.playerItemState?.teleportBlocked||window.playerItemState?.rooted||window.playerItemState?.paralyzed)return false;
  if(activeCharacterLevel<rule.minLevel||rule.maxLevel&&activeCharacterLevel>rule.maxLevel)return false;
  const key=window.activeCharacterId+'/'+(rule.delayId||entry.key),now=movementTime();if(now<(cooldowns.get(key)||0))return false;
  if(!home&&!destination&&!random&&canSelect(entry,rule)&&window.Bookmarks){Bookmarks.open({scrollUid:uid});return true;}
  if(destination&&!canSelect(entry,rule))return false;
  const region=home?map.homeRegions?.find(r=>worldX>=r.bounds[0]&&worldY>=r.bounds[1]&&worldX<=r.bounds[2]&&worldY<=r.bounds[3]):null;
  const homeChoices=home?((job==='妖精'&&region?.locationsElf?region.locationsElf:region?.locations)||map.homeLocations||[]).filter(([x,y])=>canLand(x,y)):[];
  const homeSpot=homeChoices[Math.floor(Math.random()*homeChoices.length)];
  const position=home?(homeSpot?{x:homeSpot[0],y:homeSpot[1]}:null):destination?Bookmarks.find(destination):landing();if(!position)return false;
  if(destination&&(position.mapId!==(window.activeMapId||0)||!canLand(position.x,position.y))){toast('該座標目前無法抵達，物品未消耗。');return false;}
  const next=OwnedInventory.snapshot,index=next.findIndex(e=>e.uid===uid);if(--next[index].count===0)next.splice(index,1);
  if(!OwnedInventory.applyChange(next,{position}))return false;
  cooldowns.set(key,now+(rule.delayMs||0));
  IslandCombat.resetAfterTeleport();if(home)IslandCombat.stop();cancelPointerGesture();stopMovement();cancelNavigation();resetMovementState();CharacterActions.reset(CharacterActions.weapon);
  if(window.playerItemState)playerItemState.absoluteBarrier=false;
  recenter();refreshCharacter();IslandMonsters.playEffect(169,worldX,worldY,movementTime());updateTargetControls();return true;
 }
 function hasRing(){return OwnedInventory.items.some(e=>e.key==='armor:20288'&&e.slot);}
 function canSelect(entry,rule=ITEM_USE_RULES.definitions[entry.key]){return rule?.handler==='teleport.Move_Reel'&&(rule.bless===0||rule.bless===1&&hasRing());}
 function methods(){return OwnedInventory.items.filter(e=>canSelect(e)).map(e=>({uid:e.uid,key:e.key,count:e.count,label:ITEM_USE_RULES.definitions[e.key].bless===0?'祝福瞬間移動卷軸':'一般瞬移卷＋傳送控制戒指'})).sort((a,b)=>Number(a.label.startsWith('一般'))-Number(b.label.startsWith('一般')));}
 return {random:uid=>use(uid,null,true),use,canLand,canSelect,methods,hasRing,toBookmark:(uid,id)=>use(uid,id)};
})();window.TeleportScrolls=TeleportScrolls;
