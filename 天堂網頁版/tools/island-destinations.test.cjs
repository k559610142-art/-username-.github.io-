const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const root=path.resolve(__dirname,'..'),read=f=>fs.readFileSync(path.join(root,f),'utf8');
function setup(){const c={nativeMonsterFiles:new Set()};c.window=c;vm.createContext(c);for(const f of ['native-dungeon-maps.js','island-monster-data.js','dungeon-monster-data.js','portable-teleport-data.js'])vm.runInContext(read('data/'+f),c,{filename:f});return c;}
test('兩座遺忘之島皆有地圖、分區背景與不同的島嶼目的地',()=>{const c=setup(),manifest=JSON.parse(read('assets/region-background/manifest.json'));for(const [id,name]of [[70,'遺忘之島'],[1700,'新遺忘之島']]){assert(c.NATIVE_DUNGEON_MAPS[id]);assert(manifest.maps[id]);const r=c.PORTABLE_TELEPORT_ROUTES.find(r=>r.mapId===id);assert.equal(r.name,name);assert.equal(r.category,'island');assert(r.monsterDetails.length>0);assert(r.drops.length>0);}});
test('島嶼怪物保留原始數量、座標、能力，全部戰鬥怪物有可見外觀',()=>{const c=setup();let raw;vm.runInNewContext(read('data/database/table-141.js'),{GameDatabase:{register:(n,cols,rows)=>raw=rows.map(r=>Object.fromEntries(cols.map((col,i)=>[col.name,r[i]])))}});const spawns=vm.runInContext('islandMonsterSpawns',c),frames=vm.runInContext('islandMonsterFrames',c);for(const id of [70,1700]){const route=c.PORTABLE_TELEPORT_ROUTES.find(r=>r.mapId===id);for(const s of raw.filter(s=>s.mapid===id&&s.count>0)){const found=spawns.find(p=>p.mapId===id&&p.spawnId===s.id);assert(found,'Missing spawn '+s.id);assert.equal(found.count,s.count);assert.equal(found.point[0],s.locx);assert.equal(found.point[1],s.locy);assert(frames[found.npc.gfx],'Missing visual '+found.npc.name);const detail=route.monsterDetails.find(m=>m.id===found.npcId);assert.equal(detail.hp,found.npc.hp);}}});

test('高塔傳送包含新傲慢，舊傲慢改為真正的1樓且入口可通行；新古魯丁已移除',()=>{
 const c=setup(),manifest=JSON.parse(read('assets/region-background/manifest.json'));
 assert(!c.PORTABLE_TELEPORT_ROUTES.some(r=>r.mapId===807),'新古魯丁地監不在狩獵場'); // 2026-11-22 使用者移除
 for(const [id,name,category]of [[101,'傲慢之塔1樓','tower'],[3301,'新傲慢之塔1樓','tower']]){
  const route=c.PORTABLE_TELEPORT_ROUTES.find(r=>r.name===name);assert(route,name);assert.equal(route.mapId,id);assert.equal(route.category,category);assert(manifest.maps[id]);
  const map=c.NATIVE_DUNGEON_MAPS[id],terrain=[];for(let i=0;i<map.terrain.length;i+=2)for(let j=0;j<map.terrain[i+1];j++)terrain.push(map.terrain[i]);
  const cell=terrain[(route.y-map.startY)*map.width+route.x-map.startX];assert(cell&&!(cell&128));
  const background=JSON.parse(read('assets/region-background/'+id+'/map.json'));for(const page of Object.values(background.pages))for(const file of Object.values(page.variants))assert(fs.existsSync(path.join(root,'assets/region-background',String(id),file)));
 }
 assert(!c.PORTABLE_TELEPORT_ROUTES.some(r=>r.id===368&&r.mapId===110));
 const spawns=vm.runInContext('islandMonsterSpawns',c),frames=vm.runInContext('islandMonsterFrames',c);
 for(const id of [807,3301]){assert(spawns.some(s=>s.mapId===id));for(const s of spawns.filter(s=>s.mapId===id))assert(frames[s.npc.gfx],'Missing visual '+s.npc.name);}
});
