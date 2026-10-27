// 正式遊戲函式，僅記憶體角色；禁止正式存檔與網路。
const fs = require('fs'), path = require('path'), vm = require('vm'), assert = require('assert/strict');
const prefix = fs.readFileSync(path.join(__dirname, 'test-mercenary.js'), 'utf8').split('ctx.assert = assert;')[0];
const ctx = new Function('require', '__dirname', prefix + '\nreturn ctx;')(require, __dirname);
ctx.assert = assert;
vm.runInContext(String.raw`
SIM_MODE = false; saveGame = () => {}; refreshUI = () => {}; showToast = () => {}; sfx = () => {};
let confirmFn = null; gameConfirm = (t,h,fn) => { confirmFn = fn; };
function fresh() { createPlayer('任務測試','knight',CLASSES.knight.base); mercPanelOpen=false; confirmFn=null; }
function finish() { mercQuestAccept(); for(let i=0;i<5000;i++) mercQuestOnKill(); }
fresh(); assert.equal(SAVE_SCHEMA,19);
const old=JSON.parse(JSON.stringify(player));delete old.mercQuest;
assert.deepEqual(migrateSave({schema:18,player:old}).mercQuest,{active:false,kills:0});
mercQuestOnKill(); assert.equal(player.mercQuest.kills,0);
mercQuestAccept(); const first=player.mercQuest; mercQuestOnKill();mercQuestAccept();assert.equal(player.mercQuest,first);assert.equal(first.kills,1);
SIM_MODE=true;mercQuestOnKill();SIM_MODE=false;assert.equal(first.kills,1);
const encoded=saveEncode(JSON.stringify({schema:SAVE_SCHEMA,player}));player=guardWrap(migrateSave(saveParse(encoded)));assert.equal(player.mercQuest.kills,1);assert(player.mercQuest.active);
mercQuestClaim();assert.equal(confirmFn,null);assert.equal(player.mercenary,null);
for(let i=1;i<5000;i++)mercQuestOnKill();mercQuestOnKill();assert.equal(player.mercQuest.kills,5000);
mercQuestClaim();const claim=confirmFn;assert.equal(player.mercenary,null);claim();const m=player.mercenary;claim();assert.equal(player.mercenary,m);
assert.equal(m.lv,1);assert.equal(m.exp,0);assert.equal(m.active,false);assert(m.hp>0&&m.mp>0);assert.deepEqual(m.skills,['','','','']);assert.equal(Object.keys(m.equip).length,0);
assert.equal(mercQuestHtml(),'');mercQuestAccept();assert.equal(player.mercQuest.active,false);
// 放棄原物件退回（含詞綴、UID、物品鎖）；不複製、符石數量正確。
const sword=addItem('longSword');sword.ench=7;sword.q='rare';sword.af=[];mercEquip(sword.uid,'weapon');sword.sellLocked=true;
addItem('mercRune_wolf');mercSetRune(0,'wolf');assert.equal(countItem('mercRune_wolf'),0);
mercDismiss();const dismiss=confirmFn;assert.equal(player.mercenary,m);dismiss();dismiss();assert.equal(player.mercenary,null);assert.equal(player.inv.filter(x=>x.uid===sword.uid).length,1);assert.equal(findInv(sword.uid),sword);assert(sword.sellLocked);assert.equal(countItem('mercRune_wolf'),1);assert(mercQuestHtml().includes('接取傭兵任務'));
// 六個隨機結果皆可抽中，無金幣費用、無初始技能。
const originalRand=rand;
for(let i=0;i<6;i++){fresh();finish();const gold=player.gold;rand=()=>i;mercQuestClaim();confirmFn();assert.equal(player.mercenary.cls,Object.keys(MERC_CLASSES)[i]);assert.equal(player.gold,gold);}
rand=originalRand;
// 死亡可重接，舊屍體保留至領取；復活會取消進度，舊領獎確認不能替換復活者。
player.mercenary.lv=12;mercDie();assert(mercQuestHtml().includes('接取傭兵任務'));const dead=player.mercenary;finish();mercQuestClaim();const stale=confirmFn;
player.gold=100000;mercRevive();confirmFn();assert.equal(dead.lv,12);assert(!dead.dead);assert(!player.mercQuest.active);stale();assert.equal(player.mercenary,dead);
mercDie();finish();mercQuestClaim();confirmFn();assert.notEqual(player.mercenary,dead);assert.equal(player.mercenary.lv,1);
// 離村與換角色後，延遲的確認不可領獎／放棄；讀檔清理非法進度。
mercDismiss();const leave=confirmFn;player.loc={type:'zone',id:'coast'};leave();assert(player.mercenary);player.loc={type:'town',id:'talking'};
mercDismiss();const other=confirmFn;fresh();other();assert.equal(player.mercenary,null);
player.mercQuest={active:true,kills:Infinity};mercQuestNormalize(player);assert.equal(player.mercQuest.kills,0);
player.mercQuest={active:true,kills:9000};mercQuestNormalize(player);assert.equal(player.mercQuest.kills,5000);
// 真正onKill的擊殺結算；同怪不重複、SIM不累積。
fresh();mercQuestAccept();lootMode='legacy';diaRoll=()=>{};rollDrops=()=>{};questOnKill=()=>{};mapOnKill=()=>false;gainExp=()=>{};checkAutoHome=()=>{};sfx=()=>{};
const mon={name:'測試怪',hp:0,gold:[0,0],exp:1};hunt={mobs:[mon],mon,state:'fight'};session={kills:0,exp:0,gold:0};onKill(mon);onKill(mon);assert.equal(player.mercQuest.kills,1);
`, ctx);
console.log('PASS：5000隻任務／接取後計數／SIM隔離／真實擊殺去重／六職業抽取／隱藏與重接／死亡替換及復活互斥／放棄退回不複製／延遲確認／schema19舊檔與加密存讀。');
