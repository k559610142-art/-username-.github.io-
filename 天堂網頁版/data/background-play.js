// Keep the existing game simulation ticking while the tab is hidden; no elapsed-time catch-up.
(()=>{
 let last=0,lastSave=0;
 function beat(){
  if(!document.hidden||window.gameFlowState!=='playing')return;
  const now=movementTime();if(now-last<80)return;last=now;
  refreshCharacter(now);
  if(navigationPath.length)advanceNavigation(now);
  IslandMonsters.updateBackground(now);IslandCombat.tick();
  if(now-lastSave>=5000){GameEntry.saveActive();lastSave=now;}
 }
 try{const worker=new Worker('data/background-clock.js');worker.onmessage=beat;}catch{}
 setInterval(beat,250);
 document.addEventListener('visibilitychange',()=>{if(!document.hidden&&window.gameFlowState==='playing'){refreshCharacter();schedule();updateTargetControls();}else beat()});
})();
