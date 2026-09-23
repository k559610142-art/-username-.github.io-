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
        // OFFLINE_COMBAT_RATE = 離線每秒的戰鬥次數（見 config-maps.js，刻意低於線上滿速的每秒 0.32 隻）
        let combatTicks = Math.floor(offlineSeconds * OFFLINE_COMBAT_RATE);
        expEarned = combatTicks * (player.currentMap.expRate * 15);
        coinsEarned = combatTicks * (typeof player.currentMap.coins === 'number' ? player.currentMap.coins : player.currentMap.diff * 10);

        let gained = gainExp(expEarned) || 0;
        player.coins += coinsEarned;

        // 離線聲望：以該區「平均擊殺聲望 × OFFLINE_REPUTATION_RATE」計算，刻意低於線上掛機
        let repMax = REPUTATION_MAX_BY_MAP_CATEGORY[getMapCategoryIndex(player.currentMap.name)] || 1;
        let repEarned = Math.floor(combatTicks * ((repMax + 1) / 2) * OFFLINE_REPUTATION_RATE);
        player.reputation = (player.reputation || 0) + repEarned;

        // 離線拯救僕從機率發放
        let rescueRolls = Math.floor(combatTicks / 30);
        let rescuedCount = 0;
        for (let i = 0; i < rescueRolls; i++) {
            // 只計算真的救出的人數（tryRescueServant 內還有一次機率判定與上限檢查）
            if (Math.random() < 0.05 && tryRescueServant()) rescuedCount++;
        }

        let expText = wasPending ? "修為已滿(待渡劫，無經驗)" : `${Math.floor(gained)} 經驗`;
        msg = `⚔️ 離線於【${player.currentMap.name}】歷練 ${Math.floor(offlineSeconds / 60)} 分鐘，獲得 ${expText}、${coinsEarned.toLocaleString()} 靈石與 ${repEarned.toLocaleString()} 點聲望${rescuedCount > 0 ? `，並拯救了 ${rescuedCount} 名受困修士！` : '！'}`;
    }

    // 離線期間的歲月流逝（半速，同樣受底線保護）
    let aged = ageLifespan(offlineSeconds, LIFESPAN_OFFLINE_RATE);
    if (aged >= 1) msg += `\n⏳ 歲月流逝，壽元減少 ${formatLifespan(aged)} 年（剩餘 ${formatLifespan(player.lifespan)} 年）。`;

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
    // 舊版靈寶閣「降魔伏虎杖」的部位是不存在的「杖」，穿上會多出一格，卸下後留下的空格會干擾靈根判定。
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

