// 水晶球式底部介面：照使用者 2026-11-12 設計的介面圖與素材（assets/interface/orb-hud/，由 tools/orb-hud-cut.ps1 從素材總圖切出、去格紋背景、擦掉寫死的文字）
//  左下：遊戲訊息／對話框（分頁＋訊息＋金框輸入列）
//  中下：左邊 HP 紅水晶、右邊 MP 藍水晶（數值用文字疊上，空的部分把寶石壓暗），中間快捷列 F1～F10（左 6 技能、右 4 藥水）＋上緣金色經驗線
//  右側：小地圖下方「目錄」（打開原本的大圖示選單），鎖定／拾取／SELF／AUTO／攻擊換成素材圓鈕
// 版面以設計圖 1024×572 為基準（--ok＝實際畫面縮放），只在橫向畫面啟用；設定裡可切回奇岩式（window.HudStyle，localStorage 'hudStyle'）。
(()=>{
 const KEY='hudStyle',game=document.querySelector('.game'),A='assets/interface/orb-hud/';
 let style='orb';try{style=localStorage.getItem(KEY)||'orb'}catch{}
 const k=v=>`calc(${v}px*var(--ok,1))`;
 // 快捷列格子位置（素材快捷列 897×138 縮成 445×68：左 6 格、右 4 格）
 const slotX=[22,61,100,139,178,217,269,308,347,386];
 const css=document.createElement('style');css.textContent=`
 .orb-hud-root{display:none}
 main.game.orb-hud.orb-hud.orb-hud .orb-hud-root{display:block;position:absolute;inset:0;pointer-events:none;z-index:6}
 .orb-hud-root>*{position:absolute;pointer-events:auto;box-sizing:border-box}
 main.game.orb-hud.orb-hud.orb-hud>.nav,main.game.orb-hud.orb-hud.orb-hud>.exp-track,main.game.orb-hud.orb-hud.orb-hud>.reference-messages{display:none!important}
 /* 訊息框 */
 .oh-msg{left:${k(4)};bottom:${k(6)};width:max(140px,min(${k(300)},calc(50% - ${k(352)})));height:${k(188)};display:flex;flex-direction:column;gap:${k(3)};font-size:${k(11.5)}}
 .oh-msg .tabs{display:flex;gap:${k(3)}}
 .oh-msg .tabs button{min-height:0!important;padding:${k(1)} ${k(7)}!important;font-size:${k(10.5)};color:#d6ccb4;background:#000000b8;border:1px solid #ffffff1c;border-radius:${k(9)}}
 .oh-msg .tabs button[aria-pressed=true]{color:#ffe08a;border-color:#c9a45e}
 .oh-msg .list{flex:1;min-height:0;overflow-y:auto;padding:${k(2)} ${k(4)};background:linear-gradient(90deg,#0006,#0002 75%,#0000);color:#f1d98e;line-height:1.5;text-shadow:1px 1px 0 #000,0 0 3px #000;scrollbar-width:thin;scrollbar-color:#8a7650 #0000}
 .oh-msg .list .say{color:#fff}.oh-msg .list .drop{color:#9fe0ff}.oh-msg .list .journal{color:#c5b9ff}
 .oh-msg form{display:flex;gap:${k(6)}}
 .oh-msg form input{flex:1;min-width:0;min-height:0!important;height:${k(24)};padding:0 ${k(6)};font-size:${k(11.5)};color:#fff;background:#000d;border:1px solid #c9a45e;border-radius:${k(3)};box-shadow:inset 0 0 4px #000}
 .oh-msg form button{min-height:0!important;height:${k(24)};padding:0 ${k(9)}!important;font-size:${k(11.5)};color:#d9ccb0;background:linear-gradient(#2c2b29,#151413);border:1px solid #5d5545;border-radius:${k(2)}}
 /* 水晶 */
 .oh-orb{bottom:${k(-4)};background:center/100% 100% no-repeat;pointer-events:none!important;filter:drop-shadow(0 2px 6px #000a)}
 .oh-orb.hp{left:calc(50% - ${k(361)});width:${k(189)};height:${k(208)};background-image:url(${A}hp.png)}
 .oh-orb.mp{left:calc(50% + ${k(181)});width:${k(186)};height:${k(200)};bottom:${k(-2)};background-image:url(${A}mp.png)}
 .oh-orb .empty{position:absolute;inset:0;background:linear-gradient(#000000c8 var(--empty,0%),#0000 var(--empty,0%))}
 .oh-orb.hp .empty{clip-path:polygon(48.4% 7.9%,80.2% 44.6%,48.4% 82.7%,16.2% 44.6%)}
 .oh-orb.mp .empty{clip-path:polygon(49.7% 3%,79.8% 38.3%,49.7% 74.4%,19% 38.3%)}
 .oh-orb .val{position:absolute;left:0;right:0;text-align:center;font-family:'Times New Roman','Noto Serif TC',serif;color:#f4e4c8;text-shadow:0 0 4px #000,0 0 2px #000,1px 1px 0 #000;line-height:1.3}
 .oh-orb.hp .val{top:33%}.oh-orb.mp .val{top:30%}
 .oh-orb .val b{display:block;font-weight:normal;font-size:${k(16)}}
 .oh-orb .val span{display:block;font-size:${k(17)}}
 /* 快捷列 */
 .oh-bar{left:calc(50% - ${k(212)});bottom:${k(5)};width:${k(445)};height:${k(68)};background:url(${A}bar.png) center/100% 100% no-repeat;pointer-events:none!important}
 .oh-exp{left:calc(50% - ${k(208)});bottom:${k(73)};width:${k(437)};height:${k(4)};background:#0b0c0dd8;border:1px solid #3a3326;border-bottom:0;overflow:hidden;pointer-events:auto}
 .oh-exp i{display:block;height:100%;width:var(--fill,0%);background:linear-gradient(#fff0b8,#e2ad3c 55%,#9a6814);box-shadow:0 0 6px #ffcf5a}
 main.game.orb-hud.orb-hud.orb-hud>.quick-slots{position:absolute!important;left:calc(50% - ${k(212)})!important;right:auto!important;top:auto!important;bottom:${k(5)}!important;transform:none!important;
  width:${k(445)}!important;height:${k(68)}!important;margin:0!important;padding:0!important;background:transparent!important;border:0!important;z-index:7;display:block!important}
 main.game.orb-hud.orb-hud.orb-hud>.quick-slots>.quick-expanded-row:first-child{display:block!important;position:absolute!important;inset:0!important;width:auto!important;height:auto!important;margin:0!important;padding:0!important;background:none!important;border:0!important}
 /* 抽屜：第 2、3 排疊在快捷列上方（同一張底圖），F10 右邊的 ⌃ 鈕依序展開 1→2→3 排 */
 main.game.orb-hud.orb-hud.orb-hud>.quick-slots>.quick-expanded-row:not(:first-child){display:block!important;position:absolute!important;left:0!important;right:auto!important;top:auto!important;width:100%!important;height:100%!important;margin:0!important;padding:0!important;border:0!important;background:url(${A}bar.png) center/100% 100% no-repeat!important;filter:drop-shadow(0 -2px 6px #000a)}
 main.game.orb-hud.orb-hud.orb-hud>.quick-slots>.quick-expanded-row:nth-child(2){bottom:calc(100% + ${k(9)})!important}
 main.game.orb-hud.orb-hud.orb-hud>.quick-slots>.quick-expanded-row:nth-child(3){bottom:calc(200% + ${k(13)})!important}
 main.game.orb-hud.orb-hud.orb-hud>.quick-slots>.quick-expanded-row[hidden]{display:none!important}
 main.game.orb-hud.orb-hud.orb-hud>.quick-slots>.quick-expand-arrow{position:absolute!important;left:${k(424)}!important;right:auto!important;top:${k(10)}!important;bottom:auto!important;width:${k(17)}!important;min-width:0!important;height:${k(44)}!important;min-height:0!important;padding:0!important;margin:0!important;
  font-size:${k(15)}!important;line-height:1!important;color:#f0d9a0!important;background:linear-gradient(#3a2e1c,#1a140c)!important;border:1px solid #8a6f40!important;border-radius:${k(3)}!important;box-shadow:0 0 4px #000!important;z-index:2}
 main.game.orb-hud.orb-hud.orb-hud>.quick-slots>.quick-expand-arrow:hover{border-color:#ffd77a!important}
 main.game.orb-hud.orb-hud.orb-hud>.quick-slots .combat-quick-slot{position:absolute!important;top:${k(5)}!important;width:${k(35.5)}!important;height:${k(46)}!important;min-width:0!important;min-height:0!important;max-height:none!important;margin:0!important;
  padding:${k(9)} ${k(2)} ${k(2)}!important;background:transparent!important;border:0!important;border-radius:${k(2)}!important;box-shadow:none!important;font-size:${k(9)}!important;color:#efe4c8}
 ${slotX.map((x,i)=>`main.game.orb-hud.orb-hud.orb-hud>.quick-slots .combat-quick-slot:nth-child(${i+1}){left:${k(x)}!important}`).join('\n ')}
 main.game.orb-hud.orb-hud.orb-hud>.quick-slots .combat-quick-slot:hover{background:linear-gradient(#ffe08a22,#0000 80%)!important}
 main.game.orb-hud.orb-hud.orb-hud>.quick-slots .combat-quick-slot .quick-key{display:none!important}
 main.game.orb-hud.orb-hud.orb-hud>.quick-slots .combat-quick-slot::before{content:attr(data-oh-key);position:absolute;left:0;right:0;top:${k(0.5)};text-align:center;font-size:${k(7.5)};color:#8f8a7e;text-shadow:1px 1px 0 #000;pointer-events:none;z-index:1}
 main.game.orb-hud.orb-hud.orb-hud>.quick-slots .combat-quick-slot img{width:100%!important;height:100%!important;object-fit:contain}
 /* 右側圓鈕 */
 main.game.orb-hud.orb-hud.orb-hud>.bottom .actions{position:absolute!important;inset:0!important;left:0!important;top:0!important;right:0!important;bottom:0!important;width:auto!important;height:auto!important;transform:none!important;pointer-events:none!important;display:block!important;background:none!important}
 main.game.orb-hud.orb-hud.orb-hud>.bottom .actions>button{position:absolute!important;left:auto!important;top:auto!important;margin:0!important;padding:0!important;min-height:0!important;pointer-events:auto;border:0!important;border-radius:50%!important;box-shadow:none!important;
  background:transparent center/contain no-repeat!important;color:transparent!important;font-size:0!important;text-shadow:none!important;filter:drop-shadow(0 2px 4px #000c);transition:filter .15s,transform .1s}
 main.game.orb-hud.orb-hud.orb-hud>.bottom .actions>button>*{display:none!important}
 main.game.orb-hud.orb-hud.orb-hud>.bottom .actions>button:active{transform:scale(.95)}
 main.game.orb-hud.orb-hud.orb-hud>.bottom .actions>button[aria-pressed=true]{filter:drop-shadow(0 0 5px #ffd77a) drop-shadow(0 0 2px #ffcf5a) brightness(1.15)}
 main.game.orb-hud.orb-hud.orb-hud>.bottom .actions>#attack{right:${k(2)}!important;bottom:${k(22)}!important;width:${k(116)}!important;height:${k(117)}!important;background-image:url(${A}attack.png)!important}
 main.game.orb-hud.orb-hud.orb-hud>.bottom .actions>.reference-auto{right:${k(127)}!important;bottom:${k(15)}!important;width:${k(62)}!important;height:${k(62)}!important;background-image:url(${A}auto.png)!important}
 main.game.orb-hud.orb-hud.orb-hud>.bottom .actions>.reference-self{right:${k(114)}!important;bottom:${k(118)}!important;width:${k(60)}!important;height:${k(61)}!important;background-image:url(${A}self-s.png)!important}
 main.game.orb-hud.orb-hud.orb-hud>.bottom .actions>.reference-interact{right:${k(28)}!important;bottom:${k(158)}!important;width:${k(60)}!important;height:${k(58)}!important;background-image:url(${A}pick.png)!important}
 main.game.orb-hud.orb-hud.orb-hud>.bottom .actions>.reference-lock{right:${k(8)}!important;bottom:${k(244)}!important;width:${k(64)}!important;height:${k(65)}!important;background-image:url(${A}lock.png)!important}
 /* 強制攻擊（原鎖定鈕）：沿用深色圓底但文字改用 CSS（lock.png 內建「鎖定」字樣），開啟時變紅 */
 main.game.orb-hud.orb-hud.orb-hud>.bottom .actions>.reference-force{background-image:radial-gradient(circle at 50% 38%,#2b3046,#141724 70%)!important;box-shadow:inset 0 0 0 ${k(3)} #3c4058,inset 0 0 0 ${k(4)} #0008!important;display:flex!important;align-items:center;justify-content:center}
 main.game.orb-hud.orb-hud.orb-hud>.bottom .actions>.reference-force>span{display:block!important;font-size:${k(14)}!important;line-height:1.15;width:3em;color:#d9d4c4!important;text-shadow:0 1px 2px #000!important;letter-spacing:.05em}
 main.game.orb-hud.orb-hud.orb-hud>.bottom .actions>.reference-force[aria-pressed=true]{background-image:radial-gradient(circle at 50% 38%,#ff5a3c,#a3180d 62%,#5a0905)!important;box-shadow:inset 0 0 0 ${k(3)} #e86a4c,inset 0 0 0 ${k(4)} #0008!important;filter:drop-shadow(0 0 6px #ff3b1f) drop-shadow(0 2px 4px #000c)!important}
 main.game.orb-hud.orb-hud.orb-hud>.bottom .actions>.reference-force[aria-pressed=true]>span{color:#fff!important}
 main.game.orb-hud.orb-hud.orb-hud>.bottom .pad{display:none!important}
 main.game.orb-hud.orb-hud.orb-hud>.bottom{z-index:8!important}
 /* 目錄 */
 .oh-menu-btn{right:${k(2)};width:${k(76)};height:${k(75)};padding:0!important;min-height:0!important;border:0!important;background:url(${A}menu.png) center/contain no-repeat!important;color:transparent!important;font-size:0!important;filter:drop-shadow(0 2px 4px #000c)}
 .oh-menu-btn[aria-expanded=true]{filter:drop-shadow(0 0 5px #ffd77a) brightness(1.1)}
 .oh-menu{display:none;right:${k(84)};grid-template-columns:repeat(4,${k(44)});gap:${k(4)};padding:${k(6)};background:#0c0d0fec;border:1px solid #7a6038;border-radius:${k(4)};box-shadow:0 4px 14px #000c}
 .oh-menu.open{display:grid}
 .oh-menu button{width:${k(44)};height:${k(44)};min-height:0!important;padding:0!important;border-radius:50%!important;font-size:${k(11.5)}!important;font-family:'Times New Roman','Noto Serif TC',serif;color:#f1dfb6!important;
  background:radial-gradient(circle at 50% 38%,#4b3c2b,#261c12 62%,#1a130c)!important;border:2px solid #5b4428!important;box-shadow:inset 0 0 0 2px #120c06,inset 0 0 0 3px #b38a50,inset 0 0 8px #000!important;text-shadow:1px 1px 0 #000}
 .oh-menu button:hover{border-color:#a07a3e!important}
 main.game.orb-hud.orb-hud.orb-hud>.minimap-button{width:${k(176)}!important;height:${k(124)}!important;border:2px solid #6b5230!important;box-shadow:inset 0 0 0 1px #000,0 0 0 1px #c19a5a,0 3px 8px #000b!important;border-radius:2px!important}
  main.game.orb-hud.orb-hud.orb-hud>.minimap-button canvas{width:100%!important;height:100%!important}
 main.game.orb-hud.orb-hud.orb-hud>.hud{height:auto!important}
 main.game.orb-hud.orb-hud.orb-hud>.hud .oh-def{display:flex;justify-content:space-between;gap:8px;margin-top:2px}
 main.game.orb-hud.orb-hud.orb-hud>.hud .oh-def small b{color:#ffe08a;font-weight:normal}
 `;document.head.append(css);

 const el=(tag,cls,text)=>{const e=document.createElement(tag);if(cls)e.className=cls;if(text!==undefined)e.textContent=text;return e};
 const root=el('div','orb-hud-root');root.setAttribute('aria-label','狀態列');game.append(root);
 // 訊息框
 const msg=el('section','oh-msg'),tabs=el('div','tabs'),list=el('div','list'),form=el('form'),input=el('input'),send=el('button','','發送');
 list.setAttribute('aria-live','polite');list.setAttribute('aria-label','遊戲訊息');input.placeholder='輸入訊息';input.maxLength=60;input.setAttribute('aria-label','輸入訊息');send.type='submit';form.append(input,send);
 let filter='all';const messages=[];
 for(const [key,l]of [['all','全部'],['say','一般'],['drop','掉落'],['sys','系統']]){const b=el('button','',l);b.type='button';b.setAttribute('aria-pressed',String(key===filter));b.onclick=()=>{filter=key;for(const t of tabs.children)t.setAttribute('aria-pressed',String(t===b));render()};tabs.append(b)}
 msg.append(tabs,list,form);root.append(msg);
 function render(){list.replaceChildren(...messages.filter(m=>filter==='all'||m.kind===filter||(filter==='sys'&&m.kind==='journal')).map(m=>el('div',m.kind,m.text)));list.scrollTop=list.scrollHeight}
 function push(text,kind){messages.push({text,kind});if(messages.length>150)messages.shift();render()}
 const log=document.querySelector('#log');let last='';
 function capture(){const t=log?.textContent.trim();if(!t||t===last)return;last=t;push(t,t.startsWith('[日誌]')?'journal':/獲得|撿起|拾取|掉落/.test(t)?'drop':'sys')}
 if(log){new MutationObserver(capture).observe(log,{childList:true,characterData:true,subtree:true});capture()}
 form.onsubmit=e=>{e.preventDefault();const t=input.value.trim();if(!t)return;input.value='';push((window.activeCharacterName||'我')+'：'+t,'say')};
 input.addEventListener('keydown',e=>e.stopPropagation());
 // 水晶＋快捷列底圖＋經驗線
 function orb(kind,label){const o=el('div','oh-orb '+kind),v=el('div','val');v.append(el('b','',label),el('span'));o.append(el('div','empty'),v);return o}
 const hpO=orb('hp','HP'),mpO=orb('mp','MP'),bar=el('div','oh-bar'),exp=el('div','oh-exp');exp.append(el('i'));
 root.append(bar,exp,hpO,mpO);
 // 寶石上下範圍（佔圖片高度的百分比），用來算空的部分要壓暗到哪
 const GEM={hp:[7.9,82.7],mp:[3,74.4]};
 // 目錄鈕＋功能選單
 const menuBtn=el('button','oh-menu-btn','目錄'),menu=el('div','oh-menu');menuBtn.type='button';menuBtn.title='目錄';menuBtn.setAttribute('aria-expanded','false');menuBtn.setAttribute('aria-label','目錄');
 // 目錄：直接打開原本的大圖示選單（商城、背包、技能、角色、設定、變身…）
 menuBtn.onclick=()=>document.querySelectorAll('.nav button')[2]?.click();
 for(const [label,short,fn]of [['能力（Insert）','能力',()=>panel('status')],['魔法（Delete）','魔法',()=>panel('magic')],['背包（Tab）','背包',()=>panel('bag')],['裝備（E）','裝備',()=>panel('equipment')],
  ['地圖','地圖',()=>document.querySelector('#overview')?.onclick?.()],['選單','選單',()=>document.querySelectorAll('.nav button')[2]?.click()],['設定（Home）','設定',()=>panel('settings')]]){
  const b=el('button','',short);b.type='button';b.title=label;b.setAttribute('aria-label',label);b.onclick=()=>{menu.classList.remove('open');menuBtn.setAttribute('aria-expanded','false');fn()};menu.append(b)}
 root.append(menuBtn,menu);
 // 數值
 function expPct(){const lv=window.activeCharacterLevel||1,e=window.activeCharacterExperience||0,t=typeof killRewardData!=='undefined'?killRewardData.thresholds:null;const a=t?.find(r=>r[0]===lv)?.[1],b=t?.find(r=>r[0]===lv+1)?.[1];return Number.isFinite(a)&&Number.isFinite(b)&&b>a?Math.max(0,Math.min(100,(e-a)/(b-a)*100)):0}
 function setOrb(o,kind,v,m){const p=m?Math.max(0,Math.min(1,v/m)):0,[t,b]=GEM[kind];o.querySelector('.empty').style.setProperty('--empty',(p>=1?0:t+(b-t)*(1-p))+'%');o.querySelector('.val span').textContent=v+'/'+m}
 function labelSlots(){[...document.querySelectorAll('.quick-slots>.quick-expanded-row')].forEach((row,r)=>[...row.querySelectorAll(':scope>.combat-quick-slot')].forEach((b,i)=>{b.dataset.ohKey=r?(r+1)+'-'+(i+1):'F'+(i+1);b.style.display=i<10?'':'none'}))}
 function placeMenu(){const g=game.getBoundingClientRect(),m=document.querySelector('.minimap-button')?.getBoundingClientRect(),s=Number(getComputedStyle(game).getPropertyValue('--ok'))||1;
  const top=m&&m.height?m.bottom-g.top+8*s:150*s;menuBtn.style.top=top+'px';menu.style.top=top+'px';
  // 矮畫面：鎖定鈕不夠放時往下推，避免蓋到目錄
  const lock=document.querySelector('.bottom .actions>.reference-lock');if(lock){const want=top+80*s,def=g.height-(244+65)*s;if(def<want){lock.style.setProperty('top',want+'px','important');lock.style.setProperty('bottom','auto','important')}else{lock.style.removeProperty('top');lock.style.removeProperty('bottom')}}}
 // 左上頭像框加一行防禦／魔防
 const hudBox=game.querySelector(':scope>.hud'),defRow=el('div','row oh-def'),acT=el('b'),mrT=el('b');{const a=el('small','','防禦 '),m=el('small','','魔防 ');a.append(acT);m.append(mrT);defRow.append(a,m);hudBox?.append(defRow)}
 function refreshDef(){try{acT.textContent=String(typeof previewArmorClass==='function'?previewArmorClass():'—');mrT.textContent=String(window.NativeCombatRules?.defense?.()?.mr??0)}catch{}}
 function refresh(){if(!game.classList.contains('orb-hud')||window.gameFlowState!=='playing')return;refreshDef();setOrb(hpO,'hp',hp,maxHp);setOrb(mpO,'mp',mp,maxMp);const e=expPct();exp.style.setProperty('--fill',e+'%');exp.title='經驗 '+e.toFixed(2)+'%';labelSlots();placeMenu()}
 function layout(){const r=game.getBoundingClientRect(),on=style==='orb'&&r.width>=560&&r.width>r.height;game.classList.toggle('orb-hud',on);
  if(!on){const lock=document.querySelector('.bottom .actions>.reference-lock');lock?.style.removeProperty('top');lock?.style.removeProperty('bottom')}
  if(on){game.classList.remove('classic-hud');game.style.setProperty('--ok',Math.max(.5,Math.min(r.height/572,r.width/1024,1.5)));refresh()}}
 new ResizeObserver(layout).observe(game);addEventListener("resize",layout);
 const baseStats=stats;stats=function(...args){const out=baseStats.apply(this,args);refresh();return out};
 setInterval(refresh,1000);
 window.HudStyle={get current(){return style},set(v){style=v==='classic'?'classic':'orb';try{localStorage.setItem(KEY,style)}catch{}game.classList.remove('orb-hud');window.ClassicHud?.layout();layout()},layout};
 layout();
})();
