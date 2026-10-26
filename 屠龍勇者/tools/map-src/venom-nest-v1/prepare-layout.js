const fs=require('fs'),path=require('path');
const layout=JSON.parse(fs.readFileSync(path.join(__dirname,'layout.json'),'utf8'));
function inside(x,y,p){let yes=false;for(let i=0,j=p.length-1;i<p.length;j=i++){const a=p[i],b=p[j];if((a[1]>y)!==(b[1]>y)&&x<(b[0]-a[0])*(y-a[1])/(b[1]-a[1])+a[0])yes=!yes;}return yes;}
function near(x,y,a,b,r){const dx=b[0]-a[0],dy=b[1]-a[1],t=Math.max(0,Math.min(1,((x-a[0])*dx+(y-a[1])*dy)/(dx*dx+dy*dy)));return Math.hypot(x-a[0]-t*dx,y-a[1]-t*dy)<=r;}
const walk=[],cells=new Set();
for(let y=1;y<layout.height-1;y++){let start=-1;for(let x=1;x<layout.width;x++){const px=(x+.5)*32,py=(y+.5)*32;
 const open=x<layout.width-1&&(layout.rooms.some(p=>inside(px,py,p))||layout.paths.some(p=>p.points.some((b,i)=>i&&near(px,py,p.points[i-1],b,p.radius))));
 if(open){cells.add(x+','+y);if(start<0)start=x;}else if(start>=0){walk.push([start,y,x-1,y]);start=-1;}
}}
const seen=new Set([layout.start.join(',')]),queue=[layout.start];
for(let i=0;i<queue.length;i++){const[x,y]=queue[i];for(const[dx,dy]of[[1,0],[-1,0],[0,1],[0,-1]]){const p=[x+dx,y+dy],key=p.join(',');if(cells.has(key)&&!seen.has(key)){seen.add(key);queue.push(p);}}}
if(seen.size!==cells.size)throw Error('Disconnected walk cells: '+seen.size+'/'+cells.size+' missing '+[...cells].filter(k=>!seen.has(k)).slice(0,8));
for(const p of layout.landmarks)if(!seen.has(p.join(',')))throw Error('Unreachable landmark '+p);
for(const p of layout.blockedChecks)if(cells.has(p.join(',')))throw Error('Poison/wall walkable '+p);
fs.writeFileSync(path.join(__dirname,'walk.json'),JSON.stringify(walk));
console.log('PASS: '+cells.size+' connected floor cells, '+walk.length+' row rectangles, all landmarks reachable, poison pools blocked');
