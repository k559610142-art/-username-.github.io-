// 設定視窗：照網頁奇岩城畫面排版自寫（分頁＋分區標題＋開關列）。內容沿用遊戲原本的設定控制項，只重新排列與換樣式。
//  系統：一般（視窗歸位、重設快捷欄）／聲音（背景音樂、戰鬥音效）／畫面（螢幕尺寸、全螢幕、字體大小縮放、底部介面 水晶球式／奇岩式）
//  狩獵：掛機索敵範圍
(()=>{
 const css=document.createElement('style');css.textContent=`
 .reference-game .floating-game-window.floating-settings.qy-settings{border:0!important;border-radius:3px;padding:0 7px 7px;box-sizing:border-box;
  background:linear-gradient(90deg,#6e5a33 0,#c9a85e 2px,#3b3020 4px,transparent 5px,transparent calc(100% - 5px),#3b3020 calc(100% - 4px),#c9a85e calc(100% - 2px),#6e5a33 100%),linear-gradient(#17191c,#121416)!important;
  box-shadow:0 0 0 1px #000,0 8px 24px #000b!important;display:flex;flex-direction:column;color:#d8cfb8}
 .qy-settings .floating-window-header{flex:none;height:30px!important;margin:0 -7px;padding:0!important;justify-content:center!important;position:relative;background:linear-gradient(#2c2a26,#1b1a18)!important;border-bottom:1px solid #5b4b2c!important;box-shadow:inset 0 1px 0 #6b5a36}
 .qy-settings .floating-window-header h2{font-size:15px!important;letter-spacing:6px;color:#efd9a4!important}
 .qy-settings .floating-window-header button{position:absolute;right:5px;top:4px;width:24px!important;min-height:0!important;height:21px;padding:0!important;font-size:13px!important;line-height:19px;background:linear-gradient(#4a3d26,#2a2216)!important;border:1px solid #9b8150!important;border-radius:2px;color:#f0dcae!important}
 .qy-set-tabs{display:flex;gap:2px;margin-top:6px;flex:none}
 .qy-set-tabs button{flex:1;min-width:0;min-height:24px!important;padding:2px 0!important;font-size:12px!important;background:linear-gradient(#2a2b2e,#1e1f22)!important;color:#9d9583!important;border:1px solid #3c3a35!important;border-radius:2px!important}
 .qy-set-tabs button[aria-selected=true]{background:linear-gradient(#5e4c2a,#3b2f1b)!important;color:#ffe2a0!important;border-color:#a3864d!important}
 .qy-settings .floating-window-content{flex:1;min-height:0;height:auto!important;padding:4px 0 0!important;overflow:auto;scrollbar-width:thin;scrollbar-color:#7a6740 #121416}
 .qy-set-page[hidden]{display:none!important}
 .qy-set-head{margin:8px 2px 3px;font-size:11px;color:#a08a5c;letter-spacing:1px}
 .qy-set-group{background:#0d0f11;border:1px solid #2e2c28;border-radius:3px;overflow:hidden}
 .qy-set-row{display:flex;align-items:center;gap:8px;min-height:32px;padding:3px 8px;border-bottom:1px solid #1f1e1b;font-size:12.5px}
 .qy-set-row:last-child{border-bottom:0}
 .qy-set-row .ico{flex:none;width:18px;text-align:center}
 .qy-set-row .txt{flex:1;min-width:0}
 .qy-set-row small{display:block;font-size:10.5px;color:#857d6a;line-height:1.35}
 .qy-set-row select,.qy-set-row input{min-height:0!important;height:24px;padding:0 4px!important;font-size:12px;background:#17191c!important;border:1px solid #4a4336!important;border-radius:2px;color:#e6dcc2!important}
 .qy-set-row input[type=range]{width:92px;padding:0!important;accent-color:#d0a24f}
 .qy-set-row .val{width:34px;text-align:right;color:#efe6cf;font-variant-numeric:tabular-nums}
 .qy-set-row .act{min-height:0!important;height:24px;padding:0 10px!important;font-size:12px;background:linear-gradient(#3a3020,#221c13)!important;border:1px solid #8a6f40!important;border-radius:2px;color:#f0dcae!important}
 .qy-switch{position:relative;flex:none;width:38px;height:20px;min-height:0!important;padding:0!important;border-radius:10px!important;border:1px solid #5a4b30!important;background:#2a2620!important;cursor:pointer}
 .qy-switch::after{content:'';position:absolute;left:2px;top:2px;width:14px;height:14px;border-radius:50%;background:#7c735f;transition:left .15s,background .15s}
 .qy-switch[aria-checked=true]{background:linear-gradient(#c79a45,#8c6421)!important;border-color:#d8b56a!important}
 .qy-switch[aria-checked=true]::after{left:20px;background:#fff3d2}
 .qy-set-hidden{display:none!important}
 main.game[data-font-scale] :is(.qy-set-row,.healing-priority-line,.reference-messages,.oh-msg .list,.quest-drawer,.assist-header h2){font-size:calc(12.5px * var(--game-font-scale))!important}
 main.game[data-font-scale] :is(.qy-set-head,.qy-set-row small,.assist-note,.auto-potion-note,.hud .oh-def){font-size:calc(11px * var(--game-font-scale))!important}
 main.game[data-font-scale] :is(.qy-set-tabs button,.qy-set-row select,.qy-set-row .act,.healing-priority-line select,.healing-priority-line input[type=number],.hud strong,.oh-msg .tabs button,.oh-msg form input,.oh-msg form button){font-size:calc(12px * var(--game-font-scale))!important}
 main.game[data-font-scale] :is(.floating-window-header h2,.native-dialog,.craft-detail,.game-catalog-detail){font-size:calc(15px * var(--game-font-scale))!important}
 main.game[data-font-scale] :is(.floating-window-content,.craft-grid,.game-catalog-card,.location){font-size:calc(13px * var(--game-font-scale))!important}
 main.game[data-font-scale] .hud .bar span{font-size:calc(10px * var(--game-font-scale))!important}
 main.game[data-font-scale] .qy-set-row select{max-width:min(49%,220px)}
 main.game[data-font-scale] .qy-set-row :is(select,.act){height:auto;min-height:24px!important}
 main.game[data-font-scale] .qy-set-row .txt{overflow-wrap:anywhere}
 `;document.head.append(css);

 const el=(tag,cls,text)=>uiElement(tag,cls,text);
 const game=document.querySelector('.game');
 let tab='system';
 const fontKey='lineage-ui-font-size',fontSizes=[['90','較小（90%）'],['100','標準（100%）'],['115','較大（115%）'],['130','特大（130%）']];
 let fontSize='100';
 try{const saved=localStorage.getItem(fontKey);if(fontSizes.some(([value])=>value===saved))fontSize=saved;}catch{}
 function applyFontSize(value){
  fontSize=value;
  if(value==='100'){delete game.dataset.fontScale;game.style.removeProperty('--game-font-scale');}
  else{game.dataset.fontScale=value;game.style.setProperty('--game-font-scale',Number(value)/100);}
 }
 applyFontSize(fontSize);
 function fontSelect(){
  const select=el('select');
  select.setAttribute('aria-label','字體大小縮放');
  for(const [value,label] of fontSizes)select.append(new Option(label,value,false,value===fontSize));
  select.onchange=()=>{applyFontSize(select.value);try{localStorage.setItem(fontKey,fontSize);}catch{}};
  return select;
 }
 function row(icon,label,note,...controls){const r=el('div','qy-set-row');const t=el('div','txt',label);if(note)t.append(el('small','',note));r.append(el('span','ico',icon),t,...controls);return r}
 function action(text,fn){const b=el('button','act',text);b.type='button';b.onclick=fn;return b}
 // 原本的開關按鈕（文字是「遊戲音樂 開啟／關閉」）改成開關；點開關就按原本的按鈕
 function switchFor(source){const s=el('button','qy-switch');s.type='button';s.setAttribute('role','switch');const sync=()=>s.setAttribute('aria-checked',String(/開啟|ON/i.test(source.textContent)));sync();
  s.setAttribute('aria-label',source.textContent.replace(/\s*(開啟|關閉)\s*$/,''));s.onclick=()=>{source.click();setTimeout(sync,0)};return s}
 function transform(frame){const content=frame.querySelector('.floating-window-content');if(!content||content.dataset.qy)return;content.dataset.qy='1';frame.classList.add('qy-settings');
  const h=frame.querySelector('.floating-window-header');if(h){h.querySelector('h2').textContent='設定';const x=h.querySelector('button');if(x)x.textContent='✕'}
  const nodes=[...content.children],byText=re=>nodes.flatMap(n=>n.matches('button')?[n]:[...n.querySelectorAll('button')]).find(b=>re.test(b.textContent));
  const screen=content.querySelector('.screen-settings'),screenSelect=screen?.querySelector('select'),full=screen?byText(/全螢幕/):null,
   music=byText(/遊戲音樂/),sfx=byText(/戰鬥音效/),resetQuick=byText(/重設快捷欄/),
   rangeInput=nodes.find(n=>n.matches?.('label')&&n.querySelector('input'))?.querySelector('input'),cameraNote=nodes.find(n=>n.tagName==='P')?.textContent.trim();
  const keep=el('div','qy-set-hidden');keep.append(...nodes);   // 原本的控制項保留在隱藏區，事件都還在
  const sys=el('div','qy-set-page'),hunt=el('div','qy-set-page');
  const g1=el('div','qy-set-group');
  g1.append(row('🔄','視窗歸位','把開著的視窗收回預設位置',action('歸位',()=>{const open=FloatingWindows.types.filter(t=>t!=='settings');for(const t of open)FloatingWindows.close(t);for(const t of open)panel(t==='equipment'?'status':t)})));
  if(resetQuick)g1.append(row('⌨️','重設快捷欄','',action('重設',()=>resetQuick.click())));
  sys.append(el('div','qy-set-head','一般'),g1);
  const g2=el('div','qy-set-group');
  if(music)g2.append(row('🎵','背景音樂','',switchFor(music)));
  if(sfx)g2.append(row('🔊','戰鬥音效','',switchFor(sfx)));
  if(g2.children.length)sys.append(el('div','qy-set-head','聲音'),g2);
  const g3=el('div','qy-set-group');
  if(screenSelect)g3.append(row('🖥️','螢幕尺寸','',screenSelect));
  if(full)g3.append(row('⛶','全螢幕','手機以橫式操作為主',action('切換',()=>full.click())));
  g3.append(row('🔤','字體大小縮放','調整遊戲訊息、狀態列與面板文字',fontSelect()));
  if(window.HudStyle){const sel=el('select');for(const [v,l]of [['orb','水晶球式'],['classic','奇岩式']]){const o=el('option','',l);o.value=v;sel.append(o)}sel.value=HudStyle.current;sel.setAttribute('aria-label','底部介面');sel.onchange=()=>HudStyle.set(sel.value);g3.append(row('🧭','底部介面','橫向畫面的狀態列樣式',sel))}
  if(window.PowerSaving){const sw=action(PowerSaving.enabled?'開啟':'關閉',()=>{PowerSaving.setEnabled(!PowerSaving.enabled);sw.textContent=PowerSaving.enabled?'開啟':'關閉';sw.setAttribute('aria-checked',String(PowerSaving.enabled))});sw.setAttribute('role','switch');sw.setAttribute('aria-label','省電模式（20 FPS）');sw.setAttribute('aria-checked',String(PowerSaving.enabled));g3.append(row('🔋','省電模式','限制畫面更新為每秒 20 幀',sw))}
  // 2026-11-19 效能監看（perf-hud.js）：原本加在舊設定區，被這裡藏起來了
  if(window.PerfHud){const sw=action(PerfHud.on?'開啟':'關閉',()=>{PerfHud.setOn(!PerfHud.on);sw.textContent=PerfHud.on?'開啟':'關閉';sw.setAttribute('aria-checked',String(PerfHud.on))});sw.setAttribute('role','switch');sw.setAttribute('aria-label','效能監看');sw.setAttribute('aria-checked',String(PerfHud.on));g3.append(row('📊','效能監看','畫面上方顯示每秒格數與耗時，回報 lag 用',sw))}
  // 2026-11-21 傷害數字（damage-numbers.js）
  if(window.DamageNumbers){const sw=action(DamageNumbers.on?'開啟':'關閉',()=>{DamageNumbers.setOn(!DamageNumbers.on);sw.textContent=DamageNumbers.on?'開啟':'關閉';sw.setAttribute('aria-checked',String(DamageNumbers.on))});sw.setAttribute('role','switch');sw.setAttribute('aria-label','傷害數字');sw.setAttribute('aria-checked',String(DamageNumbers.on));g3.append(row('💥','傷害數字','打怪與被打時頭上顯示傷害',sw))}
  if(cameraNote)g3.append(row('🎥','鏡頭',cameraNote));
  sys.append(el('div','qy-set-head','畫面'),g3);
  const g4=el('div','qy-set-group');
  if(rangeInput){const val=el('span','val',rangeInput.value+' 格');const slider=el('input');slider.type='range';slider.min=rangeInput.min||'1';slider.max=rangeInput.max||'64';slider.step=rangeInput.step||'1';slider.value=rangeInput.value;
   slider.setAttribute('aria-label','掛機索敵範圍');slider.oninput=()=>{val.textContent=slider.value+' 格'};slider.onchange=()=>{rangeInput.value=slider.value;rangeInput.dispatchEvent(new Event('input',{bubbles:true}));rangeInput.dispatchEvent(new Event('change',{bubbles:true}))};
   g4.append(row('🎯','掛機索敵範圍','AUTO 時會往多遠的怪物走過去',slider,val))}
  if(g4.children.length)hunt.append(el('div','qy-set-head','AUTO 掛機'),g4);else hunt.append(el('div','qy-set-head','目前沒有狩獵設定。'));
  const pages={system:sys,hunt},tabs=el('div','qy-set-tabs');
  for(const [k,l]of [['system','系統'],['hunt','狩獵']]){const b=el('button','',l);b.type='button';b.setAttribute('aria-selected',String(k===tab));b.onclick=()=>{tab=k;for(const x of tabs.children)x.setAttribute('aria-selected',String(x===b));for(const [pk,p]of Object.entries(pages))p.hidden=pk!==k};tabs.append(b)}
  for(const [pk,p]of Object.entries(pages))p.hidden=pk!==tab;
  content.replaceChildren(sys,hunt,keep);content.before(tabs)}
 new MutationObserver(()=>{for(const f of game.querySelectorAll('.floating-settings'))transform(f)}).observe(game,{childList:true,subtree:true});
})();
