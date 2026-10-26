// 隔離真實遊戲程式；不讀寫存檔、不連線。
const fs=require('fs'),path=require('path'),vm=require('vm'),assert=require('assert/strict');
const root=path.resolve(__dirname,'..');
const ctx=vm.createContext({console,assert,Image:function(){},setTimeout:()=>0,clearTimeout(){},setInterval:()=>0,clearInterval(){},
 localStorage:{getItem:()=>null,setItem(){throw Error('禁止寫存檔');},removeItem(){throw Error('禁止刪存檔');}},
 document:{addEventListener(){},getElementById:()=>null,querySelector:()=>null,documentElement:{style:{}}},window:{addEventListener(){},innerWidth:1280,innerHeight:720},navigator:{},fetch(){throw Error('禁止連線');}});
for(const[,file]of fs.readFileSync(path.join(root,'index.html'),'utf8').matchAll(/<script src="(data\/[^"?]+\.js)\?v=/g)){
 if(!['data/main.js','data/pwa.js'].includes(file))vm.runInContext(fs.readFileSync(path.join(root,file),'utf8'),ctx,{filename:file});
}

const layout=JSON.parse(fs.readFileSync(path.join(__dirname,'map-src/venom-nest-v1/layout.json'),'utf8'));
ctx.layout=layout;ctx.expectedWalk=JSON.parse(fs.readFileSync(path.join(__dirname,'map-src/venom-nest-v1/walk.json'),'utf8'));
vm.runInContext(String.raw`
 SIM_MODE=true;createPlayer('毒霧地圖隔離','knight',CLASSES.knight.base);player.lv=45;
 player.loc={type:'zone',id:'venomNest'};buildScene();
 assert.equal(scene.bg.src,'images/maps/rework/venom-nest-v1.jpg');assert.equal(scene.mw,48);assert.equal(scene.mh,32);assert.equal(scene.pl.x,9);assert.equal(scene.pl.y,24);
 assert.equal(JSON.stringify(scene.bg.walk),JSON.stringify(expectedWalk));
 const seen=new Set([scene.pl.x+','+scene.pl.y]),q=[[scene.pl.x,scene.pl.y]];
 for(let i=0;i<q.length;i++){const[x,y]=q[i];for(const[dx,dy]of[[1,0],[-1,0],[0,1],[0,-1]]){const a=x+dx,b=y+dy,k=a+','+b;if(scene.grid[b]&&scene.grid[b][a]===0&&!seen.has(k)){seen.add(k);q.push([a,b])}}}
 let count=0;for(let y=0;y<scene.mh;y++)for(let x=0;x<scene.mw;x++)if(scene.grid[y][x]===0){count++;assert(seen.has(x+','+y),'孤立地面 '+x+','+y)}assert.equal(count,356);
 for(const[x,y]of layout.landmarks){assert.equal(scene.grid[y][x],0);assert(findPath(scene.pl.x,scene.pl.y,x,y,true).length||x===scene.pl.x&&y===scene.pl.y,'區域不可達 '+x+','+y)}
 for(const[x,y]of layout.blockedChecks)assert.notEqual(scene.grid[y][x],0,'毒池或洞壁不可走');
 for(let i=0;i<100;i++){const m=spawnMapMon();if(m){assert(seen.has(m.x+','+m.y));assert(ZONE_BY_ID.venomNest.mons.includes(m.mid));assert(findPath(scene.pl.x,scene.pl.y,m.x,m.y,true).length)}scene.mons=[];}
 assert.equal(ZONE_BY_ID.venomNest.fee,600);assert.equal(ZONE_BY_ID.venomNest.noMap,true);assert.equal(ZONE_BY_ID.venomNest.rare.p,.008);assert.equal(ZONE_BY_ID.venomNest.rare.id,'venomQueen');
 player.loc={type:'zone',id:'ivory'};buildScene();assert.equal(scene.bg.src,'images/maps/rework/arena-ivory.jpg');
 player.loc={type:'zone',id:'tower',floor:1};buildScene();assert.equal(scene.bg.src,'images/maps/rework/arena-tower.jpg');
 console.log('PASS venom map: 356 connected floor cells / six landmarks / poison blocked / 100 reachable spawns / fee and loot unchanged / other cave scenes unchanged');
`,ctx);
for(const p of ['source.png','reference.jpg','PROMPT.txt','walk.json','layout.json','prepare.ps1','prepare-layout.js'])assert(fs.existsSync(path.join(__dirname,'map-src/venom-nest-v1',p)));
assert(fs.existsSync(path.join(root,'images/maps/rework/venom-nest-v1.jpg')));assert(fs.readFileSync(path.join(root,'sw.js'),'utf8').includes('images/maps/rework/venom-nest-v1.jpg'));
