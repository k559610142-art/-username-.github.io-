// 每日任務設定
const DAILY_REFRESH_HOURS = 4;    // 每 4 小時刷新一次
const DAILY_QUEST_COUNT = 10;     // 每次刷新給 10 項任務

// 任務池：type 同時是進度計數的鍵，由各功能呼叫 addDailyProgress(type, n) 累加。
// targets 為三種難度的目標值，刷新時隨機挑一級，對應 dailyQuestRewards 的同索引獎勵。
// ※ 新增任務類型時，記得在對應功能裡加上 addDailyProgress() 呼叫，否則進度永遠是 0。
const dailyQuestPool = [
    { type: "kill",         name: "斬妖除魔", icon: "⚔️", desc: "於野外擊殺 {n} 隻妖獸",     targets: [15, 40, 80] },
    { type: "sectQuest",    name: "門派效力", icon: "📜", desc: "完成 {n} 次門派任務",       targets: [3, 6, 10] },
    { type: "potion",       name: "丹藥入腹", icon: "💊", desc: "服用 {n} 顆丹藥",           targets: [3, 8, 15] },
    { type: "forge",        name: "開爐鍛造", icon: "⚒️", desc: "鍛造 {n} 件裝備",           targets: [1, 3, 6] },
    { type: "plant",        name: "靈田耕耘", icon: "🌾", desc: "收穫 {n} 株靈草",           targets: [2, 5, 10] },
    { type: "study",        name: "藏經參悟", icon: "📚", desc: "於藏書閣參悟 {n} 次",       targets: [2, 5, 10] },
    { type: "craft",        name: "丹鼎煉製", icon: "🧪", desc: "煉製 {n} 爐神丹",           targets: [1, 2, 4] },
    { type: "rescue",       name: "仗義相助", icon: "🆘", desc: "拯救 {n} 名受困修士",       targets: [1, 2, 4] },
    { type: "buy",          name: "採買丹藥", icon: "🛒", desc: "於丹藥堂購買 {n} 個丹藥",   targets: [5, 15, 30] },
    { type: "breakthrough", name: "修為精進", icon: "✨", desc: "提升 {n} 次小境界",         targets: [1, 2, 3] }
];

// 三種難度對應的獎勵
const dailyQuestRewards = [
    { coins: 500,  reputation: 20,  martialPoints: 5 },
    { coins: 1500, reputation: 50,  martialPoints: 12 },
    { coins: 4000, reputation: 120, martialPoints: 30 }
];

// --- 千寶閣（拍賣場）---
const AUCTION_REFRESH_HOURS = 3;   // 每 3 小時刷新
const AUCTION_ITEM_COUNT = 5;      // 每次只刷新 5 件商品

// 拍賣場的品質機率（由高到低累進判斷），比鍛造閣更容易出高品質
const auctionQualityOdds = [
    { quality: "橙色", chance: 0.10 },
    { quality: "紫色", chance: 0.25 },
    { quality: "藍色", chance: 0.35 },
    { quality: "綠色", chance: 0.20 },
    { quality: "白色", chance: 0.10 }
];

// 千寶閣的壽元丹：每個商品欄位依下列機率「先」判定是否上架壽元丹（合計 27%），
// 沒抽中才改上架裝備。購買需同時支付靈石與聲望，標下後立即服用增加壽元。
const auctionLifePills = [
    { id: "life_pill_0", name: "普通壽元丹", quality: "白色", years: 10,  chance: 0.10, coins: 10000,  rep: 1000 },
    { id: "life_pill_1", name: "一紋壽元丹", quality: "綠色", years: 20,  chance: 0.08, coins: 20000,  rep: 2000 },
    { id: "life_pill_2", name: "二紋壽元丹", quality: "藍色", years: 30,  chance: 0.05, coins: 50000,  rep: 3000 },
    { id: "life_pill_3", name: "三紋壽元丹", quality: "紫色", years: 50,  chance: 0.03, coins: 80000,  rep: 5000 },
    { id: "life_pill_4", name: "四紋壽元丹", quality: "橙色", years: 100, chance: 0.01, coins: 100000, rep: 10000 }
];
