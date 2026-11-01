'use strict';
const assert = require('node:assert/strict'), G = require('./core.cjs'), GuildSync = require('./sync.cjs');
const NOW = 1793491200000, identity = { ownerId: 'A', created: NOW - 1, cls: 'knight' };
const copy = x => JSON.parse(JSON.stringify(x));
function queued(n) {
    let s = G.create(identity, NOW);
    for (let i = 0; i < n; i++) {
        const ticket = { ticketId: 't' + i, ownerId: s.ownerId, characterId: s.characterId, missionId: 'lastCampfire',
            ruleVersion: G.RULE_VERSION, issuedAt: NOW, expiresAt: NOW + 86400000, seed: i, team: s.squad.slice() };
        s = G.begin(s, ticket, NOW, { verifyTicket: () => true }).state;
        s = G.finish(s, 'success', { logRef: 'log/' + i, logHash: 'a'.repeat(64), simulationMs: 600000 }, [], NOW + 600000).state;
    }
    return s;
}
function harness(n) {
    let stored = queued(n), ctx = { ownerId: stored.ownerId, characterId: stored.characterId }, seq = 0, calls = 0, saveFail = false, conflict = false;
    const server = new Map();
    const opts = { context: () => ctx, load: async () => copy(stored), now: () => NOW + 600001, verifyReceipt: () => true,
        persistIfCurrent: async (id, before, next) => {
            if (saveFail) throw Error('disk_full');
            if (conflict) { conflict = false; stored.explored = { changedWhileAwaiting: true }; return false; }
            if (JSON.stringify(stored) !== JSON.stringify(before)) return false;
            stored = copy(next); return true;
        }, submit: async ({ reports }) => { calls++; return { receipts: reports.map(r => {
            if (!server.has(r.ticketId)) server.set(r.ticketId, { ownerId: r.ownerId, characterId: r.characterId, ticketId: r.ticketId,
                missionId: r.missionId, ruleVersion: r.ruleVersion, logHash: r.logHash, seq: ++seq, status: 'accepted', recruits: [] });
            return copy(server.get(r.ticketId));
        }).reverse() }; } };
    return { opts, get stored() { return stored; }, get calls() { return calls; }, server,
        fail(v) { saveFail = v; }, conflict() { conflict = true; }, swap() { ctx = { ownerId: 'B', characterId: 'foreign' }; } };
}
(async () => {
    const h = harness(17), sync = new GuildSync(h.opts);
    const a = sync.flush(), b = sync.flush(); assert.equal(a, b, '同角色合併重複點擊');
    const done = await a; assert(done.ok); assert.equal(done.applied, 17); assert.equal(h.calls, 3); assert.equal(h.stored.outbox.length, 0); assert.equal(h.server.size, 17);
    assert((await sync.flush()).ok); assert.equal(h.calls, 3, '空佇列不打RPC');
    const retry = harness(1), retrySync = new GuildSync(retry.opts); retry.fail(true);
    assert.equal((await retrySync.flush()).code, 'save_failed'); assert.equal(retry.stored.outbox.length, 1); assert.equal(retry.server.size, 1);
    retry.fail(false); assert((await retrySync.flush()).ok); assert.equal(retry.server.size, 1); assert.equal(retry.stored.outbox.length, 0);
    const race = harness(1); race.conflict(); assert((await new GuildSync(race.opts).flush()).ok); assert(race.stored.explored.changedWhileAwaiting, '重讀後保留並行角色更新');
    const swapped = harness(1); const originalSubmit = swapped.opts.submit; swapped.opts.submit = async req => { const r = await originalSubmit(req); swapped.swap(); return r; };
    assert.equal((await new GuildSync(swapped.opts).flush()).code, 'identity_changed'); assert.equal(swapped.stored.outbox.length, 1);
    const offline = harness(1); offline.opts.submit = async () => { throw Error('network'); };
    assert.equal((await new GuildSync(offline.opts).flush()).code, 'offline'); assert.equal(offline.stored.outbox.length, 1);
    const pending = harness(1); pending.opts.submit = async () => ({ receipts: [] });
    assert.equal((await new GuildSync(pending.opts).flush()).code, 'awaiting_verification'); assert.equal(pending.stored.outbox.length, 1);
    const forged = harness(1); forged.opts.verifyReceipt = () => false;
    assert.equal((await new GuildSync(forged.opts).flush()).code, 'receipt_unverified'); assert.equal(forged.stored.outbox.length, 1);
    console.log('PASS：17筆成果分3批／同場重送冪等／存檔失敗可重領收據／併發重讀保留變更／換帳角色後不採納／斷線與待驗證不丟資料／未驗證收據拒絕（隔離adapter，未連正式RPC）');
})().catch(e => { console.error(e); process.exitCode = 1; });
