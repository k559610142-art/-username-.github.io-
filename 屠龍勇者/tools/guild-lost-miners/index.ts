// Supabase Edge Function：guild-lost-miners。金鑰只讀伺服器環境變數。
import { GuildMissionCore } from './simulation.mjs';
const headers={'Access-Control-Allow-Origin':'*','Access-Control-Allow-Headers':'authorization,x-client-info,apikey,content-type','Content-Type':'application/json'};
const reply=(body:unknown,status=200)=>new Response(JSON.stringify(body),{status,headers});
async function rpc(url:string,key:string,bearer:string,name:string,body:unknown){const r=await fetch(url+'/rest/v1/rpc/'+name,{method:'POST',headers:{apikey:key,Authorization:'Bearer '+bearer,'Content-Type':'application/json'},body:JSON.stringify(body)});if(!r.ok)throw Error('guild_verification_unavailable');return await r.json();}
Deno.serve(async request=>{
 if(request.method==='OPTIONS')return new Response(null,{headers});
 if(request.method!=='POST')return reply({error:'method_not_allowed'},405);
 try{
  const url=Deno.env.get('SUPABASE_URL'),anon=Deno.env.get('SUPABASE_ANON_KEY'),service=Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  if(!url||!anon||!service)return reply({error:'verification_not_configured'},503);
  const authorization=request.headers.get('Authorization')||'';if(!authorization.startsWith('Bearer '))return reply({error:'sign_in_required'},401);
  // 有界串流，拒絕巨型輸入，避免在JSON解析之前耗盡記憶體。
  const reader=request.body?.getReader();if(!reader)return reply({error:'invalid_report'},400);let size=0;const chunks:Uint8Array[]=[];
  while(true){const {done,value}=await reader.read();if(done)break;size+=value.length;if(size>524288){await reader.cancel();return reply({error:'report_too_large'},413);}chunks.push(value);}
  const bytes=new Uint8Array(size);let at=0;for(const c of chunks){bytes.set(c,at);at+=c.length;}const input=JSON.parse(new TextDecoder().decode(bytes));
  if(!input||input.version!==GuildMissionCore.VERSION||typeof input.ticketId!=='string'||!/^[a-f0-9-]{36}$/.test(input.ticketId)||!Array.isArray(input.events)||!Number.isInteger(input.ticks))return reply({error:'invalid_report'},400);
  const bound=await rpc(url,anon,authorization.slice(7),'guild_lost_ticket',{p_ticket:input.ticketId});
  const report={version:input.version,ticketId:input.ticketId,events:input.events,ticks:input.ticks};
  const hash=Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(JSON.stringify(report)))),v=>v.toString(16).padStart(2,'0')).join('');
  let success=false,rating=false,downed:string[]=[];
  try{const s=GuildMissionCore.replay(bound.ticket.team,bound.ticket.seed,bound.cls,report.events,report.ticks);success=s.phase==='success';rating=success&&s.miners.every((m:{hp:number,evacuated:boolean})=>m.hp>0&&m.evacuated)&&!s.downed.length;downed=s.downed;}catch{return reply({error:'invalid_simulation'},422);}
  const result=await rpc(url,service,service,'guild_lost_settle',{p_ticket:input.ticketId,p_hash:hash,p_sim_ms:input.ticks*100,p_success:success,p_rating:rating,p_downed:downed});return reply(result);
 }catch{return reply({error:'verification_unavailable'},503);}
});
