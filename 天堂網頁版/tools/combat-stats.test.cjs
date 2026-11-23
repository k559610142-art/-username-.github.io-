const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
function fixture(){const c={job:'騎士',OwnedInventory:{items:[]},EquipmentSets:{read:()=>({})},DBGameRules:{rows:()=>[],reduction:()=>0},PlayerClassStats:{read:()=>({level:40,attributes:{dex:18,wis:20},equipmentSets:{}})}};c.window=c;vm.createContext(c);vm.runInContext(fs.readFileSync(path.join(__dirname,'../data/native-combat-rules.js'),'utf8'),c);return c;}
test('敏捷與等級確實進入 AC，精神與裝備確實進入 MR',()=>{const c=fixture();assert.equal(c.NativeCombatRules.armorClass(),0);assert.equal(c.NativeCombatRules.defense().mr,41);c.OwnedInventory.items=[{slot:'helm',enchant:3,item:{kind:'armor',ac:-4,sourceRules:{m_def:10}}}];assert.equal(c.NativeCombatRules.armorClass(),-7);assert.equal(c.NativeCombatRules.defense().mr,51);c.PlayerClassStats.read=()=>({level:40,attributes:{dex:9,wis:9},equipmentSets:{}});assert.equal(c.NativeCombatRules.armorClass(),-2);assert.equal(c.NativeCombatRules.defense().mr,30);});
test('AC 與迴避修正改變怪物命中，固定減傷降低實際傷害',()=>{const r=fixture().NativeCombatRules,npc={level:40,str:30};const d={ac:10,dodge:0,reduction:0,role:'騎士'};const a=r.physical(npc,d,()=>.5);assert(a.hit);assert.equal(r.physical(npc,{...d,ac:-100},()=>.5).hit,false);assert.equal(r.physical(npc,{...d,dodge:30},()=>.5).hit,false);assert.equal(r.physical(npc,{...d,reduction:5},()=>.5).damage,a.damage-5);});
test('MR 與魔法減傷降低怪物魔法傷害',()=>{const r=fixture().NativeCombatRules,n={level:40,str:30},s={spell:{damage:[100,0,0]}};assert.equal(r.magical(n,s,{mr:0,magicReduction:0}).damage,100);assert.equal(r.magical(n,s,{mr:100,magicReduction:0}).damage,50);assert.equal(r.magical(n,s,{mr:100,magicReduction:20}).damage,40);});
test('怪物普攻的等級傷害在半級到等級之間，命中後仍套用減傷',()=>{
 const rules=fixture().NativeCombatRules,defense={ac:10,dodge:0,reduction:0,role:'騎士'};
 const attack=(level,damageRoll,reduction=0)=>{
  const rolls=[.5,damageRoll,.5];
  return rules.physical({level,str:20,dmgup:4},{...defense,reduction},()=>rolls.shift());
 };
 assert.equal(attack(20,0).damage,22);
 assert.equal(attack(80,0).damage,52);
 assert.equal(attack(80,.999).damage,92);
 assert.equal(attack(80,0,5).damage,47);
});
