// 丹藥堂販售的補血/補魔消耗品
// amount = 回復「最大值」的百分比；noAutoBuy = true 代表自動輔助不會自動花靈石購買此丹藥
const shopItems = [
    { id: "heal_1", name: "凝血草", type: "heal", amount: 0.05, cost: 50, desc: "瞬間回復 5% 最大氣血" },
    { id: "heal_2", name: "培元丹", type: "heal", amount: 0.10, cost: 200, desc: "瞬間回復 10% 最大氣血" },
    { id: "heal_3", name: "九轉還魂丹", type: "heal", amount: 0.30, cost: 500, noAutoBuy: true, desc: "瞬間回復 30% 最大氣血（珍稀丹藥，不會被自動購買）" },
    { id: "mp_1", name: "聚氣散", type: "mp", amount: 0.05, cost: 40, desc: "瞬間回復 5% 最大靈力" },
    { id: "mp_2", name: "回天靈液", type: "mp", amount: 0.10, cost: 150, noAutoBuy: true, desc: "瞬間回復 10% 最大靈力（珍稀丹藥，不會被自動購買）" },
    { id: "mp_3", name: "造化神髓液", type: "mp", amount: 0.30, cost: 350, desc: "瞬間回復 30% 最大靈力" }
];

// 藥品使用冷卻（秒）。氣血類與靈力類各自獨立計算。
const POTION_COOLDOWN_SECONDS = 5;

// 商店單次購買的數量上限
const SHOP_MAX_BUY_QTY = 9999;
