-- 十二項公會任務；需先安裝guild-system.sql。由使用者自行執行，預設不開放。
-- 不修改既有SQL檔或cloud.js；舊失聯採礦隊API仍可交付已發憑證。
begin;
create or replace function public.guild_mission_week(p_time timestamptz) returns date language sql immutable set search_path='' as $$select date_trunc('week',(p_time at time zone 'Asia/Taipei')-interval '6 hours')::date$$;
create or replace function public.guild_mission_reset(p_time timestamptz) returns timestamptz language sql immutable set search_path='' as $$select (date_trunc('week',(p_time at time zone 'Asia/Taipei')-interval '6 hours')+interval '7 days 6 hours') at time zone 'Asia/Taipei'$$;
revoke all on function public.guild_mission_week(timestamptz),public.guild_mission_reset(timestamptz) from public,anon,authenticated;
create table if not exists public.dragon_guild_mission_config(id int primary key check(id=1),enabled boolean not null default false);
insert into public.dragon_guild_mission_config values(1,false) on conflict do nothing;
create table if not exists public.dragon_guild_mission_runs(
 id uuid primary key default gen_random_uuid(),user_id uuid not null,character_id text not null,cls text not null,
 mission_id text not null check(mission_id in('lostMiners','poisonHerbs','tradeRoad','ancientSeal','dragonOutpost','lostBanner','lastCampfire','northGate','sealKeeper','refugeeEvacuation','crystalCart','dragonTide')),
 team jsonb not null,seed bigint not null check(seed between 0 and 4294967295),issued_at timestamptz not null default now(),expires_at timestamptz not null default public.guild_mission_reset(now()),
 status text not null default 'active' check(status in('active','submitted','expired','cancelled','accepted','rejected')),report_hash text,log_hash text,receipt jsonb,last_verify_at timestamptz,
 foreign key(user_id,character_id) references public.dragon_guild_profiles(user_id,character_id));
create unique index if not exists dragon_guild_mission_active on public.dragon_guild_mission_runs(user_id,character_id) where status='active';
create table if not exists public.dragon_guild_lost_wallet(user_id uuid not null,character_id text not null,rep bigint not null default 0,tokens bigint not null default 0,badges bigint not null default 0,primary key(user_id,character_id));
create table if not exists public.dragon_guild_mission_book(user_id uuid not null,character_id text not null,week date not null,mission_id text not null,category text not null check(category in('hunt','defense')),counted boolean not null,primary key(user_id,character_id,week,mission_id));
alter table public.dragon_guild_mission_config enable row level security;
alter table public.dragon_guild_mission_runs enable row level security;
alter table public.dragon_guild_lost_wallet enable row level security;
alter table public.dragon_guild_mission_book enable row level security;
revoke all on public.dragon_guild_mission_config,public.dragon_guild_mission_runs,public.dragon_guild_lost_wallet,public.dragon_guild_mission_book from public,anon,authenticated;
grant all on public.dragon_guild_mission_config,public.dragon_guild_mission_runs,public.dragon_guild_lost_wallet,public.dragon_guild_mission_book to service_role;
create or replace function public.guild_mission_payload(r public.dragon_guild_mission_runs) returns jsonb language sql immutable set search_path='' as $$
 select jsonb_build_object('ticketId',r.id::text,'ownerId',r.user_id::text,'characterId',r.character_id,'missionId',r.mission_id,'ruleVersion','guild-draft-1','missionVersion',case when r.mission_id='lostMiners' then 'lost-miners-1' else 'guild-missions-1' end,'protocol','guild-missions-1','team',r.team,'seed',r.seed,'issuedAt',floor(extract(epoch from r.issued_at)*1000)::bigint,'expiresAt',floor(extract(epoch from r.expires_at)*1000)::bigint)
$$;
revoke all on function public.guild_mission_payload(public.dragon_guild_mission_runs) from public,anon,authenticated;
create or replace function public.guild_mission_counts(u uuid,cid text,wk date) returns jsonb language plpgsql stable security definer set search_path='' as $$
declare h int;d int;legacy boolean:=false;
begin
 select count(*) filter(where category='hunt'),count(*) filter(where category='defense') into h,d from public.dragon_guild_mission_book where user_id=u and character_id=cid and week=wk and counted;
 if to_regclass('public.dragon_guild_lost_book') is not null then select exists(select 1 from public.dragon_guild_lost_book where user_id=u and character_id=cid and week=wk) into legacy;end if;
 if legacy and not exists(select 1 from public.dragon_guild_mission_book where user_id=u and character_id=cid and week=wk and mission_id='lostMiners' and counted) then h:=h+1;end if;
 return jsonb_build_object('hunt',least(h,4),'defense',least(d,2),'legacy',legacy);
