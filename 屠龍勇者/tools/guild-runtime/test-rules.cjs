'use strict';
const assert = require('node:assert/strict');
const R = require('./rules.cjs');
const G = require('./core.cjs');
// 每週任務冊（普通）合計＝數值表第1節：聲望1300、代幣130、徽章260。
let rep = 0, tokens = 0, badges = 0;
for (const [category, n] of Object.entries(R.BOOK)) for (let i = 0; i < n; i++) {
    const r = R.reward(category, 'normal'); assert(r.ok); rep += r.rep; tokens += r.tokens; badges += r.badges;
}
const bonus = R.bookBonus(); rep += bonus.rep; tokens += bonus.tokens; badges += bonus.badges;
assert.deepEqual([rep, tokens, badges], [1300, 130, 260]);
// 聲望不隨難度；代幣／徽章乘倍率；冊外25%且無聲望；評價只加代幣最多20%。
assert.deepEqual(R.reward('defense', 'legend'), { ok: true, rep: 150, tokens: 45, badges: 90 });
assert.deepEqual(R.reward('hunt', 'hard'), { ok: true, rep: 100, tokens: 15, badges: 30 });
assert.deepEqual(R.reward('expedition', 'normal', { inBook: false }), { ok: true, rep: 0, tokens: 7, badges: 15 });
assert.equal(R.reward('hunt', 'normal', { rating: 1 }).tokens, 12);
assert.equal(R.reward('hunt', 'normal', { rating: 1 }).badges, 20);
assert.equal(R.reward('hunt', 'normal', { rating: 2 }).code, 'rating_invalid');
assert.equal(R.reward('bookBonus', 'normal').code, 'category_invalid');
assert.equal(R.reward('hunt', 'nightmare').code, 'difficulty_invalid');
// 任務分類對應core目錄：護送算防衛；12任務都能分類。
for (const m of Object.values(G.MISSIONS)) assert(['hunt', 'defense'].includes(R.categoryOf(m)), m.id);
assert.equal(Object.values(G.MISSIONS).filter(m => R.categoryOf(m) === 'hunt').length, 6);
assert.equal(R.categoryOf({ activity: 'personalRecruit' }), 'personal');
assert.equal(R.categoryOf({ activity: 'guildExpedition' }), 'expedition');
assert.equal(R.categoryOf({ activity: 'training' }), null);
// 任務冊計數。
assert.equal(R.inBook({ hunt: 3 }, 'hunt'), true);
assert.equal(R.inBook({ hunt: 4 }, 'hunt'), false);
assert.equal(R.bookProgress({ hunt: 9, defense: 2, personal: 1, expedition: 1 }).complete, true);
assert.equal(R.bookProgress({ hunt: 4, defense: 1, personal: 1, expedition: 1 }).complete, false);
// 聲望階級：每1300一階，第1～3階各開一位招募，3週6人齊。
assert.deepEqual([0, 1299, 1300, 2600, 3899, 3900, 7800, 99999].map(R.repTier), [0, 0, 1, 2, 2, 3, 6, 6]);
assert.deepEqual([0, 1300, 2600, 3900, 7800].map(R.recruitSlots), [0, 1, 2, 3, 3]);
assert.equal(R.nextTierRep(1300), 2600); assert.equal(R.nextTierRep(7800), null);
assert.equal(R.repTier(-1), 0); assert.equal(R.repTier(1.5), 0);
// 團員升級：Lv.n→n+1要n個；區間合計＝數值表第4節。
assert.deepEqual([[1, 20], [20, 30], [30, 40], [40, 50], [1, 50]].map(([a, b]) => R.costToLevel(a, b)), [190, 245, 345, 445, 1225]);
assert.equal(R.levelCost(1), 1); assert.equal(R.levelCost(49), 49); assert.equal(R.levelCost(50), null);
assert.deepEqual([0, 1, 2, 3].map(R.levelCap), [20, 30, 40, 50]); assert.equal(R.levelCap(4), null);
assert.deepEqual(R.levelUp(1, 190, 0), { ok: true, lv: 20, spent: 190, left: 0, capped: true });
assert.deepEqual(R.levelUp(19, 500, 0), { ok: true, lv: 20, spent: 19, left: 481, capped: true });
assert.deepEqual(R.levelUp(5, 4, 0), { ok: true, lv: 5, spent: 0, left: 4, capped: false });
assert.deepEqual(R.levelUp(1, 99999, 3), { ok: true, lv: 50, spent: 1225, left: 98774, capped: true });
assert.equal(R.levelUp(0, 10, 0).ok, false);
// 療養：醫療室0級30分鐘、1級15分鐘；與core目前預設一致。
assert.equal(R.restMs(0), G.REST_MS); assert.equal(R.restMs(1), 15 * 60000); assert.equal(R.restMs(2), null);
// 設施：建材合計1800；聲望階級門檻。
let total = 0; for (const f of Object.values(R.FACILITIES)) for (const l of f.levels) total += l.materials;
assert.equal(total, 1800);
assert.deepEqual(R.canBuild('medical', 0, 1300, 150), { ok: true, tier: 1, materials: 150, nextLv: 1 });
assert.equal(R.canBuild('medical', 0, 1299, 999).code, 'tier_required');
assert.equal(R.canBuild('medical', 1, 99999, 999).code, 'facility_max');
assert.equal(R.canBuild('training', 0, 2600, 199).code, 'materials_required');
assert.equal(R.canBuild('training', 2, 6500, 999).code, 'tier_required');
assert(R.canBuild('training', 2, 7800, 500).ok);
assert.equal(R.canBuild('intel', 1, 3900, 200).nextLv, 2);
assert.equal(R.canBuild('hack', 0, 99999, 99999).code, 'facility_invalid');
assert.deepEqual(R.intelFor(0), []); assert.deepEqual(R.intelFor(2), ['enemyTypes', 'bossWeakness']);
assert.equal(R.intelFor(3).length, 4);
// 商店：價格、每週徽章100個、每場攜帶上限、外觀限購。
assert.deepEqual(R.canBuy('material', 150, 200), { ok: true, cost: 150, left: 50 });
assert.deepEqual(R.canBuy('badgePack', 10, 150), { ok: true, cost: 150, left: 0 });
assert.equal(R.canBuy('badgePack', 1, 999, { badgePackWeek: 10 }).code, 'weekly_limit');
assert.equal(R.canBuy('barricade', 3, 999).code, 'run_limit');
assert.equal(R.canBuy('bandage', 1, 999, { runBandage: 3 }).code, 'run_limit');
assert(R.canBuy('bandage', 3, 24).ok);
assert.equal(R.canBuy('outfit', 1, 999, {}, 299).code, 'price_invalid');
assert.equal(R.canBuy('outfit', 1, 999, { outfit: true }, 300).code, 'already_owned');
assert.deepEqual(R.canBuy('outfit', 1, 600, {}, 600), { ok: true, cost: 600, left: 0 });
assert.equal(R.canBuy('material', 10, 9).code, 'tokens_required');
assert.equal(R.canBuy('gold', 1, 999).code, 'item_invalid');
// 玩家壓制：高於壓制等級才壓，低於保留原值。
assert.deepEqual(R.suppression(80, 'normal'), { ok: true, active: true, lv: 10, enchantCap: 3, affixScale: 0.5 });
assert.deepEqual(R.suppression(60, 'legend'), { ok: true, active: true, lv: 55, enchantCap: 9, affixScale: 1 });
assert.equal(R.suppression(25, 'hard').active, false);
assert.equal(R.suppression(10, 'elite').lv, 10);
for (const d of Object.values(R.DIFFICULTIES)) assert(d.suppressLv - d.memberLv >= 5 && d.suppressLv - d.memberLv <= 7, d.name);
assert(Object.values(R.DIFFICULTIES).every(d => d.memberLv <= R.MEMBER_MAX_LV));
// 週一06:00台灣時間重置（2026-11-02週一＝UTC 11-01 22:00），寬限24小時。
const MON = Date.UTC(2026, 10, 1, 22);
assert.equal(R.weekStart(MON), MON);
assert.equal(R.weekStart(MON - 1), MON - R.WEEK);
assert.equal(R.weekStart(MON + R.WEEK - 1), MON);
assert.equal(R.weekStart(Date.UTC(2026, 10, 5, 3)), MON);
const sundayNight = MON - 3600000; // 週日深夜23點完成，屬上週
assert.equal(R.canSubmit(sundayNight, MON + 23 * 3600000), true);
assert.equal(R.canSubmit(sundayNight, MON + 24 * 3600000), false);
assert.equal(R.canSubmit(MON, MON + R.WEEK + 86400000 - 1), true);
assert.equal(R.canSubmit(MON + 1000, MON), false);
// 常數凍結，外部不能改數值。
assert.throws(() => { R.DIFFICULTIES.legend.mult = 99; });
assert.throws(() => { R.REP_TIERS.push(1); });
assert.throws(() => { R.SHOP.badgePack.price = 0; });
console.log('guild rules ok');
