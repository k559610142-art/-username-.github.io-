// 宗門彈窗：檢查是否已拜入宗門、渲染宗門列表、加入宗門
// 每個階段（凡俗/修真/至高）只能拜入一個宗門，選定後鎖定；已學的技能永久保留。

function checkSectJoined() {
    if (!player.sect) {
        alert("【提示】閣下目前乃是一介散修，尚未加入任何仙門！請先至「尋訪仙門」拜入宗門後，方可使用此宗門設施。");
        openSectModal();
        return false;
    }
    return true;
}

function openSectModal() { document.getElementById('sect-modal').style.display = 'flex'; renderSects(); }

function renderSects() {
    const container = document.getElementById('sect-list-container');
    container.innerHTML = `<p style="text-align:center; color:#9ca3af; font-size:0.85em; margin-top:0;">
        每個階段只能拜入<strong style="color:var(--accent);">一個</strong>宗門並學得其 2 招技能，選定後無法更改；
        晉升後拜入下一階段的宗門，先前學會的技能仍會保留。</p>`;

    sectData.forEach(cat => {
        let lockedName = player.sectSkills[cat.tier];
        let tierNote = lockedName
            ? `<span style="color:#4ade80; font-size:0.85em;">（已選定：${lockedName}）</span>`
            : `<span style="color:#9ca3af; font-size:0.85em;">（尚未選擇）</span>`;
        let catHtml = `<div class="map-category"><h4 style="color:var(--accent); margin-bottom:10px;">${cat.category} ${tierNote}</h4><div class="grid-container">`;

        cat.items.forEach(sect => {
            let isCurrent = player.sect && player.sect.name === sect.name;
            let isLocked = lockedName && lockedName !== sect.name;
            let skillLines = sect.skills.map(sk =>
                `・${sk.name}（${sk.type === 'aoe' ? '群體' : '單體'}・${sk.dmgType === 'mag' ? '悟性' : '力量'}・威力 ${Math.round(sk.mult * 100)}%）`
            ).join('<br>');

            let btnText = isCurrent ? '當前宗門' : (isLocked ? '此階段已選定其他宗門' : (lockedName ? '回歸宗門' : '加入宗門'));
            catHtml += `
                <div class="card" style="border-color: ${isCurrent ? 'var(--sect-color)' : 'rgba(255,255,255,0.08)'}; opacity: ${isLocked ? 0.5 : 1};">
                    <h3>${sect.name}</h3>
                    <p style="font-size: 0.85em; color: #9ca3af;">加成: ${sect.buff}</p>
                    <p style="font-size: 0.78em; color: #c084fc; text-align: left;">${SECT_TIER_NAMES[cat.tier]}技能：<br>${skillLines}</p>
                    <button class="sect-btn ${isCurrent ? 'active' : ''}" ${isLocked ? 'disabled' : ''} onclick="joinSect('${sect.name}')">${btnText}</button>
                </div>`;
        });
        catHtml += `</div></div>`;
        container.innerHTML += catHtml;
    });
}

function joinSect(sectName) {
    for (let cat of sectData) {
        let s = cat.items.find(item => item.name === sectName);
        if (!s) continue;

        if (player.realmIndex < cat.minRealm || player.realmIndex > cat.maxRealm) {
            alert(`您的境界不符合【${s.name}】的加入要求！`);
            return;
        }

        let lockedName = player.sectSkills[cat.tier];
        if (lockedName && lockedName !== s.name) {
            alert(`此階段您已拜入【${lockedName}】，每個階段只能選擇一個宗門，無法改投【${s.name}】。`);
            return;
        }

        if (!lockedName) {
            if (!confirm(`確定拜入【${s.name}】嗎？\n\n此階段（${SECT_TIER_NAMES[cat.tier]}）只能選擇一個宗門，選定後無法更改。\n將學會：${s.skills.map(sk => sk.name).join('、')}`)) return;
            player.sectSkills[cat.tier] = s.name;
            addLog(`📜 習得【${s.name}】${SECT_TIER_NAMES[cat.tier]}技能：${s.skills.map(sk => `【${sk.name}】`).join('')}！`, "skill");
        }

        player.sect = s;
        addLog(`⛩️ 拜入【${s.name}】，獲得宗門氣運加持！`, "system");
        updateUI();
        closeModal('sect-modal');
        return;
    }
}
