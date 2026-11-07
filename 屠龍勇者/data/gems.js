// 屠龍勇者：裝備開孔＋技能／輔助寶石（PoE 第三期，2026-11-07，ARCHITECTURE.md 第 317 節）
// 使用者決定：
//   孔：盔甲最多 6 孔（可 6 連）；其他防具（頭盔、T恤、斗篷、手套、靴子、盾牌）最多 4 孔；雙手武器 6 孔、單手武器 3 孔；戒指、項鍊、腰帶沒有孔。
//   掉落時隨機孔數與串聯（品質越高孔越多）；「開孔石」重擲孔數、「連結石」重擲串聯（孔裡要先清空）。
//   件內連線：串聯在一起的孔裡要有「技能寶石」，同一串的輔助寶石才會強化那個技能。技能照舊學，技能寶石只是載體（鑲嵌時從已學會的技能直接產生，拆下就消失、免費）。
//   輔助寶石：怪物掉落、最高 20 級；鑲在身上裝備時每次擊殺得到該怪經驗的 10%（玩家經驗不變）。拆下輔助寶石要「寶石等級 × 2,000」金幣，寶石保留。
// 道具實體欄位：裝備 so＝孔陣列（null／{ t:'skill', sk }／輔助寶石實體），ln＝相鄰孔是否串聯（長度 n−1，1／0）；輔助寶石 gl＝等級、gx＝經驗。
//   這些欄位也算進防改檔簽章（guard.js guardItemCanon／tools/sockets-gems.sql dragon_item_canon，沒有孔的道具簽章不變）。
const GEM_MAX_LV = 20, GEM_EXP_SHARE = 0.1, GEM_UNSOCKET_GOLD = 2000;
const GEM_ATTACK_ID = '_attack';   // 「普通攻擊」也能做成技能寶石
const SUPPORT_GEMS = {
    multistrike: { name: '多重打擊', icon: '⚔️', desc: L => `物理技能／普攻多打 1 下，傷害 ×${(0.6 + 0.01 * L).toFixed(2)}`, mods: L => ({ hitsAdd: 1, dmgMul: 0.6 + 0.01 * L, physOnly: true }) },
    aoeExpand:   { name: '範圍擴大', icon: '💥', desc: L => `單體技能改成範圍（打全部圍上來的怪），傷害 ×${(0.7 + 0.01 * L).toFixed(2)}`, mods: L => ({ aoe: true, dmgMul: 0.7 + 0.01 * L }) },
    addFireG:    { name: '附加火焰', icon: '🔥', desc: L => `每一擊附加 ${4 + 2 * L} 火焰傷害`, mods: L => ({ add: { fire: 4 + 2 * L } }) },
    addIceG:     { name: '附加冰冷', icon: '❄️', desc: L => `每一擊附加 ${4 + 2 * L} 冰冷傷害`, mods: L => ({ add: { ice: 4 + 2 * L } }) },
    addLightG:   { name: '附加閃電', icon: '⚡', desc: L => `每一擊附加 ${4 + 2 * L} 閃電傷害`, mods: L => ({ add: { light: 4 + 2 * L } }) },
    elemFocus:   { name: '元素集中', icon: '🌀', desc: L => `火焰／冰冷／閃電傷害 +${Math.round(15 + 1.5 * L)}%`, mods: L => ({ elemInc: (15 + 1.5 * L) / 100 }) },
    critBoost:   { name: '暴擊強化', icon: '🎯', desc: L => `物爆率與魔爆率 +${(3 + 0.5 * L).toFixed(1)}%`, mods: L => ({ critAdd: (3 + 0.5 * L) / 100 }) },
    leechG:      { name: '吸血', icon: '🩸', desc: L => `造成傷害的 ${(1 + 0.2 * L).toFixed(1)}% 轉為 HP`, mods: L => ({ leech: (1 + 0.2 * L) / 100 }) },
    efficiency:  { name: '耗魔降低', icon: '💧', desc: L => `MP 消耗 −${20 + L}%`, mods: L => ({ mpMul: 0.8 - 0.01 * L }) },
    cdrG:        { name: '冷卻縮減', icon: '⏳', desc: L => `冷卻 −${10 + L}%`, mods: L => ({ cdMul: 0.9 - 0.01 * L }) },
    chainG:      { name: '連鎖', icon: '🔗', desc: L => `魔法彈跳到另外 ${L >= 10 ? 2 : 1} 隻怪（${Math.round(50 + 1.5 * L)}% 傷害）`, mods: L => ({ chain: { n: L >= 10 ? 2 : 1, mul: (50 + 1.5 * L) / 100 } }) },
    brutality:   { name: '殘忍', icon: '🪓', desc: L => `物理傷害 ×${(1.2 + 0.015 * L).toFixed(2)}，但這個技能不會有元素傷害（轉換、附加都無效）`, mods: L => ({ physMul: 1.2 + 0.015 * L, noElem: true }) },
    ailmentG:    { name: '異常強化', icon: '☣️', desc: L => `點燃／冰緩／感電觸發機率 +${10 + L}%`, mods: L => ({ ailment: (10 + L) / 100 }) },
};
const SUPPORT_GEM_IDS = Object.keys(SUPPORT_GEMS).map(k => 'gem_' + k);
for (const k in SUPPORT_GEMS) ITEMS['gem_' + k] = { name: '輔助寶石・' + SUPPORT_GEMS[k].name, cat: 'gem', gem: k, wt: 1, sell: 2000, desc: '鑲在裝備的孔裡，跟技能寶石串聯才有效果；鑲在身上時擊殺會累積經驗升級（最高 20 級）' };
if (typeof CAT_NAMES !== 'undefined') CAT_NAMES.gem = '寶石';

