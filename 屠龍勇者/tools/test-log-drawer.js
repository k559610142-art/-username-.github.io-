// 隔離 DOM 定位回歸：PC 樓層按鈕在頂端時，戰鬥訊息框仍使用左下 CSS 定位。
const fs = require('fs'), path = require('path'), vm = require('vm'), assert = require('assert/strict');
const src = fs.readFileSync(path.join(__dirname, '../data/ui-panels.js'), 'utf8');
const fn = src.slice(src.indexOf('function renderLogPop()'), src.indexOf('\nfunction huntButtonsHtml()'));
let pc = true, hasCtrl = true, geometryReads = 0, frameHeight = 720, ctrlTop = 500;
const pop = { classList: { toggle() {} }, style: { bottom: '640px' } };
const ctrl = { offsetParent: {}, getBoundingClientRect() { geometryReads++; return { top: pc ? 100 : ctrlTop }; } };
const frame = { getBoundingClientRect() { geometryReads++; return { bottom: frameHeight, height: frameHeight, width: 390 }; } };
const nodes = { 'log-pop': pop, frame };
const ctx = vm.createContext({
    player: {}, logDrawerOpen: true, logPopTab: 'log', isPcFrame: () => pc,
    $: id => nodes[id], document: { querySelector: () => hasCtrl ? ctrl : null }
});
vm.runInContext(fn, ctx);
vm.runInContext('renderLogPop()', ctx);
assert.equal(pop.style.bottom, '', 'PC 應清掉舊的 inline 定位，使用左下 CSS');
assert.equal(geometryReads, 0, 'PC 不應跟著頂端上下樓操作列定位');
pc = false;
vm.runInContext('renderLogPop()', ctx);
assert.equal(pop.style.bottom, '224px', '手機仍應避開底部操作列');
assert.equal(pop.style.height, '300px', '手機訊息框保留足夠聊天高度');
hasCtrl = false;
vm.runInContext('renderLogPop()', ctx);
assert.equal(pop.style.height, '300px', '其他分頁也保留訊息高度');
hasCtrl = true; frameHeight = 320; ctrlTop = 60;
vm.runInContext('renderLogPop()', ctx);
assert.equal(pop.style.height, '220px', '矮螢幕仍有可讀的聊天空間');
assert.equal(frameHeight - parseInt(pop.style.bottom) - parseInt(pop.style.height), 8, '訊息框不能超出頂部');
pc = true;
vm.runInContext('renderLogPop()', ctx);
assert.equal(pop.style.height, '', '切回PC清除手機高度');
hasCtrl = true; ctx.logDrawerOpen = false;
vm.runInContext('renderLogPop()', ctx);
assert.equal(pop.style.bottom, '', '關閉訊息框應清掉暫時定位');
assert.equal(pop.style.height, '', '關閉訊息框應清掉暫時高度');
console.log('PASS：PC定位不變、手機300px聊天空間、矮螢幕不超出上緣、切回PC／關閉清除高度。');
