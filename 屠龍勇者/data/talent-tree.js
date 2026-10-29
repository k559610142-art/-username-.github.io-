// 隔離配點模型：只修改傳入的試玩狀態，不碰正式角色。
const TALENT_PROGRESS_RULES={unlockLevel:10,maxLevel:99,levelPoints:90,trialPoints:10,totalPoints:100,refundItem:'talentStone',refundName:'天賦石',refundPerPoint:1};
const TALENT_TRIAL_IDS=Array.from({length:10},(_,i)=>'talent-trial-'+(i+1));
const TALENT_PLAN_TREE = talentPlanBuildTree();

function talentLevelPoints(level) {
    return Number.isInteger(level)&&level>=10?Math.min(level,99)-9:0;
}

function talentPointTotal(level,completedTrials=[]) {
    const levelPoints=talentLevelPoints(level);
    const trials=levelPoints&&Array.isArray(completedTrials)?new Set(completedTrials.filter(id=>TALENT_TRIAL_IDS.includes(id))).size:0;
    return {level:levelPoints,trials,total:levelPoints+trials};
}

function talentPlanBuildTree() {
    const origin={...TALENT_ATLAS.nodes[0],mods:[],text:'免費起點。'},nodes=[origin],edges=[];
    TALENT_REGIONS.forEach((region,i)=>{
        const core=TALENT_ATLAS.nodes.find(n=>n.kind==='core'&&n.region===i),family=TALENT_CLUSTER_FAMILIES[i];
        const toward=Math.atan2(origin.y-core.y,origin.x-core.x),outward=toward+Math.PI;
        const gate={id:region.id+'-gate',name:region.name+'之路',kind:'small',region:i,cost:1,x:origin.x+Math.cos(outward)*150,y:origin.y+Math.sin(outward)*150,mods:[family.small[0].slice()]};
        nodes.push(gate,{...core,mods:[],text:family.core.text});edges.push(['origin',gate.id]);
        for(let ring=0;ring<2;ring++){
            const count=ring?30:18,radius=ring?145:92;
            for(let j=0;j<count;j++){
                const angle=toward+j*Math.PI*2/count,notable=ring?j%5===2:j%6===3;
                const spec=family.notable[Math.floor(j/5)%family.notable.length];
                const id=region.id+'-r'+ring+'-'+j;
                const mod=i===0&&j%6===4?['物理傷害',2,'%']:i===1&&j%6===4?['每5秒回魔',1]:family.small[j%family.small.length].slice();
                nodes.push({id,name:notable?spec.name+'・'+(ring+1)+'-'+(j+1):region.name+'基礎 '+(ring?19+j:1+j),kind:notable?'notable':'small',region:i,cost:1,x:core.x+Math.cos(angle)*radius,y:core.y+Math.sin(angle)*radius,mods:notable?spec.mods.map(m=>m.slice()):[mod]});
                edges.push([id,region.id+'-r'+ring+'-'+((j+1)%count)]);
                if(!ring&&j%6===0)edges.push([core.id,id]);
                if(ring&&j%5===0)edges.push([id,region.id+'-r0-'+j/5*3]);
            }
        }
        edges.push([gate.id,region.id+'-r1-0']);
        const candidates=nodes.filter(n=>n.region===i&&n.kind!=='core');
        TALENT_ATLAS.nodes.filter(n=>n.kind==='socket'&&n.region===i).forEach(socket=>{
            const nearest=candidates.reduce((a,b)=>Math.hypot(a.x-socket.x,a.y-socket.y)<Math.hypot(b.x-socket.x,b.y-socket.y)?a:b);
            nodes.push({...socket,mods:[]});edges.push([nearest.id,socket.id]);
        });
        edges.push([region.id+'-r1-10',TALENT_REGIONS[(i+1)%6].id+'-r1-20']);
    });
    return {nodes,edges};
}

function talentPlanCreate(budget=100,refundStones=100) {
    return {budget:Number.isInteger(budget)&&budget>=0&&budget<=325?budget:100,allocated:new Set(['origin']),jewels:{},refundStones:Number.isInteger(refundStones)&&refundStones>=0?refundStones:100};
}

function talentPlanScene(state) {
    const nodes=TALENT_PLAN_TREE.nodes.slice(),edges=TALENT_PLAN_TREE.edges.slice(),origin=nodes[0];
    Object.entries(state.jewels).forEach(([id,jewelId])=>{
        const socket=nodes.find(n=>n.id===id),jewel=TALENT_JEWEL_CATALOG.find(j=>j.id===jewelId);
        if(!socket||!state.allocated.has(id)||!talentJewelFits(socket,jewel)||jewel.type!=='cluster')return;
        const angle=Math.atan2(socket.y-origin.y,socket.x-origin.x);
        talentClusterBranch(jewel,socket).forEach((n,i)=>{
            const distance=52+i*34,side=i%2?19:-19;
            nodes.push({...n,region:socket.region,socketId:id,x:socket.x+Math.cos(angle)*distance-Math.sin(angle)*side,y:socket.y+Math.sin(angle)*distance+Math.cos(angle)*side});
            edges.push([n.requires,n.id]);
        });
    });
    return {nodes,edges};
}

function talentPlanSpent(state) { return state.allocated.size-1; }

