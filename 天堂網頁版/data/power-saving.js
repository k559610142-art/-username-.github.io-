// Share a 20 FPS animation clock across scene, actors, monsters and visual effects.
// Gameplay timers and elapsed-time movement keep their existing clocks.
window.PowerSaving=(()=>{
 const key='lineage-power-saving-v1',raf=window.requestAnimationFrame.bind(window),cancel=window.cancelAnimationFrame.bind(window),queue=new Map();
 let enabled=false,nextId=-1,timer=null,pending=0,last=-Infinity;
 try{enabled=localStorage.getItem(key)==='20fps';}catch{}
 // 2026-11-19 參考奇岩天堂：開著 AUTO 掛機、30 秒沒碰畫面（觸控／滑鼠／鍵盤）→ 每秒最多畫約 30 格（手機省一半耗電發熱），一碰馬上回到全速。
 //  省電模式（20 格）優先。只影響畫面幀數，戰鬥、走路照實際時間算。
 const IDLE_MS=30000;let lastInput=performance.now();
 for(const t of ['pointerdown','pointermove','touchstart','wheel','keydown'])addEventListener(t,()=>{lastInput=performance.now();},{capture:true,passive:true});
 function cap(){if(enabled)return 50;try{if(typeof IslandCombat!=='undefined'&&IslandCombat.mode==='auto'&&performance.now()-lastInput>IDLE_MS)return 31;}catch{}return 0;}
 // 2026-11-19 省電模式原本先 setTimeout 等 50ms 再等下一次螢幕刷新，常變成 66ms，間隔 50／66 忽快忽慢看起來一頓一頓。
 //  改成每次螢幕刷新都檢查、滿 50ms（容許 4ms 誤差）才畫：60Hz 螢幕固定每 3 次刷新畫一格，節奏穩定。
 function schedule(){
  if(!queue.size||timer!==null||pending)return;
  pending=raf(flush);
 }
 function flush(now){
  pending=0;
  const c=cap();if(c&&now-last<c-4){schedule();return;}
  last=now;
  for(const id of [...queue.keys()]){const callback=queue.get(id);queue.delete(id);if(!callback)continue;try{callback(now);}catch(error){setTimeout(()=>{throw error;},0);}}
  schedule();
 }
 window.requestAnimationFrame=function(callback){if(!cap()&&!queue.size)return raf(callback);const id=nextId--;queue.set(id,callback);schedule();return id;};
 window.cancelAnimationFrame=function(id){if(id>=0){cancel(id);return;}queue.delete(id);if(!queue.size){if(timer!==null){clearTimeout(timer);timer=null;}if(pending){cancel(pending);pending=0;}}};
 function setEnabled(value){enabled=!!value;try{localStorage.setItem(key,enabled?'20fps':'off');}catch{}if(timer!==null){clearTimeout(timer);timer=null;}if(pending){cancel(pending);pending=0;}last=-Infinity;schedule();}
 return {setEnabled,get idleCapped(){return !enabled&&cap()>0;},get enabled(){return enabled;},get fps(){return enabled?20:null;}};
})();
// 2026-11-19 使用者：手機版玩會 lag → 觸控手機的地圖畫布解析度上限 2 倍改 1.5 倍（每層少畫約 44% 像素，畫面只略柔一點）；電腦維持 2 倍
//  各畫布用 window.renderDpr（scene-renderer、island-monsters、native-world、region-background、mainland-occlusion）
(()=>{const calc=()=>{let coarse=false;try{coarse=matchMedia('(pointer:coarse)').matches}catch{}window.renderDpr=Math.min(devicePixelRatio||1,coarse?1.5:2)};calc();addEventListener('resize',calc);})();
