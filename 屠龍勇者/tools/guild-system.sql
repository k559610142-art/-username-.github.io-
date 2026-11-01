-- 黑暗大陸：獨立傭兵公會基礎（2026-11-01，schema24）。
-- 使用者自行於Supabase執行。預設不開任務；本檔不發金幣／物品／代幣。
-- 真正重播驗證與獎勵政策尚未部署，不得把客戶端success或hash當驗證結果。
begin;
create table if not exists public.dragon_guild_config (
 id integer primary key check(id=1), enabled boolean not null default false,
 rules_version text not null default 'guild-draft-1'
);
insert into public.dragon_guild_config(id) values(1) on conflict(id) do nothing;
create table if not exists public.dragon_guild_profiles (
 user_id uuid not null, character_id text not null check(length(character_id)<=120),
 base_class text not null, state jsonb not null check(pg_column_size(state)<=131072),
 cursor bigint not null default 0 check(cursor>=0), updated_at timestamptz not null default now(),
 primary key(user_id,character_id)
);
create table if not exists public.dragon_guild_tickets (
 id uuid primary key default gen_random_uuid(), user_id uuid not null, character_id text not null,
 mission_id text not null check(length(mission_id)<=80), rules_version text not null,
 team jsonb not null check(jsonb_typeof(team)='array' and jsonb_array_length(team)=3),
 issued_at timestamptz not null default now(), expires_at timestamptz not null,
 state text not null default 'issued' check(state in ('issued','submitted','accepted','rejected')),
 unique(user_id,character_id,id), foreign key(user_id,character_id) references public.dragon_guild_profiles(user_id,character_id),
 check(expires_at>issued_at)
);
create table if not exists public.dragon_guild_reports (
 ticket_id uuid primary key references public.dragon_guild_tickets(id), user_id uuid not null,
 character_id text not null, log_hash text not null check(log_hash ~ '^[a-f0-9]{64}$'),
 payload jsonb not null check(pg_column_size(payload)<=65536), submitted_at timestamptz not null default now(),
 status text not null default 'pending' check(status in ('pending','accepted','rejected'))
);
create table if not exists public.dragon_guild_receipts (
 user_id uuid not null, character_id text not null, seq bigint not null check(seq>0),
 ticket_id uuid not null unique references public.dragon_guild_tickets(id), payload jsonb not null check(pg_column_size(payload)<=16384),
 created_at timestamptz not null default now(), primary key(user_id,character_id,seq),
 foreign key(user_id,character_id) references public.dragon_guild_profiles(user_id,character_id)
);
create index if not exists dragon_guild_reports_owner on public.dragon_guild_reports(user_id,character_id,submitted_at);
alter table public.dragon_guild_config enable row level security;
alter table public.dragon_guild_profiles enable row level security;
alter table public.dragon_guild_tickets enable row level security;
alter table public.dragon_guild_reports enable row level security;
alter table public.dragon_guild_receipts enable row level security;
revoke all on public.dragon_guild_config,public.dragon_guild_profiles,public.dragon_guild_tickets,public.dragon_guild_reports,public.dragon_guild_receipts from public,anon,authenticated;
grant select,insert,update,delete on public.dragon_guild_config,public.dragon_guild_profiles,public.dragon_guild_tickets,public.dragon_guild_reports,public.dragon_guild_receipts to service_role;

create or replace function public.guild_initial_members(p_class text) returns jsonb language plpgsql immutable set search_path='' as $$
begin
 if p_class in ('royal','knight','shura','warrior') then return '["ranger","arcanist","healer"]'::jsonb;
 elsif p_class in ('mage','elf','darkelf','gunner','magicfighter','demon') then return '["sentinel","warrior","healer"]'::jsonb;
 elsif p_class in ('paladin','angel') then return '["sentinel","ranger","arcanist"]'::jsonb;
 else raise exception 'guild_invalid_class';end if;
end $$;
revoke all on function public.guild_initial_members(text) from public,anon,authenticated;

create or replace function public.guild_status() returns jsonb language plpgsql stable security definer set search_path='' as $$
begin
 if auth.uid() is null then return jsonb_build_object('enabled',false,'signedIn',false);end if;
 if public.dragon_is_banned() then raise exception 'guild_access_denied';end if;
 return (select jsonb_build_object('enabled',enabled,'signedIn',true,'rulesVersion',rules_version,'rewardsEnabled',false) from public.dragon_guild_config where id=1);
end $$;
revoke all on function public.guild_status() from public,anon;
grant execute on function public.guild_status() to authenticated;

