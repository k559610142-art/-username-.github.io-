const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
test('回收魔珠全系列配方從所有製作入口隱藏，其他配方保留',()=>{
 const c={panel(){}};c.window=c;vm.createContext(c);for(const name of ['interface-catalog.js','item-use-data.js','db-native-catalog.js','giran-crafting-data.js','db-active-settings.js','db-game-rules.js'])vm.runInContext(fs.readFileSync(path.join(__dirname,'../data',name),'utf8'),c,{filename:name});
 const items=new Map(c.INTERFACE_CATALOG.items.map(i=>[i.id,i])),raw=c.DBGameRules.rows('system_item_blend'),hidden=raw.filter(r=>/^回收魔珠/.test(items.get(Number(r.new_item))?.name||'')),shown=c.DBGameRules.craftRecipes();
 assert.equal(hidden.length,102);const goldSoul=raw.filter(r=>String(r.materials)==='40308'&&[39287,39288].includes(Number(r.new_item)));assert.equal(goldSoul.length,2);const oldKarif=raw.filter(r=>[576,577,578].includes(r.id));assert.equal(oldKarif.length,3);const extraHidden=raw.filter(r=>![1189,1190,1191].includes(r.id)).filter(r=>/傲慢/.test(items.get(Number(r.new_item))?.name||'')&&/卷|捲|傳送符/.test(items.get(Number(r.new_item))?.name||'')||['box','wuhun','doll'].includes(c.DBGameRules.craftCategory(items.get(Number(r.new_item))))||Number(r.new_item)===84001||Number(r.new_item)===39288||Number(r.addchanceitem)===39288||String(r.materials).split(',').includes('39288')||[60228,39059,44212,21229,350096,350098,350099].includes(Number(r.new_item))||/神聖魔法書|神力禮盒/.test(items.get(Number(r.new_item))?.name||'')||[300000,39263,39264,84077,84080,82202,350080,350130,44213,350061,80034,44149,44148,183002,82214,82215,60230,84002,84003,84004,84005,84006,84007,84008,84009,84010,40018,350094,350020,62015,86002,80326,80328,86200,86001,70508,80331,44150,80027,56148,56147,350070,350071,350072,350073,350074,350075,350076,350077,350078,350079,80320,80321,44143,44144,44145,44146,70048,70058,70068,70078,39166,39167,39168,39169,84078,84079,350057,350058,350059,350060,67024,67025].includes(Number(r.new_item)));assert.equal(shown.filter(r=>r.id>0).length,raw.length-new Set([...hidden,...goldSoul,...oldKarif,...extraHidden]).size);assert(shown.every(r=>c.DBGameRules.craftCategory(items.get(Number(r.new_item)))!=='box'));for(const r of extraHidden){assert(!shown.includes(r));assert.equal(c.DBGameRules.craft(r.npcid,r.id,true),'請靠近對應的製作 NPC。');}assert(!shown.some(r=>r.new_item===56147),'最新截圖指定移除真妲蒂斯魔石');assert(shown.some(r=>r.id===1061&&r.checkLevel===50&&r.checkClass===5));assert(!shown.some(r=>goldSoul.includes(r)));assert(shown.every(r=>!/^回收魔珠/.test(items.get(Number(r.new_item))?.name||'')));assert.equal(new Set(hidden.map(r=>items.get(r.new_item).name)).size,4);
 for(const recipe of hidden)assert.equal(c.DBGameRules.craft(recipe.npcid,recipe.id,true),'請靠近對應的製作 NPC。');
 assert(items.has(hidden[0].new_item));
});

test('神力禮盒依成品編號排除，顯示名稱與資料名稱不同仍不可製作',()=>{const c={panel(){}};c.window=c;vm.createContext(c);for(const name of ['interface-catalog.js','item-use-data.js','db-native-catalog.js','giran-crafting-data.js','db-active-settings.js','db-game-rules.js'])vm.runInContext(fs.readFileSync(path.join(__dirname,'../data',name),'utf8'),c);const recipe=c.DBGameRules.rows('system_item_blend').find(r=>r.id===579);assert.equal(recipe.new_item,80034);assert.match(recipe.note,/神力禮盒/);assert.equal(c.INTERFACE_CATALOG.items.find(i=>i.id===80034).name,'神力藥水禮盒');assert(!c.DBGameRules.craftRecipes().some(r=>Number(r.new_item)===80034));assert.equal(c.DBGameRules.craft(recipe.npcid,recipe.id,true),'請靠近對應的製作 NPC。');});

