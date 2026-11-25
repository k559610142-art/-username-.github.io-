// 2026-11-18：武魂提煉石停止取得與販售；保留舊存檔物品定義，避免角色資料無法讀取。
// 已移除的道具（2026-11-13 使用者要求）：飛刀類（銀飛刀、飛刀、重飛刀）丟出去打不到，整類拿掉
//  NPC 商店、天幣商店、怪物掉落都不再出現；玩家身上已有的仍可看到、可出售
// 2026-11-18 使用者：靈魂石：黑騎士隊長（81017）沒有用途（訓練所沒做）→ 說話之島不再掉落，傳送選單掉落清單也拿掉
const REMOVED_ITEM_IDS=new Set([40738,40739,40740,39288,81017,300317,83031,301,302,303,304,305,306,307,308,309,310,311,312,313,314,315,350133,350134,350135,350136,350137,410191,410192,410193,410194,410195,410196,410197,410198,410199,410200,410201,410202,410203,410204,410205,410206,39055,39056,39057,39058,39059,39070,39071,39072,39074,39075]);
// 遺忘之島的封印裝備只停掉落，保留道具定義和舊存檔。
const DROP_ONLY_REMOVED_IDS=new Set([17,18,167,20140,20141,20142,20143]);
(()=>{const keep=r=>!REMOVED_ITEM_IDS.has(Array.isArray(r)?r[0]:r?.id);
 const prune=list=>{if(!Array.isArray(list))return;for(let i=list.length-1;i>=0;i--)if(!keep(list[i]))list.splice(i,1)};
 if(typeof NATIVE_NPC_DIALOGS!=='undefined')for(const k in NATIVE_NPC_DIALOGS.shops)prune(NATIVE_NPC_DIALOGS.shops[k]);
 if(typeof islandNpcServiceData!=='undefined')prune(islandNpcServiceData.shop);
 // 2026-11-20 使用者：商店不賣（只從商店移除，掉落／背包已有的不動）：對武器施法的卷軸（40087／140087／240087）、對盔甲施法的卷軸（40074／140074／240074）、
 //  [天地劫] 放生系統 90000、古代終極戰鬥袋 350573、古代體力戰鬥袋 350574、銀箭戰鬥包 350575、黑色米索莉箭戰鬥包 350576、血盟勳章 300000、料理書 1～5 階段 41255～41259
 const SHOP_REMOVED=new Set([40087,140087,240087,40074,140074,240074,90000,350573,350574,350575,350576,300000,41255,41256,41257,41258,41259]);
 const shopPrune=list=>{if(!Array.isArray(list))return;for(let i=list.length-1;i>=0;i--)if(SHOP_REMOVED.has(Array.isArray(list[i])?list[i][0]:list[i]?.id))list.splice(i,1)};
 if(typeof NATIVE_NPC_DIALOGS!=='undefined')for(const k in NATIVE_NPC_DIALOGS.shops)shopPrune(NATIVE_NPC_DIALOGS.shops[k]);
 if(typeof islandNpcServiceData!=='undefined')shopPrune(islandNpcServiceData.shop);
 if(typeof killRewardData!=='undefined')for(const k in killRewardData.drops){
  killRewardData.drops[k]=killRewardData.drops[k].filter(row=>keep(row)&&!DROP_ONLY_REMOVED_IDS.has(row.id));
 }
})();
// 傳送選單的地區掉落清單（data/portable-teleport-data.js 比這支晚載入，等全部 defer 腳本跑完再清）
document.addEventListener('DOMContentLoaded',()=>{const names=new Set(INTERFACE_CATALOG.items.filter(i=>REMOVED_ITEM_IDS.has(i.id)||DROP_ONLY_REMOVED_IDS.has(i.id)).map(i=>i.name));for(const r of window.PORTABLE_TELEPORT_ROUTES||[])if(Array.isArray(r.drops))r.drops=r.drops.filter(n=>!names.has(n));});
