// 2026-11-20 離線掛機（使用者規則）：
//  1. 在同一張地圖開 AUTO 掛機連續滿 5 分鐘，才以這張地圖記錄（中途關 AUTO、換地圖、死亡就重算；之後關 AUTO 也會清掉紀錄）。
//  2. 離線前、回來後各跟伺服器拿一次時間（HEAD 本站網頁讀回應的 Date 標頭，不看手機／電腦時鐘），兩個時間相減＝離線時間，最多 12 小時。
//     「離線前」＝掛機中每 60 秒、以及切到背景時更新一次伺服器時間；關掉網頁後最後一次更新就是離線開始。
//  3. 沒網路（拿不到伺服器時間）就不能領，可重試或放棄。
//  4. 獎勵：用這次在該地圖實際的擊殺速度（隻／分）× 離線分鐘數，依實際打到的怪物比例，每隻照原本擊殺規則擲經驗與掉落（PlayerProgression.roll）。
//     背包放不下時先放經驗＋可堆疊道具，再放不下就只給經驗。
//  5. 手機把網頁丟到背景被系統暫停（遊戲沒在跑）也算離線：回到畫面時若距離上次伺服器時間超過 2 分鐘，就發那段時間的獎勵。
// 紀錄放 localStorage offlineIdle:角色 id（不改角色存檔結構）。
const OfflineIdle=(()=>{
 const QUALIFY_MS=5*60000,MAX_MS=12*3600000,BEAT_MS=60000,MIN_GAP_MS=2*60000;
 let streak=null,owner=null,pending=false,beating=false,lastBeat=0;
 const store=id=>'offlineIdle:'+(id||window.activeCharacterId||'');
 function load(id){try{const r=JSON.parse(localStorage.getItem(store(id))||'null');return r&&typeof r==='object'?r:null}catch{return null}}
 function save(r){try{r?localStorage.setItem(store(),JSON.stringify(r)):localStorage.removeItem(store())}catch{}}
 const mapId=()=>window.activeMapId||0;
 const auto=()=>window.gameFlowState==='playing'&&!CharacterActions.dead&&IslandCombat.mode==='auto';
 function mapName(id,x,y){
  const dungeon=window.WorldMaps?.name?.(id);if(dungeon&&id!==0&&id!==4)return dungeon;
  const labels=(typeof MAP_REGION_LABELS!=='undefined'&&MAP_REGION_LABELS[id])||[];let best=null,d=Infinity;
  for(const l of labels){const n=Math.hypot(l.x-x,l.y-y);if(n<d){d=n;best=l}}return (d<=60&&best?.name)||(id===0?'說話之島':id===4?'亞丁大陸':'地圖 '+id);
 }
 // 伺服器時間：讀本站回應的 Date 標頭（GitHub Pages／本機伺服器都有），抓不到就丟錯
 async function serverTime(){
  const ctrl=new AbortController(),t=setTimeout(()=>ctrl.abort(),8000);
  try{const r=await fetch('index.html?serverTime='+Date.now(),{method:'HEAD',cache:'no-store',signal:ctrl.signal});const v=Date.parse(r.headers.get('Date')||'');if(!r.ok||!Number.isFinite(v))throw Error('no date');return v}
  finally{clearTimeout(t)}
 }
 // 擊殺紀錄（player-progression.js award 成功後呼叫）
 function onKill(mob){
  if(!streak||!auto()||mapId()!==streak.mapId)return;
  const id=mob.spawn.npcId;streak.kills++;const n=streak.npcs[id]??={count:0,exp:mob.spawn.npc.exp||0};n.count++;
 }
 async function beat(force=false){
  if(pending||beating||!streak||!streak.qualified)return;
  if(!force&&performance.now()-lastBeat<BEAT_MS)return;
  beating=true;lastBeat=performance.now();
  try{const now=await serverTime();if(!streak?.qualified||!auto())return;
   const ms=performance.now()-streak.start;
   save({mapId:streak.mapId,name:streak.name,serverTime:now,kills:streak.kills,ms,npcs:streak.npcs});
  }catch{}finally{beating=false}
 }
 function tick(){
  const active=window.gameFlowState==='playing'?window.activeCharacterId:null;
  if(active!==owner){owner=active;streak=null;if(active)setTimeout(()=>claim(active),1500);return}
  if(!active||pending)return;
  if(!auto()||streak&&streak.mapId!==mapId()){if(streak?.qualified)save(null);streak=null;return}
  if(!streak){streak={mapId:mapId(),name:mapName(mapId(),worldX,worldY),start:performance.now(),kills:0,npcs:{},qualified:false};return}
  if(!streak.qualified&&performance.now()-streak.start>=QUALIFY_MS){streak.qualified=true;toast('已在「'+streak.name+'」掛機滿 5 分鐘，離線掛機會以這張地圖計算。');beat(true)}
  else beat();
 }
 function simulate(record,ms){
  const perMs=record.ms>0?record.kills/record.ms:0,kills=Math.floor(perMs*ms);
  const pool=Object.entries(record.npcs||{}).filter(([,n])=>n.count>0),total=pool.reduce((s,[,n])=>s+n.count,0);
  let experience=0;const loot=new Map();
  for(let i=0;i<kills&&total;i++){
   let r=Math.random()*total,pick=pool[0];for(const p of pool){r-=p[1].count;if(r<0){pick=p;break}}
   const res=PlayerProgression.roll({spawn:{npcId:+pick[0],npc:{exp:pick[1].exp},mapId:record.mapId}});
   experience+=res.experience;for(const d of res.loot){const o=loot.get(d.key)||{key:d.key,count:0,name:d.name};o.count+=d.count;loot.set(d.key,o)}
  }
  return {kills,experience,loot:[...loot.values()]};
 }
 function grant(result){
  const stack=key=>ITEM_USE_RULES.definitions[key]?.stackable;
  const tries=[result.loot,result.loot.filter(d=>stack(d.key)),[]];
  for(const loot of tries)if(OwnedInventory.reward(result.experience,loot))return {loot,dropped:result.loot.length-loot.length};
  return null;
 }
 const fmt=ms=>{const m=Math.floor(ms/60000);return (m>=60?Math.floor(m/60)+' 小時 ':'')+(m%60)+' 分鐘'};
 function panel(title,nodes){
  const overlay=document.querySelector('#panel'),content=document.querySelector('#panelContent');
  cancelPointerGesture({preserveNavigation:true});overlay.classList.remove('classic-panel','reference-menu-panel','game-catalog-panel','npc-shop-panel','map-overview-panel');overlay.classList.add('native-dialog-panel');
  overlay.setAttribute('aria-label',title);overlay.querySelector('#close').hidden=false;overlay.hidden=false;
  const host=uiElement('div','native-dialog');host.append(...nodes);content.replaceChildren(uiElement('h2','',title),host);overlay.scrollTop=0;
 }
 const btn=(label,fn)=>{const b=uiElement('button','',label);b.type='button';b.onclick=fn;return b};
 // 進遊戲（或從背景回來）時結算；resume＝遊戲中被暫停後回來，結算後繼續記錄
 async function claim(id,resume=false){
  if(pending||id!==window.activeCharacterId||window.gameFlowState!=='playing')return;
  const record=load(id);if(!record)return;
  pending=true;
  let now;
  try{now=await serverTime()}catch{
   if(resume){pending=false;return} // 背景回來時沒網路：先不動紀錄，下次再算
   panel('離線掛機獎勵',[uiElement('p','','無法連線到伺服器取得時間，沒有網路連線就不能領取離線掛機獎勵。'),btn('重試',()=>{pending=false;claim(id)}),btn('放棄獎勵',()=>{save(null);pending=false;document.querySelector('#panel').hidden=true})]);
   return;
  }
  if(id!==window.activeCharacterId){pending=false;return}
  const gap=now-record.serverTime;
  if(resume&&gap<MIN_GAP_MS){pending=false;return}
  const ms=Math.max(0,Math.min(MAX_MS,gap));
  if(!resume)save(null);
  if(ms<60000||!record.kills){pending=false;if(resume)save({...record,serverTime:now});return}
  const result=simulate(record,ms),before=window.activeCharacterLevel,got=grant(result);
  if(resume)save({...record,serverTime:now});
  pending=false;
  if(!got){panel('離線掛機獎勵',[uiElement('p','','獎勵無法放入（存檔失敗），這次離線獎勵沒有領到。')]);return}
  const lines=[uiElement('p','','掛機地圖：'+record.name),uiElement('p','','離線時間：'+fmt(ms)+(gap>MAX_MS?'（最多計算 12 小時）':'')),uiElement('p','','擊殺：'+result.kills.toLocaleString()+' 隻（依掛機時每分鐘 '+(record.kills/record.ms*60000).toFixed(1)+' 隻）'),uiElement('p','','經驗 +'+result.experience.toLocaleString()+(window.activeCharacterLevel>before?'　升至 Lv. '+window.activeCharacterLevel:''))];
  if(got.loot.length)lines.push(uiElement('p','','道具：'+got.loot.map(d=>d.name+' × '+d.count.toLocaleString()).join('、')));else if(!result.loot.length)lines.push(uiElement('p','','道具：沒有掉落'));
  if(got.dropped)lines.push(uiElement('p','','背包放不下，有 '+got.dropped+' 種道具沒有領到。'));
  panel('離線掛機獎勵',lines);updateReferenceHud?.();
 }
 setInterval(tick,1000);
 document.addEventListener('visibilitychange',()=>{if(document.hidden)beat(true);else if(window.gameFlowState==='playing'&&streak?.qualified)claim(window.activeCharacterId,true)});
 window.addEventListener('pagehide',()=>beat(true));
 return {onKill,serverTime,get record(){return load()},get streak(){return streak&&{...streak,elapsed:performance.now()-streak.start}}};
})();window.OfflineIdle=OfflineIdle;
