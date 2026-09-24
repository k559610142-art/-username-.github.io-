// 懸賞榜與一對一對決（ARCHITECTURE.md 第 36 節），設定在 config-bounty.js
//   存檔：player.bountyBoard（當期 6 名）、bountyRefreshAt、bountyFaction（榜單列的是哪個陣營）、activeBountyId（已接取）、bountyKills
//   執行期（不存檔，state.js）：inBountyDuel、duelOpponent、duelWeakenTimer/duelWeakenMult、duelSilenceTimer、duelArmorTimer
// 流程：活動「獵殺邪修」→ 接取懸賞 → 野外每刷新一波有 BOUNTY_ENCOUNTER_CHANCE 機率遇上（combat.js 呼叫 tryStartBountyDuel）
//       → combatTick 由 bountyDuelTick 接管，直到一方倒下、對方遁走或玩家換地圖逃離

// ---- 懸賞人物的數值 ----
function getBountyRefSectMult(realmIndex) {
    let mult = BOUNTY_REF_SECT_MULT[0].mult;
    BOUNTY_REF_SECT_MULT.forEach(t => { if (realmIndex >= t.minRealm) mult = t.mult; });
    return mult;
}

// 攻擊力：同境界同階數、修為圓滿的修士基礎戰力（getBasePower 同曲線）× 該境界一般宗門倍率 × 天榜倍率 × 各榜比例
// 氣血：攻擊力 × 20（與玩家的氣血公式同比例）
function getBountyStats(entry) {
    let r = entry.realmIndex, s = entry.stage;
    let base = Math.pow(10, r) * 5 * s + (r === 0 ? 1 : 2 * Math.pow(10, r)) * s;
    let rank = BOUNTY_RANKS[entry.rank];
    let attack = Math.floor(base * getBountyRefSectMult(r) * BOUNTY_TIAN_MULT * rank.ratio);
    return { attack, hp: attack * 20 };
}

function getBountyNpc(entry) {
    return (bountyRoster[entry.faction] || []).find(n => n.id === entry.npcId) || null;
}

function getBountyIcon(entry) {
    let npc = getBountyNpc(entry);
    return (BOUNTY_ICONS[entry.faction] || BOUNTY_ICONS["邪"])[npc ? npc.gender : "male"];
}

// ---- 榜單刷新（每 BOUNTY_REFRESH_HOURS 小時；陣營改變時立即換成對應陣營的榜單）----
function refreshBountyIfDue(force) {
    let foe = getOpposingFaction(getPlayerFaction());
    let now = Date.now();
    let factionChanged = player.bountyFaction && player.bountyFaction !== foe;
    if (!force && !factionChanged && player.bountyRefreshAt && now < player.bountyRefreshAt
        && Array.isArray(player.bountyBoard) && player.bountyBoard.length > 0) {
        return false;
    }
    player.bountyBoard = rollBountyBoard(foe);
    player.bountyFaction = foe;
    player.activeBountyId = null;
    player.bountyRefreshAt = now + BOUNTY_REFRESH_HOURS * 3600 * 1000;
    addLog(factionChanged
        ? `📜 你的陣營已改變，懸賞榜改列 ${getFactionLabel(foe)} 人物！`
        : `📜 懸賞榜已更新，${player.bountyBoard.length} 名${getFactionLabel(foe)}人物上榜！`, "system");
    return true;
}

function rollBountyBoard(faction) {
    let pool = (bountyRoster[faction] || []).slice();
    let set = BOUNTY_SKILL_SETS[faction];
    let board = [];
    BOUNTY_RANK_ORDER.forEach(rank => {
        for (let i = 0; i < BOUNTY_RANKS[rank].count && pool.length > 0; i++) {
            let npc = pool.splice(Math.floor(Math.random() * pool.length), 1)[0];
            // 以「階」為單位偏移（1 境 = 10 階），落點換回大境界＋小境界
            let minStep = Math.round(BOUNTY_REALM_OFFSET_MIN * 10), maxStep = Math.round(BOUNTY_REALM_OFFSET_MAX * 10);
            let pos = player.realmIndex * 10 + (player.stage - 1) + minStep + Math.floor(Math.random() * (maxStep - minStep + 1));
            pos = Math.max(0, Math.min(realms.length * 10 - 1, pos));
            let extra = set.pool.slice().sort(() => Math.random() - 0.5).slice(0, 2);
            board.push({
                id: Date.now() + "_" + Math.random().toString(36).slice(2, 8),
                npcId: npc.id,
                faction,
                rank,
                realmIndex: Math.floor(pos / 10),
                stage: pos % 10 + 1,
                element: wuxingElements[Math.floor(Math.random() * wuxingElements.length)],
                affix: MONSTER_AFFIX_TYPES[Math.floor(Math.random() * MONSTER_AFFIX_TYPES.length)],
                skills: set.fixed.concat(extra),
                status: "open"   // open／done
            });
        }
    });
    return board;
}

