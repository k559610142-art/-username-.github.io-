const mobileStyle=document.querySelector('[data-mobile-style]')||document.querySelector('link[href="mobile.css"]');if(mobileStyle)document.head.append(mobileStyle);
const pointers=new Map();let gesture=null,holdTimer=null,holdRepeat=null;
const hint=document.createElement('div');hint.className='gesture-hint';hint.textContent='鏡頭自動跟隨 · 點地移動 · 按住或拖動控制人物';game.append(hint);setTimeout(()=>hint.style.opacity=0,6500);
tools.hidden=true;
function point(e){const r=canvas.getBoundingClientRect();return {x:e.clientX-r.left,y:e.clientY-r.top}}
function clearHold(){clearTimeout(holdTimer);clearInterval(holdRepeat);holdTimer=null;holdRepeat=null}
function continueHold(){const p=[...pointers.values()][0];if(!p||pointers.size!==1)return;const view=getRenderedSceneView();if(Math.hypot(p.x-view.width/2,p.y-view.height*view.anchorY)<18){cancelNavigation();return}navigateTo(...screenToWorld(p),true)}
function beginHold(){if(pointers.size!==1||gesture?.type==='ignore')return;gesture.type='hold';clearHold();continueHold();holdRepeat=setInterval(continueHold,300)}
canvas.addEventListener('pointerdown',e=>{if(window.gameFlowState!=='playing'||!document.querySelector('#panel').hidden||(e.pointerType==='mouse'&&e.button!==0))return;e.preventDefault();canvas.setPointerCapture(e.pointerId);cancelNavigation();clearHold();pointers.set(e.pointerId,point(e));hint.style.opacity=0;if(pointers.size>1){gesture={type:'ignore'};return}const p=pointers.get(e.pointerId);gesture={type:'tap',point:p};navigateTo(...screenToWorld(p));holdTimer=setTimeout(beginHold,350)});
canvas.addEventListener('pointermove',e=>{if(!pointers.has(e.pointerId))return;e.preventDefault();pointers.set(e.pointerId,point(e));if(pointers.size!==1||gesture?.type==='ignore')return;const p=point(e);if(gesture?.type==='tap'&&Math.hypot(p.x-gesture.point.x,p.y-gesture.point.y)>10)beginHold()});
function endPointer(e){if(!pointers.has(e.pointerId))return;const held=gesture?.type==='hold';clearHold();pointers.delete(e.pointerId);if(held||e.type!=='pointerup')cancelNavigation();gesture=pointers.size?{type:'ignore'}:null}
for(const name of ['pointerup','pointercancel','lostpointercapture'])canvas.addEventListener(name,endPointer);
canvas.addEventListener('wheel',e=>e.preventDefault(),{passive:false});canvas.addEventListener('contextmenu',e=>e.preventDefault());
function cancelPointerGesture(){clearHold();pointers.clear();gesture=null;cancelNavigation()}
addEventListener('blur',cancelPointerGesture);addEventListener('pagehide',cancelPointerGesture);document.addEventListener('visibilitychange',()=>{if(document.hidden)cancelPointerGesture()});
