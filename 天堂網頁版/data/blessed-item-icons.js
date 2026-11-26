// 祝福卷軸黃邊圖示（使用者 2026-11-17：祝福瞬間移動卷軸要跟祝福武捲一樣有黃邊）。
// 原版祝福卷軸和一般版共用同一張圖，這裡換成描黃邊的版本（assets/interface/items/blessed/，由一般圖外圍描 2px 金邊產生）。
// 未鑑定時 owned-inventory.js 的 presented() 用 baseIcon 顯示原圖。載入順序：item-icon-overrides.js 之後、owned-inventory.js 之前。
(()=>{
 const MAP={'assets/interface/items/etcitem-467.png':'items-etcitem-467','assets/interface/items/etcitem-468.png':'items-etcitem-468','assets/interface/items/etcitem-472.png':'items-etcitem-472','assets/interface/items/etcitem-471.png':'items-etcitem-471','assets/interface/items/etcitem-473.png':'items-etcitem-473','assets/interface/client-icons/470.png':'client-icons-470','assets/interface/client-icons/1686.png':'client-icons-1686','assets/interface/client-icons/1687.png':'client-icons-1687','assets/interface/client-icons/1693.png':'client-icons-1693','assets/interface/client-icons/1690.png':'client-icons-1690'};
 for(const item of INTERFACE_CATALOG.items){if(!item.blessed||item.type!=='scroll'||!MAP[item.icon])continue;item.baseIcon=item.icon;item.icon='assets/interface/items/blessed/'+MAP[item.icon]+'.png?v=1';}
 const cursedScrolls=new Map([[240074,'etcitem-467'],[240087,'etcitem-468']]);
 for(const item of INTERFACE_CATALOG.items){
  if(!item.cursed||item.kind!=='etcitem'||!cursedScrolls.has(item.id))continue;
  item.baseIcon=item.icon;
  item.icon='assets/interface/items/cursed/'+cursedScrolls.get(item.id)+'.png';
 }
})();
