// 知識戒指有原始 NPC 配方，但目前 DB 缺少對應的防具列。
const giranCraftingData=(()=>{
 const ringId=990104;
 const ring=INTERFACE_CATALOG.items.find(item=>item.kind==='armor'&&item.id===21222);
 if(!ring||INTERFACE_CATALOG.items.some(item=>item.id===ringId))throw Error('Invalid 知識戒指 catalog configuration');
 INTERFACE_CATALOG.items.push({
  ...ring,id:ringId,name:'知識戒指',nativeDb:false,
  icon:'assets/interface/client-icons/5343.png',
  bonuses:{str:0,dex:0,con:0,int:1,wis:0,cha:0,hp:0,mp:0},sourceRules:{safenchant:0}
 });
 ITEM_USE_RULES.definitions['armor:'+ringId]={...ITEM_USE_RULES.definitions['armor:21222']};
 return [
  [70642,'海克特',20163,[[20182,1],[40408,150],[40308,25000]]],
  [70642,'海克特',20003,[[20006,1],[40408,120],[40308,16500]]],
  [70642,'海克特',20220,[[20231,1],[40408,200],[40308,16000]]],
  [70642,'海克特',20194,[[20205,1],[40408,160],[40308,8000]]],
  [70642,'海克特',20091,[[20154,1],[40408,450],[40308,30000]]],
  [70641,'哈巴特',20085,[[40456,3],[40455,2],[40457,10],[40308,30000]]],
  [70641,'哈巴特',20063,[[40456,5],[40455,5],[40457,10],[40308,20000]]],
  [70641,'哈巴特',20056,[[40456,10],[40455,2],[40457,1],[40308,1000]]],
  [70598,'莫麗雅',20111,[[40054,1],[40318,25],[40457,2],[40455,4]]],
  [70598,'莫麗雅',20012,[[40051,2],[40318,20],[40457,1],[40455,1],[40456,1]]],
  [70598,'莫麗雅',ringId,[[20288,1],[20281,1],[20284,1],[41246,100000]]]
 ];
})();
