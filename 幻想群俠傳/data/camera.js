Game.createCamera = function (worldWidth,worldHeight,width,height) {
  return {
    x:0,y:0,width,height,ready:false,
    follow(x,y,dt=1/60){
      const targetX=Math.max(0,Math.min(worldWidth-this.width,x-this.width/2));
      const targetY=Math.max(0,Math.min(worldHeight-this.height,y-this.height/2));
      const blend=this.ready?1-Math.exp(-12*Math.min(.05,dt)):1;
      this.x+=(targetX-this.x)*blend;this.y+=(targetY-this.y)*blend;this.ready=true;
    },
    screenToWorld(x,y){return {x:x+this.x,y:y+this.y};}
  };
};
