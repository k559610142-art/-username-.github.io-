// 渡劫（心魔試煉）設定
// 小境界滿 10 階後修為停止累積，必須擊敗心魔才能晉升下一個大境界。

// 心魔戰力＝玩家的 150%
const HEART_DEMON_POWER_MULT = 1.5;

// 心魔氣血＝玩家的 100%（心魔是你的鏡像魔身，生命力與你相同）
// 註：若連氣血也給 1.5 倍，心魔會同時更肉更痛，實測勝率不足 11%，形同無法通過。
const HEART_DEMON_HP_MULT = 1.0;

// 心魔為人形（與玩家同貌的魔身）
const HEART_DEMON_ICON = "🧍";

// 心魔每回合施展魔功的機率
const HEART_DEMON_SKILL_CHANCE = 0.4;

// 渡劫失敗時損失的靈石比例
const TRIBULATION_FAIL_COIN_LOSS = 0.1;

// 心魔技能：
//   預設為傷害型，mult = 攻擊力倍率
//   type "drain" 會額外吸取玩家靈力（drain = 吸取最大靈力的比例）
//   type "buff"  會提升心魔自身攻擊力，持續 duration 回合
const heartDemonSkills = [
    { name: "心魔幻殺", mult: 1.8, msg: "心魔化作與你一模一樣的身影，【心魔幻殺】直取要害！" },
    { name: "蝕魂魔焰", mult: 1.6, msg: "心魔噴吐【蝕魂魔焰】，神識如遭萬蟻噬咬！" },
    { name: "魔念侵心", type: "drain", mult: 1.2, drain: 0.3, msg: "心魔施展【魔念侵心】，竊取你的靈力！" },
    { name: "魔影加身", type: "buff", mult: 1.5, duration: 3, msg: "心魔【魔影加身】，魔氣暴漲，攻勢更為凌厲！" }
];
