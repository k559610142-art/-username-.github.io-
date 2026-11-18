// 2026-11-18：武魂提煉石停止取得與販售；保留舊存檔物品定義，避免角色資料無法讀取。
// 已移除的道具（2026-11-13 使用者要求）：飛刀類（銀飛刀、飛刀、重飛刀）丟出去打不到，整類拿掉
//  NPC 商店、天幣商店、怪物掉落都不再出現；玩家身上已有的仍可看到、可出售
// 2026-11-18 使用者：靈魂石：黑騎士隊長（81017）沒有用途（訓練所沒做）→ 說話之島不再掉落，傳送選單掉落清單也拿掉
const REMOVED_ITEM_IDS=new Set([40738,40739,40740,39288,81017]);
(()=>{const keep=r=>!REMOVED_ITEM_IDS.has(Array.isArray(r)?r[0]:r?.id);
 const prune=list=>{if(!Array.isArray(list))return;for(let i=list.length-1;i>=0;i--)if(!keep(list[i]))list.splice(i,1)};
 if(typeof NATIVE_NPC_DIALOGS!=='undefined')for(const k in NATIVE_NPC_DIALOGS.shops)prune(NATIVE_NPC_DIALOGS.shops[k]);
 if(typeof islandNpcServiceData!=='undefined')prune(islandNpcServiceData.shop);
 if(typeof killRewardData!=='undefined')for(const k in killRewardData.drops)prune(killRewardData.drops[k]);
})();
// 傳送選單的地區掉落清單（data/portable-teleport-data.js 比這支晚載入，等全部 defer 腳本跑完再清）
document.addEventListener('DOMContentLoaded',()=>{const names=new Set(INTERFACE_CATALOG.items.filter(i=>i.id===81017).map(i=>i.name));for(const r of window.PORTABLE_TELEPORT_ROUTES||[])if(Array.isArray(r.drops))r.drops=r.drops.filter(n=>!names.has(n));});
