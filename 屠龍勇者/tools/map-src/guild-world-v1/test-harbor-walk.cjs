// 港村近景通行：純記憶體測試，不接正式遊戲或後端。
const fs=require('fs'),path=require('path'),vm=require('vm'),assert=require('assert/strict');
const script=fs.readFileSync(path.join(__dirname,'harbor-walk-preview.html'),'utf8').match(/<script>([\s\S]*)<\/script>/)[1];
const nodes={};function node(){return {checked:false,value:'1',appendChild(){},addEventListener(){},focus(){},getContext:()=>({}),getBoundingClientRect:()=>({width:1000,height:650})}}
const navigations=[];
const sandbox={console,assert,navigations,URLSearchParams,location:{search:'',assign:s=>navigations.push(s)},Image:function(){},ResizeObserver:class{observe(){}},requestAnimationFrame(){},document:{getElementById:id=>nodes[id]||(nodes[id]=node()),createElement:()=>node(),querySelectorAll:()=>[],addEventListener(){}}};
vm.runInNewContext(script+`
let total=0;
for(const[name,x,y]of destinations){reset();go(x,y);const target=nearest(x,y);assert(target,name);assert(route.length||name==='中央廣場');while(route.length){step();total++;assert(walk(hero.x,hero.y));for(const c of [hero,...team])for(const f of [0,.5,1])for(let a=0;a<16;a++){const angle=a*Math.PI/8,px=(c.px+(c.x-c.px)*f)*CELL+CELL/2,py=(c.py+(c.y-c.py)*f)*CELL+CELL/2;assert(surface(px+Math.cos(angle)*(FOOT_RX+2),py+Math.sin(angle)*(FOOT_RY+2)),name+'角色體積貼牆或穿過邊界');}for(const c of team){assert(walk(c.x,c.y),name+'伙伴超出可走範圍');assert(Math.abs(c.x-c.px)<=1&&Math.abs(c.y-c.py)<=1,name+'伙伴跳格');}}assert.equal(hero.x,target[0]);assert.equal(hero.y,target[1]);}
for(const[dx,dy]of[[1,0],[-1,0],[0,1],[0,-1]]){reset();let hit=false;for(let i=0;i<500;i++){const before=[hero.x,hero.y];manual(dx,dy);step();assert(standAt(hero.x*CELL+CELL/2,hero.y*CELL+CELL/2));if(before[0]===hero.x&&before[1]===hero.y){hit=true;break}}assert(hit,'連續鍵盤移動應被邊界擋住');}
assert.equal(nearest(40,900),null,'海面不可進入');assert.equal(nearest(380,190),null,'公會建築不可穿入');
assert.equal(nearest(1100,650),null,'城牆不可跨越');
reset();go(696,792);document.getElementById('stop').onclick();assert.equal(route.length,0);
let q=[[200,124]],visited=new Set(['200,124']);for(let i=0;i<q.length;i++)for(const p of neighbors(...q[i]))if(!visited.has(p.join(','))){visited.add(p.join(','));q.push(p)}
const count=Array.from(mask).filter(Boolean).length;assert.equal(visited.size,count,'全部可走範圍需連通');
reset();const original=[hero.x,hero.y];go(380,190);assert.equal(route.length,0);assert.deepEqual([hero.x,hero.y],original);assert(message.includes('不能前往'));
let inset=0;for(let i=0;i<mask.length;i++)if(rawMask[i]&&!mask[i])inset++;assert(inset>100);
route=[[0,0]];step();assert.deepEqual([hero.x,hero.y],original);assert.equal(route.length,0);
reset();document.getElementById('travel').onclick();assert.equal(navigations.length,0);reset(true);assert(Math.hypot(hero.x*CELL-1376,hero.y*CELL-872)<10);for(const c of team)assert(walk(c.x,c.y));document.getElementById('travel').onclick();assert.equal(navigations[0],'forest-walk-preview.html');
console.log('PASS：入口附近才可前往古林／返回港村安全落點');
console.log('PASS：四人足底橢圓與額外2px留白／端點及中途不穿牆、點牆不吸附、非法下一步拒絕、安全退縮帶 '+inset+'格');
console.log('PASS：8目的地四人 '+total+' 步／'+count+'可走格全連通、海面／建築／城牆阻擋、停止與8向不切角');
`,sandbox,{timeout:20000});
assert(!/localStorage|fetch\(|WebSocket|XMLHttpRequest/.test(script));
console.log('PASS：不讀寫存檔、不呼叫API');
