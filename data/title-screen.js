// 遊戲主頁（標題畫面）：等玩家點擊「進入世界」後才真正開始遊戲
// 好處是性別選擇、離線收益結算都發生在玩家主動進入之後，而非一開網頁就跳出

let worldEntered = false;

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

// 支援鍵盤（Enter / 空白鍵）進入世界
function initTitleScreen() {
    document.addEventListener('keydown', function (e) {
        if (worldEntered) return;
        if (e.key === 'Enter' || e.key === ' ' || e.key === 'Spacebar') {
            e.preventDefault();
            enterWorld();
        }
    });
}
