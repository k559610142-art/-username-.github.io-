// 神器專屬技能（ARCHITECTURE.md 第 18 節）：技能資料在 config-lingbao.js 的 artifactSkills
// 神器兌換時會在裝備上記錄 lingbaoId（lingbao-shop.js），舊存檔由 migrateArtifactIds() 依屬性比對補上

// 靈寶閣的神器商品（依 lingbaoId 查）
function getArtifactItem(eq) {
    if (!eq || eq.category !== 'artifact' || !eq.lingbaoId) return null;
    return lingbaoShopItems.find(i => i.id === eq.lingbaoId) || null;
}

function getArtifactSkill(eq) {
    return eq && eq.lingbaoId ? artifactSkills[eq.lingbaoId] || null : null;
}

// 目前神器欄裝備的神器技能（沒有則 null）
function getEquippedArtifactSkill() {
    let slot = Object.keys(equipTypes).find(k => equipTypes[k] === 'artifact');
    return slot ? getArtifactSkill(player.equipment[slot]) : null;
}

// 品質顯示文字：神器的「七彩」顯示為「造化神器・七彩」，其餘照原名
function formatQualityLabel(quality) {
    return quality === ARTIFACT_QUALITY ? ARTIFACT_QUALITY_LABEL : quality;
}

// 裝備卡片的外框：造化神器用七彩發光框（index.html 的 .rainbow-glow）
function getEquipCardClass(eq) {
    return eq && eq.quality === ARTIFACT_QUALITY ? 'card rainbow-glow' : 'card';
}

// 裝備卡片用：神器全名與專屬技能（背包、角色裝備欄）
function formatArtifactSkill(eq) {
    let item = getArtifactItem(eq);
    let sk = getArtifactSkill(eq);
    if (!item || !sk) return '';
    return `<p style="font-size: 0.8em; color: var(--accent); margin: 4px 0 2px;">✨ ${item.name}</p>
            <p style="font-size: 0.78em; color: #fca5a5; margin: 0 0 4px;">專屬技能【${sk.name}】：${sk.desc}</p>`;
}

// 玩家出手之後呼叫（野外 combat.js、渡劫 tribulation.js、懸賞對決 bounty.js）：依機率額外發動神器技能
// targets = 本回合的敵人陣列；tags 收集觸發的屬性效果（日誌彙整用）
function artifactSkillTurn(targets, tags) {
    let sk = getEquippedArtifactSkill();
    if (!sk || Math.random() >= sk.chance) return;
    let alive = targets.filter(t => t.hp > 0);
    if (sk.target !== 'self' && alive.length === 0) return;

    let dealt = 0;
    if (sk.target !== 'self') {
        let base = getPlayerCombatAttrs();
        let attrs = Object.assign({}, base);
        for (let k in (sk.attrs || {})) attrs[k] = Math.max(attrs[k] || 0, sk.attrs[k]);
        let dmg = (sk.dmgType === 'mag' ? getMagAttack() : getPhysAttack()) * sk.mult;
        (sk.target === 'aoe' ? alive : [alive[0]]).forEach(t => {
            let r = resolveHit(dmg, { attrs, power: getPhysAttack() }, { attrs: t.attrs || {}, status: t.status || newStatus() });
            t.hp -= r.dmg;
            dealt += r.dmg;
            r.tags.forEach(tag => tags.push(tag));
        });
        if (sk.freezeAll) alive.forEach(t => { if (t.status) t.status.frozen = Math.max(t.status.frozen, FREEZE_TURNS); });
    }
    let extra = [];
    if (sk.lifesteal && dealt > 0) {
        let heal = Math.min(player.maxHp - player.hp, dealt * sk.lifesteal);
        player.hp += heal;
        if (heal > 0) extra.push(`吸取 ${Math.floor(heal).toLocaleString()} 氣血`);
    }
    if (sk.heal) {
        let heal = Math.min(player.maxHp - player.hp, player.maxHp * sk.heal);
        player.hp += heal;
        if (heal > 0) extra.push(`回復 ${Math.floor(heal).toLocaleString()} 氣血`);
    }
    if (sk.mpHeal) {
        let mp = Math.min(player.maxMp - player.mp, player.maxMp * sk.mpHeal);
        player.mp += mp;
        if (mp > 0) extra.push(`回復 ${Math.floor(mp).toLocaleString()} 靈力`);
    }
    if (sk.shield) {
        // 與靈寵土屬性、仙法守護共用減傷狀態，取較高值（applyPetDamageReduction 套用）
        petShieldRate = petShieldTimer > 0 ? Math.max(petShieldRate, sk.shield.reduce) : sk.shield.reduce;
        petShieldTimer = Math.max(petShieldTimer, sk.shield.duration);
        extra.push(`受到傷害 -${Math.round(petShieldRate * 100)}%`);
    }
    if (sk.freezeAll) extra.push(`敵方全體凍結`);
    addLog(`${sk.msg}${dealt > 0 ? ` 造成 ${dealt.toLocaleString()} 傷害` : ''}${extra.length ? `（${extra.join('、')}）` : ''}`, "skill");
}

// 舊存檔相容（讀檔／匯入時執行）：
//   1. 更新前兌換的神器沒有 lingbaoId，依「部位 + 四維與戰鬥屬性完全相同」比對靈寶閣商品補上
//   2. 神器品質由橙色改為七彩（造化神器），所有神器欄物品一律改成 ARTIFACT_QUALITY
function migrateArtifactIds() {
    let artifacts = lingbaoShopItems.filter(i => i.type === 'equip' && i.itemData.category === 'artifact');
    let sameStats = (a, b) => {
        let keys = new Set(Object.keys(a || {}).concat(Object.keys(b || {})));
        for (let k of keys) if ((a[k] || 0) !== (b[k] || 0)) return false;
        return true;
    };
    let fix = eq => {
        if (!eq || eq.category !== 'artifact') return;
        eq.quality = ARTIFACT_QUALITY;
        if (eq.lingbaoId) return;
        let match = artifacts.find(i => sameStats(i.itemData.stats, eq.stats));
        if (match) eq.lingbaoId = match.id;
    };
    Object.values(player.equipment || {}).forEach(fix);
    (player.equipInventory || []).forEach(fix);
}
