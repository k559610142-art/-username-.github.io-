// 屠龍勇者：無限塔（一張特殊地圖；ARCHITECTURE.md 第 332 節）
// 跟一般狩獵地圖一樣：同一個畫面、狀態欄、快捷欄，技能／藥水照玩家自己的快捷欄設定，戰鬥完全走 combat.js 的 huntTick。
// 不一樣的只有地圖本身：
//   - 怪物大量出現、一出生就朝玩家衝過來，貼到身邊就加入戰鬥（同時參戰最多 INF_PACK 隻）
//   - 每層 30 秒，時間到直接進下一層（不等玩家清怪，場上的怪留著），越高層怪越強，每層抽不同能力，每 5 層出首領
//   - 門票：每次進塔 1000 萬金幣（zones.js 的 fee），每天最多 3 次（登入：伺服器 inf_run_start 計次；訪客：本機計次）
//   - 挑戰規則：打怪不給經驗、不掉寶；倒下沒有死亡懲罰（不扣經驗、不回村），送回大地圖塔門口，再挑戰要重新買票
//   - 唯一獎勵：撐過第 10、15、20 層各 1 張娃娃升級卷軸（向伺服器領，doll-upgrade.js／tools/doll-upgrade.sql）
// 樓層不寫進存檔（infRun，離開地圖就重來）；最高樓層記在 localStorage dsSurvivorBest（{角色名: 層}）。
// 依賴（執行期）：player、hunt、scene、buildMonster、monBase、monHpMul、addMob、spawnMapMon、stopHunt、addLog、showToast、gameNow、currentZone

const INF_ZONE = 'infinite';
const INF_FLOOR_MS = 30000;   // 每層 30 秒
const INF_PER_FLOOR = 30;     // 每一層固定出 30 隻（使用者 2026-11-13 指定），出完不補；沒打完的留著跟下一層疊加
const INF_MAP_CAP = 150;      // 地圖上最多同時幾隻（太多會擠滿競技場）
const INF_SCROLL_FLOORS = [10, 15, 20];   // 撐過這幾層各給 1 張娃娃升級卷軸（使用者 2026-11-13 指定）
const INF_PACK = 16;          // 同時參戰（圍著打你）最多幾隻；一般地圖 6 隻（貼身的最多 8 格，其餘是遠程）
const INF_HP_K = 0.5, INF_DMG_K = 0.6;   // 一群一起上：單隻血量、傷害相對一般怪（monBase）的倍率
// 怪物外觀：images/monsters/rework/mon-*.png（scene-art.js 的 SCENE_ART_MONSTERS 'art-…'）；step＝地圖上每走一格幾毫秒
const INF_TYPES = {
    wolf:     { name: '狼人',       hp: 0.8,  dmg: 1.0,  step: 300 },
    beast:    { name: '深淵魔物',   hp: 1.15, dmg: 1.1,  step: 340 },
    gargoyle: { name: '石像鬼',     hp: 1.0,  dmg: 1.0,  step: 320 },
    golem:    { name: '熔岩高崙',   hp: 2.0,  dmg: 1.3,  step: 520 },
    guard:    { name: '地獄騎士',   hp: 1.5,  dmg: 1.2,  step: 420 },
    assassin: { name: '暗影刺客',   hp: 0.7,  dmg: 1.25, step: 250 },
    flame:    { name: '火焰之影',   hp: 1.0,  dmg: 1.15, step: 350 },
    wraith:   { name: '虛空行者',   hp: 0.8,  dmg: 1.0,  step: 300 },
    angel:    { name: '墮落天使',   hp: 1.2,  dmg: 1.15, step: 330 },
    mage:     { name: '混沌法師',   hp: 0.9,  dmg: 1.1,  step: 450, magic: true },
    archer:   { name: '骷髏神射手', hp: 0.8,  dmg: 1.0,  step: 450, magic: true },
};
const INF_BOSSES = [
    ['bull-boss', '巨大牛人'], ['flame-boss', '炎魔之影'], ['ice-boss', '冰之女王'], ['lich-boss', '巫妖王'], ['banshee-boss', '黑暗女妖'],
    ['angel-boss', '墮落的大天使'], ['chaos-boss', '混沌之主'], ['abyss-boss', '深淵領主'], ['reaper-boss', '死神'], ['king-boss', '冥法軍王'],
];
const INF_THEMES = [
    ['狼人獸群', ['wolf']], ['深淵獸潮', ['beast', 'wolf']], ['石像鬼巢', ['gargoyle', 'wraith']], ['暗影刺殺', ['assassin', 'wraith']],
    ['地獄軍團', ['guard', 'beast']], ['烈焰迴廊', ['flame', 'gargoyle']], ['高崙行軍', ['golem', 'guard']], ['亡靈法團', ['mage', 'wraith', 'assassin']],
    ['骷髏箭雨', ['archer', 'guard', 'wolf']], ['天使墮落', ['angel', 'flame', 'mage']],
];
// 每層能力：1～5 層 1 個、6～12 層 2 個、13 層起 3 個，不跟上一層重複
const INF_TRAITS = {
    fast:   { name: '疾風', desc: '移動速度 +60%' },
    frenzy: { name: '狂暴', desc: '攻擊速度 +40%' },
    mighty: { name: '蠻力', desc: '傷害 +30%' },
    armor:  { name: '鋼皮', desc: '防禦 +15、魔防 +30' },
    giant:  { name: '巨人', desc: '血量 ×2、傷害 +30%' },
    shield: { name: '護盾', desc: '血量 +40%' },
    regen:  { name: '再生', desc: '每秒回復 3% 生命' },
    split:  { name: '分裂', desc: '死亡時再冒出 2 隻' },
    ranged: { name: '射手', desc: '會用遠程魔法攻擊' },
    blink:  { name: '閃現', desc: '會瞬移到你身邊' },
};

