// 夥伴（情緣系統，ARCHITECTURE.md 第 39 節）；資料與模板在 config-partners.js
// 存檔欄位：player.partners（已結識的夥伴 id 陣列）、player.activePartner（出戰中的夥伴 id，null = 無），轉世保留
// 入口：洞府底部導覽「情緣」（手機 index.html、PC config-home-pc.js）→ openPartnerModal()

const partnerById = {};
partnerList.forEach(p => { partnerById[p.id] = p; });

function getPartnerPowerAvg(p) {
    let keys = Object.keys(PARTNER_POWER_LABELS);
    return keys.reduce((s, k) => s + (p.power[k] || 0), 0) / keys.length;
}

function getPartnerTier(p) {
    let avg = getPartnerPowerAvg(p);
    return PARTNER_TIERS.find(t => avg >= t.min) || PARTNER_TIERS[PARTNER_TIERS.length - 1];
}

function isPartnerMet(id) {
    return (player.partners || []).includes(id);
}

// 結識夥伴（未來秘境相遇時呼叫）；回傳是否為新結識
function meetPartner(id, source) {
    let p = partnerById[id];
    if (!p || isPartnerMet(id)) return false;
    if (!Array.isArray(player.partners)) player.partners = [];
    player.partners.push(id);
    addLog(`💞 ${source ? source + '，' : ''}結識了${p.native ? '' : '域外神明'}【${p.title}・${p.name}】！可在「情緣」中邀其出戰。`, "level-up");
    return true;
}

function getActivePartner() {
    let p = partnerById[player.activePartner];
    return p && isPartnerMet(p.id) ? p : null;
}

// 出戰／休息（同時只能一位出戰）
function setActivePartner(id) {
    if (!isPartnerMet(id)) return;
    player.activePartner = player.activePartner === id ? null : id;
    let p = partnerById[id];
    addLog(player.activePartner ? `💞 【${p.title}・${p.name}】與你並肩出戰！` : `💞 【${p.title}・${p.name}】回到情緣閣休息。`, "system");
    renderPartnerModal();
    updateUI();
}

// 出戰夥伴的被動加成（併入 gear.js 的 getBonusTotals）
function getPartnerBonusTotals() {
    let p = getActivePartner();
    return p ? Object.assign({}, p.passive) : {};
}

// 玩家出手之後呼叫（野外 combat.js、渡劫 tribulation.js、懸賞對決 bounty.js）：依機率發動出戰夥伴的招牌絕學
function partnerSkillTurn(targets, tags) {
    let p = getActivePartner();
    if (!p || Math.random() >= p.skill.chance) return;
    castProcSkill(p.skill, targets, tags);   // artifact.js
}

// ---- 情緣視窗 ----
let partnerFilter = 'all';   // all / met / 評級名稱

function openPartnerModal() {
    document.getElementById('partner-modal').style.display = 'flex';
    renderPartnerModal();
}

function setPartnerFilter(f) { partnerFilter = f; renderPartnerModal(); }

function formatPartnerOrigin(p) {
    return p.native
        ? `🏯 本界人物｜出自《${p.work}》（${p.author}）・${p.world}`
        : `🌌 域外神明｜來自《${p.work}》（${p.author}）的${p.world}`;
}

function renderPartnerCard(p) {
    let met = isPartnerMet(p.id);
    let active = player.activePartner === p.id && met;
    let tier = getPartnerTier(p);
    let avg = getPartnerPowerAvg(p);
    let bars = Object.keys(PARTNER_POWER_LABELS).map(k => `
        <div class="partner-bar"><span>${PARTNER_POWER_LABELS[k]}</span>
            <div class="partner-bar-track"><div class="partner-bar-fill" style="width: ${p.power[k]}%; background: ${tier.color};"></div></div>
            <b>${p.power[k]}</b></div>`).join('');
    let btn = met
        ? `<button class="sys-btn" onclick="setActivePartner('${p.id}')">${active ? '🛌 回去休息' : '⚔️ 邀請出戰'}</button>`
        : `<button class="sys-btn" disabled>未結識・秘境中有緣相遇</button>`;
    return `
        <div class="card partner-card${met ? '' : ' unmet'}" style="border-color: ${active ? 'var(--accent)' : tier.color};">
            <h3 style="color: ${tier.color}; margin-bottom: 2px;">${active ? '⚔️ ' : ''}${p.title}・${p.name}</h3>
            <p class="partner-origin">${formatPartnerOrigin(p)}</p>
            <p class="partner-meta">巔峰：${p.peak}｜評級 <b style="color: ${tier.color};">${tier.name}</b>｜綜合戰力 <b style="color: ${tier.color};">${avg.toFixed(1)}</b></p>
            <div class="partner-bars">${bars}</div>
            <p class="partner-analysis">📖 ${p.analysis}</p>
            <p class="partner-effect">🌟 出戰被動：${describeTitleBonus(p.passive)}</p>
            <p class="partner-effect">⚡ 招牌絕學【${p.skill.name}】：${p.skill.desc}（以主人攻擊力計算）</p>
            ${btn}
        </div>`;
}

function renderPartnerModal() {
    let box = document.getElementById('partner-container');
    if (!box || document.getElementById('partner-modal').style.display !== 'flex') return;
    let metCount = partnerList.filter(p => isPartnerMet(p.id)).length;
    let active = getActivePartner();
    let filters = [['all', '全部'], ['met', '已結識']].concat(PARTNER_TIERS.map(t => [t.name, t.name]))
        .map(([k, label]) => `<button class="codex-tab${partnerFilter === k ? ' active' : ''}" onclick="setPartnerFilter('${k}')">${label}</button>`).join('');
    let list = partnerList
        .filter(p => partnerFilter === 'all' || (partnerFilter === 'met' ? isPartnerMet(p.id) : getPartnerTier(p).name === partnerFilter))
        .sort((a, b) => getPartnerPowerAvg(b) - getPartnerPowerAvg(a));
    box.innerHTML = `
        <p style="text-align: center; color: #9ca3af; font-size: 0.85em; margin: 0 0 8px;">
            已結識 <b style="color: var(--accent);">${metCount}</b> / ${partnerList.length} 位｜出戰：${active ? `<b style="color: var(--accent);">${active.title}・${active.name}</b>` : '無'}<br>
            諸天萬界的高手會在秘境中與你相遇（秘境尚未開放）。出戰夥伴提供被動加成，並在戰鬥中依機率施展招牌絕學。<br>
            <span style="font-size: 0.85em; color: #6b7280;">※ 戰力分析與評級為本遊戲設定，僅供娛樂，並非原著官方設定。</span>
        </p>
        <div class="codex-tabs">${filters}</div>
        <div class="grid-container">${list.length ? list.map(renderPartnerCard).join('') : '<p style="grid-column: 1 / -1; text-align: center; color: #6b7280;">尚無符合條件的夥伴。</p>'}</div>`;
}
