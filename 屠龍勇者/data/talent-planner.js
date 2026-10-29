// 配點試玩介面：只操作talentPlanState，關閉後不套用正式角色。
let talentPlanState=talentPlanCreate(100);
let talentPlanView={selected:'origin',jewelId:null,zoom:1,message:'只有試玩點數；重新整理就會清空，不寫角色存檔。'};

function talentOpenPlanner() {
    if(talentPlanIsLive()){talentLiveMode=false;talentPlanState=talentTrialCache||talentPlanCreate(100);talentTrialCache=null;}
    talentShowPlanner();
}

function talentPlanIsLive() { return typeof talentLiveMode!=='undefined'&&talentLiveMode; }

function talentShowPlanner() {
    const existing=document.getElementById('talent-planner-dialog');
    if(existing){talentPlanRender();existing.focus();return;}
    const dialog=document.createElement('dialog');dialog.id='talent-planner-dialog';dialog.className='talent-planner-dialog';
    dialog.innerHTML='<div id="talent-planner-body">'+renderTalentPlanner()+'</div>';
    document.body.appendChild(dialog);dialog.addEventListener('close',()=>{dialog.remove();if(talentPlanIsLive()){talentLiveMode=false;talentPlanState=talentTrialCache||talentPlanCreate(100);talentTrialCache=null;}});
    talentPlannerBind(dialog);dialog.showModal();
}

function talentClosePlanner() {
    const dialog=document.getElementById('talent-planner-dialog');if(dialog)dialog.close();
}