const INF_DAILY = 3;   // 每天最多進塔幾次（伺服器同樣限制，tools/doll-upgrade.sql）
let infPending = null;   // 剛買票進塔：{ runId }，infTick 第一次執行時用它開始這一趟
let infRun = null;   // { floor, start, traits, theme, kills, bossDue, calmUntil, budget＝這層還沒出場的怪 }

function inInfinite() { const z = player && player.loc.type === 'zone' && currentZone(); return !!(z && z.type === INF_ZONE); }
function infBest() { try { return (JSON.parse(localStorage.getItem('dsSurvivorBest') || '{}')[player.name]) || 0; } catch (e) { return 0; } }
function infSaveBest(f) {
    try { const o = JSON.parse(localStorage.getItem('dsSurvivorBest') || '{}'); if (f > (o[player.name] || 0)) { o[player.name] = f; localStorage.setItem('dsSurvivorBest', JSON.stringify(o)); return true; } } catch (e) {}
    return false;
}
function infShuffle(a) { a = a.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; }
function infHas(t) { return !!(infRun && infRun.traits.includes(t)); }

// ───────── 樓層 ─────────
function infStart(runId) {
    infRun = { floor: 0, start: gameNow, traits: [], theme: null, kills: 0, bossDue: false, budget: 0, runId: runId || null };   // runId：伺服器登記的這一趟（領娃娃升級卷軸用）
    infNextFloor();
}
function infNextFloor() {
    const R = infRun, f = ++R.floor;
    R.start = gameNow;
    R.theme = f <= INF_THEMES.length ? INF_THEMES[f - 1] : [['混沌亂流', '深淵大軍', '萬魔齊至', '屍山血海', '無盡之夜'][rand(0, 4)], infShuffle(Object.keys(INF_TYPES)).slice(0, 3)];
    const n = f <= 5 ? 1 : f <= 12 ? 2 : 3;
    let pool = Object.keys(INF_TRAITS).filter(k => !R.traits.includes(k));
    if (f === 1) pool = ['fast', 'regen', 'shield'];
    R.traits = infShuffle(pool).slice(0, n);
    R.bossDue = f % 5 === 0;
    R.budget += INF_PER_FLOOR;
    // 獎勵：撐過第 10、15、20 層各 1 張娃娃升級卷軸（每一趟都能領；由伺服器發、存在伺服器，doll-upgrade.js，第 333 節）
    if (INF_SCROLL_FLOORS.includes(f - 1)) dollScrollClaim(R, f - 1);   // 向伺服器領卷軸（doll-upgrade.js；伺服器檢查進塔時間）
    if (f > 1 && infSaveBest(f - 1)) addLog(`🏆 無限塔新紀錄：撐過 ${f - 1} 層`, 'win');
    const tr = R.traits.map(k => INF_TRAITS[k].name + '（' + INF_TRAITS[k].desc + '）').join('、');
    addLog(`🏯 無限塔第 ${f} 層・${R.theme[0]}${R.bossDue ? '（首領）' : ''}：怪物 Lv.${infLv(f)}，本層能力 ${tr}`, 'boss');
    showToast(`🏯 第 ${f} 層・${R.theme[0]}　${R.traits.map(k => INF_TRAITS[k].name).join('、')}`, 3000);
    if (typeof scene !== 'undefined' && scene && scene.floats && scene.pl) addFloat(scene.pl.x, scene.pl.y - 1.5, `第 ${f} 層`, '#ffd86b', true);
    if (typeof refreshUI === 'function') refreshUI();
}
function infLv(f) { return 50 + Math.round((f - 1) * 2.5); }   // 第 1 層怪物 Lv.50（使用者 2026-11-13 指定），每層 +2.5 級
function infFloorLeft() { return infRun ? Math.max(0, Math.ceil((INF_FLOOR_MS - (gameNow - infRun.start)) / 1000)) : 0; }
function infTitle() { return infRun ? `無限塔 第 ${infRun.floor} 層` : '無限塔'; }
// 地圖怪出場（ui-scene.js sceneUpdate 每幀呼叫）：每層 INF_PER_FLOOR 隻，一口氣出完（每幀一隻），不補打掉的
function infSpawnTick(alive) {
    if (!infRun || infRun.budget <= 0 || alive >= INF_MAP_CAP) return;
    if (spawnMapMon()) infRun.budget--;
}

