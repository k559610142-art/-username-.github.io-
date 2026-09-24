// 修仙背包彈窗：渲染道具/裝備、使用道具、刪除道具或裝備

function openBagModal() { document.getElementById('bag-modal').style.display = 'flex'; renderBag(); }

// 背包裝備是否還有空位（上限 MAX_EQUIP_INVENTORY）；已滿時跳提示並回傳 false。
// 所有「會把裝備放進背包」的地方都要在扣資源「之前」先呼叫：鍛造、千寶閣、靈寶閣、卸下裝備。
function hasEquipInventorySpace() {
    if (player.equipInventory.length < MAX_EQUIP_INVENTORY) return true;
    alert(`背包裝備已滿（${player.equipInventory.length} / ${MAX_EQUIP_INVENTORY} 件）！\n請先穿戴或刪除部分裝備。`);
    return false;
}

// ⚠️ 背包裝備數量沒有上限，比照 renderServants() 先組好整段 HTML 再一次寫入，避免裝備多時卡住
function renderBag() {
    const container = document.getElementById('bag-list-container');
    let parts = [];
    let hasItems = false;

    let equipCount = player.equipInventory ? player.equipInventory.length : 0;
    parts.push(`<div style="grid-column: 1 / -1; text-align: center; font-size: 0.9em; color: ${equipCount >= MAX_EQUIP_INVENTORY ? '#ef4444' : 'var(--accent)'};">
        背包裝備：${equipCount} / ${MAX_EQUIP_INVENTORY} 件${equipCount >= MAX_EQUIP_INVENTORY ? '（已滿，無法再鍛造、購買或卸下裝備）' : ''}
    </div>`);

    // 依品級一鍵刪除裝備（只作用於背包內未穿戴的裝備）
    if (player.equipInventory && player.equipInventory.length > 0) {
        let counts = {};
        player.equipInventory.forEach(eq => { counts[eq.quality] = (counts[eq.quality] || 0) + 1; });
        parts.push(renderBulkDeleteBar(
            "一鍵刪除裝備（依品級）",
            "bulk-equip-quality",
            equipQualities.map(q => q.name),
            counts,
            "bulkDeleteEquipment",
            "※ 只會刪除背包內的裝備，已穿戴的不受影響"
        ));
    }

    for (let itemId in player.bag) {
        let count = player.bag[itemId];
        if (count > 0) {
            hasItems = true;
            let shopItem = shopItems.find(s => s.id === itemId);
            if (shopItem) {
                parts.push(`
                    <div class="card" style="border-color: #facc15;">
                        <h3 style="color: #facc15;">${shopItem.name} <span style="font-size:0.8em; color:#4ade80;">(x${count})</span></h3>
                        <p style="font-size: 0.85em; color: #9ca3af;">${shopItem.desc}</p>
                        <button class="sys-btn" onclick="useItemFromBag('${itemId}')">直接使用</button>
                        <button style="border-color: #ef4444; color: #ef4444; margin-top: 5px; background: rgba(239,68,68,0.1);" onclick="deleteItemFromBag('${itemId}')">刪除道具</button>
                    </div>`);
            }
        }
    }

    // 珍貴道具（七彩補天石、破障丹）：七彩發光外觀，不能直接使用（補天石於千寶閣消費、破障丹渡劫時自動服用）
    [["butianStone", player.butianStones], ["breakPill", player.breakPills]].forEach(([key, count]) => {
        if (!(count > 0)) return;
        hasItems = true;
        let item = preciousItems[key];
        parts.push(`
            <div class="card rainbow-glow">
                <h3 class="rainbow-text">${item.icon} ${item.name} <span style="font-size:0.8em;">(x${count.toLocaleString()})</span></h3>
                <p style="font-size: 0.85em; color: #9ca3af;">${item.desc}</p>
            </div>`);
    });

    if (player.equipInventory && player.equipInventory.length > 0) {
        hasItems = true;
        player.equipInventory.forEach(eq => {
            parts.push(`
                <div class="${getEquipCardClass(eq)}" style="border-color: var(--equip-color);">
                    <h3 class="quality-${eq.quality}">${formatEquipLevel(eq)}${eq.name}</h3>
                    <p style="font-size: 0.85em; color: #9ca3af;">品質: <span class="quality-${eq.quality}">${formatQualityLabel(eq.quality)}</span> | 屬性: <span class="elem-${eq.element}">${eq.element}</span></p>
                    <p style="font-size: 0.8em; color: #facc15;">加成: ${formatEquipStats(eq.stats)}</p>
                    ${formatSockets(eq)}
                    ${formatArtifactSkill(eq)}
                    <button class="equip-btn" onclick="equipItem('${eq.id}')">穿戴裝備</button>
                    <button style="border-color: #ef4444; color: #ef4444; margin-top: 5px; background: rgba(239,68,68,0.1);" onclick="deleteEquipFromInventory('${eq.id}')">毀棄裝備</button>
                </div>`);
        });
    }

    container.innerHTML = hasItems
        ? parts.join("")
        : `<div style="grid-column: 1 / -1; text-align: center; color: #6b7280; padding: 20px;">您的背包目前空空如也！</div>`;
}

