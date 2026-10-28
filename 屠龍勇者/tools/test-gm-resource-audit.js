// GM合法資源核對：隔離PGlite載入正式SQL＋新增量，不連正式主機（第221節）。
const fs = require('fs'), path = require('path'), assert = require('assert/strict');
const { PGlite } = require(process.env.LOOT_TEST_RUNTIME || path.join(require('os').tmpdir(), 'dark-loot-test-runtime/node_modules/@electric-sql/pglite'));
(async () => {
    const db = new PGlite();
    await db.exec(`create role anon;create role authenticated;create role service_role;
    create schema auth;create table auth.users(id uuid primary key,email text);create table auth.sessions(id uuid primary key,user_id uuid);
    create function auth.uid() returns uuid language sql as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;
    create function auth.jwt() returns jsonb language sql as $$select jsonb_build_object('email','test@invalid','role','authenticated')$$;
    create function auth.role() returns text language sql as $$select 'authenticated'::text$$;
    grant usage on schema public,auth to anon,authenticated;`);
    for (const file of ['supabase.sql', 'anticheat.sql', 'server-loot-install.sql', 'vault-v2.sql', 'market-v2.sql', 'flag-trust.sql', 'gm-resource-audit.sql', 'gm-resource-audit.sql']) {
        let sql = fs.readFileSync(path.join(__dirname, file), 'utf8');
        if (file === 'supabase.sql') sql = sql.replace(/create extension if not exists pgcrypto;/i, '');
        try { await db.exec(sql); } catch (e) { console.error('Failed migration:', file, e.message); throw e; }
    }

 const A='aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',B='bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',G='cccccccc-cccc-4ccc-8ccc-cccccccccccc';
 await db.query('insert into auth.users values($1,$2),($3,$4),($5,$6)',[A,'a@invalid',B,'b@invalid',G,'gm@invalid']);await db.query('insert into public.dragon_admins(user_id) values($1)',[G]);
 const stats={str:18,dex:12,con:16,int:8,wis:9,cha:12};
 const as=async(u,sql,args=[])=>{await db.exec("select set_config('request.jwt.claim.sub','"+u+"',false);set role authenticated");try{return(await db.query(sql,args)).rows;}finally{await db.exec('reset role');}};
 const call=async(u,sql,args)=>(await as(u,sql,args))[0].v;
 const save=async(u,slot=0)=>(await db.query('select data from public.dragon_saves where user_id=$1 and slot=$2',[u,slot])).rows[0].data;
 const upload=async(u,slot,data,minutes=0)=>{data.sig=(await db.query('select public.dragon_save_sig($1,$2,$3) v',[u,slot,data.player])).rows[0].v;return as(u,'update public.dragon_saves set data=$1,client_t=floor(extract(epoch from now())*1000+$4)::bigint where user_id=$2 and slot=$3',[data,u,slot,minutes*60000]);};
 const mk=async(u,slot,created,gold,inv=[])=>{await db.exec("select set_config('request.jwt.claim.sub','"+u+"',false)");const p={created,cls:'knight',name:'角色'+slot,lv:55,exp:0,gold,nextUid:50,inv,storage:[],equip:{},stats,loc:{type:'town',id:'talking'},quests:{ch:0},towerMax:10,marketGot:[]};const sig=(await db.query('select public.dragon_save_sig($1,$2,$3) v',[u,slot,p])).rows[0].v;await as(u,'insert into public.dragon_saves(user_id,slot,name,cls,lv,client_t,data)values($1,$2,$3,$4,55,1,$5)',[u,slot,p.name,p.cls,{schema:20,t:1,player:p,sig,lootProtocol:1,lootCursor:0}]);};
 const flags=async(u,kind)=>Number((await db.query('select count(*) c from public.dragon_flags where user_id=$1 and kind=$2',[u,kind])).rows[0].c);
 const sword={uid:5,id:'longSword',n:1,ench:3};await mk(A,0,1001,50000000,[sword,{uid:6,id:'redPotion',n:10}]);await mk(A,1,1002,1000);await mk(B,0,1003,100000000);
 // 同帳號分身存領千萬金幣與物資，不標金幣暴增，簽章／序號保持正確。
 await call(A,'select public.vault_put2(0,null,null,10000000,null) v');await call(A,'select public.vault_take2(1,null,10000000) v');assert.equal(await flags(A,'gold_rate'),0);
 let d=await save(A,1);assert.equal(d.player.gold,10000900);assert.equal(d.vaultSeq,1);
 const item=await call(A,'select public.vault_put2(0,5,1,null,$1) v',['長劍']);await call(A,'select public.vault_take2(1,$1,null) v',[item.id]);
 const x=(await db.query("select detail from public.dragon_resource_log where kind='vault_withdraw_item'")).rows[0].detail;assert.equal(x.from_slot,0);assert.equal(x.item,'longSword');
 const count=Number((await db.query('select count(*) c from public.dragon_resource_log')).rows[0].c);await assert.rejects(call(A,'select public.vault_take2(1,null,1) v'),/bad amount/);assert.equal(Number((await db.query('select count(*) c from public.dragon_resource_log')).rows[0].c),count,'失敗不產生抵扣');
 // 成交賣款可領到同帳號另一欄位，扣手續費，只認列一次。
 const listed=await call(A,'select public.market_list2(0,6,2,20000000,$1,$2,$3) v',['賣家','藥水','potion']);await call(B,'select public.market_buy2($1,0,$2) v',[listed.id,'買家']);
 d=await save(A,1);d.player.gold+=19000000;d.player.marketGot.push('s'+listed.id);await upload(A,1,d);assert.equal(await flags(A,'gold_rate'),0);await call(A,'select public.market_ack($1,$2) v',[[],[listed.id]]);
 assert.equal(Number((await db.query("select count(*) c from public.dragon_resource_log where kind='market_sale' and ref=$1",[listed.id])).rows[0].c),1);
 // 重傳合法存檔不重複抵扣；同成交搬去另一分身也不能再抵扣。
 await upload(A,1,await save(A,1));d=await save(A,0);d.player.gold+=19000000;d.player.marketGot.push('s'+listed.id);await upload(A,0,d);assert.equal(await flags(A,'gold_rate'),1,'跨角色重領應標記');
 await db.query("delete from public.dragon_flags where user_id=$1 and kind='gold_rate'",[A]);
 d=await save(A,1);d.player.gold+=20000000;d.player.marketGot.push('s999999');await upload(A,1,d);assert.equal(await flags(A,'gold_rate'),1,'虛構成交仍判定');
 // 同一次上傳混入合法收入與作弊增量，只抵扣真實成交，不整筆放行。
 await db.query("delete from public.dragon_flags where user_id=$1 and kind='gold_rate'",[A]);
 const listed2=await call(A,'select public.market_list2(0,6,1,20000000,$1,$2,$3) v',['賣家','藥水','potion']);await call(B,'select public.market_buy2($1,0,$2) v',[listed2.id,'買家']);
 d=await save(A,1);d.player.gold+=39000000;d.player.marketGot.push('s'+listed2.id);await upload(A,1,d);assert.equal(await flags(A,'gold_rate'),1);
 assert.match((await db.query("select detail from public.dragon_flags where user_id=$1 and kind='gold_rate'",[A])).rows[0].detail,/扣除後 \+20000000/);
 // 時間門檻嚴格超過60分鐘；46、60不標記，61標記。
 for(const minutes of [46,60]){await upload(B,0,await save(B),minutes);assert.equal(await flags(B,'clock'),0);}await upload(B,0,await save(B),61);assert.equal(await flags(B,'clock'),1);
 // 合法交易不略過能力／經驗／改檔檢查。
 d=await save(A,1);d.player.stats.str=45;await upload(A,1,d);assert.equal(await flags(A,'stat'),1);
 // 不可偽造資金紀錄，內部commit不可直接呼叫，玩家看不到帳本，GM可查。
 assert.equal((await as(A,'select * from public.dragon_resource_log')).length,0);
 await assert.rejects(as(A,"insert into public.dragon_resource_log(user_id,slot,char_id,kind,gold_delta)values($1,0,'x','market_sale',99999999)",[A]),/permission denied/);
 await assert.rejects(call(A,"select public.dragon_resource_commit(0,$1,'vault_withdraw_gold',null,'{}') v",[(await save(A)).player]),/permission denied/);
 assert((await as(G,'select * from public.dragon_resource_log')).length>0);
 // 世界首領Lv55上限42800：24240完整入帳；超限仍截斷並標記，原三次限制維持。
 await db.exec("select set_config('request.jwt.claim.sub','"+B+"',false)");const wb=await call(B,'select public.wb_current() v');const wid=wb.id;assert(wid,'世界首領已建立');await db.query('update public.dragon_wb set hp=1000000,max_hp=1000000 where id=$1',[wid]);
 const hit=await call(B,"select public.wb_attack($1,24240,'玩家','knight') v",[wid]);assert.equal(hit.dmg,24240);assert.equal(hit.capped,false);assert.equal(await flags(B,'wb_dmg'),0);
 const high=await call(B,"select public.wb_attack($1,999999,'玩家','knight') v",[wid]);assert.equal(high.dmg,42800);assert.equal(high.capped,true);assert.equal(await flags(B,'wb_dmg'),1);
 await call(B,"select public.wb_attack($1,1,'玩家','knight') v",[wid]);await assert.rejects(call(B,"select public.wb_attack($1,1,'玩家','knight') v",[wid]),/no attempts/);
 // 再安裝不改變已認列收入，也不清除可疑紀錄。
 const sales=Number((await db.query("select count(*) c from public.dragon_resource_log where kind='market_sale'")).rows[0].c);await db.exec(fs.readFileSync(path.join(__dirname,'gm-resource-audit.sql'),'utf8'));assert.equal(Number((await db.query("select count(*) c from public.dragon_resource_log where kind='market_sale'")).rows[0].c),sales);assert.equal(await flags(B,'clock'),1);
 await db.close();console.log('PASS：真實RPC同帳號分身千萬金幣／物資、交易賣款一次抵扣、重送／跨分身／假成交、失敗回滾、46／60／61分鐘、能力檢查、RLS／內部權限、首領24240／42800上限與重跑保留。');
})().catch(e=>{console.error(e);process.exit(1);});

