// 等級任務（2026-11-15 使用者決定）：原版 server_quest 的職業等級任務簡化成「等級到 → 任務怪出現／任務道具開始掉 → 打到道具就過關」。
// 任務道具與獎勵取自伺服器 Server_Game_2.jar 各任務 NPC 最後一步「收哪些道具 → 給什麼」（tools/level-quests 內的 class 傾印），
// 掉落率照 DB droplist（任務怪的掉落原本就在 droplist）。任務怪位置照 DB server_quest_spawn；原版任務地監還沒轉進遊戲的，改放到同類已轉換地圖（note 說明）。
// targets：要打的怪（mobs）與掉的道具（item）；spawns：等級到才生的任務怪（沒有＝怪物本來就在地圖上）；drop：droplist 沒有的任務掉落（百萬分率）。
const LEVEL_QUESTS=[
 {id:101,name:'王族的自知',roles:['王族'],level:15,
  targets:[{mobs:[81066],item:40565,count:1}],reward:[[20065,1]], // 奇岩城試煉獎勵表（2026-11-15 使用者決定照網頁奇岩城 guide.html）
  spawns:[{npcId:81066,mapId:4,bounds:[32776,32901,32882,32990],count:8}]},
 {id:102,name:'艾莉亞的請求',roles:['王族'],level:30,
  targets:[{mobs:[45342],item:40547,count:1}],reward:[[20051,1],[40228,1]], // 奇岩城試煉獎勵表（2026-11-15 使用者決定照網頁奇岩城 guide.html）
  spawns:[{npcId:45342,mapId:45,bounds:[32704,32704,32831,32831],count:1}],note:'原版在變種巨蟻地監（map 217，未轉換），改放巨蟻洞穴'},
 {id:103,name:'王族的信念',roles:['王族'],level:45,
  targets:[{mobs:[45179],item:40586,count:1}],reward:[[20287,1]]},
 {id:106,name:'瑞奇的抵抗',roles:['騎士'],level:15,
  // 網路資料（2026-11-15）：原版最終獎勵紅騎士頭巾；黑騎士給誓約與古老的交易文件、龍龜給龍龜甲（任務怪程式有隨機，訂 20%）
  targets:[{mobs:[45165],item:40608,count:1},{mobs:[45165],item:40540,count:1,drop:200000},{mobs:[45240],item:40601,count:1,drop:200000}],reward:[[20027,1]],
  spawns:[{npcId:45240,mapId:4,bounds:[33205,33145,33252,33287],count:3},{npcId:45240,mapId:4,bounds:[33283,33287,33523,33325],count:3},{npcId:45165,mapId:4,bounds:[33044,33354,33077,33373],count:3},{npcId:45165,mapId:4,bounds:[33045,33318,33145,33348],count:3},
   {npcId:45165,mapId:4,bounds:[33132,33383,33147,33420],count:3},{npcId:45165,mapId:4,bounds:[33071,33426,33115,33456],count:3}]},
 {id:113,name:'達克馬勒的威脅',roles:['妖精'],level:30,
  targets:[{mobs:[45343],item:40592,count:1}],reward:[[20084,1],[40243,1]], // 奇岩城試煉獎勵表（2026-11-15 使用者決定照網頁奇岩城 guide.html）
  spawns:[{npcId:45343,mapId:19,bounds:[32704,32640,32895,32895],count:1}],note:'原版在 map 213（未轉換），改放妖精森林地監 1 樓'},
 {id:118,name:'詹姆的請求',roles:['法師'],level:15,
  targets:[{mobs:[45157],item:40539,count:1},{mobs:[45157],item:40538,count:1},{mobs:[45107],item:40605,count:1}],reward:[[20226,1],[126,1]]}, // 奇岩城試煉獎勵表（2026-11-15 使用者決定照網頁奇岩城 guide.html）,
 {id:119,name:'不死族的叛徒',roles:['法師'],level:30,
  targets:[{mobs:[45100],item:40581,count:1},{mobs:[45344],item:40579,count:1}],reward:[[115,1]],
  spawns:[{npcId:45344,mapId:2,bounds:[32640,32768,32831,32895],count:1}],note:'不死族背叛者原版在 map 201（未轉換），改放冒險洞窟 2 樓'},
 {id:120,name:'法師的考驗',roles:['法師'],level:45,
  targets:[{mobs:[45189],item:40542,count:1,drop:100000}],reward:[[20055,1]],note:'變形怪的血原版由 NPC 流程給，改成變形怪 10% 掉落'}, // 獎勵照奇岩城試煉表（瑪那斗篷）
 {id:124,name:'妖魔的侵入',roles:['黑妖'],level:15,
  targets:[{mobs:[45119],item:40585,count:1}],reward:[[20004,1],[40268,1]]}, // 奇岩城試煉獎勵表（2026-11-15 使用者決定照網頁奇岩城 guide.html）,
 {id:125,name:'同族的背叛',roles:['黑妖'],level:30,
  targets:[{mobs:[45886,45885,45884,45883],item:40596,count:1}],reward:[[20164,1],[40270,1]], // 奇岩城試煉獎勵表（2026-11-15 使用者決定照網頁奇岩城 guide.html）
  spawns:[45886,45885,45884,45883].map(npcId=>({npcId,mapId:304,bounds:[32660,32830,32730,32970],count:2})),note:'原版刺客沒有生怪資料，放在沉默洞穴'},
 {id:126,name:'糾正錯誤的觀念',roles:['黑妖'],level:45,
  targets:[{mobs:[81043],item:40584,count:1}],reward:[[20195,1],[40276,1]], // 奇岩城試煉獎勵表（2026-11-15 使用者決定照網頁奇岩城 guide.html）
  spawns:[{npcId:81043,mapId:4,point:[34041,32206],random:[6,6],count:3}]},
 // 2026-11-15 第二批：任務道具取自 jar 的任務怪程式（com/lineage/data/npc/mob/*：打死給什麼），獎勵取自任務 NPC 最後一步。
 // 原版任務怪程式裡「Random.nextInt(100) < ?」的門檻看不到，這類掉落先訂 20%（騎士以外的 rnd 怪）；程式沒有隨機的訂 100%。
 {id:115,name:'妖精族傳說中的弓',roles:['妖精'],level:45,
  targets:[{mobs:[45941],item:41349,count:1}],reward:[[20171,1],[40245,1]], // 使用者指定：保護者手套＋強化精靈召喚水晶（DB 名：精靈水晶(召喚強力屬性精靈)）
  spawns:[{npcId:45941,mapId:63,bounds:[32611,32688,32702,32912],count:2}],note:'原版還要收集元素氣息等多種材料，簡化成打巫女莎爾拿莎爾之戒'},
 {id:116,name:'協助間諜大逃亡',roles:['妖精'],level:50,
  targets:[{mobs:[45115,45190],item:49162,count:1,drop:200000}],reward:[[50,1],[184,1]],choice:true}, // 奇岩城試煉獎勵表（2026-11-15 使用者決定照網頁奇岩城 guide.html）：赤焰之劍或赤焰之弓二選一,
 {id:121,name:'取回間諜的報告書',roles:['法師'],level:50,
  targets:[{mobs:[45315,45482,45569,45570,45571,45579,45582,45587,45605,45647],item:49164,count:1,drop:200000}],reward:[[20225,1]]},
 {id:127,name:'尋找黑暗之星',roles:['黑妖'],level:50,
  targets:[{mobs:[70972],item:40600,count:1,drop:1000000},{mobs:[81046],item:40606,count:1,drop:1000000},{mobs:[45507],item:40541,count:1,drop:1000000}],reward:[[13,1]], // 奇岩城試煉獎勵表（2026-11-15 使用者決定照網頁奇岩城 guide.html）
  spawns:[70972,81046,45507].map(npcId=>({npcId,mapId:304,bounds:[32629,32809,32680,32835],count:1})),note:'三位司祭原版在 map 306（未轉換），改放沉默洞穴'},
 {id:129,name:'行跡可疑的妖魔們',roles:['龍騎士'],level:15,
  targets:[{mobs:[84001],item:49218,count:1,drop:200000},{mobs:[84002],item:49217,count:1,drop:200000},{mobs:[84003],item:49219,count:1,drop:200000}],reward:[[275,1],[49102,1]], // 使用者提供的龍騎士試煉流程（2026-11-15）：龍騎士雙手劍＋龍騎士書板(龍之護鎧)
  spawns:[{npcId:84001,mapId:4,point:[32615,32676],random:[5,5],count:2},{npcId:84002,mapId:4,point:[32686,32440],random:[5,5],count:2},{npcId:84003,mapId:4,point:[32689,33172],random:[5,5],count:2}]},
 {id:130,name:'妖魔密使首領的情報',roles:['龍騎士'],level:30,
  targets:[{mobs:[84004],item:49223,count:1,drop:1000000}],reward:[[21103,1],[49107,1]], // 使用者提供的龍騎士試煉流程（2026-11-15）：龍鱗臂甲＋龍騎士書板(血之渴望)
  spawns:[{npcId:84004,mapId:61,bounds:[32677,32788,32744,32869],count:4}]},
 {id:133,name:'眠龍洞穴污染的來源',roles:['幻術師'],level:15,
  targets:[{mobs:[45117,45118,45128],item:49169,count:1,drop:200000},{mobs:[45153],item:49170,count:1,drop:200000}],reward:[[269,1],[49121,1]]},
 // 2026-11-15 第三批（網路查原版獎勵與流程：Lineage 1 Reborn 職業頁、lin1kore 騎士任務攻略）
 {id:104,name:'小惡魔的可疑行動',roles:['王族'],level:50,
  targets:[{mobs:[45481],item:49159,count:1,drop:200000}],reward:[[51,1]],
  spawns:[{npcId:45481,mapId:410,bounds:[32728,32835,32798,32875],count:6}],note:'原版小惡魔在 map 125～130（未轉換），改放魔族神殿；獎勵黃金權杖'},
 {id:107,name:'拯救被幽禁的吉姆',roles:['騎士'],level:30,
  targets:[{mobs:[45184],item:40590,count:1},{mobs:[81107],item:40543,count:1,drop:200000},{mobs:[45738],item:40555,count:1,drop:200000}],reward:[[30,1],[20230,1]],
  note:'原版：楊果裡恩之爪換紅騎士之劍；蛇女房間鑰匙、密室鑰匙救吉姆換紅騎士盾牌'},
 {id:108,name:'騎士的證明',roles:['騎士'],level:45,
  targets:[{mobs:[45370,45194],item:20026,count:1,drop:200000},{mobs:[45302],item:40537,count:1,drop:1000000}],reward:[[20318,1]],
  spawns:[{npcId:45302,mapId:4,point:[34248,33363],random:[4,4],count:1}],note:'原版：強盜頭目的夜之視野才看得到巨人守護神；獎勵勇敢皮帶'},
 {id:111,name:'遠征隊的遺物',roles:['妖精'],level:15,
  targets:[{mobs:[45137],item:40696,count:1,drop:200000}],reward:[[20021,1],[20039,1]],choice:true,
  note:'奇岩城試煉：精靈敏捷頭盔或精靈體質頭盔二選一'},
 {id:109,name:'精靈們的騷動',roles:['騎士'],level:50,
  targets:[{mobs:[45416,45418,45419,45424,45500,45508,45510,45511,45591,45592,45593,45594],item:49161,count:1,drop:200000},{mobs:[46047],item:49160,count:1,drop:200000}],reward:[[56,1]],
  note:'任務道具取自 jar 任務怪程式 K50_*（精靈墓穴的元素系怪物給精靈的私語、黑暗妖精將軍給丹特斯的召書）；獎勵照奇岩城試煉：黑燄之劍'},
 {id:131,name:'與幻術士締結同盟',roles:['龍騎士'],level:45,
  targets:[{mobs:[45294],item:49225,count:10,drop:200000}],reward:[[21102,1]],note:'使用者提供流程：歐瑞村打雪怪收集雪怪之心 10 個（任務怪程式 DK45_Yeti）；獎勵龍騎士斗篷'},
 {id:132,name:'時空彼端的線索',roles:['龍騎士'],level:50,
  targets:[{mobs:[80140,80141,80142],item:49229,count:10,drop:200000},{mobs:[80139],item:49231,count:1,drop:1000000}],reward:[[272,1]],
  spawns:[{npcId:80140,mapId:36,bounds:[32576,32704,32831,32959],count:6},{npcId:80142,mapId:36,bounds:[32576,32704,32831,32959],count:5},
   {npcId:80141,mapId:36,bounds:[32576,32704,32831,32959],count:4},{npcId:80139,mapId:36,bounds:[32576,32704,32831,32959],count:1}],
  note:'使用者提供流程：試煉場打時空裂痕／食腐獸／翼龍收集異界邪念粉末 10 個，再打 BOSS 路西爾斯；獎勵消滅者鎖鏈劍。原版試煉場 map 2004 未轉換，改放龍之谷地監 6 樓；入場要的 100 個時空裂痕碎片（48 小時開一次）省略'}
];
