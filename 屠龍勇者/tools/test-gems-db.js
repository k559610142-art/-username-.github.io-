// 裝備開孔＋寶石 tools/sockets-gems.sql 的真正 PostgreSQL（PGlite）隔離測試；只在記憶體，絕不連正式 Supabase（第 317 節）。
// 重點：伺服器 dragon_item_canon／dragon_save_canon 要和遊戲 guard.js 的 guardItemCanon／guardSaveCanon 算出一模一樣的字串。
const fs = require('fs'), path = require('path'), vm = require('vm'), assert = require('assert/strict');
const { PGlite } = require(process.env.LOOT_TEST_RUNTIME || path.join(require('os').tmpdir(), 'dark-loot-test-runtime/node_modules/@electric-sql/pglite'));
const prefix = fs.readFileSync(path.join(__dirname, 'test-mercenary.js'), 'utf8').split('ctx.assert = assert;')[0];
const game = new Function('require', '__dirname', prefix + '\nreturn ctx;')(require, __dirname);
(async () => {
    const db = new PGlite();
    await db.exec(`create role anon;create role authenticated;create role service_role;
    create schema auth;create table auth.users(id uuid primary key,email text);create table auth.sessions(id uuid primary key,user_id uuid);
    create function auth.uid() returns uuid language sql as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;
    create function auth.jwt() returns jsonb language sql as $$select jsonb_build_object('email','test@invalid')$$;
    create function auth.role() returns text language sql as $$select 'authenticated'::text$$;
    grant usage on schema public,auth to anon,authenticated;`);
    const load = async f => { let sql = fs.readFileSync(path.join(__dirname, f), 'utf8'); if (f === 'supabase.sql') sql = sql.replace(/create extension if not exists pgcrypto;/i, ''); await db.exec(sql); };
    for (const f of ['supabase.sql', 'anticheat.sql', 'server-loot-install.sql', 'loot-screen.sql', 'treasure-maps.sql', 'mercenary-rune-drops.sql', 'test-fixture-unique-items-v1.sql', 'elements.sql', 'unique-items.sql']) await load(f);
    const sigCanon = async x => (await db.query('select public.dragon_item_canon($1::jsonb) v', [JSON.stringify(x)])).rows[0].v;
    // 安裝前：舊函式；記下沒有孔的道具簽章
    const plain = { uid: 5, id: 'katana', n: 1, ench: 3, q: 'rare', af: [{ k: 'dmg', v: 3 }, { k: 'crit', v: 0.05 }] };
    const before = await sigCanon(plain);
    const old = (await db.query('select version,data from dragon_loot_catalog where id=1')).rows[0];
    await load('sockets-gems.sql');
    const cat = (await db.query('select version,data from dragon_loot_catalog where id=1')).rows[0];
    await load('sockets-gems.sql');
    assert.deepEqual((await db.query('select data from dragon_loot_catalog where id=1')).rows[0].data, cat.data, '重跑不變');
    assert.equal(await sigCanon(plain), before, '沒有孔的道具簽章不變');
    // ① 隨機道具：伺服器與遊戲的簽章字串完全一致
    const R = (a, b) => a + Math.floor(Math.random() * (b - a + 1));
    const gemItem = () => ({ uid: R(1, 9e5), id: 'gem_' + ['leechG', 'chainG', 'multistrike'][R(0, 2)], n: 1, gl: R(1, 20), gx: R(0, 500000) });
    const rand = () => {
        const x = { uid: R(1, 9e5), id: ['katana', 'leatherArmor', 'uq_forgeheart', 'gem_leechG'][R(0, 3)], n: 1, ench: R(-1, 9) };
        if (Math.random() < 0.6) { x.q = ['magic', 'rare', 'legend'][R(0, 2)]; x.af = Array.from({ length: R(0, 5) }, () => ({ k: ['dmg', 'hp', 'crit', 'fireInc', 'convFire'][R(0, 4)], v: Math.random() < 0.5 ? R(1, 40) : Math.round(Math.random() * 100) / 100, ...(Math.random() < 0.2 ? { ex: 1 } : {}) })); }
        if (x.id.startsWith('gem_')) { x.gl = R(1, 20); x.gx = R(0, 99999); }
        else if (Math.random() < 0.7) { const n = R(1, 6); x.so = Array.from({ length: n }, () => [null, { t: 'skill', sk: ['fireball', '_attack'][R(0, 1)] }, gemItem()][R(0, 2)]); x.ln = Array.from({ length: n - 1 }, () => R(0, 1)); }
        return x;
    };
    for (let i = 0; i < 400; i++) { const x = rand(); assert.equal(await sigCanon(x), game.guardItemCanon(JSON.parse(JSON.stringify(x))), JSON.stringify(x)); }
    // ② 整份存檔簽章字串一致（背包、倉庫、裝備都有孔與寶石）
    const p = { lv: 70, exp: 123456, gold: 999, inv: [rand(), rand(), gemItem()], storage: [rand()], equip: { armor: rand(), weapon: rand(), ring1: null } };
    const U = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
    assert.equal((await db.query('select public.dragon_save_canon($1::uuid,2,$2::jsonb) v', [U, JSON.stringify(p)])).rows[0].v, game.guardSaveCanon(U, 2, JSON.parse(JSON.stringify(p))));
    // ③ 目錄：13 種寶石、開孔石／連結石；舊道具、舊規則保留
    assert.equal(cat.data.gems.ids.length, 13); for (const id of cat.data.gems.ids) assert.equal(cat.data.items[id].cat, 'gem');
    for (const id of ['curSocket', 'curLink']) { assert(cat.data.items[id]); assert.equal(cat.data.currency.filter(x => x.id === id).length, 1); }
    for (const [id, d] of Object.entries(old.data.items)) assert.deepEqual(cat.data.items[id], d, id);
    assert.deepEqual((await db.query('select data from dragon_loot_rules where version=$1', [old.version])).rows[0].data, old.data);
    // ④ loot_gem：首領 10%、小怪不掉；loot_roll 串接（傳奇、傭兵符石仍在）
    const call = async (fn, c, x, n) => (await db.query(`select public.${fn}($1::jsonb,$2::jsonb) v from generate_series(1,$3)`, [JSON.stringify(c), JSON.stringify(x), n])).rows.flatMap(r => r.v);
    const X = boss => ({ monster: { lv: 60, boss, drops: [] }, zone: { id: 'giantTomb', drops: [] }, player: { cls: 'knight', quests: { ch: 0, active: false }, inv: [] }, map: null });
    const got = await call('loot_gem', cat.data, X(true), 10000);
    assert(got.length > 850 && got.length < 1150, '首領 10% ' + got.length); assert(got.every(i => cat.data.gems.ids.includes(i.id) && i.n === 1));
    assert.equal((await call('loot_gem', cat.data, X(false), 2000)).length, 0, '小怪不掉');
    const src = (await db.query(`select pg_get_functiondef(p.oid) s from pg_proc p where p.proname='loot_roll'`)).rows[0].s;
    assert(src.includes('public.loot_gem(c,x)') && src.includes('public.loot_unique(c,x)') && src.includes('public.loot_merc_rune(c,x)'));
    const forced = structuredClone(cat.data); forced.gems.bossP = 1;
    assert((await call('loot_roll', forced, X(true), 30)).filter(i => i.id.startsWith('gem_')).length >= 30, 'loot_roll 串接');
    // ⑤ 簽章觸發器：有孔的存檔用遊戲算的簽章上傳 → sig_ok＝true
    await db.query('insert into auth.users values($1,$2)', [U, 'a@invalid']);
    await db.exec(`select set_config('request.jwt.claim.sub','${U}',false)`);
    const pl = { created: 1, cls: 'knight', name: 'G', lv: 70, exp: 0, gold: 5, nextUid: 9e5, inv: p.inv, storage: p.storage, equip: p.equip, stats: { str: 18 }, loc: { type: 'town', id: 'talking' }, quests: { ch: 0, active: false }, towerMax: 1 };
    const crypto = require('crypto'); const sig = crypto.createHash('sha256').update(vm.runInContext('GUARD_SIG_KEY', game) + '|' + game.guardSaveCanon(U, 0, JSON.parse(JSON.stringify(pl)))).digest('hex');
    await db.query('insert into public.dragon_saves(user_id,slot,client_t,name,cls,lv,data) values($1,0,1,$2,$3,70,$4)', [U, 'G', 'knight', { schema: 30, player: pl, sig, lootProtocol: 1, lootCursor: 0 }]);
    assert.equal((await db.query('select sig_ok from public.dragon_saves where user_id=$1', [U])).rows[0].sig_ok, true, '遊戲算的簽章被伺服器接受');
    await db.close();
    console.log('PASS sockets-gems.sql：重跑不變、沒有孔的道具簽章不變、400 件隨機道具與整份存檔的簽章字串和遊戲端一致、真正上傳 sig_ok＝true、13 種寶石與開孔石／連結石進目錄、舊道具與舊規則保留、首領 10% 掉寶石、小怪不掉、loot_roll 串接（傳奇、傭兵符石仍在）。');
})().catch(e => { console.error(e); process.exit(1); });
