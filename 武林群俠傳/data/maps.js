// 浪跡江湖：地圖、練功區、傳送點、城鎮 NPC（ARCHITECTURE.md 第 6 節）
// 座標單位為像素；練功區 mobs 每組固定等級（MMO 式：地圖內越深處越強）
// dtype：怪物攻擊類型 outer（近身外功，可被卸勁）／inner（遠程內功，被化勁減免）
const MAPS = {
    town: {
        name: '柳溪鎮', town: true, w: 1600, h: 1100, ground: '#6b7a4a', ground2: '#7d8a55', path: '#a89470',
        spawn: { x: 800, y: 620 }, seed: 7,
        houses: [
            { x: 380, y: 300, w: 220, h: 140, roof: '#7a3a2a', label: '藥鋪' },
            { x: 1000, y: 300, w: 240, h: 150, roof: '#3a3f4a', label: '鐵匠鋪' },
            { x: 360, y: 760, w: 260, h: 150, roof: '#5a3a5a', label: '武館' },
            { x: 1020, y: 780, w: 220, h: 130, roof: '#4a5a3a', label: '驛站' },
        ],
        npcs: [
            { name: '藥鋪掌櫃', icon: '🧓', x: 490, y: 480, open: 'shop' },
            { name: '鐵匠老吳', icon: '🔨', x: 1120, y: 490, open: 'smith' },
            { name: '武館教頭', icon: '🥋', x: 490, y: 730, open: 'outer' },
            { name: '驛站車夫', icon: '🐴', x: 1130, y: 750, open: 'travel' },
        ],
        portals: [{ x: 1560, y: 600, to: 'm1', tx: 90, ty: 900, name: '往青石山道' }],
    },
    m1: {
        name: '青石山道', w: 2400, h: 1800, ground: '#5d7040', ground2: '#6e8250', path: '#9a8a68', seed: 11, trees: 70,
        mobs: [
            { name: '灰背野狼', icon: '🐺', lv: 1, count: 7, x: 500, y: 900, r: 260, aggro: false, dtype: 'outer' },
            { name: '山野毒蜂', icon: '🐝', lv: 3, count: 7, x: 900, y: 450, r: 260, aggro: false, dtype: 'outer' },
            { name: '剪徑小賊', icon: '🦹', lv: 5, count: 8, x: 1300, y: 1200, r: 300, aggro: true, dtype: 'outer' },
            { name: '山寨哨探', icon: '🏹', lv: 8, count: 7, x: 1900, y: 600, r: 280, aggro: true, dtype: 'inner' },
        ],
        boss: { name: '山道惡霸', icon: '👹', lv: 10, x: 2050, y: 1350, respawn: 300, dtype: 'outer' },
        portals: [
            { x: 40, y: 900, to: 'town', tx: 1500, ty: 600, name: '回柳溪鎮' },
            { x: 2360, y: 900, to: 'm2', tx: 90, ty: 900, name: '往落霞竹林' },
        ],
    },
    m2: {
        name: '落霞竹林', w: 2400, h: 1800, ground: '#4a6a3a', ground2: '#587a44', path: '#8a7a58', seed: 23, trees: 120, treeColor: '#6a9a4a',
        mobs: [
            { name: '竹葉青蛇', icon: '🐍', lv: 10, count: 8, x: 500, y: 600, r: 280, aggro: false, dtype: 'outer' },
            { name: '迷途猿猴', icon: '🐒', lv: 13, count: 8, x: 800, y: 1300, r: 280, aggro: true, dtype: 'outer' },
            { name: '竹林刀客', icon: '⚔️', lv: 16, count: 8, x: 1500, y: 700, r: 300, aggro: true, dtype: 'outer' },
            { name: '林中術士', icon: '🧙', lv: 19, count: 7, x: 1900, y: 1300, r: 260, aggro: true, dtype: 'inner' },
        ],
        boss: { name: '斷竹狂刀', icon: '👺', lv: 22, x: 2050, y: 400, respawn: 300, dtype: 'outer' },
        portals: [
            { x: 40, y: 900, to: 'm1', tx: 2300, ty: 900, name: '回青石山道' },
            { x: 2360, y: 900, to: 'm3', tx: 90, ty: 900, name: '往黑風寨' },
        ],
    },
    m3: {
        name: '黑風寨', w: 2400, h: 1800, ground: '#6a5a40', ground2: '#7a6a4a', path: '#a08a64', seed: 37, trees: 40, rocks: 50,
        mobs: [
            { name: '黑風嘍囉', icon: '🪓', lv: 22, count: 9, x: 500, y: 900, r: 300, aggro: true, dtype: 'outer' },
            { name: '看門惡犬', icon: '🐕', lv: 25, count: 8, x: 1000, y: 400, r: 260, aggro: true, dtype: 'outer' },
            { name: '寨中弓手', icon: '🏹', lv: 28, count: 8, x: 1500, y: 1300, r: 300, aggro: true, dtype: 'inner' },
            { name: '黑風頭目', icon: '🗡️', lv: 31, count: 6, x: 1900, y: 700, r: 240, aggro: true, dtype: 'outer' },
        ],
        boss: { name: '黑風寨主', icon: '🐗', lv: 34, x: 2100, y: 1400, respawn: 300, dtype: 'outer' },
        portals: [
            { x: 40, y: 900, to: 'm2', tx: 2300, ty: 900, name: '回落霞竹林' },
            { x: 2360, y: 900, to: 'm4', tx: 90, ty: 900, name: '往寒潭古洞' },
        ],
    },
    m4: {
        name: '寒潭古洞', w: 2400, h: 1800, ground: '#3a4654', ground2: '#46525e', path: '#6a7684', seed: 53, rocks: 90, rockColor: '#7a8a9a',
        mobs: [
            { name: '冰魄蝠', icon: '🦇', lv: 34, count: 9, x: 500, y: 600, r: 300, aggro: true, dtype: 'inner' },
            { name: '寒潭妖鱷', icon: '🐊', lv: 37, count: 8, x: 900, y: 1300, r: 300, aggro: true, dtype: 'outer' },
            { name: '洞中殭屍', icon: '🧟', lv: 41, count: 9, x: 1500, y: 800, r: 300, aggro: true, dtype: 'outer' },
            { name: '寒冰鬼影', icon: '👻', lv: 44, count: 7, x: 1950, y: 1300, r: 260, aggro: true, dtype: 'inner' },
        ],
        boss: { name: '寒潭老怪', icon: '🧊', lv: 47, x: 2050, y: 400, respawn: 300, dtype: 'inner' },
        portals: [{ x: 40, y: 900, to: 'm3', tx: 2300, ty: 900, name: '回黑風寨' }],
    },
};
const MAP_ORDER = ['town', 'm1', 'm2', 'm3', 'm4'];

