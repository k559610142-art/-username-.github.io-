// 屠龍勇者：傳奇裝備（PoE 式唯一裝備，2026-11-07，ARCHITECTURE.md 第 315 節）
// 使用者決定：20 件（2026-11-07 第二期再加 6 件轉換類，共 26 件）、固定名稱與詞綴＋1 個改變玩法的特殊效果；只有稀有異界地圖（黃色、非財寶圖）T11～T15 的異界首領會掉
//   （T11～T12 1%、T13～T14 2%、T15 3%，伺服器 tools/unique-items.sql 決定）；可以交易；Lv.60 才能裝備；不能用通貨改造（可以強化）。
// 每件是獨立的道具代號 uq_*（防改檔簽章涵蓋道具代號，普通裝備改不成傳奇）；不會出現在隨機裝備池。
// 依賴：items（載入時寫入 ITEMS）；其餘函式都在執行期由 combat／player／mercenary／afflict 呼叫。
const UNIQUE_REQ_LV = 60;
const UNIQUE_DROP_P = { 11: 0.01, 12: 0.01, 13: 0.02, 14: 0.02, 15: 0.03 };
const UNIQUE_DEFS = [
    // ── 武器 ──
    { key: 'condemner', name: '斷罪者', base: 'twoHandSword', cat: 'weapon', type: 'twohand', dmg: [22, 28], hit: 3, safe: 6, wt: 150,
      fx: { str: 3, crit: 0.05, hp: 120 }, special: '每第 4 下攻擊必定爆擊，爆擊傷害 ×2' },
    { key: 'bloodpact', name: '血契之刃', base: 'katana', cat: 'weapon', type: 'sword', dmg: [16, 20], hit: 4, safe: 6, wt: 70,
      fx: { lifesteal: 0.04, dex: 2, hp: 150 }, special: '吸血效果 ×3；無法飲用治癒藥水' },
    { key: 'voidwhisper', name: '虛空低語', base: 'crystalWand', cat: 'weapon', type: 'staff', dmg: [6, 6], hit: 2, safe: 6, wt: 40,
      fx: { sp: 10, int: 3, mp: 150 }, special: '技能與魔法改用 HP 支付（每 1 MP 消耗 2 HP，HP 不夠就不能施放）' },
    { key: 'thousandfeather', name: '千羽', base: 'elvenBow', cat: 'weapon', type: 'bow', dmg: [14, 14], hit: 3, safe: 6, wt: 80,
      fx: { dex: 3, crit: 0.04 }, special: '每次攻擊額外射出 2 支箭打其他敵人（各 40% 傷害），箭矢消耗 ×3' },
    { key: 'thundereye', name: '雷鳴獨眼', base: 'rifle', cat: 'weapon', type: 'gun', dmg: [16, 16], hit: 4, safe: 6, wt: 90,
      fx: { dex: 2, critDmg: 0.2 }, special: '攻擊速度 −30%，但每發物理傷害 ×1.8 且無視防禦' },
    { key: 'shadowmaw', name: '影噬', base: 'claw', cat: 'weapon', type: 'claw', dmg: [12, 14], hit: 3, safe: 6, wt: 60,
      fx: { dex: 3, lifesteal: 0.02 }, special: '擊殺敵人回復 5% HP 與 MP，並獲得攻速 +10%（3 秒，最多 3 層）' },
    { key: 'wailingharvest', name: '哀嚎收割', base: 'boneScythe', cat: 'weapon', type: 'scythe', dmg: [18, 24], hit: 2, safe: 6, wt: 130,
      fx: { str: 3, hp: 100 }, special: '非首領敵人 HP 低於 20% 時直接斬殺' },
    // ── 防具 ──
    { key: 'undertow', name: '逆流之心', base: 'abyssGuardMail', cat: 'armor', slot: 'armor', ac: 8, mr: 15, safe: 4, wt: 120,
      fx: { mp: 200, mpRegen: 3 }, special: '受到的傷害 30% 改由 MP 承受（MP 不夠時由 HP 承受）' },
    { key: 'berserkskull', name: '狂戰之顱', base: 'dragonWardHelm', cat: 'armor', slot: 'helm', ac: 4, mr: 8, safe: 4, wt: 60,
      fx: { str: 2, hp: 100 }, special: '每失去 10% HP，造成的傷害 +6%；受到的治療效果 −50%' },
    { key: 'thornweave', name: '荊棘織衣', base: 'dragonHeartTunic', cat: 'armor', slot: 'tshirt', ac: 4, safe: 4, wt: 25,
      fx: { con: 2, hp: 150 }, special: '受到攻擊時反彈 30% 傷害（物理、魔法都會）；自己受到的傷害 +10%' },
    { key: 'phantomcloak', name: '幻影披風', base: 'dragonWingCloak', cat: 'armor', slot: 'cloak', ac: 3, mr: 12, safe: 4, wt: 20,
      fx: { dodge: 0.05, dex: 2 }, special: '閃避成功後，下一次攻擊必定爆擊' },
    { key: 'midas', name: '點金之手', base: 'dragonFangGloves', cat: 'armor', slot: 'gloves', ac: 3, safe: 4, wt: 30,
      fx: { goldPct: 0.5, dex: 1 }, special: '打怪金幣 +50%；造成的傷害 −10%' },
    { key: 'martyr', name: '殉道者的長靴', base: 'dragonWardBoots', cat: 'armor', slot: 'boots', ac: 4, mr: 8, safe: 4, wt: 50,
      fx: { hp: 120, dodge: 0.03 }, special: 'HP 低於 50% 時攻速 +30%；HP 不會自然回復' },
    { key: 'oathshield', name: '堅守誓約', base: 'starwindShield', cat: 'armor', slot: 'shield', ac: 7, mr: 15, safe: 4, wt: 120,
      fx: { hp: 150, reduce: 2 }, special: '25% 機率完全擋下物理攻擊，擋下時回復 2% HP；攻速 −10%' },
    { key: 'soulhunter', name: '獵魂者之索', base: 'belt', cat: 'armor', slot: 'belt', ac: 2, weight: 500, safe: -1, wt: 15,
      fx: { hp: 100, str: 1, dex: 1 }, special: '擊殺精英怪後 20 秒內獲得牠的詞條效果（吸血、護盾、狂暴、復甦…）' },
    { key: 'bottomless', name: '無底行囊', base: 'belt', cat: 'armor', slot: 'belt', weight: 2000, safe: -1, wt: 10,
      fx: { hp: 80, con: 1 }, special: '藥水回復量 +30%，並同時回復等於回血量 30% 的 MP；喝水延遲 +50%' },
    // ── 飾品 ──
    { key: 'voidring', name: '虛空之戒', base: 'strRing', cat: 'armor', slot: 'ring', safe: -1, wt: 2,
      fx: { sp: 3, int: 2 }, special: '攻擊魔法必定魔爆；魔法傷害 −40%' },
    { key: 'gambler', name: '賭徒之指', base: 'dexRing', cat: 'armor', slot: 'ring', safe: -1, wt: 2,
      fx: { critDmg: 0.3, dex: 1 }, special: '物理爆擊率 ×2；沒有爆擊時傷害 −20%' },
    { key: 'mercoath', name: '傭兵之誓', base: 'strAmulet', cat: 'armor', slot: 'amulet', safe: -1, wt: 5,
      fx: { hp: 80, wis: 2 }, special: '傭兵的攻擊、魔力與最大 HP +40%；自己造成的傷害 −15%' },
    { key: 'hourglass', name: '時之沙漏', base: 'mrAmulet', cat: 'armor', slot: 'amulet', safe: -1, wt: 5,
      fx: { mp: 120, mpRegen: 2 }, special: '技能冷卻 −25%；技能 MP 消耗 +40%' },
    // ── 第二期：轉換類（2026-11-07，元素系統 elements.js，第 316 節）──
    { key: 'forgeheart', name: '熔爐之心', base: 'twoHandSword', cat: 'weapon', type: 'twohand', dmg: [20, 26], hit: 3, safe: 6, wt: 150,
      fx: { convFire: 0.5, fireInc: 0.3, str: 2 }, special: '物理傷害 50% 轉為火焰；火焰傷害 +30%' },
    { key: 'frostvein', name: '霜脈', base: 'elvenBow', cat: 'weapon', type: 'bow', dmg: [13, 13], hit: 3, safe: 6, wt: 80,
      fx: { convIce: 0.5, iceInc: 0.2, ailment: 0.2 }, special: '物理傷害 50% 轉為冰冷；元素異常觸發機率 +20%' },
    { key: 'thundergrip', name: '雷霆之握', base: 'dragonFangGloves', cat: 'armor', slot: 'gloves', ac: 3, safe: 4, wt: 30,
      fx: { convLight: 0.3, lightInc: 0.2, dex: 2 }, special: '物理傷害 30% 轉為閃電；閃電傷害 +20%' },
    { key: 'dualflame', name: '冰火同源', base: 'dexRing', cat: 'armor', slot: 'ring', safe: -1, wt: 2,
      fx: { iceToFire: 1, fireInc: 0.2 }, special: '冰冷傷害全部轉為火焰；火焰傷害 +20%' },
    { key: 'stormeye', name: '風暴之眼', base: 'mrAmulet', cat: 'armor', slot: 'amulet', safe: -1, wt: 5,
      fx: { fireToLight: 1, lightInc: 0.2 }, special: '火焰傷害全部轉為閃電；閃電傷害 +20%' },
    { key: 'elementalist', name: '元素使徒', base: 'crystalWand', cat: 'weapon', type: 'staff', dmg: [6, 6], hit: 2, safe: 6, wt: 40,
      fx: { fireInc: 0.25, iceInc: 0.25, lightInc: 0.25, ailment: 0.15, sp: 6, physLess: 0.5 }, special: '火焰／冰冷／閃電傷害 +25%、元素異常觸發機率 +15%；物理傷害 −50%' },
];
const UNIQUE_BY_KEY = {};
for (const u of UNIQUE_DEFS) {
    const id = 'uq_' + u.key, d = { name: u.name, cat: u.cat, safe: u.safe, wt: u.wt, sell: 50000, reqLv: UNIQUE_REQ_LV, unique: u.key, uqBase: u.base, uqFx: u.fx, desc: '【傳奇】' + u.special };
    if (u.cat === 'weapon') Object.assign(d, { type: u.type, dmg: u.dmg, hit: u.hit });
    else for (const k of ['slot', 'ac', 'mr', 'weight']) if (u[k] != null) d[k] = u[k];
    ITEMS[id] = d;
    UNIQUE_BY_KEY[u.key] = Object.assign({ id }, u);
}
const UNIQUE_IDS = UNIQUE_DEFS.map(u => 'uq_' + u.key);

