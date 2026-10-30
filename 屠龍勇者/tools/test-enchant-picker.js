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
SIM_MODE=true;sfx=()=>{};saveGame=()=>{};refreshUI=()=>{};
createPlayer('強化視窗測試','knight',CLASSES.knight.base);
let opened=0,closed=0,visible=false;
const body={scrollTop:120};const box={innerHTML:'',closest:()=>body};
$=id=>id==='enchant-picker'&&visible?box:null;
openDialog=()=>{opened++;visible=true;};closeDialog=()=>{closed++;visible=false;};
gameAlert=()=>{throw Error('不可跳結果視窗');};gameConfirm=()=>{throw Error('確認應留原清單');};
addItem('longSword');addItem('weaponScroll',8);let target=player.inv.find(x=>x.id==='longSword'),scroll=player.inv.find(x=>x.id==='weaponScroll');
openEnchantPicker(scroll.uid);assert.equal(opened,1);assert(box.innerHTML.includes('剩餘卷軸：8'));enchantPick(scroll.uid,target.uid);assert.equal(target.ench,1);assert.equal(countItem('weaponScroll'),7);assert.equal(body.scrollTop,120);assert.equal(opened,1);assert.equal(closed,0);assert(box.innerHTML.includes('✨'));
target.ench=ITEMS.longSword.safe;const before=countItem('weaponScroll');enchantPick(scroll.uid,target.uid);assert(enchantPickerState.pending);assert.equal(countItem('weaponScroll'),before);assert(box.innerHTML.includes('衝了！'));enchantCancelConfirm();assert.equal(enchantPickerState.pending,null);assert.equal(countItem('weaponScroll'),before);assert(!box.innerHTML.includes('衝了！'));
chance=()=>true;enchantPick(scroll.uid,target.uid);enchantPick(scroll.uid,target.uid,true);assert.equal(target.ench,ITEMS.longSword.safe+1);assert.equal(countItem('weaponScroll'),before-1);assert.equal(enchantPickerState.pending,null);
enchantPick(scroll.uid,target.uid,true);assert(enchantPickerState.pending,'每次危險強化都需重新確認');assert.equal(countItem('weaponScroll'),before-1);
chance=()=>false;enchantPick(scroll.uid,target.uid,true);assert(!findAnyInst(target.uid));assert(box.innerHTML.includes('蒸發'));assert(!box.innerHTML.includes('onclick="enchantPick('+scroll.uid+','+target.uid));
addItem('longSword');target=player.inv.find(x=>x.id==='longSword');addItem('cWeaponScroll',1);scroll=player.inv.find(x=>x.id==='cWeaponScroll');target.ench=3;openEnchantPicker(scroll.uid);enchantPick(scroll.uid,target.uid);assert.equal(target.ench,2);assert.equal(countItem('cWeaponScroll'),0);assert(box.innerHTML.includes('已用完'));assert(box.innerHTML.includes('disabled'));assert(visible);
addItem('bArmorScroll',2);addItem('leatherArmor');target=player.inv.find(x=>x.id==='leatherArmor');scroll=player.inv.find(x=>x.id==='bArmorScroll');rand=()=>3;openEnchantPicker(scroll.uid);enchantPick(scroll.uid,target.uid);assert.equal(target.ench,3);assert.equal(countItem('bArmorScroll'),1);target.ench=ENCHANT_MAX;renderEnchantPicker();assert(box.innerHTML.includes('已達上限'));const n=countItem('bArmorScroll');enchantPick(scroll.uid,target.uid);assert.equal(countItem('bArmorScroll'),n);
visible=false;enchantPick(scroll.uid,target.uid);assert.equal(countItem('bArmorScroll'),n);
console.log('PASS：持續原視窗／捲動保留／逐次確認與取消／成功與蒸發／祝福防卷／詛咒末張用完／上限與關閉防誤耗');
`,ctx);