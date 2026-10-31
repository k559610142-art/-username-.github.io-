// 異常狀態（2026-11-01，ARCHITECTURE.md 第 260 節）：怪物附加在玩家與傭兵身上的負面狀態。
// 狀態存在 mercenary.js 的 mercDebuffs（mercNegative(owner)，不寫存檔），回村莊、傭兵「淨化」會清掉，離線／團隊副本模擬不附加。
// 使用者決定：10 種全做、只靠時間／回村／淨化解除、抗性只看 MR（MR 越高越不容易中、時間越短）。
// 依賴 config、monsters、player、combat、mercenary；mercEnemyStatus／mercDebuffTick／mercSlowFactor 轉呼叫這裡。

// dot：每秒傷害（dmg＝附加那一下傷害的比例、maxhp＝最大 HP 比例）；lethal：會不會打死人
// control：完全不能行動；breakOnHit：被打到提早解除；imm：解除後幾毫秒內不會再中同一種（控制不會連續）
const AFFLICTS = {
    poison:   { name: '中毒',     emoji: '🟢', ms: 6000, dot: 'dmg', k: 0.12, desc: b => `每秒 ${b.damage} 傷害，最低保留 1 HP` },
    burn:     { name: '燒傷',     emoji: '🔥', ms: 5000, dot: 'dmg', k: 0.15, lethal: true, antiheal: 0.3, desc: b => `每秒 ${b.damage} 傷害（會燒死）、回血效果 −30%` },
    bleed:    { name: '流血',     emoji: '🩸', ms: 6000, dot: 'maxhp', k: 0.015, desc: b => `每秒 ${b.damage} 傷害（最大 HP 1.5%），最低保留 1 HP` },
    slow:     { name: '冰霜緩速', emoji: '🐌', ms: 4000, desc: () => '攻擊與施法間隔增加 20%' },
    freeze:   { name: '冰凍',     emoji: '🧊', ms: 1500, bossMs: 2000, control: true, breakOnHit: true, imm: 3000, desc: () => '無法攻擊、施法、喝水；被打到會提早解凍' },
    paralyze: { name: '麻痺',     emoji: '⚡', ms: 4000, skip: 0.3, imm: 2000, desc: () => '每次出手有 30% 機率身體麻痺不能動' },
    silence:  { name: '沉默',     emoji: '🔇', ms: 3000, imm: 2000, desc: () => '無法施放魔法與技能，普攻正常' },
    curse:    { name: '詛咒',     emoji: '💀', ms: 8000, ac: 10, mr: 20, desc: () => '防禦（AC）+10 變差、MR −20' },
    blind:    { name: '致盲',     emoji: '🌫️', ms: 5000, hit: 15, desc: () => '命中 −15（約 −30% 命中率）' },
    petrify:  { name: '石化',     emoji: '🪨', ms: 2000, control: true, taken: 0.5, imm: 4000, desc: () => '無法行動，期間受到的傷害減半' },
};
const AFFLICT_DEFAULT_P = { dot: 0.6, control: 0.35, other: 0.5 };   // 魔法打中時的附加機率（各怪可另外指定 p）

