// 隔離試玩實際走圖、扣點／退點、插珠及星團生命週期，不連正式遊戲。
const fs=require('fs'),path=require('path'),vm=require('vm'),assert=require('assert/strict');
const root=path.resolve(__dirname,'..'),files=['talent-jewels','talent','talent-tree','talent-layout','talent-planner'];
const ctx=vm.createContext({document:{addEventListener:()=>{},querySelectorAll:()=>[],getElementById:()=>null},TABS:{},PANEL_FNS:{}});
for(const name of ['player','ITEMS','localStorage','saveGame','calcStats','cloudSb','cloudUser'])Object.defineProperty(ctx,name,{get(){throw Error('試玩不可存取 '+name);}});
files.forEach(f=>vm.runInContext(fs.readFileSync(path.join(root,'data',f+'.js'),'utf8'),ctx));
vm.runInContext(`
    function check(ok,text){if(!ok)throw Error(text);}
    const original=JSON.stringify(TALENT_PLAN_TREE);
    check(talentLevelPoints(9)===0&&talentLevelPoints(10)===1&&talentLevelPoints(20)===11&&talentLevelPoints(50)===41&&talentLevelPoints(99)===90&&talentLevelPoints(100)===90,'等級點數');
    check(talentLevelPoints(NaN)===0&&talentLevelPoints('99')===0&&talentLevelPoints(10.5)===0,'非法等級');
    check(talentPointTotal(99,TALENT_TRIAL_IDS.concat(TALENT_TRIAL_IDS,['fake'])).total===100,'試煉重領或超過100點');
    check(talentPointTotal(9,TALENT_TRIAL_IDS).total===0&&talentPointTotal(99,null).total===90,'未解鎖或非法試煉');
    check(TALENT_PLAN_TREE.nodes.length===325,'主盤數量');
    check(new Set(TALENT_PLAN_TREE.nodes.map(n=>n.id)).size===325,'ID重複');
    const ids=new Set(TALENT_PLAN_TREE.nodes.map(n=>n.id));
    check(TALENT_PLAN_TREE.edges.every(([a,b])=>ids.has(a)&&ids.has(b)),'懸空連線');
    check(TALENT_PLAN_TREE.nodes.every(n=>n.mods&&n.mods.every(m=>Number.isFinite(m[1]))&&n.cost===(n.id==='origin'?0:1)),'能力／點數缺漏');
    function route(state,target){
        const scene=talentPlanScene(state),blocked=new Set(scene.nodes.filter(n=>n.kind==='core'&&n.id!==target).map(n=>n.id));
        const queue=['origin'],prev=new Map([['origin',null]]),adj=new Map();
        scene.edges.forEach(([a,b])=>{if(!adj.has(a))adj.set(a,[]);if(!adj.has(b))adj.set(b,[]);adj.get(a).push(b);adj.get(b).push(a);});
        while(queue.length){const id=queue.shift();if(id===target)break;(adj.get(id)||[]).forEach(n=>{if(!blocked.has(n)&&!prev.has(n)){prev.set(n,id);queue.push(n);}});}
        check(prev.has(target),'節點無法抵達 '+target);
        const path=[];for(let id=target;id;id=prev.get(id))path.unshift(id);return path;
    }
    function learnRoute(state,id){route(state,id).forEach(n=>{if(!state.allocated.has(n)){const r=talentPlanAllocate(state,n);check(r.ok,'路徑配置失敗 '+n+' '+r.reason);}});}
    const empty=talentPlanCreate(100);TALENT_PLAN_TREE.nodes.forEach(n=>route(empty,n.id));
    const small=talentPlanCreate(2);
    check(!talentPlanAllocate(small,'battle-core').ok,'可越過前置');
    check(talentPlanAllocate(small,'battle-gate').ok,'第一點');
    check(!talentPlanAllocate(small,'battle-gate').ok&&talentPlanSpent(small)===1,'重複扣點');
    check(talentPlanAllocate(small,'battle-r1-0').ok,'第二點');
    check(!talentPlanAllocate(small,'battle-r1-1').ok&&talentPlanSpent(small)===2,'預算溢出');
    check(!talentPlanRefund(small,'battle-gate').ok,'可切斷下游');
    check(small.refundStones===100,'失敗退點扣石');
    check(talentPlanRefund(small,'battle-r1-0').ok&&talentPlanRefund(small,'battle-gate').ok&&talentPlanSpent(small)===0,'退點數量');
    check(small.refundStones===98,'退2點未扣2石');
    const noStone=talentPlanCreate(100,0);talentPlanAllocate(noStone,'battle-gate');
    check(!talentPlanRefund(noStone,'battle-gate').ok&&talentPlanSpent(noStone)===1&&noStone.refundStones===0,'無石仍可退點');
    check(!talentPlanRefund(small,'origin').ok&&!talentPlanAllocate(small,'bad').ok,'非法節點');
    const sockets=TALENT_PLAN_TREE.nodes.filter(n=>n.kind==='socket');
    for(const socket of sockets){
        const state=talentPlanCreate(100),jewel=TALENT_JEWEL_CATALOG.find(j=>talentJewelFits(socket,j));
        check(!talentPlanInsert(state,socket.id,jewel.id).ok,'未開孔可插');
        learnRoute(state,socket.id);const spent=talentPlanSpent(state);
        check(talentPlanInsert(state,socket.id,jewel.id).ok&&talentPlanSpent(state)===spent,'插珠扣點');
        check(!talentPlanRefund(state,socket.id).ok,'孔內有珠可退');
        check(!talentPlanInsert(state,socket.id,jewel.id).ok,'重複插珠');
        check(talentPlanRemove(state,socket.id).ok&&talentPlanRefund(state,socket.id).ok,'拆珠／退孔');
    }
    const clusterSocket=sockets.find(n=>n.socketType==='cluster');
    for(const jewel of TALENT_JEWEL_CATALOG.filter(j=>j.type==='cluster')){
        const state=talentPlanCreate(100);learnRoute(state,clusterSocket.id);const start=talentPlanSpent(state);
        check(talentPlanInsert(state,clusterSocket.id,jewel.id).ok,'星團插入');
        const branch=talentPlanScene(state).nodes.filter(n=>n.socketId===clusterSocket.id);
        check(branch.length===({small:4,medium:6,large:8})[jewel.size],'分支數量');
        check(!talentPlanAllocate(state,branch[branch.length-1].id).ok,'跳過星團前置');
        branch.forEach(n=>check(talentPlanAllocate(state,n.id).ok,'星團扣點 '+n.id));
        check(talentPlanSpent(state)===start+branch.length,'星團點數未逐點扣');
        check(!talentPlanRemove(state,clusterSocket.id).ok,'帶點拆星團');
        const replacement=TALENT_JEWEL_CATALOG.find(j=>j.type==='cluster'&&j.id!==jewel.id);
        check(!talentPlanInsert(state,clusterSocket.id,replacement.id).ok,'帶點換星團');
        check(!talentPlanRefund(state,branch[0].id).ok,'可切斷星團前置');
        branch.slice().reverse().forEach(n=>check(talentPlanRefund(state,n.id).ok,'退星團失敗'));
        check(talentPlanSpent(state)===start&&talentPlanRemove(state,clusterSocket.id).ok,'星團退點／拆除');
        check(!talentPlanScene(state).nodes.some(n=>n.socketId===clusterSocket.id),'拆除後殘留節點');
    }
    for(const jewel of TALENT_JEWEL_CATALOG.filter(j=>j.type==='radius')){
        const match=TALENT_PLAN_TREE.nodes.find(n=>n.kind==='small'&&n.mods.some(m=>m[0]===jewel.from)&&sockets.some(s=>s.socketType==='radius'&&Math.hypot(n.x-s.x,n.y-s.y)<=160));
        check(match,'主盤沒有可供轉化的節點 '+jewel.id);
        const socket=sockets.find(s=>s.socketType==='radius'&&Math.hypot(match.x-s.x,match.y-s.y)<=160),state=talentPlanCreate(200);
        learnRoute(state,socket.id);learnRoute(state,match.id);const before=JSON.stringify(talentPlanSummary(state));
        check(talentPlanInsert(state,socket.id,jewel.id).ok,'轉化插珠');
        check(talentPlanSummary(state).converted.some(n=>n.id===match.id&&n.mods.some(m=>m[0]===jewel.to)),'沒有轉化實際配點');
        check(talentPlanRemove(state,socket.id).ok&&JSON.stringify(talentPlanSummary(state))===before,'拆轉化珠未恢復');
    }
    const normal=sockets.find(n=>n.socketType==='normal'),state=talentPlanCreate(100),jewel=TALENT_JEWEL_CATALOG.find(j=>j.type==='normal');
    learnRoute(state,normal.id);const before=JSON.stringify(talentPlanSummary(state));
    talentPlanInsert(state,normal.id,jewel.id);check(JSON.stringify(talentPlanSummary(state))!==before,'一般珠沒加能力');
    talentPlanRemove(state,normal.id);check(JSON.stringify(talentPlanSummary(state))===before,'一般珠拆除未恢復');
    const radiusSlots=sockets.filter(n=>n.socketType==='radius'),convert=TALENT_JEWEL_CATALOG.find(j=>j.id==='convert-blood-mana');
    let overlap=null;
    for(const n of TALENT_PLAN_TREE.nodes.filter(n=>n.kind==='small'&&n.mods.some(m=>m[0]==='最大生命'))){
        const near=radiusSlots.filter(s=>Math.hypot(n.x-s.x,n.y-s.y)<=160);if(near.length>=2){overlap={node:n,slots:near.slice(0,2)};break;}
    }
    check(overlap,'缺少可驗證重疊的主盤節點');
    const overlapping=talentPlanCreate(325);overlap.slots.forEach(s=>learnRoute(overlapping,s.id));learnRoute(overlapping,overlap.node.id);
    check(talentPlanInsert(overlapping,overlap.slots[0].id,convert.id).ok,'第一顆轉化寶珠');
    const inserted=JSON.stringify(overlapping.jewels),overlapSpent=talentPlanSpent(overlapping);
    check(!talentPlanInsert(overlapping,overlap.slots[1].id,convert.id).ok,'允許重疊轉化');
    check(JSON.stringify(overlapping.jewels)===inserted&&talentPlanSpent(overlapping)===overlapSpent,'失敗插入仍改狀態');
    const large=TALENT_JEWEL_CATALOG.find(j=>j.type==='cluster'&&j.size==='large'),exclusive=talentPlanCreate(200);
    learnRoute(exclusive,clusterSocket.id);learnRoute(exclusive,'battle-core');talentPlanInsert(exclusive,clusterSocket.id,large.id);
    const branch=talentPlanScene(exclusive).nodes.filter(n=>n.socketId===clusterSocket.id);
    branch.slice(0,-1).forEach(n=>check(talentPlanAllocate(exclusive,n.id).ok,'互斥前置'));
    check(!talentPlanAllocate(exclusive,branch[branch.length-1].id).ok,'同主題核心重複生效');
    check(JSON.stringify(TALENT_PLAN_TREE)===original,'修改主盤原資料');
    const html=renderTalentPlanner();
    check((html.match(/data-plan-node=/g)||[]).length===325,'畫面節點缺漏');
    check(html.includes('100')&&html.includes('不套用正式角色')&&html.includes('相連節點'),'試玩隔離標示／操作缺漏');
    talentPlanSelect('battle-gate');talentPlanAction('allocate');check(talentPlanSpent(talentPlanState)===1,'真實UI配置未接上');
    talentPlanAction('refund');check(talentPlanSpent(talentPlanState)===0,'真實UI退點未接上');
    talentPlanReset();check(talentPlanState.allocated.size===1&&Object.keys(talentPlanState.jewels).length===0&&talentPlanState.refundStones===100,'清空試玩');
`,ctx);
const index=fs.readFileSync(path.join(root,'index.html'),'utf8');
assert.ok(index.indexOf('data/talent-tree.js?')>index.indexOf('data/talent.js?'));
assert.ok(index.indexOf('data/talent-planner.js?')>index.indexOf('data/talent-tree.js?'));
console.log('PASS：325節點唯一且全部連通、扣點預算／前置／退點連通、24孔生命週期、18星團實際展開／學習／拆換、6轉化實際配點、加成彙總還原、核心互斥、UI接線與隔離。');
