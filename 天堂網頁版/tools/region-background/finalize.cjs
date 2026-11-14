// Split metadata spatially, validate assets and publish a complete index after background generation.
const fs=require('node:fs'),path=require('node:path');
const ROOT=path.resolve(__dirname,'../..'),OUT=path.join(ROOT,'assets/region-background'),native=JSON.parse(fs.readFileSync(path.join(ROOT,'assets/native-world/manifest-atlas64.json'),'utf8'));
function finalizeMap(id){
 const directory=path.join(OUT,String(id));if(!directory.startsWith(OUT+path.sep))throw Error('Unexpected output directory');
 const file=path.join(directory,'map.json');if(!fs.existsSync(file))throw Error('Map '+id+' has not finished building');
 const data=JSON.parse(fs.readFileSync(file,'utf8')),references=new Set(),regions=new Map();
 for(const page of Object.values(data.pages))for(const name of Object.values(page.variants))references.add(name);
 if(!data.statePages){
  const coverFiles=new Map();
  for(const descriptors of Object.values(data.groups))for(const d of descriptors){references.add(d.file);const key=Math.floor(d.x/data.size)+','+Math.floor(d.y/data.size);if(!coverFiles.has(key))coverFiles.set(key,new Set());coverFiles.get(key).add(d.file);}
  for(const [key,page]of Object.entries(data.pages))page.coverFiles=[...(coverFiles.get(key)||[])];
  for(const [key,cell]of Object.entries(data.cells)){
   const [y,x]=key.split(',').map(Number),a=x-data.startX,b=y-data.startY,region=Math.floor(((a+b)*24+24)/data.size)+','+Math.floor(((b-a+data.width)*12)/data.size);
   if(!regions.has(region))regions.set(region,{cells:{},groups:{}});const part=regions.get(region);part.cells[key]=cell;
   for(const group of [...cell.hidden,...cell.cover])if(data.groups[group])part.groups[group]=data.groups[group];
  }
  data.statePages={};
  for(const [key,part]of regions){const name='state_'+key.replace(',','_')+'.json';data.statePages[key]=id+'/'+name;fs.writeFileSync(path.join(directory,name),JSON.stringify(part));fs.writeFileSync(path.join(directory,name+'.js'),'window.__regionStateReceive('+id+','+JSON.stringify(key)+','+JSON.stringify(part)+');');}
  data.cells={};data.groups={};
  fs.writeFileSync(file,JSON.stringify(data));fs.writeFileSync(file+'.js','window.__regionBackgroundReceive('+id+','+JSON.stringify(data)+');');
 }else{
  for(const rel of Object.values(data.statePages)){const part=JSON.parse(fs.readFileSync(path.join(OUT,rel),'utf8'));for(const descriptors of Object.values(part.groups))for(const d of descriptors)references.add(d.file);}
 }
 for(const name of references)if(!fs.existsSync(path.join(directory,name)))throw Error('Missing region picture: '+id+'/'+name);
 // Only remove obsolete generated pictures inside this explicitly checked output directory.
 let removed=0,bytes=0;for(const entry of fs.readdirSync(directory)){const target=path.join(directory,entry);if(/^(?:page|cover)_[a-z0-9_,-]+\.webp$/.test(entry)&&!references.has(entry)){fs.unlinkSync(target);removed++;}else if(references.has(entry))bytes+=fs.statSync(target).size;}
 return {file:id+'/map.json',pages:Object.keys(data.pages).length,regions:Object.keys(data.statePages).length,bytes,removed};
}
if(require.main===module){
 const requested=process.argv.slice(2).map(Number),ids=requested.length?requested:Object.keys(native.maps).map(Number),index={version:1,size:1024,maps:{}};let bytes=0,removed=0;
 for(const id of ids){const row=finalizeMap(id);index.maps[id]=row;bytes+=row.bytes;removed+=row.removed;}
 fs.writeFileSync(path.join(OUT,'manifest.json'),JSON.stringify(index));fs.writeFileSync(path.join(ROOT,'data/region-background-index.js'),'window.REGION_BACKGROUND_INDEX='+JSON.stringify(index)+';\n');console.log(JSON.stringify({maps:ids.length,megabytes:(bytes/1048576).toFixed(1),obsoletePicturesRemoved:removed}));
}
module.exports={finalizeMap};
