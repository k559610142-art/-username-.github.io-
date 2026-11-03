// 村莊告示牌：隔離 PGlite 載入 supabase.sql＋notice-board.sql，不連正式主機（第 279 節）。
const fs = require('fs'), path = require('path'), assert = require('assert/strict');
const { PGlite } = require(process.env.LOOT_TEST_RUNTIME || path.join(require('os').tmpdir(), 'dark-loot-test-runtime/node_modules/@electric-sql/pglite'));
(async () => {
    const db = new PGlite();
    await db.exec(`create role anon;create role authenticated;create role service_role;
    create schema auth;create table auth.users(id uuid primary key,email text);create table auth.sessions(id uuid primary key,user_id uuid);
    create function auth.uid() returns uuid language sql as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;
    create function auth.jwt() returns jsonb language sql as $$select jsonb_build_object('email','nb@invalid')$$;
    create function auth.role() returns text language sql as $$select 'authenticated'::text$$;
    grant usage on schema public,auth to anon,authenticated;`);
    for (const file of ['supabase.sql', 'notice-board.sql', 'notice-board.sql']) {
        let sql = fs.readFileSync(path.join(__dirname, file), 'utf8');
        if (file === 'supabase.sql') sql = sql.replace(/create extension if not exists pgcrypto;/i, '');
        await db.exec(sql);
    }
    const admin = '00000001-0000-4000-8000-000000000000', user = '00000002-0000-4000-8000-000000000000';
    await db.query(`insert into auth.users values($1,'a@invalid'),($2,'b@invalid')`, [admin, user]);
    await db.query('insert into public.dragon_admins(user_id) values($1)', [admin]);
    const as = async (role, uid, sql, args = []) => {
        await db.exec(`select set_config('request.jwt.claim.sub','${uid || ''}',false);set role ${role}`);
        try { return (await db.query(sql, args)).rows[0]; } finally { await db.exec('reset role'); }
    };
    assert.equal((await as('anon', null, 'select public.notice_get() r')).r.sponsors, '', '沒登入也讀得到，預設空白');
    await assert.rejects(as('authenticated', user, `select public.gm_notice_set('x','y')`), /not admin/, '一般玩家不能改');
    await assert.rejects(as('anon', null, `select public.gm_notice_set('x','y')`), /permission denied/, '沒登入不能改');
    const r = (await as('authenticated', admin, 'select public.gm_notice_set($1,$2) r', ['王小明\n陳大華', '本月伺服器 1,200 元'])).r;
    assert.equal(r.sponsors, '王小明\n陳大華'); assert.equal(r.funds, '本月伺服器 1,200 元');
    assert.equal((await as('authenticated', user, 'select public.notice_get() r')).r.funds, '本月伺服器 1,200 元', '玩家讀到新內容');
    await assert.rejects(as('anon', null, 'select * from public.dragon_notice'), /permission denied/, '不能直接讀表');
    console.log('test-notice-board OK');
})().catch(e => { console.error(e); process.exit(1); });
