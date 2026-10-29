const fs=require('fs'),path=require('path'),vm=require('vm'),assert=require('assert/strict');
const prefix=fs.readFileSync(path.join(__dirname,'test-mercenary.js'),'utf8').split('ctx.assert = assert;')[0];
const ctx=new Function('require','__dirname',prefix+'\nreturn ctx;')(require,__dirname);ctx.assert=assert;
(async()=>{await vm.runInContext(`(async()=>{
SIM_MODE=false;createPlayer('未開放隔離','knight',CLASSES.knight.base);cloudUser={id:'test'};talentBackendReady=true;
let requests=0;showToast=()=>{};saveGame=()=>{requests++;};vaultOnline=()=>true;marketRpc=async()=>{requests++;};cloudSyncedSlot=async()=>{requests++;return true;};vaultOp=async()=>{requests++;};
assert.equal(TALENT_RELEASED,false);assert.equal(talentIsReleased(),false);const before=JSON.stringify(player),html=renderTalent();assert(!html.includes('正式已開放'));assert(html.includes('onclick="talentOpenCharacterPlanner()" disabled'));
await talentOpenCharacterPlanner();for(const action of ['allocate','refund','insert','remove'])await talentLiveAction(action,'battle-gate','normal-blood-magic');assert.equal(requests,0);assert.equal(JSON.stringify(player),before);
talentLiveMode=false;talentPlanState=talentPlanCreate(100);talentPlanView.selected='battle-gate';talentPlanAction('allocate');assert.equal(talentPlanSpent(talentPlanState),1);assert.equal(JSON.stringify(player),before);
})()`,ctx);console.log('PASS：後端ready不代表正式開放、入口與所有正式操作不送RPC／不存檔／不動資源；隔離試玩正常。');})().catch(e=>{console.error(e.stack);process.exit(1);});
