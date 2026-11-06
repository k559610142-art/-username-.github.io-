// 本機帳號流程：帳密只檢查有填寫，角色存於此瀏覽器，不保存或傳送密碼。
let entryLoggedIn=false,entryAccount='',entryCharacters=Array(4).fill(null),entrySelectedSlot=-1;
const entryCards=[];
let lastCharacterTap=null;
function setEntryScreen(state){lastCharacterTap=null;stopMovement();cancelNavigation();if(typeof cancelPointerGesture==='function')cancelPointerGesture();window.gameFlowState=state;for(const [id,value] of [['login-screen','login'],['selection-screen','selection'],['creation-screen','creation']])document.querySelector('#'+id).hidden=state!==value;game.inert=state!=='playing';document.querySelector('#panel').hidden=true;}
function updateEntrySelection(){for(const {button,image,label,empty,index} of entryCards){const c=entryCharacters[index];button.className='character-choice'+(c?'':' empty-slot');button.setAttribute('aria-pressed',String(!!c&&entrySelectedSlot===index));image.hidden=!c;empty.hidden=!!c;if(c){image.src='assets/entry/'+CreationRules.classes[c.role].portraits[c.gender];image.alt=c.name+' · '+c.role;label.textContent=c.name}else{image.removeAttribute('src');label.textContent='空欄位'}}const c=entryCharacters[entrySelectedSlot]||null;document.querySelector('#entry-name').textContent=c?c.name:'尚未建立角色';document.querySelector('#entry-gender').textContent=c?(c.gender?'女性':'男性'):'請先建立角色';document.querySelector('#entry-class').textContent=c?c.role:'—';document.querySelector('#entry-level').textContent=c?'Lv. '+c.level:'—';document.querySelector('#entry-health').textContent=c?CreationRules.vitals(c.role,c.stats).hp+' / '+CreationRules.vitals(c.role,c.stats).mp:'—';document.querySelector('#entry-attributes').textContent=c?CreationRules.keys.map(k=>CreationRules.labels[k]+' '+c.stats[k]).join('　'):'';document.querySelector('#entry-new').disabled=entryCharacters.every(Boolean);document.querySelector('#entry-delete').disabled=!c;document.querySelector('#selection-message').textContent=c?'連點兩下角色即可進入遊戲。':entryCharacters.some(Boolean)?'連點兩下已有角色即可進入遊戲，點空欄位可建立新角色。':'目前沒有角色，請點空欄位建立角色。';}
function deleteSelectedCharacter(){
 const slot=entrySelectedSlot,character=entryCharacters[slot];
 if(!entryLoggedIn||window.gameFlowState!=='selection'||!character)return;
 if(!window.confirm('確定刪除角色「'+character.name+'」？角色、背包和收集紀錄將永久刪除。'))return;
 const next=entryCharacters.slice();
 next[slot]=null;
 try{entryCharacters=CharacterStore.save(entryAccount,next);}
 catch{document.querySelector('#selection-message').textContent='無法儲存刪除結果，請再試一次。';return;}
 for(const prefix of ['lineage-web-transform-cards-v1:','lineage-web-tdj-systems-v1:']){
  try{localStorage.removeItem(prefix+character.id);}catch{}
 }
 if(window.activeCharacterId===character.id){
  window.activeCharacterId=null;
  window.activeCharacterName='';
  window.OwnedInventory?.deactivate();
 }
 entrySelectedSlot=-1;
 lastCharacterTap=null;
 updateEntrySelection();
 document.querySelector('#selection-message').textContent='已刪除角色「'+character.name+'」。';
 entryCards[slot].button.focus();
}
function selectCharacterSlot(index){if(!Number.isInteger(index)||index<0||index>3||!entryLoggedIn)return false;if(!entryCharacters[index])return startCharacterCreation(index);entrySelectedSlot=index;updateEntrySelection();return true}
function startCharacterCreation(index){if(!entryLoggedIn||window.gameFlowState!=='selection')return false;if(index===undefined)index=entryCharacters.findIndex(c=>!c);if(!Number.isInteger(index)||index<0||index>3||entryCharacters[index])return false;CharacterCreation.open(index);setEntryScreen('creation');document.querySelector('#creation-name').focus();return true}
function loginLocally(account,password){if(typeof account!=='string'||!account.trim()||account.trim().length>32||typeof password!=='string'||!password){document.querySelector('#login-message').textContent='請填寫帳號與密碼。';return false}document.querySelector('#login-password').value='';try{const characters=CharacterStore.load(account.trim());entryAccount=account.trim();entryCharacters=characters}catch{document.querySelector('#login-message').textContent='無法讀取本機角色存檔，請使用原瀏覽器或其他測試帳號。';return false}entryLoggedIn=true;entrySelectedSlot=-1;window.activeCharacterId=null;window.activeCharacterName='';window.OwnedInventory?.deactivate();document.querySelector('#login-message').textContent='';updateEntrySelection();setEntryScreen('selection');entryCards[0].button.focus();return true}
function starterInventory(){
  return [
    {uid:'starter-dagger',key:'weapon:1',count:1,slot:null},
    {uid:'starter-bow',key:'weapon:172',count:1,slot:null},
    {uid:'starter-arrows',key:'etcitem:40743',count:1000,slot:null}
  ];
}
function createLocalCharacter(draft){if(!entryLoggedIn||window.gameFlowState!=='creation')return false;let error='';const name=typeof draft?.name==='string'?draft.name.trim():'',slot=draft?.slot;if(!Number.isInteger(slot)||slot<0||slot>3||entryCharacters[slot])error='請選擇空的角色欄位。';else if(!name||Array.from(name).length>12||/\s/.test(name))error='請輸入 1～12 字且不含空白的角色名稱。';else if(entryCharacters.some(c=>c&&c.name.toLocaleLowerCase()===name.toLocaleLowerCase()))error='這個測試帳號已有相同名稱的角色。';else if(!CreationRules.validStats(draft.role,draft.stats))error='請依職業初始值分配完點數，六項能力合計須為 75。';else if(draft.gender!==0&&draft.gender!==1)error='請選擇人物性別。';if(error){document.querySelector('#creation-message').textContent=error;return false}const v=CreationRules.vitals(draft.role,draft.stats),record={id:Date.now().toString(36)+'-'+Math.random().toString(36).slice(2),name,role:draft.role,gender:draft.gender,stats:{...draft.stats},level:1,inventory:starterInventory(),hp:v.hp,mp:v.mp,x:island.spawn.x,y:island.spawn.y};const next=entryCharacters.slice();next[slot]=record;try{entryCharacters=CharacterStore.save(entryAccount,next)}catch{document.querySelector('#creation-message').textContent='無法儲存角色。請允許此瀏覽器的本機儲存後重試。';return false}entrySelectedSlot=slot;setEntryScreen('selection');updateEntrySelection();document.querySelector('#selection-message').textContent='角色已建立，連點兩下即可進入遊戲。';entryCards[slot].button.focus();return true}
function saveActiveCharacter(){if(window.gameFlowState!=='playing'||!entryLoggedIn||!window.activeCharacterId)return false;const index=entryCharacters.findIndex(c=>c&&c.id===window.activeCharacterId);if(index<0)return false;const next=entryCharacters.slice();next[index]={...next[index],x:worldX,y:worldY,hp,mp,weapon:window.CharacterActions?.weapon||'unarmed',...(window.OwnedInventory?.owner===window.activeCharacterId?{inventory:OwnedInventory.snapshot}:{})};try{entryCharacters=CharacterStore.save(entryAccount,next);return true}catch{return false}}
function enterSelectedCharacter(){const c=entryCharacters[entrySelectedSlot];if(!entryLoggedIn||window.gameFlowState!=='selection'||!c||!CharacterStore.valid(c))return false;const inventoryError=window.OwnedInventory?.validate(c.inventory===undefined?[]:c.inventory,c.role,c.level||1);if(inventoryError){document.querySelector('#selection-message').textContent=inventoryError;return false}const v=CreationRules.vitals(c.role,c.stats);window.activeCharacterLevel=c.level||1;window.activeCharacterId=c.id;window.activeCharacterName=c.name;window.playerAttributes={...c.stats};job=c.role;characterGender=c.gender;characterWalkUntil=0;characterAttackUntil=0;resetMovementState();maxHp=v.hp;maxMp=v.mp;hp=Math.max(0,Math.min(maxHp,Number.isFinite(c.hp)?c.hp:maxHp));mp=Math.max(0,Math.min(maxMp,Number.isFinite(c.mp)?c.mp:maxMp));if(window.OwnedInventory)OwnedInventory.activate(c.inventory===undefined?[]:c.inventory);else window.CharacterActions?.reset('unarmed');worldX=Number.isInteger(c.x)&&Number.isInteger(c.y)&&tile(c.x,c.y)?c.x:island.spawn.x;worldY=Number.isInteger(c.x)&&Number.isInteger(c.y)&&tile(c.x,c.y)?c.y:island.spawn.y;document.querySelector('#className').textContent=job;refreshCharacter();stats();setEntryScreen('playing');schedule();toast('歡迎，'+c.name+'。已進入說話之島。');return true}
function logoutLocally(){saveActiveCharacter();entryLoggedIn=false;entryAccount='';entryCharacters=Array(4).fill(null);entrySelectedSlot=-1;window.activeCharacterId=null;window.activeCharacterName='';document.querySelector('#login-password').value='';document.querySelector('#login-account').value='';document.querySelector('#login-message').textContent='';setEntryScreen('login');document.querySelector('#login-account').focus()}
function clickCharacterSlot(index,event){
  const previous=lastCharacterTap;
  lastCharacterTap=null;
  if(!selectCharacterSlot(index)||!entryCharacters[index]||event.detail===0)return;
  const now=performance.now();
  if(previous?.index===index&&now-previous.time<=400){enterSelectedCharacter();return;}
  lastCharacterTap={index,time:now};
}
for(let index=0;index<4;index++){const button=document.createElement('button'),image=document.createElement('img'),label=document.createElement('strong'),empty=document.createElement('span');image.loading='lazy';image.decoding='async';image.hidden=true;empty.className='empty-character';empty.textContent='＋';button.type='button';button.append(image,empty,label);button.style.touchAction='manipulation';button.onclick=event=>clickCharacterSlot(index,event);button.onkeydown=event=>{if(event.key==='Enter'&&entryCharacters[index]){event.preventDefault();if(!event.repeat&&selectCharacterSlot(index))enterSelectedCharacter();}};entryCards.push({button,image,label,empty,index});document.querySelector('#character-choices').append(button)}
document.querySelector('#login-form').addEventListener('submit',event=>{event.preventDefault();loginLocally(document.querySelector('#login-account').value,document.querySelector('#login-password').value)});document.querySelector('#entry-new').onclick=()=>startCharacterCreation();document.querySelector('#entry-delete').onclick=deleteSelectedCharacter;document.querySelector('#entry-back').onclick=logoutLocally;
document.querySelector('#roles').onclick=()=>{if(!entryLoggedIn)return;saveActiveCharacter();entrySelectedSlot=entryCharacters.findIndex(c=>c&&c.id===window.activeCharacterId);setEntryScreen('selection');updateEntrySelection()};
const entryLogout=document.createElement('button');entryLogout.type='button';entryLogout.className='entry-logout';entryLogout.textContent='登出';entryLogout.onclick=logoutLocally;document.querySelector('.nav').append(entryLogout);
window.GameEntry={login:loginLocally,selectSlot:selectCharacterSlot,startCreate:startCharacterCreation,create:createLocalCharacter,enter:enterSelectedCharacter,logout:logoutLocally,saveActive:saveActiveCharacter,get state(){return window.gameFlowState},get characters(){return JSON.parse(JSON.stringify(entryCharacters))},get selectedSlot(){return entrySelectedSlot}};
addEventListener('pagehide',saveActiveCharacter);updateEntrySelection();setEntryScreen('login');document.querySelector('#login-submit').disabled=false;
