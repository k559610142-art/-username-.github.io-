// 每秒戰鬥 tick：安全區打坐、野外遭遇/戰鬥結算、自動補血補魔、僕從救援判定

function combatTick() {
    if (potionCooldownHp > 0) potionCooldownHp--;
    if (potionCooldownMp > 0) potionCooldownMp--;

    if (gameOver || player.hp <= 0) return;

    // 歲月流逝：每秒依所在地危險度消耗壽元（觸及底線後停止，見 lifespan.js）
    ageLifespan(1);

    if (player.buffTimer > 0) player.buffTimer--;

    // 渡劫期間由 tribulation.js 接管戰鬥，暫停掛機與任務流程
    if (inTribulation) {
        tribulationTick();
        return;
    }

    checkAutoHealAndMana();

    // 玩家親自執行的門派任務：必須待在宗門
    if (player.activeQuest && isInSect()) {
        player.questTimer += QUEST_PROGRESS_PER_TICK;
        if (player.questTimer >= QUEST_REQUIRED_PROGRESS) {
            player.questTimer -= QUEST_REQUIRED_PROGRESS;
            let def = getQuestDef(player.activeQuest, getSectTier());
            if (def) {
                grantQuestRewards(def);
                addDailyProgress('sectQuest');
                addLog(`${def.icon} 任務完成【${def.name}】：獲得 ${formatQuestRewards(def)}`, "quest");
            }
            updateUI();
        }
    }

    // 僕從各自執行被指派的任務（不受玩家所在地點限制）
    tickServantQuests();

    if (player.currentMapIsSafe) {
        playerStatus = newStatus();   // 回到安全區即解除凍結、燒傷、中毒
        let healRate = 0.1 * getRootBonus().healMult;

        if (player.hp < player.maxHp) player.hp = Math.min(player.maxHp, player.hp + player.maxHp * healRate);
        if (player.mp < player.maxMp) player.mp = Math.min(player.maxMp, player.mp + player.maxMp * 0.1);

        safeZoneTimer++;
        if (safeZoneTimer >= 5) {
            safeZoneTimer = 0;
            let expEarned = gainExp(player.currentMap.expRate * 50) || 0;
            if (player.pendingTribulation && expEarned === 0) {
                addLog(`🧘‍♂️ 打坐調息中…但修為已然圓滿，唯有渡劫方能更進一步。`);
            } else {
                addLog(`🧘‍♂️ 於安全區打坐 5 秒，吸收天地靈氣，獲得 ${Math.floor(expEarned)} 點經驗。`);
            }
        }
        updateUI();
        return;
    }

    if (enemies.length === 0) {
        if (respawnTimer > 0) {
            document.getElementById('combat-status').innerText = `⏳ 擊殺完畢，等待怪物刷新中... (${respawnTimer}秒)`;
            document.getElementById('combat-status').style.color = '#fb923c';
            respawnTimer--;
            updateCombatVisualPanel();
            return;
        }

        let count = Math.floor(Math.random() * 5) + 1;
        let enemyBasePower = player.currentMap.diff * 50;
        for (let i = 0; i < count; i++) {
            let randomIcon = monsterIcons[Math.floor(Math.random() * monsterIcons.length)];
            enemies.push({ hp: enemyBasePower * 10, maxHp: enemyBasePower * 10, attack: enemyBasePower, icon: randomIcon,
                           attrs: rollMonsterAttrs(), status: newStatus() });
        }
        document.getElementById('combat-status').innerText = `⚔️ 遭遇 ${count} 隻妖獸！戰鬥中！`;
        document.getElementById('combat-status').style.color = '#f87171';
        addLog(`⚠️ 遭遇 ${count} 隻強大的妖獸/禁區強者攔路！`, "combat");
        updateCombatVisualPanel();
    } else {
        // ---- 玩家回合：先結算自身的燒傷/中毒，被凍結則本回合無法出手 ----
        let selfTick = tickStatus(playerStatus);
        if (selfTick.dot > 0) {
            player.hp -= selfTick.dot;
            addLog(`🩸 身上的${formatStatus(playerStatus) || '異常狀態'}發作，損失 ${selfTick.dot.toLocaleString()} 點氣血！`, "combat");
            if (player.hp <= 0) { onPlayerKilledInField(); return; }
        }

        let playerTags = [];
        if (selfTick.frozen) {
            addLog(`❄️ 你被凍結，本回合無法行動！`, "combat");
        } else {
            playerAttackTurn(getAllSkills(), enemies, playerTags);
        }

        // 存活的靈寵各自判定是否出手協助
        petAssistTick(enemies);

        // ---- 怪物身上的燒傷/中毒發作，並記錄誰被凍結 ----
        let dotTotal = 0;
        enemies.forEach(e => {
            if (e.hp <= 0) return;
            let t = tickStatus(e.status);
            e.hp -= t.dot;
            dotTotal += t.dot;
            e.skipTurn = t.frozen;
        });
        let regen = applyRootRegen();
        if (playerTags.length > 0 || dotTotal > 0 || regen > 0) {
            let parts = [];
            if (playerTags.length > 0) parts.push(summarizeTags(playerTags, "💨被閃避"));
            if (dotTotal > 0) parts.push(`持續傷害 ${dotTotal.toLocaleString()}`);
            if (regen > 0) parts.push(`🌿靈根回復 ${regen.toLocaleString()}`);
            addLog(`✨ 屬性效果：${parts.join("｜")}`, "skill");
        }

        let expEarned = 0;
        let coinsEarned = 0;
        let killedCount = 0;

        enemies = enemies.filter(e => {
            if (e.hp <= 0) {
                expEarned += player.currentMap.expRate * 15;
                coinsEarned += player.currentMap.diff * (Math.floor(Math.random() * 5) + 8);
                killedCount++;
                return false;
            }
            return true;
        });

        if (expEarned > 0) {
            let gainedExp = gainExp(expEarned) || 0;
            player.coins += coinsEarned;
            player.reputation = (player.reputation || 0) + killedCount;
            addDailyProgress('kill', killedCount);
            let expText = (player.pendingTribulation && gainedExp === 0) ? "修為已滿(待渡劫)" : `${Math.floor(gainedExp)} 經驗`;
            addLog(`斬殺敵手，獲得 ${expText}, ${coinsEarned} 靈石 與 ${killedCount} 點聲望！`, "combat");
            for(let k = 0; k < killedCount; k++) {
                tryRescueServant();
            }
        }

        if (enemies.length === 0) {
            respawnTimer = 5;
            document.getElementById('combat-status').innerText = `⚔️ 敵方全滅！5秒後刷新下一波怪物...`;
            document.getElementById('combat-status').style.color = '#fb923c';
        } else {
            // ---- 怪物回合：每隻各自命中判定（玩家的閃避/減傷生效，怪物的屬性傷害可施加在玩家身上）----
            let playerDef = { attrs: getPlayerCombatAttrs(), status: playerStatus };
            let totalDmg = 0;
            let enemyTags = [];
            let frozenCount = 0;
            enemies.forEach(e => {
                if (e.skipTurn) { frozenCount++; return; }
                let r = resolveHit(e.attack, { attrs: e.attrs || {}, power: e.attack }, playerDef);
                totalDmg += r.dmg;
                enemyTags = enemyTags.concat(r.tags);
            });
            player.hp -= applyPetDamageReduction(totalDmg);
            if (enemyTags.length > 0 || frozenCount > 0) {
                let parts = [];
                if (frozenCount > 0) parts.push(`${frozenCount} 隻妖獸被凍結無法出手`);
                if (enemyTags.length > 0) parts.push(`妖獸攻勢：${summarizeTags(enemyTags, "💨你閃避了")}`);
                addLog(`⚠️ ${parts.join("｜")}`, "combat");
            }

            if (player.hp <= 0) { onPlayerKilledInField(); return; }
        }
        updateUI();
    }
}

