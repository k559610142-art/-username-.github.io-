// 正式遊戲顯示布局／圖片接線，禁止角色、存檔與外部服務。
const fs=require('fs'),path=require('path'),vm=require('vm'),assert=require('assert/strict');
const root=path.resolve(__dirname,'..'),ctx=vm.createContext({assert,document:{addEventListener(){},querySelectorAll(){return[]},getElementById(){return null}},TABS:{},PANEL_FNS:{}});
for(const key of ['player','localStorage','saveGame','fetch'])Object.defineProperty(ctx,key,{get(){throw Error('布局不可讀寫 '+key);}});
for(const file of ['talent-jewels','talent','talent-tree','talent-layout','talent-planner'])vm.runInContext(fs.readFileSync(path.join(root,'data',file+'.js'),'utf8'),ctx);
vm.runInContext(`
const logicalBefore=JSON.stringify(TALENT_PLAN_TREE),base=talentPlanDisplayScene(talentPlanCreate(100));
function verifySpacing(state){const logical=talentPlanScene(state),shown=talentPlanDisplayScene(state);assert.equal(shown.nodes.length,logical.nodes.length);assert.equal(JSON.stringify(shown.edges),JSON.stringify(logical.edges));
 for(let i=0;i<shown.nodes.length;i++){const n=shown.nodes[i],source=logical.nodes[i],a={...n},b={...source};delete a.x;delete a.y;delete b.x;delete b.y;assert.equal(JSON.stringify(a),JSON.stringify(b));
  for(let j=i+1;j<shown.nodes.length;j++){const other=shown.nodes[j];assert(Math.hypot(n.x-other.x,n.y-other.y)>=talentLayoutRadius(n)+talentLayoutRadius(other)+7.99,n.id+' / '+other.id);}
 }return shown;
}
verifySpacing(talentPlanCreate(100));
const sockets=TALENT_PLAN_TREE.nodes.filter(n=>n.socketType==='cluster');
for(const socket of sockets)for(const size of ['small','medium','large']){const state=talentPlanCreate(100);state.allocated.add(socket.id);state.jewels[socket.id]='cluster-war-'+size;verifySpacing(state);}
const all=talentPlanCreate(100);for(const socket of sockets){all.allocated.add(socket.id);all.jewels[socket.id]='cluster-war-large';}assert.equal(verifySpacing(all).nodes.length,373);
assert.equal(JSON.stringify(TALENT_PLAN_TREE),logicalBefore);
for(const socket of TALENT_PLAN_TREE.nodes.filter(n=>n.socketType==='radius')){const expected=TALENT_PLAN_TREE.nodes.filter(n=>n.kind==='small'&&Math.hypot(n.x-socket.x,n.y-socket.y)<=160),html=talentLayoutRadiusHtml(base,socket.id);assert.equal((html.match(/class="talent-radius-preview"/g)||[]).length,expected.length);for(const n of expected){const shown=base.nodes.find(x=>x.id===n.id);assert(html.includes('cx="'+shown.x+'" cy="'+shown.y+'"'));}}
const html=renderTalent();assert.equal((html.match(/data-node="/g)||[]).length,325);assert(html.includes('images/ui/talent-atlas-clean-v1.png'));assert(!html.includes('talent-atlas-unallocated'));assert(html.includes('class="talent-paths"'));
assert(html.includes('href="images/ui/talent-origin-v2.png"'));talentSelect('origin');assert(talentDetailHtml().includes('src="images/ui/talent-origin-v2.png"'));
talentSelect('battle-r0-0');assert(talentDetailHtml().includes(TALENT_PLAN_TREE.nodes.find(n=>n.id==='battle-r0-0').mods.map(talentModText).join('；')));assert(!talentDetailHtml().includes('<image'));
talentPlanState=talentPlanCreate(100);assert(renderTalentPlanner().includes('images/ui/talent-atlas-clean-v1.png'));assert(!renderTalentPlanner().includes('talent-atlas-unallocated'));assert(!renderTalentPlanner().includes('<path class="on"'));
assert(renderTalentPlanner().includes('href="images/ui/talent-origin-v2.png"'));
talentPlanView.selected='battle-gate';talentPlanAction('allocate');assert.equal(talentPlanSpent(talentPlanState),1);talentPlanAction('refund');assert.equal(talentPlanSpent(talentPlanState),0);
`,ctx);
const image=fs.readFileSync(path.join(root,'images/ui/talent-atlas-clean-v1.png'));assert.equal(image.readUInt32BE(16),1254);assert.equal(image.readUInt32BE(20),1254);
const index=fs.readFileSync(path.join(root,'index.html'),'utf8');assert(index.indexOf('data/talent-layout.js?')>index.indexOf('data/talent-tree.js?'));assert(index.indexOf('data/talent-layout.js?')<index.indexOf('data/talent-planner.js?'));
console.log('PASS：遊戲主盤與配點頁採純背景／325節點；主盤、18星團布局與373節點無重疊、點擊區互不覆蓋；邏輯座標／效果／路徑不變，轉化標記精確、配退點正常、無角色存檔副作用。');
