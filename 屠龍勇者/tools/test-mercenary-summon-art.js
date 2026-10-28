// 讀真實PNG與正式繪圖函式；隔離角色存檔和連線。
const fs=require('fs'),path=require('path'),vm=require('vm'),assert=require('assert/strict'),crypto=require('crypto');
const runtime=path.join(process.env.USERPROFILE,'.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules');
const {createCanvas,loadImage,GlobalFonts}=require(path.join(runtime,'@napi-rs/canvas'));
const cjk=path.join(process.env.WINDIR||'C:/Windows','Fonts/msjh.ttc');if(fs.existsSync(cjk))GlobalFonts.registerFromPath(cjk,'PreviewCJK');
const prefix=fs.readFileSync(path.join(__dirname,'test-mercenary.js'),'utf8').split('ctx.assert = assert;')[0];
const ctx=new Function('require','__dirname',prefix+'\nreturn ctx;')(require,__dirname);
(async()=>{
 const specs=vm.runInContext('MERC_SUMMON_ART',ctx),images={};
 assert.equal(Object.keys(specs).length,9);
 for(const [id,a]of Object.entries(specs)){
  const img=await loadImage(path.join(__dirname,'..',a.src.split('?')[0]));images[a.src]=img;assert.equal(img.width,1024);assert.equal(img.height,512);
  const hashes=new Set();
  for(let row=0;row<2;row++)for(let f=0;f<4;f++){
   const c=createCanvas(256,256),g=c.getContext('2d');g.drawImage(img,f*256,row*256,256,256,0,0,256,256);
   const p=g.getImageData(0,0,256,256).data;let visible=0,clear=0;
   for(let i=3;i<p.length;i+=4){if(p[i]>30)visible++;if(p[i]===0)clear++;}
   assert(visible>600,id+' empty frame');assert(clear>65536*.25,id+' missing transparency');hashes.add(crypto.createHash('sha256').update(p).digest('hex'));
  }assert.equal(hashes.size,8,id+' duplicate animation frames');
 }
 ctx.artImages=images;vm.runInContext('spriteImage=src=>artImages[src]||null',ctx);
 const c=createCanvas(1080,720),g=c.getContext('2d');g.fillStyle='#18212b';g.fillRect(0,0,c.width,c.height);ctx.paint=g;
 vm.runInContext(`Object.keys(MERC_SUMMON_ART).forEach((id,i)=>{const x=65+i%3*360,y=100+Math.floor(i/3)*230;for(let f=0;f<4;f++){paint.save();paint.translate(x+f*85,y);mercDrawSummon(paint,id,0,0,f*140,false);mercDrawSummon(paint,id,0,85,f*112.5,true,0,'left');paint.restore();}paint.fillStyle='#f5e4bc';paint.font='15px sans-serif';paint.fillText(id,x-35,y+125);});`,ctx);
 fs.writeFileSync(path.join(__dirname,'sprite-src/mercenary/summons-v1/game-render.png'),c.toBuffer('image/png'));
 const overview=createCanvas(1080,900);ctx.paint=overview.getContext('2d');
 vm.runInContext(`paint.fillStyle='#18212b';paint.fillRect(0,0,1080,900);Object.keys(MERC_SUMMON_ART).forEach((id,i)=>{const x=180+i%3*360,y=190+Math.floor(i/3)*300;paint.fillStyle='#253443';paint.fillRect(x-173,y-180,346,284);for(const [j,acting]of [false,true].entries()){paint.save();paint.translate(x-82+j*164,y);paint.scale(2.4,2.4);mercDrawSummon(paint,id,0,0,280,acting,0);paint.restore();}paint.fillStyle='#f6e2b9';paint.font='24px PreviewCJK';paint.textAlign='center';paint.fillText(MERC_RUNES[id].name.replace('契約',''),x,y+48);paint.fillStyle='#b6cbd8';paint.font='16px PreviewCJK';paint.fillText('行走／振翅      攻擊／施法',x,y+79);});`,ctx);
 fs.writeFileSync(path.join(__dirname,'sprite-src/mercenary/summons-v1/overview.png'),overview.toBuffer('image/png'));ctx.paint=g;
 // 地圖不再繪狀態；底部保留圖示、名稱與盾值，隱藏技能冷卻。
 ctx.assert=assert;vm.runInContext(`
 SIM_MODE=false;createPlayer('隔離','knight',CLASSES.knight.base);player.loc={type:'zone',id:'island'};
 const m=player.mercenary={cls:'spirit',lv:30,exp:0,hp:100,mp:100,active:true,dead:false,equip:{},skills:['shield','might','',''],cds:{shield:gameNow+10000}};
 const r=mercState(m);r.buffs.shield={until:gameNow+5000,power:42};r.buffs.might={until:gameNow+4000,power:3};
 scene={mons:[]};const labels=[],g=paint,old=g.fillText;g.fillText=(s,...args)=>{labels.push(String(s));old.call(g,s,...args);};sceneDrawMercEffects(g,0,0,m,{rx:1,ry:1});g.fillText=old;
 assert(!labels.some(s=>/盾42|力量祝福|秒/.test(s)));const hud=mercHudHtml();assert(hud.includes('盾42'));assert(hud.includes('力量祝福'));assert(hud.includes('merc-hud-icon'));assert(!hud.includes('秒'));
 `,ctx);
 console.log('PASS：9圖集／72格透明與唯一性、正式行走／施法／左向繪圖、傭兵地圖隱藏秒數。');
})().catch(e=>{console.error(e);process.exit(1);});
