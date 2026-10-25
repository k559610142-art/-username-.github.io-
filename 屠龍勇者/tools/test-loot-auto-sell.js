// 真實遊戲串接回歸：記憶體localStorage與假RPC，禁止正式連線。
const fs=require('fs'),path=require('path'),vm=require('vm'),assert=require('assert/strict'),crypto=require('crypto');
const root=path.resolve(__dirname,'..'),memory=new Map();let failStorage=false;
const ctx=vm.createContext({console,assert,crypto,TextEncoder,TextDecoder,btoa,atob,setTimeout,clearTimeout,setInterval:()=>0,clearInterval(){},Image:function(){},
 localStorage:{getItem:k=>memory.get(k)||null,setItem:(k,v)=>{if(failStorage)throw Error('disk full');memory.set(k,v);},removeItem:k=>memory.delete(k)},
 document:{addEventListener(){},getElementById:()=>null,querySelector:()=>null,documentElement:{style:{}}},window:{addEventListener(){},innerWidth:1280,innerHeight:720},navigator:{},fetch(){throw Error('不准正式連線');},failDisk:b=>{failStorage=b;}});
for(const[,f]of fs.readFileSync(path.join(root,'index.html'),'utf8').matchAll(/<script src="(data\/[^"?]+\.js)\?v=/g))if(!['data/main.js','data/pwa.js'].includes(f))vm.runInContext(fs.readFileSync(path.join(root,f),'utf8'),ctx,{filename:f});

