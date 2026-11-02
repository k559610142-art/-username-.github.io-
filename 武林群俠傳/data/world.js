// 浪跡江湖：世界狀態、移動、怪物 AI、傳送點、自動練功（ARCHITECTURE.md 第 9 節）
// W 是執行中的世界暫態（不存檔）；玩家資料在 G
let W = null;
let mobSeq = 0;

function refreshStats() { if (W && G) W.stats = calcStats(G); }

function enterMap(id, x, y) {
    const m = MAPS[id];
    G.map = id;
    buildObstacles(id);
    W = W || {};
    Object.assign(W, {
        mapId: id, mobs: [], fx: W.fx || [], target: null, moveTo: null, npcTarget: null,
        casting: null, cds: W.cds || {}, buffs: W.buffs || [], potCd: 0, revive: 0, atkTimer: 0.3,
        wanderT: 0, actAt: 0, hurtAt: 0, ignore: {}, chaseT: 0, queued: null, time: W.time || 0,
    });
    W.me = { x: x != null ? x : (m.spawn ? m.spawn.x : m.portals[0].tx), y: y != null ? y : (m.spawn ? m.spawn.y : m.portals[0].ty), dir: 1, walking: false };
    if (blocked(id, W.me.x, W.me.y, 14)) { const p = freeSpot(id, W.me.x, W.me.y, 200); W.me.x = p.x; W.me.y = p.y; }
    for (const g of m.mobs || []) for (let i = 0; i < g.count; i++) W.mobs.push(spawnMob(id, g, false));
    if (m.boss) W.mobs.push(spawnMob(id, m.boss, true));
    refreshStats();
    W.mapDirty = true;
}

function freeSpot(mapId, cx, cy, r) {
    for (let i = 0; i < 60; i++) {
        const a = Math.random() * Math.PI * 2, d = Math.random() * r;
        const x = cx + Math.cos(a) * d, y = cy + Math.sin(a) * d;
        if (!blocked(mapId, x, y, 16)) return { x, y };
    }
    return { x: cx, y: cy };
}

function spawnMob(mapId, g, isBoss) {
    const s = monsterStats(g.lv, isBoss);
    const p = freeSpot(mapId, g.x, g.y, isBoss ? 60 : g.r);
    return Object.assign({
        id: ++mobSeq, grp: g, name: g.name, icon: g.icon, boss: isBoss, dtype: g.dtype,
        x: p.x, y: p.y, hx: g.x, hy: g.y, zone: isBoss ? 120 : g.r, aggro: isBoss || g.aggro,
        maxHp: s.hp, state: 'idle', wait: rand(0.5, 3), tx: p.x, ty: p.y, atkTimer: 1, dots: [], stun: 0,
        dir: 1, respawnT: 0, hitAt: 0, fighting: false,
    }, s);
}

// 往目標移動一步；被擋時試著只走 x 或只走 y（貼牆滑動）。回傳是否到達
function stepToward(e, tx, ty, speed, dt, rad) {
    const dx = tx - e.x, dy = ty - e.y, d = Math.hypot(dx, dy);
    if (d < 3) return true;
    const st = Math.min(d, speed * dt), nx = e.x + dx / d * st, ny = e.y + dy / d * st;
    if (Math.abs(dx) > 1) e.dir = dx > 0 ? 1 : -1;
    if (!blocked(W.mapId, nx, ny, rad)) { e.x = nx; e.y = ny; return false; }
    if (Math.abs(dx) > 1 && !blocked(W.mapId, nx, e.y, rad)) { e.x = nx; return false; }
    if (Math.abs(dy) > 1 && !blocked(W.mapId, e.x, ny, rad)) { e.y = ny; return false; }
    // 正面被擋：試著往斜前方／側面繞（固定偏好一側，避免左右抖動）
    const a0 = Math.atan2(dy, dx);
    for (const off of [0.8, -0.8, 1.57, -1.57]) {
        const a = a0 + off * (e.side || 1), sx = e.x + Math.cos(a) * st, sy = e.y + Math.sin(a) * st;
        if (!blocked(W.mapId, sx, sy, rad)) { e.x = sx; e.y = sy; e.side = off > 0 ? (e.side || 1) : -(e.side || 1); return false; }
    }
    return true;   // 完全卡住就視為到達，避免原地抖動
}

