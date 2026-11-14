// Apply status colours only to the character bitmap, and lawful colours only to nameplates.
window.PlayerAppearance=(()=>{
 const actor=document.querySelector('#actor'),style=document.createElement('style');
 style.textContent=`
 #actor .ovh .nm,#actor>small{color:var(--lawful-name-color,#fff)!important}
 #actor.status-poisoned .character-main,#actor.status-poisoned .transform-morph img:not(.transform-morph-shadow){filter:sepia(1) saturate(5) hue-rotate(65deg) brightness(.9)!important}
 #actor.status-petrified .character-main,#actor.status-petrified .transform-morph img:not(.transform-morph-shadow){filter:grayscale(1) brightness(1.8) contrast(.75)!important}
 `;document.head.append(style);let signature='';
 function lawfulColor(value){const lawful=Math.max(-32768,Math.min(32767,Number(value)||0));if(!lawful)return '#ffffff';const strength=.35+.65*Math.min(1,Math.abs(lawful)/32767);return lawful>0?'rgb('+Math.round(255-190*strength)+','+Math.round(255-115*strength)+',255)':'rgb(255,'+Math.round(255-200*strength)+','+Math.round(255-200*strength)+')';}
 function sync(){
  if(!actor)return;const playing=window.gameFlowState==='playing',alive=playing&&!window.CharacterActions?.dead,state=window.playerItemState||{};
  const poisoned=alive&&!!(window.IslandNpcAi?.poisoned||state.poison||state.poisoned),petrified=alive&&!!window.IslandNpcAi?.cursed,color=lawfulColor(window.activeCharacterLawful);
  const next=[window.activeCharacterId,playing,poisoned,petrified,color].join('|');if(next===signature)return;signature=next;
  actor.classList.toggle('status-poisoned',poisoned);actor.classList.toggle('status-petrified',petrified);actor.style.setProperty('--lawful-name-color',color);
 }
 const base=window.NativePotions?.sync;if(base)window.NativePotions.sync=function(...args){const result=base.apply(this,args);sync();return result;};
 setInterval(sync,100);sync();return {sync,lawfulColor};
})();
