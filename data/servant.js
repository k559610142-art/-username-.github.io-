// 僕從小屋：每位僕從可各自被指派到不同的門派任務，並獨立累積進度
// 僕從資料結構：{ id, name, quality, mult, quest: 任務代號或 null, timer: 進度 }

function openServantModal() {
    if (!checkSectJoined()) return;
    document.getElementById('servant-modal').style.display = 'flex';
    renderServants();
}

function getAssignedServantCount() {
    return player.servants.filter(s => s.quest).length;
}

function renderServants() {
    const container = document.getElementById('servant-list-container');
    container.innerHTML = "";

    if (player.servants.length === 0) {
        container.innerHTML = `<div style="grid-column: 1 / -1; text-align: center; color: #6b7280; padding: 20px;">您目前沒有僕從，去野外戰鬥拯救受困修士吧！</div>`;
        return;
    }

    let tier = getSectTier();
    let assignedCount = getAssignedServantCount();

    container.innerHTML += `<div style="grid-column: 1 / -1; text-align: center; color: var(--accent); font-size: 0.9em;">
        目前派遣中：${assignedCount} / ${MAX_ASSIGNED_SERVANTS} 名（每位僕從可負責不同任務，且不受你所在地點限制）
    </div>`;

    // 依品級一鍵解僱
    let counts = {};
    player.servants.forEach(s => { counts[s.quality] = (counts[s.quality] || 0) + 1; });
    container.innerHTML += renderBulkDeleteBar(
        "一鍵解僱僕從（依品級）",
        "bulk-servant-quality",
        servantQualities.map(q => q.name),
        counts,
        "bulkDismissServants",
        "※ 正在執行任務的僕從一併解僱，其任務會中止"
    );

    player.servants.forEach(s => {
        let options = `<option value="">— 不指派 —</option>` + Object.keys(questData).map(questId => {
            let def = getQuestDef(questId, tier);
            return `<option value="${questId}" ${s.quest === questId ? 'selected' : ''}>${def.icon} ${def.name}（${formatQuestRewards(def)}）</option>`;
        }).join("");

        let percent = Math.floor(((s.timer || 0) / QUEST_REQUIRED_PROGRESS) * 100);
        let statusText = s.quest
            ? `<p style="font-size: 0.8em; color: #4ade80; margin: 6px 0;">執行中・進度 ${percent}%</p>`
            : `<p style="font-size: 0.8em; color: #6b7280; margin: 6px 0;">閒置中</p>`;

        container.innerHTML += `
            <div class="card" style="border-color: var(--servant-color);">
                <h3 class="quality-${s.quality}">${s.name}</h3>
                <p style="font-size: 0.85em; margin: 5px 0; color:#9ca3af;">品質：<span class="quality-${s.quality}">${s.quality}</span></p>
                <p style="font-size: 0.85em; color: #facc15; margin-bottom: 8px;">任務效率：x${s.mult}</p>
                <select onchange="assignServantQuest('${s.id}', this.value)"
                        style="width: 100%; background: #0b0f19; color: #fff; padding: 6px; border-radius: 6px; border: 1px solid var(--panel-border); font-size: 0.82em;">
                    ${options}
                </select>
                ${statusText}
                <button style="border-color: #ef4444; color: #ef4444; background: rgba(239,68,68,0.1);" onclick="dismissServant('${s.id}')">解僱僕從</button>
            </div>`;
    });
}

// 指派（或取消指派）單一僕從的任務
function assignServantQuest(servantId, questId) {
    let servant = player.servants.find(s => s.id === servantId);
    if (!servant) return;

    if (questId) {
        // 從「閒置」變成「執行任務」時才需檢查派遣上限；單純更換任務不受限
        if (!servant.quest && getAssignedServantCount() >= MAX_ASSIGNED_SERVANTS) {
            alert(`最多只能同時派遣 ${MAX_ASSIGNED_SERVANTS} 名僕從執行任務！\n請先將其他僕從設為「不指派」。`);
            renderServants();
            return;
        }
        let def = getQuestDef(questId, getSectTier());
        if (!def) return;

        if (servant.quest !== questId) servant.timer = 0;
        servant.quest = questId;
        addLog(`🤝 指派僕從【${servant.name}】負責【${def.name}】，每次完成可得 ${formatQuestRewards(def)}。`, "servant");
    } else {
        servant.quest = null;
        servant.timer = 0;
        addLog(`🤝 召回了僕從【${servant.name}】，暫停其任務。`, "system");
    }

    renderServants();
    updateQuestUI();
}

// 一鍵解僱：把所有勾選品級的僕從一次遣散
function bulkDismissServants() {
    let selected = getCheckedBulkQualities('bulk-servant-quality');
    if (selected.length === 0) { alert("請先勾選要解僱的品級！"); return; }

    let targets = player.servants.filter(s => selected.includes(s.quality));
    if (targets.length === 0) { alert("沒有符合勾選品級的僕從。"); return; }

    let working = targets.filter(s => s.quest).length;
    let warn = working > 0 ? `\n（其中 ${working} 名正在執行任務，解僱後任務將中止）` : "";
    if (!confirm(`確定要解僱 ${targets.length} 名【${selected.join('、')}】僕從嗎？${warn}\n此操作無法復原。`)) return;

    player.servants = player.servants.filter(s => !selected.includes(s.quality));
    addLog(`🗑️ 一鍵解僱了 ${targets.length} 名僕從（${selected.join('、')}）。`, "system");
    renderServants();
    updateQuestUI();
    updateUI();
}

function dismissServant(servantId) {
    if (!confirm("確定要解僱此僕從嗎？")) return;
    player.servants = player.servants.filter(s => s.id !== servantId);
    addLog(`解僱了僕從。`, "system");
    renderServants();
    updateQuestUI();
}

// 由 combatTick() 每秒呼叫：每位有任務的僕從各自累積進度並結算獎勵
function tickServantQuests() {
    if (!player.servants || player.servants.length === 0) return;

    let tier = getSectTier();
    let anyCompleted = false;

    player.servants.forEach(s => {
        if (!s.quest) return;
        s.timer = (s.timer || 0) + QUEST_PROGRESS_PER_TICK * s.mult;

        while (s.timer >= QUEST_REQUIRED_PROGRESS) {
            s.timer -= QUEST_REQUIRED_PROGRESS;
            let def = getQuestDef(s.quest, tier);
            if (!def) { s.quest = null; break; }
            grantQuestRewards(def);
            addDailyProgress('sectQuest');
            addLog(`${def.icon} 僕從【${s.name}】完成【${def.name}】：獲得 ${formatQuestRewards(def)}`, "servant");
            anyCompleted = true;
        }
    });

    if (anyCompleted) updateUI();
}