function renderTalentPlanner() {
    const scene=talentPlanDisplayScene(talentPlanState),byId=new Map(scene.nodes.map(n=>[n.id,n]));
    const allocated=talentPlanState.allocated,summary=talentPlanSummary(talentPlanState),spent=talentPlanSpent(talentPlanState);
    const xs=scene.nodes.map(n=>n.x),ys=scene.nodes.map(n=>n.y),minX=Math.min(0,...xs)-25,minY=Math.min(0,...ys)-25,maxX=Math.max(1195,...xs)+25,maxY=Math.max(1024,...ys)+25;
    const paths=scene.edges.map(([a,b])=>{const p=byId.get(a),q=byId.get(b);return `<path class="${allocated.has(a)&&allocated.has(b)?'on':''}" d="M${p.x} ${p.y} L${q.x} ${q.y}"/>`;}).join('');
    const points=scene.nodes.map(n=>{
        const have=allocated.has(n.id),selected=n.id===talentPlanView.selected,r=n.kind==='origin'?22:n.kind==='core'?20:n.kind==='socket'?17:n.kind==='notable'?12:8;
        const mark=n.kind==='origin'?'':have?'✓':n.kind==='socket'?TALENT_SOCKET_TYPES[n.socketType].mark:'';
        return `<g class="talent-plan-node ${n.kind}${have?' allocated':''}${selected?' selected':''}" data-plan-node="${n.id}" transform="translate(${n.x} ${n.y})" role="button" tabindex="0" aria-label="${n.name}，${have?'已配置':n.cost+'點'}" onclick="talentPlanSelect('${n.id}')"><title>${n.name}：${n.text||n.mods.map(talentModText).join('；')||'寶珠插槽'}（${n.cost}點）</title><circle class="talent-plan-hit" r="${r+4}"/><circle r="${r}" class="talent-plan-dot"/>${n.kind==='origin'?`<image class="talent-origin-art" href="images/ui/talent-origin-v2.png" x="${-r}" y="${-r}" width="${r*2}" height="${r*2}" pointer-events="none"/>`:''}${mark?`<text y="5">${mark}</text>`:''}</g>`;
    }).join('');
    const selected=byId.get(talentPlanView.selected)||scene.nodes[0];
    const radius=talentLayoutRadiusHtml(scene,selected.id);
    const html=`<section class="talent-planner"><header class="talent-plan-header"><div><h3>命運星盤・配點試玩</h3><small>獨立試玩・測試寶珠無限量・不套用正式角色</small></div><button class="mini secondary" onclick="talentClosePlanner()">關閉試玩</button></header><div class="talent-plan-budget">剩餘 <b>${talentPlanState.budget-spent}</b>／${talentPlanState.budget} 測試點　已用 ${spent} 點　測試天賦石 ${talentPlanState.refundStones} 顆<button class="mini secondary" onclick="talentPlanReset()">清空試玩</button></div><div class="talent-plan-message" role="status">${talentPlanView.message}</div><nav class="talent-plan-regions">${TALENT_REGIONS.map(r=>`<button class="mini secondary" onclick="talentPlanSelect('${r.id}-gate')">${r.name}起點</button>`).join('')}</nav><div class="talent-plan-columns"><div class="talent-plan-chart"><div class="talent-tools"><button class="mini secondary" onclick="talentPlanZoom(-1)" aria-label="縮小試玩星盤">－</button><button class="mini secondary" onclick="talentPlanZoom(1)" aria-label="放大試玩星盤">＋</button><button class="mini secondary" onclick="talentPlanZoom(0)">全盤</button><small>點節點查看，再按配置；金色勾號為已點出。</small></div><div class="talent-plan-viewport"><svg class="talent-plan-map" style="width:${talentPlanView.zoom*100}%" viewBox="${minX} ${minY} ${maxX-minX} ${maxY-minY}" aria-label="325個主盤節點及已插入星團的分支"><defs><clipPath id="talent-plan-art-clip"><rect width="1195" height="1024"/></clipPath></defs><image href="images/ui/talent-atlas-clean-v1.png" width="1195" height="1024" preserveAspectRatio="none" clip-path="url(#talent-plan-art-clip)" pointer-events="none" opacity=".72"/><g class="talent-plan-paths">${paths}</g>${points}${radius}</svg></div></div><aside class="talent-plan-detail">${talentPlanDetailHtml(selected,summary)}</aside></div><details class="talent-plan-summary" open><summary>本次配點加成・不含正式角色能力</summary>${summary.mods.length?`<div class="talent-plan-mods">${summary.mods.map(m=>`<span>${talentModText(m)}</span>`).join('')}</div>`:'<p>尚未配置有加成的節點。</p>'}${summary.cores.map(c=>`<p><b>${c.name}</b>：${c.text}</p>`).join('')}<small>條件型核心效果單列，不與一般加成混算。只有已配置節點與兩端均已配置的連線會亮起；選取查看不等於已配置。</small></details></section>`;
    if(!talentPlanIsLive())return html;
    return html.replace('關閉試玩','關閉星盤').replace('試玩專用','正式角色').replaceAll('試玩星盤','星盤').replace('命運星盤・配點試玩','命運星盤・正式角色').replace('獨立試玩・測試寶珠無限量・不套用正式角色','正式角色配點・每退1點耗1顆天賦石').replaceAll('測試點','天賦點').replaceAll('測試天賦石','天賦石').replace('<button class="mini secondary" onclick="talentPlanReset()">清空試玩</button>','').replace('本次配點加成・不含正式角色能力','天賦提供的加成（不含裝備與職業）');
}

