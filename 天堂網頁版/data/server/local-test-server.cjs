const http=require('node:http'),fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const {DatabaseSync}=require('node:sqlite');
function createGameServer(options={}){
 const root=options.root||path.resolve(__dirname,'../..');
 const database=options.database||path.join(__dirname,'runtime.sqlite');
 const settings=options.settings||JSON.parse(fs.readFileSync(path.join(__dirname,'server-settings.json'),'utf8'));
 const db=new DatabaseSync(database);
 db.exec('PRAGMA journal_mode=WAL; PRAGMA foreign_keys=ON;');
 db.exec(`
 CREATE TABLE IF NOT EXISTS users(id INTEGER PRIMARY KEY,name TEXT NOT NULL UNIQUE,salt TEXT NOT NULL,password TEXT NOT NULL);
 CREATE TABLE IF NOT EXISTS sessions(token TEXT PRIMARY KEY,user_id INTEGER NOT NULL REFERENCES users(id),expires INTEGER NOT NULL);
 CREATE TABLE IF NOT EXISTS states(user_id INTEGER PRIMARY KEY REFERENCES users(id),revision INTEGER NOT NULL DEFAULT 0,payload TEXT NOT NULL);
 CREATE TABLE IF NOT EXISTS groups(id INTEGER PRIMARY KEY,kind TEXT NOT NULL,name TEXT NOT NULL,leader TEXT NOT NULL,treasury INTEGER NOT NULL DEFAULT 0,storage TEXT NOT NULL DEFAULT '[]');
 CREATE TABLE IF NOT EXISTS members(group_id INTEGER REFERENCES groups(id) ON DELETE CASCADE,user_id INTEGER REFERENCES users(id),character_id TEXT NOT NULL,kind TEXT NOT NULL,UNIQUE(kind,character_id));
 CREATE TABLE IF NOT EXISTS invites(id INTEGER PRIMARY KEY,group_id INTEGER REFERENCES groups(id) ON DELETE CASCADE,user_id INTEGER,character_id TEXT,UNIQUE(group_id,character_id));
 CREATE TABLE IF NOT EXISTS mail(id INTEGER PRIMARY KEY,sender INTEGER,recipient INTEGER NOT NULL,subject TEXT NOT NULL,body TEXT NOT NULL,attachment TEXT NOT NULL DEFAULT '[]',claimed INTEGER NOT NULL DEFAULT 0,created INTEGER NOT NULL);
 CREATE TABLE IF NOT EXISTS auctions(id INTEGER PRIMARY KEY,seller INTEGER NOT NULL,character_id TEXT NOT NULL,item TEXT NOT NULL,price INTEGER NOT NULL,expires INTEGER NOT NULL,status TEXT NOT NULL DEFAULT 'open');
 CREATE TABLE IF NOT EXISTS trades(id INTEGER PRIMARY KEY,a INTEGER NOT NULL,b INTEGER NOT NULL,ac TEXT NOT NULL,bc TEXT NOT NULL,ao TEXT NOT NULL DEFAULT '[]',bo TEXT NOT NULL DEFAULT '[]',aa INTEGER NOT NULL DEFAULT 0,ba INTEGER NOT NULL DEFAULT 0,status TEXT NOT NULL DEFAULT 'open');
 CREATE TABLE IF NOT EXISTS chat(id INTEGER PRIMARY KEY,user_id INTEGER,character_id TEXT,channel TEXT,text TEXT,created INTEGER);
 CREATE TABLE IF NOT EXISTS friends(user_id INTEGER NOT NULL,character_id TEXT NOT NULL,target_id TEXT NOT NULL,UNIQUE(character_id,target_id));
 `);
 const events=new Set(),presence=new Map(),attempts=new Map();
 const clone=value=>JSON.parse(JSON.stringify(value));
 const fail=(status,message)=>{const e=Error(message);e.status=status;throw e;};
 const int=(value,min=1,max=2147483647)=>{if(!Number.isSafeInteger(value)||value<min||value>max)fail(400,'數量或金額不正確。');return value;};
 const text=(value,max)=>{if(typeof value!=='string'||!value.trim()||value.length>max)fail(400,'文字長度不正確。');return value.trim();};
 const tokenHash=token=>crypto.createHash('sha256').update(token).digest('hex');
 function transaction(action){db.exec('BEGIN IMMEDIATE');try{const result=action();db.exec('COMMIT');notify();return result;}catch(e){db.exec('ROLLBACK');throw e;}}
 function notify(){for(const response of events)response.write('event: changed\ndata: {}\n\n');}
 function snapshot(id){
  const row=db.prepare('SELECT revision,payload FROM states WHERE user_id=?').get(id);
  return row?{revision:row.revision,...JSON.parse(row.payload)}:{revision:0,characters:Array(4).fill(null),warehouse:[]};
 }
 function save(id,state){
  const old=snapshot(id),next={characters:state.characters,warehouse:state.warehouse};
  db.prepare('INSERT INTO states(user_id,revision,payload) VALUES(?,?,?) ON CONFLICT(user_id) DO UPDATE SET revision=excluded.revision,payload=excluded.payload').run(id,old.revision+1,JSON.stringify(next));
  return {revision:old.revision+1,...next};
 }
 function validInventory(items,warehouse=false){
  if(!Array.isArray(items)||items.length>=180)fail(400,'背包或倉庫容量有誤。');
  const ids=new Set(),slots=new Set();
  for(const item of items){
   const rule=Object.hasOwn(settings.items,item.key)?settings.items[item.key]:null;
   if(!rule||typeof item.uid!=='string'||!item.uid||item.uid.length>80||ids.has(item.uid))fail(400,'物品資料有誤。');
   ids.add(item.uid);int(item.count);
   if(!rule.stackable&&item.count!==1||warehouse&&item.slot)fail(400,'物品堆疊或穿戴資料有誤。');
   if(item.slot){
    if(!['weapon','helm','armor','tshirt','cloak','glove','boots','shield','necklace','belt','earring','ring1','ring2','ring3','ring4'].includes(item.slot)||slots.has(item.slot))fail(400,'穿戴欄位有誤或重複。');
    if(item.slot==='weapon'&&rule.kind!=='weapon'||item.slot!=='weapon'&&rule.kind!=='armor')fail(400,'穿戴道具種類不符。');
    slots.add(item.slot);
   }
  }
 }
 function validState(state,user){
  if(!Array.isArray(state.characters)||state.characters.length!==4)fail(400,'角色資料有誤。');
  const ids=new Set(),names=new Set();
  for(const c of state.characters.filter(Boolean)){
   const rules=settings.classes[c.role];if(!rules)fail(400,'不支援的職業。');
   text(c.name,12);if(typeof c.id!=='string'||!c.id||c.id.length>80||ids.has(c.id)||names.has(c.name))fail(400,'角色名稱或識別碼重複。');
   ids.add(c.id);names.add(c.name);
   if(![0,1].includes(c.gender)||!c.stats||Object.keys(rules.base).some(k=>!Number.isInteger(c.stats[k])||c.stats[k]<rules.base[k]||c.stats[k]>rules.base[k]+rules.points)||Object.keys(rules.base).reduce((n,k)=>n+c.stats[k],0)!==75)fail(400,'角色能力值有誤。');
   int(c.level||1,1,100);validInventory(c.inventory||[]);
  }
  validInventory(state.warehouse||[],true);
  for(const old of snapshot(user.id).characters.filter(Boolean)){
   if(ids.has(old.id))continue;
   if(db.prepare('SELECT 1 FROM members WHERE character_id=?').get(old.id)||
     db.prepare("SELECT 1 FROM auctions WHERE character_id=? AND status='open'").get(old.id)||
     db.prepare("SELECT 1 FROM trades WHERE (ac=? OR bc=?) AND status='open'").get(old.id,old.id))fail(409,'請先離開團體並結束交易、拍賣，再刪除角色。');
  }
  for(const row of db.prepare('SELECT user_id,payload FROM states WHERE user_id<>?').all(user.id)){
   for(const c of JSON.parse(row.payload).characters.filter(Boolean))if(ids.has(c.id)||names.has(c.name))fail(409,'角色名稱已存在。');
  }
 }
 function actor(user,id){
  const state=snapshot(user.id),character=state.characters.find(c=>c?.id===id);
  if(!character)fail(404,'找不到你的角色。');return {state,character};
 }
 function target(name){
  for(const row of db.prepare('SELECT user_id,payload FROM states').all()){
   const c=JSON.parse(row.payload).characters.find(c=>c?.name===name);
   if(c)return {userId:row.user_id,character:c};
  }
  fail(404,'找不到對方角色。');
 }
 function removeItem(character,uid,count){
  const i=character.inventory.findIndex(e=>e.uid===uid),item=character.inventory[i];
  if(!item||item.slot||count>item.count)fail(400,'找不到可交易的物品。');
  const rule=settings.items[item.key];
  if(rule.trade===false)fail(400,'這項道具不能交易。');
  const result={...item,count,slot:null};item.count-=count;
  if(!item.count)character.inventory.splice(i,1);
  return result;
 }
 function give(character,item){
  const rule=settings.items[item.key];if(!rule)fail(400,'道具不存在。');
  const existing=rule.stackable?character.inventory.find(e=>e.key===item.key&&!e.slot&&(e.enchant||0)===(item.enchant||0)):null;
  if(existing){int(existing.count+item.count);existing.count+=item.count;return;}
  if(character.inventory.length>=179)fail(409,'背包空間不足。');
  character.inventory.push({...item,uid:crypto.randomUUID(),slot:null});
 }
 function gold(character,amount){
  const row=character.inventory.find(i=>i.key==='etcitem:40308');
  if(amount<0){if(!row||row.count<-amount)fail(400,'天幣不足。');row.count+=amount;if(!row.count)character.inventory.splice(character.inventory.indexOf(row),1);}
  else if(amount)give(character,{key:'etcitem:40308',count:amount});
 }
 function member(user,cid,group){
  const m=db.prepare('SELECT * FROM members WHERE group_id=? AND user_id=? AND character_id=?').get(group,user.id,cid);
  if(!m)fail(403,'你不是這個團體的成員。');
  return db.prepare('SELECT * FROM groups WHERE id=?').get(group);
 }
 function deliver(sender,recipient,subject,body,attachment=[]){db.prepare('INSERT INTO mail(sender,recipient,subject,body,attachment,created) VALUES(?,?,?,?,?,?)').run(sender,recipient,subject,body,JSON.stringify(attachment),Date.now());}
 function session(req){
  const raw=(req.headers.cookie||'').split(';').map(s=>s.trim()).find(s=>s.startsWith('lineage_session='))?.slice(16);
  if(!raw)return null;
  return db.prepare('SELECT users.id,users.name FROM sessions JOIN users ON users.id=sessions.user_id WHERE token=? AND expires>?').get(tokenHash(raw),Date.now())||null;
 }
 function json(res,status,body,headers={}){res.writeHead(status,{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store',...headers});res.end(JSON.stringify(body));}
 async function body(req){
  let bytes=0,data='';
  for await(const chunk of req){bytes+=chunk.length;if(bytes>1048576)fail(413,'資料量過大。');data+=chunk;}
  try{return data?JSON.parse(data):{};}catch{fail(400,'JSON 格式有誤。');}
 }
 const server=http.createServer(async(req,res)=>{
  try{
   const url=new URL(req.url,'http://'+req.headers.host),route=url.pathname;
   if(route==='/api/health')return json(res,200,{service:'lineage-local-test',storage:'sqlite',systems:['accounts','characters','guilds','parties','trade','auction','mail','chat']});
   if(route.startsWith('/api/')&&req.headers.origin&&req.headers.origin!==url.origin)fail(403,'來源不符。');
   if(route==='/api/auth'&&req.method==='POST'){
    const input=await body(req),name=text(input.name,32),password=text(input.password,256),record=db.prepare('SELECT * FROM users WHERE name=?').get(name);
    if(password.length<4)fail(400,'測試帳號密碼至少 4 字。');
    const key=req.socket.remoteAddress+'/'+name,rate=attempts.get(key)||{count:0,time:Date.now()};
    if(Date.now()-rate.time>300000){rate.count=0;rate.time=Date.now();}
    if(rate.count>=12)fail(429,'請稍後再試。');rate.count++;attempts.set(key,rate);
    let user=record;
    if(input.register){if(record)fail(409,'帳號已存在。');const salt=crypto.randomBytes(16).toString('hex'),hash=crypto.scryptSync(password,salt,64).toString('hex');const result=db.prepare('INSERT INTO users(name,salt,password) VALUES(?,?,?)').run(name,salt,hash);user={id:Number(result.lastInsertRowid),name};}
    else if(!user||!crypto.timingSafeEqual(crypto.scryptSync(password,user.salt,64),Buffer.from(user.password,'hex')))fail(401,'帳號或密碼不正確。');
    attempts.delete(key);const token=crypto.randomBytes(32).toString('hex');
    db.prepare('INSERT INTO sessions(token,user_id,expires) VALUES(?,?,?)').run(tokenHash(token),user.id,Date.now()+86400000);
    return json(res,200,{user:{id:user.id,name},state:snapshot(user.id)},{'Set-Cookie':'lineage_session='+token+'; HttpOnly; SameSite=Strict; Path=/; Max-Age=86400'});
   }
   if(route.startsWith('/api/')){
    const user=session(req);if(!user)fail(401,'請先登入。');
    if(route==='/api/auth'&&req.method==='DELETE'){
     const raw=(req.headers.cookie||'').split(';').map(s=>s.trim()).find(s=>s.startsWith('lineage_session='))?.slice(16);
     if(raw)db.prepare('DELETE FROM sessions WHERE token=?').run(tokenHash(raw));presence.delete(user.id);
     return json(res,200,{ok:true},{'Set-Cookie':'lineage_session=; HttpOnly; SameSite=Strict; Path=/; Max-Age=0'});
    }
    if(route==='/api/state'&&req.method==='GET')return json(res,200,{user,state:snapshot(user.id)});
    if(route==='/api/state'&&req.method==='PUT'){
     const input=await body(req),result=transaction(()=>{const old=snapshot(user.id);if(input.revision!==old.revision)fail(409,'存檔版本已更新，請重新讀取。');validState(input,user);return save(user.id,input);});
     return json(res,200,{state:result});
    }
    if(route==='/api/events'){
     res.writeHead(200,{'Content-Type':'text/event-stream','Cache-Control':'no-store','Connection':'keep-alive'});
     res.write('event: ready\ndata: {}\n\n');events.add(res);
     const timer=setInterval(()=>res.write(': heartbeat\n\n'),20000);req.on('close',()=>{clearInterval(timer);events.delete(res);});return;
    }
    if(route==='/api/presence'&&req.method==='POST'){
     const input=await body(req),{character:c}=actor(user,input.characterId);
     presence.set(user.id,{id:c.id,name:c.name,role:c.role,gender:c.gender,x:c.x,y:c.y,level:c.level,mapId:c.mapId||0,at:Date.now()});
     return json(res,200,{players:[...presence].filter(([id,p])=>id!==user.id&&Date.now()-p.at<12000).map(([,p])=>p)});
    }
    if(route==='/api/social'&&req.method==='GET'){
     const cid=url.searchParams.get('characterId');actor(user,cid);
     const groups=db.prepare('SELECT groups.* FROM groups JOIN members ON members.group_id=groups.id WHERE members.user_id=? AND members.character_id=?').all(user.id,cid);
     for(const group of groups){group.storage=JSON.parse(group.storage);group.members=db.prepare('SELECT character_id FROM members WHERE group_id=?').all(group.id).map(m=>({id:m.character_id,...findCharacter(m.character_id)}));}
     return json(res,200,{groups,invites:db.prepare('SELECT invites.id,groups.name,groups.kind FROM invites JOIN groups ON groups.id=invites.group_id WHERE invites.user_id=? AND invites.character_id=?').all(user.id,cid),
      mail:db.prepare('SELECT id,subject,body,claimed,created,attachment FROM mail WHERE recipient=? ORDER BY id DESC LIMIT 100').all(user.id).map(m=>({...m,attachment:JSON.parse(m.attachment)})),
      auctions:db.prepare("SELECT id,seller,character_id,item,price,expires FROM auctions WHERE status='open' ORDER BY id DESC LIMIT 100").all().map(a=>({...a,item:JSON.parse(a.item)})),
      trades:db.prepare("SELECT * FROM trades WHERE status='open' AND (a=? OR b=?)").all(user.id,user.id).map(t=>({...t,ao:JSON.parse(t.ao),bo:JSON.parse(t.bo)})),
      friends:db.prepare('SELECT target_id FROM friends WHERE user_id=? AND character_id=?').all(user.id,cid).map(f=>({id:f.target_id,...findCharacter(f.target_id)})),
      chat:db.prepare("SELECT chat.*,users.name FROM chat JOIN users ON users.id=chat.user_id WHERE channel='world' ORDER BY id DESC LIMIT 50").all().reverse()});
    }
    if(req.method!=='POST')fail(404,'找不到服務。');
    const input=await body(req);
    const result=transaction(()=>{
     const {state,character:c}=actor(user,input.characterId);
     if(route==='/api/groups/create'){
      const kind=input.kind;if(!['guild','party'].includes(kind))fail(400,'團體類型不正確。');
      if(kind==='guild'&&c.role!=='王族')fail(400,'只有王族可以建立血盟。');
      if(db.prepare('SELECT 1 FROM members WHERE kind=? AND character_id=?').get(kind,c.id))fail(409,'已加入團體。');
      if(kind==='guild')gold(c,-30000);
      const result=db.prepare('INSERT INTO groups(kind,name,leader) VALUES(?,?,?)').run(kind,text(input.name,24),c.id),id=Number(result.lastInsertRowid);
      db.prepare('INSERT INTO members VALUES(?,?,?,?)').run(id,user.id,c.id,kind);
      if(kind==='guild')save(user.id,state);return {};
     }
     if(route==='/api/groups/invite'){
      const group=member(user,c.id,int(input.groupId));if(group.leader!==c.id)fail(403,'只有團長可以邀請。');
      const other=target(text(input.name,12));
      if(db.prepare('SELECT 1 FROM members WHERE kind=? AND character_id=?').get(group.kind,other.character.id))fail(409,'對方已加入團體。');
      db.prepare('INSERT OR IGNORE INTO invites(group_id,user_id,character_id) VALUES(?,?,?)').run(group.id,other.userId,other.character.id);return {};
     }
     if(route==='/api/groups/accept'){
      const invitation=db.prepare('SELECT invites.*,groups.kind FROM invites JOIN groups ON groups.id=invites.group_id WHERE invites.id=? AND invites.user_id=? AND invites.character_id=?').get(int(input.inviteId),user.id,c.id);
      if(!invitation)fail(404,'邀請已失效。');
      if(db.prepare('SELECT COUNT(*) AS n FROM members WHERE group_id=?').get(invitation.group_id).n>=(invitation.kind==='party'?8:50))fail(409,'成員已滿。');
      if(db.prepare('SELECT 1 FROM members WHERE kind=? AND character_id=?').get(invitation.kind,c.id))fail(409,'已加入其他團體。');
      db.prepare('INSERT INTO members VALUES(?,?,?,?)').run(invitation.group_id,user.id,c.id,invitation.kind);
      db.prepare('DELETE FROM invites WHERE id=?').run(invitation.id);return {};
     }
     if(route==='/api/groups/leave'){
      const group=member(user,c.id,int(input.groupId));
      const rest=db.prepare('SELECT character_id FROM members WHERE group_id=? AND character_id<>? ORDER BY rowid LIMIT 1').get(group.id,c.id);
      if(!rest&&(group.treasury||JSON.parse(group.storage).length))fail(409,'請先領出團體金庫及倉庫物品。');
      db.prepare('DELETE FROM members WHERE group_id=? AND character_id=?').run(group.id,c.id);
      if(group.leader===c.id&&rest)db.prepare('UPDATE groups SET leader=? WHERE id=?').run(rest.character_id,group.id);
      if(!rest)db.prepare('DELETE FROM groups WHERE id=?').run(group.id);return {};
     }
     if(route==='/api/groups/gold'){
      const group=member(user,c.id,int(input.groupId)),amount=int(input.amount);
      if(input.withdraw){if(group.leader!==c.id||amount>group.treasury)fail(403,'無法領取金庫天幣。');gold(c,amount);}
      else gold(c,-amount);
      db.prepare('UPDATE groups SET treasury=treasury+? WHERE id=?').run(input.withdraw?-amount:amount,group.id);save(user.id,state);return {};
     }
     if(route==='/api/groups/storage'){
      const group=member(user,c.id,int(input.groupId)),storage=JSON.parse(group.storage);
      if(group.kind!=='guild')fail(400,'隊伍沒有血盟倉庫。');
      if(input.withdraw){
       if(group.leader!==c.id)fail(403,'只有盟主可以領取。');
       const index=storage.findIndex(e=>e.uid===input.itemUid),item=storage[index],count=int(input.count);
       if(!item||item.count<count)fail(400,'倉庫物品不足。');
       give(c,{...item,count});item.count-=count;if(!item.count)storage.splice(index,1);
      }else{
       if(storage.length>=179)fail(409,'血盟倉庫已滿。');
       storage.push({...removeItem(c,input.itemUid,int(input.count)),uid:crypto.randomUUID()});
      }
      db.prepare('UPDATE groups SET storage=? WHERE id=?').run(JSON.stringify(storage),group.id);save(user.id,state);return {};
     }
     if(route==='/api/friends/add'){
      const other=target(text(input.name,12));if(other.character.id===c.id)fail(400,'請選擇其他角色。');
      db.prepare('INSERT OR IGNORE INTO friends VALUES(?,?,?)').run(user.id,c.id,other.character.id);return {};
     }
     if(route==='/api/friends/remove'){
      db.prepare('DELETE FROM friends WHERE user_id=? AND character_id=? AND target_id=?').run(user.id,c.id,text(input.targetId,80));return {};
     }
     if(route==='/api/mail/send'){
      const other=target(text(input.to,12)),attachments=[];
      if(input.itemUid)attachments.push(removeItem(c,input.itemUid,int(input.count)));
      deliver(user.id,other.userId,text(input.subject,60),text(input.body,2000),attachments);save(user.id,state);return {};
     }
     if(route==='/api/mail/claim'){
      const mail=db.prepare('SELECT * FROM mail WHERE id=? AND recipient=? AND claimed=0').get(int(input.mailId),user.id);
      if(!mail)fail(409,'附件已領取或信件不存在。');
      for(const item of JSON.parse(mail.attachment))give(c,item);
      db.prepare('UPDATE mail SET claimed=1 WHERE id=?').run(mail.id);save(user.id,state);return {};
     }
     if(route==='/api/auction/list'){
      const item=removeItem(c,input.itemUid,int(input.count));
      db.prepare('INSERT INTO auctions(seller,character_id,item,price,expires) VALUES(?,?,?,?,?)').run(user.id,c.id,JSON.stringify(item),int(input.price),Date.now()+86400000);save(user.id,state);return {};
     }
     if(route==='/api/auction/buy'){
      const auction=db.prepare("SELECT * FROM auctions WHERE id=? AND status='open' AND expires>?").get(int(input.auctionId),Date.now());
      if(!auction||auction.seller===user.id)fail(409,'商品無法購買。');
      const seller=snapshot(auction.seller),sc=seller.characters.find(p=>p?.id===auction.character_id);
      if(!sc)fail(409,'賣家角色不存在。');
      gold(c,-auction.price);give(c,JSON.parse(auction.item));gold(sc,auction.price);
      save(user.id,state);save(auction.seller,seller);db.prepare("UPDATE auctions SET status='sold' WHERE id=?").run(auction.id);return {};
     }
     if(route==='/api/auction/cancel'){
      const auction=db.prepare("SELECT * FROM auctions WHERE id=? AND seller=? AND status='open'").get(int(input.auctionId),user.id);
      if(!auction)fail(409,'商品已成交或不存在。');
      deliver(null,user.id,'拍賣退回','退回未成交商品。',[JSON.parse(auction.item)]);
      db.prepare("UPDATE auctions SET status='cancelled' WHERE id=?").run(auction.id);return {};
     }
     if(route==='/api/trade/start'){
      const other=target(text(input.to,12));if(other.userId===user.id)fail(400,'請選擇另一個帳號的角色。');
      if(db.prepare("SELECT 1 FROM trades WHERE status='open' AND (a IN (?,?) OR b IN (?,?))").get(user.id,other.userId,user.id,other.userId))fail(409,'其中一方已有進行中的交易。');
      db.prepare('INSERT INTO trades(a,b,ac,bc) VALUES(?,?,?,?)').run(user.id,other.userId,c.id,other.character.id);return {};
     }
     if(route.startsWith('/api/trade/')){
      const trade=db.prepare("SELECT * FROM trades WHERE id=? AND status='open' AND (a=? OR b=?)").get(int(input.tradeId),user.id,user.id);
      if(!trade||c.id!==(trade.a===user.id?trade.ac:trade.bc))fail(409,'交易不存在。');
      const side=trade.a===user.id?'a':'b';
      if(route==='/api/trade/offer'){
       const old=JSON.parse(trade[side+'o']);
       if(old.length)fail(409,'已有報價，請取消交易後重新提出。');
       const item=removeItem(c,input.itemUid,int(input.count));
       db.prepare('UPDATE trades SET '+side+"o=?,aa=0,ba=0 WHERE id=?").run(JSON.stringify([item]),trade.id);save(user.id,state);return {};
      }
      if(route==='/api/trade/confirm'){
       db.prepare('UPDATE trades SET '+side+'a=1 WHERE id=?').run(trade.id);
       if(trade[side==='a'?'ba':'aa']){
        const a=snapshot(trade.a),b=snapshot(trade.b),ac=a.characters.find(x=>x?.id===trade.ac),bc=b.characters.find(x=>x?.id===trade.bc);
        if(!ac||!bc)fail(409,'交易角色不存在。');
        for(const item of JSON.parse(trade.ao))give(bc,item);
        for(const item of JSON.parse(trade.bo))give(ac,item);
        save(trade.a,a);save(trade.b,b);db.prepare("UPDATE trades SET status='complete' WHERE id=?").run(trade.id);
       }return {};
      }
      if(route==='/api/trade/cancel'){
       for(const [id,offer]of [[trade.a,trade.ao],[trade.b,trade.bo]])if(JSON.parse(offer).length)deliver(null,id,'交易退回','交易已取消。',JSON.parse(offer));
       db.prepare("UPDATE trades SET status='cancelled' WHERE id=?").run(trade.id);return {};
      }
     }
     if(route==='/api/chat'){
      db.prepare('INSERT INTO chat(user_id,character_id,channel,text,created) VALUES(?,?,?,?,?)').run(user.id,c.id,'world',text(input.text,200),Date.now());return {};
     }
     fail(404,'找不到服務。');
    });
    return json(res,200,{...result,state:snapshot(user.id)});
   }
   if(req.method!=='GET'&&req.method!=='HEAD')fail(405,'不支援的請求。');
   const relative=decodeURIComponent(route).replaceAll('\\','/').replace(/^\/+/,'' )||'index.html';
   if(relative.split('/').some(part=>part.startsWith('.'))||relative.startsWith('data/server/'))fail(404,'找不到檔案。');
   let file=path.resolve(root,relative);
   if(!file.startsWith(root+path.sep))fail(404,'找不到檔案。');
   if(options.overlay){
    const overlay=path.resolve(options.overlay),candidate=path.resolve(overlay,relative);
    if(candidate.startsWith(overlay+path.sep)&&fs.existsSync(candidate)&&fs.statSync(candidate).isFile())file=candidate;
   }
   if(!fs.existsSync(file)||!fs.statSync(file).isFile())fail(404,'找不到檔案。');
   const mime={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.png':'image/png','.jpg':'image/jpeg','.webp':'image/webp','.wav':'audio/wav','.mp3':'audio/mpeg','.json':'application/json'};
   res.writeHead(200,{'Content-Type':mime[path.extname(file)]||'application/octet-stream','X-Content-Type-Options':'nosniff','Content-Length':fs.statSync(file).size});
   if(req.method==='HEAD')res.end();else fs.createReadStream(file).pipe(res);
  }catch(e){if(!res.headersSent)json(res,e.status||500,{error:e.status?e.message:'本機伺服器處理失敗。'});else res.end();}
 });
 function findCharacter(id){
  for(const row of db.prepare('SELECT payload FROM states').all()){const c=JSON.parse(row.payload).characters.find(c=>c?.id===id);if(c)return {name:c.name,role:c.role,level:c.level};}
  return {name:'已刪除角色'};
 }
 server.on('close',()=>{for(const response of events)response.end();db.close();});
 return server;
}
module.exports={createGameServer};
if(require.main===module){
 const port=Number(process.env.LINEAGE_LOCAL_PORT||8787);
 const server=createGameServer();
 server.listen(port,'127.0.0.1',()=>console.log('本機天堂測試伺服器 http://127.0.0.1:'+port));
}
