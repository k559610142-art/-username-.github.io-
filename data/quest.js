// 宗門門派任務：顯示各任務獎勵、接取/停止玩家自己的任務
// 僕從的任務指派在 servant.js（每位僕從可各自負責不同任務）

// 取得指定任務在目前宗門等級下的定義
function getQuestDef(questId, tier) {
    let quest = questData[questId];
    return quest ? quest[tier] : null;
}

// 將獎勵格式化為「5 靈石、10 獸丹」這類文字
function formatQuestRewards(def) {
    return Object.keys(def.rewards)
        .map(key => `${def.rewards[key]} ${questRewardInfo[key].label}`)
        .join("、");
}

// 實際把獎勵加到 player 身上
function grantQuestRewards(def) {
    for (let key in def.rewards) {
        let field = questRewardInfo[key].field;
        player[field] = (player[field] || 0) + def.rewards[key];
    }
}

function openQuestModal() {
    if (!checkSectJoined()) return;
    if (!isInSect() && !player.servants.some(s => s.quest)) {
        alert("你必須回到【宗門】才能接取任務，或先到「僕從小屋」指派僕從代為執行！");
        return;
    }
    document.getElementById('quest-modal').style.display = 'flex';
    renderQuestButtons();
    updateQuestUI();
}

function renderQuestButtons() {
    let tier = getSectTier();
    let container = document.getElementById('quest-buttons-container');
    let atSect = isInSect();

    let cards = Object.keys(questData).map(questId => {
        let def = getQuestDef(questId, tier);
        let isActive = player.activeQuest === questId;
        let workers = player.servants.filter(s => s.quest === questId);
        let workerText = workers.length > 0
            ? `<p style="font-size:0.78em; color:var(--servant-color); margin:4px 0;">僕從代勞：${workers.map(s => s.name).join("、")}</p>`
            : "";

        return `
            <div class="card" style="text-align: left; border-color: ${isActive ? '#22d3ee' : 'rgba(255,255,255,0.08)'};">
                <h3 style="color: #22d3ee; text-align: center;">${def.icon} ${def.name}</h3>
                <p style="font-size: 0.82em; color: #9ca3af; margin: 4px 0;">耗時：基礎 ${QUEST_REQUIRED_PROGRESS / QUEST_PROGRESS_PER_TICK} 秒／次</p>
                <p style="font-size: 0.85em; color: #4ade80; margin: 4px 0;">獎勵：${formatQuestRewards(def)}</p>
                ${workerText}
                <button class="sys-btn ${isActive ? 'active' : ''}" ${atSect ? '' : 'disabled'} onclick="startQuest('${questId}')">
                    ${isActive ? '✅ 執行中' : (atSect ? '接取任務' : '需在宗門')}
                </button>
            </div>`;
    }).join("");

    container.innerHTML = `<div class="grid-container">${cards}</div>`;
}

function startQuest(questId) {
    if (!isInSect()) {
        alert("你必須待在【宗門】才能親自接取任務！（或指派僕從代為執行）");
        return;
    }
    let def = getQuestDef(questId, getSectTier());
    if (!def) return;

    player.activeQuest = questId;
    player.questTimer = 0;
    renderQuestButtons();
    updateQuestUI();
    addLog(`📜 接取了門派任務【${def.name}】，獎勵：${formatQuestRewards(def)}。`, "quest");
}

function stopQuest() {
    player.activeQuest = null;
    player.questTimer = 0;
    updateQuestUI();
    addLog("中斷了門派任務。", "system");
}

function updateQuestUI() {
    let display = document.getElementById('current-quest-display');
    let servantDisp = document.getElementById('assigned-servant-display');
    if (!display || !servantDisp) return;

    let tier = getSectTier();

    if (player.activeQuest) {
        let def = getQuestDef(player.activeQuest, tier);
        let percent = Math.floor((player.questTimer / QUEST_REQUIRED_PROGRESS) * 100);
        display.innerHTML = def
            ? `當前任務：${def.icon} ${def.name}（進度 ${percent}%｜獎勵 ${formatQuestRewards(def)}）`
            : "當前未接取任務";
    } else {
        display.innerText = "當前未接取任務";
    }

    let workers = player.servants.filter(s => s.quest);
    if (workers.length > 0) {
        servantDisp.innerHTML = `派遣僕從（${workers.length}/${MAX_ASSIGNED_SERVANTS}）：<br>` + workers.map(s => {
            let def = getQuestDef(s.quest, tier);
            let percent = Math.floor(((s.timer || 0) / QUEST_REQUIRED_PROGRESS) * 100);
            return `・${s.name} → ${def ? def.icon + ' ' + def.name : '未知任務'}（效率 x${s.mult}，進度 ${percent}%）`;
        }).join("<br>");
    } else {
        servantDisp.innerText = "派遣僕從：無（可至僕從小屋分別指派）";
    }
}
