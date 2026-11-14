// Share a 20 FPS animation clock across scene, actors, monsters and visual effects.
// Gameplay timers and elapsed-time movement keep their existing clocks.
window.PowerSaving=(()=>{
 const key='lineage-power-saving-v1',raf=window.requestAnimationFrame.bind(window),cancel=window.cancelAnimationFrame.bind(window),queue=new Map();
 let enabled=false,nextId=-1,timer=null,pending=0,last=-Infinity;
 try{enabled=localStorage.getItem(key)==='20fps';}catch{}
 function schedule(){
  if(!queue.size||timer!==null||pending)return;
  const delay=enabled?Math.max(0,50-(performance.now()-last)):0;
  if(delay>0)timer=setTimeout(()=>{timer=null;pending=raf(flush);},delay);
  else pending=raf(flush);
 }
 function flush(now){
  pending=0;
  if(enabled&&now-last<50-.01){schedule();return;}
  last=now;
  for(const id of [...queue.keys()]){const callback=queue.get(id);queue.delete(id);if(!callback)continue;try{callback(now);}catch(error){setTimeout(()=>{throw error;},0);}}
  schedule();
 }
 window.requestAnimationFrame=function(callback){if(!enabled)return raf(callback);const id=nextId--;queue.set(id,callback);schedule();return id;};
 window.cancelAnimationFrame=function(id){if(id>=0){cancel(id);return;}queue.delete(id);if(!queue.size){if(timer!==null){clearTimeout(timer);timer=null;}if(pending){cancel(pending);pending=0;}}};
 function setEnabled(value){enabled=!!value;try{localStorage.setItem(key,enabled?'20fps':'off');}catch{}if(timer!==null){clearTimeout(timer);timer=null;}if(pending){cancel(pending);pending=0;}last=-Infinity;schedule();}
 return {setEnabled,get enabled(){return enabled;},get fps(){return enabled?20:null;}};
})();