function talentPlanDetailHtml(node,summary) {
    const have=talentPlanState.allocated.has(node.id),converted=summary.converted.find(n=>n.id===node.id);
    const live=talentPlanIsLive(),owned=id=>live?player.inv.filter(it=>ITEMS[it.id]&&ITEMS[it.id].talentJewel===id).length:0;
    const type={origin:'免費起點',small:'基礎天賦',notable:'專精節點',core:'核心天賦',socket:'寶珠插槽'}[node.kind];
    let body=`<small>${type}${node.socketId?'・星團分支':''}</small>${node.kind==='origin'?'<img class="talent-origin-detail" src="images/ui/talent-origin-v2.png" alt="命運之核">':''}<h4>${node.name}</h4><p>${node.text||node.mods.map(talentModText).join('；')||'可放入對應種類寶珠。'}</p>`;
    if(converted)body+=`<div class="talent-plan-converted">轉化後：${converted.mods.map(talentModText).join('；')}</div>`;
    body+=`<div class="talent-plan-actions"><button class="mini" onclick="talentPlanAction('allocate')" ${have?'disabled':''}>配置 ${node.cost} 點</button><button class="mini secondary" onclick="talentPlanAction('refund')" ${!have||node.id==='origin'?'disabled':''}>退回 ${node.cost} 點（天賦石×1）</button></div>`;
    if(node.kind==='socket'){
        const jewels=TALENT_JEWEL_CATALOG.filter(j=>talentJewelFits(node,j)),installed=TALENT_JEWEL_CATALOG.find(j=>j.id===talentPlanState.jewels[node.id]);
        const preview=jewels.find(j=>j.id===talentPlanView.jewelId)||installed||jewels[0];
        body+=`<p>孔內：${installed?installed.name:'空孔'}</p><details class="talent-jewel-picker"><summary>選擇試玩寶珠・${jewels.length}款</summary>${jewels.map(j=>`<button class="mini secondary${j.id===preview.id?' active':''}" onclick="talentPlanPreview('${j.id}')">${j.name}${live?'・背包'+owned(j.id)+'顆':''}</button>`).join('')}</details>${talentJewelPreviewHtml(node,preview)}<div class="talent-plan-actions"><button class="mini" onclick="talentPlanTryInsert('${preview.id}')" ${!have||installed||live&&!owned(preview.id)?'disabled':''}>試插這顆寶珠</button><button class="mini secondary" onclick="talentPlanAction('remove')" ${!installed?'disabled':''}>拆下試玩寶珠</button></div><small>先花1點開孔才能試插；插珠本身不另扣點。星團需先退完分支才能拆換。轉化只作用主盤已配置的基礎節點。</small>`;
    }
    const scene=talentPlanScene(talentPlanState),byId=new Map(scene.nodes.map(n=>[n.id,n]));
    if(node.kind==='socket'&&talentPlanState.jewels[node.id]){
        const branch=scene.nodes.filter(n=>n.socketId===node.id);
        if(branch.length)body+=`<h5>已展開的星團分支</h5><div class="talent-plan-neighbors">${branch.map((n,i)=>`<button class="mini secondary" onclick="talentPlanSelect('${n.id}')">${talentPlanState.allocated.has(n.id)?'✓ ':''}${i+1}. ${n.name}</button>`).join('')}</div>`;
    }
    const neighborIds=scene.edges.filter(([a,b])=>a===node.id||b===node.id).map(([a,b])=>a===node.id?b:a);
    body+=`<h5>相連節點</h5><div class="talent-plan-neighbors">${neighborIds.map(id=>{const n=byId.get(id);return `<button class="mini secondary" onclick="talentPlanSelect('${id}')">${talentPlanState.allocated.has(id)?'✓ ':''}${n.name}</button>`;}).join('')}</div>`;
    return talentPlanIsLive()?body.replaceAll('試玩寶珠','寶珠').replace('試插這顆寶珠','鑲嵌背包寶珠').replaceAll('試插','鑲嵌').replace('固定示範詞綴；魔法2條、稀有3條。正式掉落與隨機詞綴尚未開放。','固定詞綴寶珠：魔法2條、稀有3條。'):body;
}

function talentPlanRender() {
    if(talentPlanIsLive()){if(!player){talentClosePlanner();return;}talentPlanState=talentLivePlanState();}
    const host=document.getElementById('talent-planner-body');if(!host)return;
    const viewport=host.querySelector('.talent-plan-viewport'),x=viewport?viewport.scrollLeft:0,y=viewport?viewport.scrollTop:0;
    host.innerHTML=renderTalentPlanner();
    const next=host.querySelector('.talent-plan-viewport');if(next){next.scrollLeft=x;next.scrollTop=y;}
}

