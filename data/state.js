// 玩家與戰鬥的全域執行狀態（依賴 config-maps.js 的 maps，需在其後載入）
let player = {
    name: "韓立",
    gender: "male",
    realmIndex: 0, stage: 1, exp: 0,
    level: 1, levelExp: 0,       // 人物等級（與境界獨立，上限 MAX_PLAYER_LEVEL）
    lifespan: 60,                // 剩餘壽元（年），歸零即身死道消、重新開始
    hp: 100, maxHp: 100, mp: 100, maxMp: 100, coins: 0, reputation: 0,
    stats: { str: 10, con: 10, int: 10, spr: 10, cha: 10 },
    studyCounts: { str: 0, con: 0, int: 0, spr: 0 },
    elementStudy: {},            // 藏書閣第二階段屬性秘典的參悟次數 { metal, wood, ... }（library.js 的 elementBooks）
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
    // 每隻靈寵：{ id, level, exp, alive, skills: [6 格，已選的五行屬性或 null] }
    beasts: [],
    activeQuest: null, questTimer: 0,   // 玩家「親自」執行的任務（須待在宗門）
    currentMap: maps[0].items[0], currentMapIsSafe: true,
    sect: null, buffTimer: 0, buffMult: 1,
    sectSkills: { 1: null, 2: null, 3: null },   // 各階段已拜入（並學得技能）的宗門名稱，選定後鎖定
    learnedSkills: [],
    lingbaoSold: [],             // 靈寶閣已兌換（售出）的唯一性商品 id，售出後永不補貨
    reincarnations: 0,
    reincarnateBonus: { hp: 0, mp: 0 },   // 轉世保留的氣血／靈力上限（前世上限的 REINCARNATE_KEEP_RATE）
    pendingTribulation: false,   // 小境界已滿 10 階，修為暫停、等待渡劫
    tribulationCount: 0,         // 累計渡劫成功次數

    // 活動：每日任務與千寶閣（皆以時間戳判斷是否該刷新）
    dailyQuests: [],             // 當期 10 項每日任務
    dailyRefreshAt: 0,           // 每日任務下次刷新的時間戳
    dailyStats: {},              // 當期各類型累計次數（刷新時清空）
    auctionItems: [],            // 千寶閣當期 5 件商品
    auctionRefreshAt: 0,         // 千寶閣下次上架的時間戳
    autoHp: { enabled: false, threshold: 50 },
    autoMp: { enabled: false, threshold: 30 },
    lastSaveTime: Date.now()
};

// 全新角色的預設值快照：讀檔／匯入一律「合併到這份預設值」而不是目前的 player，
// 否則匯入缺欄位的舊存檔時，會把目前角色的等級、宗門技能等資料帶進新存檔（見 save.js 的 applySaveData）
const DEFAULT_PLAYER_JSON = JSON.stringify(player);

let enemies = [];
let respawnTimer = 0;
let safeZoneTimer = 0;

// 以下為「不寫入存檔」的執行期狀態：重新整理後即歸零
let inTribulation = false;   // 是否正在與心魔對決
let heartDemon = null;       // 心魔實體 { name, icon, hp, maxHp, attack, buffTimer, buffMult }
let tribulationFatedWin = false;   // 開打時依勝算擲出的天命（true = 此次渡劫必定成功）
let potionCooldownHp = 0;    // 氣血類藥品剩餘冷卻秒數
let potionCooldownMp = 0;    // 靈力類藥品剩餘冷卻秒數
let gameOver = false;        // 壽元耗盡：停止戰鬥與存檔，等待重新載入
let playerStatus = { frozen: 0, burn: null, poison: null };   // 玩家身上的凍結/燒傷/中毒（elements.js）

// 靈寵輔助效果（木：攻擊增益／土：減傷／水：持續回復），皆以回合數倒數
let petBuffTimer = 0, petBuffMult = 1;
let petShieldTimer = 0, petShieldRate = 0;
let petRegenTimer = 0, petRegenRate = 0;
