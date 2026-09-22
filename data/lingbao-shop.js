// 靈寶閣彈窗：三個階段宗門各自的戰略級寶物與武學（同時消耗靈石＋聲望，唯一性、售出不補貨）
// 商品與價格見 config-lingbao.js

function openLingbaoShopModal() {
    if (!checkSectJoined()) return;
    document.getElementById('lingbao-shop-modal').style.display = 'flex';
    renderLingbaoShopUI();
}

function renderLingbaoShopUI() {
    const container = document.getElementById('lingbao-shop-container');
    let sold = player.lingbaoSold || [];

    container.innerHTML = [1, 2, 3].map(tier => {
        let cost = lingbaoTierCosts[tier];
        let sectName = player.sectSkills[tier];
        let header = sectName
            ? `<span style="color:#4ade80;">（已拜入：${sectName}）</span>`
            : `<span style="color:#ef4444;">（需拜入${SECT_TIER_NAMES[tier]}宗門才能兌換）</span>`;

        let cards = lingbaoShopItems.filter(i => i.tier === tier).map(item => {
            let isSold = sold.includes(item.id);
            let detail = item.type === 'equip'
                ? `<p style="font-size: 0.8em; color: #facc15;">【${item.itemData.name}】<span class="elem-${item.itemData.element}">${item.itemData.element}</span>｜${formatEquipStats(item.itemData.stats)}</p>`
                : `<p style="font-size: 0.8em; color: #c084fc;">耗魔 ${item.skillData.mpCost}</p>`;
            let btnText = isSold ? '已兌換（不再補貨）' : (sectName ? '兌換' : '未拜入此階段宗門');
            return `
                <div class="card" style="border-color: var(--reputation-color); opacity: ${isSold || !sectName ? 0.5 : 1};">
                    <h3 style="color: var(--reputation-color);">${item.type === 'skill' ? '📜' : '💎'} ${item.name}</h3>
                    <p style="font-size: 0.85em; color: #9ca3af;">${item.desc}</p>
                    ${detail}
                    <button class="rep-btn" ${isSold || !sectName ? 'disabled' : ''} onclick="buyLingbaoItem('${item.id}')">${btnText}</button>
                </div>`;
        }).join('');

        return `<div class="map-category">
            <h4 style="color: var(--accent); margin-bottom: 6px;">${SECT_TIER_NAMES[tier]}宗門寶物 ${header}</h4>
            <p style="font-size: 0.82em; color: #facc15; margin: 0 0 10px;">每件兌換：${cost.coins.toLocaleString()} 靈石 ＋ ${cost.rep.toLocaleString()} 聲望</p>
            <div class="grid-container">${cards}</div>
        </div>`;
    }).join('');
}

function buyLingbaoItem(itemId) {
    let item = lingbaoShopItems.find(i => i.id === itemId);
    if (!item) return;
    if (!player.lingbaoSold) player.lingbaoSold = [];
    if (player.lingbaoSold.includes(item.id)) { alert("此寶物已兌換，不會再補貨。"); return; }
    if (!player.sectSkills[item.tier]) {
        alert(`需先拜入${SECT_TIER_NAMES[item.tier]}宗門，才能兌換此階段的寶物。`);
        return;
    }

    let cost = lingbaoTierCosts[item.tier];
    if (player.coins < cost.coins || (player.reputation || 0) < cost.rep) {
        alert(`資源不足！兌換【${item.name}】需要 ${cost.coins.toLocaleString()} 靈石 + ${cost.rep.toLocaleString()} 聲望。\n你目前有 ${player.coins.toLocaleString()} 靈石、${(player.reputation || 0).toLocaleString()} 聲望。`);
        return;
    }
    if (item.type === 'equip' && !hasEquipInventorySpace()) return;
    if (!confirm(`確定以 ${cost.coins.toLocaleString()} 靈石 + ${cost.rep.toLocaleString()} 聲望 兌換【${item.name}】嗎？\n此為唯一性寶物，兌換後不會再補貨。`)) return;

    player.coins -= cost.coins;
    player.reputation -= cost.rep;
    player.lingbaoSold.push(item.id);

    if (item.type === 'equip') {
        player.equipInventory.push({
            id: Date.now() + "_" + Math.random().toString(36).slice(2, 10),
            name: item.itemData.name,
            category: item.itemData.category,
            quality: item.itemData.quality,
            element: item.itemData.element,
            stats: Object.assign({}, item.itemData.stats)
        });
        addLog(`💎 於靈寶閣兌換戰略級寶物：【${item.name}】！已放入背包。`, "equip");
    } else {
        if (!player.learnedSkills) player.learnedSkills = [];
        player.learnedSkills.push(Object.assign({}, item.skillData));
        addLog(`📚 於靈寶閣兌換並領悟了${SECT_TIER_NAMES[item.tier]}宗門武學：【${item.skillData.name}】！`, "skill");
    }

    updateUI();
    renderLingbaoShopUI();
}
