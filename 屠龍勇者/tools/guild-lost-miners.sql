-- 失聯採礦隊增量SQL。先安裝guild-system.sql，再安裝本檔；重跑不重置帳本。
-- 僅可信Edge Function能結算。安裝後預設關閉，部署並驗收後才手動開啟。
begin;
create table if not exists public.dragon_guild_lost_config(id int primary key check(id=1),enabled boolean not null default false);
insert into public.dragon_guild_lost_config values(1,false) on conflict do nothing;
create table if not exists public.dragon_guild_lost_runs(
 id uuid primary key default gen_random_uuid(),user_id uuid not null,character_id text not null,cls text not null,
 team jsonb not null,seed bigint not null check(seed between 0 and 4294967295),issued_at timestamptz not null default now(),
 expires_at timestamptz not null default now()+interval '7 days',status text not null default 'active' check(status in('active','cancelled','accepted','rejected')),
 log_hash text,receipt jsonb,foreign key(user_id,character_id) references public.dragon_guild_profiles(user_id,character_id));
alter table public.dragon_guild_lost_runs add column if not exists last_verify_at timestamptz;
create unique index if not exists dragon_guild_lost_active on public.dragon_guild_lost_runs(user_id,character_id) where status='active';
create table if not exists public.dragon_guild_lost_wallet(user_id uuid not null,character_id text not null,rep bigint not null default 0,tokens bigint not null default 0,badges bigint not null default 0,primary key(user_id,character_id));
create table if not exists public.dragon_guild_lost_book(user_id uuid not null,character_id text not null,week date not null,primary key(user_id,character_id,week));
alter table public.dragon_guild_lost_config enable row level security;
alter table public.dragon_guild_lost_runs enable row level security;
alter table public.dragon_guild_lost_wallet enable row level security;
alter table public.dragon_guild_lost_book enable row level security;
revoke all on public.dragon_guild_lost_config,public.dragon_guild_lost_runs,public.dragon_guild_lost_wallet,public.dragon_guild_lost_book from public,anon,authenticated;
grant all on public.dragon_guild_lost_config,public.dragon_guild_lost_runs,public.dragon_guild_lost_wallet,public.dragon_guild_lost_book to service_role;
create or replace function public.guild_lost_payload(r public.dragon_guild_lost_runs) returns jsonb language sql immutable set search_path='' as $$
 select jsonb_build_object('ticketId',r.id::text,'ownerId',r.user_id::text,'characterId',r.character_id,'missionId','lostMiners','ruleVersion','guild-draft-1','missionVersion','lost-miners-1','team',r.team,'seed',r.seed,'issuedAt',floor(extract(epoch from r.issued_at)*1000)::bigint,'expiresAt',floor(extract(epoch from r.expires_at)*1000)::bigint)
