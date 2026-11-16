// 從天地劫客戶端 Sprite*.pak 取出背包圖示 <gfx>.tbt → assets/interface/client-icons/<gfx>.png，並登記到 data/item-icon-overrides.js 的 byGfx。
// 用法：node tools/client-pak/extract-tbt-icons.js 3215,4678,...（2026-11-16：製作工匠裡 240 種成品沒有圖示）
const fs=require('fs'),path=require('path'),{openPak}=require('./l1pak'),{tbtToRgba}=require('./tbt2png'),{rgbaPng}=require('./img2png');
const root=path.resolve(__dirname,'../..'),client='C:/Users/User/Desktop/天地劫天堂',out=path.join(root,'assets/interface/client-icons');
const want=new Set(process.argv[2].split(',').map(s=>s.trim()+'.tbt')),found=new Map();
// 後面的 pak 覆蓋前面的（客戶端更新包同名檔以後者為準）
for(const f of ['Sprite.idx',...Array.from({length:16},(_,i)=>'Sprite'+String(i).padStart(2,'0')+'.idx')]){const p=openPak(path.join(client,f));for(const r of p.records)if(want.has(r.name.toLowerCase()))found.set(r.name.toLowerCase(),[p,r]);}
const done=[];for(const [name,[p,r]] of found){const im=tbtToRgba(p.read(r));if(!im)continue;const gfx=name.replace('.tbt','');fs.writeFileSync(path.join(out,gfx+'.png'),rgbaPng(im.w,im.h,im.px));done.push(gfx);}
const file=path.join(root,'data/item-icon-overrides.js');let src=fs.readFileSync(file,'utf8');const m=src.match(/const byGfx=(\{[^}]*\})/);const map=JSON.parse(m[1]);
for(const g of done)map[g]??='assets/interface/client-icons/'+g+'.png';src=src.replace(m[1],JSON.stringify(map));fs.writeFileSync(file,src);
console.log(JSON.stringify({extracted:done.length,missing:[...want].filter(n=>!found.has(n)).map(n=>n.replace('.tbt',''))}));