// 怪物 → 狀態：on 'magic'＝放魔法打中才附加（預設），'hit'＝普攻打中也會（沒有魔法的怪用，機率較低）
// 一般怪用怪物代號；永夜之塔的怪代號是 tower+樓層，所以用名字（首領去掉「（30F）」）
const AFFLICT_MONS = {
    // 中毒、緩速（原本就有，打中必定附加）
    giantSpider: { kind: 'poison', p: 1 }, venomSpider: { kind: 'poison', p: 1 }, venomQueen: { kind: 'poison', p: 1 },
    sandScorpion: { kind: 'poison', on: 'hit', p: 0.2 }, ghast: { kind: 'slow', p: 1 },
    // 燒傷
    salamander: { kind: 'burn' }, fireSpirit: { kind: 'burn' }, hellhound: { kind: 'burn' }, cerberus: { kind: 'burn' }, drake: { kind: 'burn' },
    lavaGolem: { kind: 'burn', on: 'hit', p: 0.2 }, flameKnight: { kind: 'burn', on: 'hit', p: 0.2 },
    ifrit: { kind: 'burn' }, demon: { kind: 'burn' }, wakingDrake: { kind: 'burn' }, wyvern: { kind: 'burn' }, wyvernling: { kind: 'burn' }, valakas: { kind: 'burn' },
    // 冰凍
    frostWitch: { kind: 'freeze' }, iceGiantKing: { kind: 'freeze' }, fafurion: { kind: 'freeze' },
    iceGolem: { kind: 'freeze', on: 'hit', p: 0.12 }, yeti: { kind: 'freeze', on: 'hit', p: 0.12 },
    // 麻痺
    lindvior: { kind: 'paralyze' }, harpy: { kind: 'paralyze' }, chimera: { kind: 'paralyze' },
    // 流血
    werewolf: { kind: 'bleed', on: 'hit', p: 0.2 }, lycan: { kind: 'bleed', on: 'hit', p: 0.2 }, snowWolf: { kind: 'bleed', on: 'hit', p: 0.25 },
    pirateKing: { kind: 'bleed', on: 'hit', p: 0.25 }, giantSkeleton: { kind: 'bleed', on: 'hit', p: 0.2 },
    // 沉默
    ivoryMage: { kind: 'silence' }, necromancer: { kind: 'silence' }, castor: { kind: 'silence' },
    // 詛咒
    mummy: { kind: 'curse', on: 'hit', p: 0.2 }, anubis: { kind: 'curse', on: 'hit', p: 0.2 }, tombGuardian: { kind: 'curse', on: 'hit', p: 0.2 },
    baphomet: { kind: 'curse' }, forgottenKing: { kind: 'curse' }, giantKingSpirit: { kind: 'curse' }, boneDragon: { kind: 'curse' },
    // 致盲
    floatingEye: { kind: 'blind' }, beholder: { kind: 'blind' }, caveBat: { kind: 'blind', on: 'hit', p: 0.15 },
    // 石化
    sphinx: { kind: 'petrify', p: 0.25 }, osiris: { kind: 'petrify' }, antharas: { kind: 'petrify' },
    // 永夜之塔（名字）
    '骷髏神射手': { kind: 'curse', on: 'hit', p: 0.15 }, '死亡騎士的隨從': { kind: 'curse', on: 'hit', p: 0.15 }, '巨大牛人': { kind: 'bleed' },
    '石像鬼': { kind: 'blind' }, '暗影刺客': { kind: 'blind' }, '黑暗女妖': { kind: 'silence' },
    '火焰之影': { kind: 'burn', on: 'hit', p: 0.2 }, '熔岩高崙': { kind: 'burn', on: 'hit', p: 0.2 }, '炎魔之影': { kind: 'burn' },
    '冰原狼人': { kind: 'freeze' }, '冰之魔女': { kind: 'freeze' }, '冰之女王': { kind: 'freeze' },
    '巫妖': { kind: 'silence', on: 'hit', p: 0.15 }, '死靈法師': { kind: 'silence', on: 'hit', p: 0.15 }, '巫妖王': { kind: 'silence' },
    '墮落天使': { kind: 'blind' }, '地獄騎士': { kind: 'burn' }, '墮落的大天使': { kind: 'blind' },
    '混沌戰士': { kind: 'bleed', on: 'hit', p: 0.2 }, '混沌法師': { kind: 'paralyze', on: 'hit', p: 0.15 }, '混沌之主': { kind: 'paralyze' },
    '深淵魔物': { kind: 'bleed' }, '虛空行者': { kind: 'curse' }, '深淵領主': { kind: 'curse' },
    '冥界守衛': { kind: 'curse', on: 'hit', p: 0.15 }, '冥界死神': { kind: 'bleed', on: 'hit', p: 0.2 }, '死神': { kind: 'bleed' },
    '冥法親衛': { kind: 'paralyze' }, '冥法巫師': { kind: 'silence' }, '冥法軍王': { kind: 'petrify' },
};
const afflictImm = new WeakMap();   // owner → { kind: 免疫到期時間 }

