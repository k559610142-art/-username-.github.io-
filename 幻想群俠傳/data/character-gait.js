// 連續雙腿步態：支撐腳相對身體向後移動，抵銷角色的前進量。
Game.characterGait = {
  vectors:[[0,1],[-1,1],[-1,0],[-1,-1],[0,-1],[1,-1],[1,0],[1,1]],
  pose(state) {
    const vector=this.vectors[state.facing],length=Math.hypot(...vector);
    const forward={x:vector[0]/length,y:vector[1]/length};
    const side={x:forward.y,y:-forward.x};
    const cycle=((state.distance/32)%1+1)%1;
    return [-1,1].map((sign,index)=>{
      const t=(cycle+index*0.5)%1,planted=!state.moving||t<0.5;
      let stride=0,lift=0;
      if(state.moving){
        if(planted)stride=8-32*t;
        else {const swing=(t-0.5)*2;stride=-8+16*(swing*swing*(3-2*swing));lift=Math.sin(swing*Math.PI)*(state.running?9:7);}
      }
      const hip={x:side.x*sign*3,y:-26+side.y*sign*2};
      const foot={x:side.x*sign*4+forward.x*stride,y:side.y*sign*2+forward.y*stride-lift};
      // 膝蓋向行進方向彎曲，不能按左右腳符號向兩側外翻。
      const knee={x:(hip.x+foot.x)/2+forward.x*(2+lift*0.45),y:(hip.y+foot.y)/2+forward.y*2-lift*0.35};
      return {sign,planted,lift,forward,hip,foot,knee,
        toe:{x:foot.x+forward.x*5,y:foot.y+forward.y*5},
        ground:{x:side.x*sign*4+forward.x*stride,y:side.y*sign*2+forward.y*stride}};
    });
  },
  draw(ctx,state,sprite,config,height) {
    const legs=this.pose(state);
    const ellipse=(x,y,rx,ry,color)=>{ctx.fillStyle=color;ctx.beginPath();ctx.ellipse(x,y,rx,ry,0,0,Math.PI*2);ctx.fill();};
    // 每隻腳有獨立落地影；抬腳時陰影變淡。
    for(const leg of legs)ellipse(leg.ground.x,leg.ground.y+1,4.3,1.7,leg.planted?'#111b18bf':'#111b1838');
    const line=(points,width,color)=>{ctx.strokeStyle=color;ctx.lineWidth=width;ctx.lineCap='round';ctx.lineJoin='round';ctx.beginPath();ctx.moveTo(points[0].x,points[0].y);for(const p of points.slice(1))ctx.lineTo(p.x,p.y);ctx.stroke();};
    for(const leg of legs.sort((a,b)=>a.ground.y-b.ground.y)){
      const hip=leg.hip,foot=leg.foot,knee=leg.knee;
      const ankle={x:foot.x,y:foot.y-4};
      line([hip,knee,ankle],8,'#252f31');
      line([hip,knee],5,'#536369');
      line([knee,ankle],6,'#453e32');
      line([{x:knee.x-1,y:knee.y+2},{x:ankle.x-1,y:ankle.y-1}],1,'#9e8b62');
      // 鞋跟在後、鞋尖在前，八方向各自旋轉；不能一直橫向畫鞋。
      ctx.save();ctx.translate(foot.x,foot.y);ctx.rotate(Math.atan2(leg.forward.y,leg.forward.x));
      ellipse(1,0,5,2.7,'#302e26');
      ellipse(3,0,2.8,2.5,'#514936');
      line([{x:4.8,y:-1.5},{x:4.8,y:1.5}],1,'#b4a27b');
      line([{x:-2,y:-1.4},{x:-2,y:1.4}],1.2,'#1c211e');
      ctx.restore();
    }
    // 只取原人物的頭與上身；原圖下半身完全不再參與走路顯示。
    const frame=config.frames[state.facing*4],pivot=config.pivots[state.facing*4];
    const row=config.frames.slice(state.facing*4,state.facing*4+4);
    const scale=height/Math.max(...row.map(f=>f.h));
    const top=(frame.y-pivot.y)*scale,cut=-25;
    const sourceHeight=Math.max(1,Math.min(frame.h,(cut-top)/scale));
    ctx.save();if(config.mirrorRows.includes(state.facing))ctx.scale(-1,1);
    ctx.drawImage(sprite,frame.x,frame.y,frame.w,sourceHeight,(frame.x-pivot.x)*scale,top,frame.w*scale,sourceHeight*scale);
    ctx.restore();
    // 衣襬留在膝上，避免蓋住交替腿部。
    ctx.fillStyle='#c2c7b3';ctx.beginPath();ctx.moveTo(-8,-29);ctx.lineTo(-11,-18);ctx.lineTo(-3,-20);ctx.lineTo(0,-27);ctx.closePath();ctx.fill();
    ctx.fillStyle='#426466';ctx.beginPath();ctx.moveTo(1,-29);ctx.lineTo(4,-18);ctx.lineTo(10,-20);ctx.lineTo(7,-29);ctx.closePath();ctx.fill();
  }
};