function talentPlanConversions(state,allocated=state.allocated,jewels=state.jewels) {
    const nodes=TALENT_PLAN_TREE.nodes.map(n=>({...n,allocated:allocated.has(n.id)}));
    const placements=Object.entries(jewels).map(([id,jewelId])=>({socket:TALENT_PLAN_TREE.nodes.find(n=>n.id===id),jewel:TALENT_JEWEL_CATALOG.find(j=>j.id===jewelId)})).filter(p=>p.socket&&allocated.has(p.socket.id)&&p.jewel&&p.jewel.type==='radius');
    return talentConvertNodes(nodes,placements);
}

function talentPlanAllocate(state,id) {
    const scene=talentPlanScene(state),node=scene.nodes.find(n=>n.id===id);
    if(!node)return {ok:false,reason:'找不到這個節點。'};
    if(state.allocated.has(id))return {ok:false,reason:'這個節點已點出。'};
    if(talentPlanSpent(state)>=state.budget)return {ok:false,reason:'測試天賦點不足。'};
    if(node.socketId?!state.allocated.has(node.requires):!scene.edges.some(([a,b])=>(a===id&&state.allocated.has(b))||(b===id&&state.allocated.has(a))))return {ok:false,reason:'請先點出相連的前置路徑。'};
    if(node.exclusiveGroup&&scene.nodes.some(n=>n.exclusiveGroup===node.exclusiveGroup&&state.allocated.has(n.id)))return {ok:false,reason:'同主題核心只能選一個，請先退回另一個核心。'};
    const next=new Set(state.allocated);next.add(id);
    if(talentPlanConversions(state,next).conflicts.length)return {ok:false,reason:'此節點會同時受到兩顆轉化寶珠影響，請先調整寶珠。'};
    state.allocated.add(id);return {ok:true,reason:'試玩已配置：'+node.name+'（1點）。'};
}

function talentPlanRefund(state,id) {
    if(id==='origin')return {ok:false,reason:'中央起點免費，不需要退點。'};
    if(!state.allocated.has(id))return {ok:false,reason:'這個節點尚未配置。'};
    if(state.jewels[id])return {ok:false,reason:'請先拆下這個孔裡的試玩寶珠。'};
    if(state.refundStones<TALENT_PROGRESS_RULES.refundPerPoint)return {ok:false,reason:'測試天賦石不足，不能退點。'};
    const scene=talentPlanScene(state),remaining=new Set(state.allocated);remaining.delete(id);
    const reached=new Set(['origin']),queue=['origin'],adj=new Map();
    scene.edges.forEach(([a,b])=>{if(!adj.has(a))adj.set(a,[]);if(!adj.has(b))adj.set(b,[]);adj.get(a).push(b);adj.get(b).push(a);});
    while(queue.length){const current=queue.shift();(adj.get(current)||[]).forEach(next=>{if(remaining.has(next)&&!reached.has(next)){reached.add(next);queue.push(next);}});}
    if(reached.size!==remaining.size)return {ok:false,reason:'退掉會切斷後續節點，請先退回末端節點。'};
    state.allocated.delete(id);state.refundStones-=TALENT_PROGRESS_RULES.refundPerPoint;return {ok:true,reason:'試玩已退回1點，消耗1顆測試天賦石。'};
}

function talentPlanInsert(state,socketId,jewelId) {
    const socket=TALENT_PLAN_TREE.nodes.find(n=>n.id===socketId),jewel=TALENT_JEWEL_CATALOG.find(j=>j.id===jewelId);
    if(!talentJewelFits(socket,jewel))return {ok:false,reason:'寶珠種類與孔槽不相符。'};
    if(!state.allocated.has(socketId))return {ok:false,reason:'請先花1點開啟這個孔。'};
    if(state.jewels[socketId]===jewelId)return {ok:false,reason:'這顆試玩寶珠已在孔內。'};
    if(talentPlanScene(state).nodes.some(n=>n.socketId===socketId&&state.allocated.has(n.id)))return {ok:false,reason:'請先退回星團分支點數，才能換寶珠。'};
    const next={...state.jewels,[socketId]:jewelId};
    if(talentPlanConversions(state,state.allocated,next).conflicts.length)return {ok:false,reason:'兩顆轉化寶珠會改變同一個已配置節點，請換位置。'};
    state.jewels[socketId]=jewelId;return {ok:true,reason:'已試插：'+jewel.name+'。未扣正式道具。'};
}

function talentPlanRemove(state,socketId) {
    if(!state.jewels[socketId])return {ok:false,reason:'這個孔尚未試插寶珠。'};
    if(talentPlanScene(state).nodes.some(n=>n.socketId===socketId&&state.allocated.has(n.id)))return {ok:false,reason:'請先退回星團分支點數，才能拆珠。'};
    delete state.jewels[socketId];return {ok:true,reason:'已拆下試玩寶珠。'};
}

function talentPlanSummary(state) {
    const converted=talentPlanConversions(state),scene=talentPlanScene(state),mods=new Map(),cores=[];
    const add=m=>{const key=m[0]+'|'+(m[2]||'');const old=mods.get(key)||[m[0],0,m[2]||''];old[1]=Math.round((old[1]+m[1])*1000)/1000;mods.set(key,old);};
    converted.nodes.concat(scene.nodes.filter(n=>n.socketId)).filter(n=>state.allocated.has(n.id)).forEach(n=>{n.mods.forEach(add);if(n.kind==='core')cores.push({name:n.name,text:n.text});});
    Object.entries(state.jewels).forEach(([id,jewelId])=>{const j=TALENT_JEWEL_CATALOG.find(j=>j.id===jewelId);if(state.allocated.has(id)&&j&&j.type==='normal')j.mods.forEach(add);});
    return {mods:[...mods.values()],cores,converted:converted.nodes.filter(n=>n.convertedBy)};
}
