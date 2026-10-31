// 屠龍勇者：團隊副本（最多 8 人組隊打龍；ARCHITECTURE.md 第 30 節）
// 依賴 config、monsters、zones、player、combat、offline（isOfflineConsumable）、save、cloud、ui、ui-panels（TABS／PANEL_FNS 在載入時加分頁）。
// 流程：建立隊伍（得到 6 碼房號）→ 朋友輸入房號或從公開列表加入 → 每人按「準備」上傳角色快照 → 隊長按「開始」
//   → 隊長的瀏覽器用每個人的快照「快轉模擬」整場團戰（沿用 combat.js 的戰鬥規則，輪流把 player 換成各隊員）
//   → 結果寫回雲端，所有隊員同時觀看重播，結束時各自領取獎勵（經驗、金幣、個人掉落，扣掉戰鬥中用掉的藥水）。
// 後端是 Supabase 的 raid_rooms／raid_members（tools/supabase.sql），雲端存檔沒啟用時整個功能隱藏。

const RAIDS = [
    { id: 'drake',    boss: 'wakingDrake', zone: 'sleepingCave', reqLv: 25, cdH: 2, hpMul: 1.6, dmgMul: 1.0, reward: 3, desc: '沉眠龍窟最深處被吵醒的地龍。適合第一次組隊。' },
    { id: 'wyvern',   boss: 'wyvern',      zone: 'dragonValley', reqLv: 45, cdH: 3, hpMul: 1.1, dmgMul: 0.85, reward: 3, desc: '盤旋在焦骨峽谷上空的巨大飛龍，烈焰俯衝會燒到整隊。' },
    { id: 'antharas', boss: 'antharas',    zone: 'lairAntharas', reqLv: 55, cdH: 6, hpMul: 1.5, dmgMul: 1.0, reward: 1, desc: '大地之龍。單人要 Lv.60，組隊 Lv.55 就能挑戰。' },
    { id: 'fafurion', boss: 'fafurion',    zone: 'lairFafurion', reqLv: 65, cdH: 6, hpMul: 1.3, dmgMul: 0.9, reward: 1, desc: '水之龍，海嘯會淹沒整隊。' },
    { id: 'lindvior', boss: 'lindvior',    zone: 'lairLindvior', reqLv: 75, cdH: 6, hpMul: 1.0, dmgMul: 0.8, reward: 1, desc: '風之龍，攻擊又快又重。' },
    { id: 'valakas',  boss: 'valakas',     zone: 'lairValakas',  reqLv: 85, cdH: 6, hpMul: 0.9, dmgMul: 0.7, reward: 1, desc: '火之龍，四大龍之首。' },
];
const RAID_BY_ID = Object.fromEntries(RAIDS.map(r => [r.id, r]));
const RAID_MAX = 8;                     // 隊伍上限
const RAID_LIMIT_MS = 6 * 60 * 1000;    // 6 分鐘打不倒＝失敗
const RAID_ENRAGE_MS = 4 * 60 * 1000;   // 4 分鐘後首領狂暴（傷害 ×1.5、攻速 ×1.33）
const RAID_FRAME_MS = 500;              // 重播的血條每 0.5 秒一格
const RAID_REPLAY_SPEED = 2;            // 重播速度（6 分鐘的戰鬥看 3 分鐘）
const RAID_BREATH_CD = [9000, 13000];   // 全體吐息間隔
const RAID_BREATH_TELE = 1600;          // 吐息蓄力時間
const RAID_BREATH_MUL = 1.4;            // 吐息傷害 ×（首領魔法傷害）
const RAID_RETARGET_MS = 8000;          // 首領每 8 秒重新挑一次目標
// 首領挑目標的權重（× 最大 HP）：坦職容易被盯上，遠程與法師比較不會
const RAID_TANK = { knight: 3, paladin: 3, warrior: 3, royal: 2, shura: 2, magicfighter: 2, demon: 1.5, darkelf: 1, angel: 1, elf: 0.6, gunner: 0.6, mage: 0.5 };
const RAID_POLL_MS = 3000;              // 隊伍大廳每 3 秒更新一次
const RAID_LIST_MAX_AGE_MS = 2 * 3600 * 1000;   // 公開列表只顯示 2 小時內建立的隊伍
const RAID_ROOM_KEY = 'dragonSlayer_raid_room'; // 重新整理後回到原本的隊伍
const RAID_CODE_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

// 隊伍人數 → 首領 HP 倍率（1 人 ×1、8 人 ×3.8）；每人分到的經驗／金幣比例（人越多總獎勵越多，每人分到的越少）
function raidPartyHp(n) { return 0.6 + 0.4 * n; }
function raidShare(n) { return (1 + 0.25 * (n - 1)) / n; }

function raidBoss(def, n) {
    const m = makeMonster(def.boss);
    m.hp = m.maxHp = Math.round(m.maxHp * def.hpMul * raidPartyHp(n));
    m.dmg = m.dmg.map(v => Math.round(v * def.dmgMul));
    if (m.magic) m.magic = Object.assign({}, m.magic, { dmg: m.magic.dmg.map(v => Math.round(v * def.dmgMul)) });
    m.atkCd = m.spd;
    m.stunUntil = 0;
    return m;
}

function raidConsumables(p) {
    const m = {};
    for (const x of p.inv) if (isOfflineConsumable(x.id) || x.id === 'magicCrystal') m[x.id] = (m[x.id] || 0) + x.n;
    return m;
}

// 隊伍快照：整份角色，倉庫不需要（也比較小）
function raidSnapshot() {
    dollSummonTick();
    const p = JSON.parse(JSON.stringify(player));
    p.storage = [];
    p.titleShown = accTitle();   // 帳號稱號：團隊副本畫面顯示在名字上方（titles.js）
    return p;
}

// 目前角色能不能參加某個副本（空字串＝可以）
function raidBlockReason(def, p = player) {
    if (!p) return '沒有角色';
    if (p.lv < def.reqLv) return `需要 Lv.${def.reqLv}`;
    const cd = (p.raidCd && p.raidCd[def.id]) || 0;
    if (cd > Date.now()) return `冷卻中（${fmtDuration(cd - Date.now())}）`;
    return '';
}

