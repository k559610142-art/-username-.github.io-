// 當前任務框（使用者 2026-11-17）：畫面左側、隊伍／召喚欄下方、聊天框上方的半透明框，可上下捲動。
//  內容：等級任務（data/level-quests.js，進度＝背包任務道具數量）、傭兵任務（data/mercenary.js 的合約）。
//  每日任務遊戲目前沒有這個系統，等規則定好再加一段 section。沒有任何任務時整塊隱藏。點等級任務開「任務」清單。
const QuestTracker=(()=>{
 const game=document.querySelector('.game'),root=document.createElement('aside');root.className='quest-tracker';root.hidden=true;root.setAttribute('aria-label','當前任務');game.append(root);
 const css=document.createElement('style');css.textContent=`
 .quest-tracker{position:absolute;z-index:7;box-sizing:border-box;overflow-y:auto;pointer-events:auto;scrollbar-width:thin;scrollbar-color:#8d784c #151c1600;color:#e6dcc3;font:12px/1.35 system-ui;text-shadow:0 1px 2px #000,0 0 3px #000;background:linear-gradient(90deg,#0d140d8c,#0d140d33);border-left:2px solid #8d784c99;border-radius:3px;padding:6px 8px;max-width:calc(100% - 12px)}
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
  const bottom=chat&&chat.top>g.top+top+60?chat.top-g.top-10:g.height-110,left=Math.max(6,(hud?.left??g.left+8)-g.left);
  root.style.left=left+'px';root.style.top=top+'px';root.style.maxHeight=Math.max(60,bottom-top)+'px';root.style.width=Math.min(230,Math.max(150,g.width*.38))+'px';
 }
 let sig='';
 function tick(){
  if(window.gameFlowState!=='playing'){root.hidden=true;sig='';return;}
  const lv=levelQuests(),merc=mercQuest(),key=JSON.stringify([lv.map(q=>[q.name,q.lines]),merc.map(q=>[q.name,q.lines])]);
  root.hidden=!lv.length&&!merc.length;if(root.hidden)return;position();if(key===sig)return;sig=key;
  const scroll=root.scrollTop,parts=[];if(lv.length)parts.push(section('等級任務',lv));if(merc.length)parts.push(section('傭兵任務',merc));root.replaceChildren(...parts);root.scrollTop=scroll;
 }
 setInterval(tick,1000);return {refresh:tick};
})();window.QuestTracker=QuestTracker;
