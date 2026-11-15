// Rebuild audited live morphs without rewriting user-defined card names or grades.
const fs=require('node:fs'),path=require('node:path'),{spawn}=require('node:child_process');
const root=path.resolve(__dirname,'..'),targets=JSON.parse(fs.readFileSync(path.join(__dirname,'transform-audit/rebuild-graphics.json'),'utf8'));
const {openPak}=require('./client-pak/l1pak'),{parseList}=require('./native-monsters/listspr'),{parseSpr,renderFrame}=require('./native-monsters/spr');
function bodyAnchors(){
 const list=parseList(fs.readFileSync('C:/Users/User/Desktop/天地劫天堂(核心)/編碼器/編瑪器/TW13081901.txt').toString('latin1')),index=new Map();
 for(const n of ['Sprite.idx',...Array.from({length:16},(_,i)=>'Sprite'+String(i).padStart(2,'0')+'.idx')]){const pak=openPak(path.join('C:/Users/User/Desktop/天地劫天堂',n));for(const r of pak.records)if(/\.spr$/i.test(r.name))index.set(r.name.toLowerCase(),[pak,r]);}
 const out={};
 for(const gfx of targets){const e=list.get(gfx),action=[3,7,23,0].map(id=>e?.actions[id]).find(a=>a?.frames.length),points=[];if(!action)continue;const f=action.frames.find(f=>f.dur>0);if(!f)continue;
  for(let d=0;d<8;d++){const record=index.get(e.src+'-'+(f.group+(action.dirs?d:0))+'.spr');if(!record){points.push(null);continue;}const image=renderFrame(parseSpr(record[0].read(record[1])),f.frame);points.push(image?[image.x+image.w/2,image.y+image.h]:null);}
  const ys=points.filter(Boolean).map(p=>p[1]).sort((a,b)=>a-b);if(!ys.length)continue;const ground=ys[ys.length>>1];out[gfx]={};for(const [d,name]of ['NW','N','NE','E','SE','S','SW','W'].entries())if(points[d])out[gfx][name]=[points[d][0],points[d][1]-ground];
 }
 return out;
}
async function worker(ids){return new Promise(resolve=>{const child=spawn(process.execPath,['--expose-gc',path.join(__dirname,'build-extra-transform-cards.cjs'),'--only='+ids.join(','),'--build-only'],{cwd:root,stdio:['ignore','pipe','pipe']});child.stdout.on('data',b=>process.stdout.write(b));child.stderr.on('data',b=>process.stderr.write(b));child.on('exit',code=>resolve(code));});}
(async()=>{
 await Promise.all([worker(targets.filter((_,i)=>i%2===0)),worker(targets.filter((_,i)=>i%2===1))]);
 const file=path.join(root,'data/extra-transform-cards-data.js'),source=fs.readFileSync(file,'utf8'),token='Object.assign(monsterActionIndex,',start=source.indexOf(token)+token.length,end=source.indexOf(');\nfor(const gfx',start);
 if(start<token.length||end<0)throw Error('Composite data index not found');
 const data=JSON.parse(source.slice(start,end)),report=[];
 for(const gfx of targets){const cache=path.join(root,'assets/monster-actions/extra-poly-'+gfx+'.json');const result=fs.existsSync(cache)?JSON.parse(fs.readFileSync(cache,'utf8')):null;if(result?.blendVersion===5){data[gfx]=result.frames;report.push({gfx,complete:true,clips:Object.keys(result.frames).length,files:result.files});}else report.push({gfx,complete:false});}
 const marker='\n// Complete native weapon poses, including their baked body, shadow and clothes layers.';
 const tail=source.slice(end).split(marker)[0];
 const registration=`${marker}\nwindow.NativeMorphGroundAnchors=${JSON.stringify(bodyAnchors())};\nfor(const gfx of ${JSON.stringify(targets)}){const clips=monsterActionIndex[gfx],variants=new Map();for(const [key,frames]of Object.entries(clips||{})){if(key.endsWith('/cast'))clips[key.replace(/\\/cast$/,'/skill')]=frames;const m=key.match(/^d([0-7])\\/w(\\d+)\\/(.+)$/);if(!m)continue;const base=+m[2];if(!variants.has(base))variants.set(base,{});variants.get(base)['d'+m[1]+'/'+m[3]]=frames;}for(const [base,frames]of variants){const name='complete-native-'+gfx+'-'+base;(weaponMorphModes[gfx]??={})[base]=name;weaponMorphFrames[name]=frames;}}\n`;
 fs.writeFileSync(file,source.slice(0,start)+JSON.stringify(data)+tail+registration);
 fs.writeFileSync(path.join(__dirname,'transform-audit/repair-report.json'),JSON.stringify(report,null,2)+'\n');
 console.log(JSON.stringify({rebuilt:report.filter(r=>r.complete).length,incomplete:report.filter(r=>!r.complete)}));
})().catch(e=>{console.error(e);process.exitCode=1;});