function afflictRule(mon) {
    if (!mon) return null;
    return AFFLICT_MONS[mon.id] || AFFLICT_MONS[String(mon.name || '').replace(/（.*$/, '')] || null;
}
function afflictMr(owner) {
    if (owner === player) return calcStats().mr;
    return typeof mercStats === 'function' && owner ? mercStats(owner).mr || 0 : 0;
}
// MR 減免：機率與時間都 × (1 − MR/300)，MR 150 封頂（−50%）
function afflictResist(owner) { return 1 - clamp(afflictMr(owner), 0, 150) / 300; }

// 怪物打中後呼叫（玩家 combat.js monsterAttack、傭兵 mercenary.js mercEnemyAttack）；dealt＝實際扣到的血
function afflictTry(mon, magic, dealt, owner) {
    if (SIM_MODE || dealt <= 0 || !owner || owner.hp <= 0) return;
    const rule = afflictRule(mon), def = rule && AFFLICTS[rule.kind];
    if (!def || rule.on !== 'hit' && !magic) return;
    const kind = rule.kind, now = gameNow;
    if (((afflictImm.get(owner) || {})[kind] || 0) > now) return;
    const res = afflictResist(owner);
    const p = rule.p != null ? rule.p : def.control ? AFFLICT_DEFAULT_P.control : def.dot ? AFFLICT_DEFAULT_P.dot : AFFLICT_DEFAULT_P.other;
    if (!chance(p * res)) return;
    const list = mercNegative(owner), old = list[kind];
    if (def.control && old) return;   // 控制中不重新計時
    const ms = Math.round((mon.boss && def.bossMs ? def.bossMs : def.ms) * res);
    const maxHp = owner === player ? calcStats().maxHp : mercStats(owner).hp;
    const damage = def.dot === 'dmg' ? Math.max(1, Math.round(dealt * def.k)) : def.dot === 'maxhp' ? Math.max(1, Math.round(maxHp * def.k)) : 0;
    list[kind] = { kind, name: def.name, until: now + ms, at: old ? old.at : now + 1000, damage: Math.max(damage, old ? old.damage || 0 : 0), src: mon.name };
    // 免疫時間先記到「自然結束＋imm」；提早解除（冰凍被打）時 afflictEnd 會改成解除當下＋imm
    if (def.imm) { const m = afflictImm.get(owner) || {}; m[kind] = now + ms + def.imm; afflictImm.set(owner, m); }
    addLog(`${def.emoji} ${owner === player ? '你' : '傭兵'}陷入${def.name}！（${(ms / 1000).toFixed(1)} 秒）`, 'warn');
}

function afflictOn(owner, kind) {
    if (SIM_MODE || !owner) return false;
    const b = mercNegative(owner)[kind];
    return !!(b && b.until > gameNow);
}
function afflictEnd(owner, kind) {
    const list = mercNegative(owner);
    if (!list[kind]) return;
    delete list[kind];
    const def = AFFLICTS[kind];
    if (def && def.imm) { const m = afflictImm.get(owner) || {}; m[kind] = gameNow + def.imm; afflictImm.set(owner, m); }
}
// 完全不能行動（冰凍、石化）
function afflictStunned(owner) { return afflictOn(owner, 'freeze') || afflictOn(owner, 'petrify'); }
// 這次出手被麻痺吃掉
function afflictSkipAction(owner) {
    if (!afflictOn(owner, 'paralyze') || !chance(AFFLICTS.paralyze.skip)) return false;
    if (owner === player) addLog('⚡ 身體麻痺，無法行動！', 'warn');
    return true;
}
function afflictSilenced(owner) { return afflictOn(owner, 'silence'); }
function afflictSlowFactor(owner) { return afflictOn(owner, 'slow') ? 1.2 : 1; }
// 回血效果倍率（燒傷 −30%）：藥水、治癒魔法、自然回復
function afflictHealMul(owner = player) { return afflictOn(owner, 'burn') ? 1 - AFFLICTS.burn.antiheal : 1; }
// calcStats 用：詛咒 AC 變差／MR 下降、致盲命中下降（只算玩家）
function afflictStatMods(p) {
    if (p !== player || SIM_MODE) return { ac: 0, mr: 0, hit: 0 };
    return { ac: afflictOn(p, 'curse') ? AFFLICTS.curse.ac : 0, mr: afflictOn(p, 'curse') ? AFFLICTS.curse.mr : 0, hit: afflictOn(p, 'blind') ? AFFLICTS.blind.hit : 0 };
}
// 受到傷害時：石化減半；冰凍被打到提早解凍
function afflictOnHurt(owner, dmg) {
    if (afflictOn(owner, 'petrify')) dmg = Math.round(dmg * AFFLICTS.petrify.taken);
    return dmg;
}
function afflictAfterHurt(owner, dmg) {
    if (dmg > 0 && afflictOn(owner, 'freeze')) { afflictEnd(owner, 'freeze'); if (owner === player) addLog('🧊 受到攻擊，冰凍解除了', 'sys'); }
}

