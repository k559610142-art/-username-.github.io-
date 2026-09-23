// 千寶閣（拍賣場）：每 3 小時刷新 5 件商品，售完或刷新前不再變動
// 下方另有常駐的「珍貴物資」區（功德 → 七彩補天石 → 破障丹），由 merit.js 的 renderPreciousSection() 產生
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

// 每個商品欄位先判定是否上架壽元丹（auctionLifePills 的機率），沒抽中才上架裝備
function rollAuctionItem() {
    let pillRand = Math.random();
    let pillCumulative = 0;
    for (let pill of auctionLifePills) {
        pillCumulative += pill.chance;
        if (pillRand < pillCumulative) {
            return {
                id: Date.now() + "_" + Math.floor(Math.random() * 100000),
                kind: "lifePill",
                pillId: pill.id,
                price: pill.coins,
                repPrice: pill.rep,
                sold: false
            };
        }
    }
    return rollAuctionEquip();
}

// 依機率抽出品質，再依玩家境界決定屬性與售價
function rollAuctionEquip() {
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

    // 比照鍛造閣公式（含減傷/閃避/屬性傷害），但四維整體高一成，凸顯拍賣場的價值
    const stats = generateEquipStats(category, qualityObj, Math.floor((player.realmIndex + 1) * 11 * qualityObj.mult));

    return {
        id: Date.now() + "_" + Math.floor(Math.random() * 100000),
        price: Math.floor(800 * qualityObj.mult * (player.realmIndex + 1)),
        sold: false,
        // 橙裝上架時就決定孔數（talisman.js），買家看得到
        equip: ensureSockets({
            id: Date.now() + "_" + Math.floor(Math.random() * 100000),
            name: slotName,
            category: category,
            quality: qualityObj.name,
            element: element,
            stats: stats
        })
    };
}

function buyAuctionItem(itemId) {
    const item = player.auctionItems.find(i => i.id === itemId);
    if (!item || item.sold) return;

    if (item.kind === "lifePill") {
        buyAuctionLifePill(item);
        return;
    }
    if (!hasEquipInventorySpace()) return;

    if (player.coins < item.price) {
        alert(`靈石不足！\n此商品需要 ${item.price.toLocaleString()} 靈石，你目前只有 ${player.coins.toLocaleString()} 靈石。`);
        return;
    }

    player.coins -= item.price;
    item.sold = true;
    player.equipInventory.push(item.equip);   // 孔位在上架時就決定；更新前上架的舊商品沒有孔，也不補

    addLog(`🏺 於千寶閣以 ${item.price.toLocaleString()} 靈石標下【${item.equip.quality}·${item.equip.element}屬性】的【${item.equip.name}】！`, "equip");
    renderAuction();
    updateUI();
}

// 壽元丹：同時支付靈石與聲望，標下後立即服用
function buyAuctionLifePill(item) {
    const pill = auctionLifePills.find(p => p.id === item.pillId);
    if (!pill) return;

    if (player.coins < item.price || (player.reputation || 0) < item.repPrice) {
        alert(`資源不足！\n【${pill.name}】需要 ${item.price.toLocaleString()} 靈石 + ${item.repPrice.toLocaleString()} 聲望。\n你目前有 ${player.coins.toLocaleString()} 靈石、${(player.reputation || 0).toLocaleString()} 聲望。`);
        return;
    }

    player.coins -= item.price;
    player.reputation -= item.repPrice;
    player.lifespan += pill.years;
    item.sold = true;

    addLog(`🏺 於千寶閣標下【${pill.name}】並當場服下，續命 ${pill.years} 年！（剩餘壽元 ${formatLifespan(player.lifespan)} 年）`, "heal");
    renderAuction();
    updateUI();
}

function renderAuctionLifePillCard(item) {
    const pill = auctionLifePills.find(p => p.id === item.pillId);
    if (!pill) return '';
    return `
            <div class="card" style="border-color: ${item.sold ? 'rgba(255,255,255,0.07)' : 'var(--accent)'}; opacity: ${item.sold ? 0.45 : 1};">
                <h3 class="quality-${pill.quality}">⏳ ${pill.name}</h3>
                <p style="font-size: 0.82em; color: #9ca3af;">品質: <span class="quality-${pill.quality}">${pill.quality}</span></p>
                <p style="font-size: 0.78em; color: #4ade80;">效果: 立即續命 +${pill.years} 年</p>
                <p style="font-size: 0.85em; color: var(--accent); margin: 6px 0;">價格：${item.price.toLocaleString()} 靈石 + ${item.repPrice.toLocaleString()} 聲望</p>
                <button class="shop-btn" ${item.sold ? 'disabled' : ''} onclick="buyAuctionItem('${item.id}')">
                    ${item.sold ? '已售出' : '標下並服用'}
                </button>
            </div>`;
}

function renderAuction() {
    const container = document.getElementById('auction-container');
    if (!container) return;

    refreshAuctionIfDue();

    const cards = player.auctionItems.map(item => {
        if (item.kind === "lifePill") return renderAuctionLifePillCard(item);
        const eq = item.equip;
        return `
            <div class="card" style="border-color: ${item.sold ? 'rgba(255,255,255,0.07)' : 'var(--accent)'}; opacity: ${item.sold ? 0.45 : 1};">
                <h3 class="quality-${eq.quality}">${eq.name}</h3>
                <p style="font-size: 0.82em; color: #9ca3af;">品質: <span class="quality-${eq.quality}">${eq.quality}</span> | 屬性: <span class="elem-${eq.element}">${eq.element}</span></p>
                <p style="font-size: 0.78em; color: #facc15;">加成: ${formatEquipStats(eq.stats)}</p>
                ${formatSockets(eq)}
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
        <div class="grid-container">${cards}</div>
        ${renderPreciousSection()}`;
}