// ───────── 團戰模擬（隊長的瀏覽器執行）─────────
// list：[{ uid, name, snap }]；回傳可以重播的結果。全程 SIM_MODE，結束後還原所有全域狀態
// opts（世界首領用，wb.js）：{ boss: 指定的怪物物件, limitMs: 戰鬥時間上限 }
function raidSimulate(def, list, opts = {}) {
    const keep = { player, hunt, session, walkHome, gameNow, potReadyAt, log: gameLog.slice(), logSeq };
    SIM_MODE = true;
    session = { start: gameNow, kills: 0, exp: 0, gold: 0 };   // onKill（反擊打倒首領）會用到
    walkHome = null;
    const t0 = gameNow;
    let t = 0;
    const events = [], frames = [], marks = [];
    const ev = (msg, cls = '') => { if (events.length < 600) events.push([t, msg, cls]); };
    // 重播場景用的動作紀錄（v2）：g 首領換目標、x 首領普攻、w 吐息蓄力、b 吐息、e 狂暴、h 補師補血 [t, 代碼, 隊員, 目標]
    const mk = (code, a, b) => { if (marks.length < 1500) marks.push(b == null ? (a == null ? [t, code] : [t, code, a]) : [t, code, a, b]); };
    try {
        const n = list.length, boss = opts.boss || raidBoss(def, n);
        const limit = opts.limitMs || RAID_LIMIT_MS;
        if (boss.atkCd == null) boss.atkCd = boss.spd * bossEnchantAttackFactor(boss);
        if (boss.stunUntil == null) boss.stunUntil = 0;
        const ms = list.map((x, i) => {
            const p = migrateSave({ player: JSON.parse(JSON.stringify(x.snap)) });
            p.buffs = {}; p.cds = {}; p.mapRun = null; p.hunting = true;
            p.loc = { type: 'zone', id: def.zone };
            p.settings.noTele = true; p.settings.autoHome = false;   // 團戰中不瞬移、不回家（瞬移改由快捷欄自動格決定，noTele 強制關）
            player = p;
            const st = calcStats();
            p.hp = st.maxHp; p.mp = st.maxMp;   // 進副本前補滿
            return {
                i, uid: x.uid, clan: x.clan || null, name: p.name, cls: p.cls, lv: p.lv, p, alive: true, dmg: 0, heal: 0, maxHp: st.maxHp,
                hunt: { state: 'fight', timer: 0, mon: boss, mobs: [boss], pCd: rand(200, 1200), joinCd: 1e15, warned: {} },
                deaths: p.deaths, inv0: raidConsumables(p), doll0: JSON.parse(JSON.stringify(p.dollState)), dollMs: 0, say: -99999,
                atkMs: st.atkMs, rng: weaponIsRanged(), actN: 0, castN: 0, title: x.snap.titleShown,
            };
        });
        const alive = () => ms.filter(m => m.alive);
        const down = (m, by) => {
            if (!m.alive) return;
            m.alive = false; m.p.hp = 0;
            ev(`💀 ${m.name} 被${by}擊倒了`, 'dead');
        };
        const frame = () => frames.push([t, Math.max(0, Math.round(boss.hp)), ...ms.map(m => m.alive ? Math.max(0, Math.round(m.p.hp)) : 0)]);
        ev(`🐉 ${boss.name}（Lv.${boss.lv}）出現了！HP ${fmt(boss.maxHp)}`, 'boss');
        frame();
        let target = null, retarget = 0, breathIn = rand(RAID_BREATH_CD[0], RAID_BREATH_CD[1]), tele = 0, enraged = false, win = false;
        while (t < limit) {
            t += TICK_MS;
            gameNow = t0 + t;
            // 隊員行動
            for (const m of ms) {
                if (!m.alive) continue;
                player = m.p; hunt = m.hunt;
                dollAbilityTick(TICK_MS);
                m.dollMs += TICK_MS;
                if (!player.hunting || !hunt) continue;   // 彈藥用完等：停在旁邊
                const st = calcStats();
                autoSupport(st);
                const enchantBefore = boss.hp;
                bossEnchantTick(st);
                m.dmg += Math.max(0, enchantBefore - boss.hp);
                if (boss.hp <= 0) break;
                hunt.pCd -= TICK_MS;
                if (hunt.pCd <= 0) {
                    hunt.pCd = st.atkMs;
                    const hb = boss.hp, logN = logSeq;
                    m.actN++;
                    if (raidAllyHeal(m, st, ms, ev, t, mk)) m.castN++;
                    else { playerAction(st); if (gameLog.some(l => l.seq > logN && /magic/.test(l.cls))) m.castN++; }
                    if (hunt && hunt.mon) resonanceFlush(st);
                    m.dmg += Math.max(0, hb - boss.hp);
                    // 技能訊息挑一些放進重播（每人最多 4 秒一則）
                    if (t - m.say >= 4000) {
                        const line = gameLog.filter(l => l.seq > logN && /magic|crit|heal/.test(l.cls)).pop();
                        if (line) { ev(line.msg.includes('你') ? line.msg.replace(/你/g, m.name) : `${m.name}：${line.msg}`, line.cls); m.say = t; }
                    }
                }
                if (m.p.deaths > m.deaths) down(m, boss.name);
                if (t % REGEN_MS === 0 && m.alive) regenTick();
                cleanBuffs();
                if (boss.hp <= 0) break;
            }
            if (boss.hp <= 0) { win = true; break; }
            if (!alive().length) break;
            // 狂暴
            if (!enraged && t >= RAID_ENRAGE_MS && limit > RAID_ENRAGE_MS) {
                enraged = true;
                boss.dmg = boss.dmg.map(v => Math.round(v * 1.5));
                if (boss.magic) boss.magic = Object.assign({}, boss.magic, { dmg: boss.magic.dmg.map(v => Math.round(v * 1.5)) });
                boss.spd = Math.round(boss.spd * 0.75);
                ev(`😡 ${boss.name}狂暴了！攻擊變得更猛烈`, 'boss');
                mk('e');
            }
            // 首領挑目標
            retarget -= TICK_MS;
            if (!target || !target.alive || retarget <= 0) {
                const pool = alive(), w = pool.map(m => m.maxHp * (RAID_TANK[m.cls] || 1));
                let r = Math.random() * w.reduce((a, b) => a + b, 0), pick = pool[pool.length - 1];
                for (let i = 0; i < pool.length; i++) { r -= w[i]; if (r <= 0) { pick = pool[i]; break; } }
                if (pick !== target) { ev(`👁️ ${boss.name}盯上了 ${pick.name}`, 'warn'); mk('g', pick.i); }
                target = pick; retarget = RAID_RETARGET_MS;
            }
            // 首領普攻
            boss.atkCd -= TICK_MS;
            if (boss.atkCd <= 0) {
                boss.atkCd = boss.spd;
                if (gameNow >= boss.stunUntil) {
                    player = target.p; hunt = target.hunt;
                    mk('x', target.i);
                    monsterAttack(calcStats(), boss);
                    if (target.p.deaths > target.deaths) down(target, boss.name);
                    if (boss.hp <= 0) { win = true; break; }   // 反擊打倒
                }
            }
            // 全體吐息：蓄力 1.6 秒，時間到每人依「自動閃避」設定判定躲開
            if (tele > 0) {
                tele -= TICK_MS;
                if (tele <= 0) {
                    mk('b');
                    const name = boss.magic ? boss.magic.name : '龍之吐息';
                    let hit = 0, dodged = 0;
                    for (const m of alive()) {
                        player = m.p; hunt = m.hunt;
                        if (chance(player.settings.autoDodge ? 0.6 : 0.2)) { dodged++; continue; }
                        const st = calcStats(), base = boss.magic ? boss.magic.dmg : boss.dmg;
                        let d = rand(base[0], base[1]) * RAID_BREATH_MUL * (1 - clamp(st.mr, 0, 150) / 200);
                        d = Math.max(0, Math.round(d - st.reduce));
                        if (st.absorb && player.mp > 0) { const a = Math.min(player.mp, Math.floor(d * st.absorb)); player.mp -= a; d -= a; }
                        d = bossEnchantAbsorb(Math.max(0, Math.round(bossEnchantEnemyDamage(boss, d)*(typeof talentIncomingMult==='function'?talentIncomingMult(true):1))));
                        d = dollTakeDamage(d, st);
                        hit++;
                        if (player.hp <= 0) down(m, `「${name}」`);
                    }
                    ev(`🔥 ${boss.name}的「${name}」！${hit} 人中招${dodged ? `、${dodged} 人閃開` : ''}`, 'boss');
                    breathIn = rand(RAID_BREATH_CD[0], RAID_BREATH_CD[1]);
                }
            } else {
                breathIn -= TICK_MS;
                if (breathIn <= 0) { tele = RAID_BREATH_TELE; mk('w'); ev(`⚠️ ${boss.name}正在蓄力…`, 'warn'); }
            }
            if (t % RAID_FRAME_MS === 0) frame();
            if (!alive().length) break;
        }
        frame();
        if (win) ev(`🏆 成功討伐${boss.name}！`, 'win');
        else ev(alive().length ? `⌛ 時間到，${boss.name}逃回巢穴深處…討伐失敗` : '☠️ 全員倒下…討伐失敗', 'dead');
        const members = ms.map(m => {
            const now = raidConsumables(m.p), used = {};
            for (const id in m.inv0) {
                if (id === 'reviveScroll') continue;
                const d = m.inv0[id] - (now[id] || 0);
                if (d > 0) used[id] = d;
            }
            return { uid: m.uid, clan: m.clan, name: m.name, cls: m.cls, lv: m.lv, maxHp: m.maxHp, dmg: Math.round(m.dmg), heal: Math.round(m.heal), died: !m.alive, used,
                title: TITLES[m.title] ? m.title : undefined, atk: Math.round(m.atkMs), rng: m.rng ? 1 : 0, castR: m.actN ? Math.round(m.castN / m.actN * 100) / 100 : 0,
                dollLocks: dollSimulationLocks(m.doll0, m.p.dollState), doll: dollEquipped(m.p), dollMs: m.dollMs, dollSummonUntil: m.p.dollSummonUntil };
        });
        return {
            v: 2, raid: def.id, n: list.length, win, ms: t, enraged,
            boss: { id: boss.id, name: boss.name, icon: boss.icon, lv: boss.lv, maxHp: boss.maxHp },
            members, frames, events, marks,
        };
    } finally {
        player = keep.player; hunt = keep.hunt; session = keep.session; walkHome = keep.walkHome; gameNow = keep.gameNow; potReadyAt = keep.potReadyAt;
        gameLog.length = 0; gameLog.push(...keep.log); logSeq = keep.logSeq;
        SIM_MODE = false;
    }
}

