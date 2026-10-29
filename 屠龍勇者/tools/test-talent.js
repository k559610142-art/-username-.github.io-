// 原畫星盤的熱區、鎖定與無角色副作用驗證。
const fs=require('fs'),vm=require('vm'),assert=require('assert/strict'),path=require('path');
const root=path.resolve(__dirname,'..'),source=fs.readFileSync(path.join(root,'data/talent.js'),'utf8');
const listeners={},doc={addEventListener:(name,fn)=>{(listeners[name] ||= []).push(fn);},querySelectorAll:()=>[]};
const ctx=vm.createContext({document:doc,TABS:{},PANEL_FNS:{}});
for(const name of ['player','localStorage','calcStats','saveGame'])Object.defineProperty(ctx,name,{get(){throw Error('唯讀預覽不可存取 '+name);}});
vm.runInContext(source,ctx);
vm.runInContext(`
    if(TALENT_ATLAS.nodes.length!==7)throw Error('核心預覽熱區數錯誤');
    if(new Set(TALENT_ATLAS.nodes.map(n=>n.id)).size!==7)throw Error('節點ID重複');
    for(const n of TALENT_ATLAS.nodes)if(n.x<80||n.x>1115||n.y<80||n.y>944)throw Error('熱區超出原畫');
    for(const r of TALENT_REGIONS){talentSelect(r.id+'-core');if(!talentDetailHtml().includes(r.core))throw Error('核心說明缺漏');}
    talentSelect('invalid');if(talentView.selected!=='guard-core')throw Error('非法節點改變選取');
    for(let i=0;i<20;i++)talentZoom(1);if(talentView.zoom!==4)throw Error('放大上限');
    for(let i=0;i<20;i++)talentZoom(-1);if(talentView.zoom!==1)throw Error('縮小下限');
    talentZoom(1);talentZoom(0);if(talentView.zoom!==1)throw Error('全盤重置');
`,ctx);
const html=vm.runInContext('renderTalent()',ctx);
assert.equal((html.match(/class="talent-node/g)||[]).length,7);
assert.match(html,/viewBox="0 0 1195 1024"/);
assert.match(html,/href="images\/ui\/talent-atlas-v1.png"/);
assert.doesNotMatch(html,/talent-nebula|talent-paths|mercRune-v1/);
assert.match(html,/圖中亮線為美術示意/);
assert.match(html,/<button class="talent-learn" disabled>🔒 未開放/);
assert.doesNotMatch(html,/onclick="[^"\n]*(?:learn|allocate|saveGame|player)/);
assert.equal(typeof ctx.PANEL_FNS.talent,'function');
const icons=[...source.matchAll(/icon:'([^']+)'/g)].map(m=>m[1]);
for(const icon of icons)assert.ok(fs.existsSync(path.join(root,'images/icons/items/mercRune-v1',icon+'.png')),icon);
const index=fs.readFileSync(path.join(root,'index.html'),'utf8');
assert.ok(index.indexOf('data/talent.js?')>index.indexOf('data/ui-panels.js?'));
assert.match(fs.readFileSync(path.join(root,'data/ui-panels.js'),'utf8'),/onclick="switchTab\('talent'\)"/);
assert.match(fs.readFileSync(path.join(root,'data/ui-frame.js'),'utf8'),/\['talent', '✧', '天賦星盤・未開放'\]/);
const crypto=require('crypto');
assert.equal(crypto.createHash('sha256').update(fs.readFileSync(path.join(root,'images/ui/talent-atlas-v1.png'))).digest('hex'),'eece1bf4ec165c0daf15c8f1fca53d8b4074b8fd520c916a5031bc9c5395b2d6');
console.log('PASS：原概念圖逐byte一致、七個核心熱區、鎖定、縮放、入口、無玩家／存檔副作用。');
