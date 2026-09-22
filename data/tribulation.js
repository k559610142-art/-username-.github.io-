// 渡劫：小境界滿 10 階後，擊敗心魔才能晉升下一個大境界
// 勝敗由開打前的「勝算」擲骰決定（基礎 60%，丹藥與宗門技能最多各 +10%，上限 80%），
// 戰鬥過程照常進行；若戰況與天命相反，會在關鍵一刻以「絕處逢生／心魔反噬」收尾。
// 數值見 config-tribulation.js

// 計算目前的渡劫勝算與各項加成（渡劫按鈕與確認視窗共用）
function getTribulationChance() {
    // 丹藥：必須開啟自動補血才會在渡劫中服用，否則不計
    let healStock = 0;
    if (player.autoHp.enabled) {
        shopItems.filter(s => s.type === 'heal').forEach(s => { healStock += s.amount * (player.bag[s.id] || 0); });
    }
    let potion = TRIBULATION_POTION_BONUS * Math.min(1, healStock / TRIBULATION_POTION_FULL_STOCK);

    // 技能：目前境界已開放的宗門階段中，已學會的比例
    let openTiers = sectData.filter(cat => player.realmIndex >= cat.minRealm).map(cat => cat.tier);
    let learnedTiers = openTiers.filter(t => player.sectSkills && player.sectSkills[t]);
    let skill = openTiers.length > 0 ? TRIBULATION_SKILL_BONUS * learnedTiers.length / openTiers.length : 0;

    let total = Math.min(TRIBULATION_MAX_CHANCE, TRIBULATION_BASE_CHANCE + potion + skill);
    return { total, base: TRIBULATION_BASE_CHANCE, potion, skill, openTiers: openTiers.length, learnedTiers: learnedTiers.length };
}

function formatChance(rate) { return `${Math.round(rate * 100)}%`; }

function triggerTribulation() {
    if (!player.pendingTribulation) {
        alert("目前修為尚未圓滿，無需渡劫。\n（小境界修練至 10 階且經驗滿格時，才會引來天劫）");
        return;
    }
    if (inTribulation) return;

    let demonPower = Math.floor(getPhysAttack() * HEART_DEMON_POWER_MULT);
    let demonHp = Math.floor(getMaxHp() * HEART_DEMON_HP_MULT);
    let chance = getTribulationChance();

    let tips = "";
    if (!player.autoHp.enabled) tips += "\n・開啟【自動補血】並備妥氣血丹藥，最多可再 +10%";
    else if (chance.potion < TRIBULATION_POTION_BONUS) tips += `\n・再多備氣血丹藥（約 10 顆九轉還魂丹即可拿滿），最多可再 +${formatChance(TRIBULATION_POTION_BONUS - chance.potion)}`;
    if (chance.skill < TRIBULATION_SKILL_BONUS) tips += `\n・拜入目前可加入的宗門學得技能，最多可再 +${formatChance(TRIBULATION_SKILL_BONUS - chance.skill)}`;

    if (!confirm(
        `即將渡劫，晉升【${realms[player.realmIndex + 1]}】！\n\n`
        + `【渡劫勝算：${formatChance(chance.total)}】（上限 ${formatChance(TRIBULATION_MAX_CHANCE)}）\n`
        + `・基礎 ${formatChance(chance.base)}\n`
        + `・丹藥準備 +${formatChance(chance.potion)}\n`
        + `・宗門技能 +${formatChance(chance.skill)}（已學 ${chance.learnedTiers} / ${chance.openTiers} 階）\n`
        + (tips ? `\n提升勝算：${tips}\n` : '')
        + `\n心魔戰力 ${demonPower.toLocaleString()}／氣血 ${demonHp.toLocaleString()}，會施展魔功並吸取靈力。\n`
        + `渡劫失敗會重傷跌回安全區並折壽 ${getDeathLifespanCost()} 年（剩餘 ${formatLifespan(player.lifespan)} 年，渡劫期間歲月流逝加快），靈寵也會陣亡。\n\n是否開始渡劫？`
    )) return;

    enemies = [];
    respawnTimer = 0;
    inTribulation = true;
    tribulationFatedWin = Math.random() < chance.total;

    heartDemon = {
        name: "心魔",
        icon: HEART_DEMON_ICON,
        attack: demonPower,
        maxHp: demonHp,
        hp: demonHp,
        buffTimer: 0,
        buffMult: 1,
        attrs: getPlayerCombatAttrs(),   // 鏡像：與玩家相同的減傷/閃避/屬性傷害/五行（同五行不相剋）
        status: newStatus()
    };
    playerStatus = newStatus();

    addLog(`☯️ 【渡劫開始】天地變色，心魔自你識海中走出，化作與你一模一樣的魔身！（勝算 ${formatChance(chance.total)}｜戰力 ${demonPower.toLocaleString()}／氣血 ${demonHp.toLocaleString()}）`, "reincarnate");
    document.getElementById('combat-status').innerText = `☯️ 渡劫中：與心魔生死對決！`;
    document.getElementById('combat-status').style.color = 'var(--reincarnate-color)';
    updateUI();
}