function getActiveBounty() {
    if (!player.activeBountyId || !Array.isArray(player.bountyBoard)) return null;
    let entry = player.bountyBoard.find(b => b.id === player.activeBountyId);
    return entry && entry.status === "open" ? entry : null;
}

function acceptBounty(id) {
    refreshBountyIfDue();
    let entry = (player.bountyBoard || []).find(b => b.id === id);
    if (!entry || entry.status !== "open") return;
    let current = getActiveBounty();
    if (current && current.id !== id) {
        let npc = getBountyNpc(current);
        if (!confirm(`同時只能追蹤一名懸賞人物。\n要放棄目前追蹤的【${npc ? npc.name : '?'}】，改接取新的懸賞嗎？`)) return;
    }
    player.activeBountyId = id;
    let npc = getBountyNpc(entry);
    addLog(`📜 接取懸賞：【${BOUNTY_RANKS[entry.rank].name}】${npc.title}・${npc.name}（${realms[entry.realmIndex]} ${entry.stage}階）。前往野外歷練，便有機會遇上此人！`, "quest");
    renderEvilHunt();
}

function abandonBounty() {
    if (inBountyDuel) { alert("對決進行中，無法放棄懸賞！"); return; }
    player.activeBountyId = null;
    addLog(`📜 你放棄了追蹤中的懸賞。`, "system");
    renderEvilHunt();
}

// ---- 懸賞榜畫面（嵌在獵殺邪修視窗內，merit.js 的 renderEvilHunt）----
function renderBountyBoard() {
    refreshBountyIfDue();
    let myAtk = Math.max(1, getPhysAttack());
    let myHp = Math.max(1, getMaxHp());
    let cards = (player.bountyBoard || []).map(entry => {
        let npc = getBountyNpc(entry);
        if (!npc) return '';
        let rank = BOUNTY_RANKS[entry.rank];
        let st = getBountyStats(entry);
        let done = entry.status === "done";
        let tracking = player.activeBountyId === entry.id && !done;
        let ratio = st.attack / myAtk;
        let ratioColor = ratio >= 1.5 ? '#f87171' : ratio >= 0.8 ? '#facc15' : '#4ade80';
        let skillNames = entry.skills.map(k => bountySkills[k] ? bountySkills[k].name : k).join('、');
        let affix = combatAttrInfo[entry.affix];
        let btn = done ? `<button class="shop-btn" disabled>☠️ 已伏誅</button>`
            : tracking ? `<button class="shop-btn" disabled>🔍 追蹤中（野外歷練時可能遇上）</button>
                          <button class="sys-btn" style="margin-top: 4px;" onclick="abandonBounty()">放棄懸賞</button>`
            : `<button class="shop-btn" onclick="acceptBounty('${entry.id}')">📜 接取懸賞</button>`;
        return `
            <div class="card bounty-card" style="border-color: ${done ? 'rgba(255,255,255,0.07)' : tracking ? 'var(--accent)' : rank.color}; opacity: ${done ? 0.45 : 1};">
                <div class="bounty-rank" style="color: ${rank.color};">${rank.icon} ${rank.name}</div>
                <h3 style="margin: 4px 0;">${getBountyIcon(entry)} ${npc.name}</h3>
                <p style="font-size: 0.8em; color: #9ca3af; margin: 0;">「${npc.title}」・${npc.gender === 'female' ? '女' : '男'}・${getFactionLabel(entry.faction)}</p>
                <p style="font-size: 0.85em; color: var(--accent); margin: 6px 0 2px;">${realms[entry.realmIndex]} ${entry.stage}階</p>
                <p style="font-size: 0.78em; margin: 2px 0;">攻擊 ${formatShortNumber(st.attack)}（<span style="color: ${ratioColor};">你的 ${ratio >= 100 ? '100+' : ratio.toFixed(1)} 倍</span>）｜氣血 ${formatShortNumber(st.hp)}（你的 ${(st.hp / myHp).toFixed(1)} 倍）</p>
                <p style="font-size: 0.75em; color: #9ca3af; margin: 2px 0;">🛡️減傷 ${rank.def}% 💨閃避 ${rank.eva}% ${affix ? affix.icon + affix.label + ' ' + rank.affix + '%' : ''} 五行 ${entry.element}</p>
                <p style="font-size: 0.75em; color: #fca5a5; margin: 2px 0 6px;">武學：${skillNames}</p>
                ${btn}
            </div>`;
    }).join('');
    return `
        <div style="display: flex; flex-wrap: wrap; justify-content: center; gap: 6px 18px; margin: 12px 0 8px; font-size: 0.86em;">
            <span style="color: #9ca3af;">每 ${BOUNTY_REFRESH_HOURS} 小時刷新</span>
            <span style="color: var(--accent);">下次刷新：${formatCountdown(player.bountyRefreshAt - Date.now())}</span>
        </div>
        <div class="grid-container">${cards}</div>`;
}

