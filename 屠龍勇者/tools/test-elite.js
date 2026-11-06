// 精英怪特殊詞條（data/elite.js，第 312 節）隔離測試：正式遊戲 VM，不讀寫存檔、不連線。
const fs = require('fs'), path = require('path'), vm = require('vm'), assert = require('assert/strict');
const prefix = fs.readFileSync(path.join(__dirname, 'test-mercenary.js'), 'utf8').split('ctx.assert = assert;')[0];
const ctx = new Function('require', '__dirname', prefix + '\nreturn ctx;')(require, __dirname);
ctx.assert = assert;
vm.runInContext(String.raw`
saveGame = () => {}; refreshUI = () => {}; showToast = () => {}; sfx = () => {}; sfxHit = () => {};
worldVfxEmit = () => {}; worldVfxSkill = () => {}; worldVfxAttack = () => {}; worldVfxSupport = () => {}; worldVfxEnemy = () => {};
gameAlert = () => {}; useHomeScroll = () => false; checkAutoHome = () => {}; moveToTown = () => {}; outOfAmmo = () => {};
lootMode = 'legacy'; SIM_MODE = false; scene = null; const CHANCE = chance;
const logs = []; const _addLog = addLog; addLog = (t, c) => { logs.push(t); };
function setup(zone = 'dragonValley') {
    gameNow = 100000; createPlayer('精英測試', 'knight', CLASSES.knight.base); player.lv = 50;
    player.baseHp = 3000; player.baseMp = 500; player.hp = calcStats().maxHp; player.mp = calcStats().maxMp;
    player.loc = { type: 'zone', id: zone }; player.hunting = true; player.mapRun = null;
    hunt = { state: 'fight', mon: null, mobs: [], pCd: 0, joinCd: 9e9, timer: 0, warned: {} };
    session = { start: gameNow, kills: 0, exp: 0, gold: 0 };
}
function elite(af, id = 'wyvern') {
    const m = makeMonster(MONSTERS[id] ? id : Object.keys(MONSTERS).find(k => !MONSTERS[k].boss && MONSTERS[k].lv > 40));
    m.elite = true; addMob(m);
    if (af) { m.eliteAf = af; m.eliteShield = 0; m.eliteShieldAt = gameNow; m.eliteSummonAt = gameNow + ELITE_SUMMON_MS; m.eliteBlinkAt = gameNow + ELITE_BLINK_MS; m._eHp = null; }
    return m;
}
// ① 詞條數量依異界階級；名字、經驗
setup();
const zone = currentZone();
for (const [t, lo, hi] of [[3, 1, 1], [8, 1, 2], [14, 2, 3]]) {
    player.mapRun = { t, zone: zone.id, mods: ['elite'], left: 100, total: 100 };
    const seen = new Set();
    for (let i = 0; i < 300; i++) { const m = makeMonster(zone.mons[0]); m.elite = true; const e0 = m.exp; eliteRollAffixes(m); seen.add(m.eliteAf.length);
        assert.equal(new Set(m.eliteAf).size, m.eliteAf.length); assert.equal(m.exp, Math.round(e0 * (1 + 0.5 * m.eliteAf.length)));
        assert(m.name.startsWith('精英・' + ELITE_AFFIXES[m.eliteAf[0]].name)); }
    assert.equal(Math.min(...seen), lo, 'T' + t); assert.equal(Math.max(...seen), hi, 'T' + t);
}
player.mapRun = null;
// ② 野外 3%、不含塔／龍穴／異界／離線
let n = 0; for (let i = 0; i < 20000; i++) { const m = makeMonster(zone.mons[0]); eliteFieldRoll(m); if (m.elite) { n++; assert(m.fieldElite); } }
assert(n > 450 && n < 750, '野外精英比例 ' + n / 20000);
player.loc = { type: 'zone', id: 'tower', floor: 5 }; n = 0; for (let i = 0; i < 3000; i++) { const m = makeMonster(zone.mons[0]); eliteFieldRoll(m); if (m.elite) n++; } assert.equal(n, 0);
player.loc = { type: 'zone', id: 'dragonValley' }; player.mapRun = { t: 3, zone: 'dragonValley', mods: [], left: 10 };
n = 0; for (let i = 0; i < 3000; i++) { const m = makeMonster(zone.mons[0]); eliteFieldRoll(m); if (m.elite) n++; } assert.equal(n, 0, '異界沒精英詞綴不出精英'); player.mapRun = null;
SIM_MODE = true; n = 0; for (let i = 0; i < 3000; i++) { const m = makeMonster(zone.mons[0]); eliteFieldRoll(m); m.elite = true; eliteRollAffixes(m); if (m.eliteAf) n++; } assert.equal(n, 0, '離線不出詞條'); SIM_MODE = false;
// ③ 護盾：8 秒一次 15%，所有傷害先扣盾
setup(); let m = elite(['shield']); eliteTick(); assert.equal(m.eliteShield, Math.round(m.maxHp * 0.15));
const hp0 = m.hp; m.hp -= 10; eliteTick(); assert.equal(m.hp, hp0); assert.equal(m.eliteShield, Math.round(m.maxHp * 0.15) - 10);
m.hp = -5; onKill(m); assert(hunt.mobs.includes(m), '護盾擋下致命傷'); assert(m.hp > 0);
m.eliteShield = 0; m.hp = -1; onKill(m); assert(!hunt.mobs.includes(m));
// ④ 復甦：第一次 40%，第二次才算擊殺；經驗只給一次
setup(); m = elite(['revive']); const exp0 = totalExpOf(player); m.hp = 0; reapMobs(); assert(hunt.mobs.includes(m)); assert.equal(m.hp, Math.round(m.maxHp * 0.4)); assert.equal(totalExpOf(player), exp0);
m.hp = 0; reapMobs(); assert(!hunt.mobs.includes(m)); assert(totalExpOf(player) > exp0);
// ⑤ 分裂：2 隻小怪，不掉寶、不算異界剩餘數、經驗 30%、沒有金幣
setup(); player.mapRun = { t: 5, zone: 'dragonValley', mods: [], left: 50, total: 50 };
let drops = 0; const _rollDrops = rollDrops; rollDrops = () => { drops++; };
m = elite(['split']); m.hp = 0; reapMobs(); assert.equal(player.mapRun.left, 49); assert.equal(drops, 1);
const kids = hunt.mobs.filter(x => x.eliteMinion); assert.equal(kids.length, 2);
const base = makeMonster(m.id); for (const k of kids) { assert(k.name.startsWith('分裂・')); assert.deepEqual(k.gold, [0, 0]); assert(!k.elite && !k.eliteAf); assert(k.maxHp <= Math.round(base.maxHp * 0.4) + 1); }
const g0 = player.gold; for (const k of kids) k.hp = 0; reapMobs(); assert.equal(player.mapRun.left, 49, '小怪不算剩餘數'); assert.equal(drops, 1, '小怪不掉寶'); assert.equal(player.gold, g0);
rollDrops = _rollDrops; player.mapRun = null;
// ⑥ 召喚：12 秒一隻、最多 2 隻
setup(); m = elite(['summon']); eliteTick(); assert.equal(hunt.mobs.length, 1);
for (let i = 1; i <= 4; i++) { gameNow += ELITE_SUMMON_MS; eliteTick(); }
assert.equal(hunt.mobs.filter(x => x.eliteOwner === m).length, 2); assert(hunt.mobs.every(x => x === m || x.name.startsWith('召喚・')));
// ⑦ 狂暴：HP < 30% 攻速 ×1.5、傷害 ×1.3
setup(); m = elite(['berserk']); assert.equal(eliteAtkMul(m), 1); m.hp = Math.floor(m.maxHp * 0.29); eliteTick(); assert(m.eliteBerserk); assert.equal(eliteDmgMul(m), 1.3); assert(Math.abs(eliteAtkMul(m) - 1 / 1.5) < 1e-9);
// ⑧ 吸血、魔力燃燒、冰封／燃燒／中毒
setup(); m = elite(['vamp', 'manaBurn', 'blaze']); m.hp = m.maxHp - 1000; const mp0 = player.mp, mh = m.hp;
chance = (() => { const c = chance; return p => p >= 0.29 ? true : c(p); })();
eliteOnHitPlayer(m, 200, false); assert.equal(m.hp, mh + 100); assert.equal(player.mp, mp0 - 60); assert(mercNegative(player).burn, '燃燒附加');
m.hp = m.maxHp - 3; eliteOnHitPlayer(m, 200, false); assert.equal(m.hp, m.maxHp, '吸血不超過上限');
// ⑨ 反傷：15%，不會反彈致死
setup(); m = elite(['thorns']); const php = player.hp; eliteOnPlayerPhys(m, 1000); assert.equal(player.hp, php - 150); player.hp = 5; eliteOnPlayerPhys(m, 99999); assert.equal(player.hp, 1);
// 真正 physicalAttack 路徑
setup(); m = elite(['thorns']); m.ac = 99; player.hp = 1000; chance = p => true; const st = calcStats(); physicalAttack(st, 1, {}, m); assert(player.hp < 1000);
chance = CHANCE;
// ⑩ 瞬移（假的地圖畫面）
setup(); m = elite(['blink']);
const grid = Array.from({ length: 20 }, () => Array(20).fill(0));
scene = { grid, mw: 20, mh: 20, pl: { x: 5, y: 5, rx: 5, ry: 5 }, mons: [{ inst: m, x: 15, y: 15, rx: 15, ry: 15, path: [1, 2] }], floats: [] };
gameNow += ELITE_BLINK_MS; eliteTick(); const e = scene.mons[0]; assert(Math.max(Math.abs(e.x - 5), Math.abs(e.y - 5)) <= 1, '瞬移到身邊'); assert.equal(e.path.length, 0);
assert(scene.floats.some(f => f.text === '瞬移'));
gameNow += ELITE_BLINK_MS; e.x = e.rx = 6; e.y = e.ry = 5; eliteTick(); assert.equal(e.x, 6, '近的不瞬移');
scene = null;
// ⑪ 野外精英不保證掉裝備（異界精英照舊）
setup(); let eq = 0; const _add = addItem;
for (let i = 0; i < 400; i++) { const x = makeMonster(zone.mons[0]); x.elite = true; x.fieldElite = true; const before = player.inv.length; rollDrops(x, zone); if (player.inv.length > before) eq++; player.inv = []; }
assert(eq < 400, '野外精英不應每次掉裝備');
// ⑫ 實際掛機：野外精英機率 100%、T15 異界全部精英，各打 5 分鐘不出錯
for (const mode of ['field', 'map']) {
    setup('dragonValley');
    player.lv = 80; player.baseHp = 6000; player.hp = calcStats().maxHp;
    const w = addItem('dkFlameSword', 1); w.ench = 9; equipItem(w.uid, true); addItem('redPotion', 3000);
    hunt = null; startHunt();
    if (mode === 'map') player.mapRun = { t: 15, zone: 'dragonValley', mods: ['elite'], left: 300, total: 300, q: 'rare' };
    const FR = eliteFieldRoll; if (mode === 'field') eliteFieldRoll = x => { chance = () => true; try { FR(x); } finally { chance = CHANCE; } };
    chance = CHANCE;
    let elites = 0, kills0 = player.kills;
    for (let t = 0; t < 5 * 60 * 10; t++) { gameNow += 100; huntTick(100); cleanBuffs(); if (t % 50 === 0) regenTick();
        if (hunt && hunt.mobs) for (const x of hunt.mobs) if (x.eliteAf && !x._counted) { x._counted = true; elites++; }
        if (player.hp <= 0 || !player.hunting) { player.hp = calcStats().maxHp; player.hunting = true; hunt = null; startHunt(); } }
    eliteFieldRoll = FR;
    console.log(mode, '5 分鐘擊殺', player.kills - kills0, '出現詞條精英', elites);
    assert(elites > 0 && player.kills > kills0);
}
console.log('PASS 精英詞條：階級 1/1～2/2～3 條、經驗 +50%/條、野外 3%（塔／龍穴／異界無精英詞綴／離線不出）、護盾、復甦、分裂、召喚上限、狂暴、吸血、魔力燃燒、燃燒附加、反傷不致死、瞬移、野外不保證掉裝備、實際掛機。');
`, ctx);
