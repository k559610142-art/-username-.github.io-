// 武魂扭蛋機（2026-11-17）：機率表、十連保底、伺服器扣鑽與發武魂、鑽石不足不扣。
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),os=require('node:os'),path=require('node:path');
const {DatabaseSync}=require('node:sqlite');
const {createGameServer}=require('../data/server/local-test-server.cjs');
const G=require('../data/wuhun-gacha-data.js');
test('獎池 42 種、機率合計 100%、價格照使用者設定',()=>{
 assert.equal(G.tiers.reduce((n,t)=>n+t.ids.length,0),42);
 assert.equal(Math.round(G.tiers.reduce((n,t)=>n+t.rate,0)*1000)/1000,100);
 assert.deepEqual(G.prices,G.free?{1:0,10:0}:{1:150,10:1350}); // 2026-11-17 先改免費抽
});
test('十連一定有極品以上；固定亂數時落在正確等級',()=>{
 const always=()=>0; // 全部抽到上品第一隻
 const ten=G.draw(10,always);assert.equal(ten.length,10);assert(ten.some(x=>x.rank>=1));assert.equal(ten[9].tier,'極品');
 assert.equal(G.roll(()=>.999999).tier,'四神獸');
});
test('伺服器扣鑽、發武魂，鑽石不足不扣',async()=>{
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'lineage-gacha-')),file=path.join(dir,'t.sqlite');
 const items={};for(const t of G.tiers)for(const id of t.ids)items['etcitem:'+id]={kind:'etcitem',stackable:true,trade:true};
 const settings={items,classes:{騎士:{base:{str:20,dex:15,con:10,wis:10,cha:10,int:10},points:0}}};
 const server=createGameServer({database:file,settings});await new Promise(r=>server.listen(0,'127.0.0.1',r));const db=new DatabaseSync(file),base='http://127.0.0.1:'+server.address().port;
 async function api(route,data,cookie){const response=await fetch(base+route,{method:'POST',headers:{'Content-Type':'application/json',...(cookie?{Cookie:cookie}:{})},body:JSON.stringify(data)});return {status:response.status,data:await response.json(),cookie:response.headers.get('set-cookie')?.split(';')[0]};}
 try{
  const auth=await api('/api/auth',{name:'gacha',password:'testpass',register:true});
  db.prepare('INSERT INTO states(user_id,revision,payload) VALUES(?,0,?)').run(auth.data.user.id,JSON.stringify({characters:[{id:'g',name:'g',role:'騎士',gender:0,stats:{str:20,dex:15,con:10,wis:10,cha:10,int:10},level:1,diamonds:1600,inventory:[]},null,null,null],warehouse:[]}));
  const char=()=>JSON.parse(db.prepare('SELECT payload FROM states WHERE user_id=?').get(auth.data.user.id).payload).characters[0];
  let r=await api('/api/gacha/wuhun',{characterId:'g',count:10},auth.cookie);assert.equal(r.status,200);assert.equal(r.data.results.length,10);assert.equal(char().diamonds,1600-G.prices[10]);
  assert.equal(char().inventory.reduce((n,e)=>n+e.count,0),10);assert(r.data.results.some(x=>x.tier!=='上品'));
  r=await api('/api/gacha/wuhun',{characterId:'g',count:1},auth.cookie);assert.equal(r.status,200);assert.equal(char().diamonds,1600-G.prices[10]-G.prices[1]);
  if(!G.free){r=await api('/api/gacha/wuhun',{characterId:'g',count:1},auth.cookie);assert.equal(r.status,400);assert.equal(char().diamonds,100);}
  r=await api('/api/gacha/wuhun',{characterId:'g',count:5},auth.cookie);assert.equal(r.status,400);
 }finally{server.close();db.close();}
});
