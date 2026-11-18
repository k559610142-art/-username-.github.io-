// 同一物品的 NPC／自動販賣回收價，不得高於天幣商店最低單件售價。
window.ShopEconomy=(()=>{
 const cheapest=new Map(),changes=[],items=new Map(INTERFACE_CATALOG.items.map(i=>[i.id,i]));
 for(const [npc,rows] of Object.entries(NATIVE_NPC_DIALOGS.shops)){
  if((NATIVE_NPC_DIALOGS.actions[npc]?.currency||40308)!==40308)continue;
  for(const [id,,price,pack,,enchant] of rows){if(enchant||!Number.isSafeInteger(price)||price<0)continue;const unit=price/Math.max(1,Number(pack)||1);if(!cheapest.has(id)||unit<cheapest.get(id))cheapest.set(id,unit);}
 }
 for(const [npc,rows] of Object.entries(NATIVE_NPC_DIALOGS.shops)){
  if((NATIVE_NPC_DIALOGS.actions[npc]?.currency||40308)!==40308)continue;
  for(const row of rows){if(row[5]||!cheapest.has(row[0]))continue;const cap=Math.floor(cheapest.get(row[0]));if(row[4]>cap){changes.push({npc:+npc,item:row[0],old:row[4],price:cap});row[4]=cap;}}
 }
 for(const [id,price] of cheapest){const item=items.get(id);if(!item)continue;const key=item.kind+':'+id,cap=Math.floor(price);if(AUTO_SELL_DATA.prices[key]>cap)AUTO_SELL_DATA.prices[key]=cap;}
 return {changes,minimumBuy:id=>cheapest.get(Number(id))??null};
})();
