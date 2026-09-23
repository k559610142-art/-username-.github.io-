// 功德系統與珍貴物資設定（邏輯見 merit.js）
// 功德只能兌換道具：獵殺邪修 → 功德 → 七彩補天石 → 千寶閣珍貴物資（破障丹）

// ---- 獵殺邪修（活動解鎖後，野外每隻妖獸有機率換成邪修）----
// 每隻怪物是邪修的機率（需已解鎖 config-activities.js 的 "evil" 活動）
// 目標：線上每小時約 100 功德 → 每小時約 1,152 隻 × 1.6% ≈ 18 名邪修 × 平均 5.5 功德 ≈ 101
//       = 每小時約 1 顆七彩補天石、約 5 小時 1 顆破障丹
const EVIL_SPAWN_CHANCE = 0.016;
const EVIL_POWER_MULT = 1.5;       // 邪修的氣血與攻擊力倍率（相對同地圖妖獸）
const EVIL_MERIT_MIN = 1;          // 斬殺一名邪修獲得的功德（隨機 MIN ~ MAX）
const EVIL_MERIT_MAX = 10;
const EVIL_ICON = "🧛";

// ---- 兌換與販售（千寶閣「珍貴物資」區，常駐、不佔每 3 小時刷新的 5 格）----
const MERIT_PER_BUTIAN_STONE = 100;   // 多少功德換 1 顆七彩補天石
const BREAK_PILL_STONE_COST = 5;      // 1 顆破障丹需要幾顆七彩補天石

// ---- 破障丹效果（渡劫時自動服用 1 顆，見 tribulation.js）----
const BREAK_PILL_DEMON_POWER_MULT = 0.9;   // 心魔戰力 -10%
const BREAK_PILL_CHANCE_BONUS = 0.10;      // 渡劫勝算 +10%
const BREAK_PILL_MAX_CHANCE = 0.90;        // 服用後勝算上限由 80% 提高到 90%

// 珍貴道具的顯示資料（背包、千寶閣共用；外觀為七彩發光）
const preciousItems = {
    butianStone: { name: "七彩補天石", icon: "💎", desc: `女媧補天遺落的奇石，七彩流轉。以 ${MERIT_PER_BUTIAN_STONE} 功德兌換，可於千寶閣購買珍貴物資。` },
    breakPill:   { name: "破障丹",     icon: "🔮", desc: "渡劫時自動服用 1 顆：心魔戰力 -10%，渡劫勝算 +10%（上限由 80% 提高到 90%）。" }
};
