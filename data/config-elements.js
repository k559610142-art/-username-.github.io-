// 戰鬥屬性設定：減傷、閃避、屬性傷害（冰/火/毒/金）
// ※ 這裡的「屬性傷害」與裝備的「五行」（金木水火土，用於五行法陣）是兩套不同系統。
//
// 所有數值皆為「百分比」（例：def: 8 代表減傷 8%），存放在裝備的 stats 內，
// 與力量/體質等一起由 stats.js 的 getEquipBonus() 加總。
// 玩家與怪物（含心魔）都套用同一套規則，見 elements.js 的 resolveHit()。

// 玩家從裝備累積的上限（技能自帶的屬性機率不受 AFFIX_CAP 限制）
const DEF_CAP = 60;     // 減傷上限 60%
const EVA_CAP = 40;     // 閃避上限 40%（物理、術法傷害都能閃）
const AFFIX_CAP = 50;   // 每種屬性傷害觸發率上限 50%

// 屬性傷害效果
const FREEZE_TURNS = 1;          // 冰：凍結 1 回合（該回合無法行動）
const BURN_MAX_STACKS = 3;       // 火：燒傷最多疊 3 層
const BURN_TURNS = 3;            //     持續 3 回合（再次命中會刷新回合數）
const BURN_RATE = 0.15;          //     每層每回合 = 施放者攻擊力 × 15%
const POISON_MAX_STACKS = 5;     // 毒：中毒最多疊 5 層
const POISON_TURNS = 3;          //     持續 3 回合
const POISON_RATE = 0.08;        //     每層每回合 = 施放者攻擊力 × 8%
const METAL_BONUS = 1.0;         // 金：重擊，該次傷害額外 +100%（共 2 倍）

// 屬性顯示資訊（key 對應 stats 內的欄位名稱）
const combatAttrInfo = {
    def:    { label: "減傷", icon: "🛡️" },
    eva:    { label: "閃避", icon: "💨" },
    ice:    { label: "冰傷", icon: "❄️", desc: `觸發時凍結目標 ${FREEZE_TURNS} 回合` },
    fire:   { label: "火傷", icon: "🔥", desc: `燒傷，最多 ${BURN_MAX_STACKS} 層、持續 ${BURN_TURNS} 回合` },
    poison: { label: "毒傷", icon: "☠️", desc: `中毒，最多 ${POISON_MAX_STACKS} 層、持續 ${POISON_TURNS} 回合` },
    metal:  { label: "金傷", icon: "⚔️", desc: `重擊，該次傷害 ×${1 + METAL_BONUS}` }
};
const AFFIX_TYPES = ["ice", "fire", "poison", "metal"];

// 怪物依地圖分類（maps 的索引）取得的戰鬥屬性：
//   def/eva = 減傷/閃避；affixProb = 每隻怪帶屬性傷害的機率；affixChance = 帶了之後的觸發率
const monsterAttrsByMapCategory = {
    1: { def: 0,  eva: 2, affixProb: 0.3, affixChance: 5 },    // 野外歷練
    2: { def: 5,  eva: 4, affixProb: 0.5, affixChance: 10 },   // 開放世界
    3: { def: 10, eva: 6, affixProb: 0.7, affixChance: 15 },   // 上古禁區
    4: { def: 15, eva: 8, affixProb: 0.9, affixChance: 20 }    // 諸天至高戰場
};
