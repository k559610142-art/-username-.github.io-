// 傭兵團伺服器流程（2026-11-16）：登記、雇用扣鑽石／手續費／點數、合約保護、任務領獎、點數商店。
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),os=require('node:os'),path=require('node:path');
const {DatabaseSync}=require('node:sqlite');
const {createGameServer}=require('../data/server/local-test-server.cjs');
const MERC=require('../data/mercenary-data.js');
test('傭兵登記、雇用付費、公會抽成、點數發放、合約與點數不能被存檔改寫、任務領獎、點數商店',async()=>{
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'lineage-merc-')),file=path.join(dir,'test.sqlite');
 const settings={items:{'etcitem:40308':{kind:'etcitem',stackable:true,trade:true},'etcitem:40100':{kind:'etcitem',stackable:true,trade:true}},classes:{騎士:{base:{str:20,dex:15,con:10,wis:10,cha:10,int:10},points:0}}};
 const server=createGameServer({database:file,settings});await new Promise(r=>server.listen(0,'127.0.0.1',r));const db=new DatabaseSync(file),base='http://127.0.0.1:'+server.address().port;
 async function api(route,data,cookie,method='POST'){const response=await fetch(base+route,{method,headers:{'Content-Type':'application/json',...(cookie?{Cookie:cookie}:{})},...(data?{body:JSON.stringify(data)}:{})});return {status:response.status,data:await response.json(),cookie:response.headers.get('set-cookie')?.split(';')[0]};}
 async function user(name,level,diamonds){const auth=await api('/api/auth',{name,password:'testpass',register:true});const c={id:name,name,role:'騎士',gender:0,stats:{str:20,dex:15,con:10,wis:10,cha:10,int:10},level,diamonds,inventory:[]};db.prepare('INSERT INTO states(user_id,revision,payload) VALUES(?,0,?)').run(auth.data.user.id,JSON.stringify({characters:[c,null,null,null],warehouse:[]}));return {id:auth.data.user.id,cookie:auth.cookie};}
 const state=u=>JSON.parse(db.prepare('SELECT payload FROM states WHERE user_id=?').get(u.id).payload);
 const char=u=>state(u).characters[0];
 const patch=(u,fn)=>{const s=state(u);fn(s.characters[0]);db.prepare('UPDATE states SET payload=? WHERE user_id=?').run(JSON.stringify(s),u.id);};
 try{
  const merc=await user('merc',40,0),boss=await user('boss',20,50);
  let r=await api('/api/merc/register',{characterId:'merc',price:10},merc.cookie);assert.equal(r.status,200);
  r=await api('/api/merc/board',{characterId:'boss'},boss.cookie);assert.equal(r.data.board.length,1);assert.equal(r.data.board[0].name,'merc');assert.equal(r.data.board[0].level,40);
  r=await api('/api/merc/board',{characterId:'merc'},merc.cookie);assert.equal(r.data.board.length,0,'自己的傭兵不出現在公告板');assert.equal(r.data.mine.price,10);
  r=await api('/api/merc/hire',{characterId:'merc',mercId:'merc',hours:1,mode:'follow'},merc.cookie);assert.equal(r.status,409,'不能雇用自己');
  r=await api('/api/merc/hire',{characterId:'boss',mercId:'merc',hours:3,mode:'follow'},boss.cookie);assert.equal(r.status,400,'時數只能 1/2/4/8');
  r=await api('/api/merc/hire',{characterId:'boss',mercId:'merc',hours:8,mode:'follow'},boss.cookie);assert.equal(r.status,400,'80 鑽 > 50 鑽，不足');assert.equal(char(boss).diamonds,50);assert.equal(char(boss).mercContract,undefined);
  // 4 小時 = 40 鑽；公會抽 20% = 8；傭兵拿 32 鑽、點數 60
  r=await api('/api/merc/hire',{characterId:'boss',mercId:'merc',hours:4,mode:'follow'},boss.cookie);assert.equal(r.status,200);
  assert.equal(char(boss).diamonds,10);assert.equal(char(merc).diamonds,32);assert.equal(char(merc).mercPoints,MERC.points(4));assert.equal(char(boss).mercContract.mode,'follow');assert.equal(char(boss).mercContract.level,40);
  assert.equal(db.prepare('SELECT hires FROM mercenaries').get().hires,1);
  r=await api('/api/merc/hire',{characterId:'boss',mercId:'merc',hours:1,mode:'follow'},boss.cookie);assert.equal(r.status,409,'合約進行中不能再雇');
  // 2026-11-18：被雇用中，其他玩家公告板看不到、也不能雇；傭兵本人不能撤下
  const other=await user('other',20,100);r=await api('/api/merc/board',{characterId:'other'},other.cookie);assert.equal(r.data.board.length,0,'雇用中不出現在公告板');
  r=await api('/api/merc/hire',{characterId:'other',mercId:'merc',hours:1,mode:'follow'},other.cookie);assert.equal(r.status,409,'雇用中不能被別人雇');assert.equal(char(other).diamonds,100);
  r=await api('/api/merc/board',{characterId:'merc'},merc.cookie);assert.ok(r.data.mine.busyUntil>Date.now());r=await api('/api/merc/withdraw',{characterId:'merc'},merc.cookie);assert.equal(r.status,409,'雇用中不能撤下');
  // 存檔不能改寫點數與合約
  const s=state(merc);s.characters[0].mercPoints=99999;s.characters[0].diamonds=99999;delete s.revision;
  r=await api('/api/state',{...s,revision:state(merc).revision||1},merc.cookie,'PUT');
  assert.equal(char(merc).mercPoints,MERC.points(4));assert.equal(char(merc).diamonds,32);
  // 解約後派任務；時間到才能領
  r=await api('/api/merc/dismiss',{characterId:'boss'},boss.cookie);assert.equal(r.status,200);assert.equal(char(boss).mercContract,null);
  r=await api('/api/merc/board',{characterId:'other'},other.cookie);assert.equal(r.data.board.length,1,'解約後重新出現在公告板');
  patch(boss,c=>{c.diamonds=100;});
  r=await api('/api/merc/hire',{characterId:'boss',mercId:'merc',hours:1,mode:'mission',missionId:'hunt'},boss.cookie);assert.equal(r.status,200);
  r=await api('/api/merc/claim',{characterId:'boss'},boss.cookie);assert.equal(r.status,409,'任務未完成');
  patch(boss,c=>{c.mercContract.until=Date.now()-1;});
  r=await api('/api/merc/claim',{characterId:'boss'},boss.cookie);assert.equal(r.status,200);const reward=MERC.missionReward(40,1,'hunt');assert.deepEqual(r.data.reward,reward);
  assert.equal(char(boss).inventory.find(e=>e.key==='etcitem:40308').count,reward.gold);assert.equal(char(boss).mercContract,null);
  // 點數商店
  const item=MERC.shop.find(x=>x.key==='etcitem:40100');
  r=await api('/api/merc/shop',{characterId:'merc',itemId:item.id},merc.cookie);assert.equal(r.status,200);
  assert.equal(char(merc).mercPoints,MERC.points(4)+MERC.points(1)-item.cost);assert.equal(char(merc).inventory.find(e=>e.key==='etcitem:40100').count,item.count);
  patch(merc,c=>{c.mercPoints=1;});r=await api('/api/merc/shop',{characterId:'merc',itemId:item.id},merc.cookie);assert.equal(r.status,400,'點數不足');
  // 撤下
  r=await api('/api/merc/withdraw',{characterId:'merc'},merc.cookie);assert.equal(r.status,200);r=await api('/api/merc/board',{characterId:'boss'},boss.cookie);assert.equal(r.data.board.length,0);
 }finally{server.close();db.close();}
});
