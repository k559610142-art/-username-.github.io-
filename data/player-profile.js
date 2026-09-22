// 玩家道號（暱稱）修改

function changePlayerName() {
    let newName = prompt("請輸入您的修仙道號：", player.name || "韓立");
    if (newName !== null) {
        newName = newName.trim();
        if (newName.length > 0) {
            player.name = newName;
            addLog(`✨ 道號已更名為【${player.name}】。`, "system");
            updateUI();
        } else {
            alert("道號不能為空！");
        }
    }
}
