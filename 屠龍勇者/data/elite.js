// 屠龍勇者：精英怪特殊詞條（2026-11-06，ARCHITECTURE.md 第 312 節）
// 使用者決定：「地圖詞綴＝這張圖難不難、精英詞條＝這隻怪要怎麼打」。
//   異界（有「精英」地圖詞綴）的精英：T1～T5 帶 1 條、T6～T10 帶 1～2 條、T11～T15 帶 2～3 條。
//   一般野外／地監：2026-11-07 起取消精英（ELITE_FIELD_P＝0；原本 3% 變精英、固定 1 條，eliteFieldRoll 保留備用）。
//   每條詞條經驗 +50%（疊在精英 ×4 上），掉寶不變。離線模擬（SIM_MODE）不出特殊詞條、也不出野外精英。
// 執行期狀態都掛在怪物物件上（不存檔）：eliteAf 詞條、eliteShield 護盾、_eHp 上次結算的 HP（護盾用它算這段時間受到多少傷害）。
const ELITE_AFFIXES = {
    vamp:     { name: '吸血',     desc: '打中玩家時回復造成傷害的 50%' },
    shield:   { name: '護盾',     desc: '每 8 秒獲得最大 HP 15% 的護盾，打破為止' },
    manaBurn: { name: '魔力燃燒', desc: '打中玩家時扣 MP（造成傷害的 30%）' },
    thorns:   { name: '反傷',     desc: '受到物理傷害時反彈 15%（不會反彈到玩家死亡）' },
    summon:   { name: '召喚',     desc: '每 12 秒叫出 1 隻同種小怪（最多同時 2 隻）' },
    split:    { name: '分裂',     desc: '死亡時分裂成 2 隻同種小怪（HP 40%、傷害 60%）' },
    berserk:  { name: '狂暴',     desc: 'HP 低於 30% 時攻速 +50%、傷害 +30%' },
    revive:   { name: '復甦',     desc: '第一次倒下時以 40% HP 復活' },
    frost:    { name: '冰封',     afflict: 'freeze', desc: '攻擊 30% 機率使玩家冰凍' },
    blaze:    { name: '燃燒',     afflict: 'burn',   desc: '攻擊 30% 機率使玩家燒傷' },
    venom:    { name: '中毒',     afflict: 'poison', desc: '攻擊 30% 機率使玩家中毒' },
    blink:    { name: '瞬移',     desc: '每 10 秒，離玩家超過 2 格就瞬間移動到玩家身邊' },
};
// 2026-11-07 使用者要求：一般地圖（野外／地監）取消精英怪（原本 3%），精英只在有「精英」詞綴的異界出現
const ELITE_FIELD_P = 0, ELITE_EXP_PER_AFFIX = 0.5, ELITE_MINION_EXP = 0.3, ELITE_MINION_MAX = 2;
const ELITE_SHIELD_MS = 8000, ELITE_SHIELD_K = 0.15, ELITE_SUMMON_MS = 12000, ELITE_BLINK_MS = 10000;
const ELITE_VAMP_K = 0.5, ELITE_BURN_K = 0.3, ELITE_THORNS_K = 0.15, ELITE_AFFLICT_P = 0.3;
const ELITE_BERSERK_HP = 0.3, ELITE_BERSERK_SPD = 1.5, ELITE_BERSERK_DMG = 1.3, ELITE_REVIVE_HP = 0.4;

function eliteHas(m, k) { return !!(m && m.eliteAf && m.eliteAf.includes(k)); }
function eliteAffixCount() {
    if (!inMapRun()) return 1;
    const t = player.mapRun.t;
    return t <= 5 ? 1 : t <= 10 ? rand(1, 2) : rand(2, 3);
}
// 名牌顏色：1 條金、2 條橘、3 條粉紫（ui-scene.js）
function eliteNameColor(m) { const n = m.eliteAf ? m.eliteAf.length : 0; return n >= 3 ? '#ff6ad5' : n === 2 ? '#ffa040' : '#ffd34d'; }