// 主迴圈每幀（combat.js huntTick 開頭呼叫，不管有沒有在掛機）：計時換層、再生
function infTick(dt) {
    if (!inInfinite()) { infRun = null; infPending = null; return; }
    if (!infRun) {
        // 剛買票進塔才開始；重新整理頁面、讀到停在塔裡的存檔等沒有門票的情況：送回塔門口
        if (!infPending) { addLog('🗼 無限塔挑戰已中斷，送回塔門口（再挑戰要重新購買門票）', 'sys'); infLeaveToGate(); return; }
        infStart(infPending.runId); infPending = null;
    }
    if (gameNow - infRun.start >= INF_FLOOR_MS) infNextFloor();
    // 怪物主動攻擊：沒在掛機時，怪貼到身邊就自動開打（倒下後有 5 秒喘息）
    if (!player.hunting && player.hp > 0 && !walkHome && !(infRun.calmUntil > gameNow) && scene && scene.mons && scene.pl && scene.key === sceneKey()
        && scene.mons.some(m => !m.dead && !m.inst && Math.max(Math.abs(m.x - scene.pl.x), Math.abs(m.y - scene.pl.y)) <= 1)) {
        startHunt();
        if (player.hunting) addLog('⚔️ 怪物撲了上來！', 'warn');
    }
    if (hunt && hunt.mobs) for (const m of hunt.mobs) if (m.infRegen && m.hp > 0) m.hp = Math.min(m.maxHp, m.hp + m.maxHp * 0.03 * dt / 1000);
}

