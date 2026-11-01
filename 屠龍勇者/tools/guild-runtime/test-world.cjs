'use strict';
const assert = require('node:assert/strict');
const { GuildWorld, GuildAssetCache } = require('./world.cjs');
const size = 256, mask = new Uint8Array(size * size).fill(1);
for (let y = 0; y < size; y++) for (let x = 124; x <= 131; x++) if (y < 125 || y > 133) mask[y * size + x] = 0;
const world = new GuildWorld(size, size, mask);
mask.fill(0); assert(world.canStand(8, 8), '防止外部素材改動碰撞圖');
assert.equal(world.path([8, 8], [125, 20]), null);
assert.equal(world.path([8, 8], [248, 248], 1), null, '搜尋預算有界');
const landmarks = [[20, 20], [35, 220], [115, 90], [115, 130], [140, 130], [240, 30], [248, 248], [190, 190], [150, 40], [30, 160], [8, 8]];
let total = 0;
const actors = Array.from({ length: 4 }, () => ({ x: 8, y: 8 })), trail = Array.from({ length: 32 }, () => [8, 8]);
for (const destination of landmarks) {
    const route = world.path([actors[0].x, actors[0].y], destination);
    assert(route, destination.join(','));
    for (const next of route) {
        assert(world.move(actors[0], next)); total++; trail.push(next); if (trail.length > 32) trail.shift();
        for (let i = 1; i < actors.length; i++) assert(world.move(actors[i], trail[Math.max(0, trail.length - 1 - i * 8)]));
        for (const a of actors) assert(world.canStand(a.x, a.y));
    }
    assert.deepEqual([actors[0].x, actors[0].y], destination);
}
const corner = new GuildWorld(2, 2, new Uint8Array([1, 0, 0, 1]));
assert.equal(corner.path([0, 0], [1, 1]), null);
assert(!corner.move({ x: 0, y: 0 }, [1, 1]));
assert(!world.move(actors[0], [240, 240]), '不能瞬移');
assert(world.reveal(20, 20, 8)); world.reveal(248, 248, 10);
const chunks = world.exportExplored(); assert(Object.values(chunks).every(x => x.length === 256));
const restored = new GuildWorld(size, size, world.mask); restored.importExplored(chunks);
assert.deepEqual(restored.explored, world.explored);
restored.importExplored({ '-1:0': 'f'.repeat(256), '999:999': 'f'.repeat(256), '1:1': '<script>' });
assert.deepEqual(restored.explored, world.explored);
assert.equal(world.visibleChunks({ x: 32, y: 32, width: 32, height: 32 }).length, 9);
assert.deepEqual(world.visibleChunks({ x: NaN, y: 0, width: 10, height: 10 }), []);
assert.equal(Object.keys(chunks).length, 2);
console.log('PASS：256×256地形、11地標四人共' + total + '步／河道只過橋／不切角不瞬移／搜尋預算／32格探索分塊往返與壞資料拒絕');
(async () => {
    let loads = 0, released = [];
    const cache = new GuildAssetCache(async key => { loads++; return { value: key, bytes: 8, dispose: () => released.push(key) }; }, 16, 2);
    const [a, a2] = await Promise.all([cache.acquire('a'), cache.acquire('a')]);
    assert.equal(loads, 1); assert.equal(cache.bytes, 8);
    a.release(); const b = await cache.acquire('b'); assert.equal(cache.bytes, 16);
    await assert.rejects(cache.acquire('c'), /asset_budget/);
    assert(!released.includes('a') && !released.includes('b'), '不可釋放使用中的圖片');
    assert(released.includes('c'), '超預算圖片立即釋放');
    a2.release(); a2.release(); const c = await cache.acquire('c');
    assert(released.includes('a')); assert.equal(cache.bytes, 16); assert.equal(cache.entries.size, 2);
    b.release(); c.release(); cache.clearUnused(); assert.equal(cache.bytes, 0);
    let first = true;
    const retry = new GuildAssetCache(async () => { if (first) { first = false; throw Error('offline'); } return { value: 'ok', bytes: 1, dispose() {} }; }, 10);
    await assert.rejects(retry.acquire('retry'), /offline/); assert.equal(retry.entries.size, 0);
    const r = await retry.acquire('retry'); assert.equal(r.value, 'ok'); r.release(); retry.clearUnused();
    console.log('PASS：分塊圖片併發去重／引用保護／LRU回收／記憶體與數量預算／超額釋放／失敗可重試；尚非真機FPS或峰值記憶體驗收');
})().catch(e => { console.error(e); process.exitCode = 1; });
