// 命運星盤：唯讀預覽。未開放配點，不讀寫玩家能力或存檔。
const TALENT_REGIONS = [
    { id:'battle', name:'征戰', color:'#da8266', icon:'heavy', core:'破軍之誓', desc:'以近戰、武器專精與重擊為發展方向。', idea:'構想：強化重擊，並以較慢的出手作為代價。', small:['武器傷害','近戰命中','重擊專精','物理暴擊'] },
    { id:'arcane', name:'秘法', color:'#7caee2', icon:'star', core:'秘法洪流', desc:'以魔法傷害、魔力與元素技能為發展方向。', idea:'構想：強化法術爆發，同時提高魔力消耗。', small:['魔法傷害','魔力儲備','元素專精','魔法暴擊'] },
    { id:'ranged', name:'獵星', color:'#89bb8a', icon:'pierce', core:'孤星狙擊', desc:'以弓槍、遠程命中與精準打擊為發展方向。', idea:'構想：遠距離攻擊更強，近身戰鬥承擔代價。', small:['遠程命中','弓槍專精','精準打擊','遠程暴擊'] },
    { id:'summon', name:'契靈', color:'#b596e0', icon:'wolf', core:'群靈之約', desc:'以召喚與夥伴協作為發展方向；適用對象待定。', idea:'構想：強化召喚協作，同時犧牲自身部分輸出。', small:['契靈共鳴','靈力儲備','協同攻擊','契約專精'] },
    { id:'blood', name:'血契', color:'#d37891', icon:'siphon', core:'鮮血契約', desc:'以吸血、低血量戰鬥與生命交換為發展方向。', idea:'構想：提高吸血能力，但降低藥水回復效果。', small:['生命儲備','汲血專精','低血戰意','生命回復'] },
    { id:'guard', name:'壁壘', color:'#c3b992', icon:'shield', core:'不動壁壘', desc:'以防禦、魔防與護盾為發展方向。', idea:'構想：強化防護，並以部分攻擊能力作為代價。', small:['生命儲備','堅固防禦','魔法抵抗','護盾專精'] }
];
const TALENT_ATLAS = talentBuildAtlas();
let talentView = { selected:'origin', zoom:1 };

function talentBuildAtlas() {
    // 原概念圖的實際座標；小節點及亮線目前屬美術示意，不能配點。
    const positions=[[377,191],[833,185],[1005,487],[851,787],[377,763],[233,483]];
    const nodes=[{ id:'origin', x:615, y:478, name:'命運之核', kind:'origin', region:-1 }];
    TALENT_REGIONS.forEach((r,i)=>nodes.push({id:r.id+'-core',x:positions[i][0],y:positions[i][1],name:r.core,kind:'core',region:i}));
    return {nodes};
}

function talentNodeHtml(n) {
    const r=n.kind==='origin' ? 77 : 60;
    return `<g class="talent-node${n.id===talentView.selected ? ' selected' : ''}" data-node="${n.id}" transform="translate(${n.x} ${n.y})" role="button" tabindex="0" aria-label="${n.name}，未開放" onclick="talentSelect('${n.id}')"><title>${n.name}・未開放</title><circle class="talent-hit" r="${r}"/><circle class="talent-ring" r="${r}"/></g>`;
}

function renderTalent() {
    return `<section class="talent-shell"><header class="talent-heading"><div><small>命運交織，群星未醒</small><h3>命運星盤</h3></div><span class="talent-locked">🔒 未開放</span></header>
        <p class="talent-notice">目前僅供瀏覽。所有天賦尚未開放，效果與取得方式待公布。</p>
        <div class="talent-layout"><div class="talent-map-column"><div class="talent-tools"><button class="mini secondary" onclick="talentZoom(-1)" aria-label="縮小星盤">－</button><button class="mini secondary" onclick="talentZoom(1)" aria-label="放大星盤">＋</button><button class="mini secondary" onclick="talentZoom(0)">全盤</button><span>拖曳／滑動探索・點節點查看</span></div>
        <div class="talent-viewport" aria-label="命運星盤，可拖曳與捲動"><svg class="talent-map" style="width:${talentView.zoom*100}%" viewBox="0 0 1195 1024" aria-label="六大區域天賦星盤"><image href="images/ui/talent-atlas-v1.png" width="1536" height="1024" pointer-events="none"/><rect x="979" y="25" width="199" height="48" rx="17" fill="#110f0b" stroke="#9f8149"/><text x="1078" y="58" class="talent-art-status">未開放</text><rect x="23" y="942" width="333" height="41" rx="5" fill="#0c1016"/><text x="40" y="969" class="talent-art-note">六大星群・未開放預覽</text>${TALENT_ATLAS.nodes.map(talentNodeHtml).join('')}</svg></div></div>
        <aside class="talent-detail" aria-live="polite">${talentDetailHtml()}</aside></div><footer class="talent-footer">圖中亮線為美術示意，沒有已啟用天賦。小節點暫不開放；可點選六大核心查看構想。</footer></section>`;
}

function talentDetailHtml() {
    const n=TALENT_ATLAS.nodes.find(n=>n.id===talentView.selected) || TALENT_ATLAS.nodes[0], r=TALENT_REGIONS[n.region];
    const type={origin:'中央命核',core:'核心天賦',notable:'專精天賦',small:'基礎天賦'}[n.kind];
    return `<small class="talent-detail-type">節點詳情・${type}</small><div class="talent-detail-icon"><svg viewBox="${n.x-67} ${n.y-67} 134 134" role="img" aria-label="${n.name}"><image href="images/ui/talent-atlas-v1.png" width="1536" height="1024"/></svg></div><h4>${n.name}</h4><small class="talent-detail-region">${r ? r.name+'星群' : '中央命核'}</small><p>${r ? r.desc : '六條命運之路由此延伸，通往不同的戰鬥流派。'}</p><p class="talent-idea">${n.kind==='core' ? r.idea : '設計方向預覽；正式效果、數值與配點規則尚未定案。'}</p><button class="talent-learn" disabled>🔒 未開放</button><small class="talent-detail-note">目前無法學習或配置，不會消耗點數。</small><div class="talent-regions">${TALENT_REGIONS.map(region=>`<button class="mini secondary" onclick="talentSelect('${region.id}-core')">${region.name}</button>`).join('')}</div>`;
}

function talentSelect(id) {
    if(!TALENT_ATLAS.nodes.some(n=>n.id===id)) return;
    talentView.selected=id;
    document.querySelectorAll('.talent-node').forEach(el=>el.classList.toggle('selected',el.dataset.node===id));
    document.querySelectorAll('.talent-detail').forEach(el=>el.innerHTML=talentDetailHtml());
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

TABS.talent=['✧','天賦星盤・未開放'];
PANEL_FNS.talent=renderTalent;
