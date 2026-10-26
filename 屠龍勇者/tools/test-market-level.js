// 自訂購買數量：隔離角色／存檔／連線，確認非法輸入不扣款、不產生物品。
const fs = require('fs'), path = require('path'), vm = require('vm'), assert = require('assert/strict');
const root = path.resolve(__dirname, '..');
const nodes = { 'shop-buy-qty': { value: '1' }, 'shop-buy-total': { textContent: '' } };
const sandbox = { console, assert, nodes, Image: function () {}, setTimeout: () => 0, clearTimeout() {}, setInterval: () => 0, clearInterval() {},
    localStorage: { getItem: () => null, setItem() { throw Error('禁止寫入真實存檔'); }, removeItem() { throw Error('禁止刪除存檔'); } },
    document: { addEventListener() {}, getElementById: id => nodes[id] || null, querySelector: () => null, documentElement: { style: {} } },
    window: { addEventListener() {}, innerWidth: 400, innerHeight: 800 }, navigator: {}, fetch() { throw Error('禁止連線'); } };
const ctx = vm.createContext(sandbox);
for (const [, file] of fs.readFileSync(path.join(root, 'index.html'), 'utf8').matchAll(/<script src="(data\/[^"?]+\.js)\?v=/g)) {
    if (file === 'data/main.js' || file === 'data/pwa.js') continue;
    vm.runInContext(fs.readFileSync(path.join(root, file), 'utf8'), ctx, { filename: file });
}

vm.runInContext(String.raw`
 SIM_MODE=true;createPlayer('交易所等級測試','knight',CLASSES.knight.base);player.lv=85;player.loc={type:'town',id:'talking'};player.inv=[];
 const gear=[{id:'longSword',uid:1,n:1,ench:0,il:20},{id:'longSword',uid:2,n:1,ench:0,il:85,q:'rare',af:[]},{id:'longSword',uid:3,n:1,ench:0}];
 const before=JSON.stringify(gear),now=new Date().toISOString(),future=new Date(Date.now()+3600000).toISOString();
 for(const [i,x]of gear.entries())assert.equal(marketBaseLevelText(x),i===2?'基底等級 未記錄':'基底等級 '+x.il);
 for(const bad of [0,-1,NaN,'<img src=x onerror=alert(1)>'])assert.equal(marketBaseLevelText({id:'longSword',il:bad}),'基底等級 未記錄');
 assert.equal(marketBaseLevelText({id:'redPotion',il:85}),'');
 marketRows=gear.map((item,i)=>({id:i+1,item,n:1,price:100,seller_name:'測試',listed_at:now}));
 let html=marketBuyHtml();for(const str of ['基底等級 20','基底等級 85','基底等級 未記錄'])assert(html.includes(str));
 marketMine=marketRows.map(r=>({...r,state:'active',expires_at:future}));html=marketMineHtml();assert(html.includes('基底等級 20')&&html.includes('基底等級 85')&&html.includes('基底等級 未記錄'));
 player.inv=gear;marketSellUid=null;html=marketSellHtml();assert(html.includes('基底等級 20')&&html.includes('基底等級 85'));
 for(const x of gear){marketSellUid=x.uid;assert(marketSellHtml().includes(marketBaseLevelText(x)));const detail=marketItemDescHtml(x);assert.equal((detail.match(/基底等級/g)||[]).length,1);}
 let dialog;openDialog=(title,body)=>dialog=body;marketInfo(1);assert(dialog.includes('基底等級 20'));marketInfo(3);assert(dialog.includes('基底等級 未記錄'));
 assert.equal(JSON.stringify(gear),before,'顯示不修改商品');assert(!marketItemDescHtml({id:'redPotion',n:1}).includes('基底等級'));
 console.log('PASS market levels: browse / sell list and form / my listings / detail / level20 and85 / unknown legacy / non-equipment / no mutation');
`,ctx);
