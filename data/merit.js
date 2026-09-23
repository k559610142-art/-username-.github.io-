// 功德系統：獵殺邪修取得功德 → 兌換七彩補天石 → 千寶閣購買珍貴物資（破障丹）
// 數值見 config-merit.js；邪修的生成在 combat.js（spawnEnemy），破障丹的效果在 tribulation.js

// 「獵殺邪修」活動是否已解鎖（聲望＋境界，條件在 config-activities.js）
// implemented: false（暫停開放）時一律視為未解鎖：野外不會出現邪修、離線也不累積功德
function isEvilHuntUnlocked() {
    const act = activityData.find(a => a.id === "evil");
    return !!act && act.implemented && getActivityLockReason(act) === null;
}

// 功德系統是否開放（獵殺邪修活動 implemented）。暫停時千寶閣不顯示珍貴物資區、渡劫也不提醒破障丹，
// 避免引導玩家去買拿不到的東西；已持有的破障丹仍會在渡劫時生效
function isMeritSystemOpen() {
    const act = activityData.find(a => a.id === "evil");
    return !!act && act.implemented;
}

// 斬殺一名邪修的功德（EVIL_MERIT_MIN ~ EVIL_MERIT_MAX）
function rollEvilMerit() {
    return EVIL_MERIT_MIN + Math.floor(Math.random() * (EVIL_MERIT_MAX - EVIL_MERIT_MIN + 1));
}

// ---- 獵殺邪修（活動選單的說明視窗）----
function openEvilHuntModal() {
    renderEvilHunt();
    document.getElementById('evil-hunt-modal').style.display = 'flex';
}

function renderEvilHunt() {
    const container = document.getElementById('evil-hunt-container');
    if (!container) return;
    const avgMerit = (EVIL_MERIT_MIN + EVIL_MERIT_MAX) / 2;
    container.innerHTML = `
        <p style="color: #d1d5db; font-size: 0.9em; line-height: 1.7;">
            邪修潛伏於各地野外，與妖獸混雜出沒。<br>
            在野外歷練時，每隻敵人有 <b>${Math.round(EVIL_SPAWN_CHANCE * 100)}%</b> 機率是 ${EVIL_ICON} 邪修（氣血與攻擊 ×${EVIL_POWER_MULT}），<br>
            斬殺一名可得 <b>${EVIL_MERIT_MIN}～${EVIL_MERIT_MAX}</b> 點功德（離線掛機同樣會累積）。
        </p>
        <div style="display: flex; flex-wrap: wrap; justify-content: center; gap: 8px 20px; margin: 12px 0; font-size: 0.92em;">
            <span>🙏 功德 <b style="color: #facc15;">${player.merit.toLocaleString()}</b></span>
            <span class="rainbow-text">💎 七彩補天石 ${player.butianStones.toLocaleString()}</span>
            <span class="rainbow-text">🔮 破障丹 ${player.breakPills.toLocaleString()}</span>
            <span style="color: #9ca3af;">累計斬殺邪修 ${player.evilKills.toLocaleString()} 名</span>
        </div>
        <p style="color: #9ca3af; font-size: 0.82em;">
            功德只能兌換道具：每 ${MERIT_PER_BUTIAN_STONE} 功德換 1 顆七彩補天石（平均約斬殺 ${Math.round(MERIT_PER_BUTIAN_STONE / avgMerit)} 名邪修），
            再到千寶閣「珍貴物資」購買破障丹。
        </p>
        <button class="sys-btn" style="border-color: var(--accent); color: var(--accent);" onclick="closeModal('evil-hunt-modal'); openActivity('auction');">🏺 前往千寶閣兌換</button>`;
}

// ---- 千寶閣「珍貴物資」區（由 auction.js 的 renderAuction 嵌入）----
function renderPreciousSection() {
    if (!isMeritSystemOpen()) return '';
    const stone = preciousItems.butianStone;
    const pill = preciousItems.breakPill;
    const canStone = Math.floor(player.merit / MERIT_PER_BUTIAN_STONE);
    const canPill = Math.floor(player.butianStones / BREAK_PILL_STONE_COST);
    const batch = (fn, can) => `
        <div class="batch-btns">
            <button class="sys-btn" ${can < 1 ? 'disabled' : ''} onclick="${fn}(1)">×1</button>
            <button class="sys-btn" ${can < 10 ? 'disabled' : ''} onclick="${fn}(10)">×10</button>
            <button class="sys-btn" ${can < 1 ? 'disabled' : ''} onclick="${fn}('max')">最高</button>
        </div>`;
    return `
        <h3 class="rainbow-text" style="margin: 22px 0 6px;">✨ 珍貴物資（常駐）</h3>
        <p style="color: #9ca3af; font-size: 0.82em; margin: 0 0 10px;">
            持有：🙏 功德 <b style="color: #facc15;">${player.merit.toLocaleString()}</b>｜💎 七彩補天石 <b>${player.butianStones.toLocaleString()}</b>｜🔮 破障丹 <b>${player.breakPills.toLocaleString()}</b>
        </p>
        <div class="grid-container">
            <div class="card rainbow-glow">
                <h3 class="rainbow-text">${stone.icon} ${stone.name}</h3>
                <p style="font-size: 0.8em; color: #9ca3af;">${stone.desc}</p>
                <p style="font-size: 0.85em; color: var(--accent); margin: 6px 0;">價格：${MERIT_PER_BUTIAN_STONE} 功德</p>
                ${batch('exchangeMeritForStone', canStone)}
            </div>
            <div class="card rainbow-glow">
                <h3 class="rainbow-text">${pill.icon} ${pill.name}</h3>
                <p style="font-size: 0.8em; color: #9ca3af;">${pill.desc}</p>
                <p style="font-size: 0.85em; color: var(--accent); margin: 6px 0;">價格：${BREAK_PILL_STONE_COST} 顆七彩補天石</p>
                ${batch('buyBreakPill', canPill)}
            </div>
        </div>`;
}

// qty：1、10 或 'max'
function exchangeMeritForStone(qty = 1) {
    let affordable = Math.floor(player.merit / MERIT_PER_BUTIAN_STONE);
    if (affordable <= 0) {
        alert(`功德不足！兌換 1 顆七彩補天石需要 ${MERIT_PER_BUTIAN_STONE} 功德（目前 ${player.merit}）。\n可在野外斬殺邪修取得功德。`);
        return;
    }
    let n = resolveBatchCount(qty, affordable, "兌換");
    if (!n) return;
    player.merit -= MERIT_PER_BUTIAN_STONE * n;
    player.butianStones += n;
    addLog(`💎 以 ${(MERIT_PER_BUTIAN_STONE * n).toLocaleString()} 功德兌換了 ${n} 顆【七彩補天石】！`, "level-up");
    renderAuction();
    updateUI();
}

// qty：1、10 或 'max'
function buyBreakPill(qty = 1) {
    let affordable = Math.floor(player.butianStones / BREAK_PILL_STONE_COST);
    if (affordable <= 0) {
        alert(`七彩補天石不足！購買 1 顆破障丹需要 ${BREAK_PILL_STONE_COST} 顆（目前 ${player.butianStones}）。`);
        return;
    }
    let n = resolveBatchCount(qty, affordable, "購買");
    if (!n) return;
    player.butianStones -= BREAK_PILL_STONE_COST * n;
    player.breakPills += n;
    addLog(`🔮 於千寶閣以 ${BREAK_PILL_STONE_COST * n} 顆七彩補天石購得 ${n} 顆【破障丹】！渡劫時將自動服用。`, "level-up");
    renderAuction();
    updateUI();
}
