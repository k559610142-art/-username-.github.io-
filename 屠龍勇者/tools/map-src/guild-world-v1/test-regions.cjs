// 十五個新增地圖：實際資料／正式預覽引擎的隔離通行與往返測試。
const fs=require('fs'),path=require('path'),vm=require('vm'),assert=require('assert/strict');
const root=__dirname,catalog=fs.readFileSync(path.join(root,'region-catalog.js'),'utf8'),html=fs.readFileSync(path.join(root,'region-walk-preview.html'),'utf8'),script=html.match(/<script>([\s\S]*?)<\/script>/)[1],maps=vm.runInNewContext(catalog+';GUILD_MAPS');
const keys=Object.keys(maps);assert.equal(keys.length,15);assert.equal(new Set(Object.values(maps).map(m=>m.art)).size,15);
const counts={};for(const m of Object.values(maps)){counts[m.region]=(counts[m.region]||0)+1;const b=fs.readFileSync(path.join(root,m.art));assert.equal(b.readUInt32BE(16),1536);assert.equal(b.readUInt32BE(20),1024);for(const gate of m.gates){const url=new URL(gate.url,'http://localhost/');if(!url.pathname.endsWith('/region-walk-preview.html'))continue;const target=maps[url.searchParams.get('map')];assert(target);assert(target.entries[url.searchParams.get('entry')]);}}
console.log('地圖分布：'+JSON.stringify(counts));
let stepsTotal=0;
for(const key of keys){
 const nodes={},navigation=[],calls=[];const context=new Proxy({},{get:(_,k)=>(...a)=>calls.push(k)});
 function node(){return {checked:true,value:'1',style:{},appendChild(){},addEventListener(){},focus(){},getContext:()=>context,getBoundingClientRect:()=>({width:1000,height:650})}}
 const box={console,assert,URLSearchParams,devicePixelRatio:1,Image:function(){this.complete=true;this.naturalWidth=1536},ResizeObserver:class{observe(){}},requestAnimationFrame(){},location:{search:'?map='+key,assign:url=>navigation.push(url)},document:{getElementById:id=>nodes[id]||(nodes[id]=node()),createElement:()=>node(),querySelectorAll:()=>[],addEventListener(){}},navigation,calls};
 const output=vm.runInNewContext(catalog+'\n'+script+`
 let steps=0;
 function arrive(x,y){go(x,y);const end=nearest(x,y);assert(end,sceneKey+'目的地不可站立:'+x+','+y);let limit=0;while(route.length){step();steps++;assert(++limit<3000);for(const c of [hero,...team]){assert(walk(c.x,c.y));assert(Math.abs(c.x-c.px)<=1&&Math.abs(c.y-c.py)<=1,'伙伴跳格');for(const f of [0,.5,1])for(let a=0;a<12;a++){const angle=a*Math.PI/6;assert(surface((c.px+(c.x-c.px)*f)*CELL+2+Math.cos(angle)*(FOOT_RX+2),(c.py+(c.y-c.py)*f)*CELL+2+Math.sin(angle)*(FOOT_RY+2)),'足底碰邊界');}}}assert.equal(hero.x,end[0]);assert.equal(hero.y,end[1]);}
 for(const s of destinations)arrive(s[1],s[2]);for(const p of Object.values(mapDef.entries))arrive(...p);
 for(const [x,y]of mapDef.blocked){assert(!surface(x,y),sceneKey+'阻擋點:'+x+','+y);go(x,y);assert(!route.length,'不可點障礙吸附');}
 for(const [x,y]of [[-2,500],[1536,500],[700,-2],[700,1024]])assert(!standAt(x,y));
 for(let i=0;i<mapDef.gates.length;i++){arrive(...mapDef.center);const n=navigation.length;travelGate(i);assert.equal(navigation.length,n,'遠距不可換地圖');arrive(...mapDef.gates[i].at);travelGate(i);assert.equal(navigation.length,n+1);assert.equal(navigation[n],mapDef.gates[i].url);}
 const count=Array.from(mask).filter(Boolean).length;assert.equal(count,todo.length,'全可走格必須連通');resize();draw();assert(calls.includes('drawImage'),'實際繪圖可執行');({steps,count});
 `,box,{timeout:90000});
 stepsTotal+=output.steps;console.log('PASS：'+key+' '+output.count+'連通格／四人'+output.steps+'步／地標、出入口、遠距拒絕與實際繪圖');
}
const seen=new Set(['mine']),q=['mine'];for(let i=0;i<q.length;i++)for(const g of maps[q[i]].gates){const k=new URL(g.url,'http://localhost/').searchParams.get('map');if(k&&!seen.has(k)){seen.add(k);q.push(k)}}assert.equal(seen.size,15,'三地區與地下層全部相連');
assert(!/localStorage|fetch\(|WebSocket|XMLHttpRequest|Date\.now/.test(script));console.log('PASS：15圖網絡全連通，總步數'+stepsTotal+'，無正式存檔／API／獎勵');