// 追目標太久都沒進入射程（被地形擋住）：放棄並暫時忽略那隻怪
function chaseCheck(dt, d, reach) {
    if (d <= reach + 10) { W.chaseT = 0; W.chaseD = d; return; }
    W.chaseT = (W.chaseT || 0) + dt;
    if (W.chaseT > 3) {
        if (d > (W.chaseD || 1e9) - 20) {
            W.ignore[W.target.id] = W.time + 8;
            W.target = null; W.queued = null;
        }
        W.chaseT = 0; W.chaseD = d;
    }
}

// ── 玩家指令 ──
function cmdMoveTo(x, y) {
    if (W.revive > 0) return;
    W.target = null; W.npcTarget = null; W.moveTo = { x, y };
    cancelCast();
}
function cmdAttack(mob) {
    if (W.revive > 0 || mob.state === 'dead') return;
    W.target = mob; W.npcTarget = null; W.moveTo = null;
}
function cmdTalk(npc) {
    if (W.revive > 0) return;
    W.target = null; W.moveTo = null; W.npcTarget = npc;
    cancelCast();
}

// 點擊世界座標：先找怪、再找 NPC、最後當作移動
function clickWorld(x, y) {
    let best = null, bd = 46;
    for (const m of W.mobs) { if (m.state === 'dead') continue; const d = Math.hypot(m.x - x, m.y - 18 - y); if (d < bd) { bd = d; best = m; } }
    if (best) { cmdAttack(best); return; }
    for (const n of MAPS[W.mapId].npcs || []) if (Math.hypot(n.x - x, n.y - 20 - y) < 40) { cmdTalk(n); return; }
    cmdMoveTo(x, y);
}

function updatePlayer(dt) {
    const me = W.me, s = W.stats;
    me.walking = false;
    if (W.revive > 0) return;
    // 自動練功：沒有目標時找最近、等級合適的怪
    if (G.autoHunt && !W.target && !W.moveTo && !W.npcTarget && !W.casting && !MAPS[W.mapId].town) autoHuntPick();
    if (W.casting) return;   // 聚氣時不能移動
    const spd = s.move * (1 + buffSum('move') / 100);
    if (W.target) {
        const t = W.target;
        if (t.state === 'dead') { W.target = null; return; }
        const reach = W.queued ? skillRange(skillDef(W.queued)) : s.range, d = dist(me, t);
        if (d > reach + 10) { stepToward(me, t.x, t.y, spd, dt, 14); me.walking = true; }
        else me.dir = t.x >= me.x ? 1 : -1;
        chaseCheck(dt, d, reach);
    } else if (W.npcTarget) {
        const n = W.npcTarget;
        if (dist(me, n) > 60) { if (stepToward(me, n.x, n.y + 10, spd, dt, 14)) { openNpc(n); W.npcTarget = null; } else me.walking = true; }
        else { openNpc(n); W.npcTarget = null; }
    } else if (W.moveTo) {
        if (stepToward(me, W.moveTo.x, W.moveTo.y, spd, dt, 14)) W.moveTo = null; else me.walking = true;
    }
    for (const p of MAPS[W.mapId].portals) {
        if (Math.hypot(me.x - p.x, me.y - p.y) < 40) {
            addLog(`前往 ${MAPS[p.to].name}`);
            enterMap(p.to, p.tx, p.ty);
            return;
        }
    }
}

