// 已移除的道具（2026-11-13 使用者要求）：飛刀類（銀飛刀、飛刀、重飛刀）丟出去打不到，整類拿掉
//  NPC 商店、天幣商店、怪物掉落都不再出現；玩家身上已有的仍可看到、可出售
const REMOVED_ITEM_IDS=new Set([40738,40739,40740]);
(()=>{const keep=r=>!REMOVED_ITEM_IDS.has(Array.isArray(r)?r[0]:r?.id);
 const prune=list=>{if(!Array.isArray(list))return;for(let i=list.length-1;i>=0;i--)if(!keep(list[i]))list.splice(i,1)};
 if(typeof NATIVE_NPC_DIALOGS!=='undefined')for(const k in NATIVE_NPC_DIALOGS.shops)prune(NATIVE_NPC_DIALOGS.shops[k]);
 if(typeof islandNpcServiceData!=='undefined')prune(islandNpcServiceData.shop);
 if(typeof killRewardData!=='undefined')for(const k in killRewardData.drops)prune(killRewardData.drops[k]);
})();