function mapLvText(m) {
    if (m.town) return '城鎮';
    return 'Lv.' + m.mobs[0].lv + '～' + m.boss.lv;
}

// 依等級產生怪物數值；首領倍率較高
function monsterStats(lv, isBoss) {
    const m = {
        lv,
        hp: Math.floor((56 + lv * 34) * Math.pow(1.035, lv)),
        atk: Math.floor((10 + lv * 5.6) * Math.pow(1.02, lv)),
        def: Math.floor(2 + lv * 1.7),
        aspd: 2.0, hit: 92, dodge: 3 + lv * 0.05, crit: 3,
        exp: Math.floor(6 + lv * 3 * Math.pow(1.012, lv)),
        silver: Math.floor(3 + lv * 1.6),
        xiuwei: Math.floor(2 + lv * 0.6),
    };
    if (isBoss) {
        m.hp *= 10; m.atk = Math.floor(m.atk * 1.6); m.def = Math.floor(m.def * 1.3);
        m.exp *= 15; m.silver *= 15; m.xiuwei *= 12; m.crit = 8;
    }
    return m;
}

// 簡單種子亂數：同一張地圖每次產生一樣的樹木與石頭
function seededRng(seed) {
    let s = seed >>> 0;
    return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; };
}

// 障礙物（圓形）：避開傳送點、練功區中心、城鎮出生點與道路
function buildObstacles(id) {
    const m = MAPS[id];
    if (m.obstacles) return m.obstacles;
    const rng = seededRng(m.seed), list = [];
    const keep = [].concat(m.portals.map(p => ({ x: p.x, y: p.y, r: 140 })),
        (m.mobs || []).map(g => ({ x: g.x, y: g.y, r: 120 })),
        m.boss ? [{ x: m.boss.x, y: m.boss.y, r: 160 }] : [], m.spawn ? [{ x: m.spawn.x, y: m.spawn.y, r: 120 }] : []);
    const place = (n, type, rMin, rMax) => {
        for (let i = 0, tries = 0; i < n && tries < n * 20; tries++) {
            const o = { x: 40 + rng() * (m.w - 80), y: 40 + rng() * (m.h - 80), r: rMin + rng() * (rMax - rMin), type };
            if (Math.abs(o.y - m.h / 2) < 70) continue;   // 中間東西向大路
            if (keep.some(k => dist(k, o) < k.r + o.r)) continue;
            if (list.some(k => dist(k, o) < k.r + o.r + 10)) continue;
            list.push(o); i++;
        }
    };
    place(m.trees || 0, 'tree', 18, 30);
    place(m.rocks || 0, 'rock', 14, 26);
    for (const h of m.houses || []) list.push({ x: h.x + h.w / 2, y: h.y + h.h / 2, w: h.w, h: h.h, type: 'house', house: h });
    m.obstacles = list;
    return list;
}

// 點是否被擋住（圓形障礙＋房屋矩形＋地圖邊界）
function blocked(mapId, x, y, rad) {
    const m = MAPS[mapId];
    if (x < rad || y < rad || x > m.w - rad || y > m.h - rad) return true;
    for (const o of buildObstacles(mapId)) {
        if (o.type === 'house') {
            if (x > o.x - o.w / 2 - rad && x < o.x + o.w / 2 + rad && y > o.y - o.h / 2 - rad && y < o.y + o.h / 2 + rad) return true;
        } else if (Math.hypot(x - o.x, y - o.y) < o.r * 0.6 + rad) return true;
    }
    return false;
}
