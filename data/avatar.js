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
        case "coins":       return { ok: player.coins >= v, text: `${v.toLocaleString()} 靈石解鎖`, now: `${player.coins.toLocaleString()} 靈石` };
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
        if (av.unlock.type === "coins") return;   // 靈石解鎖要玩家自己購買（buyAvatar），不自動解鎖
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
        let buyable = !unlocked && av.unlock.type === "coins";
        let status, action;
        if (inUse) { status = `<span class="avatar-status in-use">使用中</span>`; action = `onclick="selectAvatar('${av.id}')"`; }
        else if (unlocked) { status = `<span class="avatar-status">點擊更換</span>`; action = `onclick="selectAvatar('${av.id}')"`; }
        else if (buyable) {
            let enough = player.coins >= av.unlock.value;
            status = `<span class="avatar-status ${enough ? 'buyable' : 'locked'}">💰 ${av.unlock.value.toLocaleString()} 靈石解鎖${enough ? '' : '<br><small>靈石不足</small>'}</span>`;
            action = `onclick="buyAvatar('${av.id}')"`;
        } else {
            let c = checkAvatarCondition(av.unlock);
            status = `<span class="avatar-status locked">🔒 ${c.text}<br><small>目前：${c.now}</small></span>`;
            action = 'disabled';
        }
        return `
            <button class="avatar-card ${inUse ? 'in-use' : ''} ${unlocked ? '' : 'locked'} ${buyable ? 'buyable' : ''}" ${action}>
                <img src="${av.img}" alt="${av.name}" style="object-position: ${av.pos};">
                <span class="avatar-name">${av.name}</span>
                ${status}
            </button>`;
    }).join("");
}

// 花靈石解鎖頭像（unlock.type === "coins"）：扣款、永久解鎖並立即換上
function buyAvatar(id) {
    let av = avatarList.find(a => a.id === id);
    if (!av || isAvatarUnlocked(av) || !av.unlock || av.unlock.type !== "coins") return;
    let cost = av.unlock.value;
    if (player.coins < cost) {
        alert(`靈石不足！解鎖頭像【${av.name}】需要 ${cost.toLocaleString()} 靈石（目前 ${player.coins.toLocaleString()}）。`);
        return;
    }
    if (!confirm(`確定花費 ${cost.toLocaleString()} 靈石解鎖頭像【${av.name}】嗎？\n解鎖後永久可用，轉世也不會失去。`)) return;

    player.coins -= cost;
    if (!Array.isArray(player.unlockedAvatars)) player.unlockedAvatars = [];
    player.unlockedAvatars.push(av.id);
    addLog(`🎭 花費 ${cost.toLocaleString()} 靈石解鎖頭像【${av.name}】！`, "level-up");
    selectAvatar(av.id);   // 解鎖後直接換上（內含重繪、updateUI 與存檔）
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
