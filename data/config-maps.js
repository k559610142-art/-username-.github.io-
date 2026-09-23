// 地圖區域資料：分類、安全區標記、經驗倍率、難度、進入限制

// 宗門（唯一的安全區）：待在這裡時，所有宗門設施（任務/靈田/靈獸園/靈寶閣/藏書閣/鍛造閣/煉丹房）都可使用
// 舊版的「洞府 / 弟子居」「演武學宮」「後山禁地」已合併進來，舊存檔由 save.js 的 migrateCurrentMap() 轉換
const SECT_MAP_NAME = "宗門";

const maps = [
    { category: "一、宗門 (安全區)", isSafe: true, items: [
        { name: SECT_MAP_NAME, expRate: 3, diff: 1 }
    ]},
    { category: "二、野外歷練 (戰鬥區)", isSafe: false, items: [
        { name: "靈山大川", expRate: 8, diff: 2 },
        { name: "深淵險地", expRate: 20, diff: 8 },
        { name: "上古遺跡", expRate: 50, diff: 25 }
    ]},
    { category: "三、開放世界大區域 (高難度戰鬥)", isSafe: false, items: [
        { name: "天南", expRate: 100, diff: 100 },
        { name: "亂星海", expRate: 300, diff: 400 },
        { name: "鬼谷八荒", expRate: 1000, diff: 2000 }
    ]},
    { category: "四、禁區 (仙人解鎖·高難)", isSafe: false, items: [
        { name: "荒古禁地", expRate: 3000, diff: 5000, minRealm: 10, minStat: 500 },
        { name: "太初古礦", expRate: 4000, diff: 7000, minRealm: 10, minStat: 500 },
        { name: "上蒼（葬天島）", expRate: 5000, diff: 10000, minRealm: 10, minStat: 500 },
        { name: "不死山", expRate: 6000, diff: 13000, minRealm: 10, minStat: 500 },
        { name: "神墟", expRate: 7000, diff: 16000, minRealm: 10, minStat: 500 },
        { name: "仙陵", expRate: 8000, diff: 20000, minRealm: 10, minStat: 500 },
        { name: "冥界", expRate: 9000, diff: 25000, minRealm: 10, minStat: 500 }
    ]},
    { category: "五、諸天至高戰場 (頂級戰場·極難)", isSafe: false, items: [
        { name: "仙界戰場", expRate: 15000, diff: 50000, minRealm: 10, minStat: 5000, isTopBattle: true },
        { name: "萬界戰場", expRate: 25000, diff: 90000, minRealm: 10, minStat: 5000, isTopBattle: true },
        { name: "混沌初界", expRate: 50000, diff: 200000, minRealm: 10, minStat: 5000, isTopBattle: true }
    ]}
];

// 每擊殺一隻妖獸獲得的聲望：依地圖分類（maps 的索引）隨機 1 ~ 上限，難度越高聲望越多。
// 安全區（索引 0）不會戰鬥，沒有對應值；找不到時退回 1 點。
const REPUTATION_MAX_BY_MAP_CATEGORY = {
    1: 3,     // 二、野外歷練
    2: 10,    // 三、開放世界
    3: 30,    // 四、上古禁區
    4: 100    // 五、諸天至高戰場
};

// 離線掛機的聲望倍率：離線每個戰鬥 tick 以「該區平均聲望 × 此倍率」計算。
// 0.3 是實測值：線上滿速掛機每秒約 0.31 隻（波次之間有 5 秒刷新），離線換算約每秒 0.21 隻，
// 約為線上的 6 成。調高這個值會讓離線比線上划算，改動前請重新實測。
const OFFLINE_REPUTATION_RATE = 0.3;

// 野外遭遇怪物隨機顯示的圖示
const monsterIcons = ["🐺", "🐅", "🐍", "🦇", "🦂", "👹", "👻", "🐉", "🦅", "🕷️"];
