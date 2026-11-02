// 浪跡江湖：玩家資料、屬性計算、存讀檔、離線收益（ARCHITECTURE.md 第 4、8 節）
let G = null;              // 目前角色（存檔內容）

function newPlayer(name, sect, look) {
    const first = SECTS[sect].skills[0].id;
    const sp = MAPS.town.spawn;
    return {
        ver: 2, name, sect, look: look || { g: 'm', hair: 0, skin: 0 },
        lv: 1, exp: 0, silver: 80, xiuwei: 0,
        attr: { str: 0, agi: 0, con: 0, qi: 0, wu: 0 }, points: 0, autoAttr: true,
        skills: { [first]: 1, fs1: 1 }, inner: 0,
        hotbar: [first, 'fs1', null, null, null, null, 'pot:jinchuang', 'pot:huiqi'],
        equip: { weapon: null, armor: null, helm: null, boots: null, ring: null },
        bag: [], pots: { jinchuang: 15, huiqi: 15 },
        autoPot: { hp: 40, mp: 25 }, autoSell: -1, autoHunt: false, huntSkills: true,
        map: 'town', x: sp.x, y: sp.y, hp: 1, mp: 1,
        stat: { kills: 0, bosses: 0, deaths: 0 },
        created: Date.now(), lastSave: Date.now(),
    };
}

function weaponType(p) { return p.equip.weapon ? p.equip.weapon.wtype : 'fist'; }

// 最終屬性：等級＋門派成長＋屬性點＋裝備＋心法（戰鬥增益另在 combat.js 套用）
function calcStats(p) {
    const g = sectOf(p).grow, a = p.attr, L = p.lv - 1;
    const s = {
        hp: 120 + L * g.hp + a.con * 14, mp: 60 + L * g.mp + a.qi * 8,
        outer: 16 + L * 3 + a.str * 2, inner: 14 + L * 3 + a.qi * 2,
        def: 5 + L * 1.6 + a.con * 0.4,
        hit: 90 + a.wu * 0.15, crit: 5 + a.wu * 0.12, dodge: 3 + a.agi * 0.12,
        aspd: a.agi * 0.25, cast: a.agi * 0.3,
        xiejin: 3 + a.con * 0.08, huajin: 2 + a.qi * 0.06,
        regen: 0.8 + a.con * 0.005, move: 150,
    };
    for (const slot in p.equip) {
        const it = p.equip[slot]; if (!it) continue;
        const gs = gearStats(it);
        for (const k in gs) s[k] = (s[k] || 0) + gs[k];
    }
    const per = sectOf(p).inner.per, I = p.inner;
    s.inner *= 1 + (per.innerPct || 0) * I / 100;
    s.hp *= 1 + (per.hpPct || 0) * I / 100;
    s.mp *= 1 + (per.mpPct || 0) * I / 100;
    s.xiejin += (per.xiejin || 0) * I; s.dodge += (per.dodge || 0) * I;
    s.crit += (per.crit || 0) * I; s.regen += (per.regen || 0) * I;
    for (const k of ['hp', 'mp', 'outer', 'inner', 'def']) s[k] = Math.floor(s[k]);
    s.crit = Math.min(60, s.crit); s.dodge = Math.min(45, s.dodge);
    s.xiejin = Math.min(50, s.xiejin); s.huajin = Math.min(50, s.huajin);
    s.aspd = Math.min(60, s.aspd); s.cast = Math.min(60, s.cast);
    s.wtype = weaponType(p);
    s.range = WEAPON_TYPES[s.wtype].range;
    s.atkInterval = 1.5 * WEAPON_TYPES[s.wtype].spd / (1 + s.aspd / 100);
    return s;
}

function combatPower(p) {
    const s = calcStats(p);
    return Math.floor(Math.max(s.outer, s.inner) * 4 + s.def * 3 + s.hp * 0.4 + s.mp * 0.2 + s.crit * 15 + s.dodge * 15 + s.xiejin * 10 + s.huajin * 10);
}

