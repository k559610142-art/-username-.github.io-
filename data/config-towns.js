// 城內場景（第二頁面，ARCHITECTURE.md 第 20 節）；邏輯在 town.js
// 在修仙地圖點有場景的城鎮 → 傳送過去並開啟全螢幕城內畫面；畫面上的「傳送點」（hotspots）點擊後執行 action
// key = 城鎮地圖名稱（config-maps.js 第一區的 name）
//
// img        = 場景圖（images/towns/），imgW／imgH = 圖的原始像素，用來換算傳送點位置
// portrait   = 選填：手機直式專用圖 { img, imgW, imgH, hotspots }（建議 9:19.5，例 1080×2340）
//              畫面直向（寬 < 高）時改用它；兩張圖構圖不同，傳送點座標要各設一組
// hotspots   = 傳送點清單，座標一律用「圖上像素」（不受螢幕大小影響）：
//   { id: "英文代號", label: "牌匾文字", rect: [左, 上, 寬, 高], action: "要執行的函式()" }
//   rect 是可點擊的範圍；牌匾顯示在範圍正中央。action 是 onclick 字串（例："openCasinoModal()"）
//   enabled: false 可先放著不顯示

const townScenes = {
    "天星城": {
        title: "天星城・坊市",
        img: "images/towns/tianxing-market.jpg",
        imgW: 1582, imgH: 672,
        hotspots: [
            // 右側雕花石拱門（含上方佛像雕飾）
            { id: "casino", label: "天星賭坊", rect: [1150, 140, 270, 430], action: "openCasinoModal()" },
            // ---- 新增傳送點的模板（複製一行、改內容）----
            // { id: "xxx", label: "牌匾文字", rect: [左, 上, 寬, 高], action: "openXxx()" },
        ],
        // 手機直式（704×1520，9:19.4，玩家提供）
        portrait: {
            img: "images/towns/tianxing-market-portrait.jpg",
            imgW: 704, imgH: 1520,
            hotspots: [
                // 右側雕花石拱門（含上方佛像雕飾）
                { id: "casino", label: "天星賭坊", rect: [470, 600, 234, 700], action: "openCasinoModal()" },
            ]
        }
    }
};
