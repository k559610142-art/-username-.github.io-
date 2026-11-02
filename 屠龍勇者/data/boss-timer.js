// 首領計時（2026-11-03，ARCHITECTURE.md 第 277 節）：右側抽屜「⏱️ 首領計時」分頁，列出野外首領、龍穴、團隊副本、永夜之塔守關首領的倒數。
// 依賴 zones、monsters、raid、loot（bossFieldAt／bossCdSync，伺服器時間）、town（fmtDuration）、ui-panels（TABS／PANEL_FNS）。
// 倒數每秒只改 .bt-cd 的文字（data-t＝到期的本機時間），不重畫整個分頁。
function btLeftHtml(t, readyText) {
    return t > Date.now() ? `<span class="bt-cd" data-t="${t}" data-ready="${esc(readyText)}">${btClock(t - Date.now())}</span>` : `<span class="good">${readyText}</span>`;
}
function btClock(ms) {
    const s = Math.ceil(ms / 1000), h = Math.floor(s / 3600), m = Math.floor(s / 60) % 60, pad = n => String(n).padStart(2, '0');
    return h ? `${h}:${pad(m)}:${pad(s % 60)}` : `${pad(m)}:${pad(s % 60)}`;
}
function btRow(icon, name, sub, right) {
    return `<div class="list-row"><div><b>${icon} ${esc(name)}</b><small>${sub}</small></div><span class="rank-val">${right}</span></div>`;
}
function renderBossTimer() {
    bossCdSync();   // 最多 1 分鐘向伺服器讀一次
    const server = lootActive();
    const field = ZONES.filter(z => z.rare && MONSTERS[z.rare.id]).map(z => {
        const m = MONSTERS[z.rare.id], t = bossFieldAt[z.id];
        const right = !server ? '<small class="muted">隨機出現</small>'
            : t === undefined ? '<small class="muted">尚未計時</small>' : btLeftHtml(t, '下次遇怪出現');
        return btRow(m.icon || '👑', m.name, `${z.icon || ''} ${esc(z.name)}`, right);
    }).join('');
    const lairs = ZONES.filter(z => z.type === 'dragon' && MONSTERS[z.boss]).map(z => {
        const m = MONSTERS[z.boss], lock = player.lv < z.reqLv ? `需要 Lv.${z.reqLv}` : z.prev && !player.dragons[z.prev] ? `需先討伐${MONSTERS[z.prev].name}` : '';
        return btRow(z.icon || '🐲', m.name, esc(z.name), lock ? `<small class="muted">${lock}</small>` : btLeftHtml(player.dragonCd[z.boss] || 0, '可挑戰'));
    }).join('');
    const raids = RAIDS.map(r => {
        const m = MONSTERS[r.boss] || {};
        return btRow('🐉', m.name || r.id, `團隊副本・Lv.${r.reqLv}・冷卻 ${r.cdH} 小時`, player.lv < r.reqLv ? `<small class="muted">需要 Lv.${r.reqLv}</small>` : btLeftHtml((player.raidCd && player.raidCd[r.id]) || 0, '可挑戰'));
    }).join('');
    let tower = '';
    for (let f = 10; f <= 100; f += 10) if (player.towerCleared[f]) tower += btRow('🗼', `${f}F 守關首領`, '永夜之塔・打倒後 6 小時復活', btLeftHtml(player.towerBossCd[f] || 0, '已復活'));
    return `<div class="panel"><h4>🌲 野外首領</h4>
            <small class="muted">${server ? '每張地圖各自計時（60～90 分鐘隨機），時間到後在那張地圖下一次遇怪就會出現；第一次進去遇怪才開始計時。' : '目前沒有連上後端掉寶，野外首領照舊隨機出現。'}</small>
            <div class="list">${field}</div></div>
        <div class="panel"><h4>🐲 龍穴</h4><div class="list">${lairs}</div></div>
        <div class="panel"><h4>🐉 團隊副本</h4><div class="list">${raids}</div></div>
        <div class="panel"><h4>🗼 永夜之塔守關首領</h4><div class="list">${tower || '<small class="muted">還沒打倒過守關首領（10、20…100 樓）。</small>'}</div></div>
        <small class="muted">異界地圖的首領不計時：清完地圖的怪就會出現。</small>`;
}
setInterval(() => {
    if (!player || SIM_MODE || document.hidden || !tabOpen('bossTimer')) return;
    const now = Date.now();
    let done = false;
    document.querySelectorAll('.bt-cd').forEach(el => {
        const t = Number(el.dataset.t);
        if (t > now) el.textContent = btClock(t - now);
        else done = true;
    });
    if (done) renderPanel();   // 有倒數到期：重畫一次，改成「可挑戰／已復活」
}, 1000);

TABS.bossTimer = ['⏱️', '首領計時'];
PANEL_FNS.bossTimer = renderBossTimer;
