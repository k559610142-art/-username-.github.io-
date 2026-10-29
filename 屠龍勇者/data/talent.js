// 命運星盤：唯讀預覽。未開放配點，不讀寫玩家能力或存檔。
const TALENT_REGIONS = [
    { id:'battle', name:'征戰', color:'#da8266', icon:'heavy', core:'破軍之誓', desc:'以近戰、武器專精與重擊為發展方向。', idea:'構想：強化重擊，並以較慢的出手作為代價。', small:['武器傷害','近戰命中','重擊專精','物理暴擊'] },
    { id:'arcane', name:'秘法', color:'#7caee2', icon:'star', core:'秘法洪流', desc:'以魔法傷害、魔力與元素技能為發展方向。', idea:'構想：強化法術爆發，同時提高魔力消耗。', small:['魔法傷害','魔力儲備','元素專精','魔法暴擊'] },
    { id:'ranged', name:'獵星', color:'#89bb8a', icon:'pierce', core:'孤星狙擊', desc:'以弓槍、遠程命中與精準打擊為發展方向。', idea:'構想：遠距離攻擊更強，近身戰鬥承擔代價。', small:['遠程命中','弓槍專精','精準打擊','遠程暴擊'] },
    { id:'summon', name:'契靈', color:'#b596e0', icon:'wolf', core:'群靈之約', desc:'以召喚與夥伴協作為發展方向；適用對象待定。', idea:'構想：強化召喚協作，同時犧牲自身部分輸出。', small:['契靈共鳴','靈力儲備','協同攻擊','契約專精'] },
    { id:'blood', name:'血契', color:'#d37891', icon:'siphon', core:'鮮血契約', desc:'以吸血、低血量戰鬥與生命交換為發展方向。', idea:'構想：提高吸血能力，但降低藥水回復效果。', small:['生命儲備','汲血專精','低血戰意','生命回復'] },
    { id:'guard', name:'壁壘', color:'#c3b992', icon:'shield', core:'不動壁壘', desc:'以防禦、魔防與護盾為發展方向。', idea:'構想：強化防護，並以部分攻擊能力作為代價。', small:['生命儲備','堅固防禦','魔法抵抗','護盾專精'] }
];
const TALENT_SOCKET_TYPES = {
    normal:{name:'一般寶珠孔',mark:'◇',desc:'先點出插槽再裝一般寶珠；七個家族共14款魔法／稀有示例，可跨星群選用。對應一般寶珠孔。'},
    radius:{name:'轉化寶珠孔',mark:'◎',desc:'轉化附近已配置的基礎節點；不改核心、專精或其他插槽。同一節點最多接受一種轉化，不重複計算。'},
    cluster:{name:'星團寶珠孔',mark:'✧',desc:'插入星團後長出額外分支，每個節點仍須花天賦點。六主題各有小、中、大型，共18種，不可再插星團。'}
};
const TALENT_ATLAS = talentBuildAtlas();
function talentIsReleased() { return typeof TALENT_RELEASED!=='undefined'&&TALENT_RELEASED; }
let talentView = { selected:'origin', zoom:1, jewelId:null };

function talentBuildAtlas() {
    // 星群核心與插槽的邏輯座標；畫面避碰不回寫這些數值，保留轉化規則。
    const positions=[[377,191],[833,185],[1005,487],[851,787],[377,763],[233,483]];
    const nodes=[{ id:'origin', x:615, y:478, name:'命運之核', kind:'origin', region:-1, cost:0 }];
    TALENT_REGIONS.forEach((r,i)=>nodes.push({id:r.id+'-core',x:positions[i][0],y:positions[i][1],name:r.core,kind:'core',region:i,cost:1,exclusiveGroup:'talent-core-'+i}));
    const slots=[
        [[245,146],[456,236],[345,330],[244,70]],[[740,120],[920,270],[730,300],[970,100]],
        [[930,380],[1095,470],[970,610],[1120,645]],[[740,735],[940,845],[725,875],[1005,938]],
        [[285,700],[460,850],[510,735],[232,905]],[[140,390],[300,570],[360,480],[75,560]]
    ];
    TALENT_REGIONS.forEach((r,i)=>slots[i].forEach((p,j)=>{
        const socketType=j<2?'normal':j===2?'radius':'cluster';
        nodes.push({id:r.id+'-socket-'+j,x:p[0],y:p[1],name:r.name+'・'+TALENT_SOCKET_TYPES[socketType].name+(j<2?' '+(j+1):''),kind:'socket',socketType,region:i,cost:1});
    }));
    return {nodes};
}

