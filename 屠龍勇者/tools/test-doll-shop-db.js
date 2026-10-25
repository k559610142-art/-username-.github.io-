// tools/gm-give.sql 的 PostgreSQL(PGlite)隔離測試；僅記憶體，絕不連正式Supabase。
// 執行：node tools/test-gm-give.js（PGlite 路徑同 test-server-loot-db.js，可用 LOOT_TEST_RUNTIME 指定）
const fs=require('fs'),path=require('path'),assert=require('assert/strict');
const runtime=process.env.LOOT_TEST_RUNTIME||path.join(require('os').tmpdir(),'dark-loot-test-runtime/node_modules/@electric-sql/pglite');
const {PGlite}=require(runtime);
const gm='11111111-1111-4111-8111-111111111111',pl='22222222-2222-4222-8222-222222222222';
async function main(){
 const db=new PGlite();
 await db.exec(`create role anon;create role authenticated;create schema auth;
 create table auth.users(id uuid primary key,email text);
 insert into auth.users values('${gm}','gm@test.com'),('${pl}','Player@Test.com');
 create function auth.uid() returns uuid language sql as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;
 create function auth.jwt() returns jsonb language sql as $$select jsonb_build_object('email',(select email from auth.users where id=auth.uid()))$$;
 grant usage on schema public,auth to anon,authenticated;
 create table public.dragon_admins(user_id uuid primary key);insert into public.dragon_admins values('${gm}');
 create function public.dragon_is_admin() returns boolean language sql security definer as $$select exists(select 1 from public.dragon_admins where user_id=auth.uid())$$;
 grant execute on function public.dragon_is_admin() to authenticated;
 create table public.dragon_vault_items(id bigserial primary key,user_id uuid not null references auth.users(id),from_slot smallint not null,uid int not null,item_id text not null,item jsonb not null,name text,put_at timestamptz not null default now(),taken_at timestamptz);
 create table public.dragon_vault(user_id uuid primary key references auth.users(id),gold bigint not null default 0 check(gold>=0));
 create table public.dragon_loot_catalog(id int primary key,version text,data jsonb);
 insert into public.dragon_loot_catalog values(1,'t','{"items":{"redPotion":{"name":"治癒藥水","cat":"potion","stack":true},"dagger":{"name":"匕首","cat":"weapon","stack":false},"q_bone":{"name":"骨頭","cat":"quest","stack":true}}}');
 `);

 await db.exec('create table public.dragon_saves(user_id uuid,slot int,data jsonb,updated_at timestamptz default now(),name text,lv int,client_t bigint,primary key(user_id,slot));');
 await db.exec(fs.readFileSync(path.join(__dirname,'vault.sql'),'utf8'));
 const sql=fs.readFileSync(path.join(__dirname,'doll-shop.sql'),'utf8');await db.exec(sql);await db.exec(sql);
 const query=async(s,a=[])=>(await db.query(s,a)).rows;
 const as=async uid=>db.exec('reset role;set role authenticated;select set_config(\'request.jwt.claim.sub\',\''+uid+'\',false)');
 const buy=async(id,price,key)=>(await query('select public.doll_shop_buy($1,$2,$3) v',[id,price,key]))[0].v;
 const id='doll_frost-dragon',key='aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
 await as(pl);assert.equal((await query('select public.doll_shop_status() v'))[0].v.items.length,21);assert.equal((await query('select public.doll_shop_status() v'))[0].v.canBuy,false);await assert.rejects(()=>buy(id,500,key),/not admin/);
 await assert.rejects(()=>query('select * from public.dragon_doll_shop_catalog'),/permission denied/);
 await db.exec('reset role;set role anon');assert.equal((await query('select public.doll_shop_status() v'))[0].v.canBuy,false);await assert.rejects(()=>buy(id,500,key),/permission denied/);
 await db.exec('reset role');await query('insert into public.dragon_wallet(user_id,diamonds)values($1,1000)',[gm]);
 await as(gm);let status=(await query('select public.doll_shop_status() v'))[0].v;assert(status.canBuy);assert(status.items.every(x=>x.price===500));
 let r=await buy(id,500,key);assert.equal(r.diamonds,500);const vaultId=r.vaultId;
 r=await buy(id,500,key);assert.equal(r.diamonds,500);assert.equal(r.vaultId,vaultId);await assert.rejects(()=>buy('doll_white-tiger',500,key),/request mismatch/);
 await assert.rejects(()=>buy(id,1,'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb'),/price changed/);
 await assert.rejects(()=>buy('redPotion',500,'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb'),/unknown doll/);
 await buy(id,500,'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb');await assert.rejects(()=>buy(id,500,'cccccccc-cccc-4ccc-8ccc-cccccccccccc'),/not enough diamonds/);
 await db.exec('reset role');assert.equal((await query('select count(*)::int n from public.dragon_doll_shop_orders'))[0].n,2);assert.equal((await query('select count(*)::int n from public.dragon_dia_log'))[0].n,2);
 let items=await query('select item from public.dragon_vault_items order by id');assert.deepEqual(items[0].item,{id,n:1,ench:0});
 await query('update public.dragon_wallet set diamonds=20000 where user_id=$1',[gm]);
 await as(gm);for(let i=0;i<status.items.length;i++){const k='dddddddd-dddd-4ddd-8ddd-'+String(i).padStart(12,'0');await buy(status.items[i].id,500,k);}
 await db.exec('reset role');assert.equal((await query('select count(*)::int n from public.dragon_doll_shop_orders'))[0].n,23);assert.equal((await query('select diamonds from public.dragon_wallet where user_id=$1',[gm]))[0].diamonds,9500);
 await query('insert into public.dragon_vault_items(user_id,from_slot,uid,item_id,item,name) select $1,-1,0,$2,$3,$4 from generate_series(1,177)',[gm,id,{id,n:1,ench:0},'test']);
 await as(gm);await assert.rejects(()=>buy(id,500,'eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee'),/vault full/);
 await db.exec('reset role');assert.equal((await query('select diamonds from public.dragon_wallet where user_id=$1',[gm]))[0].diamonds,9500);
 await query('update public.dragon_doll_shop_catalog set price=600 where id=$1',[id]);await db.exec(sql);assert.equal((await query('select price from public.dragon_doll_shop_catalog where id=$1',[id]))[0].price,600,'重跑保留管理者調整價格');
 console.log('PASS DB: rerunnable / 21 products / default500 / player-anon denied / GM purchase / vault item / repeat request / price and unknown-item checks / insufficient funds / full vault rollback / all21 purchase');
 await db.close();
}
main().catch(e=>{console.error(e);process.exit(1);});
