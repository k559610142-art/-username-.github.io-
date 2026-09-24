// 地圖選擇彈窗與切換地圖邏輯

// 是否身在宗門（宗門設施與親自執行門派任務的共同條件）
function isInSect() {
    return !!player.currentMap && player.currentMap.name === SECT_MAP_NAME;
}

// 修仙地圖（獨立彈窗 #world-map-modal）：列出五個區域，點選後開啟該區的地圖清單
function openWorldMapModal() {
    let cur = document.getElementById('world-map-current');
    if (cur) cur.innerText = `目前所在：${player.currentMap.name}${player.currentMapIsSafe ? '（安全區）' : ''}`;
    document.getElementById('world-map-modal').style.display = 'flex';
}

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
    closeModal('world-map-modal');
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

    // 懸賞對決中換地圖＝逃離對決（懸賞保留，bounty.js）
    if (inBountyDuel) endBountyDuel("flee");
    if (enemies.length > 0) {
        addLog("🏃 捨棄戰鬥，逃往其他區域！", "combat");
        enemies = [];
        respawnTimer = 0;
    }
    player.currentMap = targetMap;
    player.currentMapIsSafe = maps[cIndex].isSafe;
    safeZoneTimer = 0;

    updateSectFacilitiesUI();

    if (player.activeQuest && !isInSect()) {
        stopQuest();
        addLog("離開了宗門，自動中斷你親自執行的門派任務（僕從仍會繼續各自的任務）。", "system");
    }

    refreshCombatStatusText();
    if (player.currentMapIsSafe) {
        addLog(`🗺️ 回到安全區 ${player.currentMap.name}，開始打坐療傷。`);
    } else {
        addLog(`🗺️ 深入野外 ${player.currentMap.name}，四周充滿危險氣息。`);
    }
    updateCombatVisualPanel();
}
