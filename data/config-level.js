// 人物等級設定（與境界是兩條獨立的成長線，共用同一份經驗來源）
// 每次 gainExp() 取得的經驗會同時累積到「境界修為」與「人物等級」；
// 待渡劫時境界修為會暫停，但人物等級仍會繼續成長。
const MAX_PLAYER_LEVEL = 10000;

// 每升 1 級的固定成長
const LEVEL_UP_STAT_GAIN = 1;   // 力量 / 體質 / 悟性 / 靈力 各 +1
const LEVEL_UP_HP_GAIN = 10;    // 生命上限 +10（另外計算，不受體質換算影響）
const LEVEL_UP_MP_GAIN = 5;     // 靈力上限 +5

// 升級所需經驗 = 係數 × 等級^1.5，等級區間越高係數越大（形成明顯的瓶頸期）
//   約略累積總經驗：Lv100 ≈ 400 萬、Lv1000 ≈ 38 億、Lv5000 ≈ 6900 億、Lv10000 ≈ 10 兆
const LEVEL_EXP_SEGMENTS = [
    { minLevel: 1,    coef: 100 },    // Lv1    ~ Lv99   ：入門期
    { minLevel: 100,  coef: 300 },    // Lv100  ~ Lv999  ：×3
    { minLevel: 1000, coef: 1000 },   // Lv1000 ~ Lv4999 ：×10
    { minLevel: 5000, coef: 3000 }    // Lv5000 ~ Lv10000：×30
];
