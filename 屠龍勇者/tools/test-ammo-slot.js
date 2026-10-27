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
SIM_MODE = false;
saveGame = () => {}; refreshUI = () => {}; closeDialog = () => {}; showToast = () => {};
let captured = ''; openDialog = (title, html) => { captured = html; };
function setup(cls) { createPlayer('彈藥測試', cls, CLASSES[cls].base); player.inv = []; player.gold = 10000; }
for (const [cls, ids] of [['elf', ['arrow', 'silverArrow']], ['gunner', ['bullet', 'silverBullet']]]) {
 for (const id of ids) {
    setup(cls); addItem(id, 2); selectAmmo(id);
    assert.equal(player.ammoId, id);
    assert.equal(pickAmmo(ITEMS[id].ammo, { undead: true }).id, id);
    assert.equal(player.gold, 10000);
    consumeItem(id); assert(autoBuyAmmo());
    assert.equal(countItem(id), 1001); assert.equal(player.gold, 10000 - shopCost(id, 1000));
    assert(!autoBuyAmmo()); assert.equal(countItem(id), 1001);
    const data = { schema: SAVE_SCHEMA, player: JSON.parse(JSON.stringify(player)) };
    assert.equal(migrateSave(saveParse(saveEncode(JSON.stringify(data)))).ammoId, id);
    openAmmoPicker(); assert(captured.includes(id));
    for (const m of captured.matchAll(/onclick="([^"]+)"/g)) new Function(m[1]);
    assert(charGearHtml().includes('cv-weapon-row')); assert(charGearHtml().includes('武器消耗品'));
    const other = ITEMS[id].ammo === 'arrow' ? 'bullet' : 'arrow'; addItem(other, 5); selectAmmo(other); assert.equal(player.ammoId, id);
    consumeItem(id, 1000); player.gold = 0; assert(!autoBuyAmmo()); assert.equal(countItem(id), 1);
    assert(pickAmmo(ITEMS[id].ammo, {}) ); consumeItem(id); assert.equal(pickAmmo(ITEMS[id].ammo, {}), null); assert.equal(player.gold, 0);
    player.gold = 10000; assert(pickAmmo(ITEMS[id].ammo, {})); assert.equal(countItem(id), 1000);
    selectAmmo(''); assert.equal(pickAmmo(ITEMS[id].ammo, {}), null);
 }
}
setup('elf'); addItem('arrow', 2); addItem('silverArrow', 2); selectAmmo('arrow');
assert.equal(pickAmmo('arrow', { undead: true }).id, 'arrow');
let snap = JSON.parse(JSON.stringify(player)); delete snap.ammoId;
assert.equal(migrateSave({schema: 15, player: snap}).ammoId, 'arrow');
snap.ammoId = 'redPotion'; assert.equal(migrateSave({schema: 16, player: snap}).ammoId, '');
setup('knight'); addItem('arrow', 1); selectAmmo('arrow'); assert.equal(player.ammoId, ''); assert(charAmmoHtml().includes('disabled')); assert(!autoBuyAmmo());
setup('elf'); addItem('arrow', 1); selectAmmo('arrow');
SIM_MODE = true; assert(!autoBuyAmmo()); assert.equal(player.gold, 10000); SIM_MODE = false;
// 實際攻擊從2發打到1發，立即補1000，且不消耗另一種類。
setup('elf'); addItem('arrow', 2); addItem('silverArrow', 10); selectAmmo('arrow');
const mon = { hp: 100000, maxHp: 100000, ac: 0, mr: 0, undead: true, dmg: [1,1] };
hunt = { mon, mobs: [mon], state: 'fight' }; chance = () => false; sfx = () => {}; sfxHit = () => {};
physicalAttack(calcStats(), 1, {}, mon);
assert.equal(countItem('arrow'), 1001); assert.equal(countItem('silverArrow'), 10); assert.equal(player.gold, 9900);
let homeReason = '', stopReason = '';
useHomeScroll = reason => { homeReason = reason; return true; };
stopHunt = reason => { stopReason = reason; };
player.settings.autoHome = true; outOfAmmo(); assert.equal(homeReason, '彈藥用完'); assert.equal(stopReason, '');
player.settings.autoHome = false; outOfAmmo(); assert(stopReason.includes('彈藥用完'));
console.log('PASS：四種彈藥配對、指定消耗、剩1補1000、精確扣款、防重購、缺錢耗盡、空欄／近戰禁用、加密存讀／舊檔遷移、介面事件與實際攻擊。');
`, ctx);
