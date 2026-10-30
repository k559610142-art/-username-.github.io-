// 二轉平衡模擬（隔離，不讀寫存檔）：同職業、同等級、同裝備，二轉前 vs 各分支，對 3 隻 Lv.60 怪打 120 秒。
// 輸出：傷害倍率（二轉後／二轉前）、承受傷害倍率（越低越耐打）。用法：node tools/sim-advance.js [秒數]
const fs = require('fs'), path = require('path'), vm = require('vm'), assert = require('assert/strict');
const prefix = fs.readFileSync(path.join(__dirname, 'test-mercenary.js'), 'utf8').split('ctx.assert = assert;')[0];
const ctx = new Function('require', '__dirname', prefix + '\nreturn ctx;')(require, __dirname);
ctx.assert = assert; ctx.SEC = Number(process.argv[2]) || 120; ctx.ONLY = process.argv[3] || '';
vm.runInContext(String.raw`
SIM_MODE = true; saveGame = () => {}; refreshUI = () => {}; showToast = () => {}; sfx = () => {}; sfxHit = () => {};
worldVfxEmit = () => {}; worldVfxSkill = () => {}; worldVfxAttack = () => {}; worldVfxSupport = () => {}; worldVfxEnemy = () => {};
gameAlert = () => {}; openDialog = () => {}; closeDialog = () => {}; useHomeScroll = () => false; checkAutoHome = () => {}; moveToTown = () => {}; stopHunt = () => {}; outOfAmmo = () => {};
// 分支偏好的武器（沒有就用職業第一個能用的）
const PREF = { kShield: ['sword', 1], kBlade: ['twohand', 0], kDragoon: ['spear', 0], rTyrant: ['sword', 1], eTempest: ['bow', 0], eForest: ['sword', 1], dBlade: ['dual', 0],
    gHunter: ['gun', 0], gBomb: ['gun', 0], gSling: ['gun', 0], aWar: ['spear', 0], pRadiant: ['blunt', 1], fSword: ['sword', 1] };
function bestWeapon(cls, type) {
    const ok = id => { const d = ITEMS[id]; return d.cat === 'weapon' && d.type === type && CLASSES[cls].weapons.includes(type) && !d.res && (!d.classes || d.classes.includes(cls)) && !d.legend && (d.sell || 0) < 60000; };
    return Object.keys(ITEMS).filter(ok).sort((a, b) => (ITEMS[b].dmg[0] + ITEMS[b].dmg[1]) - (ITEMS[a].dmg[0] + ITEMS[a].dmg[1]))[0];
}
function build(cls, brId, gearOf) {   // gearOf：用哪個分支的偏好武器（二轉前對照組也用同一把）
    createPlayer('模擬', cls, CLASSES[cls].base);
    const pf = PREF[gearOf || brId] || [CLASSES[cls].weapons[0], CLASSES[cls].shield ? 1 : 0];
    player.lv = 65; player.stats = { ...player.stats }; for (const k of STAT_KEYS) player.stats[k] = Math.max(player.stats[k], 14);
    const c = CLASSES[cls]; player.baseHp = Math.round((c.hp[0] + c.hp[1]) / 2 * 65 + 100); player.baseMp = Math.round((c.mp[0] + c.mp[1]) / 2 * 65 + 50);
    for (const k of Object.keys(player.equip)) unequipSlot(k);
    const w = bestWeapon(cls, pf[0]) || bestWeapon(cls, c.weapons[0]);
    const it = addItem(w, 1); it.ench = 6; equipItem(it.uid, true);
    if (pf[1] && c.shield && !WEAPON_TYPES[ITEMS[w].type].two) { const s = addItem('woodShield', 1); equipItem(s.uid, true); }
    if (c.ammo || WEAPON_TYPES[ITEMS[w].type].ammo) { const a = WEAPON_TYPES[ITEMS[w].type].ammo === 'arrow' ? 'arrow' : 'bullet'; addItem(a, 1e6); player.ammoId = a; }
    player.skills = classSkillList(cls).filter(s => { const n = skillNeedLv(s, cls); return n && n <= 65; }).map(s => s.id);
    player.settings.bar = defaultBar(player); normalizeBar(player);
    addItem('redPotion', 0);
    player.quests = { ch: 7, active: false, prog: 0, bossDone: false };
    player.adv = { br: '', pick: '', at: 0, el: 'fire' };
    if (brId) {
        const b = ADV_BY_ID[brId]; player.adv.br = brId;
        player.skills.push(b.passive.id, b.skill1.id, b.skill2.id);
        // 二轉技能排在快捷欄最前面（自動），原本的技能往後推（玩家通常會把新技能放前面）
        const bar = player.settings.bar, first = bar.slice(0, 8).filter(x => x.id), adds = [b.skill1, b.skill2].filter(s => s.type !== 'passive').map(s => ({ id: s.id, a: 1 }));
        const row = [...adds, ...first].slice(0, 10); for (let i = 0; i < 10; i++) bar[i] = row[i] || { id: '', a: 0 };
    }
    player.hp = calcStats().maxHp; player.mp = calcStats().maxMp;
}
function run(sec, nMob, lowHp) {
    player.loc = { type: 'zone', id: 'fireCave' }; player.hunting = true; session = { start: gameNow, kills: 0, exp: 0, gold: 0 };
    hunt = { state: 'fight', mobs: [], mon: null, pCd: 0, joinCd: 1e9, timer: 0 };
    const ids = ['lavaGolem', 'fireSpirit', 'ancientGiant'].slice(0, nMob);
    for (const id of ids) { const m = makeMonster(id); m.hp = m.maxHp = 1e8; addMob(m); }
    let dealt = 0, taken = 0;
    for (let t = 0; t < sec * 10; t++) {
        gameNow += 100;
        const hp0 = hunt.mobs.reduce((a, m) => a + m.hp, 0), php = player.hp;
        player.hunting = true;
        huntTick(100);
        if (!hunt || hunt.state !== 'fight') break;
        dealt += hp0 - hunt.mobs.reduce((a, m) => a + m.hp, 0);
        taken += Math.max(0, php - player.hp);
        player.hp = Math.round(calcStats().maxHp * (lowHp ? 0.45 : 1));   // 不讓角色倒下，只量承受量（lowHp：維持 45% HP，測低血與保命技能）
        player.mp = Math.min(calcStats().maxMp, player.mp + 3);
    }
    return { dealt, taken };
}
const rows = [];
const scen = [[1, false], [3, false], [3, true]];
for (const cls in ADV_BRANCHES) {
    for (const b of ADV_BRANCHES[cls]) {
        if (ONLY && !ONLY.split(',').includes(b.id) && !ONLY.split(',').includes(cls)) continue;
        const out = [CLASSES[cls].name, b.name];
        for (const [nMob, low] of scen) {
            let base = { dealt: 0, taken: 0 }, adv = { dealt: 0, taken: 0 };
            for (let rep = 0; rep < 2; rep++) {
                build(cls, '', b.id); const r0 = run(SEC, nMob, low); base.dealt += r0.dealt; base.taken += r0.taken;
                build(cls, b.id); const r1 = run(SEC, nMob, low); adv.dealt += r1.dealt; adv.taken += r1.taken;
            }
            out.push((adv.dealt / Math.max(1, base.dealt)).toFixed(2));
            if (nMob === 3 && !low) out.push((adv.taken / Math.max(1, base.taken)).toFixed(2));
        }
        out.push(((+out[2] + +out[3]) / 2).toFixed(2));
        rows.push(out);
    }
}
console.log('職業\t分支\t單體傷害\t3隻傷害\t3隻承受\t低血3隻傷害	平均');
for (const r of rows) console.log(r.join('\t'));
`, ctx);
