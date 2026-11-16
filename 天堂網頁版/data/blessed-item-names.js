// 祝福物品名稱區分（使用者 2026-11-16：祝福瞬間移動卷軸要跟瞬間移動卷軸分開）。
// 原始 DB 的祝福版（編號＝一般版＋100000、bless=0）與一般版同名，背包裡分不出來；這裡統一加「祝福」前綴。
// 載入順序：db-native-catalog.js 之後（需要 INTERFACE_CATALOG 與 ITEM_USE_RULES 已合併好）。
(()=>{
 const items=INTERFACE_CATALOG.items,byKey=new Map(items.map(i=>[i.kind+':'+i.id,i]));
 for(const item of items){
  if(item.id<100000||item.id>=200000||String(item.name||'').startsWith('祝福'))continue;
  const base=byKey.get(item.kind+':'+(item.id-100000)),rule=ITEM_USE_RULES.definitions[item.kind+':'+item.id];
  if(!base||base.name!==item.name||rule&&rule.bless!==0)continue;
  item.name='祝福'+item.name;item.blessed=true;
 }
})();