// 木系靈根（生／榮）的每回合回復：野外與渡劫共用，回傳實際回復量
function applyRootRegen() {
    let rate = getRootBonus().regen;
    if (rate <= 0 || player.hp <= 0 || player.hp >= player.maxHp) return 0;
    let heal = Math.min(player.maxHp - player.hp, player.maxHp * rate);
    player.hp += heal;
    return Math.floor(heal);
}

// 玩家本回合出手（普攻或技能）；每一擊都經過 resolveHit()，觸發的效果標籤推進 tags
function playerAttackTurn(availableSkills, targets, tags) {
    let usedSkill = false;
    let baseAttrs = getPlayerCombatAttrs();
    let hitTarget = (target, dmg, attrs) => {
        let r = resolveHit(dmg, { attrs, power: getPhysAttack() }, { attrs: target.attrs || {}, status: target.status || newStatus() });
        target.hp -= r.dmg;
        r.tags.forEach(t => tags.push(t));
    };

    if (availableSkills.length > 0 && Math.random() < 0.4) {
        let skill = availableSkills[Math.floor(Math.random() * availableSkills.length)];
        if (player.mp >= skill.mpCost) {
            player.mp -= skill.mpCost;
            usedSkill = true;

            let skillDmg = (skill.dmgType === 'mag' ? getMagAttack() * skill.mult : getPhysAttack() * skill.mult)
                * getRootBonus().skillMult;
            let attrs = withSkillEffect(baseAttrs, skill);

            if (skill.type === "aoe") {
                addLog(skill.msg + ` (消耗 ${skill.mpCost} MP)`, "skill");
                targets.forEach(e => hitTarget(e, skillDmg, attrs));
            } else if (skill.type === "heal") {
                player.hp = Math.min(player.maxHp, player.hp + player.maxHp * skill.mult);
                addLog(skill.msg + ` (消耗 ${skill.mpCost} MP)`, "heal");
            } else if (skill.type === "buff") {
                player.buffTimer = skill.duration;
                player.buffMult = skill.mult;
                addLog(skill.msg + ` (消耗 ${skill.mpCost} MP)`, "skill");
            } else {
                addLog(skill.msg + ` (消耗 ${skill.mpCost} MP)`, "skill");
                hitTarget(targets[0], skillDmg, attrs);
            }
        } else {
            addLog(`💦 靈力不足 (需 ${skill.mpCost} MP)，無法施展【${skill.name}】，改以普通攻擊迎敵！`, "skill");
        }
    }

    if (!usedSkill) hitTarget(targets[0], getPhysAttack(), baseAttrs);
}

