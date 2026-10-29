// 真實遊戲函式與記憶體存檔，禁止外部服務及正式角色資料。
const fs=require('fs'),path=require('path'),vm=require('vm'),assert=require('assert/strict');
const prefix=fs.readFileSync(path.join(__dirname,'test-mercenary.js'),'utf8').split('ctx.assert = assert;')[0];
const ctx=new Function('require','__dirname',prefix+'\nreturn ctx;')(require,__dirname);ctx.assert=assert;ctx.crypto=crypto;
vm.runInContext(`
SIM_MODE=true;sfx=()=>{};refreshUI=()=>{};showToast=()=>{};
createPlayer('天賦隔離測試','knight',CLASSES.knight.base);player.lv=99;player.baseHp=1000;player.baseMp=1000;
assert.equal(SAVE_SCHEMA,21);assert.equal(Object.keys(ITEMS).filter(id=>ITEMS[id].talentJewel).length,38);
assert.equal(isStackable(ITEMS.talentStone),true);assert.equal(isStackable(ITEMS[talentItemId(TALENT_JEWEL_CATALOG[0].id)]),false);
const cleanStats=calcStats();
function learnPath(state,target){
 const scene=talentPlanScene(state),prev=new Map([['origin',null]]),q=['origin'],adj=new Map();scene.edges.forEach(([a,b])=>{if(!adj.has(a))adj.set(a,[]);if(!adj.has(b))adj.set(b,[]);adj.get(a).push(b);adj.get(b).push(a);});
 while(q.length){const id=q.shift();if(id===target)break;(adj.get(id)||[]).forEach(n=>{if(!prev.has(n)&&(!scene.nodes.find(v=>v.id===n).exclusiveGroup||n===target)){prev.set(n,id);q.push(n);}});}
 const route=[];for(let id=target;id;id=prev.get(id))route.unshift(id);assert(prev.has(target));for(const id of route)if(!state.allocated.has(id))assert(talentPlanAllocate(state,id).ok,id);
}
function applyPlan(state){player.talent={v:TALENT_SYSTEM_VERSION,nodes:[...state.allocated].filter(id=>id!=='origin'),jewels:Object.fromEntries(Object.entries(state.jewels).map(([slot,id],i)=>[slot,{uid:1000+i,id:talentItemId(id),n:1,ench:0}])),trials:TALENT_TRIAL_IDS.slice()};}
let state=talentPlanCreate(100);learnPath(state,'blood-gate');applyPlan(state);
assert.equal(calcStats().maxHp,cleanStats.maxHp+20);assert.equal(calcStats().maxMp,cleanStats.maxMp);
state=talentPlanCreate(100);learnPath(state,'arcane-core');applyPlan(state);assert.equal(talentManaCost({mp:20}),23);const mp=player.mp;useSkillCost({mp:20,id:'test',cd:1});assert.equal(player.mp,mp-23);
assert(talentDamageMult(calcStats(),true,{})>=1.2);assert.equal(talentDamageMult(calcStats(),false,{}),1);assert.equal(calcStats().sp,cleanStats.sp+(talentBonuses().mods.SP||0));assert.equal(calcStats().maxMp,cleanStats.maxMp+(talentBonuses().mods['最大魔力']||0));
state=talentPlanCreate(100);learnPath(state,'blood-core');applyPlan(state);assert(calcStats().lifesteal>=.02);assert.equal(talentPotionAmount(100),75);
state=talentPlanCreate(100);learnPath(state,'guard-core');applyPlan(state);assert.equal(talentIncomingMult(false),.9);assert.equal(talentIncomingMult(true),.9);assert.equal(talentDamageMult(calcStats(),true,{}),.9);
state=talentPlanCreate(100);learnPath(state,'summon-core');applyPlan(state);assert.equal(talentDamageMult(calcStats(),false,{}),.92);assert(talentMercMult()>=1.15);
state=talentPlanCreate(100);learnPath(state,'battle-core');applyPlan(state);assert(calcStats().atkMs>=cleanStats.atkMs*1.1);assert(talentDamageMult(calcStats(),false,{})>=1.2);
state=talentPlanCreate(100);learnPath(state,'ranged-core');applyPlan(state);assert(talentDamageMult({ranged:true},false,{})>=1.2);
const normalSocket='battle-socket-0',jewel=TALENT_JEWEL_CATALOG.find(j=>j.id==='normal-blood-rare');state=talentPlanCreate(100);learnPath(state,normalSocket);assert(talentPlanInsert(state,normalSocket,jewel.id).ok);applyPlan(state);
const bonus=talentBonuses().mods;assert.equal(calcStats().maxHp,cleanStats.maxHp+(bonus['最大生命']||0));assert.equal(talentPotionAmount(100),103);
const old=JSON.parse(JSON.stringify(player));delete old.talent;old.lv=50;const migrated=migrateSave({schema:20,player:old});assert.deepEqual(JSON.parse(JSON.stringify(migrated.talent)),{v:null,nodes:[],jewels:{},trials:[]});assert.equal(talentRuntimeState(migrated).budget,41);
// 合法孔內實體保留；重複UID只保留既有背包那份，非法孔的合法實體退回背包。
talentNormalize(player);assert.equal(player.talent.jewels[normalSocket].id,talentItemId(jewel.id));
const active=player.talent.jewels[normalSocket];player.inv.push(JSON.parse(JSON.stringify(active)));talentNormalize(player);assert.equal(player.talent.jewels[normalSocket],undefined);assert.equal(player.inv.filter(it=>it.uid===active.uid).length,1);
player.inv=player.inv.filter(it=>it.uid!==active.uid);player.talent={v:TALENT_SYSTEM_VERSION,nodes:[],jewels:{bad:active},trials:[]};talentNormalize(player);assert.equal(player.inv.filter(it=>it.uid===active.uid).length,1);
// 憑證在相同加密收據交易內入帳；後續物品失敗需還原試煉。
SIM_MODE=false;player.talent=talentEmpty();playerOwner='talent-user';cloudUser={id:'talent-user'};cloudMarkDirty=()=>{};currentSlot=0;
const memory={};localStorage.getItem=k=>memory[k]||null;localStorage.setItem=(k,v)=>{memory[k]=v;};
memory[slotKey(0)]=saveEncode(JSON.stringify({schema:21,owner:cloudUser.id,player,lootProtocol:1,lootCursor:0}));
const before=JSON.stringify(player.talent),receipt={cursor:1,slot:0,char:lootChar(),items:[{id:'talentTrial_1',n:1},{id:'bad-id',n:1}]};
assert.throws(()=>lootApply(receipt));assert.equal(JSON.stringify(player.talent),before);assert.equal(saveParse(memory[slotKey(0)]).lootCursor,0);
receipt.items=[{id:'talentTrial_1',n:1},{id:talentItemId(jewel.id),n:1,ench:0}];assert(lootApply(receipt));assert.equal(player.talent.trials.length,1);const amount=player.inv.filter(it=>it.id===talentItemId(jewel.id)).length;assert(lootApply(receipt));assert.equal(player.talent.trials.length,1);assert.equal(player.inv.filter(it=>it.id===talentItemId(jewel.id)).length,amount);
const keep=JSON.stringify(player.talent);assert(!lootApply({...receipt,cursor:2,char:'other'}));assert.equal(JSON.stringify(player.talent),keep);
talentLiveMode=true;talentPlanState=talentLivePlanState();const html=renderTalentPlanner();assert(html.includes('正式角色'));assert(!html.includes('清空試玩'));talentLiveMode=false;
`,ctx);
console.log('PASS：schema21舊檔／41點推算、38寶珠道具、玩家HP／MP／SP／核心傷害與代價／藥水／傭兵倍率、UID去重退回、加密收據試煉與寶珠原子入帳／失敗還原／重送／換角隔離、正式UI無免費重置。');
