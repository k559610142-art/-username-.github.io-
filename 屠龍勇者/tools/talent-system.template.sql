-- 命運星盤增量：先有server-loot、loot-batch、vault-v2及既有所有掉寶增量。
-- 由使用者在Supabase執行；本檔不連線。請執行產生後的talent-system.sql。
begin;
do $$begin
 if to_regprocedure('public.dragon_vault_commit(integer,jsonb)') is null or to_regprocedure('public.loot_finish_batch(uuid,uuid[])') is null then raise exception '請先完成vault-v2與loot-batch；不要略過前置安裝';end if;
end $$;
create table if not exists public.dragon_talent_trials(user_id uuid not null,char_id text not null,trial text not null,primary key(user_id,char_id,trial));
create table if not exists public.dragon_talent_state(user_id uuid not null,char_id text not null,data jsonb not null default '{"nodes":[],"jewels":{}}',primary key(user_id,char_id));
create table if not exists public.dragon_talent_ops(user_id uuid not null,op uuid not null,char_id text not null,args jsonb not null,result jsonb not null,primary key(user_id,op));
alter table public.dragon_talent_trials enable row level security;
alter table public.dragon_talent_state enable row level security;
alter table public.dragon_talent_ops enable row level security;
revoke all on public.dragon_talent_trials,public.dragon_talent_state,public.dragon_talent_ops from public,anon,authenticated;

do $catalog$
declare c public.dragon_loot_catalog;d jsonb;cfg jsonb:=$talent_cfg$__TALENT_CONFIG__$talent_cfg$::jsonb;v text;
begin
 select * into c from public.dragon_loot_catalog where id=1 for update;if not found then raise exception '缺少後端掉寶目錄';end if;
 if c.data->'talentSystem'->>'version'=cfg->>'version' then return;end if;
 d:=jsonb_set(c.data,'{items}',(c.data->'items')||(cfg->'items'));d:=jsonb_set(d,'{talentSystem}',cfg);
 v:=c.version||'-'||(cfg->>'version');d:=jsonb_set(d,'{version}',to_jsonb(v));
 insert into public.dragon_loot_rules(version,data) values(c.version,c.data) on conflict do nothing;
 insert into public.dragon_loot_rules(version,data) values(v,d) on conflict do nothing;
 update public.dragon_loot_catalog set version=v,data=d where id=1;
end $catalog$;

create or replace function public.talent_graph(t jsonb,cfg jsonb) returns jsonb language plpgsql stable set search_path='' as $$
declare nodes jsonb:=cfg->'nodes';edges jsonb:=cfg->'edges';slot record;j jsonb;n jsonb;b jsonb;
begin
 for slot in select * from jsonb_each(coalesce(t->'jewels','{}')) loop
  j:=cfg->'jewels'->(slot.value->>'id');
  if j->>'type'='cluster' then
   for b in select * from jsonb_array_elements(j->'branch') loop
    n:=replace(b::text,'@',slot.key)::jsonb;
    nodes:=nodes||jsonb_build_object(n->>'id',n||jsonb_build_object('socketId',slot.key));
    edges:=edges||jsonb_build_array(jsonb_build_array(n->>'requires',n->>'id'));
   end loop;
  end if;
 end loop;return jsonb_build_object('nodes',nodes,'edges',edges);
end $$;

