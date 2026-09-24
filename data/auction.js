// 千寶閣（拍賣場）：每 3 小時刷新 5 件商品，售完或刷新前不再變動
// 紫／橙商品有機率遇到其他客人搶拍（#auction-bid-modal，設定在 config-daily-quests.js 的 AUCTION_RIVAL_*）
// 下方另有常駐的「珍貴物資」區（功德自動凝結七彩補天石 → 破障丹），由 merit.js 的 renderPreciousSection() 產生
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

// 商品的品質與名稱（搶拍判定、競拍視窗用）
function getAuctionItemInfo(item) {
    if (item.kind === "lifePill") {
        const pill = auctionLifePills.find(p => p.id === item.pillId);
        return { quality: pill ? pill.quality : "白色", name: pill ? pill.name : "壽元丹" };
    }
    return { quality: item.equip.quality, name: `${item.equip.quality}·${item.equip.element}屬性【${item.equip.name}】` };
}

// 付款前的檢查（背包空位、靈石、聲望）；price 為實際成交價（競拍後可能高於底價）
function canPayAuctionItem(item, price) {
    if (item.kind === "lifePill") {
        if (player.coins < price || (player.reputation || 0) < item.repPrice) {
            alert(`資源不足！\n需要 ${price.toLocaleString()} 靈石 + ${item.repPrice.toLocaleString()} 聲望。\n你目前有 ${player.coins.toLocaleString()} 靈石、${(player.reputation || 0).toLocaleString()} 聲望。`);
            return false;
        }
        return true;
    }
    if (!hasEquipInventorySpace()) return false;
    if (player.coins < price) {
        alert(`靈石不足！\n需要 ${price.toLocaleString()} 靈石，你目前只有 ${player.coins.toLocaleString()} 靈石。`);
        return false;
    }
    return true;
}

function buyAuctionItem(itemId) {
    const item = player.auctionItems.find(i => i.id === itemId);
    if (!item || item.sold) return;
    if (!canPayAuctionItem(item, item.price)) return;

    // 搶拍：紫／橙商品第一次按下時擲一次是否有對手（結果存進商品，不會重擲）
    if (item.rival === undefined) {
        let chance = AUCTION_RIVAL_CHANCE[getAuctionItemInfo(item).quality] || 0;
        item.rival = Math.random() < chance ? {
            name: auctionRivalNames[Math.floor(Math.random() * auctionRivalNames.length)],
            max: Math.floor(item.price * (AUCTION_RIVAL_MAX_MULT_MIN + Math.random() * (AUCTION_RIVAL_MAX_MULT_MAX - AUCTION_RIVAL_MAX_MULT_MIN))),
            out: false
        } : null;
        if (item.rival) {
            // 對手搶先出價（底價 +10%）
            item.bid = { current: getRivalBid(item, item.price), leader: "rival",
                         history: [`${item.rival.name}：「這件我要了！」出價 ${getRivalBid(item, item.price).toLocaleString()}`] };
        }
    }
    if (item.rival && !item.rival.out) {
        openAuctionBid(item.id);
        return;
    }
    completeAuctionPurchase(item, item.bid ? item.bid.current : item.price);
}

function getRivalBid(item, current) {
    return current + Math.ceil(item.price * AUCTION_BID_STEPS[0]);
}

// 成交：扣款並交付商品（裝備進背包、壽元丹當場服用）
function completeAuctionPurchase(item, price) {
    if (!canPayAuctionItem(item, price)) return false;
    player.coins -= price;
    item.sold = true;
    let contested = item.rival ? `力壓${item.rival.name}，` : '';
    if (item.kind === "lifePill") {
        const pill = auctionLifePills.find(p => p.id === item.pillId);
        player.reputation -= item.repPrice;
        player.lifespan += pill.years;
        addLog(`🏺 ${contested}於千寶閣以 ${price.toLocaleString()} 靈石標下【${pill.name}】並當場服下，續命 ${pill.years} 年！（剩餘壽元 ${formatLifespan(player.lifespan)} 年）`, "heal");
    } else {
        player.equipInventory.push(item.equip);   // 孔位在上架時就決定；更新前上架的舊商品沒有孔，也不補
        addLog(`🏺 ${contested}於千寶閣以 ${price.toLocaleString()} 靈石標下【${item.equip.quality}·${item.equip.element}屬性】的【${item.equip.name}】！`, "equip");
    }
    renderAuction();
    updateUI();
    return true;
}

// ---- 搶拍視窗（#auction-bid-modal）----
let auctionBidItemId = null;

function openAuctionBid(itemId) {
    auctionBidItemId = itemId;
    renderAuctionBid();
    document.getElementById('auction-bid-modal').style.display = 'flex';
}