// ───────── 判斷／執行期狀態 ─────────
function uqOn(key, p = player) {
    if (!p || !p.equip) return false;
    for (const s in p.equip) { const it = p.equip[s]; if (it && ITEMS[it.id] && ITEMS[it.id].unique === key) return true; }
    return false;
}
const uqRuntime = new WeakMap();   // 不存檔：斷罪者計數、幻影披風、影噬層數、獵魂者的詞條、怪物身上的持續傷害
function uqRt(p = player) {
    let r = uqRuntime.get(p);
    if (!r) { r = { swings: 0, phantom: false, devour: [], hh: {}, hhShield: 0, hhRevive: false }; uqRuntime.set(p, r); }
    return r;
}
function uqHh(k) { const r = uqRt(); return (r.hh[k] || 0) > gameNow; }
function uqFloat(text, color) {
    if (!SIM_MODE && typeof scene !== 'undefined' && scene && scene.pl && typeof addFloat === 'function') addFloat(scene.pl.rx, scene.pl.ry - 0.9, text, color);
}

// calcStats：固定詞綴＋獵魂者的詞條
function uniquePlayerFx(p) {
    const fx = {};
    for (const s in p.equip) { const it = p.equip[s], d = it && ITEMS[it.id]; if (d && d.uqFx) addFx(fx, d.uqFx); }
    if (uqOn('soulhunter', p)) {
        const r = uqRt(p), on = k => (r.hh[k] || 0) > gameNow;
        if (on('vamp')) fx.lifesteal = (fx.lifesteal || 0) + 0.05;
        if (on('thorns')) fx.thorns = (fx.thorns || 0) + 0.15;
        if (on('blink')) fx.dodge = (fx.dodge || 0) + 0.15;
    }
    return fx;
}
// calcStats 算完後的修正（倍率類）
function uniqueStatPost(out, p) {
    if (uqOn('bloodpact', p)) out.lifesteal *= 3;
    if (uqOn('voidring', p)) out.magicCrit = 1;
    if (uqOn('gambler', p)) out.crit *= 2;
    let spd = 1;   // 攻擊間隔倍率（>1 變慢）
    if (uqOn('thundereye', p)) spd /= 0.7;
    if (uqOn('oathshield', p)) spd /= 0.9;
    if (uqOn('martyr', p) && p.hp < out.maxHp * 0.5) spd /= 1.3;
    const r = uqRt(p);
    if (uqOn('shadowmaw', p)) { r.devour = r.devour.filter(t => t > gameNow); if (r.devour.length) spd /= 1 + 0.1 * r.devour.length; }
    if (uqOn('soulhunter', p) && (r.hh.berserk || 0) > gameNow) spd /= 1.3;
    if (spd !== 1) out.atkMs = Math.max(ATK_MIN_MS, Math.round(out.atkMs * spd));
    return out;
}
// 玩家造成的傷害倍率（物理 physicalAttack／魔法 magicDamage）
function uniqueDmgMul(magic) {
    let m = 1;
    if (uqOn('berserkskull')) { const st = calcStats(); m *= 1 + 0.06 * Math.floor(clamp(1 - player.hp / st.maxHp, 0, 1) * 10); }
    if (uqOn('midas')) m *= 0.9;
    if (uqOn('mercoath')) m *= 0.85;
    if (uqOn('soulhunter') && uqHh('summon')) m *= 1.1;
    if (magic && uqOn('voidring')) m *= 0.6;
    if (!magic && uqOn('thundereye')) m *= 1.8;
    return m;
}
function uniqueIgnoreAc() { return uqOn('thundereye'); }
// 物理爆擊：斷罪者每第 4 下、幻影披風閃避後下一擊；回傳爆擊倍率或 null
function uniqueCritRoll(st) {
    const r = uqRt();
    if (uqOn('condemner') && ++r.swings % 4 === 0) return (st.critDmg || 1.5) * 2;
    if (r.phantom && uqOn('phantomcloak')) { r.phantom = false; uqFloat('幻影一擊', '#c18aff'); return st.critDmg || 1.5; }
    return null;
}
function uniqueNoCritMul() { return uqOn('gambler') ? 0.8 : 1; }