create or replace function public.talent_valid(t jsonb,lv int,uid uuid,ch text,cfg jsonb) returns boolean language plpgsql stable security definer set search_path='' as $$
declare graph jsonb;nodes jsonb;edges jsonb;allocated jsonb:=coalesce(t->'nodes','[]');seen jsonb:='["origin"]';n jsonb;slot record;it jsonb;j jsonb;k text;changed boolean;groups text[]:='{}';counted int;conversions int;limit_points int;
begin
 if jsonb_typeof(allocated)<>'array' or jsonb_typeof(coalesce(t->'jewels','{}'))<>'object' then return false;end if;
 limit_points:=case when lv>=10 then least(lv,99)-9+(select count(*) from public.dragon_talent_trials where user_id=uid and char_id=ch) else 0 end;
 if jsonb_array_length(allocated)>least(100,limit_points) then return false;end if;
 if (select count(distinct v) from jsonb_array_elements(allocated) v)<>jsonb_array_length(allocated) then return false;end if;
 for slot in select * from jsonb_each(coalesce(t->'jewels','{}')) loop
  it:=slot.value;j:=cfg->'jewels'->(it->>'id');
  if not(allocated ? slot.key) or j is null or cfg->'nodes'->slot.key->>'socketType' is distinct from j->>'type' or (it->>'n')::int<>1 or (it->>'uid')::bigint<1 then return false;end if;
 end loop;
 if (select count(*) from jsonb_each(coalesce(t->'jewels','{}')))<>(select count(distinct value->>'uid') from jsonb_each(coalesce(t->'jewels','{}'))) then return false;end if;
 graph:=public.talent_graph(t,cfg);nodes:=graph->'nodes';edges:=graph->'edges';
 for k in select jsonb_array_elements_text(allocated) loop
  n:=nodes->k;if n is null or k='origin' then return false;end if;
  if n ? 'socketId' and not(allocated ? (n->>'requires')) then return false;end if;
  if coalesce(n->>'exclusiveGroup','')<>'' then if n->>'exclusiveGroup'=any(groups) then return false;end if;groups:=array_append(groups,n->>'exclusiveGroup');end if;
  if n->>'kind'='small' and not(n ? 'socketId') then
   conversions:=0;
   for slot in select * from jsonb_each(coalesce(t->'jewels','{}')) loop
    j:=cfg->'jewels'->(slot.value->>'id');
    if j->>'type'='radius' and power((n->>'x')::numeric-(nodes->slot.key->>'x')::numeric,2)+power((n->>'y')::numeric-(nodes->slot.key->>'y')::numeric,2)<=25600
     and exists(select 1 from jsonb_array_elements(n->'mods') m where m->>0=j->>'from' and (m->>1)::numeric>0) then conversions:=conversions+1;end if;
   end loop;if conversions>1 then return false;end if;
  end if;
 end loop;
 for counted in 1..101 loop
  changed:=false;
  for n in select * from jsonb_array_elements(edges) loop
   if seen ? (n->>0) and allocated ? (n->>1) and not(seen ? (n->>1)) then seen:=seen||jsonb_build_array(n->>1);changed:=true;end if;
   if seen ? (n->>1) and allocated ? (n->>0) and not(seen ? (n->>0)) then seen:=seen||jsonb_build_array(n->>0);changed:=true;end if;
  end loop;exit when not changed;
 end loop;
 return jsonb_array_length(seen)=jsonb_array_length(allocated)+1;
exception when others then return false;
end $$;

create or replace function public.talent_loot_items(c jsonb,x jsonb,trial boolean default false) returns jsonb language plpgsql volatile set search_path='' as $$
declare cfg jsonb:=c->'talentSystem';t int;f numeric;boss boolean:=coalesce((x->'monster'->>'boss')::boolean,false);jp numeric;sp numeric;pool jsonb;it text;r numeric;typ text;q text;size text;out jsonb:='[]';minlv int;
begin
 if cfg is null then return out;end if;
 t:=(x->'map'->>'t')::int;
 if t is null then t:=1;for minlv in select jsonb_array_elements_text(cfg->'tierMin')::int loop if minlv<=(x->'monster'->>'lv')::int then t:=t+1;end if;end loop;t:=t-1;end if;
 t:=greatest(1,least(15,t));f:=(t-1)/14.0;
 jp:=case when trial then .02+.08*f when boss then .01+.04*f else .0002+.0028*f end;
 sp:=case when trial then .05+.15*f when boss then .02+.08*f else .0005+.0045*f end;
 if random()<jp then
  r:=random();typ:=case when r<.7 then 'normal' when r<.8 then 'radius' else 'cluster' end;
  if typ='normal' then q:=case when random()<.7 then 'magic' else 'rare' end;
  elsif typ='cluster' then r:=random();size:=case when r<.6 then 'small' when r<.9 then 'medium' else 'large' end;end if;
  select jsonb_agg(key) into pool from jsonb_each(cfg->'jewels') where value->>'type'=typ and (typ<>'normal' or value->>'quality'=q) and (typ<>'cluster' or value->>'size'=size);
  it:=public.loot_pick(pool)#>>'{}';out:=out||jsonb_build_array(public.loot_item(c,it,1,null,coalesce((x->'monster'->>'lv')::int,1)));
 end if;
 if random()<sp then out:=out||jsonb_build_array(public.loot_item(c,'talentStone',1,null,1));end if;return out;
