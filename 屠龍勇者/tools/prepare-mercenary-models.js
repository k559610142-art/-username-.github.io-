// 裁切image_gen透明原稿並依腳底註冊，不補畫、不變形人物。
const fs=require('fs'),path=require('path'),assert=require('assert/strict'),crypto=require('crypto');
const runtime=path.join(process.env.USERPROFILE,'.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules');
function dep(id){try{return require(id);}catch{return require(path.join(runtime,id));}}
const sharp=dep('sharp'),{createCanvas,loadImage}=dep('@napi-rs/canvas');
const root=path.resolve(__dirname,'..'),source=path.join(__dirname,'sprite-src/mercenary/companions-v1'),out=path.join(root,'images/sprites/mercenary/companions-v1');
const designs=JSON.parse(fs.readFileSync(path.join(source,'prompts.json'),'utf8')).designs;
const dirs=['down','right','up'],actions={walk:{n:4,start:0,ms:130},attack:{n:4,start:4,ms:140},cast:{n:2,start:8,ms:220},hit:{n:2,start:10,ms:150}};
const cellW=384,cellH=320,foot=[192,282];
function bounds(data,w,h){let l=w,t=h,r=-1,b=-1;for(let y=0;y<h;y++)for(let x=0;x<w;x++)if(data[(y*w+x)*4+3]>24){l=Math.min(l,x);t=Math.min(t,y);r=Math.max(r,x);b=Math.max(b,y);}assert(r>=l,'空白分鏡');return {left:l,top:t,width:r-l+1,height:b-t+1};}
function median(values){return values.slice().sort((a,b)=>a-b)[Math.floor(values.length/2)];}
async function extractSheet(file){
 const {data,info}=await sharp(file).ensureAlpha().raw().toBuffer({resolveWithObject:true}),w=info.width,h=info.height,size=w*h;
 const threshold=file.includes('arcane')&&file.includes('up-generated')?192:64;
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
  assert(b.l>1&&b.t>1&&b.r<w-2&&b.b<h-2,'原稿人物碰畫布邊緣');
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
 fs.mkdirSync(out,{recursive:true});const audit=[],portraits=[];
 for(const design of designs){
  const dest=path.join(out,design.id);fs.mkdirSync(path.join(dest,'frames'),{recursive:true});
  const crops={};
  for(const dir of dirs){
   const file=path.join(source,design.id,dir+'-generated.png'),meta=await sharp(file).metadata();assert(meta.hasAlpha,design.id+' '+dir+'無透明通道');crops[dir]=await extractSheet(file);
  }
  const hashes=new Set(),manifest={id:design.id,name:design.name,cellW,cellH,foot,charH:160,drawH:['spirit','arcane'].includes(design.id)?36:46,rows:dirs,left:'mirror right',actions:{}};
  for(const [action,cfg]of Object.entries(actions)){
   const sheetWidth=cellW*cfg.n,sheetRaw=Buffer.alloc(sheetWidth*cellH*3*4);
   for(let d=0;d<dirs.length;d++){
    const dir=dirs[d],body=median(crops[dir].slice(0,4).map(c=>c.body)),scale=160/body;
    for(let i=0;i<cfg.n;i++){
     const c=crops[dir][cfg.start+i],image=await sharp(c.image).extract(c.bb).resize(Math.round(c.bb.width*scale),Math.round(c.bb.height*scale)).png().toBuffer();
     const meta=await sharp(image).metadata(),dx=Math.round(foot[0]+(c.bb.left-c.foot[0])*scale),dy=Math.round(foot[1]+(c.bb.top-c.foot[1])*scale);
     assert(dx>2&&dy>2&&dx+meta.width<cellW-2&&dy+meta.height<cellH-2,design.id+' '+dir+' '+action+' '+i+'超出註冊格');
     const frame=await sharp({create:{width:cellW,height:cellH,channels:4,background:{r:0,g:0,b:0,alpha:0}}}).composite([{input:image,left:dx,top:dy}]).png().toBuffer();
     const digest=crypto.createHash('sha256').update(frame).digest('hex');assert(!hashes.has(digest),'重複分鏡');hashes.add(digest);
     const filename=action+'-'+dir+'-'+String(i+1).padStart(2,'0')+'.png';fs.writeFileSync(path.join(dest,'frames',filename),frame);
     const frameRaw=await sharp(frame).ensureAlpha().raw().toBuffer();
     for(let y=0;y<cellH;y++)frameRaw.copy(sheetRaw,((d*cellH+y)*sheetWidth+i*cellW)*4,y*cellW*4,(y+1)*cellW*4);
     audit.push({id:design.id,dir,action,frame:i,source: path.relative(source,c.file),rect:c.rect,sourceFoot:c.foot,scale,offset:[dx,dy],sha256:digest});
    }
   }
   await sharp(sheetRaw,{raw:{width:sheetWidth,height:cellH*3,channels:4}}).png().toFile(path.join(dest,action+'.png'));
   manifest.actions[action]={src:'images/sprites/mercenary/companions-v1/'+design.id+'/'+action+'.png',cellW,cellH,frames:{down:cfg.n,right:cfg.n,up:cfg.n},ms:cfg.ms};
  }
  const portrait=await sharp(path.join(dest,'frames/walk-down-02.png')).trim({background:'#00000000',threshold:10}).resize(256,320,{fit:'contain',background:'#00000000'}).png().toBuffer();
  fs.writeFileSync(path.join(dest,'portrait.png'),portrait);fs.writeFileSync(path.join(dest,'manifest.json'),JSON.stringify(manifest,null,2)+'\n');portraits.push({design,image:portrait});
  console.log('PASS '+design.id+'：36格獨立透明分鏡／腳底註冊／4動作／立繪');
 }
 const canvas=createCanvas(1440,430),ctx=canvas.getContext('2d');ctx.fillStyle='#171914';ctx.fillRect(0,0,1440,430);ctx.font='bold 25px Microsoft JhengHei';ctx.fillStyle='#e9d9ac';ctx.fillText('黑暗大陸 · 六位傭兵',24,36);
 for(let i=0;i<portraits.length;i++){ctx.fillStyle='#282a23';ctx.fillRect(i*240+8,56,224,362);ctx.drawImage(await loadImage(portraits[i].image),i*240+8,62,224,280);ctx.font='18px Microsoft JhengHei';ctx.fillStyle='#ecdbb0';ctx.textAlign='center';ctx.fillText(portraits[i].design.name,i*240+120,380);}
 fs.writeFileSync(path.join(source,'contact.png'),canvas.toBuffer('image/png'));fs.writeFileSync(path.join(source,'registration.json'),JSON.stringify(audit,null,2)+'\n');console.log('PASS 全6位216格與人物總覽');
}
main().catch(e=>{console.error(e);process.exit(1);});
