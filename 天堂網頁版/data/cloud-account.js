// 2026-11-21 第 1 期：帳號＋雲端存檔（Supabase，新專案，跟黑暗大陸分開）。SQL 在 tools/supabase/tianmo-phase1.sql。
// ⚠️ CLOUD_URL／CLOUD_KEY 兩個都填好才啟用；空字串＝完全不載入、登入照舊用本機存檔（目前線上版行為不變）。
//   Project URL 與 publishable key 本來就是公開的，可以放在程式裡；安全性靠資料表 RLS 與 tm_save() 檢查。
// 帳號：玩家只輸入帳號名稱（英文小寫＋數字 4～16 字），自動轉成 名稱@tianmo.example.com 假信箱（保留網域，收不到信＝不會被寄重設信盜帳號）。
// 密碼：玩家本人可以看——①輸入時眼睛按鈕顯示 ②註冊時寫的「密碼提示」，忘記密碼輸入帳號就顯示 ③讓瀏覽器記住密碼（autocomplete＋PasswordCredential）。
//   原本的密碼存在 Supabase 是雜湊，任何人（含管理者）都看不到；真的想不起來由管理者重設。
// 存檔：本機 CharacterStore 仍是遊戲讀寫的地方（帳號鍵 cloud:名稱），登入時從雲端裝進本機，之後每次存檔延遲上傳（tm_save，revision 防兩台裝置互蓋）。
// 本機多人測試伺服器（local-server-client.js）連得上時，一律讓它處理，不走雲端。
const TmCloud=(()=>{
 const CLOUD_URL='',CLOUD_KEY='';
 const DOMAIN='tianmo.example.com',SDK='https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.117.2/dist/umd/supabase.js';
 const NAME=/^[a-z0-9]{4,16}$/,PUSH_DELAY=3000,PUSH_GAP=15000,TIMEOUT=10000;
 const enabled=!!(CLOUD_URL&&CLOUD_KEY);
 const prevSave=CharacterStore.save,prevLogin=loginLocally,prevLogout=GameEntry.logout||logoutLocally;
 let sb=null,user=null,name='',revision=0,dirty=false,timer=null,inFlight=null,lastPush=0,installing=false,warned=false;
 const key=()=>'cloud:'+name;
 const localOn=()=>!!window.LocalServerClient?.online;
 const say=text=>{const m=document.querySelector('#login-message');if(m)m.textContent=text;};
 const wait=(p,ms=TIMEOUT)=>Promise.race([p,new Promise((_,no)=>setTimeout(()=>no(Error('連線逾時，請確認網路。')),ms))]);
 function sdk(){
  if(sb)return Promise.resolve(sb);
  return new Promise((ok,no)=>{if(window.supabase?.createClient)return ok();const s=document.createElement('script');s.src=SDK;s.onload=ok;s.onerror=()=>no(Error('無法載入登入元件，請確認網路。'));document.head.append(s);})
   .then(()=>sb=window.supabase.createClient(CLOUD_URL,CLOUD_KEY,{auth:{persistSession:false,autoRefreshToken:true,detectSessionInUrl:false}}));
 }
 async function rpc(fn,args){const {data,error}=await wait((await sdk()).rpc(fn,args));if(error){const e=Error(error.message||'伺服器錯誤');e.code=/TM_[A-Z_]+/.exec(error.message||'')?.[0];throw e;}return data;}
 function authError(error){
  const m=String(error?.message||error||'');
  if(/invalid login|invalid credentials/i.test(m))return '帳號或密碼錯誤。';
  if(/already registered|already exists/i.test(m))return '這個帳號已經有人使用了。';
  if(/password/i.test(m)&&/(6|least|short|weak)/i.test(m))return '密碼至少 6 個字。';
  if(/rate limit|too many/i.test(m))return '操作太頻繁，請稍後再試。';
  if(/email not confirmed/i.test(m))return '伺服器尚未關閉 Email 驗證，請通知管理員。';
  if(/database error/i.test(m))return '帳號建立失敗，請換一個帳號名稱。';
  return m||'連線失敗，請稍後再試。';
 }
 // 讓瀏覽器記住密碼（Chrome／Edge／Android 會跳出儲存提示；Safari 靠 autocomplete 屬性）
 function rememberPassword(n,password){try{if(window.PasswordCredential&&navigator.credentials?.store)navigator.credentials.store(new PasswordCredential({id:n,password,name:n})).catch(()=>{});}catch{}}
 // 把雲端存檔裝進本機 CharacterStore（不觸發上傳）；reenter＝遊戲中被別台裝置更新，重新進入角色
 function install(state,reenter=false){
  revision=Number(state.revision)||0;const p=state.payload||{characters:[null,null,null,null],warehouse:[]};
  installing=true;try{prevSave(key(),p.characters,p.warehouse)}finally{installing=false}
  if(entryAccount!==key())return;
  const id=window.activeCharacterId;entryCharacters=JSON.parse(JSON.stringify(p.characters));
  if(reenter&&window.gameFlowState==='playing'){entrySelectedSlot=entryCharacters.findIndex(c=>c?.id===id);setEntryScreen('selection');if(entrySelectedSlot>=0)GameEntry.enter();else updateEntrySelection();}
  else if(window.gameFlowState==='selection')updateEntrySelection();
 }
 CharacterStore.save=function(account,characters,warehouse){
  const result=prevSave(account,characters,warehouse);
  if(!installing&&user&&account===key()){dirty=true;schedule();}
  return result;
 };
 function schedule(delay=PUSH_DELAY){clearTimeout(timer);timer=setTimeout(()=>flush().catch(()=>{}),Math.max(delay,lastPush+PUSH_GAP-Date.now()));}
 async function flush(){
  if(!user)return;
  if(inFlight){await inFlight.catch(()=>{});if(dirty)return flush();return;}
  if(!dirty)return;
  dirty=false;clearTimeout(timer);lastPush=Date.now();
  const payload={characters:CharacterStore.load(key()),warehouse:CharacterStore.warehouse(key())};
  inFlight=rpc('tm_save',{p_revision:revision,p_payload:payload}).then(r=>{revision=Number(r);warned=false;}).catch(async error=>{
   if(error.code==='TM_CONFLICT'){install(await rpc('tm_load'),true);window.toast?.('別台裝置有較新的雲端存檔，已重新載入。');return;}
   dirty=true;schedule(PUSH_GAP);
   if(!warned){warned=true;window.toast?.('雲端存檔暫時失敗，稍後會自動重試。');}
   throw error;
  }).finally(()=>{inFlight=null;});
  await inFlight;if(dirty)return flush();
 }
 async function enterWith(n,password){
  name=n;install(await rpc('tm_load'));rememberPassword(n,password);
  try{const r=document.querySelector('#login-remember');if(r?.checked)localStorage.setItem(rememberedLoginAccountKey,n);}catch{}
  return prevLogin(key(),password);
 }
 async function login(account,password){
  if(!enabled||localOn())return prevLogin(account,password);
  const n=String(account||'').trim().toLowerCase();
  if(!NAME.test(n)){say('帳號是 4～16 個英文小寫字母或數字。');return false;}
  if(typeof password!=='string'||password.length<6){say('密碼至少 6 個字。');return false;}
  say('登入中…');
  try{
   const {data,error}=await wait((await sdk()).auth.signInWithPassword({email:n+'@'+DOMAIN,password}));
   if(error){say(authError(error));return false;}
   user=data.user;return await enterWith(n,password);
  }catch(error){user=null;say(error.message||'登入失敗。');return false;}
 }
 async function logout(){
  if(!enabled||!user)return prevLogout();
  try{saveActiveCharacter();dirty=true;await flush();}catch{say('');window.toast?.('雲端存檔失敗，請確認網路後再登出。');return;}
  try{await sb.auth.signOut();}catch{}
  user=null;name='';revision=0;return prevLogout();
 }
 // ── 註冊／忘記密碼視窗 ──
 function css(){
  if(document.querySelector('#tm-cloud-css'))return;
  const s=document.createElement('style');s.id='tm-cloud-css';s.textContent=`
  .tm-cloud-mask{position:fixed;inset:0;z-index:9000;display:grid;place-items:center;background:rgba(0,0,0,.62);padding:16px}
  .tm-cloud-box{width:min(360px,100%);max-height:calc(100dvh - 32px);overflow:auto;box-sizing:border-box;padding:16px 18px;background:linear-gradient(#26221c,#15130f);border:1px solid #9b8150;border-radius:6px;color:#efe1bd;box-shadow:0 10px 40px #000a;font-size:14px}
  .tm-cloud-box h2{margin:0 0 10px;font-size:17px;text-align:center;color:#f4d991;letter-spacing:2px}
  .tm-cloud-box label{display:block;margin:8px 0 3px;color:#d9c79a;font-size:13px}
  .tm-cloud-row{position:relative}
  .tm-cloud-box input{width:100%;box-sizing:border-box;padding:8px 36px 8px 9px;background:#0e0d0b;border:1px solid #6d5a36;border-radius:3px;color:#fff3d4;font-size:15px}
  .tm-cloud-eye{position:absolute;right:4px;top:50%;transform:translateY(-50%);width:28px;height:28px;padding:3px;border:0;background:none;cursor:pointer;opacity:.8}
  .tm-cloud-eye[aria-pressed=true]{opacity:1;filter:drop-shadow(0 0 3px #f4d991)}
  .tm-cloud-note{margin:4px 0 0;color:#a99a78;font-size:12px;line-height:1.5}
  .tm-cloud-msg{min-height:20px;margin:10px 0 0;color:#ffb38a;font-size:13px;line-height:1.5}
  .tm-cloud-msg.ok{color:#9be3a8}
  .tm-cloud-hint{margin:10px 0 0;padding:10px;background:#0e0d0b;border:1px dashed #9b8150;border-radius:3px;color:#fff3d4;font-size:16px;word-break:break-all}
  .tm-cloud-btns{display:flex;gap:8px;margin-top:12px}
  .tm-cloud-btns button{flex:1;min-height:36px;border:1px solid #9b8150;border-radius:3px;background:linear-gradient(#4a3d26,#2a2216);color:#f0dcae;font-size:14px;cursor:pointer}
  .tm-cloud-btns button.primary{background:linear-gradient(#8a6a2c,#5a4119);color:#fff6dc}
  .tm-cloud-btns button:disabled{opacity:.5;cursor:default}
  .tm-cloud-links{display:flex;gap:8px;justify-content:center;margin-top:6px}
  .tm-cloud-links button{background:none;border:0;color:#e8cf8e;text-decoration:underline;font-size:13px;cursor:pointer;padding:4px}
  .login-video-mode .tm-cloud-links{display:none}`;
  document.head.append(s);
 }
 const EYE='<svg viewBox="0 0 24 24" width="100%" height="100%" aria-hidden="true"><path d="M12 5C6.5 5 2.7 9.4 1.5 12c1.2 2.6 5 7 10.5 7s9.3-4.4 10.5-7C21.3 9.4 17.5 5 12 5zm0 11.5A4.5 4.5 0 1 1 12 7.5a4.5 4.5 0 0 1 0 9zm0-2.3a2.2 2.2 0 1 0 0-4.4 2.2 2.2 0 0 0 0 4.4z" fill="#d8c79a"/></svg>';
 function el(tag,cls,text){const e=document.createElement(tag);if(cls)e.className=cls;if(text!==undefined)e.textContent=text;return e;}
 function field(box,label,attrs,{eye=false,note=''}={}){
  const l=el('label','',label),row=el('div','tm-cloud-row'),input=el('input');Object.assign(input,attrs);input.id='tm-'+attrs.name;l.htmlFor=input.id;
  input.autocapitalize='none';input.spellcheck=false;input.setAttribute('autocorrect','off');row.append(input);
  if(eye){const b=el('button','tm-cloud-eye');b.type='button';b.innerHTML=EYE;b.setAttribute('aria-label','顯示密碼');b.setAttribute('aria-pressed','false');b.onclick=()=>{const show=input.type==='password';input.type=show?'text':'password';b.setAttribute('aria-pressed',String(show));b.setAttribute('aria-label',show?'隱藏密碼':'顯示密碼');};row.append(b);}
  box.append(l,row);if(note)box.append(el('p','tm-cloud-note',note));return input;
 }
 function dialog(title){
  css();document.querySelector('.tm-cloud-mask')?.remove();
  const mask=el('div','tm-cloud-mask'),form=el('form','tm-cloud-box');form.setAttribute('role','dialog');form.setAttribute('aria-modal','true');form.setAttribute('aria-label',title);form.noValidate=true;
  form.append(el('h2','',title));mask.append(form);mask.addEventListener('pointerdown',e=>{if(e.target===mask)mask.remove();});
  document.addEventListener('keydown',function esc(e){if(e.key==='Escape'){mask.remove();document.removeEventListener('keydown',esc);}});
  document.body.append(mask);return {mask,form,close:()=>mask.remove()};
 }
 function buttons(form,list){const row=el('div','tm-cloud-btns');for(const [label,fn,primary]of list){const b=el('button',primary?'primary':'',label);b.type=primary?'submit':'button';if(!primary)b.onclick=fn;row.append(b);}form.append(row);return row;}
 function openRegister(){
  if(!enabled)return false;
  const {form,close}=dialog('註冊帳號'),msg=el('p','tm-cloud-msg');
  const acc=field(form,'帳號',{name:'reg-account',autocomplete:'username',maxLength:16,inputMode:'latin',placeholder:'4～16 個英文小寫或數字'},{note:'帳號就是登入用的名稱，不用信箱。'});
  acc.value=(document.querySelector('#login-account')?.value||'').trim().toLowerCase();
  const pw=field(form,'密碼',{name:'reg-password',type:'password',autocomplete:'new-password',maxLength:72,placeholder:'至少 6 個字'},{eye:true});
  const pw2=field(form,'再輸入一次密碼',{name:'reg-password2',type:'password',autocomplete:'new-password',maxLength:72},{eye:true});
  const hint=field(form,'密碼提示',{name:'reg-hint',maxLength:60,autocomplete:'off',placeholder:'例：我家狗的名字＋生日'},{note:'忘記密碼時輸入帳號就會顯示這句提示。任何人輸入你的帳號都看得到，請不要直接寫密碼。'});
  form.append(msg);const row=buttons(form,[['取消',close],['註冊並登入',null,true]]);
  const bad=text=>{msg.className='tm-cloud-msg';msg.textContent=text;return false;};
  let checking=0;acc.addEventListener('input',()=>{acc.value=acc.value.toLowerCase();const n=acc.value.trim(),id=++checking;msg.textContent='';
   if(!NAME.test(n))return;setTimeout(async()=>{if(id!==checking)return;try{const free=await rpc('tm_name_free',{p_name:n});if(id===checking){msg.className='tm-cloud-msg'+(free?' ok':'');msg.textContent=free?'這個帳號可以使用。':'這個帳號已經有人使用了。';}}catch{}},400);});
  form.onsubmit=async e=>{
   e.preventDefault();checking++;const n=acc.value.trim().toLowerCase(),p=pw.value,h=hint.value.trim(); // checking++：取消還沒回來的「帳號可用」檢查，免得蓋掉錯誤訊息
   if(!NAME.test(n))return bad('帳號是 4～16 個英文小寫字母或數字。');
   if(p.length<6)return bad('密碼至少 6 個字。');
   if(p!==pw2.value)return bad('兩次輸入的密碼不一樣。');
   if(!h)return bad('請寫一句密碼提示，忘記密碼時才看得到。');
   if(h.toLowerCase().includes(p.toLowerCase())||p.toLowerCase().includes(h.toLowerCase())&&h.length>=4)return bad('密碼提示不能包含密碼本身，請換一種寫法。');
   for(const b of row.querySelectorAll('button'))b.disabled=true;msg.className='tm-cloud-msg';msg.textContent='註冊中…';
   try{
    if(!(await rpc('tm_name_free',{p_name:n})))return bad('這個帳號已經有人使用了。');
    const {data,error}=await wait((await sdk()).auth.signUp({email:n+'@'+DOMAIN,password:p,options:{data:{hint:h}}}));
    if(error)return bad(authError(error));
    if(!data.session)return bad('伺服器尚未關閉 Email 驗證，請通知管理員。');
    user=data.user;close();say('');
    const loginAcc=document.querySelector('#login-account');if(loginAcc)loginAcc.value=n;
    await enterWith(n,p);
    window.toast?.('帳號建立完成，記得記住你的密碼提示。');
   }catch(error){user=null;bad(error.message||'註冊失敗。');}
   finally{for(const b of row.querySelectorAll('button'))b.disabled=false;}
  };
  setTimeout(()=>(acc.value?pw:acc).focus(),30);return true;
 }
 function openForgot(){
  if(!enabled)return false;
  const {form,close}=dialog('忘記密碼'),msg=el('p','tm-cloud-msg'),out=el('div');
  const acc=field(form,'帳號',{name:'forgot-account',autocomplete:'username',maxLength:16,placeholder:'輸入你的帳號'});
  acc.value=(document.querySelector('#login-account')?.value||'').trim().toLowerCase();
  form.append(msg,out);buttons(form,[['關閉',close],['顯示密碼提示',null,true]]);
  form.onsubmit=async e=>{
   e.preventDefault();out.replaceChildren();const n=acc.value.trim().toLowerCase();
   if(!NAME.test(n)){msg.textContent='帳號是 4～16 個英文小寫字母或數字。';return;}
   msg.className='tm-cloud-msg';msg.textContent='查詢中…';
   try{
    const h=await rpc('tm_password_hint',{p_name:n});
    if(h==null){msg.textContent='找不到這個帳號。';return;}
    msg.className='tm-cloud-msg ok';msg.textContent=h?'你的密碼提示：':'這個帳號沒有設定密碼提示。';
    if(h)out.append(el('div','tm-cloud-hint',h));
    out.append(el('p','tm-cloud-note','有用瀏覽器儲存密碼的話，也可以到瀏覽器的「密碼管理」查看。還是想不起來，請聯絡管理員重設密碼。'));
   }catch(error){msg.textContent=error.message||'查詢失敗。';}
  };
  setTimeout(()=>acc.focus(),30);return true;
 }
 function init(){
  if(!enabled)return;
  const pw=document.querySelector('#login-password');if(pw)pw.autocomplete='current-password'; // 讓瀏覽器提示儲存／自動填入
  const acc=document.querySelector('#login-account');if(acc){acc.placeholder='輸入帳號';acc.maxLength=16;acc.inputMode='latin';}
  if(pw)pw.placeholder='輸入密碼';
  const note=document.querySelector('.entry-note');if(note)note.textContent='帳號與角色存在雲端，換手機或電腦登入同一個帳號就能繼續玩。';
  const bottom=document.querySelector('.selection-bottom small');if(bottom)bottom.textContent='角色存在雲端帳號，會自動同步。';
  // 直式／簡易登入卡沒有影片裡畫的按鈕，補兩個文字按鈕（影片模式由 login-video.js 的熱區呼叫）
  css();const form=document.querySelector('#login-form');
  if(form&&!form.querySelector('.tm-cloud-links')){const links=el('div','tm-cloud-links');for(const [label,fn]of [['註冊帳號',openRegister],['忘記密碼',openForgot]]){const b=el('button','',label);b.type='button';b.onclick=()=>{if(!localOn())fn();};links.append(b);}form.append(links);}
 }
 loginLocally=login;GameEntry.login=login;GameEntry.logout=logout;
 document.querySelector('#entry-back').onclick=logout;if(typeof entryLogout!=='undefined')entryLogout.onclick=logout;
 document.addEventListener('visibilitychange',()=>{if(document.hidden&&user&&window.gameFlowState==='playing'){try{saveActiveCharacter();}catch{}flush().catch(()=>{});}});
 addEventListener('pagehide',()=>{if(user)flush().catch(()=>{});});
 init();
 return {get enabled(){return enabled&&!localOn();},openRegister,openForgot,flush,get user(){return user&&{name,revision};}};
})();window.TmCloud=TmCloud;
