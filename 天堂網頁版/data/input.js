// 長按以畫面時鐘續步，不依賴作業系統鍵盤重複延遲或 32ms 輪詢。
const movementIntervals=new Set(),heldMovement=new Map();let heldMovementFrame=0;
function stopMovement(){
 if(typeof cancelNavigation==='function'&&window.IslandCombat?.mode!=='auto')cancelNavigation();
 for(const id of movementIntervals)clearInterval(id);movementIntervals.clear();
 heldMovement.clear();if(heldMovementFrame)cancelAnimationFrame(heldMovementFrame);heldMovementFrame=0;
}
function pumpHeldMovement(time=movementTime()){
 heldMovementFrame=0;if(!heldMovement.size)return;
 if(!$('#panel').hidden||window.gameFlowState!=='playing'){stopMovement();return;}
 const held=[...heldMovement.values()].at(-1);
 if(movementReady(time))held.continuous=!!move(...held.direction,time,held.continuous);
 heldMovementFrame=requestAnimationFrame(pumpHeldMovement);
}
function holdMovement(key,direction){
 if(heldMovement.has(key))return;heldMovement.set(key,{direction,continuous:false});
 if(!heldMovementFrame)pumpHeldMovement();
}
document.querySelectorAll('[data-move]').forEach(button=>{
 button.addEventListener('pointerdown',event=>{
  if(!$('#panel').hidden||(event.pointerType==='mouse'&&event.button!==0))return;
  event.preventDefault();button.setPointerCapture(event.pointerId);
  holdMovement('pointer:'+event.pointerId,button.dataset.move.split(',').map(Number));
 });
 for(const type of ['pointerup','pointercancel','lostpointercapture'])button.addEventListener(type,event=>heldMovement.delete('pointer:'+event.pointerId));
});
addEventListener('blur',stopMovement);addEventListener('pagehide',stopMovement);
document.addEventListener('visibilitychange',()=>{if(document.hidden)stopMovement();});
addEventListener('keydown',event=>{
 if(!$('#panel').hidden||event.target.closest?.('input,select,textarea,[contenteditable=true]'))return;
 const direction={ArrowUp:[0,-1],ArrowDown:[0,1],ArrowLeft:[-1,0],ArrowRight:[1,0]}[event.key];
 if(direction){event.preventDefault();holdMovement(event.key,direction);}
});
addEventListener('keyup',event=>heldMovement.delete(event.key));
