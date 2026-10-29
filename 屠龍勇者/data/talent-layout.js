// 星盤顯示排版：僅調整畫面位置，保留邏輯座標與配點規則。
let talentLayoutBasePositions=null;
function talentLayoutRadius(node){return {origin:22,core:20,socket:17,notable:12,small:8}[node.kind]||8;}
function talentLayoutSeparate(nodes,moveWeight,bounded){
    for(let pass=0;pass<1000;pass++){
        let worst=0;
        for(let i=0;i<nodes.length;i++)for(let j=i+1;j<nodes.length;j++){
            const a=nodes[i],b=nodes[j],wa=moveWeight(a),wb=moveWeight(b);if(!wa&&!wb)continue;
            let dx=b.x-a.x,dy=b.y-a.y;
            const minimum=talentLayoutRadius(a)+talentLayoutRadius(b)+8,d2=dx*dx+dy*dy;
            if(d2>=minimum*minimum)continue;
            let distance=Math.sqrt(d2);if(distance<.0001){dx=.0001;dy=0;distance=.0001;}
            const push=minimum-distance+.005;worst=Math.max(worst,push);
            const ux=dx/distance,uy=dy/distance,total=wa+wb;
            a.x-=ux*push*wa/total;a.y-=uy*push*wa/total;
            b.x+=ux*push*wb/total;b.y+=uy*push*wb/total;
        }
        if(bounded)for(const n of nodes)if(moveWeight(n)){const r=talentLayoutRadius(n)+4;n.x=Math.max(25+r,Math.min(1170-r,n.x));n.y=Math.max(25+r,Math.min(999-r,n.y));}
        if(worst<.0051)break;
    }
}
function talentPlanDisplayScene(state){
    const logical=talentPlanScene(state);
    if(!talentLayoutBasePositions){
        const base=TALENT_PLAN_TREE.nodes.map(n=>({...n}));
        talentLayoutSeparate(base,n=>n.kind==='origin'||n.kind==='core'?0:n.kind==='socket'?1:.18,true);
        talentLayoutBasePositions=new Map(base.map(n=>[n.id,{x:n.x,y:n.y}]));
    }
    const nodes=logical.nodes.map(n=>{
        const position=talentLayoutBasePositions.get(n.id);if(position)return {...n,...position};
        const socket=logical.nodes.find(s=>s.id===n.socketId),shown=talentLayoutBasePositions.get(n.socketId);
        return {...n,x:n.x+(shown?shown.x-socket.x:0),y:n.y+(shown?shown.y-socket.y:0)};
    });
    if(nodes.some(n=>n.socketId))talentLayoutSeparate(nodes,n=>n.socketId?1:0,false);
    return {nodes,edges:logical.edges};
}
function talentLayoutRadiusHtml(scene,socketId){
    const socket=TALENT_PLAN_TREE.nodes.find(n=>n.id===socketId);
    if(!socket||socket.socketType!=='radius')return '';
    const nearby=new Set(TALENT_PLAN_TREE.nodes.filter(n=>n.kind==='small'&&Math.hypot(n.x-socket.x,n.y-socket.y)<=160).map(n=>n.id));
    return scene.nodes.filter(n=>nearby.has(n.id)).map(n=>`<circle class="talent-radius-preview" cx="${n.x}" cy="${n.y}" r="${talentLayoutRadius(n)+5}"/>`).join('');
}
