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
vm.runInContext(String.raw`
SIM_MODE=true;createPlayer('血戰測試','shura',CLASSES.shura.base);SIM_MODE=false;
player.lv=48;player.baseHp=1000;player.skills=['shuraBlood'];player.equip={};player.buffs={};
// 血戰圖示固定在技能區（20261025ag）：待命不發光、生效中發光
const bloodIn = (html, group) => html.split('data-group="' + group + '"')[1].split('data-group=')[0].includes('passive_shuraBlood');
const bloodOn = html => html.includes('class="bf bf-skill on" data-status="passive_shuraBlood"');
player.hp=500;const normal=calcStats();let html=buffIconsHtml();
assert(bloodIn(html,'skill'),'剛好50%：技能區待命');assert(html.includes('>待命<'));assert(!bloodOn(html),'待命不發光');assert(!bloodIn(html,'temp'));
player.hp=499;const low=calcStats();assert.equal(low.dmgBonus-normal.dmgBonus,8);assert.equal(low.lifesteal-normal.lifesteal,.05);
html=buffIconsHtml();assert(bloodIn(html,'skill'),'生效中仍在技能區不換區');assert(bloodOn(html),'生效中發光');assert(html.includes('>生效中<'));assert(html.includes('血戰（生效中）'));assert(html.includes('吸血 5%'));
lifeSteal(200,low);assert.equal(player.hp,509,'實際傷害吸血回10HP');html=buffIconsHtml();assert(html.includes('>待命<')&&!bloodOn(html),'回血越過門檻立即回到待命');
player.hp=499;player.skills=[];assert(!buffIconsHtml().includes('passive_shuraBlood'),'沒學不顯示');assert.equal(calcStats().dmgBonus,normal.dmgBonus);
player.skills=['shuraBlood'];player.cls='knight';assert(!buffIconsHtml().includes('passive_shuraBlood'),'其他職業不顯示');
player.cls='shura';player.hp=0;assert(!buffIconsHtml().includes('passive_shuraBlood'),'死亡不顯示');
console.log('PASS: damage +8, lifesteal +5%, actual healing, exact HP threshold, idle/active in skill group, glow, back to idle, unlearned/wrong class/death');
`,ctx);
