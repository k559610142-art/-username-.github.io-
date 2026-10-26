// 真實遊戲串接回歸：記憶體localStorage與假RPC，禁止正式連線。
const fs=require('fs'),path=require('path'),vm=require('vm'),assert=require('assert/strict'),crypto=require('crypto');
const root=path.resolve(__dirname,'..'),memory=new Map();let failStorage=false;
const ctx=vm.createContext({console,assert,crypto,TextEncoder,TextDecoder,btoa,atob,setTimeout,clearTimeout,setInterval:()=>0,clearInterval(){},Image:function(){},
 localStorage:{getItem:k=>memory.get(k)||null,setItem:(k,v)=>{if(failStorage)throw Error('disk full');memory.set(k,v);},removeItem:k=>memory.delete(k)},
 document:{addEventListener(){},getElementById:()=>null,querySelector:()=>null,documentElement:{style:{}}},window:{addEventListener(){},innerWidth:1280,innerHeight:720},navigator:{},fetch(){throw Error('不准正式連線');},failDisk:b=>{failStorage=b;}});
for(const[,f]of fs.readFileSync(path.join(root,'index.html'),'utf8').matchAll(/<script src="(data\/[^"?]+\.js)\?v=/g))if(!['data/main.js','data/pwa.js'].includes(f))vm.runInContext(fs.readFileSync(path.join(root,f),'utf8'),ctx,{filename:f});

async function main(){await vm.runInContext(String.raw`(async()=>{
 SIM_MODE=true;createPlayer('畫面砲擊','gunner',CLASSES.gunner.base);SIM_MODE=false;
 player.loc={type:'zone',id:'island',floor:1};player.hunting=true;player.equip.weapon={id:'pirateCannon',uid:999};
 refreshUI=()=>{};updateHuntLive=()=>{};showToast=()=>{};sfx=()=>{};lootNotice=()=>{};addLog=()=>{};worldVfxSkill=()=>{};
 let cv={getBoundingClientRect:()=>({left:-32,top:0,width:352,height:320})};
 $=id=>id==='scene-canvas'?cv:null;window.innerWidth=320;window.innerHeight=320;document.hidden=false;huntVisible=()=>true;inHuntZone=()=>true;
 gameNow=1000;const mon=makeMonster('goblin');mon.hp=1000;
 const visible={x:3,y:3,rx:3,ry:3,inst:mon},idle={x:5,y:5,rx:5,ry:5,mid:'goblin'},outside={x:20,y:3,rx:20,ry:3,mid:'goblin'},clipped={x:0,y:3,rx:0,ry:3,mid:'goblin'};
 scene={key:sceneKey(),mons:[visible,idle,outside,clipped],cam:{x:0,y:0},zoom:1,tickAt:1000,effects:[]};hunt={state:'fight',mobs:[mon],mon,warned:{}};
 assert.equal(sceneScreenTargets().length,2,'canvas裁切之外及畫面外怪不選');
 scene.worldOpen=true;assert.equal(sceneScreenTargets(),null);scene.worldOpen=false;
 document.hidden=true;assert.equal(sceneScreenTargets(),null);document.hidden=false;
 const oldscene=scene,oldhunt=hunt;lootMode='active';lootCanPlay=()=>true;cloudCanCall=()=>true;lootCloudFresh=()=>true;
 let rpcCount=0,keys=[];marketRpc=async(fn,args)=>{assert.equal(fn,'loot_spawn_screen');rpcCount++;keys.push(args.p_key);if(rpcCount===1)throw Error('Failed to fetch');return args.p_mids.map(mid=>({ticket:crypto.randomUUID(),monster:makeMonster(mid)}));};
 assert(await lootScreenMobs([idle],hunt,scene));assert.equal(rpcCount,2);assert.equal(keys[0],keys[1]);assert(idle.inst.lootTicket);assert.equal(hunt.mobs.length,2);
 let hits=[];physicalAttack=(st,mul,opt,m)=>{hits.push(m);m.hp-=10;return true};useSkillCost=()=>{};reapMobs=()=>{};
 const k={id:'res_pirateCannon',name:'砲擊',mp:0,mult:1.8,aoe:true,screen:true};
 await screenCannonStrike(k,{});assert.equal(hits.length,2);assert(hits.includes(mon)&&hits.includes(idle.inst));assert(!outside.inst&&!clipped.inst);
 hits=[];doStrike({id:'other',name:'其他範圍',mp:0,mult:1,aoe:true},{});assert.equal(hits.length,2,'其他範圍維持參戰目標');
 let resume;const extra={x:6,y:6,rx:6,ry:6,mid:'goblin'};scene.mons.push(extra);marketRpc=()=>new Promise(r=>resume=r);
 const pending=lootScreenMobs([extra],hunt,scene);await Promise.resolve();scene={...oldscene};resume([{ticket:crypto.randomUUID(),monster:makeMonster('goblin')}]);assert.equal(await pending,false);assert(!extra.inst,'換場景不綁定');scene=oldscene;
 marketRpc=async()=>{throw Error('loot_spawn_screen missing schema cache')};assert.equal(await lootScreenMobs([extra],hunt,scene),false);assert(!extra.inst,'缺SQL不能本機造怪');assert.equal(hunt.lootWait,false);
 hits=[];SIM_MODE=true;doStrike(k,{});assert.equal(hits.length,2,'無畫面沿用參戰範圍');SIM_MODE=false;
 })()`,ctx);console.log('PASS screen client: clipped viewport / outside / map overlay / background / batch binding / same-key network retry / actual hit targets / scene switch / missing SQL / offline fallback');}
main().catch(e=>{console.error(e);process.exit(1)});
