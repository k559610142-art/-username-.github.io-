// 水晶球式底部介面（自創，圖形全部用 CSS 畫）：
//  左下：遊戲訊息／對話框（分頁＋訊息＋輸入列，半透明不擋畫面）
//  中下：左邊 HP 水晶、右邊 MP 水晶，中間一條快捷列：左半技能 F1～F6、右半藥水 F7～F10，上緣一條經驗線
//  MP 水晶右側：功能鈕（能力、魔法、背包、裝備、地圖、選單、設定）
// 只在橫向畫面啟用；設定裡可切回奇岩式（window.HudStyle，存在 localStorage 'hudStyle'）。
(()=>{
 const KEY='hudStyle',game=document.querySelector('.game');
 let style='orb';try{style=localStorage.getItem(KEY)||'orb'}catch{}
 const css=document.createElement('style');css.textContent=`
 .orb-hud-root{display:none}
 .game.orb-hud .orb-hud-root{display:block;position:absolute;inset:0;pointer-events:none;z-index:6;--o:var(--oh-s,1)}
 .orb-hud-root>*{position:absolute;pointer-events:auto;box-sizing:border-box}
 .game.orb-hud>.hud,.game.orb-hud>.nav,.game.orb-hud>.exp-track,.game.orb-hud>.reference-messages{display:none!important}
 /* 訊息框 */
 .oh-msg{left:calc(10px*var(--o));bottom:calc(10px*var(--o));width:max(150px,min(calc(340px*var(--o)),calc(50% - 410px*var(--o) - 14px)));height:calc(200px*var(--o));display:flex;flex-direction:column;gap:calc(3px*var(--o));font-size:calc(12px*var(--o))}
 .oh-msg .tabs{display:flex;gap:calc(3px*var(--o));opacity:.75;transition:opacity .2s}
 .oh-msg:hover .tabs,.oh-msg:focus-within .tabs{opacity:1}
 .oh-msg .tabs button{min-height:0!important;padding:calc(1px*var(--o)) calc(7px*var(--o))!important;font-size:calc(11px*var(--o));color:#cfc6b0;background:#0009;border:1px solid #ffffff22;border-radius:calc(9px*var(--o))}
 .oh-msg .tabs button[aria-pressed=true]{color:#ffe08a;border-color:#d8b56a}
 .oh-msg .list{flex:1;min-height:0;overflow-y:auto;padding:calc(4px*var(--o)) calc(6px*var(--o));background:linear-gradient(90deg,#000a,#0006 70%,#0000);color:#f1d98e;line-height:1.5;text-shadow:1px 1px 0 #000,0 0 3px #000;scrollbar-width:thin;scrollbar-color:#8a7650 #0000}
 .oh-msg .list .say{color:#fff}.oh-msg .list .drop{color:#9fe0ff}.oh-msg .list .journal{color:#c5b9ff}
 .oh-msg form{display:flex;gap:calc(3px*var(--o))}
 .oh-msg form input{flex:1;min-width:0;min-height:0!important;height:calc(24px*var(--o));padding:0 calc(6px*var(--o));font-size:calc(12px*var(--o));color:#fff;background:#000a;border:1px solid #ffffff2a;border-radius:calc(3px*var(--o))}
 .oh-msg form button{min-height:0!important;height:calc(24px*var(--o));padding:0 calc(10px*var(--o))!important;font-size:calc(12px*var(--o));color:#f3dfae;background:#3a2c16cc;border:1px solid #9b8150;border-radius:calc(3px*var(--o))}
 /* 中下：水晶＋快捷列 */
 .oh-center{left:50%;bottom:calc(4px*var(--o));width:calc(820px*var(--o));height:calc(150px*var(--o));transform:translateX(-50%);pointer-events:none!important}
 .oh-center>*{position:absolute;pointer-events:auto}
 .oh-bar{left:calc(140px*var(--o));right:calc(140px*var(--o));bottom:calc(10px*var(--o));height:calc(66px*var(--o));border-radius:calc(6px*var(--o));
  background:linear-gradient(#2b2d31,#141518 60%,#0c0d0f);border:calc(2px*var(--o)) solid #5c4a2c;box-shadow:inset 0 1px 0 #ffffff1a,inset 0 0 0 1px #000,0 4px 12px #000b}
 .oh-bar::before,.oh-bar::after{position:absolute;top:calc(-15px*var(--o));font-size:calc(10px*var(--o));letter-spacing:2px;color:#d8c08a;text-shadow:1px 1px 0 #000}
 .oh-bar::before{content:'技能';left:calc(8px*var(--o))}.oh-bar::after{content:'藥水';right:calc(8px*var(--o))}
 .oh-exp{left:calc(146px*var(--o));right:calc(146px*var(--o));bottom:calc(77px*var(--o));height:calc(4px*var(--o));background:#000c;border-radius:2px;overflow:hidden}
 .oh-exp i{display:block;height:100%;width:var(--fill,0%);background:linear-gradient(90deg,#b8862a,#ffe08a)}
 .oh-orb{bottom:0;width:calc(132px*var(--o));height:calc(150px*var(--o));filter:drop-shadow(0 4px 8px #000c)}
 .oh-orb.hp{left:0}.oh-orb.mp{right:0}
 .oh-orb .shell{position:absolute;inset:0;clip-path:polygon(50% 0,96% 30%,96% 72%,50% 100%,4% 72%,4% 30%);background:linear-gradient(135deg,#d9d2c0,#6f6a60 30%,#2a2826 55%,#8d8676 80%,#e6dfcc)}
 .oh-orb .glass{position:absolute;inset:calc(7px*var(--o));clip-path:polygon(50% 0,96% 30%,96% 72%,50% 100%,4% 72%,4% 30%);background:#0b0a0c;overflow:hidden}
 .oh-orb .liquid{position:absolute;left:0;right:0;bottom:0;height:var(--fill,100%);transition:height .25s}
 .oh-orb.hp .liquid{background:radial-gradient(ellipse at 40% 20%,#ff8a6a,#c0261a 45%,#5c0a06)}
 .oh-orb.mp .liquid{background:radial-gradient(ellipse at 40% 20%,#8fd0ff,#2a74d6 45%,#0b2a63)}
 .oh-orb .facet{position:absolute;inset:calc(7px*var(--o));clip-path:polygon(50% 0,96% 30%,96% 72%,50% 100%,4% 72%,4% 30%);pointer-events:none;
  background:linear-gradient(115deg,#ffffff55 0,#ffffff10 30%,transparent 31%),linear-gradient(245deg,transparent 60%,#ffffff18 61%,transparent 75%),linear-gradient(transparent 49.5%,#ffffff22 50%,transparent 50.5%)}
 .oh-orb span{position:absolute;left:0;right:0;top:44%;text-align:center;font-weight:bold;font-size:calc(13px*var(--o));color:#fff;text-shadow:0 0 3px #000,1px 1px 0 #000;pointer-events:none}
 .oh-orb small{position:absolute;left:0;right:0;top:30%;text-align:center;font-size:calc(10px*var(--o));letter-spacing:2px;color:#ffffffb0;text-shadow:1px 1px 0 #000;pointer-events:none}
 .oh-icons{right:calc(-58px*var(--o));bottom:calc(8px*var(--o));display:grid;grid-template-columns:repeat(2,calc(26px*var(--o)));gap:calc(3px*var(--o))}
 .oh-icons button{width:calc(26px*var(--o));height:calc(26px*var(--o));min-height:0!important;padding:0!important;font-size:calc(11px*var(--o));color:#f0dcae;background:linear-gradient(#3a3020,#1c160d);border:1px solid #8a6f40;border-radius:calc(4px*var(--o))}
 .oh-icons button:hover{border-color:#ffe08a}
 /* 快捷列：QuickSlots 第一排 10 格放進中間條 */
 .game.orb-hud>.quick-slots{position:absolute!important;left:50%!important;right:auto!important;top:auto!important;bottom:calc(20px*var(--oh-s,1))!important;transform:translateX(-50%)!important;
  width:calc(520px*var(--oh-s,1))!important;height:calc(48px*var(--oh-s,1))!important;margin:0!important;padding:0!important;background:transparent!important;border:0!important;z-index:7;display:block!important}
 .game.orb-hud>.quick-slots>.quick-expanded-row:first-child{display:flex!important;gap:calc(4px*var(--oh-s,1))!important;width:100%!important;height:100%!important;margin:0!important;padding:0!important}
 .game.orb-hud>.quick-slots>.quick-expanded-row:not(:first-child),.game.orb-hud>.quick-slots>.quick-expand-arrow{display:none!important}
 .game.orb-hud>.quick-slots .combat-quick-slot{position:relative;flex:1 1 0;width:auto!important;height:100%!important;min-width:0!important;min-height:0!important;margin:0!important;padding:calc(3px*var(--oh-s,1))!important;
  background:radial-gradient(#26282c,#111214)!important;border:1px solid #4d4130!important;border-radius:calc(4px*var(--oh-s,1));box-shadow:inset 0 0 6px #000!important;font-size:calc(10px*var(--oh-s,1))!important;color:#d9cba2}
 .game.orb-hud>.quick-slots .combat-quick-slot:nth-child(7){margin-left:calc(18px*var(--oh-s,1))!important}
 .game.orb-hud>.quick-slots .combat-quick-slot:nth-child(n+7){border-color:#2f5a7a!important}
 .game.orb-hud>.quick-slots .combat-quick-slot .quick-key{display:none!important}
 .game.orb-hud>.quick-slots .combat-quick-slot::after{content:attr(data-oh-key);position:absolute;left:0;right:0;bottom:calc(-13px*var(--oh-s,1));text-align:center;font-size:calc(9px*var(--oh-s,1));color:#c9b98e;text-shadow:1px 1px 0 #000;pointer-events:none}
 .game.orb-hud>.quick-slots .combat-quick-slot img{width:100%!important;height:100%!important;object-fit:contain}
 .game.orb-hud>.bottom .actions,.game.orb-hud>.bottom .pad{bottom:calc(170px*var(--oh-s,1))!important}
 `;document.head.append(css);

 const el=(tag,cls,text)=>{const e=document.createElement(tag);if(cls)e.className=cls;if(text!==undefined)e.textContent=text;return e};
 const root=el('div','orb-hud-root');root.setAttribute('aria-label','狀態列');game.append(root);
 // 訊息框
 const msg=el('section','oh-msg'),tabs=el('div','tabs'),list=el('div','list'),form=el('form'),input=el('input'),send=el('button','','發送');
 list.setAttribute('aria-live','polite');list.setAttribute('aria-label','遊戲訊息');input.placeholder='輸入訊息';input.maxLength=60;input.setAttribute('aria-label','輸入訊息');send.type='submit';form.append(input,send);
 let filter='all';const messages=[];
 for(const [k,l]of [['all','全部'],['say','一般'],['drop','掉落'],['sys','系統']]){const b=el('button','',l);b.type='button';b.setAttribute('aria-pressed',String(k===filter));b.onclick=()=>{filter=k;for(const t of tabs.children)t.setAttribute('aria-pressed',String(t===b));render()};tabs.append(b)}
 msg.append(tabs,list,form);root.append(msg);
 function render(){list.replaceChildren(...messages.filter(m=>filter==='all'||m.kind===filter||(filter==='sys'&&m.kind==='journal')).map(m=>el('div',m.kind,m.text)));list.scrollTop=list.scrollHeight}
 function push(text,kind){messages.push({text,kind});if(messages.length>150)messages.shift();render()}
 const log=document.querySelector('#log');let last='';
 function capture(){const t=log?.textContent.trim();if(!t||t===last)return;last=t;push(t,t.startsWith('[日誌]')?'journal':/獲得|撿起|拾取|掉落/.test(t)?'drop':'sys')}
 if(log){new MutationObserver(capture).observe(log,{childList:true,characterData:true,subtree:true});capture()}
 form.onsubmit=e=>{e.preventDefault();const t=input.value.trim();if(!t)return;input.value='';push((window.activeCharacterName||'我')+'：'+t,'say')};
 input.addEventListener('keydown',e=>e.stopPropagation());
 // 中下
 const center=el('div','oh-center');root.append(center);
 const bar=el('div','oh-bar'),exp=el('div','oh-exp');exp.append(el('i'));
 function orb(kind,label){const o=el('div','oh-orb '+kind),glass=el('div','glass'),liquid=el('div','liquid');glass.append(liquid);o.append(el('div','shell'),glass,el('div','facet'),el('small','',label),el('span'));return o}
 const hpO=orb('hp','HP'),mpO=orb('mp','MP');
 const icons=el('div','oh-icons');
 for(const [label,short,fn]of [['能力（Insert）','能',()=>panel('status')],['魔法（Delete）','魔',()=>panel('magic')],['背包（Tab）','包',()=>panel('bag')],['裝備（E）','裝',()=>panel('equipment')],
  ['地圖','圖',()=>document.querySelector('#overview')?.onclick?.()],['選單','單',()=>document.querySelectorAll('.nav button')[2]?.click()],['設定（Home）','設',()=>panel('settings')]]){const b=el('button','',short);b.type='button';b.title=label;b.setAttribute('aria-label',label);b.onclick=fn;icons.append(b)}
 center.append(bar,exp,hpO,mpO,icons);
 // 數值
 function expPct(){const lv=window.activeCharacterLevel||1,e=window.activeCharacterExperience||0,t=typeof killRewardData!=='undefined'?killRewardData.thresholds:null;const a=t?.find(r=>r[0]===lv)?.[1],b=t?.find(r=>r[0]===lv+1)?.[1];return Number.isFinite(a)&&Number.isFinite(b)&&b>a?Math.max(0,Math.min(100,(e-a)/(b-a)*100)):0}
 function setOrb(o,v,m){o.querySelector('.liquid').style.setProperty('--fill',(m?Math.max(0,Math.min(100,v/m*100)):0)+'%');o.querySelector('span').textContent=v+' / '+m}
 function labelSlots(){[...document.querySelectorAll('.quick-slots>.quick-expanded-row:first-child>.combat-quick-slot')].forEach((b,i)=>{b.dataset.ohKey='F'+(i+1);b.style.display=i<10?'':'none'})}
 function refresh(){if(!game.classList.contains('orb-hud')||window.gameFlowState!=='playing')return;setOrb(hpO,hp,maxHp);setOrb(mpO,mp,maxMp);const e=expPct();exp.style.setProperty('--fill',e+'%');exp.title='經驗 '+e.toFixed(2)+'%';labelSlots()}
 function layout(){const r=game.getBoundingClientRect(),on=style==='orb'&&r.width>=560&&r.width>r.height;game.classList.toggle('orb-hud',on);
  if(on){game.classList.remove('classic-hud');game.style.setProperty('--oh-s',Math.max(.55,Math.min(r.height/620,r.width/1000,1.4)));refresh()}}
 new ResizeObserver(layout).observe(game);addEventListener("resize",layout);
 const baseStats=stats;stats=function(...args){const out=baseStats.apply(this,args);refresh();return out};
 setInterval(refresh,1000);
 window.HudStyle={get current(){return style},set(v){style=v==='classic'?'classic':'orb';try{localStorage.setItem(KEY,style)}catch{}game.classList.remove('orb-hud');window.ClassicHud?.layout();layout()},layout};
 layout();
})();