end $$;

create or replace function public.talent_trial_loot(c jsonb,x jsonb,uid uuid,ch text) returns jsonb language plpgsql volatile security definer set search_path='' as $$
declare tier int;idx int;trial text;inserted text;
begin
 if c->'talentSystem' is null or not coalesce((x->'monster'->>'mapBoss')::boolean,false) then return '[]';end if;
 tier:=(x->'map'->>'t')::int;idx:=array_position(array[1,2,3,4,5,7,9,11,13,15],tier);if idx is null then return '[]';end if;
 trial:='talent-trial-'||idx;
 perform pg_advisory_xact_lock(7713100,hashtext(uid::text));
 insert into public.dragon_talent_trials values(uid,ch,trial) on conflict do nothing returning dragon_talent_trials.trial into inserted;
 if inserted is null then return '[]';end if;
 return jsonb_build_array(jsonb_build_object('id','talentTrial_'||idx,'n',1,'ench',0))||public.talent_loot_items(c,x,true);
end $$;

create or replace function public.talent_save_guard() returns trigger language plpgsql security definer set search_path='' as $$
declare ch text:=(new.data->'player'->>'created')||'|'||(new.data->'player'->>'cls');t jsonb:=new.data->'player'->'talent';expected jsonb;slot record;other jsonb;trial_id text;
begin
 if coalesce(auth.role(),'')<>'authenticated' then return new;end if;
 select data into expected from public.dragon_talent_state where user_id=new.user_id and char_id=ch;
 expected:=coalesce(expected,'{"nodes":[],"jewels":{}}');
 if coalesce(t->'nodes','[]') is distinct from expected->'nodes' or coalesce(t->'jewels','{}') is distinct from expected->'jewels' then raise exception 'talent state conflict' using hint='dragon_vault_seq';end if;
 for trial_id in select jsonb_array_elements_text(coalesce(t->'trials','[]')) loop
  if not exists(select 1 from public.dragon_talent_trials where user_id=new.user_id and char_id=ch and dragon_talent_trials.trial=trial_id) then raise exception 'talent unearned trial';end if;
 end loop;
 for slot in select * from jsonb_each(expected->'jewels') loop
  for other in select value from jsonb_array_elements(coalesce(new.data->'player'->'inv','[]')) union all select value from jsonb_array_elements(coalesce(new.data->'player'->'storage','[]')) union all select value from jsonb_each(coalesce(new.data->'player'->'equip','{}')) union all select value from jsonb_each(coalesce(new.data->'player'->'mercenary'->'equip','{}')) loop
   if other->>'uid'=slot.value->>'uid' then raise exception 'talent duplicate item';end if;
  end loop;
 end loop;return new;
end $$;
drop trigger if exists dragon_talent_save_guard on public.dragon_saves;
create trigger dragon_talent_save_guard before insert or update on public.dragon_saves for each row execute function public.talent_save_guard();

create or replace function public.talent_status(p_slot int,p_char text) returns jsonb language plpgsql security definer set search_path='' as $$
declare p jsonb;cfg jsonb;trials jsonb;
begin
 p:=public.loot_player(p_slot,p_char);select data->'talentSystem' into cfg from public.dragon_loot_catalog where id=1;
 if cfg is null then raise exception 'talent not open';end if;
 select coalesce(jsonb_agg(trial order by trial),'[]') into trials from public.dragon_talent_trials where user_id=auth.uid() and char_id=p_char;
 return jsonb_build_object('version',cfg->>'version','trials',trials);
