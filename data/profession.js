// 職業（武器流派，ARCHITECTURE.md 第 37 節）：主修職業、熟練度 10 階、被動、職業技能；設定在 config-profession.js
// 存檔欄位：player.profession（主修 id 或 null）、player.proficiency（各職業熟練度）、player.profSwitched（是否已免費選過）

function getProfession(id) {
    return professions.find(p => p.id === id) || null;
}

// 熟練度 → 階（1～10）
function getProfRank(id) {
    let exp = (player.proficiency || {})[id] || 0;
    let rank = 1;
    PROF_RANK_EXP.forEach((need, i) => { if (exp >= need) rank = i + 1; });
    return rank;
}

function getProfRankName(id) {
    let p = getProfession(id);
    return p ? p.ranks[getProfRank(id) - 1] : '';
}

// 主修職業的被動（併入 gear.js 的 getBonusTotals）
function getProfessionPassive() {
    let p = getProfession(player.profession);
    if (!p) return {};
    return { [p.passive.key]: p.passive.per * getProfRank(p.id) };
}

// 主修武器（該部位那一件）的四維加成倍率；stats.js 的 getEquipBonus 使用
function getProfWeaponMult(slot) {
    let p = getProfession(player.profession);
    if (!p || p.slot !== slot) return 1;
    return 1 + PROF_WEAPON_BONUS[getProfRank(p.id) - 1];
}

// 累積熟練度（只加在主修）；跨階時寫日誌
function gainProficiency(amount) {
    let p = getProfession(player.profession);
    if (!p || amount <= 0) return;
    if (!player.proficiency) player.proficiency = {};
    let before = getProfRank(p.id);
    player.proficiency[p.id] = (player.proficiency[p.id] || 0) + Math.floor(amount);
    let after = getProfRank(p.id);
    if (after > before) {
        addLog(`${p.icon} 【${p.name}】熟練度突破，晉升「${p.ranks[after - 1]}」！`
            + (p.skills.some(s => s.rank === after) ? `領悟職業技能【${p.skills.find(s => s.rank === after).name}】！` : ''), "level-up");
        checkTitleUnlocks();
    }
}

// 野外擊殺的熟練度：每隻 × 地圖分類倍率
function gainKillProficiency(kills) {
    let cat = getMapCategoryIndex(player.currentMap.name);
    gainProficiency(kills * (PROF_MAP_MULT[cat] || 1));
}

// 每回合出手後：已解鎖的職業技能由高階往低階各擲一次，發動一招就停（castProcSkill 在 artifact.js）
function professionSkillTurn(targets, tags) {
    let p = getProfession(player.profession);
    if (!p) return;
    let rank = getProfRank(p.id);
    let unlocked = p.skills.filter(s => rank >= s.rank).sort((a, b) => b.rank - a.rank);
    for (let sk of unlocked) {
        if (Math.random() < sk.chance) { castProcSkill(sk, targets, tags); return; }
    }
}

// 道號旁顯示的職業階級（例「劍狂」）
function formatProfessionTag() {
    let p = getProfession(player.profession);
    return p ? `${p.icon}${getProfRankName(p.id)}` : '';
}

function chooseProfession(id) {
    let p = getProfession(id);
    if (!p || player.profession === id) return;
    let paid = !!player.profSwitched;
    if (paid) {
        if (player.coins < PROFESSION_SWITCH_COST) { alert(`改修職業需要 ${PROFESSION_SWITCH_COST.toLocaleString()} 靈石！`); return; }
        if (!confirm(`花費 ${PROFESSION_SWITCH_COST.toLocaleString()} 靈石改修【${p.name}】？\n原職業的熟練度會保留，換回來不會歸零。`)) return;
        player.coins -= PROFESSION_SWITCH_COST;
    } else if (!confirm(`選擇【${p.name}】作為主修職業？（第一次免費，之後改修每次 ${PROFESSION_SWITCH_COST.toLocaleString()} 靈石）`)) return;
    player.profession = id;
    player.profSwitched = true;
    addLog(`${p.icon} 你開始主修【${p.name}】，目前階級「${getProfRankName(id)}」。`, "level-up");
    renderCodexModal();
    updateUI();
}

// 天磯錄「職業」分頁
function renderProfessionTab() {
    let rows = professions.map(p => {
        let exp = (player.proficiency || {})[p.id] || 0;
        let rank = getProfRank(p.id);
        let next = PROF_RANK_EXP[rank];   // 下一階門檻（滿階為 undefined）
        let isMain = player.profession === p.id;
        let skills = p.skills.map(s => `<div style="color: ${rank >= s.rank ? '#a5f3fc' : '#6b7280'};">第 ${s.rank} 階【${s.name}】${Math.round(s.chance * 100)}% 機率自動發動</div>`).join('');
        return `
            <div class="card" style="border-color: ${isMain ? 'var(--accent)' : 'rgba(255,255,255,0.08)'}; text-align: left;">
                <h3 style="text-align: center; color: ${isMain ? 'var(--accent)' : '#fff'};">${p.icon} ${p.name}（${p.slot}）${isMain ? '・主修中' : ''}</h3>
                <p style="font-size: 0.85em;">階級：<b>${p.ranks[rank - 1]}</b>（第 ${rank} 階）｜熟練度 ${exp.toLocaleString()}${next ? ` / ${next.toLocaleString()}` : '（已滿階）'}</p>
                <p style="font-size: 0.8em; color: #9ca3af;">主修時：${p.slot}的四維 +${Math.round(PROF_WEAPON_BONUS[rank - 1] * 100)}%、${p.passive.label} +${+(p.passive.per * rank * 100).toFixed(1)}%</p>
                <div style="font-size: 0.78em; margin: 4px 0;">${skills}</div>
                <p style="font-size: 0.72em; color: #6b7280;">階級：${p.ranks.join(' → ')}</p>
                <button class="sys-btn" ${isMain ? 'disabled' : ''} onclick="chooseProfession('${p.id}')">${isMain ? '主修中' : (player.profSwitched ? `改修（${PROFESSION_SWITCH_COST.toLocaleString()} 靈石）` : '選為主修（免費）')}</button>
            </div>`;
    }).join('');
    return `<p style="color: #9ca3af; font-size: 0.82em; text-align: center;">只有主修職業會累積熟練度：野外每擊殺一隻 +1 × 地圖倍率（野外 1、開放世界 2、上古禁區 3、諸天戰場 4），懸賞伏誅 +${PROF_BOUNTY_GAIN}，離線 ×${PROF_OFFLINE_RATE}。</p>
            <div class="grid-container">${rows}</div>`;
}
