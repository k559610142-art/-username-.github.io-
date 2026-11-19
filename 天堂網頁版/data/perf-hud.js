// 2026-11-19 效能監看小框：使用者 iPhone 在地監掛機仍然 lag，電腦量不出手機的真實情況。
//  設定裡勾「效能監看」後，畫面上方顯示：每秒幾格、最慢一格、卡頓次數，以及各部分每秒花幾毫秒（前 6 名），方便截圖回報。
//  沒勾的時候只多一個判斷，不計時。
(()=>{
 const KEY='lineage-perf-hud';
 let on=false;try{on=localStorage.getItem(KEY)==='1'}catch{}
 const now=()=>performance.now();
 const NAMES={monsterFrame:'怪物圖層',frame:'場景',tick:'場景計時',pumpHeldMovement:'按住移動',anon:'其他動畫',
  'IM.draw':'└畫怪物','NW.paintEntity':'└牆壁遮擋','NW.render':'地圖(地監)','RB.render':'地圖(野外)','FP.update':'└路人AI','AI.update':'└怪物AI','timer':'計時器(戰鬥等)'};
 let stats=new Map(),frames=0,worst=0,janks=0,lastFrame=0,since=now();
 const add=(k,d)=>{const e=stats.get(k);if(e){e.ms+=d;if(d>e.max)e.max=d}else stats.set(k,{ms:d,max:d})};
 // 包住 requestAnimationFrame（在省電模式包裝之後載入，量到的是各遊戲迴圈本身）
 const raf=window.requestAnimationFrame;
 window.requestAnimationFrame=function(cb){
  if(!on||typeof cb!=='function')return raf.call(window,cb);
  const name=cb.name||'anon';
  return raf.call(window,ts=>{const t=now();try{cb(ts)}finally{add(name,now()-t)}});
 };
 // setInterval 的計時器（戰鬥 tick、路人維持等）合併成一項
 const si=window.setInterval;
 window.setInterval=function(cb,ms,...a){
  if(typeof cb!=='function')return si.call(window,cb,ms,...a);
  return si.call(window,(...x)=>{if(!on)return cb(...x);const t=now();try{cb(...x)}finally{add('timer',now()-t)}},ms,...a);
 };
 function wrap(obj,key,label){const f=obj?.[key];if(typeof f!=='function'||f.__perf)return;const w=function(...a){if(!on)return f.apply(this,a);const t=now();try{return f.apply(this,a)}finally{add(label,now()-t)}};w.__perf=true;obj[key]=w;}
 function wrapGame(){
  try{if(typeof IslandMonsters!=='undefined')wrap(IslandMonsters,'draw','IM.draw')}catch{}
  wrap(window.NativeWorld,'paintEntity','NW.paintEntity');wrap(window.NativeWorld,'render','NW.render');
  try{if(typeof RegionBackground!=='undefined')wrap(RegionBackground,'render','RB.render')}catch{}
  wrap(window.FakePlayers,'update','FP.update');wrap(window.IslandNpcAi,'update','AI.update');
 }
 let box=null;
 function ensureBox(){
  if(box)return box;
  box=document.createElement('div');box.className='perf-hud';
  box.style.cssText='position:fixed;left:50%;top:calc(env(safe-area-inset-top,0px) + 4px);transform:translateX(-50%);z-index:99999;pointer-events:none;'+
   'background:#000c;color:#e8f5e8;font:11px/1.35 ui-monospace,Menlo,Consolas,monospace;padding:5px 8px;border:1px solid #6a6;border-radius:6px;white-space:pre;max-width:96vw';
  document.body.append(box);return box;
 }
 function loop(){
  if(!on)return;
  const t=now();if(lastFrame){const gap=t-lastFrame;if(gap>worst)worst=gap;if(gap>50)janks++;}lastFrame=t;frames++;
  raf.call(window,loop);
 }
 function report(){
  if(!on){box?.remove();box=null;return;}
  const el=ensureBox(),span=(now()-since)/1000||1;
  const rows=[...stats].sort((a,b)=>b[1].ms-a[1].ms).slice(0,7).map(([k,e])=>`${(NAMES[k]||k).padEnd(7,'　')} ${(e.ms/span).toFixed(0).padStart(4)}ms/s 最慢${e.max.toFixed(0)}`);
  let mobs='';try{const v=typeof getRenderedSceneView==='function'?getRenderedSceneView():null;mobs=v?` 畫面${Math.round(v.width)}x${Math.round(v.height)}`:''}catch{}
  const busy=[...stats].reduce((s,[k,e])=>k.startsWith('IM.')||k.startsWith('NW.paint')||k.startsWith('FP.')||k.startsWith('AI.')?s:s+e.ms,0)/span;
  el.textContent=`FPS ${(frames/span).toFixed(0)}  最慢一格 ${worst.toFixed(0)}ms  卡頓 ${janks}次\n忙碌 ${busy.toFixed(0)}ms/s  DPR ${window.renderDpr||devicePixelRatio}${mobs}\n`+rows.join('\n');
  stats=new Map();frames=0;worst=0;janks=0;since=now();
 }
 function setOn(v){on=!!v;try{localStorage.setItem(KEY,on?'1':'0')}catch{}if(on){wrapGame();lastFrame=0;stats=new Map();frames=0;since=now();raf.call(window,loop);}else report();}
 si.call(window,()=>{if(on){wrapGame();report();}},2000);
 addEventListener('DOMContentLoaded',()=>{
  if(on){wrapGame();raf.call(window,loop);}
  // 設定面板加「效能監看」勾選
  if(typeof panel==='function'){const prior=panel;panel=function(type){prior(type);if(type!=='settings')return;
   const label=document.createElement('label');label.className='perf-hud-toggle';label.style.cssText='display:flex;gap:8px;align-items:center;padding:8px 0';
   const box=document.createElement('input');box.type='checkbox';box.checked=on;box.onchange=()=>setOn(box.checked);
   label.append(box,document.createTextNode('效能監看（畫面上方顯示每秒格數與各部分耗時，回報 lag 用）'));
   (document.querySelector('.screen-settings')||document.querySelector('#panelContent h2'))?.after(label);};}
 });
 window.PerfHud={setOn,get on(){return on}};
})();
