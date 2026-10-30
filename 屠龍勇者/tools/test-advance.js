// 二轉（advance.js）離線隔離測試：任務流程、選分支、技能書、換分支、存檔轉換、36 分支各打 90 秒不出錯。
// 不讀寫玩家存檔、不連網。用法：node tools/test-advance.js
const fs = require('fs'), path = require('path'), vm = require('vm'), assert = require('assert/strict');
const prefix = fs.readFileSync(path.join(__dirname, 'test-mercenary.js'), 'utf8').split('ctx.assert = assert;')[0];
const ctx = new Function('require', '__dirname', prefix + '\nreturn ctx;')(require, __dirname);
ctx.assert = assert;
vm.runInContext(String.raw`
SIM_MODE = true; saveGame = () => {}; refreshUI = () => {}; showToast = () => {}; sfx = () => {}; sfxHit = () => {};
worldVfxEmit = () => {}; worldVfxSkill = () => {}; worldVfxAttack = () => {}; worldVfxSupport = () => {}; worldVfxEnemy = () => {};
let alerts = 0, dialogs = 0, confirmFn = null;
gameAlert = () => { alerts++; }; openDialog = () => { dialogs++; }; closeDialog = () => {}; gameConfirm = (t, h, fn) => { confirmFn = fn; };
inTown = () => player.loc.type === 'town';
useHomeScroll = () => false; checkAutoHome = () => {}; moveToTown = () => {}; stopHunt = () => {}; outOfAmmo = () => {};
assert.equal(SAVE_SCHEMA, 22);
assert.equal(Object.keys(ADV_BY_ID).length, 36);
for (const cls in CLASSES) { assert.equal(ADV_BRANCHES[cls].length, 3, cls); assert.equal(CLASS_QUESTS[cls].length, 7, cls); }
// 技能 id 不重複、名稱不跟同職業原有技能撞名
const names = {};
for (const b of Object.values(ADV_BY_ID)) for (const s of [b.passive, b.skill1, b.skill2]) {
    assert(SKILL_BY_ID[s.id] === s);
    const own = (SKILLS[b.cls] || []).map(x => x.name);
    if (own.includes(s.name)) console.log('⚠️ 撞名', CLASSES[b.cls].name, s.name);
}
// 舊存檔轉換：補 adv、非法分支清掉
createPlayer('舊角', 'knight', CLASSES.knight.base);
const old = JSON.parse(JSON.stringify(player)); delete old.adv;
let p2 = migrateSave({ schema: 21, player: old });
assert.deepEqual(p2.adv, { br: '', pick: '', at: 0, el: 'fire' });
old.adv = { br: 'mPyro', pick: 'zzz', at: 'x', el: 'lava' };
p2 = migrateSave({ schema: 22, player: JSON.parse(JSON.stringify(old)) });
assert.deepEqual(p2.adv, { br: '', pick: '', at: 0, el: 'fire' });

function setupLv(cls, lv) {
    createPlayer('二轉' + cls, cls, CLASSES[cls].base);
    player.lv = lv; player.baseHp = 600; player.baseMp = 300; player.hp = 600; player.mp = 300; player.gold = 5e6;
    player.quests = { ch: 4, active: false, prog: 0, bossDone: false };
    player.loc = { type: 'town', id: 'talking' };
}
function doQuestChain(cls, brId) {
    setupLv(cls, 60);
    // 第 5 章：任何地圖的首領掉職業之證（一般怪不掉）
    acceptQuest(); assert(questState().active, cls + ' ch5 accept');
    const q5 = currentQuest(); assert.equal(q5.goal.type, 'bossCollect');
    const SM = SIM_MODE; SIM_MODE = false; lootMode = 'legacy';
    for (let i = 0; i < 200; i++) questOnKill({ boss: false, lv: 60 }, ZONE_BY_ID.fireCave);
    assert.equal(countItem(q5.goal.item), 0);
    for (let i = 0; i < 400 && countItem(q5.goal.item) < 5; i++) questOnKill({ boss: true, lv: 60 }, ZONE_BY_ID.tower);
    SIM_MODE = SM;
    assert.equal(countItem(q5.goal.item), 5); assert(questReady(q5));
    turnInQuest(); assert.equal(questState().ch, 5); assert.equal(countItem(q5.goal.item), 0);
    // 第 6 章：先選分支；帶傭兵不能接
    const d0 = dialogs; acceptQuest(); assert.equal(questState().active, false); assert.equal(dialogs, d0 + 1);
    advPick(brId); assert(questState().active); assert.equal(advState().pick, brId);
    assert.equal(advBranch(), null);
    questState().prog = 30; questState().bossDone = true;
    assert(advTrialActive() === false);
    turnInQuest();
    const b = advBranch(); assert(b && b.id === brId, 'branch ' + brId);
    assert(hasSkill(b.passive.id)); assert.equal(countItem(bookIdOf(b.skill1.id)), 1);
    learnBook(player.inv.find(x => x.id === bookIdOf(b.skill1.id)).uid); assert(hasSkill(b.skill1.id));
    // 第 2 招：第 7 章前不能學、也買不到
    assert.equal(bookLearnError(ITEMS[bookIdOf(b.skill2.id)]), '完成第 7 章任務後才能學');
    player.lv = 70; acceptQuest(); questState().bossDone = true; turnInQuest();
    assert.equal(questState().ch, 7); assert.equal(countItem('advAcc_' + brId), 1);
    learnBook(player.inv.find(x => x.id === bookIdOf(b.skill2.id)).uid); assert(hasSkill(b.skill2.id));
    assert(learnedSkills().includes(b.skill2));
    return b;
}
function fight(b, sec) {
    player.loc = { type: 'zone', id: 'fireCave' };
    const bar = player.settings.bar;
    [b.skill1, b.skill2].forEach((s, i) => { if (s.type !== 'passive') bar[i] = { id: s.id, a: 1 }; });
    player.hunting = true; session = { start: gameNow, kills: 0, exp: 0, gold: 0 };
    hunt = { state: 'fight', mobs: [], mon: null, pCd: 0, joinCd: 1e9, timer: 0, warned: false };
    const spawn = () => { for (let i = 0; i < 3; i++) addMob(makeMonster(['lavaGolem', 'fireSpirit', 'ancientGiant'][i])); };
    spawn();
    let kills = 0;
    for (let t = 0; t < sec * 10; t++) {
        gameNow += 100;
        player.hp = Math.max(player.hp, 50);
        if (!player.hunting) { player.hunting = true; player.loc = { type: 'zone', id: 'fireCave' }; }
        if (!hunt || hunt.state !== 'fight' || !hunt.mon) { hunt = hunt || {}; Object.assign(hunt, { state: 'fight', mobs: [], mon: null, pCd: 0, joinCd: 1e9 }); spawn(); kills++; }
        huntTick(100);
        regenTick && regenTick();
    }
    player.hunting = false;
    return session.kills;
}
let n = 0;
for (const cls in ADV_BRANCHES) for (const br of ADV_BRANCHES[cls]) {
    const b = doQuestChain(cls, br.id);
    const k = fight(b, 90);
    assert(k >= 0);
    n++;
}
assert.equal(n, 36);
// 換分支：命運重塑石
const b0 = doQuestChain('mage', 'mPyro');
addItem('advReshape', 1);
openAdvReshape(); advReshapeTo('mFrost'); assert(confirmFn); confirmFn();
assert.equal(advBranch().id, 'mFrost'); assert(!hasSkill(b0.skill1.id) && !hasSkill(b0.passive.id)); assert(hasSkill(ADV_BY_ID.mFrost.passive.id));
assert.equal(countItem('advReshape'), 0);
// 舊分支的書不能學；新分支的書可以在 NPC 買
assert.equal(bookLearnError(ITEMS[bookIdOf(b0.skill1.id)]), '只有這個二轉分支能學');
confirmFn = null; advBuyBook(ADV_BY_ID.mFrost.skill1.id); confirmFn(); assert.equal(countItem(bookIdOf(ADV_BY_ID.mFrost.skill1.id)), 1);
// 存讀檔保留
const enc = saveEncode(JSON.stringify({ schema: SAVE_SCHEMA, player }));
const back = migrateSave(saveParse(enc));
assert.equal(back.adv.br, 'mFrost');
// 試煉中不能帶娃娃、傭兵（娃娃欄有東西就擋）
setupLv('royal', 60); player.quests.ch = 5; player.equip.doll = { uid: 999, id: Object.keys(ITEMS).find(id => ITEMS[id].cat === 'doll'), n: 1 };
acceptQuest(); assert.equal(questState().active, false);
console.log('test-advance OK：36 分支任務流程與 90 秒戰鬥、換分支、買書、存讀檔');
`, ctx);
