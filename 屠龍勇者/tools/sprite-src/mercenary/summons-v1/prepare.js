// 保留生成原稿；以4×2等格整理為256px動畫格，不修改原稿。
const fs=require('fs'),path=require('path');
const runtime=path.join(process.env.USERPROFILE,'.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules');
const {createCanvas,loadImage}=require(path.join(runtime,'@napi-rs/canvas'));
const root=path.resolve(__dirname,'../../../..'),out=path.join(root,'images/sprites/mercenary/summons-v1');
(async()=>{
 fs.mkdirSync(out,{recursive:true});
 const meta=JSON.parse(fs.readFileSync(path.join(__dirname,'generation.json'),'utf8'));
 const contact=createCanvas(1080,9*160),g=contact.getContext('2d');g.fillStyle='#18202b';g.fillRect(0,0,contact.width,contact.height);
 for(const [i,a]of meta.assets.entries()){
  const source=path.join(__dirname,a.id+'-original.png');if(!fs.existsSync(source))fs.copyFileSync(a.source,source);
  const padded=path.join(__dirname,a.id+'-padded.png');if(a.fixedSource&&!fs.existsSync(padded))fs.copyFileSync(a.fixedSource,padded);
  const im=await loadImage(fs.existsSync(padded)?padded:source),atlas=createCanvas(1024,512),c=atlas.getContext('2d');
  for(let row=0;row<2;row++)for(let f=0;f<4;f++){
   const x=Math.round(f*im.width/4),y=Math.round(row*im.height/2),w=Math.round((f+1)*im.width/4)-x,h=Math.round((row+1)*im.height/2)-y;
   c.drawImage(im,x,y,w,h,f*256+12,row*256+12,232,232);
  }
  fs.writeFileSync(path.join(out,a.id+'.png'),atlas.toBuffer('image/png'));
  g.fillStyle='#f3e4ba';g.font='15px sans-serif';g.fillText(a.id,8,i*160+22);
  for(let f=0;f<8;f++)g.drawImage(atlas,(f%4)*256,Math.floor(f/4)*256,256,256,120+f*118,i*160+25,116,116);
 }
 fs.writeFileSync(path.join(__dirname,'contact.png'),contact.toBuffer('image/png'));
 console.log('Prepared 9 summon atlases, 72 frames; original alpha preserved.');
})().catch(e=>{console.error(e);process.exit(1);});
