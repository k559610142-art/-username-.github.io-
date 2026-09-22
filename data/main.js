// 遊戲進入點：網頁載入先顯示標題畫面，玩家點擊「進入世界」後才啟動遊戲

function initGame() {
    initForgeSelect();
    syncAutoSettingsUI();
    updateUI();
    setInterval(combatTick, 1000);
    // 每 30 秒自動存檔
    setInterval(saveLocal, 30000);
}

// 由標題畫面的 enterWorld() 呼叫（title-screen.js）
function startGame() {
    if (!loadLocal()) {
        let genderChoice = prompt("請選擇您的角色性別：\n輸入 1 或 m 代表【男性】（初始道號：韓立）\n輸入 2 或 f 代表【女性】（初始道號：南宮婉）", "1");
        if (genderChoice === "2" || genderChoice === "f" || genderChoice === "女性") {
            player.gender = "female";
            player.name = "南宮婉";
        } else {
            player.gender = "male";
            player.name = "韓立";
        }
        player.lastSaveTime = Date.now();
        addLog(`🌱 歡迎踏入修仙世界！系統已初始化角色【${player.name}】。`, "system");
    }
    initGame();
}

window.onload = function() {
    initTitleScreen();
};
