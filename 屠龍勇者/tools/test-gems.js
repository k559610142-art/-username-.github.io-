// 裝備開孔＋技能／輔助寶石（data/gems.js，第 317 節）隔離測試：正式遊戲 VM，不讀寫存檔、不連線。
const fs = require('fs'), path = require('path'), vm = require('vm'), assert = require('assert/strict');
const prefix = fs.readFileSync(path.join(__dirname, 'test-mercenary.js'), 'utf8').split('ctx.assert = assert;')[0];
const ctx = new Function('require', '__dirname', prefix + '\nreturn ctx;')(require, __dirname);
ctx.assert = assert;
vm.runInContext(String.raw`
saveGame = () => {}; refreshUI = () => {}; showToast = () => {}; sfx = () => {}; sfxHit = () => {}; openDialog = () => {};
worldVfxEmit = () => {}; worldVfxSkill = () => {}; worldVfxAttack = () => {}; worldVfxSupport = () => {}; worldVfxEnemy = () => {};
gameAlert = () => {}; useHomeScroll = () => false; checkAutoHome = () => {}; moveToTown = () => {}; outOfAmmo = () => {}; addLog = () => {};
lootMode = 'legacy'; SIM_MODE = false; scene = null; const CHANCE = chance, RND = Math.random;
const SEL = {}; document.getElementById = id => SEL[id] ? { value: SEL[id] } : null;
let uid = 7000;
function setup(cls = 'knight') {
    gameNow = 100000; createPlayer('寶石測試', cls, CLASSES[cls].base); player.lv = 70; player.baseHp = 3000; player.baseMp = 3000; player.gold = 1e7;
    for (const k of Object.keys(player.equip)) player.equip[k] = null;
    player.hp = calcStats().maxHp; player.mp = calcStats().maxMp; player.loc = { type: 'zone', id: 'dragonValley' }; player.hunting = true;
    hunt = { state: 'fight', mon: null, mobs: [], pCd: 0, joinCd: 9e9, timer: 0, warned: {} }; session = { start: gameNow, kills: 0, exp: 0, gold: 0 };
}
function mob(hp = 100000) { const m = makeMonster('goblin'); m.boss = false; m.hp = m.maxHp = hp; m.ac = 10; m.mr = 0; addMob(m); m.atkCd = 9e9; return m; }
function gear(id, n, ln) { const it = { uid: ++uid, id, n: 1, ench: 0, so: Array(n).fill(null), ln: ln || Array(Math.max(0, n - 1)).fill(1) }; return it; }
const sup = (k, gl = 1) => ({ uid: ++uid, id: 'gem_' + k, n: 1, gl, gx: 0 });
const skG = sk => ({ t: 'skill', sk });

// ① 孔數上限
const two = Object.keys(ITEMS).find(id => ITEMS[id].cat === 'weapon' && WEAPON_TYPES[ITEMS[id].type].two), one = 'katana';
assert.equal(gemMaxSockets(ITEMS[two]), 6); assert.equal(gemMaxSockets(ITEMS[one]), 3);
assert.equal(gemMaxSockets(ITEMS.leatherArmor), 6);
for (const s of ['helm', 'tshirt', 'cloak', 'gloves', 'boots', 'shield']) assert.equal(gemMaxSockets(ITEMS[Object.keys(ITEMS).find(id => ITEMS[id].slot === s)]), 4, s);
for (const s of ['ring', 'amulet', 'belt']) assert.equal(gemMaxSockets(ITEMS[Object.keys(ITEMS).find(id => ITEMS[id].slot === s)]), 0, s);
// ② 掉落擲孔：品質越高越多、不超過上限；6 連少見
let six = 0, sum = { 0: 0, 2: 0 };
for (let i = 0; i < 4000; i++) {
    const a = gemRollSockets({ id: 'leatherArmor', n: 1 }), b = gemRollSockets({ id: 'leatherArmor', n: 1, q: 'rare' });
    for (const x of [a, b]) if (x.so) { assert(x.so.length >= 1 && x.so.length <= 6 && x.ln.length === x.so.length - 1); }
    sum[0] += a.so ? a.so.length : 0; sum[2] += b.so.length;
    if (b.so.length === 6 && b.ln.every(Boolean)) six++;
    const r = gemRollSockets({ id: 'strRing', n: 1, q: 'rare' }); assert(!r.so, '戒指沒有孔');
    const w = gemRollSockets({ id: one, n: 1, q: 'legend' }); assert(w.so.length <= 3);
}
assert(sum[2] > sum[0] * 2, '稀有孔比較多'); assert(six < 40, '6 連少見 ' + six);
const keep = { id: 'leatherArmor', n: 1, so: [null], ln: [] }; gemRollSockets(keep); assert.equal(keep.so.length, 1, '已有孔不重擲');
// ③ 開孔石、連結石（要先清空；傳奇可以）
setup(); let it = gear('leatherArmor', 3, [1, 0]);
assert(currencyCan('curSocket', it)); assert(currencyCan('curLink', it));
it.so[0] = sup('leechG'); assert(!currencyCan('curSocket', it), '有寶石不能重擲'); assert(!currencyCan('curLink', it)); it.so[0] = null;
for (let i = 0; i < 300; i++) { gemSocketStone(it); assert(it.so.length >= 1 && it.so.length <= 6 && it.ln.length === it.so.length - 1); }
assert(currencyCan('curSocket', { id: 'uq_undertow', n: 1 }), '傳奇可以開孔'); assert(!currencyCan('curChaos', { id: 'uq_undertow', n: 1 }));
assert(!currencyCan('curSocket', { id: 'strRing', n: 1 }));
// ④ 串聯群組與輔助效果
setup(); it = gear('leatherArmor', 6, [1, 1, 0, 1, 1]);
assert.deepEqual(gemGroups(it), [[0, 1, 2], [3, 4, 5]]);
it.so = [skG(GEM_ATTACK_ID), sup('multistrike', 10), sup('leechG', 20), skG('x'), sup('cdrG', 5), null];
player.equip.armor = it;
let m = gemModsOf(GEM_ATTACK_ID); assert.equal(m.hitsAdd, 1); assert(Math.abs(m.dmgMul - 0.7) < 1e-9); assert(Math.abs(m.leech - 0.05) < 1e-9); assert.equal(m.cdMul, 1, '冷卻縮減在另一串');
assert(Math.abs(gemModsOf('x').cdMul - 0.85) < 1e-9); assert.equal(gemModsOf('nothing'), null);
it.ln = [0, 0, 0, 0, 0]; assert.equal(gemModsOf(GEM_ATTACK_ID).hitsAdd, 0, '沒串聯沒效果');
// ⑤ 普攻：多重打擊多打一下
setup(); it = gear('leatherArmor', 2); it.so = [skG(GEM_ATTACK_ID), sup('multistrike', 1)]; player.equip.armor = it;
chance = p => p > 0; Math.random = () => 0.5; let x = mob(); const st = calcStats(); physicalAttack(st, 1, {}, x); const dMulti = 100000 - x.hp;
player.equip.armor = null; x = mob(); physicalAttack(calcStats(), 1, {}, x); const dOne = 100000 - x.hp;
assert(dMulti > dOne * 1.1 && dMulti < dOne * 1.4, '多打一下：2 下 × 0.61 ≈ 1.22 倍（' + dOne + ' → ' + dMulti + '）');
Math.random = RND; chance = CHANCE;
// ⑥ 魔法：範圍、附加火焰、連鎖、耗魔、冷卻
setup('mage'); const fb = classSkillList('mage').find(s => s.name === '火球術'); player.skills.push(fb.id);
it = gear('leatherArmor', 5); it.so = [skG(fb.id), sup('aoeExpand', 10), sup('addFireG', 20), sup('efficiency', 10), sup('cdrG', 10)]; player.equip.armor = it;
assert.equal(talentManaCost(fb), Math.ceil(fb.mp * 0.7)); assert.equal(skillCd(fb), Math.round(fb.cd * 0.8 * 10) / 10 || skillCd(fb));
const a1 = mob(), a2 = mob(), a3 = mob(); hunt.mon = a1; player.mp = 9999; castSpell(fb, calcStats());
assert([a1, a2, a3].every(z => z.hp < 100000), '範圍擴大：三隻都打到');
it.so[1] = sup('chainG', 12); it.so[2] = null; const b1 = mob(), b2 = mob(), b3 = mob(); hunt.mobs = [b1, b2, b3]; hunt.mon = b1; player.cds = {}; player.mp = 9999; castSpell(fb, calcStats());
assert(b1.hp < 100000 && b2.hp < 100000 && b3.hp < 100000, '連鎖 2 隻（Lv.12）');
// ⑦ 殘忍：去掉元素、物理 ×1.5
setup(); const w = gear('uq_forgeheart', 2); w.so = [skG(GEM_ATTACK_ID), sup('brutality', 20)]; player.equip.weapon = w;
const st7 = gemSt(calcStats(), gemModsOf(GEM_ATTACK_ID)); assert.equal(st7.elem.conv.fire, 0); assert(Math.abs(st7.elem.physMul - 1.5) < 1e-9);
// ⑧ 經驗：10%、升級、最高 20
setup(); it = gear('leatherArmor', 2); const g = sup('leechG', 1); it.so = [skG(GEM_ATTACK_ID), g]; player.equip.armor = it;
gemGainExp(14000); assert.equal(g.gl, 1); assert.equal(g.gx, 1400); gemGainExp(1e6); assert(g.gl > 1); for (let i = 0; i < 50; i++) gemGainExp(1e8); assert.equal(g.gl, 20); assert.equal(g.gx, 0);
let total = 0; for (let L = 1; L < 20; L++) total += gemExpNeed(L); assert(total > 3e6 && total < 4e6, '1→20 約 370 萬 ' + total);
const e0 = totalExpOf(player); x = mob(10); x.exp = 1000; x.hp = 0; reapMobs(); assert(totalExpOf(player) - e0 >= 1000 * huntExpRate(player.lv) - 1, '玩家經驗不變');
// ⑨ 鑲嵌／拆下：從背包拿、技能寶石免費、輔助寶石等級 × 2000
setup(); it = gear('leatherArmor', 2); player.inv.push(it); const gi = { uid: ++uid, id: 'gem_leechG', n: 1, gl: 7, gx: 123 }; player.inv.push(gi);
SEL['gem-sel-0'] = 's:' + GEM_ATTACK_ID; gemSocketPut(it.uid, 0); assert.deepEqual(it.so[0], { t: 'skill', sk: GEM_ATTACK_ID });
SEL['gem-sel-1'] = 'g:' + gi.uid; gemSocketPut(it.uid, 1); assert.equal(it.so[1].gl, 7); assert(!player.inv.includes(gi));
SEL['gem-sel-1'] = 's:notLearned'; gemSocketPut(it.uid, 1); assert.equal(it.so[1].gl, 7, '已有寶石不能再放');
const gold0 = player.gold; gemSocketTake(it.uid, 1); assert.equal(player.gold, gold0 - 14000); const back = player.inv.find(z => z.uid === gi.uid); assert(back && back.gl === 7 && back.gx === 123);
gemSocketTake(it.uid, 0); assert.equal(player.gold, gold0 - 14000, '技能寶石免費'); assert(!player.inv.some(z => z.t === 'skill'));
player.gold = 100; it.so[1] = sup('leechG', 3); gemSocketTake(it.uid, 1); assert(it.so[1], '金幣不足不能拆');
SEL['gem-sel-0'] = 's:notLearned'; gemSocketPut(it.uid, 0); assert.equal(it.so[0], null, '沒學會的技能不能做技能寶石');
// ⑩ 簽章：沒有孔的道具不變；有孔、寶石等級改變簽章
const plain = { uid: 5, id: 'katana', n: 1, ench: 3, q: 'rare', af: [{ k: 'dmg', v: 3 }] };
assert.equal(guardItemCanon(plain), '5,katana,1,3,rare,dmg:3');
const sock = { ...plain, so: [{ t: 'skill', sk: 'fireball' }, null, { uid: 9, id: 'gem_leechG', n: 1, gl: 4, gx: 10 }], ln: [1, 0] };
assert.equal(guardItemCanon(sock), '5,katana,1,3,rare,dmg:3,S:sfireball~_~{9,gem_leechG,1,,,,G:4:10},L:10');
const sock2 = JSON.parse(JSON.stringify(sock)); sock2.so[2].gl = 20; assert.notEqual(guardItemCanon(sock2), guardItemCanon(sock));
// ⑪ 說明與名稱
assert.equal(itemName({ id: 'gem_leechG', n: 1, gl: 5 }), '輔助寶石・吸血 Lv.5');
assert(gemSocketsHtml(sock).includes('技能寶石・') && gemInfoHtml({ id: 'gem_chainG', n: 1, gl: 10 }).includes('2 隻'));
assert.equal(SUPPORT_GEM_IDS.length, 13); for (const id of SUPPORT_GEM_IDS) assert(ITEMS[id].cat === 'gem' && !isStackable(ITEMS[id]));
// ⑫ 本機掉落：寶石、新裝備有孔
setup(); let gemN = 0; for (let i = 0; i < 20000; i++) if (gemDropFor({ boss: false })) gemN++; assert(gemN > 30 && gemN < 95, '一般怪 0.3% ' + gemN);
assert.equal(gemDropFor({ boss: true, lootTicket: 1 }), null, '後端那一群不在本機掉');
// ⑬ 實際掛機：騎士普攻 6 連（多重打擊＋附加火焰＋吸血＋暴擊…），法師火球（範圍＋連鎖＋元素集中）
for (const [cls, build] of [['knight', ['multistrike', 'addFireG', 'leechG', 'critBoost', 'elemFocus']], ['mage', ['aoeExpand', 'chainG', 'elemFocus', 'efficiency', 'ailmentG']]]) {
    setup(cls); player.skills = classSkillList(cls).filter(s => { const nl = skillNeedLv(s, cls); return nl && nl <= 60; }).map(s => s.id);
    player.settings.bar = defaultBar(player); normalizeBar(player); addItem('redPotion', 2000); addItem('bluePotion', 500);
    const carrier = cls === 'mage' ? classSkillList('mage').find(s => s.name === '火球術').id : GEM_ATTACK_ID;
    const armor = gear('leatherArmor', 6); armor.so = [skG(carrier), ...build.map(k => sup(k, 10))]; player.equip.armor = armor;
    player.hp = calcStats().maxHp; player.mp = calcStats().maxMp; hunt = null; startHunt(); const k0 = player.kills;
    for (let t = 0; t < 3 * 60 * 10; t++) { gameNow += 100; huntTick(100); cleanBuffs(); if (t % 50 === 0) regenTick();
        if (player.hp <= 0 || !player.hunting) { player.hp = calcStats().maxHp; player.hunting = true; hunt = null; startHunt(); } }
    const lv = armor.so.filter(z => z && z.gx > 0).length;
    console.log(cls, '6 連', build.join('+'), '3 分鐘擊殺', player.kills - k0, '有累積經驗的寶石', lv);
    assert(player.kills > k0 && lv === build.length);
}
console.log('PASS 寶石：孔數上限（雙手 6／單手 3／盔甲 6／其他 4／飾品 0）、掉落擲孔與 6 連機率、開孔石／連結石（要清空、傳奇可用）、串聯群組、輔助效果（多重打擊、範圍、附加火焰、連鎖、耗魔、冷卻、殘忍、吸血）、經驗 10% 與 20 級、鑲嵌拆下與金幣、簽章（舊道具不變）、說明、本機掉落、實際掛機。');
`, ctx);
