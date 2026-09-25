// 天星賭坊（天星城坊市的石拱門，ARCHITECTURE.md 第 40 節）；邏輯在 casino.js
// 賭坊是靈石的回收管道：長期期望值略低於投入（賭星隕石約 80%、擲骰約 97%），偶爾大賺。
// 只能在 CASINO_TOWN 使用；每日下注（含買隕石）有上限，依境界提高。

const CASINO_TOWN = "天星城";

// 每日下注上限（靈石，依 realmIndex；買隕石與擲骰合計，每天 0 點重置）
const CASINO_DAILY_LIMIT_BY_REALM = [
    1000000, 2000000, 5000000, 10000000, 20000000, 50000000, 100000000, 200000000,
    300000000, 500000000, 800000000, 1000000000, 1500000000, 2000000000, 3000000000, 5000000000
];
const CASINO_DICE_MAX_RATIO = 0.2;       // 擲骰單把上限 = 每日上限 × 20%
const CASINO_DICE_MIN_BET = 1000;        // 擲骰最低押注
const CASINO_CONFIRM_RATIO = 0.25;       // 單次花費 ≥ 目前靈石的 25% 時要二次確認

// ---- 賭星隕石 ----
// odds = 各結果權重（合計 100）；type：
//   waste 廢石、coins 靈石、shards 碎鐵、ore 礦石、iron 星允鐵、fireShards 異火碎片、
//   gear 裝備（quality：紫色／橙色，依奪寶規則產生）、fire 整朵天下異火
// amount = [最少, 最多]；估值見 CASINO_VALUE（只用於「今日輸贏」與「最大收穫」的顯示）
const casinoStones = [
    { id: "common", name: "凡品隕石", icon: "🌑", price: 100000,
      desc: "天外墜落的尋常隕石，偶爾藏著星允鐵。",
      odds: [
          { w: 40, type: "waste" },
          { w: 20, type: "coins",      amount: [50000, 150000] },
          { w: 15, type: "shards",     amount: [50, 150] },
          { w: 12, type: "ore",        amount: [50, 150] },
          { w: 10, type: "iron",       amount: [1, 2] },
          { w: 3,  type: "fireShards", amount: [1, 3] }
      ] },
    { id: "spirit", name: "靈品隕石", icon: "🌗", price: 1000000,
      desc: "表皮泛著星紋的靈石胚，常見星允鐵與異火碎片。",
      odds: [
          { w: 25, type: "waste" },
          { w: 25, type: "coins",      amount: [500000, 1500000] },
          { w: 22, type: "iron",       amount: [2, 5] },
          { w: 15, type: "fireShards", amount: [10, 20] },
          { w: 8,  type: "gear",       quality: "紫色" },
          { w: 4,  type: "iron",       amount: [8, 15], big: true },
          { w: 1,  type: "gear",       quality: "橙色" }
      ] },
    { id: "immortal", name: "仙品隕石", icon: "☄️", price: 10000000,
      desc: "傳說來自星海深處的仙隕，可能孕育整朵天下異火。",
      odds: [
          { w: 20, type: "waste" },
          { w: 20, type: "coins",      amount: [8000000, 16000000] },
          { w: 25, type: "iron",       amount: [20, 40] },
          { w: 20, type: "fireShards", amount: [100, 200] },
          { w: 10, type: "gear",       quality: "橙色" },
          { w: 4,  type: "iron",       amount: [80, 150], big: true },
          { w: 1,  type: "fire" }
      ] }
];

// 估值（靈石），只影響賭坊內的輸贏統計顯示：星允鐵依千寶閣價、碎鐵 = 星允鐵 ÷ 500
const CASINO_VALUE = { iron: 300000, shards: 600, ore: 500, fireShards: 30000, gear: { "紫色": 1000000, "橙色": 5000000 }, fire: 30000000 };

// 切石過程的描述（每次隨機挑，最後一段依結果）
const CASINO_CUT_LINES = ["一刀下去，石屑紛飛……", "磨開表皮，露出灰白石芯……", "再切一刀，隱約透出微光……"];

// ---- 擲骰比大小（三顆骰子）----
// payout = 淨贏倍數（押 1 贏 payout，另退回本金）；大／小遇到豹子（三顆相同）算莊家贏
const CASINO_DICE_BETS = {
    big:        { name: "大",       payout: 1,   desc: "總點 11～17（豹子不算）" },
    small:      { name: "小",       payout: 1,   desc: "總點 4～10（豹子不算）" },
    anyTriple:  { name: "任意豹子", payout: 24,  desc: "三顆點數相同" },
    triple:     { name: "指定豹子", payout: 150, desc: "三顆都是指定點數" },
    total:      { name: "押總點",   payout: null, desc: "總點剛好等於押的點數" }
};
const CASINO_TOTAL_PAYOUT = { 4: 50, 5: 18, 6: 14, 7: 12, 8: 8, 9: 6, 10: 6, 11: 6, 12: 6, 13: 8, 14: 12, 15: 14, 16: 18, 17: 50 };
const CASINO_DICE_FACES = ["⚀", "⚁", "⚂", "⚃", "⚄", "⚅"];
