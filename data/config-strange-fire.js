// 異火碎片與天下異火（ARCHITECTURE.md 第 38 節）；邏輯在 strange-fire.js
// - 異火碎片：未來由秘境掉落（秘境尚未開放，取得時呼叫 addFireShards）
// - 集滿 STRANGE_FIRE_SHARDS_PER_FIRE 片可在背包合成 1 朵異火：先依 STRANGE_FIRE_TIERS 的 weight 抽品階，再從該品階平均抽一種
// - 秘境減傷：依「持有異火總朵數」（含重複）計算，每朵 STRANGE_FIRE_REALM_REDUCE，最多 STRANGE_FIRE_REALM_REDUCE_MAX
// - 永久加成：每「種」異火收錄後加成一次（重複取得不疊加），併入 gear.js 的 getBonusTotals
//   bonus 的 key 同稱號（config-titles.js）：atkPct/physPct/magPct/hpPct/statPct/strPct/conPct/intPct/sprPct 為 %，
//   def/eva/fire/ice/poison/metal/thunder 為百分點，fx:特效名（焚燼、回春、回靈、法爆、吸血…）

const STRANGE_FIRE_SHARDS_PER_FIRE = 100;     // 每 100 片合成 1 朵異火
const STRANGE_FIRE_REALM_REDUCE = 0.03;       // 每朵異火：秘境中受到傷害 -3%
const STRANGE_FIRE_REALM_REDUCE_MAX = 0.30;   // 減傷上限 30%（= 10 朵）

// 品階：weight 為合成時抽中該品階的機率（合計 100）
const STRANGE_FIRE_TIERS = {
    帝焰: { weight: 1.5,  color: "#f472b6", order: 5 },
    神焰: { weight: 6.5,  color: "#fb923c", order: 4 },
    天焰: { weight: 14,   color: "#c084fc", order: 3 },
    地焰: { weight: 28,   color: "#60a5fa", order: 2 },
    靈焰: { weight: 50,   color: "#4ade80", order: 1 }
};

const strangeFireItems = {
    fireShard:   { name: "異火碎片", icon: "🔥", desc: `天地異火崩散後的殘片，灼熱不熄。可於秘境取得，集滿 ${STRANGE_FIRE_SHARDS_PER_FIRE} 片可合成 1 朵天下異火（隨機）。` },
    strangeFire: { name: "異火",     icon: "☄️", desc: `以碎片重燃的天地異火，護住周身。每朵使秘境中受到的傷害 -${Math.round(STRANGE_FIRE_REALM_REDUCE * 100)}%（上限 ${Math.round(STRANGE_FIRE_REALM_REDUCE_MAX * 100)}%）；每種異火另有永久加成，收錄於天磯錄。` }
};