// ───────── 孔數上限與掉落時擲孔 ─────────
function gemMaxSockets(def) {
    if (!def) return 0;
    if (def.cat === 'weapon') return WEAPON_TYPES[def.type] && WEAPON_TYPES[def.type].two ? 6 : 3;
    if (def.cat !== 'armor') return 0;
    if (def.slot === 'armor') return 6;
    return ['helm', 'tshirt', 'cloak', 'gloves', 'boots', 'shield'].includes(def.slot) ? 4 : 0;
}
function gemQualityRank(inst) { const d = ITEMS[inst.id]; return d && d.unique ? 3 : inst.q === 'legend' ? 3 : inst.q === 'rare' ? 2 : inst.q === 'magic' ? 1 : 0; }
// 孔數：普通 0～1、魔法 1～2、稀有 2～3、傳說／傳奇 2～4，之後每孔 25% 再多一孔（不超過上限）
function gemRollCount(inst) {
    const M = gemMaxSockets(ITEMS[inst.id]); if (!M) return 0;
    const r = gemQualityRank(inst), base = [[0, 1], [1, 2], [2, 3], [2, 4]][r];
    let n = rand(base[0], base[1]);
    while (n < M && n >= base[0] && chance(0.25)) n++;
    return Math.min(M, n);
}
function gemRollLinks(n, inst) { const p = 0.35 + 0.1 * gemQualityRank(inst); return Array.from({ length: Math.max(0, n - 1) }, () => chance(p) ? 1 : 0); }
// 新掉落的裝備擲孔（本機 rollDrops、後端 lootApply）；已經有 so 的不動。舊裝備沒有孔，可以用開孔石開
function gemRollSockets(inst) {
    const d = inst && ITEMS[inst.id];
    if (!d || inst.so || !gemMaxSockets(d)) return inst;
    const n = gemRollCount(inst);
    if (n > 0) { inst.so = Array(n).fill(null); inst.ln = gemRollLinks(n, inst); }
    return inst;
}
const gemSocketsEmpty = x => !x.so || x.so.every(s => !s);
// 開孔石：重擲孔數（1～上限，孔數越多越難）；連結石：重擲串聯。孔裡都要先清空
function gemSocketStone(x) {
    const M = gemMaxSockets(ITEMS[x.id]), w = Array.from({ length: M }, (_, i) => M - i);   // 1 孔權重 M … M 孔權重 1
    let r = Math.random() * w.reduce((a, b) => a + b, 0), n = 1;
    for (const v of w) { if (r < v) break; r -= v; n++; }
    x.so = Array(n).fill(null); x.ln = gemRollLinks(n, x);
}
function gemLinkStone(x) { x.ln = Array.from({ length: Math.max(0, x.so.length - 1) }, () => chance(0.5) ? 1 : 0); }

