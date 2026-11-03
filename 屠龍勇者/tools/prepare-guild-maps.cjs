// 公會17景正式資產的可重現分層／分塊資料準備，不修改原始美術。
const fs = require('fs'), path = require('path'), vm = require('vm'), crypto = require('crypto');
const ROOT = path.resolve(__dirname, '..'), SRC = path.join(__dirname, 'map-src/guild-world-v1');
const stageFile = path.join(__dirname, 'guild-map-src/maps-v1.json');
const hash = data => crypto.createHash('sha256').update(data).digest('hex');
function read(name) { return fs.readFileSync(path.join(SRC, name), 'utf8'); }
function oldMap(name) {
    const script = read(name + '-walk-preview.html').match(/<script>([\s\S]*?)<\/script>/)[1];
    const prefix = script.slice(0, script.indexOf('for(let y=0;y<H;y++)'));
    const data = vm.runInNewContext(prefix + ';({areas,lanes,solids})');
    const fore = JSON.parse(script.match(/const SCENE_OCCLUDERS=(.*);/)[1]);
    if (name === 'forest') {
        data.areas.push(vm.runInNewContext(prefix + ';bridgeFloor'));
        data.solids.push(...vm.runInNewContext(prefix + ';scenerySolids'));
    }
    return { region: '低語海島', name: name === 'harbor' ? '港村公會' : '中央古林', art: name + '-district-art-v1.png', ...data,
        center: name === 'harbor' ? [800,496] : [650,520], sites: name === 'harbor' ? [['公會門前',408,304],['中央廣場',800,496],['南側碼頭',696,792],['村外道路',1376,872]] : [['古林入口',350,932],['遺跡前庭',345,215],['石橋',1100,430],['東岸營地',1380,325],['北側林道',1512,355]],
        entries: name === 'harbor' ? { start:[800,496],forest:[1376,872],coast:[696,792] } : { start:[350,932],mine:[1512,355],harbor:[350,932] },
        gates: name === 'harbor' ? [{key:'forest',at:[1376,872],label:'前往中央古林',to:'forest',entry:'harbor'},{key:'coast',at:[696,792],label:'搭船前往燈塔海岸',to:'coast',entry:'pier'}] : [{key:'harbor',at:[350,932],label:'返回港村',to:'harbor',entry:'forest'},{key:'mine',at:[1512,355],label:'前往廢棄礦坑',to:'mine',entry:'start'}],
        occluders: fore };
}
function runs(bytes) { const out=[]; for(let i=0;i<bytes.length;){const v=bytes[i];let end=i+1;while(end<bytes.length&&bytes[end]===v&&end-i<65535)end++;out.push(v,end-i);i=end;}return out; }
function stage() {
    const maps = vm.runInNewContext(read('region-catalog.js') + ';GUILD_MAPS');
    maps.harbor = oldMap('harbor'); maps.forest = oldMap('forest');
    const splits = require('./guild-map-src/layers-v1.cjs');
    for (const [id,m] of Object.entries(maps)) {
        m.id=id; m.width=1536; m.height=1024; m.cell=4;
        m.source='tools/map-src/guild-world-v1/'+m.art;
        m.sourceHash=hash(fs.readFileSync(path.join(ROOT,m.source)));
        m.layers=[{id:'terrain',kind:'terrain',depth:-10000,polygons:[],holes:[]}];
        for (const [i,p] of [...m.occluders,...(splits[id]||[])].entries()) m.layers.push({id:'object-'+i,kind:p.kind||'structure',name:p.id,polygons:[p.poly],holes:p.holes||[],depthLine:p.base,depth:(p.base[1]+p.base[3])/2});
        m.layers.slice(1).sort((a,b)=>a.depth-b.depth).forEach((p,i)=>p.order=i+1);
        m.layers.sort((a,b)=>(a.order||0)-(b.order||0));
        for(const g of m.gates) if(g.url){const u=new URL(g.url,'http://localhost/');g.to=u.pathname.endsWith('/forest-walk-preview.html')?'forest':u.pathname.endsWith('/harbor-walk-preview.html')?'harbor':u.searchParams.get('map');g.entry=u.searchParams.get('entry')||'start';delete g.url;}
        const box={mapDef:m,Uint8Array,Map,Math};
        // 依現有腳底留白算法建立格與每一方向的可走邊，產物於發佈時直接解碼。
        const engine=read('region-walk-preview.html').match(/<script>([\s\S]*?)<\/script>/)[1];
        const start=engine.indexOf('const CELL='),end=engine.indexOf('// UI_START');
        const result=vm.runInNewContext(engine.slice(start,end)+`;const edge=new Uint8Array(W*H),dirs=[[1,0],[-1,0],[0,1],[0,-1],[1,1],[1,-1],[-1,1],[-1,-1]];for(const p of todo)for(const n of neighbors(...p)){const d=dirs.findIndex(v=>n[0]-p[0]===v[0]&&n[1]-p[1]===v[1]);edge[p[1]*W+p[0]]|=1<<d;}({mask,edge});`,box,{timeout:120000});
        m.walkRuns=runs(result.mask);m.edgeRuns=runs(result.edge);m.walkCount=Array.from(result.mask).filter(Boolean).length;
        delete m.occluders;delete m.art;
        console.log(id+': '+m.walkCount+'安全格／'+m.layers.length+'圖層');
    }
    fs.writeFileSync(stageFile,JSON.stringify({version:1,tileSize:512,maps},null,2)+'\n');
}
function publish() {
    const doc=JSON.parse(fs.readFileSync(stageFile,'utf8'));
    const engine=read('region-walk-preview.html').match(/<script>([\s\S]*?)<\/script>/)[1];
    for(const m of Object.values(doc.maps)) if(!m.rawRuns) m.rawRuns=runs(vm.runInNewContext(engine.slice(engine.indexOf('const CELL='),engine.indexOf('const clearance='))+';rawMask',{mapDef:m,Uint8Array,Map,Math},{timeout:10000}));
    for(const m of Object.values(doc.maps))for(const l of m.layers){if(!Array.isArray(l.tiles))throw Error('尚未打包:'+m.id);for(const t of l.tiles)if(!fs.existsSync(path.join(ROOT,t.src)))throw Error('缺少圖塊:'+t.src);}
    const maps=structuredClone(doc.maps);
    for(const m of Object.values(maps)){delete m.source;delete m.areas;delete m.lanes;delete m.solids;delete m.blocked;for(const l of m.layers){delete l.polygons;delete l.holes;}}
    fs.writeFileSync(path.join(ROOT,'data/guild-map-data.js'),'// 公會17景正式分層圖塊與安全通行格；由tools/prepare-guild-maps.cjs產生。\nconst GUILD_MAP_DEFS = '+JSON.stringify(maps)+';\n');
    console.log('17景正式資料已輸出；原稿未改。');
}
if(process.argv.includes('--publish'))publish();else stage();
