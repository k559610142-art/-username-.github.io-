const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const {parseList}=require('./native-monsters/listspr');
test('讀取別名本體、未命名衣服欄位與緊湊數字動作格式',()=>{const rows=parseList('#21120 64=13152 Lightning\n110.framerate(32) 3.breath(1 2,0.0:5 0.1:4) 105.(2 20326 20531) 101.(13154)\n#21170 64\n110 24 0 1 2 8 0 4<479 8 1 4 3 1 2 0 0 5 0 1 4 101 13154 102 10 105 1 20319');assert.equal(rows.get(21120).src,13152);assert.deepEqual(rows.get(21120).clothes,[20326,20531]);assert.equal(rows.get(21120).frameRate,32);assert.equal(rows.get(21170).actions[3].frames.length,2);assert.equal(rows.get(21170).actions[0].frames[1].group,8);assert.deepEqual(rows.get(21170).clothes,[20319]);assert.equal(rows.get(21170).shadow,13154);});
function data(){const c={};c.window=c;vm.createContext(c);for(const f of ['transform-cards-data.js','monster-action-index.js','morph-weapon-data.js','extra-transform-cards-data.js'])vm.runInContext(fs.readFileSync(path.join(__dirname,'../data',f),'utf8'),c,{filename:f});return {c,book:vm.runInContext('transformCardBook',c),frames:vm.runInContext('monsterActionIndex',c)};}
test('原始變身表依排除清單匯入，既有收藏名稱不被改寫',()=>{const {book}=data();let rows;vm.runInNewContext(fs.readFileSync(path.join(__dirname,'../data/database/table-103.js'),'utf8'),{GameDatabase:{register:(n,cols,data)=>rows=data.map(r=>Object.fromEntries(cols.map((c,i)=>[c.name,r[i]])))}});const ids=new Set(book.map(c=>c.p.id)),baseIds=new Set(vm.runInNewContext(fs.readFileSync(path.join(__dirname,'../data/transform-cards-data.js'),'utf8')+';transformCardBook.map(c=>c.p.id)',{}));const exclusions=JSON.parse(fs.readFileSync(path.join(__dirname,'../data/transform-card-exclusions.json'),'utf8'));for(const r of rows){const removed=(!baseIds.has(r.id)&&exclusions.excludeEnglish&&/[a-z]/i.test(String(r.name||'')))||exclusions.names.some(n=>n.toLowerCase()===String(r.name||'').toLowerCase())||exclusions.prefixes.some(p=>String(r.name||'').startsWith(p));assert.equal(ids.has(r.id),!removed,(removed?'Excluded card remains ':'Missing original row ')+r.id);}assert.equal(new Set(book.map(c=>c.n)).size,book.length);assert(!book.some(c=>/[a-z]/i.test(c.n)),'English card name remains');for(const name of ['白金巡守','白金騎士','白金法師','屠龍者（翅膀）','屠龍者（披風）'])assert(book.some(c=>c.n===name),name);});
test('關刀聖使、四髮白金與兩種死騎有可用外觀、8 方向與原始限制',()=>{const {book,frames}=data();for(const gfx of [21120,21170,21175,21003,21004,21005,21006]){const c=book.find(c=>c.p.gfx===gfx);assert(c,'Missing card '+gfx);assert(!c.unavailable,'Unavailable '+gfx);assert(fs.existsSync(path.join(__dirname,'../assets/transform-portraits',gfx+'.png')));for(let d=0;d<8;d++)for(const clip of ['idle','walk','attack']){assert(frames[gfx]['d'+d+'/'+clip]?.length,`${gfx} d${d}/${clip}`);for(const f of frames[gfx]['d'+d+'/'+clip])assert(fs.existsSync(path.join(__dirname,'../assets/monster-actions',f[0])),f[0]);}}});