// 每次 cleanBuffs（玩家）呼叫：持續傷害、到期處理
function afflictTick() {
    if (SIM_MODE || !player) return;
    for (const owner of [player, player.mercenary].filter(Boolean)) {
        if (owner.hp <= 0 || owner === player.mercenary && (!owner.active || owner.dead) || inTown()) { mercDebuffs.delete(owner); continue; }
        const list = mercDebuffs.get(owner);
        if (!list) continue;
        for (const kind of Object.keys(list)) {
            const b = list[kind], def = AFFLICTS[kind];
            if (!def || b.until <= gameNow) { afflictEnd(owner, kind); continue; }
            if (!def.dot || b.at > gameNow) continue;
            b.at = gameNow + 1000;
            const who = owner === player ? '你' : '傭兵';
            if (def.lethal) {
                const damage = Math.min(owner.hp, b.damage);
                owner.hp -= damage;
                addLog(`${def.emoji} ${who}${def.name}受到 ${damage} 傷害`, 'hurt');
                if (owner.hp <= 0) {
                    if (owner === player) { if (!(typeof advPreventDeath === 'function' && advPreventDeath(calcStats()))) onDeath({ name: def.name }); }
                    else mercDie();
                    return;
                }
            } else {
                // 不致死、不觸發反傷／代擋（中毒、流血）
                const damage = Math.min(Math.max(0, owner.hp - 1), b.damage);
                owner.hp -= damage;
                if (damage) addLog(`${def.emoji} ${who}${def.name}受到 ${damage} 傷害`, 'hurt');
            }
        }
    }
}

// 狀態列說明（icons.js）
function afflictDesc(kind, b) { const d = AFFLICTS[kind]; return d ? `${d.name}：${d.desc(b)}` : b.name; }
function afflictIconHtml(kind) { const d = AFFLICTS[kind]; return `<span class="bf-emoji">${d ? d.emoji : '☠️'}</span>`; }

