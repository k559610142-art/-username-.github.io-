// 四職業、男女、八方向：來源為使用者本機已轉檔的 classanim，並非重新生成。
const characterCatalog=window.CHARACTER_ASSETS,characterActor=document.querySelector('#actor'),characterBody=characterActor.querySelector('.body');
let characterGender=0,characterHeading='N',characterWalkUntil=0,characterAttackUntil=0,characterTick=0,characterCurrentPath='',characterWalkStarted=0,characterWalkDuration=0,characterWalkProfile=null,characterLastAction='idle';
const characterFrameCache=new Map();
function preloadCharacterDirection(avatar,heading){const key=avatar+'/'+heading;if(characterFrameCache.has(key))return;const frames=[];for(const action of ['idle','walk','attack'])for(const path of characterCatalog[avatar][heading][action]){const img=new Image();img.decoding='async';img.src=path;frames.push(img)}characterFrameCache.set(key,frames);while(characterFrameCache.size>4)characterFrameCache.delete(characterFrameCache.keys().next().value)}
const characterImage=document.createElement('img');characterImage.alt='遊戲人物';characterImage.draggable=false;characterBody.append(characterImage);
const characterStyle=document.createElement('style');characterStyle.textContent='.actor{width:1px!important;height:1px!important;margin:0!important;transform:none!important;pointer-events:none}.actor .body{position:absolute!important;margin:0!important;padding:0!important;border:0!important;border-radius:0!important;background:none!important;box-shadow:none!important;transform:none!important;animation:none!important}.actor .body:before,.actor .body:after{display:none!important}.actor .body img{display:block;width:100%;height:100%;max-width:none;object-fit:contain;image-rendering:auto}.actor>small{position:absolute;left:0;top:-78px;transform:translateX(-50%);white-space:nowrap}.character-gender{min-height:44px!important;margin-top:10px}';document.head.append(characterStyle);
function refreshCharacter(){
  const avatar=characterCatalog.jobs[job]?.[characterGender]||'男騎士';
  preloadCharacterDirection(avatar,characterHeading);
  const now=movementTime(),action=now<characterAttackUntil?'attack':now<characterWalkUntil?'walk':'idle';
  if(action!==characterLastAction){if(action==='idle')characterTick=0;characterLastAction=action}
  const frames=characterCatalog[avatar][characterHeading][action];
  const index=action==='walk'?walkFrameIndex(now-characterWalkStarted,characterWalkDuration,frames.length,characterWalkProfile||getActiveWalkProfile()):characterTick%frames.length;
  const file=frames[Math.max(0,index)];
  if(file!==characterCurrentPath){characterCurrentPath=file;characterImage.src=file}
  const scale=Math.max(.85,Math.min(1.25,zoom)),w=characterCatalog[avatar].size[0]*scale,h=characterCatalog[avatar].size[1]*scale;
  characterBody.style.width=w+'px';characterBody.style.height=h+'px';characterBody.style.left=(-w/2)+'px';characterBody.style.top=(-characterCatalog[avatar].footY*scale)+'px';
  characterActor.querySelector('small').textContent=window.activeCharacterName||avatar;
}

function onCharacterStep(dx,dy){const headings={'1,-1':'N','1,0':'NE','1,1':'E','0,1':'SE','-1,1':'S','-1,0':'SW','-1,-1':'W','0,-1':'NW'};characterHeading=headings[dx+','+dy]||'S';characterWalkStarted=movementTime();characterWalkDuration=movementTween?.duration||MovementConfig.stepMs;characterWalkProfile=getActiveWalkProfile();characterWalkUntil=characterWalkStarted+characterWalkDuration;refreshCharacter()}
const characterFlash=flash;flash=function(){characterFlash();characterAttackUntil=movementTime()+500;refreshCharacter()};
const characterPanel=panel;panel=function(type){characterPanel(type);if(type==='roles'){const button=document.createElement('button');button.className='character-gender';button.textContent=characterGender?'切換為男性':'切換為女性';button.onclick=()=>{characterGender=characterGender?0:1;refreshCharacter();closePanel()};document.querySelector('#panelContent').append(button)}};
characterImage.onerror=()=>{document.querySelector('#log').textContent='人物圖片載入失敗，請確認 assets/characters 資料夾完整。'};
setInterval(()=>{characterTick++;refreshCharacter()},MovementConfig.animationFrameMs);refreshCharacter();