// ───────── 怪物 ─────────
// 地圖上的外觀（還沒參戰的怪）
function infVisual() {
    const types = infRun ? infRun.theme[1] : ['wolf'], t = types[rand(0, types.length - 1)];
    return { icon: '👹', name: INF_TYPES[t].name, mid: 'art-' + t };
}
// 參戰的怪（遊戲本身的怪物資料 buildMonster）：等級＝2＋樓層×2.5，血量／傷害依種類與本層能力
function infMakeMonster(boss) {
    const R = infRun || { floor: 1, traits: [], theme: INF_THEMES[0] };
    const f = R.floor, lv = infLv(f) + (boss ? 3 : 0), b = monBase(lv);
    let type = null, name, art;
    if (boss) { const bb = INF_BOSSES[(Math.floor(f / 5) - 1) % INF_BOSSES.length]; art = bb[0]; name = bb[1]; }
    else { type = R.theme[1][rand(0, R.theme[1].length - 1)]; art = type; name = INF_TYPES[type].name; }
    const T = boss ? { hp: 12, dmg: 1.4 } : INF_TYPES[type];
    let hpMul = INF_HP_K * T.hp, dmgMul = INF_DMG_K * T.dmg;
    if (infHas('giant')) { hpMul *= 2; dmgMul *= 1.3; }
    if (infHas('shield')) hpMul *= 1.4;
    if (infHas('mighty')) dmgMul *= 1.3;
    const magic = (T.magic || infHas('ranged') || boss)
        ? { p: boss ? 0.25 : T.magic ? 0.6 : 0.35, dmg: b.dmg.map(d => Math.round(d * 1.2 * dmgMul)), name: boss ? '首領之怒' : T.magic ? '黑暗魔法' : '暗影射擊' } : null;
    const m = buildMonster('art-' + art, {
        name, icon: '👹', lv, boss: !!boss, large: !!boss || type === 'golem',
        hpMul: hpMul / monHpMul(lv, !!boss), dmgMul, acAdd: (boss ? -5 : 0) - (infHas('armor') ? 15 : 0),
        hit: lv + 10 + f,   // 命中比一般怪高（一般＝等級）：不然高防禦角色幾乎全 MISS，怪物等於不會攻擊
        mr: Math.min(100, b.mr + (infHas('armor') ? 30 : 0)), spd: Math.round((boss ? 1300 : 1500) * (infHas('frenzy') ? 0.7 : 1)),
        exp: 0, gold: [0, 0], drops: [],
        undead: ['wraith', 'archer', 'mage'].includes(type), tags: ['flame', 'angel', 'gargoyle', 'beast'].includes(type) || boss ? ['demon'] : [],
    });
    if (magic) m.magic = magic;   // buildMonster 會把 magic 再 ×1.4，這裡直接用算好的
    m.inf = true; m.infRegen = infHas('regen'); m.infSplit = infHas('split') && !boss;
    return m;
}
// 地圖怪的移動間隔（毫秒／格）：追著玩家跑
function infStepMs(m) {
    const t = INF_TYPES[(m.mid || '').replace(/^art-/, '')] || INF_TYPES.wolf;
    return t.step * (infHas('fast') ? 0.62 : 1);
}
// 朝角色走一格（不跑整張圖的尋路：幾十隻怪每步都尋路會 LAG）：先試直接靠近的方向，被擋就試側邊；
// 真的卡住（連續 6 步走不動）才用一次 findPath 繞牆
function infStep(m, pl) {
    const dx = Math.sign(pl.x - m.x), dy = Math.sign(pl.y - m.y);
    const ax = Math.abs(pl.x - m.x), ay = Math.abs(pl.y - m.y);
    const tries = ax >= ay ? [[dx, 0], [0, dy], [0, dy || 1], [0, -(dy || 1)]] : [[0, dy], [dx, 0], [dx || 1, 0], [-(dx || 1), 0]];
    for (const [sx, sy] of tries) {
        if (!sx && !sy) continue;
        const x = m.x + sx, y = m.y + sy;
        if (freeTile(x, y)) { m.x = x; m.y = y; m.stuck = 0; return; }
    }
    m.stuck = (m.stuck || 0) + 1;
    if (m.stuck >= 6 && ax + ay > 3) {   // 已經擠在角色附近（被別的怪擋住）就等，不尋路
        m.stuck = 0;
        const step = findPath(m.x, m.y, pl.x, pl.y, true)[0];
        if (step && freeTile(step[0], step[1])) { m.x = step[0]; m.y = step[1]; }
    }
}
// 閃現能力：遠處的怪偶爾瞬移到玩家附近
function infBlink(m, pl) {
    if (!infHas('blink') || Math.random() > 0.004) return false;
    for (let i = 0; i < 8; i++) {
        const x = pl.x + rand(-3, 3), y = pl.y + rand(-3, 3);
        if ((x !== pl.x || y !== pl.y) && freeTile(x, y)) { m.x = x; m.y = y; m.rx = x; m.ry = y; return true; }
    }
    return false;
}