// 舊存檔相容：存檔內的 currentMap 是當時的地圖物件副本，改指向最新設定（倍率調整才會生效）。
// 已不存在的地圖（例如合併進「宗門」的洞府 / 弟子居、演武學宮、後山禁地）一律回到宗門。
function migrateCurrentMap() {
    let name = player.currentMap && player.currentMap.name;
    for (let cat of maps) {
        let found = cat.items.find(item => item.name === name);
        if (found) {
            player.currentMap = found;
            player.currentMapIsSafe = cat.isSafe;
            return;
        }
    }
    player.currentMap = maps[0].items[0];
    player.currentMapIsSafe = maps[0].isSafe;
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
    player.name = sanitizePlayerName(player.name);   // 別人分享的存檔代碼可能夾帶 HTML，道號會被插進日誌
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
    migrateCurrentMap();
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

// 「命運與系統 → 讀取本地存檔」按鈕：沒有存檔時也要給回應（loadLocal 本身在開場時需保持安靜）
function reloadLocalSave() {
    if (!loadLocal()) addLog("📂 找不到本地存檔（或存檔已損毀）。", "system");
}

// ---- 存檔代碼（匯出/匯入）----
// 格式（新）："FS2:" + Base64(deflate-raw 壓縮的 UTF-8 JSON)。重度存檔約 4 千字（未壓縮 Base64 約 4 萬字），
//   可以完整貼進 LINE 等通訊軟體（LINE 單則訊息上限約 1 萬字，過長會被截斷或拆開，導致匯入失敗）。
//   瀏覽器沒有 CompressionStream（iOS 16.3 以前）時退回未壓縮的 Base64。
// 匯入相容：FS2 壓縮代碼、未壓縮 Base64、%7B 開頭的最舊版代碼、直接貼上的 JSON。
// ⚠️ 此視窗內「不使用」alert/confirm/prompt：LINE、Facebook 等 App 內建瀏覽器常會擋掉這些原生對話框，
//    confirm 被擋時會直接回傳 false，造成「按了確認匯入卻什麼事都沒發生」。所有訊息都顯示在 #save-code-status，
//    覆蓋進度改為「按兩次確認」。

const SAVE_CODE_PREFIX = "FS2:";

function bytesToBase64(bytes) {
    let binary = "";
    for (let i = 0; i < bytes.length; i += 0x8000) {
        binary += String.fromCharCode.apply(null, bytes.subarray(i, i + 0x8000));
    }
    return btoa(binary);
}

function base64ToBytes(b64) {
    return Uint8Array.from(atob(b64.replace(/\s+/g, "")), c => c.charCodeAt(0));
}

async function pipeBytes(bytes, stream) {
    return new Uint8Array(await new Response(new Blob([bytes]).stream().pipeThrough(stream)).arrayBuffer());
}

async function encodeSaveCode(obj) {
    let bytes = new TextEncoder().encode(JSON.stringify(obj));
    if (typeof CompressionStream === 'function') {
        return SAVE_CODE_PREFIX + bytesToBase64(await pipeBytes(bytes, new CompressionStream('deflate-raw')));
    }
    return bytesToBase64(bytes);
}

async function decodeSaveCode(code) {
    let text = (code || "").trim();
    if (text.startsWith(SAVE_CODE_PREFIX)) {
        if (typeof DecompressionStream !== 'function') {
            throw new Error("此瀏覽器版本過舊，無法讀取壓縮存檔代碼，請更新瀏覽器（iOS 需 16.4 以上）後再試。");
        }
        let bytes = await pipeBytes(base64ToBytes(text.slice(SAVE_CODE_PREFIX.length)), new DecompressionStream('deflate-raw'));
        return JSON.parse(new TextDecoder().decode(bytes));
    }
    if (text.startsWith("{")) return JSON.parse(text);                        // 直接貼 JSON
    if (text.startsWith("%7B")) return JSON.parse(decodeURIComponent(text));  // 最舊版代碼
    return JSON.parse(new TextDecoder().decode(base64ToBytes(text)));         // 未壓縮 Base64
}

function setSaveCodeStatus(msg, type) {
    const el = document.getElementById('save-code-status');
    el.innerText = msg;
    el.style.color = type === 'error' ? '#ef4444' : (type === 'warn' ? '#facc15' : '#4ade80');
}

let pendingImportData = null;   // 已解析、等待第二次確認的存檔

function resetImportConfirm() {
    pendingImportData = null;
    document.getElementById('save-code-confirm-btn').innerText = "✅ 確認匯入";
}

function openSaveCodeModal(mode) {
    const isExport = mode === 'export';
    document.getElementById('save-code-title').innerText = isExport ? "📤 匯出存檔代碼" : "📥 匯入存檔代碼";
    document.getElementById('save-code-hint').innerText = isExport
        ? "請按「複製代碼」後貼到安全的地方保存（例如傳給自己的 LINE），或下載成檔案。換裝置時用「匯入存檔代碼」還原。"
        : "請把先前匯出的存檔代碼貼到下方（可按「從剪貼簿貼上」），或選擇存檔檔案，再按「確認匯入」。目前的進度會被覆蓋！";
    document.getElementById('save-code-export-actions').style.display = isExport ? 'flex' : 'none';
    document.getElementById('save-code-import-actions').style.display = isExport ? 'none' : 'flex';
    const box = document.getElementById('save-code-text');
    // 匯出時不用 readOnly：iOS 無法用程式選取 readOnly 文字框，改用 inputmode="none" 避免跳出鍵盤
    box.readOnly = false;
    box.setAttribute('inputmode', isExport ? 'none' : 'text');
    box.value = "";
    setSaveCodeStatus("", "ok");
    resetImportConfirm();
    document.getElementById('save-code-modal').style.display = 'flex';
    return box;
}

async function exportSave() {
    let box = openSaveCodeModal('export');
    setSaveCodeStatus("產生代碼中…", "warn");
    try {
        player.lastSaveTime = Date.now();
        box.value = await encodeSaveCode(player);
        setSaveCodeStatus(`代碼長度：${box.value.length.toLocaleString()} 字${box.value.startsWith(SAVE_CODE_PREFIX) ? '（已壓縮）' : ''}`, "ok");
    } catch(e) {
        setSaveCodeStatus("匯出存檔失敗：" + e.message, "error");
    }
}

function selectSaveCodeText() {
    const box = document.getElementById('save-code-text');
    box.focus();
    box.select();
    box.setSelectionRange(0, box.value.length);   // iOS 需要這行才會全選
}

function copySaveCode() {
    const box = document.getElementById('save-code-text');
    // 先同步嘗試 execCommand（仍在點擊事件內，iOS 舊版只接受這種方式），失敗再用 Clipboard API
    selectSaveCodeText();
    let ok = false;
    try { ok = document.execCommand('copy'); } catch(e) {}
    if (ok) { setSaveCodeStatus("✅ 已複製到剪貼簿！", "ok"); return; }

    if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(box.value).then(
            () => setSaveCodeStatus("✅ 已複製到剪貼簿！", "ok"),
            () => { selectSaveCodeText(); setSaveCodeStatus("⚠️ 瀏覽器不允許自動複製，文字已全選，請長按文字框選「複製」。", "warn"); }
        );
    } else {
        setSaveCodeStatus("⚠️ 瀏覽器不允許自動複製，文字已全選，請長按文字框選「複製」。", "warn");
    }
}

