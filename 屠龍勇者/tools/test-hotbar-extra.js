// 離線隔離測試；不讀寫玩家存檔、不呼叫雲端。
const fs = require('fs'), path = require('path'), vm = require('vm'), assert = require('assert/strict');
const root = path.resolve(__dirname, '..');
const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
const sandbox = { console, TextEncoder, TextDecoder, btoa, atob, setTimeout: () => 0, clearTimeout() {}, setInterval: () => 0, clearInterval() {},
    localStorage: { getItem: () => null, setItem() { throw Error('測試不准寫入存檔'); }, removeItem() { throw Error('測試不准刪除存檔'); } },
    document: { addEventListener() {}, getElementById: () => null, querySelector: () => null, documentElement: { style: {} } },
    window: { addEventListener() {}, innerWidth: 400, innerHeight: 800 }, navigator: {},
    fetch() { throw Error('測試不准連線'); }, Image: function () {} };
const ctx = vm.createContext(sandbox);
for (const [, p] of html.matchAll(/<script src="(data\/[^"?]+\.js)\?v=/g)) {
    if (p === 'data/main.js' || p === 'data/pwa.js') continue;
    vm.runInContext(fs.readFileSync(path.join(root, p), 'utf8'), ctx, { filename: p });
}


ctx.assert = assert;
vm.runInContext(String.raw`
SIM_MODE = true;
createPlayer('快捷測試', 'knight', CLASSES.knight.base);
assert.equal(player.settings.bar.length, 32);
assert(player.settings.bar.slice(24).every(x => x.id === '' && x.a === 0));
const old = player.settings.bar.slice(0, 24); old[22] = { id: 'greenPotion', a: 1 };
const snap = JSON.parse(JSON.stringify(player)); snap.settings.bar = old;
player = guardWrap(migrateSave({schema:16,player:snap}));
assert.equal(JSON.stringify(player.settings.bar.slice(0,24)), JSON.stringify(old));
assert(player.settings.bar.slice(24).every(x => !x.id && !x.a));
saveGame = () => {}; closeDialog = () => {}; refreshHotbarUI = () => {}; showToast = () => {}; tabOpen = () => false;
barPick(24, 'greenPotion'); assert.equal(player.settings.bar[24].id, 'greenPotion');
barToggleAuto(24); assert(barAutoItemIds().has('greenPotion'));
const saved = saveParse(saveEncode(JSON.stringify({ schema: SAVE_SCHEMA, player })));
assert.equal(migrateSave(saved).settings.bar[24].a, 1);
let used = ''; quickPotion = id => { used = id; }; barUse(24); assert.equal(used, 'greenPotion');
player.skills.push('holyWeapon'); player.settings.bar[0] = {id:'holyWeapon',a:1}; barPick(31,'holyWeapon');
assert.equal(player.settings.bar[0].id,''); assert.equal(player.settings.bar[31].a,1); assert(slotSkills().some(x => x.id === 'holyWeapon'));
const elements = {hotbar:{classList:{toggle(){}},innerHTML:''}, 'skill-bar':{classList:{toggle(){}},innerHTML:''}};
$ = id => elements[id]; setHtmlStable = (el, html) => { el.innerHTML = html; };
let pc = true; isPcFrame = () => pc; inTown = () => false;
barExtraOpen = false; renderHotbar();
assert.equal((elements.hotbar.innerHTML.match(/data-i=/g)||[]).length,24);
assert(elements.hotbar.innerHTML.includes('toggleBarExtra()'));
toggleBarExtra(); assert.equal((elements.hotbar.innerHTML.match(/data-i=/g)||[]).length,32);
assert(elements.hotbar.innerHTML.includes('aria-expanded="true"')); assert(elements.hotbar.innerHTML.includes('data-i="31"'));
const before = JSON.stringify(player.settings.bar); toggleBarExtra(); assert.equal(JSON.stringify(player.settings.bar),before); assert(slotSkills().some(x=>x.id==='holyWeapon'));
pc = false; renderHotbar(); assert.equal((elements['skill-bar'].innerHTML.match(/data-i=/g)||[]).length,16);
toggleBarExtra(); assert.equal((elements['skill-bar'].innerHTML.match(/data-i=/g)||[]).length,24);
assert(elements['skill-bar'].innerHTML.includes('data-i="24"'));
for (const el of Object.values(elements)) for (const m of el.innerHTML.matchAll(/onclick="([^"]+)"/g)) new Function(m[1]);
inTown = () => true; renderHotbar(); assert.equal(elements['skill-bar'].innerHTML,'');
assert(barPcPos(23).includes('660px')); assert(barPcPos(31).includes('512px'));
console.log('PASS：24→32遷移／原設定保留、新8格空白、加密存讀、放置／手動／自動／技能搬移、收合仍自動、PC與手機展開／收合、村莊不顯示、事件及舊位置。');
`, ctx);
