const IslandCombat=(()=>{
  let mode=null,target=null,pending=null,owner=null;
  let autoScanRange=32;
  try{const saved=Number(localStorage.getItem('lineage-auto-range'));if(saved>=12&&saved<=48)autoScanRange=saved;}catch{}
  function setAutoRange(value){
    autoScanRange=Math.max(12,Math.min(48,Math.round(value)));
    try{localStorage.setItem('lineage-auto-range',String(autoScanRange));}catch{}
  }
  const retryAfter=new WeakMap();
  const panelOpen=()=>!document.querySelector('#panel').hidden;
  const distance=(x,y)=>Math.max(Math.abs(worldX-x),Math.abs(worldY-y));
  const ranged=()=>['bow','singlebow'].includes(OwnedInventory.equippedWeaponType);
  function attackRange(){
    const weapon=OwnedInventory.items.find(e=>e.slot==='weapon')?.item;
    if(!weapon)return 1;
    const source=originalWeaponRanges[weapon.id];
    return ranged()?(source>0?source:15):Math.max(1,source||1);
  }
  function stop(){
    if(mode&&navigationPath.length)cancelNavigation();
    mode=null;target=null;
  }
  function begin(kind,mob){
    if(window.gameFlowState!=='playing'||CharacterActions.dead||!TransformCards.canAttack())return false;
    if(kind!=='auto'&&!mob?.hp)return false;
    if(owner!==window.activeCharacterId){owner=window.activeCharacterId;pending=null;}
    stop();mode=kind;target=mob||null;tick();return true;
  }
  function walkTo(mob,range){
    if(movementAnimating()||navigationPath.length)return true;
    const candidates=[];
    for(let dx=-range;dx<=range;dx++)for(let dy=-range;dy<=range;dy++){
      if(!dx&&!dy)continue;
      const x=mob.x+dx,y=mob.y+dy;
      if(tile(x,y)&&!(tile(x,y)&128)&&clearShot(x,y,mob.x,mob.y))candidates.push([x,y]);
    }
    candidates.sort((a,b)=>distance(...a)-distance(...b));
    return navigateToAny(candidates,Math.max(24,autoScanRange+range));
  }
  function clearShot(x,y,tx,ty){
    while(x!==tx||y!==ty){
      const dx=Math.sign(tx-x),dy=Math.sign(ty-y);
      if(!canTraverse(x,y,dx,dy))return false;
      x+=dx;y+=dy;
    }
    return true;
  }
  function hit(mob,interrupt=false){
    const bow=ranged(),range=attackRange();
    if(!TransformCards.canAttack()){stop();return false;}
    if(!mob?.hp||distance(mob.x,mob.y)>range||!clearShot(worldX,worldY,mob.x,mob.y))return false;
    if(bow&&!OwnedInventory.items.some(e=>e.item.type==='arrow'&&e.count)){
      stop();toast('箭矢不足。');return false;
    }
    if(characterMovementBlocked()||!interrupt&&movementAnimating())return false;
    const dx=Math.sign(mob.x-worldX),dy=Math.sign(mob.y-worldY);
    if(dx||dy){
      characterHeading=characterHeadingForStep(dx,dy);
      refreshCharacter();
    }
    if(!CharacterActions.play('attack',{interruptMovement:interrupt}))return false;
    if(bow&&!OwnedInventory.consumeArrow()){stop();return false;}
    const profile=PlayerClassStats.read();
    const weaponMax=Math.max(1,profile.weapon?.damage[0]||2);
    const damage=1+Math.floor(Math.random()*weaponMax)+(bow?profile.rangedBonus:profile.meleeBonus)+DBGameRules.weaponProc(mob);
    pending={mob,damage,at:movementTime()+characterActionState.duration*.4};
    window.TdjSystems?.onAttack();
    return true;
  }
  function tick(){
    const id=window.gameFlowState==='playing'?window.activeCharacterId:null;
    if(id!==owner){owner=id;stop();pending=null;}
    if(!id||CharacterActions.dead){stop();pending=null;return;}
    if(pending&&movementTime()>=pending.at){
      IslandMonsters.damage(pending.mob,pending.damage);
      pending=null;
    }
    if(mode&&!TransformCards.canAttack()){stop();return;}
    if(!mode||pending||characterMovementBlocked())return;
    if(!target?.hp){
      if(mode!=='auto'){stop();return;}
      target=IslandMonsters.nearest(Math.max(autoScanRange,attackRange()),mob=>!(retryAfter.get(mob)>movementTime()));
      if(!target)return;
      IslandMonsters.setTarget(target);
    }
    const range=attackRange();
    if(distance(target.x,target.y)<=range&&clearShot(worldX,worldY,target.x,target.y)){
      hit(target,true);
      if(mode==='once')stop();
    }else if(!walkTo(target,range)){
      if(mode==='auto'){retryAfter.set(target,movementTime()+3000);target=null;}else stop();
    }
  }
  function attack(){
    const mob=IslandMonsters.target;
    if(mob?.hp)return begin('once',mob);
    if(CharacterActions.play('attack',{interruptMovement:true}))window.TdjSystems?.onAttack();
  }
  setInterval(tick,100);
  function resetAfterTeleport(){const auto=mode==='auto';stop();pending=null;IslandMonsters.setTarget(null);if(auto)mode='auto';}
  return {resetAfterTeleport,tick,begin,stop,attack,clearShot,setAutoRange,get autoRange(){return autoScanRange},get range(){return attackRange()},get mode(){return mode}};
})();
