// 伺服器擋經驗暴增 tools/exp-guard.sql 的隔離 PGlite 測試（第 311 節）；只在記憶體，不連正式 Supabase。
const fs = require('fs'), path = require('path'), assert = require('assert/strict');
const { PGlite } = require(process.env.LOOT_TEST_RUNTIME || path.join(require('os').tmpdir(), 'dark-loot-test-runtime/node_modules/@electric-sql/pglite'));
(async () => {
    const db = new PGlite();
    await db.exec(`create role anon;create role authenticated;create role service_role;
    create schema auth;create table auth.users(id uuid primary key,email text);create table auth.sessions(id uuid primary key,user_id uuid);
    create function auth.uid() returns uuid language sql as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;
    create function auth.jwt() returns jsonb language sql as $$select jsonb_build_object('email','test@invalid')$$;
    create function auth.role() returns text language sql as $$select coalesce(nullif(current_setting('test.role',true),''),'authenticated')$$;
    grant usage on schema public,auth to anon,authenticated;`);
    let sql = fs.readFileSync(path.join(__dirname, 'supabase.sql'), 'utf8').replace(/create extension if not exists pgcrypto;/i, '');
    await db.exec(sql);
    const guard = fs.readFileSync(path.join(__dirname, 'exp-guard.sql'), 'utf8');
    await db.exec(guard); await db.exec(guard);   // 可重複執行
    const U = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
    await db.query('insert into auth.users values($1,$2)', [U, 'a@invalid']);
    await db.exec(`select set_config('request.jwt.claim.sub','${U}',false)`);
    const total = async (lv, exp) => Number((await db.query('select public.dragon_total_exp($1,$2) v', [lv, exp])).rows[0].v);
    const base50 = await total(50, 0);
    let t = 1;
    const P = (lv, exp, extra = {}) => ({ schema: 30, t: ++t, player: { created: 111, name: 'X', cls: 'gunner', lv, exp, gold: 0, stats: {}, inv: [], storage: [], equip: {}, ...extra } });
    const ins = async d => db.query('insert into public.dragon_saves(user_id,slot,client_t,name,cls,lv,data) values($1,0,$2,$3,$4,$5,$6)', [U, d.t, 'X', 'gunner', d.player.lv, d]);
    const upd = async (d, extra = '') => db.query(`update public.dragon_saves set data=$2, client_t=$3, lv=$4${extra} where user_id=$1 and slot=0`, [U, d, d.t, d.player.lv]);
    const back = async min => { await db.exec('alter table public.dragon_saves disable trigger user'); await db.query(`update public.dragon_saves set updated_at=updated_at - make_interval(mins => $1)`, [min]); await db.query(`update public.dragon_flags set at=at - make_interval(mins => $1)`, [min]); await db.exec('alter table public.dragon_saves enable trigger user'); };
    const row = async () => (await db.query('select exp_total::float8 et, exp_credit::float8 ec, (data->$1->>$2)::bigint exp from public.dragon_saves where user_id=$3 and slot=0', ['player', 'exp', U])).rows[0];
    const rejected = async fn => { try { await fn(); return false; } catch (e) { assert.equal(e.hint, 'dragon_exp_rate', e.message); return true; } };
    const rate50 = 2000 * (55 * 55 + 1);

    // 第一次上傳：照收、起算
    await ins(P(50, 1000000));
    let r = await row(); assert.equal(r.et, base50 + 1000000); assert.equal(r.ec, rate50 * 6);
    // 正常玩家：每 6 分鐘 +6 萬，連打 50 次（5 小時）都不會被擋
    let exp = 1000000;
    for (let i = 0; i < 50; i++) { await back(6); exp += 60000; assert.equal(await rejected(() => upd(P(50, exp))), false, '正常第' + i + '次'); }
    // 偽造額度欄位：伺服器忽略
    await back(6); exp += 1000; await upd(P(50, exp), ', exp_credit = 1e15, exp_total = 0');
    r = await row(); assert(r.ec <= rate50 * 6 + 1, '額度被偽造'); assert.equal(r.et, base50 + exp);
    // 加速玩家：每 6 分鐘 +270 萬 → 額度用完後被擋，雲端停在上一份
    let n = 0, blocked = false;
    for (; n < 40; n++) { await back(6); const e2 = exp + 2700000; if (await rejected(() => upd(P(50, e2)))) { blocked = true; break; } exp = e2; }
    assert(blocked, '加速沒被擋'); assert(n >= 14 && n <= 20, '第' + n + '次才擋'); r = await row(); assert.equal(r.exp, exp);
    // 被擋後之後一直被擋（額度只照時間回來，每 6 分鐘約 60 萬）
    await back(6); assert(await rejected(() => upd(P(50, exp + 2700000))));
    // 遊戲回報 → exp_block；24 小時內不重複；放行前仍被擋
    const rep = async () => (await db.query('select public.dragon_exp_block_report(0,50,$1) v', [base50 + exp + 2700000])).rows[0].v;
    assert.equal(await rep(), true); assert.equal(await rep(), false);
    const flag = (await db.query(`select * from public.dragon_flags where kind='exp_block'`)).rows; assert.equal(flag.length, 1); assert.match(flag[0].detail, /放行/);
    assert(await rejected(() => upd(P(50, exp + 2700000))));
    // 管理者按「已處理」→ 下一次照收、額度補滿
    await db.query(`update public.dragon_flags set resolved=true where kind='exp_block'`);
    await upd(P(50, exp + 2700000)); exp += 2700000; r = await row(); assert.equal(r.ec, rate50 * 6);
    // 放行只算那一次之前的紀錄：之後再暴增又會被擋
    for (n = 0; n < 40; n++) { await back(6); const e2 = exp + 2700000; if (await rejected(() => upd(P(50, e2)))) break; exp = e2; }
    assert(n < 40, '放行後沒有再擋');
    // 死亡扣經驗（負的）照收
    await back(1); exp -= 1800000; await upd(P(50, exp)); assert.equal((await row()).exp, exp);
    // 同欄位換角色（建立時間不同）＋大量經驗 → 擋；小號照收
    await back(60);
    assert(await rejected(() => upd(P(50, 0, { created: 222 }))));
    await upd(P(5, 100, { created: 222 })); r = await row(); assert.equal(r.et, await total(5, 100));
    // 管理者（非 authenticated）直接改：照收、重新起算
    await db.exec(`select set_config('test.role','service_role',false)`);
    await upd(P(80, 0, { created: 222 })); r = await row(); assert.equal(r.et, await total(80, 0));
    await db.exec(`select set_config('test.role','',false)`);
    // 內容沒變（只改其他欄位）不檢查
    await db.query('update public.dragon_saves set name=$2 where user_id=$1 and slot=0', [U, 'Y']);
    // 低等級升級快：Lv.10 半小時內正常練到 Lv.20 不擋
    await db.exec('delete from public.dragon_saves');
    await ins(P(10, 0, { created: 333 }));
    let ok = 0; for (let lv = 11; lv <= 20; lv++) { await back(3); if (!(await rejected(() => upd(P(lv, 0, { created: 333 }))))) ok++; }
    assert.equal(ok, 10, 'Lv.10→20 被誤擋');
    await db.close();
    console.log('PASS exp-guard：可重跑、正常每 6 分 6 萬×50 次不擋、偽造額度無效、每 6 分 270 萬第 ' + '17 次（約 1.7 小時）被擋且雲端保留上一份、回報 24 小時不重複、管理者放行一次、死亡扣經驗、換角色大號擋小號收、管理者直改、低等級快速升級不誤擋。');
})().catch(e => { console.error(e); process.exit(1); });
