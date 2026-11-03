// 真實index腳本＋隔離DOM／圖塊解碼；不讀寫玩家存檔、不呼叫任何正式服務。
const fs=require('fs'),path=require('path'),vm=require('vm'),assert=require('assert/strict');
const prefix=fs.readFileSync(path.join(__dirname,'test-mercenary.js'),'utf8').split('ctx.assert = assert;')[0];
const ctx=new Function('require','__dirname',prefix+'\nreturn ctx;')(require,__dirname);ctx.assert=assert;ctx.AbortController=AbortController;
const events=new Map(),stats={loads:0,closed:0,mode:'ok',deferred:[]};let rootElement;
const graphics=new Proxy({measureText:text=>({width:String(text).length*6})},{get:(object,key)=>object[key]||(()=>{})});
function dataKey(s){return s.replace(/-([a-z])/g,(_,c)=>c.toUpperCase());}
class Element {
 constructor(tag='div'){this.tagName=tag.toUpperCase();this.children=[];this.style={};this.dataset={};this.attributes={};this.listeners={};this.clientWidth=1000;this.clientHeight=620;this.width=300;this.height=150;this.disabled=false;this.hidden=false;}
 setAttribute(k,v){this.attributes[k]=v;if(k.startsWith('data-'))this.dataset[dataKey(k.slice(5))]=v;}
 set innerHTML(value){this.children=[];for(const [,tag,attrs]of value.matchAll(/<([a-z]+)([^>]*)>/g)){const node=new Element(tag);for(const [,k,,v]of attrs.matchAll(/([\w-]+)(=(?:"([^"]*)"|'([^']*)'))?/g)){node.setAttribute(k,v||'');if(k==='hidden')node.hidden=true;}this.appendChild(node);}}
 appendChild(node){node.parent=this;this.children.push(node);return node;}
 replaceChildren(...nodes){this.children=[];for(const n of nodes)this.appendChild(n);}
 remove(){this.removed=true;if(this.parent)this.parent.children=this.parent.children.filter(n=>n!==this);}
 addEventListener(k,fn){this.listeners[k]=fn;}
 querySelectorAll(selector){const matches=n=>selector.split(',').some(s=>s.startsWith('[')?Object.hasOwn(n.dataset,dataKey(s.slice(6,-1)))||Object.hasOwn(n.attributes,s.slice(1,-1)):n.tagName.toLowerCase()===s);const all=[];function walk(n){for(const c of n.children){if(matches(c))all.push(c);walk(c)}}walk(this);return all;}
 querySelector(selector){return this.querySelectorAll(selector)[0]||null;}
 getContext(){return graphics;}
 getBoundingClientRect(){return {left:0,top:0,width:this.clientWidth,height:this.clientHeight};}
 focus(){ctx.document.activeElement=this;}
}
ctx.document.createElement=tag=>new Element(tag);ctx.document.removeEventListener=(k,fn)=>{if(events.get(k)===fn)events.delete(k)};ctx.document.addEventListener=(k,fn)=>events.set(k,fn);ctx.document.body=new Element('body');ctx.document.hidden=false;
ctx.requestAnimationFrame=()=>1;ctx.cancelAnimationFrame=()=>{};ctx.window.devicePixelRatio=1;
ctx.window.removeEventListener=()=>{};
ctx.document.querySelectorAll=()=>[];
ctx.fetch=async(url)=>{
 stats.loads++;if(stats.mode==='fail')throw Error('offline');
 if(stats.mode==='defer')await new Promise(resolve=>stats.deferred.push(resolve));else await new Promise(resolve=>setTimeout(resolve,1));
 return {ok:true,blob:async()=>({key:url.split('?')[0]})};
};
ctx.createImageBitmap=async blob=>{const meta=vm.runInContext('GUILD_MAP_TILES',ctx).get(blob.key);assert(meta,'僅載入本機圖塊');return {width:meta.texW,height:meta.texH,close(){stats.closed++}};};
ctx.network=stats;ctx.events=events;
vm.runInContext(`
SIM_MODE=true;refreshUI=()=>{};guildRefresh=()=>{};showToast=()=>{};cloudMarkDirty=()=>{};saveGame=()=>{};playerOwner='';playerOwnerEmail='';spriteImage=()=>({width:2048,height:2048});
`,ctx);
async function run(){
 await vm.runInContext(`(async()=>{
 function make(cls='mage'){createPlayer('探索驗收',cls,CLASSES[cls].base);player.loc={type:'town',id:'talking'};}
 make();assert(renderGuild().includes('guildDepart'));assert(!/onclick="[^\"]*player/.test(renderGuild()));
 assert.equal(await guildDepart('mine'),false,'只准從三個公會起點出發');
 guildDraft(player.guild).pop();assert.equal(await guildDepart('harbor'),false,'未保存編隊拒絕出發');guildResetSquad();
 player.guild.members[0].restUntil=Date.now()+10000;assert.equal(await guildDepart('harbor'),false,'療養禁止出發');player.guild.members[0].restUntil=0;
 player.guild.activeTicket={fake:true};assert.equal(await guildDepart('harbor'),false,'在途任務不可混入探索');player.guild.activeTicket=null;
 const before=JSON.stringify(player);assert(await guildDepart('harbor'));const first=guildTrip;assert.equal(first.squad.join('|'),player.guild.squad.join('|'));assert.equal(first.state.actors.map(a=>a.id).join('|'),'player|sentinel|warrior|healer');
 assert.equal(await guildDepart('port'),false,'不可重複出發');assert(!await guildMapTravel(999));assert.equal(first.metrics.maxLoads,3);assert(first.cache.bytes<=24*1024*1024);assert.equal(first.state.resources.size,guildMapVisible(first,first.state).length);
 guildMapDraw(first);assert(first.root.querySelector('[data-guild-party]').textContent.includes('鐵誓・洛恩'));
 let total=0;
 for(const [id,def]of Object.entries(GUILD_MAP_DEFS)){
  assert(await guildMapChange(first,id,'start'),id+'可載入');const s=first.state;assert.equal(Array.from(s.world.mask).filter(Boolean).length,def.walkCount);
  for(const p of def.sites){assert(guildMapMove(first,p[1],p[2]),id+'地標可達');let limit=0;while(s.route.length){guildMapStep(first);total++;assert(++limit<3000);for(const a of s.actors){assert(s.world.canStand(a.x,a.y));assert(Math.abs(a.x-a.px)<=1&&Math.abs(a.y-a.py)<=1,'伙伴不瞬移');}}}
  assert(await guildMapStream(first,s));guildMapDraw(first);assert(first.cache.bytes<=24*1024*1024);assert(first.cache.entries.size<=96);
  const old=[s.hero.x,s.hero.y];assert(!guildMapMove(first,-1,600));assert.equal(s.route.length,0);assert.equal([s.hero.x,s.hero.y].join(','),old.join(','));
 }
 assert.equal(JSON.stringify(player),before,'探索不能修改角色、裝備、金幣、個人傭兵、名冊、憑證或成果');
 guildMapExit();assert.equal(guildTrip,null);assert.equal(first.cache.bytes,0);assert(first.root.removed);assert(!events.has('keydown'));assert.equal(first.metrics.loaded,first.metrics.disposed);
 console.log('PASS：17圖正式引擎、正式三人編隊、角色外觀／四人'+total+'步、圖塊3併發／24MiB、退出全回收、角色資料逐字不變');
 make();const routeBefore=JSON.stringify(player);assert(await guildDepart('harbor'));let gates=0;for(const [id,def]of Object.entries(GUILD_MAP_DEFS))for(let i=0;i<def.gates.length;i++){assert(await guildMapChange(guildTrip,id,'start'));const gate=def.gates[i];assert(guildMapMove(guildTrip,gate.at[0],gate.at[1]));let steps=0;while(guildTrip.state.route.length){guildMapStep(guildTrip);assert(++steps<3000);}assert(await guildMapTravel(i),id+' → '+gate.to);assert.equal(guildTrip.state.def.id,gate.to);gates++;}guildMapExit();assert.equal(JSON.stringify(player),routeBefore);console.log('PASS：'+gates+'個正式場景出口逐一實走並切區，三大區雙向接線與角色資料保留');
 network.mode='fail';make();assert(!await guildDepart('harbor'));const failed=guildTrip;guildMapDraw(failed);assert(!failed.root.querySelector('[data-guild-retry]').hidden,'首次載入失敗可重試');network.mode='ok';assert(await guildMapChange(failed,'harbor','start'));
 const keyEvent={key:'w',preventDefault(){this.prevented=true},stopImmediatePropagation(){this.stopped=true},target:failed.canvas};failed.key(keyEvent);assert(keyEvent.prevented&&keyEvent.stopped,'探索鍵盤不得觸發底下遊戲');
 const same=JSON.stringify(player);make('knight');guildMapFrame(failed);assert.equal(guildTrip,null,'換角自動退場');assert(failed.root.removed);assert.equal(failed.cache.bytes,0);
 network.mode='defer';const late=guildDepart('port');await Promise.resolve();await Promise.resolve();const cancelled=guildTrip;guildMapExit();for(const resolve of network.deferred.splice(0))resolve();assert.equal(await late,false);assert.equal(guildTrip,null);assert.equal(cancelled.cache.bytes,0,'載圖途中離場不得復活舊場景或保留引用');
 network.mode='ok';assert(await guildDepart('foothills'));const owner=guildTrip;playerOwner='changed-owner';guildMapFrame(owner);assert.equal(guildTrip,null,'換帳自動退場');assert.equal(owner.cache.bytes,0);
 playerOwner='';
 for(const cls of Object.keys(CLASSES)){make(cls);const unchanged=JSON.stringify(player);assert(await guildDepart('harbor'));assert.equal(guildMapSprite(guildTrip.state.hero),playerSprite(),'沿用當前職業外觀');assert.equal(guildTrip.squad.join('|'),GuildCore.INITIAL[cls].join('|'));guildMapDraw(guildTrip);guildMapExit();assert.equal(JSON.stringify(player),unchanged);}
 make();player.guild.members.push({id:'scout',joinedAt:Date.now(),restUntil:0});player.guild.squad=['scout','sentinel','healer'];guildDrafts.delete(player.guild);assert(await guildDepart('port'));assert(guildMapSprite(guildTrip.state.actors[1]).walk.src.includes('guild/scout-v1'));guildMapDraw(guildTrip);guildMapExit();
 make();assert(await guildDepart('harbor'));const leaving=guildTrip;showScreen('title');assert.equal(guildTrip,null,'回標題即退場');assert.equal(leaving.cache.bytes,0);
 console.log('PASS：12職初始編隊、正式職業外觀與斥候模型、回標題退場、存檔結構與全部角色資料保留');
 console.log('PASS：載圖失敗與重試、背景遊戲鍵盤隔離、換角／換帳及載圖途中取消、無跨角色或晚到結果污染');
})()`,ctx,{timeout:120000});
}
run().catch(error=>{console.error(error);process.exitCode=1});