function useItemFromBag(itemId) {
    if (!player.bag[itemId] || player.bag[itemId] <= 0) return;
    let shopItem = shopItems.find(s => s.id === itemId);
    if (!shopItem) return;

    if (shopItem.type === 'heal') {
        if (potionCooldownHp > 0) { alert(`氣血類丹藥冷卻中，尚需 ${potionCooldownHp} 秒才能再次服用。`); return; }
        if (player.hp >= player.maxHp) { alert("氣血已滿，無需使用！"); return; }
        player.hp = Math.min(player.maxHp, player.hp + player.maxHp * shopItem.amount);
        potionCooldownHp = POTION_COOLDOWN_SECONDS;
        addLog(`🎒 從背包使用【${shopItem.name}】，氣血回復 ${Math.round(shopItem.amount * 100)}%！`, "heal");
    } else if (shopItem.type === 'mp') {
        if (potionCooldownMp > 0) { alert(`靈力類丹藥冷卻中，尚需 ${potionCooldownMp} 秒才能再次服用。`); return; }
        if (player.mp >= player.maxMp) { alert("靈力已滿，無需使用！"); return; }
        player.mp = Math.min(player.maxMp, player.mp + player.maxMp * shopItem.amount);
        potionCooldownMp = POTION_COOLDOWN_SECONDS;
        addLog(`🎒 從背包使用【${shopItem.name}】，靈力回復 ${Math.round(shopItem.amount * 100)}%！`, "skill");
    }

    player.bag[itemId]--;
    if (player.bag[itemId] <= 0) delete player.bag[itemId];
    addDailyProgress('potion');
    renderBag();
    updateUI();
}

function deleteItemFromBag(itemId) {
    if (!player.bag[itemId]) return;
    let item = shopItems.find(s => s.id === itemId);
    let name = item ? item.name : itemId;
    if (confirm(`確定要刪除背包內的道具【${name}】嗎？`)) {
        delete player.bag[itemId];
        addLog(`🗑️ 刪除了背包道具【${name}】。`, "system");
        renderBag();
    }
}

// 一鍵刪除：把背包內所有勾選品級的裝備一次清掉（已穿戴的不受影響）
function bulkDeleteEquipment() {
    let selected = getCheckedBulkQualities('bulk-equip-quality');
    if (selected.length === 0) { alert("請先勾選要刪除的品級！"); return; }

    let targets = player.equipInventory.filter(eq => selected.includes(eq.quality));
    if (targets.length === 0) { alert("背包內沒有符合勾選品級的裝備。"); return; }

    if (!confirm(`確定要刪除背包內 ${targets.length} 件【${selected.join('、')}】裝備嗎？\n此操作無法復原。`)) return;

    player.equipInventory = player.equipInventory.filter(eq => !selected.includes(eq.quality));
    addLog(`🗑️ 一鍵刪除了 ${targets.length} 件裝備（${selected.join('、')}）。`, "equip");
    renderBag();
    updateUI();
}

function deleteEquipFromInventory(equipId) {
    let index = player.equipInventory.findIndex(e => e.id === equipId);
    if (index === -1) return;
    let item = player.equipInventory[index];
    if (confirm(`確定要毀棄裝備【${item.quality}·${item.name}】嗎？`)) {
        player.equipInventory.splice(index, 1);
        addLog(`🗑️ 毀棄了裝備【${item.name}】。`, "equip");
        renderBag();
    }
}
