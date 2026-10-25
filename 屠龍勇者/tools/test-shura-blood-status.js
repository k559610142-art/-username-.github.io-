// 喝水延遲不會被快轉模擬（離線結算、團隊副本、世界首領）帶到未來（第 113 節）。隔離角色，不寫真實存檔、不連線。
const fs = require('fs'), path = require('path'), vm = require('vm'), assert = require('assert/strict');
const root = path.resolve(__dirname, '..'), memory = new Map();
const sandbox = { console, assert, Image: function () {}, setTimeout: () => 0, clearTimeout() {}, setInterval: () => 0, clearInterval() {}, crypto: globalThis.crypto, TextEncoder, TextDecoder, btoa, atob,
    localStorage: { getItem: k => memory.has(k) ? memory.get(k) : null, setItem: (k, v) => memory.set(k, v), removeItem: k => memory.delete(k) },
    document: { addEventListener() {}, getElementById: () => null, querySelector: () => null, documentElement: { style: {} } },
    window: { addEventListener() {}, innerWidth: 400, innerHeight: 800 }, navigator: {}, fetch() { throw Error('禁止連線'); } };
const ctx = vm.createContext(sandbox);
for (const [, file] of fs.readFileSync(path.join(root, 'index.html'), 'utf8').matchAll(/<script src="(data\/[^"?]+\.js)\?v=/g)) {
    if (file === 'data/main.js' || file === 'data/pwa.js') continue;
    vm.runInContext(fs.readFileSync(path.join(root, file), 'utf8'), ctx, { filename: file });
}
vm.runInContext("\nSIM_MODE=true;createPlayer('血戰測試','shura',CLASSES.shura.base);SIM_MODE=false;\nplayer.lv=48;player.baseHp=1000;player.skills=['shuraBlood'];player.equip={};player.buffs={};\nplayer.hp=500;const normal=calcStats();assert(!buffIconsHtml().includes('passive_shuraBlood'),'剛好50%不觸發');\nplayer.hp=499;const low=calcStats();assert.equal(low.dmgBonus-normal.dmgBonus,8);assert.equal(low.lifesteal-normal.lifesteal,.05);\nlet html=buffIconsHtml();assert(html.split('data-group=\"temp\"')[1].includes('passive_shuraBlood'));assert(html.includes('血戰（生效中）'));assert(html.includes('吸血 5%'));\nlifeSteal(200,low);assert.equal(player.hp,509,'實際傷害吸血回10HP');assert(!buffIconsHtml().includes('passive_shuraBlood'),'回血越過門檻立即移除');\nplayer.hp=499;player.skills=[];assert(!buffIconsHtml().includes('passive_shuraBlood'));assert.equal(calcStats().dmgBonus,normal.dmgBonus);\nplayer.skills=['shuraBlood'];player.cls='knight';assert(!buffIconsHtml().includes('passive_shuraBlood'),'其他職業不顯示');\nplayer.cls='shura';player.hp=0;assert(!buffIconsHtml().includes('passive_shuraBlood'),'死亡不顯示');\nconsole.log('PASS: implemented damage +8, lifesteal +5%, actual healing, exact HP threshold, temporary status, recover/remove, unlearned/wrong class/death');\n",ctx);
