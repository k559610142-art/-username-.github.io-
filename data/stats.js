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
    // 神器欄位不列入五行法陣的計算（特殊部位，取得方式後續再實作）
    let slots = Object.keys(player.equipment).filter(key => equipTypes[key] !== "artifact");
    let elements = [];
    for (let key of slots) {
        let eq = player.equipment[key];
        if (!eq) return { type: null, name: "無 (裝備未集齊)" };
        elements.push(eq.element);
    }
    let firstElem = elements[0];
    let allSame = elements.every(e => e === firstElem);
    if (!allSame) return { type: null, name: "無 (五行混雜)" };
    let info = wuxingArrayEffects[firstElem];
    if (!info) return { type: null, name: "無" };
    return { type: firstElem, name: `${info.title} (${info.effect})` };
}

function getNextExp() { return (player.realmIndex === 0 ? 100 : 200 * Math.pow(10, player.realmIndex)) * player.stage; }

// 人物等級：從 level 升到 level+1 所需的經驗（見 config-level.js）
function getLevelExpNeeded(level) {
    let coef = LEVEL_EXP_SEGMENTS[0].coef;
    for (let seg of LEVEL_EXP_SEGMENTS) {
        if (level >= seg.minLevel) coef = seg.coef;
    }
    return Math.floor(coef * Math.pow(level, 1.5));
}

// 是否擁有「存活中」的指定靈寵（死亡的靈寵不提供被動加成）
function hasLiveBeast(id) {
    return player.beasts.some(b => b.id === id && b.alive);
}

function getBasePower() {
    let base = Math.pow(10, player.realmIndex) * 5 * player.stage + player.exp / 100;
    if (hasLiveBeast('wolf')) base *= 1.15;
    if (hasLiveBeast('dragon')) base *= 1.3;
    return base;
}

function getPhysAttack() {
    let eqBonus = getEquipBonus();
    let totalStr = player.stats.str + eqBonus.str;
    let base = getBasePower() * (player.sect ? player.sect.powerMult : 1.0) + (totalStr * 5);
    let wuxing = getWuxingBuff();
    if (wuxing.type === "火") base *= 1.2;
    if (player.buffTimer > 0) base *= player.buffMult;
    if (petBuffTimer > 0) base *= petBuffMult;
    return Math.floor(base);
}

function getMagAttack() {
    let eqBonus = getEquipBonus();
    let totalInt = player.stats.int + eqBonus.int;
    let base = getBasePower() * (player.sect ? player.sect.powerMult : 1.0) + (totalInt * 5);
    let wuxing = getWuxingBuff();
    if (wuxing.type === "火") base *= 1.2;
    if (player.buffTimer > 0) base *= player.buffMult;
    if (petBuffTimer > 0) base *= petBuffMult;
    return Math.floor(base);
}

function getMaxHp() {
    let eqBonus = getEquipBonus();
    let totalCon = player.stats.con + eqBonus.con;
    let wuxing = getWuxingBuff();
    if (wuxing.type === "土") totalCon *= 1.2;
    let baseHp = Math.floor(getBasePower() * 20 * (player.sect ? player.sect.powerMult : 1.0) + (totalCon * 10));
    if (wuxing.type === "水") baseHp = Math.floor(baseHp * 1.2);
    return baseHp + (player.level - 1) * LEVEL_UP_HP_GAIN;
}

function getMaxMp() {
    let eqBonus = getEquipBonus();
    let totalSpr = player.stats.spr + eqBonus.spr;
    return Math.floor(50 + (totalSpr * 10)) + (player.level - 1) * LEVEL_UP_MP_GAIN;
}

// 依目前宗門分級（凡俗 1 / 修真 2 / 至高 3），供任務獎勵與門檻判斷使用
function getSectTier() {
    if (!player.sect) return 1;
    let sect = findSectByName(player.sect.name);
    return sect ? sect.tier : 1;
}

// 目前可施展的所有技能：各階段已學的宗門技能（初級→高級）+ 靈寶閣習得的禁術
function getAllSkills() {
    let skills = [];
    for (let tier of [1, 2, 3]) {
        let sect = player.sectSkills && player.sectSkills[tier] ? findSectByName(player.sectSkills[tier]) : null;
        if (sect) skills = skills.concat(sect.skills);
    }
    if (player.learnedSkills) skills = skills.concat(player.learnedSkills);
    return skills;
}
