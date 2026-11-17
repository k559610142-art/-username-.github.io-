// 補背包道具（2026-11-17）：圖鑑裡有、但原版資料庫沒有對應道具的魔法娃娃，抽到或進化時放不進背包。
//  照「進擊娃娃：巴拉卡斯」（etcitem 80512）的道具設定複製，圖示用圖鑑頭像。必須在 owned-inventory.js 之前載入（背包會在載入時建立道具清單）。
//  伺服器端同樣的道具寫在 data/server/server-settings.json。
(()=>{
 const ITEMS=[
  [80259,'特殊魔法娃娃：搖滾PSY','client-doll-11229.png'],[80260,'特殊魔法娃娃：西裝PSY','client-doll-11227.png'],[80261,'特殊魔法娃娃：熱血PSY','client-doll-11225.png'],
  [80262,'勝利的丹狄','client-doll-11611.png'],[80263,'賽利','client-doll-11608.png'],[80264,'玉兔','client-doll-14303.png'],
  [80254,'經驗公主 [Lv.1]','client-doll-5933.png'],
  [80515,'進擊娃娃：安塔瑞斯','dolls-80515.png'] // 四龍娃娃只有安塔瑞斯沒有進擊版（原版資料庫沒有這筆），能力外觀照安塔瑞斯
 ];
 const tpl=INTERFACE_CATALOG.items.find(i=>i.kind==='etcitem'&&i.id===80512),rule=ITEM_USE_RULES.definitions['etcitem:80512'];
 if(!tpl||!rule)return;
 for(const [id,name,icon] of ITEMS){
  if(!INTERFACE_CATALOG.items.some(i=>i.kind==='etcitem'&&i.id===id))INTERFACE_CATALOG.items.push({...tpl,id,name,icon:'assets/interface/catalog-portraits/'+icon,allowed:[...tpl.allowed],bonuses:{...tpl.bonuses},damage:[...tpl.damage],sourceRules:{}});
  ITEM_USE_RULES.definitions['etcitem:'+id]??={...rule};
 }
})();
