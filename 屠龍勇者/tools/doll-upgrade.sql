-- 黑暗大陸：無限塔每日次數＋娃娃升級卷軸（後台計算，2026-11-13，ARCHITECTURE.md 第 332、333 節）。可重複執行。
-- 由使用者貼到 Supabase SQL Editor 執行。不改存檔、不改既有掉寶目錄。
-- 以角色為單位（user_id＋char_id，char_id＝遊戲的 lootChar()＝created|cls）；卷軸數量存在伺服器，玩家改存檔也加不了。
--   inf_status(char)               查今天已進塔幾次、剩幾次、卷軸張數（進塔前顯示）
--   inf_run_start(char)            買票進無限塔時呼叫：每天（台灣時間 00:00 重置）最多 3 次，超過拒絕 'daily limit'；
--                                  記下這一趟的開始時間（舊的一趟作廢），回傳 {run, used, left}
--   inf_claim(char, run, floor)    擊殺第 10、15、20、25…層（10 以上、5 的倍數）首領時領 1 張：同一趟每層只能領一次，
--                                  且進塔時間要夠（第 N 層的首領最早在 (N−1)×30 秒出現，容許 5% 誤差）
--   doll_scroll_status(char)       查剩幾張
--   doll_upgrade(char, from, to)   用 1 張：檢查 from→to 是 T4→T3／T3→T2／T2→T1／T1→T0，伺服器擲 5%，回傳成功與否與剩餘張數
-- 娃娃本身仍在玩家存檔裡（跟其他道具一樣）；成功時由遊戲把那隻娃娃換成 to。門票 1000 萬金幣由遊戲扣（金幣在存檔裡）。
begin;

create table if not exists public.dragon_doll_scrolls (
 user_id uuid not null references auth.users(id) on delete cascade,
 char_id text not null,
 scrolls int not null default 0 check (scrolls >= 0),
 updated_at timestamptz not null default now(),
 primary key (user_id, char_id)
);
create table if not exists public.dragon_inf_runs (
 user_id uuid not null references auth.users(id) on delete cascade,
 char_id text not null,
 run_id uuid not null,
 started_at timestamptz not null default now(),
 claimed int[] not null default '{}',
 primary key (user_id, char_id)
);
alter table public.dragon_inf_runs add column if not exists day date;                    -- 次數是哪一天的（台灣時間）
alter table public.dragon_inf_runs add column if not exists runs int not null default 0;  -- 那一天進塔幾次
create table if not exists public.dragon_doll_upgrade_log (
 id bigserial primary key,
 user_id uuid not null,
 char_id text not null,
 kind text not null,          -- 'enter' 進塔（floor 欄放當天第幾次）／'claim' 領卷軸／'upgrade' 升級
 floor int,
 from_doll text,
 to_doll text,
 ok boolean,
 scrolls int,
 at timestamptz not null default now()
);
create index if not exists dragon_doll_upgrade_log_user on public.dragon_doll_upgrade_log(user_id, at desc);
alter table public.dragon_doll_scrolls enable row level security;
alter table public.dragon_inf_runs enable row level security;
alter table public.dragon_doll_upgrade_log enable row level security;
revoke all on public.dragon_doll_scrolls, public.dragon_inf_runs, public.dragon_doll_upgrade_log from public, anon, authenticated;

-- 21 隻娃娃的階級（跟遊戲 items.js 的 DOLLS 一致）
create or replace function public.dragon_doll_quality(p text) returns text
language sql immutable set search_path = '' as $$
 select case p
  when 'doll_skeleton-knight' then 'T4' when 'doll_forest-deer' then 'T4' when 'doll_mushroom-rabbit' then 'T4' when 'doll_snow-owl' then 'T4' when 'doll_steam-squirrel' then 'T4'
  when 'doll_forest-sprite' then 'T3' when 'doll_lava-hound' then 'T3' when 'doll_star-fox' then 'T3' when 'doll_tidal-dragon' then 'T3'
  when 'doll_frost-dragon' then 'T2' when 'doll_flower-rabbit' then 'T2' when 'doll_golden-griffin' then 'T2' when 'doll_crystal-turtle' then 'T2'
  when 'doll_white-tiger' then 'T1' when 'doll_azure-dragon' then 'T1' when 'doll_vermillion-bird' then 'T1' when 'doll_black-tortoise' then 'T1'
  when 'doll_golden-dragon' then 'T0' when 'doll_phoenix' then 'T0' when 'doll_qilin' then 'T0' when 'doll_little-demon' then 'T0'
  else null end
$$;
revoke all on function public.dragon_doll_quality(text) from public, anon, authenticated;

-- 台灣時間的今天（每天 00:00 重置進塔次數）
create or replace function public.dragon_inf_today() returns date
language sql stable set search_path = '' as $$ select (now() at time zone 'Asia/Taipei')::date $$;
revoke all on function public.dragon_inf_today() from public, anon, authenticated;

-- 共用檢查：登入、沒被封鎖、角色代號合理
create or replace function public.dragon_doll_scroll_check(p_char text) returns uuid
language plpgsql stable security definer set search_path = '' as $$
declare u uuid := auth.uid();
begin
 if u is null then raise exception 'not logged in'; end if;
 if coalesce(public.dragon_is_banned(), false) then raise exception 'banned'; end if;
 if p_char is null or length(p_char) < 3 or length(p_char) > 64 or position('|' in p_char) = 0 then raise exception 'bad char'; end if;
 return u;
