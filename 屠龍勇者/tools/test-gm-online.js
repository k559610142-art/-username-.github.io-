// 管理頁在線人數：隔離 PGlite 載入 supabase.sql＋gm-online.sql，不連正式主機（第 271 節）。
const fs = require('fs'), path = require('path'), assert = require('assert/strict');
const { PGlite } = require(process.env.LOOT_TEST_RUNTIME || path.join(require('os').tmpdir(), 'dark-loot-test-runtime/node_modules/@electric-sql/pglite'));
(async () => {
    const db = new PGlite();
    await db.exec(`create role anon;create role authenticated;create role service_role;
    create schema auth;create table auth.users(id uuid primary key,email text);create table auth.sessions(id uuid primary key,user_id uuid);
    create function auth.uid() returns uuid language sql as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;
    create function auth.jwt() returns jsonb language sql as $$select jsonb_build_object('email','gm@invalid','session_id','aaaa1111-0000-4000-8000-000000000001')$$;
    create function auth.role() returns text language sql as $$select 'authenticated'::text$$;
    grant usage on schema public,auth to anon,authenticated;`);
    for (const file of ['supabase.sql', 'gm-online.sql', 'gm-online.sql']) {
        let sql = fs.readFileSync(path.join(__dirname, file), 'utf8');
        if (file === 'supabase.sql') sql = sql.replace(/create extension if not exists pgcrypto;/i, '');
        await db.exec(sql);
    }
    const gm = '11111111-1111-4111-8111-111111111111', a = '22222222-2222-4222-8222-222222222222', b = '33333333-3333-4333-8333-333333333333';
    await db.query('insert into auth.users values($1,$4),($2,$5),($3,$6)', [gm, a, b, 'gm@invalid', 'a@invalid', 'b@invalid']);
    await db.query('insert into public.dragon_admins(user_id) values($1)', [gm]);
    await db.query(`insert into public.dragon_online(user_id,session_id,device,beat_at) values($1,'s1','pc',now()-interval '30 seconds'),($2,'s2','phone',now()-interval '5 minutes')`, [a, b]);
    const asUser = async uid => {
        await db.exec(`select set_config('request.jwt.claim.sub','${uid}',false);set role authenticated`);
        try { return (await db.query('select user_id from public.gm_online()')).rows.map(r => r.user_id); } finally { await db.exec('reset role'); }
    };
    assert.deepEqual(await asUser(gm), [a], '管理者只看到 90 秒內有心跳的帳號');
    assert.deepEqual(await asUser(a), [], '一般玩家拿不到資料');
    await db.exec('set role anon');
    await assert.rejects(db.query('select * from public.gm_online()'), /permission denied/, '未登入不能呼叫');
    await db.exec('reset role');
    console.log('test-gm-online OK');
})().catch(e => { console.error(e); process.exit(1); });
