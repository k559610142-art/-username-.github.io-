// 元素系統 tools/elements.sql 的真正 PostgreSQL（PGlite）隔離測試；只在記憶體，絕不連正式 Supabase（第 316 節）。
const fs = require('fs'), path = require('path'), assert = require('assert/strict');
const runtime = process.env.LOOT_TEST_RUNTIME || path.join(require('os').tmpdir(), 'dark-loot-test-runtime/node_modules/@electric-sql/pglite');
const { PGlite } = require(runtime);
(async () => {
    const db = new PGlite();
    await db.exec(`create role anon;create role authenticated;create schema auth;
    create function auth.uid() returns uuid language sql as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;
    grant usage on schema public,auth to anon,authenticated;
    create table public.dragon_saves(user_id uuid,slot int,data jsonb,client_t bigint,primary key(user_id,slot));
    create table public.raid_rooms(id uuid primary key,round int,raid text,status text,result jsonb);
    create table public.raid_members(room_id uuid,user_id uuid,char_id text,ready_round int);
    create function public.dragon_is_banned() returns boolean language sql as $$select false$$;
    create function public.dragon_save_ok(uuid,int) returns boolean language sql as $$select true$$;
    create function public.dia_drop(text) returns json language plpgsql as $$begin return json_build_object('diamonds',0,'got',0);end$$;
    create function public.wb_claim(bigint) returns json language plpgsql as $$begin return '{}'::json;end$$;`);
    const load = async f => db.exec(fs.readFileSync(path.join(__dirname, f), 'utf8'));
    for (const f of ['server-loot.sql', 'loot-catalog.sql', 'loot-screen.sql', 'treasure-maps.sql', 'mercenary-rune-drops.sql', 'test-fixture-unique-items-v1.sql']) await load(f);
    const old = (await db.query('select version,data from dragon_loot_catalog where id=1')).rows[0];
    await load('elements.sql'); await load('unique-items.sql');
    const cat = (await db.query('select version,data from dragon_loot_catalog where id=1')).rows[0];
    await load('elements.sql'); await load('unique-items.sql');   // 重跑不變
    assert.deepEqual((await db.query('select data from dragon_loot_catalog where id=1')).rows[0].data, cat.data);
    assert(cat.version.includes('-elements20261107') && cat.version.endsWith('-uniques20261107c'), cat.version);
    const KEYS = ['fireInc', 'iceInc', 'lightInc', 'addFire', 'addIce', 'addLight'];
    for (const k of KEYS) { const a = cat.data.affixes[k]; assert(a && a.max.length === 111 && a.min > 0, k); }
    assert.deepEqual(cat.data.affixes.crit, old.data.affixes.crit, '舊詞綴不變');
    assert(cat.data.items.katana.affixes.includes('addFire') && cat.data.items.katana.affixes.includes('lightInc'), '武器可擲');
    const helm = Object.keys(cat.data.items).find(id => cat.data.items[id].slot === 'helm');
    assert(cat.data.items[helm].affixes.includes('fireInc') && !cat.data.items[helm].affixes.includes('addFire'), '頭盔只有增傷');
    const armor = Object.keys(cat.data.items).find(id => cat.data.items[id].slot === 'armor');
    assert(!KEYS.some(k => cat.data.items[armor].affixes.includes(k)), '盔甲沒有元素詞綴');
    for (const id of cat.data.uniques.ids) assert.deepEqual(cat.data.items[id].affixes, [], '傳奇不擲詞綴 ' + id);
    assert.equal(cat.data.uniques.ids.length, 26);
    assert(cat.data.items.curElement && cat.data.items.curElement.cat === 'currency');
    assert.equal(cat.data.currency.filter(x => x.id === 'curElement').length, 1);
    assert.deepEqual((await db.query('select data from dragon_loot_rules where version=$1', [old.version])).rows[0].data, old.data);
    // 伺服器擲出的稀有武器會帶元素詞綴
    const items = (await db.query(`select public.loot_item($1::jsonb,'katana',1,'rare',100) v from generate_series(1,600)`, [JSON.stringify(cat.data)])).rows.map(r => r.v);
    const keys = new Set(items.flatMap(i => i.af.map(a => a.k)));
    assert(KEYS.every(k => keys.has(k)), '六條都擲得到');
    for (const i of items) for (const a of i.af) if (KEYS.includes(a.k)) { const d = cat.data.affixes[a.k]; assert(a.v >= d.min && a.v <= d.max[100] + 1e-9, a.k + ' ' + a.v); }
    // 元素石：只給 Lv.50 以上；強制只剩元素石時一定掉
    const forced = structuredClone(cat.data); forced.currency = forced.currency.map(x => ({ ...x, w: x.id === 'curElement' ? 1 : 0 }));
    const x = lv => ({ monster: { lv, boss: true, drops: [] }, zone: { id: 'giantTomb', drops: [] }, player: { cls: 'knight', quests: { ch: 0, active: false }, inv: [] }, map: null });
    const roll = async lv => (await db.query(`select public.loot_roll($1::jsonb,$2::jsonb) v from generate_series(1,300)`, [JSON.stringify(forced), JSON.stringify(x(lv))])).rows.flatMap(r => r.v);
    assert((await roll(60)).some(i => i.id === 'curElement'), 'Lv.60 首領會掉元素石');
    assert(!(await roll(40)).some(i => i.id === 'curElement'), 'Lv.40 不掉元素石');
    await db.close();
    console.log('PASS elements.sql：重跑不變、6 條元素詞綴（上限陣列 0～110）、部位正確（頭盔只有增傷、盔甲沒有、傳奇不擲）、舊詞綴與舊規則保留、伺服器擲稀有武器會出元素詞綴且數值在範圍內、元素石 Lv.50 以上才掉；與 unique-items.sql 第二期（26 件）一起安裝。');
})().catch(e => { console.error(e); process.exit(1); });
