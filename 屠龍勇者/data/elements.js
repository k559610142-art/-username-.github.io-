// 屠龍勇者：元素系統（火焰／冰冷／閃電，2026-11-07，ARCHITECTURE.md 第 316 節）
// 使用者決定：3 種元素（聖、暗照舊算一般魔法）；怪物依種類有抗性；元素打中有異常（點燃／冰緩／感電）；
// 轉換來源：轉換類傳奇（uniques.js）、元素石（craft.js curElement，武器轉換詞綴）、一般裝備的元素增傷／附加傷害詞綴（affix.js）。
// 玩家這邊沒有元素抗性（怪物的魔法照舊看 MR）。執行期狀態掛在怪物物件上（不存檔）。
const ELEMENTS = {
    fire:  { name: '火焰', icon: '🔥', color: '#ff7a3c' },
    ice:   { name: '冰冷', icon: '❄️', color: '#8fd8ff' },
    light: { name: '閃電', icon: '⚡', color: '#ffe066' },
};
const ELEM_KEYS = ['fire', 'ice', 'light'];
const ELEM_AILMENT_P = 0.2;                         // 每次元素傷害觸發異常的基礎機率
const IGNITE_K = 0.2, IGNITE_MS = 4000;             // 點燃：每秒造成該次火焰傷害的 20%，4 秒
const CHILL_MS = 3000, CHILL_ATK_MUL = 1 / 0.7;     // 冰緩：怪物攻擊間隔變長（攻速 −30%），3 秒
const FREEZE_K = 0.1, FREEZE_MS = 1000;             // 冰凍：一次冰冷傷害 ≥ 最大 HP 10% 的非首領怪，凍住 1 秒
const SHOCK_MS = 4000, SHOCK_MUL = 1.15;            // 感電：受到玩家的傷害 +15%，4 秒
const ELEM_RES_MIN = -0.5, ELEM_RES_MAX = 0.75;

