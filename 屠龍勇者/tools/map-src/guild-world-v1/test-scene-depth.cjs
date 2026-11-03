// 原始背景局部遮擋：四個實際預覽的前後邊界、裁切、缺圖降級與同步測試。
const fs=require('fs'),vm=require('vm'),assert=require('assert/strict'),path=require('path');
let forestDefinition;
for(const file of ['harbor-walk-preview.html','forest-walk-preview.html','forest-mission-preview.html','forest-encounter-preview.html']){
 const src=fs.readFileSync(path.join(__dirname,file),'utf8'),code=src.match(/\/\/ 原創背景的局部景物重繪[\s\S]*?(?=function drawActor)/)[0];
 const calls=[],ctx=new Proxy({},{get:(_,key)=>(...args)=>calls.push([key,...args])});
 const setting={checked:true},box={assert,console,g:ctx,art:{complete:true,naturalWidth:1536},document:{getElementById:()=>setting},screen:(x,y)=>({x,y}),zoom:1};
 vm.runInNewContext(code+`
 assert(SCENE_OCCLUDERS.length>=4);
 for(const p of SCENE_OCCLUDERS){
  assert(p.poly.every(v=>v.every(Number.isFinite)));const x=(p.base[0]+p.base[2])/2,base=(p.base[1]+p.base[3])/2;
  assert(!sceneryCovers(p,x,base+1),p.id+'前方角色不可被蓋住');
  assert(!sceneryCovers(p,-1000,base-10),p.id+'遠處角色不可觸發');
  const top=Math.min(...p.poly.map(v=>v[1]));assert(sceneryCovers(p,x,Math.min(base-1,top+20)),p.id+'後方角色應被遮擋');
  drawSceneryOverActor(x,Math.min(base-1,top+20));
 }
 assert(calls.some(c=>c[0]==='rect'),'裁切限於角色區域');assert(calls.some(c=>c[0]==='drawImage'),'實際重繪原創圖');
 assert.equal(calls.filter(c=>c[0]==='save').length,calls.filter(c=>c[0]==='restore').length,'裁切狀態須恢復');
 calls.length=0;setting.checked=false;drawSceneryOverActor(1240,620);assert.equal(calls.length,0);
 setting.checked=true;art.complete=false;drawSceneryOverActor(1240,620);assert.equal(calls.length,0,'缺圖不重繪');
 `,{...box,calls,setting},{timeout:1000});
 if(file.startsWith('forest')){const def=code.match(/const SCENE_OCCLUDERS=(.*);/)[1];if(forestDefinition)assert.equal(def,forestDefinition,'三個古林頁遮擋一致');forestDefinition=def;}
 assert(src.includes('drawSceneryOverActor(x,y);'),'人物繪圖已接入');
 if(file.includes('encounter'))assert(src.includes('drawSceneryOverActor(e.x*CELL+2,e.y*CELL+2)'),'敵人也套用景物遮擋');
 console.log('PASS：'+file+' 景物前後判斷／局部裁切／開關／缺圖降級');
}
