// 整套原創場景、世界配置與塔怪美術（僅畫面，版本 20261022b）。
const SCENE_ART_ROOT = 'images/maps/rework/';
const SCENE_WORLD_TILES = [
    ['forgottenIsle', '紫霧遺跡', 'swamp'], ['elvenForest', '迷霧古林', 'forest'], ['orenSnow', '永凍荒原', 'snow'], ['orenSnow', '霜峰山道', 'snow'],
    ['pirateIsle', '沉船海灣', 'pirate'], ['elvenForest', '古林河畔', 'meadow'], ['dragonValley', '焦骨峽谷', 'desert'], ['fireCave', '熔火煉獄', 'lava'],
    ['island', '低語海岸', 'coast'], ['gludio1', '腐朽礦坑・上層', 'mine-upper'], ['pyramid', '黃沙王陵', 'pyramid'], ['giantTomb', '泰坦墓穴', 'titan'],
    ['islandDungeon', '低語墓窟', 'crypt'], ['sleepingCave', '沉眠龍窟', 'cavern'], ['gludio2', '腐朽礦坑・深層', 'mine-deep'], ['elvenForest', '南境林道', 'forest'],
].map(([zone, name, art], i) => {
    const col = i % 4, row = Math.floor(i / 4), x0 = col * 47, y0 = row * 37, x1 = x0 + 46, y1 = row === 3 ? 148 : y0 + 36;
    const x = x0 + 23, y = Math.floor((y0 + y1) / 2);
    return { zone, name, art, x, y, rect: [x0, y0, x1, y1], start: [x, y] };
});
const SCENE_WORLD_WALK = SCENE_WORLD_TILES.flatMap(r => {
    const [x0, y0, x1, y1] = r.rect;
    return [[x0 + 12, y0 + 10, x1 - 12, y1 - 10], [x0, r.y - 2, x1, r.y + 2], [r.x - 2, y0, r.x + 2, y1]];
});
const SCENE_TOWN_ROLES = [['商店', 'shop'], ['回收', 'sell'], ['倉庫', 'storage'], ['鍛造', 'forge'], ['旅館', 'inn'], ['傳送師', 'teleport'], ['娃娃商人', 'doll']];
const SCENE_ART_BGS = {
    wild: { src: SCENE_ART_ROOT + 'world-play.jpg', mini: SCENE_ART_ROOT + 'world-mini.jpg', w: 188, h: 149, start: [23, 92], big: true,
        walk: SCENE_WORLD_WALK, block: [], regions: SCENE_WORLD_TILES,
        fieldNpcs: [
            { name: '毒霧巢穴入口', role: '進入洞穴', to: 'venomNest', zone: 'elvenForest', x: 164, y: 125, front: [164, 127], img: 'images/maps/rework/venom-entrance-v1.png', h: 2.8, entrance: true, act: openVenomNestEntrance },
        ],
    },
};
const SCENE_TOWN_NPC_SPOTS = {
    talking: [[10, 7], [3, 8], [25, 8], [25, 12], [4, 12], [15, 3], [21, 6]],
    gludio: [[21, 6], [3, 6], [24, 12], [9, 6], [5, 13], [15, 3], [27, 7]],
    giran: [[25, 7], [5, 7], [11, 6], [25, 13], [8, 14], [16, 3], [21, 6]],
    aden: [[24, 7], [4, 10], [26, 12], [5, 14], [8, 6], [15, 3], [22, 5]],
};
for (const [id, key] of [['talking', 'village'], ['gludio', 'ash'], ['giran', 'darkgold'], ['aden', 'aden']]) {
    SCENE_ART_BGS[key] = { src: SCENE_ART_ROOT + 'town-' + id + '.jpg', w: 30, h: 18, start: [15, 14],
        walk: [[3, 8, 26, 15], [14, 1, 16, 16], [1, 9, 28, 12], ...SCENE_TOWN_NPC_SPOTS[id].flatMap(([x, y]) => [[x, y, x, y + 1], [Math.min(x, 15), y + 1, Math.max(x, 15), y + 1]])], block: [],
        npcs: SCENE_TOWN_ROLES.map(([role, art], i) => ({ role, x: SCENE_TOWN_NPC_SPOTS[id][i][0], y: SCENE_TOWN_NPC_SPOTS[id][i][1], painted: false, h: 1.65,
            img: art === 'doll' ? 'images/classes/stage/elf.webp' : 'images/npc/rework/npc-' + art + '.png' })),
        lights: [[4, 8, 100], [25, 8, 100], [15, 3, 80]],
    };
}
for (const id of ['tower', 'ivory', 'earth-lair', 'water-lair', 'wind-lair', 'fire-lair']) {
    SCENE_ART_BGS['art-' + id] = { src: SCENE_ART_ROOT + 'arena-' + id + '.jpg', w: 40, h: 24, start: [20, 9],
        walk: [[4, 4, 35, 20], [18, 2, 22, 4]], block: [], lights: [[4, 4, 110], [35, 4, 110], [5, 19, 75], [34, 19, 75]],
    };
}
// 毒霧巢穴：行走格依專屬圖的石台與吊橋標定，原稿／路線在tools/map-src/venom-nest-v1。
SCENE_ART_BGS['art-venom-nest'] = { src: SCENE_ART_ROOT + 'venom-nest-v1.jpg', w: 48, h: 32, start: [9, 24],
    walk: [[7,5,13,5],[6,6,17,6],[19,6,21,6],[7,7,24,7],[33,7,39,7],[9,8,17,8],[24,8,29,8],[32,8,41,8],[10,9,11,9],[13,9,16,9],[27,9,34,9],[37,9,37,9],[10,10,10,10],[15,10,17,10],[30,10,33,10],[9,11,10,11],[16,11,18,11],[29,11,31,11],[9,12,9,12],[17,12,19,12],[28,12,31,12],[7,13,9,13],[19,13,29,13],[31,13,31,13],[6,14,9,14],[19,14,27,14],[31,14,32,14],[6,15,9,15],[18,15,27,15],[32,15,32,15],[8,16,9,16],[16,16,18,16],[21,16,27,16],[33,16,33,16],[8,17,10,17],[15,17,16,17],[26,17,28,17],[33,17,35,17],[9,18,11,18],[14,18,15,18],[27,18,30,18],[34,18,37,18],[8,19,13,19],[29,19,39,19],[6,20,15,20],[31,20,40,20],[5,21,16,21],[32,21,41,21],[5,22,16,22],[31,22,42,22],[5,23,17,23],[31,23,41,23],[5,24,20,24],[28,24,38,24],[5,25,14,25],[20,25,29,25],[5,26,10,26],[6,27,8,27]], block: [], lights: [],
};
const SCENE_DRAGON_BGS = { lairAntharas: 'art-earth-lair', lairFafurion: 'art-water-lair', lairLindvior: 'art-wind-lair', lairValakas: 'art-fire-lair' };
const SCENE_TOWER_ART = {
    '骷髏神射手': 'archer', '死亡騎士的隨從': 'guard', '石像鬼': 'gargoyle', '暗影刺客': 'assassin',
    '火焰之影': 'flame', '熔岩高崙': 'golem', '冰原狼人': 'wolf', '冰之魔女': 'mage', '巫妖': 'mage', '死靈法師': 'mage',
    '墮落天使': 'angel', '地獄騎士': 'guard', '混沌戰士': 'guard', '混沌法師': 'mage', '深淵魔物': 'beast', '虛空行者': 'wraith',
    '冥界守衛': 'guard', '冥界死神': 'wraith', '冥法親衛': 'guard', '冥法巫師': 'mage',
    '巨大牛人': 'bull-boss', '黑暗女妖': 'banshee-boss', '炎魔之影': 'flame-boss', '冰之女王': 'ice-boss', '巫妖王': 'lich-boss',
    '墮落的大天使': 'angel-boss', '混沌之主': 'chaos-boss', '深淵領主': 'abyss-boss', '死神': 'reaper-boss', '冥法軍王': 'king-boss',
};
const SCENE_ART_MONSTERS = Object.fromEntries([...new Set(Object.values(SCENE_TOWER_ART))].map(art => ['art-' + art, {
    src: 'images/monsters/rework/mon-' + art + '.png', cw: 192, ch: 224, body: 168, n: [2, 2, 2, 2, 2, 2], cols: 4, size: art.endsWith('-boss') ? 74 : 48,
}]));
function sceneMonsterArt(m) {
    if (!m) return null;
    if (m.mid && SCENE_ART_MONSTERS[m.mid]) return m.mid;
    const name = (m.inst ? m.inst.name : m.name) || '', art = SCENE_TOWER_ART[name.replace(/\s*[（(].*$/, '')];
    return art && (!m.mid || /^tower/.test(m.mid) || m.inst && m.inst.towerFloor) ? 'art-' + art : m.mid;
}
function drawSceneAtmosphere(ctx, W, H, camX, camY) {
    // 只處理地面，人物、警示圈、名牌與飄字後畫，維持對比。
    ctx.save();
    const v = ctx.createRadialGradient(W / 2, H / 2, Math.min(W, H) * 0.25, W / 2, H / 2, Math.hypot(W, H) * 0.55);
    v.addColorStop(0, 'rgba(9,15,22,0)'); v.addColorStop(1, 'rgba(5,9,15,0.38)');
    ctx.fillStyle = v; ctx.fillRect(0, 0, W, H);
    ctx.globalCompositeOperation = 'screen';
    for (const [x, y, size] of scene.bg.lights || []) {
        const sx = (x + 0.5) * TILE - camX, sy = (y + 0.5) * TILE - camY, r = size * (1 + 0.025 * Math.sin(gameNow / 370 + x));
        if (sx < -r || sx > W + r || sy < -r || sy > H + r) continue;
        const g = ctx.createRadialGradient(sx, sy, 2, sx, sy, r); g.addColorStop(0, 'rgba(239,150,62,0.17)'); g.addColorStop(1, 'rgba(239,150,62,0)');
        ctx.fillStyle = g; ctx.fillRect(sx - r, sy - r, r * 2, r * 2);
    }
    ctx.restore();
}
