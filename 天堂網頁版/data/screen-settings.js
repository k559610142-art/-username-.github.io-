// 2026-11-18 使用者：視窗設定增加 9:16（直式）畫面
// 2026-11-19 手機本來就直拿時，「直式 9:16」直接用滿整個畫面（瀏覽器工具列會讓可視區比 9:16 矮，硬套 9:16 會變窄、兩側黑邊、按鈕擠在一起）
const ScreenSettings=(()=>{
 const key='lineage-screen-size';let mode='auto',locked=false;
 try{const saved=localStorage.getItem(key);if(['auto','landscape','portrait'].includes(saved))mode=saved;}catch{}
 const style=document.createElement('style');style.textContent='main.game[data-screen-size=auto]{--stage-height:100dvh;width:100vw!important;height:100dvh!important;aspect-ratio:auto!important}main.game[data-screen-size=landscape]{--stage-height:min(calc(100vw * 9 / 16),100dvh);width:min(100vw,calc(100dvh * 16 / 9))!important;height:var(--stage-height)!important;aspect-ratio:16/9!important}main.game[data-screen-size=portrait]{--stage-height:min(100dvh,calc(100vw * 16 / 9));width:min(100vw,calc(100dvh * 9 / 16))!important;height:var(--stage-height)!important;aspect-ratio:9/16!important;margin:0 auto}@media (orientation:portrait){main.game[data-screen-size=portrait]{--stage-height:100dvh;width:100vw!important;height:100dvh!important;aspect-ratio:auto!important}}.screen-settings{display:flex;gap:12px;align-items:center;flex-wrap:wrap;padding:12px 0;border-top:1px solid #8b835377;border-bottom:1px solid #8b835377;margin:12px 0}.screen-settings label{display:flex;align-items:center;gap:8px}.screen-settings button{min-height:44px}.screen-settings small{flex-basis:100%;color:#b9c8c8;font-size:12px}';document.head.append(style);
 function apply(value){if(!['auto','landscape','portrait'].includes(value))return false;mode=value;game.dataset.screenSize=mode;try{localStorage.setItem(key,mode)}catch{}return true;}
 function fullscreen(){return !!(document.fullscreenElement||document.webkitFullscreenElement);}
 async function toggle(button,note){
  try{
   if(fullscreen()){if(document.exitFullscreen)await document.exitFullscreen();else document.webkitExitFullscreen?.();if(locked){screen.orientation?.unlock?.();locked=false;}}
   else{if(document.documentElement.requestFullscreen)await document.documentElement.requestFullscreen({navigationUI:'hide'});else if(document.documentElement.webkitRequestFullscreen)document.documentElement.webkitRequestFullscreen();else{note.textContent='此瀏覽器未提供全螢幕功能；可使用自動尺寸。';return;}
    try{if(screen.orientation?.lock){await screen.orientation.lock('landscape');locked=true;}}catch{}
   }
  }catch{note.textContent='無法進入全螢幕，請使用自動尺寸或瀏覽器全螢幕功能。';}
  refresh(button);
 }
 function refresh(button=document.querySelector('[data-screen-fullscreen]')){if(button){button.textContent=fullscreen()?'離開全螢幕':'全螢幕';button.setAttribute('aria-pressed',String(fullscreen()));}}
 const prior=panel;panel=function(type){prior(type);if(type!=='settings')return;
  const section=uiElement('section','screen-settings'),label=uiElement('label','','螢幕尺寸'),select=document.createElement('select'),button=uiElement('button','','全螢幕'),note=uiElement('small','','手機以橫式操作為主；全螢幕支援時會切換橫向。');
  select.setAttribute('aria-label','螢幕尺寸');for(const [value,name]of [['auto','自動尺寸'],['landscape','橫式 16:9'],['portrait','直式 9:16']]){const option=document.createElement('option');option.value=value;option.textContent=name;select.append(option)}select.value=mode;select.onchange=()=>apply(select.value);button.type='button';button.dataset.screenFullscreen='';button.onclick=()=>toggle(button,note);refresh(button);label.append(select);section.append(label,button,note);document.querySelector('#panelContent h2')?.after(section);
 };
 document.addEventListener('fullscreenchange',()=>refresh());document.addEventListener('webkitfullscreenchange',()=>refresh());apply(mode);return {apply,get mode(){return mode}};
})();window.ScreenSettings=ScreenSettings;
// 2026-11-19 iPhone 加入主畫面（standalone）直式：畫面從螢幕最上緣開始畫，背包／技能被瀏海／動態島蓋住，下面反而空一條黑邊。
//  把遊戲畫面往下移「瀏海高度」；若螢幕下方沒有多出來的空間，就把高度一起扣掉，避免底部被切掉。
(()=>{const probe=document.createElement('div');probe.style.cssText='position:fixed;left:0;top:0;width:0;visibility:hidden;pointer-events:none;padding-top:env(safe-area-inset-top)';
 const st=document.createElement('style');document.head.append(st);
 const fit=()=>{let css='';try{
  const standalone=matchMedia('(display-mode: standalone)').matches||navigator.standalone===true;
  if(standalone&&innerHeight>innerWidth){if(!probe.isConnected)document.body.append(probe);
   const inset=parseFloat(getComputedStyle(probe).paddingTop)||0;
   if(inset>0){const spare=Math.max(0,(screen.height||0)-innerHeight),cut=spare>=inset-2?0:inset;
    css=`main.game{margin-top:${inset}px!important}`+(cut?`main.game[data-screen-size]{--stage-height:calc(100dvh - ${cut}px);height:calc(100dvh - ${cut}px)!important}`:'');}}
 }catch{}if(st.textContent!==css)st.textContent=css;};
 addEventListener('resize',fit);addEventListener('orientationchange',()=>setTimeout(fit,300));
 if(document.body)fit();else addEventListener('DOMContentLoaded',fit);setTimeout(fit,1500);})();
