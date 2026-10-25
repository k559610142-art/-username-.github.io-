// 真實遊戲函式＋隔離角色；不操作瀏覽器、真實存檔或網路。
const vm = require('vm'), ctx = require('./test-dolls.js');
vm.runInContext(`{
function freshDoll(id) {
    SIM_MODE=true; createPlayer('娃娃能力測試','knight',CLASSES.knight.base); SIM_MODE=false;
    gameNow=1000000; hunt=null; scene=null; gameLog.length=0;
    const base=calcStats();
    if(id){const x=addItem('doll_'+id);equipItem(x.uid);}
    player.hp=calcStats().maxHp;player.mp=calcStats().maxMp;
    return base;
}
const rollOriginal=chance;
chance=()=>true;
assert.equal(Object.keys(DOLL_ABILITIES).length,21);
for(const id of Object.keys(DOLL_ABILITIES)){
    const base=freshDoll(id),fx=DOLL_ABILITIES[id].fx,st=calcStats();
    assert.equal(st.maxHp,base.maxHp+(fx.hp||0),id+' HP');
    assert.equal(st.maxMp,base.maxMp+(fx.mp||0),id+' MP');
    for(const k of ['hit','mr','sp','dodge','reduce','expPct','goldPct'])assert.equal(st[k],base[k]+(fx[k]||0),id+' '+k);
    assert.equal(st.ac,base.ac-(fx.ac||0));assert.equal(st.dmgBonus,base.dmgBonus+(fx.dmg||0));assert.equal(st.weightMax,base.weightMax+(fx.weight||0));
    assert(charCompanionsHtml().includes(DOLL_ABILITIES[id].name));
    assert(codexDetailHtml('doll_'+id).includes(DOLL_ABILITIES[id].desc));
    assert(!ITEMS['doll_'+id].desc.includes('尚未設定'));
    unequipSlot('doll');assert.equal(JSON.stringify(calcStats()),JSON.stringify(base),'卸下移除 '+id);
}
// 定時恢復只累積出場時間，換裝／加密重登不重置、不立即補滿。
for(const id of Object.keys(DOLL_ABILITIES).filter(id=>DOLL_ABILITIES[id].period)){
    freshDoll(id);const a=DOLL_ABILITIES[id],st=calcStats();player.hp=1;player.mp=0;
    dollAbilityTick(a.period-100);assert.equal(player.hp,1);assert.equal(player.mp,0);
    const it=player.equip.doll;unequipSlot('doll');dollAbilityTick(500000);equipItem(it.uid);
    const encoded=saveEncode(JSON.stringify({schema:10,player}));player=guardWrap(migrateSave(saveParse(encoded)));
    dollAbilityTick(100);assert.equal(player.hp,Math.min(st.maxHp,1+(a.hp||0)));assert.equal(player.mp,Math.min(st.maxMp,a.mp||0));
    assert.equal(player.dollState[id].elapsed,0);
}
freshDoll('steam-squirrel');assert.equal(dollPotion(100),110);
player.hp=1;addItem('redPotion',1);potReadyAt=0;const oldRand=rand;rand=(a,b)=>a;
usePotion('redPotion');assert.equal(player.hp,18,'實際藥水15增效為17');rand=oldRand;
freshDoll('flower-rabbit');player.hp=1;dollPotion(20);for(let i=0;i<5;i++){gameNow+=1000;dollAbilityTick(1000);}assert.equal(player.hp,31);
const flowerReady=player.dollState['flower-rabbit'].readyAt;dollPotion(20);assert.equal(player.dollState['flower-rabbit'].readyAt,flowerReady);
freshDoll('skeleton-knight');let st=calcStats(),hp=player.hp;assert.equal(dollTakeDamage(25,st),15);assert.equal(player.hp,hp-15);
freshDoll('star-fox');st=calcStats();player.hp=Math.floor(st.maxHp*.4);dollAbilityTick(1);assert(!player.dollState['star-fox'],'40%整數上界未低於門檻時不觸發');
player.hp=1;dollAbilityTick(1);let r=dollContext();assert.equal(r.shield,50);assert.equal(dollTakeDamage(20,st),0);assert.equal(r.shield,30);assert(buffIconsHtml().includes('盾30'));
const foxReady=player.dollState['star-fox'].readyAt;const fox=player.equip.doll;unequipSlot('doll');equipItem(fox.uid);dollAbilityTick(1);assert.equal(dollContext().shield,0);assert.equal(player.dollState['star-fox'].readyAt,foxReady);
freshDoll('frost-dragon');st=calcStats();dollTakeDamage(10,st);assert(dollContext().until>gameNow);assert.equal(dollTakeDamage(20,st),18);gameNow+=5000;assert.equal(dollTakeDamage(20,st),20);
freshDoll('black-tortoise');st=calcStats();player.hp=st.maxHp;dollAbilityTick(1);assert(!player.dollState['black-tortoise']);player.hp=st.maxHp*.39;dollAbilityTick(1);assert.equal(dollTakeDamage(20,st),17);
// 致命傷害先判免死；同款另一隻／換裝／重登共用冷卻。
freshDoll('phoenix');st=calcStats();player.hp=1;dollTakeDamage(99999,st);assert.equal(player.hp,Math.floor(st.maxHp*.2));assert.equal(player.deaths,0);
const ready=player.dollState.phoenix.readyAt;const another=addItem('doll_phoenix');equipItem(another.uid);assert.equal(player.dollState.phoenix.readyAt,ready);
player=guardWrap(migrateSave(saveParse(saveEncode(JSON.stringify({schema:10,player})))));assert.equal(player.dollState.phoenix.readyAt,ready);
gameNow+=3000;assert(dollStatusInfo().text.includes('冷卻'));player.hp=1;dollTakeDamage(99999,calcStats());assert(player.hp<=0,'冷卻中不能再次免死');
gameNow=ready;player.hp=1;dollTakeDamage(99999,calcStats());assert(player.hp>0);
// 追獵連續攻擊、換目標／停攻／換裝重置。
freshDoll('white-tiger');let m={name:'靶',hp:1000},other={name:'另一靶',hp:1000};hunt={mon:m};assert.equal(dollAttackMult(m),1);
for(let i=1;i<=5;i++){gameNow+=1000;assert.equal(dollAttackMult(m),i<5?1:1.08);}assert(dollStatusInfo().on);
gameNow+=3000;assert.equal(dollAttackMult(m),1);hunt.mon=other;assert.equal(dollAttackMult(other),1);
// 追加傷害不再呼叫命中流程，範圍只擲一次；吸血不能超過實傷。
for(const id of ['lava-hound','golden-griffin','golden-dragon','vermillion-bird']){
 freshDoll(id);let scope={},a={name:'一',hp:1000,boss:id==='golden-dragon'},b={name:'二',hp:1000};
 dollOnHit(a,10,true,scope);dollOnHit(b,10,true,scope);assert.equal(a.hp,1000-(id==='golden-dragon'?90:DOLL_ABILITIES[id].extra));assert.equal(b.hp,1000);
 if(id==='vermillion-bird'){const c={name:'物攻',hp:1000};dollOnHit(c,10,false,{});assert.equal(c.hp,1000);}
}
freshDoll('little-demon');player.hp=1;dollOnHit({hp:100},3,false,{});assert.equal(player.hp,4);
freshDoll('mushroom-rabbit');assert.equal(dollKillGold({},100),120);assert.equal(dollKillGold({boss:true},100),100);assert.equal(dollKillGold({dragon:true},100),100);
// 舊存檔、非法欄位清理與純模擬還原。
// 實際範圍法術／多段物理技能只觸發一次，DOT／共鳴不觸發。
freshDoll('vermillion-bird');const targets=[0,1,2].map(i=>({name:'法術靶'+i,hp:10000,mr:0,ac:0,gold:[1,1],exp:1}));
hunt={mon:targets[0],mobs:targets,pCd:0};player.mp=10000;
const spell={id:'testDollSpell',name:'範圍測試',aoe:true,mp:0,dmg:[10,10],spK:0};
castSpell(spell,calcStats());assert.equal(gameLog.filter(x=>x.cls==='doll'&&x.msg.includes('追加傷害')).length,1);
gameLog.length=0;castSpell({...spell,id:'res_testDollSpell'},calcStats());assert.equal(gameLog.filter(x=>x.cls==='doll').length,0);
freshDoll('golden-griffin');const strikeTargets=[0,1,2].map(i=>({name:'物理靶'+i,hp:10000,mr:0,ac:0}));hunt={mon:strikeTargets[0],mobs:strikeTargets,pCd:0};
doStrike({id:'testDollStrike',name:'多段範圍',mp:0,aoe:true,hits:3,mult:1},calcStats());assert.equal(gameLog.filter(x=>x.cls==='doll'&&x.msg.includes('追加傷害')).length,1);
// 首領紅圈致命傷實際走免死流程，不先執行死亡；普攻也一致。
freshDoll('phoenix');st=calcStats();player.hp=1;const boss={name:'致命首領',boss:true,hp:10000,dmg:[99999,99999],hit:999,spd:1000,stunUntil:0};
hunt={mon:boss,mobs:[boss],tele:{mob:boss,name:'重擊',until:gameNow,seenAt:gameNow,dodged:false}};
bossSkillTick(1);assert(player.hp>0);assert.equal(player.deaths,0);assert(player.dollState.phoenix.readyAt>gameNow);
freshDoll('phoenix');player.hp=1;chance=p=>p>.9;monsterAttack(calcStats(),boss);assert(player.hp>0);assert.equal(player.deaths,0);chance=()=>true;
// 模擬量測還原正在生效的護盾，並保留原本角色的技能／冷卻。
freshDoll('star-fox');player.hp=1;dollAbilityTick(1);player.loc={type:'zone',id:'island'};
const beforeShield=dollContext().shield,beforeUntil=dollContext().until;measureHunt(1000);assert.equal(dollContext().shield,beforeShield);assert.equal(dollContext().until,beforeUntil);
freshDoll('phoenix');let oldSave=JSON.parse(JSON.stringify(player));delete oldSave.dollState;assert.deepEqual(Object.keys(migrateSave({schema:9,player:oldSave}).dollState),[]);
player.dollState={phoenix:{readyAt:Infinity,elapsed:-5},unknown:{readyAt:99999}};dollStateNormalize(player);assert.equal(player.dollState.phoenix.readyAt,0);assert(!player.dollState.unknown);
player.loc={type:'zone',id:'island'};const snap=JSON.stringify(player.dollState);measureHunt(1000);assert.equal(JSON.stringify(player.dollState),snap,'收益量測不汙染真實冷卻');
dollApplySimulation(['phoenix'],0);assert.equal(player.dollState.phoenix.readyAt,gameNow+600000);
freshDoll('phoenix');const locks=dollSimulationLocks({}, {phoenix:{readyAt:gameNow+12345}});assert.equal(locks[0].remaining,12345);dollApplySimulation(locks,0);assert.equal(player.dollState.phoenix.readyAt,gameNow+12345);
// 真實團戰模擬保留原角色，並在結果攜帶參戰娃娃與剩餘冷卻。
freshDoll('phoenix');const raidBossTest=makeMonster(RAIDS[0].boss);Object.assign(raidBossTest,{hp:999999,maxHp:999999,dmg:[99999,99999],magic:null,hit:9999,spd:500,atkCd:0,stunUntil:0});
chance=p=>p>.9;const raidResult=raidSimulate(RAIDS[0],[{uid:'abilities',snap:raidSnapshot()}],{boss:raidBossTest,limitMs:3000});
assert.equal(raidResult.members[0].doll,'phoenix');assert(raidResult.members[0].dollLocks.some(x=>x.id==='phoenix'&&x.remaining>0));assert(!player.dollState.phoenix,'團戰模擬本身不得更動真實冷卻');
chance=rollOriginal;
console.log('PASS abilities: all21 stats / unequip / timed recovery and encrypted reload / potion and HoT / shield and mitigation / phoenix shared cooldown / chase / proc once / actual-damage drain / gold / old-save migration / simulation isolation');
}`, ctx);