// 由 combatTick() 每秒呼叫（渡劫期間會接管整個戰鬥流程）
function tribulationTick() {
    if (!heartDemon) { inTribulation = false; return; }

    checkAutoHealAndMana();

    // ---- 玩家回合：自身持續傷害 → 凍結判定 → 出手（與野外相同，範圍技也只打心魔）----
    let selfTick = tickStatus(playerStatus);
    if (selfTick.dot > 0) {
        player.hp -= selfTick.dot;
        addLog(`🩸 身上的異常狀態發作，損失 ${selfTick.dot.toLocaleString()} 點氣血！`, "combat");
        if (player.hp <= 0) { resolvePlayerFall(); return; }
    }

    let tags = [];
    if (selfTick.frozen) addLog(`❄️ 你被心魔凍結，本回合無法行動！`, "combat");
    else playerAttackTurn(getAllSkills(), [heartDemon], tags);

    // 靈寵協助（渡劫為一對一，群體技能也只打在心魔身上）
    petAssistTick([heartDemon]);

    // 心魔身上的燒傷/中毒發作
    let demonTick = tickStatus(heartDemon.status);
    heartDemon.hp -= demonTick.dot;
    if (tags.length > 0 || demonTick.dot > 0) {
        addLog(`✨ 屬性效果：${[tags.length ? summarizeTags(tags, "💨被心魔閃避") : '', demonTick.dot ? `心魔受持續傷害 ${demonTick.dot.toLocaleString()}` : ''].filter(Boolean).join("｜")}`, "skill");
    }

    if (heartDemon.hp <= 0) {
        if (!tribulationFatedWin) {
            addLog(`🧍 心魔即將潰散之際，你心神一時失守，被心魔抓住破綻反噬！`, "combat");
            endTribulation(false);
            return;
        }
        endTribulation(true);
        return;
    }

    // ---- 心魔回合（被凍結則跳過）----
    if (demonTick.frozen) {
        addLog(`❄️ 心魔被凍結，本回合無法出手！`, "skill");
        updateUI();
        return;
    }
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

    // 心魔是你的鏡像，帶有與你相同的減傷/閃避/屬性傷害
    let r = resolveHit(demonDmg, { attrs: heartDemon.attrs, power: heartDemon.attack }, { attrs: getPlayerCombatAttrs(), status: playerStatus });
    if (r.tags.length > 0) addLog(`🧍 心魔攻勢：${summarizeTags(r.tags, "💨你閃避了")}`, "combat");
    player.hp -= applyPetDamageReduction(r.dmg);

    if (player.hp <= 0) { resolvePlayerFall(); return; }

    updateUI();
}

// 玩家氣血歸零：依天命判定「絕處逢生」或「渡劫失敗」
function resolvePlayerFall() {
    if (tribulationFatedWin) {
        player.hp = 1;
        addLog(`⚡ 生死一線，你道心通明、絕處逢生，斬出最後一劍將心魔劈散！`, "level-up");
        endTribulation(true);
        return;
    }
    endTribulation(false);
}

function endTribulation(success) {
    inTribulation = false;
    heartDemon = null;
    playerStatus = newStatus();

    if (success) {
        player.pendingTribulation = false;
        player.tribulationCount = (player.tribulationCount || 0) + 1;
        addLog(`☯️ 【渡劫成功】心魔潰散，你斬去心中執念，天劫已渡！（累計渡劫 ${player.tribulationCount} 次）`, "reincarnate");
        advanceRealm();
        refreshCombatStatusText();
        updateUI();
    } else {
        // 渡劫失敗視同死亡：折壽並使靈寵陣亡，壽元耗盡則遊戲結束
        if (handlePlayerDeath()) return;
        player.hp = 1;
        let lostCoins = Math.floor(player.coins * TRIBULATION_FAIL_COIN_LOSS);
        player.coins -= lostCoins;
        addLog(`💀 【渡劫失敗】心魔反噬，你身受重傷跌落凡塵，遺失了 ${lostCoins.toLocaleString()} 靈石。療傷後可再次挑戰天劫！`, "combat");
        changeMap(0, 0);
        updateUI();
    }
}
