// 2026-11-19 效能監看小框：使用者 iPhone 在地監掛機仍然 lag，電腦量不出手機的真實情況。
//  設定裡打開「效能監看」後，畫面上方顯示：每秒幾格、最慢一格、卡頓次數，以及各部分每秒花幾毫秒，方便截圖回報。
//  v3：計時器依名字分開（戰鬥節拍、路人維持…）、加計 setTimeout／畫面變化監看（MutationObserver），
//      並記錄「最慢那一格」裡跑了哪些東西、多少時間沒被追蹤到（瀏覽器排版、圖片解碼、記憶體回收等）。
//  沒打開的時候只多一個判斷，不計時。
(()=>{
 const KEY='lineage-perf-hud';
 let on=false;try{on=localStorage.getItem(KEY)==='1'}catch{}
 const now=()=>performance.now();
 const NAMES={monsterFrame:'怪物圖層',frame:'場景',tick:'場景計時',pumpHeldMovement:'按住移動',anon:'其他動畫',
  'IM.draw':'└畫怪物','NW.paintEntity':'└牆壁遮擋','NW.render':'地圖(地監)','RB.render':'地圖(野外)','FP.update':'└路人AI','AI.update':'└怪物AI',
  'T:tick':'戰鬥節拍','T:maintain':'路人維持','T:poisonTick':'中毒計時','T:beat':'背景節拍','T:anon':'其他計時','O:mut':'畫面監看','S:anon':'延遲呼叫',
  'AI.strike':'└怪物出手','CA.damage':'└被打扣血','PP.award':'└擊殺結算','NAV.any':'└找路(打怪)','NAV.path':'└找路','IC.pick':'└找目標'};
 const label=k=>NAMES[k]||k.replace(/^T:/,'計時:').replace(/^S:/,'延遲:');
 const NESTED=k=>/^(IM|NW\.paint|FP|AI|CA|PP|NAV|IC)\./.test(k)||k==='AI.update';
 let stats=new Map(),frames=0,worst=0,janks=0,lastFrame=0,since=now(),frameWork=new Map(),worstWork='';
 const add=(k,d)=>{const e=stats.get(k);if(e){e.ms+=d;if(d>e.max)e.max=d}else stats.set(k,{ms:d,max:d});frameWork.set(k,(frameWork.get(k)||0)+d)};
 const nameOf=(cb,p)=>p+':'+(cb.name&&cb.name!=='bound '?cb.name.replace(/^bound /,''):'anon');
 // requestAnimationFrame（在省電模式包裝之後載入，量到的是各遊戲迴圈本身）
 const raf=window.requestAnimationFrame;
 window.requestAnimationFrame=function(cb){
  if(!on||typeof cb!=='function')return raf.call(window,cb);
  const name=cb.name||'anon';
  return raf.call(window,ts=>{const t=now();try{cb(ts)}finally{add(name,now()-t)}});
 };
 const si=window.setInterval;
 window.setInterval=function(cb,ms,...a){
  if(typeof cb!=='function')return si.call(window,cb,ms,...a);
  const name=nameOf(cb,'T');
  return si.call(window,(...x)=>{if(!on)return cb(...x);const t=now();try{cb(...x)}finally{add(name,now()-t)}},ms,...a);
 };
 const st=window.setTimeout;
 window.setTimeout=function(cb,ms,...a){
  if(typeof cb!=='function'||!on)return st.call(window,cb,ms,...a);
  const name=cb.name?'S:'+cb.name:'S:anon';
  return st.call(window,(...x)=>{const t=now();try{cb(...x)}finally{add(name,now()-t)}},ms,...a);
 };
 const MO=window.MutationObserver;
 if(MO)window.MutationObserver=class extends MO{constructor(cb){super((...x)=>{if(!on)return cb(...x);const t=now();try{cb(...x)}finally{add('O:mut',now()-t)}})}};
 function wrap(obj,key,label){const f=obj?.[key];if(typeof f!=='function'||f.__perf)return;const w=function(...a){if(!on)return f.apply(this,a);const t=now();try{return f.apply(this,a)}finally{add(label,now()-t)}};w.__perf=true;obj[key]=w;}
 function wrapGlobal(name,label){try{const f=window[name];if(typeof f!=='function'||f.__perf)return;const w=function(...a){if(!on)return f.apply(this,a);const t=now();try{return f.apply(this,a)}finally{add(label,now()-t)}};w.__perf=true;window[name]=w;}catch{}}
 function wrapGame(){
  try{if(typeof IslandMonsters!=='undefined')wrap(IslandMonsters,'draw','IM.draw')}catch{}
  wrap(window.NativeWorld,'paintEntity','NW.paintEntity');wrap(window.NativeWorld,'render','NW.render');
  try{if(typeof RegionBackground!=='undefined')wrap(RegionBackground,'render','RB.render')}catch{}
  wrap(window.FakePlayers,'update','FP.update');wrap(window.IslandNpcAi,'update','AI.update');
  try{if(typeof CharacterActions!=='undefined')wrap(CharacterActions,'damage','CA.damage')}catch{}
  try{if(typeof PlayerProgression!=='undefined')wrap(PlayerProgression,'award','PP.award')}catch{}
  wrapGlobal('navigateToAny','NAV.any');wrapGlobal('findWalkingPath','NAV.path');
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
  const t=now();
  if(lastFrame){const gap=t-lastFrame;
   if(gap>worst){worst=gap;const top=[...frameWork].filter(([k])=>!NESTED(k)).sort((a,b)=>b[1]-a[1]),tracked=top.reduce((s,[,v])=>s+v,0);
    const parts=[...frameWork].sort((a,b)=>b[1]-a[1]).slice(0,4).map(([k,v])=>label(k)+v.toFixed(0));
    worstWork=parts.join(' ')+' 未追蹤'+Math.max(0,gap-16-tracked).toFixed(0);}
   if(gap>50)janks++;}
  lastFrame=t;frames++;frameWork=new Map();
  raf.call(window,loop);
 }
 function report(){
  if(!on){box?.remove();box=null;return;}
  const el=ensureBox(),span=(now()-since)/1000||1;
  const rows=[...stats].sort((a,b)=>b[1].ms-a[1].ms).slice(0,9).map(([k,e])=>`${label(k).padEnd(7,'　')} ${(e.ms/span).toFixed(0).padStart(4)}ms/s 最慢${e.max.toFixed(0)}`);
  let size='';try{const v=typeof getRenderedSceneView==='function'?getRenderedSceneView():null;size=v?` 畫面${Math.round(v.width)}x${Math.round(v.height)}`:''}catch{}
  const busy=[...stats].reduce((s,[k,e])=>NESTED(k)?s:s+e.ms,0)/span;
  let mobs='';try{if(typeof IslandMonsters!=='undefined')mobs=' 怪'+IslandMonsters.all.filter(m=>(m.spawn.mapId||0)===(window.activeMapId||0)).length}catch{}
  el.textContent=`FPS ${(frames/span).toFixed(0)}  最慢一格 ${worst.toFixed(0)}ms  卡頓 ${janks}次\n忙碌 ${busy.toFixed(0)}ms/s  DPR ${window.renderDpr||devicePixelRatio}${size}${mobs}\n最慢那格：${worstWork||'-'}\n`+rows.join('\n');
  stats=new Map();frames=0;worst=0;janks=0;worstWork='';since=now();
 }
 function setOn(v){on=!!v;try{localStorage.setItem(KEY,on?'1':'0')}catch{}if(on){wrapGame();lastFrame=0;stats=new Map();frames=0;since=now();raf.call(window,loop);}else report();}
 si.call(window,()=>{if(on){wrapGame();report();}},2000);
 addEventListener('DOMContentLoaded',()=>{
  if(on){wrapGame();raf.call(window,loop);}
  // 舊版設定區的勾選（新版設定畫面 settings-panel.js 另外有開關）
  if(typeof panel==='function'){const prior=panel;panel=function(type){prior(type);if(type!=='settings')return;
   const label=document.createElement('label');label.className='perf-hud-toggle';label.style.cssText='display:flex;gap:8px;align-items:center;padding:8px 0';
   const box=document.createElement('input');box.type='checkbox';box.checked=on;box.onchange=()=>setOn(box.checked);
   label.append(box,document.createTextNode('效能監看（畫面上方顯示每秒格數與各部分耗時，回報 lag 用）'));
   (document.querySelector('.screen-settings')||document.querySelector('#panelContent h2'))?.after(label);};}
 });
 window.PerfHud={setOn,get on(){return on}};
})();
