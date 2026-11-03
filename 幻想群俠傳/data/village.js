Game.initVillage = function () {
  const map=this.adventureMap, canvas=document.getElementById('village-canvas'), ctx=canvas.getContext('2d');
  const displaySize=()=>{const w=canvas.parentElement.clientWidth,h=canvas.parentElement.clientHeight,zoom=Math.max(1,w/1100);return {width:Math.max(1,Math.round(w/zoom)),height:Math.max(1,Math.round(h/zoom))};};
  const firstSize=displaySize();canvas.width=firstSize.width;canvas.height=firstSize.height;
  const camera=Game.createCamera(map.width*map.tileSize,map.height*map.tileSize,canvas.width,canvas.height);
  const resizeGame=()=>{
    const size=displaySize();canvas.width=size.width;canvas.height=size.height;
    camera.width=canvas.width;camera.height=canvas.height;camera.ready=false;
  };
  window.addEventListener('resize',resizeGame);
  const movement=Game.createMovement(map,map.spawn), player=movement.state, size=map.tileSize;
  const held=new Set();
  let pointerDirection=null, tapDirection=null, pendingNpc=null, lastTime=0;
  const walkSprite={};let walkReady=false;
  Promise.all(Object.entries(Game.characters.swordsman.walk.clips).map(([id,clip])=>new Promise((resolve,reject)=>{
    const image=new Image();image.onload=()=>{walkSprite[id]=image;resolve();};image.onerror=reject;image.src=clip.image;
  }))).then(()=>{walkReady=true;}).catch(()=>{Game.toast('人物動作載入失敗，請重新整理。');});
  const character = Game.characters.swordsman;
  const heroSprite = new Image();
  let heroReady = false;
  heroSprite.onload = () => { heroReady = true; draw(); };
  heroSprite.onerror = () => { Game.toast('人物圖片載入失敗，請重新整理。'); };
  heroSprite.src = character.image;
  const backdrop = new Image();
  const fieldBackdrop=new Image();let fieldReady=false;
  fieldBackdrop.onload=()=>{fieldReady=true;draw();};
  fieldBackdrop.onerror=()=>say('平原圖片未能載入，請重新整理。');
  fieldBackdrop.src=map.scenes[1].image;
  let artReady = false;
  backdrop.onload = () => { artReady = true; draw(); say('青石鎮地圖已載入。點地面移動，靠近村民按 E 交談。'); };
  backdrop.onerror = () => { say('地圖美術載入失敗，暫時顯示備用地圖。請重新整理。'); };
  backdrop.src = 'images/maps/qingshi-village-v2.png';
  const say=text=>{if(/失敗|無法|未能/.test(text))Game.toast(text);};
  let destination=null,pointerHover=null;
  Game.worldMonsters??=[];
  const canAttack=monster=>typeof monster.onAttack==='function'||typeof Game.attackWorldMonster==='function';
  const worldPoint=(clientX,clientY)=>{const r=canvas.getBoundingClientRect();return camera.screenToWorld((clientX-r.left)/r.width*canvas.width,(clientY-r.top)/r.height*canvas.height);};
  const pick=(clientX,clientY)=>Game.pickSceneTarget(worldPoint(clientX,clientY),map,Game.worldMonsters,canAttack);
  const refreshCursor=()=>{canvas.dataset.cursor=pointerHover?pick(pointerHover.x,pointerHover.y).kind:'move';};
  let touchFeedbackTimer;
  const touchFeedback=(clientX,clientY,kind)=>{
    const mark=document.getElementById('touch-feedback');mark.hidden=false;mark.dataset.kind=kind;mark.style.left=clientX+'px';mark.style.top=clientY+'px';
    clearTimeout(touchFeedbackTimer);touchFeedbackTimer=setTimeout(()=>{mark.hidden=true;},500);
  };
  canvas.dataset.cursor='move';
  let lastSceneId='';
  function rect(x,y,w,h,color){ctx.fillStyle=color;ctx.fillRect(x,y,w,h);}
  function oval(x,y,rx,ry,color){ctx.fillStyle=color;ctx.beginPath();ctx.ellipse(x,y,rx,ry,0,0,Math.PI*2);ctx.fill();}
  function label(text,x,y){ctx.font='bold 15px Microsoft JhengHei';ctx.textAlign='center';ctx.fillStyle='#172620dd';ctx.fillRect(x-ctx.measureText(text).width/2-7,y-17,ctx.measureText(text).width+14,23);ctx.fillStyle='#f4e8c5';ctx.fillText(text,x,y);}
  function person(x,y,color,hero=false){
    const px=x*size+16,py=y*size+19;
    // 接觸影貼住腳底，選取圈放在外側，避免把人托在發光圓盤上。
    oval(px,py+10,hero?10:11,hero?3:5,hero?'#101b16c9':'#14221dcc');
    if(hero){ctx.strokeStyle='#cbb97666';ctx.lineWidth=1;ctx.beginPath();ctx.ellipse(px,py+10,16,6,0,0,Math.PI*2);ctx.stroke();}
    if (hero && walkReady) {
      ctx.save();ctx.translate(px,py+10);
      Game.drawCharacter(ctx,player,walkSprite,character);
      ctx.restore();
      return;
    }
    if (hero && heroReady) {
      const h = character.renderHeight, w = h * heroSprite.naturalWidth / heroSprite.naturalHeight;
      ctx.drawImage(heroSprite, px-w/2, py+10-h*character.footAnchor, w, h);
      return;
    }
    rect(px-5,py+4,4,9,'#34342e');rect(px+2,py+4,4,9,'#34342e');
    ctx.fillStyle=color;ctx.beginPath();ctx.moveTo(px-5,py-4);ctx.lineTo(px+5,py-4);ctx.lineTo(px+9,py+8);ctx.quadraticCurveTo(px,py+12,px-9,py+8);ctx.closePath();ctx.fill();
    rect(px-6,py+2,12,2,'#694f34');oval(px,py-7,5,6,'#dbb995');oval(px,py-11,6,3,hero?'#283332':'#453b30');
    if(hero){ctx.strokeStyle='#d5dfdc';ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(px+9,py+8);ctx.lineTo(px+12,py-9);ctx.stroke();}
  }
  function draw(){
    camera.follow((player.rx+0.5)*size,(player.ry+0.85)*size);
    ctx.setTransform(1,0,0,1,0,0);ctx.clearRect(0,0,canvas.width,canvas.height);
    ctx.save();ctx.translate(-camera.x,-camera.y);
    if (artReady) {
      ctx.drawImage(backdrop,0,0,map.width*size,28*size);
      if(fieldReady)ctx.drawImage(fieldBackdrop,0,28*size,map.width*size,28*size);
      else {rect(0,28*size,map.width*size,28*size,'#58734a');rect(18*size,28*size,4*size,28*size,'#a1916d');}
    } else {
      ctx.restore();rect(0,0,canvas.width,canvas.height,'#14231a');
      ctx.fillStyle='#c6b788';ctx.font='16px Microsoft JhengHei';ctx.textAlign='center';ctx.fillText('正在進入江湖…',canvas.width/2,canvas.height/2);return;
    }
    if (artReady) for (const b of map.buildings) label(b.name,(b.x+b.w/2)*size,(b.y+b.h-1)*size);

    const actors=[...map.npcs.map(n=>({...n,hero:false})),{x:player.rx,y:player.ry,color:'#ddd6b1',hero:true}].sort((a,b)=>a.y-b.y);
    for(const a of actors){person(a.x,a.y,a.color,a.hero);if(!a.hero)label(a.name,a.x*size+16,a.y*size-4);}
    if(destination&&performance.now()-destination.at<900){
      const fade=1-(performance.now()-destination.at)/900;ctx.strokeStyle=`rgba(228,209,145,${fade*.65})`;ctx.lineWidth=1.5;
      ctx.beginPath();ctx.ellipse((destination.x+.5)*size,(destination.y+.85)*size,9,4,0,0,Math.PI*2);ctx.stroke();
    }
    ctx.restore();
    const scene=map.sceneAt(player.y);
    if(lastSceneId&&lastSceneId!==scene.id)say(`進入${scene.name}。${scene.safe?'村民與商鋪就在附近。':'沿道路向北可以返回青石鎮。'}`);
    lastSceneId=scene.id;
    document.getElementById('scene-name').textContent=scene.name;
    const mini=document.getElementById('game-minimap'),mc=mini.getContext('2d'),sx=mini.width/(map.width*size),sy=mini.height/(map.height*size);
    mc.fillStyle='#354a32';mc.fillRect(0,0,mini.width,mini.height/2);mc.fillStyle='#6d784c';mc.fillRect(0,mini.height/2,mini.width,mini.height/2);
    mc.fillStyle='#567e87';mc.fillRect(mini.width*.825,0,mini.width*.1,mini.height);
    mc.strokeStyle='#cfb986';mc.lineWidth=3;mc.beginPath();mc.moveTo(mini.width*.5,0);mc.lineTo(mini.width*.5,mini.height);mc.stroke();
    mc.strokeStyle='#ffffffaa';mc.lineWidth=1;mc.strokeRect(camera.x*sx,camera.y*sy,camera.width*sx,camera.height*sy);
    mc.fillStyle='#fff2b3';mc.beginPath();mc.arc((player.rx+.5)*size*sx,(player.ry+.5)*size*sy,3,0,Math.PI*2);mc.fill();
  }
  function talk(){
    const npc=map.npcs.find(n=>Math.abs(n.x-player.x)+Math.abs(n.y-player.y)<=1);
    if(!npc)return;
    movement.stop();destination=null;
    document.getElementById('npc-name').textContent=npc.name;
    document.getElementById('npc-text').textContent=npc.text;
    const dialog=document.getElementById('npc-dialog');if(!dialog.open)dialog.showModal();
  }
  Game.stopWalking=()=>{movement.stop();held.clear();pendingNpc=null;destination=null;};
  const directions={ArrowUp:[0,-1],w:[0,-1],ArrowDown:[0,1],s:[0,1],ArrowLeft:[-1,0],a:[-1,0],ArrowRight:[1,0],d:[1,0]};
  canvas.addEventListener('keydown',e=>{const key=e.key.length===1?e.key.toLowerCase():e.key;if(directions[key]||key==='Shift'){e.preventDefault();held.add(key);if(directions[key]&&!e.repeat)tapDirection=directions[key];pendingNpc=null;}else if(key==='e'){e.preventDefault();movement.stop();pendingNpc=null;talk();}else if(key==='Escape'){movement.stop();held.clear();pendingNpc=null;}});
  window.addEventListener('keyup',e=>held.delete(e.key.length===1?e.key.toLowerCase():e.key));
  const clearInput=()=>{held.clear();pointerDirection=null;tapDirection=null;};
  window.addEventListener('blur',clearInput);canvas.addEventListener('blur',clearInput);
  document.addEventListener('visibilitychange',()=>{if(document.hidden){clearInput();movement.stop();}});
  function activate(clientX,clientY,pointerType){
    document.getElementById('game-menu').hidden=true;canvas.focus();
    if(Game.state.enemy)return;
    held.clear();pendingNpc=null;
    const target=pick(clientX,clientY);
    if(pointerType==='touch')touchFeedback(clientX,clientY,target.kind);
    if(target.kind==='attack'){
      movement.stop();destination=null;
      if(typeof Game.attackWorldMonster==='function')Game.attackWorldMonster(target.entity);
      else target.entity.onAttack();
      return;
    }
    if(target.kind==='talk'){
      const npc=target.entity;
      const choices=[[0,-1],[0,1],[-1,0],[1,0]].map(([dx,dy])=>({x:npc.x+dx,y:npc.y+dy})).map(p=>({...p,path:movement.pathTo(p.x,p.y)})).filter(p=>p.path).sort((a,b)=>a.path.length-b.path.length);
      if(!choices.length)return say('無法接近這位村民。');
      movement.go(choices[0].x,choices[0].y);pendingNpc=npc;return;
    }
    if(movement.go(target.x,target.y))destination={x:target.x,y:target.y,at:performance.now()};
    else say('此處無法抵達。');
  }
  const pointerControls=Game.bindScenePointer(canvas,{
    onActivate:activate,
    onHover:(x,y)=>{pointerHover={x,y};refreshCursor();},
    onLeave:()=>{pointerHover=null;refreshCursor();},
    onMenu:(x,y)=>{
      Game.stopWalking();const menu=document.getElementById('game-menu');menu.hidden=false;
      menu.style.left=Math.max(8,Math.min(window.innerWidth-menu.offsetWidth-8,x))+'px';
      menu.style.top=Math.max(8,Math.min(window.innerHeight-menu.offsetHeight-8,y))+'px';
    }
  });
  window.addEventListener('blur',()=>pointerControls.cancel());
  document.addEventListener('visibilitychange',()=>{if(document.hidden)pointerControls.cancel();});
  function tick(time){
    const dt=lastTime?(time-lastTime)/1000:0;lastTime=time;
    let dx=0,dy=0;
    for(const key of held){if(directions[key]){dx+=directions[key][0];dy+=directions[key][1];}}
    if(pointerDirection)[dx,dy]=pointerDirection;
    if(!dx&&!dy&&tapDirection)[dx,dy]=tapDirection;
    tapDirection=null;
    movement.update(dt,{x:dx,y:dy,run:held.has('Shift')},!!Game.state.enemy);
    if(pendingNpc&&!player.moving&&Math.abs(pendingNpc.x-player.x)+Math.abs(pendingNpc.y-player.y)<=1){talk();pendingNpc=null;}
    if(!document.hidden){
      draw();refreshCursor();
    }
    requestAnimationFrame(tick);
  }
  requestAnimationFrame(tick);
  draw();
};
