const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
const read=n=>fs.readFileSync(path.join(__dirname,'../data',n),'utf8');
test('每個職業及屬性使用相同骰池，總和 75 且單項 7～20',()=>{
 const c={};c.window=c;vm.createContext(c);vm.runInContext(read('class-creation-data.js'),c);
 const rules=c.CreationRules;
 const count=120000,byStat=Object.fromEntries(rules.keys.map(k=>[k,0]));
 let seed=42;
 const random=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};
 for(let i=0;i<count;i++){
  const sample=random(),stats=rules.rollStats('黑妖',()=>sample);
  assert(rules.validStats('黑妖',stats));
  if(i<300)for(const role of rules.jobs)assert.deepEqual(rules.rollStats(role,()=>sample),stats);
  for(const key of rules.keys)if(stats[key]===20)byStat[key]++;
 }
 assert(byStat.con>0);
 assert(Math.max(...Object.values(byStat))-Math.min(...Object.values(byStat))<500);
 assert.equal(rules.rollStats('不存在'),null);
 const legacy={...rules.classes.黑妖.base,str:22};
 assert(rules.validStoredStats('黑妖',legacy));
 assert(!rules.validStats('黑妖',legacy));
});
test('創角自動擲骰、可重擲、切職業重新產生，性別切換保留結果，沒有手動加減',()=>{
 function node(tag='div'){const classes=new Set();return {tag,children:[],classList:{toggle:(key,on)=>on?classes.add(key):classes.delete(key)},append(...n){this.children.push(...n);},setAttribute(k,v){this[k]=v;},addEventListener(){}};}
 const nodes=new Map(),created=[];const c={document:{querySelector:s=>{if(!nodes.has(s))nodes.set(s,node());return nodes.get(s);},createElement:node},GameEntry:{create:d=>{created.push(d);return true;}},setEntryScreen(){},updateEntrySelection(){}};c.window=c;vm.createContext(c);vm.runInContext(read('class-creation-data.js')+'\n'+read('character-creation.js'),c);const api=c.CharacterCreation;
 assert.equal(api.roll(),false);api.open(0);assert.equal(api.draft.rolls,1);assert.equal(api.remaining,0);assert(c.CreationRules.validStats('騎士',api.draft.stats));assert.equal(api.adjust,undefined);for(const row of nodes.get('#creation-stats').children)assert.deepEqual(row.children.map(n=>n.tag),['div','output']);
 api.roll();assert.equal(api.draft.rolls,2);api.selectClass('黑妖');assert.equal(api.draft.rolls,1);assert(c.CreationRules.validStats('黑妖',api.draft.stats));const before=JSON.stringify(api.draft.stats);api.setGender(1);assert.equal(JSON.stringify(api.draft.stats),before);assert.equal(api.draft.rolls,1);api.reset();assert.equal(api.draft.rolls,2);nodes.get('#creation-name').value='擲骰測試';assert(api.commit());assert.equal(created[0].name,'擲骰測試');assert.equal(created[0].gender,1);assert(c.CreationRules.validStats('黑妖',created[0].stats));assert.equal(nodes.get('#creation-submit').disabled,false);
});
