// 每秒戰鬥 tick：安全區打坐、野外遭遇/戰鬥結算、自動補血補魔、僕從救援判定

function combatTick() {
    if (potionCooldownHp > 0) potionCooldownHp--;
    if (potionCooldownMp > 0) potionCooldownMp--;

    if (player.hp <= 0) return;

    if (player.buffTimer > 0) player.buffTimer--;

    // 渡劫期間由 tribulation.js 接管戰鬥，暫停掛機與任務流程
    if (inTribulation) {
        tribulationTick();
        return;
    }

    checkAutoHealAndMana();

    if (player.activeQuest && (player.currentMap.name === '演武學宮' || (player.assignedServantIds && player.assignedServantIds.length > 0))) {
        let speedMult = 1.0;
        if (player.assignedServantIds && player.assignedServantIds.length > 0) {
            speedMult = player.assignedServantIds.reduce((acc, id) => {
                let s = player.servants.find(serv => serv.id === id);
                return acc * (s ? s.mult : 1.0);
            }, 1.0);
        }

        player.questTimer += 1.5 * speedMult;
        if (player.questTimer >= 30) {
            player.questTimer -= 30;
            let tier = getSectTier();
            let servantText = (player.assignedServantIds && player.assignedServantIds.length > 0) ? ` (${player.assignedServantIds.length}名僕從代為完成)` : "";

            if (player.activeQuest === 'clean') {
                if (tier === 1) { player.coins += 5; addLog(`🧹 任務完成【打掃清潔】${servantText}：獲得 5 靈石`, "quest"); }
                else if (tier === 2) { player.coins += 50; player.beastCore += 10; addLog(`🥩 任務完成【餵養靈獸】${servantText}：獲得 50 靈石, 10 獸丹`, "quest"); }
                else if (tier === 3) { player.coins += 100; player.beastCore += 50; addLog(`🐉 任務完成【餵養仙獸】${servantText}：獲得 100 靈石, 50 獸丹`, "quest"); }
            } else if (player.activeQuest === 'plant') {
                if (tier === 1) { player.coins += 5; player.spiritGrass += 1; addLog(`🌱 任務完成【種植靈草】${servantText}：獲得 5 靈石, 1 靈草`, "quest"); }
                else if (tier === 2) { player.coins += 50; player.spiritGrass += 10; addLog(`🌱 任務完成【種植靈草】${servantText}：獲得 50 靈石, 10 靈草`, "quest"); }
                else if (tier === 3) { player.coins += 100; player.spiritGrass += 50; addLog(`🌱 任務完成【種植靈草】${servantText}：獲得 100 靈石, 50 靈草`, "quest"); }
            } else if (player.activeQuest === 'book') {
                if (tier === 1) { player.coins += 5; player.martialPoints += 1; addLog(`📚 任務完成【整理武學秘典】${servantText}：獲得 5 靈石, 1 武學積分`, "quest"); }
                else if (tier === 2) { player.coins += 50; player.martialPoints += 10; addLog(`📚 任務完成【整理武學秘典】${servantText}：獲得 50 靈石, 10 武學積分`, "quest"); }
                else if (tier === 3) { player.coins += 100; player.martialPoints += 50; addLog(`📚 任務完成【整理武學秘典】${servantText}：獲得 100 靈石, 50 武學積分`, "quest"); }
            }
            updateUI();
        }
    }

    if (player.currentMapIsSafe) {
        let wuxing = getWuxingBuff();
        let healRate = 0.1;
        if (wuxing.type === "木") healRate *= 1.2;

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
            enemies.push({ hp: enemyBasePower * 10, maxHp: enemyBasePower * 10, attack: enemyBasePower, icon: randomIcon });
        }
        document.getElementById('combat-status').innerText = `⚔️ 遭遇 ${count} 隻妖獸！戰鬥中！`;
        document.getElementById('combat-status').style.color = '#f87171';
        addLog(`⚠️ 遭遇 ${count} 隻強大的妖獸/禁區強者攔路！`, "combat");
        updateCombatVisualPanel();
    } else {
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

                if (skill.type === "aoe") {
                    addLog(skill.msg + ` (消耗 ${skill.mpCost} MP)`, "skill");
                    enemies.forEach(e => e.hp -= skillDmg);
                } else if (skill.type === "heal") {
                    let healAmt = player.maxHp * skill.mult;
                    player.hp = Math.min(player.maxHp, player.hp + healAmt);
                    addLog(skill.msg + ` (消耗 ${skill.mpCost} MP)`, "heal");
                } else if (skill.type === "buff") {
                    player.buffTimer = skill.duration;
                    player.buffMult = skill.mult;
                    addLog(skill.msg + ` (消耗 ${skill.mpCost} MP)`, "skill");
                } else {
                    addLog(skill.msg + ` (消耗 ${skill.mpCost} MP)`, "skill");
                    enemies[0].hp -= skillDmg;
                }
            } else {
                addLog(`💦 靈力不足 (需 ${skill.mpCost} MP)，無法施展【${skill.name}】，改以普通攻擊迎敵！`, "skill");
            }
        }

        if (!usedSkill) {
            enemies[0].hp -= getPhysAttack();
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
            let totalDmg = 0;
            enemies.forEach(e => totalDmg += e.attack);
            player.hp -= totalDmg;

            if (player.hp <= 0) {
                player.hp = 1;
                enemies = [];
                respawnTimer = 0;
                let lostCoins = Math.floor(player.coins * 0.1);
                player.coins -= lostCoins;
                addLog(`💀 寡不敵眾，身受重傷！被路過修士救回宗門，遺失了 ${lostCoins} 靈石... (當前氣血：1 滴殘血，開始靜修療傷)`, "combat");
                changeMap(0, 0);
            }
        }
        updateUI();
    }
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
                addLog(`⚡ [自動補血] 服用背包中的【${bagItem.name}】，氣血回復 ${Math.round(bagItem.amount * 100)}%！`, "heal");
            } else {
                let buyItem = shopItems
                    .filter(s => s.type === 'heal' && !s.noAutoBuy && player.coins >= s.cost)
                    .sort((a, b) => b.amount - a.amount)[0];
                if (buyItem) {
                    player.coins -= buyItem.cost;
                    player.hp = Math.min(player.maxHp, player.hp + player.maxHp * buyItem.amount);
                    potionCooldownHp = POTION_COOLDOWN_SECONDS;
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
                addLog(`✨ [自動補魔] 服用背包中的【${bagItem.name}】，靈力回復 ${Math.round(bagItem.amount * 100)}%！`, "skill");
            } else {
                let buyItem = shopItems
                    .filter(s => s.type === 'mp' && !s.noAutoBuy && player.coins >= s.cost)
                    .sort((a, b) => b.amount - a.amount)[0];
                if (buyItem) {
                    player.coins -= buyItem.cost;
                    player.mp = Math.min(player.maxMp, player.mp + player.maxMp * buyItem.amount);
                    potionCooldownMp = POTION_COOLDOWN_SECONDS;
                    addLog(`✨ [自動補魔] 自動購買並服下【${buyItem.name}】，靈力回復 ${Math.round(buyItem.amount * 100)}%！`, "skill");
                }
            }
        }
    }
}

// 野外擊殺後機率觸發拯救僕從（魅力提升史詩/傳說機率）
function tryRescueServant() {
    if (Math.random() < 0.05) {
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
            id: Date.now() + "_" + Math.floor(Math.random() * 1000),
            name: sName,
            quality: selectedQuality.name,
            mult: selectedQuality.mult
        };

        player.servants.push(newServant);
        addLog(`🆘 在野外歷練時，憑藉高超氣質與魅力拯救了一名受困修士【${newServant.name}】！品質：<span class="quality-${newServant.quality}">${newServant.quality}</span> (任務速度 x${newServant.mult})！`, "servant");
    }
}
