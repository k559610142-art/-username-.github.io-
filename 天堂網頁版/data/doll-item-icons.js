// 魔法娃娃道具圖補齊（使用者 2026-11-17：背包裡的娃娃道具有些沒有圖，只顯示「魔」字）。
//  原版 DB 沒有道具圖的娃娃道具（約 35 種），改用圖鑑的娃娃頭像（TdjSystems.dolls.image）。舊編號（DOLL_ID_ALIASES）也對到同一隻。
//  道具物件與背包共用同一份，改 icon 後背包、快捷欄、商店都會跟著顯示。載入順序：tdj-systems.js、doll-dedup.js 之後。
(()=>{
 const byId=new Map(gameCatalogData.dolls.map(d=>[d.id,d]));
 for(const item of INTERFACE_CATALOG.items){
  if(item.kind!=='etcitem'||item.icon)continue;
  const d=byId.get((typeof DOLL_ID_ALIASES!=='undefined'&&DOLL_ID_ALIASES[item.id])||item.id);if(!d)continue;
  const img=window.TdjSystems?.dolls?.image(d);if(img)item.icon=img;
 }
})();
