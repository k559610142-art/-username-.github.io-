// 原畫星盤的熱區、鎖定與無角色副作用驗證。
const fs=require('fs'),vm=require('vm'),assert=require('assert/strict'),path=require('path');
const root=path.resolve(__dirname,'..'),source=fs.readFileSync(path.join(root,'data/talent-jewels.js'),'utf8')+'\n'+fs.readFileSync(path.join(root,'data/talent.js'),'utf8');
const listeners={},doc={addEventListener:(name,fn)=>{(listeners[name] ||= []).push(fn);},querySelectorAll:()=>[]};
const ctx=vm.createContext({document:doc,TABS:{},PANEL_FNS:{}});
for(const name of ['player','localStorage','calcStats','saveGame'])Object.defineProperty(ctx,name,{get(){throw Error('唯讀預覽不可存取 '+name);}});
vm.runInContext(source,ctx);
vm.runInContext(`
    if(TALENT_ATLAS.nodes.length!==31)throw Error('核心與插槽熱區數錯誤');
    if(new Set(TALENT_ATLAS.nodes.map(n=>n.id)).size!==31)throw Error('節點ID重複');
    for(const n of TALENT_ATLAS.nodes)if(n.x<25||n.x>1170||n.y<25||n.y>999)throw Error('熱區超出原畫');
    const sockets=TALENT_ATLAS.nodes.filter(n=>n.kind==='socket');
    for(const [type,count] of [['normal',12],['radius',6],['cluster',6]])if(sockets.filter(n=>n.socketType===type).length!==count)throw Error('插槽數量錯誤 '+type);
    for(const r of TALENT_REGIONS)if(sockets.filter(n=>TALENT_REGIONS[n.region]===r).length!==4)throw Error('星群插槽缺漏');
    for(const n of sockets){
        talentSelect(n.id);const html=talentDetailHtml();
        if(!html.includes('disabled>🔒 鑲嵌未開放')||!html.includes(n.name))throw Error('插槽未鎖定');
        if(n.cost!==1)throw Error('開孔點數錯誤');
        if(!TALENT_JEWEL_CATALOG.filter(j=>talentJewelFits(n,j)).every(j=>html.includes(j.name)))throw Error('寶珠選單缺漏');
        if(n.socketType==='radius'&&!html.includes('不重複計算'))throw Error('範圍規則缺漏');
        for(const jewel of TALENT_JEWEL_CATALOG.filter(j=>talentJewelFits(n,j))){
            talentChooseJewel(jewel.id);if(!talentDetailHtml().includes(jewel.name))throw Error('寶珠試看失敗');
            if(n.socketType==='cluster'&&!talentClusterBranch(jewel,n).every(b=>(b.text?talentDetailHtml().includes(b.text):b.mods.every(m=>talentDetailHtml().includes(talentModText(m))))))throw Error('擴展節點缺漏');
        }
    }
    talentSelect('battle-socket-2');if(!renderTalent().includes('class="talent-radius-preview" cx="345" cy="330" r="160"'))throw Error('重畫遺失範圍示意');
    for(const r of TALENT_REGIONS){talentSelect(r.id+'-core');if(!talentDetailHtml().includes(r.core))throw Error('核心說明缺漏');}
    for(const j of TALENT_JEWEL_CATALOG.filter(j=>j.type==='cluster'&&j.size==='large')){
        const core=talentClusterBranch(j,sockets.find(n=>n.socketType==='cluster')).find(n=>n.kind==='core');
        if(core.exclusiveGroup!==TALENT_ATLAS.nodes.find(n=>n.kind==='core'&&n.region===j.region).exclusiveGroup)throw Error('主盤／星團核心互斥群組不一致');
    }
    talentSelect('invalid');if(talentView.selected!=='guard-core')throw Error('非法節點改變選取');
    for(let i=0;i<20;i++)talentZoom(1);if(talentView.zoom!==4)throw Error('放大上限');
    for(let i=0;i<20;i++)talentZoom(-1);if(talentView.zoom!==1)throw Error('縮小下限');
    talentZoom(1);talentZoom(0);if(talentView.zoom!==1)throw Error('全盤重置');
`,ctx);
const html=vm.runInContext('renderTalent()',ctx);
assert.equal((html.match(/class="talent-node/g)||[]).length,31);
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
assert.ok(index.indexOf('data/talent-jewels.js?')<index.indexOf('data/talent.js?'));
assert.match(fs.readFileSync(path.join(root,'data/ui-panels.js'),'utf8'),/onclick="switchTab\('talent'\)"/);
assert.match(fs.readFileSync(path.join(root,'data/ui-frame.js'),'utf8'),/\['talent', '✧', '天賦星盤・未開放'\]/);
const crypto=require('crypto');
assert.equal(crypto.createHash('sha256').update(fs.readFileSync(path.join(root,'images/ui/talent-atlas-v1.png'))).digest('hex'),'eece1bf4ec165c0daf15c8f1fca53d8b4074b8fd520c916a5031bc9c5395b2d6');
console.log('PASS：原圖一致、7核心＋24插槽、38款寶珠跨區試看、分支效果完整、全部鎖定、縮放、載入／入口、無玩家／存檔副作用。');
