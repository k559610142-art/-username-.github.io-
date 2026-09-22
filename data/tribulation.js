// 渡劫：小境界滿 10 階後，擊敗心魔才能晉升下一個大境界
// 心魔擁有玩家 150% 的戰力與氣血，並會施展魔功（見 config-tribulation.js）

function triggerTribulation() {
    if (!player.pendingTribulation) {
        alert("目前修為尚未圓滿，無需渡劫。\n（小境界修練至 10 階且經驗滿格時，才會引來天劫）");
        return;
    }
    if (inTribulation) return;

    let demonPower = Math.floor(getPhysAttack() * HEART_DEMON_POWER_MULT);
    let demonHp = Math.floor(getMaxHp() * HEART_DEMON_HP_MULT);

    let warn = "";
    if (player.hp < player.maxHp) warn += "\n⚠️ 你目前氣血未滿，建議先回安全區療傷再渡劫！";
    if (!player.autoHp.enabled) warn += "\n⚠️ 尚未開啟【自動補血】，心魔攻勢兇猛，強烈建議先開啟！";

    if (!confirm(
        `即將渡劫，晉升【${realms[player.realmIndex + 1]}】！\n\n`
        + `心魔戰力：${demonPower.toLocaleString()}（你的 150%）\n`
        + `心魔氣血：${demonHp.toLocaleString()}（與你相同）\n`
        + `心魔為人形魔身，會施展魔功並吸取靈力。\n\n`
        + `建議先備妥丹藥並開啟自動補血；渡劫失敗只會重傷跌回安全區，可再次挑戰。${warn}\n\n是否開始渡劫？`
    )) return;

    enemies = [];
    respawnTimer = 0;
    inTribulation = true;

    heartDemon = {
        name: "心魔",
        icon: HEART_DEMON_ICON,
        attack: demonPower,
        maxHp: demonHp,
        hp: demonHp,
        buffTimer: 0,
        buffMult: 1
    };

    addLog(`☯️ 【渡劫開始】天地變色，心魔自你識海中走出，化作與你一模一樣的魔身！（戰力 ${demonPower.toLocaleString()}／氣血 ${demonHp.toLocaleString()}）`, "reincarnate");
    document.getElementById('combat-status').innerText = `☯️ 渡劫中：與心魔生死對決！`;
    document.getElementById('combat-status').style.color = 'var(--reincarnate-color)';
    updateUI();
}

// 由 combatTick() 每秒呼叫（渡劫期間會接管整個戰鬥流程）
function tribulationTick() {
    if (!heartDemon) { inTribulation = false; return; }

    checkAutoHealAndMana();

    // ---- 玩家出手：與一般戰鬥相同的技能判定 ----
    let usedSkill = false;
    let availableSkills = [];
    if (player.sect && player.sect.skills) availableSkills = availableSkills.concat(player.sect.skills);
    if (player.learnedSkills) availableSkills = availableSkills.concat(player.learnedSkills);

    if (availableSkills.length > 0 && Math.random() < 0.4) {
        let skill = availableSkills[Math.floor(Math.random() * availableSkills.length)];
        if (player.mp >= skill.mpCost) {
            player.mp -= skill.mpCost;
            usedSkill = true;

            let skillDmg = skill.dmgType === 'mag' ? getMagAttack() * skill.mult : getPhysAttack() * skill.mult;
            let wuxing = getWuxingBuff();
            if (wuxing.type === "金") skillDmg *= 1.2;

            if (skill.type === "heal") {
                player.hp = Math.min(player.maxHp, player.hp + player.maxHp * skill.mult);
                addLog(skill.msg + ` (消耗 ${skill.mpCost} MP)`, "heal");
            } else if (skill.type === "buff") {
                player.buffTimer = skill.duration;
                player.buffMult = skill.mult;
                addLog(skill.msg + ` (消耗 ${skill.mpCost} MP)`, "skill");
            } else {
                // 渡劫為一對一，範圍技與單體技同樣只打在心魔身上
                addLog(skill.msg + ` (消耗 ${skill.mpCost} MP)`, "skill");
                heartDemon.hp -= skillDmg;
            }
        } else {
            addLog(`💦 靈力不足 (需 ${skill.mpCost} MP)，無法施展【${skill.name}】，改以普通攻擊迎敵！`, "skill");
        }
    }

    if (!usedSkill) {
        heartDemon.hp -= getPhysAttack();
    }

    if (heartDemon.hp <= 0) {
        endTribulation(true);
        return;
    }

    // ---- 心魔出手 ----
    if (heartDemon.buffTimer > 0) heartDemon.buffTimer--;
    let demonBase = heartDemon.attack * (heartDemon.buffTimer > 0 ? heartDemon.buffMult : 1);
    let demonDmg = demonBase;

    if (Math.random() < HEART_DEMON_SKILL_CHANCE) {
        let sk = heartDemonSkills[Math.floor(Math.random() * heartDemonSkills.length)];
        if (sk.type === "buff") {
            heartDemon.buffTimer = sk.duration;
            heartDemon.buffMult = sk.mult;
            addLog(`🧍 ${sk.msg}`, "combat");
        } else if (sk.type === "drain") {
            let drained = Math.min(player.mp, player.maxMp * sk.drain);
            player.mp -= drained;
            demonDmg = demonBase * sk.mult;
            addLog(`🧍 ${sk.msg}（靈力 -${Math.floor(drained)}）`, "combat");
        } else {
            demonDmg = demonBase * sk.mult;
            addLog(`🧍 ${sk.msg}`, "combat");
        }
    }

    player.hp -= demonDmg;

    if (player.hp <= 0) {
        endTribulation(false);
        return;
    }

    updateUI();
}

function endTribulation(success) {
    inTribulation = false;
    heartDemon = null;

    if (success) {
        player.pendingTribulation = false;
        player.tribulationCount = (player.tribulationCount || 0) + 1;
        addLog(`☯️ 【渡劫成功】心魔潰散，你斬去心中執念，天劫已渡！（累計渡劫 ${player.tribulationCount} 次）`, "reincarnate");
        advanceRealm();
        refreshCombatStatusText();
        updateUI();
    } else {
        player.hp = 1;
        let lostCoins = Math.floor(player.coins * TRIBULATION_FAIL_COIN_LOSS);
        player.coins -= lostCoins;
        addLog(`💀 【渡劫失敗】心魔反噬，你身受重傷跌落凡塵，遺失了 ${lostCoins.toLocaleString()} 靈石。療傷後可再次挑戰天劫！`, "combat");
        changeMap(0, 0);
        updateUI();
    }
}
