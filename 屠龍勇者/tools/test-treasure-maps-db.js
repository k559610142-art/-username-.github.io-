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
 const skillRun=async(skill)=>{await db.exec('set role authenticated');try{return(await db.query('select public.loot_spawn_screen(0,$1,$2,$3,$4) as v',[ch,crypto.randomUUID(),['goblin'],skill])).rows[0].v}finally{await db.exec('reset role')}};
 for(const skill of ['blizzard','thunderStorm','meteor','res_starfallGun']){assert.equal((await skillRun(skill)).length,1);await assert.rejects(()=>skillRun(skill),/cooldown/)}
 await assert.rejects(()=>skillRun('invalid'),/invalid screen skill/);
 await db.exec("update public.dragon_loot_screen_batches set created_at=clock_timestamp()-interval '5 seconds' where skill='thunderStorm'");
 assert.equal((await skillRun('thunderStorm')).length,1,'雷電4秒CD不受砲擊14秒影響');

 await db.exec(fs.readFileSync(path.join(__dirname,'treasure-maps.sql'),'utf8'));await db.exec(fs.readFileSync(path.join(__dirname,'treasure-maps.sql'),'utf8'));
 const catalog=(await db.query('select data from dragon_loot_catalog where id=1')).rows[0].data;
 const rolls=(await db.query(`select public.loot_map($1::jsonb,8) v from generate_series(1,10000)`,[JSON.stringify(catalog)])).rows.map(x=>x.v);
 const treasure=rolls.filter(x=>x.q==='legend');assert(treasure.length>50&&treasure.length<160);assert(treasure.every(x=>x.unidentified===true&&!x.mm));
 const low=(await db.query(`select public.loot_map($1::jsonb,7) v from generate_series(1,200)`,[JSON.stringify(catalog)])).rows;assert(low.every(x=>x.v.q!=='legend'));
 const base={monster:{lv:80,boss:false,elite:true,mapBoss:true,drops:[]},zone:{id:'island',drops:[]},player:{cls:'knight'},map:{t:8,treasure:true,mods:[]}};
 const rewards=(await db.query(`select public.loot_roll($1::jsonb,$2::jsonb) v from generate_series(1,10000)`,[JSON.stringify(catalog),JSON.stringify(base)])).rows.map(x=>x.v);
 const got=rewards.filter(x=>x.length);assert(got.length>750&&got.length<1050);assert(got.every(xs=>xs.length===1&&catalog.items[xs[0].id].cat==='currency'&&xs[0].n===2));
 base.monster.boss=true;base.map.mods=Object.keys(catalog.mapMods).slice(0,6);
 const bosses=(await db.query(`select public.loot_roll($1::jsonb,$2::jsonb) v from generate_series(1,200)`,[JSON.stringify(catalog),JSON.stringify(base)])).rows.map(x=>x.v);
 assert(bosses.every(xs=>xs.length===1&&[2,4,6].includes(xs[0].n)&&catalog.items[xs[0].id].cat==='currency'));
 for(const name of ['loot_spawn','loot_spawn_screen']){const defs=(await db.query("select pg_get_functiondef(oid) src from pg_proc where proname=$1",[name])).rows;assert(defs.some(x=>x.src.includes("'treasure'")));}
 console.log('PASS 財寶SQL：重跑、10000次掉圖約1%、T7不掉傳奇、通貨約9%／數量2、首領100%上限／2～6、只掉通貨、普通與全畫面憑證帶旗標');
 // 第228節：打怪地圖一律未鑑定（可重跑）
 for(let i=0;i<2;i++)await db.exec(fs.readFileSync(path.join(__dirname,'unidentified-maps.sql'),'utf8'));
 const unid=(await db.query(`select public.loot_map($1::jsonb,8) v from generate_series(1,10000)`,[JSON.stringify(catalog)])).rows.map(x=>x.v);
 assert(unid.every(x=>x.unidentified===true&&x.id==='map8'&&x.n===1&&!x.mm&&!x.nm&&(x.q===undefined||x.q==='legend')));
 const unidLegend=unid.filter(x=>x.q==='legend').length;assert(unidLegend>50&&unidLegend<160);
 const unidLow=(await db.query(`select public.loot_map($1::jsonb,3) v from generate_series(1,300)`,[JSON.stringify(catalog)])).rows.map(x=>x.v);
 assert(unidLow.every(x=>x.unidentified===true&&x.q===undefined&&!x.mm));
 const clearRewards=(await db.query(`select public.loot_roll($1::jsonb,$2::jsonb) v from generate_series(1,50)`,[JSON.stringify(catalog),JSON.stringify({...base,monster:{...base.monster,boss:true},map:{t:5,treasure:false,mods:[]}})])).rows.flatMap(x=>x.v).filter(x=>catalog.items[x.id]&&catalog.items[x.id].cat==='map');
 assert(clearRewards.length>=50&&clearRewards.every(x=>x.unidentified===true));
 console.log('PASS 未鑑定地圖SQL：重跑、全部未鑑定無詞綴、T8財寶約1%、T3不出傳奇、通關獎勵也未鑑定');
 await db.close();console.log('PASS screen SQL: repeat install / batch3 / stable replay after settle / cooldown / invalid IDs / size limit / receipt / RLS');
})().catch(e=>{console.error(e);process.exit(1)});
