// 裝備部位 -> 分類（武器/防具/飾品/神器）對照表
// 這份表同時決定「角色裝備」彈窗要顯示哪些欄位，新增部位只要加在這裡即可
const equipTypes = {
    "劍": "weapon", "刀": "weapon", "扇": "weapon", "弓": "weapon", "笛": "weapon", "筆": "weapon",
    "頭": "armor", "內衣": "armor", "盔甲": "armor", "手套": "armor", "長靴": "armor", "披風": "armor",
    "腰帶": "accessory", "項鍊": "accessory", "戒指": "accessory", "耳環": "accessory", "腰牌": "accessory",
    "神器": "artifact"
};

// 背包裝備上限（不含已穿戴的）：已滿時無法鍛造、購買、卸下裝備（舊存檔超過上限的不會被刪除）
const MAX_EQUIP_INVENTORY = 100;

// 不可在鍛造閣打造的部位（神器只能於靈寶閣高級宗門兌換）
const NON_FORGEABLE_SLOTS = ["神器"];

// 五行屬性列表（鍛造隨機抽取，集齊 17 件同屬性裝備可觸發五行法陣）
const wuxingElements = ["金", "木", "水", "火", "土"];

// 五行法陣效果說明：法陣名稱（getWuxingBuff）與「!」說明視窗（equipment.js）共用這份資料。
// ※ 實際數值寫在計算處，改效果時兩邊要一起改：
//    金 → combat.js / tribulation.js 的技能傷害 ×1.2
//    木 → combat.js 安全區回血 10% → 12%
//    水 → stats.js getMaxHp() 氣血上限 ×1.2
//    火 → stats.js getPhysAttack()/getMagAttack() ×1.2
//    土 → stats.js getMaxHp() 總體質 ×1.2
const wuxingArrayEffects = {
    "金": { title: "金靈星君加持", effect: "技能傷害 +20%",
            detail: "宗門技能與靈寶閣禁術的傷害 ×1.2（普通攻擊、靈寵技能不受影響）",
            suit: "技能流：已學會多階宗門技能、靈力充足時最划算" },
    "木": { title: "木靈星君加持", effect: "生命恢復 +20%",
            detail: "在安全區打坐時，每秒回血由最大氣血的 10% 提升為 12%（野外戰鬥中無效）",
            suit: "效果最弱，只加快回城療傷，一般不建議" },
    "水": { title: "水靈星君加持", effect: "生命 +20%",
            detail: "氣血上限 ×1.2（整體氣血，含境界帶來的部分）",
            suit: "生存流：高難度地圖常被打回城時選它" },
    "火": { title: "火靈星君加持", effect: "傷害 +20%",
            detail: "物理與法術攻擊力 ×1.2，普攻、宗門技能、靈寵攻擊都會一起提升，戰力數字也會變高",
            suit: "輸出流：刷怪最快，最通用的首選" },
    "土": { title: "土靈星君加持", effect: "體質 +20%",
            detail: "總體質（含裝備）×1.2，只放大「體質換算的氣血」，境界越高占比越小",
            suit: "前期體質占比高時有感，中後期不如水陣" }
};

// 裝備品質等級：倍率影響鍛造屬性加成，color 供 UI 顯示使用
// 戰鬥屬性（單位 %，見 config-elements.js）：
//   def   = 防具每件的減傷      （6 件防具全橙 = 24%）
//   eva   = 飾品每件的閃避      （5 件飾品全橙 = 15%）
//   affix = 武器隨機一種屬性傷害（冰/火/毒/金）的觸發率；同種屬性可疊加，上限 AFFIX_CAP
const equipQualities = [
    { name: "白色", mult: 1, color: "#ffffff", def: 1, eva: 0.5, affix: 2 },
    { name: "綠色", mult: 2, color: "#4ade80", def: 1.5, eva: 1, affix: 3 },
    { name: "藍色", mult: 3, color: "#38bdf8", def: 2, eva: 1.5, affix: 5 },
    { name: "紫色", mult: 5, color: "#c084fc", def: 3, eva: 2, affix: 7 },
    { name: "橙色", mult: 8, color: "#fb923c", def: 4, eva: 3, affix: 10 }
];
