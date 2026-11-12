// 底部對話框：照網頁奇岩城的畫面排版自寫（設計尺寸 960×160，依畫面寬度等比縮放）。
//  上緣：地點＋區域、體力條｜龍頭（天地劫天堂客戶端 431.img 裁切）｜魔力條
//  左：等級＋經驗%、金幣、防禦／魔防、負重、經驗條
//  中：訊息分頁（全部／一般／隊伍／血盟／世界／掉落／系統）＋訊息＋輸入列（一般▾｜輸入訊息｜發送）
//  右：快捷格 F1～F10（5×2）＋功能鈕列（狩獵場、地圖、能力、魔法、背包、裝備、選單、設定）
// 橫向畫面（寬 > 高、寬 ≥ 560）啟用，高度最多佔畫面 32%；手機直向維持原本介面。
(()=>{
 const DW=960,DH=160,game=document.querySelector('.game'),UI='assets/interface/client-ui/431.png';
 const css=document.createElement('style');css.textContent=`
 .classic-hud-bar{display:none}
 .game.classic-hud .classic-hud-bar{display:block;position:absolute;left:var(--qh-l);bottom:0;width:${DW}px;height:${DH}px;transform:scale(var(--qh-s));transform-origin:0 100%;z-index:6;color:#e4d9bd;font-size:12px;pointer-events:none}
 .classic-hud-bar>*{position:absolute;box-sizing:border-box;pointer-events:auto}
 .qh-frame{left:0;right:0;top:22px;bottom:0;background:linear-gradient(#25221d,#141312 18px,#111 100%);border-top:2px solid #8a6c38;box-shadow:inset 0 1px 0 #d2ac62,0 -2px 6px #000a;pointer-events:none!important}
 .qh-sep{top:24px;bottom:0;width:3px;background:linear-gradient(90deg,#3d3020,#a78449,#3d3020);pointer-events:none!important}
 .qh-dragon{left:${DW/2-62}px;top:-6px;width:124px;height:58px;background:url('${UI}') -${270*124/100}px 0/${640*124/100}px auto no-repeat;pointer-events:none!important;z-index:2}
 .qh-gauge{top:28px;height:16px;background:#1b0d0b;border:1px solid #000;box-shadow:0 0 0 1px #6d5530;overflow:hidden}
 .qh-gauge>i{position:absolute;inset:0;width:var(--fill,100%);transition:width .2s}
 .qh-gauge.hp>i{background:linear-gradient(#e2584b,#a11d14 55%,#6a0d09)}.qh-gauge.mp>i{background:linear-gradient(#6593ea,#2148a8 55%,#142f73)}
 .qh-gauge>span{position:absolute;inset:0;display:flex;align-items:center;justify-content:center;font-size:11px;font-weight:bold;color:#fff;text-shadow:0 0 2px #000,1px 1px 0 #000}
 .qh-place{left:214px;top:2px;height:20px;display:flex;align-items:center;gap:6px;font-size:13px;color:#f2e6c4;text-shadow:0 0 3px #000,1px 1px 0 #000;pointer-events:none!important;white-space:nowrap}
 .qh-place small{font-size:11px;color:#9fd38a}.qh-place small.danger{color:#e8a35a}
 .qh-left{left:4px;top:30px;width:198px;bottom:4px;display:grid;grid-template-rows:repeat(5,1fr);gap:3px}
 .qh-row{display:flex;align-items:center;gap:5px;padding:0 6px;background:#0c0c0c;border:1px solid #3b3326;border-radius:2px;font-size:11.5px;white-space:nowrap;overflow:hidden;font-variant-numeric:tabular-nums}
 .qh-row .ico{flex:none;width:15px;height:15px;border-radius:50%;background:radial-gradient(circle at 35% 35%,#f6dc8c,#9a6e22);box-shadow:0 0 0 1px #000}
 .qh-row b{margin-left:auto;font-weight:normal;color:#f2e6c4}
 .qh-row.qh-meterrow{position:relative;justify-content:center;padding:0}
 .qh-row.qh-meterrow>i{position:absolute;inset:0 auto 0 0;width:var(--fill,0%);background:linear-gradient(#e7a14b,#a85f17)}
 .qh-row.qh-meterrow.exp>i{background:linear-gradient(#8fd06a,#3f8a2b)}
 .qh-row.qh-meterrow>span{position:relative;color:#fff;text-shadow:1px 1px 0 #000}
 .qh-row .half{flex:1;display:flex;justify-content:space-between}
 .qh-chat{left:210px;top:48px;width:540px;bottom:4px;display:flex;flex-direction:column;gap:3px}
 .qh-tabs{display:flex;gap:2px;height:22px;flex:none}
 .qh-tabs button{flex:1;min-width:0;min-height:0!important;height:22px;padding:0!important;font-size:12px;color:#a59c86;background:linear-gradient(#2a2826,#1a1918);border:1px solid #3d362a;border-radius:2px}
 .qh-tabs button.toggle{flex:0 0 22px;font-size:10px}
 .qh-tabs button[aria-pressed=true]{color:#ffe2a0;background:linear-gradient(#5a4828,#352a17);border-color:#a3864d}
 .qh-list{flex:1;min-height:0;overflow-y:auto;padding:2px 6px;background:#0b0b0b;border:1px solid #2f2a22;font-size:12px;line-height:1.45;scrollbar-width:thin;scrollbar-color:#6b5a3a #0b0b0b}
 .qh-list .say{color:#fff}.qh-list .sys{color:#e9dcae}.qh-list .drop{color:#9fe0ff}.qh-list .journal{color:#c5b9ff}
 .qh-input{display:flex;gap:3px;height:24px;flex:none}
 .qh-input select,.qh-input input,.qh-input button{min-height:0!important;height:24px;font-size:12px;border:1px solid #4a3f2c;border-radius:2px;background:#0d0d0d;color:#e4d9bd;padding:0 6px}
 .qh-input select{flex:0 0 58px}.qh-input input{flex:1;min-width:0}
 .qh-input button{flex:0 0 52px;background:linear-gradient(#4a3c22,#2a2214);border-color:#9b8150;color:#f3dfae}
 .qh-right{left:758px;top:30px;width:198px;bottom:4px;display:flex;flex-direction:column;gap:4px}
 .qh-icons{display:grid;grid-template-columns:repeat(8,1fr);gap:2px;height:24px;flex:none}
 .qh-icons button{min-height:0!important;padding:0!important;height:24px;border:1px solid #4a3f2c;border-radius:2px;background-color:#1a1712;background-repeat:no-repeat;cursor:pointer;overflow:hidden}
 .qh-icons button:hover,.qh-icons button:focus-visible{border-color:#e6c776;background-color:#3a3020}
 .qh-icons button span{font-size:10px;color:#e8d6a6;line-height:22px}
 /* 既有元件搬進對話框 */
 .game.classic-hud>.hud,.game.classic-hud>.nav,.game.classic-hud>.exp-track,.game.classic-hud>.reference-messages{display:none!important}
 .game.classic-hud>.quick-slots{position:absolute!important;left:calc(var(--qh-l) + 758px*var(--qh-s))!important;bottom:calc(32px*var(--qh-s))!important;top:auto!important;right:auto!important;
  width:calc(198px*var(--qh-s))!important;height:calc(94px*var(--qh-s))!important;transform:none!important;margin:0!important;padding:0!important;background:transparent!important;border:0!important;z-index:7;display:block!important}
 .game.classic-hud>.quick-slots>.quick-expanded-row:first-child{display:grid!important;grid-template-columns:repeat(5,1fr)!important;grid-template-rows:repeat(2,1fr)!important;gap:calc(2px*var(--qh-s))!important;width:100%!important;height:100%!important;margin:0!important;padding:0!important}
 .game.classic-hud>.quick-slots>.quick-expanded-row:not(:first-child),.game.classic-hud>.quick-slots>.quick-expand-arrow{display:none!important}
 .game.classic-hud>.quick-slots .combat-quick-slot{position:relative;width:auto!important;height:auto!important;min-width:0!important;min-height:0!important;margin:0!important;padding:calc(2px*var(--qh-s))!important;
  background:#0c0c0c!important;border:1px solid #3b3326!important;border-radius:2px;box-shadow:inset 0 0 4px #000!important;font-size:calc(10px*var(--qh-s))!important;color:#d9cba2}
 .game.classic-hud>.quick-slots .combat-quick-slot .quick-key{display:none!important}
 .game.classic-hud>.quick-slots .combat-quick-slot::before{content:attr(data-qh-key);position:absolute;left:2px;top:0;font-size:calc(9px*var(--qh-s));color:#6f6553;pointer-events:none}
 .game.classic-hud>.quick-slots .combat-quick-slot img{width:100%!important;height:100%!important;object-fit:contain}
 .game.classic-hud>.bottom .actions,.game.classic-hud>.bottom .pad{bottom:calc(${DH+8}px*var(--qh-s))!important}
 .game.classic-hud>.auto-potion-hud{top:12px!important}
 `;document.head.append(css);

 const el=(tag,cls,text)=>{const e=document.createElement(tag);if(cls)e.className=cls;if(text!==undefined)e.textContent=text;return e};
 const bar=el('div','classic-hud-bar');bar.setAttribute('aria-label','狀態列');game.append(bar);
 const at=(e,x,w)=>{e.style.left=x+'px';e.style.width=w+'px';bar.append(e);return e};
 bar.append(el('div','qh-frame'));for(const x of [205,753])at(el('div','qh-sep'),x,3);
 const place=el('div','qh-place');bar.append(place);
 function gauge(kind,x,w){const g=at(el('div','qh-gauge '+kind),x,w);g.append(el('i'),el('span'));return g}
 const hpG=gauge('hp',214,252),mpG=gauge('mp',494,252);bar.append(el('div','qh-dragon'));
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
 function renderList(){list.replaceChildren(...messages.filter(m=>filter==='all'||m.kind===filter||(filter==='sys'&&m.kind==='journal')).map(m=>el('div',m.kind,m.text)));list.scrollTop=list.scrollHeight}
 function push(text,kind){messages.push({text,kind});if(messages.length>150)messages.shift();renderList()}
 const log=document.querySelector('#log');let lastLog='';
 function capture(){const t=log?.textContent.trim();if(!t||t===lastLog)return;lastLog=t;push(t,t.startsWith('[日誌]')?'journal':/獲得|撿起|拾取|掉落/.test(t)?'drop':'sys')}
 if(log){new MutationObserver(capture).observe(log,{childList:true,characterData:true,subtree:true});capture()}
 input.onsubmit=e=>{e.preventDefault();const t=text.value.trim();if(!t)return;text.value='';const who=window.activeCharacterName||'我';
  if(channel.value==='world'&&window.LocalServerClient?.online&&typeof LocalServerClient.chat==='function'){LocalServerClient.chat(t);push('[世界] '+who+'：'+t,'world');return}
  push((channel.value==='world'?'[世界] ':'')+who+'：'+t,channel.value==='world'?'world':'say')};
 text.addEventListener('keydown',e=>e.stopPropagation());
 // 右：快捷格（QuickSlots 第一排 F1～F10）＋功能鈕
 const right=el('div','qh-right'),spacer=el('div');spacer.style.flex='1';const icons=el('div','qh-icons');right.append(spacer,icons);bar.append(right);
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
 // 版面：橫向畫面啟用；寬度最多 960，高度最多佔畫面 32%
 function layout(){const r=game.getBoundingClientRect(),on=r.width>=560&&r.width>r.height;game.classList.toggle('classic-hud',on);if(!on)return;
  const s=Math.min(r.width/DW,1,r.height*.32/DH);game.style.setProperty('--qh-s',s);game.style.setProperty('--qh-l',(r.width-DW*s)/2+'px');refresh()}
 new ResizeObserver(layout).observe(game);layout();
 const baseStats=stats;stats=function(...args){const out=baseStats.apply(this,args);refresh();return out};
 setInterval(refresh,1000);
})();
