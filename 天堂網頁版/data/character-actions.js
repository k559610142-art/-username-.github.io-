// 全套本機人物動作。只有實際存在的圖檔可被引用，不以其他動作冒充缺圖。
const fullCharacterAssets=window.CHARACTER_ACTION_ASSETS;
let characterWeapon='unarmed',characterActionState=null,characterDead=false,characterIdleStarted=movementTime(),characterIdentity='',characterActionRaf=0;
const fullCharacterCache=new Map(),characterShadow=document.createElement('img');
characterShadow.alt='';characterShadow.draggable=false;characterShadow.className='character-shadow';characterImage.className='character-main';characterBody.append(characterShadow);characterFrameCache.clear();
const fullCharacterStyle=document.createElement('style');fullCharacterStyle.textContent='.actor .body img{position:absolute;left:0;top:0}.actor .body .character-shadow{z-index:0;opacity:.65}.actor .body .character-main{z-index:1}.character-action-controls{margin-top:18px}.character-action-controls .slots{grid-template-columns:repeat(2,minmax(0,1fr))}.character-action-controls button{min-height:48px}.character-action-controls [aria-pressed="true"]{border-color:#e4bd64;background:#4d4125}';document.head.append(fullCharacterStyle);
function activeCharacterAvatar(){return characterCatalog.jobs[job]?.[characterGender]||'男騎士'}
function activeCharacterActions(){return fullCharacterAssets.avatars[activeCharacterAvatar()]}
function activeCharacterWeapon(){const data=activeCharacterActions();return data.weapons.includes(characterWeapon)?characterWeapon:'unarmed'}
function activeWeaponWalkAction(){return fullCharacterAssets.weapons[activeCharacterWeapon()].base}
function fullCharacterPath(avatar,heading,clip,index,shadow=false){return 'assets/character-actions/'+avatar+'/'+heading+'/'+clip+(shadow?'_s':'')+'_'+index+'.png'}
function preloadFullCharacterClip(avatar,heading,clip){
 const key=avatar+'/'+heading+'/'+clip;if(fullCharacterCache.has(key))return;
 const data=fullCharacterAssets.avatars[avatar],images=[];
 for(const shadow of [false,true])for(let i=0;i<(shadow?data.shadows:data.directions)[heading][clip];i++){const img=new Image();img.decoding='async';img.src=fullCharacterPath(avatar,heading,clip,i,shadow);images.push(img)}
 fullCharacterCache.set(key,images);while(fullCharacterCache.size>6)fullCharacterCache.delete(fullCharacterCache.keys().next().value);
}
function fullCharacterPose(timeline,elapsed,loop=false){
 const duration=Math.max(1,timeline.durationMs),phase=loop?(Math.max(0,elapsed)%duration)/duration:Math.max(0,Math.min(1-Number.EPSILON,elapsed/duration));
 const tick=phase*timeline.sourceTicks;let total=0;for(const pose of timeline.frames){total+=pose.ticks;if(tick<total)return pose}return timeline.frames[timeline.frames.length-1];
}
function characterMovementBlocked(){return characterDead||!!characterActionState&&movementTime()<characterActionState.until}
function ensureFullCharacterAnimation(){if(!characterActionRaf&&window.gameFlowState==='playing'&&!document.hidden)characterActionRaf=requestAnimationFrame(()=>{characterActionRaf=0;refreshCharacter()})}
refreshCharacter=function(){
 const avatar=activeCharacterAvatar(),data=activeCharacterActions(),weapon=activeCharacterWeapon(),now=movementTime(),identity=avatar+'/'+characterHeading+'/'+weapon;
 if(identity!==characterIdentity){characterIdentity=identity;characterIdleStarted=now;characterActionState=null}
 if(characterActionState&&now>=characterActionState.until&&!characterActionState.hold){characterActionState=null;characterIdleStarted=now}
 let action='idle',pose;
 if(characterActionState&&now>=characterActionState.started){action=characterActionState.action;pose=fullCharacterPose(data.timelines[characterActionState.clip],now-characterActionState.started)}
 else if(now<characterWalkUntil){action='walk';const clip=weapon+'_walk',count=data.directions[characterHeading][clip];pose={clip,frame:walkFrameIndex(now-characterWalkStarted,characterWalkDuration,count,characterWalkProfile||getActiveWalkProfile())}}
 else{const clip=weapon+'_idle';pose=fullCharacterPose(data.timelines[clip],now-characterIdleStarted,true)}
 if(characterDead&&!characterActionState){action='death';const t=data.timelines.death;pose=t.frames[t.frames.length-1]}
 characterLastAction=action;preloadFullCharacterClip(avatar,characterHeading,pose.clip);
 const file=fullCharacterPath(avatar,characterHeading,pose.clip,pose.frame);
 if(file!==characterCurrentPath){characterCurrentPath=file;characterImage.src=file;const hasShadow=pose.frame<data.shadows[characterHeading][pose.clip];characterShadow.hidden=!hasShadow;if(hasShadow)characterShadow.src=fullCharacterPath(avatar,characterHeading,pose.clip,pose.frame,true)}
 const scale=Math.max(.85,Math.min(1.25,zoom)),w=data.size[0]*scale,h=data.size[1]*scale;
 characterBody.style.width=w+'px';characterBody.style.height=h+'px';characterBody.style.left=(-w/2)+'px';characterBody.style.top=(-data.footY*scale)+'px';characterActor.querySelector('small').textContent=window.activeCharacterName||avatar;
 ensureFullCharacterAnimation();
};
function playCharacterAction(action,options={}){
 if(window.gameFlowState!=='playing'||!['idle','attack','skill','hurt','death'].includes(action)||characterDead&&action!=='death')return false;
 if(!options.force&&(movementAnimating()||characterMovementBlocked()))return false;
 stopMovement();const data=activeCharacterActions(),clip=['skill','death'].includes(action)?action:activeCharacterWeapon()+'_'+action;
 if(!data.timelines[clip])return false;
 if(action==='idle'){characterActionState=null;characterWalkUntil=0;characterIdleStarted=movementTime();refreshCharacter();return true}
 const started=options.force&&movementAnimating()?movementTween.started+movementTween.duration:movementTime(),duration=data.timelines[clip].durationMs;
 characterActionState={action,clip,started,hold:!!options.hold,until:options.hold?Infinity:started+duration+(action==='death'?900:0)};
 if(started<=movementTime())characterWalkUntil=0;
 preloadFullCharacterClip(activeCharacterAvatar(),characterHeading,clip);refreshCharacter();return true;
}
function resetCharacterActions(weapon='unarmed'){
 characterWeapon=activeCharacterActions().weapons.includes(weapon)?weapon:'unarmed';characterActionState=null;characterDead=hp<=0;characterWalkUntil=0;characterAttackUntil=0;characterIdleStarted=movementTime();characterIdentity='';refreshCharacter();
}
window.CharacterActions={
 play:playCharacterAction,
 setWeapon(weapon){if(window.gameFlowState!=='playing'||!activeCharacterActions().weapons.includes(weapon)||movementAnimating()||characterMovementBlocked())return false;characterWeapon=weapon;characterActionState=null;characterIdleStarted=movementTime();refreshCharacter();window.GameEntry?.saveActive();return true},
 damage(amount){if(window.gameFlowState!=='playing'||!Number.isFinite(amount)||amount<=0||characterDead)return false;hp=Math.max(0,hp-Math.floor(amount));characterDead=hp===0;playCharacterAction(characterDead?'death':'hurt',{force:true,hold:characterDead});stats();window.GameEntry?.saveActive();return true},
 revive(){if(window.gameFlowState!=='playing'||movementAnimating())return false;if(hp<=0)hp=maxHp;resetCharacterActions(characterWeapon);stats();window.GameEntry?.saveActive();return true},
 reset:resetCharacterActions,
 get weapon(){return activeCharacterWeapon()},get action(){return characterLastAction},get dead(){return characterDead},
 get available(){return {weapons:[...activeCharacterActions().weapons],actions:['idle','walk','attack','skill','hurt','death']}}
};
const fullActionsPanel=panel;
panel=function(type){
 fullActionsPanel(type);if(type!=='bag')return;
 const section=document.createElement('section');section.className='character-action-controls';section.innerHTML='<h3>武器動作外觀</h3><p>切換現有武器姿勢，不改變能力數值。</p><div class="slots"></div><h3>人物動作預覽</h3><p>預覽不扣血；倒地播放後自動恢復站立。</p><div class="slots action-previews"></div>';
 const weaponSlots=section.querySelector('.slots'),previewSlots=section.querySelector('.action-previews');
 for(const weapon of activeCharacterActions().weapons){const b=document.createElement('button');b.textContent=fullCharacterAssets.weapons[weapon].label;b.setAttribute('aria-pressed',String(weapon===activeCharacterWeapon()));b.onclick=()=>{if(!CharacterActions.setWeapon(weapon))return toast('請等目前動作結束後再切換。');closePanel();toast('已切換'+b.textContent+'動作')};weaponSlots.append(b)}
 for(const [action,label] of [['idle','待機'],['attack','攻擊'],['skill','施法'],['hurt','受傷'],['death','倒地'],['revive','恢復站立']]){const b=document.createElement('button');b.textContent=label;b.onclick=()=>{const ok=action==='revive'?CharacterActions.revive():CharacterActions.play(action);if(!ok)return toast('請等目前動作結束；倒地時可選恢復站立。');closePanel()};previewSlots.append(b)}
 document.querySelector('#panelContent').append(section);
};
characterShadow.onerror=()=>{characterShadow.hidden=true};
characterImage.onerror=()=>{document.querySelector('#log').textContent='人物動作圖片載入失敗，請確認 assets/character-actions 資料夾完整。'};
refreshCharacter();
