// 夥伴（情緣系統，ARCHITECTURE.md 第 39 節）；邏輯在 partner.js
// - 名動諸天的高手，多數是「域外神明」（來自其他作品的世界），於秘境中相遇後結識（秘境尚未開放，相遇時呼叫 meetPartner）
// - 結識後可選一位「出戰」：passive 被動加成生效（併入 gear.js 的 getBonusTotals），戰鬥中每回合依 skill.chance 發動招牌絕學
// - 絕學欄位同神器技能（config-lingbao.js 的 artifactSkills，由 artifact.js 的 castProcSkill 執行），傷害以「主人」的攻擊力為基準
// - 戰力分析 power：六維 0～100（攻伐 atk、防禦 def、身法 spd、神通 mag、底蘊 found、成長 grow），平均值決定評級 PARTNER_TIERS
//   ⚠️ 戰力數值與評級為本遊戲設定，只作娛樂，並非原著官方設定
// - native: true 表示出身本界（《凡人修仙傳》人界），其餘皆為域外神明

// 評級：平均戰力 ≥ min 即屬該級（由高往低判定）；數值平衡建議 → 絕學 chance／mult 與被動總量
const PARTNER_TIERS = [
    { name: "至高", min: 95, color: "#f472b6", hint: "絕學 18%・×3.0 左右，被動約 8%" },
    { name: "帝境", min: 90, color: "#fb923c", hint: "絕學 17%・×2.6 左右，被動約 6%" },
    { name: "尊者", min: 82, color: "#c084fc", hint: "絕學 16%・×2.2 左右，被動約 4.5%" },
    { name: "天驕", min: 0,  color: "#60a5fa", hint: "絕學 15%・×1.8 左右，被動約 3.5%" }
];

const PARTNER_POWER_LABELS = { atk: "攻伐", def: "防禦", spd: "身法", mag: "神通", found: "底蘊", grow: "成長" };

