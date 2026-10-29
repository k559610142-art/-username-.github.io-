// 從實際JS匯出同版天賦資料，填入獨立增量；不連資料庫。
const fs=require('fs'),path=require('path'),vm=require('vm');
const prefix=fs.readFileSync(path.join(__dirname,'test-mercenary.js'),'utf8').split('ctx.assert = assert;')[0];
const ctx=new Function('require','__dirname',prefix+'\nreturn ctx;')(require,__dirname);
const cfg=JSON.parse(vm.runInContext(`JSON.stringify({version:TALENT_SYSTEM_VERSION,nodes:Object.fromEntries(TALENT_PLAN_TREE.nodes.map(n=>[n.id,n])),edges:TALENT_PLAN_TREE.edges,jewels:Object.fromEntries(TALENT_JEWEL_CATALOG.map(j=>[talentItemId(j.id),{...j,branch:j.type==='cluster'?talentClusterBranch(j,{id:'@',kind:'socket',socketType:'cluster'}):[]} ])),items:Object.fromEntries(Object.entries(ITEMS).filter(([id])=>id==='talentStone'||id.startsWith('talentJewel_')).map(([id,d])=>[id,{...d,stack:isStackable(d),affixes:[]} ])),tierMin:mapZones().map(z=>z.lv[0])})`,ctx));
const sql=fs.readFileSync(path.join(__dirname,'talent-system.template.sql'),'utf8').replace('__TALENT_CONFIG__',JSON.stringify(cfg));
fs.writeFileSync(path.join(__dirname,'talent-system.sql'),sql);fs.writeFileSync(path.join(__dirname,'talent-system-catalog.json'),JSON.stringify(cfg,null,2));
console.log('產生talent-system.sql：'+Object.keys(cfg.nodes).length+'節點／'+Object.keys(cfg.jewels).length+'寶珠；未連線正式資料庫。');
