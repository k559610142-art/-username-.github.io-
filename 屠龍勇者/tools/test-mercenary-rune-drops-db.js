// 真正PostgreSQL(PGlite)隔離測試；僅記憶體，絕不連正式Supabase。
const fs=require('fs'),path=require('path'),assert=require('assert/strict');
const runtime=process.env.LOOT_TEST_RUNTIME||path.join(require('os').tmpdir(),'dark-loot-test-runtime/node_modules/@electric-sql/pglite');
const {PGlite}=require(runtime);
const uuid='11111111-1111-4111-8111-111111111111',other='22222222-2222-4222-8222-222222222222';
async function main(){
 const db=new PGlite();
 await db.exec(`create role anon;create role authenticated;create schema auth;
 create function auth.uid() returns uuid language sql as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;
 grant usage on schema public,auth to anon,authenticated;
 create table public.dragon_saves(user_id uuid,slot int,data jsonb,client_t bigint,primary key(user_id,slot));
 create table public.raid_rooms(id uuid primary key,round int,raid text,status text,result jsonb);
 create table public.raid_members(room_id uuid,user_id uuid,char_id text,ready_round int);
 create function public.dragon_is_banned() returns boolean language sql as $$select coalesce(current_setting('test.banned',true),'')='yes'$$;
 create function public.dragon_save_ok(uuid,int) returns boolean language sql as $$select true$$;
 create table public.test_diamonds(n int);insert into public.test_diamonds values(0);
 create function public.dia_drop(text) returns json language plpgsql as $$begin update public.test_diamonds set n=n+1;return json_build_object('diamonds',(select n from public.test_diamonds),'got',1);end$$;
 create table public.test_wb(id bigint primary key);
 create function public.wb_claim(bigint) returns json language plpgsql as $$begin insert into public.test_wb values($1);return '{"killed":true,"rank":1,"killer_me":true,"my_dmg":100,"total":100}'::json;end$$;
 `);

 const load=async f=>db.exec(fs.readFileSync(path.join(__dirname,f),'utf8'));
 await load('server-loot.sql');await load('loot-catalog.sql');await load('loot-screen.sql');await load('treasure-maps.sql');
 const old=(await db.query('select data from dragon_loot_catalog where id=1')).rows[0].data;
 await load('mercenary-rune-drops.sql');
 const cat=(await db.query('select data from dragon_loot_catalog where id=1')).rows[0].data;
 await load('mercenary-rune-drops.sql');assert.deepEqual((await db.query('select data from dragon_loot_catalog where id=1')).rows[0].data,cat);
 assert.equal(cat.mercRunes.basic.length,24);assert.equal(cat.mercRunes.special.length,26);
 for(const [id,d] of Object.entries(old.items))assert.deepEqual(cat.items[id],d);
 assert.deepEqual((await db.query('select data from dragon_loot_rules where version=$1',[old.version])).rows[0].data,old);
 const x={monster:{lv:10,boss:false,drops:[]},zone:{id:'island',drops:[]},player:{cls:'knight'},map:{t:1,q:'rare',mods:[]}};
 const roll=async(c,x,n=1,fn='loot_merc_rune')=>(await db.query('select public.'+fn+'($1::jsonb,$2::jsonb) v from generate_series(1,$3)',[JSON.stringify(c),JSON.stringify(x),n])).rows.flatMap(r=>r.v);
 const forced=structuredClone(cat);forced.mercRunes.normalP=1;forced.mercRunes.bossP=1;
 const basic=await roll(forced,x,2000);assert.equal(basic.length,2000);assert.equal(new Set(basic.map(i=>i.id)).size,24);assert(basic.every(i=>cat.mercRunes.basic.includes(i.id)&&i.n===1));
 x.monster.boss=true;
 const special=await roll(forced,x,2000);assert.equal(new Set(special.map(i=>i.id)).size,26);assert(special.every(i=>cat.mercRunes.special.includes(i.id)&&i.n===1));
 for(const q of [null,'magic','legend']){x.map.q=q;assert.equal((await roll(forced,x,10)).length,0);}
 x.map.q='rare';x.map.treasure=true;assert.equal((await roll(forced,x,10)).length,0);delete x.map.treasure;
 assert.equal((await roll(old,x,10)).length,0,'舊規則憑證不得補抽');
 const world={...x,map:null};assert.equal((await roll(forced,world,10)).length,0);
 world.mercRaid=true;assert((await roll(forced,world,10)).every(i=>cat.mercRunes.special.includes(i.id)));
 x.monster.boss=false;
 const normals=await roll(cat,x,100000);assert(normals.length>55&&normals.length<160);
 x.monster.boss=true;const bosses=await roll(cat,x,20000);assert(bosses.length>800&&bosses.length<1200);
 const integrated=await roll(forced,x,20,'loot_roll');assert.equal(integrated.filter(i=>i.id.startsWith('mercRune_')).length,20);
 x.map={t:8,q:'legend',treasure:true,mods:[]};const treasure=await roll(forced,x,20,'loot_roll');assert(treasure.every(i=>cat.items[i.id].cat==='currency'));
 // 真實憑證與團隊領獎RPC；只修改隔離測試目錄使機率100%。
 await db.query('update dragon_loot_catalog set data=$1 where id=1',[forced]);await db.query('update dragon_loot_rules set data=$1 where version=$2',[forced,cat.version]);
 const player={created:123,cls:'knight',lv:80,inv:[],quests:{ch:0,active:false,prog:0},loc:{type:'zone',id:'island'},mapRun:{zone:'island',t:1,q:'rare',mods:[],left:100},towerMax:100};
 await db.query('insert into dragon_saves values($1,0,$2,1)',[uuid,{schema:19,lootProtocol:1,lootCursor:0,player}]);
 await db.exec('update dragon_loot_config set enabled=true');await db.query("select set_config('request.jwt.claim.sub',$1,false)",[uuid]);
 const rpc=async(fn,args)=>(await db.query('select public.'+fn+'('+args.map((_,i)=>'$'+(i+1)).join(',')+') v',args)).rows[0].v;
 await db.exec('set role authenticated');
 await assert.rejects(()=>rpc('loot_merc_rune',[forced,x]),/permission denied/);
 const spawned=await rpc('loot_spawn',[0,'123|knight',crypto.randomUUID(),false,'goblin']);
 const screen=await rpc('loot_spawn_screen',[0,'123|knight',crypto.randomUUID(),['goblin'],'blizzard']);
 await db.exec('reset role');
 const jobs=(await db.query('select context from dragon_loot_jobs')).rows;assert(jobs.every(r=>r.context.map.q==='rare'));
 // 出怪後離開黃圖，憑證仍依原情境；重試相同收據不重抽。
 player.mapRun=null;player.loc={type:'town',id:'talking'};
 await db.query('update dragon_saves set data=$1 where user_id=$2',[{schema:19,lootProtocol:1,lootCursor:0,player},uuid]);
 await db.exec("update dragon_loot_jobs set created_at=clock_timestamp()-interval '1 second';set role authenticated");
 const receipt=await rpc('loot_finish',[screen[0].ticket]);assert(receipt.items.some(i=>cat.mercRunes.basic.includes(i.id)));
 assert.deepEqual(await rpc('loot_finish',[screen[0].ticket]),receipt);await db.exec('reset role');
 const room=crypto.randomUUID();await db.query('insert into raid_rooms values($1,1,$2,$3,$4)',[room,'drake','fighting',{win:true,members:[{uid:uuid}]}]);
 await db.query('insert into raid_members values($1,$2,$3,1)',[room,uuid,'123|knight']);
 await db.exec('set role authenticated');const raid=await rpc('loot_raid',[0,'123|knight',room,1]);
 assert.equal(raid.items.filter(i=>cat.mercRunes.special.includes(i.id)).length,1);assert.deepEqual(await rpc('loot_raid',[0,'123|knight',room,1]),raid);
 await assert.rejects(()=>rpc('loot_raid',[0,'123|knight',room,2]),/not won/);
 await db.exec('reset role');await db.query('update raid_rooms set round=2,result=$1 where id=$2',[{win:false,members:[{uid:uuid}]},room]);
 await db.exec('set role authenticated');await assert.rejects(()=>rpc('loot_raid',[0,'123|knight',room,2]),/not won/);await db.exec('reset role');
 await db.close();console.log('PASS：SQL可重跑／保留舊目錄與快照／24與26全池／10萬次0.1%與2萬次5%／排除其他地圖與財寶／出怪品質快照／實際副本特殊符石／重領不重抽／失敗無獎勵／內部函式無權限。');
}
main().catch(e=>{console.error(e.message,e.where||'');process.exit(1)});
