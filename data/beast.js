// 靈獸園彈窗：渲染可馴養靈獸（含魅力折扣）、馴養邏輯

function openBeastModal() {
    if (!checkSectJoined()) return;
    document.getElementById('beast-modal').style.display = 'flex';
    renderBeasts();
}

function renderBeasts() {
    const container = document.getElementById('beast-list-container');
    container.innerHTML = "";

    let totalCha = player.stats.cha + getEquipBonus().cha;
    let discountMult = Math.max(0.5, 1 - (totalCha * 0.001));

    beastData.forEach(beast => {
        let owned = player.beasts.includes(beast.id);
        let finalCoins = Math.floor(beast.costCoins * discountMult);

        container.innerHTML += `
            <div class="card" style="border-color: #fb923c;">
                <h3 style="color: #fb923c;">${beast.name}</h3>
                <p style="font-size: 0.85em; color: #9ca3af;">${beast.desc}</p>
                <p style="font-size: 0.8em; color: #facc15;">消耗: ${beast.costCore} 獸丹 + ${finalCoins} 靈石 ${discountMult < 1 ? `(魅力折扣 ${(discountMult*10).toFixed(1)}折)` : ''}</p>
                <button class="sys-btn" ${owned ? 'disabled' : ''} onclick="tameBeast('${beast.id}')">${owned ? '已馴養' : '馴養靈獸'}</button>
            </div>`;
    });
}

function tameBeast(id) {
    let beast = beastData.find(b => b.id === id);
    let totalCha = player.stats.cha + getEquipBonus().cha;
    let discountMult = Math.max(0.5, 1 - (totalCha * 0.001));
    let finalCoins = Math.floor(beast.costCoins * discountMult);

    if (player.beastCore >= beast.costCore && player.coins >= finalCoins) {
        player.beastCore -= beast.costCore;
        player.coins -= finalCoins;
        player.beasts.push(id);
        addLog(`🐾 成功馴養靈獸【${beast.name}】！獲得強大被動增益。`, "system");
        renderBeasts();
        updateUI();
    } else {
        alert("資源不足！需要更多獸丹與靈石。");
    }
}