// ---- 對決 ----
// combat.js 在野外刷新新一波之前呼叫；遇上懸賞目標就開打並回傳 true（本波不刷妖獸）
function tryStartBountyDuel() {
    if (inBountyDuel || inTribulation || player.currentMapIsSafe) return false;
    let entry = getActiveBounty();
    if (!entry || Math.random() >= BOUNTY_ENCOUNTER_CHANCE) return false;
    startBountyDuel(entry);
    return true;
}

function startBountyDuel(entry) {
    let npc = getBountyNpc(entry);
    let rank = BOUNTY_RANKS[entry.rank];
    let st = getBountyStats(entry);
    let attrs = { def: rank.def, eva: rank.eva, ice: 0, fire: 0, poison: 0, metal: 0, thunder: 0, element: entry.element };
    attrs[entry.affix] = rank.affix;

    enemies = [];
    respawnTimer = 0;
    clearDuelDebuffs();
    playerStatus = newStatus();
    inBountyDuel = true;
    duelOpponent = {
        entryId: entry.id,
        name: npc.name, title: npc.title, faction: entry.faction, rank: entry.rank,
        icon: getBountyIcon(entry),
        attack: st.attack, maxHp: st.hp, hp: st.hp,
        attrs, status: newStatus(),
        skills: entry.skills, skillChance: rank.skillChance,
        turn: 0
    };
    addLog(`⚔️ 【懸賞對決】${rank.name}「${npc.title}」${npc.name}（${realms[entry.realmIndex]} ${entry.stage}階）現身攔路！生死一戰，就在此刻！`, "reincarnate");
    document.getElementById('combat-status').innerText = `⚔️ 懸賞對決：${npc.name}`;
    document.getElementById('combat-status').style.color = 'var(--reincarnate-color)';
    updateUI();
}

function clearDuelDebuffs() {
    duelWeakenTimer = 0; duelWeakenMult = 1;
    duelSilenceTimer = 0;
    duelArmorTimer = 0;
}

// 化功：stats.js 的 getPhysAttack／getMagAttack 乘上此倍率
function getDuelWeakenMult() {
    return inBountyDuel && duelWeakenTimer > 0 ? duelWeakenMult : 1;
}

// 破甲：elements.js 的 getPlayerCombatAttrs 減傷與閃避乘上此倍率
function getDuelArmorMult() {
    return inBountyDuel && duelArmorTimer > 0 ? 0.5 : 1;
}

