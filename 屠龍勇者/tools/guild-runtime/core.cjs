'use strict';
// 公會純規則核心：名冊已接正式遊戲；不讀寫存檔、不連線、不自行發獎。
const GuildCore = (() => {
    function hasOwn(object, key) { return Object.prototype.hasOwnProperty.call(object, key); }
    const VERSION = 1, RULE_VERSION = 'guild-draft-1', REST_MS = 30 * 60 * 1000, MAX_OUTBOX = 32;
    const MEMBERS = Object.freeze({
        sentinel: { role: 'tank', name: '鐵誓・洛恩' }, warrior: { role: 'warrior', name: '赤刃・凱菈' },
        ranger: { role: 'ranger', name: '林影・艾琳' }, arcanist: { role: 'mage', name: '星燼・賽洛' },
        healer: { role: 'healer', name: '曙光・米菈' }, scout: { role: 'scout', name: '渡鴉・瑞克' },
    });
    const INITIAL = Object.freeze(Object.fromEntries([
        ...['royal', 'knight', 'shura', 'warrior'].map(id => [id, ['ranger', 'arcanist', 'healer']]),
        ...['mage', 'elf', 'darkelf', 'gunner', 'magicfighter', 'demon'].map(id => [id, ['sentinel', 'warrior', 'healer']]),
        ...['paladin', 'angel'].map(id => [id, ['sentinel', 'ranger', 'arcanist']]),
    ]));
    // 任務與活動目錄承接既有藍圖；非宣稱所有場景／戰鬥已製作。
    const MISSIONS = Object.freeze(Object.fromEntries([
        ['lostMiners', '失聯採礦隊', 'whisperingIsle', 'expedition'],
        ['poisonHerbs', '毒霧藥草', 'shipwreckIsles', 'expedition'],
        ['tradeRoad', '商道清剿', 'whisperingIsle', 'expedition'],
        ['ancientSeal', '古墓封印', 'shipwreckIsles', 'expedition'],
        ['dragonOutpost', '獵龍前哨', 'emberMountains', 'expedition'],
        ['lostBanner', '失落旗幟', 'whisperingIsle', 'expedition'],
        ['lastCampfire', '最後營火', 'whisperingIsle', 'defense', 600000],
        ['northGate', '北境城門', 'whisperingIsle', 'defense', 600000],
        ['sealKeeper', '守護封印師', 'shipwreckIsles', 'defense', 600000],
        ['refugeeEvacuation', '難民撤離', 'whisperingIsle', 'escort'],
        ['crystalCart', '魔晶運輸車', 'emberMountains', 'escort'],
        ['dragonTide', '龍潮之夜', 'emberMountains', 'defense', 600000],
    ].map(([id, name, map, kind, survivalMs = 0]) => [id, { id, name, map, kind, survivalMs }])));
    const ACTIVITIES = Object.freeze(['personalRecruit', 'guildExpedition', 'weeklyBounty', 'supplyDelivery', 'rescueSearch', 'training', 'eliteChallenge']);
    function freeze(x) { for (const v of Object.values(x)) if (v && typeof v === 'object') freeze(v); return Object.freeze(x); }
    freeze(MEMBERS); freeze(INITIAL); freeze(MISSIONS);
    function verified(fn, payload) { try { return typeof fn === 'function' && fn(copy(payload)) === true; } catch (e) { return false; } }
    function copy(x) { return JSON.parse(JSON.stringify(x)); }
    function text(x, max = 120) { return typeof x === 'string' && x.length > 0 && x.length <= max; }
    function time(x) { return Number.isSafeInteger(x) && x >= 0; }
    function memberId(id) { return typeof id === 'string' && hasOwn(MEMBERS, id); }
    function error(code) { return { ok: false, code }; }
    function binding(identity) {
        if (!identity || !hasOwn(INITIAL, identity.cls) || !time(identity.created) || !identity.created
            || typeof identity.ownerId !== 'string' || identity.ownerId.length > 120) throw Error('invalid_identity');
        return { ownerId: identity.ownerId, characterId: identity.created + '|' + identity.cls, baseClass: identity.cls };
    }
    function sameBinding(a, b) { return a && b && a.ownerId === b.ownerId && a.characterId === b.characterId; }
    function create(identity, now) {
        if (!time(now)) throw Error('invalid_time');
        const b = binding(identity), ids = INITIAL[b.baseClass];
        return { v: VERSION, ...b, members: ids.map(id => ({ id, joinedAt: now, restUntil: 0 })), squad: ids.slice(),
            recruitProgress: {}, explored: {}, activeTicket: null, outbox: [], serverCursor: 0, settled: [] };
    }
    function normalize(raw, identity, now) {
        const fresh = create(identity, now);
        if (raw == null) return { ok: true, state: fresh };
        if (typeof raw !== 'object' || Array.isArray(raw)) return error('state_invalid');
        if (!sameBinding(raw, fresh) || raw.baseClass !== fresh.baseClass) return error('identity_mismatch');
        if (raw.v !== VERSION) return error('unsupported_version');
        let encoded; try { encoded = JSON.stringify(raw); } catch (e) { return error('state_invalid'); }
        if (encoded.length > 131072) return error('state_too_large');
        const s = { ...fresh, activeTicket: raw.activeTicket ? copy(raw.activeTicket) : null, outbox: copy(raw.outbox || []) }, seen = new Set();
        s.members = (Array.isArray(raw.members) ? raw.members : []).filter(m => m && memberId(m.id) && !seen.has(m.id) && seen.add(m.id))
            .slice(0, 6).map(m => ({ id: m.id, joinedAt: time(m.joinedAt) ? m.joinedAt : now,
                restUntil: time(m.restUntil) && m.restUntil > now ? Math.min(m.restUntil, now + REST_MS) : 0 }));
        // 有效舊資料不重置名冊；只有缺漏的初始團員補回，不按二轉分支換人。
        for (const id of INITIAL[s.baseClass]) if (!s.members.some(m => m.id === id)) s.members.push({ id, joinedAt: now, restUntil: 0 });
        const available = new Set(s.members.map(m => m.id));
        s.squad = [...new Set((Array.isArray(raw.squad) ? raw.squad : []).filter(id => available.has(id)))].slice(0, 3);
        s.serverCursor = time(raw.serverCursor) ? raw.serverCursor : 0;
        s.settled = (Array.isArray(raw.settled) ? raw.settled : []).filter(r => r && text(r.ticketId) && time(r.seq) && r.seq <= s.serverCursor).slice(-32);
        if (!Array.isArray(raw.outbox) || raw.outbox.length > MAX_OUTBOX) return error('outbox_invalid');
        const queued = new Set();
        for (const r of raw.outbox) {
            if (!r || !sameBinding(r, s) || !text(r.ticketId) || !hasOwn(MISSIONS, r.missionId) || !text(r.ruleVersion)
                || !Array.isArray(r.team) || r.team.length !== 3 || new Set(r.team).size !== 3 || !r.team.every(memberId)
                || !text(r.logRef, 200) || !/^[a-f0-9]{64}$/.test(r.logHash || '') || !time(r.completedAt) || !time(r.simulationMs)
                || r.status !== 'pending' || queued.has(r.ticketId)) return error('outbox_invalid');
            queued.add(r.ticketId);
        }
        s.recruitProgress = {};
        if (raw.recruitProgress && typeof raw.recruitProgress === 'object') for (const [id, value] of Object.entries(raw.recruitProgress)) {
            if (hasOwn(MISSIONS, id) && time(value) && value <= 10000) s.recruitProgress[id] = value;
        }
        s.explored = {};
        if (raw.explored && typeof raw.explored === 'object') for (const [map, value] of Object.entries(raw.explored)) {
            if (!['whisperingIsle', 'emberMountains', 'shipwreckIsles'].includes(map) || !value || !text(value.version, 80) || !value.chunks || typeof value.chunks !== 'object') continue;
            const chunks = {};
            for (const [key, bits] of Object.entries(value.chunks).slice(0, 256)) {
                if (/^(?:[0-9]|[12][0-9]|3[01]):(?:[0-9]|[12][0-9]|3[01])$/.test(key) && typeof bits === 'string' && /^[a-f0-9]{256}$/.test(bits)) chunks[key] = bits;
            }
            s.explored[map] = { version: value.version, chunks };
        }
        // 不因載入角色自動恢復NPC／戰鬥；activeTicket只保留憑證，adapter須重新驗證才可進場。
        if (s.activeTicket) {
            const run = s.activeTicket, t = run.ticket;
            if (!t || !sameBinding(t, s) || !text(t.ticketId) || !hasOwn(MISSIONS, t.missionId) || !text(t.ruleVersion)
                || !time(t.issuedAt) || !time(t.expiresAt) || t.expiresAt <= t.issuedAt || !time(run.startedAt) || run.startedAt < t.issuedAt || run.startedAt > now
                || !Array.isArray(t.team) || t.team.length !== 3 || new Set(t.team).size !== 3 || !t.team.every(id => available.has(id))
                || !['active', 'paused'].includes(run.phase)) return error('active_invalid');
        }
        s.activeTicket = s.activeTicket ? { ...s.activeTicket, phase: 'paused' } : null;
        return { ok: true, state: s };
    }
    function adoptOwner(s, identity, now) {
        const expected = create(identity, now);
        if (s.ownerId || !expected.ownerId || s.characterId !== expected.characterId || s.baseClass !== expected.baseClass
            || s.serverCursor || s.activeTicket || s.outbox.length || s.settled.length) return error('owner_adoption_forbidden');
        // 僅已由外層雲端流程確認的同角色首次綁帳；未驗證名冊不帶入。
        expected.explored = copy(s.explored);
        return { ok: true, state: expected };
    }
    function select(s, ids, now) {
        if (s.activeTicket) return error('mission_active');
        if (!time(now) || !Array.isArray(ids) || ids.length !== 3 || new Set(ids).size !== 3) return error('three_members_required');
        for (const id of ids) {
            const m = s.members.find(m => m.id === id);
            if (!m) return error('member_locked');
            if (m.restUntil > now) return error('member_resting');
        }
        const next = copy(s); next.squad = ids.slice(); return { ok: true, state: next };
    }
    function begin(s, ticket, now, security = {}) {
        if (s.activeTicket) return error('mission_active');
        if (s.outbox.length >= MAX_OUTBOX) return error('outbox_full');
        if (!time(now) || !ticket || !sameBinding(ticket, s) || !s.ownerId) return error('ticket_identity');
        if (!text(ticket.ticketId) || !hasOwn(MISSIONS, ticket.missionId) || ticket.ruleVersion !== RULE_VERSION
            || !time(ticket.issuedAt) || !time(ticket.expiresAt) || ticket.issuedAt > now || ticket.expiresAt <= now
            || !Number.isInteger(ticket.seed) || ticket.seed < 0 || ticket.seed > 0xffffffff) return error('ticket_invalid');
        if (!verified(security.verifyTicket, ticket)) return error('ticket_unverified');
        if (s.outbox.some(r => r.ticketId === ticket.ticketId) || s.settled.some(r => r.ticketId === ticket.ticketId)) return error('ticket_used');
        const choice = select(s, ticket.team, now);
        if (!choice.ok || ticket.team.some((id, i) => s.squad[i] !== id)) return error('ticket_team');
        const next = copy(s); next.activeTicket = { ticket: copy(ticket), phase: 'active', startedAt: now };
        return { ok: true, state: next };
    }
    function resume(s, checkpoint, now, security = {}) {
        const run = s.activeTicket;
        if (!run || run.phase !== 'paused' || !checkpoint || checkpoint.ticketId !== run.ticket.ticketId) return error('resume_invalid');
        if (!verified(security.verifyCheckpoint, checkpoint)) return error('checkpoint_unverified');
        const result = begin({ ...s, activeTicket: null }, run.ticket, now, security);
        if (!result.ok) return result;
        result.state.activeTicket.startedAt = run.startedAt;
        return result;
    }
    function finish(s, outcome, proof, downedIds, now) {
        const run = s.activeTicket;
        if (!run || !time(now) || now < run.startedAt || !['success', 'failed', 'abandoned'].includes(outcome)) return error('run_invalid');
        if (!Array.isArray(downedIds) || new Set(downedIds).size !== downedIds.length || downedIds.some(id => !run.ticket.team.includes(id))) return error('downed_invalid');
        if (outcome === 'success') {
            if (run.phase !== 'active' || now > run.ticket.expiresAt) return error('run_expired_or_paused');
            if (!proof || !text(proof.logRef, 200) || !/^[a-f0-9]{64}$/.test(proof.logHash || '') || !time(proof.simulationMs)
                || proof.simulationMs < MISSIONS[run.ticket.missionId].survivalMs) return error('proof_invalid');
            if (s.outbox.length >= MAX_OUTBOX) return error('outbox_full');
        }
        const next = copy(s);
        for (const id of downedIds) {
            const member = next.members.find(m => m.id === id);
            if (member) member.restUntil = now + REST_MS;
        }
        if (outcome === 'success') next.outbox.push({ ticketId: run.ticket.ticketId, missionId: run.ticket.missionId,
            ownerId: s.ownerId, characterId: s.characterId, ruleVersion: run.ticket.ruleVersion, team: run.ticket.team.slice(),
            completedAt: now, simulationMs: proof.simulationMs, logRef: proof.logRef, logHash: proof.logHash, status: 'pending' });
        next.activeTicket = null;
        return { ok: true, state: next, exit: { removeCompanions: true, clearAggro: true, clearCommands: true, clearSummons: true, clearTemporaryEffects: true } };
    }
    function receipt(s, r, now, security = {}) {
        if (!time(now) || !r || !sameBinding(r, s) || !text(r.ticketId) || !time(r.seq) || r.seq < 1) return error('receipt_invalid');
        if (!verified(security.verifyReceipt, r)) return error('receipt_unverified');
        if (r.seq <= s.serverCursor) return { ok: true, duplicate: true, state: copy(s) };
        if (r.seq !== s.serverCursor + 1) return error('receipt_gap');
        const report = s.outbox.find(x => x.ticketId === r.ticketId);
        if (!report || r.missionId !== report.missionId || r.logHash !== report.logHash || r.ruleVersion !== report.ruleVersion || !['accepted', 'rejected'].includes(r.status)) return error('receipt_mismatch');
        if (!Array.isArray(r.recruits) || r.recruits.some(id => !memberId(id)) || (r.status !== 'accepted' && r.recruits.length)) return error('receipt_recruits');
        const next = copy(s);
        if (r.status === 'accepted') for (const id of new Set(r.recruits)) {
            if (!next.members.some(m => m.id === id)) next.members.push({ id, joinedAt: now, restUntil: 0 });
        }
        next.outbox = next.outbox.filter(x => x.ticketId !== r.ticketId);
        next.serverCursor = r.seq;
        next.settled.push({ ticketId: r.ticketId, seq: r.seq, status: r.status, reason: typeof r.reason === 'string' ? r.reason.slice(0, 200) : '' });
        next.settled = next.settled.slice(-32);
        // 只映射服務端結果與招募。這裡沒有加金幣／道具／代幣的本機捷徑。
        return { ok: true, state: next };
    }
    return Object.freeze({ VERSION, RULE_VERSION, REST_MS, MAX_OUTBOX, MEMBERS, INITIAL, MISSIONS, ACTIVITIES,
        create, normalize, adoptOwner, select, begin, resume, finish, receipt });
})();
module.exports = GuildCore;