const partnerList = [
    {
        id: "xiaoyan", name: "蕭炎", title: "炎帝", work: "鬥破蒼穹", author: "天蠶土豆", world: "鬥氣大陸", peak: "鬥帝",
        power: { atk: 93, def: 85, spd: 87, mag: 95, found: 91, grow: 94 },
        analysis: "以異火起家，吞煉多種異火並融合出毀滅性的火焰攻勢；煉藥術同樣登峰造極，持久戰能靠丹藥與火焰雙線壓制。短板在肉身防禦，靠身法彌補。",
        passive: { fire: 3, "fx:焚燼": 0.30, magPct: 0.02 },
        skill: { name: "佛怒火蓮", chance: 0.17, target: "aoe", dmgType: "mag", mult: 2.6, attrs: { fire: 100 },
                 desc: "17%：全體術法 260% 傷害並必定燒傷", msg: "🔥 炎帝蕭炎雙手結印，【佛怒火蓮】轟然綻放！" }
    },
    {
        id: "lindong", name: "林動", title: "武祖", work: "武動乾坤", author: "天蠶土豆", world: "天玄大陸", peak: "祖境",
        power: { atk: 92, def: 88, spd: 85, mag: 93, found: 92, grow: 90 },
        analysis: "身懷祖符，尤以吞噬之力見長，能化敵之力為己用、越戰越勇；精神力修為深厚，符陣與武學兼修，續航能力極強。",
        passive: { "fx:吸血": 0.03, atkPct: 0.03 },
        skill: { name: "吞噬祖符", chance: 0.17, target: "single", dmgType: "mag", mult: 2.6, lifesteal: 0.3,
                 desc: "17%：單體術法 260% 傷害，吸取傷害 30% 回復氣血", msg: "🌀 武祖林動祭出【吞噬祖符】，萬物之力盡歸己身！" }
    },
    {
        // 「亂星海第一大善人」：九級化形妖獸風希（裂風獸），反派
        id: "dashanren", name: "風希", title: "亂星海第一大善人", work: "凡人修仙傳", author: "忘語", world: "人界・亂星海", peak: "九級化形妖獸（裂風獸）", native: true,
        power: { atk: 85, def: 82, spd: 92, mag: 82, found: 80, grow: 78 },
        analysis: "裂風獸化形的九級妖獸，以「亂星海第一大善人」自居，實為盤踞亂星海的反派。本體風屬天賦極強，來去如風、攻勢凌厲，速度是最大的倚仗；妖獸肉身也頗為強橫，但境界止於人界巔峰，面對域外神明底蘊不足。",
        passive: { eva: 3, "fx:疾風": 0.03 },
        skill: { name: "裂風", chance: 0.16, target: "aoe", dmgType: "phys", mult: 2.2,
                 desc: "16%：全體物理 220% 傷害", msg: "🌪️ 風希現出裂風獸真身，【裂風】撕裂四方！" }
    },
    {
        // 厲飛雨死後輪迴，轉世為魔界天煞聖皇（石空徹），石穿空之父
        id: "lifeiyu", name: "厲飛雨", title: "天煞聖皇", work: "凡人修仙傳", author: "忘語", world: "人界・越國七玄門 → 轉世魔界", peak: "天煞聖皇・石空徹（轉世後）", native: true,
        power: { atk: 91, def: 86, spd: 86, mag: 88, found: 88, grow: 85 },
        analysis: "凡俗武者時已敢以命搏命、捨身不退；死後魂入輪迴，於靈界轉世為威震魔界的天煞聖皇石空徹，也就是魔域頂尖強者石穿空之父。聖皇之身殺伐之氣更盛，攻勢霸道。「殺人放火厲飛雨」是讀者間流傳的名號梗。",
        passive: { physPct: 0.04, "fx:斬殺": 0.20 },
        skill: { name: "天煞魔威", chance: 0.16, target: "single", dmgType: "phys", mult: 2.2,
                 desc: "16%：單體物理 220% 傷害", msg: "😈 天煞聖皇石空徹魔威滔天，【天煞魔威】碾壓而下！" }
    },
    {
        id: "chennan", name: "辰南", title: "至高逆天", work: "神墓", author: "辰東", world: "神墓世界・天界", peak: "至高逆天",
        power: { atk: 98, def: 96, spd: 95, mag: 97, found: 96, grow: 98 },
        analysis: "自神墓中復甦的逆天者，歷經萬劫而不滅；攻防俱臻極致，意志與成長性驚人，面對強敵反而愈戰愈強。",
        passive: { atkPct: 0.04, def: 3 },
        skill: { name: "逆天一擊", chance: 0.18, target: "single", dmgType: "phys", mult: 3.0,
                 desc: "18%：單體物理 300% 傷害", msg: "💥 辰南逆天而上，【逆天一擊】震碎虛空！" }
    },
    {
        id: "muchen", name: "牧塵", title: "大主宰", work: "大主宰", author: "天蠶土豆", world: "大千世界", peak: "大主宰",
        power: { atk: 90, def: 90, spd: 88, mag: 92, found: 90, grow: 90 },
        analysis: "以浮屠一脈的底蘊打底，靈力雄渾、陣法與戰陣運用純熟；攻守均衡、少有明顯破綻，擅長一邊壓制一邊護住同伴。",
        passive: { statPct: 0.03, hpPct: 0.02 },
        skill: { name: "八部浮屠", chance: 0.17, target: "aoe", dmgType: "mag", mult: 2.2, shield: { reduce: 0.3, duration: 2 },
                 desc: "17%：全體術法 220% 傷害，主人受到傷害 -30% 持續 2 回合", msg: "🏯 大主宰牧塵祭出【八部浮屠】，浮屠鎮壓八方！" }
    },
    {
        id: "tangsan", name: "唐三", title: "修羅神", work: "斗羅大陸", author: "唐家三少", world: "斗羅大陸・神界", peak: "修羅神・海神",
        power: { atk: 88, def: 86, spd: 88, mag: 90, found: 92, grow: 86 },
        analysis: "雙生武魂，藍銀草牽制、昊天錘爆發，再加上暗器的無聲殺機，戰鬥節奏由他掌控；神位加身後殺伐之氣大增。",
        passive: { "fx:追擊": 0.08, poison: 2 },
        skill: { name: "藍銀囚籠・昊天錘", chance: 0.16, target: "single", dmgType: "phys", mult: 1.6, freezeAll: true,
                 desc: "16%：單體物理 160% 傷害，藍銀草纏住所有敵人（凍結 1 回合）", msg: "🌿 唐三藍銀草纏天而起，【藍銀囚籠】困住群敵，昊天錘隨即落下！" }
    },
    {
        id: "yefan", name: "葉凡", title: "葉天帝", work: "遮天", author: "辰東", world: "遮天世界・北斗星域", peak: "天帝",
        power: { atk: 97, def: 97, spd: 93, mag: 95, found: 96, grow: 97 },
        analysis: "荒古聖體被視為難以成道的體質，他卻一路逆伐成帝；肉身無雙，萬物母氣鼎攻守一體，是正面硬戰最難撼動的存在。",
        passive: { hpPct: 0.04, conPct: 0.04 },
        skill: { name: "聖體鎮世", chance: 0.18, target: "single", dmgType: "phys", mult: 3.0, heal: 0.06,
                 desc: "18%：單體物理 300% 傷害，主人回復 6% 氣血", msg: "✊ 葉天帝聖體金光大盛，【聖體鎮世】一拳轟出！" }
    },
    {
        id: "hengren", name: "狠人大帝", title: "狠人", work: "遮天", author: "辰東", world: "遮天世界", peak: "大帝",
        power: { atk: 98, def: 94, spd: 92, mag: 98, found: 95, grow: 97 },
        analysis: "出身卑微而以狠絕之心登頂，吞天魔罐在手，擅吞噬萬法與生機；攻伐與術法皆處於頂端，對敵從不留餘地。",
        passive: { magPct: 0.05, poison: 2 },
        skill: { name: "吞天魔功", chance: 0.18, target: "single", dmgType: "mag", mult: 3.0, attrs: { poison: 100 }, lifesteal: 0.25,
                 desc: "18%：單體術法 300% 傷害並必定中毒，吸取傷害 25%", msg: "🏺 狠人大帝運轉【吞天魔功】，敵手精元盡被吞噬！" }
    },
    {
        id: "wushi", name: "無始大帝", title: "無始", work: "遮天", author: "辰東", world: "遮天世界", peak: "大帝",
        power: { atk: 96, def: 97, spd: 92, mag: 95, found: 96, grow: 93 },
        analysis: "無始鐘攻防兼備，氣勢壓人，戰力極其穩定；不以奇招取勝，而是以絕對的底蘊與境界正面碾壓。",
        passive: { def: 3, atkPct: 0.02 },
        skill: { name: "無始鐘鳴", chance: 0.17, target: "aoe", dmgType: "phys", mult: 2.2, shield: { reduce: 0.3, duration: 2 },
                 desc: "17%：全體物理 220% 傷害，主人受到傷害 -30% 持續 2 回合", msg: "🔔 無始大帝輕撫古鐘，【無始鐘鳴】響徹諸天！" }
    },
    {
        id: "duande", name: "段德", title: "段德天尊", work: "遮天", author: "辰東", world: "遮天世界", peak: "天尊",
        power: { atk: 82, def: 85, spd: 93, mag: 88, found: 95, grow: 90 },
        analysis: "精通源術、擅長探掘古地，底蘊深厚卻行事無賴；打得過就搶、打不過就逃，保命與斂財能力一流。",
        passive: { "fx:聚財": 0.10, eva: 2 },
        skill: { name: "源術・封", chance: 0.16, target: "single", dmgType: "mag", mult: 2.2, attrs: { ice: 100 },
                 desc: "16%：單體術法 220% 傷害並必定凍結", msg: "📜 段德掐訣佈下【源術・封】，將敵手封入源石之中！" }
    },
    {
        id: "douzhan", name: "鬥戰聖皇", title: "鬥戰聖皇", work: "遮天", author: "辰東", world: "遮天世界", peak: "大帝",
        power: { atk: 98, def: 92, spd: 95, mag: 90, found: 92, grow: 95 },
        analysis: "為戰而生的聖猿一脈至強者，戰意越打越高，近身搏殺幾乎無人能擋，是純粹的攻伐之王。",
        passive: { physPct: 0.05, "fx:疾風": 0.04 },
        skill: { name: "鬥戰聖法", chance: 0.17, target: "single", dmgType: "phys", mult: 2.6,
                 desc: "17%：單體物理 260% 傷害", msg: "🐒 鬥戰聖皇戰意沖霄，【鬥戰聖法】一棍砸落！" }
    },
    {
        id: "xukong", name: "虛空大帝", title: "虛空", work: "遮天", author: "辰東", world: "遮天世界", peak: "大帝",
        power: { atk: 93, def: 92, spd: 97, mag: 95, found: 92, grow: 91 },
        analysis: "掌控虛空之力，出入如意，攻擊軌跡難以預判；以一人之力守護人族的形象深入人心。",
        passive: { eva: 3, atkPct: 0.02 },
        skill: { name: "虛空鏡照", chance: 0.17, target: "single", dmgType: "mag", mult: 2.6,
                 desc: "17%：單體術法 260% 傷害", msg: "🪞 虛空大帝祭出虛空鏡，【虛空鏡照】洞穿一切！" }
    },
    {
        id: "hengyu", name: "恆宇大帝", title: "恆宇", work: "遮天", author: "辰東", world: "遮天世界", peak: "大帝",
        power: { atk: 92, def: 95, spd: 90, mag: 93, found: 95, grow: 90 },
        analysis: "恆宇爐為其根本，攻防兼具又擅煉化，屬於穩紮穩打、越拖越強的持久戰型大帝。",
        passive: { def: 2, hpPct: 0.02, "fx:丹心": 0.20 },
        skill: { name: "恆宇爐煉", chance: 0.17, target: "aoe", dmgType: "mag", mult: 2.2, attrs: { fire: 100 },
                 desc: "17%：全體術法 220% 傷害並必定燒傷", msg: "⚱️ 恆宇大帝催動恆宇爐，【恆宇爐煉】焚煉群敵！" }
    },
    {
        id: "qingdi", name: "青帝", title: "青帝", work: "遮天", author: "辰東", world: "遮天世界・妖族", peak: "大帝",
        power: { atk: 93, def: 93, spd: 92, mag: 96, found: 94, grow: 94 },
        analysis: "混沌青蓮得道成帝，生機無窮、術法玄妙，既能攻伐也能自癒，是妖族的至高象徵。",
        passive: { magPct: 0.03, "fx:回春": 0.015 },
        skill: { name: "青蓮綻世", chance: 0.17, target: "aoe", dmgType: "mag", mult: 2.2, heal: 0.10,
                 desc: "17%：全體術法 220% 傷害，主人回復 10% 氣血", msg: "🪷 青帝身後混沌青蓮綻放，【青蓮綻世】生滅一念！" }
    },
    {
        id: "xihuangmu", name: "西皇母", title: "西皇", work: "遮天", author: "辰東", world: "遮天世界", peak: "大帝",
        power: { atk: 90, def: 94, spd: 90, mag: 95, found: 94, grow: 92 },
        analysis: "女帝之一，手持西皇塔，攻守平衡、術法精深，擅以守為攻、後發制人。",
        passive: { def: 2, magPct: 0.03 },
        skill: { name: "西皇塔鎮", chance: 0.17, target: "single", dmgType: "mag", mult: 2.2, shield: { reduce: 0.4, duration: 2 },
                 desc: "17%：單體術法 220% 傷害，主人受到傷害 -40% 持續 2 回合", msg: "🗼 西皇母祭起西皇塔，【西皇塔鎮】鎮壓來敵！" }
    },
    {
        id: "amituo", name: "阿彌陀佛大帝", title: "阿彌陀佛", work: "遮天", author: "辰東", world: "遮天世界・佛門", peak: "大帝",
        power: { atk: 88, def: 96, spd: 88, mag: 96, found: 95, grow: 92 },
        analysis: "佛法無邊、願力深厚，防禦與淨化能力極強，以慈悲之力化解殺伐，正面耐戰首屈一指。",
        passive: { def: 3, "fx:積德": 0.20 },
        skill: { name: "佛光普照", chance: 0.17, target: "self", heal: 0.15, shield: { reduce: 0.5, duration: 2 },
                 desc: "17%：主人回復 15% 氣血，受到傷害 -50% 持續 2 回合", msg: "🙏 阿彌陀佛大帝低誦佛號，【佛光普照】護佑周身！" }
    },
    {
        // 2026-09-26 玩家修正：稱號「渾源領主」（人稱羅城主），戰力以渾源領主時期計
        id: "luofeng", name: "羅峰", title: "渾源領主", work: "吞噬星空", author: "我吃西紅柿", world: "吞噬星空・原始宇宙", peak: "渾源領主（羅城主）",
        power: { atk: 98, def: 98, spd: 96, mag: 97, found: 98, grow: 99 },
        analysis: "從地球一路崛起，終成渾源領主、坐鎮羅城，人稱羅城主。金角巨獸本尊與多重分身合一運用，生命力近乎不滅；底蘊與成長都處於諸天頂端，擅以多身合擊碾壓對手。",
        passive: { hpPct: 0.05, atkPct: 0.04 },
        skill: { name: "金角巨獸", chance: 0.18, target: "aoe", dmgType: "phys", mult: 2.5, heal: 0.10,
                 desc: "18%：全體物理 250% 傷害，主人回復 10% 氣血", msg: "🦏 渾源領主羅峰化身【金角巨獸】，巨角橫掃諸天！" }
    },
    {
        id: "shihao", name: "石昊", title: "荒天帝", work: "完美世界", author: "辰東", world: "完美世界・九天十地", peak: "荒天帝",
        power: { atk: 99, def: 97, spd: 96, mag: 97, found: 97, grow: 99 },
        analysis: "被奪至尊骨後逆勢崛起，兼修諸多凶獸寶術，一路殺穿異域；戰意、肉身、術法皆臻極境，是戰力天花板級的存在。",
        passive: { atkPct: 0.05, statPct: 0.02 },
        skill: { name: "十凶寶術", chance: 0.18, target: "aoe", dmgType: "phys", mult: 2.4, attrs: { thunder: 100 },
                 desc: "18%：全體物理 240% 傷害並必定雷擊", msg: "⚡ 荒天帝石昊演化【十凶寶術】，雷帝、鯤鵬之影同時降臨！" }
    },
    {
        id: "wanglin", name: "王林", title: "仙逆", work: "仙逆", author: "耳根", world: "仙逆世界", peak: "踏天",
        power: { atk: 95, def: 88, spd: 90, mag: 95, found: 90, grow: 94 },
        analysis: "資質平庸卻心性堅忍，以殺入道；禁制、殺戮、因果諸道兼修，出手狠辣從不留情，專克強敵。",
        passive: { atkPct: 0.03, "fx:斬殺": 0.30 },
        skill: { name: "殺戮之道", chance: 0.17, target: "single", dmgType: "mag", mult: 2.6,
                 desc: "17%：單體術法 260% 傷害", msg: "🩸 王林眼中殺意凝聚，【殺戮之道】一指斬落！" }
    },
    {
        id: "menghao", name: "孟浩", title: "封天", work: "我欲封天", author: "耳根", world: "山海界", peak: "封天",
        power: { atk: 90, def: 90, spd: 90, mag: 92, found: 92, grow: 93 },
        analysis: "精於算計又不失熱血，以丹道起家，肉身、法術、道境多路並進，越到後期越難以撼動。",
        passive: { statPct: 0.03, "fx:丹心": 0.20 },
        skill: { name: "封天一指", chance: 0.17, target: "single", dmgType: "mag", mult: 2.6,
                 desc: "17%：單體術法 260% 傷害", msg: "☝️ 孟浩一指點出，【封天一指】封鎮天地！" }
    },
    {
        id: "baixiaochun", name: "白小純", title: "一念永恆", work: "一念永恆", author: "耳根", world: "一念永恆世界", peak: "（原著後期）",
        power: { atk: 80, def: 97, spd: 88, mag: 85, found: 88, grow: 92 },
        analysis: "怕死到極致，反把不死長生功練到極致，防禦與恢復極其驚人；看似膽小，卻常在關鍵時刻爆發。",
        passive: { def: 3, hpPct: 0.03 },
        skill: { name: "不死長生功", chance: 0.16, target: "self", heal: 0.15, shield: { reduce: 0.4, duration: 2 },
                 desc: "16%：主人回復 15% 氣血，受到傷害 -40% 持續 2 回合", msg: "🛡️ 白小純大喊不要打臉，運轉【不死長生功】硬扛下來！" }
    },
    {
        id: "qinyu", name: "秦羽", title: "鴻蒙之主", work: "星辰變", author: "我吃西紅柿", world: "星辰變世界・鴻蒙空間", peak: "鴻蒙掌控者",
        power: { atk: 95, def: 94, spd: 93, mag: 96, found: 96, grow: 96 },
        analysis: "天生無法修煉內功，卻另闢星辰變之路，一路超脫至鴻蒙之主；底蘊與成長都登峰造極。",
        passive: { statPct: 0.03, magPct: 0.03 },
        skill: { name: "星辰變", chance: 0.18, target: "aoe", dmgType: "mag", mult: 2.4,
                 desc: "18%：全體術法 240% 傷害", msg: "✨ 秦羽周身星辰流轉，【星辰變】引動漫天星力！" }
    },
    {
        id: "linlei", name: "林雷", title: "盤龍", work: "盤龍", author: "我吃西紅柿", world: "盤龍世界・玉蘭大陸", peak: "鴻蒙掌控者",
        power: { atk: 93, def: 94, spd: 90, mag: 92, found: 93, grow: 94 },
        analysis: "大地與風等法則兼修，化身龍血戰士時肉身與攻擊大增；穩健之中帶著爆發，是可靠的前排。",
        passive: { def: 2, physPct: 0.03 },
        skill: { name: "大地脈動", chance: 0.17, target: "aoe", dmgType: "phys", mult: 2.2,
                 desc: "17%：全體物理 220% 傷害", msg: "🐉 林雷化身龍血戰士，【大地脈動】撼動四方！" }
    },
    {
        id: "zhangxiaofan", name: "張小凡", title: "鬼厲", work: "誅仙", author: "蕭鼎", world: "誅仙世界・青雲山", peak: "佛道魔三家兼修",
        power: { atk: 85, def: 80, spd: 82, mag: 88, found: 86, grow: 84 },
        analysis: "佛、道、魔三家功法集於一身，燒火棍（噬魂棒）吸血噬魂，正邪兩道皆忌憚；情深而偏執，爆發力強。",
        passive: { "fx:吸血": 0.02, magPct: 0.02 },
        skill: { name: "噬魂", chance: 0.16, target: "single", dmgType: "mag", mult: 2.2, lifesteal: 0.25,
                 desc: "16%：單體術法 220% 傷害，吸取傷害 25%", msg: "🪄 鬼厲噬魂棒黑氣翻湧，【噬魂】吞吸敵手精血！" }
    },
    {
        id: "liqiye", name: "李七夜", title: "萬古帝尊", work: "帝霸", author: "厭筆蕭生", world: "帝霸世界", peak: "（萬古不朽）",
        power: { atk: 96, def: 95, spd: 95, mag: 97, found: 99, grow: 95 },
        analysis: "以萬古布局見長的謀略者，閱歷之深無人能及；戰前佈下的後手往往就決定勝負，底蘊深不可測。",
        passive: { statPct: 0.03, "fx:悟道": 0.10 },
        skill: { name: "萬古一擊", chance: 0.18, target: "single", dmgType: "mag", mult: 3.0,
                 desc: "18%：單體術法 300% 傷害", msg: "🌌 李七夜淡然出手，【萬古一擊】早已算盡一切！" }
    }
];

// ---- 新增夥伴的模板（複製後修改；id 不可重複，上線後不可改 id）----
// {
//     id: "英文代號", name: "名字", title: "稱號", work: "作品名", author: "作者", world: "出身世界", peak: "巔峰境界",
//     native: true,   // 只有出身本界（凡人修仙傳）才加；其他作品的角色省略 = 域外神明
//     power: { atk: 90, def: 90, spd: 90, mag: 90, found: 90, grow: 90 },   // 平均決定評級，對照 PARTNER_TIERS
//     analysis: "戰力分析：長處、短板、打法（自己的文字）",
//     passive: { atkPct: 0.03 },   // key 同稱號 bonus，見 config-titles.js 開頭
//     skill: { name: "招牌絕學", chance: 0.17, target: "single|aoe|self", dmgType: "phys|mag", mult: 2.6,
//              // 選填：attrs: { fire: 100 }、heal: 0.1、mpHeal: 0.1、lifesteal: 0.3、shield: { reduce: 0.3, duration: 2 }、freezeAll: true
//              desc: "17%：效果說明", msg: "戰鬥日誌文字" }
// },
