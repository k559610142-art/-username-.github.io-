// 演武學宮門派任務彈窗：依宗門等級顯示任務按鈕、接取/停止任務

function openQuestModal() {
    if (!checkSectJoined()) return;
    if (player.currentMap.name !== '演武學宮' && (!player.assignedServantIds || player.assignedServantIds.length === 0)) {
        alert("你必須移動到【演武學宮】才能管理任務，或先指派僕從協助打工！");
        return;
    }
    document.getElementById('quest-modal').style.display = 'flex';
    renderQuestButtons();
    updateQuestUI();
}

function renderQuestButtons() {
    let tier = getSectTier();
    let container = document.getElementById('quest-buttons-container');
    container.innerHTML = "";

    if (tier === 1) {
        container.innerHTML = `
            <button class="sys-btn" onclick="startQuest('clean')">🧹 打掃清潔 (基礎30秒)</button>
            <button class="sys-btn" onclick="startQuest('plant')">🌱 種植靈草 (基礎30秒)</button>
            <button class="sys-btn" onclick="startQuest('book')">📚 整理武學秘典 (基礎30秒)</button>
        `;
    } else if (tier === 2) {
        container.innerHTML = `
            <button class="sys-btn" onclick="startQuest('clean')">🥩 餵養靈獸 (基礎30秒)</button>
            <button class="sys-btn" onclick="startQuest('plant')">🌱 種植靈草 (基礎30秒)</button>
            <button class="sys-btn" onclick="startQuest('book')">📚 整理武學秘典 (基礎30秒)</button>
        `;
    } else {
        container.innerHTML = `
            <button class="sys-btn" onclick="startQuest('clean')">🐉 餵養仙獸 (基礎30秒)</button>
            <button class="sys-btn" onclick="startQuest('plant')">🌱 種植靈草 (基礎30秒)</button>
            <button class="sys-btn" onclick="startQuest('book')">📚 整理武學秘典 (基礎30秒)</button>
        `;
    }
}

function startQuest(type) {
    player.activeQuest = type;
    player.questTimer = 0;
    updateQuestUI();
    addLog("接取了新的宗門任務。", "quest");
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

    if (player.activeQuest) {
        let names = { clean: '打掃/餵養', plant: '種植靈草', book: '整理秘典' };
        display.innerText = `當前任務：${names[player.activeQuest] || player.activeQuest}`;
    } else {
        display.innerText = "當前未接取任務";
    }

    if (player.assignedServantIds && player.assignedServantIds.length > 0) {
        let servantNamesText = player.assignedServantIds.map(id => {
            let s = player.servants.find(serv => serv.id === id);
            return s ? s.name : "";
        }).join(", ");
        servantDisp.innerText = `派遣僕從：${servantNamesText}`;
    } else {
        servantDisp.innerText = "派遣僕從：無";
    }
}
