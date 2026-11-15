// 等級任務（2026-11-15 使用者決定）：原版 server_quest 的職業等級任務簡化成「等級到 → 任務怪出現／任務道具開始掉 → 打到道具就過關」。
// 任務道具與獎勵取自伺服器 Server_Game_2.jar 各任務 NPC 最後一步「收哪些道具 → 給什麼」（tools/level-quests 內的 class 傾印），
// 掉落率照 DB droplist（任務怪的掉落原本就在 droplist）。任務怪位置照 DB server_quest_spawn；原版任務地監還沒轉進遊戲的，改放到同類已轉換地圖（note 說明）。
// targets：要打的怪（mobs）與掉的道具（item）；spawns：等級到才生的任務怪（沒有＝怪物本來就在地圖上）；drop：droplist 沒有的任務掉落（百萬分率）。
const LEVEL_QUESTS=[
 {id:101,name:'王族的自知',roles:['王族'],level:15,
  targets:[{mobs:[81066],item:40565,count:1}],reward:[[20065,1]],
  spawns:[{npcId:81066,mapId:4,bounds:[32776,32901,32882,32990],count:8}]},
 {id:102,name:'艾莉亞的請求',roles:['王族'],level:30,
  targets:[{mobs:[45342],item:40547,count:1}],reward:[[40570,1]],
  spawns:[{npcId:45342,mapId:45,bounds:[32704,32704,32831,32831],count:1}],note:'原版在變種巨蟻地監（map 217，未轉換），改放巨蟻洞穴'},
 {id:103,name:'王族的信念',roles:['王族'],level:45,
  targets:[{mobs:[45179],item:40586,count:1}],reward:[[20287,1]]},
 {id:106,name:'瑞奇的抵抗',roles:['騎士'],level:15,
  targets:[{mobs:[45165],item:40608,count:1}],reward:[[20005,1]],
  spawns:[{npcId:45165,mapId:4,bounds:[33044,33354,33077,33373],count:3},{npcId:45165,mapId:4,bounds:[33045,33318,33145,33348],count:3},
   {npcId:45165,mapId:4,bounds:[33132,33383,33147,33420],count:3},{npcId:45165,mapId:4,bounds:[33071,33426,33115,33456],count:3}]},
 {id:113,name:'達克馬勒的威脅',roles:['妖精'],level:30,
  targets:[{mobs:[45343],item:40592,count:1}],reward:[[40588,1]],
  spawns:[{npcId:45343,mapId:19,bounds:[32704,32640,32895,32895],count:1}],note:'原版在 map 213（未轉換），改放妖精森林地監 1 樓'},
 {id:118,name:'詹姆的請求',roles:['法師'],level:15,
  targets:[{mobs:[45157],item:40539,count:1},{mobs:[45157],item:40538,count:1},{mobs:[45107],item:40605,count:1}],reward:[[20226,1]]},
 {id:119,name:'不死族的叛徒',roles:['法師'],level:30,
  targets:[{mobs:[45100],item:40581,count:1},{mobs:[45344],item:40579,count:1}],reward:[[115,1]],
  spawns:[{npcId:45344,mapId:2,bounds:[32640,32768,32831,32895],count:1}],note:'不死族背叛者原版在 map 201（未轉換），改放冒險洞窟 2 樓'},
 {id:120,name:'法師的考驗',roles:['法師'],level:45,
  targets:[{mobs:[45189],item:40542,count:1,drop:100000}],reward:[[40599,1]],note:'變形怪的血原版由 NPC 流程給，改成變形怪 10% 掉落'},
 {id:124,name:'妖魔的侵入',roles:['黑妖'],level:15,
  targets:[{mobs:[45119],item:40585,count:1}],reward:[[40598,1]]},
 {id:125,name:'同族的背叛',roles:['黑妖'],level:30,
  targets:[{mobs:[45886,45885,45884,45883],item:40596,count:1}],reward:[[40545,1]],
  spawns:[45886,45885,45884,45883].map(npcId=>({npcId,mapId:304,bounds:[32660,32830,32730,32970],count:2})),note:'原版刺客沒有生怪資料，放在沉默洞穴'},
 {id:126,name:'糾正錯誤的觀念',roles:['黑妖'],level:45,
  targets:[{mobs:[81043],item:40584,count:1}],reward:[[40553,1]],
  spawns:[{npcId:81043,mapId:4,point:[34041,32206],random:[6,6],count:3}]}
];
