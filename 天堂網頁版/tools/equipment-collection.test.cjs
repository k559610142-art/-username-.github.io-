const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const read=n=>fs.readFileSync(path.join(__dirname,'../data',n),'utf8'),plain=x=>JSON.parse(JSON.stringify(x));
function fixture(){
  const gear=[['weapon',1,'dagger'],['armor',20001,'helmet'],['armor',20090,'armor'],['armor',20012,'helmet'],['armor',20111,'armor'],['etcitem',40010,'potion']].map(([kind,id,type])=>({kind,id,type,name:kind+id,allowed:['騎士'],bonuses:{},mode:'unarmed',damage:[1,1],ac:0}));
  let fail=false,saved=null;
  const c={INTERFACE_CATALOG:{items:gear},ITEM_USE_RULES:{maxSizeExclusive:181,definitions:Object.fromEntries(gear.map(i=>[i.kind+':'+i.id,{stackable:false,minLevel:0,handler:'none'}])),handlers:{}},activeCharacterId:'hero',activeCharacterLevel:10,activeCharacterName:'勇者',gameFlowState:'playing',job:'騎士',potions:0,worldX:1,worldY:2,hp:100,mp:50,maxHp:100,maxMp:50,playerAttributes:{str:16,dex:14,con:16,wis:11,int:11,cha:9},playerGearRecovery:{},PlayerRangedRules:{hitBonus:()=>0,dexBonus:()=>({damage:0})},setInterval(){},toast(){},stats(){},DBGameRules:{syncVitals(){},damageBonus:()=>0,automaticSkills:(r,l,s)=>s},CharacterActions:{available:{weapons:['unarmed']},weapon:'unarmed',dead:false,reset(mode){this.weapon=mode}},document:{querySelector:()=>({})}};
  c.window=c;vm.createContext(c);vm.runInContext(read('owned-inventory.js'),c);vm.runInContext(read('equipment-sets.js')+';this.sets=EquipmentSets;',c);vm.runInContext(read('player-class-stats.js')+';this.profile=PlayerClassStats;',c);
  c.GameEntry={saveActive(){if(fail)return false;saved={inventory:plain(c.OwnedInventory.snapshot),collection:plain(c.OwnedInventory.collection)};return true;}};
  const row=(id,key,slot=null)=>({uid:id,key,count:1,slot});
  return {c,api:c.OwnedInventory,row,get saved(){return saved},set fail(v){fail=v}};
}
test('加入圖鑑消耗指定未穿戴道具，只開啟對應類型與編號',()=>{
  const f=fixture(),rows=[f.row('a','weapon:1'),{...f.row('b','weapon:1'),enchant:5},f.row('helm','armor:20001','helm')];f.api.activate(rows);
  assert(f.api.collect('a'));assert(f.api.hasCollection('weapon:1'));assert(!f.api.hasCollection('armor:1'));
  assert.deepEqual(plain(f.api.snapshot),rows.slice(1));assert.deepEqual(f.saved.collection,['weapon:1']);
  assert.equal(f.api.collect('b'),false);assert.equal(f.api.snapshot.length,2);
});
test('不接受穿戴中、非裝備、不存在的道具；儲存失敗不扣道具也不開圖',()=>{
  const f=fixture(),rows=[f.row('w','weapon:1','weapon'),f.row('p','etcitem:40010'),f.row('h','armor:20001')];f.api.activate(rows);
  for(const uid of ['w','p','missing'])assert.equal(f.api.collect(uid),false);
  f.fail=true;assert.equal(f.api.collect('h'),false);assert.deepEqual(plain(f.api.snapshot),rows);assert.deepEqual(plain(f.api.collection),[]);
});
test('開圖隨角色保存，重新載入保留，切換角色與登出不沿用',()=>{
  const f=fixture();f.api.activate([f.row('a','weapon:1')]);assert(f.api.collect('a'));const saved=f.saved;
  f.api.deactivate();assert(!f.api.hasCollection('weapon:1'));f.api.activate(saved.inventory,[],undefined,saved.collection);assert(f.api.hasCollection('weapon:1'));
  f.c.activeCharacterId='other';f.api.activate([]);assert(!f.api.hasCollection('weapon:1'));
});
test('冒險者三件必須開圖，全部完成後永久增加回血，不需持有或穿戴',()=>{
  const f=fixture(),rows=[f.row('w','weapon:1'),f.row('h','armor:20001'),f.row('a','armor:20090')];f.api.activate(rows);
  assert.equal(f.c.profile.read().gearHp,0);assert(f.api.collect('w'));assert(f.api.collect('h'));assert.equal(f.c.profile.read().gearHp,0);
  assert(f.api.collect('a'));assert.equal(f.api.items.length,0);assert.equal(f.c.profile.read().gearHp,1);assert(f.c.sets.read([]).active.includes('冒險者配對'));
});
test('普通套裝仍可穿戴啟動，圖鑑全開且同時穿戴不重複加成',()=>{
  const f=fixture(),rows=[f.row('h','armor:20012','helm'),f.row('a','armor:20111','armor')];f.api.activate(rows);
  assert.equal(f.c.sets.read(f.api.items).mp,50);f.api.activate(rows,[],undefined,['armor:20012','armor:20111']);assert.equal(f.c.sets.read(f.api.items).mp,50);
  f.api.activate([],[],undefined,['armor:20012','armor:20111']);assert.equal(f.c.sets.read([]).mp,50);
});
test('角色存檔一次保存道具與圖鑑，重登呼叫會帶回收藏欄位',()=>{
  const f=fixture();f.api.activate([f.row('a','weapon:1')]);assert(f.api.collect('a'));
  Object.assign(f.c,{entryLoggedIn:true,entryAccount:'test',entryCharacters:[{id:'hero',name:'勇者'},null,null,null],CharacterStore:{save(account,characters){return plain(characters)}}});
  const source=read('entry-flow.js'),start=source.indexOf('function saveActiveCharacter()'),end=source.indexOf('\n',start);
  vm.runInContext(source.slice(start,end)+';this.saveCharacter=saveActiveCharacter;',f.c);
  assert(f.c.saveCharacter());assert.deepEqual(f.c.entryCharacters[0].collection,['weapon:1']);assert.deepEqual(f.c.entryCharacters[0].inventory,[]);
  assert.match(source,/OwnedInventory\.activate\(c\.inventory===undefined\?\[\]:c\.inventory,storage,c\.skills,c\.collection\)/);
});

