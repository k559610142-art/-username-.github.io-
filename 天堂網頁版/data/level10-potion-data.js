// 新角色專用：立即升至 10 等，獎勵／消耗由 OwnedInventory 的同一筆存檔處理。
// 2026-11-19：改用使用者指定的紫色經驗藥水圖片。
(()=>{const id=990103,key='etcitem:'+id,tpl=INTERFACE_CATALOG.items.find(i=>i.kind==='etcitem'&&i.id===40013),rule=ITEM_USE_RULES.definitions['etcitem:40013'];if(!tpl||!rule)throw Error('立即10等藥水缺少基礎道具資料');
 if(!INTERFACE_CATALOG.items.some(i=>i.kind==='etcitem'&&i.id===id))INTERFACE_CATALOG.items.push({...tpl,id,name:'立即10等藥水',icon:'assets/interface/items/level10-potion-purple.png?v=1',type:'potion',weight:0,allowed:[...tpl.allowed],bonuses:{...tpl.bonuses},damage:[...tpl.damage],sourceRules:{},description:'使用後等級直接提升至10等，10等以上無法使用。'});
 ITEM_USE_RULES.definitions[key]={...rule,handler:'level.Instant10',stackable:true,useType:'normal',minLevel:0,maxLevel:0};
 const icon=INTERFACE_CATALOG.items.find(i=>i.kind==='etcitem'&&i.id===id).icon;
 for(const item of INTERFACE_CATALOG.items){
  if(item.kind==='etcitem'&&/^event\.Exp\d+/i.test(ITEM_USE_RULES.definitions['etcitem:'+item.id]?.handler||''))item.icon=icon;
 }
})();