// 補師幫隊友補血：有治癒魔法、隊友 HP 低於 50%、自己不危險時，補最危險的那位（回傳 true＝這回合用掉了）
function raidAllyHeal(m, st, ms, ev, t, mk) {
    const s = player.settings;
    if (player.hp < st.maxHp * s.healPct / 100) return false;   // 先顧自己（playerAction 會補自己）
    if (skillGcdLeft()) return false;   // 技能公共冷卻（combat.js）
    const k = slotSkills().find(k => k.type === 'heal' && player.mp >= (typeof talentManaCost==='function'?talentManaCost(k):k.mp) && !(player.cds[k.id] > gameNow));   // 技能欄裡的治癒（欄位順序優先）
    if (!k) return false;
    const hurt = ms.filter(o => o.alive && o !== m && o.p.hp < o.maxHp * 0.5).sort((a, b) => a.p.hp / a.maxHp - b.p.hp / b.maxHp)[0];
    if (!hurt) return false;
    useSkillCost(k);
    const v = rand(k.heal[0], k.heal[1]) + Math.floor(st.sp * k.spK);
    const before = hurt.p.hp;
    hurt.p.hp = Math.min(hurt.maxHp, hurt.p.hp + v);
    m.heal += hurt.p.hp - before;
    if (mk) mk('h', m.i, hurt.i);
    if (t - m.say >= 4000) { ev(`✨ ${m.name}對 ${hurt.name} 施放「${k.name}」：HP +${fmt(hurt.p.hp - before)}`, 'heal'); m.say = t; }
    return true;
}

// ───────── 獎勵（各自在自己的瀏覽器領取）─────────
// 勝利：經驗、金幣依人數分配；掉落每人各自擲一次（沿用 rollDrops）；龍類算一次討伐。不論輸贏都扣掉戰鬥中用掉的藥水與彈藥。
function raidApplyReward(res, uid, runKey) {
    if (lootRequired() && !lootActive()) return null;
    const me = res.members.find(m => m.uid === uid);
    if (!me) return null;
    if (!player.raidRuns) player.raidRuns = [];
    if (player.raidRuns.includes(runKey)) return null;   // 已經領過
    player.raidRuns.push(runKey);
    if (player.raidRuns.length > 30) player.raidRuns.shift();
    const def = RAID_BY_ID[res.raid];
    const out = { win: res.win, exp: 0, gold: 0, items: [], used: me.used };
    dollApplySimulation(me.dollLocks, me.dollMs, me.doll || null);
    for (const id in me.used) {
        const n = Math.min(me.used[id], countItem(id));
        if (id !== 'magicCrystal') consumeItem(id, n);
    }
    dollApplySummonResult(me.dollSummonUntil, me.used.magicCrystal || 0);
    if (!res.win || !def) { addLog(`🐉 團隊副本：討伐${res.boss.name}失敗`, 'warn'); return out; }
    // 血盟加成：同血盟 2 人以上（包含自己）經驗、金幣各 +10%（clan.js）
    const clanN = me.clan ? res.members.filter(m => m.clan === me.clan).length : 0;
    const bonus = clanN >= 2 ? 1 + CLAN_RAID_BONUS : 1;
    if (bonus > 1) out.clanBonus = clanN;
    const boss = makeMonster(def.boss), share = raidShare(res.n) * bonus;
    out.exp = Math.max(1, Math.floor(boss.exp * def.reward * share * EXP_RATE * huntExpRate(player.lv)));
    out.gold = Math.round(rand(boss.gold[0], boss.gold[1]) * def.reward * share);
    player.gold += out.gold;
    if (!player.raidCd) player.raidCd = {};
    player.raidCd[def.id] = Date.now() + def.cdH * 3600 * 1000;
    addLog(`🏆 團隊副本：討伐${boss.name}！經驗 +${fmt(out.exp)}、金幣 +${fmt(out.gold)}`, 'boss');
    gainExp(out.exp);
    const seq = logSeq;
    if (lootActive()) lootRaid(runKey, lootChar());
    else rollDrops(boss, { drops: [] }, true);
    out.items = gameLog.filter(l => l.seq > seq && /^🎁|^🪙/.test(l.msg)).map(l => l.msg);
    if (boss.dragon) {
        const first = !player.dragons[boss.id];
        player.dragons[boss.id] = (player.dragons[boss.id] || 0) + 1;
        if (first && hasDragonTitle()) {
            addLog('👑 四大龍全數討伐，獲得稱號「屠龍勇者」！', 'boss');
            out.title = true;
        }
    }
    return out;
}

// 把獎勵發給「參加的那個角色」：正在玩就直接給，不然打開那個欄位的存檔給完再存回去
function raidClaim(res, runKey, charId) {
    const uid = cloudUser && cloudUser.id;
    if (!uid) return null;
    if (player && cloudCharId({ player }) === charId) {
        const out = raidApplyReward(res, uid, runKey);
        if (out) { saveGame(); refreshUI(); }
        return out;
    }
    for (let i = 0; i < MAX_SLOTS; i++) {
        const raw = cloudLs(slotKey(i));
        if (!raw) continue;
        let data;
        try { data = saveParse(raw); } catch (e) { continue; }
        if (cloudCharId(data) !== charId) continue;
        if (saveOwnerOf(data) && saveOwnerOf(data) !== uid) continue;   // 屬於別的帳號的角色不動
        const keep = player;
        let out;
        try {
            player = guardWrap(migrateSave(data));
            out = raidApplyReward(res, uid, runKey);
            if (out) {
                cloudLs(slotKey(i), saveEncode(JSON.stringify(Object.assign({}, data, { schema: SAVE_SCHEMA, t: Date.now(), player }))));   // 保留 owner
                cloudMarkDirty(i);
            }
        } finally { player = keep; }
        return out;
    }
    return null;
}

// ───────── 雲端：隊伍資料 ─────────
let raidRoom = null;       // 目前所在隊伍（raid_rooms 一列）
let raidMembers = [];      // 隊員（raid_members）
let raidPollTimer = null;
let raidBusy = false;
let raidList = null;       // 公開隊伍列表（null＝還沒讀）
let raidMsg = '';
let raidPick = 'drake';    // 建立隊伍時選的副本
let raidReplay = null;     // { res, key, start, claimed, reward }

function raidReady() { return isCloudConfigured() && cloudLoggedIn() && !cloudBan; }
function raidRunKey(room) { return `${room.id}:${room.round}`; }
function raidIsLeader() { return !!(raidRoom && cloudUser && raidRoom.leader === cloudUser.id); }
function raidMe() { return cloudUser ? raidMembers.find(m => m.user_id === cloudUser.id) : null; }
function raidMemberReady(m) { return !!(raidRoom && m.ready_round === raidRoom.round && m.snap); }

function raidErr(e) {
    const m = String((e && e.message) || e || '');
    if (/room full/i.test(m)) return '隊伍已滿（8 人）';
    if (/room closed|not open/i.test(m)) return '隊伍已經開始或解散了';
    return cloudErrText(e);
}

function raidSetMsg(t) { raidMsg = t; raidRender(); }

async function raidQ(p) {
    const r = await cloudTimeout(p);
    if (r.error) throw r.error;
    return r.data;
}

function raidCode() {
    let s = '';
    for (let i = 0; i < 6; i++) s += RAID_CODE_CHARS[Math.floor(Math.random() * RAID_CODE_CHARS.length)];
    return s;
}

async function raidCreate(raidId) {
    const def = RAID_BY_ID[raidId];
    if (!raidReady() || raidBusy || !def || !player) return;
    const why = raidBlockReason(def);
    if (why) { showToast(why); return; }
    raidBusy = true; raidSetMsg('建立隊伍中…');
    try {
        let room = null;
        for (let i = 0; i < 5 && !room; i++) {
            const r = await cloudTimeout(cloudSb.from('raid_rooms').insert({
                code: raidCode(), raid: def.id, leader: cloudUser.id, leader_name: player.name, status: 'open', round: 1, version: GAME_VERSION, is_public: true,
            }).select().single());
            if (r.error && r.error.code === '23505') continue;   // 房號重複，換一個
            if (r.error) throw r.error;
            room = r.data;
        }
        if (!room) throw new Error('建立失敗，請再試一次');
        await raidQ(cloudSb.from('raid_members').insert(raidMemberRow(room.id)));
        await raidEnter(room.id);
        raidMsg = '';
        showToast(`已建立隊伍，房號 ${room.code}`);
    } catch (e) { raidMsg = '⚠️ ' + raidErr(e); }
    raidBusy = false;
    raidRender();
}

