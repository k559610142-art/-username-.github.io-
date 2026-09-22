// 千寶閣（拍賣場）：每 3 小時刷新 5 件商品，售完或刷新前不再變動
// 解鎖條件（聲望 5000）由 activity.js 統一把關

function openAuctionModal() {
    refreshAuctionIfDue();
    document.getElementById('auction-modal').style.display = 'flex';
    renderAuction();
}

function refreshAuctionIfDue(force) {
    const now = Date.now();
    if (!force && player.auctionRefreshAt && now < player.auctionRefreshAt
        && Array.isArray(player.auctionItems) && player.auctionItems.length > 0) {
        return false;
    }

    player.auctionItems = [];
    for (let i = 0; i < AUCTION_ITEM_COUNT; i++) {
        player.auctionItems.push(rollAuctionItem());
    }
    player.auctionRefreshAt = now + AUCTION_REFRESH_HOURS * 3600 * 1000;

    addLog(`🏺 千寶閣已上架 ${AUCTION_ITEM_COUNT} 件新商品！`, "system");
    return true;
}

// 依機率抽出品質，再依玩家境界決定屬性與售價
function rollAuctionItem() {
    let rand = Math.random();
    let cumulative = 0;
    let qualityName = auctionQualityOdds[auctionQualityOdds.length - 1].quality;
    for (let odd of auctionQualityOdds) {
        cumulative += odd.chance;
        if (rand <= cumulative) { qualityName = odd.quality; break; }
    }
    const qualityObj = equipQualities.find(q => q.name === qualityName);

    // 只從可鍛造部位中挑選（神器不在拍賣場流通）
    const slots = Object.keys(equipTypes).filter(name => !NON_FORGEABLE_SLOTS.includes(name));
    const slotName = slots[Math.floor(Math.random() * slots.length)];
    const category = equipTypes[slotName];
    const element = wuxingElements[Math.floor(Math.random() * wuxingElements.length)];

    // 比照鍛造閣公式，但整體高一成，凸顯拍賣場的價值
    const baseBonus = Math.floor((player.realmIndex + 1) * 11 * qualityObj.mult);
    const stats = { str: 0, con: 0, int: 0, spr: 0, cha: 0 };
    if (category === 'weapon') { stats.str = baseBonus; stats.spr = baseBonus; }
    else if (category === 'armor') { stats.con = baseBonus * 2; }
    else { stats.int = baseBonus; stats.spr = baseBonus; stats.cha = Math.floor(baseBonus / 2); }

    return {
        id: Date.now() + "_" + Math.floor(Math.random() * 100000),
        price: Math.floor(800 * qualityObj.mult * (player.realmIndex + 1)),
        sold: false,
        equip: {
            id: Date.now() + "_" + Math.floor(Math.random() * 100000),
            name: slotName,
            category: category,
            quality: qualityObj.name,
            element: element,
            stats: stats
        }
    };
}

function buyAuctionItem(itemId) {
    const item = player.auctionItems.find(i => i.id === itemId);
    if (!item || item.sold) return;

    if (player.coins < item.price) {
        alert(`靈石不足！\n此商品需要 ${item.price.toLocaleString()} 靈石，你目前只有 ${player.coins.toLocaleString()} 靈石。`);
        return;
    }

    player.coins -= item.price;
    item.sold = true;
    player.equipInventory.push(item.equip);

    addLog(`🏺 於千寶閣以 ${item.price.toLocaleString()} 靈石標下【${item.equip.quality}·${item.equip.element}屬性】的【${item.equip.name}】！`, "equip");
    renderAuction();
    updateUI();
}

function renderAuction() {
    const container = document.getElementById('auction-container');
    if (!container) return;

    refreshAuctionIfDue();

    const cards = player.auctionItems.map(item => {
        const eq = item.equip;
        return `
            <div class="card" style="border-color: ${item.sold ? 'rgba(255,255,255,0.07)' : 'var(--accent)'}; opacity: ${item.sold ? 0.45 : 1};">
                <h3 class="quality-${eq.quality}">${eq.name}</h3>
                <p style="font-size: 0.82em; color: #9ca3af;">品質: <span class="quality-${eq.quality}">${eq.quality}</span> | 屬性: <span class="elem-${eq.element}">${eq.element}</span></p>
                <p style="font-size: 0.78em; color: #facc15;">加成: 力量+${eq.stats.str}, 體質+${eq.stats.con}, 悟性+${eq.stats.int}, 靈力+${eq.stats.spr}, 魅力+${eq.stats.cha}</p>
                <p style="font-size: 0.85em; color: var(--accent); margin: 6px 0;">價格：${item.price.toLocaleString()} 靈石</p>
                <button class="shop-btn" ${item.sold ? 'disabled' : ''} onclick="buyAuctionItem('${item.id}')">
                    ${item.sold ? '已售出' : '標下'}
                </button>
            </div>`;
    }).join("");

    container.innerHTML = `
        <div style="display: flex; flex-wrap: wrap; justify-content: center; gap: 8px 20px; margin-bottom: 14px; font-size: 0.88em;">
            <span style="color: #9ca3af;">每 ${AUCTION_REFRESH_HOURS} 小時上架 ${AUCTION_ITEM_COUNT} 件商品</span>
            <span style="color: var(--accent);">下次上架：${formatCountdown(player.auctionRefreshAt - Date.now())}</span>
        </div>
        <div class="grid-container">${cards}</div>`;
}
