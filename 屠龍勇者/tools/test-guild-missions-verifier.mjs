import fs from 'node:fs';
import assert from 'node:assert/strict';
const proofs=JSON.parse(fs.readFileSync('tools/guild-missions/test-proofs.json','utf8')),tickets=new Map();
Object.values(proofs).forEach((p,i)=>{p.ticketId='33333333-3333-4333-8333-'+String(i+1).padStart(12,'0');tickets.set(p.ticketId,p);});
let handler,settled;
globalThis.Deno={env:{get:k=>({SUPABASE_URL:'https://isolated.invalid',SUPABASE_ANON_KEY:'fixture-anon',SUPABASE_SERVICE_ROLE_KEY:'fixture-service'})[k]},serve:fn=>{handler=fn;}};
globalThis.fetch=async(url,opts)=>{const p=JSON.parse(opts.body);if(url.endsWith('/guild_mission_ticket')){if(opts.headers.Authorization!=='Bearer fixture-user')return new Response('{}',{status:403});const t=tickets.get(p.p_ticket);return Response.json({ticket:{missionId:t.missionId,missionVersion:t.version,team:t.team,seed:t.seed},cls:t.cls,status:'active'});}if(url.endsWith('/guild_mission_settle')){assert.equal(opts.headers.Authorization,'Bearer fixture-service');settled=p;return Response.json({receipt:{status:p.p_success?'accepted':'rejected'},reward:{rep:p.p_success?100:0}});}throw Error('unexpected network');};
await import(process.argv.includes('--deploy')?'./guild-missions/deploy.ts':'./guild-missions/index.ts');
const request=(body,token='fixture-user')=>new Request('https://isolated.invalid/verify',{method:'POST',headers:{Authorization:'Bearer '+token},body:JSON.stringify(body)});
for(const [id,p]of Object.entries(proofs)){const result=await handler(request(p));assert.equal(result.status,200,id);assert.equal(settled.p_success,true,id);assert.equal(settled.p_rating,p.perfect,id+'可選目標由重播判定');assert.equal(settled.p_sim_ms,p.ticks*100);}
const p=proofs.lastCampfire;
assert.equal((await handler(request({...p,events:[],ticks:6000,success:true,reward:99999}))).status,200);assert.equal(settled.p_success,false,'跳過十分鐘防衛不能領獎');
assert.equal((await handler(request({...p,missionId:'northGate'}))).status,403,'不得拿其他任務冒用同票');
assert.equal((await handler(request({...p,events:[[0,'deliver',null]],ticks:0}))).status,422);
assert.equal((await handler(request(p,'wrong-user'))).status,503);
assert.equal((await handler(request({...p,ticks:9001}))).status,422);
assert.equal((await handler(request({pad:'x'.repeat(530000)}))).status,413);
console.log('PASS：12任務實際Edge handler逐場重播成功／可選目標；跨任務冒票、偽勝利、跳過防衛、越界、換帳與巨型輸入拒絕');
