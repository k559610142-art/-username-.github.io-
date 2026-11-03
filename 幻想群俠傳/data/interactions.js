// 游標與點擊共用同一份目標判斷，避免看起來能互動、點擊卻做別的事。
Game.pickSceneTarget = function (point, map, monsters=[], canAttack=()=>false) {
  const size=map.tileSize;
  const hit=entity=>Math.abs(point.x-(entity.x+.5)*size)<=24&&point.y>=entity.y*size-24&&point.y<=entity.y*size+size+5;
  const npc=map.npcs.find(n=>n.talkable!==false&&hit(n));
  if(npc)return {kind:'talk',entity:npc};
  const monster=monsters.find(m=>m.attackable===true&&m.hp>0&&canAttack(m)&&hit(m));
  if(monster)return {kind:'attack',entity:monster};
  return {kind:'move',x:Math.floor(point.x/size),y:Math.floor(point.y/size)};
};

// Pointer Events 同時處理滑鼠、觸控筆和手機；一次手勢只觸發一次操作。
Game.bindScenePointer = function (canvas, handlers, options={}) {
  const schedule=options.schedule||setTimeout,cancel=options.cancel||clearTimeout;
  const now=options.now||(()=>performance.now());
  const holdMs=options.holdMs??550,slop=options.slop??12;
  const pointers=new Set();let gesture=null,lastTouch=-Infinity;
  const listeners=[];
  const on=(name,fn)=>{canvas.addEventListener(name,fn,{passive:false});listeners.push([name,fn]);};
  function abort(){if(gesture?.timer!==undefined)cancel(gesture.timer);gesture=null;}
  on('pointerdown',e=>{
    if(e.pointerType==='mouse'&&e.button!==0)return;
    pointers.add(e.pointerId);
    if(pointers.size!==1){abort();return;}
    if(e.pointerType!=='mouse'){e.preventDefault();lastTouch=now();}
    gesture={id:e.pointerId,x:e.clientX,y:e.clientY,type:e.pointerType,moved:false,held:false};
    canvas.setPointerCapture?.(e.pointerId);
    if(e.pointerType==='touch')gesture.timer=schedule(()=>{
      if(gesture&&!gesture.moved){gesture.held=true;handlers.onMenu(gesture.x,gesture.y);}
    },holdMs);
  });
  on('pointermove',e=>{
    if(e.pointerType==='mouse')handlers.onHover?.(e.clientX,e.clientY);
    if(gesture?.id===e.pointerId&&Math.hypot(e.clientX-gesture.x,e.clientY-gesture.y)>slop){gesture.moved=true;if(gesture.timer!==undefined)cancel(gesture.timer);}
  });
  on('pointerup',e=>{
    pointers.delete(e.pointerId);
    const finished=gesture;
    if(!finished||finished.id!==e.pointerId)return;
    abort();
    if(e.pointerType!=='mouse'){e.preventDefault();lastTouch=now();}
    if(!finished.moved&&!finished.held)handlers.onActivate(e.clientX,e.clientY,e.pointerType);
  });
  for(const name of ['pointercancel','lostpointercapture'])on(name,e=>{pointers.delete(e.pointerId);if(gesture?.id===e.pointerId)abort();});
  on('pointerleave',()=>handlers.onLeave?.());
  on('contextmenu',e=>{
    e.preventDefault();
    if(now()-lastTouch>1500)handlers.onMenu(e.clientX,e.clientY);
    else if(gesture?.type==='touch'&&!gesture.held&&!gesture.moved){
      if(gesture.timer!==undefined)cancel(gesture.timer);gesture.held=true;handlers.onMenu(gesture.x,gesture.y);
    }
  });
  // 輔助技術發出的鍵盤 click；忽略觸控後瀏覽器補發的相容 click。
  on('click',e=>{if(e.detail===0&&now()-lastTouch>1500)handlers.onActivate(e.clientX,e.clientY,'keyboard');});
  const unbind=()=>{abort();pointers.clear();for(const [name,fn]of listeners)canvas.removeEventListener(name,fn);};
  unbind.cancel=()=>{abort();pointers.clear();};
  return unbind;
};
