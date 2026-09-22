// 壽元設定：索引對應 realms（config-realms.js）
//   gain      = 晉升到該境界時增加的壽元（年）；凡人為初始壽元
//   deathCost = 在該境界死亡一次扣除的壽元（年）
// 壽元與戰力無關；歸零即身死道消，存檔清除並重新開始（只有「死亡」會讓壽元歸零，見下方底線）。

// ---- 歲月流逝（自然消耗）：安全區緩慢流逝，野外依危險度加速，觸及底線後停止 ----
// 每分鐘流逝 = 目前境界的 gain ÷ LIFESPAN_AGING_MINUTES × 所在地倍率
//   → 在安全區，一個境界給的壽元約可撐 360 分鐘（6 小時）線上時間
const LIFESPAN_AGING_MINUTES = 360;

// 所在地倍率：索引對應 maps 的分類（0 安全區 / 1 野外 / 2 開放世界 / 3 禁區 / 4 至高戰場）
const LIFESPAN_DANGER_MULT = [1, 1.5, 2, 3, 4];
const LIFESPAN_TRIBULATION_MULT = 4;   // 渡劫期間

// 離線期間以一半速度流逝（同樣受底線保護）
const LIFESPAN_OFFLINE_RATE = 0.5;

// 底線：剩餘壽元 ≤「目前境界死亡折壽 × 3」時，自然流逝停止。
// 也就是「時間永遠不會直接害死玩家」，但觸底後再死亡 3 次就會身死道消。
const LIFESPAN_FLOOR_DEATHS = 3;
const lifespanByRealm = [
    { realm: "凡人",         gain: 60,     deathCost: 1 },
    { realm: "煉氣",         gain: 100,    deathCost: 1 },
    { realm: "築基",         gain: 200,    deathCost: 3 },
    { realm: "金丹",         gain: 500,    deathCost: 5 },
    { realm: "元嬰",         gain: 800,    deathCost: 5 },
    { realm: "化神",         gain: 1000,   deathCost: 5 },
    { realm: "煉虛",         gain: 1200,   deathCost: 8 },
    { realm: "合體",         gain: 1500,   deathCost: 8 },
    { realm: "大乘",         gain: 2000,   deathCost: 10 },
    { realm: "渡劫",         gain: 3000,   deathCost: 10 },
    { realm: "仙人初境",     gain: 4000,   deathCost: 15 },
    { realm: "天仙",         gain: 4500,   deathCost: 15 },
    { realm: "真仙",         gain: 5000,   deathCost: 20 },
    { realm: "大羅金仙",     gain: 20000,  deathCost: 50 },    // 對應需求表的「仙王」
    { realm: "混元大羅金仙", gain: 50000,  deathCost: 100 },   // 對應需求表的「仙帝」
    { realm: "混沌道祖",     gain: 100000, deathCost: 200 }
];
