// 角色裝備彈窗（穿戴部位列表 + 五行狀態）與鍛造閣

const EQUIP_CATEGORY_NAMES = { weapon: '武器', armor: '防具', accessory: '飾品', artifact: '神器' };

function initForgeSelect() {
    const select = document.getElementById('forge-type-select');
    select.innerHTML = "";
    for (let name in equipTypes) {
        if (NON_FORGEABLE_SLOTS.includes(name)) continue;
        let option = document.createElement('option');
        option.value = name;
        option.innerText = `${name} (${EQUIP_CATEGORY_NAMES[equipTypes[name]]})`;
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
                    <p style="font-size:0.8em; color:#facc15;">加成: ${formatEquipStats(eq.stats)}</p>
                    <button class="sys-btn" onclick="unequipItem('${eqName}')">卸下裝備</button>
                </div>`;
        } else {
            // 神器為特殊部位（靈寶閣高級宗門兌換，不計入五行法陣），欄位以金色標示
            let isArtifact = equipTypes[eqName] === 'artifact';
            container.innerHTML += `
                <div class="card" style="border-color: ${isArtifact ? 'rgba(240,213,136,0.45)' : 'rgba(255,255,255,0.05)'}; color: #6b7280; background: rgba(10,14,22,0.3);">
                    <h3 style="${isArtifact ? 'color: var(--accent);' : ''}">${isArtifact ? '✨ ' : ''}${eqName}</h3>
                    <p style="font-size:0.85em;">${isArtifact ? '(未裝備・可於靈寶閣高級宗門兌換)' : '(未裝備)'}</p>
                </div>`;
        }
    }
}

// 「!」說明視窗：五行法陣的發動條件、目前進度、各屬性效果與搭配建議（效果文字來自 wuxingArrayEffects）
function openWuxingInfo() {
    let slots = Object.keys(player.equipment).filter(key => equipTypes[key] !== "artifact");
    let counts = {};
    let empty = 0;
    slots.forEach(key => {
        let eq = player.equipment[key];
        if (!eq) { empty++; return; }
        counts[eq.element] = (counts[eq.element] || 0) + 1;
    });
    let categoryCount = cat => slots.filter(key => equipTypes[key] === cat).length;

    let progress = wuxingElements.map(e =>
        `<span class="elem-${e}">${e} ${counts[e] || 0}/${slots.length}</span>`
    ).join('　') + (empty > 0 ? `　<span style="color:#6b7280;">未穿戴 ${empty} 格</span>` : '');

    let rows = wuxingElements.map(e => {
        let info = wuxingArrayEffects[e];
        return `<tr>
            <td class="elem-${e}" style="white-space:nowrap;">${e}・${info.effect}</td>
            <td>${info.detail}<br><span style="color:var(--accent);">搭配：${info.suit}</span></td>
        </tr>`;
    }).join('');

    let fixedEquips = lingbaoShopItems.filter(i => i.type === 'equip' && i.itemData.category !== 'artifact')
        .map(i => `${i.name}（<span class="elem-${i.itemData.element}">${i.itemData.element}</span>）`).join('、');

    document.getElementById('wuxing-info-body').innerHTML = `
        <h4 class="wuxing-info-h">發動條件</h4>
        <p>除了神器以外的 <strong>${slots.length} 個部位</strong>（武器 ${categoryCount('weapon')}、防具 ${categoryCount('armor')}、飾品 ${categoryCount('accessory')}）
        必須<strong>全部穿戴</strong>，且<strong>五行屬性完全相同</strong>，才會發動該屬性的法陣。
        只要有一格空著或混到別的屬性就不生效；法陣只會有一種，不能兩種疊加，也沒有相生相剋。</p>

        <h4 class="wuxing-info-h">目前進度</h4>
        <p>${progress}</p>

        <h4 class="wuxing-info-h">五種法陣效果</h4>
        <table class="wuxing-info-table">${rows}</table>

        <h4 class="wuxing-info-h">如何湊齊</h4>
        <p>・<strong>鍛造閣</strong>：屬性隨機，可用「最高」一次大量開爐，再挑出同屬性的保留，其餘在背包依品級一鍵刪除。<br>
        ・<strong>千寶閣</strong>：屬性隨機、品質較高，適合補齊缺的部位。<br>
        ・<strong>靈寶閣</strong>：屬性固定 — ${fixedEquips}。<br>
        ・背包上限 ${MAX_EQUIP_INVENTORY} 件，湊裝前記得先清出空間。</p>`;

    document.getElementById('wuxing-info-modal').style.display = 'flex';
}

function equipItem(equipId) {
    let index = player.equipInventory.findIndex(e => e.id === equipId);
    if (index === -1) return;

    let item = player.equipInventory[index];
    let slotName = item.name;
    // 舊版靈寶閣「降魔伏虎杖」的部位「杖」不在 equipTypes 內，穿上會破壞五行法陣判定
    if (!(slotName in equipTypes)) {
        alert(`【${item.name}】的部位已停用，無法穿戴。可在背包中毀棄。`);
        return;
    }

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
    if (!hasEquipInventorySpace()) return;

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

const FORGE_COST = 1000;

// qty：1、10 或 'max'（靈石與背包空位允許的最多次數）
function forgeEquipment(qty = 1) {
    if (player.coins < FORGE_COST) {
        alert(`靈石不足 ${FORGE_COST}！無法打造裝備。`);
        return;
    }
    if (!hasEquipInventorySpace()) return;

    let affordable = Math.min(Math.floor(player.coins / FORGE_COST), MAX_EQUIP_INVENTORY - player.equipInventory.length);
    let n = resolveBatchCount(qty, affordable, "鍛造");
    if (!n) return;

    let name = document.getElementById('forge-type-select').value;
    let results = [];
    for (let i = 0; i < n; i++) results.push(forgeOneEquipment(name));

    addDailyProgress('forge', n);
    if (n === 1) {
        let eq = results[0];
        addLog(`⚒️ 鍛造閣開爐成功！獲得【${eq.quality}·${eq.element}屬性】的【${eq.name}】！`, "equip");
    } else {
        let byQuality = equipQualities.map(q => [q.name, results.filter(r => r.quality === q.name).length]).filter(([, c]) => c > 0);
        let byElement = wuxingElements.map(e => [e, results.filter(r => r.element === e).length]).filter(([, c]) => c > 0);
        addLog(`⚒️ 鍛造閣連續開爐 ${n} 次，打造【${name}】×${n}（消耗 ${(n * FORGE_COST).toLocaleString()} 靈石）！`
            + `品質：${byQuality.map(([q, c]) => `<span class="quality-${q}">${q}</span>×${c}`).join('、')}；`
            + `五行：${byElement.map(([e, c]) => `<span class="elem-${e}">${e}</span>×${c}`).join('、')}`, "equip");
    }
    updateUI();
}

// 依部位分類與品質產生裝備屬性（鍛造閣與千寶閣共用）
//   武器：力量、靈力 + 隨機一種屬性傷害（冰/火/毒/金）
//   防具：體質 + 減傷
//   飾品：悟性、靈力、魅力 + 閃避
function generateEquipStats(category, qualityObj, baseBonus) {
    let stats = { str: 0, con: 0, int: 0, spr: 0, cha: 0 };
    if (category === 'weapon') {
        stats.str = baseBonus; stats.spr = baseBonus;
        stats[AFFIX_TYPES[Math.floor(Math.random() * AFFIX_TYPES.length)]] = qualityObj.affix;
    } else if (category === 'armor') {
        stats.con = baseBonus * 2;
        stats.def = qualityObj.def;
    } else {
        stats.int = baseBonus; stats.spr = baseBonus; stats.cha = Math.floor(baseBonus / 2);
        stats.eva = qualityObj.eva;
    }
    return stats;
}

// 打造一件裝備並放進背包（扣靈石），回傳新裝備
function forgeOneEquipment(name) {
    player.coins -= FORGE_COST;
    let category = equipTypes[name];

    let qRand = Math.random();
    let qualityObj = equipQualities[0];
    if (qRand < 0.05) qualityObj = equipQualities[4];
    else if (qRand < 0.15) qualityObj = equipQualities[3];
    else if (qRand < 0.35) qualityObj = equipQualities[2];
    else if (qRand < 0.65) qualityObj = equipQualities[1];

    let elem = wuxingElements[Math.floor(Math.random() * wuxingElements.length)];
    let statsBonus = generateEquipStats(category, qualityObj, (player.realmIndex + 1) * 10 * qualityObj.mult);

    let newEquip = {
        // 連續開爐會在同一毫秒產生多件，隨機段需夠長以免 id 重複
        id: Date.now() + "_" + Math.random().toString(36).slice(2, 10),
        name: name,
        category: category,
        quality: qualityObj.name,
        element: elem,
        stats: statsBonus
    };

    player.equipInventory.push(newEquip);
    return newEquip;
}
