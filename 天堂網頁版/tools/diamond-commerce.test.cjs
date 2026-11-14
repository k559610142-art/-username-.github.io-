const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),os=require('node:os'),path=require('node:path');
const {DatabaseSync}=require('node:sqlite');
const {createGameServer}=require('../data/server/local-test-server.cjs');
test('交易所 30 等限制、鑽石收付、失敗回滾、舊天幣商品與錢包保護',async()=>{
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'lineage-diamond-')),file=path.join(dir,'test.sqlite');
 const settings={items:{'etcitem:40010':{kind:'etcitem',stackable:true,trade:true},'etcitem:40308':{kind:'etcitem',stackable:true,trade:true}},classes:{騎士:{base:{str:75},points:0}}};
 const server=createGameServer({database:file,settings});await new Promise(r=>server.listen(0,'127.0.0.1',r));const db=new DatabaseSync(file),base='http://127.0.0.1:'+server.address().port;
 async function api(route,data,cookie,method='POST'){const response=await fetch(base+route,{method,headers:{'Content-Type':'application/json',...(cookie?{Cookie:cookie}:{})},...(data?{body:JSON.stringify(data)}:{})});return {status:response.status,data:await response.json(),cookie:response.headers.get('set-cookie')?.split(';')[0]};}
 async function user(name,level,diamonds){const auth=await api('/api/auth',{name,password:'testpass',register:true});const c={id:name,name,role:'騎士',gender:0,stats:{str:75},level,diamonds,inventory:[{uid:'potion',key:'etcitem:40010',count:10},{uid:'gold',key:'etcitem:40308',count:10000}]};db.prepare('INSERT INTO states(user_id,revision,payload) VALUES(?,0,?)').run(auth.data.user.id,JSON.stringify({characters:[c,null,null,null],warehouse:[]}));return {id:auth.data.user.id,cookie:auth.cookie,c};}
 const state=u=>JSON.parse(db.prepare('SELECT payload FROM states WHERE user_id=?').get(u.id).payload);
 try{
  const seller=await user('seller',30,5),buyer=await user('buyer',29,100);
  let r=await api('/api/auction/list',{characterId:'buyer',itemUid:'potion',count:1,price:30},buyer.cookie);assert.equal(r.status,403);assert.equal(state(buyer).characters[0].inventory[0].count,10);
  r=await api('/api/auction/list',{characterId:'seller',itemUid:'potion',count:2,price:30},seller.cookie);assert.equal(r.status,200);const auction=db.prepare('SELECT * FROM auctions').get();assert.equal(auction.currency,'diamond');
  r=await api('/api/auction/buy',{characterId:'buyer',auctionId:auction.id},buyer.cookie);assert.equal(r.status,403);
  function setBuyer(level,diamonds){const s=state(buyer);s.characters[0].level=level;s.characters[0].diamonds=diamonds;db.prepare('UPDATE states SET payload=? WHERE user_id=?').run(JSON.stringify(s),buyer.id);}
  setBuyer(30,20);r=await api('/api/auction/buy',{characterId:'buyer',auctionId:auction.id},buyer.cookie);assert.equal(r.status,400);assert.equal(state(buyer).characters[0].diamonds,20);assert.equal(db.prepare('SELECT status FROM auctions').get().status,'open');
  setBuyer(30,100);r=await api('/api/auction/buy',{characterId:'buyer',auctionId:auction.id},buyer.cookie);assert.equal(r.status,200);assert.equal(state(buyer).characters[0].diamonds,70);assert.equal(state(seller).characters[0].diamonds,35);assert.equal(state(buyer).characters[0].inventory[0].count,12);assert.equal(state(buyer).characters[0].inventory[1].count,10000);
  r=await api('/api/auction/buy',{characterId:'buyer',auctionId:auction.id},buyer.cookie);assert.equal(r.status,409);assert.equal(state(buyer).characters[0].diamonds,70);
  const legacy=db.prepare("INSERT INTO auctions(seller,character_id,item,price,expires) VALUES(?,?,?,?,?)").run(seller.id,'seller',JSON.stringify({key:'etcitem:40010',count:1}),10,Date.now()+86400000);
  r=await api('/api/auction/buy',{characterId:'buyer',auctionId:Number(legacy.lastInsertRowid)},buyer.cookie);assert.equal(r.status,409);assert.equal(state(buyer).characters[0].diamonds,70);
  const current=await api('/api/state',null,buyer.cookie,'GET');current.data.state.characters[0].diamonds=999999;r=await api('/api/state',current.data.state,buyer.cookie,'PUT');assert.equal(r.status,200);assert.equal(state(buyer).characters[0].diamonds,70);
 }finally{db.close();await new Promise(r=>server.close(r));for(const name of fs.readdirSync(dir))fs.unlinkSync(path.join(dir,name));fs.rmdirSync(dir);}
});
