// 後端掉寶減量：隔離 PGlite 載入全部正式 SQL＋loot-batch.sql，驗證批次結算、重送、釋放不重寫、清理（第 104 節）。不連正式主機。
const fs = require('fs'), path = require('path'), assert = require('assert/strict');
const { PGlite } = require(process.env.LOOT_TEST_RUNTIME || path.join(require('os').tmpdir(), 'dark-loot-test-runtime/node_modules/@electric-sql/pglite'));
(async () => {
    const db = new PGlite();
    await db.exec(`create role anon;create role authenticated;create role service_role;
    create schema auth;create table auth.users(id uuid primary key,email text);create table auth.sessions(id uuid primary key,user_id uuid);
    create function auth.uid() returns uuid language sql as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;
    create function auth.jwt() returns jsonb language sql as $$select jsonb_build_object('email','batch@invalid')$$;
    create function auth.role() returns text language sql as $$select 'authenticated'::text$$;
    grant usage on schema public,auth to anon,authenticated;`);
    for (const file of ['supabase.sql', 'anticheat.sql', 'server-loot-install.sql', 'vault-v2.sql', 'stat-cap.sql', 'market-v2.sql', 'save-log-throttle.sql', 'loot-batch.sql', 'loot-screen.sql', 'loot-screen.sql']) {
        let sql = fs.readFileSync(path.join(__dirname, file), 'utf8');
        if (file === 'supabase.sql') sql = sql.replace(/create extension if not exists pgcrypto;/i, '');
        try { await db.exec(sql); } catch (e) { console.error('Failed migration:', file, e.message); throw e; }
    }

 const uid='77777777-7777-4777-8777-777777777777',ch='123|knight';
 await db.query('insert into auth.users values($1,$2)',[uid,'screen@invalid']);
 await db.exec(`select set_config('request.jwt.claim.sub','${uid}',false)`);
 const p={created:123,cls:'knight',name:'screen',lv:50,exp:0,gold:300,inv:[],storage:[],equip:{},stats:{str:18,dex:12,con:16,int:8,wis:9,cha:12},loc:{type:'zone',id:'island'},quests:{ch:0,active:false},towerMax:10};
 const sig=(await db.query('select public.dragon_save_sig($1,0,$2) as s',[uid,p])).rows[0].s;
 await db.query('insert into public.dragon_saves(user_id,slot,client_t,name,cls,lv,data) values($1,0,1,$2,$3,50,$4)',[uid,p.name,p.cls,{schema:12,player:p,sig,lootProtocol:1,lootCursor:0}]);
 await db.exec('update public.dragon_loot_config set enabled=true');
 const run=async(key,mids)=>{await db.exec('set role authenticated');try{return(await db.query('select public.loot_spawn_screen(0,$1,$2,$3) as v',[ch,key,mids])).rows[0].v}finally{await db.exec('reset role')}};
 const key=crypto.randomUUID(),mids=['goblin','goblin','goblin'];
 const rows=await run(key,mids);assert.equal(rows.length,3);assert.equal(new Set(rows.map(r=>r.ticket)).size,3);
 assert.deepEqual(await run(key,mids),rows);
 await assert.rejects(()=>run(key,['goblin']),/request changed/);
 await assert.rejects(()=>run(crypto.randomUUID(),mids),/cooldown/);
 await db.exec("update public.dragon_loot_screen_batches set created_at=clock_timestamp()-interval '15 seconds'");
 await assert.rejects(()=>run(crypto.randomUUID(),['bad']),/invalid monster/);
 await assert.rejects(()=>run(crypto.randomUUID(),Array(31).fill('goblin')),/invalid screen batch/);
 await db.exec("update public.dragon_loot_jobs set created_at=clock_timestamp()-interval '1 second';set role authenticated");
 const award=(await db.query('select public.loot_finish_batch($1,$2) as v',[crypto.randomUUID(),rows.map(r=>r.ticket)])).rows[0].v;
 assert.equal(award.cursor,1);await db.exec('reset role');assert.deepEqual(await run(key,mids),rows,'settled replay must not reroll');
 await db.exec('set role authenticated');await assert.rejects(()=>db.query('select * from public.dragon_loot_screen_batches'),/permission denied/);await db.exec('reset role');
 await db.close();console.log('PASS screen SQL: repeat install / batch3 / stable replay after settle / cooldown / invalid IDs / size limit / receipt / RLS');
})().catch(e=>{console.error(e);process.exit(1)});
