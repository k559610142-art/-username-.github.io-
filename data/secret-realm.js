// 秘境入口（ARCHITECTURE.md 第 43 節）：活動「🌀 秘境」→ 秘境列表 → 全螢幕秘境場景（海報）→ 入塔挑戰
// 資料在 config-secret-realms.js；目前各秘境玩法尚未實作（implemented: false），挑戰視窗只顯示預定玩法與獎勵

let currentSecretRealm = null;

function getSecretRealm(id) {
    return secretRealmList.find(r => r.id === id) || null;
}

// 活動選單的 openFn（config-activities.js）
function openSecretRealmModal() {
    renderSecretRealmList();
    document.getElementById('secret-realm-modal').style.display = 'flex';
}

function renderSecretRealmList() {
    const box = document.getElementById('secret-realm-list');
    if (!box) return;
    box.innerHTML = secretRealmList.map(r => {
        const locked = player.realmIndex < r.minRealmIndex;
        return `
            <button class="secret-card${locked ? ' locked' : ''}" onclick="openSecretRealmScene('${r.id}')">
                <img src="${r.img}" alt="">
                <span class="secret-card-info">
                    <b>${r.name}</b>
                    <small>${locked ? `🔒 需【${realms[r.minRealmIndex]}】以上` : r.implemented ? '可挑戰' : '🚧 即將開放'}</small>
                </span>
            </button>`;
    }).join("");
}

function openSecretRealmScene(id) {
    const r = getSecretRealm(id);
    if (!r) return;
    if (player.realmIndex < r.minRealmIndex) {
        alert(`【${r.name}】需境界【${realms[r.minRealmIndex]}】以上才能進入。`);
        return;
    }
    currentSecretRealm = r;
    const scene = document.getElementById('secret-realm-scene');
    scene.querySelectorAll('img').forEach(img => { img.src = r.img; });
    document.getElementById('secret-realm-enter').setAttribute('aria-label', `${r.name}（入塔挑戰）`);
    closeModal('secret-realm-modal');
    scene.style.display = 'block';
}

function closeSecretRealmScene() {
    document.getElementById('secret-realm-scene').style.display = 'none';
    closeModal('secret-realm-info-modal');
    currentSecretRealm = null;
    openSecretRealmModal();   // 回到秘境列表
}

// 場景中的「入塔挑戰」：玩法實作前顯示預定內容
function challengeSecretRealm() {
    const r = currentSecretRealm;
    if (!r) return;
    document.getElementById('secret-realm-info-title').innerText = `🗼 ${r.name}`;
    document.getElementById('secret-realm-info-body').innerHTML = `
        <p style="color: #fca5a5; text-align: center; margin: 0 0 10px;">「${r.tagline}」</p>
        <p style="color: #d1d5db; font-size: 0.9em; line-height: 1.7;">${r.desc}</p>
        <div class="panel-title" style="margin-top: 12px;">塔中機緣</div>
        ${r.rewards.map(x => `<div class="secret-reward">${x.icon} ${x.text}</div>`).join("")}
        <p style="color: #9ca3af; font-size: 0.82em; margin-top: 10px;">每日可挑戰 ${SECRET_REALM_DAILY_ATTEMPTS} 次（失敗也計入）。</p>
        <p style="color: #facc15; text-align: center; font-weight: bold; margin-bottom: 0;">
            ${r.implemented ? '' : '🚧 塔門封印未解，秘境即將開放，敬請期待！'}</p>`;
    document.getElementById('secret-realm-info-modal').style.display = 'flex';
}