// 由 combatTick() 每秒呼叫（對決期間接管整個戰鬥流程，結構同 tribulation.js 的 tribulationTick）
function bountyDuelTick() {
    let opp = duelOpponent;
    if (!opp) { inBountyDuel = false; return; }
    opp.turn++;

    checkAutoHealAndMana();

    // ---- 玩家回合 ----
    let selfTick = tickStatus(playerStatus);
    if (selfTick.dot > 0) {
        player.hp -= selfTick.dot;
        addLog(`🩸 身上的異常狀態發作，損失 ${selfTick.dot.toLocaleString()} 點氣血！`, "combat");
        if (player.hp <= 0) { endBountyDuel("lose"); return; }
    }
    let tags = [];
    if (selfTick.frozen) {
        addLog(`❄️ 你被${opp.name}定住，本回合無法行動！`, "combat");
    } else {
        if (duelSilenceTimer > 0) addLog(`🔇 你被封印，只能以普通攻擊迎敵！`, "combat");
        playerAttackTurn(duelSilenceTimer > 0 ? [] : getAllSkills(), [opp], tags);
    }
    // 負面狀態以「你的回合」計算持續時間
    if (duelWeakenTimer > 0) duelWeakenTimer--;
    if (duelSilenceTimer > 0) duelSilenceTimer--;
    if (duelArmorTimer > 0) duelArmorTimer--;

    petAssistTick([opp]);

    let oppTick = tickStatus(opp.status);
    opp.hp -= oppTick.dot;
    let regen = applyRootRegen();
    if (tags.length > 0 || oppTick.dot > 0 || regen > 0) {
        addLog(`✨ 屬性效果：${[tags.length ? summarizeTags(tags, `💨被${opp.name}閃避`) : '',
            oppTick.dot ? `${opp.name}受持續傷害 ${oppTick.dot.toLocaleString()}` : '',
            regen ? `🌿靈根回復 ${regen.toLocaleString()}` : ''].filter(Boolean).join("｜")}`, "skill");
    }
    if (opp.hp <= 0) { endBountyDuel("win"); return; }
    if (opp.turn >= BOUNTY_MAX_TURNS) { endBountyDuel("escape"); return; }

    // ---- 對方回合 ----
    if (oppTick.frozen) {
        addLog(`❄️ ${opp.name}被凍結，本回合無法出手！`, "skill");
        updateUI();
        return;
    }
    let dmgMult = 1;
    let sk = null;
    if (Math.random() < opp.skillChance) {
        sk = bountySkills[opp.skills[Math.floor(Math.random() * opp.skills.length)]];
        if (sk.mult) dmgMult = sk.mult;
        if (sk.type === "weaken") {
            duelWeakenTimer = sk.duration; duelWeakenMult = sk.weaken;
        } else if (sk.type === "silence") {
            duelSilenceTimer = sk.duration;
        } else if (sk.type === "armor") {
            duelArmorTimer = sk.duration;
        } else if (sk.type === "heal") {
            let heal = Math.min(opp.maxHp - opp.hp, opp.maxHp * sk.heal);
            opp.hp += heal;
        } else if (sk.type === "drain") {
            let drained = Math.min(player.mp, player.maxMp * sk.drain);
            player.mp -= drained;
        }
        addLog(`${opp.icon} ${opp.name}${sk.msg}`, "combat");
    }

    let r = resolveHit(opp.attack * dmgMult, { attrs: opp.attrs, power: opp.attack }, { attrs: getPlayerCombatAttrs(), status: playerStatus });
    let dealt = applyPetDamageReduction(r.dmg);
    player.hp -= dealt;
    if (sk && dealt > 0) {
        if (sk.type === "lifesteal") opp.hp = Math.min(opp.maxHp, opp.hp + dealt * sk.steal);
        if (sk.type === "poison") {
            for (let i = 0; i < sk.stacks; i++) playerStatus.poison = addDotStack(playerStatus.poison, POISON_MAX_STACKS, POISON_TURNS, opp.attack * POISON_RATE);
        }
        if (sk.type === "freeze") playerStatus.frozen = Math.max(playerStatus.frozen, FREEZE_TURNS);
    }
    if (r.tags.length > 0) addLog(`${opp.icon} ${opp.name}攻勢：${summarizeTags(r.tags, "💨你閃避了")}`, "combat");

    if (player.hp <= 0) { endBountyDuel("lose"); return; }
    updateUI();
}

// result：win 斬殺／lose 戰死／escape 對方遁走（回合上限）／flee 玩家換地圖逃離
function endBountyDuel(result) {
    let opp = duelOpponent;
    inBountyDuel = false;
    duelOpponent = null;
    clearDuelDebuffs();
    playerStatus = newStatus();
    if (!opp) return;
    let entry = (player.bountyBoard || []).find(b => b.id === opp.entryId);
    let rank = BOUNTY_RANKS[opp.rank];

    if (result === "win") {
        if (entry) entry.status = "done";
        if (player.activeBountyId === opp.entryId) player.activeBountyId = null;
        let merit = BOUNTY_MERIT_MIN + Math.floor(Math.random() * (BOUNTY_MERIT_MAX - BOUNTY_MERIT_MIN + 1));
        player.merit = (player.merit || 0) + merit;
        player.bountyKills = (player.bountyKills || 0) + 1;
        player.evilKills = (player.evilKills || 0) + 1;
        addKarma(opp.faction === "邪" ? rank.karma : -rank.karma);
        let how = getPlayerFaction() === "邪" ? `吸取其一身功德 ${merit.toLocaleString()} 點` : `積累功德 ${merit.toLocaleString()} 點`;
        addLog(`🏆 【懸賞伏誅】${rank.name}「${opp.title}」${opp.name}授首！${how}！（目前 ${player.merit.toLocaleString()}）`, "level-up");
        settleMeritStones();
        respawnTimer = 3;
        refreshCombatStatusText();
        updateUI();
    } else if (result === "lose") {
        addLog(`💀 【懸賞對決落敗】你倒在${opp.name}手下……（懸賞仍在，養好傷可再尋此人）`, "combat");
        onPlayerKilledInField();
    } else if (result === "escape") {
        addLog(`💨 久戰不下，${opp.name}見勢不妙化作遁光逃走了！（懸賞仍在，可再遇上）`, "combat");
        respawnTimer = 3;
        refreshCombatStatusText();
        updateUI();
    } else {
        addLog(`🏃 你捨棄對決，逃離了${opp.name}的追殺！（懸賞仍在）`, "combat");
    }
}
