// 古林場景連通／碰撞／區域入口驗證，禁止正式存檔或後端。
const fs=require('fs'),path=require('path'),vm=require('vm'),assert=require('assert/strict');
const source=fs.readFileSync(path.join(__dirname,'forest-walk-preview.html'),'utf8');
const script=source.match(/<script>([\s\S]*)<\/script>/)[1];
const nodes={};function node(){return {checked:false,value:'1',appendChild(){},addEventListener(){},focus(){},getContext:()=>({}),getBoundingClientRect:()=>({width:1000,height:650})}}
const navigations=[];
const sandbox={console,assert,Image:function(){},ResizeObserver:class{observe(){}},requestAnimationFrame(){},location:{assign:s=>navigations.push(s)},document:{getElementById:id=>nodes[id]||(nodes[id]=node()),createElement:()=>node(),querySelectorAll:()=>[],addEventListener(){}}};
vm.runInNewContext(script+`
let total=0;
for(const[name,x,y]of destinations){reset();go(x,y);const end=nearest(x,y);assert(end,name);while(route.length){step();total++;for(const c of [hero,...team]){assert(walk(c.x,c.y));assert(Math.abs(c.x-c.px)<=1&&Math.abs(c.y-c.py)<=1);for(const f of [0,.5,1])for(let a=0;a<12;a++){const angle=a*Math.PI/6;assert(surface((c.px+(c.x-c.px)*f)*CELL+CELL/2+Math.cos(angle)*(FOOT_RX+2),(c.py+(c.y-c.py)*f)*CELL+CELL/2+Math.sin(angle)*(FOOT_RY+2)),name+'角色碰到阻擋');}}}assert.equal(hero.x,end[0]);assert.equal(hero.y,end[1]);}
for(const [name,x,y] of [['遺跡西柱',183,143],['遺跡南牆',215,239],['遺跡東牆',393,188],['營地帳篷',1260,249],['營地工作桌',1446,256],['東側木箱',1514,240],['營地圍欄',1324,326]]){assert(!surface(x,y),name+'須阻擋');reset();go(x,y);assert.equal(route.length,0,name+'不能吸附到另一側');}
for(const [x,y]of [[-2,520],[1536,350],[650,-2],[650,1024]])assert(!standAt(x,y),'圖外不可站立');
for(const [x,y]of [[1110,391],[1150,493]])assert(!surface(x,y),'橋外河水不可走');
console.log('PASS：七處景物實體阻擋、點障礙不吸附、橋外河水與四邊越界拒絕');
assert.equal(nearest(900,200),null,'河流不可走');assert.equal(nearest(1360,270),null,'營火不可貼上');
reset();go(900,200);assert.equal(route.length,0);assert(message.includes('不能前往'));
document.getElementById('travel').onclick();assert.equal(navigations.length,1);assert.equal(navigations[0],'harbor-walk-preview.html?entry=forest');
go(650,520);while(route.length)step();document.getElementById('travel').onclick();assert.equal(navigations.length,1,'遠距不可切場景');
const q=[[hero.x,hero.y]],visited=new Set([q[0].join(',')]);for(let i=0;i<q.length;i++)for(const p of neighbors(...q[i]))if(!visited.has(p.join(','))){visited.add(p.join(','));q.push(p)}const count=Array.from(mask).filter(Boolean).length;assert.equal(count,visited.size);
console.log('PASS：古林8探索點四人 '+total+' 步、'+count+'可站格連通、足底及中途＋2px留白、河水／營火阻擋、入口切換與遠距拒絕');
`,{...sandbox,navigations},{timeout:30000});
assert(!/localStorage|fetch\(|WebSocket|XMLHttpRequest/.test(script));
console.log('PASS：無正式存檔／API');
