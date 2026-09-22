// 裝備部位 -> 分類（武器/防具/飾品）對照表
const equipTypes = {
    "劍": "weapon", "刀": "weapon", "扇": "weapon", "弓": "weapon", "笛": "weapon", "筆": "weapon",
    "頭": "armor", "內衣": "armor", "盔甲": "armor", "手套": "armor", "長靴": "armor", "披風": "armor",
    "腰帶": "accessory", "項鍊": "accessory", "戒指": "accessory", "耳環": "accessory", "腰牌": "accessory"
};

// 五行屬性列表（鍛造隨機抽取，集齊 17 件同屬性裝備可觸發五行法陣）
const wuxingElements = ["金", "木", "水", "火", "土"];

// 裝備品質等級：倍率影響鍛造屬性加成，color 供 UI 顯示使用
const equipQualities = [
    { name: "白色", mult: 1, color: "#ffffff" },
    { name: "綠色", mult: 2, color: "#4ade80" },
    { name: "藍色", mult: 3, color: "#38bdf8" },
    { name: "紫色", mult: 5, color: "#c084fc" },
    { name: "橙色", mult: 8, color: "#fb923c" }
];
