// 浪跡江湖：即時戰鬥（ARCHITECTURE.md 第 10 節）
// 普攻：貼近到兵器射程內自動出手；外功：射程內立即生效；內功：射程內先聚氣（讀條）再出手
// 防禦：命中－閃避決定打不打得到；卸勁＝機率讓外功（近身）傷害減半；化勁＝內功（遠程）傷害按比例減免
function buffSum(stat) { let v = 0; for (const b of W.buffs) if (b.stat === stat) v += b.val; return v; }

function floatText(x, y, text, cls) {
    W.fx.push({ x: x + rand(-10, 10), y, text: String(text), cls: cls || '', t: 1.1 });
    if (W.fx.length > 40) W.fx.shift();
}

function rollDamage(atk, mul, def, crit, mustCrit) {
    const isCrit = mustCrit || Math.random() * 100 < crit;
    let d = Math.max(1, atk * mul - def * 0.5) * rand(0.9, 1.1);
    if (isCrit) d *= 1.6;
    return { d: Math.floor(d), crit: isCrit };
}

function hitRoll(hit, dodge) { return Math.random() * 100 < clamp(hit - dodge, 20, 99); }

// ── 玩家出手 ──
function playerAtk(kind) {
    const s = W.stats, base = kind === 'inner' ? s.inner : s.outer;
    return base * (1 + buffSum('atkPct') / 100);
}

function basicAttack(t) {
    W.actAt = performance.now();
    if (!hitRoll(W.stats.hit, t.dodge)) { floatText(t.x, t.y - 50, '閃', 'miss'); provoke(t); return; }
    const h = rollDamage(playerAtk('outer'), 1, t.def, W.stats.crit, false);
    damageMob(t, h.d, h.crit, '');
}

function provoke(m) { if (m.state !== 'dead') m.fighting = true; }

function skillReady(id) {
    const sk = skillDef(id), lv = G.skills[id] || 0;
    if (!sk || !lv) return '尚未習得';
    if (sk.kind === 'inner' && sk.sect !== G.sect) return '非本門武學';
    if (sk.kind === 'outer' && sk.wtype !== W.stats.wtype) return `需裝備${WEAPON_TYPES[sk.wtype].name}`;
    if ((W.cds[id] || 0) > 0) return '冷卻中';
    if (G.mp < sk.mp) return '真氣不足';
    return '';
}

function skillRange(sk) { return sk.kind === 'outer' ? W.stats.range : sk.range; }
function needsTarget(sk) { return sk.kind === 'outer' || sk.range > 0; }

// 快捷鍵／自動施放：需要目標的武學若距離不夠，先走過去（W.queued）
function useSkill(id, silent) {
    if (W.revive > 0 || W.casting) return false;
    const why = skillReady(id);
    if (why) { if (!silent) showToast(why); return false; }
    const sk = skillDef(id);
    if (needsTarget(sk)) {
        const t = W.target;
        if (!t || t.state === 'dead') { if (!silent) showToast('請先點選目標'); return false; }
        if (dist(W.me, t) > skillRange(sk) + 10) { W.queued = id; return false; }
    }
    W.queued = null;
    if (sk.cast) {
        const total = sk.cast / (1 + W.stats.cast / 100);
        W.casting = { id, t: 0, total, target: W.target };
        W.moveTo = null;
        return true;
    }
    castSkill(id, W.target);
    return true;
}

function cancelCast() { if (W && W.casting) W.casting = null; }

function castSkill(id, t) {
    const sk = skillDef(id), lv = G.skills[id], s = W.stats;
    G.mp -= sk.mp; W.cds[id] = sk.cd; W.actAt = performance.now();
    floatText(W.me.x, W.me.y - 80, sk.name, 'skill');
    if (sk.heal) {
        const n = Math.floor(s.hp * skillLvVal(sk.heal, sk.perLv, lv) / 100);
        G.hp = Math.min(s.hp, G.hp + n); floatText(W.me.x, W.me.y - 60, '+' + fmt(n), 'heal');
    }
    if (sk.buff) {
        W.buffs = W.buffs.filter(b => b.id !== id);
        W.buffs.push({ id, name: sk.name, stat: sk.buff.stat, val: skillLvVal(sk.buff.val, sk.perLv, lv), t: sk.buff.dur });
    }
    if (!sk.mul) return;
    // 範圍：有目標以目標為中心，自身範圍技（range 0）以自己為中心
    const center = sk.range === 0 && sk.kind === 'inner' ? W.me : t;
    if (!center) return;
    const victims = sk.aoe ? W.mobs.filter(m => m.state !== 'dead' && dist(m, center) <= sk.aoe) : [t];
    if (sk.aoe) W.fx.push({ ring: true, x: center.x, y: center.y, r: sk.aoe, t: 0.4, cls: sk.kind });
    const atk = playerAtk(sk.kind), mul = skillLvVal(sk.mul, sk.perLv, lv);
    for (const m of victims) {
        if (!m || m.state === 'dead') continue;
        let total = 0, anyCrit = false, hits = sk.hits || 1;
        for (let i = 0; i < hits; i++) {
            if (!hitRoll(s.hit + 5, m.dodge)) continue;
            const h = rollDamage(atk, mul, m.def, s.crit, sk.mustCrit);
            total += h.d; anyCrit = anyCrit || h.crit;
        }
        if (!total) { floatText(m.x, m.y - 50, '閃', 'miss'); provoke(m); continue; }
        if (sk.stun) m.stun = sk.stun;
        if (sk.dot) m.dots.push({ dmg: Math.max(1, Math.floor(atk * (sk.dot.mul + sk.perLv * 0.5 * (lv - 1)))), t: sk.dot.dur, acc: 0 });
        damageMob(m, total, anyCrit, sk.kind === 'inner' ? 'inner' : 'outer');
    }
}

