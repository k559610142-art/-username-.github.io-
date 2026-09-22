// 每日任務：目前僅有介面骨架，任務內容與獎勵後續再實作
// 之後要接上時：在此定義任務清單（建議放進 data/config-daily-quests.js），
// 於 renderDailyQuests() 產生卡片，並在 combat.js 的 combatTick() 或每日重置時處理進度。

function openDailyQuestModal() {
    document.getElementById('daily-quest-modal').style.display = 'flex';
    renderDailyQuests();
}

function renderDailyQuests() {
    const container = document.getElementById('daily-quest-container');
    if (!container) return;
    container.innerHTML = `
        <div style="color: #9ca3af; font-size: 0.92em; line-height: 2;">
            每日任務系統尚在開發中，敬請期待。<br>
            未來將於此處接取每日限定任務並領取獎勵。
        </div>`;
}