// 打中怪物後（物理、魔法都會呼叫）：獵魂者的魔力燃燒、冰封／燃燒／中毒
function uniqueOnHit(mon, dealt, magic) {
    if (!mon || dealt <= 0 || !uqOn('soulhunter')) return;
    const st = calcStats();
    if (uqHh('manaBurn')) player.mp = Math.min(st.maxMp, player.mp + Math.max(1, Math.round(st.maxMp * 0.01)));
    if (uqHh('frost') && typeof mercEffectSet === 'function') mercEffectSet(mon, 'slow', 4);
    for (const k of ['blaze', 'venom']) if (uqHh(k)) uqAddDot(mon, k, Math.max(1, Math.round(dealt * 0.1)), 4);
}
function uqAddDot(mon, kind, perSec, sec) {
    mon.uqDots = (mon.uqDots || []).filter(x => x.until > gameNow && x.kind !== kind);
    mon.uqDots.push({ kind, v: perSec, until: gameNow + sec * 1000, at: gameNow + 1000 });
}
// 物理攻擊打完（physicalAttack）：千羽多射 2 箭、獵魂者「分裂」25% 再打一隻
function uniqueAfterPhys(mon, total, st, ammoId) {
    if (!hunt || !hunt.mobs || total <= 0) return;
    const others = hunt.mobs.filter(m => m !== mon && m.hp > 0);
    if (uqOn('thousandfeather') && st.ranged) {
        for (const m of others.slice(0, 2)) {
            if (ammoId && !consumeItem(ammoId)) break;
            const d = Math.max(1, Math.round(total * 0.4)); m.hp -= d;
            addLog(`🏹 千羽：${m.name}受到 ${d} 傷害`, 'crit');
        }
    }
    if (uqOn('soulhunter') && uqHh('split') && others.length && chance(0.25)) {
        const m = others[rand(0, others.length - 1)]; m.hp -= total;
        addLog(`🧬 獵魂（分裂）：${m.name}受到 ${total} 傷害`, 'crit');
    }
}
// 哀嚎收割：非首領 HP < 20% 直接斬殺（reapMobs 前呼叫）
function uniqueReap() {
    if (!hunt || !hunt.mobs || !uqOn('wailingharvest')) return;
    for (const m of hunt.mobs) if (!m.boss && m.hp > 0 && m.hp < m.maxHp * 0.2) { m.hp = 0; addLog(`🌙 哀嚎收割：斬殺${m.name}`, 'crit'); }
}
// 每次戰鬥更新：持續傷害
function uniqueTick() {
    if (!hunt || !hunt.mobs) return;
    for (const m of hunt.mobs) {
        if (!m.uqDots || m.hp <= 0) continue;
        for (const d of m.uqDots) if (d.until >= gameNow && d.at <= gameNow) { d.at += 1000; m.hp -= d.v; }
        m.uqDots = m.uqDots.filter(d => d.until > gameNow);
    }
}