function autoHuntPick() {
    let best = null, bd = 1e9;
    for (const m of W.mobs) {
        if (m.state === 'dead' || m.lv > G.lv + 3 || (W.ignore[m.id] || 0) > W.time) continue;
        if (m.boss && G.lv < m.lv) continue;
        const d = dist(W.me, m) + (m.fighting ? -300 : 0);   // 優先打正在打我的
        if (d < bd) { bd = d; best = m; }
    }
    if (best) { W.target = best; return; }
    // 沒有合適的怪：往等級最接近的練功區走
    const groups = (MAPS[W.mapId].mobs || []).filter(g => g.lv <= G.lv + 3);
    const g = groups[groups.length - 1];
    if (g) W.moveTo = { x: g.x + rand(-80, 80), y: g.y + rand(-80, 80) };
}

function updateMobs(dt) {
    const me = W.me, mapZone = MAPS[W.mapId];
    for (const m of W.mobs) {
        if (m.state === 'dead') {
            if ((m.respawnT -= dt) <= 0) Object.assign(m, spawnMob(W.mapId, m.grp, m.boss), { id: m.id });
            continue;
        }
        // 持續傷害每秒結算
        for (const d of m.dots) {
            d.t -= dt; d.acc += dt;
            if (d.acc >= 1) { d.acc -= 1; damageMob(m, d.dmg, false, 'dot'); }
        }
        m.dots = m.dots.filter(d => d.t > 0);
        if (m.state === 'dead') continue;
        if (m.stun > 0) { m.stun -= dt; continue; }
        const dMe = dist(m, me), alive = W.revive <= 0;
        if (alive && !m.fighting && m.aggro && dMe < 150) m.fighting = true;
        if (m.fighting && (!alive || Math.hypot(m.x - m.hx, m.y - m.hy) > m.zone + 350)) {
            m.fighting = false; m.state = 'return'; m.hp = m.maxHp; m.dots = [];
        }
        const spd = m.boss ? 95 : 110;
        if (m.fighting) {
            const reach = m.dtype === 'inner' ? 200 : 42;
            if (dMe > reach) stepToward(m, me.x, me.y, spd * 1.2, dt, 12);
            else {
                m.dir = me.x >= m.x ? 1 : -1;
                if ((m.atkTimer -= dt) <= 0) { m.atkTimer = m.aspd; mobAttack(m); }
            }
        } else if (m.state === 'return') {
            if (stepToward(m, m.hx, m.hy, spd * 1.5, dt, 12)) m.state = 'idle';
        } else if ((m.wait -= dt) <= 0) {
            if (m.state === 'wander') { m.state = 'idle'; m.wait = rand(1.5, 4); }
            else { m.state = 'wander'; const p = freeSpot(W.mapId, m.hx, m.hy, m.zone); m.tx = p.x; m.ty = p.y; m.wait = 6; }
        } else if (m.state === 'wander') {
            if (stepToward(m, m.tx, m.ty, spd * 0.45, dt, 12)) { m.state = 'idle'; m.wait = rand(1.5, 4); }
        }
    }
}

function worldTick(dt) {
    if (!W || !G) return;
    const s = W.stats;
    W.time += dt;
    for (const f of W.fx) { f.t -= dt; f.y -= 28 * dt; }
    W.fx = W.fx.filter(f => f.t > 0);
    if (W.revive > 0) {
        if ((W.revive -= dt) <= 0) {
            G.hp = s.hp; G.mp = s.mp;
            addLog('你在柳溪鎮醒來，傷勢已無大礙');
            enterMap('town');
        }
        return;
    }
    for (const id in W.cds) W.cds[id] = Math.max(0, W.cds[id] - dt);
    for (const b of W.buffs) b.t -= dt;
    W.buffs = W.buffs.filter(b => b.t > 0);
    W.potCd = Math.max(0, W.potCd - dt);
    const regenMul = MAPS[W.mapId].town ? 8 : 1;
    G.hp = Math.min(s.hp, G.hp + s.hp * s.regen / 100 * regenMul * dt);
    G.mp = Math.min(s.mp, G.mp + s.mp * 0.012 * regenMul * dt);
    autoPotion();
    updatePlayer(dt);
    combatTick(dt);
    updateMobs(dt);
    if (G.hp <= 0) onPlayerDeath();
}
