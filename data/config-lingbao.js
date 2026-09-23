// 靈寶閣（宗門設施）：三個階段的宗門各自販賣不同的「戰略級寶物」與武學
// - 兌換需「同時」支付靈石與聲望，價格依階段固定（lingbaoTierCosts）
// - 必須已拜入該階段的宗門（player.sectSkills[tier]）才能兌換該階段商品
// - 每件都是唯一性物品：兌換後記錄在 player.lingbaoSold，永遠不會補貨
// - 設計原則：高階段的武學／裝備一定比低階段更好（同部位的裝備各項數值皆更高、武學倍率更高）
// 戰鬥屬性（def/eva/ice/fire/poison/metal/thunder）單位為 %，技能的 effect.chance 為 0~1，見 config-elements.js

// 舊版靈寶閣禁術（已下架）的數值校正：讀檔／匯入時套用到 player.learnedSkills（save.js 的 migrateLegacySkills）
// 舊版售價僅 1～1.5 萬靈石，遠低於新版初級寶物的 10 萬，因此下修到「初級武學」標準、不超過新版任何一階：
//   大羅天經：群體 ×5.0 → ×1.8（同初級《烈火刀法》，但無屬性效果）
//   神魔九變：攻擊 ×4.0 持續 3 回合 → ×1.5（與靈寵木屬性最高階增益相同）
const legacySkillAdjustments = {
    "大羅天經": { mult: 1.8, mpCost: 120, msg: "運轉【大羅天經】，光芒掃過群敵！" },
    "神魔九變": { mult: 1.5, duration: 3, mpCost: 150, msg: "發動宗門禁術【神魔九變】，戰力暴漲 1.5 倍！" }
};

const lingbaoTierCosts = {
    1: { coins: 100000,  rep: 10000 },    // 初級宗門：靈石 10 萬 + 聲望 1 萬
    2: { coins: 500000,  rep: 100000 },   // 中級宗門：靈石 50 萬 + 聲望 10 萬
    3: { coins: 1000000, rep: 500000 }    // 高級宗門：靈石 100 萬 + 聲望 50 萬
};

