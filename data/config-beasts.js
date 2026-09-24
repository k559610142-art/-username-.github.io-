// 靈獸（靈寵）設定：兌換費用、被動加成、等級與技能樹
//
// - 兌換後一律從 Lv1 開始，與人物共用經驗來源，但等級不可超過人物等級。
// - 靈寵沒有氣血，只負責協助（攻擊或輔助）；所有存活靈寵每回合都會各自判定出手。
// - 玩家死亡時所有靈寵立即死亡，每隻需消耗 BEAST_REVIVE_COST_CORE 獸丹復活。
// - 死亡的靈寵不提供被動加成、不出手、也不累積經驗。
const beastData = [
    // 被動加成實際生效處：stats.js 的 getBasePower()（戰力）、leveling.js 的 gainExp()（經驗）
    { id: "fox", name: "靈幻狐", costCore: 1000, costCoins: 10000, desc: "靈動可愛的靈狐，可增加經驗獲取速度 10%", passive: "經驗 +10%" },
    { id: "wolf", name: "青蒼狼", costCore: 3000, costCoins: 30000, desc: "兇猛的蒼狼，可提升角色戰力 15%", passive: "戰力 +15%" },
    { id: "dragon", name: "九幽蛟龍", costCore: 5000, costCoins: 50000, desc: "上古異種蛟龍，大幅提升戰力 30% 與經驗 20%", passive: "戰力 +30%、經驗 +20%" }
];

const BEAST_REVIVE_COST_CORE = 5000;

// 靈寵維持費：每隻「出戰中」（存活且未召回休息）的靈寵，每出戰滿 BEAST_UPKEEP_INTERVAL 秒扣一次，
// 費用依該靈寵的等級決定（maxLevel 以下適用該檔）。付不起時該靈寵自動召回休息，不再提供被動與協助。
const BEAST_UPKEEP_INTERVAL = 60;
const beastUpkeepTiers = [
    { maxLevel: 99,       coins: 2000,  core: 50 },    // Lv100 以前
    { maxLevel: 299,      coins: 5000,  core: 100 },   // Lv300 以前
    { maxLevel: 499,      coins: 20000, core: 150 },   // Lv500 以前
    { maxLevel: Infinity, coins: 50000, core: 200 }    // Lv500 以後
];

// 靈寵在這些等級各可領悟 1 招技能（共 6 招），每一招都可自由選擇五行方向
const BEAST_SKILL_LEVELS = [30, 60, 100, 300, 500, 1000];

// 每隻存活靈寵每回合施展技能的機率
const BEAST_SKILL_CHANCE = 0.3;

// 五行技能樹：每個屬性 6 招，第 N 個領悟欄位選了某屬性，就學會該屬性的第 N 招
//   金 single：對單一敵人造成「人物物理攻擊 × mult」傷害
//   火 aoe   ：對全部敵人各造成「人物物理攻擊 × mult」傷害
//   木 buff  ：人物攻擊力 × mult，持續 duration 回合（多招取最高，不疊乘）
//   水 heal  ：立即回復 heal（最大氣血比例）、mpHeal（最大靈力比例），
//              或 regen × regenTurns 回合的持續回復
//   土 shield：受到的傷害減少 reduce 比例，持續 duration 回合
const beastElementInfo = {
    "金": { color: "#facc15", desc: "單體傷害" },
    "木": { color: "#4ade80", desc: "增益" },
    "水": { color: "#38bdf8", desc: "治療 / 持續回復" },
    "火": { color: "#f87171", desc: "群體傷害" },
    "土": { color: "#d6a15b", desc: "防禦守護" }
};

const beastSkillTree = {
    "金": [
        { name: "金芒刺",   kind: "single", mult: 0.20 },
        { name: "裂金爪",   kind: "single", mult: 0.30 },
        { name: "庚金劍氣", kind: "single", mult: 0.45 },
        { name: "破甲金罡", kind: "single", mult: 0.60 },
        { name: "太白誅邪", kind: "single", mult: 0.80 },
        { name: "萬劫金鋒", kind: "single", mult: 1.00 }
    ],
    "木": [
        { name: "生機勃發",   kind: "buff", mult: 1.10, duration: 3 },
        { name: "青木之力",   kind: "buff", mult: 1.15, duration: 3 },
        { name: "萬木爭榮",   kind: "buff", mult: 1.20, duration: 3 },
        { name: "乙木神威",   kind: "buff", mult: 1.25, duration: 4 },
        { name: "建木通天",   kind: "buff", mult: 1.35, duration: 4 },
        { name: "長生青帝訣", kind: "buff", mult: 1.50, duration: 4 }
    ],
    "水": [
        { name: "清泉術",   kind: "heal", heal: 0.05 },
        { name: "潤物細雨", kind: "heal", regen: 0.03, regenTurns: 4 },
        { name: "滄海潮生", kind: "heal", heal: 0.10, mpHeal: 0.05 },
        { name: "玄冥甘露", kind: "heal", regen: 0.05, regenTurns: 4 },
        { name: "碧波回春", kind: "heal", heal: 0.18, mpHeal: 0.10 },
        { name: "天一真水", kind: "heal", heal: 0.12, regen: 0.06, regenTurns: 4 }
    ],
    "火": [
        { name: "火星燎原", kind: "aoe", mult: 0.12 },
        { name: "烈焰吐息", kind: "aoe", mult: 0.18 },
        { name: "離火焚天", kind: "aoe", mult: 0.27 },
        { name: "赤炎風暴", kind: "aoe", mult: 0.36 },
        { name: "南明離火", kind: "aoe", mult: 0.48 },
        { name: "太陽真火", kind: "aoe", mult: 0.60 }
    ],
    "土": [
        { name: "岩甲術",     kind: "shield", reduce: 0.10, duration: 3 },
        { name: "厚土之盾",   kind: "shield", reduce: 0.15, duration: 3 },
        { name: "山岳守護",   kind: "shield", reduce: 0.20, duration: 3 },
        { name: "戊土玄壁",   kind: "shield", reduce: 0.25, duration: 4 },
        { name: "不動明王身", kind: "shield", reduce: 0.30, duration: 4 },
        { name: "后土神障",   kind: "shield", reduce: 0.40, duration: 4 }
    ]
};
