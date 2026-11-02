// 浪跡江湖：全域常數與數值公式（ARCHITECTURE.md 第 3、4 節）
const GAME_VERSION = '20261102j';
const SAVE_KEY = 'langji_jianghu_save_v2';
const MAX_LV = 99;
const POINTS_PER_LV = 5;              // 每升一級的屬性點
const AUTO_HUNT_LV = 1;               // 幾級開放自動練功（掛機）
const OFFLINE_RATE = 0.5;             // 離線收益：線上效率的 50%（離線前要開著掛機）
const OFFLINE_MAX_H = 8;
const BAG_MAX = 60;
const REVIVE_DELAY = 5;               // 重傷後幾秒回城
const POT_CD = 1.0;                   // 喝藥冷卻（秒）
const HOTBAR_SIZE = 8;

// 五項屬性（每點效果寫在 calcStats）
const ATTRS = [
    { id: 'str', name: '臂力', desc: '外功攻擊 +2' },
    { id: 'agi', name: '身法', desc: '閃避、攻速、聚氣速度' },
    { id: 'con', name: '體魄', desc: '氣血 +14、回血、卸勁' },
    { id: 'qi', name: '真元', desc: '內功攻擊 +2、真氣 +8、化勁' },
    { id: 'wu', name: '悟性', desc: '命中、會心' },
];

const QUALITY = [
    { name: '凡品', color: '#cfc6b0', mul: 1.00, weight: 60 },
    { name: '良品', color: '#7fc46a', mul: 1.25, weight: 25 },
    { name: '精品', color: '#5aa0e0', mul: 1.60, weight: 10 },
    { name: '絕品', color: '#c58cff', mul: 2.10, weight: 4 },
    { name: '神品', color: '#ffb347', mul: 2.80, weight: 1 },
];

const SLOTS = [
    { id: 'weapon', name: '兵器' }, { id: 'armor', name: '衣甲' }, { id: 'helm', name: '頭冠' },
    { id: 'boots', name: '靴履' }, { id: 'ring', name: '佩飾' },
];

// 外功兵器三系＋徒手：射程（像素）、出手間隔係數
const WEAPON_TYPES = {
    fist: { name: '徒手', range: 46, spd: 1.0 },
    blade: { name: '刀', range: 58, spd: 1.1 },
    spear: { name: '槍', range: 92, spd: 1.25 },
    claw: { name: '爪', range: 50, spd: 0.85 },
};

// 強化：成功率（+0→+1 … +9→+10），+7 以上失敗掉一級；+5 以上人物兵器會發光
const ENHANCE_RATE = [100, 95, 90, 80, 70, 60, 50, 40, 30, 20];
const ENHANCE_MAX = 10;
const ENHANCE_PER_LV = 0.08;

function expNeed(lv) { return Math.floor(25 * Math.pow(lv, 2.3) + 30 * lv); }
function skillCost(lv) { return Math.floor(20 * Math.pow(lv, 1.5)); }   // 武學升到 lv+1 要的修為
function enhanceCost(item) { return Math.floor((20 + item.lv * 6) * (item.plus + 1) * (1 + item.q * 0.3)); }
function randInt(a, b) { return a + Math.floor(Math.random() * (b - a + 1)); }
function rand(a, b) { return a + Math.random() * (b - a); }
function dist(a, b) { return Math.hypot(a.x - b.x, a.y - b.y); }
function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }
function pickWeighted(list, key) {
    let sum = 0; for (const x of list) sum += x[key];
    let r = Math.random() * sum;
    for (let i = 0; i < list.length; i++) { r -= list[i][key]; if (r < 0) return i; }
    return list.length - 1;
}
function fmt(n) {
    n = Math.floor(n);
    if (n >= 1e8) return (n / 1e8).toFixed(2) + '億';
    if (n >= 1e4) return (n / 1e4).toFixed(1) + '萬';
    return String(n);
}