end $$;

create or replace function public.talent_action(p_slot int,p_char text,p_op uuid,p_action text,p_node text,p_uid bigint default null) returns jsonb language plpgsql security definer set search_path='' as $$
declare p jsonb;t jsonb;cfg jsonb;graph jsonb;node jsonb;it jsonb;j jsonb;idx int;trials jsonb;args jsonb:=jsonb_build_array(p_slot,p_action,p_node,p_uid);old public.dragon_talent_ops;delta jsonb:='{}';commit_result jsonb;result jsonb;owned int;spent int;amount int;inv jsonb;inv_item jsonb;left_n int:=1;ch text;
begin
 if auth.uid() is null or public.dragon_is_banned() then raise exception 'not allowed';end if;
 perform pg_advisory_xact_lock(7713100,hashtext(auth.uid()::text));
 select * into old from public.dragon_talent_ops where user_id=auth.uid() and op=p_op;
 if found then if old.char_id<>p_char or old.args<>args then raise exception 'talent operation changed';end if;return old.result;end if;
 if p_op is null then raise exception 'talent operation missing';end if;
 if not public.dragon_save_ok(auth.uid(),p_slot) then raise exception 'save signature';end if;
 select data->'player' into p from public.dragon_saves where user_id=auth.uid() and slot=p_slot for update;
 ch:=(p->>'created')||'|'||(p->>'cls');if p is null or ch is distinct from p_char then raise exception 'talent character changed';end if;
 select data->'talentSystem' into cfg from public.dragon_loot_catalog where id=1;if cfg is null then raise exception 'talent not open';end if;
 insert into public.dragon_talent_state(user_id,char_id) values(auth.uid(),ch) on conflict do nothing;
 select data into t from public.dragon_talent_state where user_id=auth.uid() and char_id=ch for update;
 select coalesce(jsonb_agg(trial order by trial),'[]') into trials from public.dragon_talent_trials where user_id=auth.uid() and char_id=ch;
 t:=t||jsonb_build_object('v',cfg->>'version','trials',trials);graph:=public.talent_graph(t,cfg);node:=graph->'nodes'->p_node;
 if node is null or p_node='origin' then raise exception 'talent invalid node';end if;
 if p_action='allocate' then
  if t->'nodes' ? p_node then raise exception 'talent already allocated';end if;
  if not exists(select 1 from jsonb_array_elements(graph->'edges') e where (e->>0=p_node and ((t->'nodes') ? (e->>1) or e->>1='origin')) or (e->>1=p_node and ((t->'nodes') ? (e->>0) or e->>0='origin'))) then raise exception 'talent prerequisite';end if;
  t:=jsonb_set(t,'{nodes}',(t->'nodes')||jsonb_build_array(p_node));
 elsif p_action='refund' then
  if not(t->'nodes' ? p_node) or t->'jewels' ? p_node then raise exception 'talent cannot refund';end if;
  select coalesce(sum((value->>'n')::int),0) into owned from jsonb_array_elements(p->'inv') where value->>'id'='talentStone';
  if owned<1 then raise exception '天賦石不足';end if;
  t:=jsonb_set(t,'{nodes}',(t->'nodes')-p_node);inv:='[]';
  for inv_item in select * from jsonb_array_elements(p->'inv') loop
   if inv_item->>'id'='talentStone' and left_n>0 then amount:=least(left_n,(inv_item->>'n')::int);left_n:=left_n-amount;inv_item:=jsonb_set(inv_item,'{n}',to_jsonb((inv_item->>'n')::int-amount));end if;
   if (inv_item->>'n')::int>0 then inv:=inv||jsonb_build_array(inv_item);end if;
  end loop;p:=jsonb_set(p,'{inv}',inv);delta:=jsonb_build_object('consumeId','talentStone','consumeN',1);
 elsif p_action='insert' then
  if node->>'kind'<>'socket' or not(t->'nodes' ? p_node) or t->'jewels' ? p_node then raise exception 'talent socket unavailable';end if;
  select value,(ordinality-1)::int into it,idx from jsonb_array_elements(p->'inv') with ordinality where (value->>'uid')::bigint=p_uid;
  j:=cfg->'jewels'->(it->>'id');if j is null or j->>'type' is distinct from node->>'socketType' or (it->>'n')::int<>1 then raise exception 'talent wrong jewel';end if;
  p:=jsonb_set(p,'{inv}',(p->'inv')-idx);t:=jsonb_set(t,'{jewels}',(t->'jewels')||jsonb_build_object(p_node,it));delta:=jsonb_build_object('removeUid',p_uid);
 elsif p_action='remove' then
  it:=t->'jewels'->p_node;if it is null then raise exception 'talent empty socket';end if;
  if exists(select 1 from jsonb_array_elements_text(t->'nodes') id where position(p_node||':' in id)=1) then raise exception '請先退回星團分支點數';end if;
  if exists(select 1 from jsonb_array_elements(p->'inv') v where v->>'uid'=it->>'uid') then raise exception 'talent duplicate item';end if;
  p:=jsonb_set(p,'{inv}',(p->'inv')||jsonb_build_array(it));t:=jsonb_set(t,'{jewels}',(t->'jewels')-p_node);delta:=jsonb_build_object('addItem',it);
 else raise exception 'talent invalid action';end if;
 if not public.talent_valid(t,(p->>'lv')::int,auth.uid(),ch,cfg) then raise exception '天賦點不足、前置斷線、轉化重疊或核心互斥';end if;
 update public.dragon_talent_state set data=t-'trials'-'v' where user_id=auth.uid() and char_id=ch;
 p:=jsonb_set(p,'{talent}',t);commit_result:=public.dragon_vault_commit(p_slot,p);
 result:=commit_result||delta||jsonb_build_object('talent',t);insert into public.dragon_talent_ops values(auth.uid(),p_op,ch,args,result);return result;
