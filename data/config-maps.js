// 地圖區域資料：分類、安全區標記、經驗倍率、難度、進入限制
// thumb（選填）= 修仙地圖卡片上的縮圖（images/maps/，建議 720px 寬的橫圖），沒有就只顯示文字

// 宗門（唯一的安全區）：待在這裡時，所有宗門設施（任務/靈田/靈獸園/靈寶閣/藏書閣/鍛造閣/煉丹房）都可使用
// 舊版的「洞府 / 弟子居」「演武學宮」「後山禁地」已合併進來，舊存檔由 save.js 的 migrateCurrentMap() 轉換
const SECT_MAP_NAME = "宗門";

// ⚠️ coins = 每擊殺一隻的「平均」靈石（實際為 ±20% 隨機，見 combat.js 的 rollKillCoins）。
//    舊版用 diff × (8~12) 計算，難度一放大靈石就爆量（混沌初界每小時 22 億），因此改為各地圖獨立設定。
//    換算方式：滿速掛機每小時約 KILLS_PER_HOUR_ESTIMATE 隻 → 每小時靈石 ≈ coins × 1160。
//    調整靈石產出時只要改這裡的 coins，不要再動 diff（diff 只決定怪物強度與經驗/聲望以外的難度感）。
const KILLS_PER_HOUR_ESTIMATE = 1160;   // 實測值：波次之間有 5 秒刷新，滿速約每秒 0.32 隻

const maps = [
    // 城鎮（安全區，不編號；戰鬥區為第一～五區）。⚠️ items[0] 必須是宗門：死亡回城、渡劫失敗、暫存區滿等都用 changeMap(0, 0)／maps[0].items[0] 代表宗門。
    // 宗門標 hidden，不列在修仙地圖裡，只能按洞府的「宗門」回去（map.js 的 returnToSect）。
    // 城鎮是安全區、可打坐，但不是宗門，宗門設施不能用（isInSect 只認 SECT_MAP_NAME）。
    { category: "城鎮 (安全區)", isSafe: true, items: [
        { name: SECT_MAP_NAME, expRate: 3, diff: 1, coins: 0, hidden: true },
        { name: "天南城", expRate: 3, diff: 1, coins: 0 },
        { name: "天星城", expRate: 3, diff: 1, coins: 0, thumb: "images/maps/tianxing-city.jpg" }   // 亂星海的主城；第二區已有戰鬥地圖「亂星海」，名稱不可重複
    ]},
    { category: "一、野外歷練 (戰鬥區)", isSafe: false, items: [
        //                                                      coins   ≈ 每小時上限
        { name: "靈山大川", expRate: 8, diff: 2, coins: 20 },        //   2.3 萬
        { name: "深淵險地", expRate: 20, diff: 8, coins: 80 },       //   9.3 萬
        { name: "上古遺跡", expRate: 50, diff: 25, coins: 250 }      //  29 萬
    ]},
    { category: "二、開放世界大區域 (高難度戰鬥)", isSafe: false, items: [
        { name: "天南", expRate: 100, diff: 100, coins: 1000 },      // 116 萬
        { name: "亂星海", expRate: 300, diff: 400, coins: 1650 },    // 191 萬（上限 200 萬）
        { name: "鬼谷八荒", expRate: 1000, diff: 2000, coins: 2450 } // 284 萬（上限 300 萬）
    ]},
    { category: "三、上古禁區 (煉虛解鎖·高難)", isSafe: false, items: [
        { name: "荒古禁地", expRate: 3000, diff: 800000, coins: 3350, minRealm: 6, minStat: 2000 },      // 389 萬（上限 400 萬）
        { name: "太初古礦", expRate: 4000, diff: 5000000, coins: 4200, minRealm: 6, minStat: 2000 },      // 487 萬（上限 500 萬）
        { name: "上蒼（葬天島）", expRate: 5000, diff: 10000000, coins: 6900, minRealm: 6, minStat: 2000 } // 800 萬
    ]},
    // 第四區由原禁區後半拆出（2026-09-27），數值與第三區共用同一組分類倍率
    { category: "四、幽冥禁域 (仙人解鎖·高難)", isSafe: false, items: [
        { name: "不死山", expRate: 6000, diff: 200000000, coins: 7300, minRealm: 10, minStat: 5000 },       // 847 萬
        { name: "神墟", expRate: 7000, diff: 300000000, coins: 7750, minRealm: 10, minStat: 5000 },         // 899 萬
        { name: "仙陵", expRate: 8000, diff: 800000000, coins: 8200, minRealm: 10, minStat: 5000 },         // 951 萬
        { name: "冥界", expRate: 9000, diff: 1500000000, coins: 8400, minRealm: 10, minStat: 5000 }         // 974 萬（上限 1000 萬）
    ]},
    // 上蒼之後（含諸天戰場）一律維持在每小時 800～1000 萬，不再隨難度放大；
    // 這幾張圖的差異改由經驗與聲望體現，靈石封頂。
    { category: "五、諸天至高戰場 (頂級戰場·極難)", isSafe: false, items: [
        { name: "仙界戰場", expRate: 15000, diff: 3000000000, coins: 8400, minRealm: 10, minStat: 10000, isTopBattle: true },   // 974 萬
        { name: "萬界戰場", expRate: 25000, diff: 5000000000, coins: 8400, minRealm: 10, minStat: 10000, isTopBattle: true },   // 974 萬
        { name: "混沌初界", expRate: 50000, diff: 10000000000, coins: 8400, minRealm: 10, minStat: 10000, isTopBattle: true }   // 974 萬
    ]}
];

// 每擊殺一隻妖獸獲得的聲望：依地圖分類（maps 的索引）隨機 1 ~ 上限，難度越高聲望越多。
// 安全區（索引 0）不會戰鬥，沒有對應值；找不到時退回 1 點。
const REPUTATION_MAX_BY_MAP_CATEGORY = {
    1: 3,     // 一、野外歷練
    2: 10,    // 二、開放世界
    3: 30,    // 三、上古禁區
    4: 30,    // 四、幽冥禁域（同上古禁區）
    5: 100    // 五、諸天至高戰場
};

// 離線掛機的「每秒戰鬥次數」：離線收益 = 離線秒數 × 此係數 × 每次的經驗/靈石。
// ⚠️ 舊值 0.7 等於假設離線每秒殺 0.7 隻，但線上滿速也只有每秒 0.32 隻，
//    造成離線收益是線上的 2.16 倍（關掉遊戲比掛機划算）。改為 0.3 後離線約為線上的 93%。
const OFFLINE_COMBAT_RATE = 0.3;
// 離線／背景依實力估算戰鬥效率用（save.js 的 estimateIdleCombat）：一波平均隻數（1～5 隻）、波與波之間的秒數（刷新 5＋生成 1）
const IDLE_WAVE_AVG_MONSTERS = 3;
const IDLE_WAVE_GAP_TICKS = 6;

// 離線掛機的聲望倍率：離線每個戰鬥 tick 以「該區平均聲望 × 此倍率」計算。
// 0.7 × OFFLINE_COMBAT_RATE(0.3) ≈ 每秒 0.21 隻，約為線上的 65%（聲望刻意比線上少）。
// 改動前請重新實測，兩個係數要一起看。
const OFFLINE_REPUTATION_RATE = 0.7;

// 野外遭遇怪物隨機顯示的圖示
const monsterIcons = ["🐺", "🐅", "🐍", "🦇", "🦂", "👹", "👻", "🐉", "🦅", "🕷️"];
