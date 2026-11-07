// 屠龍勇者：職業平衡倍率（2026-11-07，ARCHITECTURE.md 第 320 節）。不寫進更新日誌（使用者要求）。
// 依 tools/sim-classes.js 模擬（Lv.65／Lv.80、同條件、各職業最佳二轉分支）調整：
// 聖騎士、槍手、王族、騎士全部傷害補強；修羅「拳聖」分支微削；法系範圍技能另外調整（CLASS_AOE_*）。
const CLASS_DMG_MUL = { paladin: 1.25, gunner: 1.25, royal: 1.2, knight: 1.2 };   // 物理＋魔法全部傷害
const ADV_DMG_MUL = { sFist: 0.9 };                                               // 二轉分支（advance.js 的 br id）
const CLASS_AOE_CD_MUL = {};     // 範圍／全畫面攻擊技能冷卻倍率（依職業）
const CLASS_AOE_DMG_MUL = {};    // 範圍／全畫面攻擊技能傷害倍率（依職業）
function classBalMul() {
    if (!player) return 1;
    let m = CLASS_DMG_MUL[player.cls] || 1;
    const br = player.adv && player.adv.br;
    if (br && ADV_DMG_MUL[br]) m *= ADV_DMG_MUL[br];
    return m;
}
function classAoeSkill(k) { return !!(k && (k.aoe || k.screen || k.screenTargets) && k.type !== 'heal' && k.type !== 'buff'); }
function classAoeCdMul(k) { return player && classAoeSkill(k) ? CLASS_AOE_CD_MUL[player.cls] || 1 : 1; }
function classAoeDmgMul(k) { return player && classAoeSkill(k) ? CLASS_AOE_DMG_MUL[player.cls] || 1 : 1; }
