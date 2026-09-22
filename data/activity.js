// 活動選單：統一處理各活動的解鎖條件（聲望 + 境界）與開啟

// 回傳未達成的條件說明；已解鎖則回傳 null
function getActivityLockReason(act) {
    if ((player.reputation || 0) < act.minRep) {
        return `聲望不足（需 ${act.minRep.toLocaleString()}，目前 ${(player.reputation || 0).toLocaleString()}）`;
    }
    if (player.realmIndex < act.minRealmIndex) {
        return `境界不足（需【${realms[act.minRealmIndex]}】以上）`;
    }
    return null;
}

// 由 updateUI() 每秒呼叫，讓解鎖狀態即時反映聲望與境界的變化
function renderActivityList() {
    const container = document.getElementById('activity-list');
    if (!container) return;

    container.innerHTML = activityData.map(act => {
        const lock = getActivityLockReason(act);
        const locked = lock !== null;
        return `
            <button class="sys-btn" style="border-color: ${locked ? 'rgba(255,255,255,0.12)' : 'rgba(34,211,238,0.45)'};
                        color: ${locked ? '#6b7280' : '#22d3ee'}; text-align: left; line-height: 1.5;"
                    onclick="openActivity('${act.id}')">
                ${locked ? '🔒' : act.icon} ${act.name}
                <div style="font-size: 0.72em; color: ${locked ? '#6b7280' : '#9ca3af'}; font-weight: normal;">
                    ${locked ? lock : act.desc}
                </div>
            </button>`;
    }).join("");
}

function openActivity(id) {
    const act = activityData.find(a => a.id === id);
    if (!act) return;

    const lock = getActivityLockReason(act);
    if (lock) {
        alert(`【${act.name}】尚未開啟\n\n${lock}\n\n開啟條件：聲望 ${act.minRep.toLocaleString()}`
            + (act.minRealmIndex > 0 ? `、境界【${realms[act.minRealmIndex]}】以上` : ""));
        return;
    }

    if (!act.implemented) {
        alert(`【${act.name}】\n\n${act.desc}\n\n功能開發中，敬請期待！`);
        return;
    }

    // 已實作的活動交由各自模組開啟
    window[act.openFn]();
}