test('圖鑑按鈕消耗道具後立即從未開圖變為已開圖，不能重複投入',()=>{
  const f=fixture();f.api.activate([f.row('a','weapon:1')]);
  function node(tag='div',className='',text=''){
    const e={tagName:tag.toUpperCase(),className,textContent:text,children:[],isConnected:true,style:{},value:'',append(...children){this.children.push(...children)},replaceChildren(...children){this.children=children},setAttribute(k,v){this[k]=v}};
    e.classList={add(...names){e.className+=' '+names.join(' ')},toggle(name,on){const names=new Set(e.className.split(' ').filter(Boolean));if(on)names.add(name);else names.delete(name);e.className=[...names].join(' ')}};
    return e;
  }
  Object.assign(f.c,{uiElement:node,catalogButton:(text,onclick,cls)=>Object.assign(node('button',cls,text),{onclick}),itemIcon:()=>node('img')});f.c.document.createTextNode=text=>node('text','',text);
  vm.runInContext(read('equipment-collection.js'),f.c);
  const [sidebar,results,cards,detail,search]=Array.from({length:5},()=>node());
  f.c.renderEquipmentCollection(sidebar,results,cards,detail,search,[]);
  assert.match(cards.children[0].className,/collection-locked/);
  const button=detail.children.find(n=>n.textContent==='加入圖鑑');assert(button);assert.equal(button.disabled,false);button.onclick();
  assert.match(cards.children[0].className,/collection-unlocked/);assert.equal(f.api.items.length,0);
  assert.equal(detail.children.find(n=>n.textContent==='已加入圖鑑').disabled,true);
});
