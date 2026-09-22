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
    let joined = [1, 2, 3].filter(t => player.sectSkills[t]).map(t => `${SECT_TIER_NAMES[t]}：${player.sectSkills[t]}`);
    container.innerHTML = `<p style="text-align:center; color:#9ca3af; font-size:0.85em; margin-top:0;">
        每個階段只能拜入<strong style="color:var(--accent);">一個</strong>宗門並學得其 2 招技能，選定後無法更改；
        晉升後拜入下一階段的宗門，先前學會的技能仍會保留，<strong style="color:var(--accent);">也隨時可以按「回歸宗門」切回舊宗門</strong>
        （切換的只是宗門加成與設施歸屬，技能不會消失）。</p>
        <p style="text-align:center; font-size:0.85em; margin-top:0;">
        已選定：${joined.length ? joined.join('／') : '尚無'}　｜　目前所屬：<span style="color:var(--sect-color);">${player.sect ? player.sect.name : '散修'}</span></p>`;

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

            // 已選定的宗門不受境界限制（可隨時回歸）；只有「新拜入」才需要符合境界
            let isOwnSect = lockedName === sect.name;
            let realmOk = player.realmIndex >= cat.minRealm && player.realmIndex <= cat.maxRealm;
            let disabled = isCurrent || isLocked || (!isOwnSect && !realmOk);

            let btnText = isCurrent ? '當前宗門'
                : (isOwnSect ? '回歸宗門'
                : (isLocked ? `此階段已選定【${lockedName}】`
                : (realmOk ? '加入宗門' : `境界不符（需 ${realms[cat.minRealm]} 以上）`)));
            catHtml += `
                <div class="card" style="border-color: ${isCurrent ? 'var(--sect-color)' : (isOwnSect ? 'rgba(74,222,128,0.5)' : 'rgba(255,255,255,0.08)')}; opacity: ${isLocked ? 0.5 : 1};">
                    <h3>${sect.name}${isOwnSect && !isCurrent ? ' <span style="font-size:0.7em; color:#4ade80;">(已選定)</span>' : ''}</h3>
                    <p style="font-size: 0.85em; color: #9ca3af;">加成: ${sect.buff}</p>
                    <p style="font-size: 0.78em; color: #c084fc; text-align: left;">${SECT_TIER_NAMES[cat.tier]}技能：<br>${skillLines}</p>
                    <button class="sect-btn ${isCurrent ? 'active' : ''}" ${disabled ? 'disabled' : ''} onclick="joinSect('${sect.name}')">${btnText}</button>
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

        let lockedName = player.sectSkills[cat.tier];
        let isOwnSect = lockedName === s.name;

        // ⚠️ 境界檢查只針對「新拜入」。已選定的宗門永遠可以回歸：
        //    境界成長超過該階段的 maxRealm 後仍保有原本的宗門身分，否則升上去就再也回不了舊宗門。
        if (!isOwnSect) {
            if (lockedName) {
                alert(`此階段您已拜入【${lockedName}】，每個階段只能選擇一個宗門，無法改投【${s.name}】。\n（可按【${lockedName}】的「回歸宗門」切回該宗門）`);
                return;
            }
            if (player.realmIndex < cat.minRealm || player.realmIndex > cat.maxRealm) {
                alert(`您的境界不符合【${s.name}】的加入要求！\n（可加入境界：${realms[cat.minRealm]} ～ ${realms[Math.min(cat.maxRealm, realms.length - 1)]}）`);
                return;
            }
            if (!confirm(`確定拜入【${s.name}】嗎？\n\n此階段（${SECT_TIER_NAMES[cat.tier]}）只能選擇一個宗門，選定後無法更改。\n將學會：${s.skills.map(sk => sk.name).join('、')}`)) return;
            player.sectSkills[cat.tier] = s.name;
            addLog(`📜 習得【${s.name}】${SECT_TIER_NAMES[cat.tier]}技能：${s.skills.map(sk => `【${sk.name}】`).join('')}！`, "skill");
        }

        // 已經身在此宗門：只關閉視窗，不重複寫日誌
        if (player.sect && player.sect.name === s.name) {
            closeModal('sect-modal');
            return;
        }

        let from = player.sect ? player.sect.name : null;
        player.sect = s;
        addLog(isOwnSect
            ? `⛩️ 回歸【${s.name}】，改由此宗門加持（原【${from}】的技能仍然保留）。`
            : `⛩️ 拜入【${s.name}】，獲得宗門氣運加持！${from ? `（原【${from}】的技能仍然保留）` : ''}`, "system");
        updateUI();
        closeModal('sect-modal');
        return;
    }
}
