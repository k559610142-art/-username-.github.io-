// 浪跡江湖：門派（內功）與兵器（外功）武學（ARCHITECTURE.md 第 5 節）
// 外功 kind:'outer'：貼身出手、立即生效，需裝備對應兵器（wtype）；用外功攻擊（臂力）計算
// 內功 kind:'inner'：遠距離、要聚氣 cast 秒（身法可縮短），門派專屬；用內功攻擊（真元）計算
// 效果欄位：mul 倍率、perLv 每重加成、hits 段數、aoe 範圍半徑、dot 持續傷害、stun 暈眩秒數、
//          heal 回復氣血%、buff {stat,val,dur}（stat：xiejin 卸勁%、dodge 閃避%、atkPct 攻擊%、defPct 防禦%）
const SKILL_MAX = 10;

const SECTS = {
    xuanxiao: {
        name: '玄霄觀', icon: '⚡', color: '#7ab8ff',
        desc: '道門內家，遠程聚氣、爆發最強，身子較薄。',
        grow: { hp: 16, mp: 9 }, autoAttr: { qi: 3, agi: 1, wu: 1 },
        inner: { name: '玄霄心訣', per: { innerPct: 3, mpPct: 2 }, desc: '每重內功攻擊 +3%、真氣 +2%' },
        skills: [
            { id: 'xx1', name: '掌心雷', mp: 8, cd: 2, cast: 0.8, range: 260, mul: 1.8, perLv: 0.14, unlock: 1, desc: '聚氣於掌，引雷擊敵。' },
            { id: 'xx2', name: '玄霄劍氣', mp: 16, cd: 7, cast: 1.0, range: 280, mul: 1.3, aoe: 80, perLv: 0.1, unlock: 8, desc: '劍氣離體，傷及目標周圍。' },
            { id: 'xx3', name: '五雷正法', mp: 32, cd: 16, cast: 1.6, range: 300, mul: 2.6, aoe: 130, perLv: 0.2, unlock: 18, desc: '五雷齊落，大範圍重創。' },
        ],
    },
    tieyi: {
        name: '鐵衣門', icon: '🛡️', color: '#d8a650',
        desc: '外練筋骨，氣血卸勁最高，適合近身硬拚。',
        grow: { hp: 28, mp: 5 }, autoAttr: { str: 2, con: 3 },
        inner: { name: '鐵衣功', per: { hpPct: 3, xiejin: 1 }, desc: '每重氣血 +3%、卸勁 +1%' },
        skills: [
            { id: 'ty1', name: '金鐘護體', mp: 12, cd: 20, cast: 0.5, range: 0, buff: { stat: 'xiejin', val: 25, dur: 12 }, perLv: 1.5, unlock: 1, desc: '真氣護身，大幅提高卸勁。' },
            { id: 'ty2', name: '獅子吼', mp: 18, cd: 12, cast: 0.6, range: 0, mul: 1.0, aoe: 110, stun: 1.5, perLv: 0.08, unlock: 8, desc: '一聲長嘯，震暈身旁敵人。' },
            { id: 'ty3', name: '不動如山', mp: 24, cd: 25, cast: 1.0, range: 0, heal: 25, perLv: 1.5, unlock: 18, desc: '運氣調息，回復大量氣血。' },
        ],
    },
    baicao: {
        name: '百草谷', icon: '🌿', color: '#7fc46a',
        desc: '識百草、善用毒，持續傷害與自療兼備。',
        grow: { hp: 20, mp: 8 }, autoAttr: { qi: 2, con: 2, wu: 1 },
        inner: { name: '百草經', per: { mpPct: 4, regen: 0.15 }, desc: '每重真氣 +4%、每秒回血 +0.15%' },
        skills: [
            { id: 'bc1', name: '青蛇針', mp: 7, cd: 2.5, cast: 0.6, range: 240, mul: 1.1, dot: { mul: 0.35, dur: 4 }, perLv: 0.08, unlock: 1, desc: '淬毒細針，命中後持續中毒。' },
            { id: 'bc2', name: '回春術', mp: 16, cd: 12, cast: 1.0, range: 0, heal: 22, perLv: 1.5, unlock: 8, desc: '以草木靈氣回復氣血。' },
            { id: 'bc3', name: '百毒瘴', mp: 22, cd: 12, cast: 1.2, range: 260, mul: 0.6, aoe: 100, dot: { mul: 0.6, dur: 6 }, perLv: 0.06, unlock: 18, desc: '放出毒瘴，侵蝕一片敵人。' },
        ],
    },
    wuying: {
        name: '無影樓', icon: '🌙', color: '#c58cff',
        desc: '來去無蹤，閃避會心最高，爆發驚人。',
        grow: { hp: 17, mp: 6 }, autoAttr: { str: 2, agi: 2, wu: 1 },
        inner: { name: '無影訣', per: { dodge: 0.6, crit: 0.6 }, desc: '每重閃避 +0.6%、會心 +0.6%' },
        skills: [
            { id: 'wy1', name: '飛影鏢', mp: 6, cd: 2, cast: 0.4, range: 220, mul: 1.4, perLv: 0.1, unlock: 1, desc: '出手極快的暗器。' },
            { id: 'wy2', name: '迷蹤步', mp: 14, cd: 18, cast: 0.3, range: 0, buff: { stat: 'dodge', val: 25, dur: 8 }, perLv: 1, unlock: 8, desc: '身形飄忽，閃避大增。' },
            { id: 'wy3', name: '攝魂術', mp: 20, cd: 14, cast: 0.8, range: 220, mul: 2.2, stun: 2, mustCrit: true, perLv: 0.16, unlock: 18, desc: '奪人心神，必定會心並暈眩。' },
        ],
    },
};

