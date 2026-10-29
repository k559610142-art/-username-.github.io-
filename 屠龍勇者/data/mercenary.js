// 傭兵：六職業、50符石、獨立裝備／HP／MP（架構第197、206、209節）。
const MERC_CLASSES = {
    spirit: { name: '契靈師', person: '璃音', sex: '女', age: '孩童', hp: 110, mp: 130, atk: 9, magic: 15, def: 1, regen: 5 },
    bulwark: { name: '壁壘衛士', person: '雷恩', sex: '男', age: '中年', hp: 200, mp: 65, atk: 11, magic: 7, def: 8, regen: 2 },
    wish: { name: '祈願使', person: '米菈', sex: '女', age: '中年', hp: 135, mp: 120, atk: 8, magic: 12, def: 3, regen: 4 },
    war: { name: '征戰者', person: '凱洛', sex: '男', age: '年輕', hp: 160, mp: 70, atk: 17, magic: 7, def: 4, regen: 2 },
    wild: { name: '荒野行者', person: '莉雅', sex: '女', age: '年輕', hp: 170, mp: 85, atk: 12, magic: 9, def: 4, regen: 3 },
    arcane: { name: '秘法使', person: '諾亞', sex: '男', age: '孩童', hp: 105, mp: 145, atk: 7, magic: 19, def: 1, regen: 4 },
};
// 職業特色（第224節）：只影響傭兵本身，不改玩家。
const MERC_TRAITS = {
    spirit: { summon: 1.5, summonMax: 3, text: '召喚效力×1.5，召喚物上限3隻' },
    bulwark: { taken: .8, aggro: .4, text: '受到傷害−20%，怪物選它當目標40%' },
    wish: { heal: 1.5, buffSec: 1.5, text: '治療×1.5，輔助增益持續時間+50%' },
    war: { phys: 1.3, crit: .15, critMul: 1.5, text: '物理技能×1.3，普攻15%暴擊×1.5' },
    wild: { dodge: .15, spd: .2, hpRegen: 5, text: '閃避15%，攻速+20%，每秒回血5' },
    arcane: { magicSkill: 1.3, mrIgnore: .3, text: '魔法技能×1.3，無視怪物30%魔防' },
};
function mercTrait(m, key, def) { const t = m && MERC_TRAITS[m.cls]; return t && t[key] != null ? t[key] : def; }
const MERC_SLOTS = ['weapon','shield', 'helm', 'armor', 'tshirt', 'cloak', 'gloves', 'boots'];
const MERC_MODELS = Object.fromEntries(Object.keys(MERC_CLASSES).map(id => {
    const sprite = { charH: 160, drawH: ['spirit', 'arcane'].includes(id) ? 36 : 46, foot: [192, 282], art: 'images/sprites/mercenary/companions-v1/' + id + '/portrait.png' };
    for (const [action, frames, ms] of [['walk',4,130], ['attack',4,140], ['cast',2,220], ['hit',2,150]]) sprite[action] = { src: 'images/sprites/mercenary/companions-v1/' + id + '/' + action + '.png', cellW: 384, cellH: 320, frames: { down: frames, right: frames, up: frames }, ms };
    return [id, sprite];
}));
function mercPlayAnim(action, mon) {
    const m = mercActive(); if (SIM_MODE || !m || !MERC_MODELS[m.cls][action]) return;
    const r = mercState(m), old = r.anim;
    if (old && gameNow < old.until && (action === 'hit' && ['attack','cast'].includes(old.action) || action === 'attack' && old.action === 'cast')) return;
    const spec = MERC_MODELS[m.cls][action];
    r.anim = { action, at: gameNow, until: gameNow + spec.frames.down * spec.ms };
    const d = scene && scene.mercenary, target = mon && scene && scene.mons && scene.mons.find(x => x.inst === mon && !x.dead);
    if (d && d.owner === m && target) { const dx = target.rx-d.rx, dy = target.ry-d.ry; d.dir = Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 'right' : 'left') : (dy > 0 ? 'down' : 'up'); }
}
const MERC_REVIVE_COST = 1000;
const MERC_QUEST_KILLS = 5000;
function mercQuestNormalize(p) {
    const q = p.mercQuest;
    p.mercQuest = { active: !!(q && q.active === true), kills: q && Number.isFinite(q.kills) ? clamp(Math.floor(q.kills), 0, MERC_QUEST_KILLS) : 0 };
    if (!p.mercQuest.active || p.mercenary && !p.mercenary.dead) p.mercQuest = { active: false, kills: 0 };
}
function mercQuestAccept() {
    if (!mercTownReady() || player.mercenary && !player.mercenary.dead || player.mercQuest.active) return;
    player.mercQuest = { active: true, kills: 0 }; mercRefresh();
}
function mercQuestOnKill() {
    const q = player.mercQuest;
    if (SIM_MODE || !q || !q.active || player.mercenary && !player.mercenary.dead || q.kills >= MERC_QUEST_KILLS) return;
    q.kills++;
    if (q.kills === MERC_QUEST_KILLS) { addLog('⚑ 傭兵團試煉完成！請回村莊找傭兵團長領取隨機傭兵。', 'sys'); saveGame(); }
}
function mercQuestClaim() {
    const owner = player, q = player.mercQuest, previous = player.mercenary;
    if (!mercTownReady() || !q.active || q.kills < MERC_QUEST_KILLS || previous && !previous.dead) return;
    gameConfirm('領取隨機傭兵', '隨機獲得六職業之一的Lv.1傭兵，四格技能為空。' + (previous ? '原本陣亡傭兵將被替換，無法再復活。' : ''), () => {
        if (player !== owner || !mercTownReady() || player.mercQuest !== q || !q.active || q.kills < MERC_QUEST_KILLS || player.mercenary !== previous || previous && !previous.dead) return;
        q.active = false; q.kills = 0;
        const keys = Object.keys(MERC_CLASSES), cls = keys[rand(0, keys.length - 1)];
        const m = { cls, lv: 1, exp: 0, hp: 1, mp: 0, dead: false, active: false, equip: {}, skills: ['', '', '', ''], cds: {} };
        if (previous) mercRuntime.delete(previous);
        player.mercenary = m; const st = mercStats(m); m.hp = st.hp; m.mp = st.mp;
        addLog('⚑ 完成傭兵團試煉，獲得' + MERC_CLASSES[cls].person + '・' + MERC_CLASSES[cls].name + '！', 'sys'); mercRefresh();
    }, '隨機領取');
}
function mercDismiss() {
    const owner = player, m = player.mercenary;
    if (!mercTownReady() || !m) return;
    gameConfirm('放棄傭兵', '放棄後無法復原此傭兵的等級；身上裝備與符石退回背包，陣亡時已失去的物品不恢復。之後可重新接取傭兵團試煉，任務進度重新計算。', () => {
        if (player !== owner || !mercTownReady() || player.mercenary !== m) return;
        if (!m.dead) {
            for (const slot of MERC_SLOTS) if (m.equip[slot]) player.inv.push(m.equip[slot]);
            for (const id of m.skills) if (MERC_RUNES[id]) addItem('mercRune_' + id);
        }
        mercRuntime.delete(m); player.mercenary = null; player.mercQuest = { active: false, kills: 0 }; mercRefresh();
    }, '放棄傭兵');
}
function mercQuestHtml() {
    if (player.mercenary && !player.mercenary.dead) return '';
    const q = player.mercQuest, town = mercTownReady();
    return '<div class="panel"><h4>傭兵團試煉</h4><p>接取後擊殺任意怪物' + fmt(MERC_QUEST_KILLS) + '隻，回團長處隨機獲得六職業之一的Lv.1傭兵。每種職業機率相同。</p>' + (q.active ? '<p>討伐進度：' + fmt(q.kills) + '／' + fmt(MERC_QUEST_KILLS) + '</p>' + (q.kills >= MERC_QUEST_KILLS ? '<button onclick="mercQuestClaim()" ' + (!town ? 'disabled' : '') + '>領取隨機傭兵</button>' : '<small>任務進行中，完成後請回報團長。離線收益不累積進度。</small>') : '<button onclick="mercQuestAccept()" ' + (!town ? 'disabled' : '') + '>接取傭兵任務</button>') + '</div>';
}
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
const MERC_RUNE_DROPS = {
    basic: Object.values(MERC_RUNE_ROWS).flatMap(rows => rows.slice(0, 4).map(row => 'mercRune_' + row[0])),
    special: Object.values(MERC_RUNE_ROWS).flatMap(rows => rows.slice(4).map(row => 'mercRune_' + row[0])),
    normalP: .001, bossP: .05
};
function mercRuneSource(id) {
    return MERC_RUNE_DROPS.basic.includes(id) ? '基本符石：黃色稀有異界地圖一般怪0.1%' : '特殊符石：黃色稀有異界首領／團隊副本勝利5%';
}
function rollMercRuneDrop(mon, raid = false) {
    if (SIM_MODE || !raid && (!inMapRun() || player.mapRun.q !== 'rare' || treasureMapActive())) return null;
    const special = raid || mon.boss, pool = MERC_RUNE_DROPS[special ? 'special' : 'basic'];
    return chance(special ? MERC_RUNE_DROPS.bossP : MERC_RUNE_DROPS.normalP) ? pool[rand(0, pool.length - 1)] : null;
}
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
const mercDebuffs = new WeakMap(); // 玩家與傭兵的敵方狀態只存在本次遊玩，不改存檔。
function mercNegative(owner) {
    let buffs=mercDebuffs.get(owner);
    if(!buffs){buffs={};mercDebuffs.set(owner,buffs);}
    for(const id in buffs)if(buffs[id].until<=gameNow)delete buffs[id];
    return buffs;
}
function mercEnemyStatus(mon, magic, dealt, owner) {
    if(SIM_MODE || !magic || dealt<=0 || !owner || owner.hp<=0)return;
    const kind=['giantSpider','venomSpider','spiderQueen'].includes(mon.id)?'poison':['ghast','frostWitch','iceGiantKing'].includes(mon.id)?'slow':null;
    if(!kind)return;
    const buffs=mercNegative(owner), old=buffs[kind];
    buffs[kind]={name:kind==='poison'?'中毒':'冰霜緩速',until:gameNow+(kind==='poison'?6000:4000),at:old?old.at:gameNow+1000,damage:Math.max(1,Math.round(dealt*.12))};
    addLog((owner===player?'你':'傭兵')+'受到'+buffs[kind].name+'！','warn');
}
function mercDebuffTick() {
    if(SIM_MODE || !player)return;
    for(const owner of [player,player.mercenary].filter(Boolean)) {
        if(owner.hp<=0 || owner===player.mercenary && (!owner.active || owner.dead) || inTown()){mercDebuffs.delete(owner);continue;}
        const b=(mercDebuffs.get(owner)||{}).poison;
        if(b && b.until<gameNow){delete mercDebuffs.get(owner).poison;continue;}
        if(!b || b.at>gameNow)continue;
        b.at=gameNow+1000;
        // 毒傷不致死、不觸發反傷／代擋，避免重複附加和找不到死亡來源。
        const damage=Math.min(Math.max(0,owner.hp-1),b.damage);owner.hp-=damage;
        if(damage)addLog((owner===player?'你':'傭兵')+'中毒受到 '+damage+' 傷害','hurt');
    }
}
function mercSlowFactor(owner) { return !SIM_MODE && owner && mercNegative(owner).slow ? 1.2 : 1; }
function mercActive() { const m = player && player.mercenary; return !SIM_MODE && m && !m.dead && m.active && player.hp > 0 ? m : null; }
function mercState(m = player.mercenary) {
    let r = mercRuntime.get(m);
    if (!r) { r = { buffs: {}, cds: m.cds || (m.cds = {}), summons: [], dots: [], attackAt: 0, skillAt: 0, regenAt: gameNow + 1000 }; mercRuntime.set(m, r); }
    return r;
}
function mercBuff(id, m = player.mercenary) { const b = m && mercState(m).buffs[id]; return b && b.until > gameNow ? b.power : 0; }
function mercEffectOn(mon, kind) { return !!(mon && mon.mercEffects && mon.mercEffects[kind] > gameNow); }
function mercEffectSet(mon, kind, sec) {
    if (!mon.mercEffects) mon.mercEffects = {};
    mon.mercEffects[kind] = Math.max(mon.mercEffects[kind] || 0, gameNow + sec * 1000);
}
function mercWeaponRange(m = player.mercenary) {
    const w = m && m.equip.weapon, d = w && ITEMS[w.id];
    return d && ['bow','gun'].includes(d.type) ? 8 : 1;
}
function mercTarget(mon) { return scene && scene.mons && scene.mons.find(x => x.inst === mon && !x.dead); }
function mercInRange(mon, range, origin) {
    if (!scene || !scene.grid || !scene.pl) return true; // 無場景的背景戰鬥沿玩家的抽象距離規則。
    const d = origin || scene.mercenary, t = mercTarget(mon);
    if (!d || !t) return false;
    const dx = Math.abs(t.rx - d.rx), dy = Math.abs(t.ry - d.ry);
    return (range === 1 ? Math.max(dx, dy) <= 1.45 : Math.hypot(dx, dy) <= range + .5) && lineOfSight(Math.round(d.rx), Math.round(d.ry), Math.round(t.rx), Math.round(t.ry));
}
function mercAttackKind(k) { return ['physical','physicalArea','pierce','execute','bleed','stun','drain','magic','slow','magicArea','poison','weaken'].includes(k); }
function mercSkillRange(s) { return ['magic','slow','magicArea','poison','weaken'].includes(s.kind) ? 4 : mercWeaponRange(); }
function mercSkillOrder(m) {
    const st = mercStats(m), ps = calcStats(), critical = player.hp < ps.maxHp * .4 || m.hp < st.hp * .4;
    const score = id => {
        const s = MERC_RUNES[id]; if (!s) return 99;
        if (critical && ['healPlayer','healBoth','restore','healSelf','lastStand'].includes(s.kind)) return 0;
        if (['cleansePlayer','cleanseSelf'].includes(s.kind)) return 1;
        if (['healPlayer','healBoth','restore','healSelf','hot','selfHot'].includes(s.kind)) return 2;
        if (s.kind.endsWith('Area') && hunt && hunt.mobs.filter(t => t.hp > 0 && mercInRange(t, mercSkillRange(s))).length >= 2) return 3;
        return 4;
    };
    return m.skills.map((id,i) => ({id,i,score:score(id)})).sort((a,b) => a.score-b.score || a.i-b.i).map(x => x.id);
}
function mercSkillVfx(id, mon) {
    if (SIM_MODE || !scene || !scene.mercenary) return;
    const r = mercState(), d = scene.mercenary, s = MERC_RUNES[id];
    if (!s) return;
    const t = mercAttackKind(s.kind) || s.kind.startsWith('summon') && s.kind !== 'summonHeal' ? mercTarget(mon) : null;
    const healPlayer = ['healPlayer','healBoth','restore','hot','manaPlayer','cleansePlayer','summonHeal'].includes(s.kind);
    const dest = t || (healPlayer ? scene.pl : d);
    if (!dest) return;
    if (!r.vfx) r.vfx = [];
    r.vfx.push({ id, at: gameNow, from: {x:d.rx,y:d.ry}, to:{x:dest.rx,y:dest.ry} });
    if (r.vfx.length > 16) r.vfx.shift();
}
function mercStatusText(m = player.mercenary) {
    if (!m || m.dead) return '';
    const r = mercState(m), parts = [];
    for (const id of m.skills) if (MERC_RUNES[id]) {
        const left = Math.max(0, Math.ceil(((r.cds[id] || 0)-gameNow)/1000));
        parts.push(MERC_RUNES[id].name + '：' + (left ? left+'秒' : '就緒'));
    }
    for (const [id,b] of Object.entries(r.buffs)) if (b.until > gameNow) {
        const shield = ['shield','fortify','barrier'].includes(id);
        parts.push((MERC_RUNES[id] ? MERC_RUNES[id].name : b.name || id) + ' ' + Math.ceil((b.until-gameNow)/1000)+'秒' + (shield ? '／盾'+Math.ceil(b.power)+(id==='barrier'?'／玩家盾'+Math.ceil(b.player):'') : ''));
    }
    for(const b of Object.values(mercNegative(m))) parts.push(b.name+' '+Math.ceil((b.until-gameNow)/1000)+'秒');
    return parts.join(' · ');
}
function mercUpdateLive() {
    if (!player || !player.mercenary) return;
    for (const el of document.querySelectorAll('[data-merc-live-status]')) el.textContent = mercStatusText();
    for (let i=0;i<4;i++) {
        const id=player.mercenary.skills[i];
        if (!id) continue;
        const r=mercState(), b=r.buffs[id], sec=Math.max(0,Math.ceil(((r.cds[id]||0)-gameNow)/1000));
        for (const el of document.querySelectorAll('[data-merc-rune-live="'+i+'"]')) el.textContent=(sec ? '冷卻 '+sec+' 秒' : '技能就緒')+(b && b.until>gameNow ? ' · 生效 '+Math.ceil((b.until-gameNow)/1000)+' 秒' : '');
    }
}
function mercHudHtml() {
    const m=mercActive();if(!m)return '';
    const r=mercState(m),icons=m.skills.filter(id=>MERC_RUNES[id]).map(id=>'<img class="merc-hud-icon" src="images/icons/items/mercRune-v1/'+id+'.png?v=1" alt="'+esc(MERC_RUNES[id].name)+'" title="'+esc(MERC_RUNES[id].name)+'">').join('');
    const parts=r.summons.filter(s=>s.until>gameNow).map(s=>MERC_RUNES[s.id].name.replace('契約','')+' '+Math.ceil((s.until-gameNow)/1000)+'秒');
    for(const [id,b]of Object.entries(r.buffs))if(b.until>gameNow)parts.push((MERC_RUNES[id]?MERC_RUNES[id].name:b.name||id)+(['shield','fortify','barrier'].includes(id)?' 盾'+Math.ceil(b.power):''));
    for(const b of Object.values(mercNegative(m)))parts.push(b.name);
    return (icons?'<div class="merc-hud-runes">'+icons+'</div>':'')+(parts.length?'<div class="merc-hud-text">'+esc(parts.join(' · '))+'</div>':'');
}
function mercStats(m = player.mercenary) {
    const c = MERC_CLASSES[m.cls], fx = {}, w = m.equip.weapon, d = w && ITEMS[w.id];
    for (const slot of MERC_SLOTS) {
        const it = m.equip[slot]; if (!it) continue;
        const def = ITEMS[it.id]; if (!def) continue;
        addFx(fx, affixFx(it));
        if (slot !== 'weapon') { addFx(fx, def); fx.ac = (fx.ac || 0) + (it.ench || 0); }
    }
    const talent=typeof talentBonuses==='function'?talentBonuses().mods:{};
    fx.hp=(fx.hp||0)+(talent['出戰傭兵最大生命']||0);fx.mp=(fx.mp||0)+(talent['出戰傭兵最大魔力']||0);
    fx.ac=(fx.ac||0)+(talent['出戰傭兵防禦']||0);fx.mr=(fx.mr||0)+(talent['出戰傭兵魔防']||0);
    const lv=m.lv-1;
    const base={atk:c.atk+Math.floor(lv/5),magic:c.magic+Math.floor(lv/4),def:c.def+Math.floor(lv/10),mr:10+Math.floor(lv/5)};
    const gear={atk:(d?(d.dmg[0]+d.dmg[1])/2+(w.ench||0):0)+(fx.dmg||0),magic:((fx.sp||0)+((d&&d.sp)||0))*3+(d&&d.type==='staff'?(w.ench||0):0),def:fx.ac||0,mr:fx.mr||0};
    const buffs={atk:mercBuff('might',m),magic:0,def:mercBuff('iron',m),mr:mercBuff('ward',m)};
    return { hp: c.hp + (m.lv - 1) * 18 + (fx.hp || 0), mp: c.mp + (m.lv - 1) * 8 + (fx.mp || 0),
        atk:base.atk+gear.atk+buffs.atk,magic:base.magic+gear.magic,
        def:base.def+gear.def+buffs.def,mr:base.mr+gear.mr+buffs.mr,base,gear,buffs,
        regen: c.regen+(talent['出戰傭兵每秒回魔']||0), dodge: Math.min(.5, mercTrait(m, 'dodge', 0) + (fx.dodge || 0) + mercBuff('evasion', m)),
        heal: mercTrait(m, 'heal', 1), speed: (d ? WEAPON_TYPES[d.type].spd : 1200) / (1 + mercTrait(m, 'spd', 0) + (fx.spdMul || 0) + mercBuff('haste', m)) * mercSlowFactor(m) };
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
    player.mercQuest = { active: false, kills: 0 };
    m.dead = true; m.active = false; m.hp = 0; m.mp = 0; m.equip = {}; m.skills = ['', '', '', '']; m.cds = {}; mercRuntime.delete(m);
    addLog('⚑ 傭兵陣亡！身上裝備與技能永久消失，請找傭兵團長復活，或接任務取得新傭兵。', 'warn');
    if (!SIM_MODE) saveGame();
}
function mercTakeDamage(value) {
    const m = mercActive(); if (!m || value <= 0) return 0;
    const r = mercState(m), st = mercStats(m);
    if (chance(st.dodge)) return 0;
    let damage = Math.max(1, Math.round((value - st.def / 3) * mercTrait(m, 'taken', 1)));
    if (mercBuff('lastStand')) damage = Math.round(damage * .5);
    for (const key of ['fortify', 'shield', 'barrier']) {
        const b = r.buffs[key]; if (!b || b.until <= gameNow) continue;
        const n = Math.min(damage, b.power); b.power -= n; damage -= n;
    }
    const dealt = Math.min(m.hp, damage); m.hp -= damage;
    if (dealt > 0 && m.hp > 0) mercPlayAnim('hit');
    if (m.hp <= 0) mercDie(); return dealt;
}
function mercEnemyAttack(mon) {
    const m = mercActive(); if (!m || !chance(Math.max(mercBuff('taunt'), mercTrait(m, 'aggro', .25)))) return false;
    const st = mercStats(m), magic = mon.magic && chance(mon.magic.p);
    if (!mercInRange(mon, magic ? 4 : 1)) return false;
    let value = magic ? rand(...mon.magic.dmg) * (1 - Math.min(150, st.mr) / 200) : rand(...mon.dmg);
    if (mercEffectOn(mon, 'weaken')) value *= mon.boss ? .95 : .85;
    const dealt = mercTakeDamage(value);
    mercEnemyStatus(mon, magic, dealt, m);
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
function mercHit(mon, amount, magic = false, pierce = false, summon=false) {
    if (!mon || mon.hp <= 0) return 0;
    const mr = clamp(mon.mr || 0, 0, 150) * (1 - mercTrait(player.mercenary, 'mrIgnore', 0));
    if(typeof talentMercMult==='function')amount*=talentMercMult(summon);
    const value = Math.max(1, Math.round(amount * (magic ? 1 - mr / 200 : 1) - (!magic && !pierce ? Math.max(0, -(mon.ac || 0) / 5) : 0)));
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
    if (k === 'cleansePlayer' && !Object.values(player.buffs).some(b => b.until > gameNow && (b.negative || b.src === 'debuff')) && !Object.keys(mercNegative(player)).length) return false;
    if (k === 'cleanseSelf' && !Object.keys(r.buffs).some(key => r.buffs[key].until > gameNow && r.buffs[key].negative) && !Object.keys(mercNegative(m)).length) return false;
    const attackKinds = ['physical','physicalArea','pierce','execute','bleed','stun','drain','magic','slow','magicArea','poison','weaken'];
    if (attackKinds.includes(k) && (!mon || mon.hp <= 0)) return false;
    if (attackKinds.includes(k) && !mercInRange(mon, mercSkillRange(s))) return false;
    if (r.buffs[id] && r.buffs[id].until > gameNow && r.buffs[id].power > 0) return false;
    if (k.startsWith('summon') && r.summons.some(x => x.id === id && x.until > gameNow)) return false;
    mercPlayAnim(['physical','physicalArea','pierce','execute','bleed','stun','drain'].includes(k) ? 'attack' : 'cast', mon);
    m.mp -= s.mp; r.cds[id] = gameNow + s.cd * 1000; r.skillAt = gameNow + 1000;
    const heal = v => Math.round(st.magic * v * st.heal), selfHeal = v => { m.hp = Math.min(st.hp, m.hp + heal(v)); }, playerHeal = v => { player.hp = Math.min(ps.maxHp, player.hp + heal(v)); };
    if (!attackKinds.includes(k)) mercSkillVfx(id, mon);
    if (k.startsWith('summon')) {
        r.summons = r.summons.filter(x => x.until > gameNow); if (r.summons.length >= mercTrait(m, 'summonMax', 2)) r.summons.shift();
        r.summons.push({ id, until: gameNow + s.sec * 1000, at: gameNow, power: s.power * mercTrait(m, 'summon', 1) });
    } else if (['healPlayer','healBoth','restore'].includes(k)) { playerHeal(s.power); if (k !== 'healPlayer') selfHeal(s.power); if (k === 'restore') player.mp = Math.min(ps.maxMp, player.mp + 8); }
    else if (k === 'healSelf') selfHeal(s.power);
    else if (k === 'manaPlayer') player.mp = Math.min(ps.maxMp, player.mp + s.power);
    else if (k === 'manaSelf') m.mp = Math.min(st.mp, m.mp + s.power);
    else if (k === 'convert') { const n = Math.floor(st.hp * s.power); m.hp -= n; m.mp = Math.min(st.mp, m.mp + n); }
    else if (k === 'cleansePlayer') { mercDebuffs.delete(player); for (const key in player.buffs) if (player.buffs[key].negative || player.buffs[key].src === 'debuff') delete player.buffs[key]; }
    else if (k === 'cleanseSelf') { mercDebuffs.delete(m); for (const key in r.buffs) if (r.buffs[key].negative) delete r.buffs[key]; }
    else if (attackKinds.includes(k)) {
        const magic = ['magic','slow','magicArea','poison','weaken'].includes(k);
        const power = ((magic ? st.magic : st.atk) + mercBuff('focus')) * (magic ? mercTrait(m, 'magicSkill', 1) : mercTrait(m, 'phys', 1));
        const targets = k.endsWith('Area') ? [mon, ...hunt.mobs.filter(x => x !== mon)].filter(x => x.hp > 0 && mercInRange(x, mercSkillRange(s))).slice(0,3) : [mon];
        if (k === 'bleed' || k === 'poison') { mercSkillVfx(id, mon); r.dots.push({ mon, until: gameNow + s.sec * 1000, at: gameNow + 1000, amount: power * s.power, magic }); }
        else for (const target of targets) { const dealt = mercHit(target, power * s.power * (k === 'execute' && target.hp < target.maxHp * .3 ? 2 : 1), magic, k === 'pierce'); mercSkillVfx(id, target); if (k === 'drain') m.hp = Math.min(st.hp, m.hp + Math.round(dealt * .5)); }
        if (k === 'stun' && !mon.boss) mon.stunUntil = Math.max(mon.stunUntil || 0, gameNow + s.sec * 1000);
        if (k === 'slow' || k === 'weaken') mercEffectSet(mon, k, s.sec);
    } else {
        let power = s.power;
        if (['shield','selfShield','teamShield'].includes(k)) power = heal(power);
        r.buffs[id] = { power, until: gameNow + s.sec * 1000 * (s.group === 'support' ? mercTrait(m, 'buffSec', 1) : 1), at: gameNow + 1000, player: k === 'teamShield' ? power : 0 };
    }
    addLog('⚑ ' + MERC_CLASSES[m.cls].person + '使用「' + s.name + '」', 'sys'); return true;
}
function mercAutoPotion(m = mercActive()) {
    if(!m||m!==mercActive()||SIM_MODE||!player.hunting||inTown()||m.hp<=0||!barHealAuto())return false;
    const st=mercStats(m),r=mercState(m);
    if(m.hp>=st.hp||m.hp>=st.hp*player.settings.potionPct/100)return false;
    if(r.potionAt-gameNow>POTION_CD_MS)r.potionAt=0;
    if(r.potionAt>gameNow)return false;
    const id=choosePotion({maxHp:st.hp},m.hp);if(!id||!consumeItem(id))return false;
    r.potionAt=gameNow+POTION_CD_MS;
    const before=m.hp;m.hp=Math.min(st.hp,m.hp+rand(...ITEMS[id].heal));
    addLog('🧪 傭兵飲用'+(ITEMS[id].short||ITEMS[id].name)+'：HP +'+(m.hp-before)+'（扣玩家藥水1瓶）','heal');
    return true;
}
function mercTick(dt) {
    const m = mercActive(); if (!m) return;
    const r = mercState(m), st = mercStats(m);
    if (gameNow >= r.regenAt) { r.regenAt = gameNow + 1000; m.mp = Math.min(st.mp, m.mp + st.regen); m.hp = Math.min(st.hp, m.hp + mercTrait(m, 'hpRegen', 1)); }
    const mon = hunt && hunt.state === 'fight' && hunt.mon && hunt.mon.hp > 0 ? hunt.mon : null;
    for (const [id, b] of Object.entries(r.buffs)) {
        if (b.until < gameNow) { delete r.buffs[id]; continue; }
        const s = MERC_RUNES[id]; if (!s || !['hot','selfHot'].includes(s.kind) || b.at > gameNow) continue;
        b.at = gameNow + 1000; m.hp = Math.min(st.hp, m.hp + Math.round(st.magic * s.power * st.heal));
        if (s.kind === 'hot') player.hp = Math.min(calcStats().maxHp, player.hp + Math.round(st.magic * s.power * st.heal));
    }
    if (!player.hunting) return;
    mercAutoPotion(m);
    for (const id of mercSkillOrder(m)) {
        const s=MERC_RUNES[id];
        const target=s && mercAttackKind(s.kind) && mon ? [mon,...hunt.mobs.filter(x=>x!==mon)].find(x=>x.hp>0 && mercInRange(x,mercSkillRange(s))) : mon;
        if (mercCast(id, target)) break;
    }
    for (const dot of r.dots) if (dot.until >= gameNow && dot.mon.hp > 0 && hunt.mobs.includes(dot.mon) && dot.at <= gameNow) { dot.at = gameNow + 1000; mercHit(dot.mon, dot.amount, dot.magic); }
    r.dots = r.dots.filter(x => x.until > gameNow && x.mon.hp > 0 && hunt.mobs.includes(x.mon));
    r.summons = r.summons.filter(x => x.until > gameNow);
    for (const x of r.summons) {
        if (x.at > gameNow) continue;
        const s = MERC_RUNES[x.id];
        const target=mon && [mon,...hunt.mobs.filter(t=>t!==mon)].find(t=>t.hp>0 && mercInRange(t,4));
        if (s.kind !== 'summonHeal' && !target) continue;
        x.at = gameNow + 2000; x.actedAt = gameNow;
        mercSkillVfx(x.id, s.kind === 'summonHeal' ? null : target);
        if (s.kind === 'summonHeal') { m.hp = Math.min(st.hp, m.hp + Math.round(st.magic * x.power)); player.hp = Math.min(calcStats().maxHp, player.hp + Math.round(st.magic * x.power)); }
        else { const targets = s.kind === 'summonArea' ? [target,...hunt.mobs.filter(t=>t!==target)].filter(t => t.hp > 0 && mercInRange(t, 4)).slice(0,3) : [target]; for (const t of targets) mercHit(t, st.magic * x.power, true, false, true); if (s.kind === 'summonSlow') mercEffectSet(target, 'slow', 2.5); }
    }
    const attackMon=mon && [mon,...hunt.mobs.filter(t=>t!==mon)].find(t=>t.hp>0 && mercInRange(t,mercWeaponRange(m)));
    if (attackMon && gameNow >= r.attackAt) { r.attackAt = gameNow + Math.max(400, st.speed); mercPlayAnim('attack', attackMon); mercHit(attackMon, st.atk * (chance(mercTrait(m, 'crit', 0)) ? mercTrait(m, 'critMul', 1) : 1)); }
}
function mercTownReady() { return !!(player && inTown() && !SIM_MODE); }
function mercRefresh() { saveGame(); refreshUI(); if (typeof mercPanelOpen !== 'undefined' && mercPanelOpen) openMercenary(); }
function mercRevive() {
    const m = player.mercenary; if (!mercTownReady() || !m || !m.dead) return;
    const owner = player, cost = m.lv * MERC_REVIVE_COST;
    gameConfirm('復活傭兵', '花費' + fmt(cost) + '金幣復活，保留Lv.' + m.lv + '，失去的裝備與技能不恢復。復活後會取消進行中的傭兵取得任務。', () => {
        if (player !== owner || !mercTownReady() || player.mercenary !== m || !m.dead || player.gold < cost) return;
        player.mercQuest = { active: false, kills: 0 };
        player.gold -= cost; m.dead = false; m.active = false; const st = mercStats(m); m.hp = st.hp; m.mp = st.mp; mercRuntime.delete(m); mercRefresh();
    }, '復活');
}
function mercToggle() {
    const m = player.mercenary; if (!mercTownReady() || !m || m.dead) { showToast('請回村莊調整傭兵出戰'); return; }
    m.active = !m.active; mercRefresh();
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
function mercPickRune(slot) {
    mercPanelOpen = true;
    const m = player.mercenary; if (!mercTownReady() || !m || m.dead) return;
    const rows = player.inv.filter(x => ITEMS[x.id].cat === 'mercRune' && !m.skills.includes(ITEMS[x.id].rune)).map(x => { const id = ITEMS[x.id].rune; return '<div class="list-row">' + itemThumbHtml(x.id) + '<div><b>' + esc(ITEMS[x.id].name) + ' ×' + x.n + '</b><small>' + esc(mercRuneText(id)) + '</small></div><button onclick="mercSetRune(' + slot + ',\'' + id + '\')">配置</button></div>'; }).join('');
    openDialog('配置第' + (slot + 1) + '格符石', '<div class="list">' + (rows || '背包沒有可用的傭兵技能符石。') + '</div>', [{ text: '返回', onClick: openMercenary }]);
}
function mercPickEquip(slot) {
    mercPanelOpen = true;
    if (!mercTownReady() || !MERC_SLOTS.includes(slot)) return;
    const rows = player.inv.filter(x => { const d = ITEMS[x.id]; return !x.sellLocked && (slot === 'weapon' ? d.cat === 'weapon' : d.cat === 'armor' && d.slot === (slot.startsWith('ring') ? 'ring' : slot)); }).map(x => '<div class="list-row"><div><b>' + esc(itemName(x)) + '</b><small>' + esc(itemDescHtml(x).replace(/<[^>]*>/g,' ')) + '</small></div><button onclick="mercEquip(' + x.uid + ',\'' + slot + '\')">交付</button></div>').join('');
    openDialog('傭兵裝備・' + SLOTS[slot], '<p class="bad">交付後傭兵死亡會永久失去此裝備。鎖定物品須先解鎖。</p><div class="list">' + (rows || '背包沒有可用裝備。') + '</div>', [{ text: '返回', onClick: openMercenary }]);
}
function mercCardHtml() {
    const m = player.mercenary, c = m && MERC_CLASSES[m.cls];
    return '<div class="cv-companion-art' + (c ? '' : ' cv-companion-empty') + '">' + (c ? '<img src="' + MERC_MODELS[m.cls].art + '" alt="' + esc(c.person + '・' + c.name) + '"' + (m.dead ? ' class="merc-model-dead"' : '') + '>' : '') + '</div><div class="cv-companion-desc"><span>' + (c ? mercNameHtml(m) + '<br>Lv.' + m.lv + (m.dead ? ' 陣亡' : m.active ? ' 出戰中' : ' 待命') + '<br>HP ' + Math.ceil(m.hp) + '／MP ' + Math.ceil(m.mp) : '未持有傭兵') + '</span></div><button class="mini" onclick="openMercenary()">管理傭兵</button><div class="cv-companion-desc"><small>與娃娃獨立，可同時出戰。四格符石自由搭配。</small></div>';
}
function mercRuneBoardHtml(m, town) {
    return '<section class="merc-rune-board" aria-label="四格技能符石鑲嵌石板"><header><span aria-hidden="true">◆</span><h4>四格技能符石</h4><span aria-hidden="true">◆</span></header><p class="merc-board-hint">點擊凹槽鑲嵌符石・救命／淨化優先</p><div class="merc-rune-sockets">' + m.skills.map((id, i) => {
        const rune = MERC_RUNES[id], locked = !town || m.dead, name = rune ? rune.name : '空白凹槽';
        return '<article class="merc-socket-card ' + (rune ? 'filled rune-' + rune.group : 'vacant') + '"><span class="merc-socket-number">' + ['Ⅰ','Ⅱ','Ⅲ','Ⅳ'][i] + '</span><button type="button" class="merc-socket" onclick="mercPickRune(' + i + ')" aria-label="第' + (i + 1) + '格：' + esc(name) + '，' + (rune ? '替換符石' : '選擇符石') + '" ' + (locked ? 'disabled' : '') + '><span class="merc-socket-rim" aria-hidden="true">' + (rune ? '<img class="merc-rune-art" src="images/icons/items/mercRune-v1/' + id + '.png?v=1" alt="" draggable="false">' : '<span class="merc-socket-empty">＋</span>') + '</span></button><b class="merc-socket-name">' + esc(name) + '</b><small class="merc-socket-type">' + (rune ? MERC_GROUPS[rune.group] + '系・已鑲嵌' : '尚未鑲嵌') + '</small>' + (rune ? '<small data-merc-rune-live="' + i + '" class="merc-socket-cost">' + (m.dead ? '陣亡' : '技能就緒') + '</small><small class="merc-socket-cost">MP ' + rune.mp + ' · 冷卻 ' + rune.cd + ' 秒</small><details class="merc-rune-detail"><summary>效果說明</summary><small>' + esc(mercRuneText(id)) + '</small></details><button type="button" class="merc-rune-remove" onclick="mercSetRune(' + i + ',\'\')" ' + (locked ? 'disabled' : '') + '>拆回背包</button>' : '<small class="merc-socket-help">點擊上方孔位放入技能</small>') + '</article>';
    }).join('') + '</div></section>';
}
function mercStatsHtml(st) {
    return '<details class="panel"><summary>攻防來源（基礎＋裝備＋增益）</summary><table style="width:100%;text-align:center;font-size:12px"><thead><tr><th>能力</th><th>基礎</th><th>裝備</th><th>增益</th><th>合計</th></tr></thead><tbody>'+[['atk','物攻'],['magic','魔攻'],['def','防禦'],['mr','魔防']].map(([k,n])=>'<tr><th>'+n+'</th><td>'+Math.round(st.base[k])+'</td><td>'+Math.round(st.gear[k])+'</td><td>'+Math.round(st.buffs[k])+'</td><td>'+Math.round(st[k])+'</td></tr>').join('')+'</tbody></table><small>等級僅小幅增加攻防；武器傷害、強化與裝備詞綴另計。魔杖每＋1額外增加1魔攻。</small></details>';
}
function renderMercenary() {
    const m = player.mercenary, c = m && MERC_CLASSES[m.cls], town = mercTownReady();
    let h = '<div class="panel"><p>六職業共用50種符石，同時只能召喚一名傭兵。在村莊配置與調整出戰，傭兵不可購買。</p><p>出戰掛機時，傭兵沿用玩家快捷欄的自動補血開關與HP門檻，共用背包治癒藥水，每瓶只補傭兵並扣玩家1瓶；各自喝水延遲0.8秒。</p><p class="bad">死亡永久失去身上全部裝備與已配置符石；背包物品不受影響。復活保留等級。</p><details><summary>戰鬥與裝備規則</summary><small>不限制武器職業，雙手武器與盾牌互斥。一般掛機生效；離線／團隊副本／世界首領暫不參戰。遠程武器不耗玩家彈藥，裝備共鳴與BOSS附魔暫不觸發。技能優先救命治療、淨化、一般治療與多怪群攻；同類依四格順序，每秒最多一招。近戰1格、弓槍8格、魔法與召喚攻擊4格，障礙物會阻擋。召喚物最多2隻（契靈師3隻）。職業特色：' + Object.keys(MERC_CLASSES).map(k => MERC_CLASSES[k].name + '－' + MERC_TRAITS[k].text).join('；') + '。毒系／冰系指定怪物魔法命中附加中毒6秒／緩速4秒，淨化可解除；毒傷最低保留1HP，回村清除。</small></details></div>';
    h += mercQuestHtml();
    if (m) {
        const st = mercStats(m);
        h += '<div class="panel"><div class="merc-model-portrait"><img src="' + MERC_MODELS[m.cls].art + '" alt="' + esc(c.person + '・' + c.name) + '"' + (m.dead ? ' class="merc-model-dead"' : '') + '></div><b>' + mercNameHtml(m) + '</b>（' + c.sex + '／' + c.age + '）<br><small class="good">職業特色：' + MERC_TRAITS[m.cls].text + '</small><p>Lv.' + m.lv + '｜經驗 ' + fmt(m.exp) + '／' + fmt(mercExpNeed(m)) + '<br>HP ' + Math.ceil(m.hp) + '／' + st.hp + '　MP ' + Math.ceil(m.mp) + '／' + st.mp + '<br>物攻' + Math.round(st.atk) + '／魔攻' + Math.round(st.magic) + '／防禦' + st.def + '／魔防' + st.mr + '</p>' + (m.dead ? '<button onclick="mercRevive()" ' + (!town ? 'disabled' : '') + '>復活（' + fmt(m.lv * MERC_REVIVE_COST) + '金幣）</button>' : '<button onclick="mercToggle()" ' + (!town ? 'disabled' : '') + '>' + (m.active ? '收回傭兵' : '傭兵出戰') + '</button>') + '</div>';
        h += '<button onclick="mercDismiss()" ' + (!town ? 'disabled' : '') + '>放棄傭兵</button>';
        h += mercStatsHtml(st);
        h += '<p data-merc-live-status style="overflow-wrap:anywhere">' + esc(mercStatusText(m)) + '</p>';
        h += mercRuneBoardHtml(m, town);
        h += '<h4>傭兵裝備</h4><div class="merc-grid">' + MERC_SLOTS.map(slot => '<div class="panel"><b>' + SLOTS[slot] + '：' + (m.equip[slot] ? esc(itemName(m.equip[slot])) : '空白') + '</b><button onclick="mercPickEquip(\'' + slot + '\')" ' + (!town || m.dead ? 'disabled' : '') + '>選擇</button>' + (m.equip[slot] ? '<button onclick="mercUnequip(\'' + slot + '\')" ' + (!town || m.dead ? 'disabled' : '') + '>卸下</button>' : '') + '</div>').join('') + '</div>';
    }
    if (!m) h += '<div class="panel"><p>尚未持有傭兵。請向傭兵團長接取任務，完成後領取隨機傭兵。</p></div>';
    return h;
}
function sceneMercTick(dt) {
    const m = mercActive();
    if (!m || !scene || !scene.pl) { if (scene) scene.mercenary = null; return; }
    const pl = scene.pl;
    let d = scene.mercenary;
    if (!d || d.owner !== m || Math.hypot(d.rx - pl.rx, d.ry - pl.ry) > 8) {
        const spot = [[-1,0],[0,-1],[1,0],[0,1]].map(([x,y]) => [pl.x+x,pl.y+y]).find(([x,y]) => freeTileFor(x,y) && inHuntZone(x,y)) || [pl.x,pl.y];
        d = scene.mercenary = { owner: m, rx: spot[0], ry: spot[1], path: [], dir: 'down' };
        preloadSprite(MERC_MODELS[m.cls]);
    }
    if (sceneTeleDodge(d,dt)) { sceneMercMove(d,dt);return; }
    const target = player.hunting && hunt && hunt.state === 'fight' && mercTarget(hunt.mon);
    let goal = pl, range = 1;
    if (target && Math.hypot(target.rx-pl.rx,target.ry-pl.ry) <= 9) {
        const attackSkills = m.skills.map(id=>MERC_RUNES[id]).filter(s=>s && mercAttackKind(s.kind) && m.mp>=s.mp);
        range = attackSkills.length ? Math.max(mercWeaponRange(m), ...attackSkills.map(mercSkillRange)) : mercWeaponRange(m);
        goal = target;
    }
    const arrived = goal === pl ? Math.hypot(d.rx-pl.rx,d.ry-pl.ry)<=1.7 : mercInRange(goal.inst, range);
    const key = Math.round(goal.rx)+','+Math.round(goal.ry)+','+range;
    if (arrived) d.path=[];
    else if ((!d.path.length || d.goal !== key) && (!d.retryAt || d.retryAt <= gameNow)) {
        d.goal=key;d.retryAt=gameNow+300;
        const gx=Math.round(goal.rx), gy=Math.round(goal.ry), spots=[];
        const radius=goal===pl?1:range;
        for(let y=gy-radius;y<=gy+radius;y++)for(let x=gx-radius;x<=gx+radius;x++) {
            if(x===gx && y===gy || !freeTileFor(x,y) || !inHuntZone(x,y))continue;
            if(goal!==pl && !mercInRange(goal.inst,range,{rx:x,ry:y}))continue;
            spots.push({x,y,dist:Math.hypot(x-d.rx,y-d.ry)});
        }
        spots.sort((a,b)=>a.dist-b.dist);
        d.path=[];
        for(const p of spots) { const path=findPath(Math.round(d.rx),Math.round(d.ry),p.x,p.y,false,true);if(path.length){d.path=path;break;} }
    }
    sceneMercMove(d,dt);
}
function sceneMercMove(d, dt) {
    if (!d.path.length) return;
    const [x,y] = d.path[0]; if (!freeTileFor(x,y) || !inHuntZone(x,y)) { d.path = []; return; }
    const dx = x-d.rx, dy = y-d.ry, dist = Math.hypot(dx,dy), step = PLAYER_SPEED * dt / 1000;
    d.dir = Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 'right' : 'left') : (dy > 0 ? 'down' : 'up');
    if (dist <= step) { d.rx=x; d.ry=y; d.path.shift(); } else { d.rx += dx/dist*step; d.ry += dy/dist*step; }
}
function sceneDrawMerc(ctx, camX, camY) {
    const m = mercActive(), d = scene.mercenary; if (!m || !d || d.owner !== m) return;
    const x = d.rx*TILE-camX+TILE/2, y = d.ry*TILE-camY+TILE/2, st = mercStats(m);
    const sp = MERC_MODELS[m.cls], r = mercState(m), playing = r.anim && r.anim.until > gameNow;
    const action = playing ? r.anim.action : 'walk', anim = sp[action], img = spriteImage(anim.src);
    const dir = d.dir || 'down', row = { down: 0, right: 1, up: 2 }[animDir(dir)], n = anim.frames[animDir(dir)];
    const frame = playing ? Math.min(n-1, Math.floor((gameNow-r.anim.at)/anim.ms)) : d.path.length ? Math.floor(gameNow/anim.ms)%n : 1;
    const k = sp.drawH/sp.charH, dw = anim.cellW*k, dh = anim.cellH*k, dx = x-sp.foot[0]*k, dy = y+14-sp.foot[1]*k;
    const labelY = y+14-sp.drawH-14;
    ctx.save();
    ctx.fillStyle='#0005'; ctx.beginPath(); ctx.ellipse(x,y+12,10,3,0,0,Math.PI*2);ctx.fill();
    if (img) {
        const body = () => { ctx.save(); if (dir === 'left') {ctx.translate(x,0);ctx.scale(-1,1);ctx.translate(-x,0);} ctx.drawImage(img,frame*anim.cellW,row*anim.cellH,anim.cellW,anim.cellH,dx,dy,dw,dh);ctx.restore(); };
        body();
        if (drawOccPatch(ctx,dx,dy,dx+dw,y+16,d.ry,camX,camY)) {ctx.globalAlpha=OCC_GHOST;body();ctx.globalAlpha=1;}
    } else {
        ctx.fillStyle=mercRank(m).color;ctx.strokeStyle='#163b37';ctx.lineWidth=2;
        ctx.beginPath();ctx.moveTo(x,y-18);ctx.lineTo(x+9,y-8);ctx.lineTo(x,y+2);ctx.lineTo(x-9,y-8);ctx.closePath();ctx.fill();ctx.stroke();
    }
    ctx.fillStyle='#111'; ctx.fillRect(x-15,labelY+5,30,4);ctx.fillStyle='#77dc8b';ctx.fillRect(x-15,labelY+5,30*Math.max(0,m.hp/st.hp),4);
    const rank = mercRank(m), label = rank.name + '・' + MERC_CLASSES[m.cls].person + ' Lv.' + m.lv;
    ctx.font='10px sans-serif'; ctx.textAlign='center'; ctx.strokeStyle='#000'; ctx.lineWidth=3; ctx.strokeText(label,x,labelY);
    if (rank.id === 'legend') {
        const rainbow = ctx.createLinearGradient(x-80,0,x+80,0);
        for (let i=0;i<=6;i++) rainbow.addColorStop(i/6, 'hsl(' + ((gameNow/25+i*60)%360) + ',95%,70%)');
        ctx.fillStyle=rainbow;
    } else ctx.fillStyle=rank.color;
    ctx.fillText(label,x,labelY);
    if (rank.id === 'sss') {
        ctx.fillStyle='#ff4141';
        for (let i=0;i<3;i++) { const phase=(gameNow/1400+i/3)%1; ctx.globalAlpha=.3+.7*Math.abs(Math.sin(phase*Math.PI));ctx.beginPath();ctx.arc(x-65+phase*130,labelY-3+Math.sin(phase*12)*3,1.4,0,Math.PI*2);ctx.fill(); }
        ctx.globalAlpha=1;
    }
    sceneDrawMercEffects(ctx, camX, camY, m, d);
    ctx.restore();
}
// 原創透明圖集：上排行走／振翅，下排攻擊／施法；載入前沿用Canvas輪廓。
const MERC_SUMMON_ART = Object.fromEntries(['wolf','golem','butterfly','hawk','flameSpirit','iceSpirit','thunderSpirit','treeSpirit','swarm'].map(id => [id, { src: 'images/sprites/mercenary/summons-v1/' + id + '.png?v=1', cell: 256, size: id === 'hawk' ? 72 : id === 'butterfly' || id === 'swarm' ? 56 : 64 }]));
function mercDrawSummon(ctx, id, x, y, age, acting, actionAt = age - age % 450, dir = 'right') {
    const art = MERC_SUMMON_ART[id], img = art && spriteImage(art.src);
    if (img) {
        const frame = acting ? clamp(Math.floor((age-actionAt)/112.5),0,3) : Math.floor(age/140)%4;
        ctx.save();ctx.translate(x,y+5);
        if (dir === 'left') ctx.scale(-1,1);
        ctx.drawImage(img,frame*art.cell,acting?art.cell:0,art.cell,art.cell,-art.size/2,-art.size,art.size,art.size);
        ctx.restore();return;
    }
    const colors={wolf:'#b9c8ff',golem:'#8caa9b',butterfly:'#edb8ff',hawk:'#afe8e5',flameSpirit:'#ffad55',iceSpirit:'#92eaff',thunderSpirit:'#e6ccff',treeSpirit:'#a7d78a',swarm:'#d1ed78'};
    const color=colors[id], wave=Math.sin(age/120), bob=Math.sin(age/280)*2;
    ctx.save();ctx.translate(x,y+bob);ctx.globalAlpha*=.9;ctx.fillStyle=color;ctx.strokeStyle='#243445';ctx.lineWidth=1.2;
    const oval=(x,y,rx,ry)=>{ctx.beginPath();ctx.ellipse(x,y,rx,ry,0,0,Math.PI*2);ctx.fill();ctx.stroke();};
    const poly=points=>{ctx.beginPath();points.forEach(([x,y],i)=>i?ctx.lineTo(x,y):ctx.moveTo(x,y));ctx.closePath();ctx.fill();ctx.stroke();};
    if(id==='wolf') {
        oval(0,-9,11,6);poly([[-8,-11],[-17,-17],[-14,-7],[-8,-5]]);oval(10,-14,6,5);
        poly([[6,-17],[7,-24],[11,-18],[14,-23],[15,-15],[19,-12],[12,-10]]);
        for(let i=0;i<4;i++){const px=-7+i*5;ctx.fillRect(px,-6,3,7+Math.sin(age/110+i*Math.PI)*2);}
        ctx.fillStyle='#594b9c';oval(13,-15,1,1);
    } else if(id==='golem') {
        poly([[-9,-20],[7,-20],[11,-7],[5,-3],[-8,-4],[-12,-12]]);oval(0,-26,6,6);
        for(const side of [-1,1]) {ctx.fillRect(side*12-3,-19+wave*side,6,12);ctx.fillRect(side*5-3,-4,6,7-wave*side);}
        ctx.fillStyle='#caffce';ctx.fillRect(-4,-27,3,2);ctx.fillRect(2,-27,3,2);
    } else if(id==='butterfly' || id==='hawk') {
        const flap=5+Math.abs(wave)*11;
        if(id==='butterfly') {for(const side of [-1,1]){oval(side*flap*.65,-15,flap*.65,8);oval(side*flap*.5,-5,flap*.45,5);}ctx.fillStyle='#5c4381';oval(0,-10,2,10);}
        else {poly([[-2,-12],[-flap-7,-21],[-flap,-7],[-4,-6],[0,3],[4,-6],[flap,-7],[flap+7,-21],[2,-12]]);oval(0,-14,3,5);ctx.fillStyle='#ffeab0';poly([[2,-16],[8,-13],[2,-12]]);}
    } else if(id==='treeSpirit') {
        ctx.fillStyle='#896b49';poly([[-5,1],[-4,-17],[4,-17],[5,1],[9,4],[1,3],[-8,4]]);
        ctx.fillStyle=color;oval(-6,-21,7,8);oval(6,-21,7,8);oval(0,-29,8,8);
        ctx.strokeStyle=color;ctx.beginPath();ctx.moveTo(-3,-10);ctx.lineTo(-12,-16-wave);ctx.moveTo(3,-10);ctx.lineTo(12,-16+wave);ctx.stroke();
    } else if(id==='swarm') {
        for(let i=0;i<5;i++){const a=age/220+i*1.256,px=Math.cos(a)*12,py=-12+Math.sin(a)*7;oval(px-2,py-2,3,2);oval(px+2,py-2,3,2);ctx.fillStyle='#64742b';oval(px,py,1.6,3);ctx.fillStyle=color;}
    } else {
        if(id==='flameSpirit') poly([[0,-33],[-5,-20],[-12,-15],[-9,-5],[0,1],[10,-5],[12,-17],[6,-12],[4,-25],[1,-19]]);
        if(id==='iceSpirit') {poly([[0,-31],[-10,-15],[0,1],[10,-15]]);ctx.strokeStyle='#efffff';ctx.beginPath();ctx.moveTo(0,-31);ctx.lineTo(0,1);ctx.moveTo(-10,-15);ctx.lineTo(10,-15);ctx.stroke();}
        if(id==='thunderSpirit') poly([[4,-33],[-10,-14],[-1,-14],[-5,2],[12,-20],[3,-20]]);
        ctx.fillStyle='#fff7cd';oval(-3,-12,1.4,2);oval(3,-12,1.4,2);
    }
    if(acting){ctx.strokeStyle=color;ctx.lineWidth=2;ctx.beginPath();ctx.ellipse(0,-12,20,16,0,0,Math.PI*2);ctx.stroke();}
    ctx.restore();
}
function sceneDrawMercEffects(ctx, camX, camY, m, d) {
    const r=mercState(m), px=p=>p.x*TILE-camX+TILE/2, py=p=>p.y*TILE-camY+TILE/2;
    const x=px({x:d.rx}),y=py({y:d.ry});
    for(const t of (scene.mons||[])) {
        if(t.dead || !t.inst || t.inst.hp<=0)continue;
        const effects=['slow','weaken'].filter(k=>mercEffectOn(t.inst,k));
        if(!effects.length)continue;
        const tx=px({x:t.rx}),ty=py({y:t.ry});
        ctx.strokeStyle=effects.includes('slow')?'#96eaff':'#dd9fff';ctx.lineWidth=1.4;ctx.beginPath();ctx.ellipse(tx,ty+12,16,6,0,0,Math.PI*2);ctx.stroke();
        ctx.font='9px sans-serif';ctx.textAlign='center';ctx.fillStyle=ctx.strokeStyle;
        ctx.fillText(effects.map(k=>(k==='slow'?'緩':'弱')+Math.ceil((t.inst.mercEffects[k]-gameNow)/1000)).join(' '),tx,ty-32);
    }
    for(const [i,s] of r.summons.filter(s=>s.until>gameNow).entries()) {
        const side=i?1:-1, acting=gameNow-(s.actedAt||-10000)<450;
        const sx=x+side*30,sy=y+9+i*8;
        mercDrawSummon(ctx,s.id,sx,sy,gameNow,acting,s.actedAt,d.dir);
    }
    for(const [id,b] of Object.entries(r.buffs)) if(b.until>gameNow && ['shield','fortify','barrier'].includes(id) && b.power>0) {
        ctx.strokeStyle='#91d8ff';ctx.lineWidth=1.5;ctx.beginPath();ctx.ellipse(x,y-13,19,29,0,0,Math.PI*2);ctx.stroke();
    }
    const barrier=r.buffs.barrier;
    if(barrier && barrier.until>gameNow && barrier.player>0 && scene.pl) {
        const bx=px({x:scene.pl.rx}),by=py({y:scene.pl.ry});ctx.strokeStyle='#91d8ff';ctx.beginPath();ctx.ellipse(bx,by-13,19,29,0,0,Math.PI*2);ctx.stroke();
    }
    r.vfx=(r.vfx||[]).filter(v=>gameNow-v.at<700);
    for(const v of r.vfx) {
        const s=MERC_RUNES[v.id],p=(gameNow-v.at)/700, tx=px(v.to),ty=py(v.to)-10,fx=px(v.from),fy=py(v.from)-20;
        const fire=/fire|flame|nova/.test(v.id), ice=/frost|ice/.test(v.id), lightning=/lightning|thunder|chain/.test(v.id), poison=/poison|swarm/.test(v.id);
        const color=fire?'#ff9952':ice?'#92eaff':lightning?'#d5b5ff':poison?'#b9e46c':s.group==='battle'?'#ffb7a7':s.group==='guard'?'#9cdaff':'#b7ffdb';
        ctx.save();ctx.globalAlpha=1-p;ctx.strokeStyle=color;ctx.fillStyle=color;ctx.lineWidth=2;
        if(v.id==='star') {
            const a=Math.min(1,p*2),sx=tx+35*(1-a),sy=ty-75*(1-a);
            ctx.beginPath();ctx.moveTo(sx+14,sy-30);ctx.lineTo(sx,sy);ctx.stroke();ctx.beginPath();
            for(let i=0;i<10;i++){const ang=i*Math.PI/5-Math.PI/2,rad=i%2?3:8;ctx.lineTo(sx+Math.cos(ang)*rad,sy+Math.sin(ang)*rad);}ctx.closePath();ctx.fill();
        } else if(v.id==='nova') {
            for(let i=0;i<10;i++){const a=i*Math.PI/5;ctx.beginPath();ctx.moveTo(tx+Math.cos(a)*p*10,ty+Math.sin(a)*p*6);ctx.lineTo(tx+Math.cos(a)*(8+p*28),ty+Math.sin(a)*(8+p*20));ctx.stroke();}
        } else if(poison) {
            for(let i=0;i<9;i++){const a=i*2.4;ctx.beginPath();ctx.arc(tx+Math.cos(a)*(3+p*18),ty+Math.sin(a)*7-p*15,2+p*3,0,Math.PI*2);ctx.fill();}
        } else if(ice) {
            for(let i=0;i<6;i++){const a=i*Math.PI/3;ctx.beginPath();ctx.moveTo(tx,ty);ctx.lineTo(tx+Math.cos(a)*(6+p*18),ty+Math.sin(a)*(6+p*18));ctx.stroke();}
        } else if(lightning){ctx.beginPath();ctx.moveTo(fx,fy);for(let i=1;i<=7;i++)ctx.lineTo(fx+(tx-fx)*i/7+(i<7?Math.sin(i*9+v.at)*7:0),fy+(ty-fy)*i/7);ctx.stroke();}
        else if(mercAttackKind(s.kind) || s.kind.startsWith('summon') && s.kind!=='summonHeal') {
            const a=Math.min(1,p*2),bx=fx+(tx-fx)*a,by=fy+(ty-fy)*a;
            if(s.group==='battle'){ctx.beginPath();ctx.arc(tx,ty,10+p*19,-1+p*3,1+p*3);ctx.stroke();}
            else {ctx.beginPath();ctx.moveTo(bx-9,by+3);ctx.lineTo(bx,by);ctx.stroke();ctx.beginPath();ctx.arc(bx,by,fire?5:3,0,Math.PI*2);ctx.fill();}
        } else {
            for(let i=0;i<6;i++){const a=i*Math.PI/3;ctx.beginPath();ctx.arc(tx+Math.cos(a)*(7+p*15),ty+Math.sin(a)*(7+p*15)-p*12,2,0,Math.PI*2);ctx.fill();}
            ctx.beginPath();ctx.ellipse(tx,ty,8+p*20,5+p*10,0,0,Math.PI*2);ctx.stroke();
        }
        if(p>.35){ctx.beginPath();ctx.ellipse(tx,ty,5+p*20,4+p*10,0,0,Math.PI*2);ctx.stroke();}
        ctx.restore();
    }
    // 技能圖示、召喚倒數與增益文字統一由底部外框mercHudHtml顯示。
}
