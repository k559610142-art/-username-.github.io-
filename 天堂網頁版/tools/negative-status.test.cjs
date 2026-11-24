const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const read=f=>fs.readFileSync(path.join(__dirname,'../data',f),'utf8');
function fixture(){let clock=1000,roll=0,mr=0,stone=0,blocked=false;const c={activeCharacterId:'hero',activeCharacterLevel:20,gameFlowState:'playing',worldX:11,worldY:10,tile:()=>0,document:{createElement:()=>({style:{}})},game:{append(){}},setInterval(){},movementTime:()=>clock,CharacterActions:{dead:false,damage(){}},NativeCombatRules:{defense:()=>({mr,status:{stone,sustain:stone}}),resolve:()=>({hit:false,damage:0})},ClassBuffs:{blocksNegative:()=>blocked,invisible:()=>false},IslandCombat:{clearShot:()=>true},IslandMonsters:{playEffect(){}},NativePotions:{sync(){}},PlayerAppearance:{sync(){}},Math:Object.create(Math)};c.Math.random=()=>roll;c.window=c;vm.createContext(c);vm.runInContext(read('island-npc-ai.js'),c);const mob={x:10,y:10,homeX:10,homeY:10,hp:100,spawn:{npc:{name:'木乃伊',level:20,hp:100,mp:100,attack:1000,ranged:1,skills:[]}}};return {c,ai:c.IslandNpcAi,mob,skill:{id:33,spell:{duration:20}},set clock(v){clock=v;},set roll(v){roll=v;},set mr(v){mr=v;},set stone(v){stone=v;},set blocked(v){blocked=v;}};}
test('木乃伊先倒數 5 秒再石化 4 秒，重複命中不刷新，解除後免疫 8 秒',()=>{const f=fixture();assert(f.ai.applyNegativeStatus(f.mob,f.skill));assert.equal(f.ai.pendingCurse,true);assert.equal(f.ai.cursed,false);assert.equal(f.ai.negativeEffects[0].remainingMs,5000);f.clock=5000;assert.equal(f.ai.applyNegativeStatus({...f.mob},f.skill),false);assert.equal(f.ai.negativeEffects[0].remainingMs,1000);f.clock=6000;assert.equal(f.ai.cursed,true);assert.equal(f.ai.negativeEffects[0].remainingMs,4000);f.clock=10000;assert.equal(f.ai.cursed,false);assert.equal(f.ai.applyNegativeStatus(f.mob,f.skill),false);f.clock=17999;assert.equal(f.ai.applyNegativeStatus(f.mob,f.skill),false);f.clock=18000;assert(f.ai.applyNegativeStatus(f.mob,f.skill));});
test('MR 與專項抗性降低成功率，石化時長依核心設定，100 抗性免疫，魔法屏障阻擋',()=>{const low=fixture();low.roll=.4;assert(low.ai.applyNegativeStatus(low.mob,low.skill));const high=fixture();high.mr=100;high.roll=.4;assert.equal(high.ai.applyNegativeStatus(high.mob,high.skill),false);high.roll=0;assert(high.ai.applyNegativeStatus(high.mob,high.skill));assert.equal(high.ai.lastControlResult.durationMs,4000);const immune=fixture();immune.stone=100;assert.equal(immune.ai.applyNegativeStatus(immune.mob,immune.skill),false);assert.equal(immune.ai.lastControlResult.chance,0);const barrier=fixture();barrier.blocked=true;assert.equal(barrier.ai.applyNegativeStatus(barrier.mob,barrier.skill),false);assert.equal(barrier.ai.lastControlResult.reason,'barrier');});
test('提前解控也有免控窗口，換角色不沿用狀態與保護',()=>{const f=fixture();f.ai.applyNegativeStatus(f.mob,f.skill);f.clock=2000;f.ai.cure();assert.equal(f.ai.cursed,false);assert.equal(f.ai.applyNegativeStatus(f.mob,f.skill),false);f.c.activeCharacterId='other';assert(f.ai.applyNegativeStatus(f.mob,f.skill));});
test('實際怪物 strike 路徑進入抵抗規則，不直接重設石化計時',()=>{const f=fixture();f.ai.playerActive();f.ai.reset(f.mob);f.mob.alert=true;f.mob.windup={at:1000,range:1,skill:f.skill};f.ai.update(f.mob,1000,[f.mob],[],()=>false);assert(f.ai.pendingCurse);assert(!f.ai.cursed);assert.equal(f.ai.negativeEffects[0].remainingMs,5000);f.clock=4000;f.mob.windup={at:4000,range:1,skill:f.skill};f.ai.update(f.mob,4000,[f.mob],[],()=>false);assert.equal(f.ai.negativeEffects[0].remainingMs,2000);f.clock=6000;assert(f.ai.cursed);});
test('原始石化抗性裝備確實讀入，背包中未穿戴不計算',()=>{const c={};c.window=c;vm.createContext(c);for(const f of ['player-ability-data.js','player-ability-rules.js'])vm.runInContext(read(f),c);const id=Object.keys(c.PLAYER_ABILITY_DATA.armor).find(id=>c.PLAYER_ABILITY_DATA.armor[id].control?.stone>0);assert(id);const item={kind:'armor',id};assert.equal(c.PlayerAbilityRules.statusResistances([{item}]).stone,0);assert.equal(c.PlayerAbilityRules.statusResistances([{slot:'helm',item}]).stone,c.PLAYER_ABILITY_DATA.armor[id].control.stone);});

