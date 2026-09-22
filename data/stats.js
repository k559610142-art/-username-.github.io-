// 屬性計算：裝備加成、五行法陣判定、戰力/氣血/靈力/升級門檻公式

function getEquipBonus() {
    let bonus = { str: 0, con: 0, int: 0, spr: 0, cha: 0 };
    for (let key in player.equipment) {
        let eq = player.equipment[key];
        if (eq) {
            bonus.str += eq.stats.str || 0;
            bonus.con += eq.stats.con || 0;
            bonus.int += eq.stats.int || 0;
            bonus.spr += eq.stats.spr || 0;
            bonus.cha += eq.stats.cha || 0;
        }
    }
    return bonus;
}

function getWuxingBuff() {
    let elements = [];
    let count = 0;
    for (let key in player.equipment) {
        let eq = player.equipment[key];
        if (eq) {
            elements.push(eq.element);
            count++;
        }
    }
    if (count < 17) return { type: null, name: "無 (裝備未集齊)" };
    let firstElem = elements[0];
    let allSame = elements.every(e => e === firstElem);
    if (!allSame) return { type: null, name: "無 (五行混雜)" };
    if (firstElem === "火") return { type: "火", name: "火靈星君加持 (傷害 +20%)" };
    if (firstElem === "水") return { type: "水", name: "水靈星君加持 (生命 +20%)" };
    if (firstElem === "木") return { type: "木", name: "木靈星君加持 (生命恢復 +20%)" };
    if (firstElem === "土") return { type: "土", name: "土靈星君加持 (防禦 +20%)" };
    if (firstElem === "金") return { type: "金", name: "金靈星君加持 (技能傷害 +20%)" };
    return { type: null, name: "無" };
}

function getNextExp() { return (player.realmIndex === 0 ? 100 : 200 * Math.pow(10, player.realmIndex)) * player.stage; }
function getBasePower() {
    let base = Math.pow(10, player.realmIndex) * 5 * player.stage + player.exp / 100;
    if (player.beasts.includes('wolf')) base *= 1.15;
    if (player.beasts.includes('dragon')) base *= 1.3;
    return base;
}

function getPhysAttack() {
    let eqBonus = getEquipBonus();
    let totalStr = player.stats.str + eqBonus.str;
    let base = getBasePower() * (player.sect ? player.sect.powerMult : 1.0) + (totalStr * 5);
    let wuxing = getWuxingBuff();
    if (wuxing.type === "火") base *= 1.2;
    if (player.buffTimer > 0) base *= player.buffMult;
    return Math.floor(base);
}

function getMagAttack() {
    let eqBonus = getEquipBonus();
    let totalInt = player.stats.int + eqBonus.int;
    let base = getBasePower() * (player.sect ? player.sect.powerMult : 1.0) + (totalInt * 5);
    let wuxing = getWuxingBuff();
    if (wuxing.type === "火") base *= 1.2;
    if (player.buffTimer > 0) base *= player.buffMult;
    return Math.floor(base);
}

function getMaxHp() {
    let eqBonus = getEquipBonus();
    let totalCon = player.stats.con + eqBonus.con;
    let wuxing = getWuxingBuff();
    if (wuxing.type === "土") totalCon *= 1.2;
    let baseHp = Math.floor(getBasePower() * 20 * (player.sect ? player.sect.powerMult : 1.0) + (totalCon * 10));
    if (wuxing.type === "水") baseHp = Math.floor(baseHp * 1.2);
    return baseHp;
}

function getMaxMp() {
    let eqBonus = getEquipBonus();
    let totalSpr = player.stats.spr + eqBonus.spr;
    return Math.floor(50 + (totalSpr * 10));
}

// 依宗門名稱分級（凡俗/修真/至高），供任務獎勵與門檻判斷使用
function getSectTier() {
    if (!player.sect) return 1;
    let name = player.sect.name;
    let tier1 = ["武當", "峨嵋", "少林寺", "全真教", "皇朝"];
    let tier2 = ["崑崙仙宗", "蜀山劍派", "丹鼎司", "御獸仙宗", "天魔教"];
    if (tier1.includes(name)) return 1;
    if (tier2.includes(name)) return 2;
    return 3;
}
