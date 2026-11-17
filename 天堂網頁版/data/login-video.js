// 登入畫面影片（2026-11-17 使用者換成新影片 assets/entry/login-video-v2.mp4，1280×720、10 秒；舊版 login-video.mp4 不再使用）：
//  新影片約第 7.3～8 秒淡入標題下方的登入框（帳號／密碼欄、註冊／登入／忘記密碼）。使用者要輸入框換成之前那組樣式（深色底金邊、右側眼睛），
//  所以帳號／密碼改成看得見的輸入框疊在影片畫的欄位上；按鈕仍是透明熱區疊在影片畫好的按鈕上。以下舊版說明保留參考：
//  影片播一次停在最後一格；約第 8.3～9.2 秒影片本身會淡入標題與畫好的帳號／密碼欄、註冊／登入／忘記密碼按鈕，
//  這裡把遊戲真正的輸入框與按鈕（透明）疊到影片畫的位置上。座標以影片 1280×720 為準，依 object-fit:cover 換算。
//  直式手機畫面會把影片裡的登入框裁掉，所以直式時停在第 5.5 秒（還沒出現畫好的介面）並沿用原本的登入卡。
(()=>{
 const video=document.querySelector('.login-video'),stage=document.querySelector('.login-stage'),form=document.querySelector('#login-form'),message=document.querySelector('#login-message');
 if(!video||!stage||!form)return;
 const VW=1280,VH=720,SHOW_AT=8.0,PORTRAIT_STOP=5.5;
 // 影片裡畫好的元件位置（1280×720 座標，量自最後一格）
 const SPOT={account:[509,285,344,50],password:[509,355,344,51],accountEye:[812,295,34,30],passwordEye:[812,365,34,30],register:[418,445,123,44],login:[553,445,174,44],forgotBox:[738,445,123,44],message:[390,496,500,26]}; // 新影片最後一格量的（2026-11-17）
 const portrait=()=>{const r=stage.getBoundingClientRect();return r.height>r.width;};
 const hot=(cls,label,fn)=>{const b=document.createElement('button');b.type='button';b.className='login-hot '+cls;b.setAttribute('aria-label',label);b.onclick=fn;return b;};
 const place=(node,[x,y,w,h])=>{Object.assign(node.style,{left:x+'px',top:y+'px',width:w+'px',height:h+'px'});};
 let ready=false,failed=false;
 // 舊登入卡預設隱形（CSS），只有直式／影片壞掉／太久沒播到登入框時才打開 fallback
 const fallback=on=>stage.classList.toggle('login-video-fallback',on);
 const say=text=>{if(message)message.textContent=text;};
 const register=hot('login-hot-register','註冊帳號',()=>{const real=[...form.querySelectorAll('button')].find(b=>b.textContent==='建立測試帳號');if(real)real.click();else say('輸入帳號與密碼後按「登入」即可建立本機帳號。');});
 const forgot=()=>say('測試版尚未提供找回密碼，請聯絡管理員。');
 const EYE='<svg viewBox="0 0 24 24" width="100%" height="100%" aria-hidden="true"><path d="M12 5C6.5 5 2.7 9.4 1.5 12c1.2 2.6 5 7 10.5 7s9.3-4.4 10.5-7C21.3 9.4 17.5 5 12 5zm0 11.5A4.5 4.5 0 1 1 12 7.5a4.5 4.5 0 0 1 0 9zm0-2.3a2.2 2.2 0 1 0 0-4.4 2.2 2.2 0 0 0 0 4.4z" fill="#d8c79a"/></svg>';
 const eye=hot('login-hot-eye login-eye-icon','顯示或隱藏密碼',()=>{const p=document.querySelector('#login-password');p.type=p.type==='password'?'text':'password';});eye.innerHTML=EYE;
 const accEye=hot('login-hot-eye login-eye-icon','顯示帳號（帳號本來就是明碼）',()=>document.querySelector('#login-account')?.focus());accEye.innerHTML=EYE;
 // 2026-11-17 使用者：影片裡有兩個「忘記密碼」→ 移除下面那行字、藍色按鈕往下移。影片本身改不了，所以疊一張從最後一格做的補丁圖
 //  （assets/entry/login-forgot-patch.png：原按鈕位置補平、按鈕下移 50 格蓋住那行字），隨表單一起淡入。
 const patch=document.createElement('img');patch.className='login-patch';patch.alt='';patch.src='assets/entry/login-forgot-patch.png?v=1';
 // 2026-11-17 使用者：標題「這奇怪的天堂」移到兜帽人胸口那一帶 → 補丁圖（原位置換成 8.4 秒還沒出標題的畫面、標題下移 95 格）
 const titlePatch=document.createElement('img');titlePatch.className='login-patch';titlePatch.alt='';titlePatch.src='assets/entry/login-title-patch.png?v=1';
 const hots=[[register,SPOT.register],[hot('login-hot-forgot','忘記密碼',forgot),SPOT.forgotBox],[accEye,SPOT.accountEye],[eye,SPOT.passwordEye]]; // 新影片不需要舊版的標題／忘記密碼補丁圖
 function layout(){
  if(!stage.classList.contains('login-video-mode'))return;
  const r=stage.getBoundingClientRect(),s=Math.max(r.width/VW,r.height/VH),ox=(r.width-VW*s)/2,oy=(r.height-VH*s)/2;
  form.style.transform='translate('+ox+'px,'+oy+'px) scale('+s+')';
 }
 function enter(){
  if(ready||failed||portrait())return;ready=true;fallback(false);stage.classList.add('login-video-mode');
  place(document.querySelector('#login-account'),SPOT.account);place(document.querySelector('#login-password'),SPOT.password);place(document.querySelector('#login-submit'),SPOT.login);if(message)place(message,SPOT.message);
  for(const [node,spot] of hots){place(node,spot);if(!node.isConnected)node.classList.contains('login-patch')?form.prepend(node):form.append(node);}
  layout();setTimeout(()=>stage.classList.add('login-video-shown'),30); // 不用 requestAnimationFrame：背景分頁不會執行，表單會一直隱形
 }
 function leave(){ready=false;stage.classList.remove('login-video-mode','login-video-shown');form.style.transform='';for(const el of [document.querySelector('#login-account'),document.querySelector('#login-password'),document.querySelector('#login-submit'),message])if(el)el.removeAttribute('style');for(const [node] of hots)node.remove();}
 video.loop=false;video.removeAttribute('loop');
 // 影片配樂（2026-11-17 使用者：登入畫面只要影片配樂）：影片本身一律靜音，配樂用另一個音訊播放器放從影片抽出的 login-music.m4a。
 //  瀏覽器通常擋有聲自動播放，而玩家多半等登入框出來（影片已播完）才點 → 第一次點擊／按鍵時從影片當下進度（播完就從頭）開始放，
 //  停在登入畫面期間循環播放；離開登入畫面就停（遊戲音樂 music0 由 island-music.js 在登入畫面靜音）。
 const onLogin=()=>!document.querySelector('#login-screen')?.hidden;
 const bgm=new Audio('assets/entry/login-music-v2.m4a?v=1'); // 從影片抽出的音軌（tools/extract-audio.ps1，168KB）；直接載 12MB 影片會跟畫面搶頻寬、點擊後卡住
 bgm.loop=true;bgm.volume=.7;bgm.preload='auto';window.LoginBgm=bgm; // 除錯／檢查用
 let wantSound=false;
 const syncSound=()=>{if(!wantSound||!onLogin()||document.hidden){if(!bgm.paused)bgm.pause();return;}if(bgm.paused){if(!video.ended&&!video.paused)bgm.currentTime=video.currentTime;bgm.play().catch(()=>{});}};
 const firstGesture=()=>{if(!wantSound){wantSound=true;if(video.ended||video.paused)bgm.currentTime=0;}syncSound();}; // 手機觸控的 pointerdown 不算使用者操作，之後的 touchend／click 會再試一次
 for(const ev of ['pointerdown','pointerup','touchend','click','keydown'])document.addEventListener(ev,firstGesture,{passive:true,capture:true});
 document.addEventListener('visibilitychange',syncSound);setInterval(syncSound,500);
 video.muted=true;
 // 有些瀏覽器（互動分數高）允許有聲自動播放：先試一次，成功就跟影片同步開始
 bgm.play().then(()=>{wantSound=true;bgm.currentTime=video.currentTime;}).catch(()=>{});
 video.addEventListener('timeupdate',()=>{
  if(portrait()){if(video.currentTime>=PORTRAIT_STOP){if(!video.paused)video.pause();fallback(true);}if(ready)leave();return;}
  if(video.currentTime>=SHOW_AT)enter();
 });
 video.addEventListener('ended',()=>{if(!portrait())enter();});
 video.addEventListener('error',()=>{failed=true;leave();fallback(true);video.remove();});
 setTimeout(()=>{if(!ready&&(failed||video.readyState<3))fallback(true);},20000); // 網路太慢 20 秒還沒播到登入框，先給簡易登入卡
 // 已經播完（例如登出回到登入畫面）就直接停在最後一格；直式↔橫式切換時重新判斷
 addEventListener('resize',()=>{if(portrait()){if(ready)leave();if(video.currentTime>=PORTRAIT_STOP||failed)fallback(true);return;}
  // 轉回橫式：拿掉簡易登入卡，直式時停住的影片繼續播到畫好的登入框
  if(!failed){fallback(false);if(video.paused&&!video.ended&&video.currentTime<SHOW_AT&&!document.querySelector('#login-screen')?.hidden)video.play().catch(()=>{});}
   if(video.ended||video.currentTime>=SHOW_AT)enter();layout();});
 // 頁面載完（CSS 就位）再判斷一次直／橫式，避免載入途中誤判成直式而把影片停住
 addEventListener('load',()=>dispatchEvent(new Event('resize')));
})();
