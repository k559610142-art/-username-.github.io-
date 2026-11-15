// 等級任務（2026-11-15）：資料 data/level-quest-data.js。職業符合、等級到就自動接任務：
//  1. 任務怪（quest.spawns）出現在地圖上（IslandMonsters.addQuestSpawns），完成後消失；
//  2. 打到任務道具（DB droplist，或 target.drop 補的掉落）放進背包；
//  3. 背包湊齊所有任務道具就自動完成：收走任務道具、發獎勵、記在角色存檔 character.levelQuests。
// 目錄「任務」開任務清單（open）。
const LevelQuests=(()=>{
 const byId=new Map(INTERFACE_CATALOG.items.map(i=>[i.id,i]));
 const keyOf=id=>{const i=byId.get(id);return i?i.kind+':'+i.id:null;};
 const nameOf=id=>byId.get(id)?.name||String(id);
 const mobName=id=>islandMonsterTemplates[id]?.name||String(id);
 let done=new Set(),owner='',signature='';
 // 任務怪生怪資料：格式同 dungeonMonsterSpawns，spawnId 用 9 開頭的獨立編號
 const spawns=[];
 for(const q of LEVEL_QUESTS)(q.spawns||[]).forEach((s,i)=>{const npc=islandMonsterTemplates[s.npcId];if(!npc)return;
  const point=s.point||[(s.bounds[0]+s.bounds[2])>>1,(s.bounds[1]+s.bounds[3])>>1];
  const spawn={mapId:s.mapId,spawnId:900000000+q.id*100+i,zone:'【任務】'+q.name,count:s.count,npcId:s.npcId,group:0,point,random:s.random||[0,0],
   bounds:s.bounds||[0,0,0,0],heading:0,respawn:[60,120],movement:0,npc,quest:q.id};
  spawns.push(spawn);islandMonsterSpawns.push(spawn);});
 const level=()=>Number(window.activeCharacterLevel)||1;
 const eligible=q=>q.roles.includes(job);
 const active=q=>eligible(q)&&level()>=q.level&&!done.has(q.id);
 const have=id=>(OwnedInventory.items||[]).filter(e=>!e.slot&&e.item.id===id).reduce((n,e)=>n+e.count,0);
 function drops(mob){
  const out=[];
  for(const q of LEVEL_QUESTS)if(window.gameFlowState==='playing'&&active(q))for(const t of q.targets)
   if(t.drop&&t.mobs.includes(mob.spawn.npcId))out.push({id:t.item,min:1,max:1,chance:t.drop,fixedRate:true});
  return out;
 }
 // choice：獎勵二選一（奇岩城試煉表），pick＝q.reward 的第幾個；沒選就先不完成，等玩家在任務清單點
 const ready=q=>active(q)&&q.targets.every(t=>have(t.item)>=t.count);
 const asked=new Set();
 function complete(q,pick){
  if(q.choice&&!Number.isInteger(pick)){if(!asked.has(q.id)){asked.add(q.id);toast('任務「'+q.name+'」完成！到 目錄 → 任務 選一個獎勵：'+q.reward.map(([id])=>nameOf(id)).join(' 或 '),'journal');}return false;}
  const reward=q.choice?[q.reward[pick]].filter(Boolean):q.reward;if(!reward.length)return false;
  const next=OwnedInventory.snapshot;
  for(const t of q.targets)if(!DBGameRules.takeItem(next,keyOf(t.item),t.count))return false;
  for(const [id,count] of reward)if(!DBGameRules.addItem(next,keyOf(id),count)){toast('背包空間不足，任務「'+q.name+'」先保留，整理背包後'+(q.choice?'再選一次。':'自動完成。'));return false;}
  if(!OwnedInventory.applyChange(next))return false;
  done.add(q.id);
  const text='任務「'+q.name+'」完成！獲得 '+reward.map(([id,n])=>nameOf(id)+(n>1?' ×'+n:'')).join('、');
  toast(text,'journal');window.GameLog?.add?.(text);
  window.GameEntry?.saveActive();
  return true;
 }
 function sync(){
  if(window.gameFlowState!=='playing'||!window.activeCharacterId||OwnedInventory.owner!==window.activeCharacterId)return;
  if(owner!==window.activeCharacterId){owner=window.activeCharacterId;signature='';}
  for(const q of LEVEL_QUESTS)if(ready(q))complete(q);
  const ids=LEVEL_QUESTS.filter(active).map(q=>q.id),sig=(window.activeMapId||0)+':'+ids.join(',');
  if(sig===signature)return;
  signature=sig;const on=new Set(ids);
  IslandMonsters.removeQuestSpawns(spawn=>on.has(spawn.quest));
  IslandMonsters.addQuestSpawns(spawns.filter(s=>on.has(s.quest)&&s.mapId===(window.activeMapId||0)));
  const fresh=LEVEL_QUESTS.filter(q=>on.has(q.id)&&!announced.has(q.id));
  for(const q of fresh){announced.add(q.id);toast('接到等級任務「'+q.name+'」：'+goal(q)+'（目錄 → 任務）','journal');}
 }
 const announced=new Set();
 const goal=q=>q.targets.map(t=>'打 '+[...new Set(t.mobs.map(mobName))].join('／')+' 取得 '+nameOf(t.item)+(t.count>1?' ×'+t.count:'')).join('，');
 function restore(list){done=new Set(Array.isArray(list)?list.filter(Number.isInteger):[]);announced.clear();asked.clear();for(const q of LEVEL_QUESTS)if(eligible(q)&&level()>=q.level)announced.add(q.id);signature='';owner='';}
 setInterval(sync,1000);

 const css=document.createElement('style');css.textContent=`
 .level-quests{display:grid;gap:8px}.level-quests .lq{border:1px solid #5a4a2c;border-radius:8px;padding:8px 10px;background:#17191c}
 .level-quests .lq h3{margin:0 0 4px;font-size:15px;color:#f0cf7c}.level-quests .lq small{color:#a99c80}
 .level-quests .lq p{margin:3px 0;font-size:13px}.level-quests .lq .ok{color:#8fe08a}.level-quests .lq .wait{color:#8a8578}
 .level-quests .lq.done{opacity:.6}`;document.head.append(css);
 function open(){
  if(window.gameFlowState!=='playing')return false;
  cancelPointerGesture({preserveNavigation:true});
  const dialog=document.querySelector('#panel'),content=document.querySelector('#panelContent');
  dialog.classList.remove('classic-panel','reference-menu-panel','game-catalog-panel','npc-shop-panel','native-dialog-panel');
  dialog.hidden=false;document.querySelector('#close').hidden=false;
  const list=uiElement('div','level-quests');
  const mine=LEVEL_QUESTS.filter(eligible).sort((a,b)=>a.level-b.level);
  content.replaceChildren(uiElement('h2','','等級任務'),uiElement('p','','等級到就自動接任務，任務怪出現、任務道具開始掉落；打到全部任務道具自動完成並領獎。'),list);
  if(!mine.length)list.append(uiElement('p','','目前職業沒有可做的等級任務。'));
  for(const q of mine){
   const state=done.has(q.id)?'已完成':level()<q.level?'需要等級 '+q.level:'進行中';
   const box=uiElement('div','lq'+(done.has(q.id)?' done':''));
   box.append(uiElement('h3','',q.name+'（Lv'+q.level+'）'),uiElement('small','',state));
   for(const t of q.targets){const n=Math.min(have(t.item),t.count);box.append(uiElement('p',done.has(q.id)||n>=t.count?'ok':'wait','打 '+[...new Set(t.mobs.map(mobName))].join('／')+' → '+nameOf(t.item)+' '+(done.has(q.id)?t.count:n)+'／'+t.count));}
   box.append(uiElement('p','','獎勵：'+q.reward.map(([id,n])=>nameOf(id)+(n>1?' ×'+n:'')).join(q.choice?' 或 ':'、')+(q.choice?'（二選一）':'')));
   if(q.choice&&ready(q))for(const [i,[id]] of q.reward.entries()){const b=uiElement('button','classic-use','領取 '+nameOf(id));b.type='button';b.onclick=()=>{if(complete(q,i))open();};box.append(b);}
   list.append(box);
  }
  return true;
 }
 return {open,drops,restore,sync,get snapshot(){return [...done].sort((a,b)=>a-b);},active:()=>LEVEL_QUESTS.filter(active).map(q=>q.id)};
})();window.LevelQuests=LevelQuests;
