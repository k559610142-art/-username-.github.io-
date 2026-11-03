-- 黑暗大陸：村莊遊戲告示牌（2026-11-03，ARCHITECTURE.md 第 279、289 節）。接在 supabase.sql 之後執行（用到 dragon_is_admin），可重複執行。
-- 只有一筆（id = 1）：贊助人、目前遊戲經費、開支、餘額四段文字。玩家（含沒登入）用 notice_get 讀；管理者在 gm.html「📋 告示牌」用 gm_notice_set 改。
create table if not exists public.dragon_notice (
    id         int primary key default 1 check (id = 1),
    sponsors   text not null default '' check (char_length(sponsors) <= 2000),
    funds      text not null default '' check (char_length(funds) <= 500),
    updated_at timestamptz not null default now()
);
-- 2026-11-03 第 289 節：經費旁邊加「開支」「餘額」
alter table public.dragon_notice add column if not exists expenses text not null default '' check (char_length(expenses) <= 1000);
alter table public.dragon_notice add column if not exists balance  text not null default '' check (char_length(balance) <= 500);
insert into public.dragon_notice (id) values (1) on conflict do nothing;
alter table public.dragon_notice enable row level security;
revoke all on public.dragon_notice from anon, authenticated;   -- 只能透過下面的函式

create or replace function public.notice_get() returns json
language sql stable security definer set search_path = '' as $$
    select json_build_object('sponsors', sponsors, 'funds', funds, 'expenses', expenses, 'balance', balance, 'updated_at', updated_at) from public.dragon_notice where id = 1;
$$;

drop function if exists public.gm_notice_set(text, text);   -- 舊版兩個參數
create or replace function public.gm_notice_set(p_sponsors text, p_funds text, p_expenses text, p_balance text) returns json
language plpgsql security definer set search_path = '' as $$
begin
    if not public.dragon_is_admin() then raise exception 'not admin'; end if;
    update public.dragon_notice set sponsors = left(coalesce(p_sponsors, ''), 2000), funds = left(coalesce(p_funds, ''), 500),
        expenses = left(coalesce(p_expenses, ''), 1000), balance = left(coalesce(p_balance, ''), 500), updated_at = now() where id = 1;
    return public.notice_get();
end $$;

revoke execute on function public.notice_get(), public.gm_notice_set(text, text, text, text) from public;
grant execute on function public.notice_get() to anon, authenticated;
grant execute on function public.gm_notice_set(text, text, text, text) to authenticated;
