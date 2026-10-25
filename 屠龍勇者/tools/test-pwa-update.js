// 隔離DOM／網路／時間：不開關瀏覽器、不讀寫玩家存檔或連正式後端。
const fs = require('fs'), path = require('path'), vm = require('vm'), assert = require('assert/strict');
const root = path.join(__dirname, '..');
const version = fs.readFileSync(path.join(root, 'data/config.js'), 'utf8').match(/const GAME_VERSION = '([^']+)'/)[1];
const nodes = new Map(), windowEvents = {}, documentEvents = {}, intervals = [], timeouts = new Map(), calls = [], actions = [];
let now = 1000000, timerId = 0, response = () => ({ ok: true, text: async () => `<script src="data/config.js?v=${version}"></script>` });
const document = {
    visibilityState: 'visible',
    addEventListener: (name, fn) => { documentEvents[name] = fn; },
    createElement: () => ({ dataset: {}, setAttribute() {} }),
    body: { appendChild: b => { nodes.set(b.id, b); } }
};
const context = vm.createContext({
    assert, console, AbortController, GAME_VERSION: version, GAME_TITLE: '黑暗大陸', document,
    navigator: { onLine: true, userAgent: '', platform: '' },
    window: { addEventListener: (name, fn) => { windowEvents[name] = fn; } },
    location: { protocol: 'https:', reload: () => actions.push('reload') },
    Date: class extends Date { static now() { return now; } },
    setInterval: (fn, ms) => intervals.push({ fn, ms }),
    setTimeout: (fn, ms) => { const id = ++timerId; timeouts.set(id, { fn, ms }); return id; },
    clearTimeout: id => timeouts.delete(id),
    $: id => nodes.get(id), hasSave: () => true,
    saveGame: () => actions.push('save'), showToast: () => {},
    localStorage: { getItem() { throw Error('不應讀取存檔'); }, setItem() { throw Error('不應寫入存檔'); } },
    fetch: async (url, options) => { calls.push({ url, options }); return response(options); }
});
vm.runInContext(fs.readFileSync(path.join(root, 'data/pwa.js'), 'utf8'), context);
const run = code => vm.runInContext(code, context);
const advance = () => { now += 60000; };
(async () => {
    run('initPwa()'); await new Promise(resolve => setImmediate(resolve));
    assert.equal(intervals[0].ms, 60000); assert.equal(calls.length, 1);
    assert(windowEvents.focus && windowEvents.online && documentEvents.visibilitychange);
    await run('checkNewVersion()'); assert.equal(calls.length, 1, '啟動後事件節流');
    assert.equal(nodes.size, 0, '同版本不提示');
    assert.equal(calls[0].options.cache, 'no-store'); assert(calls[0].options.signal);
    assert.equal(run("pwaNewerVersion('20261025aa','20261025z')"), true);
    assert.equal(run("pwaNewerVersion('20261025z','20261025aa')"), false);
    assert.equal(run("pwaNewerVersion('20261026a','20261025zz')"), true);
    assert.equal(run("pwaNewerVersion('invalid',GAME_VERSION)"), false);
    response = () => ({ ok: true, text: async () => '<script src="data/game.js?v=20990101a"></script>' });
    advance(); await run('checkNewVersion()');
    const banner = nodes.get('pwa-update'); assert(banner); assert(banner.textContent.includes('有新的更新檔')); assert.equal(actions.length, 0, '不能強制更新');
    advance(); await run('checkNewVersion()'); assert.equal(nodes.size, 1, '不重複提示');
    response = () => ({ ok: true, text: async () => '<script src="data/config.js?v=20990101b"></script>' });
    advance(); await run('checkNewVersion()'); assert.equal(banner.dataset.version, '20990101b', '提示追蹤新版本');
    response = () => ({ ok: true, text: async () => '<script src="data/game.js?v=20000101a"></script>' });
    advance(); await run('checkNewVersion()'); assert.equal(banner.dataset.version, '20990101b', '舊快取不降版');
    let count = calls.length; document.visibilityState = 'hidden'; advance(); await run('checkNewVersion()'); assert.equal(calls.length, count);
    document.visibilityState = 'visible'; context.navigator.onLine = false; await run('checkNewVersion()'); assert.equal(calls.length, count);
    context.navigator.onLine = true; response = () => { throw Error('離線'); }; await run('checkNewVersion()');
    advance(); response = () => ({ ok: false, text: async () => { throw Error('不應解析失敗頁'); } }); await run('checkNewVersion()');
    let release; response = () => new Promise(resolve => { release = resolve; });
    advance(); const pending = run('checkNewVersion()'); count = calls.length; advance(); await run('checkNewVersion()'); assert.equal(calls.length, count, '請求未結束不重入');
    release({ ok: true, text: async () => '' }); await pending; assert.equal(timeouts.size, 0);
    advance(); response = () => ({ ok: true, text: async () => '<script src="data/game.js?v=20990101c"></script>' });
    await windowEvents.online(); assert.equal(banner.dataset.version, '20990101c', '恢復連線檢查');
    banner.onclick(); banner.onclick(); assert.deepEqual(actions, ['save', 'reload']); assert.equal(banner.disabled, true);
    if (process.argv[2]) {
        const built = fs.readFileSync(path.join(process.argv[2], 'index.html'), 'utf8');
        assert(built.includes(`data/game.js?v=${version}`));
        response = () => ({ ok: true, text: async () => built }); advance(); await run('checkNewVersion()');
    }
    console.log('PASS PWA: 開發與正式合併版／啟動與每分鐘／事件檢查／節流及防重入／新版提示不強制刷新／跨z-aa排序／離線與錯誤重試／先存再刷新且單次點擊');
})().catch(e => { console.error(e); process.exitCode = 1; });
