const IslandMonsters = (() => {
  const surface=document.createElement('canvas');
  surface.className='island-monster-layer';
  surface.setAttribute('aria-hidden','true');
  surface.style.cssText='position:absolute;inset:0;width:100%;height:100%;pointer-events:none';
  canvas.after(surface);
  const pen=surface.getContext('2d');
  const directions=['NW','N','NE','E','SE','S','SW','W'];
  const steps=[[0,-1],[1,-1],[1,0],[1,1],[0,1],[-1,1],[-1,0],[-1,-1]];
  const sheets=new Map(), mobs=[], taken=new Set();
  let hitboxes=[],selected=null,lastTap=null;
  const within=(area,x,y)=>x>=area[0]&&x<=area[2]&&y>=area[1]&&y<=area[3];
  const town=gfx=>gfx===945||gfx===1094;
  function usable(spawn,x,y){
    const cell=tile(x,y);
    return !!cell&&!(cell&128)&&(town(spawn.npc.gfx)||(cell&48)!==16)
      &&steps.some(([dx,dy])=>canTraverse(x,y,dx,dy));
  }
  for(const spawn of islandMonsterSpawns){
    let seed=spawn.spawnId>>>0;
    const random=()=>((seed=(Math.imul(seed,1664525)+1013904223)>>>0)/4294967296);
    const [px,py]=spawn.point;
    const [rx,ry]=spawn.random;
    const region=spawn.bounds[2] ? spawn.bounds : [px-Math.max(1,rx),py-Math.max(1,ry),px+Math.max(1,rx),py+Math.max(1,ry)];
    const count=Math.min(12,Math.ceil(spawn.count/3));
    for(let i=0;i<count;i++){
      for(let attempt=0;attempt<120;attempt++){
        const fixed=i===0&&attempt===0&&within(region,px,py);
        const x=fixed?px:region[0]+Math.floor(random()*(region[2]-region[0]+1));
        const y=fixed?py:region[1]+Math.floor(random()*(region[3]-region[1]+1));
        const spot=x+','+y;
        if(taken.has(spot)||!usable(spawn,x,y))continue;
        taken.add(spot);
        mobs.push({spawn,region,x,y,homeX:x,homeY:y,hp:spawn.npc.hp,heading:spawn.heading%8,rest:500+random()*2200,phase:random()*1800,step:null});
        break;
      }
    }
  }
  function advance(mob,now){
    if(mob.step&&now>=mob.step.end){
      mob.x=mob.step.x;mob.y=mob.step.y;mob.step=null;
      mob.rest=now+1400+Math.random()*2300;
    }
    const clips=islandMonsterFrames[mob.spawn.npc.gfx];
    if(!mob.step&&now>=mob.rest&&clips['d'+mob.heading+'/walk']){
      const first=Math.floor(Math.random()*steps.length);
      for(let i=0;i<steps.length;i++){
        const heading=(first+i)%steps.length,[dx,dy]=steps[heading],x=mob.x+dx,y=mob.y+dy;
        if(!within(mob.region,x,y)||Math.max(Math.abs(x-mob.homeX),Math.abs(y-mob.homeY))>3
           ||x===worldX&&y===worldY||!usable(mob.spawn,x,y)||!canTraverse(mob.x,mob.y,dx,dy))continue;
        const frames=clips['d'+heading+'/walk'];
        if(!frames)continue;
        const duration=frames.reduce((total,frame)=>total+frame[5],0);
        mob.heading=heading;
        mob.step={x,y,start:now,end:now+duration};
        break;
      }
      if(!mob.step)mob.rest=now+1600;
    }
  }
  function spriteFrame(mob,now,phase){
    const frames=islandMonsterFrames[mob.spawn.npc.gfx]['d'+mob.heading+'/'+(mob.step?'walk':'idle')];
    const total=frames.reduce((sum,frame)=>sum+frame[5],0);
    let time=mob.step?Math.min(.999,phase)*total:(now+mob.phase)%total,index=0;
    while(index<frames.length-1&&time>=frames[index][5])time-=frames[index++][5];
    const correction=mob.step?MonsterActions.walkOffset(frames,directions[mob.heading],index):[0,0];
    return [frames[index],correction];
  }
  function draw(view,now){
    const playing=window.gameFlowState==='playing'&&sceneStarted;
    surface.hidden=!playing;
    hitboxes=[];
    if(!playing){selected=null;return;}
    if(!view.width||!view.height)return;
    const dpr=Math.min(devicePixelRatio||1,2),w=Math.round(view.width*dpr),h=Math.round(view.height*dpr);
    if(surface.width!==w||surface.height!==h){surface.width=w;surface.height=h;}
    pen.setTransform(dpr,0,0,dpr,0,0);
    pen.clearRect(0,0,view.width,view.height);
    pen.imageSmoothingEnabled=false;
    const scale=characterRenderScale();
    const visible=[];
    for(const mob of mobs){
      if(!mob.hp){if(now<mob.respawnAt)continue;mob.hp=mob.spawn.npc.hp;mob.x=mob.homeX;mob.y=mob.homeY;}
      const [px,py]=project(mob.x,mob.y),sx=px*view.zoom+view.ox,sy=py*view.zoom+view.oy;
      if(sx<-120||sx>view.width+120||sy<-120||sy>view.height+160)continue;
      advance(mob,now);
      const phase=mob.step?Math.max(0,Math.min(1,(now-mob.step.start)/(mob.step.end-mob.step.start))):0;
      const [x,y]=mob.step?project(mob.x+(mob.step.x-mob.x)*phase,mob.y+(mob.step.y-mob.y)*phase):project(mob.x,mob.y);
      visible.push([mob,x*view.zoom+view.ox,y*view.zoom+view.oy,phase]);
    }
    for(const [mob,x,y,phase] of visible.sort((a,b)=>a[2]-b[2])){
      const [[file,fx,fy,sw,sh,,sx,sy],[cx,cy]]=spriteFrame(mob,now,phase);
      if(!sheets.has(file)){const image=new Image();image.src='assets/island-monsters/'+file;sheets.set(file,image);}
      const sheet=sheets.get(file);
      if(!sheet.complete||!sheet.naturalWidth)continue;
      const left=x+(fx-cx)*scale,top=y+(fy-cy)*scale;
      const width=sw*scale,height=sh*scale;
      hitboxes.push({mob,left,top,width,height});
      if(mob===selected){
        pen.beginPath();pen.ellipse(x,y,Math.max(12,width*.36),6,0,0,Math.PI*2);
        pen.strokeStyle='#f0bc65';pen.lineWidth=2;pen.stroke();
      }
      pen.drawImage(sheet,sx,sy,sw,sh,left,top,width,height);
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
      const name=mob.spawn.npc.name;
      pen.strokeText(name,left+sw*scale/2,top-5);
      pen.fillText(name,left+sw*scale/2,top-5);
    }
  }
  function selectAt({x,y}){
    const hit=hitboxes.findLast(box=>x>=box.left-4&&x<=box.left+box.width+4&&y>=box.top-4&&y<=box.top+box.height+4);
    const next=hit?.mob||null;
    const now=movementTime();
    if(next&&lastTap?.mob===next&&now-lastTap.time<=420){
      lastTap=null;return 'attack';
    }
    lastTap=next?{mob:next,time:now}:null;
    if(next!==selected){selected=next;draw(getRenderedSceneView(),now);}
    return !!hit;
  }
  function nearest(range,eligible=()=>true){
    return mobs.filter(m=>m.hp&&!town(m.spawn.npc.gfx)&&Math.max(Math.abs(m.x-worldX),Math.abs(m.y-worldY))<=range&&eligible(m))
      .sort((a,b)=>Math.hypot(a.x-worldX,a.y-worldY)-Math.hypot(b.x-worldX,b.y-worldY))[0];
  }
  function setTarget(mob){selected=mob;draw(getRenderedSceneView(),movementTime());}
  function damage(mob,amount){
    if(!mob.hp)return;
    mob.hp=Math.max(0,mob.hp-amount);
    if(!mob.hp){
      mob.step=null;mob.respawnAt=movementTime()+60000;
      if(selected===mob)selected=null;
    }
    draw(getRenderedSceneView(),movementTime());
  }
  return {draw,selectAt,nearest,setTarget,damage,get target(){return selected;}};
})();
const drawIslandScene=draw;
draw=function(now=movementTime()){
  drawIslandScene(now);
  IslandMonsters.draw(getRenderedSceneView(),now);
};
setInterval(()=>{
  if(!document.hidden&&!movementAnimating())IslandMonsters.draw(getRenderedSceneView(),movementTime());
},80);
