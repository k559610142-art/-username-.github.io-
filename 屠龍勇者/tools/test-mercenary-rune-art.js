// 50張傭兵符石素材及正式UI接線：禁止讀寫正式存檔或連外。
const fs = require('fs'), path = require('path'), vm = require('vm'), assert = require('assert/strict'), crypto = require('crypto');
const root = path.resolve(__dirname, '..');
const ctx = vm.createContext({ console, assert, TextEncoder, TextDecoder, btoa, atob, Image: function () {}, setTimeout: () => 0, clearTimeout() {}, setInterval: () => 0, clearInterval() {},
    localStorage: { getItem: () => null, setItem() { throw Error('禁止存檔'); }, removeItem() { throw Error('禁止刪存檔'); } },
    document: { addEventListener() {}, getElementById: () => null, querySelector: () => null, documentElement: { style: {} } }, window: { addEventListener() {}, innerWidth: 375, innerHeight: 812 }, navigator: {}, fetch() { throw Error('禁止連外'); } });
const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
for (const [, file] of html.matchAll(/<script src="(data\/[^"?]+\.js)\?v=/g)) {
    if (['data/main.js', 'data/pwa.js'].includes(file)) continue;
    vm.runInContext(fs.readFileSync(path.join(root, file), 'utf8'), ctx, { filename: file });
}
const manifest = JSON.parse(fs.readFileSync(path.join(__dirname, 'icon-src/mercenary-runes-v1/manifest.json'), 'utf8'));
const runes = vm.runInContext('Object.keys(MERC_RUNES)', ctx);
assert.equal(runes.length, 50); assert.deepEqual(manifest.entries.map(x => x.id).sort(), Array.from(runes).sort());
const hashes = new Set();
for (const id of runes) {
    const p = path.join(root, 'images/icons/items/mercRune-v1', id + '.png'), data = fs.readFileSync(p);
    assert.equal(data.readUInt32BE(16), 128); assert.equal(data.readUInt32BE(20), 128); assert.equal(data[25], 6, id + '非RGBA');
    const hash = crypto.createHash('sha256').update(data).digest('hex'); assert(!hashes.has(hash), id + '圖重複'); hashes.add(hash);
    const rendered = vm.runInContext('itemIconHtml(' + JSON.stringify('mercRune_' + id) + ')', ctx);
    assert(rendered.includes('mercRune-v1/' + id + '.png'), id + '道具圖未接');
}
vm.runInContext(`
SIM_MODE = true; createPlayer('符石素材測試', 'knight', CLASSES.knight.base);
const m = player.mercenary = { cls: 'spirit', lv: 1, exp: 0, hp: 110, mp: 130, active: false, dead: false, equip: {}, skills: ['', '', '', ''], cds: {} };
const original = JSON.stringify(player);
for (const id of Object.keys(MERC_RUNES)) {
 m.skills[0] = id;
 assert(mercRuneBoardHtml(m,true).includes('mercRune-v1/'+id+'.png'));
 assert(itemDescHtml({id:'mercRune_'+id,n:1}).includes('mercRune-v1/'+id+'.png'));
 assert(codexDetailHtml('mercRune_'+id).includes('mercRune-v1/'+id+'.png'));
}
m.skills[0] = '';
assert.equal(JSON.stringify(player),original,'顯示素材不得改變角色');
assert(!mercRuneBoardHtml(m,true).includes('merc-rune-art'),'空孔不顯示預設符石');
assert.equal(typeof mercHire,'undefined'); assert.equal(typeof mercBuyRune,'undefined');
for(const id of Object.keys(MERC_RUNES)) assert(!shopItemIds().includes('mercRune_'+id));
`, ctx);
console.log('PASS：50張獨立RGBA 128px、manifest／檔案完整且不重複，背包圖示／詳情／圖鑑／鑲嵌石板全接線，空孔與不可購買保留。');
