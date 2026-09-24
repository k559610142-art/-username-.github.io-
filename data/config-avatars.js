// 可更換的人物頭像（邏輯見 avatar.js）
// 點洞府左上的頭像開啟選擇視窗；不分性別，解鎖後永久可用（記在 player.unlockedAvatars，轉世也不會失去）。
//
// img    = 圖片路徑（images/avatars/ 內為 256×256 正方形，臉部置中）
// pos    = 裁成圓形時的 CSS object-position（正方形圖用 center 即可；橫式圖要對準臉部）
// unlock = 解鎖方式，null 代表一開始就能用：
//   { type: "coins", value: N }               花費 N 靈石購買解鎖（目前全部頭像都用這個）
//   以下為「達成即自動解鎖」的條件類型，程式仍支援，需要時可改回：
//   { type: "realm", value: 境界索引 }        境界達到 realms[value]
//   { type: "level", value: N }               人物等級 ≥ N
//   { type: "reputation", value: N }          聲望 ≥ N（只看是否達到，不會扣除）
//   { type: "tribulation", value: N }         累計渡劫成功 ≥ N 次
const AVATAR_UNLOCK_COINS = 10000000;   // 每個頭像的解鎖價格（靈石，1000 萬）
// 新增頭像：把圖放進 images/avatars/，在這裡加一筆即可（id 不可與既有重複，存檔以 id 記錄）。
const avatarList = [
    { id: "male",              name: "韓立",     img: "images/avatar-male.jpg",                     pos: "49% center", unlock: null },
    { id: "female",            name: "南宮婉",   img: "images/avatar-female.jpg",                   pos: "29% center", unlock: null },
    { id: "fan-fairy",         name: "執扇仙子", img: "images/avatars/avatar-fan-fairy.jpg",         pos: "center", unlock: { type: "coins", value: AVATAR_UNLOCK_COINS } },
    { id: "pipa-fairy",        name: "琵琶仙子", img: "images/avatars/avatar-pipa-fairy.jpg",        pos: "center", unlock: { type: "coins", value: AVATAR_UNLOCK_COINS } },
    { id: "flower-girl",       name: "花仙童女", img: "images/avatars/avatar-flower-girl.jpg",       pos: "center", unlock: { type: "coins", value: AVATAR_UNLOCK_COINS } },
    { id: "blue-youth",        name: "藍衣少年", img: "images/avatars/avatar-blue-youth.jpg",        pos: "center", unlock: { type: "coins", value: AVATAR_UNLOCK_COINS } },
    { id: "starsea",           name: "亂星海大善人", img: "images/avatars/avatar-starsea.jpg",           pos: "center", unlock: { type: "coins", value: AVATAR_UNLOCK_COINS } },
    { id: "silver-swordswoman",name: "銀髮劍仙", img: "images/avatars/avatar-silver-swordswoman.jpg",pos: "center", unlock: { type: "coins", value: AVATAR_UNLOCK_COINS } },
    { id: "yaoyao",            name: "妖妖",     img: "images/avatars/avatar-yaoyao.jpg",            pos: "center", unlock: { type: "coins", value: AVATAR_UNLOCK_COINS } },
    { id: "luofeng",           name: "羅峰",     img: "images/avatars/avatar-luofeng.jpg",           pos: "center", unlock: { type: "coins", value: AVATAR_UNLOCK_COINS } },
    { id: "jiang-taixu",       name: "姜太虛",   img: "images/avatars/avatar-jiang-taixu.jpg",       pos: "center", unlock: { type: "coins", value: AVATAR_UNLOCK_COINS } },
    { id: "golden-emperor",    name: "少年人皇 石昊", img: "images/avatars/avatar-golden-emperor.jpg",    pos: "center", unlock: { type: "coins", value: AVATAR_UNLOCK_COINS } }
];
