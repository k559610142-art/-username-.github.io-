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
const SCENE_TOWN_ROLES = [['商店', 'shop'], ['回收', 'sell'], ['倉庫', 'storage'], ['旅館', 'inn'], ['傳送師', 'teleport'], ['鑽石商人', 'doll'], ['鑑定台', 'identify'], ['傭兵團長', 'mercenary'], ['二轉導師', 'advance'], ['傭兵公會', 'guild'], ['鍛造兌換', 'exchange']];   // 2026-11-03 鍛造 NPC 移除，鍛造併入兌換師（第 286 節）   // 二轉導師：名字與外觀依玩家職業（advance.js advNpcPatch，第 247 節）
const SCENE_ART_BGS = {
    wild: { src: SCENE_ART_ROOT + 'world-play.jpg', mini: SCENE_ART_ROOT + 'world-mini.jpg', w: 188, h: 149, start: [23, 92], big: true,
        walk: SCENE_WORLD_WALK, block: [], regions: SCENE_WORLD_TILES,
        fieldNpcs: [
            { name: '毒霧巢穴入口', role: '進入洞穴', to: 'venomNest', zone: 'elvenForest', x: 164, y: 125, front: [164, 127], img: 'images/maps/rework/venom-entrance-v1.png', h: 2.8, entrance: true, act: openVenomNestEntrance },
        ],
    },
};
const SCENE_TOWN_NPC_SPOTS = {
    talking: [[10, 7], [3, 8], [25, 8], [4, 12], [15, 3], [21, 6]],
    gludio: [[21, 6], [3, 6], [24, 12], [5, 13], [15, 3], [27, 7]],
    giran: [[25, 7], [5, 7], [11, 6], [8, 14], [16, 3], [21, 6]],
    aden: [[24, 7], [4, 10], [26, 12], [8, 6], [15, 3], [22, 5]],
};
for (const spots of Object.values(SCENE_TOWN_NPC_SPOTS)) spots.push([18, 11], [12, 13]);
const SCENE_ADV_NPC_SPOT = { talking: [8, 10], gludio: [8, 9], giran: [8, 10], aden: [9, 9] };   // 二轉導師（2026-10-31，廣場左側空地）
for (const id in SCENE_TOWN_NPC_SPOTS) SCENE_TOWN_NPC_SPOTS[id].push(SCENE_ADV_NPC_SPOT[id], [22, 11], [20, 14]);   // 公會接待員原本 (20,12) 名牌壓到鑑定台（2026-11-03 移開）；通貨兌換師（第 284 節）
for (const [id, key] of [['talking', 'village'], ['gludio', 'ash'], ['giran', 'darkgold'], ['aden', 'aden']]) {
    SCENE_ART_BGS[key] = { src: SCENE_ART_ROOT + 'town-' + id + '.jpg', w: 30, h: 18, start: [15, 14],
        walk: [[3, 8, 26, 15], [14, 1, 16, 16], [1, 9, 28, 12], ...SCENE_TOWN_NPC_SPOTS[id].flatMap(([x, y]) => [[x, y, x, y + 1], [Math.min(x, 15), y + 1, Math.max(x, 15), y + 1]])], block: [],
        npcs: SCENE_TOWN_ROLES.map(([role, art], i) => ({ role, x: SCENE_TOWN_NPC_SPOTS[id][i][0], y: SCENE_TOWN_NPC_SPOTS[id][i][1], painted: false, h: art === 'identify' ? 2.4 : 1.65,
            img: (art === 'mercenary' || art === 'guild') ? 'images/npc/rework/npc-forge.png' : art === 'identify' ? 'images/buildings/identify-station-v1.png' : art === 'doll' ? 'images/classes/stage/elf.webp' : art === 'advance' ? 'images/classes/stage/royal.webp' : 'images/npc/rework/npc-' + art + '.png' })),
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
const SCENE_QUEST_ART = {
    "叛軍將軍・格倫": "quest-rebel-general",
    "篡位者・黑暗之王": "quest-usurper-king",
    "逆王之影・格爾德": "quest-anti-king",
    "叛變騎士・維克": "quest-traitor-knight",
    "死亡騎士": "quest-death-knight",
    "墮落騎士團長・維克": "quest-fallen-commander",
    "黑魔法師・卡斯特": "quest-black-mage",
    "古代魔導師的亡靈": "quest-ancient-mage-ghost",
    "虛空魔導・莫爾斯": "quest-void-archmage",
    "盜獵者首領・薩克": "quest-poacher-chief",
    "腐化樹妖": "quest-corrupt-treant",
    "枯萎樹靈・艾爾克": "quest-withered-treant",
    "喚龍教團執事": "quest-dragon-cult-deacon",
    "喚龍教主": "quest-dragon-cult-master",
    "無面刺客・夜鴉": "quest-faceless-assassin",
    "破門者・鬼刃": "quest-gatebreaker",
    "拳聖烈（全力）": "quest-fist-saint",
    "修羅魔王・阿迦": "quest-asura-demon-king",
    "遠古石巨人": "quest-ancient-stone-giant",
    "炎魔將軍": "quest-flame-general",
    "灰燼巨人・格倫德": "quest-ash-giant",
    "強盜頭目・鐵手": "quest-bandit-ironhand",
    "古代機械魔像": "quest-ancient-mech-golem",
    "鐵鏽砲台・哈茲": "quest-rust-turret",
    "失控魔導兵": "quest-runaway-magic-soldier",
    "魔導劍聖的殘影": "quest-sword-saint-remnant",
    "崩壞魔劍・艾克西": "quest-broken-magic-blade",
    "墮落神官・莫德": "quest-fallen-priest",
    "巫妖王": "quest-lich-king",
    "褻瀆主教・瑟恩": "quest-blasphemous-bishop",
    "深淵使者・巴爾": "quest-abyss-envoy",
    "墮落天使長・路西法": "quest-fallen-archangel",
    "墮天使・薩麥爾": "quest-fallen-seraph",
    "天界獵人・加百列": "quest-celestial-hunter",
    "深淵之主・阿斯莫德": "quest-abyss-lord",
    "深淵吞噬者・巴爾": "quest-abyss-devourer",
    "王族的試煉之影": "quest-shadow-royal",
    "騎士的試煉之影": "quest-shadow-knight",
    "法師的試煉之影": "quest-shadow-mage",
    "妖精的試煉之影": "quest-shadow-elf",
    "黑暗妖精的試煉之影": "quest-shadow-darkelf",
    "修羅的試煉之影": "quest-shadow-shura",
    "戰士的試煉之影": "quest-shadow-warrior",
    "槍手的試煉之影": "quest-shadow-gunner",
    "魔鬥士的試煉之影": "quest-shadow-magicfighter",
    "聖騎士的試煉之影": "quest-shadow-paladin",
    "天使的試煉之影": "quest-shadow-angel",
    "惡魔的試煉之影": "quest-shadow-demon"
};
const SCENE_QUEST_SPRITES = {
    "valakas": {
        "src": "images/monsters/quest-v1/valakas.png",
        "cw": 640,
        "ch": 448,
        "body": 192,
        "n": [
            2,
            2,
            2,
            2,
            2,
            2
        ],
        "cols": 4,
        "size": 104,
        "foot": [
            320,
            320
        ]
    },
    "quest-rebel-general": {
        "src": "images/monsters/quest-v1/rebel-general.png",
        "cw": 384,
        "ch": 320,
        "body": 160,
        "n": [
            2,
            2,
            2,
            2,
            2,
            2
        ],
        "cols": 4,
        "size": 68,
        "foot": [
            192,
            270
        ]
    },
    "quest-usurper-king": {
        "src": "images/monsters/quest-v1/usurper-king.png",
        "cw": 384,
        "ch": 320,
        "body": 160,
        "n": [
            2,
            2,
            2,
            2,
            2,
            2
        ],
        "cols": 4,
        "size": 68,
        "foot": [
            192,
            270
        ]
    },
    "quest-anti-king": {
        "src": "images/monsters/quest-v1/anti-king.png",
        "cw": 384,
        "ch": 320,
        "body": 160,
        "n": [
            2,
            2,
            2,
            2,
            2,
            2
        ],
        "cols": 4,
        "size": 68,
        "foot": [
            192,
            270
        ]
    },
    "quest-traitor-knight": {
        "src": "images/monsters/quest-v1/traitor-knight.png",
        "cw": 384,
        "ch": 320,
        "body": 160,
        "n": [
            2,
            2,
            2,
            2,
            2,
            2
        ],
        "cols": 4,
        "size": 68,
        "foot": [
            192,
            270
        ]
    },
    "quest-death-knight": {
        "src": "images/monsters/quest-v1/death-knight.png",
        "cw": 384,
        "ch": 320,
        "body": 160,
        "n": [
            2,
            2,
            2,
            2,
            2,
            2
        ],
        "cols": 4,
        "size": 68,
        "foot": [
            192,
            270
        ]
    },
    "quest-fallen-commander": {
        "src": "images/monsters/quest-v1/fallen-commander.png",
        "cw": 384,
        "ch": 320,
        "body": 160,
        "n": [
            2,
            2,
            2,
            2,
            2,
            2
        ],
        "cols": 4,
        "size": 68,
        "foot": [
            192,
            270
        ]
    },
    "quest-black-mage": {
        "src": "images/monsters/quest-v1/black-mage.png",
        "cw": 384,
        "ch": 320,
        "body": 160,
        "n": [
            2,
            2,
            2,
            2,
            2,
            2
        ],
        "cols": 4,
        "size": 68,
        "foot": [
            192,
            270
        ]
    },
    "quest-ancient-mage-ghost": {
        "src": "images/monsters/quest-v1/ancient-mage-ghost.png",
        "cw": 384,
        "ch": 320,
        "body": 160,
        "n": [
            2,
            2,
            2,
            2,
            2,
            2
        ],
        "cols": 4,
        "size": 68,
        "foot": [
            192,
            270
        ]
    },
    "quest-void-archmage": {
        "src": "images/monsters/quest-v1/void-archmage.png",
        "cw": 384,
        "ch": 320,
        "body": 160,
        "n": [
            2,
            2,
            2,
            2,
            2,
            2
        ],
        "cols": 4,
        "size": 68,
        "foot": [
            192,
            270
        ]
    },
    "quest-poacher-chief": {
        "src": "images/monsters/quest-v1/poacher-chief.png",
        "cw": 384,
        "ch": 320,
        "body": 160,
        "n": [
            2,
            2,
            2,
            2,
            2,
            2
        ],
        "cols": 4,
        "size": 68,
        "foot": [
            192,
            270
        ]
    },
    "quest-corrupt-treant": {
        "src": "images/monsters/quest-v1/corrupt-treant.png",
        "cw": 384,
        "ch": 320,
        "body": 160,
        "n": [
            2,
            2,
            2,
            2,
            2,
            2
        ],
        "cols": 4,
        "size": 78,
        "foot": [
            192,
            270
        ]
    },
    "quest-withered-treant": {
        "src": "images/monsters/quest-v1/withered-treant.png",
        "cw": 384,
        "ch": 320,
        "body": 160,
        "n": [
            2,
            2,
            2,
            2,
            2,
            2
        ],
        "cols": 4,
        "size": 82,
        "foot": [
            192,
            270
        ]
    },
    "quest-dragon-cult-deacon": {
        "src": "images/monsters/quest-v1/dragon-cult-deacon.png",
        "cw": 384,
        "ch": 320,
        "body": 160,
        "n": [
            2,
            2,
            2,
            2,
            2,
            2
        ],
        "cols": 4,
        "size": 68,
        "foot": [
            192,
            270
        ]
    },
    "quest-dragon-cult-master": {
        "src": "images/monsters/quest-v1/dragon-cult-master.png",
        "cw": 384,
        "ch": 320,
        "body": 160,
        "n": [
            2,
            2,
            2,
            2,
            2,
            2
        ],
        "cols": 4,
        "size": 68,
        "foot": [
            192,
            270
        ]
    },
    "quest-faceless-assassin": {
        "src": "images/monsters/quest-v1/faceless-assassin.png",
        "cw": 384,
        "ch": 320,
        "body": 160,
        "n": [
            2,
            2,
            2,
            2,
            2,
            2
        ],
        "cols": 4,
        "size": 68,
        "foot": [
            192,
            270
        ]
    },
    "quest-gatebreaker": {
        "src": "images/monsters/quest-v1/gatebreaker.png",
        "cw": 384,
        "ch": 320,
        "body": 160,
        "n": [
            2,
            2,
            2,
            2,
            2,
            2
        ],
        "cols": 4,
        "size": 68,
        "foot": [
            192,
            270
        ]
    },
    "quest-fist-saint": {
        "src": "images/monsters/quest-v1/fist-saint.png",
        "cw": 384,
        "ch": 320,
        "body": 160,
        "n": [
            2,
            2,
            2,
            2,
            2,
            2
        ],
        "cols": 4,
        "size": 68,
        "foot": [
            192,
            270
        ]
    },
    "quest-asura-demon-king": {
        "src": "images/monsters/quest-v1/asura-demon-king.png",
        "cw": 384,
        "ch": 320,
        "body": 160,
        "n": [
            2,
            2,
            2,
            2,
            2,
            2
        ],
        "cols": 4,
        "size": 78,
        "foot": [
            192,
            270
        ]
    },
    "quest-ancient-stone-giant": {
        "src": "images/monsters/quest-v1/ancient-stone-giant.png",
        "cw": 384,
        "ch": 320,
        "body": 160,
        "n": [
            2,
            2,
            2,
            2,
            2,
            2
        ],
        "cols": 4,
        "size": 86,
        "foot": [
            192,
            270
        ]
    },
    "quest-flame-general": {
        "src": "images/monsters/quest-v1/flame-general.png",
        "cw": 384,
        "ch": 320,
        "body": 160,
        "n": [
            2,
            2,
            2,
            2,
            2,
            2
        ],
        "cols": 4,
        "size": 68,
        "foot": [
            192,
            270
        ]
    },
    "quest-ash-giant": {
        "src": "images/monsters/quest-v1/ash-giant.png",
        "cw": 384,
        "ch": 320,
        "body": 160,
        "n": [
            2,
            2,
            2,
            2,
            2,
            2
        ],
        "cols": 4,
        "size": 90,
        "foot": [
            192,
            270
        ]
    },
    "quest-bandit-ironhand": {
        "src": "images/monsters/quest-v1/bandit-ironhand.png",
        "cw": 384,
        "ch": 320,
        "body": 160,
        "n": [
            2,
            2,
            2,
            2,
            2,
            2
        ],
        "cols": 4,
        "size": 68,
        "foot": [
            192,
            270
        ]
    },
    "quest-ancient-mech-golem": {
        "src": "images/monsters/quest-v1/ancient-mech-golem.png",
        "cw": 384,
        "ch": 320,
        "body": 160,
        "n": [
            2,
            2,
            2,
            2,
            2,
            2
        ],
        "cols": 4,
        "size": 82,
        "foot": [
            192,
            270
        ]
    },
    "quest-rust-turret": {
        "src": "images/monsters/quest-v1/rust-turret.png",
        "cw": 384,
        "ch": 320,
        "body": 160,
        "n": [
            2,
            2,
            2,
            2,
            2,
            2
        ],
        "cols": 4,
        "size": 68,
        "foot": [
            192,
            270
        ]
    },
    "quest-runaway-magic-soldier": {
        "src": "images/monsters/quest-v1/runaway-magic-soldier.png",
        "cw": 384,
        "ch": 320,
        "body": 160,
        "n": [
            2,
            2,
            2,
            2,
            2,
            2
        ],
        "cols": 4,
        "size": 68,
        "foot": [
            192,
            270
        ]
    },
    "quest-sword-saint-remnant": {
        "src": "images/monsters/quest-v1/sword-saint-remnant.png",
        "cw": 384,
        "ch": 320,
        "body": 160,
        "n": [
            2,
            2,
            2,
            2,
            2,
            2
        ],
        "cols": 4,
        "size": 68,
        "foot": [
            192,
            270
        ]
    },
    "quest-broken-magic-blade": {
        "src": "images/monsters/quest-v1/broken-magic-blade.png",
        "cw": 384,
        "ch": 320,
        "body": 160,
        "n": [
            2,
            2,
            2,
            2,
            2,
            2
        ],
        "cols": 4,
        "size": 68,
        "foot": [
            192,
            270
        ]
    },
    "quest-fallen-priest": {
        "src": "images/monsters/quest-v1/fallen-priest.png",
        "cw": 384,
        "ch": 320,
        "body": 160,
        "n": [
            2,
            2,
            2,
            2,
            2,
            2
        ],
        "cols": 4,
        "size": 68,
        "foot": [
            192,
            270
        ]
    },
    "quest-lich-king": {
        "src": "images/monsters/quest-v1/lich-king.png",
        "cw": 384,
        "ch": 320,
        "body": 160,
        "n": [
            2,
            2,
            2,
            2,
            2,
            2
        ],
        "cols": 4,
        "size": 68,
        "foot": [
            192,
            270
        ]
    },
    "quest-blasphemous-bishop": {
        "src": "images/monsters/quest-v1/blasphemous-bishop.png",
        "cw": 384,
        "ch": 320,
        "body": 160,
        "n": [
            2,
            2,
            2,
            2,
            2,
            2
        ],
        "cols": 4,
        "size": 68,
        "foot": [
            192,
            270
        ]
    },
    "quest-abyss-envoy": {
        "src": "images/monsters/quest-v1/abyss-envoy.png",
        "cw": 384,
        "ch": 320,
        "body": 160,
        "n": [
            2,
            2,
            2,
            2,
            2,
            2
        ],
        "cols": 4,
        "size": 68,
        "foot": [
            192,
            270
        ]
    },
    "quest-fallen-archangel": {
        "src": "images/monsters/quest-v1/fallen-archangel.png",
        "cw": 384,
        "ch": 320,
        "body": 160,
        "n": [
            2,
            2,
            2,
            2,
            2,
            2
        ],
        "cols": 4,
        "size": 68,
        "foot": [
            192,
            270
        ]
    },
    "quest-fallen-seraph": {
        "src": "images/monsters/quest-v1/fallen-seraph.png",
        "cw": 384,
        "ch": 320,
        "body": 160,
        "n": [
            2,
            2,
            2,
            2,
            2,
            2
        ],
        "cols": 4,
        "size": 68,
        "foot": [
            192,
            270
        ]
    },
    "quest-celestial-hunter": {
        "src": "images/monsters/quest-v1/celestial-hunter.png",
        "cw": 384,
        "ch": 320,
        "body": 160,
        "n": [
            2,
            2,
            2,
            2,
            2,
            2
        ],
        "cols": 4,
        "size": 68,
        "foot": [
            192,
            270
        ]
    },
    "quest-abyss-lord": {
        "src": "images/monsters/quest-v1/abyss-lord.png",
        "cw": 384,
        "ch": 320,
        "body": 160,
        "n": [
            2,
            2,
            2,
            2,
            2,
            2
        ],
        "cols": 4,
        "size": 86,
        "foot": [
            192,
            270
        ]
    },
    "quest-abyss-devourer": {
        "src": "images/monsters/quest-v1/abyss-devourer.png",
        "cw": 384,
        "ch": 320,
        "body": 160,
        "n": [
            2,
            2,
            2,
            2,
            2,
            2
        ],
        "cols": 4,
        "size": 90,
        "foot": [
            192,
            270
        ]
    },
    "quest-shadow-royal": {
        "actor": "royal",
        "size": 48,
        "shadow": true
    },
    "quest-shadow-knight": {
        "actor": "knight",
        "size": 48,
        "shadow": true
    },
    "quest-shadow-mage": {
        "actor": "mage",
        "size": 48,
        "shadow": true
    },
    "quest-shadow-elf": {
        "actor": "elf",
        "size": 48,
        "shadow": true
    },
    "quest-shadow-darkelf": {
        "actor": "darkelf",
        "size": 48,
        "shadow": true
    },
    "quest-shadow-shura": {
        "actor": "shura",
        "size": 48,
        "shadow": true
    },
    "quest-shadow-warrior": {
        "actor": "warrior",
        "size": 48,
        "shadow": true
    },
    "quest-shadow-gunner": {
        "actor": "gunner",
        "size": 48,
        "shadow": true
    },
    "quest-shadow-magicfighter": {
        "actor": "magicfighter",
        "size": 48,
        "shadow": true
    },
    "quest-shadow-paladin": {
        "actor": "paladin",
        "size": 48,
        "shadow": true
    },
    "quest-shadow-angel": {
        "actor": "angel",
        "size": 48,
        "shadow": true
    },
    "quest-shadow-demon": {
        "actor": "demon",
        "size": 48,
        "shadow": true
    }
};
Object.assign(SCENE_ART_MONSTERS, SCENE_QUEST_SPRITES);
function sceneMonsterArt(m) {
    if (!m) return null;
    if (m.mid && SCENE_ART_MONSTERS[m.mid]) return m.mid;
    const name = (m.inst ? m.inst.name : m.name) || '';
    if ((m.mid === 'questBoss' || m.inst && m.inst.questBoss) && SCENE_QUEST_ART[name]) return SCENE_QUEST_ART[name];
    const art = SCENE_TOWER_ART[name.replace(/\s*[（(].*$/, '')];
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
