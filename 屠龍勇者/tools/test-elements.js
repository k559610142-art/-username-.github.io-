// 元素系統（data/elements.js，第 316 節）隔離測試：正式遊戲 VM，不讀寫存檔、不連線。
const fs = require('fs'), path = require('path'), vm = require('vm'), assert = require('assert/strict');
const prefix = fs.readFileSync(path.join(__dirname, 'test-mercenary.js'), 'utf8').split('ctx.assert = assert;')[0];
const ctx = new Function('require', '__dirname', prefix + '\nreturn ctx;')(require, __dirname);
ctx.assert = assert;
vm.runInContext(String.raw`
saveGame = () => {}; refreshUI = () => {}; showToast = () => {}; sfx = () => {}; sfxHit = () => {};
worldVfxEmit = () => {}; worldVfxSkill = () => {}; worldVfxAttack = () => {}; worldVfxSupport = () => {}; worldVfxEnemy = () => {};
gameAlert = () => {}; useHomeScroll = () => false; checkAutoHome = () => {}; moveToTown = () => {}; outOfAmmo = () => {}; addLog = () => {};
lootMode = 'legacy'; SIM_MODE = false; scene = null; const CHANCE = chance, RND = Math.random;
let uid = 5000;
function setup(cls = 'knight') {
    gameNow = 100000; createPlayer('元素測試', cls, CLASSES[cls].base); player.lv = 70; player.baseHp = 3000; player.baseMp = 2000;
    for (const k of Object.keys(player.equip)) player.equip[k] = null;
    player.hp = calcStats().maxHp; player.mp = calcStats().maxMp; player.loc = { type: 'zone', id: 'dragonValley' }; player.hunting = true;
    hunt = { state: 'fight', mon: null, mobs: [], pCd: 0, joinCd: 9e9, timer: 0, warned: {} }; session = { start: gameNow, kills: 0, exp: 0, gold: 0 };
}
function mob(id = 'skeleton', hp = 100000) { const m = makeMonster(id); m.boss = false; m.hp = m.maxHp = hp; m.ac = 10; m.mr = 0; addMob(m); m.atkCd = 9e9; return m; }
function wearU(key) { const d = ITEMS['uq_' + key]; const slot = d.cat === 'weapon' ? 'weapon' : d.slot === 'ring' ? 'ring1' : d.slot; player.equip[slot] = { uid: ++uid, id: 'uq_' + key, n: 1, ench: 0 }; }

// ① 技能元素
const sk = n => classSkillList('mage').find(s => s.name === n);
assert.equal(skillElem(sk('火球術')), 'fire'); assert.equal(skillElem(sk('冰矛')), 'ice'); assert.equal(skillElem(sk('極光雷電')), 'light');
assert.equal(skillElem(sk('光箭')), null, '聖光不是元素'); assert.equal(skillElem({ name: 'x', elem: 'storm' }), 'light'); assert.equal(skillElem({ name: 'x', elem: 'holy' }), null);
// ② 怪物抗性
assert.deepEqual(monElemRes(makeMonster('salamander')), { fire: 0.5, ice: -0.25, light: 0 });
assert.deepEqual(monElemRes(makeMonster('yeti')), { fire: -0.25, ice: 0.5, light: 0 });
assert.deepEqual(monElemRes(makeMonster('skeleton')), { fire: -0.25, ice: 0.25, light: 0 }, '不死');
assert.deepEqual(monElemRes(makeMonster('valakas')), { fire: 0.75, ice: -0.25, light: 0.25 }, '火龍');
assert.deepEqual(monElemRes(makeMonster('goblin')), { fire: 0, ice: 0, light: 0 });
const tw = { id: 'tower30', name: '火蜥蜴（30F）' }; assert.equal(monElemRes(tw).fire, 0.5, '塔怪用名字對回');
const el = makeMonster('salamander'); el.name = '精英・吸血・護盾 火蜥蜴'; el.id = 'x'; assert.equal(monElemRes(el).fire, 0.5, '精英名字');
for (const id in MONSTERS) { const r = monElemRes(makeMonster(id)); for (const e of ELEM_KEYS) assert(r[e] >= -0.5 && r[e] <= 0.75, id); }
assert.equal(elemTagText(makeMonster('salamander')), '抗🔥 弱❄️');
// ③ 魔法傷害：抗性、弱點、增傷、感電
setup('mage'); let st = calcStats();
const sal = mob('salamander'), yeti = mob('yeti'), gob = mob('goblin');
assert(Math.abs(elemSpellMul(sal, 'fire', st) - 0.5) < 1e-9); assert(Math.abs(elemSpellMul(yeti, 'fire', st) - 1.25) < 1e-9); assert.equal(elemSpellMul(gob, null, st), 1);
st.elem.inc.fire = 0.2; assert(Math.abs(elemMul(gob, 'fire', st) - 1.2) < 1e-9);
gob.elemShock = gameNow + 1000; assert(Math.abs(elemSpellMul(gob, null, calcStats()) - 1.15) < 1e-9);
// 真正 castSpell：火球打火蜥蜴 vs 雪怪
setup('mage'); chance = p => false; Math.random = (r => () => 0.5)(Math.random);
const fb = sk('火球術'); const s1 = mob('salamander'), s2 = mob('yeti'); st = calcStats();
hunt.mon = s1; castSpell(fb, st); const d1 = 100000 - s1.hp; hunt.mon = s2; player.mp = 9999; player.cds = {}; castSpell(fb, calcStats()); const d2 = 100000 - s2.hp;
assert(d2 > d1 * 2.2 && d2 < d1 * 2.8, '火球：雪怪受到約 2.5 倍（' + d1 + ' vs ' + d2 + '）'); Math.random = RND;
// ④ 物理：轉換、附加、異常
setup('knight'); chance = CHANCE; st = calcStats();
st.elem.conv.fire = 0.5; let r = elemPhys(1000, 1, st, mob('goblin')); assert.equal(r.total, 1000); assert.equal(r.parts.fire, 500);
r = elemPhys(1000, 1, st, mob('salamander')); assert.equal(r.total, 750, '火蜥蜴抗火：500 物理＋250 火');
r = elemPhys(1000, 1, st, mob('yeti')); assert.equal(r.total, 1125);
st.elem.conv.ice = 0.8; r = elemPhys(1000, 1, st, mob('goblin')); assert.equal(r.total, 1000, '轉換超過 100% 依比例'); st.elem.conv = { fire: 0, ice: 0, light: 0 };
st.elem.add.light = 10; r = elemPhys(100, 3, st, mob('goblin')); assert(r.parts.light >= 24 && r.parts.light <= 36 && r.total === 100 + r.parts.light, '附加閃電每下');
st.elem.add.light = 0; st.elem.iceToFire = true; st.elem.conv.ice = 1; r = elemPhys(100, 1, st, mob('goblin')); assert.equal(r.parts.fire, 100); assert.equal(r.parts.ice, 0, '冰轉火');
st.elem.fireToLight = true; r = elemPhys(100, 1, st, mob('goblin')); assert.equal(r.parts.light, 100, '冰→火→雷連鎖');
// 異常
setup(); chance = () => true; st = calcStats(); let m = mob('goblin', 1000);
elemOnHit(m, { fire: 100 }, st); assert.equal(m.elemIgnite.v, 20); gameNow += 1000; elementsTick(); assert.equal(m.hp, 980); gameNow += 4000; elementsTick(); elementsTick(); assert(!m.elemIgnite || m.elemIgnite.until <= gameNow);
elemOnHit(m, { ice: 50 }, st); assert(m.elemChill > gameNow); assert(Math.abs(elemChillMul(m) - 1 / 0.7) < 1e-9); assert(!(m.stunUntil > gameNow), '50 < 10% 不凍');
elemOnHit(m, { ice: 200 }, st); assert(m.stunUntil > gameNow, '冰凍');
const bm = mob('goblin', 1000); bm.boss = true; elemOnHit(bm, { ice: 900 }, st); assert(!(bm.stunUntil > gameNow), '首領不凍');
elemOnHit(m, { light: 5 }, st); assert.equal(elemShockMul(m), 1.15);
chance = () => false; const m2 = mob('goblin'); elemOnHit(m2, { fire: 100, ice: 100, light: 100 }, st); assert(!m2.elemIgnite && !m2.elemChill && !m2.elemShock);
let hitN = 0; chance = CHANCE; for (let i = 0; i < 4000; i++) { const x = makeMonster('goblin'); x.hp = x.maxHp = 1e6; elemOnHit(x, { light: 1 }, st); if (x.elemShock) hitN++; } assert(hitN > 680 && hitN < 920, '異常 20% ' + hitN / 4000);
// ⑤ 詞綴與元素石
setup(); const it = { uid: 1, id: 'katana', n: 1, ench: 0, il: 80 };
for (let i = 0; i < 30; i++) { elemStoneAffix(it); assert.equal(it.af.filter(a => a.ex).length, 1); const a = it.af.find(a => a.ex); assert(a.v >= 0.2 && a.v <= 0.5 && /^conv/.test(a.k)); }
applyAffixes(it, 'rare', 80); assert.equal(it.af.filter(a => a.ex).length, 1, '混沌重洗保留元素石'); awakenAffix(it); assert(it.af.some(a => a.ex) && it.af.some(a => a.sx), '覺醒＋元素石並存');
for (let i = 0; i < 20; i++) if (currencyCan('curAnnul', it)) removeRandomAffix(it); assert(it.af.some(a => a.ex), '剝離不移除元素石');
assert.equal(currencyCan('curElement', { id: 'uq_forgeheart', n: 1 }), false, '傳奇不能用'); assert.equal(currencyCan('curElement', { id: 'leatherArmor', n: 1 }), false, '只有武器'); assert(currencyCan('curElement', { id: 'katana', n: 1 }));
player.equip.weapon = it; assert(calcStats().elem.conv[it.af.find(a => a.ex).k.replace('conv', '').toLowerCase()] > 0, '轉換算進能力');
assert(['fireInc', 'iceInc', 'lightInc', 'addFire', 'addIce', 'addLight'].every(k => AFFIXES[k] && affixAllowed(k, ITEMS.katana)));
assert(!affixAllowed('addFire', ITEMS.leatherArmor) && affixAllowed('fireInc', ITEMS[Object.keys(ITEMS).find(id => ITEMS[id].slot === 'helm')]));
// ⑥ 轉換類傳奇
setup(); wearU('forgeheart'); st = calcStats(); assert.equal(st.elem.conv.fire, 0.5); assert(Math.abs(st.elem.inc.fire - 0.3) < 1e-9);
setup(); wearU('dualflame'); assert.equal(calcStats().elem.iceToFire, true); assert.equal(elemSpellElem(sk('冰矛'), calcStats()), 'fire');
setup(); player.equip.amulet = { uid: ++uid, id: 'uq_stormeye', n: 1, ench: 0 }; wearU('dualflame'); assert.equal(elemSpellElem(sk('冰矛'), calcStats()), 'light', '冰火同源＋風暴之眼：冰→火→雷');
setup(); wearU('elementalist'); st = calcStats(); assert.equal(st.elem.physMul, 0.5); assert(Math.abs(st.elem.ailment - 0.15) < 1e-9);
assert(uniqueInfoHtml(ITEMS.uq_dualflame).includes('冰冷傷害全部轉為火焰') && !uniqueInfoHtml(ITEMS.uq_dualflame).includes('iceToFire'));
// ⑦ 實際掛機：法師（火、冰）與騎士（熔爐之心＋附加傷害）各 3 分鐘
chance = CHANCE;
for (const [cls, gear] of [['mage', []], ['knight', ['forgeheart']], ['elf', ['frostvein']]]) {
    setup(cls); for (const g of gear) wearU(g);
    if (cls === 'elf') { addItem('arrow', 100000); player.ammoId = 'arrow'; }
    player.skills = classSkillList(cls).filter(s => { const nl = skillNeedLv(s, cls); return nl && nl <= 60; }).map(s => s.id);
    player.settings.bar = defaultBar(player); normalizeBar(player); addItem('redPotion', 2000); addItem('bluePotion', 500);
    player.hp = calcStats().maxHp; player.mp = calcStats().maxMp; hunt = null; startHunt(); const k0 = player.kills; let ail = 0;
    for (let t = 0; t < 3 * 60 * 10; t++) { gameNow += 100; huntTick(100); cleanBuffs(); if (t % 50 === 0) regenTick();
        if (hunt && hunt.mobs) for (const x of hunt.mobs) if ((x.elemIgnite || x.elemChill || x.elemShock) && !x._c) { x._c = 1; ail++; }
        if (player.hp <= 0 || !player.hunting) { player.hp = calcStats().maxHp; player.hunting = true; hunt = null; startHunt(); } }
    console.log(cls, gear.join('') || '（無傳奇）', '3 分鐘擊殺', player.kills - k0, '中元素異常的怪', ail);
    assert(player.kills > k0); if (cls !== 'mage' || true) assert(ail > 0, cls + ' 應有異常');
}
console.log('PASS 元素：技能元素、怪物抗性（含塔怪／精英名字）、魔法抗性與弱點（真正 castSpell）、物理轉換／附加／互轉連鎖、點燃／冰緩／冰凍／感電與 20% 機率、詞綴與元素石（重洗剝離保留、只限武器、傳奇不行）、6 件轉換傳奇、三職業實際掛機。');
`, ctx);
