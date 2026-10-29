// 天賦寶珠資料與純試算：未開放，不接玩家、背包、戰鬥或存檔。
const TALENT_JEWEL_FAMILIES = [
    {id:'blood',name:'赤血寶珠',color:'#c86b83',mods:[['最大生命',40],['每5秒回血',1],['藥水回復',3,'%']]},
    {id:'blade',name:'鋒刃寶珠',color:'#dd966f',mods:[['近戰物理傷害',4,'%'],['近戰命中',2],['物理暴擊率',0.3,'個百分點']]},
    {id:'eagle',name:'鷹眼寶珠',color:'#8aba80',mods:[['遠程物理傷害',4,'%'],['遠程命中',2],['物理暴擊傷害',4,'個百分點']]},
    {id:'arcane',name:'秘法寶珠',color:'#87a9e2',mods:[['法術傷害',4,'%'],['SP',1],['魔法暴擊率',0.3,'個百分點']]},
    {id:'spring',name:'靈泉寶珠',color:'#79bcbf',mods:[['最大魔力',30],['每5秒回魔',1],['技能魔力消耗降低',2,'%']]},
    {id:'iron',name:'鐵壁寶珠',color:'#c6b987',mods:[['防禦',2],['魔防',2],['最大生命',20]]},
    {id:'spirit',name:'契靈寶珠',color:'#b399de',mods:[['出戰傭兵傷害',3,'%'],['出戰傭兵最大生命',40],['傭兵召喚物傷害',3,'%']]}
];
const TALENT_CONVERSION_JEWELS = [
    {id:'blood-mana',name:'血魔轉化珠',color:'#a685ca',from:'最大生命',to:'最大魔力',ratio:1,text:'附近已配置基礎節點的固定生命加成，轉為等值魔力加成。'},
    {id:'steel',name:'鋼鐵轉化珠',color:'#b9b29b',from:'物理傷害',to:'防禦',ratio:0.5,text:'附近已配置基礎節點每2%物理傷害加成，轉為防禦+1。'},
    {id:'spellblade',name:'秘刃轉化珠',color:'#849ddb',from:'近戰物理傷害',to:'法術傷害',ratio:1,text:'附近已配置基礎節點的近戰物理傷害加成，轉為等值法術傷害加成。'},
    {id:'hunter',name:'獵影轉化珠',color:'#89bc94',from:'近戰命中',to:'遠程命中',ratio:1,text:'附近已配置基礎節點的近戰命中，轉為等值遠程命中。'},
    {id:'symbiosis',name:'共生轉化珠',color:'#b9a3d8',from:'最大生命',to:'出戰傭兵最大生命',ratio:1,text:'附近已配置基礎節點的玩家固定生命加成，改給出戰傭兵。'},
    {id:'bloodspring',name:'血泉轉化珠',color:'#cd8b9d',from:'每5秒回魔',to:'每5秒回血',ratio:1,text:'附近已配置基礎節點的回魔加成，轉為等值回血加成。'}
];
const TALENT_CLUSTER_FAMILIES = [
    {id:'war',name:'破軍星團',color:'#dd966f',small:[['近戰物理傷害',2,'%'],['近戰命中',1],['最大生命',20]],notable:[{name:'重擊專精',mods:[['近戰物理傷害',6,'%']]},{name:'致命兵鋒',mods:[['物理暴擊傷害',8,'個百分點']]}],core:{name:'沉重兵鋒',text:'近戰物理傷害提高20%，普攻間隔增加10%。'}},
    {id:'arcane',name:'秘法星團',color:'#87a9e2',small:[['法術傷害',2,'%'],['最大魔力',15],['SP',1]],notable:[{name:'元素聚焦',mods:[['法術傷害',6,'%']]},{name:'法術暴發',mods:[['魔法暴擊率',1,'個百分點']]}],core:{name:'魔力超載',text:'法術傷害提高20%，技能魔力消耗增加15%。'}},
    {id:'hunter',name:'獵星星團',color:'#8aba80',small:[['遠程物理傷害',2,'%'],['遠程命中',1],['物理暴擊率',0.3,'個百分點']],notable:[{name:'神射專精',mods:[['遠程物理傷害',6,'%']]},{name:'致命狙擊',mods:[['物理暴擊傷害',8,'個百分點']]}],core:{name:'孤星狙擊',text:'距離至少4格時遠程物理傷害提高20%；距離不超過2格時，遠程物理傷害降低10%。'}},
    {id:'spirit',name:'契靈星團',color:'#b399de',small:[['出戰傭兵最大生命',20],['出戰傭兵傷害',1,'%'],['傭兵召喚物傷害',2,'%']],notable:[{name:'獸群契約',mods:[['傭兵召喚物傷害',6,'%']]},{name:'共生守護',mods:[['出戰傭兵最大生命',60],['出戰傭兵魔防',2]]}],core:{name:'群靈之約',text:'出戰傭兵與其召喚物傷害提高15%，玩家自身傷害降低8%；不影響魔法娃娃。'}},
    {id:'blood',name:'嗜血星團',color:'#c86b83',small:[['最大生命',20],['每5秒回血',1],['吸血率',0.1,'個百分點']],notable:[{name:'汲取專精',mods:[['吸血率',0.4,'個百分點']]},{name:'深紅血池',mods:[['最大生命',60]]}],core:{name:'鮮血契約',text:'吸血率增加2個百分點，玩家藥水回復量降低25%。'}},
    {id:'bulwark',name:'壁壘星團',color:'#c6b987',small:[['防禦',1],['魔防',1],['最大生命',20]],notable:[{name:'鋼鐵壁壘',mods:[['防禦',3]]},{name:'靈能屏障',mods:[['魔防',4]]}],core:{name:'不動堡壘',text:'受到的物理與魔法傷害降低10%，玩家自身傷害降低10%。'}}
];
const TALENT_CLUSTER_SIZES = [
    {id:'small',name:'小型',small:3,notable:1,core:0},
    {id:'medium',name:'中型',small:4,notable:2,core:0},
    {id:'large',name:'大型',small:5,notable:2,core:1}
];
const TALENT_JEWEL_CATALOG = talentBuildJewelCatalog();