// ---- 天下異火 50 種 ----
// id 存進存檔（player.fireCollection），上線後不可改 id；origin = 出處／來歷
const strangeFireList = [
    // 帝焰（2）
    { id: "f01", name: "帝炎",       tier: "帝焰", origin: "《鬥破蒼穹》",   desc: "眾火之主，傳說由諸般異火相融而成，焚天煮海。", bonus: { atkPct: 0.05, fire: 5 } },
    { id: "f02", name: "虛無吞炎",   tier: "帝焰", origin: "《鬥破蒼穹》",   desc: "無形無色，專吞萬物之火與靈魂，可怖至極。",     bonus: { magPct: 0.05, "fx:吸血": 0.03 } },
    // 神焰（6）
    { id: "f03", name: "淨蓮妖火",   tier: "神焰", origin: "《鬥破蒼穹》",   desc: "生於淨蓮之中的妖火，火中自成空間。",           bonus: { statPct: 0.03 } },
    { id: "f04", name: "金帝焚天炎", tier: "神焰", origin: "《鬥破蒼穹》",   desc: "金色帝焰，所過之處萬物成灰。",                 bonus: { physPct: 0.04, metal: 2 } },
    { id: "f05", name: "三昧真火",   tier: "神焰", origin: "中華神話",       desc: "修行者以精、氣、神煉成的真火，專破邪祟。",     bonus: { "fx:法爆": 0.04 } },
    { id: "f06", name: "太陽真火",   tier: "神焰", origin: "中華神話・金烏", desc: "大日之精，金烏棲身之火，至陽至烈。",           bonus: { atkPct: 0.03, fire: 3 } },
    { id: "f07", name: "南明離火",   tier: "神焰", origin: "中華神話",       desc: "南方離位的先天神火，克制一切陰邪。",           bonus: { hpPct: 0.04, def: 2 } },
    { id: "f08", name: "紅蓮業火",   tier: "神焰", origin: "佛經・《鬥破蒼穹》", desc: "焚盡罪業的地獄之火，罪孽越深燒得越旺。",   bonus: { "fx:焚燼": 0.30 } },
    // 天焰（10）
    { id: "f09", name: "生靈之焱",   tier: "天焰", origin: "《鬥破蒼穹》",   desc: "蘊含磅礴生機的異火，能焚亦能生。",             bonus: { "fx:回春": 0.01 } },
    { id: "f10", name: "八荒破滅焱", tier: "天焰", origin: "《鬥破蒼穹》",   desc: "破滅八荒的暴烈之火，一燃即毀。",               bonus: { atkPct: 0.02 } },
    { id: "f11", name: "九幽金祖火", tier: "天焰", origin: "《鬥破蒼穹》",   desc: "自九幽深處升起的金色祖火。",                   bonus: { metal: 2, fire: 1 } },
    { id: "f12", name: "三千焱炎火", tier: "天焰", origin: "《鬥破蒼穹》",   desc: "三千火種同燃，生生不息。",                     bonus: { magPct: 0.02 } },
    { id: "f13", name: "九龍雷罡火", tier: "天焰", origin: "《鬥破蒼穹》",   desc: "九龍之形、雷火交織，剛猛無儔。",               bonus: { thunder: 2, fire: 1 } },
    { id: "f14", name: "鳳凰涅槃火", tier: "天焰", origin: "中華神話・鳳凰", desc: "浴火重生之焰，燃盡舊身再造新生。",             bonus: { hpPct: 0.03 } },
    { id: "f15", name: "六丁神火",   tier: "天焰", origin: "道教神話",       desc: "六丁神將所掌之火，煉丹鑄器皆宜。",             bonus: { "fx:丹心": 0.10 } },
    { id: "f16", name: "太乙神火",   tier: "天焰", origin: "道教神話",       desc: "太乙天尊煉寶之火，可熔仙金。",                 bonus: { statPct: 0.015 } },
    { id: "f17", name: "琉璃淨火",   tier: "天焰", origin: "佛經",           desc: "通透如琉璃的佛火，淨化心魔雜念。",             bonus: { "fx:回靈": 0.015 } },
    { id: "f18", name: "乾藍冰焰",   tier: "天焰", origin: "《凡人修仙傳》", desc: "冰中生焰、寒極反熾的奇火，冰火同源。",         bonus: { ice: 2, fire: 1 } },
    // 地焰（14）
    { id: "f19", name: "骨靈冷火",   tier: "地焰", origin: "《鬥破蒼穹》",   desc: "寄生於骨中的陰冷之火，觸之刺骨。",             bonus: { ice: 1, fire: 1 } },
    { id: "f20", name: "九幽風炎",   tier: "地焰", origin: "《鬥破蒼穹》",   desc: "風助火勢，自九幽刮起的炎風。",                 bonus: { eva: 1 } },
    { id: "f21", name: "隕落心炎",   tier: "地焰", origin: "《鬥破蒼穹》",   desc: "潛藏地底、專焚心神的異火。",                   bonus: { intPct: 0.02 } },
    { id: "f22", name: "海心焰",     tier: "地焰", origin: "《鬥破蒼穹》",   desc: "生於深海火山口，水火相濟。",                   bonus: { conPct: 0.02 } },
    { id: "f23", name: "青蓮地心火", tier: "地焰", origin: "《鬥破蒼穹》",   desc: "地心深處孕育的青蓮之火。",                     bonus: { fire: 2 } },
    { id: "f24", name: "玄黃炎",     tier: "地焰", origin: "《鬥破蒼穹》",   desc: "厚重如大地的玄黃之火，擅於守護。",             bonus: { def: 1 } },
    { id: "f25", name: "萬獸靈火",   tier: "地焰", origin: "《鬥破蒼穹》",   desc: "萬獸精魄所化，靈獸見之俯首。",                 bonus: { "fx:獸魂": 0.10 } },
    { id: "f26", name: "風雷怒炎",   tier: "地焰", origin: "《鬥破蒼穹》",   desc: "風雷相激而生的暴怒之炎。",                     bonus: { thunder: 1, eva: 0.5 } },
    { id: "f27", name: "火山石焰",   tier: "地焰", origin: "《鬥破蒼穹》",   desc: "火山岩漿凝成的石中之焰。",                     bonus: { strPct: 0.02 } },
    { id: "f28", name: "九幽冥火",   tier: "地焰", origin: "中華神話・冥界", desc: "幽冥地府不滅之火，照見亡魂。",                 bonus: { poison: 1, fire: 1 } },
    { id: "f29", name: "朱雀離火",   tier: "地焰", origin: "四象神話・朱雀", desc: "南方神獸朱雀的本命之火。",                     bonus: { atkPct: 0.01 } },
    { id: "f30", name: "星辰隕火",   tier: "地焰", origin: "域外星空",       desc: "隨隕星墜落人間的天外之火。",                   bonus: { magPct: 0.01 } },
    { id: "f31", name: "冰魄寒焰",   tier: "地焰", origin: "極北冰原",       desc: "冰魄之中燃起的藍白寒焰。",                     bonus: { ice: 2 } },
    { id: "f32", name: "紫府天火",   tier: "地焰", origin: "上古仙府",       desc: "上古修士紫府之中溫養的天火。",                 bonus: { sprPct: 0.02 } },
    // 靈焰（18）
    { id: "f33", name: "地心炎",     tier: "靈焰", origin: "天地自生",       desc: "地脈深處常見的異火，煉丹入門之選。",           bonus: { fire: 1 } },
    { id: "f34", name: "幽冥鬼火",   tier: "靈焰", origin: "民間傳說",       desc: "荒墳野地飄忽不定的幽綠鬼火。",                 bonus: { poison: 1 } },
    { id: "f35", name: "丹霞靈火",   tier: "靈焰", origin: "丹霞山脈",       desc: "晚霞染就的溫和靈火，最宜煉丹。",               bonus: { "fx:丹心": 0.05 } },
    { id: "f36", name: "赤陽火",     tier: "靈焰", origin: "天地自生",       desc: "正午烈陽下凝聚的赤色火焰。",                   bonus: { strPct: 0.01 } },
    { id: "f37", name: "玄冰焰",     tier: "靈焰", origin: "寒潭深處",       desc: "寒潭底部燃燒的冰藍火苗。",                     bonus: { ice: 1 } },
    { id: "f38", name: "碧磷毒火",   tier: "靈焰", origin: "南疆毒沼",       desc: "毒沼中磷氣自燃的碧綠毒火。",                   bonus: { "fx:蝕骨": 0.05 } },
    { id: "f39", name: "黑煞魔焰",   tier: "靈焰", origin: "魔道功法",       desc: "煞氣凝聚的黑色魔焰。",                         bonus: { physPct: 0.01 } },
    { id: "f40", name: "紫電雷火",   tier: "靈焰", origin: "雷雲之中",       desc: "雷擊引燃的紫色火焰，帶著電光。",               bonus: { thunder: 1 } },
    { id: "f41", name: "熔岩火精",   tier: "靈焰", origin: "火山深處",       desc: "熔岩中誕生的火之精靈。",                       bonus: { conPct: 0.01 } },
    { id: "f42", name: "狐火",       tier: "靈焰", origin: "民間傳說・妖狐", desc: "妖狐吐出的迷幻之火，惑人心神。",               bonus: { chaPct: 0.02 } },
    { id: "f43", name: "燭龍殘焰",   tier: "靈焰", origin: "《山海經》・燭龍", desc: "燭龍睜眼為晝、閉眼為夜，此為其殘留之焰。",   bonus: { intPct: 0.01 } },
    { id: "f44", name: "畢方火",     tier: "靈焰", origin: "《山海經》・畢方", desc: "獨足神鳥畢方所至之處必起的怪火。",           bonus: { eva: 0.5 } },
    { id: "f45", name: "熒惑星火",   tier: "靈焰", origin: "星象・熒惑",     desc: "熒惑（火星）之光墜地化成的火。",               bonus: { magPct: 0.005, fire: 0.5 } },
    { id: "f46", name: "焚香佛火",   tier: "靈焰", origin: "佛門",           desc: "千年香火供奉凝成的佛前之火。",                 bonus: { "fx:積德": 0.05 } },
    { id: "f47", name: "血煉魔火",   tier: "靈焰", origin: "魔道功法",       desc: "以精血為引煉出的魔火。",                       bonus: { "fx:吸血": 0.005 } },
    { id: "f48", name: "金烏餘燼",   tier: "靈焰", origin: "中華神話・金烏", desc: "后羿射日時金烏墜落所遺的餘燼。",               bonus: { metal: 1 } },
    { id: "f49", name: "磷光冷焰",   tier: "靈焰", origin: "古戰場",         desc: "古戰場白骨間閃爍的冷焰。",                     bonus: { def: 0.5 } },
    { id: "f50", name: "雷澤天火",   tier: "靈焰", origin: "《易經》・雷澤", desc: "雷落澤中激起的天火。",                         bonus: { hpPct: 0.01 } }
];

// ---- 新增異火的模板（複製一行、改 id 與內容；id 不可重複）----
// { id: "f51", name: "名稱", tier: "靈焰|地焰|天焰|神焰|帝焰", origin: "出處", desc: "一句描述", bonus: { atkPct: 0.01 } },
