// 線上人數 tools/online-count.sql 的 PGlite 隔離測試（第 318 節）；只在記憶體，不連正式 Supabase。
const fs = require('fs'), path = require('path'), assert = require('assert/strict');
const { PGlite } = require(process.env.LOOT_TEST_RUNTIME || path.join(require('os').tmpdir(), 'dark-loot-test-runtime/node_modules/@electric-sql/pglite'));
(async () => {
    const db = new PGlite();
    await db.exec(`create role anon;create role authenticated;create role service_role;
    create schema auth;create table auth.users(id uuid primary key,email text);create table auth.sessions(id uuid primary key,user_id uuid);
    create function auth.uid() returns uuid language sql as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;
    create function auth.jwt() returns jsonb language sql as $$select jsonb_build_object('email','t@invalid','session_id',coalesce(current_setting('test.sid',true),''))$$;
    create function auth.role() returns text language sql as $$select 'authenticated'::text$$;
    grant usage on schema public,auth to anon,authenticated;`);
    await db.exec(fs.readFileSync(path.join(__dirname, 'supabase.sql'), 'utf8').replace(/create extension if not exists pgcrypto;/i, ''));
    for (const f of ['single-login.sql', 'online-count.sql', 'online-count.sql']) await db.exec(fs.readFileSync(path.join(__dirname, f), 'utf8'));
    const ids = ['a', 'b', 'c', 'd', 'e'].map(c => c.repeat(8) + '-aaaa-4aaa-8aaa-aaaaaaaaaaaa');
    for (const u of ids) await db.query('insert into auth.users values($1,$2)', [u, u.slice(0, 4) + '@invalid']);
    const as = async (u, sid) => { await db.exec(`select set_config('request.jwt.claim.sub','${u}',false);select set_config('test.sid','${sid}',false)`); return (await db.query('select public.online_ping_count() v')).rows[0].v; };
    let r = await as(ids[0], 's1'); assert.deepEqual(r, { ok: true, n: 1 });
    await as(ids[1], 's2'); await as(ids[2], 's3'); r = await as(ids[0], 's1'); assert.equal(r.n, 3);
    await db.query(`update public.dragon_online set beat_at = now() - interval '2 minutes' where user_id = $1`, [ids[2]]);
    r = await as(ids[0], 's1'); assert.equal(r.n, 2, '90 秒沒心跳不算');
    r = await as(ids[1], 'other'); assert.equal(r.ok, false, '同帳號別台使用中：照舊回 ok=false（被擠下線）');
    r = await as(ids[0], 's1'); assert.equal(r.n, 2, '同一個帳號只算一個');
    await db.close();
    console.log('PASS online-count.sql：可重跑、心跳後回傳 90 秒內在線帳號數、逾時不算、同帳號只算一個、單一登入擠下線照舊。');
})().catch(e => { console.error(e); process.exit(1); });