test('截圖指定15項成品的所有配方均移除，傲慢1樓也停止製作，其他獵影裝備仍保留',()=>{
 const c={panel(){}};c.window=c;vm.createContext(c);for(const name of ['interface-catalog.js','item-use-data.js','db-native-catalog.js','giran-crafting-data.js','db-active-settings.js','db-game-rules.js'])vm.runInContext(fs.readFileSync(path.join(__dirname,'../data',name),'utf8'),c,{filename:name});
 const ids=[44149,44148,183002,82214,82215,60230,84002,84003,84004,84005,84006,84007,84008,84009,84010,40018,350094,350020,62015,86002,80326,80328,86200,86001,70508,80331,44150,80027,56148,56147,350070,350071,350072,350073,350074,350075,350076,350077,350078,350079,80320,80321,44143,44144,44145,44146,70048,70058,70068,70078,39166,39167,39168,39169],raw=c.DBGameRules.rows('system_item_blend'),shown=c.DBGameRules.craftRecipes();
 for(const id of ids){const recipes=raw.filter(r=>Number(r.new_item)===id);assert(recipes.length,'Missing source item '+id);assert(!shown.some(r=>Number(r.new_item)===id));for(const r of recipes)assert.equal(c.DBGameRules.craft(r.npcid,r.id,true),'請靠近對應的製作 NPC。');assert(c.INTERFACE_CATALOG.items.some(i=>i.id===id));}
 assert(!shown.some(r=>r.new_item===84001),'新傲慢1樓卷軸停止製作');
 assert(shown.some(r=>r.new_item===301135),'獵影T恤製作保留');
});

test('最新九張截圖的39項成品全部停止製作，物品資料仍保留',()=>{
 const c={panel(){}};c.window=c;vm.createContext(c);for(const name of ['interface-catalog.js','item-use-data.js','db-native-catalog.js','giran-crafting-data.js','db-active-settings.js','db-game-rules.js'])vm.runInContext(fs.readFileSync(path.join(__dirname,'../data',name),'utf8'),c,{filename:name});
 const ids=[40018,350094,350020,62015,86002,80326,80328,86200,86001,70508,80331,44150,80027,56148,56147,350070,350071,350072,350073,350074,350075,350076,350077,350078,350079,80320,80321,44143,44144,44145,44146,70048,70058,70068,70078,39166,39167,39168,39169],raw=c.DBGameRules.rows('system_item_blend'),shown=c.DBGameRules.craftRecipes();
 assert.equal(ids.length,39);let count=0;for(const id of ids){const recipes=raw.filter(r=>Number(r.new_item)===id);assert(recipes.length,'Missing source '+id);count+=recipes.length;assert(!shown.some(r=>Number(r.new_item)===id));for(const r of recipes)assert.equal(c.DBGameRules.craft(r.npcid,r.id,true),'請靠近對應的製作 NPC。');assert(c.INTERFACE_CATALOG.items.some(i=>i.id===id));}
 assert(shown.some(r=>r.new_item===340001),'六芒星魔法符不是此次指定移除項目');
});

test('水風黑色米索莉箭與四種覺醒龍魂石的同名版本全部停止製作',()=>{
 const c={panel(){}};c.window=c;vm.createContext(c);for(const name of ['interface-catalog.js','item-use-data.js','db-native-catalog.js','giran-crafting-data.js','db-active-settings.js','db-game-rules.js'])vm.runInContext(fs.readFileSync(path.join(__dirname,'../data',name),'utf8'),c,{filename:name});
 const ids=[84078,84079,350057,350058,350059,350060,67024,67025],raw=c.DBGameRules.rows('system_item_blend'),shown=c.DBGameRules.craftRecipes();
 for(const id of ids){const recipes=raw.filter(r=>Number(r.new_item)===id);if(id>=84078&&id<=350060)assert(recipes.length);assert(!shown.some(r=>Number(r.new_item)===id));for(const r of recipes)assert.equal(c.DBGameRules.craft(r.npcid,r.id,true),'請靠近對應的製作 NPC。');assert(c.INTERFACE_CATALOG.items.some(i=>i.id===id));}
});

test('娃娃不再掉落、娃娃、進階武魂與提煉石不可製作，結晶仍掉落',()=>{
 const c={panel(){}};c.window=c;vm.createContext(c);for(const name of ['interface-catalog.js','item-use-data.js','db-native-catalog.js','giran-crafting-data.js','db-active-settings.js','db-game-rules.js'])vm.runInContext(fs.readFileSync(path.join(__dirname,'../data',name),'utf8'),c);
 const items=new Map(c.INTERFACE_CATALOG.items.map(i=>[i.id,i]));for(const map of [0,3303,3304,3306]){c.activeMapId=map;const drops=c.DBGameRules.extraDrops({spawn:{npcId:0}});assert(!drops.some(d=>d.id===39288||/娃娃/.test(items.get(d.id)?.name||'')));assert(drops.some(d=>d.id===39287));}
 for(const r of c.DBGameRules.rows('system_item_blend').filter(r=>![1189,1190,1191].includes(r.id)).filter(r=>/武魂|娃娃/.test(items.get(Number(r.new_item))?.name||''))){assert(!c.DBGameRules.craftRecipes().includes(r));assert.equal(c.DBGameRules.craft(r.npcid,r.id,true),'請靠近對應的製作 NPC。');}
 for(const tab of ["['doll','娃娃']"])assert(!fs.readFileSync(path.join(__dirname,'../data/crafting-window.js'),'utf8').includes(tab));
});

