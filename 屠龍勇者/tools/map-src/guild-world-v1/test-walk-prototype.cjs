// 獨立海島原型驗證，不載入正式遊戲／存檔／網路。
const fs=require('fs'),path=require('path'),vm=require('vm'),assert=require('assert/strict');
const html=fs.readFileSync(path.join(__dirname,'walk-prototype.html'),'utf8');
const script=html.match(/<script>([\s\S]*)<\/script>/)[1];
const nodes={};function node(){return {checked:false,style:{},value:'1',disabled:false,appendChild(){},addEventListener(){},focus(){},getContext(){return {}},getBoundingClientRect(){return {width:900,height:650}}}}
const sandbox={console,assert,Image:function(){},ResizeObserver:class{observe(){}},requestAnimationFrame(){},document:{getElementById:id=>nodes[id]||(nodes[id]=node()),createElement:()=>node(),querySelectorAll:()=>[],addEventListener(){}}};
vm.runInNewContext(script+`
let steps=0;
for(const [name,x,y]of sites.slice(0,11)){
 relocate(65,177);go(x,y);assert(route,name);
 while(route.length){step();assert(walk(player.x,player.y));for(const c of companions){assert(walk(c.x,c.y),name+'伙伴穿出可走區');assert(Math.abs(c.x-c.px)+Math.abs(c.y-c.py)<=1,name+'伙伴跨格');}steps++;}
 assert.equal(player.x,x);assert.equal(player.y,y);
}
assert.equal(pathfind(65,177,44,238),null);assert.equal(pathfind(65,177,0,0),null);
relocate(65,177);const before=[player.x,player.y];document.getElementById('boat').onclick();assert.deepEqual([player.x,player.y],before);
relocate(186,214);document.getElementById('boat').onclick();assert.equal(player.x,44);assert.equal(player.y,238);for(const c of companions)assert(walk(c.x,c.y));document.getElementById('boat').onclick();assert.equal(player.x,186);
go(50,70);document.getElementById('stop').onclick();assert.equal(route.length,0);
let count=0;for(let i=0;i<grid.length;i++)if(grid[i]){count++;assert(mainland[i]||islet[i]);}
console.log('PASS：11地標四人通行 '+steps+'步、全部'+count+'可走格連通、海域阻擋、船路往返／遠距拒絕、停止');
`,sandbox,{timeout:20000});
assert(!/localStorage|fetch\(|WebSocket|XMLHttpRequest/.test(script),'原型不可存檔或呼叫後端');
console.log('PASS：原型無存檔／API連線');
