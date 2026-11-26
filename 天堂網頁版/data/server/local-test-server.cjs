const http=require('node:http'),fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const {DatabaseSync}=require('node:sqlite');
const MERC=require('../mercenary-data.js'); // 傭兵團規則（與遊戲共用）
const WUHUN_GACHA=require('../wuhun-gacha-data.js'); // 武魂扭蛋機獎池與機率（與遊戲共用）
const DOLL_GACHA=require('../doll-gacha-data.js'); // 魔法娃娃扭蛋機（2026-11-17，與遊戲共用）
let healingCache=null;
function healingData(){if(healingCache)return healingCache;const vm=require('node:vm'),c={};c.window=c;vm.createContext(c);for(const file of ['interface-catalog.js','item-use-data.js','db-native-catalog.js','player-skill-data.js','native-dungeon-maps.js','native-collision-data.js','native-collision.js'])vm.runInContext(fs.readFileSync(path.join(__dirname,'..',file),'utf8'),c);return healingCache={skills:vm.runInContext('playerSkillData.skills',c),rules:c.ITEM_USE_RULES.definitions,maps:c.NATIVE_DUNGEON_MAPS,collision:c.NativeCollision};}
function createGameServer(options={}){
 const healCooldowns=new Map();
 const root=options.root||path.resolve(__dirname,'../..');
 const database=options.database||path.join(__dirname,'runtime.sqlite');
 const settings=options.settings||JSON.parse(fs.readFileSync(path.join(__dirname,'server-settings.json'),'utf8'));
 if(!options.settings)for(const key of require('../item-properties.js').stackableMaterialKeys){
  if(settings.items[key])settings.items[key].stackable=true;
 }
 for(const [key,rule] of Object.entries(settings.items))if(/^(weapon|armor):/.test(key))rule.stackable=false;
 // 2026-11-17：server-settings.json 只有舊 5 職業，龍騎士／幻術師／戰士存檔會被擋（不支援的職業）→ 缺的職業從遊戲的 data/class-creation-data.js 補上。
 let creationRules;
 try{const sandbox={window:{}};require('vm').runInNewContext(fs.readFileSync(path.join(__dirname,'../class-creation-data.js'),'utf8'),sandbox);
  creationRules=sandbox.window.CreationRules;
  if(!options.settings)for(const [role,rule] of Object.entries(creationRules?.classes||{}))settings.classes[role]??={type:rule.type,base:rule.base,points:rule.points,hp:rule.hp};}catch(error){console.warn('class-creation-data 載入失敗',error.message);}
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
 CREATE TABLE IF NOT EXISTS mercenaries(character_id TEXT PRIMARY KEY,user_id INTEGER NOT NULL REFERENCES users(id),snapshot TEXT NOT NULL,price INTEGER NOT NULL,hires INTEGER NOT NULL DEFAULT 0,updated INTEGER NOT NULL);
 `);
 // 2026-11-18 使用者：傭兵被雇用後，合約期間其他玩家看不到也不能雇（busy_until＝合約到期時間，hired_by＝雇主角色）
 {const cols=db.prepare('PRAGMA table_info(mercenaries)').all().map(c=>c.name);if(!cols.includes('busy_until'))db.exec('ALTER TABLE mercenaries ADD COLUMN busy_until INTEGER NOT NULL DEFAULT 0');if(!cols.includes('hired_by'))db.exec('ALTER TABLE mercenaries ADD COLUMN hired_by TEXT');}
 if(!db.prepare('PRAGMA table_info(auctions)').all().some(c=>c.name==='currency'))db.exec("ALTER TABLE auctions ADD COLUMN currency TEXT NOT NULL DEFAULT 'adena'");
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
   if((item.attributeScroll!==undefined||item.attributeRank!==undefined)&&
      (rule.kind!=='weapon'||!/^etcitem:5626[1-4]$/.test(item.attributeScroll)||!Number.isInteger(item.attributeRank)||item.attributeRank<1||item.attributeRank>5))fail(400,'武器屬性資料有誤。');
   if(!rule.stackable&&item.count!==1||warehouse&&item.slot)fail(400,'物品堆疊或穿戴資料有誤。');
   if(item.slot){
    if(!['weapon','weapon2','helm','armor','tshirt','pants','cloak','glove','boots','shield','necklace','belt','earring','ring1','ring2','ring3','ring4'].includes(item.slot)||slots.has(item.slot))fail(400,'穿戴欄位有誤或重複。');
    const weaponSlot=item.slot==='weapon'||item.slot==='weapon2'; // weapon2＝戰士右手第二把斧（2026-11-17）
    if((item.slot==='pants')!==(rule.type==='pants')||weaponSlot&&rule.kind!=='weapon'||!weaponSlot&&rule.kind!=='armor')fail(400,'穿戴道具種類不符。');
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
   if(![0,1].includes(c.gender)||!(creationRules?.validStats(c.role,c.stats)||c.stats&&Object.keys(rules.base).every(k=>Number.isInteger(c.stats[k])&&c.stats[k]>=rules.base[k]&&c.stats[k]<=rules.base[k]+rules.points)&&Object.keys(rules.base).reduce((n,k)=>n+c.stats[k],0)===75))fail(400,'角色能力值有誤。');
   int(c.level||1,1,100);validInventory(c.inventory||[]);
   const previous=snapshot(user.id).characters.find(row=>row?.id===c.id);if(Object.keys(rules.base).some(k=>c.stats[k]>20)&&(!previous||Object.keys(rules.base).some(k=>previous.stats[k]!==c.stats[k])))fail(400,'創角單項屬性最高 20。');
   const old=snapshot(user.id).characters.find(row=>row?.id===c.id);c.diamonds=old?.diamonds||0; // 鑽石只允許由伺服器交易修改。
   c.mercPoints=old?.mercPoints||0;c.mercContract=old?.mercContract||null;c.dailyDiamond=old?.dailyDiamond||null; // 傭兵點數與雇用合約也只由伺服器修改。
  }
  validInventory(state.warehouse||[],true);
  for(const old of snapshot(user.id).characters.filter(Boolean)){
   if(ids.has(old.id))continue;
   if(db.prepare('SELECT 1 FROM members WHERE character_id=?').get(old.id)||
     db.prepare("SELECT 1 FROM auctions WHERE character_id=? AND status='open'").get(old.id)||
     db.prepare("SELECT 1 FROM trades WHERE (ac=? OR bc=?) AND status='open'").get(old.id,old.id))fail(409,'請先離開團體並結束交易、拍賣，再刪除角色。');
   db.prepare('DELETE FROM mercenaries WHERE character_id=?').run(old.id);
  }
  for(const row of db.prepare('SELECT user_id,payload FROM states WHERE user_id<>?').all(user.id)){
   for(const c of JSON.parse(row.payload).characters.filter(Boolean))if(ids.has(c.id)||names.has(c.name))fail(409,'角色名稱已存在。');
  }
 }
 function actor(user,id){
  const state=snapshot(user.id),character=state.characters.find(c=>c?.id===id);
  if(!character)fail(404,'找不到你的角色。');return {state,character};
 }
 function partyRoster(user,cid){
  const member=db.prepare("SELECT group_id FROM members WHERE user_id=? AND character_id=? AND kind='party'").get(user.id,cid);if(!member)return [];
  return db.prepare('SELECT user_id,character_id FROM members WHERE group_id=? AND character_id<>?').all(member.group_id,cid).map(row=>{
   const c=snapshot(row.user_id).characters.find(c=>c?.id===row.character_id);if(!c)return null;const p=presence.get(row.user_id),online=p?.id===c.id&&Date.now()-p.at<12000;
   return {id:c.id,name:c.name,role:c.role,level:c.level,hp:Number.isFinite(c.hp)?c.hp:null,maxHp:Number.isFinite(c.maxHp)?c.maxHp:null,mapId:c.mapId||0,online};
  }).filter(Boolean);
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
   if(route==='/api/health')return json(res,200,{service:'lineage-local-test',storage:'sqlite',systems:['accounts','characters','guilds','parties','trade','auction','mail','chat','mercenary','gacha']});
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
     presence.set(user.id,{id:c.id,name:c.name,role:c.role,gender:c.gender,x:c.x,y:c.y,level:c.level,lawful:Number(c.lawful)||0,mapId:c.mapId||0,at:Date.now()});
     return json(res,200,{party:partyRoster(user,c.id),players:[...presence].filter(([id,p])=>id!==user.id&&Date.now()-p.at<12000).map(([,p])=>p)});
    }
    if(route==='/api/social'&&req.method==='GET'){
     const cid=url.searchParams.get('characterId'),viewer=actor(user,cid).character;
     const groups=db.prepare('SELECT groups.* FROM groups JOIN members ON members.group_id=groups.id WHERE members.user_id=? AND members.character_id=?').all(user.id,cid);
     for(const group of groups){group.storage=JSON.parse(group.storage);group.members=db.prepare('SELECT character_id FROM members WHERE group_id=?').all(group.id).map(m=>({id:m.character_id,...findCharacter(m.character_id)}));}
     return json(res,200,{groups,invites:db.prepare('SELECT invites.id,groups.name,groups.kind FROM invites JOIN groups ON groups.id=invites.group_id WHERE invites.user_id=? AND invites.character_id=?').all(user.id,cid),
      mail:db.prepare('SELECT id,subject,body,claimed,created,attachment FROM mail WHERE recipient=? ORDER BY id DESC LIMIT 100').all(user.id).map(m=>({...m,attachment:JSON.parse(m.attachment)})),
      auctions:(viewer.level||1)<30?[]:db.prepare("SELECT id,seller,character_id,item,price,expires,currency FROM auctions WHERE status='open' ORDER BY id DESC LIMIT 100").all().map(a=>({...a,item:JSON.parse(a.item)})),
      trades:db.prepare("SELECT * FROM trades WHERE status='open' AND (a=? OR b=?)").all(user.id,user.id).map(t=>({...t,ao:JSON.parse(t.ao),bo:JSON.parse(t.bo)})),
      friends:db.prepare('SELECT target_id FROM friends WHERE user_id=? AND character_id=?').all(user.id,cid).map(f=>({id:f.target_id,...findCharacter(f.target_id)})),
      chat:db.prepare("SELECT chat.*,users.name FROM chat JOIN users ON users.id=chat.user_id WHERE channel='world' ORDER BY id DESC LIMIT 50").all().reverse()});
    }
    if(req.method!=='POST')fail(404,'找不到服務。');
    const input=await body(req);
    const result=transaction(()=>{
     const {state,character:c}=actor(user,input.characterId);
     if(route==='/api/skills/utility'){
      const id=int(input.skillId,1,239),data=healingData(),skill=data.skills[id];if(![61,75,165,116,118].includes(id)||!skill||!(c.hp>0))fail(400,'目前不能使用這項技能。');
      if(Date.now()<(healCooldowns.get(c.id+':utility:'+id)||0))fail(409,'技能冷卻中。');
      const kind=[61,75,165].includes(id)?'party':'guild',own=db.prepare('SELECT group_id FROM members WHERE user_id=? AND character_id=? AND kind=?').get(user.id,c.id,kind);if(!own)fail(400,'請先加入'+(kind==='party'?'隊伍':'血盟')+'。');
      if(kind==='guild'&&c.role!=='王族')fail(400,'只有王族可以使用盟友傳送。');
      const member=db.prepare('SELECT user_id,character_id FROM members WHERE group_id=? AND character_id=?').get(own.group_id,input.targetId);if(!member||member.character_id===c.id)fail(400,'無效的同伴目標。');
      const online=presence.get(member.user_id);if(online?.id!==member.character_id||Date.now()-online.at>=12000)fail(400,'目標不在線上，未消耗資源。');
      const other=snapshot(member.user_id),target=other.characters.find(v=>v?.id===member.character_id);if(!target||![c.x,c.y,target.x,target.y].every(Number.isInteger))fail(400,'目標座標無效。');
      if(kind==='party'){if(target.hp>0||(target.mapId||0)!==(c.mapId||0)||Math.max(Math.abs(c.x-target.x),Math.abs(c.y-target.y))>10)fail(400,'請選擇同圖十格內倒下的隊友。');let x=c.x,y=c.y;while(x!==target.x||y!==target.y){const dx=Math.sign(target.x-x),dy=Math.sign(target.y-y);if(data.collision.canTraverse(x,y,dx,dy,c.mapId||0)===false)fail(400,'隊友被障礙物擋住。');x+=dx;y+=dy;}}
      else if(!(target.hp>0))fail(400,'盟友已倒下。');
      if(input.scrollUid){const row=(c.inventory||[]).find(e=>e.uid===input.scrollUid&&!e.slot&&e.count>0),parts=String(row&&data.rules[row.key]?.handler||'').trim().split(/\s+/);if(!row||!/^magicreel\.MagicReel_(Spell|Buff|Armor|Weapon)$/.test(parts[0])||Number(parts[1])!==id)fail(400,'找不到對應卷軸。');row.count--;if(!row.count)c.inventory.splice(c.inventory.indexOf(row),1);}
      else{if(!(c.skills?.ids||[]).includes(id))fail(400,'尚未學會技能。');const intelligence=int(input.int,0,127);let reduction=0;if(intelligence>=8){reduction=5;for(let i=8;i<=intelligence;i++)if(i%3===0||i%3===2)reduction++;reduction=Math.min(30,reduction);}const cost=Math.max(1,Math.floor(skill.mp*(100-reduction)/100)-Math.max(0,Math.min(3,Math.floor(((c.stats?.int||0)-12)/3))));if(c.mp<cost||c.hp<=skill.hp)fail(400,'魔力或體力不足。');if(skill.materialCount){let left=skill.materialCount;for(const row of [...c.inventory])if(row.key==='etcitem:'+skill.material&&!row.slot){const n=Math.min(left,row.count);row.count-=n;left-=n;if(!row.count)c.inventory.splice(c.inventory.indexOf(row),1);if(!left)break;}if(left)fail(400,'材料不足。');}c.mp-=cost;c.hp-=skill.hp;}
      if(kind==='party'){if(!(target.maxHp>0))fail(400,'隊友體力資料無效。');target.hp=id===75?target.maxHp:Math.max(1,Math.floor(target.maxHp/2));}
      else{const from=id===116?target:c,to=id===116?c:target,rule=data.maps[from.mapId||0]?.rules;if(rule&&(!rule.escapable||!rule.teleportable))fail(400,'這個地區不允許盟友傳送。');const step=[[1,0],[-1,0],[0,1],[0,-1]].find(([dx,dy])=>data.collision.canTraverse(to.x,to.y,dx,dy,to.mapId||0));if(!step)fail(400,'盟友附近沒有安全落點。');from.mapId=to.mapId||0;from.x=to.x+step[0];from.y=to.y+step[1];}
      save(member.user_id,other);save(user.id,state);healCooldowns.set(c.id+':utility:'+id,Date.now()+Math.max(1000,skill.reuse));return {targetId:target.id,hp:target.hp};
     }
     if(route==='/api/party/heal'){
      const id=int(input.skillId,1,239),data=healingData(),skill=data.skills[id];if(![49,164].includes(id)||!skill)fail(400,'這項技能不是範圍治癒。');
      if(!(c.hp>0)||!Number.isInteger(c.x)||!Number.isInteger(c.y))fail(400,'角色狀態不能施法。');if(Date.now()<(healCooldowns.get(c.id+':'+id)||0))fail(409,'治癒技能冷卻中。');
      const wis=int(input.wis,0,127),intelligence=int(input.int,0,127);let cost=0;
      if(input.scrollUid){const row=(c.inventory||[]).find(e=>e.uid===input.scrollUid&&!e.slot&&e.count>0),rule=row&&data.rules[row.key],parts=String(rule?.handler||'').trim().split(/\s+/);if(!row||!/^magicreel\.MagicReel_(Spell|Buff|Armor|Weapon)$/.test(parts[0])||Number(parts[1])!==id)fail(400,'找不到對應的治癒卷軸。');row.count--;if(!row.count)c.inventory.splice(c.inventory.indexOf(row),1);}
      else{if(!(c.skills?.ids||[]).includes(id))fail(400,'尚未學會這項技能。');let reduction=0;if(intelligence>=8){reduction=5;for(let i=8;i<=intelligence;i++)if(i%3===0||i%3===2)reduction++;reduction=Math.min(30,reduction);}const original=Math.max(0,Math.min(3,Math.floor(((c.stats?.int||0)-12)/3)));cost=Math.max(1,Math.floor(skill.mp*(100-reduction)/100)-original);if(!(c.mp>=cost))fail(400,'魔力不足。');c.mp-=cost;}
      let raw=skill.damage[0];for(let i=0;i<skill.damage[2];i++)raw+=1+Math.floor(Math.random()*Math.max(1,skill.damage[1]));const amount=Math.max(0,Math.floor(raw*(1+Math.max(0,Math.floor(wis/5)-2)*.05)));
      const maximum=Number(c.maxHp||c.vitalGrowth?.maxHp);if(!(maximum>0))fail(400,'角色體力資料不完整。');c.hp=Math.min(maximum,c.hp+amount);const healed=[];
      const member=db.prepare("SELECT group_id FROM members WHERE user_id=? AND character_id=? AND kind='party'").get(user.id,c.id);
      if(member)for(const row of db.prepare('SELECT user_id,character_id FROM members WHERE group_id=?').all(member.group_id)){
       if(row.character_id===c.id)continue;const presenceRow=presence.get(row.user_id);if(presenceRow?.id!==row.character_id||Date.now()-presenceRow.at>=12000)continue;
       const other=snapshot(row.user_id),target=other.characters.find(v=>v?.id===row.character_id);if(!target||!(target.hp>0)||!Number.isInteger(target.x)||!Number.isInteger(target.y)||(target.mapId||0)!==(c.mapId||0)||Math.max(Math.abs(target.x-c.x),Math.abs(target.y-c.y))>10||!(target.maxHp>0))continue;
       let x=c.x,y=c.y,clear=true;while(x!==target.x||y!==target.y){const dx=Math.sign(target.x-x),dy=Math.sign(target.y-y);if(data.collision.canTraverse(x,y,dx,dy,c.mapId||0)===false){clear=false;break;}x+=dx;y+=dy;}if(!clear)continue;
       target.hp=Math.min(target.maxHp,target.hp+amount);save(row.user_id,other);healed.push({id:target.id,hp:target.hp,maxHp:target.maxHp});
      }
      save(user.id,state);healCooldowns.set(c.id+':'+id,Date.now()+skill.reuse);return {amount,cost,healed};
     }

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
     if(route.startsWith('/api/auction/')&&route!=='/api/auction/cancel'&&(c.level||1)<30)fail(403,'交易所需角色 30 等開放。');
     if(route==='/api/auction/list'){
      const item=removeItem(c,input.itemUid,int(input.count));
      db.prepare("INSERT INTO auctions(seller,character_id,item,price,expires,currency) VALUES(?,?,?,?,?,'diamond')").run(user.id,c.id,JSON.stringify(item),int(input.price),Date.now()+86400000);save(user.id,state);return {};
     }
     if(route==='/api/auction/buy'){
      const auction=db.prepare("SELECT * FROM auctions WHERE id=? AND status='open' AND expires>?").get(int(input.auctionId),Date.now());
      if(!auction||auction.seller===user.id)fail(409,'商品無法購買。');
      const seller=snapshot(auction.seller),sc=seller.characters.find(p=>p?.id===auction.character_id);
      if(!sc)fail(409,'賣家角色不存在。');
      if(auction.currency!=='diamond')fail(409,'舊版天幣商品請由賣家下架後重新上架。');
      const balance=int(c.diamonds||0,0),sellerBalance=int(sc.diamonds||0,0);if(balance<auction.price)fail(400,'鑽石不足。');
      int(sellerBalance+auction.price,0);c.diamonds=balance-auction.price;give(c,JSON.parse(auction.item));sc.diamonds=sellerBalance+auction.price;
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
     // ---- 武魂扭蛋機（2026-11-17）：伺服器擲骰、扣鑽石、發武魂 ----
     if(route==='/api/gacha/wuhun'||route==='/api/gacha/doll'){
      const GACHA=route==='/api/gacha/doll'?DOLL_GACHA:WUHUN_GACHA;
      const count=input.count===10?10:input.count===1?1:fail(400,'召喚次數不正確。'),cost=GACHA.prices[count],balance=int(c.diamonds||0,0);if(balance<cost)fail(400,'鑽石不足，需要 '+cost+' 鑽石。');
      const random=()=>crypto.randomInt(0,1e9)/1e9,results=GACHA.draw(count,random);
      if((c.inventory||[]).length+results.length>179)fail(409,'背包空間不足，請先整理背包。');
      c.diamonds=balance-cost;for(const r of results)give(c,{key:r.key,count:1});save(user.id,state);return {results:results.map(r=>({id:r.id,tier:r.tier}))};
     }
     // ---- 每日任務鑽石（2026-11-17）：完成 1 個每日任務給 10 鑽，每天（清晨 5 點重置）最多 10 次＝100 鑽；任務進度在角色存檔 character.daily ----
     if(route==='/api/daily/claim'){
      const d=new Date(Date.now()-5*3600e3),day=d.getFullYear()+'-'+(d.getMonth()+1)+'-'+d.getDate(),rec=c.dailyDiamond&&c.dailyDiamond.day===day?c.dailyDiamond:{day,n:0};
      if(rec.n>=10)fail(409,'今天的每日任務鑽石已經領滿 100 顆。');rec.n++;c.dailyDiamond=rec;c.diamonds=int((c.diamonds||0)+10,0);save(user.id,state);return {diamonds:c.diamonds,claimed:rec.n};
     }
     // ---- 傭兵團（2026-11-16）----
     if(route.startsWith('/api/merc/')){
      const now=Date.now(),mercView=row=>({id:row.character_id,owner:row.user_id,price:row.price,hires:row.hires,updated:row.updated,busyUntil:row.busy_until>now?row.busy_until:0,...JSON.parse(row.snapshot)});
      if(c.mercContract&&c.mercContract.until<=now&&c.mercContract.mode==='follow')c.mercContract=null;
      if(route==='/api/merc/board'){
       const mine=db.prepare('SELECT * FROM mercenaries WHERE character_id=?').get(c.id);
       return {board:db.prepare('SELECT * FROM mercenaries WHERE user_id<>? AND busy_until<=? ORDER BY updated DESC LIMIT 100').all(user.id,now).map(mercView),mine:mine?mercView(mine):null};
      }
      if(route==='/api/merc/register'){
       const price=int(input.price,MERC.priceMin,MERC.priceMax),weapon=(c.inventory||[]).find(e=>e.slot==='weapon');
       const snap={name:c.name,role:c.role,gender:c.gender,level:int(c.level||1,1,100),maxHp:Number.isSafeInteger(c.maxHp)?c.maxHp:0,stats:c.stats,weapon:weapon?{key:weapon.key,enchant:weapon.enchant||0}:null};
       db.prepare('INSERT INTO mercenaries(character_id,user_id,snapshot,price,hires,updated) VALUES(?,?,?,?,0,?) ON CONFLICT(character_id) DO UPDATE SET snapshot=excluded.snapshot,price=excluded.price,updated=excluded.updated').run(c.id,user.id,JSON.stringify(snap),price,now);return {};
      }
      if(route==='/api/merc/withdraw'){const r=db.prepare('SELECT busy_until FROM mercenaries WHERE character_id=? AND user_id=?').get(c.id,user.id);if(r&&r.busy_until>now)fail(409,'傭兵正在被雇用中，合約結束後才能撤下。');db.prepare('DELETE FROM mercenaries WHERE character_id=? AND user_id=?').run(c.id,user.id);return {};}
      if(route==='/api/merc/hire'){
       const hours=int(input.hours,1,8);if(!MERC.hours.includes(hours))fail(400,'雇用時數不正確。');
       const mode=input.mode==='mission'?'mission':'follow',mission=mode==='mission'?MERC.missions.find(m=>m.id===input.missionId):null;if(mode==='mission'&&!mission)fail(400,'請選擇任務。');
       if(c.mercContract&&(c.mercContract.mode==='follow'?c.mercContract.until>now:!c.mercContract.claimed))fail(409,'你已經雇用了一名傭兵，請等合約結束或解約。');
       const row=db.prepare('SELECT * FROM mercenaries WHERE character_id=?').get(text(input.mercId,80));if(!row)fail(409,'這名傭兵已經撤下。');if(row.user_id===user.id)fail(409,'不能雇用自己的角色。');if(row.busy_until>now)fail(409,'這名傭兵已被其他玩家雇用，請選別的傭兵。');
       const owner=snapshot(row.user_id),oc=owner.characters.find(p=>p?.id===row.character_id);if(!oc){db.prepare('DELETE FROM mercenaries WHERE character_id=?').run(row.character_id);fail(409,'傭兵角色已不存在。');}
       const cost=int(row.price*hours),fee=Math.floor(cost*MERC.feeRate),balance=int(c.diamonds||0,0);if(balance<cost)fail(400,'鑽石不足，需要 '+cost+' 鑽石。');
       c.diamonds=balance-cost;oc.diamonds=int((oc.diamonds||0)+cost-fee,0);const points=MERC.points(hours);oc.mercPoints=int((oc.mercPoints||0)+points,0);
       const snap=JSON.parse(row.snapshot);c.mercContract={id:crypto.randomUUID(),mercId:row.character_id,...snap,mode,missionId:mission?.id||null,hours,cost,start:now,until:now+hours*3600000,claimed:false};
       db.prepare('UPDATE mercenaries SET hires=hires+1,busy_until=?,hired_by=? WHERE character_id=?').run(c.mercContract.until,c.id,row.character_id);
       save(user.id,state);save(row.user_id,owner);
       deliver(null,row.user_id,'傭兵團：'+oc.name+' 被雇用了',c.name+' 雇用了你的角色 '+oc.name+' '+hours+' 小時（'+(mode==='mission'?'任務：'+mission.name:'跟隨打怪')+'）。 收入 '+(cost-fee)+' 鑽石（公會手續費 '+fee+'），傭兵點數 +'+points+'。',[]);
       return {contract:c.mercContract};
      }
      if(route==='/api/merc/dismiss'){if(!c.mercContract)fail(409,'目前沒有雇用傭兵。');if(c.mercContract.mercId)db.prepare('UPDATE mercenaries SET busy_until=0,hired_by=NULL WHERE character_id=? AND hired_by=?').run(c.mercContract.mercId,c.id);c.mercContract=null;save(user.id,state);return {};}
      if(route==='/api/merc/claim'){
       const k=c.mercContract;if(!k||k.mode!=='mission'||k.claimed)fail(409,'沒有可領取的任務。');if(k.until>now)fail(409,'任務尚未完成。');if(k.mercId)db.prepare('UPDATE mercenaries SET busy_until=0,hired_by=NULL WHERE character_id=? AND hired_by=?').run(k.mercId,c.id);
       const reward=MERC.missionReward(k.level,k.hours,k.missionId);if(reward.gold)give(c,{key:'etcitem:40308',count:reward.gold});c.mercContract=null;save(user.id,state);return {reward};
      }
      if(route==='/api/merc/shop'){
       const item=MERC.shop.find(x=>x.id===input.itemId);if(!item)fail(400,'商品不存在。');const points=int(c.mercPoints||0,0);if(points<item.cost)fail(400,'傭兵點數不足。');
       c.mercPoints=points-item.cost;give(c,{key:item.key,count:item.count});save(user.id,state);return {};
      }
      fail(404,'找不到服務。');
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
