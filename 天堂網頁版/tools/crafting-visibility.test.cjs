const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
test('回收魔珠全系列配方從所有製作入口隱藏，其他配方保留',()=>{
 const c={panel(){}};c.window=c;vm.createContext(c);for(const name of ['interface-catalog.js','item-use-data.js','db-native-catalog.js','db-active-settings.js','db-game-rules.js'])vm.runInContext(fs.readFileSync(path.join(__dirname,'../data',name),'utf8'),c,{filename:name});
 const items=new Map(c.INTERFACE_CATALOG.items.map(i=>[i.id,i])),raw=c.DBGameRules.rows('system_item_blend'),hidden=raw.filter(r=>/^回收魔珠/.test(items.get(Number(r.new_item))?.name||'')),shown=c.DBGameRules.craftRecipes();
 assert.equal(hidden.length,102);assert.equal(shown.length,raw.length-hidden.length);assert(shown.every(r=>!/^回收魔珠/.test(items.get(Number(r.new_item))?.name||'')));assert.equal(new Set(hidden.map(r=>items.get(r.new_item).name)).size,4);
 for(const recipe of hidden)assert.equal(c.DBGameRules.craft(recipe.npcid,recipe.id,true),'請靠近對應的製作 NPC。');
 assert(items.has(hidden[0].new_item));
});
