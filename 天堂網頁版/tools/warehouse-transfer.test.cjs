const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const money = {uid:'coins',key:'etcitem:40308',count:1000};
function fixture(inventory, storage = []) {
  let failSave = false;
  const rules = {
    'weapon:1': {stackable:false,bless:2},
    'etcitem:40308': {stackable:true,bless:1},
    'etcitem:2': {stackable:true,bless:1}
  };
  const context = {
    activeCharacterId:'hero',activeCharacterLevel:60,gameFlowState:'playing',job:'騎士',hp:100,mp:20,worldX:0,worldY:0,
    INTERFACE_CATALOG:{items:[{kind:'weapon',id:1},{kind:'etcitem',id:40308},{kind:'etcitem',id:2}]},
    ITEM_USE_RULES:{definitions:rules,handlers:{},maxSizeExclusive:180},
    DBGameRules:{syncVitals(){},automaticSkills:(role, level, skills)=>skills},
    CharacterActions:{weapon:'unarmed',available:{weapons:['unarmed']},dead:false,reset(){}},
    GameEntry:{saveActive:()=>!failSave},
    document:{querySelector:()=>({})},stats(){},toast(){}
  };
  context.window = context;
  vm.createContext(context);
  vm.runInContext(fs.readFileSync(path.join(__dirname,'../data/owned-inventory.js'),'utf8'),context);
  const bag = context.OwnedInventory;
  bag.activate(inventory,storage);
  return {bag,fail:()=>{failSave=true;}};
}

test('裝備存入與領出保留強化、祝福狀態、鑑定及附魔資料',()=>{
  const gear={uid:'gear',key:'weapon:1',count:1,slot:null,enchant:7,bless:1,unid:true,soul:{id:42,lv:2}};
  const {bag}=fixture([money,gear]);
  assert.equal(bag.transfer('gear',false,100),'');
  assert.equal(bag.storedItems[0].enchant,7);
  assert.equal(bag.transfer('gear',true,100),'');
  const restored=bag.snapshot.find(item=>item.uid==='gear');
  assert.equal(JSON.stringify(restored),JSON.stringify(gear));
  assert.equal(bag.snapshot.find(item=>item.uid==='coins').count,900);
});

test('倉庫只合併同狀態堆疊，且存檔失敗不扣取件費',()=>{
  const regular={uid:'regular',key:'etcitem:2',count:2};
  const blessed={uid:'blessed',key:'etcitem:2',count:3,bless:0};
  const {bag,fail}=fixture([money,regular],[blessed]);
  assert.equal(bag.transfer('blessed',true,100),'');
  assert.equal(bag.items.filter(item=>item.key==='etcitem:2').length,2);
  assert.equal(bag.transfer('blessed',false,100),'');
  fail();
  assert.match(bag.transfer('blessed',true,100),/未移動/);
  assert.equal(bag.items.find(item=>item.uid==='coins').count,900);
  assert.equal(bag.storedItems[0].count,3);
});
