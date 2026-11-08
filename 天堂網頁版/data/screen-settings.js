const ScreenSettings=(()=>{
 const key='lineage-screen-size';let mode='auto',locked=false;
 try{const saved=localStorage.getItem(key);if(['auto','landscape'].includes(saved))mode=saved;}catch{}
 const style=document.createElement('style');style.textContent='main.game[data-screen-size=auto]{--stage-height:100dvh;width:100vw!important;height:100dvh!important;aspect-ratio:auto!important}main.game[data-screen-size=landscape]{--stage-height:min(calc(100vw * 9 / 16),100dvh);width:min(100vw,calc(100dvh * 16 / 9))!important;height:var(--stage-height)!important;aspect-ratio:16/9!important}.screen-settings{display:flex;gap:12px;align-items:center;flex-wrap:wrap;padding:12px 0;border-top:1px solid #8b835377;border-bottom:1px solid #8b835377;margin:12px 0}.screen-settings label{display:flex;align-items:center;gap:8px}.screen-settings button{min-height:44px}.screen-settings small{flex-basis:100%;color:#b9c8c8;font-size:12px}';document.head.append(style);
 function apply(value){if(!['auto','landscape'].includes(value))return false;mode=value;game.dataset.screenSize=mode;try{localStorage.setItem(key,mode)}catch{}return true;}
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
  select.setAttribute('aria-label','螢幕尺寸');for(const [value,name]of [['auto','自動尺寸'],['landscape','橫式 16:9']]){const option=document.createElement('option');option.value=value;option.textContent=name;select.append(option)}select.value=mode;select.onchange=()=>apply(select.value);button.type='button';button.dataset.screenFullscreen='';button.onclick=()=>toggle(button,note);refresh(button);label.append(select);section.append(label,button,note);document.querySelector('#panelContent h2')?.after(section);
 };
 document.addEventListener('fullscreenchange',()=>refresh());document.addEventListener('webkitfullscreenchange',()=>refresh());apply(mode);return {apply,get mode(){return mode}};
})();window.ScreenSettings=ScreenSettings;
