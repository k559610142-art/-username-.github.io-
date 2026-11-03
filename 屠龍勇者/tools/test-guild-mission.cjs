'use strict';
const fs=require('fs'),vm=require('vm'),assert=require('assert/strict');
const ctx=vm.createContext({Uint8Array,Map,Set,Math,JSON,console,assert});
for(const f of ['guild-core','guild-world','guild-map-data','guild-mission-core'])vm.runInContext(fs.readFileSync('data/'+f+'.js','utf8'),ctx);
vm.runInContext(`
const team=['sentinel','warrior','healer'],seed=123456,run=GuildMissionCore.create(team,seed,'mage'),events=[];
function cmd(type,arg=null){assert(GuildMissionCore.command(run,type,arg),'command '+type+' '+JSON.stringify(arg)+' at '+run.map+' '+run.tick);events.push([run.tick,type,arg]);}
function wait(n){for(let i=0;i<n;i++){GuildMissionCore.tick(run);assert.equal(run.phase,'active',run.reason);}}
function walk(p){const w=run.world;let target;for(let r=0;r<=8&&!target;r++)for(let y=-r;y<=r&&!target;y++)for(let x=-r;x<=r;x++){const a=Math.floor(p[0]/4)+x,b=Math.floor(p[1]/4)+y;if(w.canStand(a,b)){target=[a,b];break;}}assert(target);cmd('move',target);let guard=0;while(run.route.length){wait(1);assert(++guard<3000);}wait(100);}
function gate(index){walk(GUILD_MAP_DEFS[run.map].gates[index].at);cmd('gate',index);}
assert(!GuildMissionCore.command(run,'deliver'));assert(!GuildMissionCore.command(run,'rescue','miner0'));assert(!GuildMissionCore.command(run,'gate',1),'禁止偏離任務船路');
gate(0);gate(1);walk([760,600]);cmd('clue');gate(2);
for(const miner of run.miners){walk([miner.x*4+2,miner.y*4+2]);wait(200);cmd('rescue',miner.id);wait(30);assert(miner.rescued);}
assert.equal(run.enemies.find(e=>e.boss).hp,0,'巨怪實際戰鬥擊倒');
gate(0);gate(0);gate(0);walk([408,304]);cmd('deliver');assert.equal(run.phase,'success');assert.equal(run.miners.filter(m=>m.evacuated).length,3);
const again=GuildMissionCore.replay(team,seed,'mage',events,run.tick);
function result(s){return JSON.stringify({tick:s.tick,phase:s.phase,seed:s.seed,party:s.party.map(a=>[a.id,a.hp,a.x,a.y]),miners:s.miners.map(a=>[a.id,a.hp,a.rescued,a.evacuated]),enemies:s.enemies.map(a=>[a.id,a.hp]),downed:s.downed});}
assert.equal(result(again),result(run),'可信端逐指令重播結果完全相同');
for(const [cls,ids]of Object.entries(GuildCore.INITIAL)){const other=GuildMissionCore.replay(ids,seed,cls,events,run.tick);assert.equal(other.phase,'success',cls+'初始隊伍可完成普通任務');}
const tampered=JSON.parse(JSON.stringify(events));tampered[0]=[0,'deliver',null];assert.throws(()=>GuildMissionCore.replay(team,seed,'mage',tampered,run.tick));
assert.throws(()=>GuildMissionCore.replay(team,seed,'mage',events,7201));assert.throws(()=>GuildMissionCore.create(['sentinel','sentinel','healer'],seed,'mage'));
const timed=GuildMissionCore.create(team,seed,'mage');for(let i=0;i<7200;i++)GuildMissionCore.tick(timed);assert.equal(timed.phase,'failed');
const rescued=GuildMissionCore.create(team,seed,'mage');rescued.party[1].hp=0;assert(GuildMissionCore.command(rescued,'rescue','sentinel'));GuildMissionCore.tick(rescued);GuildMissionCore.command(rescued,'stop',null);for(let i=0;i<35;i++)GuildMissionCore.tick(rescued);assert.equal(rescued.party[1].hp,0,'取消中斷救援');assert(GuildMissionCore.command(rescued,'rescue','sentinel'));for(let i=0;i<30;i++)GuildMissionCore.tick(rescued);assert(rescued.party[1].hp>0,'三秒救援恢復戰力');
console.log('PASS：正式四景往返、採礦紀錄、三礦工三秒救援／護送、巨怪實戰、返公會成功；'+run.tick+'個100ms步長／'+events.length+'指令，篡改／越界／超時／重播一致');
globalThis.proof={version:GuildMissionCore.VERSION,ticketId:'33333333-3333-4333-8333-333333333333',events,ticks:run.tick};
`,ctx,{timeout:120000});
fs.writeFileSync('tools/guild-lost-miners/test-proof.json',JSON.stringify(ctx.proof)+'\n');
