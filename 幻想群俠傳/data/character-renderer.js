// 整張人物以同一個方向與同一個影格繪製，不拆頭、腿或鞋子。
Game.drawCharacter = function (ctx, state, sprite, character, height=character.renderHeight) {
  const config=character.walk;
  const direction=config.directions[state.facing];
  const phase=Math.floor(state.phase||0)%config.poseTimeline.length;
  const frame=state.moving?config.poseTimeline[phase]:0;
  const clip=config.clips[direction.id],image=sprite[direction.id];
  if(!image||!clip.frames||!clip.pivots)return;
  const source=clip.frames[frame],pivot=clip.pivots[frame];
  const scale=height/Math.max(...clip.frames.map(f=>f.h));
  ctx.save();
  ctx.drawImage(image,source.x,source.y,source.w,source.h,(source.x-pivot.x)*scale,(source.y-pivot.y)*scale,source.w*scale,source.h*scale);
  ctx.restore();
};

Game.drawDirectionGallery = function (canvas, sprite, character, time) {
  const ctx=canvas.getContext('2d');
  ctx.clearRect(0,0,canvas.width,canvas.height);
  const preview=this.walkPreview||{};
  character.walk.directions.forEach((direction,index)=>{
    const col=index%4,row=Math.floor(index/4),x=col*200+100,y=row*200+157;
    ctx.fillStyle='#20362b';ctx.fillRect(col*200+3,row*200+3,194,194);
    ctx.fillStyle='#0c181baa';ctx.beginPath();ctx.ellipse(x,y,23,6,0,0,Math.PI*2);ctx.fill();
    ctx.save();ctx.translate(x,y);
    const phase=preview.paused?(preview.frame||0)*2:time/640*16;
    this.drawCharacter(ctx,{facing:index,moving:true,phase},sprite,character,125);
    ctx.restore();
    ctx.fillStyle='#dfcda0';ctx.font='16px Microsoft JhengHei';ctx.textAlign='center';ctx.fillText(`${direction.name} · ${Math.floor(phase/2)%8+1}/8`,x,row*200+185);
  });
};
