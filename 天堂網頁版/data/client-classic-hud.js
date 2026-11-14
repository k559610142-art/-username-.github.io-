// 底部對話框：照網頁奇岩城的畫面排版自寫（設計高度 160，寬度＝整個畫面寬，依畫面高度等比縮放）。
//  上緣：地點＋區域、左端飾｜體力條｜龍頭｜魔力條｜右端飾（端飾與龍頭裁自天地劫天堂客戶端 431.img）
//  左：等級＋經驗%、金幣、防禦／魔防、負重、經驗條
//  中（隨畫面寬度伸縮）：訊息分頁（全部／一般／隊伍／血盟／世界／掉落／系統）＋訊息＋輸入列（一般▾｜輸入訊息｜發送）
//  右：快捷格 F1～F10（5×2）＋功能鈕列（狩獵場、地圖、能力、魔法、背包、裝備、選單、設定）
// 設定選「奇岩式」底部介面（hudStyle=classic）且為橫向畫面（寬 > 高、寬 ≥ 560）才啟用，高度約佔畫面 28%；預設是水晶球式（orb-hud.js）。
(()=>{
 const DH=160,SIDE=200,game=document.querySelector('.game'),UI='assets/interface/client-ui/431.png';
 const crop=(x,y,w,h)=>`background:url('${UI}') -${x}px -${y}px/640px 149px no-repeat;width:${w}px;height:${h}px`;
 const css=document.createElement('style');css.textContent=`
 .classic-hud-bar{display:none}
 .game.classic-hud .classic-hud-bar{display:block;position:absolute;left:0;bottom:0;width:var(--qh-w);height:${DH}px;transform:scale(var(--qh-s));transform-origin:0 100%;z-index:6;color:#e4d9bd;font-size:12px;pointer-events:none}
 .classic-hud-bar>*{position:absolute;box-sizing:border-box;pointer-events:auto}
 .qh-frame{left:0;right:0;top:36px;bottom:0;background:#18191b;border-top:1px solid #000;pointer-events:none!important}
 .qh-stone{left:${SIDE+4}px;right:${SIDE+4}px;top:36px;bottom:0;pointer-events:none!important;
  background:radial-gradient(ellipse at 30% 40%,#47474b 0,transparent 60%),radial-gradient(ellipse at 75% 70%,#3e3e42 0,transparent 55%),linear-gradient(#3a3a3e,#2b2b2f);box-shadow:inset 0 0 18px #000c}
 .qh-sep{top:30px;bottom:0;width:5px;background:linear-gradient(90deg,#2a1f12,#b08b4c 40%,#e2c27c 50%,#b08b4c 60%,#2a1f12);pointer-events:none!important}
 .qh-rail{top:22px;height:7px;background:linear-gradient(#5d4320,#e8c477 30%,#a57c3c 55%,#4a3417);border-radius:3px;box-shadow:0 1px 0 #000;pointer-events:none!important;z-index:1}
 .qh-capl{${crop(92,0,53,50)};top:-2px;pointer-events:none!important;z-index:2}
 .qh-capr{${crop(465,0,48,50)};top:-2px;pointer-events:none!important;z-index:2}
 .qh-dragon{${crop(276,0,70,50)};left:calc(50% - 35px);top:-4px;transform:scale(1.25);transform-origin:50% 40%;pointer-events:none!important;z-index:3}
 .qh-gauge{top:27px;height:18px;background:#120808;border:1px solid #000;box-shadow:inset 0 2px 3px #000;overflow:hidden}
 .qh-gauge>i{position:absolute;inset:0;width:var(--fill,100%);transition:width .2s}
 .qh-gauge.hp>i{background:linear-gradient(#d65a4c,#9b2016 45%,#5e0c08)}.qh-gauge.mp>i{background:linear-gradient(#5f6fae,#2c3a78 45%,#161f48)}
 .qh-gauge>span{position:absolute;inset:0;display:flex;align-items:center;justify-content:center;font-size:12px;font-weight:bold;color:#fff;text-shadow:0 0 2px #000,1px 1px 0 #000}
 .qh-place{left:${SIDE+40}px;top:-18px;height:20px;display:flex;align-items:center;gap:6px;font-size:15px;color:#f2e6c4;text-shadow:0 0 3px #000,1px 1px 0 #000,0 0 6px #000;pointer-events:none!important;white-space:nowrap}
 .qh-place small{font-size:12px;color:#7fe07a}.qh-place small.danger{color:#e8a35a}
 .qh-left{left:3px;top:40px;width:${SIDE-4}px;bottom:3px;display:grid;grid-template-rows:repeat(5,1fr);gap:3px}
 .qh-row{position:relative;display:flex;align-items:center;gap:4px;padding:0 8px 0 4px;background:linear-gradient(#1f1d1a,#0d0c0b);border:1px solid #7a6238;border-radius:9px;font-size:12px;white-space:nowrap;overflow:hidden;font-variant-numeric:tabular-nums;color:#f4e7c4;box-shadow:inset 0 1px 0 #ffffff14}
 .qh-row .ico{flex:none;width:16px;height:16px;border-radius:50%;background:radial-gradient(circle at 35% 35%,#f6dc8c,#9a6e22);box-shadow:0 0 0 1px #000}
 .qh-row b{margin-left:auto;font-weight:bold;color:#f4e7c4}
 .qh-row.qh-meterrow{justify-content:center;padding:0}
 .qh-row.qh-meterrow>i{position:absolute;inset:0 auto 0 0;width:var(--fill,0%);background:linear-gradient(#e7a14b,#a85f17)}
 .qh-row.qh-meterrow.exp>i{background:linear-gradient(#8fd06a,#3f8a2b)}
 .qh-row.qh-meterrow>span{position:relative;font-weight:bold;text-shadow:1px 1px 0 #000}
 .qh-row .half{flex:1;display:flex;justify-content:space-between;font-weight:bold}
 .qh-chat{left:${SIDE+10}px;right:${SIDE+10}px;top:48px;bottom:4px;display:flex;flex-direction:column;gap:4px}
 .qh-tabs{display:flex;gap:4px;height:26px;flex:none}
 .qh-tabs button{flex:1;min-width:0;min-height:0!important;height:26px;padding:0!important;font-size:14px;color:#c9c2b2;background:linear-gradient(#45464b,#2a2b2f);border:1px solid #17181a;border-radius:3px;box-shadow:inset 0 1px 0 #ffffff1c}
 .qh-tabs button.toggle{flex:0 0 30px;font-size:12px;color:#f0d38a}
 .qh-tabs button[aria-pressed=true]{color:#ffe7a8;background:linear-gradient(#5a4a30,#2e2617);border-color:#a3864d}
 .qh-list{flex:1;min-height:0;overflow-y:auto;padding:2px 8px;background:transparent;font-size:13px;line-height:1.5;text-shadow:1px 1px 0 #000;scrollbar-width:thin;scrollbar-color:#8a7650 #222}
 .qh-list .say{color:#fff}.qh-list .sys{color:#efe3b8}.qh-list .drop{color:#9fe0ff}.qh-list .journal{color:#c5b9ff}
 .qh-input{display:flex;gap:6px;height:28px;flex:none}
 .qh-input select,.qh-input input,.qh-input button{min-height:0!important;height:28px;font-size:14px;border:1px solid #121314;border-radius:3px;background:linear-gradient(#2a2b2f,#1d1e21);color:#e4d9bd;padding:0 8px}
 .qh-input select{flex:0 0 74px;background:linear-gradient(#45464b,#2a2b2f)}.qh-input input{flex:1;min-width:0;background:#1a1b1e;color:#fff}
 .qh-input button{flex:0 0 80px;background:linear-gradient(#45464b,#2a2b2f);color:#e8dcc0}
 .qh-right{right:3px;top:40px;width:${SIDE-4}px;bottom:3px;display:flex;flex-direction:column;gap:4px}
 .qh-slotbg{flex:1;border:2px solid #6b4d26;border-radius:3px;background:linear-gradient(#2a1d10,#1a120a);box-shadow:inset 0 0 0 1px #000}
 .qh-icons{display:grid;grid-template-columns:repeat(8,1fr);gap:2px;height:26px;flex:none}
 .qh-icons button{min-height:0!important;padding:0!important;height:26px;border:1px solid #6b4d26;border-radius:2px;background-color:#2a1d10;background-repeat:no-repeat;cursor:pointer;overflow:hidden}
 .qh-icons button:hover,.qh-icons button:focus-visible{border-color:#e6c776;background-color:#3a3020}
 .qh-icons button span{font-size:11px;color:#e8d6a6;line-height:24px}
 /* 既有元件搬進對話框 */
 .game.classic-hud>.hud,.game.classic-hud>.nav,.game.classic-hud>.exp-track,.game.classic-hud>.reference-messages{display:none!important}
 .game.classic-hud>.quick-slots{position:absolute!important;left:auto!important;right:calc(7px*var(--qh-s))!important;bottom:calc(35px*var(--qh-s))!important;top:auto!important;
  width:calc(${SIDE-12}px*var(--qh-s))!important;height:calc(${DH-80}px*var(--qh-s))!important;transform:none!important;margin:0!important;padding:0!important;background:transparent!important;border:0!important;z-index:7;display:block!important}
 .game.classic-hud>.quick-slots>.quick-expanded-row:first-child{display:grid!important;grid-template-columns:repeat(5,1fr)!important;grid-template-rows:repeat(2,1fr)!important;gap:calc(2px*var(--qh-s))!important;width:100%!important;height:100%!important;margin:0!important;padding:0!important}
 .game.classic-hud>.quick-slots>.quick-expanded-row:not(:first-child),.game.classic-hud>.quick-slots>.quick-expand-arrow{display:none!important}
 .game.classic-hud>.quick-slots .combat-quick-slot{position:relative;width:auto!important;height:auto!important;min-width:0!important;min-height:0!important;margin:0!important;padding:calc(2px*var(--qh-s))!important;
  background:linear-gradient(#24262a,#141518)!important;border:1px solid #4a3a22!important;border-radius:2px;box-shadow:inset 0 0 5px #000!important;font-size:calc(10px*var(--qh-s))!important;color:#d9cba2}
 .game.classic-hud>.quick-slots .combat-quick-slot .quick-key{display:none!important}
 .game.classic-hud>.quick-slots .combat-quick-slot::before{content:attr(data-qh-key);position:absolute;left:3px;top:1px;font-size:calc(9px*var(--qh-s));color:#7a705c;pointer-events:none}
 .game.classic-hud>.quick-slots .combat-quick-slot img{width:100%!important;height:100%!important;object-fit:contain}
 .game.classic-hud>.bottom .actions,.game.classic-hud>.bottom .pad{bottom:calc(${DH+10}px*var(--qh-s))!important}
 .game.classic-hud>.auto-potion-hud{top:12px!important}
 `;document.head.append(css);

 const el=(tag,cls,text)=>{const e=document.createElement(tag);if(cls)e.className=cls;if(text!==undefined)e.textContent=text;return e};
 const bar=el('div','classic-hud-bar');bar.setAttribute('aria-label','狀態列');game.append(bar);
 const at=(e,x,w)=>{e.style.left=x+'px';e.style.width=w+'px';bar.append(e);return e};
 bar.append(el('div','qh-frame'),el('div','qh-stone'));
 for(const side of ['left','right']){const sep=el('div','qh-sep');sep.style[side]=SIDE+'px';bar.append(sep)}
 const place=el('div','qh-place');bar.append(place);
 const L=SIDE+10,CAP=50,HALF=40;
 function piece(cls,style){const e=el('div',cls);Object.assign(e.style,style);bar.append(e);return e}
 piece('qh-rail',{left:(L+CAP-6)+'px',right:'calc(50% + '+(HALF-4)+'px)'});piece('qh-rail',{left:'calc(50% + '+(HALF-4)+'px)',right:(L+CAP-6)+'px'});
 function gauge(kind,style){const g=piece('qh-gauge '+kind,style);g.append(el('i'),el('span'));return g}
 const hpG=gauge('hp',{left:(L+CAP-4)+'px',right:'calc(50% + '+HALF+'px)'}),mpG=gauge('mp',{left:'calc(50% + '+HALF+'px)',right:(L+CAP-4)+'px'});
 piece('qh-capl',{left:L+'px'});piece('qh-capr',{right:L+'px'});piece('qh-dragon',{});
 // 左欄
 const left=el('div','qh-left');bar.append(left);
 const lvRow=el('div','qh-row'),goldRow=el('div','qh-row'),defRow=el('div','qh-row'),wRow=el('div','qh-row qh-meterrow'),expRow=el('div','qh-row qh-meterrow exp');
 for(const r of [wRow,expRow])r.append(el('i'),el('span'));left.append(lvRow,goldRow,defRow,wRow,expRow);
 // 中：訊息
 const chat=el('div','qh-chat'),tabs=el('div','qh-tabs'),list=el('div','qh-list'),input=el('form','qh-input');bar.append(chat);
 list.setAttribute('aria-live','polite');list.setAttribute('aria-label','遊戲訊息');
 const TABS=[['all','全部'],['say','一般'],['party','隊伍'],['clan','血盟'],['world','世界'],['drop','掉落'],['sys','系統']];
 let filter='all',small=false;const messages=[];
 const toggle=el('button','toggle','▲');toggle.type='button';toggle.title='聊天框大小';toggle.onclick=()=>{small=!small;toggle.textContent=small?'▼':'▲';list.style.display=small?'none':''};tabs.append(toggle);
 for(const [k,l]of TABS){const b=el('button','',l);b.type='button';b.setAttribute('aria-pressed',String(k===filter));b.onclick=()=>{filter=k;for(const t of tabs.querySelectorAll('button:not(.toggle)'))t.setAttribute('aria-pressed',String(t===b));renderList()};tabs.append(b)}
 const channel=el('select');for(const [v,l]of [['say','一般'],['world','世界']]){const o=el('option','',l);o.value=v;channel.append(o)}
 const text=el('input');text.placeholder='輸入訊息';text.maxLength=60;text.setAttribute('aria-label','輸入訊息');const send=el('button','','發送');send.type='submit';
 input.append(channel,text,send);chat.append(tabs,list,input);
 function chatLine(m){const d=el('div',m.kind,m.text),who=(m.kind==='say'||m.kind==='whisper')&&m.text.match(/^(?:\[密語\] )?([^：→\s]+)：/)?.[1];
  if(who&&who!==window.activeCharacterName){d.dataset.who=who;d.title='點一下密語 '+who;d.style.cursor='pointer';d.onclick=()=>{text.value='/密 '+who+' ';text.focus()}}if(m.kind==='whisper')d.style.color='#ff9be0';return d}
 function renderList(){list.replaceChildren(...messages.filter(m=>filter==='all'||m.kind===filter||(filter==='sys'&&m.kind==='journal')).map(chatLine));list.scrollTop=list.scrollHeight}
 function push(text,kind){messages.push({text,kind});if(messages.length>150)messages.shift();renderList()}
 const log=document.querySelector('#log');let lastLog='';
 function capture(){const t=log?.textContent.trim();if(!t||t===lastLog)return;lastLog=t;push(t,t.startsWith('[日誌]')?'journal':/獲得|撿起|拾取|掉落/.test(t)?'drop':'sys')}
 if(log){new MutationObserver(capture).observe(log,{childList:true,characterData:true,subtree:true});capture()}
 (window.GameChat??={pushers:[],say(text,kind='say'){for(const p of this.pushers)p(text,kind)}}).pushers.push(push);
 input.onsubmit=e=>{e.preventDefault();const t=text.value.trim();if(!t)return;text.value='';const who=window.activeCharacterName||'我';
  const w=t.match(/^(?:\/密|\/w\b|")\s*([^\s"]+)\s+(.+)$/i);if(w){push('[密語] → '+w[1]+'：'+w[2],'whisper');document.dispatchEvent(new CustomEvent('player-whisper',{detail:{to:w[1],text:w[2]}}));return}
  document.dispatchEvent(new CustomEvent('player-chat',{detail:t}));
  if(channel.value==='world'&&window.LocalServerClient?.online&&typeof LocalServerClient.chat==='function'){LocalServerClient.chat(t);push('[世界] '+who+'：'+t,'world');return}
  push((channel.value==='world'?'[世界] ':'')+who+'：'+t,channel.value==='world'?'world':'say')};
 text.addEventListener('keydown',e=>e.stopPropagation());
 // 右：快捷格（QuickSlots 第一排 F1～F10）＋功能鈕
 const right=el('div','qh-right'),spacer=el('div','qh-slotbg');const icons=el('div','qh-icons');right.append(spacer,icons);bar.append(right);
 // 圖示取自 431.img 右下 7 個功能鈕（第 n 個：0 說明、1 人物、2 魔法、3 道具、4 選單、5 設定、6 地圖）；沒有對應圖的用文字
 const ICONS=[['狩獵場',()=>document.querySelector('#overview')?.onclick?.(),'獵'],['地圖',()=>document.querySelector('#overview')?.onclick?.(),6],['能力（Insert）',()=>panel('status'),1],['魔法（Delete）',()=>panel('magic'),2],
  ['背包（Tab）',()=>panel('bag'),3],['裝備（E）',()=>panel('equipment'),'裝'],['選單',()=>document.querySelectorAll('.nav button')[2]?.click(),4],['設定（Home）',()=>panel('settings'),5]];
 for(const [label,fn,icon]of ICONS){const b=el('button');b.type='button';b.title=label;b.setAttribute('aria-label',label);
  if(typeof icon==='number'){b.style.backgroundImage="url('"+UI+"')";b.style.backgroundSize=(640*24/20.1)+'px auto';b.style.backgroundPosition=-(497+icon*20.1)*24/20.1+'px '+(-128*24/20.1)+'px'}else b.append(el('span','',icon));b.onclick=fn;icons.append(b)}
 function labelSlots(){[...document.querySelectorAll('.quick-slots>.quick-expanded-row:first-child>.combat-quick-slot')].forEach((b,i)=>{b.dataset.qhKey='F'+(i+1);b.style.display=i<10?'':'none'})}
 // 數值
 function expPct(){const lv=window.activeCharacterLevel||1,exp=window.activeCharacterExperience||0,t=typeof killRewardData!=='undefined'?killRewardData.thresholds:null;const a=t?.find(r=>r[0]===lv)?.[1],b=t?.find(r=>r[0]===lv+1)?.[1];return Number.isFinite(a)&&Number.isFinite(b)&&b>a?Math.max(0,Math.min(100,(exp-a)/(b-a)*100)):0}
 function weightPct(){const a=window.playerAttributes||{};let t=0;for(const e of window.OwnedInventory?.items||[])t+=(e.item?.weight??0)*(e.count||1);const max=1500+Math.floor(((a.str||0)+(a.con||0)-18)/2)*150;return max>0?Math.min(100,Math.round(t/1000/max*100)):0}
 function gold(){let n=0;for(const e of window.OwnedInventory?.items||[])if(e.item?.kind==='etcitem'&&e.item.id===40308)n+=e.count||0;return n}
 function setFill(g,pct,label){g.style.setProperty('--fill',Math.max(0,Math.min(100,pct))+'%');g.lastChild.textContent=label}
 function line(row,label,value){row.replaceChildren(el('span','ico'),el('span','',label),el('b','',value))}
 function refresh(){if(!game.classList.contains('classic-hud')||window.gameFlowState!=='playing')return;const e=expPct(),d=window.NativeCombatRules?.defense?.()||{};
  setFill(hpG,hp/Math.max(1,maxHp)*100,hp+' / '+maxHp);setFill(mpG,mp/Math.max(1,maxMp)*100,mp+' / '+maxMp);
  line(lvRow,'等級 '+(window.activeCharacterLevel||1),e.toFixed(4)+'%');line(goldRow,'金幣',gold().toLocaleString());
  defRow.replaceChildren(el('span','ico'),Object.assign(el('span','half'),{innerHTML:''}));const h=defRow.lastChild;h.append(el('span','','防禦 '+(typeof previewArmorClass==='function'?previewArmorClass():(d.ac??10))),el('span','','魔防 '+(d.mr||0)+'%'));
  const w=weightPct();setFill(wRow,w,'負重 '+w+'%');setFill(expRow,e,'經驗 '+e.toFixed(2)+'%');
  const mapName=window.WorldMaps?.name?.(window.activeMapId||0)||'',safe=typeof tile==='function'&&(tile(worldX,worldY)&48)===16;
  place.replaceChildren(document.createTextNode(mapName),Object.assign(el('small',safe?'':'danger',safe?'（安全區域）':'（一般區域）')));labelSlots()}
 // 版面：橫向畫面啟用；寬度＝整個畫面，高度約佔畫面 28%（依高度等比縮放）
 function hudStyle(){if(window.HudStyle)return HudStyle.current;try{return localStorage.getItem('hudStyle')||'orb'}catch{return 'orb'}}
 function layout(){const r=game.getBoundingClientRect(),on=hudStyle()==='classic'&&r.width>=560&&r.width>r.height;game.classList.toggle('classic-hud',on);if(!on)return;
  const s=Math.max(.5,Math.min(r.height*.28/DH,r.width/720,1.6));game.style.setProperty('--qh-s',s);game.style.setProperty('--qh-w',r.width/s+'px');refresh()}
 new ResizeObserver(layout).observe(game);addEventListener("resize",layout);layout();window.ClassicHud={layout};
 const baseStats=stats;stats=function(...args){const out=baseStats.apply(this,args);refresh();return out};
 setInterval(refresh,1000);
})();