// ───────── 串聯群組與技能的輔助效果 ─────────
function gemGroups(inst) {
    if (!inst || !Array.isArray(inst.so) || !inst.so.length) return [];
    const out = [[0]];
    for (let i = 1; i < inst.so.length; i++) { if (inst.ln && inst.ln[i - 1]) out[out.length - 1].push(i); else out.push([i]); }
    return out;
}
// 身上裝備：技能 id → 輔助寶石 { key: 等級 }（同種取最高）
function gemSupportMap(p = player) {
    const map = {};
    if (!p || !p.equip) return map;
    for (const s in p.equip) {
        const it = p.equip[s];
        for (const g of gemGroups(it)) {
            const gems = g.map(i => it.so[i]).filter(Boolean);
            const skills = gems.filter(x => x.t === 'skill').map(x => x.sk), sups = gems.filter(x => x.t !== 'skill' && ITEMS[x.id] && ITEMS[x.id].gem);
            for (const sk of skills) { const m = map[sk] = map[sk] || {}; for (const x of sups) { const k = ITEMS[x.id].gem; m[k] = Math.max(m[k] || 0, x.gl || 1); } }
        }
    }
    return map;
}
// 合計成一份修正：{ hitsAdd, dmgMul, aoe, add, elemInc, critAdd, leech, mpMul, cdMul, chain, physMul, physOnly, noElem, ailment }
function gemModsOf(skillId, p = player) {
    const sup = gemSupportMap(p)[skillId];
    if (!sup) return null;
    const m = { hitsAdd: 0, dmgMul: 1, aoe: false, add: { fire: 0, ice: 0, light: 0 }, elemInc: 0, critAdd: 0, leech: 0, mpMul: 1, cdMul: 1, chain: null, physMul: 1, physOnly: false, noElem: false, ailment: 0, keys: [] };
    for (const k in sup) {
        const g = SUPPORT_GEMS[k]; if (!g) continue;
        const x = g.mods(sup[k]); m.keys.push(k);
        if (x.hitsAdd) m.hitsAdd += x.hitsAdd;
        if (x.dmgMul) m.dmgMul *= x.dmgMul;
        if (x.aoe) m.aoe = true;
        if (x.add) for (const e in x.add) m.add[e] += x.add[e];
        if (x.elemInc) m.elemInc += x.elemInc;
        if (x.critAdd) m.critAdd += x.critAdd;
        if (x.leech) m.leech += x.leech;
        if (x.mpMul) m.mpMul *= x.mpMul;
        if (x.cdMul) m.cdMul *= x.cdMul;
        if (x.chain) m.chain = x.chain;
        if (x.physMul) m.physMul *= x.physMul;
        if (x.physOnly) m.physOnly = true;
        if (x.noElem) m.noElem = true;
        if (x.ailment) m.ailment += x.ailment;
    }
    return m;
}
function gemModsFor(k) { return gemModsOf(k ? k.id : GEM_ATTACK_ID); }
// 這次攻擊／施法用的能力：加上暴擊、元素增傷、附加、異常、吸血；殘忍＝去掉元素
function gemSt(st, gm) {
    if (!gm) return st;
    const E = st.elem || { inc: { fire: 0, ice: 0, light: 0 }, add: { fire: 0, ice: 0, light: 0 }, conv: { fire: 0, ice: 0, light: 0 }, ailment: 0, physMul: 1 };
    const e2 = { ...E, inc: { ...E.inc }, add: { ...E.add }, conv: { ...E.conv } };
    for (const k of ['fire', 'ice', 'light']) { e2.inc[k] += gm.elemInc; e2.add[k] += gm.add[k]; }
    e2.ailment = (E.ailment || 0) + gm.ailment;
    e2.physMul = (E.physMul == null ? 1 : E.physMul) * gm.physMul;
    if (gm.noElem) { e2.add = { fire: 0, ice: 0, light: 0 }; e2.conv = { fire: 0, ice: 0, light: 0 }; e2.iceToFire = false; e2.fireToLight = false; }
    return { ...st, crit: st.crit + gm.critAdd, magicCrit: (st.magicCrit || 0) + gm.critAdd, lifesteal: (st.lifesteal || 0) + gm.leech, elem: e2 };
}
// doStrike／castSpell 開頭：多打幾下、改成範圍
function gemPrepSkill(k) {
    const gm = gemModsFor(k);
    if (!gm) return k;
    const x = { ...k, _gm: gm };
    if (gm.aoe) x.aoe = true;
    if (gm.hitsAdd && k.type !== 'spell') x.hits = (k.hits || 1) + gm.hitsAdd;
    return x;
}
function gemMpMul(k) { const gm = k && gemModsOf(k.id); return gm ? gm.mpMul : 1; }
function gemCdMul(k) { const gm = k && gemModsOf(k.id); return gm ? gm.cdMul : 1; }
// 魔法附加的元素（輔助寶石的「附加 X」對魔法也有效，裝備詞綴的附加只加在物理攻擊）
function gemSpellExtra(gm, mon, st) {
    const parts = { fire: 0, ice: 0, light: 0 };
    if (!gm || gm.noElem || typeof elemMul !== 'function') return parts;
    for (const e of ['fire', 'ice', 'light']) if (gm.add[e] > 0) parts[e] = Math.round(gm.add[e] * (0.8 + Math.random() * 0.4) * elemMul(mon, e, st) * elemShockMul(mon));
    return parts;
}
// 連鎖：魔法打完彈跳到其他怪
function gemChain(k, st, targets, dmg) {
    const gm = k._gm; if (!gm || !gm.chain || !hunt || !hunt.mobs || dmg <= 0) return;
    const others = hunt.mobs.filter(m => m.hp > 0 && !targets.includes(m)).slice(0, gm.chain.n);
    for (const m of others) { const d = Math.max(1, Math.round(dmg * gm.chain.mul)); m.hp -= d; addLog(`🔗 連鎖：${m.name}受到 ${d} 傷害`, 'magic'); }
}