end $$;
revoke all on function public.dragon_doll_scroll_check(text) from public, anon, authenticated;

create or replace function public.inf_status(p_char text) returns jsonb
language plpgsql stable security definer set search_path = '' as $$
declare u uuid := public.dragon_doll_scroll_check(p_char); used int;
begin
 select case when day = public.dragon_inf_today() then runs else 0 end into used from public.dragon_inf_runs where user_id = u and char_id = p_char;
 used := coalesce(used, 0);
 return jsonb_build_object('used', used, 'left', greatest(0, 3 - used),
  'scrolls', coalesce((select scrolls from public.dragon_doll_scrolls where user_id = u and char_id = p_char), 0));
end $$;

drop function if exists public.inf_run_start(text);   -- 早期版本回傳 uuid，改回傳 jsonb
create function public.inf_run_start(p_char text) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare u uuid := public.dragon_doll_scroll_check(p_char); r uuid := gen_random_uuid(); today date := public.dragon_inf_today();
 cur public.dragon_inf_runs; used int;
begin
 select * into cur from public.dragon_inf_runs where user_id = u and char_id = p_char for update;
 used := case when found and cur.day = today then cur.runs else 0 end;
 if used >= 3 then raise exception 'daily limit'; end if;   -- 每天最多 3 次
 used := used + 1;
 insert into public.dragon_inf_runs(user_id, char_id, run_id, started_at, claimed, day, runs) values (u, p_char, r, now(), '{}', today, used)
 on conflict (user_id, char_id) do update set run_id = excluded.run_id, started_at = excluded.started_at, claimed = '{}', day = excluded.day, runs = excluded.runs;
 insert into public.dragon_doll_upgrade_log(user_id, char_id, kind, floor) values (u, p_char, 'enter', used);
 return jsonb_build_object('run', r, 'used', used, 'left', 3 - used);
end $$;

create or replace function public.inf_claim(p_char text, p_run uuid, p_floor int) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare u uuid := public.dragon_doll_scroll_check(p_char); run public.dragon_inf_runs; n int;
begin
 if p_floor is null or p_floor < 10 or p_floor > 2000 or p_floor % 5 <> 0 then raise exception 'bad floor'; end if;   -- 10、15、20、25…
 select * into run from public.dragon_inf_runs where user_id = u and char_id = p_char for update;
 if not found or run.run_id is distinct from p_run then raise exception 'bad run'; end if;
 if p_floor = any(run.claimed) then raise exception 'already claimed'; end if;
 -- 每層 30 秒，第 N 層的首領最早在 (N−1)×30 秒出現（容許 5% 時鐘誤差）
 if now() - run.started_at < make_interval(secs => (p_floor - 1) * 30 * 0.95) then raise exception 'too early'; end if;
 update public.dragon_inf_runs set claimed = claimed || p_floor where user_id = u and char_id = p_char;
 insert into public.dragon_doll_scrolls(user_id, char_id, scrolls) values (u, p_char, 1)
 on conflict (user_id, char_id) do update set scrolls = public.dragon_doll_scrolls.scrolls + 1, updated_at = now()
 returning scrolls into n;
 insert into public.dragon_doll_upgrade_log(user_id, char_id, kind, floor, scrolls) values (u, p_char, 'claim', p_floor, n);
 return jsonb_build_object('ok', true, 'scrolls', n);
end $$;

create or replace function public.doll_scroll_status(p_char text) returns int
language plpgsql stable security definer set search_path = '' as $$
declare u uuid := public.dragon_doll_scroll_check(p_char);
begin
 return coalesce((select scrolls from public.dragon_doll_scrolls where user_id = u and char_id = p_char), 0);
end $$;

create or replace function public.doll_upgrade(p_char text, p_from text, p_to text) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare u uuid := public.dragon_doll_scroll_check(p_char); qf text := public.dragon_doll_quality(p_from); qt text := public.dragon_doll_quality(p_to);
 n int; ok boolean;
begin
 if qf is null or qt is null then raise exception 'unknown doll'; end if;
 if not ((qf = 'T4' and qt = 'T3') or (qf = 'T3' and qt = 'T2') or (qf = 'T2' and qt = 'T1') or (qf = 'T1' and qt = 'T0')) then raise exception 'bad upgrade'; end if;
 select scrolls into n from public.dragon_doll_scrolls where user_id = u and char_id = p_char for update;
 if coalesce(n, 0) < 1 then raise exception 'no scrolls'; end if;
 ok := random() < 0.05;   -- 成功率 5%；失敗只扣卷軸
 update public.dragon_doll_scrolls set scrolls = scrolls - 1, updated_at = now() where user_id = u and char_id = p_char returning scrolls into n;
 insert into public.dragon_doll_upgrade_log(user_id, char_id, kind, from_doll, to_doll, ok, scrolls) values (u, p_char, 'upgrade', p_from, p_to, ok, n);
 return jsonb_build_object('ok', ok, 'scrolls', n);
end $$;

revoke all on function public.inf_status(text), public.inf_run_start(text), public.inf_claim(text, uuid, int), public.doll_scroll_status(text), public.doll_upgrade(text, text, text) from public, anon;
grant execute on function public.inf_status(text), public.inf_run_start(text), public.inf_claim(text, uuid, int), public.doll_scroll_status(text), public.doll_upgrade(text, text, text) to authenticated;

commit;