function talentModText(mod) { return mod[0]+' +'+mod[1]+(mod[2]||''); }

function talentBuildJewelCatalog() {
    const jewels=[];
    TALENT_JEWEL_FAMILIES.forEach(f=>['magic','rare'].forEach((quality,i)=>jewels.push({id:'normal-'+f.id+'-'+quality,name:f.name+(i?'・稀有':'・魔法'),type:'normal',quality,color:f.color,mods:f.mods.slice(0,i?3:2).map(m=>m.slice()),text:'固定示範詞綴；魔法2條、稀有3條。正式掉落與隨機詞綴尚未開放。'})));
    TALENT_CONVERSION_JEWELS.forEach(j=>jewels.push({...j,id:'convert-'+j.id,type:'radius'}));
    TALENT_CLUSTER_FAMILIES.forEach((f,region)=>TALENT_CLUSTER_SIZES.forEach(size=>jewels.push({id:'cluster-'+f.id+'-'+size.id,name:size.name+f.name,type:'cluster',family:f.id,size:size.id,region,color:f.color,text:size.small+'個基礎＋'+size.notable+'個專精'+(size.core?'＋1個核心':'')+'；每個節點另花1點。'})));
    return jewels;
}

function talentJewelFits(socket,jewel) {
    return !!(socket && socket.kind==='socket' && jewel && socket.socketType===jewel.type);
}

function talentClusterBranch(jewel,socket) {
    if(!talentJewelFits(socket,jewel)||jewel.type!=='cluster')return [];
    const family=TALENT_CLUSTER_FAMILIES.find(f=>f.id===jewel.family),size=TALENT_CLUSTER_SIZES.find(s=>s.id===jewel.size);
    if(!family||!size)return [];
    const nodes=[];
    const add=(kind,name,mods,text)=>{const i=nodes.length;nodes.push({id:socket.id+':'+jewel.id+':'+i,kind,name,mods:mods.map(m=>m.slice()),text:text||'',cost:1,requires:i?nodes[i-1].id:socket.id,exclusiveGroup:kind==='core'?'talent-core-'+jewel.region:null});};
    for(let i=0;i<size.small;i++)add('small','星團基礎 '+(i+1),[family.small[i%family.small.length]]);
    for(let i=0;i<size.notable;i++){const n=family.notable[i];add('notable',n.name,n.mods);}
    if(size.core)add('core',family.core.name,[],family.core.text+' 同主題核心（含主盤與其他星團）擇一生效。');
    return nodes;
}

function talentConvertNodes(nodes,placements) {
    const result=nodes.map(n=>({...n,mods:n.mods.map(m=>m.slice())})),claimed=new Set(),conflicts=[];
    placements.forEach(p=>{
        if(!talentJewelFits(p.socket,p.jewel)||p.jewel.type!=='radius'||!Number.isFinite(p.socket.x)||!Number.isFinite(p.socket.y))return;
        result.forEach((n,index)=>{
            if(n.kind!=='small'||!n.allocated||!Number.isFinite(n.x)||!Number.isFinite(n.y)||Math.hypot(n.x-p.socket.x,n.y-p.socket.y)>160)return;
            const original=nodes[index];
            if(!original.mods.some(m=>m[0]===p.jewel.from&&m[1]>0))return;
            if(claimed.has(n.id)){conflicts.push(n.id);return;}
            n.mods=n.mods.map(m=>m[0]===p.jewel.from&&m[1]>0?[p.jewel.to,Math.round(m[1]*p.jewel.ratio*1000)/1000,['物理傷害','近戰物理傷害'].includes(p.jewel.to)?'%':p.jewel.to==='法術傷害'?'%':'']:m);
            n.convertedBy=p.jewel.id;claimed.add(n.id);
        });
    });
    return {nodes:result,conflicts:[...new Set(conflicts)]};
}

function talentConversionSamples(socket,jewel) {
    return [20,40,60].map((x,i)=>({id:'sample-'+i,name:'試算基礎節點 '+(i+1),x:socket.x+x,y:socket.y,kind:'small',allocated:true,mods:[[jewel.from,jewel.from.includes('傷害')?2:jewel.from.includes('生命')?20:1,jewel.from.includes('傷害')?'%':'']]}));
}
