// 同 IP 在線帳號上限：隔離 PGlite 載入 supabase.sql＋flag-trust.sql＋ip-limit.sql，不連正式主機（第 272 節）。
const fs = require('fs'), path = require('path'), assert = require('assert/strict');
const { PGlite } = require(process.env.LOOT_TEST_RUNTIME || path.join(require('os').tmpdir(), 'dark-loot-test-runtime/node_modules/@electric-sql/pglite'));
(async () => {
    const db = new PGlite();
    await db.exec(`create role anon;create role authenticated;create role service_role;
    create schema auth;create table auth.users(id uuid primary key,email text);create table auth.sessions(id uuid primary key,user_id uuid);
    create function auth.uid() returns uuid language sql as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;
    create function auth.jwt() returns jsonb language sql as $$select jsonb_build_object('email','ip@invalid','session_id',nullif(current_setting('test.sid',true),''))$$;
    create function auth.role() returns text language sql as $$select 'authenticated'::text$$;
    grant usage on schema public,auth to anon,authenticated;`);
    for (const file of ['supabase.sql', 'flag-trust.sql', 'ip-limit.sql', 'ip-limit.sql']) {
        let sql = fs.readFileSync(path.join(__dirname, file), 'utf8');
        if (file === 'supabase.sql') sql = sql.replace(/create extension if not exists pgcrypto;/i, '');
        await db.exec(sql);
    }
    const ids = [...Array(7)].map((_, i) => `0000000${i + 1}-0000-4000-8000-000000000000`);
    for (const [i, id] of ids.entries()) await db.query('insert into auth.users values($1,$2)', [id, `u${i}@invalid`]);
    const as = async (uid, ip, sql) => {
        await db.exec(`select set_config('request.jwt.claim.sub','${uid}',false);select set_config('test.sid','sess-${uid}',false);
            select set_config('request.headers','${JSON.stringify(ip ? { 'x-forwarded-for': ip + ', 10.0.0.1' } : {})}',false);set role authenticated`);
        try { return (await db.query(sql)).rows[0]; } finally { await db.exec('reset role'); }
    };
    const claim = (uid, ip, force = false) => as(uid, ip, `select public.online_claim('pc', ${force}) r`).then(x => x.r);
    const ping = (uid, ip) => as(uid, ip, 'select public.online_ping() r').then(x => x.r);
    for (let i = 0; i < 3; i++) assert.equal((await claim(ids[i], '1.2.3.4')).ok, true, `第 ${i + 1} 個帳號可以登入`);
    const no = await claim(ids[3], '1.2.3.4');
    assert.equal(no.ok, false); assert.equal(no.reason, 'ip'); assert.equal(no.n, 3);
    assert.equal((await claim(ids[3], '1.2.3.4', true)).reason, 'ip', '強制登入也擋');
    assert.equal((await claim(ids[3], '5.6.7.8')).ok, true, '不同 IP 不受影響');
    assert.equal((await claim(ids[0], '1.2.3.4')).ok, true, '已在線的帳號重新登入不算超過');
    // 第 4 個帳號換回滿的 IP：心跳不踢人，只更新 IP
    assert.equal(await ping(ids[3], '1.2.3.4'), true);
    // 沒登入紀錄的帳號直接心跳：名額滿了不寫入
    assert.equal(await ping(ids[4], '1.2.3.4'), true);
    assert.equal(Number((await db.query('select count(*) c from public.dragon_online where user_id=$1', [ids[4]])).rows[0].c), 0, '名額滿時心跳不新增在線紀錄');
    // 管理者、信任名單不受限制
    await db.query('insert into public.dragon_admins(user_id) values($1)', [ids[5]]);
    await db.query(`insert into public.dragon_trusted(user_id,email,reason) values($1,'u6@invalid','test')`, [ids[6]]);
    assert.equal((await claim(ids[5], '1.2.3.4')).ok, true, '管理者不受限');
    assert.equal((await claim(ids[6], '1.2.3.4')).ok, true, '信任名單不受限');
    // 有人逾時（90 秒沒心跳）就空出名額（第 4 個帳號換網路進來，這時同 IP 有 0、2、3 號；1 號逾時後仍滿，3 號也逾時才空出）
    assert.equal((await claim(ids[4], '1.2.3.4')).ok, false, '換網路進來的帳號也佔名額');
    await db.query(`update public.dragon_online set beat_at=now()-interval '2 minutes' where user_id=$1`, [ids[3]]);
    await db.query(`update public.dragon_online set beat_at=now()-interval '2 minutes' where user_id=$1`, [ids[1]]);
    assert.equal((await claim(ids[4], '1.2.3.4')).ok, true, '逾時的帳號不算名額');
    // 沒有 IP（例如直接連資料庫）不擋
    assert.equal((await claim(ids[1], null)).ok, true);
    // 玩家不能直接呼叫內部函式
    await assert.rejects(as(ids[0], '1.2.3.4', `select public.dragon_ip_count('1.2.3.4')`), /permission denied/);
    console.log('test-ip-limit OK');
})().catch(e => { console.error(e); process.exit(1); });