const lingbaoShopItems = [
    // ---- 初級宗門 ----
    { id: "lb1_sword", tier: 1, type: "equip", name: "玄鐵重劍",
      itemData: { name: "劍", category: "weapon", quality: "橙色", element: "金",
                  stats: { str: 800, spr: 400, metal: 12 } },
      desc: "以天外玄鐵鑄成的重劍，劍勢沉猛，常能打出金屬性重擊。" },
    { id: "lb1_armor", tier: 1, type: "equip", name: "赤焰護心甲",
      itemData: { name: "盔甲", category: "armor", quality: "橙色", element: "火",
                  stats: { con: 1600, def: 8, fire: 8 } },
      desc: "護心甲內封赤焰，既能減傷，反擊時亦會灼傷敵人。" },
    { id: "lb1_skill_ice", tier: 1, type: "skill", name: "武學《寒冰綿掌》",
      skillData: { name: "寒冰綿掌", type: "single", dmgType: "mag", mpCost: 90, mult: 2.0,
                   effect: { type: "ice", chance: 0.3 }, msg: "拍出【寒冰綿掌】，寒氣透體直侵經脈！" },
      desc: "單體 200% 法術傷害（悟性），30% 機率凍結目標。" },
    { id: "lb1_skill_fire", tier: 1, type: "skill", name: "武學《烈火刀法》",
      skillData: { name: "烈火刀法", type: "aoe", dmgType: "phys", mpCost: 120, mult: 1.8,
                   effect: { type: "fire", chance: 0.4 }, msg: "【烈火刀法】刀捲火浪，橫掃群敵！" },
      desc: "群體 180% 物理傷害（力量），40% 機率使目標燒傷。" },

    // ---- 中級宗門 ----
    { id: "lb2_sword", tier: 2, type: "equip", name: "紫電青霜劍",
      itemData: { name: "劍", category: "weapon", quality: "橙色", element: "金",
                  stats: { str: 5000, spr: 2500, metal: 18, ice: 10 } },
      desc: "紫電為鋒、青霜為刃，重擊之餘更能凍結敵人。" },
    { id: "lb2_armor", tier: 2, type: "equip", name: "玄武鎮獄甲",
      itemData: { name: "盔甲", category: "armor", quality: "橙色", element: "水",
                  stats: { con: 10000, def: 15, eva: 5, fire: 10 } },
      desc: "玄武靈甲，厚重護體又不失靈動，甲上離火可焚傷來敵。" },
    { id: "lb2_skill_poison", tier: 2, type: "skill", name: "武學《萬毒噬心功》",
      skillData: { name: "萬毒噬心功", type: "aoe", dmgType: "mag", mpCost: 180, mult: 2.6,
                   effect: { type: "poison", chance: 0.6 }, msg: "運轉【萬毒噬心功】，毒霧瀰漫噬咬群敵！" },
      desc: "群體 260% 法術傷害（悟性），60% 機率使目標中毒（可疊 5 層）。" },
    { id: "lb2_skill_metal", tier: 2, type: "skill", name: "武學《天罡破軍斬》",
      skillData: { name: "天罡破軍斬", type: "single", dmgType: "phys", mpCost: 180, mult: 3.5,
                   effect: { type: "metal", chance: 0.5 }, msg: "引天罡之氣，【天罡破軍斬】一刀破軍！" },
      desc: "單體 350% 物理傷害（力量），50% 機率金屬性重擊（傷害再翻倍）。" },

    // ---- 高級宗門 ----
    { id: "lb3_sword", tier: 3, type: "equip", name: "誅仙劍",
      itemData: { name: "劍", category: "weapon", quality: "橙色", element: "金",
                  stats: { str: 30000, spr: 15000, metal: 25, ice: 15, fire: 20 } },
      desc: "誅仙四劍之首，劍氣所至萬物皆斬，兼具重擊、凍結與燒傷。" },
    { id: "lb3_artifact", tier: 3, type: "equip", name: "神器・混沌鐘",
      itemData: { name: "神器", category: "artifact", quality: "橙色", element: "土",
                  stats: { str: 20000, con: 20000, int: 20000, spr: 20000, def: 20, eva: 10 } },
      desc: "開天闢地之神器，鐘聲鎮壓諸天。可裝備於神器欄（不影響五行/靈根）。" },
    // 以下五件神器與混沌鐘同價、同為唯一性；神器欄只有一格，因此各走不同路線
    // （四維總量皆約 8 萬，戰鬥屬性約 30～40 點，避免任何一件完全取代其他件）
    { id: "lb3_artifact_coffin", tier: 3, type: "equip", name: "神器・三世銅棺",
      itemData: { name: "神器", category: "artifact", quality: "橙色", element: "土",
                  stats: { str: 10000, con: 45000, int: 10000, spr: 15000, def: 30, eva: 5 } },
      desc: "九龍拉棺橫渡星空，棺中藏三世輪迴之秘。極致守護：體質與減傷冠絕諸器。" },
    { id: "lb3_artifact_sword", tier: 3, type: "equip", name: "神器・荒天帝大羅劍胎",
      itemData: { name: "神器", category: "artifact", quality: "橙色", element: "金",
                  stats: { str: 45000, con: 10000, int: 10000, spr: 15000, metal: 25, thunder: 15 } },
      desc: "荒天帝以大羅劍胎獨斷萬古，一劍光寒十九洲。極致物理：力量、重擊與雷擊。" },
    { id: "lb3_artifact_cauldron", tier: 3, type: "equip", name: "神器・萬物母氣鼎",
      itemData: { name: "神器", category: "artifact", quality: "橙色", element: "火",
                  stats: { str: 22000, con: 22000, int: 22000, spr: 22000, def: 10, fire: 20 } },
      desc: "天帝鼎，以萬物母氣所鑄，鼎壓萬古、鎮殺諸天。四維均衡最高，兼具燒傷。" },
    { id: "lb3_artifact_jar", tier: 3, type: "equip", name: "神器・吞天魔罐",
      itemData: { name: "神器", category: "artifact", quality: "橙色", element: "水",
                  stats: { str: 10000, con: 10000, int: 45000, spr: 15000, poison: 25, ice: 15 } },
      desc: "狠人大帝之器，罐口一開可吞天噬地、煉化萬物。極致術法：悟性、中毒與凍結。" },
    { id: "lb3_artifact_wushi", tier: 3, type: "equip", name: "神器・無始鐘",
      itemData: { name: "神器", category: "artifact", quality: "橙色", element: "金",
                  stats: { str: 18000, con: 18000, int: 18000, spr: 18000, eva: 25, def: 10 } },
      desc: "無始大帝之鐘，「一見無始道成空」。鐘聲迴盪，萬法難侵：閃避冠絕諸器。" },
    { id: "lb3_skill_ice", tier: 3, type: "skill", name: "武學《太虛寒獄》",
      skillData: { name: "太虛寒獄", type: "aoe", dmgType: "mag", mpCost: 300, mult: 4.0,
                   effect: { type: "ice", chance: 0.5 }, msg: "【太虛寒獄】降臨，萬里冰封，群敵盡凍！" },
      desc: "群體 400% 法術傷害（悟性），50% 機率凍結目標。" },
    { id: "lb3_skill_fire", tier: 3, type: "skill", name: "武學《九幽焚天訣》",
      skillData: { name: "九幽焚天訣", type: "single", dmgType: "phys", mpCost: 360, mult: 6.0,
                   effect: { type: "fire", chance: 1.0 }, msg: "九幽冥火沖天而起，【九幽焚天訣】焚盡強敵！" },
      desc: "單體 600% 物理傷害（力量），必定使目標燒傷。" }
];
