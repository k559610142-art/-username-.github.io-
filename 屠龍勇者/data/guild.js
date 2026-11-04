// 傭兵公會正式入口與名冊。任務出發須後端及場景就緒，不從試玩頁領獎。
const GUILD_ROLE_NAMES = { tank: '盾衛', warrior: '戰士', ranger: '遊俠', mage: '法師', healer: '補師', scout: '斥候' };
const GUILD_PORTRAITS = {
    sentinel: 'images/sprites/mercenary/companions-v1/bulwark/portrait.png',
    warrior: 'images/sprites/mercenary/companions-v1/war/portrait.png',
    ranger: 'images/sprites/mercenary/companions-v1/wild/portrait.png',
    arcanist: 'images/sprites/mercenary/companions-v1/arcane/portrait.png',
    healer: 'images/sprites/mercenary/companions-v1/wish/portrait.png',
    scout: 'images/sprites/guild/scout-v1/portrait.png'
};
const guildDrafts = new WeakMap();
let guildServerMessage = '', guildServerBusy = false;
function guildRefresh() { renderTabs(); renderPanel(); }
function openGuild() {
    if (!player || !inTown()) { showToast('回到村莊才能進入傭兵公會'); return; }
    switchTab('guild');
}
function guildCurrent() {
    if (!player) return null;
    const owner = guildOwner();
    if ((!player.guild || player.guild.ownerId === '' && owner) && guildNormalize(player, owner)) saveGame();
    if (!guildCheck(player).ok) return null;
    const g = player.guild;
    if (!Array.isArray(g.members) || !Array.isArray(g.squad) || !Array.isArray(g.outbox)
        || !g.members.every(m => m && Object.keys(GuildCore.MEMBERS).includes(m.id))) return null;
    return g;
}
function guildDraft(g) {
    let ids = guildDrafts.get(g);
    if (!ids) { ids = g.squad.slice(); guildDrafts.set(g, ids); }
    return ids;
}
function guildPick(id) {
    if(guildMissionBusy)return;
    if (!player || !inTown()) return;
    const g = guildCurrent();
    if (!g || g.activeTicket) return;
    const member = g.members.find(m => m.id === id), ids = guildDraft(g);
    if (!member) return;
    if (ids.includes(id)) ids.splice(ids.indexOf(id), 1);
    else {
        if (member.restUntil > Date.now()) { showToast('這位夥伴仍在療養'); return; }
        if (ids.length >= 3) { showToast('每場三名，請先取消一位再替換'); return; }
        ids.push(id);
    }
    guildRefresh();
}
function guildResetSquad() {
    if(guildMissionBusy)return;
    if (!player || !inTown()) return;
    const g = guildCurrent(); if (!g || g.activeTicket) return;
    guildDrafts.delete(g); guildRefresh();
}
function guildSaveSquad() {
    if(guildMissionBusy)return;
    if (!player || !inTown()) return;
    const g = guildCurrent(); if (!g) return;
    const result = GuildCore.select(g, guildDraft(g), Date.now());
    if (!result.ok) { showToast(result.code === 'member_resting' ? '療養中的夥伴不能出戰' : '請選擇三名不同且可出戰的夥伴'); return; }
    player.guild = result.state; saveGame(); showToast('公會編隊已保存'); guildRefresh();
}
async function guildRefreshStatus() {
    if (!player || !inTown() || guildServerBusy) return;
    const subject = player, owner = guildOwner(), g = guildCurrent();
    if (!g) return;
    if (typeof cloudSb === 'undefined' || !cloudSb || typeof cloudUser === 'undefined' || !cloudUser || cloudUser.id !== owner) {
        guildServerMessage = '登入後可查看公會任務開放狀態。'; guildRefresh(); return;
    }
    guildServerBusy = true; guildServerMessage = '正在查看公會公告…'; guildRefresh();
    try {
        const response = await cloudSb.rpc('guild_mission_status',{p_character:g.characterId});
        if (player !== subject || guildOwner() !== owner) return;
        guildServerMessage = response.error ? '暫時無法取得公會公告，請稍後再試。'
            : response.data && response.data.enabled ? '公會任務已開放。公會聲望 '+fmt(response.data.wallet.rep)+'／代幣 '+fmt(response.data.wallet.tokens)+'／培養徽章 '+fmt(response.data.wallet.badges)+'。'+(response.data.book?'本週討伐 '+response.data.book.hunt+'/4、防衛／護送 '+response.data.book.defense+'/2。每週一06:00重置，舊週成果寬限24小時。':'') : '公會任務尚未開放，名冊與地區探索可以先行使用。';
    } catch (e) { if (player === subject && guildOwner() === owner) guildServerMessage = '暫時無法取得公會公告，請稍後再試。'; }
    finally {
        guildServerBusy = false;
        if (player !== subject || guildOwner() !== owner) guildServerMessage = '';
        if (player && inTown() && currentTab === 'guild') guildRefresh();
    }
}
function renderGuild() {
    if (!player || !inTown()) return '<div class="panel notice">請回到村莊整理公會隊伍。</div>';
    const g = guildCurrent();
    if (!g) return '<div class="panel notice">公會資料暫時無法讀取。原資料已保留，請稍後重新登入。</div>';
    const ids = guildDraft(g), now = Date.now();
    let h = '<div class="panel"><h3>傭兵公會</h3><p>每場選派三位夥伴。夥伴只參加公會任務，離開任務後返回公會。</p>'
        + '<p class="muted">可使用已保存的三人編隊進行地區探索，或從十二項任務中選擇路線。</p></div>';
    h += '<div class="panel"><h3>地區探索</h3><p>三大區道路與碼頭可往返。先保存編隊再出發，探索不發任務獎勵；離開後返回原村莊。</p><div class="btn-row">'
        + '<button data-guild-depart onclick="guildDepart(\'harbor\')"' + (g.activeTicket ? ' disabled' : '') + '>低語海島</button>'
        + '<button data-guild-depart onclick="guildDepart(\'foothills\')"' + (g.activeTicket ? ' disabled' : '') + '>熔火群山</button>'
        + '<button data-guild-depart onclick="guildDepart(\'port\')"' + (g.activeTicket ? ' disabled' : '') + '>沉船群島</button></div></div>';
    h += '<div class="panel"><b>出戰編隊 ' + ids.length + '／3</b><div class="btn-row"><button onclick="guildSaveSquad()"' + (g.activeTicket || ids.length !== 3 ? ' disabled' : '') + '>保存編隊</button><button class="secondary" onclick="guildResetSquad()"' + (g.activeTicket ? ' disabled' : '') + '>取消變更</button></div></div>';
    for (const [id, definition] of Object.entries(GuildCore.MEMBERS)) {
        const member = g.members.find(m => m.id === id), selected = ids.includes(id), resting = member && member.restUntil > now;
        const portrait = GUILD_PORTRAITS[id];
        h += '<div class="panel" style="display:flex;gap:12px;align-items:center;opacity:' + (member ? '1' : '.55') + '">'
            + (portrait ? '<img alt="' + esc(definition.name) + '" src="' + portrait + '" style="width:64px;height:80px;object-fit:contain">' : '<span style="font-size:36px">🗡️</span>')
            + '<div style="flex:1;min-width:0"><b>' + esc(definition.name) + '</b><div>' + esc(GUILD_ROLE_NAMES[definition.role]) + ' · '
            + (!member ? '尚未招募' : resting ? '療養約 ' + Math.ceil((member.restUntil - now) / 60000) + ' 分鐘' : selected ? '已選出戰' : '待命') + '</div>'
            + (member ? '<button class="mini secondary" onclick="guildPick(\'' + id + '\')"' + (g.activeTicket || resting && !selected ? ' disabled' : '') + '>' + (selected ? '取消選派' : '選派') + '</button>' : '<small class="muted">完成夥伴的公會招募任務後加入。</small>') + '</div></div>';
    }
    h += '<div class="panel"><h3>公會任務冊 · 普通（12項）</h3><p>先保存三人編隊，再選擇任務。每週討伐4次、防衛／護送2次計入任務冊；同任務重打或超出次數，無聲望、代幣與徽章25%。</p><p>待交付成果 '+g.outbox.length+' 筆 · 已確認序號 '+g.serverCursor+'</p><button onclick="guildMissionSubmitAll()"'+(guildMissionBusy||g.activeTicket||!g.outbox.length?' disabled':'')+'>批次交付成果（最多8筆）</button><p>'+esc(guildMissionNotice)+'</p></div>';
    for(const [id,d]of Object.entries(GuildMissions.defs)){
        const active=g.activeTicket&&g.activeTicket.ticket.missionId===id,pending=g.outbox.some(r=>r.missionId===id),defense=GuildCore.MISSIONS[id].kind!=='expedition';
        h+='<div class="panel"><h3>'+esc(d.name)+' · '+(defense?'防衛／護送':'討伐探索')+'</h3><p>'+esc(d.brief)+'</p><p class="muted">任務冊內：聲望'+(defense?150:100)+'／代幣'+(defense?15:10)+'／培養徽章'+(defense?30:20)+'；可選目標達成，代幣再加20%。</p><div class="btn-row">';
        if(active)h+='<button onclick="guildMissionResume()">繼續任務</button><button class="secondary" onclick="guildMissionAbandon()">放棄任務</button>';
        else h+='<button onclick="guildMissionStart(\''+id+'\')"'+(guildMissionBusy||g.activeTicket||pending||g.outbox.length>=32?' disabled':'')+'>接取並出發</button>';
        if(pending)h+='<button onclick="guildMissionSubmitMission(\''+id+'\')"'+(guildMissionBusy||g.activeTicket?' disabled':'')+'>交付此任務成果</button>';
        h+='</div></div>';
    }
    h+='<div class="panel"><p>'+esc(guildServerMessage||'成果由公會確認；查看公會公告可查詢聲望、代幣與培養徽章。')+'</p><button class="secondary" onclick="guildRefreshStatus()"'+(guildServerBusy?' disabled':'')+'>查看公會公告</button></div>';
    return h;
}
TABS.guild = ['🏛️', '傭兵公會'];
PANEL_FNS.guild = renderGuild;
DRAWERS.left.splice(4, 0, ['guild', '🏛️', '傭兵公會']);
