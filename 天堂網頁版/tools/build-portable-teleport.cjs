const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const root=path.resolve(__dirname,'..'),game={nativeMonsterFiles:new Set()};game.window=game;vm.createContext(game);
for(const file of ['interface-catalog.js','item-use-data.js','db-native-catalog.js','native-dungeon-maps.js','island-monster-data.js','dungeon-monster-data.js','kill-reward-data.js','db-active-settings.js'])vm.runInContext(fs.readFileSync(path.join(root,'data',file),'utf8'),game,{filename:file});
const spawns=vm.runInContext('islandMonsterSpawns',game),rewards=vm.runInContext('killRewardData',game),items=new Map(game.INTERFACE_CATALOG.items.map(i=>[i.id,i])),supported=JSON.parse(fs.readFileSync(path.join(root,'assets/region-background/manifest.json'),'utf8')).maps;
let rows;vm.runInNewContext(fs.readFileSync(path.join(root,'data/database/table-087.js'),'utf8'),{GameDatabase:{register:(name,cols,data)=>rows=data.map(row=>Object.fromEntries(cols.map((c,i)=>[c.name,row[i]])))}});
const settings=vm.runInContext('dbActiveSettings',game),table=name=>settings[name]?.rows.map(r=>Object.fromEntries(settings[name].columns.map((c,i)=>[c.name,r[i]])))||[],removed=new Set([40738,40739,40740]);
// 新遺忘之島在核心 getback_restart 的入口；隨身傳送費用沿用遺忘之島 500,000 天幣。
rows.push({id:170000,name:'新遺忘之島',orderid:'',locx:32655,locy:33015,mapid:1700,itemid:40308,price:500000,min:1,max:200,note:'入口：getback_restart；費用：網頁版設定'});
const routes=[];
for(const r of rows){
 if(!supported[r.mapid]||r.itemid!==40308||!Number.isSafeInteger(r.price)||r.price<0)continue;
 const category=r.orderid==='B'?'village':/島/.test(r.name)?'island':r.mapid===4&&!/地監|洞穴|洞窟|地下|墓穴|之塔|象牙塔/.test(r.name)?'field':'dungeon';
 const near=spawns.filter(s=>(s.mapId||0)===r.mapid&&!s.resident&&s.npc?.kind==='L1Monster'&&(r.mapid!==0&&r.mapid!==4||Math.max(Math.abs(s.point[0]-r.locx),Math.abs(s.point[1]-r.locy))<=55));
 const levels=near.map(s=>s.npc.level).filter(v=>v>0),monsters=[...new Set(near.map(s=>s.npc.name))],drops=new Set();
 for(const s of near)for(const d of rewards.drops[s.npcId]||[])if(d.chance>0&&items.has(d.id)&&d.id!==40308&&!removed.has(d.id))drops.add(items.get(d.id).name);
 if(near.length)for(const drop of [...table('怪物掉落全圖設置').map(d=>({id:d['道具'],chance:d['機率']})),...table('droplist_map').filter(d=>d.mapid===r.mapid).map(d=>({id:d.itemid,chance:d.chance}))])if(drop.chance>0&&drop.id!==40308&&!removed.has(drop.id)&&items.has(drop.id))drops.add(items.get(drop.id).name);
 const monsterDetails=[...new Set(near.map(s=>s.npcId))].map(id=>{const list=near.filter(s=>s.npcId===id),n=list[0].npc;return {id,name:n.name,level:n.level,hp:n.hp,count:list.reduce((sum,s)=>sum+s.count,0),respawn:[Math.min(...list.map(s=>s.respawn[0])),Math.max(...list.map(s=>s.respawn[1]))]};});
 routes.push({id:r.id,name:r.mapid===70?'遺忘之島':r.name,monsterDetails,category,mapId:r.mapid,x:r.locx,y:r.locy,price:r.price,minLevel:r.min||1,maxLevel:r.max||200,levels:levels.length?[Math.min(...levels),Math.max(...levels)]:null,monsters,drops:[...drops].sort()});
}
fs.writeFileSync(path.join(root,'data/portable-teleport-data.js'),'// Generated from npcaction_teleport, live monster spawns and native drop tables.\nwindow.PORTABLE_TELEPORT_ROUTES='+JSON.stringify(routes)+';\n');
console.log(JSON.stringify({routes:routes.length,categories:Object.fromEntries(['village','field','island','dungeon'].map(k=>[k,routes.filter(r=>r.category===k).length]))}));