create or replace function public.guild_register(p_slot integer) returns jsonb language plpgsql security definer set search_path='' as $$
declare u uuid:=auth.uid();p jsonb;cid text;cls text;initial jsonb;members jsonb;ms bigint;profile public.dragon_guild_profiles;
begin
 if u is null or public.dragon_is_banned() then raise exception 'guild_access_denied';end if;
 if p_slot is null or p_slot<0 or p_slot>7 or not public.dragon_save_ok(u,p_slot) then raise exception 'guild_invalid_save';end if;
 select data->'player' into p from public.dragon_saves where user_id=u and slot=p_slot;
 if p is null or coalesce(p->>'created','') !~ '^[0-9]{1,16}$' or (p->>'created')::bigint<=0 then raise exception 'guild_invalid_character';end if;
 cls:=p->>'cls';cid:=((p->>'created')::bigint)::text||'|'||cls;initial:=public.guild_initial_members(cls);
 ms:=floor(extract(epoch from clock_timestamp())*1000)::bigint;
 select jsonb_agg(jsonb_build_object('id',x,'joinedAt',ms,'restUntil',0)) into members from jsonb_array_elements_text(initial) x;
 insert into public.dragon_guild_profiles(user_id,character_id,base_class,state) values(u,cid,cls,jsonb_build_object(
  'v',1,'ownerId',u::text,'characterId',cid,'baseClass',cls,'members',members,'squad',initial,
  'recruitProgress','{}'::jsonb,'explored','{}'::jsonb,'activeTicket',null,'outbox','[]'::jsonb,'serverCursor',0,'settled','[]'::jsonb
 )) on conflict(user_id,character_id) do nothing;
 select * into profile from public.dragon_guild_profiles where user_id=u and character_id=cid;
 return jsonb_build_object('characterId',cid,'state',profile.state,'serverCursor',profile.cursor);
end $$;
revoke all on function public.guild_register(integer) from public,anon;
grant execute on function public.guild_register(integer) to authenticated;

create or replace function public.guild_submit(p_ticket uuid,p_log_hash text,p_report jsonb) returns jsonb language plpgsql security definer set search_path='' as $$
declare u uuid:=auth.uid();ticket public.dragon_guild_tickets;prior public.dragon_guild_reports;receipt jsonb;
begin
 if u is null or public.dragon_is_banned() then raise exception 'guild_access_denied';end if;
 if not exists(select 1 from public.dragon_guild_config where id=1 and enabled) then raise exception 'guild_not_open';end if;
 if p_ticket is null or p_log_hash is null or p_log_hash !~ '^[a-f0-9]{64}$' or p_report is null or jsonb_typeof(p_report)<>'object' or pg_column_size(p_report)>65536 then raise exception 'guild_invalid_report';end if;
 select * into ticket from public.dragon_guild_tickets where id=p_ticket and user_id=u for update;
 if not found then raise exception 'guild_ticket_missing';end if;
 select * into prior from public.dragon_guild_reports where ticket_id=p_ticket;
 if found then
  if prior.log_hash<>p_log_hash or prior.payload<>p_report then raise exception 'guild_report_conflict';end if;
  select payload into receipt from public.dragon_guild_receipts where ticket_id=p_ticket and user_id=u;
  return jsonb_build_object('ticketId',p_ticket,'status',prior.status,'receipt',receipt);
 end if;
 if ticket.expires_at<clock_timestamp() or ticket.state<>'issued' then raise exception 'guild_ticket_expired';end if;
 if coalesce(p_report->>'ticketId','')<>p_ticket::text or coalesce(p_report->>'ownerId','')<>u::text or coalesce(p_report->>'logHash','')<>p_log_hash or coalesce(p_report->>'characterId','')<>ticket.character_id or coalesce(p_report->>'missionId','')<>ticket.mission_id or coalesce(p_report->>'ruleVersion','')<>ticket.rules_version
  or p_report->'team' is distinct from ticket.team then raise exception 'guild_report_mismatch';end if;
 insert into public.dragon_guild_reports(ticket_id,user_id,character_id,log_hash,payload) values(p_ticket,u,ticket.character_id,p_log_hash,p_report);
 update public.dragon_guild_tickets set state='submitted' where id=p_ticket;
 -- 只能排隊。沒有authenticated可呼叫的「驗證成功」或「發獎」入口。
 return jsonb_build_object('ticketId',p_ticket,'status','pending','receipt',null);
end $$;
revoke all on function public.guild_submit(uuid,text,jsonb) from public,anon;
grant execute on function public.guild_submit(uuid,text,jsonb) to authenticated;

create or replace function public.guild_receipts(p_character_id text,p_after bigint default 0) returns jsonb language plpgsql stable security definer set search_path='' as $$
begin
 if auth.uid() is null or public.dragon_is_banned() then raise exception 'guild_access_denied';end if;
 if p_character_id is null or length(p_character_id)>120 or p_after is null or p_after<0 then raise exception 'guild_invalid_cursor';end if;
 return coalesce((select jsonb_agg(r.payload order by r.seq) from (select seq,payload from public.dragon_guild_receipts
  where user_id=auth.uid() and character_id=p_character_id and seq>p_after order by seq limit 32) r),'[]'::jsonb);
end $$;
revoke all on function public.guild_receipts(text,bigint) from public,anon;
grant execute on function public.guild_receipts(text,bigint) to authenticated;
commit;