end $$;
revoke all on function public.guild_mission_counts(uuid,text,date) from public,anon,authenticated;
create or replace function public.guild_mission_begin(p_slot integer,p_character text,p_team jsonb,p_mission text,p_pending jsonb default '[]'::jsonb) returns jsonb language plpgsql security definer set search_path='' as $$
declare u uuid:=auth.uid();p jsonb;g public.dragon_guild_profiles;r public.dragon_guild_mission_runs;cid text;ms bigint;pending jsonb;
begin
 if u is null or public.dragon_is_banned() then raise exception 'guild_access_denied';end if;
 if not exists(select 1 from public.dragon_guild_mission_config where id=1 and enabled) then raise exception 'guild_not_open';end if;
 if p_mission is null or p_mission not in('lostMiners','poisonHerbs','tradeRoad','ancientSeal','dragonOutpost','lostBanner','lastCampfire','northGate','sealKeeper','refugeeEvacuation','crystalCart','dragonTide') then raise exception 'guild_mission_invalid';end if;
 if p_pending is null or jsonb_typeof(p_pending)<>'array' or jsonb_array_length(p_pending)>32 then raise exception 'guild_pending_invalid';end if;
 if p_slot is null or p_slot<0 or p_slot>7 or not public.dragon_save_ok(u,p_slot) then raise exception 'guild_invalid_save';end if;
 select data->'player' into p from public.dragon_saves where user_id=u and slot=p_slot;
 if p is null or coalesce(p->>'created','') !~ '^[0-9]{1,16}$' then raise exception 'guild_invalid_character';end if;
 cid:=((p->>'created')::bigint)::text||'|'||(p->>'cls');if p_character is null or cid<>p_character then raise exception 'guild_identity_changed';end if;
 perform public.guild_register(p_slot);select * into g from public.dragon_guild_profiles where user_id=u and character_id=cid for update;
 ms:=floor(extract(epoch from clock_timestamp())*1000)::bigint;
 if p_team is null or jsonb_typeof(p_team)<>'array' or jsonb_array_length(p_team)<>3 or (select count(distinct value) from jsonb_array_elements_text(p_team))<>3 then raise exception 'guild_team_invalid';end if;
 if exists(select 1 from jsonb_array_elements_text(p_team) t where not exists(select 1 from jsonb_array_elements(g.state->'members') m where m->>'id'=t.value and coalesce((m->>'restUntil')::bigint,0)<=ms)) then raise exception 'guild_member_unavailable';end if;
 for pending in select value from jsonb_array_elements(p_pending) loop
  if coalesce(pending->>'ticketId','') !~ '^[a-f0-9-]{36}$' or coalesce(pending->>'logHash','') !~ '^[a-f0-9]{64}$' then raise exception 'guild_pending_invalid';end if;
  if exists(select 1 from public.dragon_guild_mission_runs where id=(pending->>'ticketId')::uuid and user_id=u and character_id=cid and report_hash is not null and report_hash<>pending->>'logHash') then raise exception 'guild_report_conflict';end if;
  update public.dragon_guild_mission_runs set status='submitted',report_hash=pending->>'logHash' where id=(pending->>'ticketId')::uuid and user_id=u and character_id=cid and status in('active','submitted','expired');
 end loop;
 update public.dragon_guild_mission_runs set status='expired' where user_id=u and character_id=cid and status='active' and expires_at<now();
 select * into r from public.dragon_guild_mission_runs where user_id=u and character_id=cid and status='active';
 if found then if r.team<>p_team or r.mission_id<>p_mission then raise exception 'guild_mission_active';end if;return public.guild_mission_payload(r);end if;
 if (select count(*) from public.dragon_guild_mission_runs where user_id=u and character_id=cid and status in('active','submitted','expired') and expires_at+interval '24 hours'>now())>=32 then raise exception 'guild_outbox_full';end if;
 insert into public.dragon_guild_mission_runs(user_id,character_id,cls,mission_id,team,seed) values(u,cid,p->>'cls',p_mission,p_team,floor(random()*4294967296)::bigint) returning * into r;
 insert into public.dragon_guild_tickets(id,user_id,character_id,mission_id,rules_version,team,issued_at,expires_at) values(r.id,u,cid,p_mission,'guild-draft-1',r.team,r.issued_at,r.expires_at);return public.guild_mission_payload(r);
