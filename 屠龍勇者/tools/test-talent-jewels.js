// 寶珠資料與試算：不依賴玩家，驗邊界／互斥／不可改原資料。
const fs=require('fs'),path=require('path'),vm=require('vm'),assert=require('assert/strict');
const root=path.resolve(__dirname,'..'),ctx=vm.createContext({});
for(const name of ['player','localStorage','calcStats','saveGame','ITEMS'])Object.defineProperty(ctx,name,{get(){throw Error('預覽不可存取 '+name);}});
vm.runInContext(fs.readFileSync(path.join(root,'data/talent-jewels.js'),'utf8'),ctx);
vm.runInContext(`
    if(TALENT_JEWEL_CATALOG.length!==38||new Set(TALENT_JEWEL_CATALOG.map(j=>j.id)).size!==38)throw Error('寶珠目錄錯誤');
    for(const [type,count] of [['normal',14],['radius',6],['cluster',18]])if(TALENT_JEWEL_CATALOG.filter(j=>j.type===type).length!==count)throw Error('類型數量錯誤');
    for(const j of TALENT_JEWEL_CATALOG.filter(j=>j.type==='normal'))if(j.mods.length!==(j.quality==='magic'?2:3)||!j.mods.every(m=>Number.isFinite(m[1])&&m[1]>0))throw Error('一般寶珠詞綴錯誤');
    const normal={id:'n',kind:'socket',socketType:'normal',x:0,y:0},radius={id:'r',kind:'socket',socketType:'radius',x:0,y:0},cluster={id:'c',kind:'socket',socketType:'cluster',x:0,y:0};
    for(const j of TALENT_JEWEL_CATALOG){
        for(const s of [normal,radius,cluster])if(talentJewelFits(s,j)!==(s.socketType===j.type))throw Error('跨類型誤插');
        if(talentJewelFits({kind:'core',socketType:j.type},j))throw Error('核心誤作插槽');
    }
    for(const j of TALENT_JEWEL_CATALOG.filter(j=>j.type==='cluster')){
        const before=JSON.stringify(j),b=talentClusterBranch(j,cluster),expected={small:4,medium:6,large:8}[j.size];
        if(b.length!==expected||b.reduce((s,n)=>s+n.cost,0)!==expected||new Set(b.map(n=>n.id)).size!==expected)throw Error('星團數量／點數錯誤');
        if(b[0].requires!==cluster.id||b.slice(1).some((n,i)=>n.requires!==b[i].id))throw Error('星團前置斷線');
        if(b.some(n=>n.kind==='socket')||b.filter(n=>n.kind==='core').length!==(j.size==='large'?1:0))throw Error('星團核心／禁止巢狀錯誤');
        if(JSON.stringify(j)!==before||talentClusterBranch(j,normal).length)throw Error('星團修改原資料或誤插');
        if(b[0].mods.length)b[0].mods[0][1]=999;
    }
    for(const j of TALENT_JEWEL_CATALOG.filter(j=>j.type==='radius')){
        const amount=j.from.includes('傷害')?2:20;
        const base={id:'a',kind:'small',allocated:true,x:160,y:0,mods:[[j.from,amount]]};
        const nodes=[base,{...base,id:'outside',x:160.001},{...base,id:'unallocated',allocated:false},{...base,id:'core',kind:'core'},{...base,id:'notable',kind:'notable'},{...base,id:'socket',kind:'socket'}];
        const before=JSON.stringify(nodes),r=talentConvertNodes(nodes,[{socket:radius,jewel:j}]);
        if(r.nodes[0].mods[0][0]!==j.to||r.nodes[0].mods[0][1]!==amount*j.ratio)throw Error('轉化錯誤');
        if(r.nodes.slice(1).some(n=>n.convertedBy)||JSON.stringify(nodes)!==before)throw Error('轉化越界／改原資料');
        const overlap=talentConvertNodes([base],[{socket:radius,jewel:j},{socket:radius,jewel:j}]);
        if(overlap.conflicts.length!==1||overlap.nodes[0].mods[0][1]!==amount*j.ratio)throw Error('重疊重複計算');
        if(talentConvertNodes([base],[{socket:{...radius,x:NaN},jewel:j}]).nodes[0].convertedBy)throw Error('非法座標');
    }
`,ctx);
// 生命轉魔力後不能再串接轉回血；不同轉化的重疊也只接受第一顆。
const conversion=vm.runInContext(`JSON.stringify(talentConvertNodes([{id:'hp',kind:'small',allocated:true,x:0,y:0,mods:[['最大生命',20]]}],[{socket:{id:'one',kind:'socket',socketType:'radius',x:0,y:0},jewel:TALENT_JEWEL_CATALOG.find(j=>j.id==='convert-blood-mana')},{socket:{id:'two',kind:'socket',socketType:'radius',x:0,y:0},jewel:TALENT_JEWEL_CATALOG.find(j=>j.id==='convert-symbiosis')}]))`,ctx);
const result=JSON.parse(conversion);assert.deepEqual(result.conflicts,['hp']);assert.deepEqual(result.nodes[0].mods,[['最大魔力',20,'']]);
console.log('PASS：38寶珠／14一般詞綴、6轉化邊界互斥、18星團4／6／8節點與逐點成本、不可巢狀、無玩家／道具／存檔副作用。');