// 野外／地監 3% 變精英（addMob 呼叫，在 applyMapMods 之後）
function eliteFieldRoll(m) {
    if (!ELITE_FIELD_P || SIM_MODE || inMapRun() || !m || m.boss || m.elite || m.eliteMinion) return;
    const z = currentZone();
    if (!z || (z.type !== 'field' && z.type !== 'dungeon') || !chance(ELITE_FIELD_P)) return;
    m.elite = true; m.fieldElite = true;   // fieldElite：不保證掉裝備（combat.js rollDrops）
    m.hp = m.maxHp = Math.round(m.maxHp * 3);
    m.dmg = m.dmg.map(d => Math.round(d * 1.5));
    m.exp *= 4;
}
// 精英擲特殊詞條（addMob 呼叫）
function eliteRollAffixes(m) {
    if (SIM_MODE || !m || !m.elite || m.boss || m.eliteAf || m.eliteMinion) return;
    const ks = Object.keys(ELITE_AFFIXES), n = eliteAffixCount(), af = [];
    while (af.length < n) { const k = ks[rand(0, ks.length - 1)]; if (!af.includes(k)) af.push(k); }
    m.eliteAf = af;
    m.exp = Math.round(m.exp * (1 + ELITE_EXP_PER_AFFIX * af.length));
    m.name = '精英・' + af.map(k => ELITE_AFFIXES[k].name).join('・') + ' ' + String(m.name).replace(/^精英・/, '');
    m.eliteShield = 0; m.eliteShieldAt = gameNow; m.eliteSummonAt = gameNow + ELITE_SUMMON_MS; m.eliteBlinkAt = gameNow + ELITE_BLINK_MS;
    m._eHp = null;
}

// ───────── 飄字（地圖畫面開著才有）─────────
function eliteSceneOf(m) { return !SIM_MODE && typeof scene !== 'undefined' && scene && scene.mons ? scene.mons.find(x => x.inst === m && !x.dead) : null; }
function eliteFloat(m, text, color) {
    const e = eliteSceneOf(m);
    if (e && typeof addFloat === 'function') addFloat(e.rx, e.ry - 0.7, text, color);
}
function elitePlayerFloat(text, color) {
    if (!SIM_MODE && typeof scene !== 'undefined' && scene && scene.pl && typeof addFloat === 'function') addFloat(scene.pl.rx, scene.pl.ry - 0.9, text, color);
}

// 護盾：把上次結算後受到的傷害先從護盾扣（所有傷害來源都會經過這裡，不用每個攻擊函式各自處理）
function eliteSettle(m) {
    if (!m.eliteAf) return;
    if (m._eHp == null) { m._eHp = m.hp; return; }
    if (m.eliteShield > 0 && m.hp < m._eHp) {
        const a = Math.min(m.eliteShield, m._eHp - m.hp);
        m.hp += a; m.eliteShield -= a;
        if (m.eliteShield <= 0) { m.eliteShield = 0; eliteFloat(m, '護盾破裂', '#9fd8ff'); }
    }
    m._eHp = m.hp;
}

// 召喚／分裂出來的小怪：不算異界剩餘數、不掉寶、沒有金幣，經驗是一般怪的 30%
function eliteMinion(src, kind) {
    if (!hunt || typeof makeMonster !== 'function' || !MONSTERS[src.id]) return null;
    const m = makeMonster(src.id);
    m.eliteMinion = true; m.eliteOwner = src;
    addMob(m);   // 套地圖詞綴（eliteMinion 不會再變精英）
    m.exp = Math.max(1, Math.round(m.exp * ELITE_MINION_EXP));
    m.gold = [0, 0];
    if (kind === 'split') {
        m.hp = m.maxHp = Math.max(1, Math.round(m.maxHp * 0.4));
        m.dmg = m.dmg.map(d => Math.max(1, Math.round(d * 0.6)));
        if (m.magic) m.magic = { ...m.magic, dmg: m.magic.dmg.map(d => Math.max(1, Math.round(d * 0.6))) };
    }
    m.name = (kind === 'split' ? '分裂・' : '召喚・') + m.name;
    return m;
}

