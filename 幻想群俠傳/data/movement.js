// 與畫面分離的八方向移動、尋路及步進插值。
Game.createMovement = function (map, spawn) {
  const timing=Game.characters?.swordsman.walk.timing || {frameCount:16,frameRate:24,baseTickMs:40,referenceRate:24,hasteMultiplier:0.755};
  const stepMs=timing.frameCount*timing.baseTickMs*(timing.referenceRate/timing.frameRate);
  const state = { x:spawn.x, y:spawn.y, rx:spawn.x, ry:spawn.y, facing:0, moving:false, running:false, phase:0, distance:0 };
  const vectors = [[0,1],[-1,1],[-1,0],[-1,-1],[0,-1],[1,-1],[1,0],[1,1]];
  let route=[], step=null;
  const allowed=(x,y,dx,dy)=>!map.isBlocked(x+dx,y+dy)&&(!(dx&&dy)||(!map.isBlocked(x+dx,y)&&!map.isBlocked(x,y+dy)));
  const facing=(dx,dy)=>vectors.findIndex(v=>v[0]===dx&&v[1]===dy);
  function pathTo(x,y) {
    if(map.isBlocked(x,y))return null;
    const origin=step?{x:step.x+step.dx,y:step.y+step.dy}:{x:state.x,y:state.y};
    const queue=[origin], previous=new Map([[`${origin.x},${origin.y}`,null]]);
    for(let i=0;i<queue.length;i++) {
      const p=queue[i];
      if(p.x===x&&p.y===y){const path=[];let at=p;while(at.x!==origin.x||at.y!==origin.y){path.unshift(at);at=previous.get(`${at.x},${at.y}`);}return path;}
      for(const [dx,dy]of vectors){const nx=p.x+dx,ny=p.y+dy,key=`${nx},${ny}`;if(!previous.has(key)&&allowed(p.x,p.y,dx,dy)){previous.set(key,p);queue.push({x:nx,y:ny});}}
    }
    return null;
  }
  return {
    state, pathTo,
    go(x,y){const path=pathTo(x,y);if(!path)return false;route=path;return true;},
    stop(){route=[];},
    reset(){route=[];step=null;Object.assign(state,{x:spawn.x,y:spawn.y,rx:spawn.x,ry:spawn.y,moving:false,phase:0,distance:0});},
    update(dt, input={x:0,y:0,run:false}, paused=false){
      dt=Math.min(Math.max(dt,0),0.05);
      if(paused){route=[];state.moving=false;return;}
      state.running=!!input.run;
      if(!step){
        let dx=Math.sign(input.x),dy=Math.sign(input.y);
        if(dx||dy)route=[];
        else if(route.length){dx=route[0].x-state.x;dy=route[0].y-state.y;route.shift();}
        if(dx||dy){state.facing=facing(dx,dy);if(allowed(state.x,state.y,dx,dy))step={x:state.x,y:state.y,dx,dy,t:0,length:Math.hypot(dx,dy)};else route=[];}
      }
      state.moving=!!step;
      if(step){
        const before=step.t;
        step.t=Math.min(1,step.t+dt*1000/(stepMs*(state.running?timing.hasteMultiplier:1)*step.length));
        state.rx=step.x+step.dx*step.t;state.ry=step.y+step.dy*step.t;
        // 動作由真正走過的距離推進：撞牆、減速和斜走都不會空踩或滑步。
        state.distance+=(step.t-before)*step.length*(map.tileSize||32);
        state.phase=state.distance/(map.tileSize||32)*timing.frameCount;
        if(step.t===1){state.x=step.x+step.dx;state.y=step.y+step.dy;step=null;}
      }
    }
  };
};
