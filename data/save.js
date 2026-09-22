// 存讀檔：localStorage 本地存檔、匯出/匯入代碼、離線掛機收益結算、完全重置

function calcOfflineProgress() {
    if (!player.lastSaveTime) return;

    let now = Date.now();
    let offlineSeconds = Math.floor((now - player.lastSaveTime) / 1000);

    // 離線上限 24 小時 (86400 秒)
    let maxOfflineSeconds = 86400;
    if (offlineSeconds > maxOfflineSeconds) {
        offlineSeconds = maxOfflineSeconds;
    }

    if (offlineSeconds < 10) return; // 離線小於10秒不觸發

    let expEarned = 0;
    let coinsEarned = 0;
    let msg = "";

    // 修為已圓滿待渡劫時，離線期間同樣無法再累積經驗
    let wasPending = player.pendingTribulation;

    if (player.currentMapIsSafe) {
        let ticks = Math.floor(offlineSeconds / 5);
        expEarned = ticks * (player.currentMap.expRate * 50);
        let gained = gainExp(expEarned) || 0;
        msg = wasPending
            ? `🧘‍♂️ 離線於【${player.currentMap.name}】靜修 ${Math.floor(offlineSeconds / 60)} 分鐘，但修為已圓滿待渡劫，未能再累積經驗。`
            : `🧘‍♂️ 離線於【${player.currentMap.name}】靜修打坐 ${Math.floor(offlineSeconds / 60)} 分鐘，獲得 ${Math.floor(gained)} 點經驗！`;
    } else {
        let combatTicks = Math.floor(offlineSeconds * 0.7);
        expEarned = combatTicks * (player.currentMap.expRate * 15);
        coinsEarned = combatTicks * (player.currentMap.diff * 10);

        let gained = gainExp(expEarned) || 0;
        player.coins += coinsEarned;

        // 離線拯救僕從機率發放
        let rescueRolls = Math.floor(combatTicks / 30);
        let rescuedCount = 0;
        for (let i = 0; i < rescueRolls; i++) {
            if (Math.random() < 0.05) {
                tryRescueServant();
                rescuedCount++;
            }
        }

        let expText = wasPending ? "修為已滿(待渡劫，無經驗)" : `${Math.floor(gained)} 經驗`;
        msg = `⚔️ 離線於【${player.currentMap.name}】歷練 ${Math.floor(offlineSeconds / 60)} 分鐘，獲得 ${expText}與 ${coinsEarned} 靈石${rescuedCount > 0 ? `，並拯救了 ${rescuedCount} 名受困修士！` : '！'}`;
    }

    player.lastSaveTime = Date.now();
    addLog(`🌙 ${msg}`, "system");
    setTimeout(() => { alert(`【離線掛機收益結算】\n${msg}`); }, 500);
}

// 舊存檔相容：早期版本是「一份 activeQuest + assignedServantIds 共同加速」，
// 新版改為每位僕從各自負責一項任務，這裡把舊資料轉成新結構。
function migrateServantAssignments() {
    if (!Array.isArray(player.servants)) player.servants = [];

    player.servants.forEach(s => {
        if (typeof s.quest === 'undefined') s.quest = null;
        if (typeof s.timer !== 'number') s.timer = 0;
    });

    if (Array.isArray(player.assignedServantIds)) {
        let fallbackQuest = player.activeQuest || 'clean';
        player.assignedServantIds.forEach(id => {
            let s = player.servants.find(serv => serv.id === id);
            if (s && !s.quest) {
                s.quest = fallbackQuest;
                s.timer = 0;
            }
        });
        delete player.assignedServantIds;
    }
}

// 舊存檔相容：補齊之後版本新增的裝備部位（例如神器），避免欄位缺漏
function migrateEquipmentSlots() {
    if (!player.equipment || typeof player.equipment !== 'object') player.equipment = {};
    for (let slot in equipTypes) {
        if (!(slot in player.equipment)) player.equipment[slot] = null;
    }
}

function resetGameCompletely() {
    if (confirm("確定要完全重置遊戲嗎？這將清除所有存檔進度！")) {
        localStorage.removeItem('xiuxian_save');
        location.reload();
    }
}

function saveLocal() {
    player.lastSaveTime = Date.now();
    localStorage.setItem('xiuxian_save', JSON.stringify(player));
    addLog("💾 遊戲存檔成功！", "system");
}

function loadLocal() {
    let save = localStorage.getItem('xiuxian_save');
    if (save) {
        try {
            let data = JSON.parse(save);
            player = Object.assign({}, player, data);
            if (!player.gender) player.gender = "male";
            if (!player.name) player.name = (player.gender === 'female' ? "南宮婉" : "韓立");
            if (!player.stats.cha) player.stats.cha = 10;
            if (!player.studyCounts) player.studyCounts = { str: 0, con: 0, int: 0, spr: 0 };
            if (typeof player.pendingTribulation !== 'boolean') player.pendingTribulation = false;
            if (!player.tribulationCount) player.tribulationCount = 0;
            // 舊存檔可能在築基以前就被標記待渡劫，依現行規則清除
            if (player.pendingTribulation && player.realmIndex < TRIBULATION_MIN_REALM_INDEX) player.pendingTribulation = false;
            migrateServantAssignments();
            migrateEquipmentSlots();

            // 讀取成功後觸發離線補償計算
            calcOfflineProgress();

            updateUI();
            updateSectFacilitiesUI();
            addLog("📂 成功讀取本地存檔！", "system");
            return true;
        } catch(e) {
            alert("本地存檔格式損毀！");
            return false;
        }
    } else {
        return false;
    }
}

function exportSave() {
    try {
        player.lastSaveTime = Date.now();
        let jsonStr = JSON.stringify(player);
        let code = encodeURIComponent(jsonStr);
        prompt("請複製以下存檔代碼：", code);
    } catch(e) {
        alert("匯出存檔失敗！");
    }
}

function importSave() {
    let code = prompt("請貼上存檔代碼：");
    if (code) {
        try {
            let jsonStr = decodeURIComponent(code.trim());
            let data = JSON.parse(jsonStr);

            if (!data || typeof data !== 'object' || typeof data.realmIndex === 'undefined') {
                throw new Error("存檔結構不符");
            }

            player = Object.assign({}, player, data);
            if (!player.gender) player.gender = "male";
            if (!player.name) player.name = (player.gender === 'female' ? "南宮婉" : "韓立");
            if (!player.stats.cha) player.stats.cha = 10;
            if (!player.studyCounts) player.studyCounts = { str: 0, con: 0, int: 0, spr: 0 };
            if (typeof player.pendingTribulation !== 'boolean') player.pendingTribulation = false;
            if (!player.tribulationCount) player.tribulationCount = 0;
            // 舊存檔可能在築基以前就被標記待渡劫，依現行規則清除
            if (player.pendingTribulation && player.realmIndex < TRIBULATION_MIN_REALM_INDEX) player.pendingTribulation = false;
            migrateServantAssignments();
            migrateEquipmentSlots();

            // 匯入成功後觸發離線補償計算
            calcOfflineProgress();

            updateUI();
            updateSectFacilitiesUI();
            addLog("📥 匯入存檔成功！", "system");
            alert("匯入存檔成功！");
        } catch(e) {
            alert("「存檔代碼無效」！請確認您完整複製了代碼字串，且未夾雜多餘的空白或換行符號。");
        }
    }
}
