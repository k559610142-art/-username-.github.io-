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
  spawns:[{npcId:81043,mapId:4,point:[34041,32206],random:[6,6],count:3}]},
 // 2026-11-15 第二批：任務道具取自 jar 的任務怪程式（com/lineage/data/npc/mob/*：打死給什麼），獎勵取自任務 NPC 最後一步。
 // 原版任務怪程式裡「Random.nextInt(100) < ?」的門檻看不到，這類掉落先訂 20%（騎士以外的 rnd 怪）；程式沒有隨機的訂 100%。
 {id:115,name:'妖精族傳說中的弓',roles:['妖精'],level:45,
  targets:[{mobs:[45941],item:41349,count:1}],reward:[[20171,1],[40245,1]], // 使用者指定：保護者手套＋強化精靈召喚水晶（DB 名：精靈水晶(召喚強力屬性精靈)）
  spawns:[{npcId:45941,mapId:63,bounds:[32611,32688,32702,32912],count:2}],note:'原版還要收集元素氣息等多種材料，簡化成打巫女莎爾拿莎爾之戒'},
 {id:116,name:'協助間諜大逃亡',roles:['妖精'],level:50,
  targets:[{mobs:[45115,45190],item:49162,count:1,drop:200000}],reward:[[184,1]]},
 {id:121,name:'取回間諜的報告書',roles:['法師'],level:50,
  targets:[{mobs:[45315,45482,45569,45570,45571,45579,45582,45587,45605,45647],item:49164,count:1,drop:200000}],reward:[[20225,1]]},
 {id:127,name:'尋找黑暗之星',roles:['黑妖'],level:50,
  targets:[{mobs:[70972],item:40600,count:1,drop:1000000},{mobs:[81046],item:40606,count:1,drop:1000000},{mobs:[45507],item:40541,count:1,drop:1000000}],reward:[[13,1]], // 使用者指定：死亡之指
  spawns:[70972,81046,45507].map(npcId=>({npcId,mapId:304,bounds:[32629,32809,32680,32835],count:1})),note:'三位司祭原版在 map 306（未轉換），改放沉默洞穴'},
 {id:129,name:'行跡可疑的妖魔們',roles:['龍騎士'],level:15,
  targets:[{mobs:[84001],item:49218,count:1,drop:200000},{mobs:[84002],item:49217,count:1,drop:200000},{mobs:[84003],item:49219,count:1,drop:200000}],reward:[[21103,1]],
  spawns:[{npcId:84001,mapId:4,point:[32615,32676],random:[5,5],count:2},{npcId:84002,mapId:4,point:[32686,32440],random:[5,5],count:2},{npcId:84003,mapId:4,point:[32689,33172],random:[5,5],count:2}]},
 {id:130,name:'妖魔密使首領的情報',roles:['龍騎士'],level:30,
  targets:[{mobs:[84004],item:49223,count:1,drop:1000000}],reward:[[21102,1]],
  spawns:[{npcId:84004,mapId:61,bounds:[32677,32788,32744,32869],count:4}]},
 {id:133,name:'眠龍洞穴污染的來源',roles:['幻術師'],level:15,
  targets:[{mobs:[45117,45118,45128],item:49169,count:1,drop:200000},{mobs:[45153],item:49170,count:1,drop:200000}],reward:[[269,1],[49121,1]]}
];
