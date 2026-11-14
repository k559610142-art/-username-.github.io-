const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
const root=path.resolve(__dirname,'..');
function context(files){const c={};c.window=c;vm.createContext(c);for(const file of files)vm.runInContext(fs.readFileSync(path.join(root,'data',file),'utf8'),c,{filename:file});return c;}
test('黑妖男女可建立、能力合計 75，存檔重讀及升級成長有效',()=>{
 const c=context(['class-creation-data.js','player-growth-data.js','player-growth.js']);
 assert.equal(c.CreationRules.classes.黑妖.type,4);assert.equal(c.CreationRules.classes.黑妖.points,10);
 const stats={...c.CreationRules.classes.黑妖.base,str:20,dex:17};assert(c.CreationRules.validStats('黑妖',stats));assert(!c.CreationRules.validStats('黑妖',{...stats,str:21,dex:16}));assert(c.CreationRules.validStoredStats('黑妖',{...stats,str:22,dex:15}));assert.equal(c.CreationRules.vitals('黑妖',stats).mp,3);
 const storage=new Map();c.localStorage={getItem:k=>storage.get(k),setItem:(k,v)=>storage.set(k,v)};vm.runInContext(fs.readFileSync(path.join(root,'data/character-store.js'),'utf8'),c);
 for(const gender of [0,1]){const hero={id:'dark-'+gender,name:'黑妖'+gender,role:'黑妖',gender,stats};c.CharacterStore.save('test',[hero,null,null,null]);assert.equal(c.CharacterStore.load('test')[0].role,'黑妖');c.hero=hero;const growth=vm.runInContext('PlayerGrowth.fromCharacter(hero,CreationRules.vitals(hero.role,hero.stats),30)',c);assert.equal(growth.level,30);assert(growth.maxHp>12);assert(growth.maxMp>3);}
});
test('黑妖所有八方向、武器與影子圖片存在，武器姿勢與原始動作相符',()=>{
 const c=context(['sprite-movement-data.js','character-data.js','character-action-data.js','extra-class-data.js','dark-elf-data.js']);let count=0;
 for(const [gender,name]of ['男黑妖','女黑妖'].entries()){
  const av=c.CHARACTER_ACTION_ASSETS.avatars[name];assert.equal(av.spriteId,gender?2796:2786);assert.equal(c.CHARACTER_ASSETS.jobs.黑妖[gender],name);
  for(const mode of ['unarmed','edoryu','claw','gauntlet'])assert(av.weapons.includes(mode));
  for(const [dir,clips]of Object.entries(av.directions))for(const [clip,n]of Object.entries(clips)){assert(n>0);for(let i=0;i<n;i++){assert(fs.existsSync(path.join(root,'assets/character-actions',name,dir,clip+'_'+i+'.png')));count++;}for(let i=0;i<(av.shadows[dir][clip]||0);i++)assert(fs.existsSync(path.join(root,'assets/character-actions',name,dir,clip+'_s_'+i+'.png')));}
  assert.equal(av.timelines.edoryu_attack.actionId,55);assert.equal(av.timelines.claw_attack.actionId,59);assert(c.SPRITE_MOVEMENT.profiles['黑妖:'+gender].actions[54].stepMs>0);
  assert(fs.existsSync(path.join(root,'assets/entry/class-'+av.spriteId+'.png')));
 }
 assert(count>1000);
});
test('多人伺服器接受男、女黑妖的建立與存檔',async()=>{
 const {createGameServer}=require('../data/server/local-test-server.cjs'),server=createGameServer({database:':memory:'});await new Promise(r=>server.listen(0,'127.0.0.1',r));
 try{const base='http://127.0.0.1:'+server.address().port;let response=await fetch(base+'/api/auth',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({name:'dark-test',password:'testpass',register:true})});const cookie=response.headers.get('set-cookie').split(';')[0];assert.equal(response.status,200);const auth=await response.json();
 const characters=[0,1].map(gender=>({id:'dark-'+gender,name:'黑妖'+gender,role:'黑妖',gender,stats:{str:20,dex:17,con:8,wis:10,cha:9,int:11},level:1,inventory:[]}));
 response=await fetch(base+'/api/state',{method:'PUT',headers:{'Content-Type':'application/json',Cookie:cookie},body:JSON.stringify({revision:auth.state.revision,characters:[...characters,null,null],warehouse:[]})});assert.equal(response.status,200);const result=await response.json();assert.equal(result.state.characters[1].role,'黑妖');assert.equal(result.state.characters[1].gender,1);
 const invalid={...characters[0],id:'overcap',name:'超額黑妖',stats:{...characters[0].stats,str:21,dex:16}};const rejected=await fetch(base+'/api/state',{method:'PUT',headers:{'Content-Type':'application/json',Cookie:cookie},body:JSON.stringify({revision:result.state.revision,characters:[...characters,invalid,null],warehouse:[]})});assert.equal(rejected.status,400);
 }finally{await new Promise(r=>server.close(r));}
});
