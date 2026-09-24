// 活動選單設定
// minRep         = 觸發所需聲望
// minRealmIndex  = 所需境界（對應 realms 陣列索引；0 = 無境界限制）
// implemented    = false 代表功能尚未實作，點擊後顯示「敬請期待」
// openFn         = 已實作活動要呼叫的開啟函式名稱
const activityData = [
    { id: "daily", name: "每日任務", icon: "📅", minRep: 1000, minRealmIndex: 0,
      implemented: true, openFn: "openDailyQuestModal",
      desc: "每 4 小時刷新，共 10 項任務" },

    { id: "auction", name: "千寶閣", icon: "🏺", minRep: 5000, minRealmIndex: 0,
      implemented: true, openFn: "openAuctionModal",
      desc: "拍賣場・每 3 小時刷新 5 件商品" },

    { id: "secret", name: "秘境", icon: "🌀", minRep: 5000, minRealmIndex: 6,
      implemented: false,
      desc: "煉虛以上開放" },

    // 懸賞榜（天／地／人榜）＋野外修士＋善惡值，見 merit.js／bounty.js；改成 implemented: false 即可整體暫停
    { id: "evil", name: "獵殺邪修", icon: "🗡️", minRep: 8000, minRealmIndex: 3,
      implemented: true, openFn: "openEvilHuntModal",
      desc: "懸賞榜・每 4 小時刷新 6 名" },

    { id: "demon", name: "域外天魔", icon: "👹", minRep: 10000, minRealmIndex: 8,
      implemented: false,
      desc: "世界BOSS・大乘以上開放" }
];
