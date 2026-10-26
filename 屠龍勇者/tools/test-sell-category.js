// 物品防賣鎖：記憶體角色／存檔，禁止網路與真實 localStorage。
const fs = require('fs'), path = require('path'), vm = require('vm'), assert = require('assert/strict');
const root = path.resolve(__dirname, '..');
const nodes = { qty: { value: '1' } };
const sandbox = { console, assert, nodes, TextEncoder, TextDecoder, btoa, atob, crypto: require("crypto").webcrypto, Image: function () {}, setTimeout: () => 0, clearTimeout() {}, setInterval: () => 0, clearInterval() {},
    localStorage: { getItem: () => null, setItem() { throw Error('禁止寫入真實存檔'); }, removeItem() { throw Error('禁止刪除存檔'); } },
    document: { addEventListener() {}, getElementById: id => nodes[id] || null, querySelector: () => null, documentElement: { style: {} } },
    window: { addEventListener() {}, innerWidth: 400, innerHeight: 800 }, navigator: {}, fetch() { throw Error('禁止連線'); } };
const ctx = vm.createContext(sandbox);
for (const [, file] of fs.readFileSync(path.join(root, 'index.html'), 'utf8').matchAll(/<script src="(data\/[^"?]+\.js)\?v=/g)) {
    if (file === 'data/main.js' || file === 'data/pwa.js') continue;
    vm.runInContext(fs.readFileSync(path.join(root, file), 'utf8'), ctx, { filename: file });
}
vm.runInContext(String.raw`
SIM_MODE=true; sfx=()=>{}; refreshUI=()=>{}; renderPanel=()=>{}; showToast=()=>{}; saveGame=()=>{};
let pending;gameConfirm=(title,text,go)=>{pending=go;};
createPlayer('分類測試','knight',CLASSES.knight.base);player.inv=[];
const cats=['map','weapon','armor','book','potion','material'];
for(const cat of cats){const id=Object.keys(ITEMS).find(id=>ITEMS[id].cat===cat&&instSellPrice({id,n:1,ench:0})>0);assert(id,cat);addItem(id,1);}
const locked=addItem(Object.keys(ITEMS).find(id=>ITEMS[id].cat==='weapon'&&instSellPrice({id,n:1,ench:0})>0),1);locked.sellLocked=true;
for(const [category,expected]of [['map',['map']],['gear',['weapon','armor']],['book',['book']],['item',['potion','material']],['all',cats]]){
 setSellCategory(category);sellPickAll(true);
 assert.deepEqual(sellPickedList().map(x=>ITEMS[x.id].cat).sort(),expected.slice().sort());
 assert(!sellPick.has(locked.uid));
 const html=renderSell();for(const label of ['全部','地圖','裝備','技能書','道具'])assert(html.includes(label));
 for(const x of bulkSellList(2))assert(sellCategoryMatch(x));
}
setSellCategory('map');sellPickAll(true);sellPicked();assert(pending);
setSellCategory('book');assert.equal(sellPick.size,0);const before=player.inv.length;pending();assert.equal(player.inv.length,before);
setSellCategory('map');sellPickAll(true);const map= sellPickedList()[0],gold=player.gold,price=instSellPrice(map);sellPicked();pending();assert(!findInv(map.uid));assert.equal(player.gold,gold+price);
setSellCategory('book');assert.equal(bulkSellList(1).length,0);assert.equal(bulkSellList(2).length,0);
console.log('PASS：四分類與全部、裝備含飾品、全選限定分類、鎖定保護、切類清勾選、確認期間切類不誤賣與實際回收入帳。');
`,ctx);

