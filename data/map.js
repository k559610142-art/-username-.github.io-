// 地圖選擇彈窗與切換地圖邏輯

function openMapCategoryModal(catIndex) {
    let cat = maps[catIndex];
    document.getElementById('map-modal-title').innerText = cat.category;
    const container = document.getElementById('map-modal-list');
    container.innerHTML = "";

    cat.items.forEach((item, iIndex) => {
        let isCurrent = player.currentMap.name === item.name;
        container.innerHTML += `
            <div class="card" style="border-color: ${isCurrent ? 'var(--accent)' : 'rgba(255,255,255,0.08)'};">
                <h3 style="color: ${isCurrent ? 'var(--accent)' : '#fff'};">${item.name}</h3>
                <p style="font-size:0.85em; color:#9ca3af;">經驗倍率: x${item.expRate} | 難度: ${item.diff}</p>
                ${item.minRealm ? `<p style="font-size:0.8em; color:#f87171;">限制：仙人初境以上</p>` : ''}
                <button class="sys-btn ${isCurrent ? 'active' : ''}" onclick="selectMap(${catIndex}, ${iIndex})">${isCurrent ? '當前所在區域' : '前往此區域'}</button>
            </div>
        `;
    });

    document.getElementById('map-category-modal').style.display = 'flex';
}

function selectMap(cIndex, iIndex) {
    changeMap(cIndex, iIndex);
    closeModal('map-category-modal');
}

function changeMap(cIndex, iIndex) {
    let targetMap = maps[cIndex].items[iIndex];

    if (targetMap.minRealm) {
        if (player.realmIndex < targetMap.minRealm) {
            alert(`進入【${targetMap.name}】失敗！您的境界未達【仙人初境】。`);
            return;
        }
    }
    if (targetMap.minStat) {
        let minS = targetMap.minStat;
        if (player.stats.str < minS || player.stats.con < minS || player.stats.int < minS || player.stats.spr < minS) {
            alert(`進入【${targetMap.name}】失敗！四維屬性全數必須大於 ${minS} 方可進入。`);
            return;
        }
    }

    if (enemies.length > 0) {
        addLog("🏃 捨棄戰鬥，逃往其他區域！", "combat");
        enemies = [];
        respawnTimer = 0;
    }
    player.currentMap = targetMap;
    player.currentMapIsSafe = maps[cIndex].isSafe;
    safeZoneTimer = 0;

    updateSectFacilitiesUI();

    if (player.activeQuest && player.currentMap.name !== '演武學宮' && (!player.assignedServantIds || player.assignedServantIds.length === 0)) {
        stopQuest();
        addLog("離開了演武學宮且無僕從代勞，自動中斷門派任務。", "system");
    }

    if(player.currentMapIsSafe) {
        document.getElementById('combat-status').innerText = `當前狀態：在 ${player.currentMap.name} 靜修 (安全區)`;
        document.getElementById('combat-status').style.color = '#38bdf8';
        addLog(`🗺️ 回到安全區 ${player.currentMap.name}，開始打坐療傷。`);
    } else {
        document.getElementById('combat-status').innerText = `當前狀態：在 ${player.currentMap.name} 探索中...`;
        document.getElementById('combat-status').style.color = '#fb923c';
        addLog(`🗺️ 深入野外 ${player.currentMap.name}，四周充滿危險氣息。`);
    }
    updateCombatVisualPanel();
}
