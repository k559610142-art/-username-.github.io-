// 地圖排程：未鑑定可排程＋自動打造地圖（第254節）：記憶體角色／存檔，禁止網路與真實 localStorage。node tools/test-map-queue-craft.js
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
SIM_MODE=true; createPlayer('自動打造測試','knight',CLASSES.knight.base); SIM_MODE=false;
sfx=()=>{}; refreshUI=()=>{}; showToast=()=>{}; switchTab=()=>{}; closeDialog=()=>{};
let saved=''; saveGame=()=>{saved=saveEncode(JSON.stringify({schema:SAVE_SCHEMA,player}));};
const town=player.loc.id;
function resetQueue() {
 player.mapQueue=null;player.mapRun=null;player.mapPortal=null;player.hunting=false;
 player.loc={type:'town',id:town};player.inv=[];hunt=null;walkHome=null;player.settings.mapCraft=undefined;
 addItem('redPotion',100);addItem('homeScroll',10);
}
function unid(t,n) {const xs=[];for(let i=0;i<n;i++){const x=makeMapItem(t,null,true);player.inv.push(x);xs.push(x);}return xs;}
function setSlot(i,x,n) {nodes['map-queue-select-'+i]={value:String(x.uid)};nodes['map-queue-qty-'+i]={value:String(n)};mapQueueSet(i);}
function finish() {assert(inMapRun());mapOnKill({mapBoss:true});assert(inTown());}

// ① 預設關閉：未鑑定可選入排程、同階合成一種，輪到時只鑑定那一張，其他仍未鑑定；不花通貨。
resetQueue();addItem('curAlt',20);
const xs=unid(3,4);
const g=mapQueueChoices(0);assert.equal(g.length,1);assert.equal(g[0].count,4);
setSlot(0,xs[0],4);assert.equal(player.mapQueue.slots[0].key,'map3|unidentified');assert.equal(player.mapQueue.slots[0].uids.length,4);
mapQueueStart();assert(inMapRun());
assert.equal(player.inv.filter(isUnidentifiedMap).length,3,'一次只鑑定一張');
assert.equal(countItem('curAlt'),20,'預設不花通貨');
finish();mapQueueTick();assert(inMapRun());assert.equal(xs.filter(isUnidentifiedMap).length,2,'通關獎勵另計，排程的只剩 2 張未鑑定');

// ② 啟用＋全部詞綴都不要：魔法／稀有一定洗不乾淨 → 用到上限後略過，留在背包；普通直接開。
resetQueue();addItem('curAlt',50);addItem('curChaos',50);
mapCraftSet('on',true);for(const k of MAP_MOD_KEYS)mapCraftSet(k,true);mapCraftSet('max','3');
assert.equal(mapCraftCfg().max,3);assert.equal(mapCraftCfg().bad.length,MAP_MOD_KEYS.length);
const ys=unid(2,30);setSlot(0,ys[0],30);
let opened=0,skipped=0,guard=0;mapQueueStart();
while(player.mapQueue.state==='running'&&guard++<200){
 if(inMapRun()){opened++;assert(!(player.mapRun.mods||[]).length||player.mapRun.treasure,'開的圖不能有不要的詞綴');finish();}
 mapQueueTick();
}
skipped=player.mapQueue.slots[0].craftSkip;
assert.equal(opened+skipped,30);assert(skipped>5&&opened>5,'機率上兩者都會出現 '+opened+'/'+skipped);
const used=100-countItem('curAlt')-countItem('curChaos');assert(used<=skipped*3,'每張最多 3 顆');assert(used>0);
const left=ys.filter(x=>findInv(x.uid));assert.equal(left.length,skipped,'略過的留在背包');
assert(left.every(x=>!x.unidentified&&x.q));
assert(mapQueueRowStatus(0).includes('詞綴不合略過 '+skipped+' 張'));

// ③ 只勾「枯竭」、給足通貨：開出來的地圖都不含枯竭；保留數量生效。
resetQueue();addItem('curAug',200);addItem('curAlt',200);addItem('curChaos',200);
mapCraftSet('on',true);mapCraftSet('blight',true);mapCraftSet('aug',true);mapCraftSet('max','50');mapCraftSet('keep','195');
const zs=unid(2,20);setSlot(0,zs[0],20);mapQueueStart();guard=0;let sawMagic=0;
while(player.mapQueue.state==='running'&&guard++<200){ if(inMapRun()){assert(!player.mapRun.mods.includes('blight'));if(player.mapRun.q)sawMagic++;finish();} mapQueueTick(); }
assert(countItem('curAug')>=195&&countItem('curAlt')>=195&&countItem('curChaos')>=195,'保留數量不被用掉');
assert(sawMagic>0);

// ④ 給不夠通貨＋不略過：照樣開圖。
resetQueue();mapCraftSet('on',true);for(const k of MAP_MOD_KEYS)mapCraftSet(k,true);mapCraftSet('giveup',false);
const ws=unid(2,10);setSlot(0,ws[0],10);mapQueueStart();guard=0;opened=0;
while(player.mapQueue.state==='running'&&guard++<100){ if(inMapRun()){opened++;finish();} mapQueueTick(); }
assert.equal(opened,10);assert.equal(player.mapQueue.slots[0].craftSkip,0);

// ⑤ 財寶圖不改造；未鑑定格可查看詳情；設定存讀檔保留、壞資料被清理。
resetQueue();addItem('curChaos',50);mapCraftSet('on',true);for(const k of MAP_MOD_KEYS)mapCraftSet(k,true);
const tr=makeMapItem(9,'legend');player.inv.push(tr);assert(tr.unidentified);
setSlot(0,tr,1);let dlg='';openDialog=(t,h)=>{dlg=h;};mapQueueDetail(0);assert(dlg.includes('未鑑定'));
mapQueueStart();assert(inMapRun());assert(player.mapRun.treasure);assert.equal(countItem('curChaos'),50);
player.settings.mapCraft={on:'yes',bad:['blight','nope','blight'],max:-5,keep:'x'};
const c=mapCraftCfg();assert.equal(c.on,false);assert.deepEqual(c.bad,['blight']);assert.equal(c.max,0);assert.equal(c.keep,0);
mapCraftSet('on',true);saveGame();const back=saveParse(saved);assert.equal(back.player.settings.mapCraft.on,true);
assert(mapCraftHtml().includes('mapCraftSet('));
console.log('PASS：未鑑定可排程（同階合併、一次鑑定一張）、自動打造預設關閉、洗到上限略過留背包、只洗不要的詞綴、保留數量、不略過照開、財寶圖不改、詳情與設定存讀。');
`, ctx);
