// 存檔上傳被 RLS 擋下時的自動判斷（第 166 節）隔離測試：模擬伺服器，不連網、不讀寫真實存檔。
// 停權 → 停權提示；帳號在別台使用中 → 已在其他裝置登入；登入已被作廢 → 登入已失效並登出；登入正常／連不上 → 不登出、下次再傳。
const fs = require('fs'), path = require('path'), vm = require('vm'), assert = require('assert/strict');
const root = path.resolve(__dirname, '..'), memory = new Map();
const sandbox = { console: { ...console, warn() {} }, assert, Image: function () {}, setTimeout: (f) => 0, clearTimeout() {}, setInterval: () => 0, clearInterval() {}, crypto: globalThis.crypto, TextEncoder, TextDecoder, btoa, atob,
    localStorage: { getItem: k => memory.has(k) ? memory.get(k) : null, setItem: (k, v) => memory.set(k, v), removeItem: k => memory.delete(k) },
    document: { addEventListener() {}, getElementById: () => null, querySelector: () => null, documentElement: { style: {} } },
    window: { addEventListener() {}, innerWidth: 400, innerHeight: 800 }, navigator: { userAgent: 'test' }, fetch() { throw Error('禁止連線'); } };
const ctx = vm.createContext(sandbox);
for (const [, file] of fs.readFileSync(path.join(root, 'index.html'), 'utf8').matchAll(/<script src="(data\/[^"?]+\.js)\?v=/g)) {
    if (file === 'data/main.js' || file === 'data/pwa.js') continue;
    vm.runInContext(fs.readFileSync(path.join(root, file), 'utf8'), ctx, { filename: file });
}
vm.runInContext(String.raw`
(async () => {
    const alerts = [];
    gameAlert = (t, m) => alerts.push(t); renderCloudEntry = () => {}; cloudRefreshScreen = () => {}; showTitle = () => {}; saveGame = () => {};
    cloudTimeout = p => Promise.resolve(p);
    // 模擬伺服器：ban＝停權、ping＝心跳結果、user＝getUser 結果、throwPing＝連不上
    const mock = o => {
        o.signedOut = false;
        cloudSb = {
            from: () => ({ select: () => ({ eq: () => ({ maybeSingle: async () => ({ data: o.ban || null, error: null }) }) }) }),
            rpc: async (fn) => { if (o.throwPing) throw Error('Failed to fetch'); assert.equal(fn, 'online_ping'); return { data: o.ping, error: null }; },
            auth: { getUser: async () => o.user, signOut: async () => { o.signedOut = true; return {}; } },
        };
        cloudUser = { id: 'u1', email: 'a@b.c' }; cloudBan = null; cloudBanShown = false;
        return o;
    };
    // 1. 停權
    let o = mock({ ban: { reason: '測試' } });
    assert.equal(await cloudRlsBlocked(), true); assert.equal(alerts.pop(), '⛔ 帳號已停權'); assert.equal(o.signedOut, false, '停權不登出');
    // 2. 帳號在別台使用中
    o = mock({ ping: false });
    assert.equal(await cloudRlsBlocked(), true); assert.equal(alerts.pop(), '已在其他裝置登入'); assert.equal(o.signedOut, true); assert.equal(cloudUser, null);
    // 3. 登入已被作廢（session_not_found）
    o = mock({ ping: true, user: { data: { user: null }, error: { status: 403, code: 'session_not_found', message: 'Session from session_id claim in JWT does not exist' } } });
    assert.equal(await cloudRlsBlocked(), true); assert.equal(alerts.pop(), '登入已失效'); assert.equal(o.signedOut, true); assert.equal(cloudUser, null);
    // 4. 登入正常：不登出、交給下一輪
    o = mock({ ping: true, user: { data: { user: { id: 'u1' } }, error: null } });
    assert.equal(await cloudRlsBlocked(), false); assert.equal(alerts.length, 0); assert.equal(o.signedOut, false);
    // 5. 連不上（心跳、getUser 都可能）：不下判斷
    o = mock({ throwPing: true });
    assert.equal(await cloudRlsBlocked(), false); assert.equal(o.signedOut, false);
    o = mock({ ping: true, user: { data: { user: null }, error: { status: 0, message: 'Failed to fetch' } } });
    assert.equal(await cloudRlsBlocked(), false); assert.equal(o.signedOut, false);
    // 6. 上傳流程：42501 時呼叫判斷；登入正常就清掉 10 分鐘暫停、下一輪再傳
    o = mock({ ping: true, user: { data: { user: { id: 'u1' } }, error: null } });
    cloudDirty = new Set([0]); cloudConflict = {}; cloudSlotHold = {};
    cloudPushSlot = async () => { const e = Error('new row violates row-level security policy for table "dragon_saves"'); e.code = '42501'; throw e; };
    assert.equal(await cloudFlushRun(), false); assert.equal(cloudSlotHold[0], undefined, '登入正常不卡 10 分鐘'); assert(cloudDirty.has(0));
    o = mock({ ping: true, user: { data: { user: null }, error: { status: 403, code: 'session_not_found' } } });
    cloudDirty = new Set([0]);
    assert.equal(await cloudFlushRun(), false); assert.equal(alerts.pop(), '登入已失效'); assert.equal(cloudUser, null);
    console.log('PASS: 停權／別台使用中／登入失效／登入正常／連不上，上傳流程 42501 自動判斷');
})().catch(e => { console.error(e); process.exitCode = 1; });
`, ctx);
