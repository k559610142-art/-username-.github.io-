// Pre-render native maps as lossless region backgrounds, including exact indoor variants.
// Dependencies: @napi-rs/canvas, sharp. Run: node tools/region-background/build.cjs [map ids...]
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const {createCanvas,loadImage}=require('@napi-rs/canvas'),sharp=require('sharp');
const ROOT=path.resolve(__dirname,'../..'),SOURCE=path.join(ROOT,'assets/native-world'),OUT=path.join(ROOT,'assets/region-background');
const SIZE=1024,VERSION=1;
const pixel=(c,x,y,m)=>{const a=c.x-m.startX,b=c.y-m.startY;return [(a+b+x-Math.floor(x/2)+y)*24,(b-a+m.width+y-Math.floor(x/2))*12-12];};
function pagesFor(x,y,w=64,h=64){const pages=[];for(let py=Math.floor(y/SIZE);py<=Math.floor((y+h-1)/SIZE);py++)for(let px=Math.floor(x/SIZE);px<=Math.floor((x+w-1)/SIZE);px++)pages.push([px,py]);return pages;}
function collect(id,m,readChunk){
 const pages=new Map(),groups=new Map(),cells=new Map();
 const pageFor=(x,y)=>{const key=x+','+y;if(!pages.has(key))pages.set(key,{x:x*SIZE,y:y*SIZE,floors:[],objects:[]});return pages.get(key);};
 for(const [gx,gy,file]of m.chunks){
  const c=readChunk(file),chunk=id+':'+gx+','+gy;
  const add=(x,y,t,depth=null,gid=null)=>{const [px,py]=pixel(c,x,y,m),row={x:px,y:py,t,depth,group:gid===null?null:chunk+':'+gid};
   for(const [x,y]of pagesFor(px,py))pageFor(x,y)[depth===null?'floors':'objects'].push(row);
   if(row.group){if(!groups.has(row.group))groups.set(row.group,[]);groups.get(row.group).push(row);}
  };
  for(let i=0;i<c.floor.length;i++)add(i%128,Math.floor(i/128),c.floor[i]);
  for(let i=0;i<c.extra.length;i+=3)add(c.extra[i],c.extra[i+1],c.extra[i+2]);
  for(const [gid,pieces]of c.groups)for(let i=0;i<pieces.length;i+=4)add(pieces[i],pieces[i+1],pieces[i+3],pieces[i+2],gid);
  for(let i=0;i<c.events.length;i+=4){const key=(c.y+c.events[i+1])+','+(c.x+Math.floor(c.events[i]/2)),group=chunk+':'+c.events[i+2];
   if(!cells.has(key))cells.set(key,{hidden:[],cover:[]});const list=cells.get(key)[c.events[i+3]===1?'hidden':'cover'];if(!list.includes(group))list.push(group);
  }
 }
 const masks=new Map(),masksByGroup=new Map();for(const cell of cells.values())if(cell.hidden.length){cell.hidden.sort();const key=cell.hidden.join('|');if(!masks.has(key)){masks.set(key,cell.hidden);for(const group of cell.hidden){if(!masksByGroup.has(group))masksByGroup.set(group,new Set());masksByGroup.get(group).add(key);}}}
 for(const page of pages.values()){
  page.objects.sort((a,b)=>a.depth-b.depth);const present=new Set(page.objects.map(r=>r.group)),local=new Set([...present].filter(group=>masksByGroup.has(group))),candidates=new Set();
  for(const group of local)for(const key of masksByGroup.get(group))candidates.add(key);
  page.groups=[...local].sort();page.variants=new Map([['',[]]]);
  for(const key of candidates){const subset=masks.get(key).filter(g=>local.has(g));if(subset.length)page.variants.set(subset.join('|'),subset);}
 }
 return {pages,groups,cells};
}
function blend(target,source,x,y,clip=null){
 const w=target.canvas.width,h=target.canvas.height,left=Math.max(0,x,clip?.x||0),top=Math.max(0,y,clip?.y||0),right=Math.min(w,x+64,clip?clip.x+clip.w:w),bottom=Math.min(h,y+64,clip?clip.y+clip.h:h);
 if(left>=right||top>=bottom)return;const image=target.getImageData(left,top,right-left,bottom-top),d=image.data;
 for(let yy=top;yy<bottom;yy++)for(let xx=left;xx<right;xx++){
  const q=((yy-y)*64+xx-x)*4;if(!source[q+3])continue;const at=((yy-top)*(right-left)+xx-left)*4;
  const bg=(Math.round(d[at]*31/255)<<10)|(Math.round(d[at+1]*31/255)<<5)|Math.round(d[at+2]*31/255),fg=(Math.round(source[q]*31/255)<<10)|(Math.round(source[q+1]*31/255)<<5)|Math.round(source[q+2]*31/255),color=(bg+65535-fg)&32767;
  d[at]=(color>>10&31)*255/31;d[at+1]=(color>>5&31)*255/31;d[at+2]=(color&31)*255/31;
 }
 target.putImageData(image,left,top);
}
function createPainter(manifest){
 const cache=new Map(),sources=new Map(),blends=new Set(manifest.blendTiles||[]),per=manifest.atlasTiles||64,cols=manifest.atlasColumns||8;
 async function preload(rows){
  for(const row of rows){const id=Math.floor(row.t/per);if(cache.has(id)){const image=cache.get(id);cache.delete(id);cache.set(id,image);continue;}cache.set(id,await loadImage(path.join(SOURCE,manifest.atlas[id])));}
 }
 function paint(context,row,ox,oy,clip=null){
  const image=cache.get(Math.floor(row.t/per)),slot=row.t%per,sx=slot%cols*64,sy=Math.floor(slot/cols)*64,x=row.x-ox,y=row.y-oy;
  if(blends.has(row.t)){
   let source=sources.get(row.t);if(!source){const sample=createCanvas(64,64),pen=sample.getContext('2d');pen.drawImage(image,sx,sy,64,64,0,0,64,64);source=pen.getImageData(0,0,64,64).data;sources.set(row.t,source);}
   blend(context,source,x,y,clip);
  }else context.drawImage(image,sx,sy,64,64,x,y,64,64);
 }
 function trim(){while(cache.size>192)cache.delete(cache.keys().next().value);while(sources.size>4096)sources.delete(sources.keys().next().value);}
 return {preload,paint,trim};
}
function renderPage(page,painter,hidden=[],outside=null){
 const canvas=createCanvas(SIZE,SIZE),pen=canvas.getContext('2d'),skip=new Set(hidden);let clip=null;
 if(outside){
  pen.drawImage(outside,0,0);const changed=page.objects.filter(row=>skip.has(row.group));
  if(!changed.length)return canvas;
  const x=Math.max(0,Math.min(...changed.map(r=>r.x-page.x))),y=Math.max(0,Math.min(...changed.map(r=>r.y-page.y))),right=Math.min(SIZE,Math.max(...changed.map(r=>r.x-page.x+64))),bottom=Math.min(SIZE,Math.max(...changed.map(r=>r.y-page.y+64)));
  clip={x,y,w:right-x,h:bottom-y};pen.save();pen.beginPath();pen.rect(x,y,clip.w,clip.h);pen.clip();
 }
 pen.fillStyle='#101b17';pen.fillRect(clip?.x||0,clip?.y||0,clip?.w||SIZE,clip?.h||SIZE);pen.imageSmoothingEnabled=false;
 const intersects=row=>!clip||row.x-page.x<clip.x+clip.w&&row.x-page.x+64>clip.x&&row.y-page.y<clip.y+clip.h&&row.y-page.y+64>clip.y;
 for(const row of page.floors)if(intersects(row))painter.paint(pen,row,page.x,page.y,clip);
 for(const row of page.objects)if(!skip.has(row.group)&&intersects(row))painter.paint(pen,row,page.x,page.y,clip);
 if(clip)pen.restore();return canvas;
}
async function writeImage(file,canvas){
 const rgba=canvas.getContext('2d').getImageData(0,0,canvas.width,canvas.height).data;
 const output=await sharp(Buffer.from(rgba.buffer,rgba.byteOffset,rgba.byteLength),{raw:{width:canvas.width,height:canvas.height,channels:4}}).webp({lossless:true,effort:2}).toBuffer();
 fs.mkdirSync(path.dirname(file),{recursive:true});fs.writeFileSync(file,output);return output.length;
}
function completeImage(file){
 if(!fs.existsSync(file))return false;const buffer=Buffer.alloc(12),fd=fs.openSync(file,'r');try{if(fs.readSync(fd,buffer,0,12,0)!==12)return false;}finally{fs.closeSync(fd);}return buffer.toString('ascii',0,4)==='RIFF'&&buffer.toString('ascii',8,12)==='WEBP'&&buffer.readUInt32LE(4)+8===fs.statSync(file).size;
}
async function buildMap(id,m,manifest,options={}){
 const directory=path.join(OUT,String(id));fs.mkdirSync(directory,{recursive:true});
 const previousFile=path.join(directory,'map.json'),previous=options.reusePages&&fs.existsSync(previousFile)?JSON.parse(fs.readFileSync(previousFile,'utf8')):null;
 const data=collect(id,m,file=>JSON.parse(fs.readFileSync(path.join(SOURCE,String(id),file+'.json'),'utf8'))),painter=createPainter(manifest);
 const result={version:VERSION,id,startX:m.startX,startY:m.startY,width:m.width,height:m.height,size:SIZE,pages:{},groups:{},cells:Object.fromEntries(data.cells)};
 let bytes=0,count=0;const start=Date.now(),overlayIds=new Set([...data.cells.values()].flatMap(c=>c.cover));
 for(const [key,page]of data.pages){
  if(previous?.pages[key]){result.pages[key]=previous.pages[key];count++;continue;}
  const variants={},prefix=key.replace(',','_');let outside=null;
  for(const [signature,hidden]of page.variants){
   const suffix=signature?'-'+crypto.createHash('sha1').update(signature).digest('hex').slice(0,12):'',file='page_'+prefix+suffix+'.webp';variants[signature]=file;
   if(options.resume&&completeImage(path.join(directory,file))){bytes+=fs.statSync(path.join(directory,file)).size;continue;}
   if(!outside){await painter.preload([...page.floors,...page.objects]);outside=renderPage(page,painter);}
   bytes+=await writeImage(path.join(directory,file),signature?renderPage(page,painter,hidden,outside):outside);
  }
  result.pages[key]={x:page.x,y:page.y,w:SIZE,h:SIZE,groups:page.groups,variants};painter.trim();count++;
  if(count%50===0)console.log('map',id,'pages',count+'/'+data.pages.size,(bytes/1048576).toFixed(1)+'MB');
  if(global.gc&&count%20===0)global.gc();
 }
 const buckets=new Map();
 for(const group of overlayIds){
  const rows=data.groups.get(group);if(!rows?.length)continue;rows.sort((a,b)=>a.depth-b.depth);const pieces=new Map();
  for(const row of rows)for(const [px,py]of pagesFor(row.x,row.y)){const key=px+','+py;if(!pieces.has(key))pieces.set(key,[]);pieces.get(key).push(row);}
  result.groups[group]=[];
  for(const [key,part]of pieces){
   const [px,py]=key.split(',').map(Number),x=Math.max(px*SIZE,Math.min(...part.map(r=>r.x))),y=Math.max(py*SIZE,Math.min(...part.map(r=>r.y))),right=Math.min((px+1)*SIZE,Math.max(...part.map(r=>r.x+64))),bottom=Math.min((py+1)*SIZE,Math.max(...part.map(r=>r.y+64)));
   const descriptor={file:'',sx:0,sy:0,x,y,w:right-x,h:bottom-y};result.groups[group].push(descriptor);
   if(!buckets.has(key))buckets.set(key,[]);buckets.get(key).push({descriptor,rows:part});
  }
 }
 for(const [key,pieces]of buckets){
  let canvas=createCanvas(SIZE,SIZE),pen=canvas.getContext('2d'),sx=0,sy=0,rowHeight=0,number=0,packed=0;
  const file=()=> 'cover_'+key.replace(',','_')+'_'+number+'.webp';
  for(const {descriptor:d,rows}of pieces){
   if(sx+d.w>SIZE){sx=0;sy+=rowHeight+1;rowHeight=0;}
   if(sy+d.h>SIZE){bytes+=await writeImage(path.join(directory,file()),canvas);number++;canvas=createCanvas(SIZE,SIZE);pen=canvas.getContext('2d');sx=sy=rowHeight=packed=0;}
   d.file=file();d.sx=sx;d.sy=sy;await painter.preload(rows);const clip={x:sx,y:sy,w:d.w,h:d.h};
   pen.save();pen.beginPath();pen.rect(sx,sy,d.w,d.h);pen.clip();for(const row of rows)painter.paint(pen,row,d.x-sx,d.y-sy,clip);pen.restore();painter.trim();
   sx+=d.w+1;rowHeight=Math.max(rowHeight,d.h);packed++;
  }
  if(packed)bytes+=await writeImage(path.join(directory,file()),canvas);
 }
 fs.writeFileSync(path.join(directory,'map.json'),JSON.stringify(result));fs.writeFileSync(path.join(directory,'map.json.js'),'window.__regionBackgroundReceive('+id+','+JSON.stringify(result)+');');
 console.log('DONE map',id,'pages',count,'overlays',overlayIds.size,'MB',(bytes/1048576).toFixed(1),'seconds',((Date.now()-start)/1000).toFixed(1));
 return {file:id+'/map.json',pages:count,bytes};
}
async function main(){
 const manifest=JSON.parse(fs.readFileSync(path.join(SOURCE,'manifest-atlas64.json'),'utf8')),ids=process.argv.slice(2).filter(s=>/^\d+$/.test(s)).map(Number),wanted=ids.length?ids:Object.keys(manifest.maps).map(Number);
 const indexFile=path.join(OUT,'manifest.json'),index=fs.existsSync(indexFile)?JSON.parse(fs.readFileSync(indexFile,'utf8')):{version:VERSION,size:SIZE,maps:{}};
 for(const id of wanted){if(!manifest.maps[id])throw Error('Unknown map '+id);index.maps[id]=await buildMap(id,manifest.maps[id],manifest,{reusePages:process.argv.includes('--reuse-pages'),resume:process.argv.includes('--resume')});fs.writeFileSync(indexFile,JSON.stringify(index));fs.writeFileSync(path.join(ROOT,'data/region-background-index.js'),'window.REGION_BACKGROUND_INDEX='+JSON.stringify(index)+';\n');if(global.gc)global.gc();}
}
if(require.main===module)main().catch(error=>{console.error(error);process.exitCode=1;});
module.exports={pixel,pagesFor,collect,blend,createPainter,renderPage,writeImage,buildMap};
