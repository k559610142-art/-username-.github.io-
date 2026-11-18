// 當前任務框（使用者 2026-11-17）：畫面左側、隊伍／召喚欄下方、聊天框上方的半透明框，可上下捲動。
//  內容：等級任務（data/level-quests.js，進度＝背包任務道具數量）、傭兵任務（data/mercenary.js 的合約）。
// 手機與桌面共用收合抽屜，預設只顯示任務按鈕；展開後可捲動每日／等級／傭兵任務。
const QuestTracker=(()=>{
 const game=document.querySelector('.game'),root=document.createElement('aside');root.className='quest-tracker';root.hidden=true;root.setAttribute('aria-label','當前任務');game.append(root);
 const toggle=document.createElement('button'),content=document.createElement('div');let expanded=false,owner=null;
 toggle.type='button';toggle.className='qt-drawer-toggle';toggle.setAttribute('aria-controls','quest-tracker-content');content.id='quest-tracker-content';content.className='qt-drawer-content';root.append(toggle,content);
 function setExpanded(value){expanded=!!value;toggle.setAttribute('aria-expanded',String(expanded));toggle.textContent=expanded?'任務 ▾':'任務 ▸';content.hidden=!expanded;root.classList.toggle('qt-expanded',expanded);position();}
 let lastTouchToggle=0;
 toggle.onclick=()=>{if(Date.now()-lastTouchToggle<800)return;setExpanded(!expanded);};
 toggle.addEventListener('pointerup',event=>{if(event.pointerType==='touch'&&event.isPrimary!==false){event.preventDefault();lastTouchToggle=Date.now();setExpanded(!expanded);}});
 const css=document.createElement('style');css.textContent=`
 .quest-tracker{position:absolute;z-index:40;box-sizing:border-box;overflow:hidden;pointer-events:auto;scrollbar-width:thin;scrollbar-color:#8d784c #151c1600;color:#e6dcc3;font:12px/1.35 system-ui;text-shadow:0 1px 2px #000,0 0 3px #000;background:linear-gradient(90deg,#0d140d8c,#0d140d33);border-left:2px solid #8d784c99;border-radius:3px;padding:0;max-width:calc(100% - 12px)}
 .quest-tracker[hidden],.qt-drawer-content[hidden]{display:none!important}
 .quest-tracker .qt-drawer-toggle{display:block;width:100%;min-height:44px;padding:8px 12px;text-align:left;cursor:pointer;border:1px solid #8d784c99;border-radius:3px;background:linear-gradient(#242b20ee,#101a13ee);color:#ebd599;font:600 13px/1.4 system-ui;letter-spacing:1px;touch-action:manipulation}
 .qt-drawer-toggle:focus-visible{outline:2px solid #edce7c;outline-offset:-3px}
 .qt-drawer-content{padding:8px;overflow-y:auto;overscroll-behavior:contain;touch-action:pan-y;scrollbar-width:thin;scrollbar-color:#8d784c #151c16}
 .quest-tracker h3{margin:0 0 4px;font-size:12.5px;color:#ebd599;letter-spacing:1px}
 .quest-tracker section+section{margin-top:8px}
 .quest-tracker .qt-item{display:block;width:100%;text-align:left;margin:0 0 5px;padding:0;background:none;border:0;color:inherit;font:inherit;cursor:pointer}
 .quest-tracker .qt-name{color:#f3e6c2;font-weight:600}.quest-tracker .qt-goal{color:#cfc4a8;font-size:11.5px}
 .quest-tracker .qt-done{color:#8fe08a}.quest-tracker .qt-item:hover .qt-name{color:#ffe2a0}`;document.head.append(css);
 const el=(tag,cls,text)=>{const n=document.createElement(tag);n.className=cls||'';if(text!==undefined)n.textContent=text;return n;};
 const byId=new Map(INTERFACE_CATALOG.items.map(i=>[i.id,i]));
 const itemName=id=>byId.get(id)?.name||String(id),mobName=id=>islandMonsterTemplates[id]?.name||String(id);
 const have=id=>(window.OwnedInventory?.items||[]).filter(e=>!e.slot&&e.item.id===id).reduce((n,e)=>n+e.count,0);
 const fmt=ms=>{const s=Math.max(0,Math.ceil(ms/1000)),h=Math.floor(s/3600),m=Math.floor(s%3600/60),r=s%60;return (h?h+':'+String(m).padStart(2,'0'):m)+':'+String(r).padStart(2,'0');};
 const mobs=list=>{const n=[...new Set(list.map(mobName))];return n.length>3?n.slice(0,3).join('／')+' 等'+n.length+'種':n.join('／');};
 // 每日任務（data/daily-quests.js）：完成的排到後面
 function dailyQuests(){const list=window.DailyQuests?.list()||[];return list.slice().sort((a,b)=>a.done-b.done).map(t=>({name:t.label,lines:[{text:t.done?'完成（💎10 已領）':t.progress+' / '+t.count,done:t.done}],open:()=>{}}));}
 function levelQuests(){
  const ids=new Set(window.LevelQuests?.active()||[]);if(!ids.size||typeof LEVEL_QUESTS==='undefined')return [];
  return LEVEL_QUESTS.filter(q=>ids.has(q.id)).map(q=>({name:q.name,lines:q.targets.map(t=>{const n=Math.min(have(t.item),t.count);return {text:mobs(t.mobs)+' → '+itemName(t.item)+' '+n+'/'+t.count,done:n>=t.count};}),open:()=>window.LevelQuests?.open()}));
 }
 function mercQuest(){
  const k=window.Mercenary?.contract;if(!k)return [];const now=Date.now();
  if(k.mode==='follow')return k.until>now?[{name:'傭兵跟隨：'+k.name,lines:[{text:'剩餘 '+fmt(k.until-now)}],open:()=>typeof runGameMenuAction==='function'&&runGameMenuAction('mercenary')}]:[];
  if(k.claimed)return [];const m=window.MERCENARY_RULES?.missions?.find(x=>x.id===k.missionId);
  return [{name:'傭兵任務：'+(m?.name||'任務')+'（'+k.name+'）',lines:[k.until>now?{text:'剩餘 '+fmt(k.until-now)}:{text:'完成！到 傭兵團 → 我的傭兵 領取',done:true}],open:()=>typeof runGameMenuAction==='function'&&runGameMenuAction('mercenary')}];
 }
 function section(title,list){const s=el('section');s.append(el('h3','',title));for(const q of list){const b=el('button','qt-item');b.type='button';b.onclick=q.open;b.append(el('div','qt-name',q.name));for(const l of q.lines)b.append(el('div','qt-goal'+(l.done?' qt-done':''),'・'+l.text));s.append(b);}return s;}
 function position(){
  const g=game.getBoundingClientRect(),hud=game.querySelector(':scope>.hud')?.getBoundingClientRect(),party=game.querySelector('.party-hud');
  const chat=['.oh-msg','.qh-chat','.reference-messages'].map(s=>game.querySelector(s)?.getBoundingClientRect()).find(r=>r?.height>0);
  let top=Math.max(8,(hud?.bottom??g.top+110)-g.top+14);if(party&&!party.hidden){const p=party.getBoundingClientRect();top=p.bottom-g.top+8;}
  // 與聊天欄錯開，避免任務按鈕被聊天頁籤蓋住。
  if(chat&&chat.top<g.top+top+44&&chat.bottom>g.top+top)top=chat.bottom-g.top+8;
  const bottom=chat&&chat.top>g.top+top+60?chat.top-g.top-10:g.height-110,left=Math.max(6,(hud?.left??g.left+8)-g.left);
  root.style.left=left+'px';root.style.top=top+'px';root.style.maxHeight=Math.max(60,bottom-top)+'px';root.style.width=(expanded?Math.min(230,Math.max(150,g.width*.38)):96)+'px';content.style.maxHeight=Math.max(48,bottom-top-48)+'px';
 }
 let sig='';
 function tick(){
  if(window.gameFlowState!=='playing'){root.hidden=true;sig='';owner=null;expanded=false;return;}
  if(owner!==window.activeCharacterId){owner=window.activeCharacterId;setExpanded(false);}
  const daily=dailyQuests(),lv=levelQuests(),merc=mercQuest(),key=JSON.stringify([daily.map(q=>[q.name,q.lines]),lv.map(q=>[q.name,q.lines]),merc.map(q=>[q.name,q.lines])]);
  root.hidden=!daily.length&&!lv.length&&!merc.length;if(root.hidden)return;position();if(key===sig)return;sig=key;
  const scroll=content.scrollTop,parts=[];if(daily.length){const t=window.DailyQuests.list(),done=t.filter(x=>x.done).length;parts.push(section('每日任務（'+done+'/'+t.length+'）'+(window.DailyQuests.chest?' ✔獎勵箱':''),daily));}if(lv.length)parts.push(section('等級任務',lv));if(merc.length)parts.push(section('傭兵任務',merc));content.replaceChildren(...parts);content.scrollTop=scroll;
 }
 setExpanded(false);new ResizeObserver(()=>{if(!root.hidden)position();}).observe(game);
 setInterval(tick,1000);return {refresh:tick,toggle:()=>setExpanded(!expanded),get expanded(){return expanded;}};
})();window.QuestTracker=QuestTracker;