vm.runInContext(String.raw` 
SIM_MODE=true;createPlayer('指定販賣測試','knight',CLASSES.knight.base);SIM_MODE=false;
showToast=()=>{};renderPanel=()=>{};refreshUI=()=>{};sfx=()=>{};cloudMarkDirty=()=>{};worldVfxLoot=()=>{};
const saveReal=saveGame;let confirmSale=null, saved=0;saveGame=()=>{saved++;};gameConfirm=(title,msg,yes)=>{assert(msg.includes('傳說'));assert(msg.includes('共鳴'));confirmSale=yes;};
const potion=player.inv.find(x=>x.id==='redPotion'),n0=potion.n,g0=player.gold;
lootAutoAdd(potion.uid);assert.equal(player.settings.lootAutoSell.length,0,'確認前不改清單');assert.equal(potion.n,n0);assert.equal(player.gold,g0);
confirmSale();assert.deepEqual(player.settings.lootAutoSell,['redPotion']);assert.equal(potion.n,n0,'新增不賣現有物品');
lootAutoAdd(potion.uid);assert.equal(player.settings.lootAutoSell.length,1,'不可重複');
lootAutoDrawerOpen=true;const drawer=lootAutoDrawerHtml();assert(drawer.includes('移除'));assert(drawer.includes('從背包新增'));assert(renderSettings().includes('自動販賣'));
chance=p=>p>=1;rollBookDrop=()=>null;rollMapDrop=()=>{};player.settings.lootFilter=0;
rollDrops({lv:1,boss:false,drops:[{id:'redPotion',p:1,n:[3,3]}]},{drops:[]});assert.equal(countItem('redPotion'),n0);assert.equal(player.gold,g0+sellPriceOf('redPotion')*3);assert(lootLog.at(-1).msg.includes('×3'));
lootAutoRemove('redPotion');rollDrops({lv:1,boss:false,drops:[{id:'redPotion',p:1,n:[2,2]}]},{drops:[]});assert.equal(countItem('redPotion'),n0+2,'移除後恢復撿取');
const res=Object.keys(ITEMS).find(id=>ITEMS[id].res&&['weapon','armor'].includes(ITEMS[id].cat));
const special={id:res,n:1,q:'legend',il:30,nm:'測試',af:[{k:'str',v:3}]};
player.settings.lootKeepRes=true;player.settings.lootKeepAf=['str'];player.settings.lootAutoSell=[res];assert(lootAutoSellHit(special),'明確清單優先於傳說／共鳴／詞綴保留');assert(!lootAutoSellHit({...special,sellLocked:true}));
const old=JSON.parse(JSON.stringify(player));delete old.settings.lootAutoSell;assert.deepEqual(migrateSave({schema:7,player:old}).settings.lootAutoSell,[]);
const dirty=JSON.parse(JSON.stringify(player));dirty.settings.lootAutoSell=[res,res,'not-item',null];assert.deepEqual(migrateSave({schema:8,player:dirty}).settings.lootAutoSell,[res]);
assert.equal(SAVE_SCHEMA,12);saveGame=saveReal;
const uid='11111111-1111-4111-8111-111111111111';cloudUser={id:uid,email:'test@invalid'};authUid=()=>uid;cloudLoggedIn=()=>true;playerOwner=uid;currentSlot=0;
player.settings.lootAutoSell=['redPotion',res];saveGame();const char=lootChar(),gold=player.gold,potions=countItem('redPotion');
const result={slot:0,char,cursor:1,items:[{id:'redPotion',n:4},special]};
assert(lootApply(result));assert.equal(player.gold,gold+sellPriceOf('redPotion')*4+instSellPrice(special));assert.equal(countItem('redPotion'),potions);assert(!player.inv.some(x=>x.id===res));
const after=player.gold;assert(lootApply(result));assert.equal(player.gold,after,'收據重送不重複加錢');
failDisk(true);assert.throws(()=>lootApply({...result,cursor:2}),/disk full/);failDisk(false);assert.equal(player.gold,after,'失敗還原金幣');
const decoded=saveParse(localStorage.getItem(slotKey(0)));assert.equal(decoded.schema,12);assert.deepEqual(decoded.player.settings.lootAutoSell,['redPotion',res]);
const first=player;currentSlot=1;SIM_MODE=true;createPlayer('其他角色','mage',CLASSES.mage.base);SIM_MODE=false;playerOwner=uid;saveGame();const second=player,goldSecond=second.gold;
assert(lootApply({...result,cursor:2}));assert.equal(player,second);assert.equal(second.gold,goldSecond,'其他角色金幣不變');
assert.equal(saveParse(localStorage.getItem(slotKey(0))).player.gold,after+sellPriceOf('redPotion')*4+instSellPrice(special),'非當前角色使用自己的清單');

currentSlot=0;player=first;lootMode='legacy';cloudLoggedIn=()=>false;player.settings.lootFilter=0;player.settings.lootAutoSell=[];
saveGame=()=>{};gameConfirm=(title,msg,yes)=>{assert(msg.includes('0 金幣'));confirmSale=yes;};
for(const id of ['arrow','silverArrow','bullet','silverBullet']) {
    const ammo=addItem(id,100),count=countItem(id),g=player.gold;
    assert.equal(sellPriceOf(id),0);lootAutoAdd(ammo.uid);confirmSale();assert(player.settings.lootAutoSell.includes(id));
    assert.equal(countItem(id),count);assert(lootAutoSellHit({id,n:10}));
    rollDrops({lv:1,boss:false,drops:[{id,p:1,n:[10,10]}]},{drops:[]});
    assert.equal(countItem(id),count);assert.equal(player.gold,g);assert(lootLog.at(-1).msg.includes('×10'));
}
const ammoSave=migrateSave({schema:8,player:JSON.parse(JSON.stringify(player))});assert.equal(ammoSave.settings.lootAutoSell.length,4,'彈藥讀檔保留');
cloudLoggedIn=()=>true;playerOwner=uid;saveGame=saveReal;saveGame();const ammoGold=player.gold,ammoCount=countItem('bullet');
const cursor=saveParse(localStorage.getItem(slotKey(0))).lootCursor||0;
assert(lootApply({slot:0,char:lootChar(),cursor:cursor+1,items:[{id:'bullet',n:50}]}));assert.equal(player.gold,ammoGold);assert.equal(countItem('bullet'),ammoCount);
console.log('PASS: confirmation, cancel, inventory unchanged, remove, local sale quantity, special override, locks, schema migration, backend sale, replay, rollback, encrypted persistence and other slot isolation');
`,ctx);
