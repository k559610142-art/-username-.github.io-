// 祝福／詛咒物品名稱區分（使用者 2026-11-16：祝福瞬間移動卷軸要跟瞬間移動卷軸分開；鑑定卷軸只鑑定祝福／詛咒）。
// 原始 DB 的祝福版（編號＝一般版＋100000、bless=0）與詛咒版（＋200000、bless=2）與一般版同名，這裡加前綴，
// 並留下 baseName＝未鑑定時顯示的原名（owned-inventory.js 依 entry.unid 顯示；item-identify.js 負責鑑定）。
// 載入順序：db-native-catalog.js 之後（需要 INTERFACE_CATALOG 與 ITEM_USE_RULES 已合併好）。
(()=>{
 const items=INTERFACE_CATALOG.items,byKey=new Map(items.map(i=>[i.kind+':'+i.id,i]));
 for(const item of items){
  const tier=item.id>=200000&&item.id<300000?2:item.id>=100000&&item.id<200000?0:-1;if(tier<0)continue;
  const prefix=tier===0?'祝福':'受詛咒的',base=byKey.get(item.kind+':'+(item.id-(tier===0?100000:200000))),rule=ITEM_USE_RULES.definitions[item.kind+':'+item.id];
  if(!base||base.name!==item.name||rule&&rule.bless!==tier)continue;
  item.baseName=item.name;item.name=prefix+item.name;item[tier===0?'blessed':'cursed']=true;
 }
})();