// 會持續造成傷害的增益技能（二轉場地、召喚：炎獄降臨、天雷審判、轟炸支援、槍舞、精靈王降臨…，第 321 節）也能當技能寶石。
// 施放時記下輔助寶石修正（advAfterBuff），每次跳傷害用 gemDotHit／gemDotAfter：
//   多重打擊（物理場地 ×2×倍率＝多打一次）、殘忍（物理 ×、去元素）、範圍擴大（單體／隨機 → 全部，×倍率）、附加元素、元素集中（火／冰／雷場地）、吸血、連鎖（單體才彈跳）；
//   耗魔降低、冷卻縮減照常由 talentManaCost／skillCd 生效；暴擊強化、異常強化對場地無效（場地不會暴擊）。
function gemDotSkill(s) { const a = s && s.type === 'buff' && s.adv; return !!(a && (a.field || a.summon)); }
function gemDotMods(skillId, p = player) {
    const sup = gemSupportMap(p)[skillId];
    if (!sup) return null;
    const o = { physMul: 1, aoeMul: 1, aoe: false, add: { fire: 0, ice: 0, light: 0 }, elemInc: 0, leech: 0, chain: null, noElem: false };
    for (const k in sup) {
        const g = SUPPORT_GEMS[k]; if (!g) continue;
        const x = g.mods(sup[k]);
        if (k === 'multistrike') o.physMul *= (1 + x.hitsAdd) * x.dmgMul;
        else if (k === 'aoeExpand') { o.aoe = true; o.aoeMul = x.dmgMul; }
        if (x.physMul) o.physMul *= x.physMul;
        if (x.noElem) o.noElem = true;
        if (x.add) for (const e in x.add) o.add[e] += x.add[e];
        if (x.elemInc) o.elemInc += x.elemInc;
        if (x.leech) o.leech += x.leech;
        if (x.chain) o.chain = x.chain;
    }
    return o;
}
// 施放時套到場地／召喚物件（f.aoe／f.rnd 依範圍擴大改寫）
function gemDotApply(k, f) {
    const gm = gemDotMods(k.id); if (!gm) return f;
    f.gm = gm;
    if (gm.aoe && !f.aoe && !f.poison) { f.aoe = true; f.rnd = false; f.gmAoe = true; }
    return f;
}
function gemDotHit(f, m, d, st) {
    const g = f.gm; if (!g || d <= 0) return d;
    let x = d;
    if (f.phys) x *= g.physMul;
    if (f.gmAoe) x *= g.aoeMul;
    if (g.elemInc && !g.noElem && ['fire', 'ice', 'storm', 'light'].includes(f.elem)) x *= 1 + g.elemInc;
    const ex = gemSpellExtra(g, m, st);
    return Math.max(1, Math.round(x + ex.fire + ex.ice + ex.light));
}
function gemDotAfter(f, tg, total, st) {
    const g = f.gm; if (!g || total <= 0) return;
    if (g.leech && player) player.hp = Math.min(st.maxHp, player.hp + Math.round(total * g.leech));
    if (g.chain && !f.aoe && hunt && hunt.mobs) {
        const others = hunt.mobs.filter(m => m.hp > 0 && !tg.includes(m)).slice(0, g.chain.n);
        for (const m of others) { const d = Math.max(1, Math.round(total * g.chain.mul)); m.hp -= d; addLog(`🔗 連鎖：${m.name}受到 ${d} 傷害`, 'magic'); }
    }
}

