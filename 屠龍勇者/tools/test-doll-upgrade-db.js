// tools/doll-upgrade.sql 的 PostgreSQL(PGlite)隔離測試；僅記憶體，絕不連正式 Supabase。
// 執行：node tools/test-doll-upgrade-db.js（PGlite 路徑同 test-doll-shop-db.js，可用 LOOT_TEST_RUNTIME 指定）
const fs = require('fs'), path = require('path'), assert = require('assert/strict');
const runtime = process.env.LOOT_TEST_RUNTIME || path.join(require('os').tmpdir(), 'dark-loot-test-runtime/node_modules/@electric-sql/pglite');
const { PGlite } = require(runtime);
const a = '11111111-1111-4111-8111-111111111111', b = '22222222-2222-4222-8222-222222222222';
const CH = '1794540000000|shura', CH2 = '1794540000001|mage';
async function main() {
    const db = new PGlite();
    await db.exec(`create role anon;create role authenticated;create schema auth;
 create table auth.users(id uuid primary key,email text);
 insert into auth.users values('${a}','a@test.com'),('${b}','b@test.com');
 create function auth.uid() returns uuid language sql as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;
 grant usage on schema public,auth to anon,authenticated;
 create table public.dragon_bans(user_id uuid primary key);
 create function public.dragon_is_banned() returns boolean language sql security definer as $$select exists(select 1 from public.dragon_bans where user_id=auth.uid())$$;
 grant execute on function public.dragon_is_banned() to authenticated;`);
    const sql = fs.readFileSync(path.join(__dirname, 'doll-upgrade.sql'), 'utf8');
    await db.exec(sql); await db.exec(sql);   // 可重跑
    const q = async (s, p = []) => (await db.query(s, p)).rows;
    let who = a;
    const as = uid => { who = uid; return db.exec(`reset role;set role authenticated;select set_config('request.jwt.claim.sub','${uid}',false)`); };
    const one = async (s, p) => (await q(s, p))[0].v;
    const startR = (ch = CH) => one('select public.inf_run_start($1) v', [ch]);
    const start = async (ch = CH) => (await startR(ch)).run;
    const istat = (ch = CH) => one('select public.inf_status($1) v', [ch]);
    const claim = (run, f, ch = CH) => one('select public.inf_claim($1,$2,$3) v', [ch, run, f]);
    const status = (ch = CH) => one('select public.doll_scroll_status($1) v', [ch]);
    const up = (from, to) => one('select public.doll_upgrade($1,$2,$3) v', [CH, from, to]);
    // 把這一趟的開始時間往前調（模擬已經在塔裡待了 sec 秒）
    const age = async (sec, ch = CH) => { const u = who; await db.exec('reset role'); await q('update public.dragon_inf_runs set started_at=now()-make_interval(secs=>$1) where user_id=$2 and char_id=$3', [sec, u, ch]); await as(u); };

    // 未登入、直接讀表、亂填角色
    await db.exec("reset role;select set_config('request.jwt.claim.sub','',false);set role anon");
    await assert.rejects(() => start(), /permission denied/);
    await as(a);
    await assert.rejects(() => q('select * from public.dragon_doll_scrolls'), /permission denied/);
    await assert.rejects(() => q('select * from public.dragon_inf_runs'), /permission denied/);
    await assert.rejects(() => one("select public.inf_run_start('x') v"), /bad char/);

    // 領卷軸：時間不夠、樓層不對、重複領、舊的 run
    let run = await start();
    assert.equal(await status(), 0);
    await assert.rejects(() => claim(run, 10), /too early/);
    await age(250); await assert.rejects(() => claim(run, 10), /too early/, '第 10 層首領最早 (10−1)×30×0.95＝256.5 秒');
    await age(260); assert.deepEqual(await claim(run, 10), { ok: true, scrolls: 1 });
    await assert.rejects(() => claim(run, 10), /already claimed/);
    await assert.rejects(() => claim(run, 15), /too early/);
    await assert.rejects(() => claim(run, 11), /bad floor/);
    await assert.rejects(() => claim(run, 5), /bad floor/, '第 5 層不給');
    await assert.rejects(() => claim(run, 2005), /bad floor/);
    await assert.rejects(() => claim(run, 30), /too early/, '30 層之後也可以領，只是時間還不夠');
    await age(430); assert.equal((await claim(run, 15)).scrolls, 2);
    await age(580); assert.equal((await claim(run, 20)).scrolls, 3);
    await assert.rejects(() => claim('00000000-0000-4000-8000-000000000000', 10), /bad run/);
    const run2 = await start();   // 倒下重來：新的一趟，舊 run 作廢
    await age(600); await assert.rejects(() => claim(run, 10), /bad run/);
    assert.equal((await claim(run2, 10)).scrolls, 4);
    assert.equal(await status(), 4);
    // 別的角色、別的帳號互不影響
    assert.equal(await status(CH2), 0);
    await as(b); assert.equal(await status(), 0); await assert.rejects(() => claim(run2, 15), /bad run/);
    await as(a);

    // 升級：路線檢查
    await assert.rejects(() => up('doll_skeleton-knight', 'doll_frost-dragon'), /bad upgrade/, 'T4 不能跳到 T2');
    await assert.rejects(() => up('doll_golden-dragon', 'doll_phoenix'), /bad upgrade/, 'T0 不能再升');
    await assert.rejects(() => up('doll_white-tiger', 'doll_skeleton-knight'), /bad upgrade/, '不能降級');
    await assert.rejects(() => up('redPotion', 'doll_lava-hound'), /unknown doll/);
    // 用掉 4 張（真的擲骰），每次扣 1
    let okN = 0;
    for (let i = 3; i >= 0; i--) { const r = await up('doll_skeleton-knight', 'doll_lava-hound'); assert.equal(r.scrolls, i); if (r.ok) okN++; }
    await assert.rejects(() => up('doll_skeleton-knight', 'doll_lava-hound'), /no scrolls/);
    // 成功率：給 4000 張連擲，應該在 5% 附近
    await db.exec('reset role'); await q('update public.dragon_doll_scrolls set scrolls=4000 where user_id=$1 and char_id=$2', [a, CH]); await as(a);
    for (let i = 0; i < 4000; i++) if ((await up('doll_white-tiger', 'doll_qilin')).ok) okN++;
    const rate = okN / 4004;
    assert(rate > 0.035 && rate < 0.065, '成功率約 5%，實際 ' + rate);
    // 每天最多 3 次（CH 今天已經進 2 次）
    assert.deepEqual(await istat(), { used: 2, left: 1, scrolls: 0 });
    const r3 = await startR(); assert.equal(r3.used, 3); assert.equal(r3.left, 0);
    await assert.rejects(() => startR(), /daily limit/, '第 4 次拒絕');
    assert.deepEqual(await istat(), { used: 3, left: 0, scrolls: 0 });
    assert.equal((await startR(CH2)).used, 1, '別的角色自己算');
    await db.exec('reset role'); await q("update public.dragon_inf_runs set day=day-1 where char_id=$1", [CH]); await as(a);
    assert.equal((await istat()).used, 0, '隔天重置'); assert.equal((await startR()).used, 1);
    // 封鎖的帳號
    await db.exec('reset role'); await q('insert into public.dragon_bans values($1)', [a]); await as(a);
    await assert.rejects(() => start(), /banned/);
    await db.exec('reset role');
    const logs = (await q("select kind,count(*)::int n from public.dragon_doll_upgrade_log group by kind order by kind")).map(r => r.kind + ':' + r.n).join(',');
    assert.equal(logs, 'claim:4,enter:5,upgrade:4004');
    console.log('PASS DB: rerunnable / daily limit 3 per char (Taipei day) & next-day reset / inf_status / anon & direct table denied / claim time gate (N-1)*30*0.95s / once per floor per run / floors 10,15,20,25… (multiples of 5 from 10) / new run voids old / per char & account isolation / upgrade path checks / scroll decrement & none left / success rate ' + (rate * 100).toFixed(1) + '% / banned / audit log');
    await db.close();
}
main().catch(e => { console.error(e); process.exit(1); });
