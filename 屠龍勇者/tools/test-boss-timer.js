// 首領時間由伺服器決定：隔離 PGlite 載入正式 SQL＋boss-timer.sql（重跑兩次），驗證野外計時、塔守關首領、團隊副本冷卻（第 273 節）。不連正式主機。
const fs = require('fs'), path = require('path'), assert = require('assert/strict');
const { PGlite } = require(process.env.LOOT_TEST_RUNTIME || path.join(require('os').tmpdir(), 'dark-loot-test-runtime/node_modules/@electric-sql/pglite'));
(async () => {
    const db = new PGlite();
    await db.exec(`create role anon;create role authenticated;create role service_role;
    create schema auth;create table auth.users(id uuid primary key,email text);create table auth.sessions(id uuid primary key,user_id uuid);
    create function auth.uid() returns uuid language sql as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;
    create function auth.jwt() returns jsonb language sql as $$select jsonb_build_object('email','boss@invalid')$$;
    create function auth.role() returns text language sql as $$select 'authenticated'::text$$;
    grant usage on schema public,auth to anon,authenticated;`);
    for (const file of ['supabase.sql', 'anticheat.sql', 'server-loot-install.sql', 'vault-v2.sql', 'stat-cap.sql', 'market-v2.sql', 'save-log-throttle.sql', 'loot-batch.sql',
        'loot-screen.sql', 'treasure-maps.sql', 'mercenary-rune-drops.sql', 'advance-class.sql', 'boss-timer.sql', 'boss-timer.sql']) {
        let sql = fs.readFileSync(path.join(__dirname, file), 'utf8');
        if (file === 'supabase.sql') sql = sql.replace(/create extension if not exists pgcrypto;/i, '');
        try { await db.exec(sql); } catch (e) { console.error("Failed migration:", file, e.message, e.where); process.exit(1); }
    }
    const fn = async n => (await db.query("select pg_get_functiondef(p.oid) s from pg_proc p join pg_namespace ns on ns.oid=p.pronamespace where ns.nspname='public' and p.proname=$1", [n])).rows[0].s;
    assert((await fn('loot_spawn')).includes('boss_field_due') && !(await fn('loot_spawn')).includes('random()<coalesce((z->'), '野外首領改計時');
    assert((await fn('loot_spawn')).includes("'adv',p->'adv'"), '二轉補丁保留');
    assert((await fn('loot_finish_batch')).split('boss_cd_kill').length === 2, '重跑不重複補');

    const uid = '88888888-8888-4888-8888-888888888888', ch = '123|knight';
    await db.query('insert into auth.users values($1,$2)', [uid, 'boss@invalid']);
    await db.exec(`select set_config('request.jwt.claim.sub','${uid}',false)`);
    const base = { created: 123, cls: 'knight', name: '首領測試', lv: 60, exp: 0, gold: 300, inv: [], storage: [], equip: {}, stats: { str: 18, dex: 12, con: 16, int: 8, wis: 9, cha: 12 },
        quests: { ch: 0, active: false }, towerMax: 20, towerCleared: {}, towerBossCd: {} };
    let first = true;
    const setP = async extra => {
        const p = { ...base, ...extra };
        const sig = (await db.query('select public.dragon_save_sig($1,0,$2) as s', [uid, p])).rows[0].s;
        const data = { schema: 5, player: p, sig, lootProtocol: 1, lootCursor: 0 };
        if (first) await db.query('insert into public.dragon_saves(user_id,slot,client_t,name,cls,lv,data) values($1,0,1,$2,$3,60,$4)', [uid, p.name, p.cls, data]);
        else await db.query('update public.dragon_saves set data=$2 where user_id=$1 and slot=0', [uid, data]);
        first = false;
    };
    await db.exec('update public.dragon_loot_config set enabled=true');
    const as = async (sql, a) => { await db.exec('set role authenticated'); try { return (await db.query(sql, a)).rows[0]; } finally { await db.exec('reset role'); } };
    const age = () => db.exec("update public.dragon_loot_jobs set created_at=clock_timestamp()-interval '11 minutes'");   // 避開遭遇上限 64 與每秒速率限制
    const spawn = async (join = false) => { const r = (await as('select public.loot_spawn(0,$1,$2,$3,null) as v', [ch, crypto.randomUUID(), join])).v; await age(); return r; };
    const cd = async (kind, key) => (await db.query('select until, extract(epoch from until-clock_timestamp())/60 m from public.dragon_boss_cd where kind=$1 and key=$2', [kind, key])).rows[0];
    const due = (kind, key) => db.query("update public.dragon_boss_cd set until=clock_timestamp()-interval '1 second' where kind=$1 and key=$2", [kind, key]);

    // ① 野外：第一次遇怪只建立計時（60～90 分），之後不會隨機出首領
    await setP({ loc: { type: 'zone', id: 'elvenForest' } });
    let rows = await spawn();
    assert(rows.every(r => r.monster.id !== 'elderTreant'), '第一次不出首領');
    let c = await cd('field', 'elvenForest'); assert(c && c.m > 59 && c.m <= 91, '計時 60～90 分 ' + (c && c.m));
    for (let i = 0; i < 40; i++) assert((await spawn()).every(r => r.monster.id !== 'elderTreant'), '時間未到不出首領');
    await due('field', 'elvenForest');
    assert((await spawn(true)).every(r => r.monster.id !== 'elderTreant'), '加入戰鬥不出首領');
    assert((await cd('field', 'elvenForest')).m < 0, '加入戰鬥不消耗計時');
    rows = await spawn();
    assert.equal(rows.length, 1); assert.equal(rows[0].monster.id, 'elderTreant', '時間到出首領');
    c = await cd('field', 'elvenForest'); assert(c.m > 59 && c.m <= 91, '出了就重設');
    assert((await spawn()).every(r => r.monster.id !== 'elderTreant'), '重設後不再出');
    await setP({ loc: { type: 'zone', id: 'island' } });
    await spawn();
    assert.equal(await cd('field', 'island'), undefined, '沒有首領的地圖不計時');

    // ② 永夜之塔：不看存檔 towerBossCd，看伺服器；結算守關首領記 6 小時
    await setP({ loc: { type: 'zone', id: 'tower', floor: 10 }, towerCleared: { 10: true }, towerBossCd: { 10: Date.now() + 9e9 } });
    rows = await spawn();
    assert.equal(rows[0].monster.id, 'towerBoss10', '伺服器沒冷卻：存檔寫冷卻也出首領');
    assert((await spawn()).every(x => x.monster.id !== 'towerBoss10'), '打倒還沒結算前不再出第二隻');
    const r = (await as('select public.loot_finish_batch($1,$2) as v', [crypto.randomUUID(), rows.map(x => x.ticket)])).v;
    assert.equal(r.cursor, 1);
    c = await cd('tower', ch + '|10'); assert(c.m > 359 && c.m <= 360, '守關首領 6 小時');
    assert((await spawn()).every(x => x.monster.id !== 'towerBoss10'), '冷卻中出一般怪');
    await setP({ loc: { type: 'zone', id: 'tower', floor: 10 }, towerCleared: { 10: true }, towerBossCd: {} });
    assert((await spawn()).every(x => x.monster.id !== 'towerBoss10'), '存檔清掉冷卻也沒用');
    await due('tower', ch + '|10');
    assert.equal((await spawn())[0].monster.id, 'towerBoss10', '伺服器冷卻到期再出');
    await setP({ loc: { type: 'zone', id: 'tower', floor: 20 }, towerCleared: {}, towerBossCd: {} });
    assert.equal((await spawn())[0].monster.id, 'towerBoss20', '第一次未通關照舊出');

    // ③ 團隊副本：勝利領獎記冷卻、冷卻中不能準備
    await db.exec('set role authenticated');
    const room = (await db.query("insert into public.raid_rooms(code,raid,leader_name,version) values('ABCDEF','drake','測試','x') returning id")).rows[0].id;
    await db.query('insert into public.raid_members(room_id,name,cls,lv,char_id) values($1,$2,$3,60,$4)', [room, '首領測試', 'knight', ch]);
    await db.query('update public.raid_members set ready_round=1 where room_id=$1', [room]);
    await db.query("update public.raid_rooms set status='fighting', result=$2 where id=$1", [room, { win: true, members: [{ uid }] }]);
    await db.exec('reset role');
    await as('select public.loot_raid(0,$1,$2,1) as v', [ch, room]);
    c = await cd('raid', ch + '|drake'); assert(c.m > 119 && c.m <= 120, '地龍冷卻 2 小時');
    await as('select public.loot_raid(0,$1,$2,1) as v', [ch, room]);   // 重送不重設
    await db.exec('set role authenticated');
    await db.query("update public.raid_rooms set status='open', round=2, result=null where id=$1", [room]);
    await assert.rejects(db.query('update public.raid_members set ready_round=2 where room_id=$1', [room]), /raid cooldown/, '冷卻中不能準備');
    await db.query('update public.raid_members set ready_round=0 where room_id=$1', [room]);   // 取消準備可以
    await db.exec('reset role');
    await due('raid', ch + '|drake');
    await db.exec('set role authenticated');
    await db.query('update public.raid_members set ready_round=2 where room_id=$1', [room]);
    // ④ 狀態：自己看得到、表不能直讀
    const st = (await db.query('select public.boss_cd_status() v')).rows[0].v;
    assert(st.some(x => x.kind === 'tower') && st.some(x => x.kind === 'field'));
    await assert.rejects(db.query('select * from public.dragon_boss_cd'), /permission denied/);
    await assert.rejects(db.query("select public.boss_cd_set('raid','x',0)"), /permission denied/);
    await db.exec('reset role');
    console.log('test-boss-timer OK');
})().catch(e => { console.error(e); process.exit(1); });
