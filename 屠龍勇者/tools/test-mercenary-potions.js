// 共用玩家藥水存量，隔離角色／網路／存檔。
const fs=require('fs'),path=require('path'),vm=require('vm'),assert=require('assert/strict');
const prefix=fs.readFileSync(path.join(__dirname,'test-mercenary.js'),'utf8').split('ctx.assert = assert;')[0];
const ctx=new Function('require','__dirname',prefix+'\nreturn ctx;')(require,__dirname);ctx.assert=assert;
vm.runInContext(`
SIM_MODE=false;lootMode='legacy';saveGame=()=>{};refreshUI=()=>{};showToast=()=>{};sfx=()=>{};sfxHit=()=>{};
function setup(){createPlayer('共用藥水','knight',CLASSES.knight.base);gameNow=10000;potReadyAt=0;player.hunting=true;player.loc={type:'zone',id:'island'};hunt={state:'search',mobs:[]};scene=null;
 const m=player.mercenary={cls:'bulwark',lv:30,hp:1,mp:100,active:true,dead:false,equip:{},skills:['','','',''],cds:{}};mercState(m).regenAt=gameNow+1000;return m;}
let m=setup(),n=countItem('redPotion'),hp=player.hp;mercTick(100);assert(m.hp>1);assert.equal(countItem('redPotion'),n-1);assert.equal(player.hp,hp);
assert(!mercAutoPotion());gameNow+=POTION_CD_MS-1;assert(!mercAutoPotion());gameNow++;assert(mercAutoPotion());assert.equal(countItem('redPotion'),n-2);
m=setup();const max=mercStats(m).hp;m.hp=max*.5;assert(!mercAutoPotion());m.hp=max*.5-1;assert(mercAutoPotion());
m=setup();player.settings.potionPct=5;m.hp=mercStats(m).hp*.1;assert(!mercAutoPotion());player.settings.potionPct=50;assert(mercAutoPotion());
for(const condition of ['off','inactive','dead','zero','town','stopped','sim','empty']){m=setup();const before=countItem('redPotion');if(condition==='off')player.settings.bar.forEach(x=>{if(ITEMS[x.id]&&ITEMS[x.id].heal)x.a=false;});if(condition==='inactive')m.active=false;if(condition==='dead')m.dead=true;if(condition==='zero')m.hp=0;if(condition==='town')player.loc={type:'town',id:'talking'};if(condition==='stopped')player.hunting=false;if(condition==='sim')SIM_MODE=true;if(condition==='empty')consumeItem('redPotion',before);const expected=countItem('redPotion');assert(!mercAutoPotion(m),condition);assert.equal(countItem('redPotion'),expected);SIM_MODE=false;}
// 藥水種類沿用玩家choosePotion，依傭兵缺血量挑選；不套玩家娃娃增益。
m=setup();addItem('ancientPotion',2);const pick=choosePotion({maxHp:mercStats(m).hp},m.hp),before=countItem(pick);assert.equal(pick,'ancientPotion');assert(mercAutoPotion());assert.equal(countItem(pick),before-1);assert(m.hp>=141&&m.hp<=171);
// 共用最後一瓶不可能重複扣；戰鬥流程先處理玩家，再輪到傭兵。
m=setup();consumeItem('redPotion',countItem('redPotion')-1);player.hp=1;autoSupport(calcStats());assert.equal(countItem('redPotion'),0);assert(!mercAutoPotion());assert.equal(m.hp,1);assert(player.hp>1);
// 各自0.8秒延遲，傭兵喝水不改玩家冷卻；滿血不浪費。
m=setup();potReadyAt=gameNow+400;assert(mercAutoPotion());assert.equal(potReadyAt,gameNow+400);m.hp=mercStats(m).hp;gameNow+=800;assert(!mercAutoPotion());
console.log('PASS：正式mercTick扣玩家藥水、只補傭兵／上限、共享開關／門檻／選藥、各自800ms、最後一瓶、待命／死亡／回村／停掛／SIM／無水隔離。');
`,ctx);
