// 魔法書商人（使用者 2026-11-17：生成 NPC 賣 1～3 階低階魔法書）。
//  用原版 DB 的「法師【魔法】」（npc 110631，L1Merchant，原本在 620 號商人大廳，遊戲裡沒有這張地圖）放到說話之島村莊，
//  商品照 DB shop 表的 110631 列，只留 1～3 階（初級治癒術～寒冰氣息，100／200／400 天幣）。各職業能不能學、幾級學仍照書的規定。
//  載入順序：island-monsters.js 之前（村莊 NPC 由 islandMonsterSpawns 產生）；商品在所有 defer 腳本跑完後（DOMContentLoaded）過濾。
(()=>{
 const ID=110631,base=islandMonsterTemplates[ID];if(!base)return;
 // 原版造型 gfx 5874 沒有動畫圖（islandMonsterFrames 沒有），改借島上 NPC 法林的造型 983；有圖時自動用原版。
 const npc=islandMonsterFrames[base.gfx]?base:{...base,gfx:983};islandMonsterTemplates[ID]=npc;
 islandMonsterSpawns.push({mapId:0,spawnId:9110631,zone:'魔法書商人',count:1,npcId:ID,group:0,point:[32570,32968],random:[0,0],bounds:[0,0,0,0],heading:4,respawn:[0,0],movement:0,resident:true,npc});
 addEventListener('DOMContentLoaded',()=>{
  const shops=window.NATIVE_NPC_DIALOGS?.shops||(typeof NATIVE_NPC_DIALOGS!=='undefined'?NATIVE_NPC_DIALOGS.shops:null),P=playerSkillData;if(!shops?.[ID])return;
  shops[ID]=shops[ID].filter(([item])=>{const b=P.books[item];return b&&P.skills[b.skill]?.circle<=3;}).sort((a,b)=>P.skills[P.books[a[0]].skill].circle-P.skills[P.books[b[0]].skill].circle||a[0]-b[0]);
 });
})();