// ───────── 經驗 ─────────
function gemExpNeed(L) { return 1500 * L * L; }   // 1→20 級合計約 370 萬（Lv.50 一般每小時打怪約 60 萬經驗 → 寶石 6 萬）
function gemGainExp(exp) {
    if (!player || !player.equip || exp <= 0) return;
    const add = Math.floor(exp * GEM_EXP_SHARE);
    if (add <= 0) return;
    for (const s in player.equip) {
        const it = player.equip[s];
        if (!it || !Array.isArray(it.so)) continue;
        for (const g of it.so) {
            if (!g || g.t === 'skill' || !ITEMS[g.id] || !ITEMS[g.id].gem) continue;
            g.gl = g.gl || 1;
            if (g.gl >= GEM_MAX_LV) continue;
            g.gx = (g.gx || 0) + add;
            while (g.gl < GEM_MAX_LV && g.gx >= gemExpNeed(g.gl)) { g.gx -= gemExpNeed(g.gl); g.gl++; addLog(`💎 ${ITEMS[g.id].name}升到 Lv.${g.gl}！`, 'rare'); }
            if (g.gl >= GEM_MAX_LV) g.gx = 0;
        }
    }
}

// ───────── 鑲嵌／拆下（onclick 只呼叫這些頂層函式）─────────
function gemSkillChoices() {
    const out = [{ id: GEM_ATTACK_ID, name: '普通攻擊' }];
    for (const s of learnedSkills()) if (s.type === 'strike' || s.type === 'spell' || gemDotSkill(s)) out.push({ id: s.id, name: s.name });
    return out;
}
function gemSkillName(sk) { if (sk === GEM_ATTACK_ID) return '普通攻擊'; const s = typeof SKILL_BY_ID !== 'undefined' && SKILL_BY_ID[sk]; return s ? s.name : sk; }
function gemSocketLabel(g) {
    if (!g) return '（空）';
    if (g.t === 'skill') return '技能寶石・' + gemSkillName(g.sk);
    const d = ITEMS[g.id]; return d ? `${SUPPORT_GEMS[d.gem].icon} ${SUPPORT_GEMS[d.gem].name} Lv.${g.gl || 1}` : '？';
}
function gemUnsocketCost(g) { return !g || g.t === 'skill' ? 0 : (g.gl || 1) * GEM_UNSOCKET_GOLD; }
function gemSocketPut(itemUid, idx) {
    const it = findAnyInst(itemUid), sel = document.getElementById('gem-sel-' + idx);
    if (!it || !Array.isArray(it.so) || idx < 0 || idx >= it.so.length || it.so[idx] || !sel || !sel.value) return;
    const v = sel.value;
    if (v.startsWith('s:')) {
        const sk = v.slice(2);
        if (!gemSkillChoices().some(c => c.id === sk)) return showToast('還沒學會這個技能');
        it.so[idx] = { t: 'skill', sk };
    } else if (v.startsWith('g:')) {
        const uid = +v.slice(2), i = player.inv.findIndex(x => x.uid === uid && ITEMS[x.id] && ITEMS[x.id].cat === 'gem');
        if (i < 0) return showToast('背包裡沒有這顆寶石');
        const g = player.inv.splice(i, 1)[0];
        it.so[idx] = { uid: g.uid, id: g.id, n: 1, gl: g.gl || 1, gx: g.gx || 0 };
    } else return;
    saveGame(); refreshUI(); openSocketDialog(itemUid);
}
function gemSocketTake(itemUid, idx) {
    const it = findAnyInst(itemUid);
    if (!it || !Array.isArray(it.so) || !it.so[idx]) return;
    const g = it.so[idx], cost = gemUnsocketCost(g);
    if (cost > player.gold) return showToast(`金幣不足（需要 ${fmt(cost)}）`);
    player.gold -= cost;
    if (g.t !== 'skill') player.inv.push({ uid: g.uid, id: g.id, n: 1, gl: g.gl || 1, gx: g.gx || 0 });
    it.so[idx] = null;
    if (cost) addLog(`💎 拆下${ITEMS[g.id].name}（−${fmt(cost)} 金幣）`, 'sys');
    saveGame(); refreshUI(); openSocketDialog(itemUid);
}
function openSocketDialog(uid) {
    const it = findAnyInst(uid);
    if (!it || !Array.isArray(it.so)) return;
    const gemsInBag = player.inv.filter(x => ITEMS[x.id] && ITEMS[x.id].cat === 'gem');
    const skills = gemSkillChoices();
    const rows = gemGroups(it).map(group => '<div class="gem-group">' + group.map(i => {
        const g = it.so[i];
        const body = g ? `<b class="${g.t === 'skill' ? 'gem-skill' : 'gem-sup'}">${esc(gemSocketLabel(g))}</b> <button class="mini secondary" onclick="gemSocketTake(${uid},${i})">拆下${gemUnsocketCost(g) ? `（${fmt(gemUnsocketCost(g))} 金幣）` : ''}</button>`
            : `<select id="gem-sel-${i}"><option value="">選擇要鑲的寶石…</option><optgroup label="技能寶石（技能照常可用，這裡只當載體）">${skills.map(s => `<option value="s:${esc(s.id)}">${esc(s.name)}</option>`).join('')}</optgroup>`
              + `<optgroup label="輔助寶石（背包）">${gemsInBag.map(x => `<option value="g:${x.uid}">${esc(SUPPORT_GEMS[ITEMS[x.id].gem].name)} Lv.${x.gl || 1}</option>`).join('')}</optgroup></select> <button class="mini" onclick="gemSocketPut(${uid},${i})">鑲入</button>`;
        return `<div class="gem-socket"><span class="gem-hole">◆${i + 1}</span> ${body}</div>`;
    }).join('<div class="gem-link">║ 串聯</div>') + '</div>').join('');
    openDialog('🔷 鑲嵌寶石：' + itemName(it), `<p class="muted">同一個框裡串聯的孔：放 1 顆技能寶石，其他放輔助寶石，就會強化那個技能。拆下輔助寶石要「寶石等級 × ${fmt(GEM_UNSOCKET_GOLD)}」金幣（寶石保留）；技能寶石免費拆、拆下就消失。</p>${rows}`);
}
// 道具說明：孔與寶石
function gemSocketsHtml(inst) {
    if (!inst || !Array.isArray(inst.so)) return '';
    const s = gemGroups(inst).map(g => '[' + g.map(i => inst.so[i] ? `<span class="${inst.so[i].t === 'skill' ? 'gem-skill' : 'gem-sup'}">${esc(gemSocketLabel(inst.so[i]))}</span>` : '◇').join(' ═ ') + ']').join(' ');
    return `<span class="gem-line">🔷 孔 ${inst.so.length}：${s}</span>`;
}
function gemInfoHtml(inst) {
    const d = inst && ITEMS[inst.id];
    if (!d || !d.gem) return '';
    const g = SUPPORT_GEMS[d.gem], L = inst.gl || 1;
    return `<b class="gem-sup">${g.icon} ${g.name} Lv.${L}</b>${L >= GEM_MAX_LV ? '（最高等級）' : `<small class="muted">（經驗 ${fmt(inst.gx || 0)}／${fmt(gemExpNeed(L))}）</small>`}<br>${g.desc(L)}`;
}

// ───────── 掉落（本機；首領那一群由伺服器 tools/sockets-gems.sql 決定）─────────
const GEM_DROP_P = 0.003, GEM_BOSS_P = 0.1;
function gemDropFor(mon, qm = 1) {
    if (!mon || mon.lootTicket || mon.eliteMinion) return null;
    if (!chance((mon.boss ? GEM_BOSS_P : GEM_DROP_P) * qm)) return null;
    return SUPPORT_GEM_IDS[rand(0, SUPPORT_GEM_IDS.length - 1)];
}