function raidMemberRow(roomId) {
    const row = { room_id: roomId, user_id: cloudUser.id, name: player.name, cls: player.cls, lv: player.lv, char_id: cloudCharId({ player }), ready_round: 0, snap: null };
    if (myClan) row.clan_id = myClan.id;   // 血盟加成用（clan.js）
    return row;
}

async function raidJoinCode() {
    const el = document.getElementById('raid-code');
    const code = ((el && el.value) || '').trim().toUpperCase();
    if (!/^[A-Z0-9]{6}$/.test(code)) { showToast('請輸入 6 碼房號'); return; }
    if (!raidReady() || raidBusy) return;
    raidBusy = true; raidSetMsg('尋找隊伍中…');
    try {
        const rows = await raidQ(cloudSb.from('raid_rooms').select('*').eq('code', code).limit(1));
        if (!rows || !rows.length) throw new Error('找不到這個房號');
        raidBusy = false;
        await raidJoin(rows[0].id);
        return;
    } catch (e) { raidMsg = '⚠️ ' + raidErr(e); }
    raidBusy = false;
    raidRender();
}

async function raidJoin(roomId) {
    if (!raidReady() || raidBusy || !player) return;
    raidBusy = true; raidSetMsg('加入隊伍中…');
    try {
        const rows = await raidQ(cloudSb.from('raid_rooms').select('*').eq('id', roomId).limit(1));
        const room = rows && rows[0];
        if (!room || room.status !== 'open') throw new Error('room closed');
        if (room.version !== GAME_VERSION) throw new Error(`隊長的遊戲版本不同（${room.version}），請雙方都重新整理到最新版`);
        const def = RAID_BY_ID[room.raid];
        const why = def ? raidBlockReason(def) : '未知的副本';
        if (why) throw new Error(why);
        // 用 insert（不用 upsert）：upsert 會連帶檢查「看得到這一列」，加入前還不是隊員會被 RLS 擋下。已經在隊伍裡（主鍵重複）就當作加入成功
        const ins = await cloudTimeout(cloudSb.from('raid_members').insert(raidMemberRow(room.id)));
        if (ins.error && ins.error.code !== '23505') throw ins.error;
        await raidEnter(room.id);
        raidMsg = '';
        showToast('已加入隊伍');
    } catch (e) { raidMsg = '⚠️ ' + raidErr(e); }
    raidBusy = false;
    raidRender();
}

// 進入隊伍：記住房號、開始定時更新
async function raidEnter(roomId) {
    cloudLs(RAID_ROOM_KEY, roomId);
    await raidRefresh(roomId);
    raidStartPoll();
}

function raidStartPoll() {
    if (raidPollTimer) return;
    raidPollTimer = setInterval(() => { if (raidRoom && !document.hidden && cloudCanCall()) raidRefresh(raidRoom.id); }, RAID_POLL_MS);
}

function raidStopPoll() {
    if (raidPollTimer) clearInterval(raidPollTimer);
    raidPollTimer = null;
}

function raidReset(msg) {
    raidRoom = null; raidMembers = []; raidReplay = null;
    cloudLs(RAID_ROOM_KEY, null);
    raidStopPoll();
    if (msg) raidMsg = msg;
}

let raidRefreshing = false;
async function raidRefresh(roomId) {
    if (!raidReady() || raidRefreshing) return;
    raidRefreshing = true;
    try {
        const rooms = await raidQ(cloudSb.from('raid_rooms').select('*').eq('id', roomId).limit(1));
        const room = rooms && rooms[0];
        if (!room || room.status === 'closed') { raidReset(room ? '隊長解散了隊伍' : '隊伍已不存在'); return; }
        const members = await raidQ(cloudSb.from('raid_members').select('*').eq('room_id', roomId).order('joined_at'));
        if (!members.some(m => m.user_id === cloudUser.id)) { raidReset('你已離開隊伍（或被隊長請出）'); return; }
        const was = raidRoom;
        raidRoom = room; raidMembers = members;
        // 開戰：拿到結果就先發獎勵（重播只是觀看）
        if ((room.status === 'fighting' || room.status === 'done') && room.result && (!lootRequired() || lootActive())) {
            const key = raidRunKey(room);
            if (!raidReplay || raidReplay.key !== key) {
                const me = raidMe();
                raidReplay = { res: room.result, key, start: Date.parse(room.started_at) || Date.now(), reward: null, skip: false };
                if (me && room.result.members.some(m => m.uid === cloudUser.id)) raidReplay.reward = raidClaim(room.result, key, me.char_id);
                if (!was || was.status === 'open') showToast('⚔️ 團隊副本開戰！');
            }
        } else if (room.status === 'open' && raidReplay) {
            raidReplay = null;   // 隊長開了下一場
        }
    } catch (e) {
        raidMsg = '⚠️ ' + raidErr(e);
    } finally {
        raidRefreshing = false;
        raidRender();
    }
}

async function raidToggleReady() {
    const me = raidMe();
    if (!raidRoom || !me || raidBusy || raidRoom.status !== 'open') return;
    const ready = raidMemberReady(me);
    if (!ready) {
        if (!player) return;
        if (cloudCharId({ player }) !== me.char_id) { showToast('請用加入隊伍時的角色準備，或離開隊伍重新加入'); return; }
        const why = raidBlockReason(RAID_BY_ID[raidRoom.raid]);
        if (why) { showToast(why); return; }
        if (player.loc.type !== 'town') { showToast('請先回到村莊再準備（準備時會記錄目前的裝備與藥水）'); return; }
    }
    raidBusy = true;
    try {
        saveGame();
        const row = ready ? { ready_round: 0 } : { ready_round: raidRoom.round, snap: raidSnapshot(), name: player.name, lv: player.lv, cls: player.cls };
        await raidQ(cloudSb.from('raid_members').update(row).eq('room_id', raidRoom.id).eq('user_id', cloudUser.id));
    } catch (e) { raidMsg = '⚠️ ' + raidErr(e); }
    raidBusy = false;
    await raidRefresh(raidRoom.id);
}

async function raidLeave() {
    if (!raidRoom || raidBusy) return;
    const leader = raidIsLeader();
    gameConfirm('離開隊伍', leader ? '你是隊長，離開後隊伍會解散。確定離開？' : '確定離開隊伍？', async () => {
        raidBusy = true;
        try {
            if (leader) await raidQ(cloudSb.from('raid_rooms').update({ status: 'closed' }).eq('id', raidRoom.id));
            await raidQ(cloudSb.from('raid_members').delete().eq('room_id', raidRoom.id).eq('user_id', cloudUser.id));
        } catch (e) { console.warn('離開隊伍失敗', e); }
        raidBusy = false;
        raidReset('');
        raidRender();
    }, '離開');
}

async function raidKick(uid) {
    if (!raidIsLeader() || raidBusy) return;
    const m = raidMembers.find(x => x.user_id === uid);
    if (!m) return;
    gameConfirm('請出隊伍', `確定把 ${m.name} 請出隊伍？`, async () => {
        try { await raidQ(cloudSb.from('raid_members').delete().eq('room_id', raidRoom.id).eq('user_id', uid)); }
        catch (e) { showToast(raidErr(e)); }
        raidRefresh(raidRoom.id);
    }, '請出');
}

async function raidTogglePublic() {
    if (!raidIsLeader() || raidBusy) return;
    try { await raidQ(cloudSb.from('raid_rooms').update({ is_public: !raidRoom.is_public }).eq('id', raidRoom.id)); }
    catch (e) { showToast(raidErr(e)); }
    raidRefresh(raidRoom.id);
}

// 隊長開戰：讀最新的隊員快照 → 模擬 → 結果寫回（status＝fighting，伺服器記下開戰時間）
async function raidStart() {
    if (!raidIsLeader() || raidBusy || raidRoom.status !== 'open') return;
    raidBusy = true; raidSetMsg('開戰中…');
    try {
        const members = await raidQ(cloudSb.from('raid_members').select('*').eq('room_id', raidRoom.id).order('joined_at'));
        const ready = members.filter(m => m.ready_round === raidRoom.round && m.snap);
        if (ready.length !== members.length) throw new Error('還有隊員沒準備好');
        if (!ready.length) throw new Error('沒有隊員');
        const def = RAID_BY_ID[raidRoom.raid];
        for (const m of ready) {
            const why = raidBlockReason(def, m.snap);
            if (why) throw new Error(`${m.name}：${why}`);
        }
        const res = raidSimulate(def, ready.map(m => ({ uid: m.user_id, name: m.name, snap: m.snap, clan: m.clan_id || null })));
        await raidQ(cloudSb.from('raid_rooms').update({ status: 'fighting', result: res }).eq('id', raidRoom.id).eq('status', 'open'));
        raidMsg = '';
    } catch (e) { raidMsg = '⚠️ ' + raidErr(e); }
    raidBusy = false;
    await raidRefresh(raidRoom.id);
}