function renderAuctionBid() {
    const container = document.getElementById('auction-bid-container');
    const item = player.auctionItems.find(i => i.id === auctionBidItemId);
    if (!container || !item || !item.bid) return;
    const info = getAuctionItemInfo(item);
    const bid = item.bid;
    const leaderText = bid.leader === "player" ? `<b style="color:#4ade80;">你</b>` : `<b style="color:#f87171;">${item.rival.name}</b>`;
    const stepBtns = AUCTION_BID_STEPS.map(step => {
        let next = bid.current + Math.ceil(item.price * step);
        return `<button class="shop-btn" ${player.coins < next ? 'disabled' : ''} onclick="raiseAuctionBid(${step})">加價 ${Math.round(step * 100)}%（出價 ${next.toLocaleString()}）</button>`;
    }).join('');
    container.innerHTML = `
        <h3 class="quality-${info.quality}" style="margin: 0 0 6px;">${info.name}</h3>
        <p style="color: #9ca3af; font-size: 0.85em; margin: 0;">底價 ${item.price.toLocaleString()} 靈石${item.kind === "lifePill" ? ` + ${item.repPrice.toLocaleString()} 聲望（聲望不隨競價增加）` : ''}</p>
        <p style="font-size: 1.1em; margin: 10px 0;">目前最高出價：<b style="color: var(--accent);">${bid.current.toLocaleString()}</b> 靈石（領先：${leaderText}）</p>
        <div class="auction-bid-log">${bid.history.slice(-6).map(h => `<div>${h}</div>`).join('')}</div>
        <p style="color: #9ca3af; font-size: 0.8em;">持有靈石 ${player.coins.toLocaleString()}</p>
        <div class="batch-btns">${stepBtns}</div>
        <button class="sys-btn" style="margin-top: 8px; border-color: #f87171; color: #f87171;" onclick="giveUpAuctionBid()">放棄（讓給對方）</button>`;
}

// 玩家加價：step 為底價的比例；對手在心理價位內就跟價，否則退出、玩家得標
function raiseAuctionBid(step) {
    const item = player.auctionItems.find(i => i.id === auctionBidItemId);
    if (!item || item.sold || !item.bid || !item.rival) return;
    let next = item.bid.current + Math.ceil(item.price * step);
    if (!canPayAuctionItem(item, next)) return;
    item.bid.current = next;
    item.bid.leader = "player";
    item.bid.history.push(`你：出價 ${next.toLocaleString()}`);

    let rivalNext = getRivalBid(item, next);
    if (rivalNext <= item.rival.max) {
        item.bid.current = rivalNext;
        item.bid.leader = "rival";
        item.bid.history.push(`${item.rival.name}：冷笑一聲，跟價 ${rivalNext.toLocaleString()}`);
        renderAuctionBid();
        renderAuction();
        return;
    }
    // 對手超出心理價位 → 退出，玩家以目前出價得標
    item.rival.out = true;
    item.bid.history.push(`${item.rival.name}：搖頭嘆息，放棄競拍`);
    closeModal('auction-bid-modal');
    completeAuctionPurchase(item, next);
}

function giveUpAuctionBid() {
    const item = player.auctionItems.find(i => i.id === auctionBidItemId);
    if (!item || item.sold || !item.rival) return;
    item.sold = true;
    item.soldTo = item.rival.name;
    addLog(`🏺 你放棄競拍，${getAuctionItemInfo(item).name}被${item.rival.name}以 ${item.bid.current.toLocaleString()} 靈石標走了。`, "system");
    closeModal('auction-bid-modal');
    renderAuction();
}

// 商品卡片的競拍狀態列與按鈕（搶拍進行中／被對手標走）
function renderAuctionBuyArea(item, buyLabel) {
    let status = '';
    if (item.soldTo) status = `<p style="font-size: 0.78em; color: #f87171; margin: 2px 0;">已被 ${item.soldTo} 以 ${item.bid.current.toLocaleString()} 靈石標走</p>`;
    else if (!item.sold && item.rival && !item.rival.out && item.bid) {
        status = `<p style="font-size: 0.78em; color: #fb923c; margin: 2px 0;">⚔️ ${item.rival.name} 正在競拍！目前出價 ${item.bid.current.toLocaleString()}（${item.bid.leader === 'player' ? '你領先' : '對方領先'}）</p>`;
        buyLabel = '繼續競拍';
    } else if (!item.sold && AUCTION_RIVAL_CHANCE[getAuctionItemInfo(item).quality] && item.rival === undefined) {
        status = `<p style="font-size: 0.75em; color: #9ca3af; margin: 2px 0;">珍品：可能有其他客人搶拍</p>`;
    }
    return `${status}
                <button class="shop-btn" ${item.sold ? 'disabled' : ''} onclick="buyAuctionItem('${item.id}')">
                    ${item.sold ? (item.soldTo ? '已被標走' : '已售出') : buyLabel}
                </button>`;
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
                ${renderAuctionBuyArea(item, '標下並服用')}
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
                ${renderAuctionBuyArea(item, '標下')}
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
