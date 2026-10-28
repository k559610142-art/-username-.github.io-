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
SIM_MODE=true;createPlayer('財寶測試','knight',CLASSES.knight.base);sfx=()=>{};closeDialog=()=>{};switchTab=()=>{};startHunt=()=>{};refreshUI=()=>{};saveGame=()=>{};renderPanel=()=>{};showToast=()=>{};
assert(SAVE_SCHEMA>=15);player.inv=[];
const normal=makeMapItem(8,'rare');assert.equal(normal.mm.length>=3,true);const normalKey=mapKindKey(normal);assert.equal(normalKey,[normal.id,normal.q,normal.mm.slice().sort().join(','),normal.nm].join('|'));
for(let t=8;t<=15;t++){
 const x=makeMapItem(t,'legend');player.inv.push(x);assert(x.unidentified);assert(!x.mm);assert(itemName(x).includes('未鑑定'));
 let dialogButtons;openDialog=(title,html,buttons)=>{dialogButtons=buttons;};openItemDialog(x.uid);assert(!dialogButtons.some(b=>b.text==='🌀 開啟'));assert(mapDescHtml(x).includes('只掉通貨'));
 const n=player.inv.length;openMap(x.uid);assert.equal(player.inv.length,n);assert(!player.mapRun);assert(!mapQueueChoices(0).some(g=>g.x.uid===x.uid));
 for(const c of CURRENCY_IDS){assert.equal(currencyCan(c,x),false);assert(useCurrency(c,x.uid));}
 identifyMap(x.uid);assert(!x.unidentified);assert.equal(x.mm.length,6);assert.equal(new Set(x.mm).size,6);assert(mapQueueChoices(0).some(g=>g.x.uid===x.uid));
 for(const c of CURRENCY_IDS)assert.equal(currencyCan(c,x),false);
 const before=JSON.stringify(x);identifyMap(x.uid);assert.equal(JSON.stringify(x),before);
}
let migrated=migrateSave({schema:13,player:JSON.parse(JSON.stringify(player))});assert.equal(migrated.inv.filter(x=>x.q==='legend').length,8);assert(migrated.inv.every(x=>x.mm.length===6));
const x=player.inv[0];openMap(x.uid);assert(player.mapRun.treasure);assert.equal(player.mapRun.mods.length,6);
// 財寶路徑強制掉落，只取得通貨；一般怪2顆、首領2～6顆。
lootRequired=()=>false;lootActive=()=>false;chance=()=>true;rand=(a,b)=>a;worldVfxLoot=()=>{};
for(const boss of [false,true]){player.inv=[];const mon={...makeMonster('goblin'),boss,elite:true,mapBoss:boss};rollDrops(mon,currentZone());assert.equal(player.inv.length,1);assert.equal(ITEMS[player.inv[0].id].cat,'currency');assert.equal(player.inv[0].n,2);}
const before=player.inv.length;completeMap();assert.equal(player.inv.length,before);assert(!player.mapRun);
assert(TOWN_SUBS.some(x=>x[0]==='identify'));for(const id of ['talking','gludio','giran','aden'])assert(SCENE_ART_BGS[{talking:'village',gludio:'ash',giran:'darkgold',aden:'aden'}[id]].npcs.some(x=>x.role==='鑑定台'));
console.log('PASS 財寶圖：T8～15、未鑑定禁止開啟／排程、免費6詞鑑定／不重鑑、所有通貨拒絕、存檔、只掉雙倍通貨與四村鑑定台。');
`,ctx);
