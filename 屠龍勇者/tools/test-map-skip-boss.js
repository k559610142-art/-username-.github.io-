// 地圖排程「怪物清空後不打首領」（第184節）：記憶體角色／存檔，禁止網路與真實 localStorage。node tools/test-map-skip-boss.js
const fs = require('fs'), path = require('path'), vm = require('vm'), assert = require('assert/strict');
const root = path.resolve(__dirname, '..');
const nodes = {};
const sandbox = { console, assert, nodes, TextEncoder, TextDecoder, btoa, atob, crypto: require('crypto').webcrypto, Image: function () {}, setTimeout: () => 0, clearTimeout() {}, setInterval: () => 0, clearInterval() {},
    localStorage: { getItem: () => null, setItem() { throw Error('禁止寫入真實存檔'); }, removeItem() { throw Error('禁止刪除存檔'); } },
    document: { addEventListener() {}, getElementById: id => nodes[id] || null, querySelector: () => null, documentElement: { style: {} } },
    window: { addEventListener() {}, innerWidth: 400, innerHeight: 800 }, navigator: {}, fetch() { throw Error('禁止連線'); } };
const ctx = vm.createContext(sandbox);
for (const [, file] of fs.readFileSync(path.join(root, 'index.html'), 'utf8').matchAll(/<script src="(data\/[^"?]+\.js)\?v=/g)) {
    if (file === 'data/main.js' || file === 'data/pwa.js') continue;
    vm.runInContext(fs.readFileSync(path.join(root, file), 'utf8'), ctx, { filename: file });
}
vm.runInContext(String.raw`
SIM_MODE=true; createPlayer('略過首領測試','knight',CLASSES.knight.base); SIM_MODE=false;
sfx=()=>{}; refreshUI=()=>{}; showToast=()=>{}; switchTab=()=>{}; closeDialog=()=>{};
let saved=''; saveGame=()=>{saved=saveEncode(JSON.stringify({schema:SAVE_SCHEMA,player}));};
const town=player.loc.id;
function resetQueue() {
 player.mapQueue=null;player.mapRun=null;player.mapPortal=null;player.hunting=false;
 player.loc={type:'town',id:town};player.inv=[];hunt=null;walkHome=null;
 addItem('redPotion',100);addItem('homeScroll',10);
}
function maps(t,n) {const xs=[];for(let i=0;i<n;i++){const x=makeMapItem(t,null);player.inv.push(x);xs.push(x);}return xs;}
function setSlot(i,x,n) {nodes['map-queue-select-'+i]={value:String(x.uid)};nodes['map-queue-qty-'+i]={value:String(n)};mapQueueSet(i);}
function clearMobs() {assert(inMapRun());const r=player.mapRun;r.left=1;return mapOnKill({});}

// ① 預設不勾：清完怪照舊等首領，不回村。
assert.equal(mapQueueSkipBossOn(),false);
resetQueue();setSlot(0,maps(1,2)[0],2);mapQueueStart();
assert.equal(clearMobs(),false);assert(inMapRun());assert.equal(player.mapRun.left,0);assert.equal(player.mapQueue.slots[0].skipped,0);

// ② 勾選後：清完怪立即回村、不給通關獎勵、計略過一次，下一輪開同格下一張。
resetQueue();mapQueueSetSkipBoss(true);assert.equal(player.settings.mapSkipBoss,true);
const xs=maps(1,2);setSlot(0,xs[0],2);mapQueueStart();
const invBefore=player.inv.length;
assert.equal(clearMobs(),true);
assert(inTown());assert.equal(player.mapRun,null);assert.equal(player.hunting,false);
assert.equal(player.mapQueue.active,false);assert.equal(player.mapQueue.state,'running');
assert.equal(player.mapQueue.slots[0].skipped,1);assert.equal(player.mapQueue.slots[0].done,0);
assert.equal(player.inv.length,invBefore,'略過首領不給通關地圖獎勵');
mapQueueTick();assert(inMapRun());assert.equal(player.mapRun.queueSlot,0);assert(player.hunting);
assert.match(mapQueueRowStatus(0),/略過首領 1 次/);
assert.equal(clearMobs(),true);mapQueueTick();
assert.equal(player.mapQueue.state,'done');assert.equal(player.mapQueue.slots[0].skipped,2);

// ③ 首領已現身才勾選：mapQueueTick 偵測後直接回村換下一張。
resetQueue();mapQueueSetSkipBoss(false);
setSlot(0,maps(2,2)[0],2);mapQueueStart();
assert.equal(clearMobs(),false);assert(inMapRun());player.mapRun.boss=true;player.mapRun.bossHp=1234;
mapQueueSetSkipBoss(true);mapQueueTick();
assert(inTown());assert.equal(player.mapQueue.slots[0].skipped,1);
mapQueueTick();assert(inMapRun());assert.equal(player.mapRun.left>0,true);

// ④ 不在排程（手動開圖）、排程暫停中都不影響：照常等首領。
resetQueue();const manual=maps(1,1)[0];openMap(manual.uid);
assert.equal(clearMobs(),false);assert(inMapRun());
resetQueue();setSlot(0,maps(1,2)[0],2);mapQueueStart();mapQueuePause();
assert.equal(clearMobs(),false);assert(inMapRun());assert.equal(player.mapQueue.slots[0].skipped,0);

// ⑤ 離線模擬（SIM_MODE）不觸發；存檔遷移保留 skipped 與勾選。
resetQueue();setSlot(0,maps(1,2)[0],2);mapQueueStart();
SIM_MODE=true;assert.equal(clearMobs(),false);SIM_MODE=false;assert(inMapRun());
player.mapQueue.slots[0].skipped=3;saveGame();
const p=saveParse(saved).player;mapQueueNormalize(p);
assert.equal(p.mapQueue.slots[0].skipped,3);assert.equal(p.settings.mapSkipBoss,true);
p.mapQueue.slots[0].skipped='x';mapQueueNormalize(p);assert.equal(p.mapQueue.slots[0].skipped,0);

// ⑥ 介面：勾選框跟著設定。
assert.match(renderMapQueue(),/mapQueueSetSkipBoss\(this\.checked\)/);assert.match(renderMapQueue(),/type="checkbox" checked/);
mapQueueSetSkipBoss(false);assert.doesNotMatch(renderMapQueue(),/type="checkbox" checked/);
console.log('PASS：預設照打首領、勾選後清完怪直接回村換下一張（無通關獎勵、計略過次數）、首領已現身才勾也會回村、手動開圖／暫停／離線模擬不觸發、存檔保留、勾選框。');
`, ctx);
