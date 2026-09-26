// 秘境（活動選單「🌀 秘境」，secret-realm.js，ARCHITECTURE.md 第 43 節）
// 目前只做入口：秘境列表 → 全螢幕場景；implemented: false 的秘境按「入塔挑戰」只顯示預定玩法與獎勵（敬請期待）。
// 新增秘境：在 secretRealmList 加一筆即可出現在列表（img 建議 9:16 直式海報，重要內容放中間）。

const SECRET_REALM_DAILY_ATTEMPTS = 5;   // 預定：每個秘境每日挑戰次數（失敗也算），玩法實作時使用

const secretRealmList = [
    {
        id: "zhenmo",
        name: "鎮魔塔",
        img: "images/secret/zhenmo-tower.jpg",   // 768×1365（9:16），玩家提供的水墨海報（圖上已有「鎮魔塔」標題與底部標語）
        minRealmIndex: 6,                         // 同活動「秘境」的開放境界（煉虛）
        implemented: false,
        tagline: "諸天鎮魔！凡人速速離去",
        desc: "上古諸天大能合力鎮壓群魔之塔，塔中魔頭層層盤踞。傳聞塔頂封存著異火與諸天遺寶，亦有域外高人在此出沒。",
        // 預定獎勵（顯示用；玩法實作時接上：異火碎片 addFireShards、秘境裝備 gear.js 的 realm 管道、夥伴 meetPartner、基本資源）
        rewards: [
            { icon: "🔥", text: "異火碎片（集滿可合成天下異火）" },
            { icon: "⚔️", text: "秘境裝備與 30 組套裝" },
            { icon: "💞", text: "有緣結識諸天夥伴" },
            { icon: "💎", text: "靈石、星允鐵等資源" }
        ]
    }
];
