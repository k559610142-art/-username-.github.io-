// 靈寶閣彈窗：宗門代表裝備 / 禁術的購買（可用靈石或聲望）

function openLingbaoShopModal() {
    if (!checkSectJoined()) return;
    document.getElementById('lingbao-shop-modal').style.display = 'flex';
    renderLingbaoShopUI();
}

function renderLingbaoShopUI() {
    const container = document.getElementById('lingbao-shop-container');
    container.innerHTML = "";

    lingbaoShopItems.forEach(item => {
        let isOwnedSkill = item.type === "skill" && player.learnedSkills && player.learnedSkills.some(s => s.name === item.skillData.name);

        container.innerHTML += `
            <div class="card" style="border-color: var(--reputation-color);">
                <h3 style="color: var(--reputation-color);">${item.name}</h3>
                <p style="font-size: 0.85em; color: #9ca3af;">${item.desc}</p>
                <p style="font-size: 0.85em; color: #facc15;">靈石: ${item.coins} | 聲望: ${item.rep}</p>
                <div style="display: flex; gap: 8px; margin-top: 10px;">
                    <button class="shop-btn" ${isOwnedSkill ? 'disabled' : ''} onclick="buyLingbaoItem('${item.id}', 'coins')">${isOwnedSkill ? '已領悟' : '靈石購買'}</button>
                    <button class="rep-btn" ${isOwnedSkill ? 'disabled' : ''} onclick="buyLingbaoItem('${item.id}', 'rep')">${isOwnedSkill ? '已領悟' : '聲望購買'}</button>
                </div>
            </div>
        `;
    });
}

function buyLingbaoItem(itemId, payType) {
    let item = lingbaoShopItems.find(i => i.id === itemId);
    if (!item) return;

    if (payType === 'coins') {
        if (player.coins < item.coins) { alert("靈石不足！"); return; }
        player.coins -= item.coins;
    } else {
        if ((player.reputation || 0) < item.rep) { alert("聲望不足！聲望可透過打怪獲得。"); return; }
        player.reputation -= item.rep;
    }

    if (item.type === 'equip') {
        let newEquip = {
            id: Date.now() + "_" + Math.floor(Math.random() * 1000),
            name: item.itemData.name,
            category: item.itemData.category,
            quality: item.itemData.quality,
            element: item.itemData.element,
            stats: item.itemData.stats
        };
        player.equipInventory.push(newEquip);
        addLog(`💎 於靈寶閣購買獲得宗門代表裝備：【${item.name}】！`, "equip");
    } else if (item.type === 'skill') {
        if (!player.learnedSkills) player.learnedSkills = [];
        player.learnedSkills.push(item.skillData);
        addLog(`📚 於靈寶閣購買並領悟了宗門最高絕學：【${item.skillData.name}】！`, "skill");
    }

    updateUI();
    renderLingbaoShopUI();
}
