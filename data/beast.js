// 靈獸園彈窗：兌換靈寵（含魅力折扣）、復活、出戰／召回休息（維持費）、在各等級節點選擇五行技能
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
                <p style="font-size: 0.8em; color: #facc15;">消耗: ${info.costCore.toWan()} 獸丹 + ${finalCoins.toWan()} 靈石 ${discountMult < 1 ? `(魅力折扣 ${(discountMult*10).toFixed(1)}折)` : ''}</p>
                <button class="sys-btn" onclick="tameBeast('${info.id}')">兌換靈寵 (Lv.1)</button>
            </div>`;
        }

        let need = getLevelExpNeeded(b.level);
        let expText = b.level >= player.level
            ? `<span style="color:#fb923c;">已達人物等級上限</span>`
            : `經驗 ${Math.floor(b.exp).toWan()} / ${need.toWan()}`;
        let active = isBeastActive(b);
        let status = !b.alive
            ? `<span style="color:#ef4444;">已陣亡</span>`
            : active ? `<span style="color:#4ade80;">協戰中</span>` : `<span style="color:#9ca3af;">休息中</span>`;
        let upkeep = getBeastUpkeep(b.level);
        let upkeepText = `維持費：每 ${BEAST_UPKEEP_INTERVAL} 秒 ${upkeep.coins.toWan()} 靈石＋${upkeep.core.toWan()} 獸丹`
            + (active ? '' : '（休息中不收取）');
        let toggleBtn = !b.alive ? ''
            : active ? `<button class="sys-btn" style="border-color:#9ca3af; color:#9ca3af;" onclick="toggleBeastActive('${b.id}')">召回休息</button>`
            : `<button class="sys-btn" style="border-color:#4ade80; color:#4ade80;" onclick="toggleBeastActive('${b.id}')">出戰</button>`;

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
            <div class="card" style="border-color: ${!b.alive ? '#ef4444' : active ? '#fb923c' : '#6b7280'};">
                <h3 style="color: #fb923c;">${info.name} <span style="font-size:0.8em; color:var(--accent);">Lv.${b.level}</span></h3>
                <p style="font-size: 0.8em; color: #9ca3af;">${status}｜${expText}</p>
                <p style="font-size: 0.8em; color: #9ca3af;">被動：${info.passive}${!b.alive ? '（陣亡中失效）' : active ? '' : '（休息中失效）'}</p>
                <p style="font-size: 0.8em; color: #facc15;">${upkeepText}</p>
                ${toggleBtn}
                ${b.alive ? '' : `<button class="sys-btn" style="border-color:#ef4444; color:#ef4444;" onclick="reviveBeast('${b.id}')">復活 (${BEAST_REVIVE_COST_CORE.toWan()} 獸丹)</button>`}
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
        let upkeep = getBeastUpkeep(1);
        addLog(`🐾 成功兌換靈寵【${info.name}】（Lv.1）！於 Lv${BEAST_SKILL_LEVELS[0]} 可領悟第一招技能。出戰中每 ${BEAST_UPKEEP_INTERVAL} 秒消耗 ${upkeep.coins.toWan()} 靈石＋${upkeep.core.toWan()} 獸丹。`, "system");
        renderBeasts();
        updateUI();
    } else {
        alert(`資源不足！需要 ${info.costCore.toWan()} 獸丹與 ${finalCoins.toWan()} 靈石。`);
    }
}

function reviveBeast(id) {
    let b = player.beasts.find(x => x.id === id);
    if (!b || b.alive) return;
    if (player.beastCore < BEAST_REVIVE_COST_CORE) {
        alert(`獸丹不足！復活需要 ${BEAST_REVIVE_COST_CORE.toWan()} 獸丹。`);
        return;
    }
    player.beastCore -= BEAST_REVIVE_COST_CORE;
    b.alive = true;
    let info = beastData.find(d => d.id === id);
    addLog(`🐾 耗費 ${BEAST_REVIVE_COST_CORE.toWan()} 獸丹，靈寵【${info.name}】重獲新生！`, "system");
    renderBeasts();
    updateUI();
}

// 出戰／召回休息：休息中不收維持費，也不提供被動、協助與經驗（維持費計時暫停，再出戰時接續）
function toggleBeastActive(id) {
    let b = player.beasts.find(x => x.id === id);
    if (!b || !b.alive) return;
    if (!isBeastActive(b)) {
        let cost = getBeastUpkeep(b.level);
        if (player.coins < cost.coins || player.beastCore < cost.core) {
            alert(`資源不足！出戰需能支付維持費：每 ${BEAST_UPKEEP_INTERVAL} 秒 ${cost.coins.toWan()} 靈石＋${cost.core.toWan()} 獸丹。`);
            return;
        }
        b.active = true;
        addLog(`🐾 靈寵【${getBeastName(b)}】出戰！每 ${BEAST_UPKEEP_INTERVAL} 秒消耗 ${cost.coins.toWan()} 靈石＋${cost.core.toWan()} 獸丹。`, "system");
    } else {
        b.active = false;
        addLog(`🐾 靈寵【${getBeastName(b)}】已召回靈獸園休息，暫停收取維持費。`, "system");
    }
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
