// 魔法娃娃：常駐能力、特色被動；冷卻與出場累積時間隨角色保存。
const DOLL_ABILITIES = {
    'skeleton-knight': { fx: { ac: 2, hp: 50 }, base: '防禦 +2、HP +50', name: '骨盾', desc: '受擊時10%機率減少該次傷害10。' },
    'forest-deer': { fx: { hp: 80, mr: 3 }, base: 'HP +80、MR +3', name: '森靈滋養', desc: '每出場32秒恢復HP 25。', period: 32000, hp: 25 },
    'mushroom-rabbit': { fx: { expPct: .03, weight: 100 }, base: '經驗 +3%、負重 +100', name: '採集驚喜', desc: '擊殺普通怪物時10%機率額外獲得該隻怪物20%金幣。' },
    'snow-owl': { fx: { mp: 40, mr: 3 }, base: 'MP +40、MR +3', name: '靜夜回流', desc: '每出場64秒恢復MP 10。', period: 64000, mp: 10 },
    'steam-squirrel': { fx: { weight: 200, goldPct: .05 }, base: '負重 +200、金幣 +5%', name: '補給助手', desc: 'HP藥水恢復量增加10%。' },
    'forest-sprite': { fx: { hp: 80, mp: 40 }, base: 'HP +80、MP +40', name: '森林祝福', desc: '每出場32秒恢復HP 20、MP 4。', period: 32000, hp: 20, mp: 4 },
    'lava-hound': { fx: { dmg: 3, hit: 2 }, base: '傷害 +3、命中 +2', name: '熔岩撕咬', desc: '攻擊命中時5%機率追加20傷害。', extra: 20 },
    'star-fox': { fx: { expPct: .05, dodge: .02 }, base: '經驗 +5%、閃避 +2%', name: '星光護身', desc: 'HP低於40%時獲得50點護盾，持續5秒，冷卻45秒。', cd: 45000, duration: 5000 },
    'tidal-dragon': { fx: { mp: 60, mr: 5 }, base: 'MP +60、MR +5', name: '潮汐回流', desc: '每出場64秒恢復MP 15。', period: 64000, mp: 15 },
    'frost-dragon': { fx: { ac: 4, hp: 100 }, base: '防禦 +4、HP +100', name: '冰霜守護', desc: '受擊後10%機率獲得減傷10%，持續5秒，冷卻20秒。', cd: 20000, duration: 5000, reduction: .1 },
    'flower-rabbit': { fx: { expPct: .08, hp: 100 }, base: '經驗 +8%、HP +100', name: '花露療癒', desc: '喝HP藥水後於5秒內額外恢復HP 30，冷卻10秒。', cd: 10000, duration: 5000 },
    'golden-griffin': { fx: { dmg: 4, hit: 4 }, base: '傷害 +4、命中 +4', name: '獅鷲突擊', desc: '攻擊命中時5%機率追加30傷害。', extra: 30 },
    'crystal-turtle': { fx: { hp: 150, mr: 8, reduce: 2 }, base: 'HP +150、MR +8', name: '紫晶甲殼', desc: '每次受到傷害固定減免2（已計入人物減傷）。' },
    'white-tiger': { fx: { dmg: 6, hit: 5 }, base: '傷害 +6、命中 +5', name: '猛虎追獵', desc: '持續攻擊同一目標滿5秒，對其傷害增加8%；換目標或停攻3秒重置。' },
    'azure-dragon': { fx: { sp: 3, mp: 100 }, base: 'SP +3、MP +100', name: '龍息回流', desc: '每出場64秒恢復MP 22。', period: 64000, mp: 22 },
    'vermillion-bird': { fx: { sp: 3, expPct: .1 }, base: 'SP +3、經驗 +10%', name: '朱雀炎羽', desc: '傷害法術命中時5%機率追加40傷害，每次施法最多觸發一次。', extra: 40 },
    'black-tortoise': { fx: { ac: 6, hp: 180 }, base: '防禦 +6、HP +180', name: '玄武守護', desc: 'HP低於40%時獲得減傷15%，持續6秒，冷卻30秒。', cd: 30000, duration: 6000, reduction: .15 },
    'golden-dragon': { fx: { dmg: 8, hit: 7 }, base: '傷害 +8、命中 +7', name: '金龍威壓', desc: '攻擊命中時5%機率追加60傷害，對首領追加90。', extra: 60 },
    phoenix: { fx: { hp: 250, expPct: .15 }, base: 'HP +250、經驗 +15%', name: '浴火重生', desc: '受到致命傷害時免死並恢復最大HP的20%，冷卻10分鐘。', cd: 600000 },
    qilin: { fx: { ac: 8, mr: 15, reduce: 5 }, base: '防禦 +8、MR +15', name: '祥瑞庇護', desc: '每次受到傷害固定減免5（已計入人物減傷）。' },
    'little-demon': { fx: { dmg: 6, weight: 500 }, base: '傷害 +6、負重 +500', name: '吞噬精氣', desc: '攻擊命中時10%機率吸取HP 25，不超過該次實際傷害。' },
};
const dollRuntime = new WeakMap();
for (const id in DOLL_ABILITIES) {
    const a = DOLL_ABILITIES[id];
    ITEMS['doll_' + id].desc = a.base + '。' + a.name + '：' + a.desc + ' 僅出場娃娃生效，卸下移除；換裝不重置冷卻。';
}
function dollEquipped(p = player) {
    const it = p && p.equip.doll, d = it && ITEMS[it.id];
    return d && DOLL_ABILITIES[d.doll] ? d.doll : null;
}
function dollAbilityHtml(id) {
    const d = ITEMS[id], a = d && DOLL_ABILITIES[d.doll];
    return a ? `<p>${esc(a.base)}</p><p><b>${esc(a.name)}</b>：${esc(a.desc)}</p>` : '';
}
function dollStateNormalize(p) {
    const old = p.dollState && typeof p.dollState === 'object' ? p.dollState : {}, next = {};
    for (const id of Object.keys(DOLL_ABILITIES)) {
        const a = DOLL_ABILITIES[id], s = old[id];
        if (!s || typeof s !== 'object') continue;
        next[id] = { elapsed: a.period && Number.isFinite(s.elapsed) ? clamp(s.elapsed, 0, a.period - 1) : 0,
            readyAt: a.cd && Number.isFinite(s.readyAt) ? clamp(s.readyAt, 0, gameNow + a.cd) : 0 };
    }
    p.dollState = next;
}
function dollResetTransient() { if (player) dollRuntime.delete(player); }
function dollContext() {
    const id = dollEquipped();
    if (!id || player.hp <= 0) { if (player) dollRuntime.delete(player); return null; }
    let r = dollRuntime.get(player);
    const uid = player.equip.doll.uid;
    if (!r || r.id !== id || r.uid !== uid) { r = { id, uid, until: 0, shield: 0, hotLeft: 0, hotAcc: 0 }; dollRuntime.set(player, r); }
    return r;
}
function dollSaved(id) {
    return player.dollState[id] || (player.dollState[id] = { elapsed: 0, readyAt: 0 });
}
function dollNotify(r, text) {
    r.notice = text; r.noticeUntil = gameNow + 2500;
    addLog('🧚 ' + DOLL_ABILITIES[r.id].name + '：' + text, 'doll');
}
function dollRestore(r, hp, mp) {
    const st = calcStats(), beforeHp = player.hp, beforeMp = player.mp;
    player.hp = Math.min(st.maxHp, player.hp + hp); player.mp = Math.min(st.maxMp, player.mp + mp);
    const h = player.hp - beforeHp, m = player.mp - beforeMp;
    if (h || m) dollNotify(r, [h ? 'HP +' + h : '', m ? 'MP +' + m : ''].filter(Boolean).join('、'));
}
function dollTrigger(r) {
    const a = DOLL_ABILITIES[r.id], s = dollSaved(r.id);
    if (s.readyAt > gameNow) return false;
    s.readyAt = gameNow + a.cd; r.until = gameNow + (a.duration || 0);
    dollNotify(r, '生效中'); return true;
}
function dollLowHp(st) {
    const r = dollContext();
    if (!r || player.hp >= st.maxHp * .4) return;
    if (r.id === 'star-fox' && dollTrigger(r)) r.shield = 50;
    else if (r.id === 'black-tortoise') dollTrigger(r);
}
function dollAbilityTick(dt) {
    const r = dollContext();
    if (!r) return;
    const a = DOLL_ABILITIES[r.id], step = Math.max(0, dt);
    if (a.period) {
        const s = dollSaved(r.id); s.elapsed += step;
        const n = Math.floor(s.elapsed / a.period); s.elapsed %= a.period;
        if (n) dollRestore(r, (a.hp || 0) * n, (a.mp || 0) * n);
    }
    if (r.hotLeft > 0 && gameNow > r.until) { r.hotLeft = 0; r.hotAcc = 0; }
    if (r.hotLeft > 0) {
        const used = Math.min(step, r.hotLeft); r.hotLeft -= used; r.hotAcc += used;
        const ticks = Math.floor(r.hotAcc / 1000); r.hotAcc %= 1000;
        if (ticks) dollRestore(r, ticks * 6, 0);
    }
    dollLowHp(calcStats());
}
function dollPotion(value) {
    const r = dollContext();
    if (!r) return value;
    if (r.id === 'steam-squirrel') { dollNotify(r, '藥水恢復量 +10%'); return Math.round(value * 1.1); }
    if (r.id === 'flower-rabbit' && dollTrigger(r)) { r.hotLeft = 5000; r.hotAcc = 0; }
    return value;
}
function dollTakeDamage(value, st) {
    let dmg = Math.max(0, Math.round(value));
    const r = dollContext();
    if (r && dmg > 0) {
        const a = DOLL_ABILITIES[r.id];
        if (r.id === 'skeleton-knight' && chance(.1)) { dmg = Math.max(0, dmg - 10); dollNotify(r, '傷害減少10'); }
        if (r.until > gameNow && a.reduction) dmg = Math.max(0, Math.round(dmg * (1 - a.reduction)));
        if (r.until > gameNow && r.shield > 0) { const n = Math.min(dmg, r.shield); dmg -= n; r.shield -= n; }
    }
    player.hp -= dmg;
    if (!r) return dmg;
    if (player.hp <= 0 && r.id === 'phoenix' && dollTrigger(r)) {
        player.hp = Math.max(1, Math.floor(st.maxHp * .2)); dollNotify(r, '免死，HP恢復至20%');
    }
    if (player.hp > 0 && value > 0) {
        if (r.id === 'frost-dragon' && dollSaved(r.id).readyAt <= gameNow && chance(.1)) dollTrigger(r);
        dollLowHp(st);
    }
    return dmg;
}
function dollAttackMult(mon) {
    const r = dollContext();
    if (!r || r.id !== 'white-tiger' || hunt && mon !== hunt.mon) return 1;
    if (r.target !== mon || r.lastAttack == null || gameNow - r.lastAttack >= 3000) { r.target = mon; r.since = gameNow; r.chasing = false; }
    r.lastAttack = gameNow;
    if (gameNow - r.since < 5000) return 1;
    if (!r.chasing) { r.chasing = true; dollNotify(r, '同一目標傷害 +8%'); }
    return 1.08;
}
function dollOnHit(mon, dealt, spell, scope) {
    const r = dollContext();
    if (!r || dealt <= 0 || scope && scope.dollUsed) return;
    if (scope) scope.dollUsed = true;
    const a = DOLL_ABILITIES[r.id];
    if (r.id === 'little-demon' && chance(.1)) dollRestore(r, Math.min(25, dealt), 0);
    if (a.extra && (r.id !== 'vermillion-bird' || spell) && chance(.05)) {
        const extra = r.id === 'golden-dragon' && (mon.boss || mon.dragon) ? 90 : a.extra;
        const actual = Math.min(Math.max(0, mon.hp), extra); mon.hp -= actual;
        if (actual) dollNotify(r, mon.name + '受到 ' + actual + ' 追加傷害');
    }
}
function dollKillGold(mon, gold) {
    const r = dollContext();
    if (!r || r.id !== 'mushroom-rabbit' || mon.boss || mon.dragon || !chance(.1)) return gold;
    const extra = Math.floor(gold * .2); if (extra) dollNotify(r, '額外金幣 +' + extra);
    return gold + extra;
}
function dollStatusInfo() {
    const r = dollContext();
    if (!r) return null;
    const a = DOLL_ABILITIES[r.id], s = player.dollState[r.id] || { elapsed: 0, readyAt: 0 };
    let text = '出場', on = false;
    if (r.until > gameNow && (r.shield > 0 || a.reduction || r.hotLeft > 0)) {
        text = Math.ceil((r.until - gameNow) / 1000) + '秒'; on = true;
        if (r.shield > 0) text += '／盾' + r.shield;
    } else if (r.id === 'white-tiger' && r.chasing && gameNow - r.lastAttack < 3000 && hunt && r.target === hunt.mon) { text = '生效中'; on = true; }
    else if (r.noticeUntil > gameNow) { text = '觸發'; on = true; }
    else if (s.readyAt > gameNow) text = '冷卻' + Math.ceil((s.readyAt - gameNow) / 1000) + '秒';
    else if (a.period) text = Math.ceil((a.period - s.elapsed) / 1000) + '秒';
    else if (a.cd) text = '待命';
    return { id: r.id, name: DOLLS[r.id].name + '・' + a.name + '：' + a.base + '。' + a.desc + (r.noticeUntil > gameNow ? ' ' + r.notice : ''), text, on };
}
// 模擬不直接改真實角色；只在收益正式入帳時帶回已觸發的冷卻。
function dollSimulationLocks(before, after) {
    before = before || {}; after = after || {};
    return Object.keys(DOLL_ABILITIES).filter(id => DOLL_ABILITIES[id].cd && after[id] && after[id].readyAt > ((before[id] || {}).readyAt || 0))
        .map(id => ({ id, remaining: clamp(after[id].readyAt - gameNow, 0, DOLL_ABILITIES[id].cd) }));
}
function dollApplySimulation(ids, elapsed, id = dollEquipped()) {
    for (const lock of Array.isArray(ids) ? ids : []) {
        const key = typeof lock === 'string' ? lock : lock && lock.id, a = DOLL_ABILITIES[key];
        const remaining = typeof lock === 'string' ? a && a.cd : lock && lock.remaining;
        if (a && a.cd && Number.isFinite(remaining)) { const s = dollSaved(key); s.readyAt = Math.max(s.readyAt, gameNow + clamp(remaining, 0, a.cd)); }
    }
    const a = id && DOLL_ABILITIES[id];
    if (a && a.period && Number.isFinite(elapsed)) { const s = dollSaved(id); s.elapsed = (s.elapsed + Math.max(0, elapsed)) % a.period; }
}
