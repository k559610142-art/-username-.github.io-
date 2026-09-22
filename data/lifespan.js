// 壽元：突破大境界增加、每次死亡依當前境界扣除，歸零即身死道消（清除存檔重新開始）
// 數值表見 config-lifespan.js；壽元與戰力無關。

function getDeathLifespanCost() {
    let row = lifespanByRealm[player.realmIndex] || lifespanByRealm[lifespanByRealm.length - 1];
    return row.deathCost;
}

// 舊存檔沒有壽元欄位時，依目前境界補上「凡人起累積到現在」的壽元
function getInitialLifespanForRealm(realmIndex) {
    let total = 0;
    for (let i = 0; i <= realmIndex && i < lifespanByRealm.length; i++) total += lifespanByRealm[i].gain;
    return total;
}

// 由 advanceRealm() 呼叫：晉升後增加該境界的壽元
function gainRealmLifespan() {
    let row = lifespanByRealm[player.realmIndex];
    if (!row) return;
    player.lifespan += row.gain;
    addLog(`⏳ 晉升【${row.realm}】，壽元增加 ${row.gain.toLocaleString()} 年！（剩餘 ${player.lifespan.toLocaleString()} 年，此境界每死亡一次折壽 ${row.deathCost} 年）`, "level-up");
}

// 玩家死亡（野外戰死、渡劫失敗）時呼叫：扣壽元、所有靈寵陣亡。
// 回傳 true 代表壽元耗盡、遊戲結束，呼叫端應立即中止後續流程。
function handlePlayerDeath() {
    let cost = getDeathLifespanCost();
    player.lifespan = Math.max(0, player.lifespan - cost);
    killAllBeasts();

    if (player.lifespan <= 0) {
        triggerLifespanGameOver();
        return true;
    }
    addLog(`🕯️ 死裡逃生，折損壽元 ${cost} 年！剩餘壽元 ${player.lifespan.toLocaleString()} 年。`, "combat");
    return false;
}

function triggerLifespanGameOver() {
    gameOver = true;
    inTribulation = false;
    heartDemon = null;
    enemies = [];
    localStorage.removeItem('xiuxian_save');
    addLog(`💀 壽元耗盡，身死道消……`, "combat");
    setTimeout(() => {
        alert(`【身死道消】\n${player.name} 壽元已盡，一身修為化為塵土。\n存檔已清除，請重新踏上修仙之路。`);
        location.reload();
    }, 100);
}
