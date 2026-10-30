// 二轉後端補丁 advance-class.sql 的隔離 PostgreSQL（PGlite）測試；只在記憶體，絕不連正式 Supabase。
// 沿用 test-mercenary-rune-drops-db.js 的假資料表與角色設定。用法：node tools/test-advance-db.js
const fs = require('fs'), path = require('path');
const src = fs.readFileSync(path.join(__dirname, 'test-mercenary-rune-drops-db.js'), 'utf8');
const pre = src.split('const load=')[0];
const body = String.raw`
 const load=async f=>db.exec(fs.readFileSync(path.join(__dirname,f),'utf8'));
 await load('server-loot.sql');await load('loot-catalog.sql');await load('loot-batch.sql');await load('loot-screen.sql');await load('treasure-maps.sql');await load('mercenary-rune-drops.sql');
 const before=(await db.query('select version,data from dragon_loot_catalog where id=1')).rows[0];
 await load('advance-class.sql');
 const cat=(await db.query('select version,data from dragon_loot_catalog where id=1')).rows[0];
 await load('advance-class.sql');   // 可重跑
 const again=(await db.query('select version,data from dragon_loot_catalog where id=1')).rows[0];
 assert.equal(again.version,cat.version);assert.deepEqual(again.data,cat.data);
 const c=cat.data;
 assert(c.mercRunes,'傭兵符石設定要保留');assert.deepEqual(c.mercRunes,before.data.mercRunes);
 for(const cls of Object.keys(before.data.quests)){
  assert.equal(c.quests[cls].length,7,cls);assert.deepEqual(c.quests[cls].slice(0,4),before.data.quests[cls].slice(0,4));
  assert.equal(c.quests[cls][4].type,'bossCollect');assert.equal(c.quests[cls][5].type,'boss');assert(c.questBosses[cls][5]&&c.questBosses[cls][6]);
  assert(c.items[c.quests[cls][4].item]);
 }
 for(const [id,d] of Object.entries(before.data.items)){if(d.cat==='book'&&d.classes){assert(Number.isInteger(c.items[id].bookLv)&&c.items[id].bookLv<=55,id);continue;}assert.deepEqual(c.items[id],d);}
 assert(c.items.advReshape);assert.equal(c.items.book_adv_mFrost_1.bookLv,60);assert.equal(c.items.book_adv_mFrost_2.bookLv,70);assert(!('price' in c.items.book_adv_mFrost_1));assert.equal(c.advance.reshapeLv,70);
 assert.deepEqual((await db.query('select data from dragon_loot_rules where version=$1',[before.version])).rows[0].data,before.data,'舊規則快照保留');
 // loot_roll 尾端接上 loot_adv；spawn 帶 adv
 const fn=async n=>(await db.query("select pg_get_functiondef(p.oid) s from pg_proc p join pg_namespace ns on ns.oid=p.pronamespace where ns.nspname='public' and p.proname=$1",[n])).rows.map(r=>r.s).join(' ');
 assert((await fn('loot_roll')).includes('public.loot_adv(c,x)'));assert((await fn('loot_roll')).includes('public.loot_merc_rune(c,x)'));
 for(const n of ['loot_spawn','loot_spawn_screen'])assert((await fn(n)).includes("'adv',p->'adv'"),n);
 const roll=async(cc,x,n=1,f='loot_adv')=>(await db.query('select public.'+f+'($1::jsonb,$2::jsonb) v from generate_series(1,$3)',[JSON.stringify(cc),JSON.stringify(x),n])).rows.flatMap(r=>r.v||[]);
 const proof=c.quests.knight[4].item;
 const mk=(boss,lv,ch,active,inv=[],adv)=>({monster:{lv,boss,drops:[]},zone:{id:'tower',drops:[]},player:{cls:'knight',quests:{ch,active},inv,adv},map:null});
 // 職業之證：只有第 5 章進行中、首領才掉；約 20%；集滿 5 個不再掉
 assert.equal((await roll(c,mk(false,80,4,true),2000)).filter(i=>i.id===proof).length,0);
 assert.equal((await roll(c,mk(true,80,4,false),2000)).filter(i=>i.id===proof).length,0);
 assert.equal((await roll(c,mk(true,80,3,true),2000)).filter(i=>i.id===proof).length,0);
 const got=(await roll(c,mk(true,60,4,true),5000)).filter(i=>i.id===proof);assert(got.length>850&&got.length<1150,'職業之證約20% '+got.length);
 assert(got.every(i=>i.questMax===5&&i.n===1));
 assert.equal((await roll(c,mk(true,60,4,true,[{id:proof,n:5}]),2000)).filter(i=>i.id===proof).length,0);
 // 命運重塑石：Lv.70 以上首領 0.3%
 const rs=(await roll(c,mk(true,75,0,false),100000)).filter(i=>i.id==='advReshape').length;assert(rs>200&&rs<420,'重塑石 '+rs);
 assert.equal((await roll(c,mk(true,69,0,false),20000)).filter(i=>i.id==='advReshape').length,0);
 assert.equal((await roll(c,mk(false,90,0,false),20000)).filter(i=>i.id==='advReshape').length,0);
 // 天下：5% 多 1 個通貨；其他分支沒有
 const cur=x=>x.filter(i=>c.items[i.id]&&c.items[i.id].cat==='currency').length;
 const w=cur(await roll(c,mk(false,60,0,false,[],{br:'rWorld'}),20000));assert(w>800&&w<1200,'天下通貨 '+w);
 assert.equal(cur(await roll(c,mk(false,60,0,false,[],{br:'rTyrant'}),5000)),0);
 // 舊規則快照不會抽到二轉
 assert.equal((await roll(before.data,mk(true,80,4,true),500)).length,0);
 // 整合：loot_roll 會帶出職業之證
 const forced=structuredClone(c);forced.quests.knight[4].p=1;
 assert((await roll(forced,{...mk(true,60,4,true),monster:{lv:60,boss:true,drops:[],id:'x'}},5,'loot_roll')).filter(i=>i.id===proof).length===5);
 // 真實 spawn RPC：憑證情境帶 adv
 const player={created:123,cls:'royal',lv:80,inv:[],quests:{ch:0,active:false,prog:0},adv:{br:'rWorld'},loc:{type:'zone',id:'island'},mapRun:null,towerMax:100};
 await db.query('insert into dragon_saves values($1,0,$2,1)',[uuid,{schema:22,lootProtocol:1,lootCursor:0,player}]);
 await db.exec('update dragon_loot_config set enabled=true');await db.query("select set_config('request.jwt.claim.sub',$1,false)",[uuid]);
 await db.exec('set role authenticated');
 await assert.rejects(()=>db.query('select public.loot_adv($1::jsonb,$2::jsonb)',[JSON.stringify(c),'{}']),/permission denied/);
 await db.query('select public.loot_spawn($1,$2,$3,$4,$5) v',[0,'123|royal',crypto.randomUUID(),false,'goblin']);
 await db.exec('reset role');
 const jobs=(await db.query('select context from dragon_loot_jobs')).rows;assert(jobs.length&&jobs.every(r=>r.context.player.adv&&r.context.player.adv.br==='rWorld'));
 console.log('test-advance-db OK：目錄合併可重跑、職業之證／重塑石／天下機率、loot_roll 與 spawn 補丁');
}
main().catch(e=>{console.error(e);process.exit(1);});
`;
new Function('require', '__dirname', 'process', pre + body)(require, __dirname, process);
