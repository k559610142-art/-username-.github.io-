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

// 初階技能商人（使用者 2026-11-17：設定一個商人賣 8 種職業初階技能）。
//  借用 DB「王族【魔法】」（npc 110628，原本在 620 號地圖）的商人身分，名字改成「初階技能商人」，造型借島上 NPC 多瑪（727）。
//  每個職業取自己技能書裡最低學習等級的那一批（法師＝1 階魔法 Lv4、王族 Lv15、騎士 Lv50、妖精精靈魔法 Lv10、黑妖 Lv15、龍騎士 Lv15、幻術師 Lv10、戰士 Lv15），
//  價格照 DB shop 表；DB 沒有標價的用 50,000。騎士的反擊屏障 DB 只由貝利商人以 1,000 萬販售，不算初階，不放。
(()=>{
 const ID=110628,base=islandMonsterTemplates[ID];if(!base)return;
 const npc={...base,name:'初階技能商人',gfx:islandMonsterFrames[base.gfx]?base.gfx:727};islandMonsterTemplates[ID]=npc;
 islandMonsterSpawns.push({mapId:0,spawnId:9110628,zone:'初階技能商人',count:1,npcId:ID,group:0,point:[32570,32973],random:[0,0],bounds:[0,0,0,0],heading:4,respawn:[0,0],movement:0,resident:true,npc});
 const ITEMS=[[45000,100],[45001,100],[45002,100],[45003,100],[45004,100],[45005,100],[45006,100],[45007,100], // 法師（1 階魔法，王族／妖精／騎士／黑妖也能學）
  [40226,200000], // 王族：精準目標
  [40164,50000],[40165,500000],[41147,50000], // 騎士：衝擊之暈、增幅防禦、堅固防護
  [40232,10000],[40233,10000],[40234,10000],[40240,50000],[40241,50000],[40246,200000], // 妖精：魔法防禦、心靈轉換、世界樹的呼喚、三重矢、弱化屬性、鏡反射
  [40265,50000],[40266,50000],[40267,50000],[40268,50000],[40270,100000],[40271,100000],[40272,100000],[40273,100000], // 黑妖
  [49102,50000],[49103,50000],[49104,50000],[49105,50000], // 龍騎士
  [49117,50000],[49118,50000],[49119,50000],[49120,50000],[49121,50000],[49122,100000],[49123,100000],[49124,100000], // 幻術師
  [49957,50000]]; // 戰士：迅猛雙斧
 addEventListener('DOMContentLoaded',()=>{if(typeof NATIVE_NPC_DIALOGS==='undefined')return;
  NATIVE_NPC_DIALOGS.shops[ID]=ITEMS.filter(([id])=>INTERFACE_CATALOG.items.some(i=>i.kind==='etcitem'&&i.id===id)).map(([id,price])=>[id,0,price,0,-1,0]);
  NATIVE_NPC_DIALOGS.actions[ID]??={normal:'shopPurchase',chaotic:'shopPurchase',teleport:'',teleportA:'',currency:40308};
 });
})();
