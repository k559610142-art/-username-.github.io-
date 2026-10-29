// 娃娃自動購買藥水（第230節）：真實召喚、職業選藥、加價、金幣／負重限制；不碰正式存檔或網路。
const fs=require('fs'),path=require('path'),vm=require('vm'),assert=require('assert/strict');
const prefix=fs.readFileSync(path.join(__dirname,'test-treasure-maps.js'),'utf8').split('vm.runInContext(String.raw`')[0];
const ctx=new Function('require','__dirname',prefix+'\nreturn ctx;')(require,__dirname);
vm.runInContext(`{
sfx=()=>{};showToast=()=>{};refreshUI=()=>{};saveGame=()=>{};closeDialog=()=>{};
function setup(cls='knight',gold=10000000,doll='doll_frost-dragon'){
 SIM_MODE=true;createPlayer('自動購買測試',cls,CLASSES[cls].base);SIM_MODE=false;gameNow=1000000;scene=null;hunt=null;
 player.gold=gold;addItem('magicCrystal',50);const it=addItem(doll);assert(equipItem(it.uid));assert(dollIsSummoned());return it;
}
const tick=()=>{gameNow+=2000;dollAbilityTick(1);};
// 職業對應：勇水／精靈餅乾／慎重藥水；每個職業都有綠水與古白
const expect={royal:'bravePotion',knight:'bravePotion',darkelf:'bravePotion',shura:'bravePotion',warrior:'bravePotion',paladin:'bravePotion',demon:'bravePotion',elf:'elvenWafer',gunner:'elvenWafer',mage:'wisdomPotion',magicfighter:'wisdomPotion',angel:'wisdomPotion'};
assert.deepEqual(Object.keys(expect).sort(),Object.keys(CLASSES).sort());
for(const [cls,brave] of Object.entries(expect)){
 setup(cls);player.settings.autoHome=false;tick();
 assert.equal(countItem('greenPotion'),20,cls);assert.equal(countItem(brave),20,cls);assert.equal(countItem('ancientPotion'),200,cls);
 for(const other of ['bravePotion','elvenWafer','wisdomPotion'].filter(x=>x!==brave))assert.equal(countItem(other),0,cls+' '+other);
}
// 加價10%、只補差額、2秒檢查一次
setup('knight');player.settings.autoHome=false;player.settings.dollBuyHeal=0;player.settings.dollBuyBrave=0;
addItem('greenPotion',5);let g=player.gold;gameNow+=2000;dollAbilityTick(1);
assert.equal(countItem('greenPotion'),20);assert.equal(g-player.gold,Math.ceil(shopCost('greenPotion',15)*1.1));
consumeItem('greenPotion');g=player.gold;dollAbilityTick(1);assert.equal(countItem('greenPotion'),19,'2秒內不重複檢查');
gameNow+=2000;dollAbilityTick(1);assert.equal(countItem('greenPotion'),20);assert.equal(g-player.gold,Math.ceil(150*1.1));
// 0＝不買
player.settings.dollBuyGreen=0;for(let i=0;i<20;i++)consumeItem('greenPotion');tick();assert.equal(countItem('greenPotion'),0);
// 金幣不足：只買得起的部分，不會變負數
setup('knight',Math.ceil(400*1.1)*3+10);player.settings.autoHome=false;player.settings.dollBuyGreen=0;player.settings.dollBuyBrave=0;
tick();assert.equal(countItem('ancientPotion'),3);assert(player.gold>=0&&player.gold<Math.ceil(400*1.1));
// 負重：開自動回家時不超過回家門檻；關閉時不超過最大負重
setup('knight');player.settings.dollBuyGreen=0;player.settings.dollBuyBrave=0;player.settings.dollBuyHeal=2000;player.settings.autoHome=true;player.settings.weightPct=50;
tick();let st=calcStats();assert(countItem('ancientPotion')>0&&countItem('ancientPotion')<2000);assert(invWeight()<st.weightMax*.5);
player.settings.autoHome=false;tick();st=calcStats();assert(invWeight()<=st.weightMax);assert(invWeight()>st.weightMax*.9);
// 沒召喚／沒裝娃娃／模擬模式都不買
setup('knight');unequipSlot('doll');player.settings.autoHome=false;tick();assert.equal(countItem('greenPotion'),0);
setup('knight');player.settings.autoHome=false;player.dollSummonUntil=gameNow-1;player.inv=player.inv.filter(x=>x.id!=='magicCrystal');tick();assert.equal(countItem('greenPotion'),0);
setup('knight');player.settings.autoHome=false;SIM_MODE=true;gameNow+=2000;assert.equal(dollAutoBuy(dollContext()),0);SIM_MODE=false;assert.equal(countItem('greenPotion'),0);
// 全部21款娃娃都有這功能、說明文字也有
for(const id of Object.keys(ITEMS).filter(id=>ITEMS[id].cat==='doll')){setup('elf',10000000,id);player.settings.autoHome=false;tick();assert.equal(countItem('elvenWafer'),20,id);assert(dollAbilityHtml(id).includes('自動購買藥水'));}
// 舊存檔補預設值
const old=JSON.parse(JSON.stringify(player));delete old.settings.dollBuyGreen;delete old.settings.dollBuyBrave;delete old.settings.dollBuyHeal;
const mig=migrateSave({schema:SAVE_SCHEMA,player:old});assert.equal(mig.settings.dollBuyGreen,20);assert.equal(mig.settings.dollBuyBrave,20);assert.equal(mig.settings.dollBuyHeal,200);
console.log('PASS 娃娃自動購買藥水：12職業選藥、21款娃娃、加價10%、補差額、0不買、金幣／負重限制、未召喚與模擬不買、舊檔預設');
}`,ctx);
