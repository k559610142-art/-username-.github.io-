// 頭頂名牌＋HP／MP 條（2026-11-12，使用者要「人物 ID 跟頭頂血條在角色正上方」）
//  水平：對齊角色腳下的基準點（#actor），所以永遠在角色正上方，不會跟著武器、動作左右飄
//  垂直：讀目前這一格角色圖的不透明範圍（每張圖算一次存起來），放在頭頂上方一點，並做平滑避免動作時上下跳
//  名字沿用原本 #actor>small 的文字（原本那行藏起來），HP 紅條在上、MP 藍條在下
(()=>{
 const actor=document.querySelector('#actor');if(!actor)return;
 const css=document.createElement('style');css.textContent=`
 #actor>small{visibility:hidden!important}
 #actor>.ovh{position:absolute;left:0;top:0;transform:translate(-50%,-100%);display:flex;flex-direction:column;align-items:center;gap:2px;pointer-events:none;z-index:4;white-space:nowrap}
 #actor>.ovh[hidden]{display:none}
 #actor>.ovh .nm{font:bold 12px/1.1 sans-serif;color:#fff;text-shadow:-1px 0 #000,1px 0 #000,0 -1px #000,0 1px #000,0 0 3px #000}
 #actor>.ovh .bars{width:54px;padding:1px;background:#000c;border:1px solid #0009;box-shadow:0 0 0 1px #5a4a30aa;display:flex;flex-direction:column;gap:1px}
 #actor>.ovh .bars i{display:block;height:3px;background:#2a1414}
 #actor>.ovh .bars i.m{background:#121a2c}
 #actor>.ovh .bars i b{display:block;height:100%;width:var(--p,100%);transition:width .2s}
 #actor>.ovh .bars i.h b{background:linear-gradient(#ff6a5a,#c4231b)}
 #actor>.ovh .bars i.m b{background:linear-gradient(#6fb4ff,#2457c9)}
 `;document.head.append(css);
 const el=(t,c)=>{const e=document.createElement(t);if(c)e.className=c;return e};
 const box=el('div','ovh'),nm=el('div','nm'),bars=el('div','bars'),hI=el('i','h'),mI=el('i','m'),hB=el('b'),mB=el('b');
 hI.append(hB);mI.append(mB);bars.append(hI,mI);box.append(nm,bars);box.hidden=true;actor.append(box);
 // 每張角色圖：不透明像素的上緣（佔原圖高度的比例）
 const tops=new Map(),probe=document.createElement('canvas'),pen=probe.getContext('2d',{willReadFrequently:true});
 function topOf(img){const src=img.currentSrc||img.src;if(!src||!img.complete||!img.naturalWidth)return null;if(tops.has(src))return tops.get(src);
  let t=null;try{const w=probe.width=Math.min(img.naturalWidth,256),h=probe.height=Math.round(img.naturalHeight*w/img.naturalWidth);pen.clearRect(0,0,w,h);pen.drawImage(img,0,0,w,h);
   const d=pen.getImageData(0,0,w,h).data;outer:for(let y=0;y<h;y++)for(let x=0;x<w;x++)if(d[(y*w+x)*4+3]>40){t=y/h;break outer}}catch{t=null}
  tops.set(src,t);if(tops.size>600)tops.delete(tops.keys().next().value);return t}
 // 目前畫出來的角色圖（變身時用變身圖）
 function shownImage(){const morph=actor.querySelector('.transform-morph');if(morph&&!morph.hidden){const m=[...morph.querySelectorAll('img')].find(i=>!i.classList.contains('transform-morph-shadow')&&i.offsetWidth);if(m)return m}
  return [...actor.querySelectorAll('img.character-main')].find(i=>i.getBoundingClientRect().height>0)||null}
 let y=null;
 function frame(){
  const playing=window.gameFlowState==='playing'&&actor.offsetParent!==null;box.hidden=!playing;
  if(playing){
   const small=actor.querySelector(':scope>small');nm.textContent=small?.textContent||window.activeCharacterName||'';
   const pct=(v,m)=>(m>0?Math.max(0,Math.min(100,v/m*100)):0)+'%';
   if(typeof hp!=='undefined'){hB.style.setProperty('--p',pct(hp,maxHp));mB.style.setProperty('--p',pct(mp,maxMp))}
   const img=shownImage(),a=actor.getBoundingClientRect();let target=null;
   if(img){const r=img.getBoundingClientRect(),t=topOf(img);if(r.height&&t!==null){
    // object-fit:contain 的實際畫面範圍
    const s=Math.min(r.width/img.naturalWidth,r.height/img.naturalHeight),oy=(r.height-img.naturalHeight*s)/2;target=r.top+oy+t*img.naturalHeight*s-a.top-3}}
   if(target===null){const f=parseFloat(getComputedStyle(actor).getPropertyValue('--character-size-factor'))||1;target=-70*f}
   y=y===null||Math.abs(target-y)>80?target:y+(target-y)*.25;box.style.top=y.toFixed(1)+'px'}
  requestAnimationFrame(frame)}
 requestAnimationFrame(frame);
})();
