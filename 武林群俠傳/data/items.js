// 浪跡江湖：裝備、丹藥與掉落（ARCHITECTURE.md 第 7 節）
// 裝備名依「階」（每 10 級一階）；兵器另有 wtype（blade／spear／claw）決定外功系與射程
const GEAR_NAMES = {
    blade: ['柴刀', '鑌鐵刀', '雁翎刀', '寒光刀', '玄鐵刀', '赤霄刀', '流星刀', '斷雲刀', '星河刀'],
    spear: ['木槍', '鐵頭槍', '白蠟槍', '寒光槍', '玄鐵槍', '赤霄槍', '流星槍', '斷雲槍', '星河槍'],
    claw: ['鐵指套', '虎牙爪', '鷹鉤爪', '寒光爪', '玄鐵爪', '赤霄爪', '流星爪', '斷雲爪', '星河爪'],
    armor: ['粗布衣', '皮甲', '鎖子甲', '青紋袍', '玄鐵甲', '赤焰袍', '流雲衣', '斷雲甲', '星河袍'],
    helm: ['布巾', '皮帽', '鐵盔', '青紋冠', '玄鐵盔', '赤焰冠', '流雲冠', '斷雲盔', '星河冠'],
    boots: ['草鞋', '皮靴', '鐵靴', '青紋履', '玄鐵靴', '赤焰履', '踏雲靴', '斷雲履', '星河靴'],
    ring: ['銅錢墜', '玉珮', '銀環', '青紋珮', '玄鐵戒', '赤焰珮', '流雲環', '斷雲戒', '星河珮'],
};

// 主屬性（每級基礎值）與可能的副屬性
const GEAR_STATS = {
    weapon: { main: { outer: 2.4, inner: 1.2 }, sub: ['crit', 'hit'] },
    armor: { main: { def: 1.4, hp: 8 }, sub: ['hp', 'xiejin'] },
    helm: { main: { hp: 10, def: 0.6 }, sub: ['mp', 'huajin'] },
    boots: { main: { dodge: 0.05, def: 0.4, move: 0.4 }, sub: ['dodge', 'aspd'] },
    ring: { main: { inner: 1.4, mp: 3, crit: 0.05 }, sub: ['crit', 'inner'] },
};
const SUB_PER_LV = { outer: 0.6, inner: 0.6, def: 0.4, hp: 4, mp: 2, crit: 0.04, hit: 0.05, dodge: 0.03, aspd: 0.05, xiejin: 0.05, huajin: 0.05 };
const STAT_NAME = {
    outer: '外功', inner: '內功', def: '防禦', hp: '氣血', mp: '真氣', crit: '會心%', hit: '命中%', dodge: '閃避%',
    aspd: '攻速%', move: '移動', xiejin: '卸勁%', huajin: '化勁%',
};
const PCT_STATS = { crit: 1, hit: 1, dodge: 1, aspd: 1, xiejin: 1, huajin: 1 };

const CONSUMABLES = {
    jinchuang: { name: '金瘡藥', icon: '🩹', price: 12, heal: 'hp', pct: 30, desc: '回復 30% 氣血' },
    huiqi: { name: '回氣丹', icon: '💊', price: 12, heal: 'mp', pct: 35, desc: '回復 35% 真氣' },
};

let itemSeq = 0;
function newItemId() { return Date.now().toString(36) + (itemSeq++).toString(36); }

function makeGear(slot, lv, q, wtype) {
    if (slot === 'weapon' && !wtype) wtype = ['blade', 'spear', 'claw'][randInt(0, 2)];
    const names = GEAR_NAMES[slot === 'weapon' ? wtype : slot];
    const tier = Math.min(names.length - 1, Math.floor(lv / 10));
    const def = GEAR_STATS[slot], sub = {};
    const subCount = q >= 3 ? 2 : q >= 1 ? 1 : 0;
    for (let i = 0; i < subCount; i++) {
        const k = def.sub[randInt(0, def.sub.length - 1)];
        sub[k] = +((sub[k] || 0) + SUB_PER_LV[k] * (lv + 4) * rand(0.6, 1.2)).toFixed(2);
    }
    const it = { id: newItemId(), slot, lv, q, plus: 0, name: names[tier], sub };
    if (wtype) it.wtype = wtype;
    return it;
}

function gearStats(it) {
    const out = {}, main = GEAR_STATS[it.slot].main;
    const mul = QUALITY[it.q].mul * (1 + it.plus * ENHANCE_PER_LV);
    for (const k in main) out[k] = main[k] * (it.lv + 4) * mul;
    for (const k in it.sub) out[k] = (out[k] || 0) + it.sub[k];
    return out;
}

function gearScore(it) {
    const s = gearStats(it), w = { outer: 3, inner: 3, def: 3, hp: 0.3, mp: 0.3, crit: 20, hit: 15, dodge: 20, aspd: 15, move: 2, xiejin: 15, huajin: 15 };
    let n = 0; for (const k in s) n += s[k] * (w[k] || 1);
    return Math.floor(n);
}

function sellPrice(it) { return Math.floor((5 + it.lv * 2) * (1 + it.q * 0.8) * (1 + it.plus * 0.3)); }
function slotName(it) { return it.slot === 'weapon' ? WEAPON_TYPES[it.wtype].name : SLOTS.find(x => x.id === it.slot).name; }
function gearLabel(it) {
    return `<span style="color:${QUALITY[it.q].color}">${QUALITY[it.q].name}・${it.name}${it.plus ? ' +' + it.plus : ''}</span>`;
}
function gearStatText(it) {
    const s = gearStats(it);
    return Object.keys(s).map(k => `${STAT_NAME[k]} ${PCT_STATS[k] ? s[k].toFixed(1) : Math.floor(s[k])}`).join('、');
}

// 掉落：一般怪 10%，首領必掉且至少精品
function rollDrop(mon) {
    if (!mon.boss && Math.random() > 0.10) return null;
    const slot = SLOTS[randInt(0, SLOTS.length - 1)].id;
    let q = pickWeighted(QUALITY, 'weight');
    if (mon.boss) q = Math.max(2, q);
    return makeGear(slot, mon.lv, q);
}