// ───────── 大地圖入口（scene-art.js 的 fieldNpcs「無限塔守門人」）─────────
// fromAtlas：世界地圖直接傳送（不用站在守門人旁邊）
async function openInfiniteEntrance(fromAtlas) {
    if (!player || walkHome || player.hp <= 0) return;
    if (!fromAtlas && !keeperNear(INF_ZONE)) { showToast('走近無限塔守門人才能進入'); return; }
    if (inInfinite()) { showToast('你已經在無限塔裡'); return; }
    const fee = ZONE_BY_ID[INF_ZONE].fee, owner = player;
    if (player.gold < fee) { showToast(`金幣不足：無限塔門票 ${fmt(fee)} 金幣`); return; }
    const used = await infDailyUsed();
    if (player !== owner) return;
    if (used == null) { showToast('連線失敗，無法確認今天的進塔次數，請稍後再試'); return; }
    const left = Math.max(0, INF_DAILY - used);
    if (left <= 0) { gameAlert('🗼 無限塔', `今天的 ${INF_DAILY} 次挑戰已經用完，明天再來。`); return; }
    gameConfirm('🗼 無限塔', `門票 ${fmt(fee)} 金幣（每次進塔一張），今天還能挑戰 ${left} / ${INF_DAILY} 次。\n怪物源源不絕湧出、每 30 秒進入下一層（第 1 層怪物 Lv.50），看你能撐過幾層。\n挑戰地圖：沒有經驗與掉寶；撐過第 10、15、20 層各得 1 張娃娃升級卷軸（要登入）；藥水照常消耗；倒下沒有死亡懲罰（送回塔門口）。\n\n你的最高紀錄：撐過 ${infBest()} 層。要買票進入嗎？`, () => {
        if (player !== owner || (!fromAtlas && !keeperNear(INF_ZONE))) { showToast('請先走回無限塔守門人旁邊'); return; }
        infEnter(fromAtlas);
    }, '購買門票進入');
}
// 今天用了幾次：登入問伺服器（inf_status），訪客看本機；失敗回 null
async function infDailyUsed() {
    if (dollUpOnline()) {
        try { const r = await marketRpc('inf_status', { p_char: lootChar() }); dollScrolls = r.scrolls; return r.used; }
        catch (e) { if (/does not exist|could not find|schema cache/i.test(String(e && (e.message || e)))) return infLocalUsed(); return null; }   // 伺服器還沒安裝：先用本機計次
    }
    return infLocalUsed();
}
function infToday() { const d = new Date(Date.now() + 8 * 3600 * 1000); return d.toISOString().slice(0, 10); }   // 台灣時間的日期（跟伺服器一致）
function infLocalUsed() { try { const o = JSON.parse(localStorage.getItem('dsInfDaily') || '{}'); return o.day === infToday() ? (o[lootChar()] || 0) : 0; } catch (e) { return 0; } }
function infLocalAdd() { try { let o = JSON.parse(localStorage.getItem('dsInfDaily') || '{}'); if (o.day !== infToday()) o = { day: infToday() }; o[lootChar()] = (o[lootChar()] || 0) + 1; localStorage.setItem('dsInfDaily', JSON.stringify(o)); return o[lootChar()]; } catch (e) { return INF_DAILY; } }
// 買票進塔：先跟伺服器登記這一趟（同時扣今天的次數），成功才收 1000 萬、進場
async function infEnter(fromAtlas) {
    const fee = ZONE_BY_ID[INF_ZONE].fee, owner = player;
    if (player.gold < fee) { showToast(`金幣不足：無限塔門票 ${fmt(fee)} 金幣`); return; }
    let runId = null, left;
    if (dollUpOnline()) {
        try { const r = await marketRpc('inf_run_start', { p_char: lootChar() }); runId = r.run; left = r.left; }
        catch (e) {
            const m = String(e && (e.message || e));
            if (/daily limit/.test(m)) { gameAlert('🗼 無限塔', `今天的 ${INF_DAILY} 次挑戰已經用完，明天再來。`); return; }
            if (!/does not exist|could not find|schema cache/i.test(m)) { showToast(dollUpErrText(e)); return; }
            left = INF_DAILY - infLocalAdd();   // 伺服器還沒安裝：先用本機計次（領不到卷軸）
        }
    } else {
        if (infLocalUsed() >= INF_DAILY) { gameAlert('🗼 無限塔', `今天的 ${INF_DAILY} 次挑戰已經用完，明天再來。`); return; }
        left = INF_DAILY - infLocalAdd();
    }
    if (player !== owner || player.gold < fee || walkHome || player.hp <= 0) return;
    stopHunt();
    if (typeof endMapRun === 'function') endMapRun('進入無限塔離開異界');
    player.gold -= fee;
    player.loc = { type: 'zone', id: INF_ZONE };
    infRun = null; infPending = { runId };
    scene = null; sceneSpawnAt = null; session = null;
    openTabs = []; currentTab = 'hunt';
    addLog(`🗼 支付門票 ${fmt(fee)} 金幣進入無限塔（今天還剩 ${Math.max(0, left)} 次）`, 'sys');
    startHunt();
    saveGame(); renderTabs(); refreshUI();
}

