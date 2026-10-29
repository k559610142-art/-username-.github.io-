// 正式收納與圖片接線；記憶體角色、假RPC，不讀寫正式存檔。
const fs=require('fs'),path=require('path'),vm=require('vm'),assert=require('assert/strict'),crypto=require('crypto');
const prefix=fs.readFileSync(path.join(__dirname,'test-mercenary.js'),'utf8').split('ctx.assert = assert;')[0];
const ctx=new Function('require','__dirname',prefix+'\nreturn ctx;')(require,__dirname);ctx.assert=assert;ctx.crypto=crypto;
(async()=>{
await vm.runInContext(`(async()=>{
SIM_MODE=false;saveGame=()=>{};refreshUI=()=>{};renderPanel=()=>{};showToast=()=>{};closeDialog=()=>{};
createPlayer('寶珠收納隔離','knight',CLASSES.knight.base);player.lv=99;cloudUser={id:'jewel-test'};
const weight=invWeight(),first=TALENT_JEWEL_CATALOG[0],id=talentItemId(first.id),a=addItem(id),b=addItem(id);a.sellLocked=true;
assert.notEqual(a.uid,b.uid);assert(bagIsStored(a));assert(bagIsStored(b));assert.equal(invWeight(),weight);assert.equal(bagStorageKind(id),'jewel');
for(const j of TALENT_JEWEL_CATALOG.slice(1))addItem(talentItemId(j.id));
assert.equal(new Set(player.inv.map(it=>it.uid)).size,player.inv.length);bagSetPage('jewel');
assert.equal((bagStorageHtml().match(/class="bag-stash-slot /g)||[]).length,38);assert(bagStorageHtml().includes('bag-jewel-grid'));assert(bagStorageHtml().includes('<strong>2</strong>'));
for(const [type,n] of [['normal',14],['radius',6],['cluster',18]]){bagSetJewelType(type);assert.equal((bagStorageHtml().match(/class="bag-stash-slot /g)||[]).length,n);}
bagSetJewelType('bad');assert.equal(bagJewelType,'cluster');bagSetJewelType('all');assert(!bagStorageHtml().includes('下一頁'));
const total=player.inv.length,uid=a.uid;bagWithdraw(uid,1);assert(!bagIsStored(a));assert(a.sellLocked);assert.equal(player.inv.length,total);assert(invWeight()>weight);bagStore(uid);assert(bagIsStored(a));assert.equal(invWeight(),weight);
const restored=migrateSave(saveParse(saveEncode(JSON.stringify({schema:SAVE_SCHEMA,player}))));assert(restored.inv.find(it=>it.uid===uid).bagStored);assert(restored.inv.find(it=>it.uid===uid).sellLocked);
// 以真實正式操作函式確認收納中的UID可鑲嵌，拆回自動歸位。
talentIsReleased=()=>true; // 只在隔離測試開啟，正式開放旗標不變。
const state=talentPlanCreate(90),target='battle-socket-0',prev=new Map([['origin',null]]),q=['origin'];
while(q.length){const x=q.shift();if(x===target)break;for(const [u,v] of TALENT_PLAN_TREE.edges){const n=u===x?v:v===x?u:null;if(n&&!prev.has(n)&&!TALENT_PLAN_TREE.nodes.find(k=>k.id===n).exclusiveGroup){prev.set(n,x);q.push(n);}}}
const route=[];for(let x=target;x;x=prev.get(x))route.unshift(x);for(const x of route)if(!state.allocated.has(x))assert(talentPlanAllocate(state,x).ok);
player.talent={v:TALENT_SYSTEM_VERSION,nodes:[...state.allocated].filter(x=>x!=='origin'),jewels:{},trials:[]};talentLiveMode=true;
vaultOp=async(fn,args,apply)=>{assert.equal(args.p_uid,uid);apply({removeUid:uid,talent:{...player.talent,jewels:{[target]:{...a}}}});};
await talentLiveAction('insert',target,first.id);assert(!player.inv.some(it=>it.uid===uid));assert.equal(player.talent.jewels[target].uid,uid);
vaultOp=async(fn,args,apply)=>{const it={...player.talent.jewels[target]};delete it.bagStored;apply({addItem:it,talent:{...player.talent,jewels:{}}});};
await talentLiveAction('remove',target);assert.equal(player.inv.filter(it=>it.uid===uid).length,1);assert(bagIsStored(findInv(uid)));assert(findInv(uid).sellLocked);talentLiveMode=false;
// 未配置／只選取不亮路線；真正配置才亮，退回即熄滅。
talentPlanState=talentPlanCreate(100);talentPlanView.selected='battle-gate';let html=renderTalentPlanner();assert.equal((html.match(/ allocated/g)||[]).length,1);assert.equal((html.match(/<path class="on"/g)||[]).length,0);
assert(talentPlanAllocate(talentPlanState,'battle-gate').ok);html=renderTalentPlanner();assert.equal((html.match(/ allocated/g)||[]).length,2);assert.equal((html.match(/<path class="on"/g)||[]).length,1);assert(talentPlanRefund(talentPlanState,'battle-gate').ok);assert(!renderTalentPlanner().includes('<path class="on"'));
})()`,ctx);
const art=vm.runInContext('TALENT_JEWEL_CATALOG.map(j=>({id:j.id,icon:itemIconHtml(talentItemId(j.id)),preview:talentJewelPreviewHtml({id:"x",kind:"socket",socketType:j.type,x:0,y:0},j)}))',ctx),hashes=new Set();
for(const j of art){const file=path.join(__dirname,'..','images','icons','items','talentJewel_'+j.id+'.png'),png=fs.readFileSync(file);assert.equal(png.readUInt32BE(16),128);assert.equal(png.readUInt32BE(20),128);assert(j.icon.includes('talentJewel_'+j.id+'.png'));assert(j.preview.includes('talentJewel_'+j.id+'.png'));hashes.add(crypto.createHash('sha256').update(png).digest('hex'));}
assert.equal(hashes.size,38);
const atlas=fs.readFileSync(path.join(__dirname,'..','images','ui','talent-atlas-unallocated-v1.png'));assert.equal(atlas.readUInt32BE(16),1536);assert.equal(atlas.readUInt32BE(20),1024);
console.log('PASS：38款獨立128px圖片、預覽與道具圖接線、三欄全列／分類、數量／單UID／鎖定／負重／存讀、正式鑲嵌拆回歸位、0點不亮路線／選取不配置／配置與退回狀態。');
})().catch(e=>{console.error(e.stack);process.exit(1);});
