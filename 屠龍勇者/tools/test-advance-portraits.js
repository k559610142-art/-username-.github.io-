// 36 分支立繪接線；隔離存檔與網路。
const fs = require('fs'), path = require('path'), vm = require('vm'), assert = require('assert/strict');
const prefix = fs.readFileSync(path.join(__dirname, 'test-mercenary.js'), 'utf8').split('ctx.assert = assert;')[0];
const ctx = new Function('require', '__dirname', prefix + '\nreturn ctx;')(require, __dirname);
ctx.assert = assert;
ctx.assetExists = src => fs.existsSync(path.join(__dirname, '..', src.split('?')[0]));
vm.runInContext(String.raw`
SIM_MODE = true;
saveGame = () => {}; refreshUI = () => {}; showToast = () => {};
const portraits = new Set();
for (const cls in CLASSES) {
    const sprite = JSON.stringify(CLASSES[cls].sprite);
    createPlayer('立繪測試', cls, CLASSES[cls].base);
    assert(renderChar().includes(heroSrc(cls)), cls + ' 原職業立繪');
    for (const b of ADV_BRANCHES[cls]) {
        const src = advPortraitSrc(b.id);
        assert(assetExists(src), b.id + ' 圖片存在');
        assert(!portraits.has(src), b.id + ' 專屬圖片'); portraits.add(src);
        player.adv.pick = b.id;
        assert(renderChar().includes(heroSrc(cls)), '試煉未完成不換立繪');
        player.adv.br = b.id;
        assert(renderChar().includes(src), b.id + ' 人物狀態');
        assert(advBranchCardHtml(b, 'advPick').includes(src), b.id + ' 選擇畫面');
        const summary = { cls, adv: player.adv, lv: 70, exp: 0, hp: 100, mp: 100, maxHp: 100, maxMp: 100, name: '選角測試', loc: '村莊', gold: 0, t: 0 };
        const card = charCardHtml(0, summary);
        assert(card.includes(src) && card.includes(b.name), b.id + ' 人物選單');
        assert.equal(JSON.stringify(CLASSES[cls].sprite), sprite, '地圖模型不變');
        player.adv.br = '';
    }
}
assert.equal(portraits.size, 36);
assert.equal(advPortraitSrc('missing'), '');
assert.equal(SAVE_SCHEMA, 22);
`, ctx);
console.log('test-advance-portraits OK：36 張獨立立繪、狀態與選擇畫面、試煉前原外觀、地圖模型不變');
