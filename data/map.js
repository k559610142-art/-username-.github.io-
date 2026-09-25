// 地圖選擇彈窗與切換地圖邏輯

// 是否身在宗門（宗門設施與親自執行門派任務的共同條件）
function isInSect() {
    return !!player.currentMap && player.currentMap.name === SECT_MAP_NAME;
}

// 修仙地圖（獨立彈窗 #world-map-modal）：列出五個區域，點選後開啟該區的地圖清單
function openWorldMapModal() {
    let cur = document.getElementById('world-map-current');
    if (cur) cur.innerText = `目前所在：${player.currentMap.name}${player.currentMapIsSafe ? '（安全區）' : ''}`;
    renderTownTeleports();
    document.getElementById('world-map-modal').style.display = 'flex';
}

// 城鎮（不編號）：直接在修仙地圖顯示傳送點卡片（有 thumb 顯示縮圖），點擊即傳送；宗門（hidden）不列
function renderTownTeleports() {
    const box = document.getElementById('world-map-towns');
    if (!box) return;
    box.innerHTML = maps[0].items.map((item, i) => {
        if (item.hidden) return '';
        let isCurrent = player.currentMap.name === item.name;
        let scene = hasTownScene(item.name);   // 有城內場景（config-towns.js）：已在城內也能點，直接進城
        let pic = item.thumb ? `<img class="map-thumb" src="${item.thumb}" alt="${item.name}">` : `<span class="town-thumb-empty">🏯</span>`;
        let tip = isCurrent ? (scene ? '📍 當前所在・點擊進城' : '📍 當前所在') : (scene ? '✨ 點擊傳送並進城' : '✨ 點擊傳送');
        let clickable = !isCurrent || scene;
        return `<button class="town-card${isCurrent ? ' current' : ''}${scene ? ' has-scene' : ''}" ${clickable ? `onclick="goToTown(${i})"` : ''}>
            ${pic}<b>${item.name}</b><small>${tip}</small></button>`;
    }).join('');
}

// 點城鎮傳送點：不在該城就傳送過去；有城內場景（town.js）就開啟城內畫面
function goToTown(i) {
    let item = maps[0].items[i];
    if (player.currentMap.name !== item.name) selectMap(0, i);
    else closeModal('world-map-modal');
    if (player.currentMap.name === item.name && hasTownScene(item.name)) openTownScene(item.name);
}

function openMapCategoryModal(catIndex) {
    let cat = maps[catIndex];
    document.getElementById('map-modal-title').innerText = cat.category;
    const container = document.getElementById('map-modal-list');
    container.innerHTML = "";

    cat.items.forEach((item, iIndex) => {
        if (item.hidden) return;   // 宗門不列在修仙地圖（按洞府的「宗門」回去）
        let isCurrent = player.currentMap.name === item.name;
        container.innerHTML += `
            <div class="card" style="border-color: ${isCurrent ? 'var(--accent)' : 'rgba(255,255,255,0.08)'};">
                ${item.thumb ? `<img class="map-thumb" src="${item.thumb}" alt="${item.name}">` : ''}
                <h3 style="color: ${isCurrent ? 'var(--accent)' : '#fff'};">${item.name}</h3>
                <p style="font-size:0.85em; color:#9ca3af;">經驗倍率: x${item.expRate} | 難度: ${item.diff}</p>
                ${item.minRealm ? `<p style="font-size:0.8em; color:#f87171;">限制：仙人初境以上</p>` : ''}
                <button class="sys-btn ${isCurrent ? 'active' : ''}" onclick="selectMap(${catIndex}, ${iIndex})">${isCurrent ? '當前所在區域' : '前往此區域'}</button>
            </div>
        `;
    });

    document.getElementById('map-category-modal').style.display = 'flex';
}

// 洞府的「宗門」（手機熱點、PC pcStageButtons）：不在宗門就先傳送回宗門，再打開宗門分頁
function returnToSect() {
    if (!isInSect()) changeMap(0, 0);   // maps[0].items[0] = 宗門
    switchTab('sect');
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
    // 暫存區滿了不能外出練功（enhance.js）
    if (!maps[cIndex].isSafe && isGearStashFull()) {
        alert(`暫存區已滿（${GEAR_STASH_MAX}/${GEAR_STASH_MAX}）！\n請先到背包處理暫存區的橙色裝備（移入背包、分解或毀棄），才能外出練功。`);
        return;
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