// ───────── 藥水／治療／回復 ─────────
function uniqueNoPotion() { return uqOn('bloodpact'); }
function uniquePotionHeal(healed) { return uqOn('bottomless') ? Math.round(healed * 1.3) : healed; }
function uniquePotionAfter(hpGained) {
    if (!uqOn('bottomless') || hpGained <= 0) return;
    const st = calcStats(), mp = Math.round(hpGained * 0.3);
    player.mp = Math.min(st.maxMp, player.mp + mp);
}
function uniquePotionCdMul() { return uqOn('bottomless') ? 1.5 : 1; }
function uniqueHealMul() { return uqOn('berserkskull') ? 0.5 : 1; }
function uniqueNoRegen() { return uqOn('martyr'); }

// ───────── 受到攻擊 ─────────
function uniqueBlock(mon, st) {   // 物理攻擊（閃避判定之後）
    if (!uqOn('oathshield') || !chance(0.25)) return false;
    const h = Math.max(1, Math.round(st.maxHp * 0.02)); player.hp = Math.min(st.maxHp, player.hp + h);
    addLog(`🛡️ 堅守誓約：擋下${mon.name}的攻擊（HP +${h}）`, 'miss'); uqFloat('格擋', '#ffd34d');
    return true;
}
function uniqueOnDodge() { if (uqOn('phantomcloak')) uqRt().phantom = true; }
// 實際扣血前的修正：荊棘織衣、獵魂者護盾、逆流之心
function uniqueIncoming(mon, dmg, magic, st) {
    if (dmg <= 0) return dmg;
    if (uqOn('thornweave')) {
        dmg = Math.round(dmg * 1.1);
        const t = Math.max(1, Math.round(dmg * 0.3)); mon.hp -= t;
        addLog(`🌵 荊棘織衣：${mon.name}受到 ${t} 反彈傷害`, 'crit');
    }
    const r = uqRt();
    if (r.hhShield > 0 && uqOn('soulhunter')) { const a = Math.min(r.hhShield, dmg); r.hhShield -= a; dmg -= a; }
    if (uqOn('undertow') && player.mp > 0) { const a = Math.min(player.mp, Math.round(dmg * 0.3)); player.mp -= a; dmg -= a; }
    return Math.max(0, dmg);
}
// 獵魂者「復甦」：免死一次
function uniquePreventDeath(st) {
    const r = uqRt();
    if (!r.hhRevive || !uqHh('revive') || !uqOn('soulhunter')) return false;
    r.hhRevive = false; player.hp = Math.max(1, Math.round(st.maxHp * 0.2));
    addLog('✨ 獵魂（復甦）：免於一死！', 'heal'); uqFloat('復甦！', '#ffd34d');
    return true;
}

