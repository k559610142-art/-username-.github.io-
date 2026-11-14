// Current-map loot reference. Reading dropInfo never rolls loot or changes inventory.
window.AreaLoot=(()=>{
 const radius=40,game=document.querySelector('.game');let win=null,body=null,search=null,title=null,signature='',query='';
 const el=(tag,cls,text)=>{const n=document.createElement(tag);n.className=cls||'';if(text!==undefined)n.textContent=text;return n;};
 const button=(text,fn,cls='al-button')=>{const n=el('button',cls,text);n.type='button';n.onclick=fn;return n;};
 const percent=chance=>(chance/10000).toFixed(4).replace(/\.?0+$/,'')+'%';
 function nearby(){
  if(window.gameFlowState!=='playing')return [];const id=window.activeMapId||0,found=new Map();
  for(const mob of IslandMonsters.around(worldX,worldY,radius))if(mob.spawn.npc?.kind==='L1Monster')found.set(mob.spawn.npcId,mob);
  if(typeof islandMonsterSpawns!=='undefined')for(const spawn of islandMonsterSpawns){if((spawn.mapId||0)!==id||spawn.resident||spawn.npc?.kind!=='L1Monster'||!spawn.point||Math.max(Math.abs(spawn.point[0]-worldX),Math.abs(spawn.point[1]-worldY))>radius)continue;if(!found.has(spawn.npcId))found.set(spawn.npcId,{spawn,x:spawn.point[0],y:spawn.point[1]});}
  return [...found.values()].map(mob=>({id:mob.spawn.npcId,npc:mob.spawn.npc,drops:PlayerProgression.dropInfo(mob)})).sort((a,b)=>a.npc.level-b.npc.level||a.npc.name.localeCompare(b.npc.name,'zh-Hant'));
 }
 function snapshot(){const monsters=nearby(),treasures=new Map();for(const mob of monsters)for(const drop of mob.drops){if(drop.id===40308)continue;const old=treasures.get(drop.id);if(!old||drop.chance>old.chance)treasures.set(drop.id,{...drop});}return {mapId:window.activeMapId||0,name:WorldMaps.name(window.activeMapId||0),radius,monsters,treasures:[...treasures.values()].sort((a,b)=>a.chance-b.chance)};}
 function dropRow(drop,summary=false){const row=el('div','al-drop');if(drop.icon){const image=el('img');image.src=drop.icon;image.alt='';image.loading='lazy';row.append(image);}const text=el('span','al-drop-name',drop.name+(summary?'':drop.min===drop.max?' ×'+drop.min:' ×'+drop.min+'～'+drop.max));row.append(text,el('strong','', (summary?'最高 ':'')+percent(drop.chance)));row.title=summary?'本區怪物中，這項寶物的最高單筆掉落率':drop.source==='region'?'地圖追加掉落，獨立判定':'怪物掉落，獨立判定';return row;}
 function render(){
  if(!win)return;const data=snapshot(),q=query.trim().toLowerCase();title.textContent=data.name+'（附近）';body.replaceChildren();
  const note=el('p','al-note','附近 '+radius+' 格 · '+data.monsters.length+' 種怪物 · 顯示目前掉落倍率後機率');body.append(note);
  if(data.treasures.length&&!q){const section=el('section','al-summary');section.append(el('h3','','本區寶物'));for(const drop of data.treasures.slice(0,8)){const b=button('',()=>{query=drop.name;search.value=query;render();},'al-treasure');b.append(dropRow(drop,true));section.append(b);}body.append(section);}
  const visible=data.monsters.filter(m=>!q||m.npc.name.toLowerCase().includes(q)||m.drops.some(d=>d.name.toLowerCase().includes(q)));
  for(const m of visible){const card=el('section','al-monster'),head=el('div','al-monster-head');head.append(el('strong','',m.npc.name),el('small','', (m.npc.aggressive?'主動':'被動')+' · Lv.'+m.npc.level));card.append(head);
   const stats=el('div','al-stats');for(const [label,value]of [['HP',m.npc.hp],['AC',m.npc.ac],['魔防',m.npc.mr],['基礎經驗',m.npc.exp]])stats.append(el('span','',label+' '+(value??'—')));card.append(stats);
   const list=m.drops.filter(d=>!q||m.npc.name.toLowerCase().includes(q)||d.name.toLowerCase().includes(q));for(const drop of list)card.append(dropRow(drop));if(!list.length)card.append(el('p','al-note','沒有已登錄的掉落物。'));body.append(card);
  }
  if(!visible.length)body.append(el('p','al-empty',data.monsters.length?'附近怪物沒有符合搜尋的掉落物。':'附近沒有已登錄的怪物，可移動到野外查看。'));
 }
 function close(){win?.remove();win=body=search=title=null;signature='';}
 function open(){if(window.gameFlowState!=='playing')return;if(win){render();return;}win=el('section','area-loot');win.setAttribute('role','dialog');win.setAttribute('aria-label','本區掉寶');const head=el('div','al-head');title=el('h2');const x=button('✕',close,'al-close');x.setAttribute('aria-label','關閉本區掉寶');head.append(title,x);search=el('input','al-search');search.type='search';search.placeholder='搜尋怪物或掉落物品';search.setAttribute('aria-label',search.placeholder);search.value=query;search.oninput=()=>{query=search.value;render();};body=el('div','al-body');win.append(head,search,body);game.append(win);render();x.focus();}
 const quick=button('本區掉寶',open,'area-loot-quick');quick.hidden=true;game.append(quick);
 function position(){const active=window.gameFlowState==='playing';quick.hidden=!active;if(!active){if(win)close();return;}const g=game.getBoundingClientRect(),menu=game.querySelector('.oh-menu-btn')?.getBoundingClientRect(),mini=game.querySelector('.minimap-button')?.getBoundingClientRect(),loc=game.querySelector('.location')?.getBoundingClientRect();if(menu?.width){quick.style.right=Math.max(8,g.right-menu.left+6)+'px';quick.style.top=(menu.top-g.top+(menu.height-30)/2)+'px';}else{quick.style.right='8px';quick.style.top=(Math.max(mini?.bottom||g.top+100,loc?.bottom||0)-g.top+8)+'px';}}
 setInterval(()=>{position();if(!win)return;const key=[window.activeCharacterId,window.activeMapId||0,Math.floor(worldX/8),Math.floor(worldY/8),new Date().getUTCHours()].join('|');if(key!==signature){signature=key;render();}},1000);
 new ResizeObserver(position).observe(game);document.addEventListener('keydown',e=>{if(e.key==='Escape'&&win){e.preventDefault();close();}});position();return {open,close,snapshot,percent};
})();
