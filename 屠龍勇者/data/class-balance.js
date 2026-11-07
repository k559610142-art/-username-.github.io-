// 屠龍勇者：職業平衡倍率（2026-11-07，ARCHITECTURE.md 第 320 節）。不寫進更新日誌（使用者要求）。
// 依 tools/sim-classes.js 模擬（Lv.65／Lv.80、同條件、各職業最佳二轉分支）調整：
// 聖騎士、槍手、王族、騎士全部傷害補強；修羅全職業微削（20261107i 取代原本只削拳聖）；法師一轉＋二轉攻擊魔法降傷、冷卻加長（20261107i）。
const CLASS_DMG_MUL = { paladin: 1.25, gunner: 1.25, royal: 1.2, knight: 1.2, shura: 0.9 };   // 物理＋魔法全部傷害
const CLASS_MAGIC_MUL = { mage: 0.85 };   // 只乘魔法傷害（magicDamage：一轉、二轉攻擊魔法、二轉分裂／連鎖）
const CLASS_SKILL_CD_MUL = { mage: 1.25 };   // 攻擊技能冷卻倍率（一轉＋二轉；治癒、增益、被動不算）
const ADV_DMG_MUL = {};                                               // 二轉分支（advance.js 的 br id）
const CLASS_AOE_CD_MUL = {};     // 範圍／全畫面攻擊技能冷卻倍率（依職業）
const CLASS_AOE_DMG_MUL = {};    // 範圍／全畫面攻擊技能傷害倍率（依職業）
function classBalMul(magic) {
    if (!player) return 1;
    let m = CLASS_DMG_MUL[player.cls] || 1;
    if (magic && CLASS_MAGIC_MUL[player.cls]) m *= CLASS_MAGIC_MUL[player.cls];
    const br = player.adv && player.adv.br;
    if (br && ADV_DMG_MUL[br]) m *= ADV_DMG_MUL[br];
    return m;
}
function classAoeSkill(k) { return !!(k && (k.aoe || k.screen || k.screenTargets) && k.type !== 'heal' && k.type !== 'buff'); }
function classAoeCdMul(k) {
    if (!player || !k || (k.type !== 'spell' && k.type !== 'strike')) return 1;   // 只算攻擊技能（spell／strike）
    return (CLASS_SKILL_CD_MUL[player.cls] || 1) * (classAoeSkill(k) ? CLASS_AOE_CD_MUL[player.cls] || 1 : 1);
}
function classAoeDmgMul(k) { return player && classAoeSkill(k) ? CLASS_AOE_DMG_MUL[player.cls] || 1 : 1; }