end $$;

do $patch$
declare fn record;src text;patched text;seen int:=0;
begin
 for fn in select p.oid,p.proname from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='public' and p.proname in ('loot_roll','loot_finish','loot_finish_batch') loop
  src:=pg_get_functiondef(fn.oid);patched:=src;seen:=seen+1;
  if fn.proname='loot_roll' and position('public.talent_loot_items' in src)=0 then patched:=regexp_replace(src,'return out([^;]*);',E'return out\\1 || public.talent_loot_items(c,x,false);');
  elsif fn.proname in ('loot_finish','loot_finish_batch') and position('public.talent_trial_loot' in src)=0 then patched:=replace(src,'public.loot_roll(c,j.context)','(public.loot_roll(c,j.context)||public.talent_trial_loot(c,j.context,j.user_id,j.char_id))');end if;
  if patched=src and position('public.talent_' in src)=0 then raise exception '掉寶函式結構不同，未套用天賦增量：%',fn.proname;end if;
  if position(case when fn.proname='loot_roll' then 'public.talent_loot_items' else 'public.talent_trial_loot' end in patched)=0 then raise exception '無法安全接入%，整筆取消安裝',fn.proname;end if;
  if patched<>src then execute patched;end if;
 end loop;if seen<>3 then raise exception '請先安裝server-loot及loot-batch';end if;
end $patch$;
revoke all on function public.talent_graph(jsonb,jsonb),public.talent_valid(jsonb,int,uuid,text,jsonb),public.talent_loot_items(jsonb,jsonb,boolean),public.talent_trial_loot(jsonb,jsonb,uuid,text),public.talent_save_guard() from public,anon,authenticated;
revoke all on function public.talent_status(int,text),public.talent_action(int,text,uuid,text,text,bigint) from public,anon;
grant execute on function public.talent_status(int,text),public.talent_action(int,text,uuid,text,text,bigint) to authenticated;
notify pgrst,'reload schema';
commit;
