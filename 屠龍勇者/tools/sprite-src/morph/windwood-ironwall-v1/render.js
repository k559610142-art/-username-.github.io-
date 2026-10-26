// 原生Canvas執行正式sceneDraw，不開瀏覽器、不讀寫正式角色。
const fs=require('fs'),path=require('path'),vm=require('vm');
const {createCanvas,loadImage}=require('C:/Users/User/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/@napi-rs/canvas');
const root=path.resolve(__dirname,'../../../..');
const ctx=require(path.join(root,'tools/test-windwood-ironwall-morph.js'));
(async()=>{
 const images={};
 for(const a of ['walk','attack','cast','hit']){const p='images/sprites/morph/windwood-ironwall-v1/'+a+'.png';images[p]=await loadImage(path.join(root,p));}
 images['images/maps/rework/venom-nest-v1.jpg']=await loadImage(path.join(root,'images/maps/rework/venom-nest-v1.jpg'));
 ctx.paintImages=images;ctx.makeCanvas=createCanvas;
 vm.runInContext(`spriteImage=src=>paintImages[src]||null;document.createElement=()=>makeCanvas(256,256);SIM_MODE=false;
 player.buffs.morph.form='m28';player.buffs.morph.until=gameNow+1800000;
 player.loc={type:'zone',id:'venomNest'};buildScene();scene.mons=[];scene.effects=[];scene.floats=[];scene.tele=null;`,ctx);
 const sheet=createCanvas(1280,960),g=sheet.getContext('2d');
 for(const [row,action]of ['walk','attack','cast','hit'].entries())for(const[col,dir]of ['down','right','up','left'].entries()){
  const cv=createCanvas(320,240);ctx.paintContext=cv.getContext('2d');ctx.renderDir=dir;ctx.renderAction=action;
  vm.runInContext(`scene.pl.dir=renderDir;scene.pl.path=[];scene.pl.anim={name:renderAction,t:150,dur:1000};sceneDraw(paintContext,320,240);`,ctx);
  g.drawImage(cv,col*320,row*240);g.fillStyle='#eee';g.font='14px sans-serif';g.fillText(action+' / '+dir,col*320+8,row*240+20);
 }
 fs.writeFileSync(path.join(__dirname,'game-render.png'),sheet.toBuffer('image/png'));
 console.log('PASS: actual sceneDraw, 4 directions x 4 actions, real RGBA atlases');
})().catch(e=>{console.error(e);process.exit(1)});
