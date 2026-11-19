const IslandCombat=(()=>{
  let mode=null,target=null,pending=null,owner=null,followUp=null;
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
    if(window.PlayerStall?.active){toast('擺攤中不能戰鬥，請先收攤。');return false;}
    if(kind!=='auto'&&!mob?.hp)return false;
    if(mob?.spawn.bot&&!window.FakePlayers?.canAttack(mob))return false;
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
  // 2026-11-19 使用者：自動打怪要優先打身邊、不要判定到圍牆後面的怪。
  //  原本用直線距離挑最近的怪，圍牆另一邊的怪也算「最近」。改成從人物位置做一次走路距離擴散（會被牆擋），
  //  每隻怪算「走到能打到牠的位置要幾步」，挑步數最少的；走不到能打的位置（被牆隔開）就不挑。
  let noTargetUntil=0;
  function walkSteps(maxR){
    const size=maxR*2+1,dist=new Int16Array(size*size).fill(-1),qx=new Int32Array(size*size),qy=new Int32Array(size*size),cx=worldX,cy=worldY;
    const at=(x,y)=>{const ix=x-cx+maxR,iy=y-cy+maxR;return ix<0||iy<0||ix>=size||iy>=size?-1:iy*size+ix};
    let head=0,tail=0;dist[at(cx,cy)]=0;qx[tail]=cx;qy[tail++]=cy;
    while(head<tail){const x=qx[head],y=qy[head++],d=dist[at(x,y)];
     for(const [dx,dy]of navigationDirections){const i=at(x+dx,y+dy);if(i<0||dist[i]>=0||!canTraverse(x,y,dx,dy))continue;dist[i]=d+1;qx[tail]=x+dx;qy[tail++]=y+dy;}}
    return (x,y)=>{const i=at(x,y);return i<0?-1:dist[i]};
  }
  function pickAutoTarget(r,ok,first){
    const list=[];IslandMonsters.nearest(r,mob=>{if(ok(mob))list.push(mob);return false}); // 只借 nearest 的篩選條件收集候選怪
    if(!list.length)return null;
    const range=attackRange(),steps=walkSteps(r+range+2);
    const cost=mob=>{
      if(distance(mob.x,mob.y)<=range&&clearShot(worldX,worldY,mob.x,mob.y))return 0; // 站著就打得到
      let best=-1;
      for(let dx=-range;dx<=range;dx++)for(let dy=-range;dy<=range;dy++){const x=mob.x+dx,y=mob.y+dy,s=steps(x,y);if(s<0||best>=0&&s>=best)continue;if(clearShot(x,y,mob.x,mob.y))best=s;}
      return best; // -1＝被牆隔開、走不到能打的位置
    };
    const scored=list.map(mob=>({mob,c:cost(mob),pri:first?.(mob)?0:1})).filter(e=>e.c>=0);
    scored.sort((a,b)=>a.pri-b.pri||a.c-b.c||Math.hypot(a.mob.x-worldX,a.mob.y-worldY)-Math.hypot(b.mob.x-worldX,b.mob.y-worldY));
    return scored[0]?.mob||null;
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
    if(mob?.spawn.bot&&!window.FakePlayers?.canAttack(mob)){stop();return false;}
    const bow=ranged(),range=attackRange();
    if(!TransformCards.canAttack()){stop();return false;}
    if(!mob?.hp||distance(mob.x,mob.y)>range||!clearShot(worldX,worldY,mob.x,mob.y))return false;
    if(bow&&!OwnedInventory.items.some(e=>e.item.type==='arrow'&&e.count)){
      stop();toast('箭矢不足。');return false;
    }
    if(characterMovementBlocked())return false;
    // 走路時座標一開始就算到下一格；走到一半就出手會被拉回上一格，變成隔 2 格打到。先停下後續路徑、走完這一格再攻擊。
    if(movementAnimating()){if(interrupt)cancelNavigation();return false;}
    const dx=Math.sign(mob.x-worldX),dy=Math.sign(mob.y-worldY);
    if(dx||dy){
      characterHeading=characterHeadingForStep(dx,dy);
      refreshCharacter();
    }
    if(!CharacterActions.play('attack',{interruptMovement:interrupt}))return false;
    if(bow&&!OwnedInventory.consumeArrow()){stop();return false;}
    const profile=PlayerClassStats.read();
    const weaponMax=Math.max(1,profile.weapon?.damage[0]||2);
    const landed=bow?PlayerRangedRules.hits(profile,mob):PlayerRangedRules.meleeHits(profile,mob);
    const damage=landed?1+Math.floor(Math.random()*weaponMax)+(bow?profile.rangedBonus:profile.meleeBonus)+DBGameRules.weaponProc(mob)+(window.ClassBuffs?.onHit(mob,bow)||0)+(window.DollEffects?.onHit(mob)||0):0;
    // 2026-11-17 戰士副手斧（右手 weapon2）：近戰命中時 20% 機率追擊（學會迅猛雙斧 235 → 35%），
    //  只有觸發時才用副手斧攻擊，傷害＝副手斧照普攻公式算的一半；粉碎／狂暴在追擊上也能觸發。
    let offhand=0;const off=landed&&!bow&&typeof job!=='undefined'&&job==='戰士'&&window.OwnedInventory?.items?.find(e=>e.slot==='weapon2');
    if(off&&Math.random()<(OwnedInventory.skills?.ids?.includes(235)?.35:.2)){const offMax=Math.max(1,off.item.damage?.[0]||2);offhand=Math.max(1,Math.floor((1+Math.floor(Math.random()*offMax)+profile.meleeBonus+(window.ClassBuffs?.onHit(mob,false)||0))/2));}
    pending={mob,damage,landed,offhand,at:movementTime()+characterActionState.duration*.4};
    window.TdjSystems?.onAttack();
    return true;
  }
  function tick(){
    const id=window.gameFlowState==='playing'?window.activeCharacterId:null;
    if(id!==owner){owner=id;stop();pending=null;}
    if(!id||CharacterActions.dead){stop();pending=null;followUp=null;return;}
    if(followUp&&movementTime()>=followUp.at){if(followUp.mob.hp)IslandMonsters.damage(followUp.mob,followUp.damage);followUp=null;} // 副手斧追擊（晚一點出數字，不跟主手疊在一起）
    if(pending&&movementTime()>=pending.at){
      if(pending.landed&&(!pending.mob.spawn.bot||window.FakePlayers?.canAttack(pending.mob))){IslandMonsters.damage(pending.mob,pending.damage);if(pending.offhand)followUp={mob:pending.mob,damage:pending.offhand,at:movementTime()+180};}
      else if(!pending.landed&&pending.mob.hp){pending.mob.rangedMissUntil=movementTime()+650;if(!pending.mob.spawn.bot)window.IslandNpcAi?.provoke(pending.mob,[]);}
      pending=null;
    }
    if(mode&&!TransformCards.canAttack()){stop();return;}
    if(!mode||pending||characterMovementBlocked())return;
    if(!target?.hp){
      if(mode!=='auto'){stop();return;}
      if(performance.now()<noTargetUntil)return;
      {const r=Math.max(autoScanRange,attackRange()),ok=mob=>!(retryAfter.get(mob)>movementTime())&&!window.AssistSystem?.skip(mob),first=window.AssistSystem?.prefer?.(); // 名單「優先打」先找（2026-11-18）
      target=pickAutoTarget(r,ok,first);} // 輔助系統怪物名單：不打／瞬移的怪不主動找
      if(!target){noTargetUntil=performance.now()+500;return;}
      IslandMonsters.setTarget(target);
    }
    if(target?.spawn.bot&&!window.FakePlayers?.canAttack(target)){stop();return;}
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
  return {resetAfterTeleport,tick,begin,stop,attack,clearShot,setAutoRange,pickAutoTarget,get autoRange(){return autoScanRange},get range(){return attackRange()},get mode(){return mode}};
})();