function talentNodeHtml(n) {
    const socket=n.kind==='socket',r=talentLayoutRadius(n);
    const mark=socket?TALENT_SOCKET_TYPES[n.socketType].mark:n.kind==='origin'?'':n.kind==='core'?'核':'';
    return `<g class="talent-node ${n.kind}${socket?' talent-socket':''}${n.id===talentView.selected ? ' selected' : ''}" data-node="${n.id}" transform="translate(${n.x} ${n.y})" role="button" tabindex="0" aria-label="${n.name}，節點預覽" onclick="talentSelect('${n.id}')"><title>${n.name}・${n.cost}點</title><circle class="talent-hit" r="${r+4}"/><circle class="talent-ring" r="${r}"/>${n.kind==='origin'?`<image class="talent-origin-art" href="images/ui/talent-origin-v2.png" x="${-r}" y="${-r}" width="${r*2}" height="${r*2}" pointer-events="none"/>`:''}${mark?`<text class="talent-node-mark" y="5">${mark}</text>`:''}</g>`;
}

function renderTalent() {
    const scene=talentPlanDisplayScene(talentPlanCreate(100)),byId=new Map(scene.nodes.map(n=>[n.id,n]));
    const radiusHtml=talentLayoutRadiusHtml(scene,talentView.selected);
    const paths=scene.edges.map(([a,b])=>{const p=byId.get(a),q=byId.get(b);return `<path d="M${p.x} ${p.y} L${q.x} ${q.y}"/>`;}).join('');
    return `<section class="talent-shell"><header class="talent-heading"><div><small>命運交織，群星未醒</small><h3>命運星盤</h3></div><span class="talent-locked">${talentIsReleased()?(typeof talentBackendReady!=='undefined'&&talentBackendReady?'✧ 正式已開放':'✧ 正式星盤'):'🔒 未開放'}</span></header>
        <p class="talent-notice">${talentIsReleased()?'正式配點已啟用；登入並完成同步後，可使用角色天賦點與背包寶珠。':'天賦星盤尚未開放，目前僅提供配點試玩預覽；試玩不修改正式角色。'}</p><button class="talent-entry" onclick="talentOpenCharacterPlanner()" ${talentIsReleased()?'':'disabled'}><div>正式角色天賦<small>${talentIsReleased()?'登入同步後進入角色配點':'等待正式開放'}</small></div><span>${talentIsReleased()?'進入配點 ›':'🔒 未開放'}</span></button><button class="talent-entry" onclick="talentOpenPlanner()"><div>進入配點試玩<small>325個主盤節點・100測試點・可退點及試插寶珠</small></div><span>不套用角色 ›</span></button>
        <div class="talent-layout"><div class="talent-map-column"><div class="talent-tools"><button class="mini secondary" onclick="talentZoom(-1)" aria-label="縮小星盤">－</button><button class="mini secondary" onclick="talentZoom(1)" aria-label="放大星盤">＋</button><button class="mini secondary" onclick="talentZoom(0)">全盤</button><span>拖曳／滑動探索・點節點查看</span></div>
        <div class="talent-viewport" aria-label="命運星盤，可拖曳與捲動"><svg class="talent-map" style="width:${talentView.zoom*100}%" viewBox="0 0 1195 1024" aria-label="六大區域天賦星盤"><image href="images/ui/talent-atlas-clean-v1.png" width="1195" height="1024" preserveAspectRatio="none" pointer-events="none"/><g class="talent-paths">${paths}</g>${scene.nodes.map(talentNodeHtml).join('')}${radiusHtml}</svg></div></div>
        <aside class="talent-detail" aria-live="polite">${talentDetailHtml()}</aside></div><div class="talent-socket-legend">◇ 一般孔 12 個　◎ 轉化孔 6 個　✧ 星團孔 6 個</div><details class="talent-point-plan"><summary>天賦點與退點規則・已確認</summary><p>Lv.10拿第1點，之後每升1級再拿1點，Lv.99共90點；另有10個一次性試煉各1點，合計100點。退點使用天賦石，預設每退1點消耗1顆。等級點自動依目前等級計算，舊角色同步適用；每個一次性試煉完成後增加1點。</p><small>範例：Lv.20有11點／Lv.50有41點／Lv.99有90點。寶珠由一般怪、首領、試煉取得，地圖等級越高掉率越高；首次擊倒T1、2、3、4、5、7、9、11、13、15地圖首領各完成一次試煉。寶珠掉率：一般怪0.02%→0.30%、首領1%→5%、試煉加抽2%→10%。</small></details><footer class="talent-footer">未配置節點維持暗色；中央命核是免費起點。可試看寶珠詞綴、節點轉化與星團分支，節點與連線由程式獨立繪製；正式鑲嵌及學習請進入「正式角色天賦」。</footer></section>`;
}

