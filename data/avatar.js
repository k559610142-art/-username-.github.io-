// 人物頭像更換（設定見 config-avatars.js）
// player.avatarId：目前使用的頭像 id（null = 依性別使用預設的韓立／南宮婉）
// player.unlockedAvatars：已解鎖的頭像 id；達成條件時自動加入並永久保留（轉世不會失去）

// 目前應顯示的頭像（洞府頭像框、戰鬥實況共用）
function getPlayerAvatar() {
    let chosen = avatarList.find(a => a.id === player.avatarId);
    if (chosen && isAvatarUnlocked(chosen)) return chosen;
    return avatarList.find(a => a.id === (player.gender === 'female' ? 'female' : 'male'));
}

function isAvatarUnlocked(av) {
    return !av.unlock || (player.unlockedAvatars || []).includes(av.id);
}

// 解鎖條件是否已達成，以及進度文字（例：「境界達【金丹】（目前 築基）」）
function checkAvatarCondition(unlock) {
    let v = unlock.value;
    switch (unlock.type) {
        case "realm":       return { ok: player.realmIndex >= v, text: `境界達【${realms[v]}】`, now: realms[player.realmIndex] };
        case "level":       return { ok: player.level >= v, text: `人物等級 Lv.${v.toLocaleString()}`, now: `Lv.${player.level.toLocaleString()}` };
        case "reputation":  return { ok: (player.reputation || 0) >= v, text: `聲望達 ${v.toLocaleString()}`, now: (player.reputation || 0).toLocaleString() };
        case "tribulation": return { ok: (player.tribulationCount || 0) >= v, text: `累計渡劫成功 ${v} 次`, now: `${player.tribulationCount || 0} 次` };
        default:            return { ok: false, text: "未知條件", now: "" };
    }
}

// 由 ui.js 的 updateUI() 呼叫：達成條件的頭像自動解鎖（只在新解鎖時寫一筆日誌）
function checkAvatarUnlocks() {
    if (!Array.isArray(player.unlockedAvatars)) player.unlockedAvatars = [];
    avatarList.forEach(av => {
        if (!av.unlock || player.unlockedAvatars.includes(av.id)) return;
        if (checkAvatarCondition(av.unlock).ok) {
            player.unlockedAvatars.push(av.id);
            addLog(`🎭 解鎖新頭像【${av.name}】！點洞府左上的頭像即可更換。`, "level-up");
        }
    });
}

function openAvatarModal() {
    checkAvatarUnlocks();
    renderAvatarModal();
    document.getElementById('avatar-modal').style.display = 'flex';
}

function renderAvatarModal() {
    const container = document.getElementById('avatar-list');
    if (!container) return;
    const current = getPlayerAvatar();
    const unlockedCount = avatarList.filter(isAvatarUnlocked).length;
    document.getElementById('avatar-count').innerText = `已解鎖 ${unlockedCount} / ${avatarList.length}`;

    container.innerHTML = avatarList.map(av => {
        let unlocked = isAvatarUnlocked(av);
        let inUse = current && current.id === av.id;
        let status;
        if (inUse) status = `<span class="avatar-status in-use">使用中</span>`;
        else if (unlocked) status = `<span class="avatar-status">點擊更換</span>`;
        else {
            let c = checkAvatarCondition(av.unlock);
            status = `<span class="avatar-status locked">🔒 ${c.text}<br><small>目前：${c.now}</small></span>`;
        }
        return `
            <button class="avatar-card ${inUse ? 'in-use' : ''} ${unlocked ? '' : 'locked'}" ${unlocked ? `onclick="selectAvatar('${av.id}')"` : 'disabled'}>
                <img src="${av.img}" alt="${av.name}" style="object-position: ${av.pos};">
                <span class="avatar-name">${av.name}</span>
                ${status}
            </button>`;
    }).join("");
}

function selectAvatar(id) {
    let av = avatarList.find(a => a.id === id);
    if (!av || !isAvatarUnlocked(av)) return;
    player.avatarId = id;
    addLog(`🎭 更換頭像為【${av.name}】。`, "system");
    renderAvatarModal();
    updateUI();
    saveLocal();
}
