// 壽元設定：索引對應 realms（config-realms.js）
//   gain      = 晉升到該境界時增加的壽元（年）；凡人為初始壽元
//   deathCost = 在該境界死亡一次扣除的壽元（年）
// 壽元只會因「死亡」減少，與戰力無關；歸零即身死道消，存檔清除並重新開始。
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
