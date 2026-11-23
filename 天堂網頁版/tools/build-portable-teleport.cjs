const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const root=path.resolve(__dirname,'..'),game={nativeMonsterFiles:new Set()};game.window=game;vm.createContext(game);
for(const file of ['interface-catalog.js','item-use-data.js','db-native-catalog.js','native-dungeon-maps.js','island-monster-data.js','dungeon-monster-data.js','kill-reward-data.js','db-active-settings.js'])vm.runInContext(fs.readFileSync(path.join(root,'data',file),'utf8'),game,{filename:file});
const spawns=vm.runInContext('islandMonsterSpawns',game),rewards=vm.runInContext('killRewardData',game),items=new Map(game.INTERFACE_CATALOG.items.map(i=>[i.id,i])),supported=JSON.parse(fs.readFileSync(path.join(root,'assets/region-background/manifest.json'),'utf8')).maps;
const dbTable=file=>{let rows;vm.runInNewContext(fs.readFileSync(path.join(root,'data/database',file),'utf8'),{GameDatabase:{register:(name,cols,data)=>rows=data.map(row=>Object.fromEntries(cols.map((c,i)=>[c.name,row[i]])))}});return rows;};
const rows=dbTable('table-087.js'),dungeonRows=dbTable('table-054.js');
const settings=vm.runInContext('dbActiveSettings',game),table=name=>settings[name]?.rows.map(r=>Object.fromEntries(settings[name].columns.map((c,i)=>[c.name,r[i]])))||[],removed=new Set([40738,40739,40740]);
// 新遺忘之島在核心 getback_restart 的入口；隨身傳送費用沿用遺忘之島 500,000 天幣。
rows.push({id:170000,name:'新遺忘之島',orderid:'',locx:32655,locy:33015,mapid:1700,itemid:40308,price:500000,min:1,max:200,note:'入口：getback_restart；費用：網頁版設定'});
// User travel entries use the native first-floor map and validated native entrance.
const tower=rows.find(r=>r.id===368),oldTower=game.NATIVE_DUNGEON_MAPS[110];
if(tower&&oldTower)Object.assign(tower,{name:'傲慢之塔1樓（10F）',mapid:110,locx:oldTower.spawn.x,locy:oldTower.spawn.y});
for(const [id,mapid,name,price]of [[330100,3301,'新傲慢之塔1樓',50000]]){const map=game.NATIVE_DUNGEON_MAPS[mapid];if(map)rows.push({id,mapid,name,locx:map.spawn.x,locy:map.spawn.y,itemid:40308,price,min:1,max:200,orderid:''});}