test('傲慢之塔各樓卷軸與混亂異變幻象傳送符皆不可製作',()=>{
 const c={panel(){}};c.window=c;vm.createContext(c);for(const name of ['interface-catalog.js','item-use-data.js','db-native-catalog.js','giran-crafting-data.js','db-active-settings.js','db-game-rules.js'])vm.runInContext(fs.readFileSync(path.join(__dirname,'../data',name),'utf8'),c);
 const items=new Map(c.INTERFACE_CATALOG.items.map(i=>[i.id,i])),raw=c.DBGameRules.rows('system_item_blend'),shown=c.DBGameRules.craftRecipes();
 const targets=raw.filter(r=>/傲慢/.test(items.get(Number(r.new_item))?.name||''));assert(targets.length>50);
 for(const r of targets){assert(!shown.includes(r),r.note);assert.equal(c.DBGameRules.craft(r.npcid,r.id,true),'請靠近對應的製作 NPC。');}
 assert(shown.some(r=>r.new_item===301135),'其他製作仍保留');
});

test('神秘的魔法變身書兩份配方皆停止製作',()=>{
 const c={panel(){}};c.window=c;vm.createContext(c);for(const name of ['interface-catalog.js','item-use-data.js','db-native-catalog.js','giran-crafting-data.js','db-active-settings.js','db-game-rules.js'])vm.runInContext(fs.readFileSync(path.join(__dirname,'../data',name),'utf8'),c);
 const targets=c.DBGameRules.rows('system_item_blend').filter(r=>Number(r.new_item)===44212);assert.equal(targets.length,2);assert(!c.DBGameRules.craftRecipes().some(r=>Number(r.new_item)===44212));for(const r of targets)assert.equal(c.DBGameRules.craft(r.npcid,r.id,true),'請靠近對應的製作 NPC。');
});

test('威望升級令從所有製作入口移除',()=>{
 const c={panel(){}};c.window=c;vm.createContext(c);for(const name of ['interface-catalog.js','item-use-data.js','db-native-catalog.js','giran-crafting-data.js','db-active-settings.js','db-game-rules.js'])vm.runInContext(fs.readFileSync(path.join(__dirname,'../data',name),'utf8'),c);
 const targets=c.DBGameRules.rows('system_item_blend').filter(r=>Number(r.new_item)===39059);assert(targets.length>0);assert(!c.DBGameRules.craftRecipes().some(r=>Number(r.new_item)===39059));for(const r of targets)assert.equal(c.DBGameRules.craft(r.npcid,r.id,true),'請靠近對應的製作 NPC。');
});

test('龍血精華從所有製作入口移除',()=>{
 const c={panel(){}};c.window=c;vm.createContext(c);for(const name of ['interface-catalog.js','item-use-data.js','db-native-catalog.js','giran-crafting-data.js','db-active-settings.js','db-game-rules.js'])vm.runInContext(fs.readFileSync(path.join(__dirname,'../data',name),'utf8'),c);
 const targets=c.DBGameRules.rows('system_item_blend').filter(r=>Number(r.new_item)===60228);assert(targets.length>0);assert(!c.DBGameRules.craftRecipes().some(r=>Number(r.new_item)===60228));for(const r of targets)assert.equal(c.DBGameRules.craft(r.npcid,r.id,true),'請靠近對應的製作 NPC。');
});

test('奇岩原版配方可實際製作，成品與材料皆在目錄',()=>{
 const c={panel(){},hp:100,mp:100,job:'法師',activeCharacterLevel:60,crypto:{randomUUID:()=>'crafted'}};
 c.window=c;vm.createContext(c);
 for(const file of ['interface-catalog','item-use-data','db-native-catalog','giran-crafting-data','db-active-settings','db-game-rules'])vm.runInContext(fs.readFileSync(path.join(__dirname,'../data',file+'.js'),'utf8'),c);
 const recipes=c.DBGameRules.craftRecipes().filter(r=>r.id<0&&[70642,70641,70598].includes(r.npcid));
 assert.equal(recipes.length,11);
 const items=new Map(c.INTERFACE_CATALOG.items.map(i=>[i.id,i])),key=id=>items.get(id).kind+':'+id;
 for(const r of recipes){
  const quantities=r.materials_count.split(',').map(Number);
  let bag=r.materials.split(',').map((id,i)=>({uid:'material-'+i,key:key(+id),count:quantities[i]}));
  c.OwnedInventory={get snapshot(){return structuredClone(bag)},applyChange(next){bag=next;return true;}};
  assert.equal(c.DBGameRules.craft(r.npcid,r.id,true),'製作成功。',r.note);
  assert.equal(bag.length,1);assert.equal(bag[0].key,key(r.new_item));
 }
 for(const [maps,ids,chance] of [[[53,54,55,56],[40455,40456,40457],20000],[[35,36],[272,273,21105,21106],2000]]){
  for(const mapId of maps){
   const drops=c.DBGameRules.extraDrops({spawn:{mapId}});
   for(const id of ids)assert(drops.some(d=>d.id===id&&d.chance===chance&&d.fixedRate));
   for(const id of ids)assert(c.DBGameRules.supplementalDropNames(mapId).includes(items.get(id).name));
  }
  assert(!c.DBGameRules.extraDrops({spawn:{mapId:4}}).some(d=>ids.includes(d.id)));
 }
});
