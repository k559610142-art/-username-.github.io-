// 玩家與戰鬥的全域執行狀態（依賴 config-maps.js 的 maps，需在其後載入）
let player = {
    name: "韓立",
    gender: "male",
    realmIndex: 0, stage: 1, exp: 0,
    hp: 100, maxHp: 100, mp: 100, maxMp: 100, coins: 0, reputation: 0,
    stats: { str: 10, con: 10, int: 10, spr: 10, cha: 10 },
    studyCounts: { str: 0, con: 0, int: 0, spr: 0 },
    spiritGrass: 0, beastCore: 0, martialPoints: 0,
    herbs: { mortal: 0, high: 0, epic: 0, immortal: 0 },
    bag: {},
    equipInventory: [],
    equipment: {
        "劍": null, "刀": null, "扇": null, "弓": null, "笛": null, "筆": null,
        "頭": null, "內衣": null, "盔甲": null, "手套": null, "長靴": null, "披風": null,
        "腰帶": null, "項鍊": null, "戒指": null, "耳環": null, "腰牌": null,
        "神器": null
    },
    // 每位僕從自帶 quest（負責的任務代號）與 timer（自身進度），可各自指派不同任務
    servants: [],
    beasts: [],
    activeQuest: null, questTimer: 0,   // 玩家「親自」執行的任務（須待在演武學宮）
    currentMap: maps[0].items[0], currentMapIsSafe: true,
    sect: null, buffTimer: 0, buffMult: 1,
    learnedSkills: [],
    reincarnations: 0,
    pendingTribulation: false,   // 小境界已滿 10 階，修為暫停、等待渡劫
    tribulationCount: 0,         // 累計渡劫成功次數
    autoHp: { enabled: false, threshold: 50 },
    autoMp: { enabled: false, threshold: 30 },
    lastSaveTime: Date.now()
};

let enemies = [];
let respawnTimer = 0;
let safeZoneTimer = 0;

// 以下為「不寫入存檔」的執行期狀態：重新整理後即歸零
let inTribulation = false;   // 是否正在與心魔對決
let heartDemon = null;       // 心魔實體 { name, icon, hp, maxHp, attack, buffTimer, buffMult }
let potionCooldownHp = 0;    // 氣血類藥品剩餘冷卻秒數
let potionCooldownMp = 0;    // 靈力類藥品剩餘冷卻秒數
