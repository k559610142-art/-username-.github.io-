// 經驗獲取、小境界升階、大境界突破（需渡劫）與轉世輪迴

// 回傳實際獲得的經驗值；若修為已圓滿待渡劫則回傳 0（經驗暫停累積）
function gainExp(amount) {
    if (player.pendingTribulation) return 0;
    if (player.realmIndex >= realms.length - 1 && player.stage >= 10) return 0;

    let finalAmount = amount * (player.sect ? player.sect.expMult : 1.0);
    if (player.beasts.includes('fox')) finalAmount *= 1.1;
    if (player.beasts.includes('dragon')) finalAmount *= 1.2;
    player.exp += finalAmount;

    let maxExp = getNextExp();
    while (player.exp >= maxExp) {
        // 小境界已達 10 階：準備晉升下一個大境界
        if (player.stage >= 10) {
            // 已是最高境界，修為封頂
            if (player.realmIndex >= realms.length - 1) {
                player.exp = maxExp;
                break;
            }
            // 築基以上：封頂並等待渡劫
            if (player.realmIndex >= TRIBULATION_MIN_REALM_INDEX) {
                player.exp = maxExp;
                player.pendingTribulation = true;
                addLog(`☁️ 修為已臻【${realms[player.realmIndex]} 10階】圓滿，天劫將至！經驗暫停累積，需渡劫方能晉升【${realms[player.realmIndex + 1]}】。`, "reincarnate");
                break;
            }
            // 築基以前：直接突破，不需渡劫（保留溢出的經驗值）
            let carryExp = player.exp - maxExp;
            advanceRealm();
            player.exp = carryExp;
            maxExp = getNextExp();
            continue;
        }

        player.exp -= maxExp;
        player.stage++;

        player.stats.str += 5;
        player.stats.con += 5;
        player.stats.int += 5;
        player.stats.spr += 5;
        player.stats.cha += 2;

        addDailyProgress('breakthrough');
        addLog(`✨ 修為精進，達到【${realms[player.realmIndex]} ${player.stage}階】！四維屬性 +5，魅力 +2。`, "level-up");

        player.hp = getMaxHp();
        player.mp = getMaxMp();
        maxExp = getNextExp();
    }
    updateUI();
    return finalAmount;
}

// 晉升下一個大境界（僅由渡劫成功時呼叫，見 tribulation.js）
function advanceRealm() {
    player.realmIndex++;
    player.stage = 1;
    player.exp = 0;

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

    player.hp = getMaxHp();
    player.mp = getMaxMp();

    addLog(`⚡ 突破成功！境界晉升至【${realmName}】！四維與魅力屬性全面暴增！`, "level-up");
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
        player.pendingTribulation = false;
        player.stats = { str: 10 + player.reincarnations * 50, con: 10 + player.reincarnations * 50, int: 10 + player.reincarnations * 50, spr: 10 + player.reincarnations * 50, cha: 10 + player.reincarnations * 10 };
        player.studyCounts = { str: 0, con: 0, int: 0, spr: 0 };
        player.hp = getMaxHp();
        player.mp = getMaxMp();
        addLog(`🌀 成功轉世輪迴！第 ${player.reincarnations} 次輪迴，基礎屬性獲得極大幅度提升！`, "reincarnate");
        updateUI();
    }
}
