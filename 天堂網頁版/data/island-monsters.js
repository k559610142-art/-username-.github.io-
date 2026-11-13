const IslandMonsters = (() => {
  const surface=document.createElement('canvas');
  surface.className='island-monster-layer';
  surface.setAttribute('aria-hidden','true');
  surface.style.cssText='position:absolute;inset:0;width:100%;height:100%;pointer-events:none';
  canvas.after(surface);
  const pen=surface.getContext('2d');
  const directions=['NW','N','NE','E','SE','S','SW','W'];
  const steps=[[0,-1],[1,-1],[1,0],[1,1],[0,1],[-1,1],[-1,0],[-1,-1]];
  const decodedSheets=new WeakSet(),sheets=new Map(), mobs=[], taken=new Set();
  let hitboxes=[],selected=null,lastTap=null;
  const within=(area,x,y)=>x>=area[0]&&x<=area[2]&&y>=area[1]&&y<=area[3];
  const town=gfx=>gfx===945||gfx===1094;
  const effects=[];
  function usable(spawn,x,y){
    if(spawn.resident)return !!WorldMaps.cell(spawn.mapId||0,x,y)&&steps.some(([dx,dy])=>canTraverse(x,y,dx,dy));
    const cell=tile(x,y);
    return !!cell&&!(cell&128)&&(town(spawn.npc.gfx)||(cell&48)!==16)
      &&steps.some(([dx,dy])=>canTraverse(x,y,dx,dy));
  }
  function addMob(spawn, region, x, y, random, pack = null) {
    const mob = {spawn,region,x,y,homeX:x,homeY:y,hp:Math.max(1,spawn.npc.hp),heading:spawn.heading%8,
      rest:500+random()*2200,phase:random()*1800,step:null,pack};
    mob.lastRegen=movementTime();mobs.push(mob);
    IslandNpcAi.reset(mob);
    return mob;
  }
  function spawnPack(spawn, region, x, y, random) {
    const group = islandMonsterGroups[spawn.group];
    const pack = group ? {members:[],group} : null;
    const leader = addMob(spawn,region,x,y,random,pack);
    if (!pack) return;
    pack.leader = leader;
    for (const [id,count] of group.members) {
      const npc = islandMonsterTemplates[id];
      if (!npc || !islandMonsterFrames[npc.gfx]) continue;
      const member = {...spawn,npcId:id,npc};
      for (let i=0;i<count;i++) {
        const spot = steps.map(([dx,dy])=>[x+dx,y+dy]).find(([tx,ty])=>!taken.has(tx+','+ty)&&usable(member,tx,ty));
        const [tx,ty] = spot || [x,y];
        if (spot) taken.add(tx+','+ty);
        pack.members.push(addMob(member,region,tx,ty,random,pack));
      }
    }
  }
  // Keep village landmarks and service NPCs visible. Other residents remain in the source data.
  const villageServices = new Set([60001,70014,...TELEPORTER_DATA.ids,...dbActiveSettings.system_item_blend.rows.map(row=>row[1])]); // 傳送師、倉庫、雜貨商
  const occupancy=new Set();let occupancyTick=-1;const populations=new Map();let populationMap=null;
  function seedPopulation(){
  // These two DB positions belong to a different house layout. Match the supplied client indoor groups.
  const indoorServices={231:[33094,33385],262:[33097,33405]};
  for(const source of islandMonsterSpawns){
    const corrected=source.resident&&source.mapId===4&&indoorServices[source.spawnId];
    const spawn=corrected?{...source,point:corrected,sourcePoint:source.point}:source;
    if((spawn.mapId||0)!==(window.activeMapId||0))continue;
    if(!islandMonsterFrames[spawn.npc.gfx])continue;
    let seed=spawn.spawnId>>>0;
    const random=()=>((seed=(Math.imul(seed,1664525)+1013904223)>>>0)/4294967296);
    const [px,py]=spawn.point;
    const [rx,ry]=spawn.random;
    const region=spawn.bounds[2] ? spawn.bounds : [px-(spawn.resident?rx:Math.max(1,rx)),py-(spawn.resident?ry:Math.max(1,ry)),px+(spawn.resident?rx:Math.max(1,rx)),py+(spawn.resident?ry:Math.max(1,ry))];
    // Scale each wild spawn row for local play. spawnPack still adds its full group.
    const count=spawn.count;
    for(let i=0;i<count;i++){
      // Fixed service NPCs use the DB point even on indoor or occupied cells.
      if(spawn.resident&&rx===0&&ry===0&&!spawn.bounds[2]){taken.add(px+","+py);spawnPack(spawn,region,px,py,random);continue;}
      for(let attempt=0;attempt<120;attempt++){
        const fixed=i===0&&attempt===0&&within(region,px,py);
        const x=fixed?px:region[0]+Math.floor(random()*(region[2]-region[0]+1));
        const y=fixed?py:region[1]+Math.floor(random()*(region[3]-region[1]+1));
        const spot=x+','+y;
        if(taken.has(spot)||!usable(spawn,x,y))continue;
        taken.add(spot);
        spawnPack(spawn,region,x,y,random);
        break;
      }
    }
  }
  }
  function ensurePopulation(){const id=window.activeMapId||0;if(id===populationMap)return;if(populationMap!==null)populations.set(populationMap,mobs.splice(0).filter(m=>!m.spawn.ally));populationMap=id;occupancyTick=-1;taken.clear();selected=null;const previous=populations.get(id);if(previous)mobs.push(...previous);else seedPopulation();}
  function startStep(mob, heading, now) {
    const [dx,dy] = steps[heading], x = mob.x+dx, y = mob.y+dy;
    const frames = islandMonsterFrames[mob.spawn.npc.gfx]['d'+heading+'/walk'];
    if (!frames || x===worldX&&y===worldY || !usable(mob.spawn,x,y) || !canTraverse(mob.x,mob.y,dx,dy)) return false;
    const duration = mob.spawn.npc.walk || frames.reduce((sum,frame)=>sum+frame[5],0);
    mob.heading = heading;
    mob.step = {x,y,start:now,end:now+duration};
    return true;
  }
  function stepToward(mob, tx, ty, now) {
    const distance = (x,y)=>Math.hypot(x-tx,y-ty);
    const options = steps.map(([dx,dy],heading)=>({heading,dist:distance(mob.x+dx,mob.y+dy)}))
      .filter(option=>option.dist<distance(mob.x,mob.y))
      .sort((a,b)=>a.dist-b.dist);
    return options.some(({heading})=>startStep(mob,heading,now));
  }
  function advance(mob,now){
    const regen=mob.spawn.npc.regeneration;if(regen&&mob.hp>0){const last=mob.regenTimes??={hp:now,mp:now};for(const key of ['hp','mp']){const ms=regen[key+'Ms'];if(ms>0&&regen[key]>0&&now-last[key]>=ms){const ticks=Math.floor((now-last[key])/ms);last[key]+=ticks*ms;mob[key]=Math.min(mob.spawn.npc[key],(mob[key]||0)+ticks*regen[key]);}}}

    if(mob.step&&now>=mob.step.end){
      mob.x=mob.step.x;mob.y=mob.step.y;mob.step=null;
      mob.rest=now+1400+Math.random()*2300;
    }
    if(mob.spawn.ally){window.Summons?.update(mob,now,stepToward);return;}    if(IslandNpcAi.update(mob,now,mobs,steps,stepToward))return;
    // 消氣的常駐 NPC（被強制攻擊追出去的警衛）走回原位
    if(mob.spawn.resident){if(!mob.step&&now>=mob.rest&&(mob.x!==mob.homeX||mob.y!==mob.homeY)&&!stepToward(mob,mob.homeX,mob.homeY,now))mob.rest=now+1000;return;}
    if(mob.step||now<mob.rest)return;
    const leader=mob.pack?.leader;
    const home=leader&&leader!==mob&&leader.hp?[leader.x,leader.y]:[mob.homeX,mob.homeY];
    if(Math.max(Math.abs(mob.x-home[0]),Math.abs(mob.y-home[1]))>3){
      if(!stepToward(mob,...home,now))mob.rest=now+1000;
      return;
    }
    const clips=islandMonsterFrames[mob.spawn.npc.gfx];
    if(!mob.step&&now>=mob.rest&&clips['d'+mob.heading+'/walk']){
      const first=Math.floor(Math.random()*steps.length);
      for(let i=0;i<steps.length;i++){
        const heading=(first+i)%steps.length,[dx,dy]=steps[heading],x=mob.x+dx,y=mob.y+dy;
        if(!within(mob.region,x,y)||Math.max(Math.abs(x-mob.homeX),Math.abs(y-mob.homeY))>3
           ||x===worldX&&y===worldY||!usable(mob.spawn,x,y)||!canTraverse(mob.x,mob.y,dx,dy))continue;
        if(startStep(mob,heading,now))break;
      }
      if(!mob.step)mob.rest=now+1600;
    }
  }
  function spriteFrame(mob,now,phase){
    const clips=islandMonsterFrames[mob.spawn.npc.gfx], prefix='d'+mob.heading+'/';
    const action=mob.action&&now<mob.action.end?mob.action:null;
    const frames=clips[prefix+(mob.step?'walk':action?.clip||'idle')]||
      (action&&clips[prefix+'attack'])||clips[prefix+'idle']||clips['d0/idle'];
    const total=frames.reduce((sum,frame)=>sum+frame[5],0);
    let time=mob.step?Math.min(.999,phase)*total:action?
      Math.max(0,Math.min(.999,(now-action.start)/(action.end-action.start)))*total:(now+mob.phase)%total,index=0;
    while(index<frames.length-1&&time>=frames[index][5])time-=frames[index++][5];
    const correction=mob.step?MonsterActions.walkOffset(frames,directions[mob.heading],index):[0,0];
    return [frames[index],correction];
  }
  function draw(view,now){
    ensurePopulation();
    const playing=window.gameFlowState==='playing'&&sceneStarted;
    surface.hidden=!playing;
    hitboxes=[];
    IslandNpcAi.playerActive();
    IslandNpcAi.updateRevive();
    if(!playing){selected=null;effects.length=0;return;}
    if(!view.width||!view.height)return;
    const dpr=Math.min(devicePixelRatio||1,2),w=Math.round(view.width*dpr),h=Math.round(view.height*dpr);
    if(surface.width!==w||surface.height!==h){surface.width=w;surface.height=h;}
    pen.setTransform(dpr,0,0,dpr,0,0);
    pen.clearRect(0,0,view.width,view.height);
    pen.imageSmoothingEnabled=false;
    const scale=characterRenderScale();
    const visible=[];
    for(const mob of mobs){
      if((mob.spawn.mapId||0)!==(window.activeMapId||0))continue;
      if(!mob.hp){
        if(now<mob.respawnAt)continue;
        mob.hp=mob.spawn.npc.hp;mob.x=mob.homeX;mob.y=mob.homeY;
        IslandNpcAi.reset(mob);mob.reward=null;
      }
      const nearby=Math.max(Math.abs(worldX-mob.x),Math.abs(worldY-mob.y))<=22;
      if(nearby)advance(mob,now);
      const [px,py]=project(mob.x,mob.y),sx=px*view.zoom+view.ox,sy=py*view.zoom+view.oy;
      if(sx<-120||sx>view.width+120||sy<-120||sy>view.height+160)continue;
      if(!nearby)advance(mob,now);
      const phase=mob.step?Math.max(0,Math.min(1,(now-mob.step.start)/(mob.step.end-mob.step.start))):0;
      const [x,y]=mob.step?project(mob.x+(mob.step.x-mob.x)*phase,mob.y+(mob.step.y-mob.y)*phase):project(mob.x,mob.y);
      visible.push([mob,x*view.zoom+view.ox,y*view.zoom+view.oy,phase]);
    }
    for(const [mob,x,y,phase] of visible.sort((a,b)=>a[2]-b[2])){
      const [[file,fx,fy,sw,sh,,sx,sy],[cx,cy]]=spriteFrame(mob,now,phase);
      if(!sheets.has(file)){const image=new Image();image.decoding='async';image.onload=()=>{const ready=()=>decodedSheets.add(image);if(image.decode)image.decode().then(ready,ready);else ready()};image.src=(typeof nativeMonsterFiles!=='undefined'&&nativeMonsterFiles.has(file)?'assets/native-monsters/':'assets/island-monsters-v2/')+file;sheets.set(file,image);}
      const sheet=sheets.get(file);
      if(!sheet.complete||!sheet.naturalWidth||!decodedSheets.has(sheet))continue;
      const left=x+(fx-cx)*scale,top=y+(fy-cy)*scale;
      const width=sw*scale,height=sh*scale;
      hitboxes.push({mob,left,top,width,height});
      if(mob===selected){
        pen.beginPath();pen.ellipse(x,y,Math.max(12,width*.36),6,0,0,Math.PI*2);
        pen.strokeStyle='#f0bc65';pen.lineWidth=2;pen.stroke();
      }
      pen.drawImage(sheet,sx,sy,sw,sh,left,top,width,height);
      const vx=mob.step?mob.x+(mob.step.x-mob.x)*phase:mob.x,vy=mob.step?mob.y+(mob.step.y-mob.y)*phase:mob.y;window.NativeWorld?.paintEntity(pen,view,vx,vy,{left,top,width,height});
      if(mob===selected){
        const meter=Math.max(42,Math.min(84,width));
        pen.fillStyle='#241b17';pen.fillRect(left+(width-meter)/2-1,top-21,meter+2,7);
        pen.fillStyle='#b73834';pen.fillRect(left+(width-meter)/2,top-20,meter*mob.hp/mob.spawn.npc.hp,5);
        pen.font='10px sans-serif';pen.textAlign='center';pen.fillStyle='#fff2dd';
        pen.fillText(mob.hp+' / '+mob.spawn.npc.hp,left+width/2,top-23);
      }
      pen.font='12px sans-serif';
      pen.textAlign='center';
      pen.lineWidth=3;
      pen.strokeStyle='#171510';
      pen.fillStyle=town(mob.spawn.npc.gfx)?'#ebdcb6':'#ffdd9a';
      const name=mob.spawn.npc.name.replace('^',' · ');
      pen.strokeText(name,left+sw*scale/2,top-5);
      pen.fillText(name,left+sw*scale/2,top-5);
    }
    for(let i=effects.length-1;i>=0;i--){
      const effect=effects[i];
      const elapsed=now-effect.start;
      if(elapsed>=effect.duration){effects.splice(i,1);continue;}
      const [px,py]=project(effect.x,effect.y);
      if(effect.nativeScreen&&window.NpcEffectRenderer){NpcEffectRenderer.draw(pen,effect,elapsed,px*view.zoom+view.ox,py*view.zoom+view.oy,scale);continue;}
      let remaining=elapsed;
      const frame=effect.frames.find(f=>(remaining-=f[5])<0)||effect.frames.at(-1);
      const [file,fx,fy,sw,sh,,sx,sy]=frame;
      if(!file||!sw||!sh)continue;
      if(!sheets.has(file)){const img=new Image();img.decoding='async';img.onload=()=>{const ready=()=>decodedSheets.add(img);if(img.decode)img.decode().then(ready,ready);else ready()};img.src=(typeof nativeMonsterFiles!=='undefined'&&nativeMonsterFiles.has(file)?'assets/native-monsters/':'assets/island-monsters-v2/')+file;sheets.set(file,img);}
      const image=sheets.get(file);
      if(image.complete&&image.naturalWidth&&decodedSheets.has(image)){pen.save();pen.globalCompositeOperation=effect.attribute===8?'screen':effect.attribute===128?'multiply':'source-over';pen.drawImage(image,sx||0,sy||0,sw,sh,px*view.zoom+view.ox+fx*scale,py*view.zoom+view.oy+fy*scale,sw*scale,sh*scale);pen.restore();}
    }
  }
  function playEffect(gfx,x,y,now,options={}){
    const visited=options.visited||new Set();if(visited.has(gfx))return;visited.add(gfx);
    const native=typeof NPC_EFFECT_DATA!=='undefined'&&NPC_EFFECT_DATA[gfx],frames=native?.directions['d'+(options.heading||0)+'/idle']||native?.directions['d0/idle']||islandMonsterFrames[gfx]?.['d0/idle'];
    if(frames)effects.push({gfx,heading:options.heading||0,nativeScreen:native?.attribute===8,frames,attribute:native?.attribute||0,x,y,start:now,duration:frames.reduce((sum,f)=>sum+f[5],0)});
    for(const child of native?.attribute===8?[]:native?.parts||[])playEffect(child,x,y,now,{...options,visited});
  }
  function selectAt({x,y}){
    const hit=hitboxes.findLast(box=>x>=box.left-4&&x<=box.left+box.width+4&&y>=box.top-4&&y<=box.top+box.height+4);
    const next=hit?.mob?.spawn.ally?null:hit?.mob||null;
    // 強制攻擊開啟：點到的目標（含 NPC、守衛）直接攻擊。
    if(next&&window.ForceAttack?.on){lastTap=null;if(next!==selected){selected=next;draw(getRenderedSceneView(),movementTime());}return 'attack';}
    if(next?.spawn.resident){
      selected=null;
      lastTap=null;
      IslandNpcServices.open(next.spawn.npcId);
      return true;
    }
    const now=movementTime();
    if(next&&lastTap?.mob===next&&now-lastTap.time<=420){
      lastTap=null;return 'attack';
    }
    lastTap=next?{mob:next,time:now}:null;
    if(next!==selected){selected=next;draw(getRenderedSceneView(),now);}
    return !!hit;
  }
  function nearest(range,eligible=()=>true){
    return mobs.filter(m=>(m.spawn.mapId||0)===(window.activeMapId||0)&&m.hp&&!m.spawn.resident&&!m.spawn.ally&&!town(m.spawn.npc.gfx)&&Math.max(Math.abs(m.x-worldX),Math.abs(m.y-worldY))<=range&&eligible(m))
      .sort((a,b)=>Math.hypot(a.x-worldX,a.y-worldY)-Math.hypot(b.x-worldX,b.y-worldY))[0];
  }
  function setTarget(mob){selected=mob;draw(getRenderedSceneView(),movementTime());}
  function damage(mob,amount){
    if(!mob.hp)return;
    // 商人、傳送師等 DB 沒有血量的常駐 NPC 不會受傷（強制攻擊只會揮空）；守衛、稻草人等有血量的照常扣血。
    if(mob.spawn.resident&&!(mob.spawn.npc.hp>0)){CombatSound.monsterHit(mob);return;}
    IslandNpcAi.provoke(mob,mobs);
    if(amount>=mob.hp&&!mob.spawn.resident&&!PlayerProgression.award(mob))return;
    mob.hp=Math.max(0,mob.hp-amount);
    CombatSound.monsterHit(mob);
    if(!mob.hp){
      window.Summons?.killed(mob);const [min,max]=mob.spawn.respawn;
      const respawn=movementTime()+1000*(Math.min(min,max)+Math.random()*Math.abs(max-min));
      mob.step=null;mob.respawnAt=respawn;
      if(mob.pack?.leader===mob&&mob.pack.group.removeWithLeader){
        for(const member of mob.pack.members){member.hp=0;member.step=null;member.respawnAt=respawn;}
      }
      if(selected===mob)selected=null;
    }
    draw(getRenderedSceneView(),movementTime());
  }
  function updateBackground(now){
    ensurePopulation();
    if(window.gameFlowState!=='playing'||!sceneStarted)return;
    IslandNpcAi.playerActive();
    for(const mob of mobs){
      if((mob.spawn.mapId||0)!==(window.activeMapId||0))continue;
      if(!mob.hp){if(mob.spawn.ally||now<mob.respawnAt)continue;mob.hp=mob.spawn.npc.hp;mob.x=mob.homeX;mob.y=mob.homeY;IslandNpcAi.reset(mob);mob.reward=null;}
      if(Math.max(Math.abs(worldX-mob.x),Math.abs(worldY-mob.y))<=Math.max(22,window.IslandCombat?.autoRange||22))advance(mob,now);
    }
  }
  return {get residentPositions(){ensurePopulation();return mobs.filter(m=>m.spawn.resident).map(m=>({id:m.spawn.npcId,spawnId:m.spawn.spawnId,x:m.x,y:m.y,point:[...m.spawn.point],sourcePoint:[...(m.spawn.sourcePoint||m.spawn.point)],random:[...m.spawn.random]}))},get audit(){return {mapId:populationMap,spawned:mobs.length,sourceRows:islandMonsterSpawns.length,fullCounts:true}},occupied:(x,y)=>{ensurePopulation();const tick=Math.floor(movementTime()/50);if(tick!==occupancyTick){occupancyTick=tick;occupancy.clear();for(const m of mobs)if(m.hp){occupancy.add(m.x+","+m.y);if(m.step)occupancy.add(m.step.x+","+m.step.y)}}return occupancy.has(x+","+y)},around:(x,y,r)=>{ensurePopulation();return mobs.filter(m=>m.hp&&!m.spawn.resident&&!m.spawn.ally&&(m.spawn.mapId||0)===(window.activeMapId||0)&&Math.max(Math.abs(m.x-x),Math.abs(m.y-y))<=r)},addAlly:(mob)=>{ensurePopulation();if(!mobs.includes(mob))mobs.push(mob);return mob;},removeAlly:(mob)=>{const i=mobs.indexOf(mob);if(i>=0)mobs.splice(i,1);if(selected===mob)selected=null;},hasMob:(mob)=>mobs.includes(mob),updateBackground,draw,selectAt,nearest,setTarget,damage,playEffect,serviceNearby:(id,range)=>mobs.some(m=>(m.spawn.mapId||0)===(window.activeMapId||0)&&m.spawn.resident&&m.spawn.npcId===id&&Math.max(Math.abs(m.x-worldX),Math.abs(m.y-worldY))<=range),get target(){return selected;}};
})();
const drawIslandScene=draw;
draw=function(now=movementTime()){
  drawIslandScene(now);
  IslandMonsters.draw(getRenderedSceneView(),now);
};
setInterval(()=>{
  if(!document.hidden&&!movementAnimating())IslandMonsters.draw(getRenderedSceneView(),movementTime());
},80);

// AI runs independently of repainting and character animation.
setInterval(()=>IslandMonsters.updateBackground(movementTime()),100);
