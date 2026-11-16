// Rebuild legacy GIF doll portraits from original SPR body/clothing layers.
// This fixes source decoding/blending; no black-color flood removal or AI repaint.
const fs=require('fs'),path=require('path'),vm=require('vm');
const {openPak}=require('./client-pak/l1pak'),{parseList}=require('./native-monsters/listspr'),{parseSpr,renderFrame}=require('./native-monsters/spr'),{rgbaPng}=require('./client-pak/img2png');
const ROOT=path.resolve(__dirname,'..'),CLIENT=process.env.DOLL_CLIENT||'C:/Users/User/Desktop/天地劫天堂';
const c={};c.window=c;vm.createContext(c);for(const file of ['interface-catalog.js','game-catalog-data.js','doll-dedup.js'])vm.runInContext(fs.readFileSync(path.join(ROOT,'data',file),'utf8'),c,{filename:file});
const dolls=vm.runInContext('gameCatalogData.dolls',c),source=fs.readFileSync(path.join(ROOT,'data/game-catalog.js'),'utf8'),portraits={};
vm.runInNewContext(source.slice(source.indexOf('const catalogPortraits ='),source.indexOf('let transformBookCache'))+';this.portraits=catalogPortraits;',portraits);
const targets=dolls.filter(d=>/\.gif$/i.test(portraits.portraits['dolls-'+d.id]?.[0]||d.img||''));
const text=openPak(path.join(CLIENT,'Text.idx')),list=parseList(text.read(text.records.find(r=>r.name==='list.spr')).toString('latin1'));
const index=new Map();for(const name of ['Sprite.idx',...Array.from({length:16},(_,i)=>'Sprite'+String(i).padStart(2,'0')+'.idx')]){const pak=openPak(path.join(CLIENT,name));for(const r of pak.records)if(/\.spr$/i.test(r.name))index.set(r.name.toLowerCase(),[pak,r]);}
const cache=new Map();function spr(name){if(!cache.has(name)){const ref=index.get(name);cache.set(name,ref?parseSpr(ref[0].read(ref[1])):null);}return cache.get(name);}
function frame(gfx,group,number){const e=list.get(gfx),src=e?.src??gfx;let s=spr(src+'-'+group+'.spr');if(!s){const a=e?.actions[3]||e?.actions[0],f=a?.frames[0];if(f)s=spr(src+'-'+f.group+'.spr');}return s&&s.frames.length?renderFrame(s,number%s.frames.length):null;}
function build(gfx){const e=list.get(gfx),action=e?.actions[3]||e?.actions[0];if(!action?.frames.length)return null;const f=action.frames[Math.floor(action.frames.length/2)],group=f.group+(action.dirs?2:0),layers=[];
 for(const id of [gfx,...(e.clothes||[])]){const meta=list.get(id),r=frame(id,group,f.frame);if(r&&r.w>1&&r.h>1&&meta?.attr!==128)layers.push({r,attr:meta?.attr||0});}
 if(!layers.length)return null;
 const left=Math.min(...layers.map(p=>p.r.x))-4,top=Math.min(...layers.map(p=>p.r.y))-4,w=Math.max(...layers.map(p=>p.r.x+p.r.w))-left+4,h=Math.max(...layers.map(p=>p.r.y+p.r.h))-top+4,px=Buffer.alloc(w*h*4);
 for(const {r,attr}of layers)for(let y=0;y<r.h;y++)for(let x=0;x<r.w;x++){const i=(y*r.w+x)*4;if(!r.px[i+3])continue;let R=r.px[i],G=r.px[i+1],B=r.px[i+2],A=r.px[i+3];if(attr===8){const brightness=Math.max(R,G,B);if(!brightness)continue;A=A*brightness/255;R=R*255/brightness;G=G*255/brightness;B=B*255/brightness;}
  const j=((r.y-top+y)*w+r.x-left+x)*4,a=A/255,da=px[j+3]/255,oa=a+da*(1-a);if(!oa)continue;px[j]=Math.round((R*a+px[j]*da*(1-a))/oa);px[j+1]=Math.round((G*a+px[j+1]*da*(1-a))/oa);px[j+2]=Math.round((B*a+px[j+2]*da*(1-a))/oa);px[j+3]=Math.round(oa*255);}
 return {w,h,px,layers:layers.length,screen:layers.some(p=>p.attr===8)};
}
const result={},report=[],missing=[],rendered=new Map();
for(const d of targets){let image=rendered.get(d.gfx);if(image===undefined){image=build(d.gfx);rendered.set(d.gfx,image);}if(!image){missing.push({id:d.id,name:d.name,gfx:d.gfx});continue;}const file='doll-native-'+d.gfx+'-v2.png';fs.writeFileSync(path.join(ROOT,'assets/interface/catalog-portraits',file),rgbaPng(image.w,image.h,image.px));result[d.id]=file;report.push({id:d.id,name:d.name,gfx:d.gfx,file,width:image.w,height:image.h,layers:image.layers,screen:image.screen});}
const script='// Native transparent doll portraits replace legacy GIF inventory pictures.\nconst DOLL_NATIVE_PORTRAITS='+JSON.stringify(result)+';\nfor(const d of gameCatalogData.dolls){const file=DOLL_NATIVE_PORTRAITS[d.id];if(file){catalogPortraits["dolls-"+d.id]=[file,"sprite"];d.img=file;}}\nfor(const item of INTERFACE_CATALOG.items){const id=DOLL_ID_ALIASES[item.id]||item.id,file=DOLL_NATIVE_PORTRAITS[id];if(item.kind==="etcitem"&&file&&(!item.icon||/\\.gif(?:\\?|$)/i.test(item.icon)))item.icon="assets/interface/catalog-portraits/"+file;}\n';
fs.writeFileSync(path.join(ROOT,'data/doll-portrait-overrides.js'),script);fs.writeFileSync(path.join(__dirname,'doll-portrait-rebuild-report.json'),JSON.stringify({targets:targets.length,rebuilt:report,missing},null,2));console.log(JSON.stringify({targets:targets.length,rebuilt:report.length,graphics:new Set(report.map(r=>r.gfx)).size,missing}));
