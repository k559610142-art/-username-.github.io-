// Supabase Edge Function: guild-missions。以JWT取自己的票，再用服務角色原子結算。
import {GuildMissionCore,GuildMissions} from './simulation.mjs';
const headers={'Access-Control-Allow-Origin':'*','Access-Control-Allow-Headers':'authorization,x-client-info,apikey,content-type','Content-Type':'application/json'};
const reply=(body:unknown,status=200)=>new Response(JSON.stringify(body),{status,headers});
async function rpc(url:string,key:string,bearer:string,name:string,body:unknown){const r=await fetch(url+'/rest/v1/rpc/'+name,{method:'POST',headers:{apikey:key,Authorization:'Bearer '+bearer,'Content-Type':'application/json'},body:JSON.stringify(body)});if(!r.ok)throw Error('guild_verification_unavailable');return await r.json();}
Deno.serve(async request=>{
 if(request.method==='OPTIONS')return new Response(null,{headers});if(request.method!=='POST')return reply({error:'method_not_allowed'},405);
 try{const url=Deno.env.get('SUPABASE_URL'),anon=Deno.env.get('SUPABASE_ANON_KEY'),service=Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');if(!url||!anon||!service)return reply({error:'verification_not_configured'},503);
  const token=request.headers.get('Authorization')||'';if(!token.startsWith('Bearer '))return reply({error:'sign_in_required'},401);
  const reader=request.body?.getReader();if(!reader)return reply({error:'invalid_report'},400);const chunks:Uint8Array[]=[];let size=0;while(true){const {done,value}=await reader.read();if(done)break;size+=value.length;if(size>524288){await reader.cancel();return reply({error:'report_too_large'},413);}chunks.push(value);}const data=new Uint8Array(size);let offset=0;for(const chunk of chunks){data.set(chunk,offset);offset+=chunk.length;}const input=JSON.parse(new TextDecoder().decode(data));
  if(!input||!Object.hasOwn(GuildMissions.defs,input.missionId)||typeof input.ticketId!=='string'||!/^[a-f0-9-]{36}$/.test(input.ticketId)||!Array.isArray(input.events)||!Number.isInteger(input.ticks))return reply({error:'invalid_report'},400);
  const bound=await rpc(url,anon,token.slice(7),'guild_mission_ticket',{p_ticket:input.ticketId});if(bound.ticket.missionId!==input.missionId||bound.ticket.missionVersion!==input.version)return reply({error:'mission_ticket_mismatch'},403);
  const report={version:input.version,ticketId:input.ticketId,events:input.events,ticks:input.ticks,missionId:input.missionId};const hash=Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(JSON.stringify(report)))),v=>v.toString(16).padStart(2,'0')).join('');
  let s;try{s=GuildMissionCore.replay(bound.ticket.team,bound.ticket.seed,bound.cls,report.events,report.ticks,report.missionId);}catch{return reply({error:'invalid_simulation'},422);}
  const success=s.phase==='success',rating=success&&(input.missionId==='lostMiners'?s.miners.every((m:{hp:number,evacuated:boolean})=>m.hp>0&&m.evacuated)&&!s.downed.length:GuildMissions.rating(s));
  return reply(await rpc(url,service,service,'guild_mission_settle',{p_ticket:input.ticketId,p_hash:hash,p_sim_ms:s.tick*100,p_success:success,p_rating:rating,p_downed:s.party.filter((a:{id:string,hp:number})=>a.id!=='player'&&a.hp===0).map((a:{id:string})=>a.id)}));
 }catch{return reply({error:'verification_unavailable'},503);}
});