function talentDetailHtml() {
    const n=TALENT_PLAN_TREE.nodes.find(n=>n.id===talentView.selected) || TALENT_PLAN_TREE.nodes[0], r=TALENT_REGIONS[n.region];
    if(n.kind==='socket')return talentSocketDetailHtml(n);
    const type={origin:'中央命核',core:'核心天賦',notable:'專精天賦',small:'基礎天賦'}[n.kind];
    return `<small class="talent-detail-type">節點詳情・${type}</small><div class="talent-detail-icon">${n.kind==='origin'?'<img class="talent-origin-detail" src="images/ui/talent-origin-v2.png" alt="命運之核">':`<svg viewBox="0 0 100 100" role="img" aria-label="${n.name}"><circle cx="50" cy="50" r="34" class="talent-detail-emblem"/><text x="50" y="59" class="talent-detail-mark">${n.kind==='origin'?'✦':n.kind==='core'?'核':n.kind==='notable'?'◆':'●'}</text></svg>`}</div><h4>${n.name}</h4><small class="talent-detail-region">${r ? r.name+'星群' : '中央命核'}</small><p>${r ? r.desc : '六條命運之路由此延伸，通往不同的戰鬥流派。'}</p><p class="talent-idea">${n.text||(n.mods||[]).map(talentModText).join('；')||'免費起點。'}</p>${talentIsReleased()?'<button class="talent-learn" onclick="talentOpenCharacterPlanner()">進入正式配點</button>':'<button class="talent-learn" disabled>🔒 未開放</button>'}<small class="talent-detail-note">${talentIsReleased()?'此處僅預覽，進入正式配點後才會消耗角色點數。':'目前無法學習或配置，不會消耗點數。'}</small><div class="talent-regions">${TALENT_REGIONS.map(region=>`<button class="mini secondary" onclick="talentSelect('${region.id}-core')">${region.name}</button>`).join('')}</div>`;
}

function talentSocketDetailHtml(n) {
    const type=TALENT_SOCKET_TYPES[n.socketType],region=TALENT_REGIONS[n.region];
    const jewels=TALENT_JEWEL_CATALOG.filter(j=>talentJewelFits(n,j));
    const jewel=jewels.find(j=>j.id===talentView.jewelId)||jewels[0];
    return `<small class="talent-detail-type">寶珠插槽・${talentIsReleased()?'效果預覽':'未開放'}</small><div class="talent-socket-emblem">${type.mark}</div><h4>${n.name}</h4><p>${type.desc}</p><p class="talent-idea">先點出相連路徑、花1點開孔，每孔一顆對應寶珠；以下為獨立試算，不代表角色已裝備。</p><details class="talent-jewel-picker"><summary>選擇寶珠・${jewels.length}款</summary>${jewels.map(j=>`<button class="mini secondary${j.id===jewel.id?' active':''}" onclick="talentChooseJewel('${j.id}')">${j.name}</button>`).join('')}</details>${talentJewelPreviewHtml(n,jewel)}${talentIsReleased()?'<button class="talent-learn" onclick="talentOpenCharacterPlanner()">進入正式鑲嵌</button>':'<button class="talent-learn" disabled>🔒 鑲嵌未開放</button>'}<small class="talent-detail-note">沒有背包寶珠、能力或存檔變動。星團拆除前需先退回分支點數。</small><div class="talent-regions">${TALENT_REGIONS.map(r=>`<button class="mini secondary" onclick="talentSelect('${r.id}-socket-0')">${r.name}</button>`).join('')}</div><div class="talent-socket-types">${['normal','radius','cluster'].map((t,i)=>`<button class="mini secondary" onclick="talentSelect('${region.id}-socket-${i===0?0:i+1}')">${TALENT_SOCKET_TYPES[t].mark} ${i===0?'一般':i===1?'轉化':'星團'}</button>`).join('')}</div>`;
}