function gainExp(n) {
    if (G.lv >= MAX_LV) { G.exp = 0; return; }
    G.exp += n;
    let up = false;
    while (G.lv < MAX_LV && G.exp >= expNeed(G.lv)) {
        G.exp -= expNeed(G.lv); G.lv++; G.points += POINTS_PER_LV; up = true;
        addLog(`🎉 升到 ${G.lv} 級！獲得 ${POINTS_PER_LV} 屬性點`, 'gold');
        for (const sk of sectOf(G).skills) if (sk.unlock === G.lv) addLog(`📜 可修習${sectOf(G).name}內功「${sk.name}」`, 'gold');
        if (G.lv === AUTO_HUNT_LV) addLog('🧭 已開放自動練功', 'gold');
    }
    if (up) {
        if (G.autoAttr) autoAllocate();
        refreshStats();
        G.hp = W.stats.hp; G.mp = W.stats.mp;
        floatText(W.me.x, W.me.y - 70, 'LEVEL UP', 'lvup');
    }
}

// 依門派推薦比例自動配點
function autoAllocate() {
    const w = sectOf(G).autoAttr, keys = Object.keys(w);
    while (G.points > 0) {
        for (const k of keys) {
            const n = Math.min(G.points, w[k]);
            G.attr[k] += n; G.points -= n;
            if (G.points <= 0) break;
        }
    }
}

// ── 存讀檔（localStorage 一律包 try/catch） ──
function saveGame() {
    if (!G) return;
    if (W && W.me) { G.x = Math.round(W.me.x); G.y = Math.round(W.me.y); }
    G.lastSave = Date.now();
    try { localStorage.setItem(SAVE_KEY, JSON.stringify(G)); } catch (e) { }
}

function loadGame() {
    try {
        const raw = localStorage.getItem(SAVE_KEY);
        if (!raw) return null;
        const p = JSON.parse(raw);
        return SECTS[p.sect] ? migrateSave(p) : null;
    } catch (e) { return null; }
}

// 舊存檔補欄位（之後改存檔結構時在這裡加）
function migrateSave(p) {
    const fresh = newPlayer(p.name, p.sect, p.look);
    for (const k in fresh) if (p[k] === undefined) p[k] = fresh[k];
    for (const k in fresh.attr) if (p.attr[k] === undefined) p.attr[k] = 0;
    if (!MAPS[p.map]) { p.map = 'town'; p.x = fresh.x; p.y = fresh.y; }
    return p;
}

function exportSave() { saveGame(); try { return btoa(unescape(encodeURIComponent(JSON.stringify(G)))); } catch (e) { return ''; } }
function importSaveText(txt) {
    try {
        const p = JSON.parse(decodeURIComponent(escape(atob(txt.trim()))));
        if (!SECTS[p.sect]) return false;
        G = migrateSave(p); saveGame(); return true;
    } catch (e) { return false; }
}

// ── 離線收益：離線前在野外開著掛機才有；以「打得過的最高等練功區」估算 ──
function applyOffline() {
    const sec = Math.min(OFFLINE_MAX_H * 3600, (Date.now() - (G.lastSave || Date.now())) / 1000);
    if (sec < 60) return null;
    const map = MAPS[G.map];
    if (map.town || !G.autoHunt) return { sec, kills: 0, idle: true };
    const s = calcStats(G);
    const groups = map.mobs.filter(g => g.lv <= G.lv + 2);
    const grp = groups.length ? groups[groups.length - 1] : map.mobs[0];
    const mon = monsterStats(grp.lv, false);
    const atk = Math.max(s.outer, s.inner);
    const myDps = Math.max(1, atk - mon.def * 0.5) * 1.3 / s.atkInterval;   // 1.3 粗估武學加成
    const killT = mon.hp / myDps + 3;                                         // 3 秒走路找怪
    const monDps = Math.max(1, mon.atk - s.def * 0.5) / mon.aspd * (1 - s.dodge / 100);
    if (monDps * (mon.hp / myDps) > s.hp * 0.9) return { sec, kills: 0, tooHard: true };
    const kills = Math.floor(sec * OFFLINE_RATE / killT);
    const r = { sec, kills, exp: kills * mon.exp, silver: kills * mon.silver, xiuwei: kills * mon.xiuwei, items: 0 };
    G.silver += r.silver; G.xiuwei += r.xiuwei; G.stat.kills += kills;
    const drops = Math.min(20, Math.floor(kills * 0.1));
    for (let i = 0; i < drops; i++) {
        if (addToBag(makeGear(SLOTS[randInt(0, SLOTS.length - 1)].id, mon.lv, pickWeighted(QUALITY, 'weight')))) r.items++;
    }
    r.exp = Math.min(r.exp, expNeed(G.lv) * 3);   // 離線最多升約 3 級份量，避免一覺醒來跳太多級
    G.exp += r.exp;
    return r;
}
