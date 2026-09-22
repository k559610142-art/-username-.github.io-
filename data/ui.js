// 共用 UI 更新：頂部狀態列、戰鬥實況面板、技能列表、日誌、彈窗開關

function updateAutoSettings() {
    player.autoHp.enabled = document.getElementById('auto-hp-enabled').checked;
    player.autoHp.threshold = parseInt(document.getElementById('auto-hp-threshold').value) || 50;
    player.autoMp.enabled = document.getElementById('auto-mp-enabled').checked;
    player.autoMp.threshold = parseInt(document.getElementById('auto-mp-threshold').value) || 30;
}

function syncAutoSettingsUI() {
    document.getElementById('auto-hp-enabled').checked = player.autoHp.enabled;
    document.getElementById('auto-hp-threshold').value = player.autoHp.threshold;
    document.getElementById('auto-mp-enabled').checked = player.autoMp.enabled;
    document.getElementById('auto-mp-threshold').value = player.autoMp.threshold;
}

function updateSectFacilitiesUI() {
    const questBtn = document.getElementById('btn-sect-quest');
    const fieldBtn = document.getElementById('btn-sect-field');
    const beastBtn = document.getElementById('btn-sect-beast');

    const forbiddenLingbao = document.getElementById('btn-forbidden-lingbao');
    const forbiddenLibrary = document.getElementById('btn-forbidden-library');
    const forbiddenForge = document.getElementById('btn-forbidden-forge');
    const forbiddenAlchemy = document.getElementById('btn-forbidden-alchemy');

    if (player.currentMap && player.currentMap.name === '演武學宮') {
        questBtn.style.display = 'block';
        fieldBtn.style.display = 'block';
        beastBtn.style.display = 'block';
    } else {
        questBtn.style.display = 'none';
        fieldBtn.style.display = 'none';
        beastBtn.style.display = 'none';
    }

    if (player.currentMap && player.currentMap.name === '後山禁地') {
        forbiddenLingbao.style.display = 'block';
        forbiddenLibrary.style.display = 'block';
        forbiddenForge.style.display = 'block';
        forbiddenAlchemy.style.display = 'block';
    } else {
        forbiddenLingbao.style.display = 'none';
        forbiddenLibrary.style.display = 'none';
        forbiddenForge.style.display = 'none';
        forbiddenAlchemy.style.display = 'none';
    }
}

function updateCombatVisualPanel() {
    document.getElementById('battle-player-name').innerText = player.name || (player.gender === 'female' ? "南宮婉" : "韓立");
    document.getElementById('battle-player-hp').innerText = `氣血: ${Math.floor(player.hp)}/${player.maxHp}`;

    const avatarContainer = document.getElementById('battle-player-icon');
    if (player.gender === 'female') {
        avatarContainer.innerHTML = `<img src="https://i.postimg.cc/L8WZRzfy/nan-gong-wan.jpg" alt="${player.name}" style="width: 60px; height: 60px; object-fit: cover; border-radius: 50%; border: 2px solid var(--accent); box-shadow: 0 0 10px var(--accent-glow);">`;
    } else {
        avatarContainer.innerHTML = `<img src="https://i.postimg.cc/fbJ8LT1t/han-tian-zun.jpg" alt="韓天尊" style="width: 60px; height: 60px; object-fit: cover; border-radius: 50%; border: 2px solid var(--accent); box-shadow: 0 0 10px var(--accent-glow);">`;
    }

    if (inTribulation && heartDemon) {
        document.getElementById('battle-enemy-title').innerText = "心魔";
        document.getElementById('battle-enemy-icon').innerText = heartDemon.icon;
        document.getElementById('battle-enemy-info').innerText = `氣血: ${Math.floor(heartDemon.hp)}/${heartDemon.maxHp}`;
        document.getElementById('battle-action-desc').innerText = `☯️ 渡劫中！正在與心魔生死對決...`;
    } else if (player.currentMapIsSafe) {
        document.getElementById('battle-enemy-title').innerText = "安全區域";
        document.getElementById('battle-enemy-icon').innerText = "🕊️";
        document.getElementById('battle-enemy-info').innerText = "無敵意目標";
        document.getElementById('battle-action-desc').innerText = `🧘‍♂️ 正在 ${player.currentMap.name} 靜修打坐中`;
    } else if (respawnTimer > 0) {
        document.getElementById('battle-enemy-title').innerText = "休整中";
        document.getElementById('battle-enemy-icon').innerText = "⏳";
        document.getElementById('battle-enemy-info').innerText = `剩餘 ${respawnTimer} 秒`;
        document.getElementById('battle-action-desc').innerText = `⏳ 敵方全滅，等待下一波妖獸刷新...`;
    } else if (enemies.length > 0) {
        let totalEnemyHp = 0;
        let totalMaxEnemyHp = 0;
        enemies.forEach(e => {
            totalEnemyHp += e.hp;
            totalMaxEnemyHp += e.maxHp;
        });
        document.getElementById('battle-enemy-title').innerText = `上古巨獸 (${enemies.length}隻)`;
        document.getElementById('battle-enemy-icon').innerText = enemies[0].icon || "🐉";
        document.getElementById('battle-enemy-info').innerText = `總血量: ${Math.floor(totalEnemyHp)}/${Math.floor(totalMaxEnemyHp)}`;
        document.getElementById('battle-action-desc').innerText = `⚔️ 劍氣縱橫！正在 ${player.currentMap.name} 與巨獸殊死搏鬥！`;
    } else {
        document.getElementById('battle-enemy-title').innerText = "索敵中";
        document.getElementById('battle-enemy-icon').innerText = "🔍";
        document.getElementById('battle-enemy-info').innerText = "尋找目標";
        document.getElementById('battle-action-desc').innerText = `🔍 正在 ${player.currentMap.name} 探索四周...`;
    }
}

