// tools/memory-candle.sql 的 PostgreSQL(PGlite)隔離測試；僅記憶體，絕不連正式 Supabase。
// 執行：node tools/test-memory-candle-db.js（PGlite 路徑同 test-doll-shop-db.js，可用 LOOT_TEST_RUNTIME 指定）
const fs = require('fs'), path = require('path'), assert = require('assert/strict');
const runtime = process.env.LOOT_TEST_RUNTIME || path.join(require('os').tmpdir(), 'dark-loot-test-runtime/node_modules/@electric-sql/pglite');
const { PGlite } = require(runtime);
const a = '11111111-1111-4111-8111-111111111111', b = '22222222-2222-4222-8222-222222222222';
async function main() {
    const db = new PGlite();
    await db.exec(`create role anon;create role authenticated;create schema auth;
 create table auth.users(id uuid primary key,email text);
 insert into auth.users values('${a}','a@test.com'),('${b}','b@test.com');
 create function auth.uid() returns uuid language sql as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;
 create function auth.jwt() returns jsonb language sql as $$select jsonb_build_object('email',(select email from auth.users where id=auth.uid()))$$;
 grant usage on schema public,auth to anon,authenticated;
 create table public.dragon_admins(user_id uuid primary key);
 create function public.dragon_is_admin() returns boolean language sql security definer as $$select exists(select 1 from public.dragon_admins where user_id=auth.uid())$$;
 create table public.dragon_bans(user_id uuid primary key,email text,reason text,by_email text,at timestamptz default now());
 create function public.dragon_is_banned() returns boolean language sql security definer as $$select exists(select 1 from public.dragon_bans where user_id=auth.uid())$$;
 grant execute on function public.dragon_is_banned() to authenticated;
 create table public.dragon_loot_catalog(id int primary key,version text,data jsonb);
 insert into public.dragon_loot_catalog values(1,'t','{"items":{}}');
 create table public.dragon_saves(user_id uuid,slot int,data jsonb,updated_at timestamptz default now(),name text,lv int,client_t bigint,primary key(user_id,slot));`);
    await db.exec(fs.readFileSync(path.join(__dirname, 'vault.sql'), 'utf8'));
    const sql = fs.readFileSync(path.join(__dirname, 'memory-candle.sql'), 'utf8');
    await db.exec(sql); await db.exec(sql);   // 可重跑
    const q = async (s, p = []) => (await db.query(s, p)).rows;
    const as = uid => db.exec(`reset role;set role authenticated;select set_config('request.jwt.claim.sub','${uid}',false)`);
    const buy = async (price, key) => (await q('select public.candle_buy($1,$2) v', [price, key]))[0].v;
    const k1 = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', k2 = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb', k3 = 'cccccccc-cccc-4ccc-8ccc-cccccccccccc';

    await db.exec("reset role;select set_config('request.jwt.claim.sub','',false);set role anon");
    await assert.rejects(() => buy(100, k1), /permission denied/);
    await as(a);
    await assert.rejects(() => q('select * from public.dragon_candle_orders'), /permission denied/);
    await assert.rejects(() => buy(100, k1), /not enough diamonds/);
    await db.exec('reset role'); await q('insert into public.dragon_wallet(user_id,diamonds) values($1,250) on conflict(user_id) do update set diamonds=250', [a]); await as(a);
    await assert.rejects(() => buy(50, k1), /price changed/);
    let r = await buy(100, k1); assert.equal(r.diamonds, 150); assert.equal(r.qty, 1);
    const again = await buy(100, k1); assert.equal(again.vaultId, r.vaultId, '同一個 request 只交付一次'); assert.equal(again.diamonds, 150);
    r = await buy(100, k2); assert.equal(r.diamonds, 50);
    await assert.rejects(() => buy(100, k3), /not enough diamonds/);
    await db.exec('reset role');
    const items = await q('select item,name from public.dragon_vault_items where user_id=$1 order by id', [a]);
    assert.equal(items.length, 2); assert.deepEqual(items[0].item, { id: 'memoryCandle', n: 1 }); assert.equal(items[0].name, '回憶蠟燭');
    assert.equal((await q('select count(*)::int n from public.dragon_dia_log where user_id=$1', [a]))[0].n, 2);
    // 倉庫滿不扣鑽石
    await q('update public.dragon_wallet set diamonds=1000 where user_id=$1', [a]);
    await q("insert into public.dragon_vault_items(user_id,from_slot,uid,item_id,item,name) select $1,-1,0,'redPotion','{\"id\":\"redPotion\",\"n\":1}','x' from generate_series(1,198)", [a]);
    await as(a); await assert.rejects(() => buy(100, k3), /vault full/);
    await db.exec('reset role'); assert.equal((await q('select diamonds from public.dragon_wallet where user_id=$1', [a]))[0].diamonds, 1000);
    // 封鎖
    await q('insert into public.dragon_bans(user_id) values($1)', [b]); await as(b); await assert.rejects(() => buy(100, k1), /banned/);
    console.log('PASS DB: rerunnable / anon & direct table denied / price 100 fixed / diamonds deducted / vault item memoryCandle×1 / same request delivered once / not enough diamonds / vault full no charge / banned / dia log');
    await db.close();
}
main().catch(e => { console.error(e); process.exit(1); });
