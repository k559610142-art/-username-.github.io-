'use strict';
// 公會數值規則：tools/GUILD-NUMBERS-DRAFT.md（使用者2026-11-02確認）。純函式，不讀寫存檔、不連線、不發獎。
// 伺服器帳本與客戶端顯示共用同一份數字；實際入帳仍只能由伺服器收據決定。
const GuildRules = (() => {
    function hasOwn(object, key) { return Object.prototype.hasOwnProperty.call(object, key); }
    function freeze(x) { for (const v of Object.values(x)) if (v && typeof v === 'object') freeze(v); return Object.freeze(x); }
    function int(x, min = 0, max = Number.MAX_SAFE_INTEGER) { return Number.isSafeInteger(x) && x >= min && x <= max; }
    function error(code) { return { ok: false, code }; }
    const MIN = 60000, HOUR = 60 * MIN, DAY = 24 * HOUR, WEEK = 7 * DAY;
    // 每週任務冊：討伐4、防衛2（含護送）、個人委託1、遠征1；8項全完成另給獎勵。
    const BOOK = freeze({ hunt: 4, defense: 2, personal: 1, expedition: 1 });
    const BASE = freeze({ hunt: { rep: 100, tokens: 10, badges: 20 }, defense: { rep: 150, tokens: 15, badges: 30 },
        personal: { rep: 100, tokens: 10, badges: 20 }, expedition: { rep: 300, tokens: 30, badges: 60 }, bookBonus: { rep: 200, tokens: 20, badges: 40 } });
    const KIND_CATEGORY = freeze({ expedition: 'hunt', defense: 'defense', escort: 'defense' });
    const ACTIVITY_CATEGORY = freeze({ personalRecruit: 'personal', guildExpedition: 'expedition' });
    const OFF_BOOK_RATE = 0.25, RATING_MAX = 0.2;
    // 聲望不隨難度；代幣／徽章乘倍率。玩家等級高於suppressLv才壓等級／強化／詞綴。
    const DIFFICULTIES = freeze({
        normal: { name: '普通', memberLv: 5, suppressLv: 10, enchantCap: 3, affixScale: 0.5, mult: 1 },
        hard: { name: '困難', memberLv: 18, suppressLv: 25, enchantCap: 5, affixScale: 0.65, mult: 1.5 },
        elite: { name: '精英', memberLv: 35, suppressLv: 40, enchantCap: 7, affixScale: 0.8, mult: 2 },
        legend: { name: '傳說', memberLv: 48, suppressLv: 55, enchantCap: 9, affixScale: 1, mult: 3 },
    });
    const REP_TIERS = freeze([0, 1300, 2600, 3900, 5200, 6500, 7800]);
    const RECRUIT_SLOTS = 3, MEMBER_MAX_LV = 50, LEVEL_CAPS = freeze([20, 30, 40, 50]);
    const REST_MS = freeze([30 * MIN, 15 * MIN]); // 醫療室0／1級；不能花錢跳過。
    const FACILITIES = freeze({
        medical: { name: '醫療室', levels: [{ tier: 1, materials: 150 }] },
        intel: { name: '情報所', levels: [{ tier: 1, materials: 100 }, { tier: 3, materials: 200 }, { tier: 5, materials: 300 }] },
        training: { name: '訓練場', levels: [{ tier: 2, materials: 200 }, { tier: 4, materials: 350 }, { tier: 6, materials: 500 }] },
    });
    const INTEL = freeze([[], ['enemyTypes'], ['enemyTypes', 'bossWeakness'], ['enemyTypes', 'bossWeakness', 'defenseRoutes', 'eliteModifiers']]);
    // 商店只賣公會專用品；代幣綁角色。perWeek以件數計（徽章包10個，每週100個＝10包）。
    const SHOP = freeze({
        material: { name: '建材', price: 1 },
        badgePack: { name: '培養徽章×10', price: 15, badges: 10, perWeek: 10 },
        barricade: { name: '臨時路障', price: 5, perRun: 2 },
        bandage: { name: '急救繃帶', price: 8, perRun: 3, reviveSpeed: 0.5 },
        outfit: { name: '團員外觀', minPrice: 300, maxPrice: 600, once: true },
    });
    function categoryOf(source) {
        if (!source || typeof source !== 'object') return null;
        if (hasOwn(KIND_CATEGORY, source.kind)) return KIND_CATEGORY[source.kind];
        if (hasOwn(ACTIVITY_CATEGORY, source.activity)) return ACTIVITY_CATEGORY[source.activity];
        return null;
    }
    // 單場成功獎勵；失敗不呼叫。inBook=false 為任務冊外重打：無聲望、代幣／徽章25%。rating 0～1 只加代幣，最多+20%。
    function reward(category, difficulty, { inBook = true, rating = 0 } = {}) {
        if (!hasOwn(BOOK, category)) return error('category_invalid');
        if (!hasOwn(DIFFICULTIES, difficulty)) return error('difficulty_invalid');
        if (typeof rating !== 'number' || !(rating >= 0 && rating <= 1)) return error('rating_invalid');
        const base = BASE[category], mult = DIFFICULTIES[difficulty].mult * (inBook ? 1 : OFF_BOOK_RATE);
        return { ok: true, rep: inBook ? base.rep : 0, tokens: Math.floor(base.tokens * mult * (1 + RATING_MAX * rating)), badges: Math.floor(base.badges * mult) };
    }
    // done：本週已成功計入任務冊的次數 { hunt, defense, personal, expedition }。
    function bookProgress(done) {
        const count = {}; let complete = true;
        for (const [k, need] of Object.entries(BOOK)) {
            const n = done && int(done[k]) ? Math.min(done[k], need) : 0;
            count[k] = n; if (n < need) complete = false;
        }
        return { count, complete };
    }
    function inBook(done, category) { return hasOwn(BOOK, category) && bookProgress(done).count[category] < BOOK[category]; }
    function bookBonus() { return { ok: true, ...BASE.bookBonus }; }
    function repTier(rep) {
        if (!int(rep)) return 0;
        let tier = 0; for (let i = 1; i < REP_TIERS.length; i++) if (rep >= REP_TIERS[i]) tier = i;
        return tier;
    }
    function nextTierRep(rep) { const t = repTier(rep); return t + 1 < REP_TIERS.length ? REP_TIERS[t + 1] : null; }
    // 第1～3階各開一位招募委託；招募順序玩家自選，技能委託招募後立即可接。
    function recruitSlots(rep) { return Math.min(RECRUIT_SLOTS, repTier(rep)); }
    function levelCost(lv) { return int(lv, 1, MEMBER_MAX_LV - 1) ? lv : null; }
    function costToLevel(from, to) {
        if (!int(from, 1, MEMBER_MAX_LV) || !int(to, 1, MEMBER_MAX_LV) || to < from) return null;
        return (to * (to - 1) - from * (from - 1)) / 2;
    }
    function levelCap(trainingLv) { return int(trainingLv, 0, LEVEL_CAPS.length - 1) ? LEVEL_CAPS[trainingLv] : null; }
    // 只升到上限；剩餘徽章退回。新團員一律從1級，不依隊伍平均追等。
    function levelUp(lv, badges, trainingLv) {
        const cap = levelCap(trainingLv);
        if (cap == null || !int(lv, 1, MEMBER_MAX_LV) || !int(badges)) return error('input_invalid');
        let next = lv, left = badges;
        while (next < cap && left >= next) { left -= next; next++; }
        return { ok: true, lv: next, spent: badges - left, left, capped: next >= cap };
    }
    function restMs(medicalLv) { return int(medicalLv, 0, REST_MS.length - 1) ? REST_MS[medicalLv] : null; }
    function facilityNext(id, lv, rep) {
        if (!hasOwn(FACILITIES, id)) return error('facility_invalid');
        const levels = FACILITIES[id].levels;
        if (!int(lv, 0, levels.length)) return error('level_invalid');
        if (lv >= levels.length) return error('facility_max');
        const need = levels[lv];
        if (repTier(rep) < need.tier) return { ok: false, code: 'tier_required', tier: need.tier, materials: need.materials };
        return { ok: true, tier: need.tier, materials: need.materials, nextLv: lv + 1 };
    }
    function canBuild(id, lv, rep, materials) {
        const r = facilityNext(id, lv, rep);
        if (!r.ok) return r;
        if (!int(materials) || materials < r.materials) return { ok: false, code: 'materials_required', tier: r.tier, materials: r.materials };
        return r;
    }
    function intelFor(intelLv) { return int(intelLv, 0, INTEL.length - 1) ? INTEL[intelLv].slice() : null; }
    // used：{ badgePackWeek, outfits:{id:true}, runBarricade, runBandage }
    function canBuy(item, qty, tokens, used = {}, price) {
        if (!hasOwn(SHOP, item)) return error('item_invalid');
        if (!int(qty, 1, 9999) || !int(tokens)) return error('input_invalid');
        const s = SHOP[item];
        let unit = s.price;
        if (s.once) {
            if (qty !== 1) return error('once_only');
            if (!int(price, s.minPrice, s.maxPrice)) return error('price_invalid');
            if (used.outfit) return error('already_owned');
            unit = price;
        }
        if (s.perWeek && (int(used.badgePackWeek) ? used.badgePackWeek : 0) + qty > s.perWeek) return error('weekly_limit');
        if (item === 'barricade' && (int(used.runBarricade) ? used.runBarricade : 0) + qty > s.perRun) return error('run_limit');
        if (item === 'bandage' && (int(used.runBandage) ? used.runBandage : 0) + qty > s.perRun) return error('run_limit');
        const cost = unit * qty;
        if (tokens < cost) return error('tokens_required');
        return { ok: true, cost, left: tokens - cost };
    }
    // 玩家壓制：只在玩家等級高於suppressLv時生效，離開任務由呼叫端還原；技能／魔法保留。
    function suppression(playerLv, difficulty) {
        if (!hasOwn(DIFFICULTIES, difficulty) || !int(playerLv, 1, 999)) return error('input_invalid');
        const d = DIFFICULTIES[difficulty];
        if (playerLv <= d.suppressLv) return { ok: true, active: false, lv: playerLv, enchantCap: null, affixScale: 1 };
        return { ok: true, active: true, lv: d.suppressLv, enchantCap: d.enchantCap, affixScale: d.affixScale };
    }
    // 週一06:00（UTC+8，無日光節約）重置；上週成果寬限24小時。now須為伺服器時間。
    const OFFSET = 8 * HOUR - 6 * HOUR;
    function weekStart(now) {
        if (!int(now)) return null;
        const days = Math.floor((now + OFFSET) / DAY), dow = (days + 3) % 7; // 1970-01-01為週四；週一＝0
        return (days - dow) * DAY - OFFSET;
    }
    function canSubmit(completedAt, now) {
        const start = weekStart(completedAt);
        if (start == null || !int(now) || now < completedAt) return false;
        return now < start + WEEK + DAY;
    }
    return Object.freeze({ BOOK, BASE, DIFFICULTIES, REP_TIERS, RECRUIT_SLOTS, MEMBER_MAX_LV, LEVEL_CAPS, REST_MS, FACILITIES, INTEL, SHOP,
        OFF_BOOK_RATE, RATING_MAX, WEEK, categoryOf, reward, bookProgress, inBook, bookBonus, repTier, nextTierRep, recruitSlots,
        levelCost, costToLevel, levelCap, levelUp, restMs, facilityNext, canBuild, intelFor, canBuy, suppression, weekStart, canSubmit });
})();
module.exports = GuildRules;
