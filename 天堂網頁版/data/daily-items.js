// 每日任務用的新道具（2026-11-17）：每日獎勵箱（990101，雙擊打開，內容在 daily-quests.js）、傭兵任務令牌（990102，派傭兵任務消耗）。
//  照「藏寶箱」（etcitem 40737）的道具設定複製、可堆疊、不可交易。伺服器端同樣的道具寫在 data/server/server-settings.json。
//  必須在 owned-inventory.js 之前載入。
(()=>{
 const tpl=INTERFACE_CATALOG.items.find(i=>i.kind==='etcitem'&&i.id===40737),rule=ITEM_USE_RULES.definitions['etcitem:40737'];if(!tpl||!rule)return;
 for(const [id,name,icon] of [[990101,'每日獎勵箱','assets/interface/client-icons/998.png'],[990102,'傭兵任務令牌','assets/interface/client-icons/1342.png']]){
  if(!INTERFACE_CATALOG.items.some(i=>i.kind==='etcitem'&&i.id===id))INTERFACE_CATALOG.items.push({...tpl,id,name,icon,type:'other',allowed:[...tpl.allowed],bonuses:{...tpl.bonuses},damage:[...tpl.damage],sourceRules:{}});
  ITEM_USE_RULES.definitions['etcitem:'+id]??={...rule,stackable:true};
 }
})();
