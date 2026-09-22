// 丹藥堂彈窗：渲染商品、購買補血/補魔藥品進背包

function openShopModal() {
    if (!checkSectJoined()) return;
    document.getElementById('shop-modal').style.display = 'flex';
    renderShop();
}

function renderShop() {
    const container = document.getElementById('shop-list-container');
    container.innerHTML = "";
    shopItems.forEach(item => {
        container.innerHTML += `
            <div class="card" style="border-color: var(--shop-color);">
                <h3>${item.name}</h3>
                <p style="font-size: 0.85em; color: #9ca3af;">${item.desc}</p>
                <p style="font-size: 0.85em; color: #facc15;">價格: ${item.cost} 靈石</p>
                <button class="shop-btn" onclick="buyShopItem('${item.id}')">購買</button>
            </div>`;
    });
}

function buyShopItem(id) {
    let item = shopItems.find(s => s.id === id);
    if (player.coins >= item.cost) {
        player.coins -= item.cost;
        player.bag[id] = (player.bag[id] || 0) + 1;
        addLog(`🛒 購買了【${item.name}】，存入背包。`, "system");
        updateUI();
    } else {
        alert("靈石不足！");
    }
}
