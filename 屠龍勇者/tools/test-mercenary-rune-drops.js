// 真實函式／記憶體角色；不連線、不讀寫正式存檔。
const fs = require('fs'), path = require('path'), vm = require('vm'), assert = require('assert/strict');
const prefix = fs.readFileSync(path.join(__dirname, 'test-mercenary.js'), 'utf8').split('ctx.assert = assert;')[0];
const ctx = new Function('require', '__dirname', prefix + '\nreturn ctx;')(require, __dirname);
ctx.assert = assert;
vm.runInContext(String.raw`
SIM_MODE=false;lootMode='legacy';sfx=()=>{};worldVfxLoot=()=>{};saveGame=()=>{};refreshUI=()=>{};
createPlayer('符石測試','knight',CLASSES.knight.base);
assert.equal(MERC_RUNE_DROPS.basic.length,24);assert.equal(MERC_RUNE_DROPS.special.length,26);
assert.equal(new Set([...MERC_RUNE_DROPS.basic,...MERC_RUNE_DROPS.special]).size,50);
player.loc={type:'zone',id:'island'};player.mapRun={zone:'island',t:1,q:'rare',mods:[],left:10};
const normal=makeMonster('goblin'),boss={...normal,boss:true};
const originalChance=chance,originalRand=rand;
chance=()=>true;
for(const special of [false,true]) {
 const pool=MERC_RUNE_DROPS[special?'special':'basic'];
 for(let i=0;i<pool.length;i++){rand=()=>i;assert.equal(rollMercRuneDrop(special?boss:normal),pool[i]);}
}
rand=originalRand;
for(const q of [null,'magic','legend']){player.mapRun.q=q;assert.equal(rollMercRuneDrop(normal),null);assert.equal(rollMercRuneDrop(boss),null);}
player.mapRun.q='rare';player.loc.id='coast';assert.equal(rollMercRuneDrop(boss),null);
player.loc.id='island';SIM_MODE=true;assert.equal(rollMercRuneDrop(boss),null);assert.equal(rollMercRuneDrop(boss,true),null);SIM_MODE=false;
player.mapRun=null;assert.equal(rollMercRuneDrop(boss),null);assert(MERC_RUNE_DROPS.special.includes(rollMercRuneDrop(boss,true)));
let rate=0;chance=p=>{rate=p;return false;};player.mapRun={zone:'island',q:'rare',mods:['army'],t:15,left:1};
rollMercRuneDrop(normal);assert.equal(rate,.001);rollMercRuneDrop(boss);assert.equal(rate,.05);
player.mapRun.treasure=true;assert.equal(rollMercRuneDrop(boss),null);delete player.mapRun.treasure;
const key=lootSnapKey(player);player.mapRun.q='magic';assert.notEqual(lootSnapKey(player),key);player.mapRun.q='rare';
// 僅命中符石機率，走正式rollDrops兩次，確認實際背包堆疊。
chance=p=>p===.001;rollBookDrop=()=>null;rollMapDrop=()=>{};rand=(lo)=>lo;
rollDrops(normal,{drops:[]});rollDrops(normal,{drops:[]});assert.equal(countItem('mercRune_wolf'),2);
const before=countItem('mercRune_wolf');SIM_MODE=true;rollDrops(normal,{drops:[]});SIM_MODE=false;assert.equal(countItem('mercRune_wolf'),before);
let server=0;lootMode='server';lootActive=()=>true;lootKill=()=>server++;rollDrops(normal,{drops:[]});assert.equal(server,1);assert.equal(countItem('mercRune_wolf'),before);
for(const id of MERC_RUNE_DROPS.basic){assert(mercRuneSource(id).includes('0.1%'));assert(codexSources(id).length);}
for(const id of MERC_RUNE_DROPS.special)assert(mercRuneSource(id).includes('5%'));
assert(itemDescHtml({id:'mercRune_wolf',n:1}).includes('基本符石'));
chance=originalChance;rand=originalRand;
`, ctx);
console.log('PASS：24基本／26特殊、全部可抽、黃圖限定、離線排除、固定機率、實際背包堆疊、伺服器不本機重抽、圖鑑與詳情。');
