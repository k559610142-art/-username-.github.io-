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
const characterFrameResources=new Map();
let displayedCharacterBody=null,displayedCharacterShadow=null,preloadedWalkSet='',displayedCharacterSignature='';
// These legacy nodes retain diagnostic state. Only decoded cache nodes are displayed.
characterImage.style.display='none';characterShadow.style.display='none';
function characterFrameResource(file){
 if(characterFrameResources.has(file))return characterFrameResources.get(file);
 const img=new Image(),item={img,ready:false,error:false,decoding:false};img.style??={};img.decoding='async';img.draggable=false;characterFrameResources.set(file,item);
 const failed=()=>{item.error=true;if(characterFrameResources.get(file)===item){document.querySelector('#log').textContent='人物圖片載入失敗，暫時保留上一個完整姿勢。';refreshCharacter()}};
 const ready=()=>{if(item.ready)return;item.ready=true;item.error=false;if(characterFrameResources.get(file)===item)refreshCharacter()};
 const loaded=()=>{if(item.ready||item.decoding)return;if(typeof img.decode==='function'){item.decoding=true;img.decode().then(ready,()=>img.complete&&img.naturalWidth?ready():failed())}else ready()};
 img.onload=loaded;img.onerror=failed;img.src=file;
 if(img.complete&&img.naturalWidth){if(typeof img.decode==='function')loaded();else item.ready=true}
 return item;
}
function preloadFullCharacterClip(avatar,heading,clip){
 const key=avatar+'/'+heading+'/'+clip;if(fullCharacterCache.has(key)){const cached=fullCharacterCache.get(key);fullCharacterCache.delete(key);fullCharacterCache.set(key,cached);return;}
 const data=fullCharacterAssets.avatars[avatar],frames=[];
 for(const shadow of [false,true])for(let i=0;i<(shadow?data.shadows:data.directions)[heading][clip];i++){const file=fullCharacterPath(avatar,heading,clip,i,shadow);frames.push({file,item:characterFrameResource(file)})}
 fullCharacterCache.set(key,frames);
 while(fullCharacterCache.size>48){const pinned=avatar+'/',walk='/'+activeCharacterWeapon()+'_walk';const key=[...fullCharacterCache.keys()].find(k=>!(k.startsWith(pinned)&&k.endsWith(walk)));if(!key)break;const old=fullCharacterCache.get(key);fullCharacterCache.delete(key);for(const f of old)if(characterFrameResources.get(f.file)===f.item)characterFrameResources.delete(f.file)}
}
function preloadCharacterWalkSet(avatar,weapon){const key=avatar+'/'+weapon;if(preloadedWalkSet===key)return;preloadedWalkSet=key;for(const heading of Object.keys(fullCharacterAssets.avatars[avatar].directions))preloadFullCharacterClip(avatar,heading,weapon+'_walk')}
function showDecodedCharacterFrame(body,shadow,transform){
 if(displayedCharacterBody!==body.img){displayedCharacterBody?.remove?.();displayedCharacterBody=body.img;displayedCharacterBody.className='character-main';displayedCharacterBody.alt='遊戲人物';characterBody.append(displayedCharacterBody)}
 displayedCharacterBody.style.display='block';displayedCharacterBody.style.transform=transform;
 if(shadow?.ready){if(displayedCharacterShadow!==shadow.img){displayedCharacterShadow?.remove?.();displayedCharacterShadow=shadow.img;displayedCharacterShadow.className='character-shadow';displayedCharacterShadow.alt='';characterBody.append(displayedCharacterShadow)}displayedCharacterShadow.style.display='block';displayedCharacterShadow.style.transform=transform}
 else{displayedCharacterShadow?.remove?.();displayedCharacterShadow=null}
}
function fullCharacterPose(timeline,elapsed,loop=false){
 const duration=Math.max(1,timeline.durationMs),phase=loop?(Math.max(0,elapsed)%duration)/duration:Math.max(0,Math.min(1-Number.EPSILON,elapsed/duration));
 const tick=phase*timeline.sourceTicks;let total=0;for(const pose of timeline.frames){total+=pose.ticks;if(tick<total)return pose}return timeline.frames[timeline.frames.length-1];
}
function characterMovementBlocked(){return characterDead||(typeof IslandNpcAi!=='undefined'&&IslandNpcAi.cursed)||!!characterActionState&&movementTime()<characterActionState.until}
function ensureFullCharacterAnimation(){if(!characterActionRaf&&window.gameFlowState==='playing'&&!document.hidden)characterActionRaf=requestAnimationFrame(frameTime=>{characterActionRaf=0;if(movementAnimating(frameTime)||(typeof navigationPath!=='undefined'&&navigationPath.length))ensureFullCharacterAnimation();else refreshCharacter(frameTime)})}
refreshCharacter=function(frameTime=movementTime()){
 const avatar=activeCharacterAvatar(),data=activeCharacterActions(),weapon=activeCharacterWeapon(),now=frameTime,identity=avatar+'/'+characterHeading+'/'+weapon;
 preloadCharacterWalkSet(avatar,weapon);
 if(identity!==characterIdentity){characterIdentity=identity;characterIdleStarted=now;characterActionState=null}
 if(characterActionState&&now>=characterActionState.until&&!characterActionState.hold){characterActionState=null;characterIdleStarted=now}
 let action='idle',pose;
 if(characterActionState&&now>=characterActionState.started){action=characterActionState.action;pose=fullCharacterPose(data.timelines[characterActionState.clip],now-characterActionState.started)}
 else if(now<characterWalkUntil){action='walk';const clip=weapon+'_walk',count=data.directions[characterHeading][clip];pose={clip,frame:walkFrameIndex(now-characterWalkStarted,characterWalkDuration,count,characterWalkProfile||getActiveWalkProfile())}}
 else{const clip=weapon+'_idle';pose=fullCharacterPose(data.timelines[clip],now-characterIdleStarted,true)}
 if(characterDead&&!characterActionState){action='death';const t=data.timelines.death;pose=t.frames[t.frames.length-1]}
 characterLastAction=action;preloadFullCharacterClip(avatar,characterHeading,pose.clip);
 const file=fullCharacterPath(avatar,characterHeading,pose.clip,pose.frame),hasShadow=pose.frame<data.shadows[characterHeading][pose.clip],body=characterFrameResource(file),shadow=hasShadow?characterFrameResource(fullCharacterPath(avatar,characterHeading,pose.clip,pose.frame,true)):null;
 // Keep the prior bitmap, geometry and correction together while either new layer is decoding.
 // Decode completions refresh the current pose, so obsolete requests can never overwrite it.
 if(!body.ready||shadow&&!shadow.ready&&!shadow.error){ensureFullCharacterAnimation();return}
 const scale=characterRenderScale(),w=data.size[0]*scale,h=data.size[1]*scale,correction=characterWalkCorrection(pose,data,characterHeading),transform='translate('+(correction.x*scale)+'px,'+(correction.y*scale)+'px)';
 const signature=[file,scale,w,h,transform,!!shadow?.ready].join('|');
 if(signature!==displayedCharacterSignature||displayedCharacterBody!==body.img){
  characterBody.style.width=w+'px';characterBody.style.height=h+'px';characterBody.style.left=(-w/2)+'px';characterBody.style.top=(-data.footY*scale)+'px';
  showDecodedCharacterFrame(body,shadow,transform);characterCurrentPath=file;characterShadow.style.transform=transform;displayedCharacterSignature=signature;
 }
 const label=characterActor.querySelector('small'),name=window.activeCharacterName||avatar;if(label.textContent!==name)label.textContent=name;
 ensureFullCharacterAnimation();
};
function playCharacterAction(action,options={}){
 if(window.gameFlowState!=='playing'||!['idle','attack','skill','hurt','death'].includes(action)||characterDead&&action!=='death')return false;
 if(action==='attack'&&window.TransformCards&&!TransformCards.canAttack())return false;
 const interrupt=action==='attack'&&options.interruptMovement;
 if(!options.force&&(characterMovementBlocked()||!interrupt&&movementAnimating()))return false;
 const data=activeCharacterActions(),clip=['skill','death'].includes(action)?action:activeCharacterWeapon()+'_'+action;
 if(!data.timelines[clip])return false;
 stopMovement();
 if(interrupt){
  if(typeof cancelPointerGesture==='function')cancelPointerGesture();
  if(interruptVisualStep())recenter();
 }
 if(action==='idle'){characterActionState=null;characterWalkUntil=0;characterIdleStarted=movementTime();refreshCharacter();return true}
 const started=options.force&&movementAnimating()?movementTween.started+movementTween.duration:movementTime(),duration=((typeof MonsterActions !== 'undefined' && MonsterActions.actionDuration(window.activeTransformCard?.p?.gfx,characterHeading,action,MonsterActions.equippedWeapon()))||data.timelines[clip].durationMs)*(window.NativePotions?.actionMultiplier(action)||1);
 characterActionState={action,clip,started,duration,hold:!!options.hold,until:options.hold?Infinity:started+duration+(action==='death'?900:0)};
 if(action==='attack')CombatSound.playerAttack(characterActionState);
 if(started<=movementTime())characterWalkUntil=0;
 preloadFullCharacterClip(activeCharacterAvatar(),characterHeading,clip);refreshCharacter();return true;
}
function resetCharacterActions(weapon='unarmed'){
 characterWeapon=activeCharacterActions().weapons.includes(weapon)?weapon:'unarmed';characterActionState=null;characterDead=hp<=0;characterWalkUntil=0;characterAttackUntil=0;characterIdleStarted=movementTime();characterIdentity='';refreshCharacter();
}
window.CharacterActions={
 play:playCharacterAction,
 setWeapon(weapon){if(window.gameFlowState!=='playing'||!activeCharacterActions().weapons.includes(weapon)||movementAnimating()||characterMovementBlocked())return false;characterWeapon=weapon;characterActionState=null;characterIdleStarted=movementTime();refreshCharacter();window.GameEntry?.saveActive();return true},
 damage(amount,{animate=true}={}){if(window.gameFlowState!=='playing'||!Number.isFinite(amount)||amount<=0||characterDead)return false;hp=Math.max(0,hp-Math.floor(amount));characterDead=hp===0;CombatSound.playerHit(characterDead);if(characterDead){window.NativePotions?.clearOnDeath();window.TransformCards?.onDeath();}if(animate||characterDead)playCharacterAction(characterDead?'death':'hurt',{force:true,hold:characterDead});stats();window.GameEntry?.saveActive();return true},
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
