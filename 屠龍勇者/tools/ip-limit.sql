-- 黑暗大陸：同一個 IP 最多 3 個帳號同時在線（2026-11-02，ARCHITECTURE.md 第 272 節）
-- 接在 supabase.sql／single-login.sql 之後（會覆蓋 online_claim、online_ping；之後重跑那兩份要再執行這份）。可重複執行。
-- dragon_online 多記 IP；登入 online_claim 時，同 IP、90 秒內有心跳的「其他帳號」已有 3 個 → 拒絕（強制登入也一樣）。
-- 管理者、信任名單（flag-trust.sql 的 dragon_trusted）不受限制，也不算進別人的名額。
-- 心跳 online_ping 只更新 IP，不會把已在玩的人踢掉；沒有登入紀錄時才檢查名額（滿了就不寫入）。
alter table public.dragon_online add column if not exists ip text;
create index if not exists dragon_online_ip_idx on public.dragon_online (ip, beat_at);

create or replace function public.dragon_req_ip() returns text
language plpgsql stable set search_path = '' as $$
declare h jsonb;
begin
    begin h := coalesce(nullif(current_setting('request.headers', true), ''), '{}')::jsonb; exception when others then return null; end;
    return nullif(left(trim(coalesce(h ->> 'cf-connecting-ip', split_part(h ->> 'x-forwarded-for', ',', 1), h ->> 'x-real-ip')), 60), '');
end $$;

-- 不受限制的帳號：管理者、信任名單（還沒安裝 flag-trust.sql 時只看管理者）
create or replace function public.dragon_ip_exempt(u uuid) returns boolean
language plpgsql stable security definer set search_path = '' as $$
declare ok boolean := false;
begin
    if exists (select 1 from public.dragon_admins a where a.user_id = u) then return true; end if;
    if to_regclass('public.dragon_trusted') is not null then
        execute 'select exists (select 1 from public.dragon_trusted t where t.user_id = $1)' into ok using u;
    end if;
    return coalesce(ok, false);
end $$;

-- 同 IP、90 秒內有心跳、不是自己、不是免限制帳號的在線帳號數
create or replace function public.dragon_ip_count(p_ip text) returns int
language sql stable security definer set search_path = '' as $$
    select count(*)::int from public.dragon_online o
    where p_ip is not null and o.ip = p_ip and o.user_id <> auth.uid()
      and o.beat_at > now() - interval '90 seconds' and not public.dragon_ip_exempt(o.user_id);
$$;

create or replace function public.online_claim(p_device text, p_force boolean default false) returns json
language plpgsql security definer set search_path = '' as $$
declare sid text := coalesce(auth.jwt() ->> 'session_id', ''); r public.dragon_online; ip text := public.dragon_req_ip(); n int;
begin
    if auth.uid() is null then raise exception 'not logged in'; end if;
    if sid = '' then return json_build_object('ok', true); end if;
    select * into r from public.dragon_online where user_id = auth.uid() for update;
    if found and r.session_id <> sid and r.beat_at > now() - interval '90 seconds' and not coalesce(p_force, false) then
        return json_build_object('ok', false, 'device', r.device, 'ago', floor(extract(epoch from now() - r.beat_at))::int);
    end if;
    if ip is not null and not public.dragon_ip_exempt(auth.uid()) then
        perform pg_advisory_xact_lock(7713301, hashtext(ip));   -- 同 IP 同時登入不會一起擠過上限
        n := public.dragon_ip_count(ip);
        if n >= 3 then return json_build_object('ok', false, 'reason', 'ip', 'n', n, 'max', 3); end if;
    end if;
    insert into public.dragon_online (user_id, session_id, device, beat_at, ip) values (auth.uid(), sid, left(p_device, 80), now(), ip)
        on conflict (user_id) do update set session_id = excluded.session_id, device = excluded.device, beat_at = now(), ip = excluded.ip;
    return json_build_object('ok', true);
end $$;

create or replace function public.online_ping() returns boolean
language plpgsql security definer set search_path = '' as $$
declare sid text := coalesce(auth.jwt() ->> 'session_id', ''); r public.dragon_online; ip text := public.dragon_req_ip();
begin
    if auth.uid() is null or sid = '' then return true; end if;
    select * into r from public.dragon_online where user_id = auth.uid() for update;
    if found and r.session_id <> sid and r.beat_at > now() - interval '90 seconds' then return false; end if;
    -- 沒有在線紀錄（或已逾時）才檢查名額：已在玩的人換網路不會被踢；名額滿了就不寫入
    if (not found or r.beat_at <= now() - interval '90 seconds') and ip is not null and not public.dragon_ip_exempt(auth.uid())
        and public.dragon_ip_count(ip) >= 3 then return true; end if;
    insert into public.dragon_online (user_id, session_id, beat_at, ip) values (auth.uid(), sid, now(), ip)
        on conflict (user_id) do update set session_id = excluded.session_id, beat_at = now(), ip = coalesce(excluded.ip, public.dragon_online.ip);
    return true;
end $$;

revoke execute on function public.dragon_req_ip(), public.dragon_ip_exempt(uuid), public.dragon_ip_count(text) from public, anon, authenticated;
grant execute on function public.online_claim(text, boolean), public.online_ping() to authenticated;
revoke execute on function public.online_claim(text, boolean), public.online_ping() from anon;
