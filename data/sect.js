// 宗門彈窗：檢查是否已拜入宗門、渲染宗門列表、加入宗門

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
    container.innerHTML = "";
    sectData.forEach(cat => {
        let catHtml = `<div class="map-category"><h4 style="color:var(--accent); margin-bottom:10px;">${cat.category}</h4><div class="grid-container">`;
        cat.items.forEach(sect => {
            let isCurrent = player.sect && player.sect.name === sect.name;
            catHtml += `
                <div class="card" style="border-color: ${isCurrent ? 'var(--sect-color)' : 'rgba(255,255,255,0.08)'};">
                    <h3>${sect.name}</h3>
                    <p style="font-size: 0.85em; color: #9ca3af;">加成: ${sect.buff}</p>
                    <button class="sect-btn ${isCurrent ? 'active' : ''}" onclick="joinSect('${sect.name}')">${isCurrent ? '當前宗門' : '加入宗門'}</button>
                </div>`;
        });
        catHtml += `</div></div>`;
        container.innerHTML += catHtml;
    });
}

function joinSect(sectName) {
    for (let cat of sectData) {
        for (let s of cat.items) {
            if (s.name === sectName) {
                if (player.realmIndex < cat.minRealm || player.realmIndex > cat.maxRealm) {
                    alert(`您的境界不符合【${s.name}】的加入要求！`);
                    return;
                }
                player.sect = s;
                addLog(`⛩️ 拜入【${s.name}】，獲得宗門氣運加持！`, "system");
                updateUI();
                closeModal('sect-modal');
                return;
            }
        }
    }
}