$$;
revoke all on function public.guild_lost_payload(public.dragon_guild_lost_runs) from public,anon,authenticated;
create or replace function public.guild_lost_begin(p_slot integer,p_character text,p_team jsonb) returns jsonb language plpgsql security definer set search_path='' as $$
declare u uuid:=auth.uid();p jsonb;g public.dragon_guild_profiles;r public.dragon_guild_lost_runs;cid text;ms bigint;
begin
 if u is null or public.dragon_is_banned() then raise exception 'guild_access_denied';end if;
 if not exists(select 1 from public.dragon_guild_lost_config where id=1 and enabled) then raise exception 'guild_not_open';end if;
 if p_slot is null or p_slot<0 or p_slot>7 or not public.dragon_save_ok(u,p_slot) then raise exception 'guild_invalid_save';end if;
 select data->'player' into p from public.dragon_saves where user_id=u and slot=p_slot;
 if p is null or coalesce(p->>'created','') !~ '^[0-9]{1,16}$' then raise exception 'guild_invalid_character';end if;
 cid:=((p->>'created')::bigint)::text||'|'||(p->>'cls');
 if p_character is null or cid<>p_character then raise exception 'guild_identity_changed';end if;
 perform public.guild_register(p_slot);
 select * into g from public.dragon_guild_profiles where user_id=u and character_id=cid for update;
 ms:=floor(extract(epoch from clock_timestamp())*1000)::bigint;
 if p_team is null or jsonb_typeof(p_team)<>'array' or jsonb_array_length(p_team)<>3 or (select count(distinct value) from jsonb_array_elements_text(p_team))<>3 then raise exception 'guild_team_invalid';end if;
 if exists(select 1 from jsonb_array_elements_text(p_team) t where not exists(select 1 from jsonb_array_elements(g.state->'members') m where m->>'id'=t.value and coalesce((m->>'restUntil')::bigint,0)<=ms)) then raise exception 'guild_member_unavailable';end if;
 update public.dragon_guild_lost_runs set status='cancelled' where user_id=u and character_id=cid and status='active' and expires_at<now();
 select * into r from public.dragon_guild_lost_runs where user_id=u and character_id=cid and status='active';
 if found then if r.team<>p_team then raise exception 'guild_mission_active';end if;return public.guild_lost_payload(r);end if;
 insert into public.dragon_guild_lost_runs(user_id,character_id,cls,team,seed) values(u,cid,p->>'cls',p_team,floor(random()*4294967296)::bigint) returning * into r;
 insert into public.dragon_guild_tickets(id,user_id,character_id,mission_id,rules_version,team,issued_at,expires_at) values(r.id,u,cid,'lostMiners','guild-draft-1',r.team,r.issued_at,r.expires_at);
 return public.guild_lost_payload(r);
end $$;
create or replace function public.guild_lost_ticket(p_ticket uuid) returns jsonb language plpgsql security definer set search_path='' as $$
declare r public.dragon_guild_lost_runs;
begin
 if auth.uid() is null or public.dragon_is_banned() then raise exception 'guild_access_denied';end if;
 select * into r from public.dragon_guild_lost_runs where id=p_ticket and user_id=auth.uid() for update;
 if not found then raise exception 'guild_ticket_missing';end if;
 if r.last_verify_at is not null and r.last_verify_at>clock_timestamp()-interval '10 seconds' then raise exception 'guild_verify_rate';end if;
 update public.dragon_guild_lost_runs set last_verify_at=clock_timestamp() where id=r.id;
 return jsonb_build_object('ticket',public.guild_lost_payload(r),'cls',r.cls,'status',r.status);
end $$;
create or replace function public.guild_lost_cancel(p_ticket uuid) returns boolean language plpgsql security definer set search_path='' as $$
begin
 if auth.uid() is null or public.dragon_is_banned() then raise exception 'guild_access_denied';end if;
 update public.dragon_guild_lost_runs set status='cancelled' where id=p_ticket and user_id=auth.uid() and status='active';return found;
end $$;
create or replace function public.guild_lost_status(p_character text) returns jsonb language plpgsql security definer set search_path='' as $$
begin
 if auth.uid() is null or public.dragon_is_banned() then raise exception 'guild_access_denied';end if;
 return jsonb_build_object('enabled',exists(select 1 from public.dragon_guild_lost_config where id=1 and enabled),'wallet',coalesce((select jsonb_build_object('rep',rep,'tokens',tokens,'badges',badges) from public.dragon_guild_lost_wallet where user_id=auth.uid() and character_id=p_character),'{"rep":0,"tokens":0,"badges":0}'::jsonb));
