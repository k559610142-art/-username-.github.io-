// 真實召喚、計時、加密存檔與模擬流程；不碰正式存檔或網路。
const vm=require('vm'),ctx=require('./test-dolls.js');
vm.runInContext(`{
function freshSummon(crystals=0){
 SIM_MODE=true;createPlayer('召喚費測試','knight',CLASSES.knight.base);SIM_MODE=false;gameNow=1000000;scene=null;hunt=null;
 if(crystals)addItem('magicCrystal',crystals);return addItem('doll_frost-dragon');
}
let it=freshSummon(49),base=calcStats();assert.equal(equipItem(it.uid),false);assert.equal(countItem('magicCrystal'),49);assert(!player.equip.doll);assert.equal(player.dollSummonUntil,0);
it=freshSummon(100);assert(equipItem(it.uid));assert.equal(countItem('magicCrystal'),50);const first=player.dollSummonUntil;
assert.equal(first,gameNow+1800000);assert(dollIsSummoned());assert.equal(calcStats().maxHp,base.maxHp+100);
// 已付費時間由所有娃娃共用，手動收回再召喚也不重扣。
gameNow+=100000;const second=addItem('doll_snow-owl');assert(equipItem(second.uid));assert.equal(player.dollSummonUntil,first);assert.equal(countItem('magicCrystal'),50);
unequipSlot('doll');assert(!dollIsSummoned());assert(equipItem(second.uid));assert.equal(countItem('magicCrystal'),50);assert.equal(player.dollSummonUntil,first);
gameNow=first-1;dollAbilityTick(1);assert.equal(countItem('magicCrystal'),50);gameNow=first;dollAbilityTick(1);assert.equal(countItem('magicCrystal'),0);assert.equal(player.dollSummonUntil,first+1800000);
const renewed=player.dollSummonUntil;dollAbilityTick(1);assert.equal(player.dollSummonUntil,renewed);assert.equal(countItem('magicCrystal'),0);
// 到期不足才收回，paid期間剩0結晶仍有效；能力／跟隨／臨時狀態同步解除，掛機繼續。
player.hunting=true;gameNow=renewed;dollAbilityTick(1);assert(!player.equip.doll);assert(findInv(second.uid));assert.equal(player.dollSummonUntil,0);assert.equal(dollStatusInfo(),null);assert.equal(calcStats().maxHp,base.maxHp);assert(player.hunting);
assert.equal(countItem('magicCrystal'),0);dollAbilityTick(1);assert.equal(player.inv.filter(x=>x.uid===second.uid).length,1);
// 保存剩餘時間／重登不再收費；到期後才收下一期。
it=freshSummon(150);equipItem(it.uid);gameNow+=500000;const due=player.dollSummonUntil;
player=guardWrap(migrateSave(saveParse(saveEncode(JSON.stringify({schema:SAVE_SCHEMA,player})))));assert.equal(player.dollSummonUntil,due);dollAbilityTick(100);assert.equal(countItem('magicCrystal'),100);
// 背景／離線超過多期補扣，付不起下一期即收回，不會重複補扣。
gameNow=due+1800000*2;dollAbilityTick(100);assert.equal(countItem('magicCrystal'),0);assert(!player.equip.doll);dollAbilityTick(100);assert.equal(countItem('magicCrystal'),0);
it=freshSummon(250);equipItem(it.uid);const oldDue=player.dollSummonUntil;gameNow=oldDue+1800000;dollAbilityTick(1);assert.equal(countItem('magicCrystal'),100);assert.equal(player.dollSummonUntil,oldDue+3600000);assert(player.equip.doll);
// 未裝備時不自動扣料，重新召喚以當下時間起算，不補未出場時段。
unequipSlot('doll');gameNow+=1800000*4;dollAbilityTick(1);assert.equal(countItem('magicCrystal'),100);equipItem(it.uid);assert.equal(countItem('magicCrystal'),50);assert.equal(player.dollSummonUntil,gameNow+1800000);
// 多疊結晶可以合併支付。
it=freshSummon();addItem('magicCrystal',20);player.inv.push({uid:player.nextUid++,id:'magicCrystal',n:30});assert(equipItem(it.uid));assert.equal(countItem('magicCrystal'),0);
// 舊檔不送免費召喚；第一次檢查付費或自動收回，保留道具。
it=freshSummon();removeInst(it.uid);player.equip.doll=it;delete player.dollSummonUntil;
player=guardWrap(migrateSave({schema:11,player}));assert.equal(player.dollSummonUntil,0);assert(!dollIsSummoned());assert.equal(calcStats().maxHp,base.maxHp);dollAbilityTick(1);assert(!player.equip.doll);assert(findInv(it.uid));
it=freshSummon(50);removeInst(it.uid);player.equip.doll=it;delete player.dollSummonUntil;player=guardWrap(migrateSave({schema:11,player}));dollAbilityTick(1);assert(dollIsSummoned());assert.equal(countItem('magicCrystal'),0);
// 純量測還原結晶與召喚時間，不汙染真實角色。
it=freshSummon(150);equipItem(it.uid);player.loc={type:'zone',id:'island'};player.dollSummonUntil=gameNow+100;
const before={n:countItem('magicCrystal'),until:player.dollSummonUntil};measureHunt(1000);assert.equal(countItem('magicCrystal'),before.n);assert.equal(player.dollSummonUntil,before.until);
// 真實離線結算先按已過一期扣50，不依抽樣倍率多扣。
it=freshSummon(200);equipItem(it.uid);player.loc={type:'zone',id:'island'};player.hunting=true;
const offlineDue=player.dollSummonUntil;gameNow=offlineDue+100;applyOffline(1800000);assert.equal(countItem('magicCrystal'),100);assert.equal(player.dollSummonUntil,offlineDue+1800000);
// 團戰跨續召邊界會記帳材料，且結果攜帶付費時間，單純模擬不扣真實角色。
it=freshSummon(150);equipItem(it.uid);player.dollSummonUntil=gameNow+100;const snapshot=raidSnapshot();
const monster=makeMonster(RAIDS[0].boss);Object.assign(monster,{hp:999999,maxHp:999999,dmg:[1,1],hit:0,spd:999999,atkCd:999999,magic:null});
const result=raidSimulate(RAIDS[0],[{uid:'fee-test',snap:snapshot}],{boss:monster,limitMs:2000});assert.equal(result.members[0].used.magicCrystal,50);assert(result.members[0].dollSummonUntil>snapshot.dollSummonUntil);assert.equal(countItem('magicCrystal'),100);
dollApplySummonResult(result.members[0].dollSummonUntil,result.members[0].used.magicCrystal);assert.equal(countItem('magicCrystal'),50);assert(player.dollSummonUntil>snapshot.dollSummonUntil);
dollApplySummonResult(result.members[0].dollSummonUntil,result.members[0].used.magicCrystal);assert.equal(countItem('magicCrystal'),50,'同一期已支付不得重扣');
it=freshSummon(150);equipItem(it.uid);const realDue=player.dollSummonUntil;gameNow=realDue;dollSummonTick();const realCount=countItem('magicCrystal');
dollApplySummonResult(realDue+1800000,50);assert.equal(countItem('magicCrystal'),realCount,'主迴圈已續召不能在團戰再扣');
assert(charCompanionsHtml().includes('50'));openDollPicker();assert(dialog.html.includes('魔法結晶'));
console.log('PASS summon: first50 / deny49 / shared paid time / exact30min renewal / no duplicate fee / insufficient recall removes effects but keeps hunting / encrypted reload / catch-up / inactive no fee / split stacks / schema11 migration / simulation isolation / raid accounting');
}`,ctx);
