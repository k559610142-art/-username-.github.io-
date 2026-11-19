// 移除的 NPC（使用者 2026-11-18）：鍊金術師・利德勒、魔法雜貨商・寶伊、職業符石任務・魔法師賽倫、任務幫手・蜜拉瓦（兩個村莊的都拿掉）。
// 2026-11-19 使用者：不開放釣魚小童（釣魚池入場 NPC，npcId 80082／80083）→ 一併從地圖拿掉。
//  原始資料 island-monster-data.js 不動，這裡在載入後把這些 npcId 的出生點刪掉。要加回來就從清單拿掉。
//  載入順序：island-monster-data.js 之後、任何讀 islandMonsterSpawns 的系統之前。
(()=>{const REMOVED=new Set([200213,200214,200215,200216,80082,80083]);
 for(let i=islandMonsterSpawns.length-1;i>=0;i--)if(REMOVED.has(+islandMonsterSpawns[i].npcId))islandMonsterSpawns.splice(i,1);})();
