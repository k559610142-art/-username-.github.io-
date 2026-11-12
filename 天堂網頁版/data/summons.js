// Summons, tamed monsters, zombies and elementals that follow the player and fight the player's target.
// Rules from Server_Game_2.jar skill/skillmode:
//  SUMMON_MONSTER (召喚術, no 召喚控制戒指): level < 32 → 81210, then one step every 4 levels up to 81228 (≥ 52); each costs 6,
//   room = CHA + 6. LESSER_ELEMENTAL／GREATER_ELEMENTAL (召喚屬性精靈／召喚強力屬性精靈): by elf element
//   地 45306／81053, 火 45303／81050, 水 45304／81051, 風 45305／81052, cost 7. 迷魅術 tames a tamable monster (DB npc.tamable)
//   not above the player's level, cost 6. 造屍術 raises a monster killed within 20 s nearby, cost 6. 釋放元素 releases them all.
// Allies live in IslandMonsters' list with spawn.ally (drawn like monsters, never targeted, never respawn) and move with the
// player between maps. Monsters do not attack allies in this web version; allies last 1 hour (summons／elementals) or until
// released. Damage uses NativeCombatRules.physical against the target's AC; kills give the player the usual rewards.
const Summons=(()=>{
 const SUMMON_IDS=[81210,81213,81216,81219,81222,81225,81228];
 const ELEMENTAL={地:[45306,81053],火:[45303,81050],水:[45304,81051],風:[45305,81052]};
 const LIFE=3600*1000;
 // 召喚控制戒指 (armor 20284／120284): SUMMON_MONSTER.start(pc, choice) — 31 choices, minimum level and cost per summon;
 // count = (CHA + 6 − used) ÷ cost; the last three (81238–81240) only when no other summon is out.
 const RING_IDS=Array.from({length:31},(_,i)=>81210+i);
 const RING_LEVEL=[28,28,28,32,32,32,36,36,36,40,40,40,44,44,44,48,48,48,52,52,52,56,56,56,60,60,60,64,68,72,72];
 const RING_COST=[8,8,8,8,8,8,8,8,8,8,8,8,8,8,8,8,8,8,8,8,8,10,10,10,12,12,12,20,42,42,50];
 let chosen=null;
 const hasRing=()=>OwnedInventory.items.some(e=>e.slot&&(e.key==='armor:20284'||e.key==='armor:120284'));
 function openMenu(){
  const overlay=document.querySelector('#panel'),content=document.querySelector('#panelContent');
  cancelPointerGesture({preserveNavigation:true});
  overlay.classList.remove('classic-panel','reference-menu-panel','game-catalog-panel','npc-shop-panel','map-overview-panel');
  overlay.setAttribute('aria-label','召喚術');overlay.querySelector('#close').hidden=false;overlay.hidden=false;
  const lv=window.activeCharacterLevel||1,free=room();
  const heading=uiElement('h2','','召喚術 · 選擇召喚獸'),intro=uiElement('p','summon-menu-intro','可用魅力 '+free+'（魅力＋6－已佔用）。選好後會立刻施放召喚術。'),list=uiElement('div','summon-menu');
  RING_IDS.forEach((id,i)=>{
   const npc=islandMonsterTemplates[id];if(!npc)return;
   const n=Math.floor(free/RING_COST[i]),noArt=!islandMonsterFrames[npc.gfx];
   const why=lv<RING_LEVEL[i]?'需要 '+RING_LEVEL[i]+' 級':noArt?'沒有圖':id>=81238&&used()?'要先收回其他召喚獸':n<1?'魅力不足':'';
   const b=uiElement('button','',npc.name+'　Lv.'+npc.level+'　體力 '+npc.hp+'　佔用 '+RING_COST[i]+(why?'　（'+why+'）':'　× '+n));
   b.type='button';b.disabled=!!why;b.onclick=()=>{chosen=i;closePanel();if(!PlayerSkills.cast(51))chosen=null;};
   list.append(b);
  });
  content.replaceChildren(heading,intro,list);overlay.scrollTop=0;
 }
 const menuStyle=document.createElement('style');menuStyle.textContent='.summon-menu{display:grid;gap:8px;grid-template-columns:repeat(auto-fill,minmax(260px,1fr))}.summon-menu button{min-height:46px;padding:10px;text-align:left;background:#24342a;border:1px solid #a28b55;color:#f0dfb7;font-size:15px}.summon-menu button:disabled{opacity:.5}.summon-menu-intro{font-size:15px;line-height:1.7}';document.head.append(menuStyle);
 let owner=null,allies=[],pending=null;const corpses=[];
 const now=()=>movementTime();
 const dist=(a,b,x,y)=>Math.max(Math.abs(a-x),Math.abs(b-y));
 const cha=()=>PlayerClassStats.read().attributes.cha||0;
 const used=()=>allies.reduce((n,a)=>n+a.cost,0);
 const room=()=>cha()+6-used();
 function spot(x,y){
  for(let r=1;r<=3;r++)for(let dy=-r;dy<=r;dy++)for(let dx=-r;dx<=r;dx++){const tx=x+dx,ty=y+dy;if(Math.max(Math.abs(dx),Math.abs(dy))!==r)continue;
   const t=tile(tx,ty);if(t&&!(t&128)&&!IslandMonsters.occupied(tx,ty)&&!allies.some(a=>a.mob.x===tx&&a.mob.y===ty)&&!(tx===worldX&&ty===worldY))return [tx,ty];}
  return [x,y];
 }
 function create(npcId,x,y,cost,kind,hp){
  const npc=islandMonsterTemplates[npcId];if(!npc||!islandMonsterFrames[npc.gfx])return null;
  const [sx,sy]=spot(x,y);
  const spawn={mapId:window.activeMapId||0,spawnId:-npcId,zone:'召喚',count:1,npcId,group:0,point:[sx,sy],random:[0,0],bounds:[0,0,0,0],heading:0,respawn:[0,0],movement:0,npc,ally:true};
  const mob={spawn,region:[sx,sy,sx,sy],x:sx,y:sy,homeX:sx,homeY:sy,hp:Math.min(npc.hp,hp||npc.hp),mp:npc.mp,heading:4,rest:0,phase:Math.random()*1800,step:null,pack:null};
  mob.lastRegen=now();IslandNpcAi.reset(mob);mob.ready=0;
  IslandMonsters.addAlly(mob);
  const a={mob,cost,kind,until:kind==='tame'||kind==='zombie'?Infinity:now()+LIFE};allies.push(a);
  IslandMonsters.playEffect(169,sx,sy,now());
  return a;
 }
 function release(filter=()=>true){for(const a of allies.filter(filter)){IslandMonsters.removeAlly(a.mob);IslandMonsters.playEffect(169,a.mob.x,a.mob.y,now());}allies=allies.filter(a=>!filter(a));}

 // ---- skills (called by ClassBuffs before paying the cost; return an error text or a function that does the work) ----
 function prepare(kind,skill){
  if(kind==='summon'&&hasRing()){
   // 召喚控制戒指: choose from the list first (no cost yet); the chosen entry is used by the next cast.
   if(chosen===null){openMenu();return {menu:true};}
   const i=chosen;chosen=null;const id=RING_IDS[i],cost=RING_COST[i];
   if((window.activeCharacterLevel||1)<RING_LEVEL[i])return '等級不足，無法召喚。';
   if(id>=81238&&used())return '必須先收回其他召喚獸才能召喚。';
   const n=Math.floor(room()/cost);if(cha()+6<cost||n<1)return '魅力不足，無法再召喚。';
   if(!islandMonsterTemplates[id]||!islandMonsterFrames[islandMonsterTemplates[id].gfx])return '這種召喚獸目前沒有圖，無法召喚。';
   return ()=>{for(let k=0;k<n;k++)create(id,worldX,worldY,cost,'summon');};
  }
  if(kind==='summon'){
   const lv=window.activeCharacterLevel||1;let i=0;while(i<SUMMON_IDS.length-1&&lv>=32+i*4)i++;
   const n=Math.floor(room()/6);if(n<1)return '魅力不足，無法再召喚。';
   return ()=>{for(let k=0;k<n;k++)create(SUMMON_IDS[i],worldX,worldY,6,'summon');};
  }
  if(kind==='elemental'||kind==='greater'){
   const element=OwnedInventory.skills.element;const ids=ELEMENTAL[element];if(!ids)return '需要先選擇妖精屬性。';
   if(room()<7)return '魅力不足，無法再召喚。';
   return ()=>{create(ids[kind==='greater'?1:0],worldX,worldY,7,'elemental');};
  }
  if(kind==='tame'){
   const mob=IslandMonsters.target;if(!mob?.hp||dist(mob.x,mob.y,worldX,worldY)>(skill.range>0?skill.range:3))return '請先選擇範圍內的目標。';
   const npc=mob.spawn.npc;if(!(npc.raw?.tamable)||npc.level>(window.activeCharacterLevel||1))return '這隻怪物無法馴服。';
   if(room()<6)return '魅力不足，無法再馴服。';
   return ()=>{const hp=mob.hp;mob.hp=0;mob.step=null;const [mn,mx]=mob.spawn.respawn;mob.respawnAt=now()+1000*(Math.min(mn,mx)+Math.random()*Math.abs(mx-mn));IslandMonsters.setTarget(null);create(mob.spawn.npcId,mob.x,mob.y,6,'tame',hp);};
  }
  if(kind==='zombie'){
   const t=now(),c=corpses.find(c=>t-c.time<20000&&c.mapId===(window.activeMapId||0)&&dist(c.x,c.y,worldX,worldY)<=5);
   if(!c)return '附近沒有可以造屍的屍體（20 秒內被打倒的怪物）。';
   if(room()<6)return '魅力不足，無法再召喚。';
   return ()=>{corpses.splice(corpses.indexOf(c),1);create(c.npcId,c.x,c.y,6,'zombie');};
  }
  if(kind==='release'){if(!allies.length)return '目前沒有召喚的對象。';return ()=>release();}
  return '不支援的召喚。';
 }
 function killed(mob){
  if(mob.spawn.ally){const a=allies.find(a=>a.mob===mob);if(a){allies.splice(allies.indexOf(a),1);IslandMonsters.removeAlly(mob);}return;}
  if(mob.spawn.resident||mob.spawn.npc.raw?.cant_resurrect)return;
  corpses.unshift({npcId:mob.spawn.npcId,x:mob.x,y:mob.y,mapId:window.activeMapId||0,time:now()});corpses.length=Math.min(corpses.length,8);
 }

 // ---- ally AI (called from IslandMonsters.advance for spawn.ally) ----
 function enemyFor(mob){
  const t=IslandMonsters.target;
  if(t?.hp&&!t.spawn.ally&&dist(t.x,t.y,worldX,worldY)<=12)return t;
  return IslandMonsters.around(worldX,worldY,6).filter(m=>m.alert||m.windup||m.allyTarget).sort((a,b)=>dist(a.x,a.y,mob.x,mob.y)-dist(b.x,b.y,mob.x,mob.y))[0]||null;
 }
 // Straight step when nothing is in the way; otherwise follow the player's path finder (navigation.js findWalkingPath),
 // re-planned at most every 600 ms or when the goal moves, so walls do not make the ally swing back and forth.
 function moveToward(mob,tx,ty,t,stepToward){
  if(IslandCombat.clearShot(mob.x,mob.y,tx,ty)&&stepToward(mob,tx,ty,t)){mob.path=null;return true;}
  if(!mob.path||mob.pathGoal!==tx+','+ty&&t>=(mob.pathAt||0)){
   mob.pathAt=t+600;mob.pathGoal=tx+','+ty;
   mob.path=typeof findWalkingPath==='function'?findWalkingPath(mob.x,mob.y,tx,ty):null;
  }
  while(mob.path?.length&&mob.path[0][0]===mob.x&&mob.path[0][1]===mob.y)mob.path.shift();
  const next=mob.path?.[0];
  if(next&&stepToward(mob,next[0],next[1],t))return true;
  mob.path=null;return false;
 }
 function update(mob,t,stepToward){
  if(!mob.hp||mob.step)return;
  const npc=mob.spawn.npc,target=enemyFor(mob);
  if(target){
   const range=Math.max(1,npc.ranged||1);
   if(dist(target.x,target.y,mob.x,mob.y)<=range&&IslandCombat.clearShot(mob.x,mob.y,target.x,target.y)){
    if(t<(mob.ready||0))return;
    const dx=Math.sign(target.x-mob.x),dy=Math.sign(target.y-mob.y);const h=[[0,-1],[1,-1],[1,0],[1,1],[0,1],[-1,1],[-1,0],[-1,-1]].findIndex(([x,y])=>x===dx&&y===dy);if(h>=0)mob.heading=h;
    const duration=npc.attack||1000;mob.action={clip:'attack',start:t,end:t+duration};mob.ready=t+duration;
    const r=NativeCombatRules.physical(npc,{ac:target.spawn.npc.ac||0,dodge:0,reduction:0,role:''});
    setTimeout(()=>{if(!target.hp||!mob.hp)return;if(!target.spawn.resident&&!target.allyTarget)target.allyTarget=mob;if(r.hit&&r.damage>0)IslandMonsters.damage(target,r.damage);},duration*.45);
    return;
   }
   moveToward(mob,target.x,target.y,t,stepToward);return;
  }
  if(dist(mob.x,mob.y,worldX,worldY)>2)moveToward(mob,worldX,worldY,t,stepToward);
 }
 // ---- monsters fighting back (called first in IslandNpcAi.update) ----
 // A monster hit by an ally attacks that ally (same NativeCombatRules.physical) until the ally dies, leaves 12 cells or the
 // player hits the monster (ClassBuffs.onHit／player-skills clear allyTarget). Returns true while it handles the monster.
 function drive(mob,t,stepToward){
  const a=mob.allyTarget;
  if(!a)return false;
  if(!a.hp||!allies.some(x=>x.mob===a)||dist(a.x,a.y,mob.x,mob.y)>12||mob.spawn.resident){mob.allyTarget=null;return false;}
  if(!mob.hp)return true;
  mob.alert=true;
  if(mob.step||t<(mob.ready||0))return true;
  const npc=mob.spawn.npc,range=Math.max(1,npc.ranged||1);
  if(dist(a.x,a.y,mob.x,mob.y)<=range&&IslandCombat.clearShot(mob.x,mob.y,a.x,a.y)){
   const dx=Math.sign(a.x-mob.x),dy=Math.sign(a.y-mob.y);const h=[[0,-1],[1,-1],[1,0],[1,1],[0,1],[-1,1],[-1,0],[-1,-1]].findIndex(([x,y])=>x===dx&&y===dy);if(h>=0)mob.heading=h;
   const duration=npc.attack||1000;mob.action={clip:'attack',start:t,end:t+duration};mob.ready=t+duration*(window.ClassBuffs?.slowed(mob)?1.33:1);
   const r=NativeCombatRules.physical(npc,{ac:a.spawn.npc.ac||0,dodge:0,reduction:0,role:''});
   setTimeout(()=>{if(mob.hp&&a.hp&&r.hit&&r.damage>0)hurt(a,r.damage);},duration*.45);
   return true;
  }
  if(!window.ClassBuffs?.rooted(mob))moveToward(mob,a.x,a.y,t,stepToward);
  return true;
 }
 function hurt(mob,amount){
  mob.hp=Math.max(0,mob.hp-amount);window.CombatSound?.monsterHit?.(mob);
  if(!mob.hp){IslandMonsters.playEffect(169,mob.x,mob.y,now());window.toast?.(mob.spawn.npc.name+' 倒下了。');killed(mob);}
 }

 // ---- follow the player across maps, expire, reset per character ----
 function tick(){
  const current=window.gameFlowState==='playing'?window.activeCharacterId:null;
  if(current!==owner){release();owner=current;corpses.length=0;
   // Saved allies (entry-flow saveActiveCharacter → character.summons) come back next to the player.
   if(pending&&pending.id===current){for(const s of pending.list){const a=create(s.npcId,worldX,worldY,s.cost,s.kind,s.hp);if(a&&s.left!=null)a.until=now()+s.left;}}
   pending=null;}
  if(!current)return;
  const t=now();
  for(const a of allies){
   const m=a.mob;if(!m.hp)continue;
   const lost=!IslandMonsters.hasMob(m)||(m.spawn.mapId||0)!==(window.activeMapId||0)||dist(m.x,m.y,worldX,worldY)>16;
   if(lost){const [x,y]=spot(worldX,worldY);m.spawn.mapId=window.activeMapId||0;m.x=m.homeX=x;m.y=m.homeY=y;m.step=null;IslandMonsters.addAlly(m);}
  }
  const expired=a=>t>=a.until||!a.mob.hp;
  if(allies.some(expired))release(expired);
 }
 setInterval(tick,500);
 function snapshot(){const t=now();return allies.filter(a=>a.mob.hp).map(a=>({npcId:a.mob.spawn.npcId,hp:a.mob.hp,cost:a.cost,kind:a.kind,left:a.until===Infinity?null:Math.max(0,Math.round(a.until-t))}));}
 function restore(id,list){pending=Array.isArray(list)&&list.length?{id,list:list.filter(s=>s&&Number.isInteger(s.npcId)&&islandMonsterTemplates[s.npcId]&&s.hp>0).slice(0,12)}:null;}
 return {prepare,update,drive,killed,restore,get snapshot(){return owner===window.activeCharacterId?snapshot():[];},release:()=>release(),get mobs(){return allies.map(a=>a.mob);},get list(){return allies.map(a=>({name:a.mob.spawn.npc.name,hp:a.mob.hp,kind:a.kind}))},get room(){return room();}};
})();window.Summons=Summons;
