// 真實PostgreSQL隔離驗證：載入既有SQL與天賦增量，絕不連正式服務。
const fs=require('fs'),path=require('path'),assert=require('assert/strict'),vm=require('vm');
const {PGlite}=require(process.env.LOOT_TEST_RUNTIME||path.join(require('os').tmpdir(),'dark-loot-test-runtime/node_modules/@electric-sql/pglite'));
const cfg=JSON.parse(fs.readFileSync(path.join(__dirname,'talent-system-catalog.json'),'utf8'));
(async()=>{
 const db=new PGlite();
 await db.exec(`create role anon;create role authenticated;create role service_role;create schema auth;create table auth.users(id uuid primary key,email text);create table auth.sessions(id uuid primary key,user_id uuid);
 create function auth.uid() returns uuid language sql as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;
 create function auth.jwt() returns jsonb language sql as $$select jsonb_build_object('email','talent@invalid','role','authenticated')$$;
 create function auth.role() returns text language sql as $$select 'authenticated'::text$$;grant usage on schema public,auth to anon,authenticated;`);
 for(const file of ['supabase.sql','anticheat.sql','server-loot-install.sql','vault-v2.sql','stat-cap.sql','market-v2.sql','save-log-throttle.sql','loot-batch.sql','loot-screen.sql','treasure-maps.sql','mercenary-rune-drops.sql','unidentified-maps.sql','talent-system.sql']){
  let sql=fs.readFileSync(path.join(__dirname,file),'utf8');if(file==='supabase.sql')sql=sql.replace(/create extension if not exists pgcrypto;/i,'');
  try{await db.exec(sql);}catch(e){throw Error(file+': '+e.message);}
 }
 const uid='88888888-8888-4888-8888-888888888888',ch='123|knight';
 await db.query('insert into auth.users values($1,$2)',[uid,'talent@invalid']);
 await db.exec(`select set_config('request.jwt.claim.sub','${uid}',false);update public.dragon_loot_config set enabled=true`);
 const inv=[{uid:1,id:'talentStone',n:100,ench:0},...Object.keys(cfg.jewels).map((id,i)=>({uid:i+2,id,n:1,ench:0}))];
 const p={created:123,cls:'knight',name:'talent',lv:99,exp:0,gold:0,inv,storage:[],equip:{},stats:{str:18,dex:12,con:16,int:8,wis:9,cha:12},loc:{type:'zone',id:'island'},quests:{ch:0,active:false},towerMax:100,talent:{v:null,nodes:[],jewels:{},trials:[]}};
 const sig=(await db.query('select public.dragon_save_sig($1,0,$2) s',[uid,p])).rows[0].s;
 await db.query('insert into public.dragon_saves(user_id,slot,client_t,name,cls,lv,data) values($1,0,1,$2,$3,99,$4)',[uid,p.name,p.cls,{schema:21,player:p,sig,lootProtocol:1,lootCursor:0}]);
 const rpc=async(name,args)=>{await db.exec('set role authenticated');try{return(await db.query(`select public.${name}(${args.map((_,i)=>'$'+(i+1)).join(',')}) v`,args)).rows[0].v;}finally{await db.exec('reset role');}};
 const row=async()=> (await db.query('select data,sig_ok from public.dragon_saves where user_id=$1 and slot=0',[uid])).rows[0];
 const action=(type,node,item=null,key=crypto.randomUUID())=>rpc('talent_action',[0,ch,key,type,node,item]);
 assert.equal((await rpc('talent_status',[0,ch])).version,cfg.version);
 await assert.rejects(()=>action('allocate','battle-core'),/prerequisite/);
 const key=crypto.randomUUID(),first=await action('allocate','battle-gate',null,key);
 assert.equal(first.seq,1);assert.deepEqual(await action('allocate','battle-gate',null,key),first);
 await assert.rejects(()=>action('allocate','arcane-gate',null,key),/operation changed/);
 assert.equal((await row()).sig_ok,true);
 await action('allocate','battle-r1-0');await assert.rejects(()=>action('refund','battle-gate'),/不足|斷線|互斥/);
 let r=await action('refund','battle-r1-0');assert.equal(r.consumeN,1);assert.equal((await row()).data.player.inv.find(x=>x.id==='talentStone').n,99);
 // 依正式圖尋路，每一步都呼叫真實RPC。
 const allocated=new Set((await row()).data.player.talent.nodes.concat('origin'));
 async function learn(target){
  const queue=['origin'],prev=new Map([['origin',null]]),adj=new Map();cfg.edges.forEach(([a,b])=>{if(!adj.has(a))adj.set(a,[]);if(!adj.has(b))adj.set(b,[]);adj.get(a).push(b);adj.get(b).push(a);});
  while(queue.length){const id=queue.shift();if(id===target)break;(adj.get(id)||[]).forEach(n=>{if(cfg.nodes[n].kind!=='core'&&!prev.has(n)){prev.set(n,id);queue.push(n);}});}
  assert(prev.has(target));const route=[];for(let id=target;id;id=prev.get(id))route.unshift(id);
  for(const id of route)if(!allocated.has(id)){await action('allocate',id);allocated.add(id);}
 }
 const socket='battle-socket-0';await learn(socket);
 const normal=inv.find(x=>cfg.jewels[x.id]&&cfg.jewels[x.id].type==='normal');
 r=await action('insert',socket,normal.uid);assert.equal(r.removeUid,normal.uid);
 let current=await row();assert(!current.data.player.inv.some(x=>x.uid===normal.uid));assert.equal(current.data.player.talent.jewels[socket].uid,normal.uid);
 await assert.rejects(()=>action('insert',socket,normal.uid),/unavailable/);
 const before=current.data;await assert.rejects(()=>db.query('update public.dragon_saves set data=$1 where user_id=$2',[{...before,player:{...before.player,inv:before.player.inv.concat(normal)}},uid]),/duplicate item/);
 r=await action('remove',socket);assert.equal(r.addItem.uid,normal.uid);assert.equal((await row()).data.player.inv.filter(x=>x.uid===normal.uid).length,1);
 const clusterSocket='battle-socket-3';await learn(clusterSocket);
 const cluster=inv.find(x=>cfg.jewels[x.id]&&cfg.jewels[x.id].type==='cluster'&&cfg.jewels[x.id].size==='large');
 await action('insert',clusterSocket,cluster.uid);
 const branch=cfg.jewels[cluster.id].branch.map(n=>JSON.parse(JSON.stringify(n).replaceAll('@',clusterSocket)));
 await assert.rejects(()=>action('allocate',branch[7].id),/prerequisite/);
 for(const n of branch)await action('allocate',n.id);
 await assert.rejects(()=>action('remove',clusterSocket),/分支/);
 for(const n of branch.slice().reverse())await action('refund',n.id);
 await action('remove',clusterSocket);
 current=await row();assert.equal(current.sig_ok,true);assert.equal(current.data.player.inv.find(x=>x.id==='talentStone').n,91);
 const old=JSON.parse(JSON.stringify(before));await assert.rejects(()=>db.query('update public.dragon_saves set data=$1 where user_id=$2',[old,uid]),/seq conflict|state conflict/);
 async function fillBudget(limit){
  while(true){const ids=new Set((await row()).data.player.talent.nodes);let next;
   for(const [a,b] of cfg.edges){if((a==='origin'||ids.has(a))&&!ids.has(b)&&b!=='origin'&&!cfg.nodes[b].exclusiveGroup){next=b;break;}if((b==='origin'||ids.has(b))&&!ids.has(a)&&a!=='origin'&&!cfg.nodes[a].exclusiveGroup){next=a;break;}}
   assert(next);if(ids.size===limit){await assert.rejects(()=>action('allocate',next),/天賦點不足/);break;}await action('allocate',next);
  }
 }
 await fillBudget(90);
 // 首次指定階級首領才給憑證；重跑增量不清紀錄。
 const catalog=(await db.query('select data from public.dragon_loot_catalog where id=1')).rows[0].data;
 const context={monster:{boss:true,mapBoss:true,lv:99},map:{t:1}};
 const trial=async x=>(await db.query('select public.talent_trial_loot($1,$2,$3,$4) v',[catalog,x,uid,ch])).rows[0].v;
 let proof=await trial(context);assert(proof.some(x=>x.id==='talentTrial_1'));assert.deepEqual(await trial(context),[]);
 assert.deepEqual(await trial({monster:{boss:true,lv:99},map:{t:2}}),[]);
 await db.exec(fs.readFileSync(path.join(__dirname,'talent-system.sql'),'utf8'));assert.deepEqual(await trial(context),[]);
 assert.equal((await rpc('talent_status',[0,ch])).trials.length,1);
 // 真實批次收據會原子加入試煉，回應重送不再擲骰／加點。
 const ticket=crypto.randomUUID(),batch=crypto.randomUUID(),x={...context,map:{t:2},zone:{drops:[]},player:{cls:'knight',quests:{active:false},inv:[]},rules:catalog.version};
 await db.query("insert into public.dragon_loot_jobs(id,user_id,slot,char_id,event_key,created_at,context) values($1::uuid,$2,0,$3,($1::uuid)::text,clock_timestamp()-interval '2 seconds',$4)",[ticket,uid,ch,x]);
 const receipt=await rpc('loot_finish_batch',[batch,[ticket]]);assert(receipt.items.some(it=>it.id==='talentTrial_2'));assert.deepEqual(await rpc('loot_finish_batch',[batch,[ticket]]),receipt);
 assert.equal((await rpc('talent_status',[0,ch])).trials.length,2);assert.equal((await rpc('loot_finish_batch',[crypto.randomUUID(),[ticket]])).empty,true);
 await db.exec('set role authenticated');await assert.rejects(()=>db.query('select * from public.dragon_talent_state'),/permission denied/);await assert.rejects(()=>db.query('select public.talent_trial_loot($1,$2,$3,$4)',[catalog,context,uid,ch]),/permission denied/);await db.exec('reset role');
 // 保留未鑑定地圖函式與既有傭兵掉落增量。
 const fn=(await db.query("select pg_get_functiondef('public.loot_roll(jsonb,jsonb)'::regprocedure) s")).rows[0].s;assert(fn.includes('loot_merc_rune')&&fn.includes('talent_loot_items'));
 const map=(await db.query('select public.loot_map($1,1) v',[catalog])).rows[0].v;assert.equal(map.unidentified,true);
 for(const tier of [3,4,5,7,9,11,13,15])await trial({...context,map:{t:tier}});
 assert.equal((await rpc('talent_status',[0,ch])).trials.length,10);await fillBudget(100);
 await db.close();console.log('PASS：真實SQL安裝／重跑、伺服器扣點退石、UID鑲嵌拆回、星團前置／退點拆珠、重送冪等、簽章／舊序號拒絕、試煉去重／權限，既有符石與未鑑定地圖保留。');
})().catch(e=>{console.error(e.message,e.where||'',e.stack||'');process.exit(1);});