test('未命名與混合數字格式不會遺失動作',()=>{const rows=parseList('#1 8 animal 0.(1 2,0.0:4 0.1:4)\n#2 64 alias 110.framerate(28) 0 1 2 8 0 4 8 1 4 3 1 1 0 0 4');assert.equal(rows.get(1).actions[0].frames.length,2);assert.equal(rows.get(2).actions[0].frames.length,2);assert.equal(rows.get(2).frameRate,28);});

test('具名動作與裸數字屬性混用時仍讀取發光、影子與附加圖層',()=>{
 const row=parseList('#20613 8 layer 3.breath(1 1,0.0:4) 104 8 101 99 110 32 105 2 201 202').get(20613);
 assert.equal(row.attr,8);assert.equal(row.shadow,99);assert.equal(row.frameRate,32);assert.deepEqual(row.clothes,[201,202]);assert.equal(row.actions[3].frames.length,1);
});

test('短附加動畫循環，並可使用獨立待機組，不會在本體後半段消失',()=>{
 const script=fs.readFileSync(path.join(__dirname,'build-extra-transform-cards.cjs'),'utf8'),start=script.indexOf('function frameInfo('),end=script.indexOf('async function build(',start);
 const c={spr:file=>file==='123-3.spr'?{frames:Array.from({length:8},()=>({}))}:null};vm.createContext(c);vm.runInContext(script.slice(start,end),c);
 assert.equal(c.frameInfo(123,0,3,11,1,true).frame,3);
 assert.equal(c.frameInfo(123,32,3,11,1,true).file,'123-3.spr');
 assert.equal(c.frameInfo(123,0,3,11,1,false),null);
});

test('重建圖層具備八方向與所有引用素材，疾風精靈王保留超越分級及本體錨點',()=>{
 const {c,book,frames}=data(),report=JSON.parse(fs.readFileSync(path.join(__dirname,'transform-audit/repair-report.json'),'utf8'));
 assert.equal(report.length,95);assert(report.every(row=>row.complete));
 const files=new Set();for(const row of report){const cache=JSON.parse(fs.readFileSync(path.join(__dirname,'../assets/monster-actions/extra-poly-'+row.gfx+'.json'),'utf8'));assert.equal(cache.blendVersion,5);for(let d=0;d<8;d++)for(const clip of ['idle','walk'])assert(frames[row.gfx]['d'+d+'/'+clip]?.length,row.gfx+' d'+d+'/'+clip);for(const sequence of Object.values(frames[row.gfx]))for(const frame of sequence){assert(frame[3]>0&&frame[4]>0&&frame[5]>0);files.add(frame[0]);}}
 for(const file of files)assert(fs.existsSync(path.join(__dirname,'../assets/monster-actions',file)),file);
 const wind=book.find(card=>card.n==='疾風精靈王');assert.equal(wind.g,7);assert.equal(wind.p.gfx,22000);assert(c.NativeMorphGroundAnchors[22000].S);
 assert(frames[22000]['d0/skill']?.length);assert(vm.runInContext('weaponMorphFrames[weaponMorphModes[22000][20]]["d0/attack"].length',c)>0);
});

test('截圖五張未使用卡與裝備系列不再進入卡冊或抽卡名單',()=>{
  const {c,book}=data();
  const targets=book.filter(card=>(card.p.id>=324&&card.p.id<=328)||card.aliases?.includes('套裝變身系統專用'));
  assert.equal(targets.length,43);
  vm.runInContext(fs.readFileSync(path.join(__dirname,'../data/removed-transform-cards.js'),'utf8'),c);
  for(const card of targets)assert(!book.includes(card),card.n);
  assert(!book.some(card=>card.aliases?.includes('套裝變身系統專用')));
  for(const name of ['死亡騎士','黑暗精靈','黑暗騎士','黑暗法師','黑暗巡守','黑暗妖精刺客','炎魔']){
    const card=book.find(card=>card.n===name);
    assert(card,name);assert.equal(card.g,2,name+' 應保留綠卡分級');
  }
});
