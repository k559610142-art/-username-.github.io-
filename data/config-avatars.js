// 可更換的人物頭像（邏輯見 avatar.js）
// 點洞府左上的頭像開啟選擇視窗；不分性別，達成解鎖條件後永久可用（記在 player.unlockedAvatars，轉世也不會失去）。
//
// img    = 圖片路徑（images/avatars/ 內為 256×256 正方形，臉部置中）
// pos    = 裁成圓形時的 CSS object-position（正方形圖用 center 即可；橫式圖要對準臉部）
// unlock = 解鎖條件，null 代表一開始就能用：
//   { type: "realm", value: 境界索引 }        境界達到 realms[value]
//   { type: "level", value: N }               人物等級 ≥ N
//   { type: "reputation", value: N }          聲望 ≥ N（只看是否達到，不會扣除）
//   { type: "tribulation", value: N }         累計渡劫成功 ≥ N 次
// 新增頭像：把圖放進 images/avatars/，在這裡加一筆即可（id 不可與既有重複，存檔以 id 記錄）。
const avatarList = [
    { id: "male",              name: "韓立",     img: "images/avatar-male.jpg",                     pos: "49% center", unlock: null },
    { id: "female",            name: "南宮婉",   img: "images/avatar-female.jpg",                   pos: "29% center", unlock: null },
    { id: "fan-fairy",         name: "執扇仙子", img: "images/avatars/avatar-fan-fairy.jpg",         pos: "center", unlock: { type: "realm", value: 2 } },
    { id: "pipa-fairy",        name: "琵琶仙子", img: "images/avatars/avatar-pipa-fairy.jpg",        pos: "center", unlock: { type: "level", value: 30 } },
    { id: "flower-girl",       name: "花仙童女", img: "images/avatars/avatar-flower-girl.jpg",       pos: "center", unlock: { type: "reputation", value: 1000 } },
    { id: "blue-youth",        name: "藍衣少年", img: "images/avatars/avatar-blue-youth.jpg",        pos: "center", unlock: { type: "realm", value: 3 } },
    { id: "starsea",           name: "星海客",   img: "images/avatars/avatar-starsea.jpg",           pos: "center", unlock: { type: "reputation", value: 10000 } },
    { id: "silver-swordswoman",name: "銀髮劍仙", img: "images/avatars/avatar-silver-swordswoman.jpg",pos: "center", unlock: { type: "realm", value: 4 } },
    { id: "yaoyao",            name: "妖妖",     img: "images/avatars/avatar-yaoyao.jpg",            pos: "center", unlock: { type: "level", value: 200 } },
    { id: "luofeng",           name: "羅峰",     img: "images/avatars/avatar-luofeng.jpg",           pos: "center", unlock: { type: "realm", value: 5 } },
    { id: "jiang-taixu",       name: "姜太虛",   img: "images/avatars/avatar-jiang-taixu.jpg",       pos: "center", unlock: { type: "tribulation", value: 5 } },
    { id: "golden-emperor",    name: "金龍帝君", img: "images/avatars/avatar-golden-emperor.jpg",    pos: "center", unlock: { type: "realm", value: 10 } }
];
