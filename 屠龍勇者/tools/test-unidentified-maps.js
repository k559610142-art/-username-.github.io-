// 打怪取得地圖一律未鑑定（第228節）：記憶體角色，禁止網路與真實 localStorage。
const fs = require('fs'), path = require('path'), vm = require('vm'), assert = require('assert/strict');
const prefix = fs.readFileSync(path.join(__dirname, 'test-treasure-maps.js'), 'utf8').split('vm.runInContext(String.raw`')[0];
const ctx = new Function('require', '__dirname', prefix + '\nreturn ctx;')(require, __dirname);
vm.runInContext(String.raw`
SIM_MODE=true;createPlayer('鑑定測試','knight',CLASSES.knight.base);sfx=()=>{};closeDialog=()=>{};switchTab=()=>{};startHunt=()=>{};refreshUI=()=>{};saveGame=()=>{};renderPanel=()=>{};showToast=()=>{};
player.inv=[];offlineDrops=null;
// 打怪掉落／通關獎勵（giveMap q未指定）一律未鑑定、沒有品級詞綴
for(let i=0;i<400;i++)giveMap(1+i%15);
assert(player.inv.every(x=>x.unidentified===true&&!x.mm&&!x.nm&&(x.q===undefined||x.q==='legend')));
assert(player.inv.filter(x=>ITEMS[x.id].tier<8).every(x=>x.q===undefined));
const x=player.inv.find(y=>y.q===undefined);
assert.equal(itemName(x),'未鑑定異界地圖 T'+ITEMS[x.id].tier);assert.equal(itemClass(x),'');assert.equal(instSellPrice(x),sellPriceOf(x.id));
assert(mapDescHtml(x).includes('未鑑定'));
// 指定品級（商店／GM等）不受影響
const shop=makeMapItem(3,null);assert(!shop.unidentified);const rare=makeMapItem(3,'rare');assert(!rare.unidentified&&rare.mm.length>=3);
// 隱藏的財寶圖與普通未鑑定圖同名、同疊、同顏色、同價
const legend=makeMapItem(9,'legend'),plain=makeMapItem(9,undefined,true);
assert.equal(itemName(legend),itemName(plain));assert.equal(mapKindKey(legend),mapKindKey(plain));assert.equal(itemClass(legend),itemClass(plain));assert.equal(instSellPrice(legend),instSellPrice(plain));
// 未鑑定：不能開啟、排程、用通貨
player.loc={type:'town',id:'talking'};player.inv=[x];
const n=player.inv.length;openMap(x.uid);assert.equal(player.inv.length,n);assert(!player.mapRun);assert(mapQueueChoices(0).some(g=>g.x.uid===x.uid),'第254節起未鑑定可排程');
for(const c of CURRENCY_IDS){assert.equal(currencyCan(c,x),false);assert.equal(useCurrency(c,x.uid),'未鑑定地圖要先到鑑定台鑑定');}
// 鑑定：在村莊才可；品級約 普通50／魔法35／稀有15
player.loc={type:'zone',id:'island'};identifyMap(x.uid);assert(x.unidentified);player.loc={type:'town',id:'talking'};
const html=renderIdentify();assert(html.includes('未鑑定異界地圖'));
identifyMap(x.uid);assert(!x.unidentified);assert.equal(mapKindKey(x).includes('unidentified'),false);
player.inv=[];for(let i=0;i<4000;i++)player.inv.push(makeMapItem(4,undefined,true));
assert(renderIdentify().includes('全部鑑定（4000）'));identifyAllMaps();
assert(player.inv.every(y=>!y.unidentified));
const cnt=q=>player.inv.filter(y=>(y.q||'normal')===q).length;
assert(cnt('normal')>1800&&cnt('normal')<2200);assert(cnt('magic')>1200&&cnt('magic')<1600);assert(cnt('rare')>450&&cnt('rare')<750);
assert(player.inv.every(y=>!y.q?!y.mm:y.q==='magic'?y.mm.length>=1&&y.mm.length<=2&&y.nm:y.mm.length>=3&&y.mm.length<=4&&y.nm));
// 財寶圖鑑定後揭曉 6 詞綴
player.inv=[legend];identifyMap(legend.uid);assert(!legend.unidentified&&legend.mm.length===6&&itemName(legend).includes('傳奇財寶地圖'));
// 存檔正規化：未鑑定普通地圖保留旗標、清掉品級
player.inv=[{...plain,uid:player.nextUid++,q:'rare',mm:['tough'],nm:'甲'},makeMapItem(10,'legend'),{...makeMapItem(2,'magic'),unidentified:false}];
const mig=migrateSave({schema:SAVE_SCHEMA,player:JSON.parse(JSON.stringify(player))});
const [m0,m1,m2]=mig.inv;assert(m0.unidentified===true&&!m0.q&&!m0.mm&&!m0.nm);assert(m1.unidentified===true&&m1.q==='legend');assert(!('unidentified' in m2)&&m2.q==='magic');
// 離線打怪同樣未鑑定
player.inv=[];offlineGiveDrops([{map:5,q:'rare'}],1);assert(player.inv.length===1&&player.inv[0].unidentified===true&&!player.inv[0].q);
console.log('PASS 未鑑定地圖：打怪／離線一律未鑑定、隱藏財寶圖、禁止開啟排程通貨、村莊鑑定與全部鑑定、品級比例、指定品級不受影響。');
`,ctx);
