// Extract named .img files from the 天地劫天堂 client Sprite*.pak into PNG.
// Usage: node tools/client-pak/extract.js "C:/Users/User/Desktop/天地劫天堂" assets/interface/client-ui 982c.img [more.img ...]
const fs=require('fs'),path=require('path'),{openPak}=require('./l1pak.js'),{imgToRgba,rgbaPng}=require('./img2png.js');
const [client,out,...names]=process.argv.slice(2),want=new Set(names);fs.mkdirSync(out,{recursive:true});
for(const f of ['Sprite.idx',...Array.from({length:16},(_,i)=>'Sprite'+String(i).padStart(2,'0')+'.idx')]){if(!want.size)break;const p=openPak(path.join(client,f));
 for(const r of p.records)if(want.has(r.name)){const im=imgToRgba(p.read(r));fs.writeFileSync(path.join(out,r.name.replace(/\.img$/i,'.png')),rgbaPng(im.w,im.h,im.px));console.log(f,r.name,im.w+'x'+im.h);want.delete(r.name)}}
if(want.size)console.log('not found',[...want]);