// 外功：依兵器分系，四派共用，到城鎮武館用修為習得
const OUTER_SKILLS = {
    fist: [
        { id: 'fs1', name: '衝拳', mp: 4, cd: 3, mul: 1.5, perLv: 0.1, unlock: 1, desc: '徒手直擊。' },
    ],
    blade: [
        { id: 'bd1', name: '劈山式', mp: 6, cd: 3, mul: 1.7, perLv: 0.12, unlock: 1, desc: '自上而下一刀劈落。' },
        { id: 'bd2', name: '旋風斬', mp: 14, cd: 8, mul: 1.0, aoe: 85, perLv: 0.08, unlock: 8, desc: '迴身一圈，斬及四周。' },
        { id: 'bd3', name: '斷浪刀', mp: 24, cd: 14, mul: 2.8, perLv: 0.2, unlock: 18, desc: '蓄力重斬，威力驚人。' },
    ],
    spear: [
        { id: 'sp1', name: '突刺', mp: 6, cd: 3, mul: 1.6, perLv: 0.12, unlock: 1, desc: '長槍直刺，及遠。' },
        { id: 'sp2', name: '橫掃千軍', mp: 15, cd: 9, mul: 0.9, aoe: 110, perLv: 0.07, unlock: 8, desc: '大範圍橫掃。' },
        { id: 'sp3', name: '蛟龍出海', mp: 26, cd: 15, mul: 3.0, perLv: 0.22, unlock: 18, desc: '槍如蛟龍，一擊穿心。' },
    ],
    claw: [
        { id: 'cl1', name: '裂石爪', mp: 5, cd: 2.5, mul: 0.85, hits: 2, perLv: 0.06, unlock: 1, desc: '雙爪連抓。' },
        { id: 'cl2', name: '鎖喉手', mp: 14, cd: 10, mul: 1.4, stun: 1.2, perLv: 0.1, unlock: 8, desc: '扣住要害，使敵暈眩。' },
        { id: 'cl3', name: '千手連環', mp: 24, cd: 14, mul: 0.6, hits: 5, perLv: 0.05, unlock: 18, desc: '瞬間五連爪。' },
    ],
};

// 依 id 找武學（內功或外功），回傳附上 kind／wtype 的定義
const SKILL_INDEX = {};
for (const sid in SECTS) for (const s of SECTS[sid].skills) SKILL_INDEX[s.id] = Object.assign({ kind: 'inner', sect: sid }, s);
for (const wt in OUTER_SKILLS) for (const s of OUTER_SKILLS[wt]) SKILL_INDEX[s.id] = Object.assign({ kind: 'outer', wtype: wt, range: 0 }, s);
function skillDef(id) { return SKILL_INDEX[id]; }
function sectOf(p) { return SECTS[p.sect]; }
function skillLvVal(base, perLv, lv) { return base + perLv * (lv - 1); }
