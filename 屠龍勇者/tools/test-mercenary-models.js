// 素材完整性及真正sceneDrawMerc Canvas繪圖，不連網／不寫玩家存檔。
const fs=require('fs'),path=require('path'),vm=require('vm'),assert=require('assert/strict'),crypto=require('crypto');
const runtime=path.join(process.env.USERPROFILE,'.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules');
function dep(id){try{return require(id);}catch{return require(path.join(runtime,id));}}
const sharp=dep('sharp'),{createCanvas,loadImage}=dep('@napi-rs/canvas');
const root=path.resolve(__dirname,'..'),src=path.join(__dirname,'sprite-src/mercenary/companions-v1');
const prefix=fs.readFileSync(path.join(__dirname,'test-mercenary.js'),'utf8').split('ctx.assert = assert;')[0];
const ctx=new Function('require','__dirname',prefix+'\nreturn ctx;')(require,__dirname);ctx.assert=assert;
async function main(){
 const models=vm.runInContext('MERC_MODELS',ctx),hashes=new Set(),images={};let frames=0;
 assert.equal(Object.keys(models).length,6);
 for(const[id,sp]of Object.entries(models)){
  const base=path.join(root,'images/sprites/mercenary/companions-v1',id),manifest=JSON.parse(fs.readFileSync(path.join(base,'manifest.json'),'utf8'));
  assert.equal(manifest.id,id);assert.deepEqual(manifest.foot,Array.from(sp.foot));assert.equal(manifest.drawH,sp.drawH);
  assert.equal((await sharp(path.join(root,sp.art)).metadata()).hasAlpha,true);
  for(const action of ['walk','attack','cast','hit']){
   const spec=sp[action],file=path.join(root,spec.src),meta=await sharp(file).metadata();images[spec.src]=await loadImage(file);
   const n=spec.frames.down;assert.equal(meta.width,n*384);assert.equal(meta.height,960);assert(meta.hasAlpha);
   for(const[di,dir]of ['down','right','up'].entries())for(let f=0;f<n;f++){
    const raw=await sharp(file).extract({left:f*384,top:di*320,width:384,height:320}).ensureAlpha().raw().toBuffer();
    const frame=await sharp(path.join(root,'tools/sprite-src/mercenary/companions-v1',id,'build/frames',action+'-'+dir+'-'+String(f+1).padStart(2,'0')+'.png')).ensureAlpha().raw().toBuffer();assert(raw.equals(frame),'圖集與分鏡不同');
    const digest=crypto.createHash('sha256').update(raw).digest('hex');assert(!hashes.has(digest),'重複分鏡');hashes.add(digest);
    let clear=0,visible=0;for(let i=3;i<raw.length;i+=4){if(raw[i]===0)clear++;if(raw[i]>32)visible++;}assert(clear>384*320*.35);assert(visible>1500);frames++;
   }
  }
 }
 assert.equal(frames,216);
 ctx.modelImages=images;vm.runInContext(`SIM_MODE=false;saveGame=()=>{};refreshUI=()=>{};showToast=()=>{};sfx=()=>{};drawOccPatch=()=>false;spriteImage=src=>modelImages[src]||null;createPlayer('模型隔離','knight',CLASSES.knight.base);`,ctx);
 const canvas=createCanvas(960,640),g=canvas.getContext('2d');ctx.paint=g;let draws=0;
 for(const[id,sp]of Object.entries(models))for(const[di,dir]of ['down','right','up','left'].entries())for(const[ai,action]of ['walk','attack','cast','hit'].entries()){
  ctx.modelId=id;ctx.modelDir=dir;ctx.modelAction=action;
  g.save();g.translate(di*240+120,ai*160+125);g.scale(1.8,1.8);
  vm.runInContext(`{
   const m=player.mercenary={cls:modelId,lv:1,exp:0,hp:1,mp:100,dead:false,active:true,equip:{},skills:['','','',''],cds:{}};m.hp=mercStats(m).hp;
   scene={pl:{x:0,y:0,rx:0,ry:0},mercenary:{owner:m,rx:0,ry:0,dir:modelDir,path:[]},mons:[]};gameNow=1000;
   const statsBefore=JSON.stringify(mercStats(m));mercPlayAnim(modelAction);sceneDrawMerc(paint,TILE/2,TILE/2);assert.equal(JSON.stringify(mercStats(m)),statsBefore);
   assert(mercCardHtml().includes(MERC_MODELS[modelId].art));assert(renderMercenary().includes(MERC_MODELS[modelId].art));
  }`,ctx);g.restore();draws++;
  if(di===3&&ai===3){fs.writeFileSync(path.join(src,'game-render-'+id+'.png'),canvas.toBuffer('image/png'));g.clearRect(0,0,960,640);}
 }
 assert.equal(draws,96);
 vm.runInContext(`{
  const m=player.mercenary;gameNow=2000;mercPlayAnim('cast');mercPlayAnim('attack');assert.equal(mercState(m).anim.action,'cast');mercPlayAnim('hit');assert.equal(mercState(m).anim.action,'cast');gameNow=3000;mercPlayAnim('hit');assert.equal(mercState(m).anim.action,'hit');
  const saved=JSON.stringify(player);SIM_MODE=true;mercPlayAnim('attack');assert.equal(mercState(m).anim.action,'hit');assert.equal(JSON.stringify(player),saved);SIM_MODE=false;
  m.dead=true;m.active=false;assert(renderMercenary().includes('merc-model-dead'));
 }`,ctx);
 console.log('PASS：6模型216格RGBA／唯一性／圖集逐byte對應，4方向×4動作真實Canvas共96組、地圖大小／立繪／死亡灰階、施法優先及SIM隔離；schema19與能力不變。');
}
main().catch(e=>{console.error(e);process.exit(1);});
