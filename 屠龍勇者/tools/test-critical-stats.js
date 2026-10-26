// 物品防賣鎖：記憶體角色／存檔，禁止網路與真實 localStorage。
const fs = require('fs'), path = require('path'), vm = require('vm'), assert = require('assert/strict');
const root = path.resolve(__dirname, '..');
const nodes = { qty: { value: '1' } };
const sandbox = { console, assert, nodes, TextEncoder, TextDecoder, btoa, atob, crypto: require("crypto").webcrypto, Image: function () {}, setTimeout: () => 0, clearTimeout() {}, setInterval: () => 0, clearInterval() {},
    localStorage: { getItem: () => null, setItem() { throw Error('禁止寫入真實存檔'); }, removeItem() { throw Error('禁止刪除存檔'); } },
    document: { addEventListener() {}, getElementById: id => nodes[id] || null, querySelector: () => null, documentElement: { style: {} } },
    window: { addEventListener() {}, innerWidth: 400, innerHeight: 800 }, navigator: {}, fetch() { throw Error('禁止連線'); } };
const ctx = vm.createContext(sandbox);
for (const [, file] of fs.readFileSync(path.join(root, 'index.html'), 'utf8').matchAll(/<script src="(data\/[^"?]+\.js)\?v=/g)) {
    if (file === 'data/main.js' || file === 'data/pwa.js') continue;
    vm.runInContext(fs.readFileSync(path.join(root, file), 'utf8'), ctx, { filename: file });
}
vm.runInContext(String.raw`
SIM_MODE=true;createPlayer('雙爆測試','mage',CLASSES.mage.base);refreshUI=()=>{};sfx=()=>{};
const old=calcStats();assert.equal(old.magicCrit,0);assert.equal(old.critDmg,1.5);assert.equal(old.magicCritDmg,1.5);
const weapon=player.equip.weapon;const original=JSON.stringify(weapon);
weapon.af=[{k:'crit',v:.03},{k:'magicCrit',v:.2},{k:'critDmg',v:.1},{k:'magicCritDmg',v:.25}];weapon.q='rare';weapon.il=43;
const st=calcStats();assert(Math.abs(st.crit-old.crit-.03)<1e-9);assert.equal(st.magicCrit,.2);assert.equal(st.critDmg,1.6);assert.equal(st.magicCritDmg,1.75);
assert.equal(affixText(weapon.af[0]),'物爆率 +3%');for(const a of weapon.af)assert(itemDescHtml(weapon).includes(affixText(a)));
assert.equal(AFFIXES.magicCrit.min,.01);assert(Math.abs(AFFIXES.critDmg.max(43)-.093)<1e-9);
for(const k of ['magicCrit','critDmg','magicCritDmg'])assert(affixAllowed(k,ITEMS[weapon.id]));
const loaded=migrateSave({schema:SAVE_SCHEMA,player:JSON.parse(JSON.stringify(player))});assert.equal(loaded.equip.weapon.af.length,4);
slayerMult=()=>1;bossDmgMult=()=>1;rand=(a,b)=>a;chance=p=>p>=1;lifeSteal=()=>{};worldVfxAttack=()=>{};resonanceOnHit=()=>{};bossEnchantHit=()=>{};dollOnHit=()=>{};dollAttackMult=()=>1;
const mon={name:'測試怪',mr:0,hp:10000,maxHp:10000,ac:10};hunt={mon,lastAtkAt:0};
assert.equal(magicDamage([100,100],0,{sp:0,crit:1,critDmg:5,magicCrit:0},0,mon),100);
assert.equal(magicDamage([100,100],0,{sp:0,crit:0,magicCrit:1,magicCritDmg:1.75},0,mon),175);
assert.equal(magicDamage([100,100],0,{sp:0,magicCrit:1},0,mon),150);
// 物理命中強制成功，雙擊關閉，分別驗非爆／物爆，魔爆不干涉物傷。
chance=p=>p>0;const ps={...st,ranged:false,double:0,hit:999,dmgBonus:99,weapon:{dmg:[1,1]},crit:0,magicCrit:1};
physicalAttack(ps,1,{},mon);assert.equal(mon.hp,9900);mon.hp=10000;
physicalAttack({...ps,crit:1,critDmg:1.6},1,{},mon);assert.equal(mon.hp,9840);
useSkillCost=()=>{};worldVfxSkill=()=>{};bossEnchantBegin=()=>{};bossEnchantEnd=()=>{};
const second={...mon,hp:10000};mon.hp=10000;hunt.mobs=[mon,second];
const both={...ps,sp:0,castMs:600,crit:1,critDmg:1.6,magicCrit:1,magicCritDmg:1.75};
castSpell({id:'res_test',name:'魔爆範圍',aoe:true,dmg:[100,100],spK:0},both);
assert.equal(mon.hp,9825);assert.equal(second.hp,9825);
mon.hp=10000;second.hp=10000;
doStrike({id:'res_test',name:'混合攻擊',aoe:true,mult:1,magic:{dmg:[100,100],spK:0}},both);
assert.equal(mon.hp,9665);assert.equal(second.hp,9665);
assert(renderChar().includes('魔爆'));assert(charGearHtml().includes('cv-slot'));
console.log('PASS：雙爆分離、100→175魔傷／100→160物傷、基礎值、裝備加總／詞綴顯示／舊存檔、人物面板。');
`,ctx);
