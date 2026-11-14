const fs=require('node:fs'),path=require('node:path');
const root=path.resolve(__dirname,'../../assets/region-background'),source=JSON.parse(fs.readFileSync(path.resolve(__dirname,'../../assets/native-world/manifest-atlas64.json'),'utf8')),index=JSON.parse(fs.readFileSync(path.join(root,'manifest.json'),'utf8')),pictures=new Map();let regions=0,cells=0,pages=0;
function picture(id,name){
 const file=path.resolve(root,String(id),name);if(!file.startsWith(root+path.sep))throw Error('Invalid picture path');if(pictures.has(file))return pictures.get(file);
 const stat=fs.statSync(file),head=Buffer.alloc(32),fd=fs.openSync(file,'r');try{fs.readSync(fd,head,0,32,0);}finally{fs.closeSync(fd);}
 if(head.toString('ascii',0,4)!=='RIFF'||head.toString('ascii',8,12)!=='WEBP'||head.readUInt32LE(4)+8!==stat.size)throw Error('Incomplete image '+file);
 const type=head.toString('ascii',12,16);let w,h;if(type==='VP8L'){w=1+head[21]+((head[22]&63)<<8);h=1+(head[22]>>6)+(head[23]<<2)+((head[24]&15)<<10);}else if(type==='VP8X'){w=1+head.readUIntLE(24,3);h=1+head.readUIntLE(27,3);}else throw Error('Expected lossless WebP '+file);
 const image={w,h,bytes:stat.size};pictures.set(file,image);return image;
}
for(const id of Object.keys(source.maps)){
 if(!index.maps[id])throw Error('Missing map in index: '+id);const data=JSON.parse(fs.readFileSync(path.join(root,index.maps[id].file),'utf8')),groupPages=new Map();
 if(!data.statePages)throw Error('Metadata was not split for map '+id);
 for(const page of Object.values(data.pages)){
  pages++;for(const name of Object.values(page.variants)){const p=picture(id,name);if(p.w!==page.w||p.h!==page.h)throw Error('Wrong region dimensions '+id+'/'+name);}
  for(const group of page.groups){if(!groupPages.has(group))groupPages.set(group,[]);groupPages.get(group).push(page);}
  for(const name of page.coverFiles||[])picture(id,name);
 }
 for(const rel of Object.values(data.statePages)){
  regions++;const file=path.join(root,rel);if(!fs.existsSync(file+'.js'))throw Error('Missing file:// metadata '+file);const state=JSON.parse(fs.readFileSync(file,'utf8'));
  for(const descriptors of Object.values(state.groups))for(const d of descriptors){const p=picture(id,d.file);if((d.sx||0)<0||(d.sy||0)<0||(d.sx||0)+d.w>p.w||(d.sy||0)+d.h>p.h)throw Error('Invalid foreground crop '+id+'/'+d.file);}
  for(const cell of Object.values(state.cells)){
   cells++;if(!cell.hidden.length)continue;const mask=new Set(cell.hidden),affected=new Set(cell.hidden.flatMap(group=>groupPages.get(group)||[]));
   for(const page of affected){const key=page.groups.filter(group=>mask.has(group)).join('|');if(!page.variants[key])throw Error('Missing indoor variant '+id+' '+key);}
  }
 }
}
console.log(JSON.stringify({maps:Object.keys(source.maps).length,pages,stateRegions:regions,eventCells:cells,losslessPictures:pictures.size,megabytes:([...pictures.values()].reduce((n,p)=>n+p.bytes,0)/1048576).toFixed(1)}));
