-- 黑暗大陸：村莊遊戲告示牌（2026-11-03，ARCHITECTURE.md 第 279 節）。接在 supabase.sql 之後執行（用到 dragon_is_admin），可重複執行。
-- 只有一筆（id = 1）：贊助人、目前遊戲經費兩段文字。玩家（含沒登入）用 notice_get 讀；管理者在 gm.html「📋 告示牌」用 gm_notice_set 改。
create table if not exists public.dragon_notice (
    id         int primary key default 1 check (id = 1),
    sponsors   text not null default '' check (char_length(sponsors) <= 2000),
    funds      text not null default '' check (char_length(funds) <= 500),
    updated_at timestamptz not null default now()
);
insert into public.dragon_notice (id) values (1) on conflict do nothing;
alter table public.dragon_notice enable row level security;
revoke all on public.dragon_notice from anon, authenticated;   -- 只能透過下面的函式

create or replace function public.notice_get() returns json
language sql stable security definer set search_path = '' as $$
    select json_build_object('sponsors', sponsors, 'funds', funds, 'updated_at', updated_at) from public.dragon_notice where id = 1;
$$;

create or replace function public.gm_notice_set(p_sponsors text, p_funds text) returns json
language plpgsql security definer set search_path = '' as $$
begin
    if not public.dragon_is_admin() then raise exception 'not admin'; end if;
    update public.dragon_notice set sponsors = left(coalesce(p_sponsors, ''), 2000), funds = left(coalesce(p_funds, ''), 500), updated_at = now() where id = 1;
    return public.notice_get();
end $$;

revoke execute on function public.notice_get(), public.gm_notice_set(text, text) from public;
grant execute on function public.notice_get() to anon, authenticated;
grant execute on function public.gm_notice_set(text, text) to authenticated;