function damageMob(m, dmg, crit, cls) {
    m.hp -= dmg; m.hitAt = performance.now(); provoke(m);
    floatText(m.x, m.y - 50, fmt(dmg) + (crit ? '!' : ''), crit ? 'crit ' + cls : cls);
    if (m.hp <= 0) onMobKill(m);
}

// ── 怪物出手 ──
function mobAttack(m) {
    const s = W.stats, me = W.me;
    W.hurtAt = performance.now();
    if (!hitRoll(m.hit, s.dodge + buffSum('dodge'))) { floatText(me.x, me.y - 60, '閃避', 'miss'); return; }
    const h = rollDamage(m.atk, 1, s.def * (1 + buffSum('defPct') / 100), m.crit, false);
    let d = h.d, tag = '';
    if (m.dtype === 'outer' && Math.random() * 100 < s.xiejin + buffSum('xiejin')) { d = Math.floor(d * 0.5); tag = ' 卸勁'; }
    if (m.dtype === 'inner') d = Math.floor(d * (1 - s.huajin / 100));
    G.hp -= d;
    floatText(me.x, me.y - 60, '-' + fmt(d) + tag, 'hurt');
}

function combatTick(dt) {
    const t = W.target;
    if (W.casting) {
        const c = W.casting;
        if (needsTarget(skillDef(c.id)) && (!c.target || c.target.state === 'dead')) { W.casting = null; return; }
        if ((c.t += dt) >= c.total) { W.casting = null; castSkill(c.id, c.target); }
        return;
    }
    if (!t || t.state === 'dead') return;
    const d = dist(W.me, t);
    if (W.queued && d <= skillRange(skillDef(W.queued)) + 10) { useSkill(W.queued, true); return; }
    if (G.autoHunt && G.huntSkills) {
        for (const id of G.hotbar) {
            if (!id || id.startsWith('pot:') || skillReady(id)) continue;
            const sk = skillDef(id);
            if (sk.heal && G.hp > W.stats.hp * 0.6) continue;
            if (sk.buff && W.buffs.some(b => b.id === id)) continue;
            if (needsTarget(sk) && d > skillRange(sk) + 10) continue;
            if (useSkill(id, true)) return;
        }
    }
    if (d <= W.stats.range + 10 && (W.atkTimer -= dt) <= 0) {
        W.atkTimer = W.stats.atkInterval;
        basicAttack(t);
    }
}

// ── 結算 ──
function onMobKill(m) {
    m.state = 'dead'; m.fighting = false; m.dots = []; m.respawnT = m.boss ? m.grp.respawn : 8;
    if (W.target === m) W.target = null;
    if (W.casting && W.casting.target === m) W.casting = null;
    G.silver += m.silver; G.xiuwei += m.xiuwei; G.stat.kills++;
    if (m.boss) { G.stat.bosses++; addLog(`🏆 擊敗首領【${m.name}】！`, 'gold'); }
    const drop = rollDrop(m);
    if (drop) {
        if (drop.q <= G.autoSell) { const p = sellPrice(drop); G.silver += p; addLog(`自動賣出 ${gearLabel(drop)}，得 ${p} 兩`); }
        else if (addToBag(drop)) { addLog(`獲得 ${gearLabel(drop)}`); floatText(m.x, m.y - 30, '寶物', 'loot'); }
        else addLog('行囊已滿，裝備遺失了', 'bad');
    }
    gainExp(m.exp);
    markDirty();
}

function onPlayerDeath() {
    const lost = Math.min(G.exp, Math.floor(expNeed(G.lv) * 0.05));
    G.exp -= lost; G.stat.deaths++; G.hp = 0;
    addLog(`💀 你身受重傷，損失 ${lost} 經驗，${REVIVE_DELAY} 秒後回城`, 'bad');
    W.revive = REVIVE_DELAY; W.target = null; W.casting = null; W.moveTo = null; W.buffs = [];
    for (const m of W.mobs) if (m.fighting) { m.fighting = false; m.state = 'return'; m.hp = m.maxHp; }
    markDirty();
}

// ── 丹藥 ──
function usePotion(k, silent) {
    if (W.potCd > 0 || W.revive > 0) return;
    if (!G.pots[k]) { if (!silent) showToast(CONSUMABLES[k].name + '用完了'); return; }
    const c = CONSUMABLES[k], s = W.stats;
    G.pots[k]--; W.potCd = POT_CD;
    if (c.heal === 'hp') G.hp = Math.min(s.hp, G.hp + s.hp * c.pct / 100);
    else G.mp = Math.min(s.mp, G.mp + s.mp * c.pct / 100);
    floatText(W.me.x, W.me.y - 70, c.name, 'heal');
}

function autoPotion() {
    const s = W.stats;
    if (G.hp / s.hp * 100 < G.autoPot.hp) usePotion('jinchuang', true);
    else if (G.mp / s.mp * 100 < G.autoPot.mp) usePotion('huiqi', true);
}