function talentPlanSelect(id) {
    if(!talentPlanScene(talentPlanState).nodes.some(n=>n.id===id))return;
    talentPlanView.selected=id;talentPlanRender();
}

function talentPlanAction(action) {
    const id=talentPlanView.selected;
    if(talentPlanIsLive()){talentLiveAction(action,id);return;}
    const result=action==='allocate'?talentPlanAllocate(talentPlanState,id):action==='refund'?talentPlanRefund(talentPlanState,id):action==='remove'?talentPlanRemove(talentPlanState,id):null;
    if(!result)return;talentPlanView.message=result.reason;talentPlanRender();
}

function talentPlanPreview(id) {
    const node=talentPlanScene(talentPlanState).nodes.find(n=>n.id===talentPlanView.selected),jewel=TALENT_JEWEL_CATALOG.find(j=>j.id===id);
    if(!talentJewelFits(node,jewel))return;
    talentPlanView.jewelId=id;talentPlanRender();
}

function talentPlanTryInsert(jewelId) {
    if(talentPlanIsLive()){talentLiveAction('insert',talentPlanView.selected,jewelId);return;}
    const result=talentPlanInsert(talentPlanState,talentPlanView.selected,jewelId);
    talentPlanView.message=result.reason;talentPlanRender();
}

function talentPlanReset() {
    if(talentPlanIsLive()){showToast('正式角色退點需消耗天賦石，不能免費清空');return;}
    talentPlanState=talentPlanCreate(100);talentPlanView={selected:'origin',jewelId:null,zoom:1,message:'已清空試玩配置，恢復100測試點與100顆測試天賦石。'};talentPlanRender();
}

function talentPlanZoom(dir) {
    talentPlanView.zoom=dir===0?1:Math.max(1,Math.min(4,talentPlanView.zoom+dir*.5));
    const host=document.getElementById('talent-planner-body');if(!host)return;
    const viewport=host.querySelector('.talent-plan-viewport'),map=host.querySelector('.talent-plan-map');if(!map||!viewport)return;
    const before=map.getBoundingClientRect(),x=(viewport.scrollLeft+viewport.clientWidth/2)/before.width,y=(viewport.scrollTop+viewport.clientHeight/2)/before.height;
    map.style.width=talentPlanView.zoom*100+'%';const after=map.getBoundingClientRect();
    viewport.scrollLeft=x*after.width-viewport.clientWidth/2;viewport.scrollTop=y*after.height-viewport.clientHeight/2;
}

function talentPlannerBind(host) {
    let drag=null;
    host.addEventListener('keydown',e=>{const node=e.target.closest&&e.target.closest('.talent-plan-node');if(node&&(e.key==='Enter'||e.key===' ')){e.preventDefault();const id=node.dataset.planNode;talentPlanSelect(id);const next=host.querySelector('[data-plan-node="'+id+'"]');if(next)next.focus();}});
    host.addEventListener('pointerdown',e=>{const viewport=e.target.closest&&e.target.closest('.talent-plan-viewport');if(viewport&&e.pointerType==='mouse'&&e.button===0)drag={viewport,x:e.clientX,y:e.clientY,left:viewport.scrollLeft,top:viewport.scrollTop,moved:false};});
    host.addEventListener('pointermove',e=>{if(!drag)return;if(Math.hypot(e.clientX-drag.x,e.clientY-drag.y)>5)drag.moved=true;if(drag.moved){e.preventDefault();drag.viewport.scrollLeft=drag.left+drag.x-e.clientX;drag.viewport.scrollTop=drag.top+drag.y-e.clientY;}});
    host.addEventListener('pointerup',()=>{if(drag&&!drag.moved)drag=null;});
    host.addEventListener('pointercancel',()=>{drag=null;});
    host.addEventListener('click',e=>{if(drag&&drag.moved){drag=null;e.preventDefault();e.stopImmediatePropagation();}},true);
}