// ───────── 怪物抗性：依種類 ─────────
const ELEM_TAG_RES = {
    fire:   { fire: 0.5, ice: -0.25 },              // 火系：抗火、怕冰
    ice:    { ice: 0.5, fire: -0.25 },              // 冰系：抗冰、怕火
    storm:  { light: 0.5, ice: -0.25 },             // 雷、風系（飛行）
    water:  { fire: 0.25, light: -0.25 },           // 水棲：怕電
    nature: { fire: -0.25 },                        // 植物、蟲、野獸：怕火
    undead: { fire: -0.25, ice: 0.25 },             // 不死：怕火、不怕冷
    dragon: { fire: 0.25, ice: 0.25, light: 0.25 }, // 龍：全抗
};
const ELEM_MON_TAGS = {
    fire:   ['hellhound', 'cerberus', 'salamander', 'fireSpirit', 'lavaGolem', 'flameKnight', 'ifrit', 'drake', 'wakingDrake', 'demon', 'baphomet', 'wb_balrog'],
    ice:    ['snowWolf', 'yeti', 'iceGolem', 'frostWitch', 'iceGiantKing', 'wb_frost'],
    storm:  ['harpy', 'wyvernling', 'wyvern', 'floatingEye', 'beholder', 'wb_roc'],
    water:  ['giantCrab', 'drownedSailor', 'pirate', 'pirateGunner', 'pirateKing', 'lamia'],
    nature: ['treant', 'elderTreant', 'forestBear', 'giantSpider', 'venomSpider', 'venomQueen', 'giantAnt', 'wolf', 'lycan', 'werewolf', 'caveBat', 'sandScorpion'],
};
// 四大龍、世界首領：各抗自己的元素（取代龍的全抗 25%）
const ELEM_MON_OVERRIDE = {
    antharas: { fire: 0.25, ice: 0.25, light: 0.5 },
    fafurion: { fire: 0.25, ice: 0.75, light: -0.25 },
    lindvior: { fire: 0.25, ice: -0.25, light: 0.75 },
    valakas:  { fire: 0.75, ice: -0.25, light: 0.25 },
    wb_drake: { fire: 0.25, ice: 0.25, light: 0.5 },
    wb_lich:  { fire: -0.25, ice: 0.5, light: 0.25 },
};
const ELEM_TAG_OF = {};
for (const tag in ELEM_MON_TAGS) for (const id of ELEM_MON_TAGS[tag]) (ELEM_TAG_OF[id] = ELEM_TAG_OF[id] || []).push(tag);
let elemNameToId = null;
// 怪物代號（永夜之塔、精英、異界首領等用名字對回原本的怪）
function elemBaseId(mon) {
    if (MONSTERS[mon.id] || ELEM_MON_OVERRIDE[mon.id] || ELEM_TAG_OF[mon.id]) return mon.id;
    if (!elemNameToId) { elemNameToId = {}; for (const id in MONSTERS) elemNameToId[MONSTERS[id].name] = id; }
    const n = String(mon.baseName || mon.name || '').replace(/（.*$/, '').replace(/^(精英・\S*\s|異界首領・|召喚・|分裂・)+/, '').trim();
    return elemNameToId[n] || mon.id;
}
function monElemRes(mon) {
    if (!mon) return { fire: 0, ice: 0, light: 0 };
    if (mon._er) return mon._er;
    const id = elemBaseId(mon), r = { fire: 0, ice: 0, light: 0 };
    const tags = (ELEM_TAG_OF[id] || []).slice();
    if (mon.undead || (MONSTERS[id] && MONSTERS[id].undead)) tags.push('undead');
    if (mon.dragon || (MONSTERS[id] && MONSTERS[id].dragon)) tags.push('dragon');
    for (const t of tags) for (const e in ELEM_TAG_RES[t]) r[e] += ELEM_TAG_RES[t][e];
    if (ELEM_MON_OVERRIDE[id]) Object.assign(r, ELEM_MON_OVERRIDE[id]);
    for (const e of ELEM_KEYS) r[e] = clamp(r[e], ELEM_RES_MIN, ELEM_RES_MAX);
    return (mon._er = r);
}
// 名牌用：「抗🔥 弱❄️」
function elemTagText(mon) {
    const r = monElemRes(mon), up = ELEM_KEYS.filter(e => r[e] > 0), down = ELEM_KEYS.filter(e => r[e] < 0);
    return (up.length ? '抗' + up.map(e => ELEMENTS[e].icon).join('') : '') + (up.length && down.length ? ' ' : '') + (down.length ? '弱' + down.map(e => ELEMENTS[e].icon).join('') : '');
}

// ───────── 技能的元素 ─────────
const ELEM_SKILL_TAG = { fire: 'fire', ice: 'ice', storm: 'light', light: 'light' };
function skillElem(k) {
    if (!k) return null;
    if (k.elem) return k.elem === 'elem' ? ELEM_KEYS[rand(0, 2)] : (ELEM_SKILL_TAG[k.elem] || null);   // 二轉：隕石術 fire、絕對零度 ice、連鎖閃電 storm、三元素斬 elem（每次隨機）；聖、暗不算元素
    const n = String(k.name || '');
    if (/雷|電/.test(n)) return 'light';
    if (/冰|霜|雪|凍|寒/.test(n)) return 'ice';
    if (/火|炎|焰|爆裂|熔|隕石|煉獄/.test(n)) return 'fire';
    return null;
}
// 加上玩家的元素互轉（冰轉火、火轉雷，可以連鎖）
function elemConvertTo(e, st) {
    const E = st && st.elem; if (!e || !E) return e;
    if (e === 'ice' && E.iceToFire) e = 'fire';
    if (e === 'fire' && E.fireToLight) e = 'light';
    return e;
}
function elemSpellElem(k, st) { return elemConvertTo(skillElem(k), st); }

