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
    const nodes = [{ id:'origin', x:600, y:600, name:'命運之核', kind:'origin', region:-1 }], edges = [];
    const point = (x,y,r,a) => ({ x:x+Math.cos(a)*r, y:y+Math.sin(a)*r });
    TALENT_REGIONS.forEach((region, i) => {
        const angle = -Math.PI*2/3+i*Math.PI/3, c = point(600,600,365,angle);
        const core = { id:region.id+'-core', x:c.x, y:c.y, name:region.core, kind:'core', region:i };
        nodes.push(core);
        for (let ring=0; ring<2; ring++) {
            const count=ring ? 30 : 18, radius=ring ? 145 : 91;
            for(let j=0;j<count;j++) {
                const p=point(c.x,c.y,radius,angle+Math.PI+j*Math.PI*2/count);
                const id=region.id+'-'+ring+'-'+j;
                nodes.push({ id, x:p.x, y:p.y, name:region.small[j%4], kind:j%(ring ? 5 : 6)===0 ? 'notable' : 'small', region:i });
                edges.push([id,region.id+'-'+ring+'-'+((j+1)%count)]);
                if(!ring && j%3===0) edges.push([core.id,id]);
                if(ring && j%5===0) edges.push([id,region.id+'-0-'+(j/5*3)]);
            }
        }
        const p=point(600,600,135,angle);
        nodes.push({ id:region.id+'-gate', x:p.x, y:p.y, name:region.name+'之路', kind:'notable', region:i });
        edges.push(['origin',region.id+'-gate'],[region.id+'-gate',region.id+'-1-0']);
        edges.push([region.id+'-1-20',TALENT_REGIONS[(i+1)%6].id+'-1-10']);
    });
    return { nodes, edges };
}

function talentNodeHtml(n) {
    const r=n.kind==='origin' ? 38 : n.kind==='core' ? 33 : n.kind==='notable' ? 11 : 6;
    const region=TALENT_REGIONS[n.region], color=region ? region.color : '#e4bd70';
    const art=n.kind==='core' ? `<image href="images/icons/items/mercRune-v1/${region.icon}.png" x="-25" y="-25" width="50" height="50" pointer-events="none"/>` : n.kind==='origin' ? '<path d="M0 -26 L8 -8 L26 0 L8 8 L0 26 L-8 8 L-26 0 L-8 -8 Z" fill="#d1ae66" pointer-events="none"/>' : '';
    return `<g class="talent-node${n.id===talentView.selected ? ' selected' : ''}" data-node="${n.id}" transform="translate(${n.x} ${n.y})" style="--node-color:${color}" role="button" tabindex="0" aria-label="${n.name}，未開放" onclick="talentSelect('${n.id}')"><title>${n.name}・未開放</title><circle class="talent-hit" r="${Math.max(r+8,20)}"/><circle class="talent-ring" r="${r+4}"/><circle class="talent-gem" r="${r}"/>${art}</g>`;
}

function renderTalent() {
    const byId=new Map(TALENT_ATLAS.nodes.map(n=>[n.id,n]));
    const paths=TALENT_ATLAS.edges.map(([a,b])=>{ const p=byId.get(a),q=byId.get(b); return `<path d="M${p.x} ${p.y} L${q.x} ${q.y}"/>`; }).join('');
    const labels=TALENT_REGIONS.map((r,i)=>{const n=byId.get(r.id+'-core');return `<text x="${n.x}" y="${n.y+59}" fill="${r.color}">${r.name}</text>`;}).join('');
    return `<section class="talent-shell"><header class="talent-heading"><div><small>命運交織，群星未醒</small><h3>命運星盤</h3></div><span class="talent-locked">🔒 未開放</span></header>
        <p class="talent-notice">目前僅供瀏覽。所有天賦尚未開放，效果與取得方式待公布。</p>
        <div class="talent-layout"><div class="talent-map-column"><div class="talent-tools"><button class="mini secondary" onclick="talentZoom(-1)" aria-label="縮小星盤">－</button><button class="mini secondary" onclick="talentZoom(1)" aria-label="放大星盤">＋</button><button class="mini secondary" onclick="talentZoom(0)">全盤</button><span>拖曳／滑動探索・點節點查看</span></div>
        <div class="talent-viewport" aria-label="命運星盤，可拖曳與捲動"><svg class="talent-map" style="width:${talentView.zoom*100}%" viewBox="0 0 1200 1200" aria-label="六大區域天賦星盤"><defs><radialGradient id="talent-nebula"><stop stop-color="#273047" stop-opacity=".7"/><stop offset="1" stop-color="#080c15"/></radialGradient><pattern id="talent-stars" width="93" height="87" patternUnits="userSpaceOnUse"><circle cx="12" cy="15" r="1" fill="#9caec9" opacity=".5"/><circle cx="65" cy="59" r=".7" fill="#d7b97c" opacity=".4"/></pattern></defs><rect width="1200" height="1200" fill="url(#talent-nebula)"/><rect width="1200" height="1200" fill="url(#talent-stars)"/><circle cx="600" cy="600" r="558" fill="none" stroke="#67573a" opacity=".4"/><circle cx="600" cy="600" r="203" fill="none" stroke="#67573a" opacity=".35"/><g class="talent-paths">${paths}</g><g class="talent-labels">${labels}</g>${TALENT_ATLAS.nodes.map(talentNodeHtml).join('')}</svg></div></div>
        <aside class="talent-detail" aria-live="polite">${talentDetailHtml()}</aside></div><footer class="talent-footer">${TALENT_ATLAS.nodes.length} 個節點・六大區域・尚無已啟用天賦</footer></section>`;
}

function talentDetailHtml() {
    const n=TALENT_ATLAS.nodes.find(n=>n.id===talentView.selected) || TALENT_ATLAS.nodes[0], r=TALENT_REGIONS[n.region];
    const type={origin:'中央命核',core:'核心天賦',notable:'專精天賦',small:'基礎天賦'}[n.kind];
    return `<small class="talent-detail-type">${r ? r.name+'星群・' : ''}${type}</small><div class="talent-detail-icon">${r ? `<img src="images/icons/items/mercRune-v1/${r.icon}.png" alt="${r.name}星群">` : '✧'}</div><h4>${n.name}</h4><p>${r ? r.desc : '六條命運之路由此延伸，通往不同的戰鬥流派。'}</p><p class="talent-idea">${n.kind==='core' ? r.idea : '設計方向預覽；正式效果、數值與配點規則尚未定案。'}</p><button class="talent-learn" disabled>🔒 未開放</button><small class="talent-detail-note">目前無法學習或配置，不會消耗點數。</small>`;
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
        const x=(el.scrollLeft+el.clientWidth/2)/old, y=(el.scrollTop+el.clientHeight/2)/old;
        map.style.width=talentView.zoom*100+'%';
        const size=map.getBoundingClientRect().width;
        el.scrollLeft=x*size-el.clientWidth/2; el.scrollTop=y*size-el.clientHeight/2;
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
