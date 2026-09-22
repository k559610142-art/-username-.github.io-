// 宗門資料：分類、境界門檻、經驗/戰力倍率與技能組
const sectData = [
    { category: "一、凡俗宗門 (金丹期以前可加入)", minRealm: 0, maxRealm: 3, items: [
        { name: "武當", buff: "經驗x1.1, 戰力x1.1", expMult: 1.1, powerMult: 1.1,
          skills: [{name:"太極拳", type:"heal", dmgType:"phys", mpCost:15, mult:0.3, msg:"施展【太極拳】，借力打力回復氣血！"},
                   {name:"純陽無極功", type:"single", dmgType:"phys", mpCost:20, mult:1.5, msg:"運轉【純陽無極功】重拳出擊！"}] },
        { name: "峨嵋", buff: "經驗x1.2, 戰力x1.0", expMult: 1.2, powerMult: 1.0,
          skills: [{name:"峨嵋劍法", type:"single", dmgType:"phys", mpCost:20, mult:1.8, msg:"劍光如水，【峨嵋劍法】直取敵害！"},
                   {name:"清心普善咒", type:"heal", dmgType:"mag", mpCost:25, mult:0.4, msg:"彈奏【清心普善咒】療傷定神！"}] },
        { name: "少林寺", buff: "經驗x1.0, 戰力x1.3", expMult: 1.0, powerMult: 1.3,
          skills: [{name:"金剛伏魔", type:"single", dmgType:"phys", mpCost:25, mult:2.0, msg:"大喝一聲，施展【金剛伏魔】杖法！"},
                   {name:"金鐘罩", type:"buff", dmgType:"phys", mpCost:30, mult:1.5, duration: 3, msg:"金光護體，【金鐘罩】防禦大增！"}] },
        { name: "全真教", buff: "經驗x1.3, 戰力x1.0", expMult: 1.3, powerMult: 1.0,
          skills: [{name:"全真劍法", type:"single", dmgType:"phys", mpCost:20, mult:1.7, msg:"【全真劍法】靈動飄逸刺向敵敵！"},
                   {name:"先天功", type:"heal", dmgType:"mag", mpCost:30, mult:0.5, msg:"運轉【先天功】調和陰陽！"}] },
        { name: "皇朝", buff: "經驗x1.2, 戰力x1.2", expMult: 1.2, powerMult: 1.2,
          skills: [{name:"真龍拳", type:"single", dmgType:"phys", mpCost:30, mult:2.2, msg:"攜帶帝王之氣，【真龍拳】震撼全場！"},
                   {name:"皇极经世", type:"aoe", dmgType:"mag", mpCost:40, mult:1.3, msg:"大範圍威壓掃過群敵！"}] }
    ]},
    { category: "二、修真仙門 (金丹期以上可加入)", minRealm: 3, maxRealm: 10, items: [
        { name: "崑崙仙宗", buff: "經驗x1.5, 戰力x1.5", expMult: 1.5, powerMult: 1.5,
          skills: [{name:"玉清仙法", type:"heal", dmgType:"mag", mpCost:30, mult:0.4, msg:"施展【玉清仙法】，靈光閃耀回復氣血！"},
                   {name:"崑崙印", type:"single", dmgType:"mag", mpCost:40, mult:3.0, msg:"祭出【崑崙印】砸向敵人！"}] },
        { name: "蜀山劍派", buff: "經驗x1.0, 戰力x2.5", expMult: 1.0, powerMult: 2.5,
          skills: [{name:"萬劍訣", type:"aoe", dmgType:"mag", mpCost:50, mult:1.5, msg:"劍氣化萬，【萬劍訣】橫掃全場！"},
                   {name:"天劍", type:"single", dmgType:"phys", mpCost:40, mult:4.0, msg:"人劍合一，化為【天劍】貫穿強敵！"}] },
        { name: "丹鼎司", buff: "經驗x3.0, 戰力x0.8", expMult: 3.0, powerMult: 0.8,
          skills: [{name:"神農甘霖", type:"heal", dmgType:"mag", mpCost:20, mult:0.8, msg:"服下【仙丹】，傷勢以肉眼可見速度癒合！"},
                   {name:"三昧真火", type:"aoe", dmgType:"mag", mpCost:60, mult:1.2, msg:"吐出【三昧真火】焚燒周圍妖獸！"}] },
        { name: "御獸仙宗", buff: "經驗x1.2, 戰力x2.2", expMult: 1.2, powerMult: 2.2,
          skills: [{name:"獸王怒", type:"buff", dmgType:"phys", mpCost:30, mult:2.0, duration: 3, msg:"激發【獸王怒】，戰鬥力短暫翻倍！"},
                   {name:"萬獸奔騰", type:"aoe", dmgType:"phys", mpCost:50, mult:1.5, msg:"召喚靈獸【萬獸奔騰】踐踏敵人！"}] },
        { name: "天魔教", buff: "經驗x1.5, 戰力x3.5", expMult: 1.5, powerMult: 3.5,
          skills: [{name:"天魔解體", type:"buff", dmgType:"phys", mpCost:40, mult:3.0, duration: 2, msg:"【天魔解體大法】！捨棄防禦換取極致殺戮！"},
                   {name:"噬血斬", type:"single", dmgType:"phys", mpCost:30, mult:3.5, msg:"【噬血斬】劈出，魔氣滔天！"}] }
    ]},
    { category: "三、至高聖地 (仙人初境解鎖)", minRealm: 10, maxRealm: 99, items: [
        { name: "太清道德宗", buff: "經驗x4.0, 戰力x3.0", expMult: 4.0, powerMult: 3.0,
          skills: [{name:"太極陰陽圖", type:"aoe", dmgType:"mag", mpCost:70, mult:2.5, msg:"奉太上老君之令，【太極陰陽圖】化解萬敵攻勢！"},
                   {name:"九轉金丹術", type:"heal", dmgType:"mag", mpCost:50, mult:1.2, msg:"施展【九轉金丹術】，瞬間回滿精氣神！"}] },
        { name: "玉清闡教宗", buff: "經驗x3.0, 戰力x4.5", expMult: 3.0, powerMult: 4.5,
          skills: [{name:"翻天印", type:"single", dmgType:"phys", mpCost:80, mult:5.0, msg:"奉元始天尊法旨，祭出【翻天印】鎮壓世間！"},
                   {name:"金光護身法", type:"buff", dmgType:"mag", mpCost:40, mult:2.5, duration: 3, msg:"【金光護身法】開啟，金霞萬道！"}] },
        { name: "上清截教宗", buff: "經驗x2.5, 戰力x6.0", expMult: 2.5, powerMult: 6.0,
          skills: [{name:"誅仙劍陣", type:"aoe", dmgType:"mag", mpCost:100, mult:3.5, msg:"奉通天教主之意，【誅仙劍陣】一出，煞氣撕裂天地！"},
                   {name:"上清雷法", type:"single", dmgType:"mag", mpCost:60, mult:4.5, msg:"引動九天【上清雷法】轟殺至強敵手！"}] },
        { name: "萬界仙門", buff: "經驗x5.0, 戰力x5.0", expMult: 5.0, powerMult: 5.0,
          skills: [{name:"萬界穿梭", type:"buff", dmgType:"mag", mpCost:50, mult:3.0, duration: 3, msg:"掌控【萬界穿梭】奧義，身形融入諸天虛空！"},
                   {name:"諸天寂滅", type:"aoe", dmgType:"mag", mpCost:120, mult:4.0, msg:"打出【諸天寂滅】掌印，萬法歸宗！"}] }
    ]}
];