function talentJewelPreviewHtml(socket,jewel) {
    let content='';
    if(jewel.type==='normal')content=`<ul>${jewel.mods.map(m=>`<li>${talentModText(m)}</li>`).join('')}</ul><small>${jewel.text}</small>`;
    else if(jewel.type==='radius'){
        const samples=talentConversionSamples(socket,jewel),converted=talentConvertNodes(samples,[{socket,jewel}]);
        content=`<p>${jewel.text}</p><small>下列為基礎節點試算樣本，不是已點選的角色節點；半徑160。</small><ul>${samples.map((n,i)=>`<li>${talentModText(n.mods[0])}<span class="talent-convert-arrow"> → </span>${talentModText(converted.nodes[i].mods[0])}</li>`).join('')}</ul>`;
    }else{
        const branch=talentClusterBranch(jewel,socket);
        content=`<p>${jewel.text}</p><small>全分支另需${branch.length}點，開孔另需1點；沒有免費能力。</small><ol class="talent-cluster-branch">${branch.map((n,i)=>`<li><b>${n.name}</b><small>${n.text||n.mods.map(talentModText).join('；')}</small><small>需1點・${i?'前置：上一個節點':'前置：已開啟插槽'}</small></li>`).join('')}</ol>`;
    }
    return `<div class="talent-jewel-preview"><img class="talent-jewel-image" src="images/icons/items/talentJewel_${jewel.id}.png" alt="${jewel.name}" draggable="false"><h5>${jewel.name}</h5>${content}</div>`;
}

function talentChooseJewel(id) {
    const socket=TALENT_ATLAS.nodes.find(n=>n.id===talentView.selected),jewel=TALENT_JEWEL_CATALOG.find(j=>j.id===id);
    if(!talentJewelFits(socket,jewel))return;
    talentView.jewelId=id;
    document.querySelectorAll('.talent-detail').forEach(el=>el.innerHTML=talentDetailHtml());
}

function talentSelect(id) {
    if(!TALENT_PLAN_TREE.nodes.some(n=>n.id===id)) return;
    talentView.selected=id;
    document.querySelectorAll('.talent-node').forEach(el=>el.classList.toggle('selected',el.dataset.node===id));
    document.querySelectorAll('.talent-detail').forEach(el=>el.innerHTML=talentDetailHtml());
    document.querySelectorAll('.talent-radius-preview').forEach(el=>el.remove());
    const node=TALENT_PLAN_TREE.nodes.find(n=>n.id===id);
    if(node.socketType==='radius')document.querySelectorAll('.talent-map').forEach(svg=>{
        svg.insertAdjacentHTML('beforeend',talentLayoutRadiusHtml(talentPlanDisplayScene(talentPlanCreate(100)),id));
    });
}

function talentZoom(dir) {
    talentView.zoom=dir===0 ? 1 : Math.max(1,Math.min(4,talentView.zoom+dir*.5));
    document.querySelectorAll('.talent-viewport').forEach(el=>{
        const map=el.querySelector('.talent-map'), old=map.getBoundingClientRect().width;
        const oldHeight=map.getBoundingClientRect().height;
        const x=(el.scrollLeft+el.clientWidth/2)/old, y=(el.scrollTop+el.clientHeight/2)/oldHeight;
        map.style.width=talentView.zoom*100+'%';
        const size=map.getBoundingClientRect().width;
        el.scrollLeft=x*size-el.clientWidth/2; el.scrollTop=y*map.getBoundingClientRect().height-el.clientHeight/2;
    });
}

// 委派到 document，面板重畫不重複註冊。拖曳後不誤選節點。
document.addEventListener('keydown',e=>{
    const node=e.target.closest && e.target.closest('.talent-node');
    if(node && (e.key==='Enter' || e.key===' ')){e.preventDefault();talentSelect(node.dataset.node);}
});
let talentDrag=null;
document.addEventListener('pointerdown',e=>{
    const el=e.target.closest && e.target.closest('.talent-viewport');
    if(!el || e.pointerType!=='mouse' || e.button!==0) return;
    talentDrag={el,id:e.pointerId,x:e.clientX,y:e.clientY,left:el.scrollLeft,top:el.scrollTop,moved:false};
});
document.addEventListener('pointermove',e=>{
    const d=talentDrag;if(!d || d.id!==e.pointerId) return;
    if(Math.hypot(e.clientX-d.x,e.clientY-d.y)>5)d.moved=true;
    if(d.moved){e.preventDefault();d.el.scrollLeft=d.left+d.x-e.clientX;d.el.scrollTop=d.top+d.y-e.clientY;}
});
document.addEventListener('pointerup',()=>{if(talentDrag && !talentDrag.moved)talentDrag=null;});
document.addEventListener('pointercancel',()=>{talentDrag=null;});
document.addEventListener('click',e=>{if(talentDrag && talentDrag.moved){talentDrag=null;e.preventDefault();e.stopImmediatePropagation();}},true);

TABS.talent=['✧',talentIsReleased()?'天賦星盤':'天賦星盤・未開放'];
PANEL_FNS.talent=renderTalent;
