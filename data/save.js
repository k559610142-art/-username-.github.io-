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
            // 只計算真的救出的人數（tryRescueServant 內還有一次機率判定與上限檢查）
            if (Math.random() < 0.05 && tryRescueServant()) rescuedCount++;
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

    // 舊版僕從 id 可能重複（同一毫秒救出多名），重複者換發新 id，避免解僱時連帶刪掉別人
    let seenIds = new Set();
    player.servants.forEach(s => {
        if (typeof s.quest === 'undefined') s.quest = null;
        if (typeof s.timer !== 'number') s.timer = 0;
        if (!s.id || seenIds.has(s.id)) s.id = Date.now() + "_" + Math.random().toString(36).slice(2, 10);
        seenIds.add(s.id);
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
    // 舊版靈寶閣「降魔伏虎杖」的部位是不存在的「杖」，穿上會多出一格，卸下後留下的空格會讓五行法陣永遠無法達成。
    // 移除 equipTypes 以外的部位，原本穿著的裝備退回背包（不受背包上限限制，避免物品消失）。
    for (let slot in player.equipment) {
        if (slot in equipTypes) continue;
        if (player.equipment[slot]) {
            if (!Array.isArray(player.equipInventory)) player.equipInventory = [];
            player.equipInventory.push(player.equipment[slot]);
        }
        delete player.equipment[slot];
    }
}

// 舊存檔相容：補上活動相關欄位（每日任務／千寶閣）
function migrateActivityFields() {
    if (!Array.isArray(player.dailyQuests)) player.dailyQuests = [];
    if (typeof player.dailyRefreshAt !== 'number') player.dailyRefreshAt = 0;
    if (!player.dailyStats || typeof player.dailyStats !== 'object') player.dailyStats = {};
    if (!Array.isArray(player.auctionItems)) player.auctionItems = [];
    if (typeof player.auctionRefreshAt !== 'number') player.auctionRefreshAt = 0;
}

// 舊存檔相容：人物等級、壽元、分階段宗門技能、靈寵等級制
// savedData 是存檔原始內容：player 已被 Object.assign 合併過預設值（lifespan 60），
// 必須看原始存檔才知道壽元欄位是否真的不存在。
function migrateProgressionFields(savedData) {
    if (typeof player.level !== 'number' || player.level < 1) player.level = 1;
    if (typeof player.levelExp !== 'number') player.levelExp = 0;
    if (typeof savedData.lifespan !== 'number') player.lifespan = getInitialLifespanForRealm(player.realmIndex);
    if (!Array.isArray(savedData.lingbaoSold)) player.lingbaoSold = [];

    // 存檔內的 player.sect 是舊版整包物件，改指向最新設定，技能/倍率調整才會生效
    if (!player.sectSkills || typeof player.sectSkills !== 'object') player.sectSkills = { 1: null, 2: null, 3: null };
    if (player.sect) {
        let sect = findSectByName(player.sect.name);
        player.sect = sect;
        if (sect && !player.sectSkills[sect.tier]) player.sectSkills[sect.tier] = sect.name;
    }

    // 舊版靈獸只存 id 字串，轉成 Lv1 的靈寵物件
    if (!Array.isArray(player.beasts)) player.beasts = [];
    player.beasts = player.beasts.map(b => {
        if (typeof b === 'string') return createBeast(b);
        if (!Array.isArray(b.skills)) b.skills = BEAST_SKILL_LEVELS.map(() => null);
        if (typeof b.level !== 'number') b.level = 1;
        if (typeof b.exp !== 'number') b.exp = 0;
        if (typeof b.alive !== 'boolean') b.alive = true;
        return b;
    });
}

function resetGameCompletely() {
    if (confirm("確定要完全重置遊戲嗎？這將清除所有存檔進度！")) {
        localStorage.removeItem('xiuxian_save');
        location.reload();
    }
}

function saveLocal() {
    if (gameOver) return;   // 壽元耗盡後存檔已清除，不可再寫回
    player.lastSaveTime = Date.now();
    localStorage.setItem('xiuxian_save', JSON.stringify(player));
    addLog("💾 遊戲存檔成功！", "system");
}

// 舊版靈寶閣禁術（大羅天經／神魔九變）下修到新標準，數值見 config-lingbao.js 的 legacySkillAdjustments。
// 每次讀檔都套用（結果固定，重複套用不會越改越低）
function migrateLegacySkills() {
    if (!Array.isArray(player.learnedSkills)) { player.learnedSkills = []; return; }
    player.learnedSkills.forEach(sk => {
        let fix = legacySkillAdjustments[sk.name];
        if (fix) Object.assign(sk, fix);
    });
}

// 讀檔與匯入共用：合併預設值 → 各項舊存檔相容 → 清除執行期戰鬥狀態 → 離線收益結算 → 更新畫面
// ⚠️ 必須合併到「全新角色的預設值」（DEFAULT_PLAYER_JSON），不能合併到目前的 player：
//    否則遊戲中匯入缺欄位的舊存檔，會沿用目前角色的等級、宗門技能、靈寶閣購買紀錄等。
function applySaveData(data) {
    player = Object.assign(JSON.parse(DEFAULT_PLAYER_JSON), data);
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
    migrateActivityFields();
    migrateProgressionFields(data);
    migrateLegacySkills();

    // 換了一份存檔，原本進行中的戰鬥、渡劫、身上狀態都不該延續
    enemies = [];
    respawnTimer = 0;
    inTribulation = false;
    heartDemon = null;
    playerStatus = newStatus();

    calcOfflineProgress();
    updateUI();
    updateSectFacilitiesUI();
}

function loadLocal() {
    let save = localStorage.getItem('xiuxian_save');
    if (!save) return false;
    try {
        applySaveData(JSON.parse(save));
        addLog("📂 成功讀取本地存檔！", "system");
        return true;
    } catch(e) {
        alert("本地存檔格式損毀！");
        return false;
    }
}

// ---- 存檔代碼（匯出/匯入）----
// 格式：UTF-8 JSON → Base64。中文字在舊格式（encodeURIComponent）每字變 9 個字元，Base64 只需 4 個，代碼短一半以上。
// 匯入同時相容：Base64（新）、%7B 開頭的舊格式、直接貼上的 JSON。
// 以前用 prompt() 顯示與輸入代碼：手機上幾乎無法全選複製 4 萬多字，部分 App 內建瀏覽器更會直接擋掉 prompt，
// 因此改為 #save-code-modal 視窗（文字框＋複製／下載檔案／從檔案讀取）。

function encodeSaveCode(obj) {
    let bytes = new TextEncoder().encode(JSON.stringify(obj));
    let binary = "";
    for (let i = 0; i < bytes.length; i += 0x8000) {
        binary += String.fromCharCode.apply(null, bytes.subarray(i, i + 0x8000));
    }
    return btoa(binary);
}

function decodeSaveCode(code) {
    let text = (code || "").trim();
    if (text.startsWith("{")) return JSON.parse(text);                        // 直接貼 JSON
    if (text.startsWith("%7B")) return JSON.parse(decodeURIComponent(text));  // 舊版代碼
    let binary = atob(text.replace(/\s+/g, ""));                              // Base64（允許中間夾換行）
    let bytes = Uint8Array.from(binary, c => c.charCodeAt(0));
    return JSON.parse(new TextDecoder().decode(bytes));
}

function openSaveCodeModal(mode) {
    const isExport = mode === 'export';
    document.getElementById('save-code-title').innerText = isExport ? "📤 匯出存檔代碼" : "📥 匯入存檔代碼";
    document.getElementById('save-code-hint').innerText = isExport
        ? "請按「複製代碼」後貼到安全的地方保存，或直接下載成檔案。換裝置時用「匯入存檔代碼」還原。"
        : "請把先前匯出的存檔代碼貼到下方，或選擇下載的存檔檔案，再按「確認匯入」。目前的進度會被覆蓋！";
    document.getElementById('save-code-export-actions').style.display = isExport ? 'flex' : 'none';
    document.getElementById('save-code-import-actions').style.display = isExport ? 'none' : 'flex';
    const box = document.getElementById('save-code-text');
    box.readOnly = isExport;
    box.value = "";
    document.getElementById('save-code-modal').style.display = 'flex';
    return box;
}

function exportSave() {
    try {
        player.lastSaveTime = Date.now();
        let box = openSaveCodeModal('export');
        box.value = encodeSaveCode(player);
        document.getElementById('save-code-status').innerText = `代碼長度：${box.value.length.toLocaleString()} 字`;
    } catch(e) {
        alert("匯出存檔失敗！");
    }
}

function copySaveCode() {
    const box = document.getElementById('save-code-text');
    const status = document.getElementById('save-code-status');
    const fallback = () => {
        box.select();
        box.setSelectionRange(0, box.value.length);
        let ok = false;
        try { ok = document.execCommand('copy'); } catch(e) {}
        status.innerText = ok ? "✅ 已複製到剪貼簿！" : "⚠️ 無法自動複製，請長按文字框手動全選複製。";
    };
    if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(box.value).then(() => { status.innerText = "✅ 已複製到剪貼簿！"; }, fallback);
    } else {
        fallback();
    }
}

