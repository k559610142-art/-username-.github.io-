// Adapter for the existing local-world simulation. The pure brain has no DOM dependency.
window.FakePlayerAutonomy=(()=>{
 const Brain=window.FakePlayerBrain,KEY='lineage-fake-experience-v1';
 let records={};try{const data=JSON.parse(localStorage.getItem(KEY)||'{}');if(data&&typeof data==='object'&&!Array.isArray(data))records=data;}catch{}
 const ids=new WeakMap();let sequence=0,lastSave=-Infinity;
 const id=m=>{if(!ids.has(m))ids.set(m,'mob-'+(++sequence));return ids.get(m);};
 const distance=Brain.distance,safe=(x,y)=>(tile(x,y)&48)===16;
 function ensure(mob,now){const f=mob.fp;if(!f.brain){const saved=records[mob.spawn.npc.name],age=Math.max(0,Date.now()-(saved?.at||0)),data=saved?.brain?{...saved.brain,dangers:(saved.brain.dangers||[]).map(d=>({...d,ttl:d.ttl-age}))}:null;
   f.brain=Brain.create(mob.spawn.npc.name,data,now);f.potions??=8;f.bagLoad=0;f.bagCapacity=20;f.privateGold=50;f.pendingLoot=[];f.brainMp=mob.spawn.npc.level*3+40;f.brainMpAt=now;f.observedTown=null;
  }return f.brain;}
 function persist(mob,now,force=false){if(!force&&now-lastSave<5000)return;lastSave=now;records[mob.spawn.npc.name]={at:Date.now(),brain:Brain.checkpoint(mob.fp.brain,now)};const rows=Object.entries(records).sort((a,b)=>b[1].at-a[1].at).slice(0,80);records=Object.fromEntries(rows);try{localStorage.setItem(KEY,JSON.stringify(records));}catch{}}
 function remember(mob,event,target,now){const b=ensure(mob,now);Brain.remember(b,event,{map:mob.spawn.mapId||0,x:mob.x,y:mob.y,species:target?.spawn?.npcId||target?.spawn?.npc?.name||'unknown',id:target?id(target):''},now);persist(mob,now,event==='death');}
 function clear(mob,hooks){const f=mob.fp;if(f.target)hooks.claimed.delete(f.target);f.target=null;f.huntGoal=null;f.goal=null;f.route=null;}
 function sensed(mob,hooks){const local=IslandMonsters.around(mob.x,mob.y,12);for(const m of local){const owner=hooks.claimed.get(m);if(owner&&(!owner.hp||owner.fp?.hidden||owner.fp?.target!==m))hooks.claimed.delete(m);}return local.filter(m=>m.hp>0&&IslandCombat.clearShot(mob.x,mob.y,m.x,m.y)&&(m.botEnemy===mob||(m.spawn.mapId||0)!==(window.activeMapId||0)||Math.max(Math.abs(m.x-worldX),Math.abs(m.y-worldY))>4)) /* 不搶玩家腳邊 4 格內的怪 */.map(m=>({mob:m,id:id(m),map:m.spawn.mapId||0,x:m.x,y:m.y,alive:m.hp>0,lineOfSight:true,visible:true,species:m.spawn.npcId||m.spawn.npc.name,level:m.spawn.npc.level||1,boss:/BOSS/i.test(m.spawn.npc.name)||m.spawn.count===1&&m.spawn.npc.hp>=1500,safe:safe(m.x,m.y),playerClaim:m===IslandMonsters.target,claimedOther:hooks.claimed.has(m)&&hooks.claimed.get(m)!==mob,engaged:!!m.alert,attackingSelf:m.botEnemy===mob,aggressive:!!m.spawn.npc.aggressive,value:Math.min(8,(m.spawn.npc.level||1)/8),quest:!!mob.fp.need&&drops(m).some(d=>d.id===mob.fp.need.item?.id)}));}
 const drops=m=>(typeof killRewardData!=='undefined'?killRewardData:window.killRewardData)?.drops?.[m.spawn.npcId]||[];
 function move(mob,now,stepToward,seen,kind,target=null){const f=mob.fp;
  if(mob.step)return true;
  if(f.moveIntent?.kind===kind&&now<f.moveIntent.until&&distance(mob,f.moveIntent)>0&&stepToward(mob,f.moveIntent.x,f.moveIntent.y,now))return true;
  const points=[];for(const r of [2,4,6])for(const [dx,dy]of [[1,0],[1,1],[0,1],[-1,1],[-1,0],[-1,-1],[0,-1],[1,-1]]){const p={x:mob.x+dx*r,y:mob.y+dy*r};if(!TeleportScrolls.canLand(p.x,p.y))continue;
   const danger=Brain.danger(f.brain,p,mob.spawn.mapId||0,now),close=seen.filter(e=>!e.safe&&distance(p,e)<3).length;
   let score=-danger*30-close*7-distance(mob,p)*.35;
   if(kind==='retreat')score+=(seen.length?Math.min(...seen.map(e=>distance(p,e))):0)*4+(safe(p.x,p.y)?30:0);
   else if(kind==='kite'&&target)score-=Math.abs(distance(p,target)-Math.max(3,(mob.spawn.npc.ranged||1)-1))*5;
   else score+=Math.sin((p.x*13+p.y*7)+now/9000)*2+(distance(p,{x:worldX,y:worldY})<3?-10:0);
   points.push({...p,score});}
  for(const p of points.sort((a,b)=>b.score-a.score))if(stepToward(mob,p.x,p.y,now)){f.moveIntent={...p,kind,until:now+2200};return true;}
  f.moveIntent=null;return false;
 }
 // 旅行（2026-11-16 使用者：假人不要在玩家附近來回走，要像真人「經過就離開」）：
 //  沒事做時朝一個方向一路走（每段 10～18 格，方向只小幅偏轉），靠近玩家 14 格內就轉向遠離玩家的方向。
 const playerGap=mob=>(mob.spawn.mapId||0)===(window.activeMapId||0)?Math.max(Math.abs(mob.x-worldX),Math.abs(mob.y-worldY)):Infinity;
 function pickTrip(mob,now,away){const f=mob.fp;let base=f.tripAngle??Math.random()*Math.PI*2;
  if(away||playerGap(mob)<14)base=Math.atan2(mob.y-worldY,mob.x-worldX);
  for(let i=0;i<16;i++){const a=base+(Math.random()-.5)*(i<10?1.1:3.6),r=10+Math.random()*8,x=Math.round(mob.x+Math.cos(a)*r),y=Math.round(mob.y+Math.sin(a)*r);
   if(!TeleportScrolls.canLand(x,y))continue;if(!away&&Math.max(Math.abs(x-worldX),Math.abs(y-worldY))<6)continue;f.tripAngle=a;f.trip={x,y,until:now+25000,fails:0};return true;}
  f.tripAngle=Math.random()*Math.PI*2;f.trip=null;return false;}
 function travel(mob,now,stepToward,away=false){const f=mob.fp;if(mob.step)return true;
  if(!f.trip||distance(mob,f.trip)<=1||now>f.trip.until)pickTrip(mob,now,away);
  if(!f.trip)return false;if(stepToward(mob,f.trip.x,f.trip.y,now)){f.trip.fails=0;return true;}
  if(++f.trip.fails>=3)f.trip=null;return false;}
 // 在玩家 12 格內待超過 35～80 秒（打怪也算）就收手離開，走到 28 格外才恢復平常行為。
 function linger(mob,now){const f=mob.fp,gap=playerGap(mob);
  if(gap<=12)f.nearSince??=now;else if(gap>18&&!f.leaving)f.nearSince=null;
  if(!f.leaving&&f.nearSince!=null&&now-f.nearSince>(f.lingerMs??=35000+Math.random()*45000)){f.leaving=true;f.trip=null;}
  if(f.leaving&&gap>=28){f.leaving=false;f.nearSince=null;f.lingerMs=null;}
  return f.leaving;}
 function restock(mob,now,stepToward,hooks){const f=mob.fp;clear(mob,hooks);f.moveIntent=null;
  if(safe(mob.x,mob.y)){if(!(f.restockAt>0))f.restockAt=now+5000;if(now<f.restockAt)return;f.potions=10;f.privateGold=Math.max(0,f.privateGold+f.bagLoad*6-8);f.bagLoad=0;mob.hp=mob.spawn.npc.hp;f.brainMp=mob.spawn.npc.level*3+40;f.restockAt=0;f.state='town';f.since=now;f.brain.last=null;f.brain.nextThink=now+2000;hooks.say(mob,'補好紅水了，再找個地方練功。');persist(mob,now,true);return;}
  if(f.observedTown&&distance(mob,f.observedTown)<40&&stepToward(mob,f.observedTown.x,f.observedTown.y,now))return;
  const rule=(typeof TeleportMapRules!=='undefined'?TeleportMapRules[mob.spawn.mapId||0]:null)||window.NATIVE_DUNGEON_MAPS?.[mob.spawn.mapId||0]?.rules;
  if(rule?.escapable&&rule.usableItem){hooks.say(mob,'先回城整理背包、補紅水。');IslandMonsters.playEffect(169,mob.x,mob.y,now);f.hidden=true;f.vanish=now+35000;f.resupplyTrip=true;mob.step=mob.action=null;persist(mob,now,true);return;}
  // A map that forbids escape scrolls must not teleport the NPC out either.
  f.restockAt=0;f.think=now+2000;move(mob,now,stepToward,[],'wander');
 }
 function onReturn(mob,now){const f=mob.fp;ensure(mob,now);if(f.resupplyTrip){f.potions=10;f.privateGold=Math.max(0,f.privateGold+f.bagLoad*6-8);f.bagLoad=0;f.brainMp=mob.spawn.npc.level*3+40;f.resupplyTrip=false;}f.brain.last=null;f.brain.target=null;f.brain.nextThink=now+f.brain.reaction;f.moveIntent=null;}
 function canReturn(mob,point,now){return Brain.danger(ensure(mob,now),{x:point[0],y:point[1]},mob.spawn.mapId||0,now)<2;}
 function killed(mob,target,now,hooks){const f=mob.fp;hooks.claimed.delete(target);if(f.target===target)f.target=null;remember(mob,'win',target,now);
  let rare=null;for(const d of drops(target)){if(d.id!==40308&&d.chance>0&&d.chance<=20000&&Math.random()*1e6<d.chance*2){rare=d.id;break;}}
  // Personal NPC spoils, not player ground drops or inventory. Roll once at kill time.
  f.pendingLoot.push({id:'loot-'+(++sequence),map:mob.spawn.mapId||0,x:target.x,y:target.y,value:rare?8:2,rare,monster:target.spawn.npc.name,expires:now+25000});f.pendingLoot=f.pendingLoot.slice(-8);f.brain.target=null;f.brain.last=null;f.brain.nextThink=now+500;
 }
 function attack(mob,target,now,kind,hooks,seen){const f=mob.fp,reach=mob.spawn.npc.ranged||1;if(now<f.ready||mob.step)return;
  const gap=distance(mob,target);if(gap>reach||!IslandCombat.clearShot(mob.x,mob.y,target.x,target.y))return;
  const cast=kind==='area'||kind==='control',duration=f.look.attackMs||900,map=window.activeMapId||0,owner=window.activeCharacterId;
  if(kind==='area'){if(f.brainMp<24||now<(f.areaAt||0))return;f.brainMp-=24;f.areaAt=now+14000;}
  if(kind==='control'){if(f.brainMp<12||now<(f.controlAt||0))return;f.brainMp-=12;f.controlAt=now+16000;}
  hooks.face(mob,target.x,target.y);mob.action={clip:'attack',start:now,end:now+duration};f.ready=now+duration+f.brain.reaction*.35;
  if(reach>1)hooks.shoot(mob,target,now+duration*.45,f.look.weapon);
  const victims=kind==='area'?seen.filter(e=>!e.playerClaim&&!e.claimedOther&&(!e.engaged||e.attackingSelf)&&!e.safe&&distance(e,target)<=2&&distance(mob,e)<=reach).slice(0,4).map(e=>e.mob):[target];
  setTimeout(()=>{const time=movementTime();if(window.gameFlowState!=='playing'||window.activeCharacterId!==owner||(window.activeMapId||0)!==map||(mob.spawn.mapId||0)!==map||!mob.hp||f.hidden||f.retreatUntil||f.target!==target)return;
   for(const t of victims){if(!t.hp||t===IslandMonsters.target||safe(mob.x,mob.y)||safe(t.x,t.y)||distance(mob,t)>reach||!IslandCombat.clearShot(mob.x,mob.y,t.x,t.y)||(hooks.claimed.has(t)&&hooks.claimed.get(t)!==mob)||(t.alert&&t.botEnemy!==mob))continue;
    const amount=Math.max(1,Math.round((4+mob.spawn.npc.level*.6)*(kind==='area'?.7:kind==='control'?.55:1)));
    IslandMonsters.botHit(t,amount,{attacker:mob});if(kind==='control'&&t.hp&&t.botEnemy===mob){t.botControlUntil=time+1800;t.windup=null;IslandMonsters.playEffect(750,t.x,t.y,time);}
    if(!t.hp)killed(mob,t,time,hooks);
   }
  },duration*.45);
 }
 function update(mob,now,stepToward,hooks){const f=mob.fp,b=ensure(mob,now);if(f.stall||f.social||f.partyOwner||f.pk)return false;
  if(f.simulationOwner&&f.simulationOwner!==window.activeCharacterId){clear(mob,hooks);b.target=null;b.last=null;b.nextThink=now+b.reaction;}f.simulationOwner=window.activeCharacterId;
  if(safe(mob.x,mob.y)){f.observedTown={x:mob.x,y:mob.y};if(mob.hp<mob.spawn.npc.hp&&now>=(f.restHealAt||0)){mob.hp=Math.min(mob.spawn.npc.hp,mob.hp+Math.ceil(mob.spawn.npc.hp*.04));f.restHealAt=now+1000;}}
  f.brainMp=Math.min(mob.spawn.npc.level*3+40,f.brainMp+Math.max(0,now-f.brainMpAt)/3000);f.brainMpAt=now;f.pendingLoot=f.pendingLoot.filter(l=>l.expires>now);
  const seen=sensed(mob,hooks),c={now,map:mob.spawn.mapId||0,x:mob.x,y:mob.y,hp:mob.hp,maxHp:mob.spawn.npc.hp,level:mob.spawn.npc.level,role:f.look.role,reach:mob.spawn.npc.ranged||1,vision:12,safe:safe(mob.x,mob.y),enemies:seen,potions:f.potions,healAt:f.healAt||0,mp:f.brainMp,areaAt:f.areaAt||0,controlAt:f.controlAt||0,kiteAt:f.kiteAt||0,load:f.bagLoad,capacity:f.bagCapacity,loot:f.pendingLoot};
  const plan=Brain.decide(b,c);f.intent=plan.kind;f.personality=b.profile.name;const leaving=linger(mob,now);
  if(leaving&&!['heal','retreat','restock'].includes(plan.kind)){if(f.target)clear(mob,hooks);b.target=null;f.intent='leave';travel(mob,now,stepToward,true);return true;}
  if(plan.kind==='heal'){if(f.potions>0&&now>=(f.healAt||0)){f.potions--;mob.hp=Math.min(mob.spawn.npc.hp,mob.hp+Math.ceil(mob.spawn.npc.hp*.24));f.healAt=now+1800;f.hpShow=now+2500;IslandMonsters.playEffect(189,mob.x,mob.y,now,{follow:mob});b.nextThink=Math.min(b.nextThink,now+400);}return true;}
  if(plan.kind==='retreat'){if(!f.retreatSince||now-f.retreatSince>20000){remember(mob,'retreat',f.target,now);f.retreatSince=now;hooks.say(mob,'這邊太危險，先拉開！');}clear(mob,hooks);move(mob,now,stepToward,seen.filter(e=>e.attackingSelf||e.aggressive),'retreat');return true;}
  if(plan.kind==='restock'){restock(mob,now,stepToward,hooks);return true;}
  if(plan.kind==='loot'){const l=f.pendingLoot.find(l=>l.id===plan.lootId);if(!l)return true;clear(mob,hooks);if(mob.step)return true;if(distance(mob,l)>1){if(!stepToward(mob,l.x,l.y,now))l.expires=Math.min(l.expires,now+2500);return true;}l.pickAt??=now+650;if(now>=l.pickAt){f.pendingLoot=f.pendingLoot.filter(x=>x!==l);f.bagLoad=Math.min(f.bagCapacity,f.bagLoad+1);f.privateGold+=2;if(l.rare){const item=INTERFACE_CATALOG.items.find(i=>i.id===l.rare);if(item)window.GameChat?.say('【全服】'+mob.spawn.npc.name+' 打倒了 '+l.monster+'，獲得了【'+item.name+'】！','drop');}b.nextThink=now+500;b.last=null;}return true;}
  const chosen=seen.find(e=>e.id===plan.targetId&&Brain.candidates(b,c).some(v=>v.id===e.id));
  if(chosen){const target=chosen.mob;if(f.target!==target){clear(mob,hooks);f.target=target;hooks.claimed.set(target,mob);f.ready=Math.max(f.ready||0,now+b.reaction);}
   if(mob.step)return true;if(plan.kind==='approach'){if(!stepToward(mob,target.x,target.y,now)){Brain.remember(b,'blocked',{id:chosen.id},now);clear(mob,hooks);}return true;}
   if(plan.kind==='kite'){f.kiteAt=now+2200;move(mob,now,stepToward,seen,'kite',target);return true;}
   attack(mob,target,now,plan.kind,hooks,seen);return true;
  }
  if(f.target)clear(mob,hooks);
  if(plan.kind==='wander'&&!mob.step&&!travel(mob,now,stepToward))move(mob,now,stepToward,seen,'wander');
  return true;
 }
 // 新來的路人：朝玩家方向（±25°）走過來，經過後由 pickTrip 自動轉開。
 function arrive(mob){if(mob?.fp&&!mob.fp.red&&Math.random()<.6)mob.fp.tripAngle=Math.atan2(worldY-mob.y,worldX-mob.x)+(Math.random()-.5)*.9;}
 return {update,remember,onReturn,canReturn,arrive};
})();