// 人物身上的特效（ui-scene.js drawPlayer、mercenary.js sceneDrawMerc 呼叫）：x,y＝腳底，h＝身高
function afflictDrawFx(ctx, owner, x, y, h) {
    if (SIM_MODE || !owner) return;
    const list = mercDebuffs.get(owner);
    if (!list) return;
    const t = performance.now(), top = y - h, mid = y - h / 2;
    ctx.save();
    for (const kind of Object.keys(list)) {
        if (list[kind].until <= gameNow) continue;
        if (kind === 'burn') {   // 火苗往上竄
            ctx.globalCompositeOperation = 'lighter';
            for (let i = 0; i < 6; i++) {
                const k = ((t / 600 + i / 6) % 1), fx = x + Math.sin(i * 2.1 + t / 200) * h * 0.25, fy = y - 4 - k * h * 0.9;
                const r = (1 - k) * 5 + 1.5, g = ctx.createRadialGradient(fx, fy, 0, fx, fy, r);
                g.addColorStop(0, 'rgba(255,240,180,.9)'); g.addColorStop(0.4, 'rgba(255,120,20,.8)'); g.addColorStop(1, 'rgba(255,40,0,0)');
                ctx.fillStyle = g; ctx.beginPath(); ctx.arc(fx, fy, r, 0, Math.PI * 2); ctx.fill();
            }
            ctx.globalCompositeOperation = 'source-over';
        } else if (kind === 'freeze') {   // 冰殼
            ctx.fillStyle = 'rgba(150,220,255,.35)'; ctx.strokeStyle = 'rgba(220,250,255,.9)'; ctx.lineWidth = 1.2;
            ctx.beginPath(); ctx.moveTo(x, top - 4); ctx.lineTo(x + h * 0.32, mid - 4); ctx.lineTo(x + h * 0.26, y + 2); ctx.lineTo(x - h * 0.26, y + 2); ctx.lineTo(x - h * 0.32, mid - 6); ctx.closePath();
            ctx.fill(); ctx.stroke();
        } else if (kind === 'petrify') {   // 灰色石殼
            ctx.fillStyle = 'rgba(120,115,105,.55)';
            ctx.beginPath(); ctx.ellipse(x, mid, h * 0.3, h * 0.55, 0, 0, Math.PI * 2); ctx.fill();
        } else if (kind === 'paralyze') {   // 電光
            ctx.strokeStyle = `rgba(255,245,120,${0.6 + 0.4 * Math.sin(t / 40)})`; ctx.lineWidth = 1.5;
            for (let j = 0; j < 2; j++) {
                ctx.beginPath(); let px = x - h * 0.3, py = mid + (j ? 6 : -8) + Math.sin(t / 60 + j) * 4; ctx.moveTo(px, py);
                for (let i = 0; i < 5; i++) { px += h * 0.12; py += (Math.random() - 0.5) * 10; ctx.lineTo(px, py); }
                ctx.stroke();
            }
        } else if (kind === 'poison' || kind === 'bleed') {   // 綠泡泡／血滴
            ctx.fillStyle = kind === 'poison' ? 'rgba(110,230,90,.85)' : 'rgba(210,20,30,.9)';
            for (let i = 0; i < 3; i++) {
                const k = ((t / 900 + i / 3) % 1);
                const fx = x + (i - 1) * h * 0.18, fy = kind === 'poison' ? y - 6 - k * h * 0.8 : mid + k * h * 0.5;
                ctx.globalAlpha = 1 - k; ctx.beginPath(); ctx.arc(fx, fy, 2.2, 0, Math.PI * 2); ctx.fill();
            }
            ctx.globalAlpha = 1;
        } else if (kind === 'slow') {
            ctx.strokeStyle = 'rgba(150,234,255,.8)'; ctx.lineWidth = 1.4;
            ctx.beginPath(); ctx.ellipse(x, y, h * 0.35, h * 0.12, 0, 0, Math.PI * 2); ctx.stroke();
        } else if (kind === 'curse') {   // 紫色漩渦
            ctx.strokeStyle = 'rgba(190,90,255,.8)'; ctx.lineWidth = 1.5;
            ctx.beginPath(); ctx.ellipse(x, y, h * 0.35, h * 0.12, 0, t / 300, t / 300 + Math.PI * 1.4); ctx.stroke();
        } else if (kind === 'blind') {   // 頭部黑霧
            ctx.fillStyle = 'rgba(20,20,30,.55)';
            ctx.beginPath(); ctx.ellipse(x, top + h * 0.15, h * 0.25, h * 0.12, 0, 0, Math.PI * 2); ctx.fill();
        }
    }
    // 沉默、麻痺等在頭上顯示小圖示（最多 3 個）
    const icons = Object.keys(list).filter(k => list[k].until > gameNow && ['silence', 'paralyze', 'freeze', 'petrify', 'curse', 'blind'].includes(k)).slice(0, 3);
    if (icons.length) {
        ctx.font = '11px "Segoe UI Emoji","Apple Color Emoji",sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        icons.forEach((k, i) => ctx.fillText(AFFLICTS[k].emoji, x + (i - (icons.length - 1) / 2) * 13, top - 30));
    }
    ctx.restore();
}
