// 傭兵框架：六職業、50符石、獨立裝備／HP／MP（架構第197節）。人物模型後續製作。
const MERC_CLASSES = {
    spirit: { name: '契靈師', person: '璃音', sex: '女', age: '孩童', hp: 110, mp: 130, atk: 9, magic: 15, def: 1, regen: 5 },
    bulwark: { name: '壁壘衛士', person: '雷恩', sex: '男', age: '中年', hp: 200, mp: 65, atk: 11, magic: 7, def: 8, regen: 2 },
    wish: { name: '祈願使', person: '米菈', sex: '女', age: '中年', hp: 135, mp: 120, atk: 8, magic: 12, def: 3, regen: 4 },
    war: { name: '征戰者', person: '凱洛', sex: '男', age: '年輕', hp: 160, mp: 70, atk: 17, magic: 7, def: 4, regen: 2 },
    wild: { name: '荒野行者', person: '莉雅', sex: '女', age: '年輕', hp: 170, mp: 85, atk: 12, magic: 9, def: 4, regen: 3 },
    arcane: { name: '秘法使', person: '諾亞', sex: '男', age: '孩童', hp: 105, mp: 145, atk: 7, magic: 19, def: 1, regen: 4 },
};
const MERC_SLOTS = ['weapon', 'shield', 'helm', 'armor', 'tshirt', 'cloak', 'gloves', 'boots'];
const MERC_HIRE_COST = 100000, MERC_REVIVE_COST = 1000, MERC_RUNE_COST = 1000;
const MERC_GROUPS = { summon: '召喚', guard: '守護', support: '補助', battle: '戰鬥', survival: '生存', arcane: '秘術' };
const MERC_RUNES = {};
// id、名稱、效果種類、MP、冷卻秒、倍率／數值、持續秒。
const MERC_RUNE_ROWS = {
    summon: [
        ['wolf','靈狼契約','summon',18,22,1,18], ['golem','石衛契約','summon',24,30,.7,28], ['butterfly','靈蝶契約','summonHeal',20,24,.5,20],
        ['hawk','風鷹契約','summon',16,18,.8,16], ['flameSpirit','火靈契約','summonArea',26,26,.6,18], ['iceSpirit','冰靈契約','summonSlow',24,24,.7,18],
        ['thunderSpirit','雷靈契約','summon',30,28,1.5,14], ['treeSpirit','樹靈契約','summonHeal',28,30,.8,26], ['swarm','蟲群契約','summonArea',22,20,.4,14]
    ],
    guard: [
        ['cover','護衛','guard',12,16,.25,8], ['shield','堅壁護盾','shield',16,20,1.8,10], ['taunt','挑釁','taunt',10,15,.65,7],
        ['iron','鋼鐵壁壘','selfBuff',14,18,10,10], ['ward','魔法結界','teamBuff',18,22,20,10], ['thorn','荊棘守護','thorn',16,20,.3,10],
        ['sacrifice','挺身保護','guard',24,24,.5,6], ['barrier','團隊屏障','teamShield',25,28,1.2,8]
    ],
    support: [
        ['heal','急救之光','healPlayer',12,5,2.2,0], ['renew','回春祝福','hot',18,14,.6,8], ['mend','共鳴療癒','healBoth',24,12,1.7,0],
        ['haste','進軍鼓舞','haste',20,22,.08,12], ['might','力量祝福','might',16,20,5,12], ['focus','專注祝福','focus',14,18,6,12],
        ['mana','魔力贈禮','manaPlayer',26,18,16,0], ['purify','淨化之光','cleansePlayer',15,12,0,0], ['rally','戰地整備','restore',28,25,1.4,0]
    ],
    battle: [
        ['heavy','重擊','physical',8,4,2,0], ['sweep','橫掃','physicalArea',16,8,1.2,0], ['pierce','破甲刺擊','pierce',12,7,1.8,0],
        ['flurry','連環突擊','physical',20,10,3.5,0], ['execute','終結斬','execute',22,12,2,0], ['bleed','撕裂','bleed',14,10,.55,6],
        ['bash','震盪擊','stun',12,8,1.3,1], ['siphon','汲血斬','drain',18,9,1.7,0]
    ],
    survival: [
        ['selfHeal','自我療癒','healSelf',10,8,2.3,0], ['evasion','靈巧步伐','evade',12,18,.3,9], ['meditate','冥想','manaSelf',0,20,28,0],
        ['cleanse','淨身','cleanseSelf',8,10,0,0], ['fortify','生命強韌','selfShield',16,22,2.5,10], ['recover','自然復甦','selfHot',14,16,.7,10],
        ['lastStand','背水一戰','lastStand',18,24,.5,8], ['balance','生命轉魔','convert',0,15,.15,0]
    ],
    arcane: [
        ['firebolt','火焰彈','magic',9,4,2,0], ['frost','冰霜束縛','slow',14,8,1.5,4], ['lightning','雷電衝擊','magic',18,7,3,0],
        ['nova','烈焰新星','magicArea',26,12,1.8,0], ['poison','腐蝕毒霧','poison',18,12,.65,6], ['chain','連鎖雷光','magicArea',30,14,2.2,0],
        ['silence','衰弱咒印','weaken',20,12,1.3,6], ['star','星辰墜落','magicArea',38,18,3.1,0]
    ]
};
for (const group in MERC_RUNE_ROWS) for (const [id, name, kind, mp, cd, power, sec] of MERC_RUNE_ROWS[group]) {
    MERC_RUNES[id] = { id, name, group, kind, mp, cd, power, sec };
    ITEMS['mercRune_' + id] = { name: '傭兵符石・' + name, cat: 'mercRune', rune: id, wt: .1, sell: 0 };
}
CAT_NAMES.mercRune = '傭兵符石';
const MERC_RANKS = [
    { min: 1, id: 'c', name: 'C級傭兵', color: '#ffffff' },
    { min: 30, id: 'b', name: 'B級傭兵', color: '#66b8ff' },
    { min: 41, id: 'a', name: 'A級傭兵', color: '#c18aff' },
    { min: 51, id: 's', name: 'S級傭兵', color: '#ff6060' },
    { min: 61, id: 'ss', name: 'SS級傭兵', color: '#ffd15a' },
    { min: 71, id: 'sss', name: 'SSS級傭兵', color: '#ffd15a' },
    { min: 81, id: 'legend', name: '傳奇傭兵', color: '#ffb4ec' },
];
function mercRank(m = player.mercenary) { return MERC_RANKS.slice().reverse().find(r => m && m.lv >= r.min) || MERC_RANKS[0]; }
function mercNameHtml(m) {
    const c = MERC_CLASSES[m.cls], rank = mercRank(m);
    return '<span class="merc-name merc-grade-' + rank.id + '">' + esc(rank.name + '・' + c.person + '・' + c.name) + '</span>';
}
const mercRuntime = new WeakMap();
let mercRuneGroup = 'summon';
function mercActive() { const m = player && player.mercenary; return !SIM_MODE && m && !m.dead && m.active && player.hp > 0 ? m : null; }
function mercState(m = player.mercenary) {
    let r = mercRuntime.get(m);
    if (!r) { r = { buffs: {}, cds: m.cds || (m.cds = {}), summons: [], dots: [], attackAt: 0, skillAt: 0, regenAt: gameNow + 1000 }; mercRuntime.set(m, r); }
    return r;
}
function mercBuff(id, m = player.mercenary) { const b = m && mercState(m).buffs[id]; return b && b.until > gameNow ? b.power : 0; }
function mercStats(m = player.mercenary) {
    const c = MERC_CLASSES[m.cls], fx = {}, w = m.equip.weapon, d = w && ITEMS[w.id];
    for (const slot of MERC_SLOTS) {
        const it = m.equip[slot]; if (!it) continue;
        const def = ITEMS[it.id]; if (!def) continue;
        addFx(fx, affixFx(it));
        if (slot !== 'weapon') { addFx(fx, def); fx.ac = (fx.ac || 0) + (it.ench || 0); }
    }
    return { hp: c.hp + (m.lv - 1) * 18 + (fx.hp || 0), mp: c.mp + (m.lv - 1) * 8 + (fx.mp || 0),
        atk: c.atk + m.lv * 2 + (d ? (d.dmg[0] + d.dmg[1]) / 2 + (w.ench || 0) : 0) + (fx.dmg || 0) + mercBuff('might', m),
        magic: c.magic + m.lv * 2 + (fx.sp || 0) * 3 + ((d && d.sp) || 0) * 3,
        def: c.def + m.lv + (fx.ac || 0) + mercBuff('iron', m), mr: 10 + m.lv + (fx.mr || 0) + mercBuff('ward', m),
        regen: c.regen, dodge: Math.min(.5, (m.cls === 'wild' ? .08 : 0) + (fx.dodge || 0) + mercBuff('evasion', m)),
        heal: m.cls === 'wish' ? 1.2 : 1, speed: (d ? WEAPON_TYPES[d.type].spd : 1200) / (1 + (fx.spdMul || 0) + mercBuff('haste', m)) };
}
function mercNormalize(p) {
    const m = p.mercenary;
    if (!m || !MERC_CLASSES[m.cls]) { p.mercenary = null; return; }
    m.lv = clamp(Math.floor(Number(m.lv) || 1), 1, MAX_LEVEL);
    m.cds = m.cds && typeof m.cds === 'object' ? m.cds : {};
    for (const id of Object.keys(m.cds)) { if (!MERC_RUNES[id] || !Number.isFinite(m.cds[id])) delete m.cds[id]; else m.cds[id] = Math.min(m.cds[id], gameNow + MERC_RUNES[id].cd * 1000); }
    m.exp = Math.max(0, Number.isFinite(m.exp) ? m.exp : 0); m.dead = m.dead === true; m.active = !m.dead && m.active === true;
    m.equip = m.equip && typeof m.equip === 'object' && !Array.isArray(m.equip) ? m.equip : {};
    const used = new Set([...p.inv, ...p.storage, ...Object.values(p.equip)].map(x => x.uid));
    for (const slot of Object.keys(m.equip)) {
        const it = m.equip[slot], d = it && ITEMS[it.id], want = slot.startsWith('ring') ? 'ring' : slot;
        if ((!MERC_SLOTS.includes(slot) && !['amulet', 'ring1', 'ring2', 'belt'].includes(slot)) || !d || (slot === 'weapon' ? d.cat !== 'weapon' : d.cat !== 'armor' || d.slot !== want) || it.n !== 1 || !Number.isSafeInteger(it.uid) || it.uid <= 0 || used.has(it.uid)) { delete m.equip[slot]; continue; }
        used.add(it.uid); p.nextUid = Math.max(p.nextUid, it.uid + 1);
        // 舊版取消的四個飾品槽原樣退回背包；死亡傭兵不恢復已失去物品。
        if (!MERC_SLOTS.includes(slot)) { if (!m.dead) p.inv.push(it); delete m.equip[slot]; }
    }
    const seen = new Set();
    m.skills = Array.from({ length: 4 }, (_, i) => { const id = Array.isArray(m.skills) && m.skills[i]; if (!MERC_RUNES[id] || seen.has(id)) return ''; seen.add(id); return id; });
    if (m.dead) { m.hp = 0; m.equip = {}; m.skills = ['', '', '', '']; }
    const st = mercStats(m);
    m.hp = m.dead ? 0 : clamp(Number.isFinite(m.hp) ? m.hp : st.hp, 1, st.hp);
    m.mp = clamp(Number.isFinite(m.mp) ? m.mp : st.mp, 0, st.mp);
}
function mercExpNeed(m) { return 100 + m.lv * m.lv * 30; }
function mercGainExp(n) {
    const m = mercActive(); if (!m) return;
    m.exp += Math.max(0, Math.floor(n));
    while (m.lv < Math.min(MAX_LEVEL, player.lv) && m.exp >= mercExpNeed(m)) {
        m.exp -= mercExpNeed(m); m.lv++; const st = mercStats(m); m.hp = st.hp; m.mp = st.mp;
        addLog('⚑ 傭兵升至 ' + m.lv + ' 級', 'sys');
    }
    m.exp = Math.min(m.exp, mercExpNeed(m));
}
function mercDie() {
    const m = player.mercenary; if (!m || m.dead) return;
    m.dead = true; m.active = false; m.hp = 0; m.mp = 0; m.equip = {}; m.skills = ['', '', '', '']; m.cds = {}; mercRuntime.delete(m);
    addLog('⚑ 傭兵陣亡！身上裝備與技能永久消失，請找傭兵團長復活或雇傭新人。', 'warn');
    if (!SIM_MODE) saveGame();
}
function mercTakeDamage(value) {
    const m = mercActive(); if (!m || value <= 0) return 0;
    const r = mercState(m), st = mercStats(m);
    if (chance(st.dodge)) return 0;
    let damage = Math.max(1, Math.round(value - st.def / 3));
    if (mercBuff('lastStand')) damage = Math.round(damage * .5);
    for (const key of ['fortify', 'shield', 'barrier']) {
        const b = r.buffs[key]; if (!b || b.until <= gameNow) continue;
        const n = Math.min(damage, b.power); b.power -= n; damage -= n;
    }
    const dealt = Math.min(m.hp, damage); m.hp -= damage;
    if (m.hp <= 0) mercDie(); return dealt;
}
function mercEnemyAttack(mon) {
    const m = mercActive(); if (!m || !chance(mercBuff('taunt') || .25)) return false;
    const st = mercStats(m), magic = mon.magic && chance(mon.magic.p);
    let value = magic ? rand(...mon.magic.dmg) * (1 - Math.min(150, st.mr) / 200) : rand(...mon.dmg);
    if (mon.mercEffect === 'weaken' && mon.mercUntil > gameNow) value *= mon.boss ? .95 : .85;
    const dealt = mercTakeDamage(value);
    if (mercBuff('thorn', m) && mon.hp > 0) mon.hp -= Math.round(dealt * mercBuff('thorn', m));
    addLog('⚑ 傭兵承受 ' + dealt + ' 傷害', 'hurt'); return true;
}
function mercProtect(value, area = false) {
    const m = mercActive(); if (!m) return value;
    if (area) mercTakeDamage(value);
    if (!mercActive()) return value;
    let damage = value;
    const guard = mercBuff('cover') || mercBuff('sacrifice');
    if (guard) { const n = Math.min(m.hp, Math.floor(damage * guard)); mercTakeDamage(n); damage -= n; }
    const b = mercState(m).buffs.barrier;
    if (b && b.until > gameNow) { const n = Math.min(damage, b.player || 0); b.player -= n; damage -= n; }
    return damage;
}
function mercPlayerFx() {
    const m = mercActive(); if (!m) return {};
    return { spdMul: mercBuff('haste'), dmg: mercBuff('might'), hit: mercBuff('focus'), mr: mercBuff('ward') };
}
function mercHit(mon, amount, magic = false, pierce = false) {
    if (!mon || mon.hp <= 0) return 0;
    const value = Math.max(1, Math.round(amount * (magic ? 1 - clamp(mon.mr || 0, 0, 150) / 200 : 1) - (!magic && !pierce ? Math.max(0, -(mon.ac || 0) / 5) : 0)));
    const dealt = Math.min(mon.hp, value); mon.hp -= value; return dealt;
}
function mercRuneText(id) {
    const s = MERC_RUNES[id]; if (!s) return '';
    const texts = { summon: '召喚單體攻擊靈體', summonHeal: '召喚定時治療玩家與傭兵的靈體', summonArea: '召喚範圍攻擊靈體', summonSlow: '召喚攻擊並緩速的靈體',
        guard: '代玩家承擔部分傷害', shield: '傭兵護盾', taunt: '提高敵人攻擊傭兵的機率', selfBuff: '提高傭兵防禦', teamBuff: '提高雙方魔防', thorn: '傭兵受擊反傷', teamShield: '雙方各獲護盾',
        healPlayer: '玩家低於70%HP時治療', hot: '雙方持續恢復HP', healBoth: '雙方低於70%HP時治療', haste: '提高雙方攻速', might: '提高雙方物理傷害', focus: '提高玩家命中及傭兵技能傷害', manaPlayer: '玩家低於50%MP時回魔', cleansePlayer: '清除玩家負面增益', restore: '雙方恢復HP並回復玩家MP',
        physical: '單體物理傷害', physicalArea: '最多3名敵人物理傷害', pierce: '忽略防禦的物理傷害', execute: '目標低於30%HP時傷害翻倍', bleed: '持續物理傷害', stun: '物理傷害並暈眩一般怪，首領免控', drain: '物理傷害並恢復傭兵HP',
        healSelf: '傭兵低於60%HP時自療', evade: '提高傭兵閃避', manaSelf: '傭兵低於50%MP時恢復MP', cleanseSelf: '清除傭兵負面狀態', selfShield: '傭兵護盾', selfHot: '傭兵持續回血', lastStand: '傭兵低於40%HP時減傷50%', convert: '傭兵HP高於50%時消耗生命回魔',
        magic: '單體魔法傷害', slow: '魔法傷害並降低敵人攻速', magicArea: '最多3名敵人魔法傷害', poison: '持續魔法傷害', weaken: '魔法傷害並降低敵人傷害' };
    const percent = ['guard','taunt','thorn','haste','evade','lastStand','convert'].includes(s.kind);
    const scaled = ['physical','physicalArea','pierce','execute','bleed','stun','drain','magic','slow','magicArea','poison','weaken','shield','selfShield','teamShield','healPlayer','healBoth','healSelf','hot','selfHot','restore'].includes(s.kind) || s.kind.startsWith('summon');
    const effect = !s.power ? '' : percent ? '｜效果' + Math.round(s.power * 100) + '%' : scaled ? '｜能力倍率' + Math.round(s.power * 100) + '%' : '｜效果 +' + s.power;
    return MERC_GROUPS[s.group] + '｜' + texts[s.kind] + '｜MP ' + s.mp + '｜冷卻' + s.cd + '秒' + (s.sec ? '｜持續' + s.sec + '秒' : '') + effect;
}
function mercCast(id, mon) {
    const m = mercActive(), s = MERC_RUNES[id]; if (!m || !s || !m.skills.includes(id)) return false;
    const r = mercState(m), st = mercStats(m), ps = calcStats(), k = s.kind;
    if (m.mp < s.mp || (r.cds[id] || 0) > gameNow || r.skillAt > gameNow) return false;
    const hpLow = player.hp < ps.maxHp * .7, selfLow = m.hp < st.hp * .6;
    if (k === 'healPlayer' && !hpLow || ['healBoth', 'restore', 'hot'].includes(k) && !hpLow && !selfLow || ['healSelf', 'selfHot'].includes(k) && !selfLow || k === 'lastStand' && m.hp >= st.hp * .4 || k === 'manaPlayer' && player.mp >= ps.maxMp * .5 || k === 'manaSelf' && m.mp >= st.mp * .5 || k === 'convert' && (m.mp >= st.mp * .5 || m.hp <= st.hp * .5)) return false;
    if (k === 'cleansePlayer' && !Object.values(player.buffs).some(b => b.negative || b.src === 'debuff')) return false;
    if (k === 'cleanseSelf' && !Object.keys(r.buffs).some(key => r.buffs[key].negative)) return false;
    const attackKinds = ['physical','physicalArea','pierce','execute','bleed','stun','drain','magic','slow','magicArea','poison','weaken'];
    if (attackKinds.includes(k) && (!mon || mon.hp <= 0)) return false;
    m.mp -= s.mp; r.cds[id] = gameNow + s.cd * 1000; r.skillAt = gameNow + 1000;
    const heal = v => Math.round(st.magic * v * st.heal), selfHeal = v => { m.hp = Math.min(st.hp, m.hp + heal(v)); }, playerHeal = v => { player.hp = Math.min(ps.maxHp, player.hp + heal(v)); };
    if (k.startsWith('summon')) {
        r.summons = r.summons.filter(x => x.until > gameNow); if (r.summons.length >= 2) r.summons.shift();
        r.summons.push({ id, until: gameNow + s.sec * 1000, at: gameNow, power: s.power * (m.cls === 'spirit' ? 1.2 : 1) });
    } else if (['healPlayer','healBoth','restore'].includes(k)) { playerHeal(s.power); if (k !== 'healPlayer') selfHeal(s.power); if (k === 'restore') player.mp = Math.min(ps.maxMp, player.mp + 8); }
    else if (k === 'healSelf') selfHeal(s.power);
    else if (k === 'manaPlayer') player.mp = Math.min(ps.maxMp, player.mp + s.power);
    else if (k === 'manaSelf') m.mp = Math.min(st.mp, m.mp + s.power);
    else if (k === 'convert') { const n = Math.floor(st.hp * s.power); m.hp -= n; m.mp = Math.min(st.mp, m.mp + n); }
    else if (k === 'cleansePlayer') { for (const key in player.buffs) if (player.buffs[key].negative || player.buffs[key].src === 'debuff') delete player.buffs[key]; }
    else if (k === 'cleanseSelf') { for (const key in r.buffs) if (r.buffs[key].negative) delete r.buffs[key]; }
    else if (attackKinds.includes(k)) {
        const magic = ['magic','slow','magicArea','poison','weaken'].includes(k);
        const power = (magic ? st.magic : st.atk) + mercBuff('focus');
        const targets = k.endsWith('Area') ? hunt.mobs.filter(x => x.hp > 0).slice(0,3) : [mon];
        if (k === 'bleed' || k === 'poison') r.dots.push({ mon, until: gameNow + s.sec * 1000, at: gameNow + 1000, amount: power * s.power, magic });
        else for (const target of targets) { const dealt = mercHit(target, power * s.power * (k === 'execute' && target.hp < target.maxHp * .3 ? 2 : 1), magic, k === 'pierce'); if (k === 'drain') m.hp = Math.min(st.hp, m.hp + Math.round(dealt * .5)); }
        if (k === 'stun' && !mon.boss) mon.stunUntil = Math.max(mon.stunUntil || 0, gameNow + s.sec * 1000);
        if (k === 'slow' || k === 'weaken') { mon.mercEffect = k; mon.mercUntil = gameNow + s.sec * 1000; }
    } else {
        let power = s.power;
        if (['shield','selfShield','teamShield'].includes(k)) power = heal(power);
        r.buffs[id] = { power, until: gameNow + s.sec * 1000, at: gameNow + 1000, player: k === 'teamShield' ? power : 0 };
    }
    addLog('⚑ ' + MERC_CLASSES[m.cls].person + '使用「' + s.name + '」', 'sys'); return true;
}
function mercTick(dt) {
    const m = mercActive(); if (!m) return;
    const r = mercState(m), st = mercStats(m);
    if (gameNow >= r.regenAt) { r.regenAt = gameNow + 1000; m.mp = Math.min(st.mp, m.mp + st.regen); m.hp = Math.min(st.hp, m.hp + (m.cls === 'wild' ? 3 : 1)); }
    const mon = hunt && hunt.state === 'fight' && hunt.mon && hunt.mon.hp > 0 ? hunt.mon : null;
    for (const [id, b] of Object.entries(r.buffs)) {
        if (b.until < gameNow) { delete r.buffs[id]; continue; }
        const s = MERC_RUNES[id]; if (!s || !['hot','selfHot'].includes(s.kind) || b.at > gameNow) continue;
        b.at = gameNow + 1000; m.hp = Math.min(st.hp, m.hp + Math.round(st.magic * s.power * st.heal));
        if (s.kind === 'hot') player.hp = Math.min(calcStats().maxHp, player.hp + Math.round(st.magic * s.power * st.heal));
    }
    if (!player.hunting || !mon) return;
    for (const id of m.skills) if (mercCast(id, mon)) break;
    for (const dot of r.dots) if (dot.until >= gameNow && dot.mon.hp > 0 && hunt.mobs.includes(dot.mon) && dot.at <= gameNow) { dot.at = gameNow + 1000; mercHit(dot.mon, dot.amount, dot.magic); }
    r.dots = r.dots.filter(x => x.until > gameNow && x.mon.hp > 0 && hunt.mobs.includes(x.mon));
    r.summons = r.summons.filter(x => x.until > gameNow);
    for (const x of r.summons) {
        if (x.at > gameNow) continue; x.at = gameNow + 2000;
        const s = MERC_RUNES[x.id];
        if (s.kind === 'summonHeal') { m.hp = Math.min(st.hp, m.hp + Math.round(st.magic * x.power)); player.hp = Math.min(calcStats().maxHp, player.hp + Math.round(st.magic * x.power)); }
        else { const targets = s.kind === 'summonArea' ? hunt.mobs.filter(t => t.hp > 0).slice(0,3) : [mon]; for (const t of targets) mercHit(t, st.magic * x.power, true); if (s.kind === 'summonSlow') { mon.mercEffect = 'slow'; mon.mercUntil = gameNow + 2500; } }
    }
    if (mon.hp > 0 && gameNow >= r.attackAt) { r.attackAt = gameNow + Math.max(400, st.speed); mercHit(mon, st.atk); }
}
function mercTownReady() { return !!(player && inTown() && !SIM_MODE); }
function mercRefresh() { saveGame(); refreshUI(); if (typeof mercPanelOpen !== 'undefined' && mercPanelOpen) openMercenary(); }
function mercHire(cls) {
    if (!mercTownReady() || !MERC_CLASSES[cls] || player.mercenary && !player.mercenary.dead) return;
    const owner = player, previous = player.mercenary;
    gameConfirm('雇傭傭兵', '花費' + fmt(MERC_HIRE_COST) + '金幣雇傭Lv.1「' + MERC_CLASSES[cls].name + '」？' + (previous ? '原死亡傭兵將被替換，原等級不保留。' : ''), () => {
        if (player !== owner || !mercTownReady() || player.mercenary !== previous || player.gold < MERC_HIRE_COST) { showToast('條件已改變或金幣不足'); return; }
        player.gold -= MERC_HIRE_COST;
        const m = player.mercenary = { cls, lv: 1, exp: 0, hp: 1, mp: 0, cds: {}, equip: {}, skills: ['', '', '', ''], dead: false, active: false };
        const st = mercStats(m); m.hp = st.hp; m.mp = st.mp; mercRefresh();
    }, '雇傭');
}
function mercRevive() {
    const m = player.mercenary; if (!mercTownReady() || !m || !m.dead) return;
    const owner = player, cost = m.lv * MERC_REVIVE_COST;
    gameConfirm('復活傭兵', '花費' + fmt(cost) + '金幣復活，保留Lv.' + m.lv + '，失去的裝備與技能不恢復。', () => {
        if (player !== owner || !mercTownReady() || player.mercenary !== m || !m.dead || player.gold < cost) return;
        player.gold -= cost; m.dead = false; m.active = false; const st = mercStats(m); m.hp = st.hp; m.mp = st.mp; mercRuntime.delete(m); mercRefresh();
    }, '復活');
}
function mercToggle() {
    const m = player.mercenary; if (!mercTownReady() || !m || m.dead) { showToast('請回村莊調整傭兵出戰'); return; }
    m.active = !m.active; mercRefresh();
}
function mercBuyRune(id) {
    if (!mercTownReady() || !MERC_RUNES[id] || player.gold < MERC_RUNE_COST) { showToast('需要在村莊且金幣足夠'); return; }
    addItem('mercRune_' + id); player.gold -= MERC_RUNE_COST; mercRefresh();
}
function mercSetRune(slot, id) {
    const m = player.mercenary;
    if (!mercTownReady() || !m || m.dead || !Number.isInteger(slot) || slot < 0 || slot > 3 || id && (!MERC_RUNES[id] || !countItem('mercRune_' + id) || m.skills.includes(id))) return;
    if (id && !consumeItem('mercRune_' + id)) return;
    if (m.skills[slot]) addItem('mercRune_' + m.skills[slot]);
    m.skills[slot] = id; mercRefresh();
}
function mercEquip(uid, slot) {
    const m = player.mercenary, it = findInv(uid), d = it && ITEMS[it.id];
    if (!mercTownReady() || !m || m.dead || !d || !MERC_SLOTS.includes(slot) || it.sellLocked || (slot === 'weapon' ? d.cat !== 'weapon' : d.cat !== 'armor' || d.slot !== (slot.startsWith('ring') ? 'ring' : slot))) return;
    if (slot === 'shield' && m.equip.weapon && WEAPON_TYPES[ITEMS[m.equip.weapon.id].type].two) { showToast('雙手武器不能搭配盾牌'); return; }
    if (slot === 'weapon' && WEAPON_TYPES[d.type].two && m.equip.shield) { player.inv.push(m.equip.shield); delete m.equip.shield; }
    if (m.equip[slot]) player.inv.push(m.equip[slot]); removeInst(uid); m.equip[slot] = it;
    const st = mercStats(m); m.hp = Math.min(m.hp, st.hp); m.mp = Math.min(m.mp, st.mp); mercRefresh();
}
function mercUnequip(slot) {
    const m = player.mercenary; if (!mercTownReady() || !m || m.dead || !MERC_SLOTS.includes(slot) || !m.equip[slot]) return;
    player.inv.push(m.equip[slot]); delete m.equip[slot]; const st = mercStats(m); m.hp = Math.min(m.hp, st.hp); m.mp = Math.min(m.mp, st.mp); mercRefresh();
}
let mercPanelOpen = false;
function openMercenary() { mercPanelOpen = true; openDialog('傭兵團', renderMercenary(), [{ text: '關閉', onClick: () => { mercPanelOpen = false; } }]); }
function mercChooseGroup(group) { if (MERC_GROUPS[group]) mercRuneGroup = group; openMercenary(); }
function mercPickRune(slot) {
    mercPanelOpen = true;
    const m = player.mercenary; if (!mercTownReady() || !m || m.dead) return;
    const rows = player.inv.filter(x => ITEMS[x.id].cat === 'mercRune' && !m.skills.includes(ITEMS[x.id].rune)).map(x => { const id = ITEMS[x.id].rune; return '<div class="list-row"><div><b>' + esc(ITEMS[x.id].name) + ' ×' + x.n + '</b><small>' + esc(mercRuneText(id)) + '</small></div><button onclick="mercSetRune(' + slot + ',\'' + id + '\')">配置</button></div>'; }).join('');
    openDialog('配置第' + (slot + 1) + '格符石', '<div class="list">' + (rows || '背包沒有可用符石，請找傭兵團長購買。') + '</div>', [{ text: '返回', onClick: openMercenary }]);
}
function mercPickEquip(slot) {
    mercPanelOpen = true;
    if (!mercTownReady() || !MERC_SLOTS.includes(slot)) return;
    const rows = player.inv.filter(x => { const d = ITEMS[x.id]; return !x.sellLocked && (slot === 'weapon' ? d.cat === 'weapon' : d.cat === 'armor' && d.slot === (slot.startsWith('ring') ? 'ring' : slot)); }).map(x => '<div class="list-row"><div><b>' + esc(itemName(x)) + '</b><small>' + esc(itemDescHtml(x).replace(/<[^>]*>/g,' ')) + '</small></div><button onclick="mercEquip(' + x.uid + ',\'' + slot + '\')">交付</button></div>').join('');
    openDialog('傭兵裝備・' + SLOTS[slot], '<p class="bad">交付後傭兵死亡會永久失去此裝備。鎖定物品須先解鎖。</p><div class="list">' + (rows || '背包沒有可用裝備。') + '</div>', [{ text: '返回', onClick: openMercenary }]);
}
function mercCardHtml() {
    const m = player.mercenary, c = m && MERC_CLASSES[m.cls];
    return '<div class="cv-companion-art cv-companion-empty"><span>' + (c ? mercNameHtml(m) + '<br>Lv.' + m.lv + (m.dead ? ' 陣亡' : m.active ? ' 出戰中' : ' 待命') + '<br>HP ' + Math.ceil(m.hp) + '／MP ' + Math.ceil(m.mp) : '未雇傭傭兵') + '</span></div><button class="mini" onclick="openMercenary()">管理傭兵</button><div class="cv-companion-desc"><small>與娃娃獨立，可同時出戰。四格符石自由搭配。</small></div>';
}
function mercRuneBoardHtml(m, town) {
    const marks = { summon: '召', guard: '守', support: '輔', battle: '戰', survival: '生', arcane: '秘' };
    return '<section class="merc-rune-board" aria-label="四格技能符石鑲嵌石板"><header><span aria-hidden="true">◆</span><h4>四格技能符石</h4><span aria-hidden="true">◆</span></header><p class="merc-board-hint">點擊凹槽鑲嵌符石・依序施放</p><div class="merc-rune-sockets">' + m.skills.map((id, i) => {
        const rune = MERC_RUNES[id], locked = !town || m.dead, name = rune ? rune.name : '空白凹槽';
        return '<article class="merc-socket-card ' + (rune ? 'filled rune-' + rune.group : 'vacant') + '"><span class="merc-socket-number">' + ['Ⅰ','Ⅱ','Ⅲ','Ⅳ'][i] + '</span><button type="button" class="merc-socket" onclick="mercPickRune(' + i + ')" aria-label="第' + (i + 1) + '格：' + esc(name) + '，' + (rune ? '替換符石' : '選擇符石') + '" ' + (locked ? 'disabled' : '') + '><span class="merc-socket-rim" aria-hidden="true">' + (rune ? '<span class="merc-gem"><span>' + marks[rune.group] + '</span></span>' : '<span class="merc-socket-empty">＋</span>') + '</span></button><b class="merc-socket-name">' + esc(name) + '</b><small class="merc-socket-type">' + (rune ? MERC_GROUPS[rune.group] + '系・已鑲嵌' : '尚未鑲嵌') + '</small>' + (rune ? '<small class="merc-socket-cost">MP ' + rune.mp + ' · 冷卻 ' + rune.cd + ' 秒</small><details class="merc-rune-detail"><summary>效果說明</summary><small>' + esc(mercRuneText(id)) + '</small></details><button type="button" class="merc-rune-remove" onclick="mercSetRune(' + i + ',\'\')" ' + (locked ? 'disabled' : '') + '>拆回背包</button>' : '<small class="merc-socket-help">點擊上方孔位放入技能</small>') + '</article>';
    }).join('') + '</div></section>';
}
function renderMercenary() {
    const m = player.mercenary, c = m && MERC_CLASSES[m.cls], town = mercTownReady();
    let h = '<div class="panel"><p>六職業共用50種符石，一次持有一位。在村莊招募、配置與調整出戰。</p><p class="bad">死亡永久失去身上全部裝備與已配置符石；背包物品不受影響。復活保留等級。</p><details><summary>戰鬥與裝備規則</summary><small>不限制武器職業，雙手武器與盾牌互斥。一般掛機生效；離線／團隊副本／世界首領暫不參戰。遠程武器不耗玩家彈藥，裝備共鳴與BOSS附魔暫不觸發。技能依四格順序判斷，每秒最多一招；召喚物最多2隻。框架先用跟隨標記呈現。</small></details></div>';
    if (m) {
        const st = mercStats(m);
        h += '<div class="panel"><b>' + mercNameHtml(m) + '</b>（' + c.sex + '／' + c.age + '）<p>Lv.' + m.lv + '｜經驗 ' + fmt(m.exp) + '／' + fmt(mercExpNeed(m)) + '<br>HP ' + Math.ceil(m.hp) + '／' + st.hp + '　MP ' + Math.ceil(m.mp) + '／' + st.mp + '<br>物攻' + Math.round(st.atk) + '／魔攻' + Math.round(st.magic) + '／防禦' + st.def + '／魔防' + st.mr + '</p>' + (m.dead ? '<button onclick="mercRevive()" ' + (!town ? 'disabled' : '') + '>復活（' + fmt(m.lv * MERC_REVIVE_COST) + '金幣）</button>' : '<button onclick="mercToggle()" ' + (!town ? 'disabled' : '') + '>' + (m.active ? '收回傭兵' : '傭兵出戰') + '</button>') + '</div>';
        h += mercRuneBoardHtml(m, town);
        h += '<h4>傭兵裝備</h4><div class="merc-grid">' + MERC_SLOTS.map(slot => '<div class="panel"><b>' + SLOTS[slot] + '：' + (m.equip[slot] ? esc(itemName(m.equip[slot])) : '空白') + '</b><button onclick="mercPickEquip(\'' + slot + '\')" ' + (!town || m.dead ? 'disabled' : '') + '>選擇</button>' + (m.equip[slot] ? '<button onclick="mercUnequip(\'' + slot + '\')" ' + (!town || m.dead ? 'disabled' : '') + '>卸下</button>' : '') + '</div>').join('') + '</div>';
    }
    if (!m || m.dead) h += '<h4>傭兵團長・招募</h4><div class="merc-grid">' + Object.entries(MERC_CLASSES).map(([id,x]) => '<div class="panel"><b>' + mercNameHtml({ cls: id, lv: 1 }) + '</b><small>' + x.sex + '／' + x.age + '｜初始Lv.1｜HP ' + x.hp + '／MP ' + x.mp + '</small><button onclick="mercHire(\'' + id + '\')" ' + (!town ? 'disabled' : '') + '>雇傭（' + fmt(MERC_HIRE_COST) + '金幣）</button></div>').join('') + '</div>';
    h += '<h4>傭兵團長・符石補給（每顆' + fmt(MERC_RUNE_COST) + '金幣）</h4><div class="chips">' + Object.entries(MERC_GROUPS).map(([id,n]) => '<button onclick="mercChooseGroup(\'' + id + '\')">' + n + '</button>').join('') + '</div><div class="list">' + Object.values(MERC_RUNES).filter(x => x.group === mercRuneGroup).map(s => '<div class="list-row"><div><b>' + esc(s.name) + '</b><small>' + esc(mercRuneText(s.id)) + '</small></div><button onclick="mercBuyRune(\'' + s.id + '\')" ' + (!town ? 'disabled' : '') + '>購買</button></div>').join('') + '</div>';
    return h;
}
function sceneMercTick(dt) {
    const m = mercActive();
    if (!m || !scene || !scene.pl) { if (scene) scene.mercenary = null; return; }
    const pl = scene.pl;
    let d = scene.mercenary;
    if (!d || d.owner !== m || Math.hypot(d.rx - pl.rx, d.ry - pl.ry) > 8) {
        const spot = [[-1,0],[0,-1],[1,0],[0,1]].map(([x,y]) => [pl.x+x,pl.y+y]).find(([x,y]) => freeTileFor(x,y) && inHuntZone(x,y)) || [pl.x,pl.y];
        d = scene.mercenary = { owner: m, rx: spot[0], ry: spot[1], path: [] };
    }
    if (!d.path.length && Math.hypot(d.rx - pl.rx, d.ry - pl.ry) > 1.7) d.path = findPath(Math.round(d.rx), Math.round(d.ry), pl.x, pl.y, true, true);
    if (!d.path.length) return;
    const [x,y] = d.path[0]; if (!freeTileFor(x,y) || !inHuntZone(x,y)) { d.path = []; return; }
    const dx = x-d.rx, dy = y-d.ry, dist = Math.hypot(dx,dy), step = PLAYER_SPEED * dt / 1000;
    if (dist <= step) { d.rx=x; d.ry=y; d.path.shift(); } else { d.rx += dx/dist*step; d.ry += dy/dist*step; }
}
function sceneDrawMerc(ctx, camX, camY) {
    const m = mercActive(), d = scene.mercenary; if (!m || !d || d.owner !== m) return;
    const x = d.rx*TILE-camX+TILE/2, y = d.ry*TILE-camY+TILE/2, st = mercStats(m);
    ctx.save(); ctx.fillStyle=mercRank(m).color; ctx.strokeStyle='#163b37'; ctx.lineWidth=2;
    ctx.beginPath(); ctx.moveTo(x,y-18); ctx.lineTo(x+9,y-8); ctx.lineTo(x,y+2); ctx.lineTo(x-9,y-8); ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.fillStyle='#111'; ctx.fillRect(x-15,y-29,30,4); ctx.fillStyle='#77dc8b'; ctx.fillRect(x-15,y-29,30*Math.max(0,m.hp/st.hp),4);
    const rank = mercRank(m), label = rank.name + '・' + MERC_CLASSES[m.cls].person + ' Lv.' + m.lv;
    ctx.font='10px sans-serif'; ctx.textAlign='center'; ctx.strokeStyle='#000'; ctx.lineWidth=3; ctx.strokeText(label,x,y-34);
    if (rank.id === 'legend') {
        const rainbow = ctx.createLinearGradient(x-80,0,x+80,0);
        for (let i=0;i<=6;i++) rainbow.addColorStop(i/6, 'hsl(' + ((gameNow/25+i*60)%360) + ',95%,70%)');
        ctx.fillStyle=rainbow;
    } else ctx.fillStyle=rank.color;
    ctx.fillText(label,x,y-34);
    if (rank.id === 'sss') {
        ctx.fillStyle='#ff4141';
        for (let i=0;i<3;i++) { const phase=(gameNow/1400+i/3)%1; ctx.globalAlpha=.3+.7*Math.abs(Math.sin(phase*Math.PI));ctx.beginPath();ctx.arc(x-65+phase*130,y-37+Math.sin(phase*12)*3,1.4,0,Math.PI*2);ctx.fill(); }
        ctx.globalAlpha=1;
    }
    const summons = mercState(m).summons.filter(s=>s.until>gameNow);
    summons.forEach((s,i)=>{ const a=gameNow/700+i*Math.PI; ctx.beginPath();ctx.arc(x+Math.cos(a)*18,y+Math.sin(a)*7,3,0,Math.PI*2);ctx.fillStyle='#dcc1ff';ctx.fill(); });
    ctx.restore();
}