test('解毒不解除詛咒；聖光解除倒數與完整石化，舊倒數不會再次觸發',()=>{const f=fixture();f.ai.applyNegativeStatus(f.mob,f.skill);f.clock=2000;f.ai.curePoison();assert(f.ai.pendingCurse);assert(f.ai.cureStone());assert(!f.ai.pendingCurse);f.clock=6000;assert(!f.ai.cursed);f.clock=12000;assert(f.ai.applyNegativeStatus(f.mob,f.skill));f.clock=17000;assert(f.ai.cursed);f.ai.curePoison();assert(f.ai.cursed);assert(f.ai.cureStone());assert(!f.ai.cursed);});

test('高等怪物的基礎機率先封頂，提升 MR 仍會確實降低詛咒命中率',()=>{const f=fixture();f.mob.spawn.npc.level=100;f.roll=.99;f.ai.applyNegativeStatus(f.mob,f.skill);assert.equal(f.ai.lastControlResult.chance,80);f.mr=100;f.ai.applyNegativeStatus(f.mob,f.skill);assert.equal(f.ai.lastControlResult.chance,55);});

test('緩速與一段加速雙向抵銷，綠水解除後才能再次加速',()=>{
 const f=fixture(),c=f.c,slow={id:29,spell:{duration:20}};
 const element=()=>({style:{},dataset:{},append(){},replaceChildren(){},setAttribute(){},classList:{toggle(){}}});
 c.document={createElement:element,head:element(),querySelector:selector=>selector==='.hud'?element():null};
 c.ResizeObserver=class{observe(){}};
 c.matchMedia=()=>({matches:false});
 c.ITEM_USE_RULES={definitions:{'etcitem:40013':{handler:'brave.StatusHaste 300 191 255',delayId:2,delayMs:1000}}};
 c.job='騎士';c.hp=100;c.mp=20;
 let bag=[{uid:'green',key:'etcitem:40013',count:3}],canSave=true;
 c.OwnedInventory={get items(){return bag},get snapshot(){return structuredClone(bag)},applyChange(next,e){if(!canSave)return false;bag=next;c.activePotionBuffs=e.potionBuffs;return true;}};
 vm.runInContext(read('native-potions.js'),c);
 c.activePotionBuffs={haste:Date.now()+60000,brave:Date.now()+60000};
 c.buffs=new Map([[43,90000],[52,90000]]);c.SELF={43:{speed:'haste'},52:{speed:'brave'}};
 const source=read('class-buffs.js');
 vm.runInContext(source.slice(source.indexOf(' function clearHaste'),source.indexOf(' function vitals')),c);
 c.ClassBuffs.clearHaste=c.clearHaste;
 assert(f.ai.applyNegativeStatus(f.mob,slow));
 assert.equal(f.ai.slowed,false);
 assert.equal(c.playerMovementModifiers.haste,false);
 assert.equal(c.buffs.has(43),false);
 assert(c.buffs.has(52));
 assert(f.ai.applyNegativeStatus(f.mob,slow));
 canSave=false;assert(!c.NativePotions.use('green'));assert(f.ai.slowed);
 canSave=true;assert(c.NativePotions.use('green'));assert(!f.ai.slowed);assert.equal(c.playerMovementModifiers.haste,false);assert.equal(bag[0].count,2);
 f.clock=2100;assert(c.NativePotions.use('green'));assert(c.playerMovementModifiers.haste);
 f.clock=4100;assert(f.ai.applyNegativeStatus(f.mob,slow));assert(!f.ai.slowed);assert(f.ai.applyNegativeStatus(f.mob,slow));
 assert.equal(c.speed('haste',Date.now()+60000),false);assert(!f.ai.slowed);assert(!c.playerMovementModifiers.haste);
});
