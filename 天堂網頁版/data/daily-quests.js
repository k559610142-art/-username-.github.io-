// 每日任務（使用者 2026-11-17 定）：每天 10 個任務、清晨 5 點重置、不能重抽；每完成 1 個給 10 鑽（每日最多 100 鑽）；
//  10 個全部完成給「每日獎勵箱」（巧克力蛋糕×5、[1階] 200% 經驗藥水×5、傭兵任務令牌×5）。
//  傭兵任務令牌：派傭兵出任務（傭兵團 → 雇用 → 任務）每次消耗 1 個，沒有就不能派。
//  任務依角色等級、日期、角色編號固定抽出（同一天同一角色永遠是同一組）。進度存在角色存檔 character.daily。
//  鑽石：本機離線版加在角色存檔（entry-flow.js saveActiveCharacter 收 takeDiamonds）；連線版走伺服器 /api/daily/claim（伺服器限每日 10 次）。
//  進度來源：擊殺＝PlayerProgression.award、製作＝DBGameRules.craft、治癒藥水／食物／獎勵箱＝OwnedInventory.use、娃娃＝TdjSystems.dolls.active 計時、
//  傭兵＝LocalServerClient.act('/api/merc/hire')。都是包一層物件方法，不改原本流程。載入順序：上述系統之後。
const DailyQuests=(()=>{
 const CHEST=990101,TOKEN=990102,DIAMOND_PER=10,RESET_HOUR=5;
 const CHEST_ITEMS=[['etcitem:49138',5],['etcitem:44104',5],['etcitem:'+TOKEN,5]];
 const dayKey=()=>{const d=new Date(Date.now()-RESET_HOUR*3600e3);return d.getFullYear()+'-'+(d.getMonth()+1)+'-'+d.getDate();};
 const lv=()=>Number(window.activeCharacterLevel)||1;
 const playing=()=>window.gameFlowState==='playing'&&!!window.activeCharacterId&&window.OwnedInventory?.owner===window.activeCharacterId;
 let state=null,owner='',pendingDiamonds=0;
 // 固定亂數：同一天、同一角色結果相同
 function rng(seed){let h=2166136261;for(const c of seed)h=Math.imul(h^c.charCodeAt(0),16777619);return ()=>{h=Math.imul(h^h>>>15,2246822507);h=Math.imul(h^h>>>13,3266489909);h^=h>>>16;return (h>>>0)/4294967296;};}
 function huntPool(level){
  const seen=new Map();for(const s of islandMonsterSpawns){const n=s.npc||islandMonsterTemplates[s.npcId];if(!n||n.kind!=='L1Monster'||s.resident||s.quest||!(n.level>0))continue;if(![...seen.values()].some(x=>x.name===n.name))seen.set(s.npcId,n);} // 同名怪只留一種（任務以名稱顯示）
  const all=[...seen].map(([id,n])=>({id,name:n.name,level:n.level}));
  let near=all.filter(m=>m.level>=level-5&&m.level<=level+3);if(near.length<8)near=all.sort((a,b)=>Math.abs(a.level-level)-Math.abs(b.level-level)||a.id-b.id).slice(0,12);return near.sort((a,b)=>a.id-b.id);
 }
 function generate(){
  const L=lv(),r=rng(dayKey()+'|'+window.activeCharacterId),pick=a=>a[Math.floor(r()*a.length)],pool=huntPool(L),killN=L<30?50:L<50?100:150;
  const order=pool.map(m=>[r(),m]).sort((a,b)=>a[0]-b[0]).map(x=>x[1]);let hi=0;const hunt=()=>{const m=order[hi++%order.length];return {type:'hunt',target:m.id,count:20+Math.floor(r()*3)*10,label:'擊殺 '+m.name};};
  const tasks=[{type:'kill',count:killN,label:'擊殺任意怪物'},hunt(),hunt(),
   L>=20?{type:'dungeon',count:30,label:'在地監擊殺怪物'}:hunt(),
   {type:'strong',count:10,label:'擊殺比自己等級高的怪物'},
   window.LocalServerClient?.online?{type:'merc',count:1,label:'雇用傭兵或派傭兵任務'}:hunt(),
   {type:'craft',count:1,label:'製作任意道具'},
   {type:'doll',count:30,label:'召喚魔法娃娃（分鐘）'},
   {type:'potion',count:10,label:'使用治癒藥水'},
   {type:'food',count:3,label:'吃食物'}];
  return {day:dayKey(),tasks:tasks.map((t,i)=>({id:i,progress:0,done:false,...t})),chest:false,claimed:0};
 }
 function ensure(){
  if(!playing())return false;
  if(owner!==window.activeCharacterId){owner=window.activeCharacterId;const c=window.GameEntry?.characters.find(x=>x?.id===owner);state=c?.daily&&c.daily.day===dayKey()&&Array.isArray(c.daily.tasks)?c.daily:null;pendingDiamonds=0;}
  if(!state||state.day!==dayKey()){state=generate();window.GameEntry?.saveActive();if(typeof toast==='function')toast('每日任務已更新（共 10 個，清晨 5 點重置）');}
  return true;
 }
 async function payDiamonds(){
  if(window.LocalServerClient?.online){try{await LocalServerClient.act('/api/daily/claim',{day:state.day});}catch(e){if(typeof toast==='function')toast('每日任務鑽石領取失敗：'+e.message);}}
  else{pendingDiamonds+=DIAMOND_PER;window.GameEntry?.saveActive();}
 }
 function bump(type,n=1,filter=()=>true){
  if(!ensure())return;let changed=false;
  for(const t of state.tasks){if(t.done||t.type!==type||!filter(t))continue;t.progress=Math.min(t.count,t.progress+n);changed=true;
   if(t.progress>=t.count){t.done=true;state.claimed++;if(typeof toast==='function')toast('每日任務完成：'+t.label+'，獲得 💎'+DIAMOND_PER);window.GameChat?.say?.('【每日任務】完成「'+t.label+'」，獲得鑽石 '+DIAMOND_PER,'sys');payDiamonds();}}
  if(changed&&!state.chest&&state.tasks.every(t=>t.done)){if(OwnedInventory.reward(0,[{key:'etcitem:'+CHEST,count:1}])){state.chest=true;if(typeof toast==='function')toast('每日任務全部完成！獲得「每日獎勵箱」');}}
  if(changed)window.GameEntry?.saveActive();
 }
 // 擊殺
 const award=PlayerProgression.award.bind(PlayerProgression);
 PlayerProgression.award=function(mob){const ok=award(mob);if(ok){const level=mob.spawn.npc.level||0;bump('kill');bump('hunt',1,t=>t.target===mob.spawn.npcId||islandMonsterTemplates[t.target]?.name===mob.spawn.npc.name);if((window.activeMapId||0)!==0&&(window.activeMapId||0)!==4)bump('dungeon');if(level>lv())bump('strong');}return ok;};
 // 製作
 const craft=DBGameRules.craft.bind(DBGameRules);DBGameRules.craft=function(...a){const msg=craft(...a);if(msg==='製作成功。'||msg==='製作失敗。')bump('craft');return msg;};
 // 使用道具：治癒藥水、食物、每日獎勵箱
 const use=OwnedInventory.use.bind(OwnedInventory);
 OwnedInventory.use=function(uid){
  const e=OwnedInventory.items.find(x=>x.uid===uid);
  if(e?.item?.kind==='etcitem'&&e.item.id===CHEST){if(!playing())return false;const next=OwnedInventory.snapshot;if(!DBGameRules.takeItem(next,'etcitem:'+CHEST,1))return false;for(const [k,n] of CHEST_ITEMS)if(!DBGameRules.addItem(next,k,n)){toast('背包空間不足，請整理後再開。');return false;}if(!OwnedInventory.applyChange(next))return false;toast('打開每日獎勵箱：巧克力蛋糕×5、200% 經驗藥水×5、傭兵任務令牌×5');return true;}
  const healing=!!e&&window.NativePotions?.isHealing(e.key),food=e?.item?.type==='food',r=use(uid);
  if(r===true){if(healing)bump('potion');if(food)bump('food');}return r;
 };
 const usePotion=OwnedInventory.usePotion.bind(OwnedInventory);OwnedInventory.usePotion=function(...a){const r=usePotion(...a);if(r===true)bump('potion');return r;}; // 快捷回復藥水／自動喝水
 // 傭兵：派任務要令牌
 if(window.LocalServerClient?.act){const act=LocalServerClient.act.bind(LocalServerClient);
  LocalServerClient.act=async function(route,data){
   const mission=route==='/api/merc/hire'&&data?.mode==='mission';
   if(mission&&!OwnedInventory.items.some(e=>e.key==='etcitem:'+TOKEN&&!e.slot))throw Error('派傭兵出任務需要「傭兵任務令牌」（每日任務全部完成可得）。');
   const r=await act(route,data);
   if(route==='/api/merc/hire'){if(mission){const next=OwnedInventory.snapshot;if(DBGameRules.takeItem(next,'etcitem:'+TOKEN,1))OwnedInventory.applyChange(next);}bump('merc');}
   return r;};}
 // 娃娃召喚計時（每分鐘 +1）
 let dollSec=0;setInterval(()=>{if(!ensure())return;if(window.TdjSystems?.dolls?.active){dollSec++;if(dollSec>=60){dollSec=0;bump('doll');}}},1000);
 setInterval(ensure,5000);
 return {get snapshot(){return state&&state.day?JSON.parse(JSON.stringify(state)):undefined;},takeDiamonds(){const n=pendingDiamonds;pendingDiamonds=0;return n;},
  list:()=>ensure()?state.tasks.map(t=>({...t})):[],get chest(){return !!state?.chest;},bump};
})();window.DailyQuests=DailyQuests;
