// Apply native screen and multiply layers together before removing their black matte.
const NpcEffectRenderer=(()=>{
 const images=new Map(),cache=new Map();
 function asset(file){if(!images.has(file)){const image=new Image();image.src='assets/island-monsters-v2/'+file;images.set(file,image);}return images.get(file);}
 function frames(gfx,heading,elapsed,seen=new Set()){
  if(seen.has(gfx))return [];seen.add(gfx);const m=NPC_EFFECT_DATA[gfx];if(!m)return [];
  const list=m.directions['d'+heading+'/idle']||m.directions['d0/idle'];let remain=elapsed;
  const f=list?.find(f=>(remain-=f[5])<0)||list?.at(-1),rows=f?.[0]?[{frame:f,attribute:m.attribute}]:[];
  for(const id of m.parts)rows.push(...frames(id,heading,elapsed,seen));return rows;
 }
 function draw(pen,effect,elapsed,px,py,scale){
  const rows=frames(effect.gfx,effect.heading||0,elapsed);if(!rows.length)return;
  const key=JSON.stringify(rows.map(r=>[r.frame[0],r.attribute]));let sprite=cache.get(key);
  if(!sprite){
   for(const row of rows){const image=asset(row.frame[0]);if(!image.complete||!image.naturalWidth)return;}
   const left=Math.min(...rows.map(r=>r.frame[1])),top=Math.min(...rows.map(r=>r.frame[2])),right=Math.max(...rows.map(r=>r.frame[1]+r.frame[3])),bottom=Math.max(...rows.map(r=>r.frame[2]+r.frame[4]));
   const canvas=document.createElement('canvas');canvas.width=right-left;canvas.height=bottom-top;if(!canvas.width||!canvas.height||canvas.width>2048||canvas.height>2048)return;
   const ctx=canvas.getContext('2d',{willReadFrequently:true});ctx.fillStyle='#000';ctx.fillRect(0,0,canvas.width,canvas.height);
   for(const row of rows){ctx.globalCompositeOperation=row.attribute===128?'multiply':row.attribute===8?'screen':'source-over';ctx.drawImage(asset(row.frame[0]),row.frame[1]-left,row.frame[2]-top);}
   const pixels=ctx.getImageData(0,0,canvas.width,canvas.height),p=pixels.data;
   for(let i=0;i<p.length;i+=4){const light=Math.max(p[i],p[i+1],p[i+2]);p[i+3]=Math.round(p[i+3]*light/255);if(light){p[i]=Math.round(p[i]*255/light);p[i+1]=Math.round(p[i+1]*255/light);p[i+2]=Math.round(p[i+2]*255/light);}}
   ctx.putImageData(pixels,0,0);sprite={canvas,left,top};cache.set(key,sprite);if(cache.size>512)cache.delete(cache.keys().next().value);
  }
  pen.drawImage(sprite.canvas,px+sprite.left*scale,py+sprite.top*scale,sprite.canvas.width*scale,sprite.canvas.height*scale);
 }
 function preload(gfx,seen=new Set()){
  if(seen.has(gfx))return Promise.resolve(true);seen.add(gfx);const m=NPC_EFFECT_DATA[gfx];if(!m)return Promise.resolve(false);
  const files=new Set(Object.values(m.directions).flat().map(f=>f[0]).filter(Boolean));
  return Promise.all([...files].map(file=>{const image=asset(file);if(image.complete)return Promise.resolve(!!image.naturalWidth);return new Promise(resolve=>{image.addEventListener('load',()=>resolve(true),{once:true});image.addEventListener('error',()=>resolve(false),{once:true});});}).concat(m.parts.map(id=>preload(id,seen)))).then(ready=>ready.every(Boolean));
 }
 for(const id of [169,189,190,194,197,8910,11722])if(NPC_EFFECT_DATA[id])preload(id);
 return {draw,preload};
})();window.NpcEffectRenderer=NpcEffectRenderer;
