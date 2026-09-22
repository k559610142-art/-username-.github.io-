// 靈獸園彈窗：兌換靈寵（含魅力折扣）、復活、在各等級節點選擇五行技能
// 成長與戰鬥邏輯在 beast-combat.js

function openBeastModal() {
    if (!checkSectJoined()) return;
    document.getElementById('beast-modal').style.display = 'flex';
    renderBeasts();
}

function getBeastDiscountMult() {
    let totalCha = player.stats.cha + getEquipBonus().cha;
    return Math.max(0.5, 1 - (totalCha * 0.001));
}

function renderBeasts() {
    const container = document.getElementById('beast-list-container');
    let discountMult = getBeastDiscountMult();

    container.innerHTML = beastData.map(info => {
        let b = player.beasts.find(x => x.id === info.id);
        let finalCoins = Math.floor(info.costCoins * discountMult);

        if (!b) {
            return `
            <div class="card" style="border-color: #fb923c;">
                <h3 style="color: #fb923c;">${info.name}</h3>
                <p style="font-size: 0.85em; color: #9ca3af;">${info.desc}</p>
                <p style="font-size: 0.8em; color: #facc15;">消耗: ${info.costCore.toLocaleString()} 獸丹 + ${finalCoins.toLocaleString()} 靈石 ${discountMult < 1 ? `(魅力折扣 ${(discountMult*10).toFixed(1)}折)` : ''}</p>
                <button class="sys-btn" onclick="tameBeast('${info.id}')">兌換靈寵 (Lv.1)</button>
            </div>`;
        }

        let need = getLevelExpNeeded(b.level);
        let expText = b.level >= player.level
            ? `<span style="color:#fb923c;">已達人物等級上限</span>`
            : `經驗 ${Math.floor(b.exp).toLocaleString()} / ${need.toLocaleString()}`;
        let status = b.alive
            ? `<span style="color:#4ade80;">協戰中</span>`
            : `<span style="color:#ef4444;">已陣亡</span>`;

        let slots = BEAST_SKILL_LEVELS.map((lv, slot) => {
            let elem = b.skills[slot];
            if (elem) {
                let sk = getBeastSkill(elem, slot);
                return `<div class="beast-skill-slot"><span style="color:${beastElementInfo[elem].color};">[${elem}]</span> Lv${lv}【${sk.name}】<br><span style="color:#9ca3af;">${describeBeastSkill(sk)}</span></div>`;
            }
            if (b.level < lv) {
                return `<div class="beast-skill-slot" style="color:#6b7280;">Lv${lv} 解鎖</div>`;
            }
            let choices = wuxingElements.map(e => {
                let sk = getBeastSkill(e, slot);
                return `<button class="beast-elem-btn" style="border-color:${beastElementInfo[e].color}; color:${beastElementInfo[e].color};"
                    onclick="learnBeastSkill('${b.id}', ${slot}, '${e}')">${e}・${sk.name}<br><span style="font-size:0.9em; color:#9ca3af;">${describeBeastSkill(sk)}</span></button>`;
            }).join('');
            return `<div class="beast-skill-slot" style="border-color: var(--accent);">Lv${lv} 可領悟（擇一，選定不可更改）：<div class="beast-elem-choices">${choices}</div></div>`;
        }).join('');

        return `
            <div class="card" style="border-color: ${b.alive ? '#fb923c' : '#ef4444'};">
                <h3 style="color: #fb923c;">${info.name} <span style="font-size:0.8em; color:var(--accent);">Lv.${b.level}</span></h3>
                <p style="font-size: 0.8em; color: #9ca3af;">${status}｜${expText}</p>
                <p style="font-size: 0.8em; color: #9ca3af;">被動：${info.passive}${b.alive ? '' : '（陣亡中失效）'}</p>
                ${b.alive ? '' : `<button class="sys-btn" style="border-color:#ef4444; color:#ef4444;" onclick="reviveBeast('${b.id}')">復活 (${BEAST_REVIVE_COST_CORE.toLocaleString()} 獸丹)</button>`}
                <div style="text-align:left; font-size:0.78em;">${slots}</div>
            </div>`;
    }).join('');
}

function tameBeast(id) {
    let info = beastData.find(b => b.id === id);
    if (!info || player.beasts.some(b => b.id === id)) return;
    let finalCoins = Math.floor(info.costCoins * getBeastDiscountMult());

    if (player.beastCore >= info.costCore && player.coins >= finalCoins) {
        player.beastCore -= info.costCore;
        player.coins -= finalCoins;
        player.beasts.push(createBeast(id));
        addLog(`🐾 成功兌換靈寵【${info.name}】（Lv.1）！於 Lv${BEAST_SKILL_LEVELS[0]} 可領悟第一招技能。`, "system");
        renderBeasts();
        updateUI();
    } else {
        alert(`資源不足！需要 ${info.costCore.toLocaleString()} 獸丹與 ${finalCoins.toLocaleString()} 靈石。`);
    }
}

function reviveBeast(id) {
    let b = player.beasts.find(x => x.id === id);
    if (!b || b.alive) return;
    if (player.beastCore < BEAST_REVIVE_COST_CORE) {
        alert(`獸丹不足！復活需要 ${BEAST_REVIVE_COST_CORE.toLocaleString()} 獸丹。`);
        return;
    }
    player.beastCore -= BEAST_REVIVE_COST_CORE;
    b.alive = true;
    let info = beastData.find(d => d.id === id);
    addLog(`🐾 耗費 ${BEAST_REVIVE_COST_CORE.toLocaleString()} 獸丹，靈寵【${info.name}】重獲新生！`, "system");
    renderBeasts();
    updateUI();
}

function learnBeastSkill(id, slot, element) {
    let b = player.beasts.find(x => x.id === id);
    if (!b || b.skills[slot] || b.level < BEAST_SKILL_LEVELS[slot]) return;
    let sk = getBeastSkill(element, slot);
    if (!sk) return;
    if (!confirm(`確定讓靈寵領悟【${element}】屬性技能【${sk.name}】嗎？\n${describeBeastSkill(sk)}\n\n選定後無法更改。`)) return;
    b.skills[slot] = element;
    let info = beastData.find(d => d.id === id);
    addLog(`🐾 靈寵【${info.name}】領悟了${element}屬性技能【${sk.name}】！`, "skill");
    renderBeasts();
}
