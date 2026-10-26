// 真實UI函式＋隔離DOM／裝置偏好；不開瀏覽器、不讀寫角色存檔。
const fs=require('fs'),path=require('path'),vm=require('vm'),assert=require('assert/strict');
const ctx=require('./test-dolls.js'),nodes={},writes={};
function element(){
 const classes=new Set();
 return {innerHTML:'',textContent:'',attrs:{},classList:{toggle(k,on){if(on)classes.add(k);else classes.delete(k);},contains:k=>classes.has(k)},
  setAttribute(k,v){this.attrs[k]=v;},closest(){return nodes.view;}};
}
for(const id of ['view','skill-bar','hotbar','mobile-status-drawer','mobile-top-toggle','mobile-bottom-toggle'])nodes[id]=element();
ctx.document.getElementById=id=>nodes[id]||null;
ctx.localStorage.setItem=(key,value)=>{assert.equal(key,'dragonSlayer_mobileDrawers');writes[key]=value;};
ctx.nodes=nodes;
vm.runInContext(`{
SIM_MODE=true;createPlayer('手機抽屜測試','knight',CLASSES.knight.base);player.loc={type:'zone',id:'island'};
displayMode='phone';barDrag=null;barEditMode=false;startScene=()=>{};
setHtmlStable=(el,html)=>{el.innerHTML=html;};
const snapshot=JSON.stringify(player);mobileDrawerFold={top:false,bottom:false};
updateHuntLive();assert(nodes['skill-bar'].innerHTML.includes('mobile-bottom-toggle'));assert(nodes['skill-bar'].innerHTML.includes('data-i="15"'));
assert(huntViewHtml('測試').includes('mobile-status-drawer'));assert(huntViewHtml('測試').includes('mobile-top-toggle'));
toggleMobileDrawer('top');assert(nodes['mobile-status-drawer'].classList.contains('folded'));assert(!nodes['skill-bar'].classList.contains('folded'));
assert.equal(nodes['mobile-top-toggle'].attrs['aria-expanded'],'false');assert(nodes['mobile-top-toggle'].textContent.includes('展開'));
barEditMode=true;toggleMobileDrawer('bottom');assert.equal(barEditMode,false);assert(nodes['skill-bar'].classList.contains('folded'));assert(nodes.view.classList.contains('mobile-shortcuts-folded'));
assert(nodes['skill-bar'].innerHTML.includes('mobile-shortcuts-body'),'收合仍保留格子及倒數，展開即顯示');
assert.equal(JSON.stringify(player),snapshot,'顯示切換不改技能自動、角色或戰鬥');
updateHuntLive();assert(nodes['skill-bar'].classList.contains('folded'));assert(nodes['mobile-status-drawer'].classList.contains('folded'));
assert(huntViewHtml('換圖重畫').includes('mobile-shortcuts-folded'));assert(huntViewHtml('換圖重畫').includes('mobile-status-drawer folded'));
displayMode='pc';updateHuntLive();assert(nodes.hotbar.innerHTML.includes('data-i="23"'));assert.equal(nodes['skill-bar'].innerHTML,'');
toggleMobileDrawer('top');assert.equal(mobileDrawerFold.top,true,'PC不操作手機偏好');
displayMode='phone';updateHuntLive();assert(nodes['skill-bar'].classList.contains('folded'));
toggleMobileDrawer('top');toggleMobileDrawer('bottom');assert(!nodes['skill-bar'].classList.contains('folded'));assert(!nodes.view.classList.contains('mobile-shortcuts-folded'));
assert.equal(nodes['mobile-top-toggle'].attrs['aria-expanded'],'true');assert.equal(nodes['mobile-bottom-toggle'].attrs['aria-expanded'],'true');
toggleMobileDrawer('invalid');assert.equal(JSON.stringify(player),snapshot);
player.loc={type:'town',id:Object.keys(TOWNS)[0]};renderHotbar();assert.equal(nodes['skill-bar'].innerHTML,'','村莊仍不顯示下方戰鬥快捷');
}`,ctx);
assert.equal(writes.dragonSlayer_mobileDrawers,'00');
const source=fs.readFileSync(path.join(__dirname,'../data/hotbar.js'),'utf8');
for(const [saved,expected]of[['11',[true,true]],['01',[false,true]],['bad',[false,false]]]){
 const reload=vm.createContext({localStorage:{getItem:()=>saved},document:{addEventListener(){}}});
 vm.runInContext(source,reload);assert.deepEqual(JSON.parse(vm.runInContext('JSON.stringify([mobileDrawerFold.top,mobileDrawerFold.bottom])',reload)),expected);
}
console.log('PASS mobile drawers: 上下獨立收合／保留展開按鈕與ARIA／持續刷新與換圖保持／不改自動技能及角色／離開編輯／PC24格與村莊保留／裝置偏好重新載入');