function downloadSaveCode() {
    const text = document.getElementById('save-code-text').value;
    const blob = new Blob([text], { type: "text/plain" });
    const a = document.createElement('a');
    const stamp = new Date().toISOString().slice(0, 10);
    a.href = URL.createObjectURL(blob);
    a.download = `fanchen-save_${stamp}.txt`;   // 檔名用英數字，部分手機瀏覽器遇到中文檔名會變亂碼或下載失敗
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
    // App 內建瀏覽器常不支援下載，無法偵測是否成功，因此只提示「若沒反應請改用複製」
    setSaveCodeStatus("已送出下載。若沒有出現下載（LINE 等 App 內建瀏覽器不支援），請改用「複製代碼」。", "warn");
}

function importSave() {
    openSaveCodeModal('import');
}

async function pasteSaveCodeFromClipboard() {
    if (!navigator.clipboard || !navigator.clipboard.readText) {
        setSaveCodeStatus("⚠️ 此瀏覽器無法讀取剪貼簿，請長按文字框選「貼上」。", "warn");
        return;
    }
    try {
        document.getElementById('save-code-text').value = await navigator.clipboard.readText();
        resetImportConfirm();
        setSaveCodeStatus("已貼上，請按「確認匯入」。", "ok");
    } catch(e) {
        setSaveCodeStatus("⚠️ 無法讀取剪貼簿（可能未允許權限），請長按文字框選「貼上」。", "warn");
    }
}

// 「從檔案讀取」：把檔案內容放進文字框，玩家確認後再按「確認匯入」
// （input 不限制檔案類型：部分 Android 會把 .txt 標成 application/octet-stream，限制後反而選不到）
function importSaveFromFile(input) {
    const file = input.files && input.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
        document.getElementById('save-code-text').value = reader.result;
        resetImportConfirm();
        setSaveCodeStatus(`已讀取檔案：${file.name}，請按「確認匯入」。`, "ok");
    };
    reader.onerror = () => setSaveCodeStatus("讀取檔案失敗，請改用貼上代碼。", "error");
    reader.readAsText(file);
    input.value = "";
}

// 第一次按：解析並顯示存檔資訊；第二次按：真正覆蓋（取代原生 confirm）
async function confirmImportSave() {
    const code = document.getElementById('save-code-text').value;
    const btn = document.getElementById('save-code-confirm-btn');

    if (!pendingImportData) {
        if (!code.trim()) { setSaveCodeStatus("請先貼上存檔代碼或選擇存檔檔案！", "error"); return; }
        let data;
        try {
            data = await decodeSaveCode(code);
            if (!data || typeof data !== 'object' || typeof data.realmIndex === 'undefined') throw new Error("存檔結構不符");
        } catch(e) {
            let reason = e.message && e.message.startsWith("此瀏覽器") ? e.message : "請確認完整複製了整段代碼（可能只複製到一部分，或通訊軟體把它拆成好幾則訊息）。";
            setSaveCodeStatus("「存檔代碼無效」！" + reason, "error");
            return;
        }
        pendingImportData = data;
        btn.innerText = "⚠️ 再按一次，覆蓋目前進度";
        setSaveCodeStatus(`讀取到【${sanitizePlayerName(data.name) || '無名修士'}】（${realms[data.realmIndex] || ''}）的存檔。再按一次按鈕即匯入，目前的進度會被覆蓋。`, "warn");
        return;
    }

    let data = pendingImportData;
    let backup = JSON.stringify(player);
    try {
        applySaveData(data);
        saveLocal();   // 立刻寫入本地存檔，避免重新整理後又回到舊進度
        resetImportConfirm();
        closeModal('save-code-modal');
        addLog("📥 匯入存檔成功！", "system");
    } catch(e) {
        player = JSON.parse(backup);   // 失敗時還原，不留下半套資料
        resetImportConfirm();
        setSaveCodeStatus("匯入存檔失敗：存檔內容有誤。目前進度未受影響。", "error");
    }
}