// 每次戰鬥更新呼叫（combat.js huntTick）
function eliteTick() {
    if (SIM_MODE || !hunt || !hunt.mobs) return;
    for (const m of hunt.mobs.slice()) {
        if (!m.eliteAf || m.hp <= 0) continue;
        eliteSettle(m);
        if (eliteHas(m, 'shield') && gameNow >= m.eliteShieldAt) {
            m.eliteShieldAt = gameNow + ELITE_SHIELD_MS;
            const s = Math.round(m.maxHp * ELITE_SHIELD_K);
            if (m.eliteShield < s) { if (m.eliteShield <= 0) eliteFloat(m, '護盾', '#9fd8ff'); m.eliteShield = s; }
        }
        if (eliteHas(m, 'summon') && gameNow >= m.eliteSummonAt) {
            m.eliteSummonAt = gameNow + ELITE_SUMMON_MS;
            if (hunt.mobs.filter(x => x.eliteOwner === m && x.hp > 0).length < ELITE_MINION_MAX) {
                const c = eliteMinion(m, 'summon');
                if (c) { eliteFloat(m, '召喚', '#c18aff'); addLog(`📯 ${m.name}召喚了${c.name}！`, 'warn'); }
            }
        }
        if (eliteHas(m, 'berserk') && !m.eliteBerserk && m.hp < m.maxHp * ELITE_BERSERK_HP) {
            m.eliteBerserk = true; eliteFloat(m, '狂暴！', '#ff5a3c'); addLog(`😡 ${m.name}陷入狂暴！`, 'warn');
        }
        if (eliteHas(m, 'blink') && gameNow >= m.eliteBlinkAt) {
            m.eliteBlinkAt = gameNow + ELITE_BLINK_MS;
            eliteBlink(m);
        }
    }
}
// 瞬移：地圖畫面上離玩家超過 2 格 → 移到玩家旁邊的空格（畫面沒開時怪本來就直接打得到，不用處理）
function eliteBlink(m) {
    const e = eliteSceneOf(m), pl = scene && scene.pl;
    if (!e || !pl || e.fixed || Math.max(Math.abs(e.x - pl.x), Math.abs(e.y - pl.y)) <= 2 || typeof freeTile !== 'function') return false;
    const around = [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [-1, 1], [1, -1], [-1, -1]].sort(() => Math.random() - 0.5);
    for (const [dx, dy] of around) {
        const x = pl.x + dx, y = pl.y + dy;
        if (!freeTile(x, y)) continue;
        e.x = e.rx = x; e.y = e.ry = y;
        if (e.path) e.path = [];
        eliteFloat(m, '瞬移', '#9fd8ff');
        addLog(`💨 ${m.name}瞬間移動到你身邊！`, 'warn');
        return true;
    }
    return false;
}

// 狂暴：攻擊間隔與傷害（combat.js）
function eliteAtkMul(m) { return m && m.eliteBerserk ? 1 / ELITE_BERSERK_SPD : 1; }
function eliteDmgMul(m) { return m && m.eliteBerserk ? ELITE_BERSERK_DMG : 1; }

// 精英打中玩家後（combat.js monsterAttack）：吸血、魔力燃燒、冰封／燃燒／中毒
function eliteOnHitPlayer(m, dmg, magic) {
    if (!m || !m.eliteAf || dmg <= 0) return;
    if (eliteHas(m, 'vamp') && m.hp > 0) {
        const h = Math.min(m.maxHp - m.hp, Math.max(1, Math.round(dmg * ELITE_VAMP_K)));
        if (h > 0) { m.hp += h; if (m._eHp != null) m._eHp = m.hp; eliteFloat(m, '吸血 +' + h, '#7fe07a'); }
    }
    if (eliteHas(m, 'manaBurn') && player.mp > 0) {
        const b = Math.min(player.mp, Math.max(1, Math.round(dmg * ELITE_BURN_K)));
        player.mp -= b; elitePlayerFloat('-' + b + ' MP', '#6fb6ff');
    }
    for (const k of ['frost', 'blaze', 'venom']) if (eliteHas(m, k)) afflictTry(m, magic, dmg, player, { kind: ELITE_AFFIXES[k].afflict, on: 'hit', p: ELITE_AFFLICT_P });
}
// 玩家物理攻擊打中精英（combat.js physicalAttack）：反傷
function eliteOnPlayerPhys(m, total) {
    if (!eliteHas(m, 'thorns') || total <= 0 || player.hp <= 1) return;
    const r = Math.min(player.hp - 1, Math.max(1, Math.round(total * ELITE_THORNS_K)));
    player.hp -= r;
    elitePlayerFloat('反傷 -' + r, '#ff6b5b');
}

// onKill 一開始呼叫：護盾擋下／復甦 → 回傳 true＝這次沒死
function eliteBeforeKill(m) {
    if (!m.eliteAf) return false;
    eliteSettle(m);
    if (m.hp > 0) return true;
    if (eliteHas(m, 'revive') && !m.eliteRevived) {
        m.eliteRevived = true;
        m.hp = Math.max(1, Math.round(m.maxHp * ELITE_REVIVE_HP)); m._eHp = m.hp;
        eliteFloat(m, '復甦！', '#ffd34d'); addLog(`✨ ${m.name}復甦了！（HP ${m.hp}/${m.maxHp}）`, 'warn');
        return true;
    }
    return false;
}
// onKill 結算後呼叫：分裂
function eliteAfterKill(m) {
    if (!eliteHas(m, 'split') || !player.hunting || !hunt) return;
    const a = eliteMinion(m, 'split'), b = a && eliteMinion(m, 'split');
    if (a) addLog(`🧬 ${m.name}分裂成${b ? '兩隻' : '一隻'}${a.name}！`, 'warn');
}
// 詞條說明（點怪物名牌／圖鑑可用）
function eliteAffixText(m) { return m && m.eliteAf ? m.eliteAf.map(k => `${ELITE_AFFIXES[k].name}：${ELITE_AFFIXES[k].desc}`).join('\n') : ''; }
