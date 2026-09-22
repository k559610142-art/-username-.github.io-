// 地圖區域資料：分類、安全區標記、經驗倍率、難度、進入限制
const maps = [
    { category: "一、宗門內部核心 (安全區)", isSafe: true, items: [
        { name: "洞府 / 弟子居", expRate: 1, diff: 1 },
        { name: "演武學宮", expRate: 1.5, diff: 1 },
        { name: "後山禁地", expRate: 3, diff: 1 }
    ]},
    { category: "二、野外歷練 (戰鬥區)", isSafe: false, items: [
        { name: "靈山大川", expRate: 8, diff: 2 },
        { name: "深淵險地", expRate: 20, diff: 8 },
        { name: "上古遺跡", expRate: 50, diff: 25 }
    ]},
    { category: "三、開放世界大區域 (高難度戰鬥)", isSafe: false, items: [
        { name: "天南", expRate: 100, diff: 100 },
        { name: "亂星海", expRate: 300, diff: 400 },
        { name: "鬼谷八荒", expRate: 1000, diff: 2000 }
    ]},
    { category: "四、禁區 (仙人解鎖·高難)", isSafe: false, items: [
        { name: "荒古禁地", expRate: 3000, diff: 5000, minRealm: 10, minStat: 500 },
        { name: "太初古礦", expRate: 4000, diff: 7000, minRealm: 10, minStat: 500 },
        { name: "上蒼（葬天島）", expRate: 5000, diff: 10000, minRealm: 10, minStat: 500 },
        { name: "不死山", expRate: 6000, diff: 13000, minRealm: 10, minStat: 500 },
        { name: "神墟", expRate: 7000, diff: 16000, minRealm: 10, minStat: 500 },
        { name: "仙陵", expRate: 8000, diff: 20000, minRealm: 10, minStat: 500 },
        { name: "冥界", expRate: 9000, diff: 25000, minRealm: 10, minStat: 500 }
    ]},
    { category: "五、諸天至高戰場 (頂級戰場·極難)", isSafe: false, items: [
        { name: "仙界戰場", expRate: 15000, diff: 50000, minRealm: 10, minStat: 5000, isTopBattle: true },
        { name: "萬界戰場", expRate: 25000, diff: 90000, minRealm: 10, minStat: 5000, isTopBattle: true },
        { name: "混沌初界", expRate: 50000, diff: 200000, minRealm: 10, minStat: 5000, isTopBattle: true }
    ]}
];

// 野外遭遇怪物隨機顯示的圖示
const monsterIcons = ["🐺", "🐅", "🐍", "🦇", "🦂", "👹", "👻", "🐉", "🦅", "🕷️"];
