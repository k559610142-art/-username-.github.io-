// 背包獨立收納：記憶體角色，不操作正式存檔／雲端。
const fs=require('fs'),path=require('path'),vm=require('vm'),assert=require('assert/strict');
const prefix=fs.readFileSync(path.join(__dirname,'test-mercenary.js'),'utf8').split('ctx.assert = assert;')[0];
const ctx=new Function('require','__dirname',prefix+'\nreturn ctx;')(require,__dirname);ctx.assert=assert;
vm.runInContext(`
SIM_MODE=false;lootMode='legacy';saveGame=()=>{};refreshUI=()=>{};renderPanel=()=>{};showToast=()=>{};closeDialog=()=>{};sfx=()=>{};
createPlayer('收納隔離','knight',CLASSES.knight.base);const weight=invWeight();
assert.equal(SAVE_SCHEMA,20);
for(const id of ['curChaos','map8','weaponScroll','baphometHorn','mercRune_wolf'])assert(bagStorageKind(id));
for(const id of ['redPotion','homeScroll','longSword','magicCrystal','soul_baphometHorn'])assert.equal(bagStorageKind(id),'');
const material=addItem('baphometHorn',20),scroll=addItem('weaponScroll',10),rune=addItem('mercRune_wolf',3),cur=addItem('curChaos',4),map=makeMapItem(8,'legend');player.inv.push(map);
for(const x of [material,scroll,rune,cur,map])assert(bagIsStored(x));assert.equal(invWeight(),weight);
const ids=player.inv.map(x=>x.uid);assert.equal(new Set(ids).size,ids.length);
// 原物件搬移，不複製；取回全疊恢復重量，新掉落另進收納。
material.sellLocked=true;const uid=material.uid;bagWithdraw(uid);assert.equal(material.bagStored,undefined);assert.equal(invWeight(),weight+100);
const more=addItem('baphometHorn',5);assert(bagIsStored(more));assert.notEqual(more.uid,uid);assert.equal(countItem('baphometHorn'),25);
assert(!consumeItem('baphometHorn',26));assert.equal(countItem('baphometHorn'),25);assert(consumeItem('baphometHorn',22));assert.equal(countItem('baphometHorn'),3);
const scrollUid=scroll.uid;bagWithdraw(scrollUid);assert(!bagIsStored(scroll));bagStore(scrollUid);assert(bagIsStored(scroll));assert.equal(scroll.uid,scrollUid);assert.equal(countItem('weaponScroll'),10);
// 負重不足不可取出，但已滿負重仍能取得零負重收納物。
const heavy=addItem('valakasScale',10000),before=invWeight();bagWithdraw(heavy.uid);assert(bagIsStored(heavy));assert.equal(invWeight(),before);
bagWithdraw(heavy.uid,2);assert.equal(heavy.n,9998);assert.equal(countItem('valakasScale'),10000);assert.equal(invWeight(),before+20);const qty=heavy.n;bagWithdraw(heavy.uid,-1);bagWithdraw(heavy.uid,1.5);bagWithdraw(heavy.uid,10001);assert.equal(heavy.n,qty);
assert(bagCanReceive('baphometHorn',100,0));assert(!bagCanReceive('redPotion',10000,0));
// 整理不能混合背包／收納兩個位置，亦不能遺失防賣鎖。
bagWithdraw(scrollUid);const second=addItem('weaponScroll',7);second.sellLocked=true;bagTidy();assert.equal(player.inv.filter(x=>x.id==='weaponScroll').length,2);assert.equal(countItem('weaponScroll'),17);assert(second.sellLocked);
bagStoreAll();assert(player.inv.filter(x=>bagStorageKind(x.id)).every(bagIsStored));assert.equal(countItem('weaponScroll'),17);
// 分頁只有收納物，固定空格可見；地圖按詞綴與鎖定分組，未鑑定資料不變。
bagSetPage('currency');let html=renderBag();assert(html.includes('bag-stash-slot'));assert(html.includes('點化石'));assert(html.includes('混沌石'));
bagSetPage('map');bagSetTier(8);bagSetQuality('unid');html=renderBag();assert(html.includes('尚未鑑定'));assert(html.includes('T15'));assert(map.unidentified);
const mod=Object.keys(MAP_MODS)[0],a=makeMapItem(3,'magic');a.mm=[mod];a.nm='甲';const b={...a,uid:player.nextUid++,mm:[mod],sellLocked:true};player.inv.push(a,b);
bagSetTier(3);bagSetQuality('all');html=renderBag();assert(html.includes('openItemDialog('+a.uid+')'));assert(html.includes('openItemDialog('+b.uid+')'));
// 舊存檔不憑空搬移／增加物品；加密往返保留位置、UID、詞綴和鑑定。
let old=JSON.parse(JSON.stringify(player));for(const x of old.inv)delete x.bagStored;const snapshot=JSON.stringify(old.inv);let migrated=migrateSave({schema:19,player:old});assert.equal(JSON.stringify(migrated.inv),snapshot);
const raw=saveEncode(JSON.stringify({schema:20,player}));player=guardWrap(migrateSave(saveParse(raw)));assert(bagIsStored(findInv(map.uid)));assert(findInv(map.uid).unidentified);assert.deepEqual(findInv(b.uid).mm,[mod]);assert(findInv(b.uid).sellLocked);
const gear=addItem('longSword');gear.bagStored=true;player.storage.push({uid:player.nextUid++,id:'weaponScroll',n:2,bagStored:true});bagStorageNormalize(player);assert(!gear.bagStored);assert(!player.storage[0].bagStored);
// 收納卷軸可直接強化，符石可配置；通貨可直接鍛造，地圖可列入排程。
player.loc={type:'town',id:'talking'};const target=addItem('longSword'),sc=player.inv.find(x=>x.id==='weaponScroll');const n=countItem(sc.id);assert(doEnchant(sc.uid,target.uid).ok);assert.equal(countItem(sc.id),n-1);
const m=player.mercenary={cls:'spirit',lv:1,exp:0,hp:100,mp:100,active:false,dead:false,equip:{},skills:['','','',''],cds:{}};mercSetRune(0,'wolf');assert.equal(m.skills[0],'wolf');assert.equal(countItem('mercRune_wolf'),2);
assert(mapQueueChoices(0).some(g=>g.x.uid===a.uid||g.x.uid===b.uid));
// NPC倉庫部分搬移也保留總數、鎖定，取回依新分類自動歸位。
const pile=player.inv.find(x=>x.id==='weaponScroll'),total=countItem('weaponScroll')+player.storage.filter(x=>x.id==='weaponScroll').reduce((n,x)=>n+x.n,0);
moveQty(pile.uid,2,player.inv,player.storage);const stored=player.storage.find(x=>x.id==='weaponScroll');assert(!stored.bagStored);moveQty(stored.uid,2,player.storage,player.inv);
assert.equal(countItem('weaponScroll')+player.storage.filter(x=>x.id==='weaponScroll').reduce((n,x)=>n+x.n,0),total);
// 真實後端收據：背包已超重仍可收納，寫入失敗需還原位置與數量，重送不重領。
const memory=new Map();let noWrite=false;localStorage={getItem:k=>memory.get(k)||null,setItem:(k,v)=>{if(noWrite)throw Error('disk full');memory.set(k,v);},removeItem:k=>memory.delete(k)};
cloudUser={id:'bag-user'};cloudMarkDirty=()=>{};currentSlot=0;player.settings.lootFilter=0;player.settings.lootAutoSell=[];addItem('redPotion',10000);
memory.set(slotKey(0),saveEncode(JSON.stringify({schema:20,owner:cloudUser.id,player,lootCursor:0})));const w=invWeight(),oldMat=countItem('baphometHorn');assert(w>calcStats().weightMax);
const receipt={cursor:1,slot:0,char:lootChar(),items:[{id:'baphometHorn',n:50},{id:'weaponScroll',n:2},{id:'map8',n:1,q:'rare',mm:[mod],nm:'收據地圖'}]};
assert(lootApply(receipt));assert.equal(countItem('baphometHorn'),oldMat+50);assert.equal(invWeight(),w);assert(player.inv.find(x=>x.nm==='收據地圖').bagStored);assert(lootApply(receipt));assert.equal(countItem('baphometHorn'),oldMat+50);
const beforeReceipt=JSON.stringify(player.inv);noWrite=true;assert.throws(()=>lootApply({...receipt,cursor:2}),/disk full/);noWrite=false;assert.equal(JSON.stringify(player.inv),beforeReceipt);
console.log('PASS：五分類／零負重、自動歸位、搬移無複製／鎖定、跨位置原子扣料、整理／一鍵收納、舊檔與加密、地圖資訊、衝裝／符石／排程直接使用。');
`,ctx);
