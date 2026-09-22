// 靈寶閣（後山禁地）販售的宗門代表裝備與禁術
const lingbaoShopItems = [
    { id: "lb_item_1", name: "少林·降魔伏虎杖", type: "equip", costType: "both", coins: 2000, rep: 50, itemData: { name: "杖", category: "weapon", quality: "紫色", element: "土", stats: { str: 100, con: 200, int: 0, spr: 50 } }, desc: "少林寺代表法器，大幅提升體質與力量。" },
    { id: "lb_item_2", name: "蜀山·紫電青霜劍", type: "equip", costType: "both", coins: 5000, rep: 120, itemData: { name: "劍", category: "weapon", quality: "橙色", element: "金", stats: { str: 400, con: 100, int: 200, spr: 300 } }, desc: "蜀山代表仙劍，鋒芒畢露，提供極高力量與靈力。" },
    { id: "lb_item_3", name: "崑崙·太素霓裳羽衣", type: "equip", costType: "both", coins: 4000, rep: 100, itemData: { name: "盔甲", category: "armor", quality: "橙色", element: "水", stats: { str: 50, con: 500, int: 150, spr: 200 } }, desc: "崑崙仙宗代表防具，水靈護體，提供巨量體質加成。" },
    { id: "lb_skill_1", name: "宗門禁術《神魔九變》", type: "skill", costType: "both", coins: 10000, rep: 300, skillData: { name: "神魔九變", type: "buff", dmgType: "phys", mpCost: 50, mult: 4.0, duration: 3, msg: "發動宗門禁術【神魔九變】，全戰力狂暴飆升 4 倍！" }, desc: "宗門最高禁術，短時間內極大幅度提升暴擊與戰力。" },
    { id: "lb_skill_2", name: "宗門最高武學《大羅天經》", type: "skill", costType: "both", coins: 15000, rep: 500, skillData: { name: "大羅天經", type: "aoe", dmgType: "mag", mpCost: 80, mult: 5.0, msg: "運轉【大羅天經】，萬道光芒寂滅星河！" }, desc: "宗門至高絕學，毀天滅地的超大範圍法術打擊。" }
];
