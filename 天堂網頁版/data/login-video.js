// 登入畫面影片（2026-11-16 使用者提供 assets/entry/login-video.mp4，1280×720、10 秒）：
//  影片播一次停在最後一格；約第 8.3～9.2 秒影片本身會淡入標題與畫好的帳號／密碼欄、註冊／登入／忘記密碼按鈕，
//  這裡把遊戲真正的輸入框與按鈕（透明）疊到影片畫的位置上。座標以影片 1280×720 為準，依 object-fit:cover 換算。
//  直式手機畫面會把影片裡的登入框裁掉，所以直式時停在第 5.5 秒（還沒出現畫好的介面）並沿用原本的登入卡。
(()=>{
 const video=document.querySelector('.login-video'),stage=document.querySelector('.login-stage'),form=document.querySelector('#login-form'),message=document.querySelector('#login-message');
 if(!video||!stage||!form)return;
 const VW=1280,VH=720,SHOW_AT=8.6,PORTRAIT_STOP=5.5;
 // 影片裡畫好的元件位置（1280×720 座標，量自最後一格）
 const SPOT={account:[506,537,206,22],password:[506,576,206,22],accountEye:[712,535,22,26],passwordEye:[712,574,22,26],forgotBox:[749,624,112,32],patch:[738,564,136,102],titlePatch:[400,8,480,262],register:[439,619,92,36],login:[548,618,172,38],forgotText:[748,624,78,26],message:[330,474,604,26]};
 const portrait=()=>{const r=stage.getBoundingClientRect();return r.height>r.width;};
 const hot=(cls,label,fn)=>{const b=document.createElement('button');b.type='button';b.className='login-hot '+cls;b.setAttribute('aria-label',label);b.onclick=fn;return b;};
 const place=(node,[x,y,w,h])=>{Object.assign(node.style,{left:x+'px',top:y+'px',width:w+'px',height:h+'px'});};
 let ready=false,failed=false;
 // 舊登入卡預設隱形（CSS），只有直式／影片壞掉／太久沒播到登入框時才打開 fallback
 const fallback=on=>stage.classList.toggle('login-video-fallback',on);
 const say=text=>{if(message)message.textContent=text;};
 const register=hot('login-hot-register','註冊帳號',()=>{const real=[...form.querySelectorAll('button')].find(b=>b.textContent==='建立測試帳號');if(real)real.click();else say('輸入帳號與密碼後按「登入」即可建立本機帳號。');});
 const forgot=()=>say('測試版尚未提供找回密碼，請聯絡管理員。');
 const eye=hot('login-hot-eye','顯示或隱藏密碼',()=>{const p=document.querySelector('#login-password');p.type=p.type==='password'?'text':'password';});
 // 2026-11-17 使用者：影片裡有兩個「忘記密碼」→ 移除下面那行字、藍色按鈕往下移。影片本身改不了，所以疊一張從最後一格做的補丁圖
 //  （assets/entry/login-forgot-patch.png：原按鈕位置補平、按鈕下移 50 格蓋住那行字），隨表單一起淡入。
 const patch=document.createElement('img');patch.className='login-patch';patch.alt='';patch.src='assets/entry/login-forgot-patch.png?v=1';
 // 2026-11-17 使用者：標題「這奇怪的天堂」移到兜帽人胸口那一帶 → 補丁圖（原位置換成 8.4 秒還沒出標題的畫面、標題下移 95 格）
 const titlePatch=document.createElement('img');titlePatch.className='login-patch';titlePatch.alt='';titlePatch.src='assets/entry/login-title-patch.png?v=1';
 const hots=[[titlePatch,SPOT.titlePatch],[patch,SPOT.patch],[register,SPOT.register],[hot('login-hot-forgot','忘記密碼',forgot),SPOT.forgotBox],[eye,SPOT.passwordEye]];
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
 const bgm=new Audio('assets/entry/login-music.m4a?v=1'); // 從影片抽出的音軌（tools/extract-audio.ps1，168KB）；直接載 12MB 影片會跟畫面搶頻寬、點擊後卡住
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