// ───────── 擊殺 ─────────
function uniqueOnKill(mon) {
    if (uqOn('shadowmaw')) {
        const st = calcStats(), r = uqRt();
        player.hp = Math.min(st.maxHp, player.hp + Math.round(st.maxHp * 0.05 * uniqueHealMul()));
        player.mp = Math.min(st.maxMp, player.mp + Math.round(st.maxMp * 0.05));
        r.devour = r.devour.filter(t => t > gameNow); if (r.devour.length >= 3) r.devour.shift(); r.devour.push(gameNow + 3000);
    }
    if (mon.eliteAf && uqOn('soulhunter')) {
        const r = uqRt(), st = calcStats();
        for (const k of mon.eliteAf) r.hh[k] = gameNow + 20000;
        if (mon.eliteAf.includes('shield')) r.hhShield = Math.max(r.hhShield, Math.round(st.maxHp * 0.15));
        if (mon.eliteAf.includes('revive')) r.hhRevive = true;
        const names = mon.eliteAf.map(k => ELITE_AFFIXES[k] ? ELITE_AFFIXES[k].name : k).join('・');
        addLog(`👁️ 獵魂者之索：獲得「${names}」20 秒`, 'rare'); uqFloat('獵魂：' + names, '#ff9a3c');
    }
}
// 獵魂者目前生效的詞條（狀態顯示用）
function uniqueHhText() {
    if (!player || !uqOn('soulhunter')) return '';
    const r = uqRt();
    return Object.keys(r.hh).filter(k => r.hh[k] > gameNow).map(k => (ELITE_AFFIXES[k] ? ELITE_AFFIXES[k].name : k) + ' ' + Math.ceil((r.hh[k] - gameNow) / 1000) + '秒').join('・');
}