// 隊長：同一隊再打一場（大家要重新準備）
async function raidAgain() {
    if (!raidIsLeader() || raidBusy) return;
    raidBusy = true;
    try { await raidQ(cloudSb.from('raid_rooms').update({ status: 'open', round: raidRoom.round + 1, result: null }).eq('id', raidRoom.id)); }
    catch (e) { showToast(raidErr(e)); }
    raidBusy = false;
    raidReplay = null;
    raidRefresh(raidRoom.id);
}

async function raidLoadList() {
    if (!raidReady()) return;
    raidList = raidList || [];
    try {
        const since = new Date(Date.now() - RAID_LIST_MAX_AGE_MS).toISOString();
        raidList = await raidQ(cloudSb.from('raid_rooms').select('id, code, raid, leader_name, member_count, created_at')
            .eq('status', 'open').eq('is_public', true).eq('version', GAME_VERSION).gt('created_at', since)
            .order('created_at', { ascending: false }).limit(20));
    } catch (e) { raidMsg = '⚠️ ' + raidErr(e); }
    raidRender();
}

// 重新整理頁面後，自動回到原本的隊伍
function raidResume() {
    const id = cloudLs(RAID_ROOM_KEY);
    if (id && raidReady() && !raidRoom) { raidRefresh(id).then(() => { if (raidRoom) raidStartPoll(); }); }
}

// ───────── 畫面 ─────────
function raidRender() {
    if (typeof currentTab !== 'undefined' && tabOpen('raid') && player && !SIM_MODE) renderPanel();
}

function renderRaid() {
    if (!isCloudConfigured()) return `<div class="panel notice">團隊副本需要雲端伺服器，目前尚未開通。</div>`;
    if (!cloudLoggedIn()) return `<div class="panel notice">團隊副本要先登入帳號（和朋友組隊需要知道你是誰）。
        <div class="btn-row"><button onclick="cloudLoginFromGame()">☁️ 回標題畫面登入</button></div></div>`;
    if (cloudBan) return `<div class="panel notice">⛔ 帳號已被管理者停權，無法使用團隊副本。<br><small>原因：${esc(cloudBan.reason || '（未填寫）')}</small></div>`;
    if (!raidRoom) raidResume();
    const msg = raidMsg ? `<div class="panel notice">${esc(raidMsg)}</div>` : '';
    if (raidRoom && raidReplay) return msg + raidReplayHtml();
    if (raidRoom) return msg + raidLobbyHtml();
    if (raidList === null) raidLoadList();
    return msg + raidHomeHtml();
}

function raidHomeHtml() {
    const cards = RAIDS.map(def => {
        const m = MONSTERS[def.boss], why = raidBlockReason(def);
        return `<div class="list-row ${raidPick === def.id ? 'raid-pick' : ''} ${why ? 'locked' : ''}">
            <div class="clickable" onclick="raidPickRaid('${def.id}')"><b>${m.icon || '🐉'} ${m.name}</b>
            <small>需求 Lv.${def.reqLv}｜冷卻 ${def.cdH} 小時｜${esc(def.desc)}${why ? `<br><span class="bad">${esc(why)}</span>` : ''}</small></div>
            <button class="mini" onclick="raidCreate('${def.id}')" ${why ? 'disabled' : ''}>建立隊伍</button></div>`;
    }).join('');
    const list = (raidList || []).map(r => {
        const def = RAID_BY_ID[r.raid], m = def ? MONSTERS[def.boss] : null;
        return `<div class="list-row"><div><b>${m ? m.icon + ' ' + m.name : r.raid}</b><small>隊長 ${esc(r.leader_name || '')}｜${r.member_count}/${RAID_MAX} 人｜房號 ${esc(r.code)}</small></div>
            <button class="mini" onclick="raidJoin('${r.id}')" ${r.member_count >= RAID_MAX ? 'disabled' : ''}>加入</button></div>`;
    }).join('') || '<small class="muted">目前沒有公開的隊伍，自己建立一個吧！</small>';
    return `<div class="panel"><h4>🐉 團隊副本</h4>
            <small class="muted">最多 ${RAID_MAX} 人組隊打龍。建立隊伍後把 6 碼房號傳給朋友；大家在村莊按「準備」，隊長按「開始」就會一起開打（自動戰鬥，全隊同步觀看）。
            人越多龍越硬，但經驗、金幣、掉落都有份。</small></div>
        <div class="panel"><h4>🔑 用房號加入</h4>
            <div class="btn-row"><input type="text" id="raid-code" maxlength="6" placeholder="例如 K7QX2M" style="text-transform:uppercase;width:140px">
            <button onclick="raidJoinCode()">加入</button></div></div>
        <div class="panel"><h4>⚔️ 建立隊伍</h4><div class="list">${cards}</div></div>
        <div class="panel"><h4>📋 公開隊伍 <button class="mini secondary" onclick="raidLoadList()">重新整理</button></h4><div class="list">${list}</div></div>`;
}

function raidPickRaid(id) { raidPick = id; raidRender(); }

function raidLobbyHtml() {
    const r = raidRoom, def = RAID_BY_ID[r.raid], boss = MONSTERS[def.boss], leader = raidIsLeader(), me = raidMe();
    const rows = [];
    for (let i = 0; i < RAID_MAX; i++) {
        const m = raidMembers[i];
        if (!m) { rows.push(`<div class="raid-slot empty">空位</div>`); continue; }
        const c = CLASSES[m.cls] || {};
        const ok = raidMemberReady(m);
        rows.push(`<div class="raid-slot ${ok ? 'ready' : ''}"><span>${c.icon || '🧝'} <b>${esc(m.name)}</b> <small>${c.name || ''} Lv.${m.lv}</small>${m.user_id === r.leader ? ' 👑' : ''}</span>
            <span>${ok ? '✅ 準備' : '⌛ 未準備'}${leader && m.user_id !== cloudUser.id ? ` <button class="mini secondary" onclick="raidKick('${m.user_id}')">請出</button>` : ''}</span></div>`);
    }
    const allReady = raidMembers.length > 0 && raidMembers.every(raidMemberReady);
    const mine = me && raidMemberReady(me);
    const wrongChar = me && player && cloudCharId({ player }) !== me.char_id;
    return `<div class="panel"><h4>${boss.icon || '🐉'} ${boss.name}（需求 Lv.${def.reqLv}）</h4>
            <div class="raid-code">房號 <b>${esc(r.code)}</b></div>
            <small class="muted">把房號傳給朋友，在「🐉 團隊副本 → 用房號加入」輸入。${raidMembers.length}/${RAID_MAX} 人。
            ${leader ? `隊伍目前${r.is_public ? '公開（任何人都能從列表加入）' : '不公開（只能用房號加入）'}。` : ''}</small>
            ${wrongChar ? `<p class="bad">你現在用的角色不是加入隊伍時的角色，請切換回去或離開隊伍。</p>` : ''}
        </div>
        <div class="panel raid-slots">${rows.join('')}</div>
        <div class="panel"><div class="btn-row">
            <button onclick="raidToggleReady()" ${raidBusy ? 'disabled' : ''}>${mine ? '取消準備' : '✅ 準備'}</button>
            ${leader ? `<button onclick="raidStart()" ${!allReady || raidBusy ? 'disabled' : ''}>⚔️ 開始</button>
                <button class="secondary" onclick="raidTogglePublic()">${r.is_public ? '改為不公開' : '改為公開'}</button>` : ''}
            <button class="secondary" onclick="chatOpen('room')">💬 隊伍聊天</button>
            <button class="danger" onclick="raidLeave()">${leader ? '解散隊伍' : '離開隊伍'}</button></div>
            <small class="muted">按「準備」會記錄你目前的能力、裝備、技能與藥水（要在村莊）。戰鬥中會自動喝水、施法；用掉的藥水會從背包扣除。
            ${leader ? '全員準備好後就能開始。' : '等隊長開始。'}</small></div>`;
}

