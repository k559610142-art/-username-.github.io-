// 角色裝備彈窗（穿戴部位列表 + 五行狀態）與鍛造閣

function initForgeSelect() {
    const select = document.getElementById('forge-type-select');
    select.innerHTML = "";
    for (let name in equipTypes) {
        let option = document.createElement('option');
        option.value = name;
        option.innerText = `${name} (${equipTypes[name] === 'weapon' ? '武器' : equipTypes[name] === 'armor' ? '防具' : '飾品'})`;
        select.appendChild(option);
    }
}

function openEquipmentModal() {
    document.getElementById('equipment-modal').style.display = 'flex';
    renderLingbaoUI();
}

// 注意：函式名稱為歷史命名，實際渲染的是「角色裝備與五行狀態」彈窗內容，非靈寶閣
function renderLingbaoUI() {
    const container = document.getElementById('equipped-list-container');
    container.innerHTML = "";

    let wuxing = getWuxingBuff();
    let wuxingText = wuxing.type ? `<span class="elem-${wuxing.type}">【${wuxing.name}】</span>` : `【五行法陣】：${wuxing.name}`;
    document.getElementById('wuxing-status-modal').innerHTML = wuxingText;

    for (let eqName in player.equipment) {
        let eq = player.equipment[eqName];
        if (eq) {
            container.innerHTML += `
                <div class="card" style="border-color: var(--equip-color);">
                    <h3 class="quality-${eq.quality}">${eq.name}</h3>
                    <p style="font-size:0.85em; color:#9ca3af;">品質：<span class="quality-${eq.quality}">${eq.quality}</span> | 屬性：<span class="elem-${eq.element}">${eq.element}</span></p>
                    <p style="font-size:0.8em; color:#facc15;">加成: 力量+${eq.stats.str||0}, 體質+${eq.stats.con||0}, 悟性+${eq.stats.int||0}, 靈力+${eq.stats.spr||0}, 魅力+${eq.stats.cha||0}</p>
                    <button class="sys-btn" onclick="unequipItem('${eqName}')">卸下裝備</button>
                </div>`;
        } else {
            container.innerHTML += `
                <div class="card" style="border-color: rgba(255,255,255,0.05); color: #6b7280; background: rgba(10,14,22,0.3);">
                    <h3>${eqName}</h3>
                    <p style="font-size:0.85em;">(未裝備)</p>
                </div>`;
        }
    }
}

function equipItem(equipId) {
    let index = player.equipInventory.findIndex(e => e.id === equipId);
    if (index === -1) return;

    let item = player.equipInventory[index];
    let slotName = item.name;

    if (player.equipment[slotName]) {
        player.equipInventory.push(player.equipment[slotName]);
    }

    player.equipment[slotName] = item;
    player.equipInventory.splice(index, 1);

    addLog(`🛡️ 成功裝備【${item.quality}·${item.element}屬性】的【${item.name}】！`, "equip");
    renderBag();
    updateUI();
}

function unequipItem(slotName) {
    let item = player.equipment[slotName];
    if (!item) return;

    player.equipment[slotName] = null;
    player.equipInventory.push(item);

    addLog(`🛡️ 卸下了部位【${slotName}】的裝備。`, "equip");
    renderLingbaoUI();
    updateUI();
}

function openForgeModal() {
    if (!checkSectJoined()) return;
    document.getElementById('forge-modal').style.display = 'flex';
}

function forgeEquipment() {
    if (player.coins < 1000) {
        alert("靈石不足 1000！無法打造裝備。");
        return;
    }

    player.coins -= 1000;
    let name = document.getElementById('forge-type-select').value;
    let category = equipTypes[name];

    let qRand = Math.random();
    let qualityObj = equipQualities[0];
    if (qRand < 0.05) qualityObj = equipQualities[4];
    else if (qRand < 0.15) qualityObj = equipQualities[3];
    else if (qRand < 0.35) qualityObj = equipQualities[2];
    else if (qRand < 0.65) qualityObj = equipQualities[1];

    let elem = wuxingElements[Math.floor(Math.random() * wuxingElements.length)];

    let baseBonus = (player.realmIndex + 1) * 10 * qualityObj.mult;
    let statsBonus = { str: 0, con: 0, int: 0, spr: 0, cha: 0 };

    if (category === 'weapon') { statsBonus.str = baseBonus; statsBonus.spr = baseBonus; }
    else if (category === 'armor') { statsBonus.con = baseBonus * 2; }
    else { statsBonus.int = baseBonus; statsBonus.spr = baseBonus; statsBonus.cha = Math.floor(baseBonus / 2); }

    let newEquip = {
        id: Date.now() + "_" + Math.floor(Math.random() * 1000),
        name: name,
        category: category,
        quality: qualityObj.name,
        element: elem,
        stats: statsBonus
    };

    player.equipInventory.push(newEquip);
    addLog(`⚒️ 鍛造閣開爐成功！獲得【${newEquip.quality}·${newEquip.element}屬性】的【${newEquip.name}】！`, "equip");
    updateUI();
}
