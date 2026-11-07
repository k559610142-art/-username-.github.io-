// 跨職業平衡模擬（隔離，不存檔，第 320 節）：各職業最佳武器、20 點屬性投最有利一項、對 Lv.60 怪打 SEC 秒，輸出相對 12 職業平均的倍數。
// 用法：node tools/sim-classes.js tools [秒=90] [adv＝含二轉最佳分支] [top＝含傳說武器+9] [等級=65] ["在遊戲環境先執行的設定，例如 CLASS_DMG_MUL.mage=0.85;"]
const fs = require('fs'), path = require('path'), vm = require('vm');
const dir = process.argv[2];
const prefix = fs.readFileSync(path.join(dir, 'test-mercenary.js'), 'utf8').split('ctx.assert = assert;')[0];
const ctx = new Function('require', '__dirname', prefix + '\nreturn ctx;')(require, dir);
ctx.SEC = Number(process.argv[3]) || 90; ctx.ADV = process.argv[4] === 'adv'; ctx.TOP = process.argv[5] === 'top'; ctx.LV = Number(process.argv[6]) || 65; ctx.CFG = process.argv[7] || '';
vm.runInContext(String.raw`
SIM_MODE = true; saveGame = () => {}; refreshUI = () => {}; showToast = () => {}; sfx = () => {}; sfxHit = () => {};
worldVfxEmit = () => {}; worldVfxSkill = () => {}; worldVfxAttack = () => {}; worldVfxSupport = () => {}; worldVfxEnemy = () => {};
gameAlert = () => {}; openDialog = () => {}; closeDialog = () => {}; useHomeScroll = () => false; checkAutoHome = () => {}; moveToTown = () => {}; stopHunt = () => {}; outOfAmmo = () => {};
eval(CFG);
function bestWeapon(cls, type) {
    const ok = id => { const d = ITEMS[id]; return d.cat === 'weapon' && d.type === type && !d.res && (!d.classes || d.classes.includes(cls)) && !d.unique && (TOP || (!d.legend && (d.sell || 0) < 60000)) && !(d.reqLv > LV); };
    return Object.keys(ITEMS).filter(ok).sort((a, b) => (ITEMS[b].dmg[0] + ITEMS[b].dmg[1]) - (ITEMS[a].dmg[0] + ITEMS[a].dmg[1]))[0];
}
function build(cls, wtype, stat, brId) {
    createPlayer('模擬', cls, CLASSES[cls].base);
    player.lv = LV; player.stats = { ...CLASSES[cls].base }; player.stats[stat] += 20;
    const c = CLASSES[cls]; player.baseHp = Math.round((c.hp[0] + c.hp[1]) / 2 * LV + 100); player.baseMp = Math.round((c.mp[0] + c.mp[1]) / 2 * LV + 50);
    for (const k of Object.keys(player.equip)) unequipSlot(k);
    const w = bestWeapon(cls, wtype); if (!w) return null;
    const it = addItem(w, 1); it.ench = TOP ? 9 : 6; equipItem(it.uid, true);
    if (c.shield && !WEAPON_TYPES[ITEMS[w].type].two) { const s = addItem('woodShield', 1); equipItem(s.uid, true); }
    const ammo = WEAPON_TYPES[ITEMS[w].type].ammo; if (ammo) { const a = ammo === 'arrow' ? 'arrow' : 'bullet'; addItem(a, 1e6); player.ammoId = a; }
    player.skills = classSkillList(cls).filter(s => { const n = skillNeedLv(s, cls); return n && n <= LV; }).map(s => s.id);
    player.settings.bar = defaultBar(player); normalizeBar(player);
    player.quests = { ch: 7, active: false, prog: 0, bossDone: false };
    player.adv = { br: '', pick: '', at: 0, el: 'fire' };
    if (brId) {
        const b = ADV_BY_ID[brId]; player.adv.br = brId;
        player.skills.push(b.passive.id, b.skill1.id, b.skill2.id);
        const bar = player.settings.bar, first = bar.slice(0, 8).filter(x => x.id), adds = [b.skill1, b.skill2].filter(s => s.type !== 'passive').map(s => ({ id: s.id, a: 1 }));
        const row = [...adds, ...first].slice(0, 10); for (let i = 0; i < 10; i++) bar[i] = row[i] || { id: '', a: 0 };
    }
    player.hp = calcStats().maxHp; player.mp = calcStats().maxMp;
    return w;
}
function run(sec, nMob, infMp) {
    player.loc = { type: 'zone', id: 'fireCave' }; player.hunting = true; session = { start: gameNow, kills: 0, exp: 0, gold: 0 };
    hunt = { state: 'fight', mobs: [], mon: null, pCd: 0, joinCd: 1e9, timer: 0 };
    const ids = ['lavaGolem', 'fireSpirit', 'ancientGiant'].slice(0, nMob);
    for (const id of ids) { const m = makeMonster(id); m.hp = m.maxHp = 1e8; addMob(m); }
    let dealt = 0, taken = 0, racc = 0, net = 0;
    for (let t = 0; t < sec * 10; t++) {
        gameNow += 100; racc += 100;
        player.hp = Math.round(calcStats().maxHp * 0.6); const hp0 = hunt.mobs.reduce((a, m) => a + m.hp, 0), php = player.hp;
        player.hunting = true;
        if (racc >= REGEN_MS) { racc -= REGEN_MS; regenTick(); }
        huntTick(100);
        if (!hunt || hunt.state !== 'fight') break;
        dealt += hp0 - hunt.mobs.reduce((a, m) => a + m.hp, 0);
        taken += Math.max(0, php - player.hp); net += player.hp - php;
        player.hp = calcStats().maxHp;
        if (infMp) player.mp = calcStats().maxMp;
    }
    return { dealt: dealt / sec, taken: taken / sec, net: net / sec / calcStats().maxHp * 100 };
}
const out = [];
for (const cls in CLASSES) {
    let best = null;
    const brs = ADV ? (ADV_BRANCHES[cls] || []).map(b => b.id) : [''];
    for (const br of brs) for (const wt of CLASSES[cls].weapons) for (const st of ['str', 'dex', 'int', 'wis']) {
        const w = build(cls, wt, st, br); if (!w) continue;
        const a = run(SEC, 1, true), b = run(SEC, 3, true);
        build(cls, wt, st, br); const r = run(SEC, 3, false);
        const sc = a.dealt + b.dealt;
        if (!best || sc > best.sc) best = { sc, cls: CLASSES[cls].name, br: br ? ADV_BY_ID[br].name : '', w: ITEMS[w].name, st, one: a.dealt, three: b.dealt, real: r.dealt, taken: b.taken, net: b.net, hp: calcStats().maxHp };
    }
    out.push(best);
}
const avg = k => out.reduce((s, o) => s + o[k], 0) / out.length;
const A1 = avg('one'), A3 = avg('three'), AR = avg('real'), AT = avg('taken');
console.log('職業\t分支\t武器\t加點\t單體DPS(相對)\t3隻DPS(相對)\t真實MP 3隻(相對)\t每秒承受(相對,越低越耐)\t最大HP');
out.sort((a, b) => (b.one / A1 + b.three / A3) - (a.one / A1 + a.three / A3));
for (const o of out) console.log([o.cls, o.br, o.w, o.st, (o.one / A1).toFixed(2), (o.three / A3).toFixed(2), (o.real / AR).toFixed(2), (o.taken / AT).toFixed(2), o.net.toFixed(2), o.hp].join('\t'));
`, ctx);
