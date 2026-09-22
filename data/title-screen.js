// 遊戲主頁（標題畫面）：滿版封面，唯一進入點是圖片中央光環上的「進入世界」
// 等玩家點擊後才真正開始遊戲，因此性別選擇與離線收益結算都發生在進入之後

// 光環在「各封面圖原始座標系」中的位置與大小
// 橫式：images/cover.jpg (1264 x 843)；直式：images/cover-portrait.jpg (960 x 1920)
// ※ 若更換封面圖，必須重新量測對應的數值
const TITLE_HOTSPOTS = {
    landscape: { x: 652, y: 527, w: 330, h: 290 },
    portrait:  { x: 632, y: 1427, w: 330, h: 290 }
};

// <picture> 會依螢幕比例自動切換圖片，這裡依實際載入的檔名挑選對應座標
function currentTitleHotspot() {
    const art = document.getElementById('title-art');
    const src = (art && (art.currentSrc || art.src)) || "";
    return src.indexOf('cover-portrait') !== -1 ? TITLE_HOTSPOTS.portrait : TITLE_HOTSPOTS.landscape;
}

let worldEntered = false;

// 封面採用 object-fit: cover（會裁切），因此熱區需依實際縮放與裁切位移換算
function positionTitleHotspot() {
    const art = document.getElementById('title-art');
    const spot = document.getElementById('title-hotspot');
    if (!art || !spot || !art.naturalWidth) return;

    const hotspot = currentTitleHotspot();
    const boxW = art.clientWidth;
    const boxH = art.clientHeight;
    // cover：取較大的縮放比，讓圖片填滿整個容器
    const scale = Math.max(boxW / art.naturalWidth, boxH / art.naturalHeight);
    // object-position: center，兩側（或上下）各被裁掉一半
    const offsetX = (boxW - art.naturalWidth * scale) / 2;
    const offsetY = (boxH - art.naturalHeight * scale) / 2;

    spot.style.left = (offsetX + hotspot.x * scale) + 'px';
    spot.style.top = (offsetY + hotspot.y * scale) + 'px';
    spot.style.width = (hotspot.w * scale) + 'px';
    spot.style.height = (hotspot.h * scale) + 'px';
}

function enterWorld() {
    if (worldEntered) return;
    worldEntered = true;

    const title = document.getElementById('title-screen');
    if (title) {
        title.style.opacity = '0';
        title.style.pointerEvents = 'none';
        setTimeout(() => { title.style.display = 'none'; }, 600);
    }
    document.body.classList.remove('title-mode');

    startGame();   // main.js：讀檔或建立新角色，並啟動遊戲主迴圈
}

function initTitleScreen() {
    const art = document.getElementById('title-art');
    if (art) {
        // 圖片可能已在快取中（不會再觸發 load），所以兩種情況都要處理
        if (art.complete) positionTitleHotspot();
        art.addEventListener('load', positionTitleHotspot);
    }
    window.addEventListener('resize', positionTitleHotspot);
    window.addEventListener('orientationchange', positionTitleHotspot);
}
