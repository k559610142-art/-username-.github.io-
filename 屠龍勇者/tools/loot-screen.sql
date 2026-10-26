-- 黑暗大陸：畫面砲擊批次怪物憑證。使用者2026-10-26同意新增。
-- 先安裝既有server-loot-install.sql及loot-batch.sql，再執行本檔；可重跑。
-- 不覆寫loot_spawn，不改玩家存檔。請由使用者自行貼至Supabase SQL Editor執行。
-- 支援砲擊、星隕轟擊、冰雪暴、雷電風暴、流星雨；即使已執行先前砲擊版，也可再執行更新。
begin;
create table if not exists public.dragon_loot_screen_batches(
 user_id uuid not null,request_id uuid not null,slot int not null,char_id text not null,
 zone text not null,floor int not null,mids text[] not null,result jsonb not null,
 created_at timestamptz not null default clock_timestamp(),primary key(user_id,request_id));
alter table public.dragon_loot_screen_batches enable row level security;
alter table public.dragon_loot_screen_batches add column if not exists skill text not null default 'res_pirateCannon';
revoke all on public.dragon_loot_screen_batches from public,anon,authenticated;
create index if not exists dragon_loot_screen_batches_recent on public.dragon_loot_screen_batches(user_id,created_at desc);

create or replace function public.loot_spawn_screen(p_slot int,p_char text,p_key uuid,p_mids text[],p_skill text)
returns jsonb language plpgsql security definer set search_path='' as $$
declare p jsonb;c jsonb;z jsonb;mr jsonb;g jsonb;m jsonb;mid text;f int;n int;ticket uuid;
 out jsonb:='[]';is_map boolean;elite boolean;active_n int;budget int;cooldown int;
 old public.dragon_loot_screen_batches;
begin
 if p_key is null or p_mids is null or coalesce(array_length(p_mids,1),0) not between 1 and 30
  or array_ndims(p_mids)<>1 or array_lower(p_mids,1)<>1 or array_position(p_mids,null) is not null then raise exception 'loot invalid screen batch';end if;
 perform pg_advisory_xact_lock(7713201,hashtext(auth.uid()::text));
 p:=public.loot_player(p_slot,p_char);
 cooldown:=case p_skill when 'res_pirateCannon' then 14 when 'res_starfallGun' then 12 when 'blizzard' then 8 when 'thunderStorm' then 4 when 'meteor' then 10 else null end;
 if cooldown is null then raise exception 'loot invalid screen skill';end if;
 if p->'loc'->>'type'<>'zone' then raise exception 'loot wrong zone';end if;
 select data into c from public.dragon_loot_catalog where id=1;
 if c is null then raise exception 'loot catalog missing';end if;
 z:=c->'zones'->(p->'loc'->>'id');f:=coalesce((p->'loc'->>'floor')::int,1);
 if z is null or z->>'type'='dragon' then raise exception 'loot wrong zone';end if;
 select * into old from public.dragon_loot_screen_batches where user_id=auth.uid() and request_id=p_key;
 if found then
  if old.slot<>p_slot or old.char_id<>p_char or old.zone<>z->>'id' or old.floor<>f or old.mids<>p_mids or old.skill<>p_skill then raise exception 'loot screen request changed';end if;
  return old.result;
 end if;
 if exists(select 1 from public.dragon_loot_screen_batches where user_id=auth.uid() and skill=p_skill and created_at>clock_timestamp()-make_interval(secs=>cooldown)) then raise exception 'loot screen cooldown';end if;
 if z->>'type'='tower' and (f<1 or f>100 or f>coalesce((p->>'towerMax')::int,1)) then raise exception 'loot floor locked';end if;
 mr:=p->'mapRun';is_map:=mr is not null and mr<>'null'::jsonb and mr->>'zone'=z->>'id';
 g:=c->'quests'->(p->>'cls')->coalesce((p->'quests'->>'ch')::int,0);
 select count(*) into active_n from public.dragon_loot_jobs where user_id=auth.uid() and result is null and not(context ? 'cancelled') and created_at>clock_timestamp()-interval '10 minutes';
 if active_n+cardinality(p_mids)>64 then raise exception 'loot encounters full';end if;
 budget:=cardinality(p_mids);
 if is_map then
  select greatest(0,(mr->>'left')::int-count(*)) into budget from public.dragon_loot_jobs
   where user_id=auth.uid() and slot=p_slot and char_id=p_char and result is null and not(context ? 'cancelled')
   and context->'zone'->>'id'=z->>'id' and not coalesce((context->'monster'->>'mapBoss')::boolean,false);
  budget:=least(budget,cardinality(p_mids));
 end if;
 -- 先驗證全部ID；即使異界剩餘數量不足，也不接受尾端藏入其他區域的怪物。
 foreach mid in array p_mids loop
  if not(coalesce(z->'mons','[]') ? mid) and not(z->>'type'='tower' and mid='tower') then raise exception 'loot invalid monster';end if;
 end loop;
 for i in 1..budget loop
  mid:=p_mids[i];
  m:=case when z->>'type'='tower' then c->'tower'->f::text->'normal' else c->'monsters'->mid end;
  if m is null or coalesce((m->>'boss')::boolean,false) then raise exception 'loot invalid monster';end if;
  if z->>'type'='tower' then m:=m||jsonb_build_object('name',public.loot_pick(c->'tower'->f::text->'names'),'large',random()<0.4);end if;
  elite:=is_map and mr->'mods' ? 'elite' and random()<0.15;
  m:=m||jsonb_build_object('lootElite',coalesce(elite,false));
  insert into public.dragon_loot_jobs(user_id,slot,char_id,event_key,context)
   values(auth.uid(),p_slot,p_char,'screen:'||p_key::text||':'||i,
    jsonb_build_object('monster',m||jsonb_build_object('elite',coalesce(elite,false)),
     'zone',jsonb_build_object('id',z->>'id','drops',coalesce(z->'drops','[]')),
     'map',case when is_map then jsonb_build_object('t',mr->'t','mods',mr->'mods') else null end,
     'player',jsonb_build_object('cls',p->>'cls','quests',p->'quests','inv',coalesce((select jsonb_agg(v) from jsonb_array_elements(p->'inv') v where v->>'id'=g->>'item'),'[]')),
     'rules',c->>'version')) returning id into ticket;
  out:=out||jsonb_build_array(jsonb_build_object('ticket',ticket,'monster',m));
 end loop;
 insert into public.dragon_loot_screen_batches(user_id,request_id,slot,char_id,zone,floor,mids,result,skill)
  values(auth.uid(),p_key,p_slot,p_char,z->>'id',f,p_mids,out,p_skill);
 delete from public.dragon_loot_screen_batches where user_id=auth.uid() and created_at<clock_timestamp()-interval '3 days';
 return out;
end $$;
-- 舊砲擊客戶端仍可使用四個參數；新客戶端指定技能ID。
create or replace function public.loot_spawn_screen(p_slot int,p_char text,p_key uuid,p_mids text[])
returns jsonb language sql security definer set search_path='' as $$
 select public.loot_spawn_screen(p_slot,p_char,p_key,p_mids,'res_pirateCannon');
$$;
revoke all on function public.loot_spawn_screen(int,text,uuid,text[],text) from public,anon;
grant execute on function public.loot_spawn_screen(int,text,uuid,text[],text) to authenticated;
revoke all on function public.loot_spawn_screen(int,text,uuid,text[]) from public,anon;
grant execute on function public.loot_spawn_screen(int,text,uuid,text[]) to authenticated;
commit;