// ───────── 技能耗魔／冷卻 ─────────
function uniqueMpMul(p = player) { return uqOn('hourglass', p) ? 1.4 : 1; }
function uniqueCdMul() { return uqOn('hourglass') ? 0.75 : 1; }
// 付得起嗎（虛空低語改用 HP：每 1 MP 消耗 2 HP，扣完至少要剩 1 HP）
function uniquePayOk(cost) { return uqOn('voidwhisper') ? player.hp > cost * 2 : player.mp >= cost; }
function uniquePay(cost) {
    if (!uqOn('voidwhisper')) { player.mp -= cost; return; }
    player.hp = Math.max(1, player.hp - cost * 2);
}

// ───────── 傭兵之誓 ─────────
function uniqueMercMod(out) {
    if (!uqOn('mercoath')) return out;
    return Object.assign({}, out, { hp: Math.round(out.hp * 1.4), atk: out.atk * 1.4, magic: out.magic * 1.4 });
}

// ───────── 掉落 ─────────
// 本機掉寶（後端掉寶關閉時）：稀有異界 T11～T15 的異界首領；後端模式由 tools/unique-items.sql 決定
function uniqueDropFor(mon) {
    if (!mon || !mon.mapBoss || !player.mapRun) return null;
    const r = player.mapRun, p = UNIQUE_DROP_P[r.t];
    if (!p || r.q !== 'rare' || (typeof treasureMapActive === 'function' && treasureMapActive()) || !chance(p)) return null;
    return UNIQUE_IDS[rand(0, UNIQUE_IDS.length - 1)];
}

// 道具說明（ui-panels.js itemInfoHtml）
function uniqueInfoHtml(d) {
    if (!d || !d.unique) return '';
    const u = UNIQUE_BY_KEY[d.unique];
    const af = Object.entries(u.fx).filter(([k]) => k !== 'iceToFire' && k !== 'fireToLight').map(([k, v]) => {   // 元素互轉寫在特殊效果裡
        const a = (typeof affixDef === 'function' && affixDef(k)) || null;
        const name = a ? a.name : ({ str: '力量', dex: '敏捷', con: '體質', int: '智力', wis: '精神', cha: '魅力', goldPct: '金幣加成', weight: '負重', ailment: '元素異常機率', physLess: '物理傷害降低' })[k] || k;
        const pct = a ? a.pct : ['goldPct', 'ailment', 'physLess'].includes(k);
        return `<span class="q-unique">◆ ${name} +${pct ? Math.round(v * 100) + '%' : v}</span>`;
    });
    return [`<b class="q-unique">傳奇裝備</b><small class="muted">（Lv.${d.reqLv} 以上可裝備；不能用通貨改造）</small>`, ...af, `<span class="q-unique-special">★ ${u.special}</span>`].join('<br>');
}
