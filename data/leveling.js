// 經驗獲取、升階/突破結算，以及轉世輪迴

function gainExp(amount) {
    if (player.realmIndex >= realms.length - 1 && player.stage >= 10) return;
    let finalAmount = amount * (player.sect ? player.sect.expMult : 1.0);
    if (player.beasts.includes('fox')) finalAmount *= 1.1;
    if (player.beasts.includes('dragon')) finalAmount *= 1.2;
    player.exp += finalAmount;

    let maxExp = getNextExp();
    while (player.exp >= maxExp) {
        player.exp -= maxExp;
        player.stage++;

        player.stats.str += 5;
        player.stats.con += 5;
        player.stats.int += 5;
        player.stats.spr += 5;
        player.stats.cha += 2;

        if (player.stage > 10) {
            player.realmIndex++;
            player.stage = 1;

            let realmName = realms[player.realmIndex];
            let statBonus = 100;

            if (realmName === "渡劫") statBonus = 200;
            else if (realmName === "仙人初境") statBonus = 300;
            else if (realmName === "天仙") statBonus = 400;
            else if (realmName === "真仙") statBonus = 500;
            else if (realmName === "大羅金仙") statBonus = 1000;
            else if (realmName === "混元大羅金仙") statBonus = 2000;
            else if (realmName === "混沌道祖") statBonus = 3000;

            player.stats.str += statBonus;
            player.stats.con += statBonus;
            player.stats.int += statBonus;
            player.stats.spr += statBonus;
            player.stats.cha += Math.floor(statBonus / 5);

            addLog(`⚡ 突破成功！境界晉升至【${realmName}】！四維與魅力屬性全面暴增！`, "level-up");
        } else {
            addLog(`✨ 修為精進，達到【${realms[player.realmIndex]} ${player.stage}階】！四維屬性 +5，魅力 +2。`, "level-up");
        }
        player.hp = getMaxHp();
        player.mp = getMaxMp();
        maxExp = getNextExp();
    }
    updateUI();
    return finalAmount;
}

function triggerReincarnate() {
    if (player.realmIndex < 10) {
        alert("境界未達【仙人初境】，無法進行轉世輪迴！");
        return;
    }

    if (confirm("轉世輪迴將重置等級與境界，但會永久增加輪迴次數並提升天賦！是否確定輪迴？")) {
        player.reincarnations++;
        player.realmIndex = 0;
        player.stage = 1;
        player.exp = 0;
        player.stats = { str: 10 + player.reincarnations * 50, con: 10 + player.reincarnations * 50, int: 10 + player.reincarnations * 50, spr: 10 + player.reincarnations * 50, cha: 10 + player.reincarnations * 10 };
        player.studyCounts = { str: 0, con: 0, int: 0, spr: 0 };
        player.hp = getMaxHp();
        player.mp = getMaxMp();
        addLog(`🌀 成功轉世輪迴！第 ${player.reincarnations} 次輪迴，基礎屬性獲得極大幅度提升！`, "reincarnate");
        updateUI();
    }
}