// 野外戰死：折壽、靈寵陣亡、損失靈石並被送回宗門
function onPlayerKilledInField() {
    playerStatus = newStatus();
    if (handlePlayerDeath()) return;
    player.hp = 1;
    enemies = [];
    respawnTimer = 0;
    let lostCoins = Math.floor(player.coins * 0.1);
    player.coins -= lostCoins;
    addLog(`💀 寡不敵眾，身受重傷！被路過修士救回宗門，遺失了 ${lostCoins} 靈石... (當前氣血：1 滴殘血，開始靜修療傷)`, "combat");
    changeMap(0, 0);
    updateUI();
}

// 自動補血/補魔：優先消耗背包藥品（由高階往低階），背包沒有才以靈石自動購買。
// 受 POTION_COOLDOWN_SECONDS 冷卻限制；標記 noAutoBuy 的丹藥永遠不會被自動購買（但可手動買來讓自動服用）。
function checkAutoHealAndMana() {
    if (player.hp <= 0) return;

    if (player.autoHp.enabled && potionCooldownHp <= 0) {
        let hpPercent = (player.hp / player.maxHp) * 100;
        if (hpPercent <= player.autoHp.threshold && player.hp < player.maxHp) {
            let bagItem = shopItems
                .filter(s => s.type === 'heal' && player.bag[s.id] > 0)
                .sort((a, b) => b.amount - a.amount)[0];

            if (bagItem) {
                player.bag[bagItem.id]--;
                if (player.bag[bagItem.id] <= 0) delete player.bag[bagItem.id];
                player.hp = Math.min(player.maxHp, player.hp + player.maxHp * bagItem.amount);
                potionCooldownHp = POTION_COOLDOWN_SECONDS;
                addDailyProgress('potion');
                addLog(`⚡ [自動補血] 服用背包中的【${bagItem.name}】，氣血回復 ${Math.round(bagItem.amount * 100)}%！`, "heal");
            } else {
                let buyItem = shopItems
                    .filter(s => s.type === 'heal' && !s.noAutoBuy && player.coins >= s.cost)
                    .sort((a, b) => b.amount - a.amount)[0];
                if (buyItem) {
                    player.coins -= buyItem.cost;
                    player.hp = Math.min(player.maxHp, player.hp + player.maxHp * buyItem.amount);
                    potionCooldownHp = POTION_COOLDOWN_SECONDS;
                addDailyProgress('potion');
                    addLog(`⚡ [自動補血] 自動購買並服下【${buyItem.name}】，氣血回復 ${Math.round(buyItem.amount * 100)}%！`, "heal");
                }
            }
        }
    }

    if (player.autoMp.enabled && potionCooldownMp <= 0) {
        let mpPercent = (player.mp / player.maxMp) * 100;
        if (mpPercent <= player.autoMp.threshold && player.mp < player.maxMp) {
            let bagItem = shopItems
                .filter(s => s.type === 'mp' && player.bag[s.id] > 0)
                .sort((a, b) => b.amount - a.amount)[0];

            if (bagItem) {
                player.bag[bagItem.id]--;
                if (player.bag[bagItem.id] <= 0) delete player.bag[bagItem.id];
                player.mp = Math.min(player.maxMp, player.mp + player.maxMp * bagItem.amount);
                potionCooldownMp = POTION_COOLDOWN_SECONDS;
                addDailyProgress('potion');
                addLog(`✨ [自動補魔] 服用背包中的【${bagItem.name}】，靈力回復 ${Math.round(bagItem.amount * 100)}%！`, "skill");
            } else {
                let buyItem = shopItems
                    .filter(s => s.type === 'mp' && !s.noAutoBuy && player.coins >= s.cost)
                    .sort((a, b) => b.amount - a.amount)[0];
                if (buyItem) {
                    player.coins -= buyItem.cost;
                    player.mp = Math.min(player.maxMp, player.mp + player.maxMp * buyItem.amount);
                    potionCooldownMp = POTION_COOLDOWN_SECONDS;
                addDailyProgress('potion');
                    addLog(`✨ [自動補魔] 自動購買並服下【${buyItem.name}】，靈力回復 ${Math.round(buyItem.amount * 100)}%！`, "skill");
                }
            }
        }
    }
}

