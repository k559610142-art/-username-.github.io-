// 原創首領原稿分離、等比縮放與腳底註冊；不補畫原稿。
const fs=require('fs'),path=require('path'),assert=require('assert/strict'),crypto=require('crypto');
const runtime=path.join(process.env.USERPROFILE,'.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules');
const sharp=require(path.join(runtime,'sharp')),{createCanvas,loadImage}=require(path.join(runtime,'@napi-rs/canvas'));
const root=path.resolve(__dirname,'..'),source=path.join(__dirname,'monster-src/quest-boss-v1'),out=path.join(root,'images/monsters/quest-v1');
function bounds(data,w,h){let l=w,t=h,r=-1,b=-1;for(let y=0;y<h;y++)for(let x=0;x<w;x++)if(data[(y*w+x)*4+3]>24){l=Math.min(l,x);t=Math.min(t,y);r=Math.max(r,x);b=Math.max(b,y);}assert(r>=l,'空白分鏡');return {left:l,top:t,width:r-l+1,height:b-t+1};}
function median(values){return values.slice().sort((a,b)=>a-b)[Math.floor(values.length/2)];}
async function extractSheet(file){
 const {data,info}=await sharp(file).ensureAlpha().raw().toBuffer({resolveWithObject:true}),w=info.width,h=info.height,size=w*h;
 const threshold=64;
 const labels=new Int32Array(size),stack=new Int32Array(size),components=[];let serial=0;
 // 先找完整人物再切格：生成稿的武器／腳底有時跨過等分線，不能硬切斷。
 for(let p=0;p<size;p++){
  if(labels[p]||data[p*4+3]<threshold)continue;const id=++serial;let n=1,count=0,l=w,t=h,r=-1,b=-1;stack[0]=p;labels[p]=id;
  while(n){const v=stack[--n],x=v%w,y=Math.floor(v/w);count++;l=Math.min(l,x);t=Math.min(t,y);r=Math.max(r,x);b=Math.max(b,y);
   for(const q of [v-1,v+1,v-w,v+w])if(q>=0&&q<size&&!labels[q]&&Math.abs(q%w-x)<=1&&data[q*4+3]>=threshold){labels[q]=id;stack[n++]=q;}
  }components.push({id,count,l,t,r,b});
 }
 const main=components.slice().sort((a,b)=>b.count-a.count).slice(0,12),slots=Array(12),assignment=new Int16Array(serial+1);assignment.fill(-1);
 for(const c of main){assert(c.count>1500,file+' 人物主體不足 '+JSON.stringify(main));const col=Math.min(3,Math.floor((c.l+c.r)/2/w*4)),row=Math.min(2,Math.floor((c.t+c.b)/2/h*3)),slot=row*4+col;assert(!slots[slot],'多個人物落在同一分鏡');slots[slot]=c;assignment[c.id]=slot;}
 assert(slots.every(Boolean),'不足12個人物分鏡');
 for(const c of components){if(assignment[c.id]>=0||c.count<30)continue;let chosen=-1,distance=Infinity;
  for(let i=0;i<12;i++){const m=slots[i],dx=Math.max(0,m.l-c.r,c.l-m.r),dy=Math.max(0,m.t-c.b,c.t-m.b),d=Math.hypot(dx,dy);if(d<distance){distance=d;chosen=i;}}
  if(distance<45&&c.count<slots[chosen].count*.2)assignment[c.id]=chosen;
 }
 const owners=new Int16Array(size);owners.fill(-1);for(let p=0;p<size;p++)if(labels[p])owners[p]=assignment[labels[p]];
 // 擴回原始抗鋸齒邊緣，逐像素沿用原色與原alpha；僅隔離相鄰分鏡。
 for(let pass=0;pass<4;pass++){const next=owners.slice();for(let p=0;p<size;p++)if(owners[p]<0&&data[p*4+3]>8){const x=p%w;for(const q of [p-1,p+1,p-w,p+w])if(q>=0&&q<size&&Math.abs(q%w-x)<=1&&owners[q]>=0){next[p]=owners[q];break;}}owners.set(next);}
 const rectangles=slots.map(()=>({l:w,t:h,r:-1,b:-1}));for(let p=0;p<size;p++)if(owners[p]>=0){const bb=rectangles[owners[p]],x=p%w,y=Math.floor(p/w);bb.l=Math.min(bb.l,x);bb.t=Math.min(bb.t,y);bb.r=Math.max(bb.r,x);bb.b=Math.max(bb.b,y);}
 const crops=[];
 for(let i=0;i<12;i++){
  const b=rectangles[i],width=b.r-b.l+1,height=b.b-b.t+1,raw=Buffer.alloc(width*height*4);
  // 不透明主體不得裁邊；最外圍alpha<=32的微弱光暈可貼來源邊，輸出格另驗安全留白。
  const main=slots[i];assert(main.l>0&&main.t>0&&main.r<w-1&&main.b<h-1,'原稿主體裁邊 '+file+' '+i);
  let edge=0;for(let x=0;x<w;x++)for(const y of [0,h-1]){const p=y*w+x;if(owners[p]===i)edge=Math.max(edge,data[p*4+3]);}for(let y=0;y<h;y++)for(const x of [0,w-1]){const p=y*w+x;if(owners[p]===i)edge=Math.max(edge,data[p*4+3]);}assert(edge<=32,'原稿可見主體／特效裁邊 '+file+' '+i+' alpha='+edge);

  for(let y=b.t;y<=b.b;y++)for(let x=b.l;x<=b.r;x++){const p=y*w+x;if(owners[p]===i)data.copy(raw,((y-b.t)*width+x-b.l)*4,p*4,p*4+4);}
  const bb=bounds(raw,width,height);let bottom=-1,l=width,r=-1;const x0=Math.floor(width*.2),x1=Math.ceil(width*.8);
  for(let y=height-1;y>=0;y--){for(let x=x0;x<x1;x++)if(raw[(y*width+x)*4+3]>180){bottom=y;break;}if(bottom>=0)break;}
  for(let y=Math.max(0,bottom-12);y<=bottom;y++)for(let x=x0;x<x1;x++)if(raw[(y*width+x)*4+3]>180){l=Math.min(l,x);r=Math.max(r,x);}
  const image=await sharp(raw,{raw:{width,height,channels:4}}).png().toBuffer();
  crops.push({file,image,rect:{left:b.l,top:b.t,width,height},bb,foot:[(l+r)/2,bottom+1],body:bottom-bb.top+1});
 }
 return crops;
}
async function main(){
 fs.mkdirSync(out,{recursive:true});const specs=JSON.parse(fs.readFileSync(path.join(source,'specs.json'),'utf8')),selected=process.argv.slice(2),records=[];
 for(const s of specs){
  if(selected.length&&!selected.includes(s.key))continue;
  const dir=path.join(source,s.key),file=path.join(dir,s.sourceFile||'generated.png');if(!fs.existsSync(file))continue;
  const crops=await extractSheet(file),dragon=s.key==='valakas',cw=dragon?640:384,ch=dragon?448:320,body=dragon?192:160,foot=dragon?[320,320]:[192,270];
  const foots=crops.map((c,i)=>s.sourceFeet&&s.sourceFeet[i]?[s.sourceFeet[i][0]-c.rect.left,s.sourceFeet[i][1]-c.rect.top]:c.foot);
  const bodyHeights=crops.map((c,i)=>foots[i][1]-c.bb.top+1),scales=[0,1,2].map(d=>body/median(bodyHeights.slice(d*4,d*4+2)));
  const order=[0,1,4,5,8,9,2,3,6,7,10,11],raw=Buffer.alloc(cw*4*ch*3*4),hashes=new Set(),cells=[];fs.mkdirSync(path.join(dir,'frames'),{recursive:true});
  for(const [slot,index]of order.entries()){
   const c=crops[index],scale=scales[Math.floor(index/4)],image=await sharp(c.image).extract(c.bb).resize(Math.round(c.bb.width*scale),Math.round(c.bb.height*scale)).png().toBuffer(),meta=await sharp(image).metadata();
   const dx=Math.round(foot[0]+(c.bb.left-foots[index][0])*scale),dy=Math.round(foot[1]+(c.bb.top-foots[index][1])*scale);
   assert(dx>2&&dy>2&&dx+meta.width<cw-2&&dy+meta.height<ch-2,s.key+' frame '+index+'超出安全邊 '+JSON.stringify({dx,dy,w:meta.width,h:meta.height,cw,ch}));
   const frame=await sharp({create:{width:cw,height:ch,channels:4,background:'#00000000'}}).composite([{input:image,left:dx,top:dy}]).png().toBuffer(),frameRaw=await sharp(frame).ensureAlpha().raw().toBuffer(),hash=crypto.createHash('sha256').update(frameRaw).digest('hex');
   assert(!hashes.has(hash),'重複影格 '+s.key);hashes.add(hash);fs.writeFileSync(path.join(dir,'frames',String(slot).padStart(2,'0')+'.png'),frame);
   const x=slot%4*cw,y=Math.floor(slot/4)*ch;for(let row=0;row<ch;row++)frameRaw.copy(raw,((y+row)*cw*4+x)*4,row*cw*4,(row+1)*cw*4);
   cells.push({slot,sourceIndex:index,rect:c.rect,sourceFoot:foots[index],scale,offset:[dx,dy],sha256:hash});
  }
  const src='images/monsters/quest-v1/'+s.key+'.png',sprite={src,cw,ch,body,n:[2,2,2,2,2,2],cols:4,size:s.size||(dragon?104:68),foot};await sharp(raw,{raw:{width:cw*4,height:ch*3,channels:4}}).png().toFile(path.join(root,src));
  const portrait=await sharp(crops[0].image).extract(crops[0].bb).resize(256,320,{fit:'contain',background:'#00000000'}).png().toBuffer();fs.writeFileSync(path.join(out,s.key+'-portrait.png'),portrait);
  const manifest={key:s.key,name:s.name,sprite,portrait:'images/monsters/quest-v1/'+s.key+'-portrait.png',cells};fs.writeFileSync(path.join(out,s.key+'.json'),JSON.stringify(manifest,null,2)+'\n');records.push(manifest);console.log('PASS '+s.key+'：12格／三向行走攻擊／安全邊／腳底');
 }
 const cols=6,rows=Math.ceil(records.length/cols),cv=createCanvas(1536,rows*300+48),g=cv.getContext('2d');g.fillStyle='#181a17';g.fillRect(0,0,cv.width,cv.height);g.fillStyle='#e8d8b4';g.font='bold 24px Microsoft JhengHei';g.fillText('黑暗大陸 · 火龍與職業任務首領',24,33);
 for(const[i,m]of records.entries()){const x=i%cols*256,y=Math.floor(i/cols)*300+48;g.fillStyle='#292b25';g.fillRect(x+5,y,246,290);g.drawImage(await loadImage(path.join(root,m.portrait)),x+32,y+4,192,240);g.fillStyle='#e8d8b4';g.font='14px Microsoft JhengHei';g.textAlign='center';g.fillText(m.name,x+128,y+270);}
 fs.writeFileSync(path.join(source,'contact.png'),cv.toBuffer('image/png'));fs.writeFileSync(path.join(source,'registration.json'),JSON.stringify(records,null,2)+'\n');console.log('PASS '+records.length+'款／'+records.length*12+'格');
}
main().catch(e=>{console.error(e);process.exit(1);});