// 2026-11-22 使用者：所有狩獵地圖都用狩獵場傳送進入（不另做樓梯）；沒怪物的地圖不做傳送點；傲慢之塔只到 1 樓（高樓層用卷軸）。
// 分類：村莊／外圍／島嶼／高塔／地監，島嶼、高塔、地監再依 group 分組，點進去才列出樓層。
const HUNT_EXTRA={ // 原本 npcaction_teleport 沒有的狩獵地圖：[價格]，落點用 DB dungeon 表走進這張圖的位置
 14:3000,22:1500,37:7000,51:9100,541:9100,542:9100,543:10100,
 450:50000,451:50000,453:50000,454:50000,455:50000,456:50000,460:50000,462:50000,463:50000,464:50000,465:50000,466:50000,
 470:50000,472:50000,473:50000,474:50000,475:50000,476:50000,477:50000,478:50000,490:50000,491:50000,492:50000,493:50000,494:50000,496:50000,
 530:50000,531:50000,532:50000,533:50000,534:50000
};
HUNT_EXTRA[304]=5000; // 沉默洞穴原本只在村莊分頁，地監分頁也要有
const hasRow=new Set(rows.filter(r=>r.itemid===40308&&r.orderid!=='B').map(r=>r.mapid));
for(const [mapid,price]of Object.entries(HUNT_EXTRA).map(([m,p])=>[+m,p])){
 if(hasRow.has(mapid))continue;const map=game.NATIVE_DUNGEON_MAPS[mapid];if(!map)continue;
 const entry=dungeonRows.find(d=>+d.new_mapid===mapid&&+d.src_mapid!==mapid)||null;
 rows.push({id:900000+mapid,mapid,name:map.name,locx:entry?+entry.new_x:map.spawn.x,locy:entry?+entry.new_y:map.spawn.y,itemid:40308,price,min:1,max:200,orderid:''});
}
const range=(a,b)=>Array.from({length:b-a+1},(_,i)=>a+i);
const GROUPS=[ // [分類, 分組名稱, 地圖編號]
 ['island','霧月島',[]],['island','遺忘之島',[70]],['island','新遺忘之島',[1700]],
 ['tower','傲慢之塔',[110]],['tower','新傲慢之塔',[3301]],['tower','象牙塔',range(75,82)],
 ['dungeon','冒險洞窟',[1,2,14]],['dungeon','古魯丁地監',range(7,13)],['dungeon','眠龍洞穴',[19,20,21]],
 ['dungeon','風木城地監',[23,24]],['dungeon','騎士洞穴',range(25,28)],['dungeon','龍之谷地監',[30,31,32,33,35,36,37]],['dungeon','巨蟻洞穴',[...range(43,51),541,542,543]],
 ['dungeon','奇岩地監',range(53,56)],['dungeon','海音地監',[59,60,61,63]],['dungeon','傑瑞德的試煉地監',[22]],['dungeon','沉默洞穴',[304]],
 ['dungeon','拉斯塔巴德',[307,308,309,...range(450,496),...range(530,536)]],['dungeon','歐姆地監',[310]],['dungeon','狄亞得要塞',[320]],
 ['dungeon','大洞穴',[400,401]],['dungeon','魔族神殿',[410]],['dungeon','地底湖',[420]],['dungeon','精靈墓穴',[430]]
];
const groupOf=new Map();for(const [category,group,maps]of GROUPS)for(const m of maps)groupOf.set(m,{category,group});
const routes=[];
for(const r of rows){
 if(!supported[r.mapid]||r.itemid!==40308||!Number.isSafeInteger(r.price)||r.price<0)continue;
 if(r.mapid>=101&&r.mapid<=200&&r.id!==368)continue; // 傲慢之塔 2～10 樓只能用卷軸上去
 if(r.mapid===807)continue; // 2026-11-22 使用者：狩獵場移除新古魯丁地監
 let category=r.orderid==='B'?'village':/島/.test(r.name)?'island':r.mapid===4&&!/地監|洞穴|洞窟|地下|墓穴|之塔|象牙塔/.test(r.name)?'field':'dungeon',group=null;
 const g=r.mapid!==4&&r.mapid!==0&&category!=='village'?groupOf.get(r.mapid):null;if(g){category=g.category;group=g.group;}
 if(r.id===110){category='island';group='霧月島';}
 const near=spawns.filter(s=>(s.mapId||0)===r.mapid&&!s.resident&&s.npc?.kind==='L1Monster'&&(r.mapid!==0&&r.mapid!==4||Math.max(Math.abs(s.point[0]-r.locx),Math.abs(s.point[1]-r.locy))<=55));
 if(!near.length&&category!=='village'&&category!=='field')continue; // 沒怪物的地圖不做傳送點
 const levels=near.map(s=>s.npc.level).filter(v=>v>0),monsters=[...new Set(near.map(s=>s.npc.name))],drops=new Set();
 for(const s of near)for(const d of rewards.drops[s.npcId]||[])if(d.chance>0&&items.has(d.id)&&d.id!==40308&&!removed.has(d.id))drops.add(items.get(d.id).name);
 if(near.length)for(const drop of [...table('怪物掉落全圖設置').map(d=>({id:d['道具'],chance:d['機率']})),...table('droplist_map').filter(d=>d.mapid===r.mapid).map(d=>({id:d.itemid,chance:d.chance}))])if(drop.chance>0&&drop.id!==40308&&!removed.has(drop.id)&&items.has(drop.id))drops.add(items.get(drop.id).name);
 const monsterDetails=[...new Set(near.map(s=>s.npcId))].map(id=>{const list=near.filter(s=>s.npcId===id),n=list[0].npc;return {id,name:n.name,level:n.level,hp:n.hp,count:list.reduce((sum,s)=>sum+s.count,0),respawn:[Math.min(...list.map(s=>s.respawn[0])),Math.max(...list.map(s=>s.respawn[1]))]};});
 const name=r.mapid===70?'遺忘之島':String(r.name).replace(/^\[舊版\]\s*古魯丁地下監獄\s*/,'古魯丁地監');
 routes.push({id:r.id,name,group,monsterDetails,category,mapId:r.mapid,x:r.locx,y:r.locy,price:r.price,minLevel:r.min||1,maxLevel:r.max||200,levels:levels.length?[Math.min(...levels),Math.max(...levels)]:null,monsters,drops:[...drops].sort()});
}
// 同一分組依 GROUPS 的地圖順序排（樓層由低到高），分組順序照 GROUPS
const order=new Map();GROUPS.forEach(([,group,maps],gi)=>maps.forEach((m,mi)=>order.set(group+':'+m,gi*1000+mi)));
const sortKey=new Map(routes.map((r,i)=>[r,r.group?order.get(r.group+':'+r.mapId)??0:100000+i]));
routes.sort((a,b)=>sortKey.get(a)-sortKey.get(b)||a.id-b.id);
fs.writeFileSync(path.join(root,'data/portable-teleport-data.js'),'// Generated by tools/build-portable-teleport.cjs from npcaction_teleport, live monster spawns and native drop tables.\nwindow.PORTABLE_TELEPORT_ROUTES='+JSON.stringify(routes)+';\n');
console.log(JSON.stringify({routes:routes.length,categories:Object.fromEntries(['village','field','island','tower','dungeon'].map(k=>[k,routes.filter(r=>r.category===k).length])),groups:[...new Set(routes.filter(r=>r.group).map(r=>r.group+'×'+routes.filter(x=>x.group===r.group).length))]}));