// 野外擊殺後機率觸發拯救僕從（魅力提升史詩/傳說機率）；回傳是否真的救出
function tryRescueServant() {
    if (Math.random() < 0.05) {
        if (player.servants.length >= MAX_SERVANTS) {
            addLog(`🆘 遇見一名受困修士，但僕從小屋已滿（${MAX_SERVANTS} 名），只能目送其離去…`, "servant");
            return false;
        }
        let totalCha = player.stats.cha + getEquipBonus().cha;
        let epicBonus = Math.min(totalCha * 0.0005, 0.05);
        let legendBonus = Math.min(totalCha * 0.0001, 0.01);

        let adjustedQualities = servantQualities.map(q => {
            let copy = { ...q };
            if (q.name === "史詩") copy.weight += epicBonus;
            if (q.name === "傳說") copy.weight += legendBonus;
            return copy;
        });

        let totalWeight = adjustedQualities.reduce((acc, cur) => acc + cur.weight, 0);
        let rand = Math.random() * totalWeight;
        let cumWeight = 0;
        let selectedQuality = adjustedQualities[0];

        for (let q of adjustedQualities) {
            cumWeight += q.weight;
            if (rand <= cumWeight) {
                selectedQuality = q;
                break;
            }
        }

        let sName = servantNames[Math.floor(Math.random() * servantNames.length)] + " (僕從)";
        let newServant = {
            // 離線結算會在同一毫秒內救出多名僕從，隨機段需夠長以免 id 重複（重複會導致解僱時連帶刪掉別人）
            id: Date.now() + "_" + Math.random().toString(36).slice(2, 10),
            name: sName,
            quality: selectedQuality.name,
            mult: selectedQuality.mult,
            quest: null,    // 負責的任務代號，於僕從小屋指派
            timer: 0        // 該僕從自身的任務進度
        };

        player.servants.push(newServant);
        addDailyProgress('rescue');
        addLog(`🆘 在野外歷練時，憑藉高超氣質與魅力拯救了一名受困修士【${newServant.name}】！品質：<span class="quality-${newServant.quality}">${newServant.quality}</span> (任務速度 x${newServant.mult})！`, "servant");
        return true;
    }
    return false;
}