// 重播：依開戰時間算出現在播到哪裡（所有人看到同一刻）
function raidReplayPos() {
    const rp = raidReplay, total = rp.res.ms;
    if (rp.skip) return total;
    return clamp((Date.now() - rp.start) * RAID_REPLAY_SPEED, 0, total);
}

function raidReplayHtml() {
    const rp = raidReplay, res = rp.res, pos = raidReplayPos(), done = pos >= res.ms;
    let f = res.frames[0];
    for (const x of res.frames) { if (x[0] <= pos) f = x; else break; }
    const pct = (a, b) => b > 0 ? clamp(a / b * 100, 0, 100) : 0;
    const bossHp = f[1];
    const mem = res.members.map((m, i) => {
        const hp = f[2 + i], c = CLASSES[m.cls] || {};
        const me = cloudUser && m.uid === cloudUser.id;
        return `<div class="raid-mem ${hp <= 0 ? 'down' : ''} ${me ? 'me' : ''}"><span>${c.icon || '🧝'} ${esc(m.name)}</span>
            <div class="raid-bar hp"><div style="width:${pct(hp, m.maxHp)}%"></div><b>${hp <= 0 ? '倒下' : fmt(hp) + '/' + fmt(m.maxHp)}</b></div></div>`;
    }).join('');
    const evs = res.events.filter(e => e[0] <= pos).slice(-14).reverse()
        .map(e => `<div class="log-line ${e[2]}">[${Math.floor(e[0] / 60000)}:${String(Math.floor(e[0] / 1000) % 60).padStart(2, '0')}] ${esc(e[1])}</div>`).join('');
    let foot = '';
    if (done) {
        const rank = res.members.slice().sort((a, b) => b.dmg - a.dmg)
            .map((m, i) => `<div class="list-row"><span>${i + 1}. ${esc(m.name)}${m.died ? ' 💀' : ''}</span><small>傷害 ${fmt(m.dmg)}${m.heal ? `｜治療 ${fmt(m.heal)}` : ''}</small></div>`).join('');
        foot = `<div class="panel"><h4>${res.win ? '🏆 討伐成功！' : '☠️ 討伐失敗'}</h4>${raidRewardHtml(rp.reward)}
            <h4>📊 傷害排行</h4><div class="list">${rank}</div>
            <div class="btn-row">${raidIsLeader() ? '<button onclick="raidAgain()">🔁 同一隊再打一場</button>' : '<small class="muted">等隊長決定要不要再打一場。</small>'}
            <button class="danger" onclick="raidLeave()">${raidIsLeader() ? '解散隊伍' : '離開隊伍'}</button></div></div>`;
    }
    return `<div class="panel"><h4>${res.boss.icon || '🐉'} ${esc(res.boss.name)}（Lv.${res.boss.lv}）・${res.n} 人</h4>
            <div class="raid-bar boss"><div style="width:${pct(bossHp, res.boss.maxHp)}%"></div><b>${fmt(bossHp)} / ${fmt(res.boss.maxHp)}</b></div>
            <small class="muted">${done ? '戰鬥結束' : `戰鬥中…${Math.floor(pos / 1000)} 秒`}</small>
            ${done ? '' : '<div class="btn-row"><button class="mini secondary" onclick="raidSkip()">⏩ 直接看結果</button></div>'}</div>
        <div class="raid-scene" id="raid-scene-slot"></div>${raidSceneEnsure()}
        <div class="panel raid-mems">${mem}</div>
        <div class="panel raid-log">${evs}</div>${foot}`;
}

function raidRewardHtml(r) {
    if (!r) return '<p class="muted">（這場的獎勵已經領過，或你沒有參加這場）</p>';
    const used = Object.keys(r.used || {}).map(id => `${ITEMS[id] ? ITEMS[id].name : id} ×${r.used[id]}`).join('、');
    if (!r.win) return `<p>沒有獲得獎勵。${used ? `<br><small class="muted">消耗：${esc(used)}</small>` : ''}</p>`;
    return `<p>經驗 +${fmt(r.exp)}、金幣 +${fmt(r.gold)}${r.clanBonus ? `<br><small class="good">🏰 血盟加成 +${CLAN_RAID_BONUS * 100}%（同血盟 ${r.clanBonus} 人）</small>` : ''}</p>${r.items.length ? `<p>${r.items.map(esc).join('<br>')}</p>` : ''}
        ${r.title ? '<p class="good">👑 獲得稱號「屠龍勇者」！</p>' : ''}${used ? `<small class="muted">消耗：${esc(used)}</small>` : ''}`;
}

function raidSkip() { if (raidReplay) { raidReplay.skip = true; raidRender(); } }

// ───────── 重播戰鬥場景（2026-10-31，第 255 節）─────────
// 依重播結果畫出「隊員一起打龍」的影像：首領在中間、隊員用各自的職業模型圍成兩排（坦職在前），
// 血量變化 → 受傷動作與飄字，marks（v2）→ 首領出手方向、吐息蓄力與爆發、補師補血。只是畫面，不影響戰鬥結果與獎勵。
// 畫布只建立一次，分頁每秒重畫時在下一個 requestAnimationFrame（畫面更新前）搬回新的 #raid-scene-slot，不會閃。
const RAID_SCENE_BG = { drake: 'art-earth-lair', wyvern: 'art-wind-lair', antharas: 'art-earth-lair', fafurion: 'art-water-lair', lindvior: 'art-wind-lair', valakas: 'art-fire-lair' };
let raidSceneCv = null, raidSceneRaf = 0, raidSceneSt = null;

function raidSceneEnsure() {
    if (!raidSceneRaf) raidSceneRaf = requestAnimationFrame(raidSceneLoop);
    return '';
}

function raidSceneLoop() {
    raidSceneRaf = 0;
    const slot = document.getElementById('raid-scene-slot');
    if (!slot || !raidReplay) return;   // 離開分頁或重播結束：停下來，下次畫重播時再開
    if (!raidSceneCv) raidSceneCv = document.createElement('canvas');
    if (raidSceneCv.parentNode !== slot) slot.appendChild(raidSceneCv);
    const W = Math.max(240, slot.clientWidth), H = Math.round(clamp(W * 0.6, 220, 420)), dpr = Math.min(2, window.devicePixelRatio || 1);
    if (raidSceneCv.width !== Math.round(W * dpr) || raidSceneCv.height !== Math.round(H * dpr)) {
        raidSceneCv.width = Math.round(W * dpr); raidSceneCv.height = Math.round(H * dpr);
        raidSceneCv.style.width = W + 'px'; raidSceneCv.style.height = H + 'px';
    }
    const ctx = raidSceneCv.getContext('2d');
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    try { raidSceneDraw(ctx, W, H); } catch (e) { console.warn('raid scene', e); }
    raidSceneRaf = requestAnimationFrame(raidSceneLoop);
}

// 0～1 的固定亂數（同一場重播每次看都一樣）
function raidSceneRnd(a, b) { const x = Math.sin(a * 12.9898 + b * 78.233) * 43758.5453; return x - Math.floor(x); }
// 已排序的 [[t, …]] 裡最後一筆 t ≤ pos
function raidSceneLast(list, pos) {
    let lo = 0, hi = list.length - 1, r = null;
    while (lo <= hi) { const mid = (lo + hi) >> 1; if (list[mid][0] <= pos) { r = list[mid]; lo = mid + 1; } else hi = mid - 1; }
    return r;
}

function raidSceneInit(res, key) {
    const marks = res.marks || [], by = c => marks.filter(x => x[1] === c);
    const tanks = [], backs = [];
    res.members.forEach((m, i) => ((RAID_TANK[m.cls] || 1) >= 2 && !m.rng ? tanks : backs).push(i));
    if (!tanks.length && backs.length > 2) tanks.push(backs.shift());
    // 站位：首領腳下為圓心的兩圈橢圓（比例座標，畫的時候乘上畫布大小）
    const spots = [];
    const ring = (list, rx, ry, a0, a1) => list.forEach((idx, k) => {
        const a = (a0 + (a1 - a0) * (k + 1) / (list.length + 1)) * Math.PI / 180;
        spots[idx] = { x: 0.5 + Math.cos(a) * rx, y: 0.5 + Math.sin(a) * ry };
    });
    ring(tanks, 0.24, 0.24, 20, 160);
    ring(backs, 0.4, 0.4, backs.length > 4 ? 8 : 30, backs.length > 4 ? 172 : 150);
    return {
        key, spots, fi: 0, lastPos: -1, floats: [], fx: [], tfx: [], hurtAt: res.members.map(() => -1e9), bossHitAt: -1e9,
        g: by('g'), x: by('x'), w: by('w'), b: by('b'), e: by('e'),
        heal: res.members.map((_, i) => marks.filter(x => x[1] === 'h' && x[2] === i)),
        healed: marks.filter(x => x[1] === 'h'),
    };
}

