// 傳奇裝備掉落 tools/unique-items.sql 的真正 PostgreSQL（PGlite）隔離測試；只在記憶體，絕不連正式 Supabase（第 315 節）。
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
    for (const f of ['server-loot.sql', 'loot-catalog.sql', 'loot-screen.sql', 'treasure-maps.sql', 'mercenary-rune-drops.sql']) await load(f);
    const old = (await db.query('select version,data from dragon_loot_catalog where id=1')).rows[0];
    // 升級路徑：先裝第一期（20 件，-uniques20261107a），再裝第二期（26 件）
    if (fs.existsSync(path.join(__dirname, 'test-fixture-unique-items-v1.sql'))) { await load('test-fixture-unique-items-v1.sql'); assert.equal((await db.query('select data from dragon_loot_catalog where id=1')).rows[0].data.uniques.ids.length, 20); }
    await load('unique-items.sql');
    const cat = (await db.query('select version,data from dragon_loot_catalog where id=1')).rows[0];
    await load('unique-items.sql');   // 重跑不變
    assert.deepEqual((await db.query('select data from dragon_loot_catalog where id=1')).rows[0].data, cat.data);
    assert(cat.version.startsWith(old.version) && cat.version.endsWith('-uniques20261107c'), cat.version);
    const ids = cat.data.uniques.ids; assert.equal(ids.length, 26);
    for (const id of ids) { const d = cat.data.items[id]; assert(d && d.unique && d.reqLv === 60 && d.affixes.length === 0, id); }
    for (const [id, d] of Object.entries(old.data.items)) assert.deepEqual(cat.data.items[id], d, '舊道具不變 ' + id);
    assert.deepEqual((await db.query('select data from dragon_loot_rules where version=$1', [old.version])).rows[0].data, old.data);
    const src = (await db.query(`select pg_get_functiondef(p.oid) s from pg_proc p where p.proname='loot_roll'`)).rows[0].s;
    assert.equal(src.split('public.loot_unique(c,x)').length - 1 >= 1, true); assert(src.includes("not(value ? 'unique')"));
    assert.equal(src.split("not(value ? 'unique')").length - 1, src.split("not(value ? 'res')").length - 1, '每個隨機裝備池都排除傳奇');
    assert(src.includes('public.loot_merc_rune(c,x)'), '傭兵符石仍在');

    const call = async (fn, c, x, n) => (await db.query(`select public.${fn}($1::jsonb,$2::jsonb) v from generate_series(1,$3)`, [JSON.stringify(c), JSON.stringify(x), n])).rows.flatMap(r => r.v);
    const forced = structuredClone(cat.data); for (const t in forced.uniques.p) forced.uniques.p[t] = 1;
    const boss = { lv: 80, boss: true, mapBoss: true, drops: [] };
    const X = (map, monster = boss) => ({ monster, zone: { id: 'giantTomb', drops: [] }, player: { cls: 'knight', quests: { ch: 0, active: false }, inv: [] }, map });
    // 條件：稀有、T11～T15、異界首領、不是財寶圖
    let got = await call('loot_unique', forced, X({ t: 15, q: 'rare', mods: [] }), 1000);
    assert.equal(got.length, 1000); assert(got.every(i => ids.includes(i.id) && i.n === 1 && !i.q && !i.af));
    assert.equal(new Set(got.map(i => i.id)).size, 26, '26 件都抽得到');
    for (const t of [11, 12, 13, 14]) assert.equal((await call('loot_unique', forced, X({ t, q: 'rare', mods: [] }), 20)).length, 20, 'T' + t);
    for (const t of [1, 5, 10]) assert.equal((await call('loot_unique', forced, X({ t, q: 'rare', mods: [] }), 50)).length, 0, 'T' + t + ' 不掉');
    for (const q of [null, 'magic', 'legend']) assert.equal((await call('loot_unique', forced, X({ t: 15, q, mods: [] }), 50)).length, 0, q + ' 不掉');
    assert.equal((await call('loot_unique', forced, X({ t: 15, q: 'rare', treasure: true, mods: [] }), 50)).length, 0, '財寶圖不掉');
    assert.equal((await call('loot_unique', forced, X({ t: 15, q: 'rare', mods: [] }, { lv: 80, boss: true, drops: [] }), 50)).length, 0, '不是異界首領不掉');
    assert.equal((await call('loot_unique', forced, X(null), 50)).length, 0, '野外不掉');
    assert.equal((await call('loot_unique', old.data, X({ t: 15, q: 'rare', mods: [] }), 50)).length, 0, '舊規則憑證不補抽');
    // 真實機率
    const rate = async t => (await call('loot_unique', cat.data, X({ t, q: 'rare', mods: [] }), 20000)).length / 20000;
    const r15 = await rate(15), r13 = await rate(13), r11 = await rate(11);
    assert(r15 > 0.024 && r15 < 0.036, 'T15 ' + r15); assert(r13 > 0.015 && r13 < 0.025, 'T13 ' + r13); assert(r11 > 0.006 && r11 < 0.014, 'T11 ' + r11);
    // loot_roll 實際串接：異界首領會帶出傳奇；一般首領／精英的隨機裝備池永遠不會出傳奇
    got = await call('loot_roll', forced, X({ t: 15, q: 'rare', mods: [] }), 200);
    assert(got.filter(i => ids.includes(i.id)).length >= 200, 'loot_roll 串接 loot_unique');
    const elite = { lv: 99, boss: true, elite: true, drops: [] };
    got = await call('loot_roll', forced, X({ t: 15, q: 'rare', mods: [] }, elite), 3000);
    assert.equal(got.filter(i => ids.includes(i.id)).length, 0, '隨機裝備池不會出傳奇');
    await db.close();
    console.log(`PASS unique-items.sql：重跑不變、第一期→第二期升級、26 件目錄／舊道具與舊規則保留、loot_roll 修補（傭兵符石仍在）、只有稀有 T11～T15 異界首領掉、財寶圖／野外／一般首領不掉、舊憑證不補抽、機率 T11 ${(r11 * 100).toFixed(2)}%／T13 ${(r13 * 100).toFixed(2)}%／T15 ${(r15 * 100).toFixed(2)}%、隨機裝備池排除傳奇。`);
})().catch(e => { console.error(e); process.exit(1); });
