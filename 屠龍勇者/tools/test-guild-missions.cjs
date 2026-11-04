'use strict';
const fs=require('fs'),vm=require('vm'),assert=require('assert/strict');
const ctx=vm.createContext({console,assert,Uint8Array,Map,Set});
for(const name of ['guild-core','guild-world','guild-map-data','guild-missions','guild-mission-core'])vm.runInContext(fs.readFileSync('data/'+name+'.js','utf8'),ctx);
const artifacts={};ctx.publish=(id,proof)=>{artifacts[id]=JSON.parse(JSON.stringify(proof));};
ctx.golden=artifacts;
vm.runInContext(`
function solve(id,cls='mage'){
 const team=GuildCore.INITIAL[cls],seed=123456,s=GuildMissionCore.create(team,seed,cls,id),events=[];
 const cmd=(type,arg=null)=>{assert(GuildMissionCore.command(s,type,arg),id+' '+type+' '+arg+' at '+s.map+' tick '+s.tick);events.push([s.tick,type,arg]);};
 const tick=n=>{for(let i=0;i<n;i++){GuildMissionCore.tick(s);assert.equal(s.phase,'active',id+' '+s.reason+' tick '+s.tick);}};
 function quiet(){let n=0;while(s.enemies.some(e=>e.map===s.map&&e.active&&e.hp>0)){tick(1);assert(++n<700,id+'無法擊退敵人');}}
 function walk(p,settle=80){let target;for(let r=0;r<=8&&!target;r++)for(let dy=-r;dy<=r&&!target;dy++)for(let dx=-r;dx<=r;dx++){const x=Math.floor(p[0]/4)+dx,y=Math.floor(p[1]/4)+dy;if(s.world.canStand(x,y)){target=[x,y];break;}}assert(target,id+'目標不可站');cmd('move',target);let n=0;while(s.route.length){tick(1);assert(++n<3000);}if(settle)tick(settle);if(GuildMissions.defs[id].kind!=='defense')quiet();}
 function go(map){let guard=0;while(s.map!==map){const todo=[[s.map,[]]],seen=new Set([s.map]);let found;while(todo.length&&!found){const [m,path]=todo.shift();for(const [i,g]of GUILD_MAP_DEFS[m].gates.entries())if(GuildMissions.defs[id].maps.includes(g.to)&&!seen.has(g.to)){const next=[...path,i];if(g.to===map){found=next;break;}seen.add(g.to);todo.push([g.to,next]);}}assert(found,id+'地圖接線 '+s.map+'→'+map);const gate=GUILD_MAP_DEFS[s.map].gates[found[0]];walk(gate.at,120);cmd('gate',found[0]);assert(++guard<12);}}
 function visit(a){go(a.map);walk([a.x*4+2,a.y*4+2]);}
 function act(a,type='interact'){visit(a);cmd(type,a.id);tick(30);}
 function boss(){for(const a of s.enemies.filter(e=>e.boss&&e.hp>0)){visit(a);quiet();}}
 assert(!GuildMissionCore.command(s,'deliver',null),id+'不能提前交付');
 if(id==='lostMiners'){go('mine');walk([760,600]);cmd('clue');go('mineInner');for(const a of s.miners){visit(a);quiet();cmd('rescue',a.id);tick(30);}boss();go('harbor');walk([408,304],120);}
 else if(id==='poisonHerbs'){for(const map of ['port','smuggler']){go(map);for(const o of s.objects.filter(o=>o.map===map&&o.type==='sac'))act(o);for(const o of s.objects.filter(o=>o.map===map&&o.type==='herb'))act(o);}boss();go(s.delivery.map);walk(s.delivery.p);}
 else if(id==='tradeRoad'){for(const o of s.objects.filter(o=>o.type==='camp'))act(o);for(const a of s.miners){visit(a);cmd('rescue',a.id);tick(30);}boss();go(s.delivery.map);walk(s.delivery.p,120);}
 else if(id==='ancientSeal'){for(const o of s.objects.filter(o=>o.type==='seal')){act(o);while(!o.done)tick(1);quiet();}boss();go(s.delivery.map);walk(s.delivery.p);}
 else if(id==='dragonOutpost'){for(const o of s.objects.filter(o=>o.type==='camp'))act(o);go('dragon');for(const o of s.objects.filter(o=>o.type==='egg')){walk([750,800]);act(o);}boss();go(s.delivery.map);walk(s.delivery.p);}
 else if(id==='lostBanner'){go('fortress');for(const o of s.objects.filter(o=>o.type==='alarm').sort((a,b)=>GuildMissionCore.distance(s.party[0],a)-GuildMissionCore.distance(s.party[0],b))){const path=s.world.path([s.party[0].x,s.party[0].y],[o.x,o.y]),p=path.find(p=>Math.hypot(p[0]-o.x,p[1]-o.y)*4<=44);assert(p);walk([p[0]*4+2,p[1]*4+2],0);cmd('interact',o.id);tick(30);assert(o.done&&!o.triggered,'可從警報範圍外解除');}for(const o of s.objects.filter(o=>o.type==='flag'))act(o);go(s.delivery.map);walk(s.delivery.p);}
 else if(GuildMissions.defs[id].kind==='defense'){for(const o of s.objects.filter(o=>o.type==='altar'))act(o);const core=s.objects.find(o=>o.id==='core');act(core);while(!GuildMissions.canDeliver(s,{distance:GuildMissionCore.distance})){tick(1);assert(s.tick<8900,id+'十分鐘目標未完成');}walk(s.delivery.p,0);}
 else if(id==='refugeeEvacuation'){for(const o of s.objects.filter(o=>o.type==='group'))act(o);go('harbor');walk(s.delivery.p,150);}
 else if(id==='crystalCart'){let guard=0;while(s.cartIndex<3){const cart=s.miners[0],stop=s.cartStops[s.cartIndex];visit(cart);walk(stop[1],15);assert(++guard<20);}go('forge');while(s.cartIndex<4){visit(s.miners[0]);walk(s.cartStops[s.cartIndex][1],15);assert(++guard<30);}walk(s.delivery.p,30);}
 cmd('deliver');assert.equal(s.phase,'success',id+'完成');
 const replay=GuildMissionCore.replay(team,seed,cls,events,s.tick,id);
 const signature=x=>JSON.stringify({phase:x.phase,tick:x.tick,seed:x.seed,party:x.party.map(a=>a.hp),miners:x.miners.map(a=>[a.id,a.hp,a.rescued,a.evacuated]),enemies:x.enemies.map(a=>[a.id,a.hp]),objects:x.objects.map(a=>[a.id,a.hp,a.done,a.progress]),supplies:x.supplies,defendAt:x.defendAt,ritualTicks:x.ritualTicks});
 assert.equal(signature(replay),signature(s),id+'可信重播一致');
 if(cls==='mage')publish(id,{version:s.version,missionId:id,ticketId:'33333333-3333-4333-8333-333333333333',events,ticks:s.tick,team,seed,cls,perfect:id==='lostMiners'?s.miners.every(m=>m.evacuated)&&!s.downed.length:GuildMissions.rating(s)});
 console.log('PASS '+id+' '+cls+' '+s.tick+' ticks / '+events.length+' commands / '+s.budget.used+' path nodes');
 return s;
}
for(const id of Object.keys(GuildMissions.defs))solve(id);
for(const cls of ['knight','paladin','angel'])for(const id of Object.keys(GuildMissions.defs))solve(id,cls);
for(const id of ['lastCampfire','northGate','sealKeeper','dragonTide','ancientSeal']){
 const p=golden[id],index=p.events.findIndex(e=>e[1]==='interact'&&(e[2]==='core'||e[2]==='seal0')),e=p.events[index],s=GuildMissionCore.replay(p.team,p.seed,p.cls,p.events.slice(0,index+1),e[0]+30,id),origin=GuildMissionCore.create(p.team,p.seed,p.cls,id).party[0];
 assert(GuildMissionCore.command(s,'stance','retreat'));assert(GuildMissionCore.command(s,'move',[origin.x,origin.y]));for(let i=0;i<9000&&s.phase==='active';i++)GuildMissionCore.tick(s);assert.equal(s.phase,'failed',id+'撤走守軍會失敗');assert(s.objects.some(o=>o.hp===0),id+'保護目標受到真實攻擊而摧毀');
}
for(const id of Object.keys(GuildMissions.defs)){const s=GuildMissionCore.create(GuildCore.INITIAL.mage,123,'mage',id);for(let i=0;i<s.limit&&s.phase==='active';i++)GuildMissionCore.tick(s);assert.equal(s.phase,'failed',id+'不能空等取得勝利');}
const rescue=GuildMissionCore.create(GuildCore.INITIAL.mage,123,'mage','poisonHerbs');rescue.party[0].hp=0;for(let i=0;i<80;i++)GuildMissionCore.tick(rescue);assert(rescue.party[0].hp>0,'隊長倒下後由夥伴實際靠近引導救援');
const poisonRescue=GuildMissionCore.create(GuildCore.INITIAL.mage,123,'mage','poisonHerbs'),sac=poisonRescue.objects.find(o=>o.id==='sac0');poisonRescue.enemies=[];for(const a of poisonRescue.party){a.x=sac.x;a.y=sac.y;}poisonRescue.party[0].hp=0;poisonRescue.party[1].hp-=20;for(let i=0;i<40;i++)GuildMissionCore.tick(poisonRescue);assert(poisonRescue.party[0].hp>0,'補師治療與不打斷施法的毒霧，不應重置夥伴救援引導');
const refugees=GuildMissionCore.create(GuildCore.INITIAL.mage,123,'mage','refugeeEvacuation');refugees.miners.slice(0,6).forEach(m=>m.hp=0);GuildMissionCore.tick(refugees);assert.equal(refugees.phase,'failed','不足10位可生還村民立即失敗');
const cart=GuildMissionCore.create(GuildCore.INITIAL.mage,123,'mage','crystalCart');cart.miners[0].hp=0;GuildMissionCore.tick(cart);assert.equal(cart.phase,'failed','車毀立即失敗');
for(const [id,p]of Object.entries(golden)){assert.throws(()=>GuildMissionCore.replay(p.team,p.seed,p.cls,[[0,'deliver',null]],0,id),id+'偽造提前交付拒絕');assert.throws(()=>GuildMissionCore.replay(p.team,p.seed,p.cls,p.events,p.ticks,'unknown'));}
console.log('PASS：48場正向流程與可信重播、5種防衛／儀式撤軍實敗、12任務超時、隊長救援、村民不足／車毀及偽造交付拒絕');
`,ctx,{timeout:120000});
fs.mkdirSync('tools/guild-missions',{recursive:true});fs.writeFileSync('tools/guild-missions/test-proofs.json',JSON.stringify(artifacts)+'\n');