function raidSceneDraw(ctx, W, H) {
    const rp = raidReplay, res = rp.res, pos = raidReplayPos(), now = performance.now(), SP = RAID_REPLAY_SPEED;
    if (!raidSceneSt || raidSceneSt.key !== rp.key) raidSceneSt = raidSceneInit(res, rp.key);
    const st = raidSceneSt, S = H / 260;
    const bx = W / 2, by = H * 0.5;   // 首領腳底
    const memPos = i => { const s = st.spots[i] || { x: 0.5, y: 0.8 }; return { x: bx + (s.x - 0.5) * W, y: clamp(by + (s.y - 0.5) * H, 40, H - 12) }; };
    // 血量：照 0.5 秒一格的 frames；新的一格出現時產生飄字、受傷動作（跳很多時，例如直接看結果，就不補飄字）
    const fr = res.frames;
    if (pos < st.lastPos) { st.fi = 0; st.floats = []; }
    if (pos - st.lastPos > 3000) while (st.fi + 1 < fr.length && fr[st.fi + 1][0] <= pos) st.fi++;
    while (st.fi + 1 < fr.length && fr[st.fi + 1][0] <= pos) {
        const a = fr[st.fi], b = fr[st.fi + 1];
        st.fi++;
        const bd = a[1] - b[1];
        if (bd > 0) { st.bossHitAt = b[0]; st.floats.push({ x: bx + rand(-30, 30) * S, y: by - 70 * S, text: '-' + fmt(bd), color: '#ffe27a', size: 15, born: now }); }
        res.members.forEach((m, i) => {
            const d = b[2 + i] - a[2 + i], p = memPos(i);
            if (d < 0 && b[2 + i] > 0) { st.hurtAt[i] = b[0]; st.floats.push({ x: p.x, y: p.y - 52 * S, text: '-' + fmt(-d), color: '#ff6a5a', size: 12, born: now }); }
            else if (d < 0) st.floats.push({ x: p.x, y: p.y - 52 * S, text: '倒下', color: '#bbb', size: 12, born: now });
            else if (d > 0 && a[2 + i] > 0) st.floats.push({ x: p.x, y: p.y - 52 * S, text: '+' + fmt(d), color: '#7dffa0', size: 12, born: now });
        });
    }
    st.lastPos = pos;
    const f = fr[st.fi] || fr[0];
    const bossAlive = f[1] > 0, ended = pos >= res.ms;

    // 背景：龍穴圖（cover）＋暗角
    const bgDef = SCENE_ART_BGS[RAID_SCENE_BG[res.raid] || 'art-earth-lair'], bg = bgDef && spriteImage(bgDef.src);
    ctx.fillStyle = '#120d0b'; ctx.fillRect(0, 0, W, H);
    if (bg) {
        const k = Math.max(W / bg.naturalWidth, H / bg.naturalHeight), dw = bg.naturalWidth * k, dh = bg.naturalHeight * k;
        ctx.drawImage(bg, (W - dw) / 2, (H - dh) / 2, dw, dh);
    }
    const vg = ctx.createRadialGradient(W / 2, H / 2, Math.min(W, H) * 0.3, W / 2, H / 2, Math.hypot(W, H) * 0.6);
    vg.addColorStop(0, 'rgba(0,0,0,0)'); vg.addColorStop(1, 'rgba(0,0,0,0.55)');
    ctx.fillStyle = vg; ctx.fillRect(0, 0, W, H);
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';

    // 吐息蓄力：整隊腳下的紅圈越長越大
    const tele = raidSceneLast(st.w, pos);
    if (tele && pos - tele[0] < RAID_BREATH_TELE && bossAlive && !ended) {
        const k = (pos - tele[0]) / RAID_BREATH_TELE, R = W * 0.42, Ry = H * 0.36, cy = by + H * 0.12;
        ctx.fillStyle = `rgba(220,30,20,${0.12 + 0.08 * Math.sin(now / 70)})`;
        ctx.beginPath(); ctx.ellipse(bx, cy, R, Ry, 0, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = 'rgba(255,70,30,0.25)';
        ctx.beginPath(); ctx.ellipse(bx, cy, R * k, Ry * k, 0, 0, Math.PI * 2); ctx.fill();
        ctx.strokeStyle = '#ff3a1a'; ctx.lineWidth = 2;
        ctx.beginPath(); ctx.ellipse(bx, cy, R, Ry, 0, 0, Math.PI * 2); ctx.stroke(); ctx.lineWidth = 1;
    }
    // 狂暴：首領腳下紅色光暈
    const enr = raidSceneLast(st.e, pos);
    if ((enr || (res.enraged && !st.e.length && pos >= RAID_ENRAGE_MS)) && bossAlive) {
        const g = ctx.createRadialGradient(bx, by, 4, bx, by, 90 * S);
        g.addColorStop(0, `rgba(255,40,20,${0.45 + 0.15 * Math.sin(now / 120)})`); g.addColorStop(1, 'rgba(255,40,20,0)');
        ctx.fillStyle = g; ctx.fillRect(bx - 90 * S, by - 90 * S, 180 * S, 180 * S);
    }

    const tgtMark = raidSceneLast(st.g, pos), tgt = tgtMark ? tgtMark[2] : -1;
    const actors = [];
    // 首領
    actors.push({ y: by, draw: () => {
        const id = res.boss.id, ms = MON_SPRITES[id], img = monSpriteImg(id);
        let alpha = 1;
        if (!bossAlive) alpha = clamp(1 - (pos - f[0]) / 1500, 0, 1);
        if (alpha <= 0) return;
        ctx.globalAlpha = alpha;
        ctx.fillStyle = 'rgba(0,0,0,0.45)';
        ctx.beginPath(); ctx.ellipse(bx, by, 46 * S, 13 * S, 0, 0, Math.PI * 2); ctx.fill();
        const atk = raidSceneLast(st.x, pos), atkLen = 600 * SP, atking = atk && pos - atk[0] < atkLen && bossAlive;
        const look = atking ? atk[2] : tgt;
        let face = 'down';
        if (look >= 0) { const p = memPos(look), dx = p.x - bx, dy = p.y - by; face = Math.abs(dx) > Math.abs(dy) * 1.2 ? (dx < 0 ? 'left' : 'right') : 'down'; }
        const flash = clamp(1 - (pos - st.bossHitAt) / (120 * SP), 0, 1) * 0.35;
        if (img && ms) {
            const row = { down: 0, right: 1, left: 1, up: 2 }[face] + (atking ? 3 : 0), n = ms.n[row];
            const fi = atking ? Math.min(n - 1, Math.floor((pos - atk[0]) / atkLen * n)) : Math.floor(now / 220) % ms.n[row];
            const dh = (ms.size || 62) * ms.ch / ms.body * S * 1.35, dw = ms.cw * dh / ms.ch;
            const fx = ms.cols ? (row * 2 + fi) % ms.cols * ms.cw : fi * ms.cw, fy = ms.cols ? Math.floor((row * 2 + fi) / ms.cols) * ms.ch : row * ms.ch;
            ctx.save();
            if (face === 'left') { ctx.translate(bx, 0); ctx.scale(-1, 1); ctx.translate(-bx, 0); }
            ctx.drawImage(img, fx, fy, ms.cw, ms.ch, bx - dw / 2, by + 4 * S - dh, dw, dh);
            if (flash > 0.02) ctx.drawImage(hitFlashCanvas(img, fx, fy, ms.cw, ms.ch, flash), bx - dw / 2, by + 4 * S - dh, dw, dh);
            ctx.restore();
        } else {
            ctx.font = `${Math.round(84 * S)}px "Segoe UI Emoji","Apple Color Emoji",sans-serif`;
            ctx.fillText(res.boss.icon || '🐉', bx, by - 40 * S);
        }
        ctx.globalAlpha = 1;
    } });
    // 隊員
    res.members.forEach((m, i) => {
        const p = memPos(i);
        actors.push({ y: p.y, draw: () => raidSceneMember(ctx, m, i, p, f[2 + i], { bx, by, pos, now, S, bossAlive, st }) });
    });
    actors.sort((a, b) => a.y - b.y).forEach(a => a.draw());

    // 吐息爆發：從首領往外擴散的火浪＋畫面閃一下
    const br = raidSceneLast(st.b, pos);
    if (br && pos - br[0] < 900 * SP) {
        const k = (pos - br[0]) / (900 * SP);
        ctx.fillStyle = `rgba(255,120,30,${0.28 * (1 - k)})`; ctx.fillRect(0, 0, W, H);
        ctx.strokeStyle = `rgba(255,190,80,${1 - k})`; ctx.lineWidth = 6 * (1 - k) + 1;
        ctx.beginPath(); ctx.ellipse(bx, by + H * 0.08, W * 0.5 * k, H * 0.4 * k, 0, 0, Math.PI * 2); ctx.stroke(); ctx.lineWidth = 1;
    }
    // 補血光：被補的人身上綠色光柱
    for (const h of st.healed) {
        if (h[0] > pos || pos - h[0] > 700 * SP) continue;
        const k = (pos - h[0]) / (700 * SP), p = memPos(h[3]);
        ctx.fillStyle = `rgba(120,255,160,${0.35 * (1 - k)})`;
        ctx.fillRect(p.x - 10 * S, p.y - 60 * S * (0.5 + k), 20 * S, 60 * S * (0.5 + k));
    }
    // 名字與血條（最上層）
    res.members.forEach((m, i) => {
        const p = memPos(i), hp = f[2 + i], me = cloudUser && m.uid === cloudUser.id, w = 40 * S, y = p.y - 58 * S;
        ctx.font = `bold ${Math.round(clamp(10 * S, 10, 13))}px sans-serif`;
        ctx.lineWidth = 3; ctx.strokeStyle = '#000';
        ctx.strokeText(m.name, p.x, y - 7); ctx.fillStyle = hp <= 0 ? '#999' : me ? '#ffd34d' : '#e8f4ff'; ctx.fillText(m.name, p.x, y - 7);
        ctx.lineWidth = 1;
        ctx.fillStyle = '#000b'; ctx.fillRect(p.x - w / 2, y, w, 4);
        ctx.fillStyle = hp / m.maxHp < 0.3 ? '#e0442e' : '#3fbf5a'; ctx.fillRect(p.x - w / 2, y, w * clamp(hp / m.maxHp, 0, 1), 4);
        if (m.title) titleFxDraw(ctx, m.title, p.x, y - 22, st.tfx[i] || (st.tfx[i] = {}), Math.round(clamp(11 * S, 11, 14)));
        if (i === tgt && bossAlive) { ctx.font = `${Math.round(12 * S)}px sans-serif`; ctx.fillText('🎯', p.x + w / 2 + 8, y + 2); }
    });
    // 飄字（真實時間 900ms）
    st.floats = st.floats.filter(x => now - x.born < 900);
    for (const x of st.floats) {
        const k = (now - x.born) / 900;
        ctx.globalAlpha = k > 0.7 ? (1 - k) / 0.3 : 1;
        ctx.font = `bold ${Math.round(x.size * clamp(S, 1, 1.4))}px sans-serif`;
        ctx.lineWidth = 3; ctx.strokeStyle = '#000';
        ctx.strokeText(x.text, x.x, x.y - k * 24); ctx.fillStyle = x.color; ctx.fillText(x.text, x.x, x.y - k * 24);
        ctx.globalAlpha = 1; ctx.lineWidth = 1;
    }
    // 結束字樣
    if (ended) {
        ctx.fillStyle = '#0008'; ctx.fillRect(0, H / 2 - 24, W, 48);
        ctx.font = `bold ${Math.round(clamp(22 * S, 18, 30))}px sans-serif`;
        ctx.fillStyle = res.win ? '#ffd34d' : '#ff7a6a';
        ctx.fillText(res.win ? '🏆 討伐成功！' : '☠️ 討伐失敗', W / 2, H / 2);
    } else {
        ctx.font = '12px sans-serif'; ctx.textAlign = 'left'; ctx.fillStyle = '#ffe7a8';
        ctx.fillText(`⏱ ${Math.floor(pos / 60000)}:${String(Math.floor(pos / 1000) % 60).padStart(2, '0')}　×${SP}`, 8, 12);
        ctx.textAlign = 'center';
    }
}

// 畫一位隊員：職業模型面向首領，依攻速輪流播攻擊／施法；剛被打到播受傷；倒下變半透明＋骷髏
function raidSceneMember(ctx, m, i, p, hp, o) {
    const { bx, by, pos, now, S, bossAlive, st } = o, SP = RAID_REPLAY_SPEED;
    const c = CLASSES[m.cls] || {}, sp = c.sprite, dx0 = bx - p.x, dy0 = by - p.y;
    const dir = Math.abs(dy0) > Math.abs(dx0) * 0.8 ? (dy0 < 0 ? 'up' : 'down') : dx0 < 0 ? 'left' : 'right';
    const dead = hp <= 0;
    // 動作：受傷 > 補血施法 > 攻速循環的攻擊／施法 > 站立
    let name = 'walk', t = 0;
    const hitLen = 260 * SP, healM = raidSceneLast(st.heal[i], pos);
    const period = Math.max(350, m.atk || 900), phase = raidSceneRnd(i + 1, 7) * period;
    const cyc = Math.floor((pos + phase) / period), local = (pos + phase) % period;
    const casts = raidSceneRnd(i + 1, cyc) < (m.castR || 0);
    if (!dead && pos - st.hurtAt[i] < hitLen) { name = 'hit'; t = (pos - st.hurtAt[i]) / SP; }
    else if (!dead && healM && pos - healM[0] < 700 * SP) { name = 'cast'; t = (pos - healM[0]) / SP; }
    else if (!dead && bossAlive) { name = casts ? 'cast' : 'attack'; t = local / SP; }
    const anim = sp && (sp[name] || sp.walk), img = anim && spriteImage(anim.src);
    ctx.fillStyle = 'rgba(0,0,0,0.4)';
    ctx.beginPath(); ctx.ellipse(p.x, p.y, 12 * S, 4 * S, 0, 0, Math.PI * 2); ctx.fill();
    ctx.globalAlpha = dead ? 0.35 : 1;
    if (img) {
        const d = animDir(dir), row = { down: 0, right: 1, up: 2 }[d], n = anim.frames[d];
        // 站立＝走路圖中間那格；一輪動作播完也回到站姿，等下一次出手
        let a2 = anim, fr = name === 'walk' ? Math.floor(n / 2) : Math.floor(t / anim.ms);
        if (name !== 'walk' && fr >= n) { a2 = sp.walk; fr = Math.floor(sp.walk.frames[d] / 2); }
        const img2 = spriteImage(a2.src), k = sp.drawH * S * 1.15 / sp.charH, dw = a2.cellW * k, dh = a2.cellH * k;
        if (img2) {
            ctx.save();
            if (dir === 'left') { ctx.translate(p.x, 0); ctx.scale(-1, 1); ctx.translate(-p.x, 0); }
            ctx.drawImage(img2, fr * a2.cellW, row * a2.cellH, a2.cellW, a2.cellH, p.x - dw / 2, p.y + 2 * S - dh, dw, dh);
            ctx.restore();
        }
        // 遠程／施法：出手的前段畫一顆飛向首領的光點
        if (!dead && bossAlive && name !== 'hit' && (m.rng || casts) && local / SP < 260 && !(healM && pos - healM[0] < 700 * SP)) {
            const k2 = local / SP / 260, sx = p.x + dx0 * k2, sy = p.y - 24 * S + (dy0 + 30 * S) * k2;
            ctx.fillStyle = casts ? '#9fd8ff' : '#ffe7a8';
            ctx.beginPath(); ctx.arc(sx, sy, (casts ? 4 : 2.5) * S, 0, Math.PI * 2); ctx.fill();
        }
    } else {
        ctx.font = `${Math.round(30 * S)}px "Segoe UI Emoji","Apple Color Emoji",sans-serif`;
        ctx.fillText(c.icon || '🧝', p.x, p.y - 16 * S);
    }
    ctx.globalAlpha = 1;
    if (dead) { ctx.font = `${Math.round(16 * S)}px sans-serif`; ctx.fillText('💀', p.x, p.y - 30 * S); }
}

// 重播中每秒重畫一次（只在團隊副本分頁開著時）
setInterval(() => {
    if (raidReplay && !raidReplay.shown && tabOpen('raid') && player) {
        if (raidReplayPos() >= raidReplay.res.ms) raidReplay.shown = true;
        renderPanel();
    }
}, 1000);

TABS.raid = ['🐉', '團隊副本'];
PANEL_FNS.raid = renderRaid;