function updateUI() {
    if (!player.name) player.name = (player.gender === 'female' ? "南宮婉" : "韓立");
    if (!player.stats.cha) player.stats.cha = 10;
    if (!player.studyCounts) player.studyCounts = { str: 0, con: 0, int: 0, spr: 0 };

    document.getElementById('player-name-display').innerText = player.name;

    player.maxHp = getMaxHp();
    player.maxMp = getMaxMp();
    if (player.hp > player.maxHp) player.hp = player.maxHp;
    if (player.mp > player.maxMp) player.mp = player.maxMp;

    document.getElementById('realm-display').innerText = `${realms[player.realmIndex]} ${player.stage}階`;
    document.getElementById('power-display').innerText = getPhysAttack().toLocaleString();
    document.getElementById('sect-display').innerText = player.sect ? player.sect.name : "散修 (無技能)";
    document.getElementById('coins-display').innerText = player.coins.toLocaleString();
    document.getElementById('reputation-display').innerText = (player.reputation || 0).toLocaleString();

    let eqBonus = getEquipBonus();
    document.getElementById('stat-str').innerText = `${player.stats.str} (+${eqBonus.str})`;
    document.getElementById('stat-con').innerText = `${player.stats.con} (+${eqBonus.con})`;
    document.getElementById('stat-int').innerText = `${player.stats.int} (+${eqBonus.int})`;
    document.getElementById('stat-spr').innerText = `${player.stats.spr} (+${eqBonus.spr})`;
    document.getElementById('stat-cha').innerText = `${player.stats.cha} (+${eqBonus.cha})`;
    document.getElementById('reincarnate-count').innerText = player.reincarnations;

    document.getElementById('res-grass').innerText = player.spiritGrass;
    document.getElementById('res-beastcore').innerText = player.beastCore;
    document.getElementById('res-martial').innerText = player.martialPoints;
    document.getElementById('herb-mortal').innerText = player.herbs.mortal;
    document.getElementById('herb-high').innerText = player.herbs.high;
    document.getElementById('herb-epic').innerText = player.herbs.epic;
    document.getElementById('herb-immortal').innerText = player.herbs.immortal;

    let expPercent = Math.min((player.exp / getNextExp()) * 100, 100);
    document.getElementById('exp-bar').style.width = expPercent + '%';
    document.getElementById('exp-text').innerText = player.pendingTribulation
        ? `⚡ 修為圓滿・待渡劫 (${Math.floor(player.exp)} / ${getNextExp()})`
        : `${Math.floor(player.exp)} / ${getNextExp()}`;

    updateTribulationUI();
    updatePotionCooldownUI();
    renderActivityList();

    let hpPercent = Math.max((player.hp / player.maxHp) * 100, 0);
    document.getElementById('hp-bar').style.width = hpPercent + '%';
    document.getElementById('hp-text').innerText = `${Math.floor(player.hp)} / ${player.maxHp}`;

    let mpPercent = Math.max((player.mp / player.maxMp) * 100, 0);
    document.getElementById('mp-bar').style.width = mpPercent + '%';
    document.getElementById('mp-text').innerText = `${Math.floor(player.mp)} / ${player.maxMp}`;

    renderSkillList();
    updateStudyCountsUI();
    updateCombatVisualPanel();
}

// 修為圓滿時顯示渡劫按鈕；渡劫進行中則改為狀態提示並鎖住按鈕
function updateTribulationUI() {
    const btn = document.getElementById('btn-tribulation');
    if (!btn) return;

    if (inTribulation) {
        btn.style.display = 'block';
        btn.disabled = true;
        btn.innerText = `☯️ 渡劫中…心魔氣血 ${heartDemon ? Math.floor(heartDemon.hp).toLocaleString() : 0}`;
    } else if (player.pendingTribulation) {
        btn.style.display = 'block';
        btn.disabled = false;
        btn.innerText = `⚡ 天劫將至！點此渡劫晉升【${realms[player.realmIndex + 1] || ''}】`;
    } else {
        btn.style.display = 'none';
        btn.disabled = false;
    }
}