end $$;
revoke all on function public.guild_lost_status(text) from public,anon;
grant execute on function public.guild_lost_status(text) to authenticated;
-- 只有服務角色能呼叫；不得把service_role金鑰放在遊戲或瀏覽器。
create or replace function public.guild_lost_settle(p_ticket uuid,p_hash text,p_sim_ms integer,p_success boolean,p_rating boolean,p_downed jsonb) returns jsonb language plpgsql security definer set search_path='' as $$
declare r public.dragon_guild_lost_runs;g public.dragon_guild_profiles;reward jsonb;v_receipt jsonb;wk date;first_run boolean;ms bigint;members jsonb;
begin
 if p_hash is null or p_hash !~ '^[a-f0-9]{64}$' or p_sim_ms is null or p_sim_ms<0 or p_sim_ms>720000 or p_success is null or p_rating is null or p_downed is null or jsonb_typeof(p_downed)<>'array' then raise exception 'guild_invalid_proof';end if;
 select * into r from public.dragon_guild_lost_runs where id=p_ticket for update;
 if not found then raise exception 'guild_ticket_missing';end if;
 if r.receipt is not null then if r.log_hash<>p_hash then raise exception 'guild_report_conflict';end if;return r.receipt;end if;
 if r.status<>'active' or now()>r.expires_at+interval '72 hours' or extract(epoch from(now()-r.issued_at))*1000+5000<p_sim_ms then raise exception 'guild_ticket_inactive';end if;
 if exists(select 1 from jsonb_array_elements_text(p_downed) d where not r.team ? d.value) then raise exception 'guild_invalid_downed';end if;
 select * into g from public.dragon_guild_profiles where user_id=r.user_id and character_id=r.character_id for update;
 wk:=date_trunc('week',r.issued_at at time zone 'Asia/Taipei')::date;
 first_run:=not exists(select 1 from public.dragon_guild_lost_book where user_id=r.user_id and character_id=r.character_id and week=wk);
 reward:=case when not p_success then '{"rep":0,"tokens":0,"badges":0}'::jsonb when first_run then jsonb_build_object('rep',100,'tokens',case when p_rating then 12 else 10 end,'badges',20) else jsonb_build_object('rep',0,'tokens',case when p_rating then 3 else 2 end,'badges',5) end;
 if p_success then
  insert into public.dragon_guild_lost_book values(r.user_id,r.character_id,wk) on conflict do nothing;
  insert into public.dragon_guild_lost_wallet values(r.user_id,r.character_id,(reward->>'rep')::bigint,(reward->>'tokens')::bigint,(reward->>'badges')::bigint) on conflict(user_id,character_id) do update set rep=dragon_guild_lost_wallet.rep+excluded.rep,tokens=dragon_guild_lost_wallet.tokens+excluded.tokens,badges=dragon_guild_lost_wallet.badges+excluded.badges;
 end if;
 ms:=floor(extract(epoch from clock_timestamp())*1000)::bigint;
 select jsonb_agg(case when p_downed ? (m->>'id') then jsonb_set(m,'{restUntil}',to_jsonb(ms+1800000)) else m end) into members from jsonb_array_elements(g.state->'members') m;
 v_receipt:=jsonb_build_object('ticketId',r.id::text,'ownerId',r.user_id::text,'characterId',r.character_id,'missionId','lostMiners','ruleVersion','guild-draft-1','logHash',p_hash,'seq',g.cursor+1,'status',case when p_success then 'accepted' else 'rejected' end,'recruits','[]'::jsonb,'reason',case when p_success then '' else '救援紀錄未通過驗證' end);
 update public.dragon_guild_profiles set cursor=g.cursor+1,state=jsonb_set(state,'{members}',coalesce(members,'[]'::jsonb)) where user_id=r.user_id and character_id=r.character_id;
 insert into public.dragon_guild_receipts(user_id,character_id,seq,ticket_id,payload) values(r.user_id,r.character_id,g.cursor+1,r.id,v_receipt);
 update public.dragon_guild_tickets set state=case when p_success then 'accepted' else 'rejected' end where id=r.id;
 update public.dragon_guild_lost_runs set status=case when p_success then 'accepted' else 'rejected' end,log_hash=p_hash,receipt=jsonb_build_object('receipt',v_receipt,'reward',reward) where id=r.id;
 return jsonb_build_object('receipt',v_receipt,'reward',reward);
end $$;
revoke all on function public.guild_lost_begin(integer,text,jsonb),public.guild_lost_ticket(uuid),public.guild_lost_cancel(uuid),public.guild_lost_settle(uuid,text,integer,boolean,boolean,jsonb) from public,anon,authenticated;
grant execute on function public.guild_lost_begin(integer,text,jsonb),public.guild_lost_ticket(uuid),public.guild_lost_cancel(uuid) to authenticated;
grant execute on function public.guild_lost_settle(uuid,text,integer,boolean,boolean,jsonb) to service_role;
commit;
