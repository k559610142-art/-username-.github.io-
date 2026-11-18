// 新版本提示（2026-11-18 使用者：iPhone 主畫面安裝版一直跑舊版）：
//  定期用 no-store 抓一次 index.html，比對裡面所有 data/*.js、*.css 的 ?v= 版本號和目前頁面載入的是否相同；
//  不同就在畫面上方顯示「有新版本，點這裡更新」，按下去用帶時間參數的網址重新載入（避開 index.html 的快取）。
//  遊戲中只顯示提示，不會自動重新整理（避免打怪打到一半被中斷）。登入畫面左下角顯示目前版本代碼。
(()=>{
 const pick=html=>[...html.matchAll(/data\/[\w-]+\.(?:js|css)\?v=[^"'\s>]+/g)].map(m=>m[0]).sort().join('|');
 const mine=pick([...document.querySelectorAll('script[src],link[rel=stylesheet][href]')].map(e=>'"'+(e.getAttribute('src')||e.getAttribute('href'))+'"').join(' '));
 let hash=0;for(const c of mine)hash=(hash*31+c.charCodeAt(0))|0;const code=(hash>>>0).toString(36).slice(0,6);
 const css=document.createElement('style');css.textContent=
  '.app-update-bar{position:fixed;left:50%;top:max(8px,env(safe-area-inset-top));transform:translateX(-50%);z-index:10000;display:flex;align-items:center;gap:10px;padding:8px 14px;border:1px solid #d8b56a;border-radius:20px;background:#1d160cf0;color:#ffe7ad;font:600 14px system-ui;box-shadow:0 4px 16px #000c;cursor:pointer;max-width:calc(100% - 24px)}'+
  '.app-update-bar button{min-height:30px;padding:2px 12px;border:1px solid #d8b56a;border-radius:14px;background:linear-gradient(#7a6033,#45351c);color:#fff3d2;font:inherit}'+
  '.app-version{position:fixed;left:max(8px,env(safe-area-inset-left));bottom:max(6px,env(safe-area-inset-bottom));z-index:101;font:11px system-ui;color:#a89a7a99;pointer-events:none}';
 document.head.append(css);
 const ver=document.createElement('div');ver.className='app-version';ver.textContent='版本 '+code;document.body.append(ver);
 setInterval(()=>{ver.hidden=window.gameFlowState==='playing'||window.gameFlowState==='creation';},1000); // 登入畫面、選擇人物畫面都顯示版本代碼（方便確認手機是不是新版）
 let bar=null;
 function show(){if(bar)return;bar=document.createElement('div');bar.className='app-update-bar';bar.setAttribute('role','status');
  const b=document.createElement('button');b.type='button';b.textContent='更新';bar.append('有新版本可以更新',b);
  bar.onclick=()=>{const u=new URL(location.href);u.searchParams.set('u',Date.now().toString(36));location.replace(u.toString());};document.body.append(bar);}
 async function check(){if(bar||document.hidden||!navigator.onLine)return;try{const r=await fetch('index.html?check='+Date.now(),{cache:'no-store'});if(!r.ok)return;const have=new Set(mine.split('|')),latest=pick(await r.text()).split('|').filter(Boolean);if(latest.length>20&&latest.some(x=>!have.has(x)))show();}catch{}} // 只看「新網頁有、目前沒載入的版本號」，執行中動態加的腳本不影響
 setTimeout(check,4000);setInterval(check,5*60*1000);document.addEventListener('visibilitychange',()=>{if(!document.hidden)check();});
 window.AppUpdate={check,get version(){return code;}};
})();