end $$;
create or replace function public.guild_mission_ticket(p_ticket uuid) returns jsonb language plpgsql security definer set search_path='' as $$
declare r public.dragon_guild_mission_runs;
begin
 if auth.uid() is null or public.dragon_is_banned() then raise exception 'guild_access_denied';end if;
 select * into r from public.dragon_guild_mission_runs where id=p_ticket and user_id=auth.uid() for update;if not found then raise exception 'guild_ticket_missing';end if;
 if r.last_verify_at is not null and r.last_verify_at>clock_timestamp()-interval '10 seconds' then raise exception 'guild_verify_rate';end if;
 update public.dragon_guild_mission_runs set last_verify_at=clock_timestamp() where id=r.id;return jsonb_build_object('ticket',public.guild_mission_payload(r),'cls',r.cls,'status',r.status);
end $$;
create or replace function public.guild_mission_cancel(p_ticket uuid) returns boolean language plpgsql security definer set search_path='' as $$
begin
 if auth.uid() is null or public.dragon_is_banned() then raise exception 'guild_access_denied';end if;
 update public.dragon_guild_mission_runs set status='cancelled' where id=p_ticket and user_id=auth.uid() and status in('active','expired');return found;
end $$;
create or replace function public.guild_mission_status(p_character text) returns jsonb language plpgsql security definer set search_path='' as $$
begin
 if auth.uid() is null or public.dragon_is_banned() then raise exception 'guild_access_denied';end if;
 return jsonb_build_object('enabled',exists(select 1 from public.dragon_guild_mission_config where id=1 and enabled),'book',public.guild_mission_counts(auth.uid(),p_character,public.guild_mission_week(now())),'resetAt',floor(extract(epoch from public.guild_mission_reset(now()))*1000)::bigint,'wallet',coalesce((select jsonb_build_object('rep',rep,'tokens',tokens,'badges',badges) from public.dragon_guild_lost_wallet where user_id=auth.uid() and character_id=p_character),'{"rep":0,"tokens":0,"badges":0}'::jsonb));
