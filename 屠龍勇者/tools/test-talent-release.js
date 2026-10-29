const fs=require('fs'),path=require('path'),vm=require('vm'),assert=require('assert/strict');
const prefix=fs.readFileSync(path.join(__dirname,'test-mercenary.js'),'utf8').split('ctx.assert = assert;')[0];
const ctx=new Function('require','__dirname',prefix+'\nreturn ctx;')(require,__dirname);ctx.assert=assert;
(async()=>{await vm.runInContext(`(async()=>{
SIM_MODE=false;createPlayer('未開放隔離','knight',CLASSES.knight.base);cloudUser={id:'test'};talentBackendReady=true;
let requests=0;showToast=()=>{};saveGame=()=>{requests++;};vaultOnline=()=>true;marketRpc=async()=>{requests++;};cloudSyncedSlot=async()=>{requests++;return true;};vaultOp=async()=>{requests++;};
assert.equal(TALENT_RELEASED,true);const isReleased=talentIsReleased;talentIsReleased=()=>false;assert.equal(talentIsReleased(),false);const before=JSON.stringify(player),html=renderTalent();assert(!html.includes('正式已開放'));assert(html.includes('onclick="talentOpenCharacterPlanner()" disabled'));
await talentOpenCharacterPlanner();for(const action of ['allocate','refund','insert','remove'])await talentLiveAction(action,'battle-gate','normal-blood-magic');assert.equal(requests,0);assert.equal(JSON.stringify(player),before);
talentLiveMode=false;talentPlanState=talentPlanCreate(100);talentPlanView.selected='battle-gate';talentPlanAction('allocate');assert.equal(talentPlanSpent(talentPlanState),1);assert.equal(JSON.stringify(player),before);
talentIsReleased=isReleased;assert(renderTalent().includes('正式已開放'));assert(!renderSkills().includes('🔒 未開放'));assert.equal(TABS.talent[1],'天賦星盤');
requests=0;marketRpc=async()=>{requests++;return {version:TALENT_SYSTEM_VERSION,trials:[]};};await talentOpenCharacterPlanner();assert.equal(requests,1);assert.equal(JSON.stringify(player),before);
marketRpc=async()=>({version:TALENT_SYSTEM_VERSION,trials:[],saveOrder:1});talentShowPlanner=()=>{};talentView.selected='guard-r1-1';await talentOpenCharacterPlanner();assert(talentLiveMode);assert.equal(talentPlanView.selected,'guard-r1-1');assert.equal(talentPlanSpent(talentPlanState),0);
})()`,ctx);console.log('PASS：正式入口統一啟用；門閂保護、舊後端不寫檔、修復握手才開啟，保留選取節點與試玩隔離。');})().catch(e=>{console.error(e.stack);process.exit(1);});
