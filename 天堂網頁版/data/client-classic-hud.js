// 原版底部介面：天地劫天堂客戶端 Sprite.pak 的 431.img（640×149，龍頭欄＋對話＋F5～F12 快捷格＋功能鈕）。
// 橫向畫面（遊戲畫面寬 ≥ 600 且寬 > 高）啟用，高度最多佔畫面 28%；手機直向維持原本介面。
// 座標以原圖像素表示，依底部介面實際寬度換算。
(()=>{
 const W=640,H=149,MAXW=900,game=document.querySelector('.game');
 const css=document.createElement('style');css.textContent=`
 .classic-hud-bar{display:none}
 .game.classic-hud .classic-hud-bar{display:block;position:absolute;left:var(--cb-l);bottom:0;width:var(--cb-w);height:var(--cb-h);background:url('assets/interface/client-ui/431.png') 0 0/100% 100% no-repeat;z-index:6;pointer-events:none;container-type:inline-size}
 .classic-hud-bar>*{position:absolute;box-sizing:border-box;pointer-events:auto}
 .classic-hud-text{display:flex;align-items:center;margin:0;padding:0 1.5cqw 0 1cqw;color:#f1e6c4;font-size:1.75cqw;font-weight:bold;line-height:1;white-space:nowrap;overflow:hidden;text-shadow:0 0 2px #000,1px 1px 0 #000;pointer-events:none}
 .classic-hud-text.center{justify-content:center}
 .classic-hud-text.between{justify-content:space-between}
 .classic-hud-gauge{overflow:hidden;border-radius:2px;pointer-events:none}
 .classic-hud-gauge>i{position:absolute;inset:0;width:var(--fill,100%);transition:width .2s}
 .classic-hud-gauge.hp>i{background:linear-gradient(#e0544a,#9b1611 55%,#6c0d0a)}
 .classic-hud-gauge.mp>i{background:linear-gradient(#5a8be6,#1f47a8 55%,#142f73)}
 .classic-hud-gauge.orange>i{background:linear-gradient(#f2a24c,#c56514 60%,#8b430c)}
 .classic-hud-gauge.green>i{background:linear-gradient(#8fd06a,#3f8a2b 60%,#2a5f1d)}
 .classic-hud-gauge>span{position:absolute;inset:0;display:flex;align-items:center;justify-content:center;color:#fff;font-size:1.7cqw;font-weight:bold;text-shadow:0 0 2px #000,1px 1px 0 #000;white-space:nowrap}
 .classic-hud-button{border:0;padding:0;margin:0;background:transparent;cursor:pointer;min-height:0}
 .classic-hud-button:hover,.classic-hud-button:focus-visible{outline:1px solid #f0d27c;outline-offset:-1px;background:#fff2}
 /* 既有元件搬到原圖位置 */
 .game.classic-hud>.hud,.game.classic-hud>.nav,.game.classic-hud>.exp-track,.game.classic-hud .reference-message-tabs{display:none!important}
 .game.classic-hud>.reference-messages{position:absolute!important;left:calc(var(--cb-l) + var(--cb-w)*118/${W})!important;top:auto!important;right:auto!important;bottom:calc(var(--cb-h)*16/${H})!important;width:calc(var(--cb-w)*362/${W})!important;height:calc(var(--cb-h)*86/${H})!important;max-height:none!important;margin:0!important;padding:2px 4px!important;background:transparent!important;border:0!important;box-shadow:none!important;z-index:7;overflow:hidden}
 .game.classic-hud>.reference-messages .reference-message-list{height:100%!important;max-height:none!important;overflow-y:auto!important;font-size:calc(var(--cb-w)*11/${W})!important;line-height:1.35!important;background:transparent!important}
 .game.classic-hud>.quick-slots{position:absolute!important;left:calc(var(--cb-l) + var(--cb-w)*500/${W})!important;top:auto!important;right:auto!important;bottom:calc(var(--cb-h)*30/${H})!important;width:calc(var(--cb-w)*138/${W})!important;height:calc(var(--cb-h)*69/${H})!important;transform:none!important;margin:0!important;padding:0!important;background:transparent!important;border:0!important;z-index:7;display:block!important}
 .game.classic-hud>.quick-slots>.quick-expanded-row:first-child{display:grid!important;grid-template-columns:repeat(4,1fr)!important;grid-template-rows:repeat(2,1fr)!important;gap:0!important;width:100%!important;height:100%!important;margin:0!important;padding:0!important}
 .game.classic-hud>.quick-slots>.quick-expanded-row:not(:first-child),.game.classic-hud>.quick-slots>.quick-expand-arrow,.game.classic-hud>.quick-slots>.quick-expanded-row:first-child>.combat-quick-slot:nth-child(n+9){display:none!important}
 .game.classic-hud>.quick-slots .combat-quick-slot{width:auto!important;height:auto!important;min-width:0!important;min-height:0!important;margin:0!important;padding:6%!important;background:transparent!important;border:0!important;box-shadow:none!important;font-size:calc(var(--cb-w)*9/${W})!important;color:#d9cba2}
 .game.classic-hud>.quick-slots .combat-quick-slot.empty-quick-slot{color:transparent!important}
 .game.classic-hud>.quick-slots .combat-quick-slot .quick-key{display:none!important}
 .game.classic-hud>.quick-slots .combat-quick-slot img{width:100%!important;height:100%!important;object-fit:contain}
 .game.classic-hud>.bottom .actions,.game.classic-hud>.bottom .pad{bottom:calc(var(--cb-h) + 8px)!important}
 .game.classic-hud>.auto-potion-hud{top:12px!important}
 `;document.head.append(css);
 const bar=document.createElement('div');bar.className='classic-hud-bar';bar.setAttribute('aria-label','狀態列');game.append(bar);
 const put=(el,[x,y,w,h])=>{el.style.left=x/W*100+'%';el.style.top=y/H*100+'%';el.style.width=w/W*100+'%';el.style.height=h/H*100+'%';bar.append(el);return el};
 const text=(box,cls='')=>put(Object.assign(document.createElement('p'),{className:'classic-hud-text '+cls}),box);
 function gauge(box,kind){const g=put(document.createElement('div'),box);g.className='classic-hud-gauge '+kind;g.append(document.createElement('i'),document.createElement('span'));return g}
 const level=text([2,49,108,19],'between'),ac=text([19,74,30,15],'center'),mr=text([66,74,44,15],'center');
 const hpG=gauge([124,28,170,13],'hp'),mpG=gauge([343,28,137,13],'mp'),weightG=gauge([20,95,89,12],'orange'),foodG=gauge([20,115,89,12],'orange'),expG=gauge([20,134,89,12],'green');
 // 功能鈕（原圖上的 7 個圖示）
 const actions=[['說明',()=>toast('原版介面：人物、魔法、道具欄、選單、設定、地圖。快捷欄 F5～F12 對應右下 8 格。')],['人物屬性',()=>panel('status')],['魔法',()=>panel('magic')],['道具欄',()=>panel('bag')],
  ['選單',()=>document.querySelectorAll('.nav button')[2]?.click()],['設定',()=>panel('settings')],['地圖',()=>document.querySelector('#overview')?.onclick?.()]];
 actions.forEach(([label,fn],i)=>{const b=put(document.createElement('button'),[497+i*20.1,128,20,20]);b.className='classic-hud-button';b.type='button';b.title=label;b.setAttribute('aria-label',label);b.onclick=fn});
 function expInfo(){const lv=window.activeCharacterLevel||1,exp=window.activeCharacterExperience||0,t=typeof killRewardData!=='undefined'?killRewardData.thresholds:null;const a=t?.find(r=>r[0]===lv)?.[1],b=t?.find(r=>r[0]===lv+1)?.[1];return Number.isFinite(a)&&Number.isFinite(b)&&b>a?Math.max(0,Math.min(100,(exp-a)/(b-a)*100)):0}
 function weightPct(){const a=window.playerAttributes||{};let t=0;for(const e of window.OwnedInventory?.items||[])t+=(e.item?.weight??0)*(e.count||1);const max=1500+Math.floor(((a.str||0)+(a.con||0)-18)/2)*150;return max>0?Math.min(100,Math.round(t/1000/max*100)):0}
 function setGauge(g,pct,label){g.style.setProperty('--fill',Math.max(0,Math.min(100,pct))+'%');g.lastChild.textContent=label}
 function refresh(){if(!game.classList.contains('classic-hud')||window.gameFlowState!=='playing')return;const e=expInfo();
  level.innerHTML='';level.append('等級:'+(window.activeCharacterLevel||1),Object.assign(document.createElement('span'),{textContent:e.toFixed(2)+'%'}));
  const d=window.NativeCombatRules?.defense?.()||{};ac.textContent=typeof previewArmorClass==='function'?previewArmorClass():(d.ac??10);mr.textContent=d.mr||0;
  setGauge(hpG,hp/Math.max(1,maxHp)*100,'體力: '+hp+'/'+maxHp);setGauge(mpG,mp/Math.max(1,maxMp)*100,'魔力: '+mp+'/'+maxMp);
  const w=weightPct();setGauge(weightG,w,'負重 '+w+'%');setGauge(foodG,100,'飽食');setGauge(expG,e,'經驗 '+e.toFixed(2)+'%')}
 // 版面：橫向畫面（寬 ≥ 600 且寬 > 高）就用原版底部介面；寬度最多 900、高度最多佔畫面 28%，保持原圖比例
 function layout(){const r=game.getBoundingClientRect(),on=r.width>=600&&r.width>r.height;game.classList.toggle('classic-hud',on);if(!on)return;const w=Math.min(r.width,MAXW,r.height*.28*W/H),h=w*H/W;game.style.setProperty('--cb-w',w+'px');game.style.setProperty('--cb-h',h+'px');game.style.setProperty('--cb-l',(r.width-w)/2+'px');refresh()}
 new ResizeObserver(layout).observe(game);layout();
 const baseStats=stats;stats=function(...args){const out=baseStats.apply(this,args);refresh();return out};
 setInterval(refresh,1000);
})();