end $$;
create or replace function public.guild_mission_settle(p_ticket uuid,p_hash text,p_sim_ms integer,p_success boolean,p_rating boolean,p_downed jsonb) returns jsonb language plpgsql security definer set search_path='' as $$
declare r public.dragon_guild_mission_runs;g public.dragon_guild_profiles;reward jsonb;v_receipt jsonb;wk date;first_run boolean;v_category text;counts jsonb;base_rep int;base_tokens int;base_badges int;rate numeric;ms bigint;members jsonb;
begin
 if p_hash is null or p_hash !~ '^[a-f0-9]{64}$' or p_sim_ms is null or p_sim_ms<0 or p_sim_ms>900000 or p_success is null or p_rating is null or p_downed is null or jsonb_typeof(p_downed)<>'array' then raise exception 'guild_invalid_proof';end if;
 select * into r from public.dragon_guild_mission_runs where id=p_ticket;if not found then raise exception 'guild_ticket_missing';end if;
 select * into g from public.dragon_guild_profiles where user_id=r.user_id and character_id=r.character_id for update;select * into r from public.dragon_guild_mission_runs where id=p_ticket for update;
 if r.receipt is not null then if r.log_hash<>p_hash then raise exception 'guild_report_conflict';end if;return r.receipt;end if;
 if r.status not in('active','submitted','expired') or now()>r.expires_at+interval '24 hours' or extract(epoch from(now()-r.issued_at))*1000+5000<p_sim_ms or p_success and extract(epoch from(r.expires_at-r.issued_at))*1000<p_sim_ms then raise exception 'guild_ticket_inactive';end if;
 if r.report_hash is not null and r.report_hash<>p_hash then raise exception 'guild_report_conflict';end if;
 if exists(select 1 from jsonb_array_elements_text(p_downed) d where not r.team ? d.value) then raise exception 'guild_invalid_downed';end if;
 wk:=public.guild_mission_week(r.issued_at);v_category:=case when r.mission_id in('lostMiners','poisonHerbs','tradeRoad','ancientSeal','dragonOutpost','lostBanner') then 'hunt' else 'defense' end;counts:=public.guild_mission_counts(r.user_id,r.character_id,wk);
 first_run:=not exists(select 1 from public.dragon_guild_mission_book where user_id=r.user_id and character_id=r.character_id and week=wk and mission_id=r.mission_id) and (counts->>v_category)::int<case when v_category='hunt' then 4 else 2 end and not(r.mission_id='lostMiners' and (counts->>'legacy')::boolean);
 base_rep:=case when v_category='hunt' then 100 else 150 end;base_tokens:=base_rep/10;base_badges:=base_rep/5;rate:=case when first_run then 1 else .25 end;
 reward:=case when not p_success then '{"rep":0,"tokens":0,"badges":0}'::jsonb else jsonb_build_object('rep',case when first_run then base_rep else 0 end,'tokens',floor(base_tokens*rate*case when p_rating then 1.2 else 1 end)::int,'badges',floor(base_badges*rate)::int) end;
 if p_success then
  insert into public.dragon_guild_mission_book values(r.user_id,r.character_id,wk,r.mission_id,v_category,first_run) on conflict do nothing;
  insert into public.dragon_guild_lost_wallet values(r.user_id,r.character_id,(reward->>'rep')::bigint,(reward->>'tokens')::bigint,(reward->>'badges')::bigint) on conflict(user_id,character_id) do update set rep=dragon_guild_lost_wallet.rep+excluded.rep,tokens=dragon_guild_lost_wallet.tokens+excluded.tokens,badges=dragon_guild_lost_wallet.badges+excluded.badges;
 end if;
 ms:=floor(extract(epoch from clock_timestamp())*1000)::bigint;select jsonb_agg(case when p_downed ? (m->>'id') then jsonb_set(m,'{restUntil}',to_jsonb(ms+1800000)) else m end) into members from jsonb_array_elements(g.state->'members') m;
 v_receipt:=jsonb_build_object('ticketId',r.id::text,'ownerId',r.user_id::text,'characterId',r.character_id,'missionId',r.mission_id,'ruleVersion','guild-draft-1','logHash',p_hash,'seq',g.cursor+1,'status',case when p_success then 'accepted' else 'rejected' end,'recruits','[]'::jsonb,'reason',case when p_success then '' else '任務未完成，未發放獎勵' end);
 update public.dragon_guild_profiles set cursor=g.cursor+1,state=jsonb_set(state,'{members}',coalesce(members,'[]'::jsonb)) where user_id=r.user_id and character_id=r.character_id;
 insert into public.dragon_guild_receipts(user_id,character_id,seq,ticket_id,payload) values(r.user_id,r.character_id,g.cursor+1,r.id,v_receipt);
 update public.dragon_guild_tickets set state=case when p_success then 'accepted' else 'rejected' end where id=r.id;
 update public.dragon_guild_mission_runs set status=case when p_success then 'accepted' else 'rejected' end,log_hash=p_hash,receipt=jsonb_build_object('receipt',v_receipt,'reward',reward) where id=r.id;return jsonb_build_object('receipt',v_receipt,'reward',reward);
end $$;
revoke all on function public.guild_mission_begin(integer,text,jsonb,text,jsonb),public.guild_mission_ticket(uuid),public.guild_mission_cancel(uuid),public.guild_mission_status(text),public.guild_mission_settle(uuid,text,integer,boolean,boolean,jsonb) from public,anon,authenticated;
grant execute on function public.guild_mission_begin(integer,text,jsonb,text,jsonb),public.guild_mission_ticket(uuid),public.guild_mission_cancel(uuid),public.guild_mission_status(text) to authenticated;
grant execute on function public.guild_mission_settle(uuid,text,integer,boolean,boolean,jsonb) to service_role;
do $$begin if to_regclass('public.dragon_guild_lost_config') is not null then update public.dragon_guild_lost_config set enabled=false where id=1;end if;end$$;
commit;
