// 傳奇裝備（data/uniques.js，第 315 節）隔離測試：正式遊戲 VM，不讀寫存檔、不連線。逐一驗證 20 件的特殊效果。
const fs = require('fs'), path = require('path'), vm = require('vm'), assert = require('assert/strict');
const prefix = fs.readFileSync(path.join(__dirname, 'test-mercenary.js'), 'utf8').split('ctx.assert = assert;')[0];
const ctx = new Function('require', '__dirname', prefix + '\nreturn ctx;')(require, __dirname);
ctx.assert = assert;
vm.runInContext(String.raw`
saveGame = () => {}; refreshUI = () => {}; showToast = () => {}; sfx = () => {}; sfxHit = () => {};
worldVfxEmit = () => {}; worldVfxSkill = () => {}; worldVfxAttack = () => {}; worldVfxSupport = () => {}; worldVfxEnemy = () => {}; worldVfxLoot = () => {};
gameAlert = () => {}; useHomeScroll = () => false; checkAutoHome = () => {}; moveToTown = () => {}; outOfAmmo = () => {};
lootMode = 'legacy'; SIM_MODE = false; scene = null; const CHANCE = chance;
addLog = () => {};
let uid = 9000;
function setup(cls = 'knight') {
    gameNow = 100000; createPlayer('傳奇測試', cls, CLASSES[cls].base); player.lv = 70;
    player.baseHp = 2000; player.baseMp = 1000; for (const k of Object.keys(player.equip)) player.equip[k] = null;
    player.hp = calcStats().maxHp; player.mp = calcStats().maxMp;
    player.loc = { type: 'zone', id: 'dragonValley' }; player.hunting = true; player.mapRun = null;
    hunt = { state: 'fight', mon: null, mobs: [], pCd: 0, joinCd: 9e9, timer: 0, warned: {} };
    session = { start: gameNow, kills: 0, exp: 0, gold: 0 };
    uqRuntime.delete(player);
}
function wear(key) {
    const id = 'uq_' + key, d = ITEMS[id];
    const slot = d.cat === 'weapon' ? 'weapon' : d.slot === 'ring' ? (player.equip.ring1 ? 'ring2' : 'ring1') : d.slot;
    player.equip[slot] = { uid: ++uid, id, n: 1, ench: 0 };
    return slot;
}
function mob(hp = 100000, extra = {}) { const m = makeMonster('skeleton'); m.boss = false; m.hp = m.maxHp = hp; m.ac = 10; Object.assign(m, extra); addMob(m); m.atkCd = 9e9; return m; }

// ── 資料：20 件、代號、Lv.60、不能改造、不進隨機池 ──
assert.equal(UNIQUE_IDS.length, 26);   // 第一期 20＋第二期轉換類 6
for (const id of UNIQUE_IDS) { const d = ITEMS[id]; assert(d.unique && d.reqLv === 60 && d.uqFx, id); assert(d.cat === 'weapon' ? WEAPON_TYPES[d.type] : SLOTS[d.slot === 'ring' ? 'ring1' : d.slot], id + ' 部位'); }
for (let i = 0; i < 300; i++) assert(!ITEMS[randomEquipFor(99)].unique, '隨機裝備池不出傳奇');
setup();
assert.equal(currencyCan('curChaos', { id: 'uq_undertow', n: 1 }), false); assert.equal(currencyCan('curAug', { id: 'uq_undertow', n: 1 }), false);
player.lv = 59; assert.match(canEquip(ITEMS.uq_undertow), /Lv\.60/); player.lv = 60; assert.equal(canEquip(ITEMS.uq_undertow), '');
assert.equal(itemClass({ id: 'uq_midas', n: 1 }), 'q-unique'); assert(uniqueInfoHtml(ITEMS.uq_midas).includes('金幣加成'));
// 固定詞綴算進能力
setup(); const hp0 = calcStats().maxHp; wear('undertow'); assert.equal(calcStats().maxMp, player.baseMp + 200); assert.equal(calcStats().maxHp, hp0);

// 1 斷罪者：第 4 下必爆 ×2
setup('knight'); wear('condemner'); let m = mob(); const st1 = calcStats();
const rolls = [1, 2, 3, 4, 5, 6, 7, 8].map(() => uniqueCritRoll(st1)); assert.deepEqual(rolls.map(x => !!x), [false, false, false, true, false, false, false, true]); assert.equal(rolls[3], st1.critDmg * 2);
// 2 血契之刃：吸血 ×3、不能喝紅水、自動補水不觸發
setup('knight'); const ls0 = calcStats().lifesteal; wear('bloodpact'); assert(Math.abs(calcStats().lifesteal - (ls0 + 0.04) * 3) < 1e-9);
addItem('redPotion', 5); player.hp = 10; assert.match(usePotion('redPotion'), /血契/); assert.equal(player.hp, 10);
player.settings.potionPct = 90; const pots = countItem('redPotion'); autoSupport(calcStats()); assert.equal(countItem('redPotion'), pots, '自動補水不喝');
// 3 虛空低語：改用 HP 支付
setup('mage'); wear('voidwhisper'); player.mp = 0; player.hp = 1000; assert.equal(uniquePayOk(100), true); uniquePay(100); assert.equal(player.hp, 800); assert.equal(player.mp, 0);
player.hp = 150; assert.equal(uniquePayOk(100), false);
// 4 千羽：多射 2 箭、彈藥 ×3
setup('elf'); wear('thousandfeather'); addItem('arrow', 100); player.ammoId = 'arrow';
m = mob(); const a = mob(), b = mob(), c = mob(); hunt.mon = m; chance = () => true;
const arrows0 = countItem('arrow'); physicalAttack(calcStats(), 1, {}, m);
assert.equal(arrows0 - countItem('arrow'), 3, '一次消耗 3 支'); assert.equal([a, b, c].filter(x => x.hp < 100000).length, 2, '另外打 2 隻'); chance = CHANCE;
// 5 雷鳴獨眼：攻速 −30%、傷害 ×1.8、無視防禦
setup('gunner'); player.equip.weapon = { uid: ++uid, id: 'rifle', n: 1, ench: 0 }; const ms0 = calcStats().atkMs;
wear('thundereye'); assert(Math.abs(calcStats().atkMs - Math.round(ms0 / 0.7)) <= 2, '攻速 −30%'); assert.equal(uniqueDmgMul(false), 1.8); assert.equal(uniqueIgnoreAc(), true);
// 6 影噬：擊殺回 5%、攻速疊 3 層
setup('darkelf'); wear('shadowmaw'); const ms6 = calcStats().atkMs; player.hp = 100; player.mp = 0;
for (let i = 0; i < 4; i++) { m = mob(10); m.hp = 0; reapMobs(); }
assert(player.hp > 100 && player.mp > 0); assert.equal(uqRt().devour.length, 3); assert(calcStats().atkMs < ms6);
gameNow += 3500; assert.equal(calcStats().atkMs, ms6, '3 秒後層數消失');
// 7 哀嚎收割：非首領 < 20% 斬殺，首領不會
setup('demon'); wear('wailingharvest'); m = mob(1000); m.hp = 150; const bossM = mob(1000, { boss: true }); bossM.hp = 100; reapMobs(); assert(!hunt.mobs.includes(m)); assert(hunt.mobs.includes(bossM));
// 8 逆流之心：30% 由 MP 承受
setup(); wear('undertow'); player.mp = 1000; let st = calcStats(); assert.equal(uniqueIncoming(mob(), 100, false, st), 70); assert.equal(player.mp, 970);
player.mp = 5; assert.equal(uniqueIncoming(mob(), 100, false, st), 95);
// 9 狂戰之顱：每少 10% 傷害 +6%、治療 −50%
setup(); wear('berserkskull'); st = calcStats(); player.hp = st.maxHp; assert.equal(uniqueDmgMul(false), 1); player.hp = Math.floor(st.maxHp * 0.45); assert(Math.abs(uniqueDmgMul(false) - 1.30) < 1e-9); assert.equal(afflictHealMul(), 0.5);
// 10 荊棘織衣：受傷 +10%、反彈 30%
setup(); wear('thornweave'); m = mob(1000); assert.equal(uniqueIncoming(m, 100, true, calcStats()), 110); assert.equal(m.hp, 1000 - 33);
// 11 幻影披風：閃避後下一擊必爆
setup(); wear('phantomcloak'); st = calcStats(); assert.equal(uniqueCritRoll(st), null); uniqueOnDodge(); assert.equal(uniqueCritRoll(st), st.critDmg); assert.equal(uniqueCritRoll(st), null);
// 12 點金之手：金幣 +50%、傷害 −10%
setup(); const gp0 = calcStats().goldPct; wear('midas'); assert(Math.abs(calcStats().goldPct - gp0 - 0.5) < 1e-9); assert(Math.abs(uniqueDmgMul(false) - 0.9) < 1e-9);
// 13 殉道者的長靴：HP < 50% 攻速 +30%、不自然回血
setup(); wear('martyr'); st = calcStats(); const ms13 = st.atkMs; player.hp = Math.floor(st.maxHp * 0.4); assert(calcStats().atkMs < ms13);
const h13 = player.hp; regenTick(); assert.equal(player.hp, h13);
// 14 堅守誓約：25% 擋下、回 2%、攻速 −10%
setup(); const ms14 = calcStats().atkMs; wear('oathshield'); assert(calcStats().atkMs > ms14); player.hp = 100; chance = () => true; assert.equal(uniqueBlock(mob(), calcStats()), true); assert(player.hp > 100); chance = CHANCE;
let blocks = 0; for (let i = 0; i < 4000; i++) if (uniqueBlock(mob(), calcStats())) blocks++; assert(blocks > 850 && blocks < 1150, '擋下機率 ' + blocks / 4000);
// 15 獵魂者之索：擊殺精英獲得詞條 20 秒
setup(); wear('soulhunter'); st = calcStats(); const ls15 = st.lifesteal, dg15 = st.dodge;
m = mob(10); m.elite = true; m.eliteAf = ['vamp', 'shield', 'revive', 'blink', 'berserk']; m.eliteRevived = true; m.hp = 0; reapMobs();   // 已經復甦過，這次真的倒下
st = calcStats(); assert(Math.abs(st.lifesteal - ls15 - 0.05) < 1e-9); assert(st.dodge > dg15); assert(uqRt().hhShield > 0); assert.equal(uqRt().hhRevive, true);
assert(uniqueHhText().includes('吸血'));
const shield = uqRt().hhShield; assert.equal(uniqueIncoming(mob(), 10, false, st), 0); assert.equal(uqRt().hhShield, shield - 10);
player.hp = 0; assert.equal(uniquePreventDeath(st), true); assert(player.hp > 0); player.hp = 0; assert.equal(uniquePreventDeath(st), false, '只免死一次');
gameNow += 20001; st = calcStats(); assert(Math.abs(st.lifesteal - ls15) < 1e-9, '20 秒後消失');
// 獵魂者：燃燒持續傷害、分裂
setup(); wear('soulhunter'); uqRt().hh.blaze = gameNow + 20000; m = mob(1000); uniqueOnHit(m, 200, false); gameNow += 1000; uniqueTick(); assert.equal(m.hp, 980);
// 16 無底行囊：藥水 +30%、回 MP、延遲 +50%、負重 +2000
setup(); const wm = calcStats().weightMax; wear('bottomless'); assert.equal(calcStats().weightMax, wm + 2000 + 80);   // 體質 +1 也加負重 80
addItem('redPotion', 3); player.hp = 1; player.mp = 0; potReadyAt = 0; usePotion('redPotion'); assert(player.mp > 0); assert.equal(potReadyAt, gameNow + POTION_CD_MS * 1.5);
// 17 虛空之戒：魔爆必定、魔法 −40%
setup('mage'); wear('voidring'); assert.equal(calcStats().magicCrit, 1); assert(Math.abs(uniqueDmgMul(true) - 0.6) < 1e-9); assert.equal(uniqueDmgMul(false), 1);
// 18 賭徒之指：爆擊率 ×2、沒爆 −20%
setup(); const cr = calcStats().crit; wear('gambler'); assert(Math.abs(calcStats().crit - cr * 2) < 1e-9); assert.equal(uniqueNoCritMul(), 0.8);
// 19 傭兵之誓：傭兵 +40%、自己 −15%
setup(); player.mercenary = { cls: 'war', lv: 30, exp: 0, hp: 1, mp: 1, active: true, dead: false, equip: {}, skills: ['', '', '', ''], cds: {} };
const ms19 = mercStats(player.mercenary); wear('mercoath'); const ms19b = mercStats(player.mercenary);
assert.equal(ms19b.hp, Math.round(ms19.hp * 1.4)); assert(Math.abs(ms19b.atk - ms19.atk * 1.4) < 1e-9); assert(Math.abs(uniqueDmgMul(false) - 0.85) < 1e-9);
// 20 時之沙漏：冷卻 −25%、MP +40%
setup('knight'); const k = classSkillList('knight').find(s => s.cd && s.mp); const cd0 = skillCd(k), mp0 = talentManaCost(k);
wear('hourglass'); assert.equal(skillCd(k), Math.round(cd0 * 0.75 * 10) / 10); assert.equal(talentManaCost(k), Math.ceil(k.mp * 1.4 * (mp0 / k.mp)) || talentManaCost(k));
// 掉落（本機模式）：只有稀有 T11～T15 異界首領
setup(); const boss = { mapBoss: true };
player.mapRun = { t: 15, q: 'rare', zone: 'dragonValley', mods: [] }; chance = () => true; assert(UNIQUE_IDS.includes(uniqueDropFor(boss)));
player.mapRun.q = 'magic'; assert.equal(uniqueDropFor(boss), null); player.mapRun.q = 'rare'; player.mapRun.t = 10; assert.equal(uniqueDropFor(boss), null);
player.mapRun.t = 15; assert.equal(uniqueDropFor({ boss: true }), null); chance = CHANCE;
let n = 0; for (let i = 0; i < 20000; i++) if (uniqueDropFor(boss)) n++; assert(n > 480 && n < 720, 'T15 3% ' + n / 20000);
// 實際掛機：穿全套 9 件（不同部位）打 3 分鐘不出錯
for (const cls of ['knight', 'gunner', 'mage']) {
    setup(cls); player.loc = { type: 'zone', id: 'dragonValley' };
    const keys = { knight: ['condemner', 'undertow', 'berserkskull', 'thornweave', 'phantomcloak', 'midas', 'martyr', 'oathshield', 'soulhunter', 'voidring', 'gambler', 'hourglass'],
        gunner: ['thundereye', 'undertow', 'phantomcloak', 'bottomless', 'gambler', 'voidring', 'mercoath'], mage: ['voidwhisper', 'undertow', 'berserkskull', 'voidring', 'hourglass', 'oathshield'] }[cls];
    for (const key of keys) wear(key);
    if (cls === 'gunner') { addItem('bullet', 100000); player.ammoId = 'bullet'; }
    player.skills = classSkillList(cls).filter(s => { const nl = skillNeedLv(s, cls); return nl && nl <= 60; }).map(s => s.id);
    player.settings.bar = defaultBar(player); normalizeBar(player); addItem('redPotion', 2000);
    player.hp = calcStats().maxHp; player.mp = calcStats().maxMp; hunt = null; startHunt(); const k0 = player.kills;
    for (let t = 0; t < 3 * 60 * 10; t++) { gameNow += 100; huntTick(100); cleanBuffs(); if (t % 50 === 0) regenTick();
        if (player.hp <= 0 || !player.hunting) { player.hp = calcStats().maxHp; player.hunting = true; hunt = null; startHunt(); } }
    console.log(cls, '穿', keys.length, '件傳奇打 3 分鐘，擊殺', player.kills - k0);
    assert(player.kills > k0);
}
console.log('PASS 傳奇裝備：26 件資料／Lv.60／不能改造／不進隨機池、固定詞綴、20 種特殊效果逐一驗證、本機掉落條件與 3% 機率、三職業全套實際掛機。');
`, ctx);
