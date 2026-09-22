// 僕從小屋彈窗：列表渲染、指派/召回、解僱

function openServantModal() {
    if (!checkSectJoined()) return;
    document.getElementById('servant-modal').style.display = 'flex';
    renderServants();
}

function renderServants() {
    const container = document.getElementById('servant-list-container');
    container.innerHTML = "";

    if (player.servants.length === 0) {
        container.innerHTML = `<div style="grid-column: 1 / -1; text-align: center; color: #6b7280; padding: 20px;">您目前沒有僕從，去野外戰鬥拯救受困修士吧！</div>`;
        return;
    }

    if (!player.assignedServantIds) player.assignedServantIds = [];

    player.servants.forEach(s => {
        let isAssigned = player.assignedServantIds.includes(s.id);
        container.innerHTML += `
            <div class="card" style="border-color: var(--servant-color);">
                <h3 class="quality-${s.quality}">${s.name}</h3>
                <p style="font-size: 0.85em; margin: 5px 0; color:#9ca3af;">品質：<span class="quality-${s.quality}">${s.quality}</span></p>
                <p style="font-size: 0.85em; color: #facc15; margin-bottom: 10px;">任務效率：x${s.mult}</p>
                <button class="sys-btn" onclick="assignServant('${s.id}')">${isAssigned ? '召回僕從' : '指派做任務'}</button>
                <button style="border-color: #ef4444; color: #ef4444; margin-top: 5px; background: rgba(239,68,68,0.1);" onclick="dismissServant('${s.id}')">解僱僕從</button>
            </div>`;
    });
}

function assignServant(servantId) {
    if (!player.assignedServantIds) player.assignedServantIds = [];

    let index = player.assignedServantIds.indexOf(servantId);
    if (index > -1) {
        player.assignedServantIds.splice(index, 1);
        addLog(`召回了任務僕從。`, "system");
    } else {
        if (player.assignedServantIds.length >= 3) {
            alert("最多只能指派 3 名僕從同時執行任務！");
            return;
        }
        player.assignedServantIds.push(servantId);
        let s = player.servants.find(serv => serv.id === servantId);
        addLog(`指派僕從【${s.name}】負責代勞宗門任務！(${player.assignedServantIds.length}/3)`, "servant");
    }
    renderServants();
    updateQuestUI();
}

function dismissServant(servantId) {
    if (!confirm("確定要解僱此僕從嗎？")) return;
    if (player.assignedServantIds) {
        let index = player.assignedServantIds.indexOf(servantId);
        if (index > -1) player.assignedServantIds.splice(index, 1);
    }
    player.servants = player.servants.filter(s => s.id !== servantId);
    addLog(`解僱了僕從。`, "system");
    renderServants();
    updateQuestUI();
}
