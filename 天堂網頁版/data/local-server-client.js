const LocalServerClient=(()=>{
 let online=false,user=null,revision=0,pending=null,inFlight=null,busy=false,timer=null,socialTab='players';
 const originalSave=CharacterStore.save,originalLogin=loginLocally,originalLogout=logoutLocally;
 const message=text=>document.querySelector('#log').textContent=text;
 async function request(route,options={}){
  const response=await fetch(route,{...options,credentials:'same-origin',headers:{'Content-Type':'application/json',...options.headers}});
  const data=await response.json();if(!response.ok){const e=Error(data.error||'伺服器未完成操作。');e.status=response.status;throw e;}return data;
 }
 function installState(state,reenter=false){
  revision=state.revision;
  originalSave(user.name,state.characters,state.warehouse);
  if(entryAccount===user.name){
   const id=window.activeCharacterId;entryCharacters=JSON.parse(JSON.stringify(state.characters));
   if(reenter&&window.gameFlowState==='playing'){
    entrySelectedSlot=entryCharacters.findIndex(c=>c?.id===id);setEntryScreen('selection');
    if(entrySelectedSlot>=0)GameEntry.enter();else updateEntrySelection();
   }else if(window.gameFlowState==='selection')updateEntrySelection();
  }
 }
 CharacterStore.save=function(account,characters,warehouse){
  if(online&&user?.name===account&&busy)throw Error('多人操作正在存檔。');
  const result=originalSave(account,characters,warehouse);
  if(online&&user?.name===account){
   pending={characters:result,warehouse:CharacterStore.warehouse(account)};
   clearTimeout(timer);timer=setTimeout(()=>flush().catch(error=>message(error.message)),200);
  }
  return result;
 };
 async function flush(){
  if(!online||!user)return;
  if(inFlight){await inFlight;if(pending)return flush();return;}
  if(!pending)return;
  const payload=pending;pending=null;
  inFlight=request('/api/state',{method:'PUT',body:JSON.stringify({...payload,revision})}).then(data=>{revision=data.state.revision;}).catch(async error=>{
   pending=null;
   if(error.status===409){const data=await request('/api/state');installState(data.state,true);}
   throw error;
  }).finally(()=>{inFlight=null;});
  await inFlight;if(pending)return flush();
 }
 async function authenticate(account,password,register){
  try{
   const data=await request('/api/auth',{method:'POST',body:JSON.stringify({name:account,password,register})});
   user=data.user;pending=null;installState(data.state);
   const result=originalLogin(account,password);
   connectEvents();return result;
  }catch(error){document.querySelector('#login-message').textContent=error.message;return false;}
 }
 loginLocally=function(account,password){return online?authenticate(account,password,false):originalLogin(account,password);};
 GameEntry.login=loginLocally;
 async function logout(){
  if(!online)return originalLogout();
  try{saveActiveCharacter();await flush();}catch(error){message(error.message);return;}
  await request('/api/auth',{method:'DELETE'});source?.close();user=null;pending=null;originalLogout();
 }
 GameEntry.logout=logout;document.querySelector('#entry-back').onclick=logout;
 if(typeof entryLogout!=='undefined')entryLogout.onclick=logout;
 let source=null;
 function connectEvents(){
  source?.close();source=new EventSource('/api/events');
  source.addEventListener('changed',async()=>{
   if(!user||busy||pending||inFlight)return;
   try{const data=await request('/api/state');if(data.state.revision>revision)installState(data.state,true);}catch(error){message(error.message);}
  });
 }
 async function act(route,data={}){
  if(!online||!user||window.gameFlowState!=='playing')throw Error('請使用本機伺服器登入角色。');
  if(busy)throw Error('請等目前操作完成。');
  saveActiveCharacter();await flush();busy=true;
  try{
   const result=await request(route,{method:'POST',body:JSON.stringify({...data,characterId:window.activeCharacterId})});
   pending=null;if(result.state)installState(result.state,true);
   return result;
  }finally{busy=false;}
 }
 async function importFile(file){
  try{
   if(!online||!user)throw Error('請先登入本機測試帳號。');
   if(GameEntry.characters.some(Boolean))throw Error('請使用尚未建立角色的測試帳號匯入。');
   const data=JSON.parse(await file.text());
   const response=await request('/api/state',{method:'PUT',body:JSON.stringify({...data,revision})});
   installState(response.state,true);
   document.querySelector('#selection-message').textContent='角色存檔已匯入，連點角色即可進入遊戲。';
  }catch(error){document.querySelector('#selection-message').textContent=error.message;}
 }
 const control=(label,action)=>{const b=uiElement('button','classic-use',label);b.type='button';b.onclick=action;return b;};
 async function open(tab=socialTab){
  if(tab==='auction'&&window.DiamondCommerce)return window.DiamondCommerce.open('exchange');
  if(!online||!user){message('請從本機測試伺服器網址登入。');return;}
  socialTab=tab;
  const response=await request('/api/social?characterId='+encodeURIComponent(window.activeCharacterId));
  const dialog=document.querySelector('#panel'),content=document.querySelector('#panelContent');
  dialog.classList.remove('classic-panel','reference-menu-panel','game-catalog-panel');dialog.hidden=false;
  document.querySelector('#close').hidden=false;
  content.replaceChildren(uiElement('h2','','多人系統'));
  const tabs=uiElement('nav',''),body=uiElement('section',''),notice=uiElement('p','');
  body.style.cssText='max-height:60dvh;overflow:auto;display:grid;gap:8px';
  for(const [key,label]of [['players','玩家'],['friends','好友'],['guild','血盟'],['party','組隊'],['auction','交易所'],['trade','交易'],['mail','郵件'],['chat','聊天']])tabs.append(control(label,()=>open(key)));
  content.append(tabs,notice,body);
  async function run(route,data){try{await act(route,data);await open(tab);}catch(error){notice.textContent=error.message;}}
  function form(fields,label,submit){
   const wrap=uiElement('div','');wrap.style.cssText='display:flex;gap:6px;flex-wrap:wrap';
   const inputs={};
   for(const [name,title,type='text']of fields){
    const input=uiElement('input','');input.placeholder=title;input.setAttribute('aria-label',title);input.type=type;
    if(type==='number'){input.min='1';input.value='1';}
    wrap.append(input);inputs[name]=input;
   }
   wrap.append(control(label,()=>submit(Object.fromEntries(Object.entries(inputs).map(([key,input])=>[key,input.type==='number'?Number(input.value):input.value])))));
   body.append(wrap);
  }
  function itemForm(label,fields,submit){
   const select=uiElement('select','');
   for(const entry of OwnedInventory.items.filter(e=>!e.slot)){
    const option=uiElement('option','',entry.item.name+' × '+entry.count);option.value=entry.uid;select.append(option);
   }
   body.append(select);form([['count','數量','number'],...fields],label,data=>submit({...data,itemUid:select.value}));
  }
  if(tab==='players'){
   body.append(uiElement('p','','已連線至本機 SQLite 測試伺服器。'));
   const p=await request('/api/presence',{method:'POST',body:JSON.stringify({characterId:window.activeCharacterId})});
   for(const player of p.players)body.append(uiElement('p','',player.name+' · '+player.role+' Lv. '+player.level));
   if(!p.players.length)body.append(uiElement('p','','目前沒有其他上線角色。'));
  }
  if(tab==='friends'){
   form([['name','好友角色名稱']],'加入好友',data=>run('/api/friends/add',data));
   for(const friend of response.friends)body.append(uiElement('p','',friend.name+' · Lv. '+friend.level),
     control('移除',()=>run('/api/friends/remove',{targetId:friend.id})));
  }
  if(tab==='guild'||tab==='party'){
   const group=response.groups.find(g=>g.kind===tab);
   if(!group){
    if(tab==='guild')body.append(uiElement('p','','王族可花費 30,000 天幣建立血盟。'));
    form([['name',tab==='guild'?'血盟名稱':'隊伍名稱']],'建立',data=>run('/api/groups/create',{...data,kind:tab}));
   }
   else{
    body.append(uiElement('h3','',group.name),uiElement('p','','成員 '+group.members.map(m=>m.name).join('、')));
    form([['name','邀請角色名稱']],'邀請',data=>run('/api/groups/invite',{...data,groupId:group.id}));
    if(tab==='guild'){
     body.append(uiElement('p','','金庫 '+group.treasury+' 天幣'));
     form([['amount','天幣數量','number']],'存入金庫',data=>run('/api/groups/gold',{...data,groupId:group.id}));
     if(group.leader===window.activeCharacterId)form([['amount','天幣數量','number']],'領出金庫',data=>run('/api/groups/gold',{...data,groupId:group.id,withdraw:true}));
     itemForm('存入血盟倉庫',[],data=>run('/api/groups/storage',{...data,groupId:group.id}));
     for(const item of group.storage){
      const definition=INTERFACE_CATALOG.items.find(i=>i.kind+':'+i.id===item.key);
      body.append(uiElement('p','',(definition?.name||item.key)+' × '+item.count));
      if(group.leader===window.activeCharacterId)body.append(control('領出',()=>run('/api/groups/storage',{groupId:group.id,itemUid:item.uid,count:item.count,withdraw:true})));
     }
    }
    body.append(control('離開',()=>run('/api/groups/leave',{groupId:group.id})));
   }
   for(const invitation of response.invites.filter(i=>i.kind===tab))body.append(control('加入 '+invitation.name,()=>run('/api/groups/accept',{inviteId:invitation.id})));
  }
  if(tab==='auction'){
   itemForm('上架 24 小時',[['price','售價天幣','number']],data=>run('/api/auction/list',data));
   for(const auction of response.auctions){
    const item=INTERFACE_CATALOG.items.find(i=>i.kind+':'+i.id===auction.item.key);
    body.append(uiElement('p','',(item?.name||auction.item.key)+' × '+auction.item.count+' · '+auction.price+' 天幣'),
     control(auction.character_id===window.activeCharacterId?'下架':'購買',()=>run(auction.character_id===window.activeCharacterId?'/api/auction/cancel':'/api/auction/buy',{auctionId:auction.id})));
   }
  }
  if(tab==='trade'){
   form([['to','對方角色名稱']],'提出交易',data=>run('/api/trade/start',data));
   for(const trade of response.trades){
    body.append(uiElement('h3','','交易 #'+trade.id));
    const mine=trade.ac===window.activeCharacterId?trade.ao:trade.bo,other=trade.ac===window.activeCharacterId?trade.bo:trade.ao;
    const describe=items=>items.map(item=>(INTERFACE_CATALOG.items.find(i=>i.kind+':'+i.id===item.key)?.name||item.key)+' × '+item.count).join('、')||'空';
    body.append(uiElement('p','','我方 '+describe(mine)),uiElement('p','','對方 '+describe(other)));
    if(!mine.length)itemForm('放入交易',[],data=>run('/api/trade/offer',{...data,tradeId:trade.id}));
    body.append(control('確認交易',()=>run('/api/trade/confirm',{tradeId:trade.id})),control('取消交易',()=>run('/api/trade/cancel',{tradeId:trade.id})));
   }
  }
  if(tab==='mail'){
   form([['to','收件角色名稱'],['subject','主旨'],['body','內容']],'寄信',data=>run('/api/mail/send',data));
   itemForm('寄出附有道具的信件',[['to','收件角色名稱'],['subject','主旨'],['body','內容']],data=>run('/api/mail/send',data));
   for(const mail of response.mail){
    body.append(uiElement('h3','',mail.subject),uiElement('p','',mail.body));
    if(mail.attachment.length&&!mail.claimed)body.append(control('領取附件',()=>run('/api/mail/claim',{mailId:mail.id})));
   }
  }
  if(tab==='chat'){
   for(const entry of response.chat)body.append(uiElement('p','',entry.name+'：'+entry.text));
   form([['text','世界頻道訊息']],'傳送',data=>run('/api/chat',data));
  }
  body.append(control('重新整理',()=>open(tab)));
 }
 const previousPanel=panel;
 panel=function(type){
  previousPanel(type);
  if(type==='settings'){
   if(online)document.querySelector('#panelContent').append(control('多人系統',()=>open()));
   const exportButton=control('匯出角色存檔',()=>{
    if(!entryAccount)return;
    const data={characters:CharacterStore.load(entryAccount),warehouse:CharacterStore.warehouse(entryAccount)};
    const blob=new Blob([JSON.stringify(data)],{type:'application/json'}),url=URL.createObjectURL(blob),a=document.createElement('a');
    a.href=url;a.download='天堂角色存檔.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
   });
   document.querySelector('#panelContent').append(exportButton);
  }
 };
 const peersLayer=uiElement('div',''),peers=new Map();
 peersLayer.style.cssText='position:absolute;inset:0;pointer-events:none;z-index:2;overflow:hidden';game.append(peersLayer);
 let visiblePlayers=[],partyMembers=[],partyOwner=null;
 function drawPeers(){
  peersLayer.hidden=window.gameFlowState!=='playing';
  if(peersLayer.hidden)return;
  const view=getRenderedSceneView(),scale=characterRenderScale(),used=new Set();
  for(const player of visiblePlayers){
   if(player.mapId!==(window.activeMapId||0))continue;
   used.add(player.id);let element=peers.get(player.id);
   const avatar=characterCatalog.jobs[player.role]?.[player.gender];if(!avatar)continue;
   const asset=CHARACTER_ACTION_ASSETS.avatars[avatar];if(!asset)continue;
   if(!element){element=uiElement('div','');const image=document.createElement('img'),label=uiElement('small','',player.name);image.src='assets/character-actions/'+avatar+'/S/unarmed_idle_0.png';image.alt='';element.append(image,label);peers.set(player.id,element);peersLayer.append(element);}
   const [x,y]=project(player.x,player.y),w=asset.size[0]*scale,h=asset.size[1]*scale;
   element.style.cssText='position:absolute;left:'+(x*view.zoom+view.ox-w/2)+'px;top:'+(y*view.zoom+view.oy-asset.footY*scale)+'px;width:'+w+'px;height:'+h+'px';
   element.firstChild.style.cssText='width:100%;height:100%;position:absolute;inset:0';
   element.lastChild.style.cssText='position:absolute;left:0;right:0;top:0;text-align:center;color:'+(window.PlayerAppearance?.lawfulColor(player.lawful)||'#fff')+';text-shadow:1px 1px #000';
  }
  for(const [id,element]of peers)if(!used.has(id)){element.remove();peers.delete(id);}
 }
 const originalDraw=draw;draw=function(...args){const result=originalDraw(...args);drawPeers();return result;};
 let presenceBusy=false;
 setInterval(async()=>{
  if(!online||!user||window.gameFlowState!=='playing'||document.hidden||busy||presenceBusy)return;
  presenceBusy=true;
  try{await flush();const data=await request('/api/presence',{method:'POST',body:JSON.stringify({characterId:window.activeCharacterId})});visiblePlayers=data.players;partyMembers=data.party||[];partyOwner=window.activeCharacterId;drawPeers();}
  catch(error){message(error.message);}finally{presenceBusy=false;}
 },1500);
 async function init(){
  if(!/^https?:$/.test(location.protocol))return;
  try{
   const health=await request('/api/health');if(health.service!=='lineage-local-test')return;
   online=true;
   for(const entry of menuLayout){
    const tab={'社交':'players','信件':'mail','交易所':'exchange'}[entry[0]];
    if(tab)entry[2]=entry[0]==='社交'?'social':entry[0]==='交易所'?'exchange':'online-'+tab;
   }
   const originalMenuAction=runGameMenuAction;
   runGameMenuAction=function(action){if(action.startsWith('online-'))return open(action.slice(7));return originalMenuAction(action);};
   const register=control('建立測試帳號',()=>authenticate(document.querySelector('#login-account').value,document.querySelector('#login-password').value,true));
   document.querySelector('#login-form').append(register);
   const upload=document.createElement('input');upload.type='file';upload.accept='.json,application/json';upload.hidden=true;
   upload.onchange=()=>{if(upload.files[0])importFile(upload.files[0]);upload.value='';};
   document.querySelector('#entry-new').parentElement.append(control('匯入角色存檔',()=>upload.click()),upload);
   document.querySelector('#login-message').textContent='本機測試伺服器 · 密碼至少 4 字。';
  }catch{}
 }
 init();
 return {flush,open,act,get party(){return window.gameFlowState==='playing'&&partyOwner===window.activeCharacterId?partyMembers:[];},async market(){await flush();return request('/api/social?characterId='+encodeURIComponent(window.activeCharacterId));},get online(){return online;}};
})();
window.LocalServerClient=LocalServerClient;
