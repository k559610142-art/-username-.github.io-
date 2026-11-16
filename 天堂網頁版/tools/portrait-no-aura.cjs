// 重畫變身卡頭像：只疊本體、陰影與自身圖層，略過天地劫附加光暈（clothes 編號 20000 以上）。
// 用法：node tools/portrait-no-aura.cjs 12229,12230,...（2026-11-16 使用者「全部拿掉」光暈；死亡騎士系列走 death-knight-original-data，不經 build-extra-transform-cards）
const fs=require('fs'),path=require('path');
const dependency=name=>{try{return require(name)}catch{return require(require.resolve(name,{paths:[path.join(__dirname,'.native-runtime')]}))}};
const sharp=dependency('sharp'),{createCanvas,loadImage}=dependency('@napi-rs/canvas');
const {openPak}=require('./client-pak/l1pak'),{parseList}=require('./native-monsters/listspr'),{parseSpr,renderFrame}=require('./native-monsters/spr'),{rgbaPng}=require('./client-pak/img2png');
const root=path.resolve(__dirname,'..'),client='C:/Users/User/Desktop/天地劫天堂',list=parseList(fs.readFileSync('C:/Users/User/Desktop/天地劫天堂(核心)/編碼器/編瑪器/TW13081901.txt').toString('latin1'));
const index=new Map();for(const n of ['Sprite.idx',...Array.from({length:16},(_,i)=>'Sprite'+String(i).padStart(2,'0')+'.idx')]){const p=openPak(path.join(client,n));for(const r of p.records)if(/\.spr$/i.test(r.name))index.set(r.name.toLowerCase(),[p,r]);}
const spr=file=>{const r=index.get(file.toLowerCase());try{return r?parseSpr(r[0].read(r[1])):null}catch{return null}};
function info(src,group,d,frame,dirs,cycle){let s=spr(src+'-'+(group+(dirs?d:0))+'.spr');if(cycle&&!s?.frames.length)s=spr(src+'-'+(dirs?d:0)+'.spr')||spr(src+'-0.spr');if(!s?.frames.length)return null;return renderFrame(s,cycle?frame%s.frames.length:frame);}
async function portrait(gfx){
 const e=list.get(gfx),a=[3,7,23,0].map(id=>e.actions[id]).find(a=>a?.frames.length),f=a.frames.find(f=>f.dur>0),d=3,parts=[];
 if(e.shadow){const sd=list.get(e.shadow),r=info(sd?.src||e.shadow,f.group,d,f.frame,a.dirs,true);if(r){r.px=Buffer.from(r.px);for(let i=3;i<r.px.length;i+=4)r.px[i]=Math.round(r.px[i]*.6);parts.push({...r,attr:0});}}
 const body=info(e.src,f.group,d,f.frame,a.dirs,false);if(body)parts.push({...body,attr:e.attr||0});
 for(const c of e.clothes){if(c>=20000)continue;const cd=list.get(c),r=info(cd?.src||c,f.group,d,f.frame,a.dirs,true);if(!r)continue;const attr=cd?.attr||0;if(attr===8||attr===128){r.px=Buffer.from(r.px);for(let i=0;i<r.px.length;i+=4){const screen=attr===8,m=screen?Math.max(r.px[i],r.px[i+1],r.px[i+2]):255-Math.min(r.px[i],r.px[i+1],r.px[i+2]);r.px[i+3]=Math.round(r.px[i+3]*m/255);if(m)for(let k=0;k<3;k++)r.px[i+k]=screen?Math.round(r.px[i+k]*255/m):255-Math.round((255-r.px[i+k])*255/m);if(screen&&r.px[i+3]<32)r.px[i+3]=0;}}parts.push({...r,attr});}
 const x=Math.min(...parts.map(p=>p.x)),y=Math.min(...parts.map(p=>p.y)),w=Math.max(...parts.map(p=>p.x+p.w))-x,h=Math.max(...parts.map(p=>p.y+p.h))-y,cv=createCanvas(w,h),ctx=cv.getContext('2d');
 for(const p of parts){ctx.globalCompositeOperation=p.attr===8?'screen':p.attr===128?'multiply':'source-over';ctx.drawImage(await loadImage(rgbaPng(p.w,p.h,p.px)),p.x-x,p.y-y);}
 await sharp(cv.toBuffer('image/png')).trim({threshold:0}).png().toFile(path.join(root,'assets/transform-portraits',gfx+'.png'));console.log('portrait',gfx,w,h);
}
(async()=>{for(const g of process.argv[2].split(',').map(Number))await portrait(g);})().catch(e=>{console.error(e);process.exitCode=1;});
