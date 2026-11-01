'use strict';
const G = require('./core.cjs');
// 服務端RPC與加密存檔adapter尚未接線；此層只規範重送／身份切換／原子採納。
class GuildSync {
    constructor({ context, load, persistIfCurrent, submit, verifyReceipt, now, batchSize = 8 }) {
        if (![context, load, persistIfCurrent, submit, verifyReceipt, now].every(x => typeof x === 'function')
            || !Number.isInteger(batchSize) || batchSize < 1 || batchSize > 8) throw Error('invalid_sync_adapter');
        Object.assign(this, { context, load, persistIfCurrent, submit, verifyReceipt, now, batchSize });
        this.flights = new Map();
    }
    same(a) { const b = this.context(); return b && a.ownerId === b.ownerId && a.characterId === b.characterId; }
    flush() {
        const raw = this.context(), id = raw && { ownerId: raw.ownerId, characterId: raw.characterId };
        if (!id || !id.ownerId || !id.characterId) return Promise.resolve({ ok: false, code: 'not_signed_in' });
        const key = id.ownerId + '\0' + id.characterId;
        if (this.flights.has(key)) return this.flights.get(key);
        if (this.flights.size >= 2) return Promise.resolve({ ok: false, code: 'sync_busy' });
        const promise = this.run(id).finally(() => this.flights.delete(key));
        this.flights.set(key, promise); return promise;
    }
    async run(id) {
        let applied = 0;
        for (let round = 0; round < 4; round++) {
            let state;
            try { state = await this.load(id); } catch (e) { return { ok: false, code: 'load_failed', applied }; }
            if (!this.same(id)) return { ok: false, code: 'identity_changed', applied };
            if (!state || state.ownerId !== id.ownerId || state.characterId !== id.characterId || !Array.isArray(state.outbox)) return { ok: false, code: 'state_identity', applied };
            if (!state.outbox.length) return { ok: true, applied, pending: 0 };
            const reports = JSON.parse(JSON.stringify(state.outbox.slice(0, this.batchSize)));
            let response;
            try { response = await this.submit({ ...id, reports }); } catch (e) { return { ok: false, code: 'offline', applied }; }
            if (!this.same(id)) return { ok: false, code: 'identity_changed', applied };
            if (!response || !Array.isArray(response.receipts) || response.receipts.length > this.batchSize) return { ok: false, code: 'response_invalid', applied };
            const receipts = response.receipts.slice().sort((a, b) => (a && a.seq || 0) - (b && b.seq || 0));
            let progress = 0;
            for (const receipt of receipts) {
                if (!receipt || !reports.some(r => r.ticketId === receipt.ticketId)) return { ok: false, code: 'unexpected_receipt', applied };
                let committed = false;
                for (let retry = 0; retry < 3 && !committed; retry++) {
                    if (!this.same(id)) return { ok: false, code: 'identity_changed', applied };
                    let current;
                    try { current = await this.load(id); } catch (e) { return { ok: false, code: 'load_failed', applied }; }
                    if (!this.same(id)) return { ok: false, code: 'identity_changed', applied };
                    if (!current || current.ownerId !== id.ownerId || current.characterId !== id.characterId) return { ok: false, code: 'state_identity', applied };
                    const result = G.receipt(current, receipt, this.now(), { verifyReceipt: this.verifyReceipt });
                    if (!result.ok) return { ok: false, code: result.code, applied };
                    if (result.duplicate) { committed = true; break; }
                    try { committed = await this.persistIfCurrent(id, current, result.state) === true; }
                    catch (e) { return { ok: false, code: 'save_failed', applied }; }
                    if (!this.same(id)) return { ok: false, code: 'identity_changed', applied };
                    if (committed) { applied++; progress++; }
                }
                if (!committed) return { ok: false, code: 'state_conflict', applied };
            }
            if (!progress) return { ok: true, applied, pending: state.outbox.length, code: 'awaiting_verification' };
        }
        let current;
        try { current = await this.load(id); } catch (e) { return { ok: false, code: 'load_failed', applied }; }
        if (!this.same(id)) return { ok: false, code: 'identity_changed', applied };
        if (!current || current.ownerId !== id.ownerId || current.characterId !== id.characterId || !Array.isArray(current.outbox)) return { ok: false, code: 'state_identity', applied };
        return { ok: true, applied, pending: current.outbox.length };
    }
}
module.exports = GuildSync;