function downloadSaveCode() {
    const text = document.getElementById('save-code-text').value;
    const blob = new Blob([text], { type: "text/plain" });
    const a = document.createElement('a');
    const stamp = new Date().toISOString().slice(0, 10);
    a.href = URL.createObjectURL(blob);
    a.download = `凡塵修仙傳存檔_${player.name}_${stamp}.txt`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
    document.getElementById('save-code-status').innerText = "✅ 已下載存檔檔案。";
}

function importSave() {
    openSaveCodeModal('import').focus();
    document.getElementById('save-code-status').innerText = "";
}

// 「從檔案讀取」：把檔案內容放進文字框，玩家確認後再按「確認匯入」
function importSaveFromFile(input) {
    const file = input.files && input.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
        document.getElementById('save-code-text').value = reader.result;
        document.getElementById('save-code-status').innerText = `已讀取檔案：${file.name}，請按「確認匯入」。`;
    };
    reader.readAsText(file);
    input.value = "";
}

function confirmImportSave() {
    const code = document.getElementById('save-code-text').value;
    if (!code.trim()) { alert("請先貼上存檔代碼或選擇存檔檔案！"); return; }

    let data;
    try {
        data = decodeSaveCode(code);
        if (!data || typeof data !== 'object' || typeof data.realmIndex === 'undefined') throw new Error("存檔結構不符");
    } catch(e) {
        alert("「存檔代碼無效」！請確認完整複製了整段代碼（可能只複製到一部分）。");
        return;
    }
    if (!confirm(`即將匯入【${data.name || '無名修士'}】（${realms[data.realmIndex] || ''}）的存檔，目前的進度會被覆蓋。確定匯入？`)) return;

    try {
        applySaveData(data);
        saveLocal();   // 立刻寫入本地存檔，避免重新整理後又回到舊進度
        closeModal('save-code-modal');
        addLog("📥 匯入存檔成功！", "system");
        alert("匯入存檔成功！");
    } catch(e) {
        alert("匯入存檔失敗：存檔內容有誤。");
    }
}
