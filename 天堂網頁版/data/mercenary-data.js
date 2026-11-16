// 傭兵團規則（2026-11-16 使用者設計）：伺服器（data/server/local-test-server.cjs）與遊戲共用同一份。
//  玩家把目前角色資料上傳成傭兵；別人雇用時，傭兵在雇主遊戲裡由假人 AI 操控，數值照上傳的角色。
//  雇主付鑽石（傭兵公會抽 feeRate 手續費，其餘給傭兵本人）；傭兵點數由公會（系統）另外發，雇用時間越長點數越多。
//  雇用方式：follow＝跟隨一起打怪；mission＝派去接任務，時間到雇主領經驗與金幣。
(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;else root.MERCENARY_RULES=api;})(typeof window!=='undefined'?window:globalThis,()=>{
 const rules={
  feeRate:.2,
  hours:[1,2,4,8],
  priceMin:1,priceMax:500,            // 每小時鑽石
  suggestPrice:level=>Math.max(1,Math.round(level/5)),
  // 傭兵點數：1 小時 10、2 小時 25、4 小時 60、8 小時 150（越長越划算）
  points:hours=>({1:10,2:25,4:60,8:150})[hours]||0,
  missions:[
   {id:'patrol',name:'巡邏村莊外圍',note:'清理村莊附近的野獸'},
   {id:'escort',name:'護送商隊',note:'護送商隊穿越野外'},
   {id:'hunt',name:'討伐妖魔據點',note:'深入妖魔據點，收穫較多但風險高'}
  ],
  // 任務獎勵（給雇主）：依傭兵等級與時數
  missionReward:(level,hours,missionId)=>{const m={patrol:1,escort:1.2,hunt:1.5}[missionId]||1;return {experience:Math.round(level*level*60*hours*m),gold:Math.round(level*500*hours*m)};},
  shop:[
   {id:'tp10',key:'etcitem:40100',count:10,cost:20},
   {id:'home5',key:'etcitem:40079',count:5,cost:15},
   {id:'btp3',key:'etcitem:140100',count:3,cost:40},
   {id:'heal20',key:'etcitem:40011',count:20,cost:30},
   {id:'ultra10',key:'etcitem:40012',count:10,cost:60},
   {id:'haste5',key:'etcitem:40013',count:5,cost:25},
   {id:'brave5',key:'etcitem:40014',count:5,cost:35},
   {id:'identify5',key:'etcitem:40126',count:5,cost:20},
   {id:'armor1',key:'etcitem:40074',count:1,cost:80},
   {id:'weapon1',key:'etcitem:40087',count:1,cost:150}
  ]
 };
 return rules;
});