function updatePotionCooldownUI() {
    const display = document.getElementById('potion-cd-display');
    if (!display) return;
    const hpText = potionCooldownHp > 0 ? `${potionCooldownHp} 秒` : '就緒';
    const mpText = potionCooldownMp > 0 ? `${potionCooldownMp} 秒` : '就緒';
    display.innerHTML = `丹藥冷卻（每 ${POTION_COOLDOWN_SECONDS} 秒）：`
        + `<span style="color:${potionCooldownHp > 0 ? '#f87171' : '#4ade80'};">氣血 ${hpText}</span> / `
        + `<span style="color:${potionCooldownMp > 0 ? '#f87171' : '#4ade80'};">靈力 ${mpText}</span>`;
}

function updateStudyCountsUI() {
    if (document.getElementById('study-count-str')) document.getElementById('study-count-str').innerText = `已學習: ${player.studyCounts.str} / 100`;
    if (document.getElementById('study-count-con')) document.getElementById('study-count-con').innerText = `已學習: ${player.studyCounts.con} / 100`;
    if (document.getElementById('study-count-int')) document.getElementById('study-count-int').innerText = `已學習: ${player.studyCounts.int} / 100`;
    if (document.getElementById('study-count-spr')) document.getElementById('study-count-spr').innerText = `已學習: ${player.studyCounts.spr} / 100`;
}

function renderSkillList() {
    let skills = [];
    if (player.sect && player.sect.skills) {
        skills = [...player.sect.skills];
    }
    if (player.learnedSkills) {
        skills = skills.concat(player.learnedSkills);
    }

    if (skills.length === 0) {
        document.getElementById('skill-list').innerHTML = "尚未領悟門派技能。";
        return;
    }

    let html = "<strong>當前可用技能/絕學：</strong><br>";
    skills.forEach(sk => {
        let typeName = {"single":"單體", "aoe":"範圍", "heal":"補血", "buff":"增益"}[sk.type];
        html += `・${sk.name} (${typeName}, 耗魔:${sk.mpCost})<br>`;
    });
    document.getElementById('skill-list').innerHTML = html;
}

function addLog(msg, type = "normal") {
    const logBox = document.getElementById('log');
    const entry = document.createElement('div');
    entry.className = `log-entry ${type}`;
    entry.innerHTML = `[${new Date().toLocaleTimeString('zh-TW', { hour12: false })}] ${msg}`;
    logBox.prepend(entry);
    if (logBox.children.length > 50) logBox.removeChild(logBox.lastChild);
}

// 依目前所在地圖重設頂部「當前狀態」列（切換地圖、渡劫結束後呼叫）
function refreshCombatStatusText() {
    const el = document.getElementById('combat-status');
    if (player.currentMapIsSafe) {
        el.innerText = `當前狀態：在 ${player.currentMap.name} 靜修 (安全區)`;
        el.style.color = '#38bdf8';
    } else {
        el.innerText = `當前狀態：在 ${player.currentMap.name} 探索中...`;
        el.style.color = '#fb923c';
    }
}

function closeModal(id) { document.getElementById(id).style.display = 'none'; }

// 把剩餘毫秒數格式化成「3 小時 12 分」，供每日任務／千寶閣倒數使用
function formatCountdown(ms) {
    if (!ms || ms <= 0) return "即將刷新";
    const totalMinutes = Math.floor(ms / 60000);
    const hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;
    if (hours > 0) return `${hours} 小時 ${minutes} 分`;
    if (minutes > 0) return `${minutes} 分`;
    return "不到 1 分鐘";
}

// 抽屜式區塊展開/收合（命運與系統）
function toggleDrawer(id, btn) {
    const body = document.getElementById(id);
    if (!body) return;
    const opened = body.classList.toggle('open');
    if (btn) btn.classList.toggle('open', opened);
}

// --- 依品級批次刪除的共用小工具（背包裝備與僕從共用） ---
function getCheckedBulkQualities(className) {
    return Array.from(document.querySelectorAll('.' + className + ':checked')).map(el => el.value);
}

function toggleAllBulkQualities(className) {
    const boxes = Array.from(document.querySelectorAll('.' + className));
    const allChecked = boxes.length > 0 && boxes.every(b => b.checked);
    boxes.forEach(b => { b.checked = !allChecked; });
}

// 產生「依品級勾選 + 刪除」的工具列
// qualityNames: 品級名稱陣列；counts: { 品級: 數量 }
function renderBulkDeleteBar(title, className, qualityNames, counts, deleteFn, note) {
    const boxes = qualityNames.map(name =>
        `<label><input type="checkbox" class="${className}" value="${name}">
            <span class="quality-${name}">${name}</span> (${counts[name] || 0})</label>`
    ).join("");
    return `
        <div class="bulk-bar">
            <div class="bulk-title">🗑️ ${title}</div>
            <div class="bulk-qualities">${boxes}</div>
            <div class="bulk-actions">
                <button class="sys-btn" onclick="toggleAllBulkQualities('${className}')">全選 / 全不選</button>
                <button style="border-color:#ef4444; color:#ef4444; background:rgba(239,68,68,0.12);" onclick="${deleteFn}()">刪除勾選品級</button>
            </div>
            <div style="font-size:0.75em; color:#6b7280; text-align:center; margin-top:6px;">${note}</div>
        </div>`;
}