// ───────── 傷害倍率 ─────────
function elemShockMul(mon) { return mon && (mon.elemShock || 0) > gameNow ? SHOCK_MUL : 1; }
// 某元素對這隻怪的倍率：(1＋玩家該元素增傷)×(1－怪物抗性)
function elemMul(mon, e, st) {
    if (!e) return 1;
    const inc = st && st.elem ? st.elem.inc[e] || 0 : 0;
    return (1 + inc) * (1 - monElemRes(mon)[e]);
}
// 魔法（magicDamage）：元素倍率＋感電；沒有元素只吃感電
function elemSpellMul(mon, e, st) { return elemMul(mon, e, st) * elemShockMul(mon); }
// 物理攻擊（physicalAttack）：total＝已算完爆擊的物理傷害；回傳 { total, parts（各元素實際傷害） }
function elemPhys(total, hits, st, mon) {
    const E = st.elem, parts = { fire: 0, ice: 0, light: 0 };
    if (!E) return { total, parts };
    let sum = E.conv.fire + E.conv.ice + E.conv.light;
    const scale = sum > 1 ? 1 / sum : 1; sum = Math.min(1, sum);
    for (const e of ELEM_KEYS) {
        parts[e] += total * E.conv[e] * scale;
        if (E.add[e] > 0) parts[e] += E.add[e] * hits * (0.8 + Math.random() * 0.4);   // 附加傷害每一下 ±20%
    }
    if (E.iceToFire) { parts.fire += parts.ice; parts.ice = 0; }
    if (E.fireToLight) { parts.light += parts.fire; parts.fire = 0; }
    let out = total * (1 - sum) * E.physMul;
    for (const e of ELEM_KEYS) if (parts[e] > 0) { parts[e] *= elemMul(mon, e, st); out += parts[e]; }
    const sh = elemShockMul(mon);
    for (const e of ELEM_KEYS) parts[e] = Math.round(parts[e] * sh);
    return { total: Math.max(1, Math.round(out * sh)), parts };
}
function elemPartsText(parts) {
    const t = ELEM_KEYS.filter(e => parts[e] > 0).map(e => ELEMENTS[e].icon + parts[e]).join(' ');
    return t ? `（${t}）` : '';
}

// ───────── 異常 ─────────
function elemFloat(mon, text, color) {
    if (SIM_MODE || typeof scene === 'undefined' || !scene || !scene.mons || typeof addFloat !== 'function') return;
    const e = scene.mons.find(x => x.inst === mon && !x.dead);
    if (e) addFloat(e.rx, e.ry - 0.5, text, color);
}
// 打中後（物理 physicalAttack／魔法 castSpell、doStrike）：parts＝{ fire: 傷害, … }
function elemOnHit(mon, parts, st) {
    if (!mon || mon.hp <= 0 || !parts) return;
    const p = ELEM_AILMENT_P + (st && st.elem ? st.elem.ailment : 0);
    for (const e of ELEM_KEYS) {
        const d = parts[e] || 0;
        if (d <= 0 || !chance(p)) continue;
        if (e === 'fire') {
            const v = Math.max(1, Math.round(d * IGNITE_K)), old = mon.elemIgnite;
            if (!old || old.until <= gameNow) elemFloat(mon, '點燃', ELEMENTS.fire.color);
            mon.elemIgnite = { v: Math.max(v, old && old.until > gameNow ? old.v : 0), until: gameNow + IGNITE_MS, at: old && old.until > gameNow ? old.at : gameNow + 1000 };
        } else if (e === 'ice') {
            if ((mon.elemChill || 0) <= gameNow) elemFloat(mon, '冰緩', ELEMENTS.ice.color);
            mon.elemChill = gameNow + CHILL_MS;
            if (!mon.boss && d >= mon.maxHp * FREEZE_K) { mon.stunUntil = Math.max(mon.stunUntil || 0, gameNow + FREEZE_MS); elemFloat(mon, '冰凍', '#c8f0ff'); }
        } else {
            if ((mon.elemShock || 0) <= gameNow) elemFloat(mon, '感電', ELEMENTS.light.color);
            mon.elemShock = gameNow + SHOCK_MS;
        }
    }
}
function elemChillMul(m) { return m && (m.elemChill || 0) > gameNow ? CHILL_ATK_MUL : 1; }
// 每次戰鬥更新（huntTick）：點燃每秒扣血
function elementsTick() {
    if (!hunt || !hunt.mobs) return;
    for (const m of hunt.mobs) {
        const g = m.elemIgnite;
        if (!g || m.hp <= 0) continue;
        if (g.until < gameNow) { m.elemIgnite = null; continue; }
        if (g.at <= gameNow) { g.at += 1000; m.hp -= g.v; }
    }
}