// ───────── 掛機（combat.js）接口 ─────────
// 參戰：地圖怪貼到身邊（1 格內）就加入戰鬥，最多 INF_PACK 隻；這層的首領第一個加入
function infJoinTick() {
    if (!hunt || hunt.state !== 'fight' || hunt.mobs.length >= INF_PACK || !scene || !scene.mons || !scene.pl) return;
    const pl = scene.pl;
    const ranged = mid => (INF_TYPES[(mid || '').replace(/^art-/, '')] || {}).magic || infHas('ranged');
    if (!scene.mons.some(m => !m.dead && !m.inst && Math.max(Math.abs(m.x - pl.x), Math.abs(m.y - pl.y)) <= (ranged(m.mid) ? RANGED_RANGE : 1))) return;
    const boss = !!(infRun && infRun.bossDue);
    if (boss) infRun.bossDue = false;
    const mon = infMakeMonster(boss);
    addMob(mon);
    if (boss) addLog(`⚠️ ${mon.name}（Lv.${mon.lv}）出現了！`, 'boss');
}
// 打倒：不給經驗、金幣、掉寶；分裂能力再冒 2 隻
function infOnKill(mon) {
    if (!mon || !mon.inf || !inInfinite() || !hunt || !hunt.mobs.includes(mon)) return false;
    hunt.mobs = hunt.mobs.filter(m => m !== mon);
    if (hunt.mon === mon) hunt.mon = hunt.mobs.slice().sort((a, b) => a.hp - b.hp)[0] || null;
    if (infRun) infRun.kills++;
    if (session) session.kills++;
    addLog(`☠️ 擊倒${mon.name}（無限塔：沒有經驗與掉寶）`, 'win');
    sfx('mon-die');
    if (typeof uqOn === 'function') uniqueOnKill(mon);
    if (mon.infSplit && scene && scene.mons) for (let i = 0; i < 2; i++) spawnMapMon();
    if (hunt.mon) { hunt.pCd = Math.min(hunt.pCd, 300); return true; }
    hunt.tele = null;
    hunt.state = 'search';
    hunt.timer = 200;
    return true;
}
// 倒下：沒有死亡懲罰（不扣經驗、不清增益、不回村），HP 回 30%，從第 1 層重來，先停止掛機讓玩家整理
function infOnDeath(killer) {
    if (!inInfinite()) return false;
    const f = infRun ? infRun.floor : 1;
    const nb = infSaveBest(f - 1);
    const st = calcStats();
    player.hp = Math.max(1, Math.floor(st.maxHp * 0.3));
    addLog(`💀 你在無限塔第 ${f} 層被${killer ? killer.name : '敵人'}擊倒（撐過 ${f - 1} 層${nb ? '，新紀錄！' : ''}）。挑戰模式沒有死亡懲罰，已送回塔門口；再挑戰要重新購買門票`, 'dead');
    sfx('player-die');
    showToast(`💀 撐過 ${f - 1} 層${nb ? '（新紀錄）' : ''}，已送回無限塔門口`, 3500);
    infLeaveToGate();
    return true;
}
// 送回大地圖的無限塔守門人前面（門票用掉了，再進要重新買）；不是回村、不扣經驗
function infLeaveToGate() {
    stopHunt();
    const n = keeperNpc(INF_ZONE);
    player.loc = { type: 'zone', id: (n && n.zone) || 'forgottenIsle' };
    sceneSpawnAt = n && n.front ? n.front.slice() : null;
    scene = null; session = null; infRun = null; infPending = null;
    if (typeof refreshUI === 'function') refreshUI();
    saveGame();
}
