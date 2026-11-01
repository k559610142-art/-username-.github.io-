// 公會角色資料；只依賴guild-core，不依賴介面或連線。
function guildIdentity(p, owner) { return { ownerId: typeof owner === 'string' ? owner : '', created: p.created, cls: p.cls }; }
function guildNormalize(p, owner) {
    if (!p) return false;
    const identity = guildIdentity(p, owner), now = Date.now(); // 招募與療養使用真實時間。
    let result;
    try {
        if (p.guild && p.guild.ownerId === '' && identity.ownerId) result = GuildCore.adoptOwner(p.guild, identity, now);
        else result = GuildCore.normalize(p.guild, identity, now);
    } catch (e) { return false; }
    if (!result.ok) return false; // 保留無法識別的原資料，不重置未交成果。
    p.guild = result.state;
    return true;
}
function guildOwner() { return typeof playerOwner === 'string' ? playerOwner : ''; }
function guildCheck(p) {
    try { return GuildCore.normalize(p.guild, guildIdentity(p, guildOwner()), Date.now()); }
    catch (e) { return { ok: false, code: 'state_invalid' }; }
}
