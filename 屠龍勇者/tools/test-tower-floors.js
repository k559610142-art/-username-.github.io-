// 永夜之塔逐層解鎖（第 159 節）隔離測試：不讀寫真實存檔、不連線。
// 一般樓層擊殺 1000 隻解鎖上一層、10F 等首領樓層打倒守關首領才解鎖、不能跳層、舊存檔重置回 1F 且只做一次。
const fs = require('fs'), path = require('path'), vm = require('vm'), assert = require('assert/strict');
const root = path.resolve(__dirname, '..'), memory = new Map();
const sandbox = { console, assert, Image: function () {}, setTimeout: () => 0, clearTimeout() {}, setInterval: () => 0, clearInterval() {}, crypto: globalThis.crypto, TextEncoder, TextDecoder, btoa, atob,
    localStorage: { getItem: k => memory.has(k) ? memory.get(k) : null, setItem: (k, v) => memory.set(k, v), removeItem: k => memory.delete(k) },
    document: { addEventListener() {}, getElementById: () => null, querySelector: () => null, documentElement: { style: {} } },
    window: { addEventListener() {}, innerWidth: 400, innerHeight: 800 }, navigator: {}, fetch() { throw Error('禁止連線'); } };
const ctx = vm.createContext(sandbox);
for (const [, file] of fs.readFileSync(path.join(root, 'index.html'), 'utf8').matchAll(/<script src="(data\/[^"?]+\.js)\?v=/g)) {
    if (file === 'data/main.js' || file === 'data/pwa.js') continue;
    vm.runInContext(fs.readFileSync(path.join(root, file), 'utf8'), ctx, { filename: file });
}
vm.runInContext(String.raw`
SIM_MODE = true; createPlayer('塔測試', 'knight', CLASSES.knight.base);
assert.equal(player.towerMax, 1, '新角色從 1F 開始'); assert.equal(player.towerRule, 2);
const towerId = Object.keys(ZONE_BY_ID).find(id => ZONE_BY_ID[id].type === 'tower');
player.loc = { type: 'zone', id: towerId, floor: 1 };
const toasts = []; showToast = m => toasts.push(m);
rollDrops = () => {}; questOnKill = () => {}; gainExp = () => {}; diaRoll = () => {}; worldVfxLoot = () => {};
hunt = { mobs: [], mon: null }; session = { kills: 0, exp: 0, gold: 0, start: 0 };
const kill = m => { hunt.mobs.push(m); onKill(m); };
const normal = f => ({ ...makeTowerMonster(f, false), exp: 1, gold: [0, 0] });
const boss = f => ({ ...makeTowerMonster(f, true), exp: 1, gold: [0, 0] });
const killN = (f, n) => { for (let i = 0; i < n; i++) kill(normal(f)); };
// 不能跳層
changeFloor(1); assert.equal(player.loc.floor, 1); assert(toasts.at(-1).includes('1,000') && toasts.at(-1).includes('目前 0'), toasts.at(-1));
killN(1, 999); assert.equal(player.towerMax, 1, '999 隻還不行'); assert.equal(player.towerKills[1], 999);
killN(1, 1); assert.equal(player.towerMax, 2, '滿 1000 隻解鎖 2F');
changeFloor(1); assert.equal(player.loc.floor, 2); changeFloor(1); assert.equal(player.loc.floor, 2, '2F 還沒打滿不能上 3F');
// 在低樓層多打不會再解鎖別層；回低樓層照樣累積
player.loc.floor = 1; killN(1, 50); assert.equal(player.towerMax, 2); assert.equal(player.towerKills[1], 1050);
// 9F 打滿解鎖 10F；10F（首領樓層）打 1000 隻一般怪也不解鎖，打倒首領才解鎖 11F
player.towerMax = 9; player.loc.floor = 9; killN(9, 1000); assert.equal(player.towerMax, 10);
player.loc.floor = 10; killN(10, 1200); assert.equal(player.towerMax, 10, '首領樓層只靠打首領');
changeFloor(1); assert(toasts.at(-1).includes('守關首領'), toasts.at(-1));
kill(boss(10));
assert.equal(player.towerMax, 11, '打倒 10F 首領只解鎖 11F（不再一次 10 層）'); assert.equal(player.towerCleared[10], true); assert(player.towerBossCd[10] > Date.now());
// 100F 是頂層
player.towerMax = 100; player.loc.floor = 100; kill(boss(100)); assert.equal(player.towerMax, 100);
// 死亡、離開不歸零：擊殺數存在存檔裡，存讀之後還在
assert.equal(player.towerKills[1], 1050);
// 舊存檔：可到 50F、有首領紀錄、人在 45F → 重置回 1F，只做一次
const old = migrateSave({ schema: 10, player: { ...JSON.parse(JSON.stringify(player)), towerMax: 50, towerRule: undefined, towerKills: undefined, towerCleared: { 10: true, 40: true }, towerBossCd: { 40: 123 }, loc: { type: 'zone', id: towerId, floor: 45 } } });
assert.equal(old.towerMax, 1); assert.deepEqual(old.towerKills, {}); assert.deepEqual(old.towerCleared, {}); assert.deepEqual(old.towerBossCd, {}); assert.equal(old.loc.floor, 1); assert.equal(old.towerRule, 2);
old.towerMax = 7; old.towerKills = { 6: 1000 };
const again = migrateSave({ schema: 10, player: old });   // 舊版遊戲存回 schema 10，但 towerRule 還在：不能再重置
assert.equal(again.towerMax, 7, '已經重置過不再重置'); assert.equal(again.towerKills[6], 1000);
// 進度文字
player.towerMax = 5; player.loc.floor = 5; player.towerKills = { 5: 321 };
assert.equal(mapProgressText(), '🏛️ 5F 擊殺 321/1,000');
player.loc.floor = 4; assert.equal(mapProgressText(), '', '不是最高樓層不顯示');
player.towerMax = 20; player.loc.floor = 20; assert.equal(mapProgressText(), '🏛️ 20F：擊敗守關首領解鎖 21F');
console.log('PASS: 新角色 1F、不能跳層、1000 隻解鎖、首領樓層只靠首領且只解鎖 1 層、100F 頂層、擊殺累積、舊存檔重置回 1F 只做一次、進度文字');
`, ctx);
