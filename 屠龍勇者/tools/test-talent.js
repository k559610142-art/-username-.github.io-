// 唯讀星盤的拓樸、鎖定與無角色副作用驗證。
const fs=require('fs'),vm=require('vm'),assert=require('assert/strict'),path=require('path');
const root=path.resolve(__dirname,'..'),source=fs.readFileSync(path.join(root,'data/talent.js'),'utf8');
const listeners={},doc={addEventListener:(name,fn)=>{(listeners[name] ||= []).push(fn);},querySelectorAll:()=>[]};
const ctx=vm.createContext({document:doc,TABS:{},PANEL_FNS:{}});
for(const name of ['player','localStorage','calcStats','saveGame'])Object.defineProperty(ctx,name,{get(){throw Error('唯讀預覽不可存取 '+name);}});
vm.runInContext(source,ctx);
vm.runInContext(`
    if(TALENT_ATLAS.nodes.length!==301)throw Error('節點數錯誤');
    if(new Set(TALENT_ATLAS.nodes.map(n=>n.id)).size!==301)throw Error('節點ID重複');
    const ids=new Set(TALENT_ATLAS.nodes.map(n=>n.id)), reached=new Set(['origin']);
    for(const [a,b] of TALENT_ATLAS.edges)if(!ids.has(a)||!ids.has(b))throw Error('連線端點不存在');
    for(let i=0;i<301;i++)for(const [a,b] of TALENT_ATLAS.edges){if(reached.has(a))reached.add(b);if(reached.has(b))reached.add(a);}
    if(reached.size!==301)throw Error('有無法從中央抵達的節點');
    for(const r of TALENT_REGIONS){talentSelect(r.id+'-core');if(!talentDetailHtml().includes(r.core))throw Error('核心說明缺漏');}
    talentSelect('invalid');if(talentView.selected!=='guard-core')throw Error('非法節點改變選取');
    for(let i=0;i<20;i++)talentZoom(1);if(talentView.zoom!==4)throw Error('放大上限');
    for(let i=0;i<20;i++)talentZoom(-1);if(talentView.zoom!==1)throw Error('縮小下限');
    talentZoom(1);talentZoom(0);if(talentView.zoom!==1)throw Error('全盤重置');
`,ctx);
const html=vm.runInContext('renderTalent()',ctx);
assert.equal((html.match(/class="talent-node/g)||[]).length,301);
assert.match(html,/<button class="talent-learn" disabled>🔒 未開放/);
assert.doesNotMatch(html,/onclick="[^"\n]*(?:learn|allocate|saveGame|player)/);
assert.equal(typeof ctx.PANEL_FNS.talent,'function');
const icons=[...source.matchAll(/icon:'([^']+)'/g)].map(m=>m[1]);
for(const icon of icons)assert.ok(fs.existsSync(path.join(root,'images/icons/items/mercRune-v1',icon+'.png')),icon);
const index=fs.readFileSync(path.join(root,'index.html'),'utf8');
assert.ok(index.indexOf('data/talent.js?')>index.indexOf('data/ui-panels.js?'));
assert.match(fs.readFileSync(path.join(root,'data/ui-panels.js'),'utf8'),/onclick="switchTab\('talent'\)"/);
assert.match(fs.readFileSync(path.join(root,'data/ui-frame.js'),'utf8'),/\['talent', '✧', '天賦星盤・未開放'\]/);
console.log('PASS：301節點唯一／全部連通、六核心、鎖定、縮放、入口、圖示、無玩家／存檔副作用。');
