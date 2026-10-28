// 裁切image_gen透明原稿並依腳底註冊，不補畫、不變形人物。
const fs=require('fs'),path=require('path'),assert=require('assert/strict'),crypto=require('crypto');
const runtime=path.join(process.env.USERPROFILE,'.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules');
function dep(id){try{return require(id);}catch{return require(path.join(runtime,id));}}
const sharp=dep('sharp'),{createCanvas,loadImage}=dep('@napi-rs/canvas');
const root=path.resolve(__dirname,'../../../..'),source=__dirname,out=path.join(root,'images/sprites/morph/crimson-moon-reaper-v1');
const dirs=['down','right','up'],actions={walk:{n:4,start:0,ms:130},attack:{n:4,start:4,ms:140},cast:{n:2,start:8,ms:220},hit:{n:2,start:10,ms:150}};
const cellW=384,cellH=320,foot=[192,270];
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
  assert(b.l>=1&&b.t>=1&&b.r<=w-2&&b.b<=h-2,file+' 第'+(i+1)+'格原稿碰邊 '+JSON.stringify(b));
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
 fs.mkdirSync(out,{recursive:true});fs.mkdirSync(path.join(source,'build/frames'),{recursive:true});const crops={};for(const dir of dirs)crops[dir]=await extractSheet(path.join(source,dir+'-generated.png'));
 const audit=[],hashes=new Set(),manifest={id:'crimson-moon-reaper-v1',form:'m34',name:'緋月收魂姬（紅變）',rows:dirs,left:'mirror right',cellW,cellH,footAnchor:foot,charH:160,drawH:48,actions:{}};
 for(const[action,cfg]of Object.entries(actions)){
  const width=cellW*cfg.n,raw=Buffer.alloc(width*cellH*3*4),cells=[];
  for(let d=0;d<3;d++){
   const dir=dirs[d],body=median(crops[dir].slice(0,4).map(c=>c.body)),scale=160/body;
   for(let f=0;f<cfg.n;f++){
    const c=crops[dir][cfg.start+f],piece=await sharp(c.image).extract(c.bb).resize(Math.round(c.bb.width*scale),Math.round(c.bb.height*scale)).png().toBuffer(),meta=await sharp(piece).metadata();
    const dx=Math.round(foot[0]+(c.bb.left-c.foot[0])*scale),dy=Math.round(foot[1]+(c.bb.top-c.foot[1])*scale);assert(dx>2&&dy>2&&dx+meta.width<cellW-2&&dy+meta.height<cellH-2,dir+' '+action+' '+f+'超出註冊格');
    const frame=await sharp({create:{width:cellW,height:cellH,channels:4,background:'#00000000'}}).composite([{input:piece,left:dx,top:dy}]).png().toBuffer(),pixels=await sharp(frame).ensureAlpha().raw().toBuffer();
    const hash=crypto.createHash('sha256').update(pixels).digest('hex');assert(!hashes.has(hash));hashes.add(hash);
    const filename=action+'-'+dir+'-'+String(f+1).padStart(2,'0')+'.png';fs.writeFileSync(path.join(source,'build/frames',filename),frame);
    for(let y=0;y<cellH;y++)pixels.copy(raw,((d*cellH+y)*width+f*cellW)*4,y*cellW*4,(y+1)*cellW*4);
    const info={direction:dir,frame:f,file:'frames/'+filename,source:dir+'-generated.png',sourceRect:c.rect,sourceFoot:[c.rect.left+c.foot[0],c.rect.top+c.foot[1]],scale,offset:[dx,dy],sha256:hash};cells.push(info);audit.push({...info,action});
   }
  }
  await sharp(raw,{raw:{width,height:cellH*3,channels:4}}).png().toFile(path.join(out,action+'.png'));
  manifest.actions[action]={src:'images/sprites/morph/crimson-moon-reaper-v1/'+action+'.png',cellW,cellH,frames:{down:cfg.n,right:cfg.n,up:cfg.n},ms:cfg.ms,cells};
 }
 fs.writeFileSync(path.join(out,'manifest.json'),JSON.stringify(manifest,null,2)+'\n');fs.writeFileSync(path.join(source,'registration.json'),JSON.stringify(audit,null,2)+'\n');
 await sharp(path.join(source,'build/frames/walk-down-02.png')).trim({background:'#00000000',threshold:10}).resize(320,360,{fit:'contain',background:'#00000000'}).png().toFile(path.join(out,'portrait.png'));
 const cv=createCanvas(960,760),g=cv.getContext('2d');g.fillStyle='#171914';g.fillRect(0,0,960,760);g.fillStyle='#edc8ad';g.font='bold 25px Microsoft JhengHei';g.fillText('緋月收魂姬 · 紅變專屬動畫',24,36);
 const labels={walk:'走路',attack:'揮鐮斬擊',cast:'鐮刃施法',hit:'受傷'},dn={down:'正面',right:'側面',up:'背面'};
 for(let d=0;d<3;d++)for(const[a,[action,cfg]]of Object.entries(actions).entries()){
  const f=action==='attack'?2:action==='cast'?1:0,x=a*240,y=55+d*230;g.fillStyle='#292b24';g.fillRect(x+5,y,230,222);const preview=await sharp(path.join(source,'build/frames',action+'-'+dirs[d]+'-'+String(f+1).padStart(2,'0')+'.png')).trim({background:'#00000000',threshold:10}).resize(220,180,{fit:'contain',background:'#00000000'}).png().toBuffer();g.drawImage(await loadImage(preview),x+10,y+5,220,180);g.font='16px Microsoft JhengHei';g.fillStyle='#e6ccb5';g.textAlign='center';g.fillText(dn[dirs[d]]+'・'+labels[action],x+120,y+204);
 }
 fs.writeFileSync(path.join(source,'contact.png'),cv.toBuffer('image/png'));console.log('PASS：緋月收魂姬36格透明獨立動作／腳底註冊／4圖集／來源與總覽');
}
main().catch(e=>{console.error(e);process.exit(1);});

