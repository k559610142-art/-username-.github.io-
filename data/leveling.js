// 經驗獲取、小境界升階、大境界突破（需渡劫）與轉世輪迴

// 回傳實際獲得的「境界修為」；若修為已圓滿待渡劫則回傳 0（境界經驗暫停累積）
// 人物等級與靈寵等級不受渡劫限制，仍會持續成長。
function gainExp(amount) {
    let finalAmount = amount * (player.sect ? player.sect.expMult : 1.0);
    if (hasLiveBeast('fox')) finalAmount *= 1.1;
    if (hasLiveBeast('dragon')) finalAmount *= 1.2;

    gainLevelExp(finalAmount);
    gainBeastExp(finalAmount);

    if (player.pendingTribulation) { updateUI(); return 0; }
    if (player.realmIndex >= realms.length - 1 && player.stage >= 10) { updateUI(); return 0; }

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

// 人物等級：每升 1 級四維各 +1、生命上限 +10、靈力上限 +5（後兩者由 getMaxHp/getMaxMp 依等級計算）
function gainLevelExp(amount) {
    if (player.level >= MAX_PLAYER_LEVEL || !(amount > 0)) return;
    player.levelExp += amount;

    let startLevel = player.level;
    let need = getLevelExpNeeded(player.level);
    while (player.levelExp >= need && player.level < MAX_PLAYER_LEVEL) {
        player.levelExp -= need;
        player.level++;
        need = getLevelExpNeeded(player.level);
    }
    if (player.level >= MAX_PLAYER_LEVEL) player.levelExp = 0;

    let gained = player.level - startLevel;
    if (gained > 0) {
        let statGain = gained * LEVEL_UP_STAT_GAIN;
        player.stats.str += statGain;
        player.stats.con += statGain;
        player.stats.int += statGain;
        player.stats.spr += statGain;
        addLog(`🆙 人物等級提升至【Lv.${player.level}】${gained > 1 ? `（連升 ${gained} 級）` : ''}！四維各 +${statGain}，生命上限 +${gained * LEVEL_UP_HP_GAIN}，靈力上限 +${gained * LEVEL_UP_MP_GAIN}。`, "level-up");
    }
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
    gainRealmLifespan();
}

function triggerReincarnate() {
    if (player.realmIndex < 10) {
        alert("境界未達【仙人初境】，無法進行轉世輪迴！");
        return;
    }

    if (confirm("轉世輪迴將重置境界，壽元也會回到凡人的 60 年（人物等級保留），但會永久增加輪迴次數並提升天賦！是否確定輪迴？")) {
        player.reincarnations++;
        player.realmIndex = 0;
        player.stage = 1;
        player.exp = 0;
        player.pendingTribulation = false;
        player.lifespan = lifespanByRealm[0].gain;
        player.stats = { str: 10 + player.reincarnations * 50, con: 10 + player.reincarnations * 50, int: 10 + player.reincarnations * 50, spr: 10 + player.reincarnations * 50, cha: 10 + player.reincarnations * 10 };
        player.studyCounts = { str: 0, con: 0, int: 0, spr: 0 };
        player.hp = getMaxHp();
        player.mp = getMaxMp();
        addLog(`🌀 成功轉世輪迴！第 ${player.reincarnations} 次輪迴，基礎屬性獲得極大幅度提升！`, "reincarnate");
        updateUI();
    }
}
