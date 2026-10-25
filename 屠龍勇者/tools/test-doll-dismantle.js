// 分解使用真實遊戲函式與記憶體存檔，不碰正式角色／網路／瀏覽器。
const fs=require('fs'),path=require('path'),vm=require('vm'),assert=require('assert/strict');
const root=path.resolve(__dirname,'..');
const ctx=vm.createContext({console,assert,TextEncoder,TextDecoder,btoa,atob,Image:function(){},setTimeout:()=>0,clearTimeout(){},setInterval:()=>0,clearInterval(){},
 localStorage:{getItem:()=>null,setItem(){throw Error('不准寫正式存檔');},removeItem(){throw Error('不准刪正式存檔');}},
 document:{addEventListener(){},getElementById:()=>null,querySelector:()=>null,documentElement:{style:{}}},window:{addEventListener(){},innerWidth:1280,innerHeight:720},navigator:{},fetch(){throw Error('不准連線');}});
for(const[,file]of fs.readFileSync(path.join(root,'index.html'),'utf8').matchAll(/<script src="(data\/[^"?]+\.js)\?v=/g)){
 if(file==='data/main.js'||file==='data/pwa.js')continue;vm.runInContext(fs.readFileSync(path.join(root,file),'utf8'),ctx,{filename:file});
}
vm.runInContext(String.raw`
SIM_MODE=true;createPlayer('分解測試','knight',CLASSES.knight.base);SIM_MODE=false;
sfx=()=>{};refreshUI=()=>{};renderPanel=()=>{};showToast=()=>{};
let asked=null,asks=0,saves=0,raw='';gameConfirm=(title,msg,go)=>{asked={title,msg,go};asks++;};
saveGame=()=>{saves++;raw=saveEncode(JSON.stringify({schema:SAVE_SCHEMA,player}));};
openTabs=['town'];townSub='dollShop';dollShopTab='dismantle';cloudUser=null;
assert(isStackable(ITEMS.magicCrystal));assert.equal(ITEMS.magicCrystal.sell,0);assert.equal(ITEMS.magicCrystal.wt,0);
assert(codexSources('magicCrystal').join('').includes('50'));
const mk=(id,q)=>{const it=addItem(id);if(q)it.q=q;return it;};
const legend=mk('longSword','legend');legend.ench=7;legend.af=[{k:'hit',v:2}];
const rare=mk('longSword','rare'),magic=mk('longSword','magic'),plain=mk('longSword'),map=mk('map1','legend'),doll=mk('doll_phoenix','legend');
const armorId=Object.keys(ITEMS).find(id=>ITEMS[id].cat==='armor'&&ITEMS[id].slot==='ring'),ring=mk(armorId,'legend');
const locked=mk('longSword','legend');locked.sellLocked=true;
assert(dollLegendGear(legend));assert(dollLegendGear(ring));for(const it of [rare,magic,plain,map,doll]){assert(!dollLegendGear(it));dollDismantle(it.uid);}assert.equal(asks,0);
const html=renderDollShop();assert(html.includes('購買娃娃'));assert(html.includes('分解傳說裝備'));assert(html.includes('已鎖定'));assert(!html.includes('dollDismantle('+rare.uid+')'));
dollDismantle(locked.uid);assert.equal(asks,0);assert(findInv(locked.uid));
const equipped=player.equip.weapon;equipped.q='legend';dollDismantle(equipped.uid);assert.equal(asks,0);
// 取消完全不變，確認只消耗一件、不給金幣；重複回呼不重領。
const before=JSON.stringify(player.inv),gold=player.gold;dollDismantle(legend.uid);assert.equal(JSON.stringify(player.inv),before);assert.equal(countItem('magicCrystal'),0);assert(asked.msg.includes('50'));assert(asked.msg.includes('+7'));
asked.go();assert(!findInv(legend.uid));assert.equal(countItem('magicCrystal'),50);assert.equal(player.gold,gold);assert.equal(saves,1);asked.go();assert.equal(countItem('magicCrystal'),50);assert.equal(saves,1);
dollDismantle(ring.uid);asked.go();assert(!findInv(ring.uid));assert.equal(countItem('magicCrystal'),100);assert.equal(player.inv.filter(x=>x.id==='magicCrystal').length,1);
const decoded=saveParse(raw);assert.equal(decoded.player.inv.find(x=>x.id==='magicCrystal').n,100);assert(!decoded.player.inv.some(x=>x.uid===ring.uid));
const failedGrant=mk('longSword','legend');dollDismantle(failedGrant.uid);const addReal=addItem;addItem=()=>null;asked.go();addItem=addReal;assert(findInv(failedGrant.uid));assert.equal(countItem('magicCrystal'),100);
// 確認期間物品改變、鎖定、離村、離開分解頁、角色切換皆拒絕。
for(const change of ['lock','quality','enchant','remove','equip','town','tab','player']){
 const it=mk('longSword','legend');dollDismantle(it.uid);const go=asked.go,owner=player;
 if(change==='lock')it.sellLocked=true;if(change==='quality')it.q='rare';if(change==='enchant')it.ench=9;if(change==='remove')removeInst(it.uid);
 if(change==='equip')equipItem(it.uid,true);
 if(change==='town')player.loc={type:'zone',id:'island'};if(change==='tab')dollShopTab='buy';if(change==='player')player=guardWrap(JSON.parse(JSON.stringify(player)));
 go();assert.equal(countItem('magicCrystal'),100,change);player=owner;player.loc={type:'town',id:'talking'};dollShopTab='dismantle';
}
setDollShopTab('buy');assert(renderDollShop().includes('分解傳說裝備'));assert.equal((renderDollShop().match(/>購買<\/button>/g)||[]).length,5);
dollDismantle(locked.uid);assert.equal(countItem('magicCrystal'),100);
console.log('PASS dismantle: legend gear only / ordinary player allowed / locked and equipped denied / cancel / confirm50 / stack100 / no gold / duplicate callback / stale item and context / encrypted persistence / T4 shop retained');
`,ctx);
