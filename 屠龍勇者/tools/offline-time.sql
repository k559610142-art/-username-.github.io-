-- 黑暗大陸：離線收益改用伺服器時間（2026-11-05，ARCHITECTURE.md 第 306 節）。可重跑。
-- 以前離線時間＝玩家裝置時鐘「現在 − 上次存檔」，把手機／電腦時間往後調就能一直領離線經驗。
-- 現在遊戲中每 3 分鐘回報一次「這個角色還在線上」（offline_seen(slot,false)），結算時 offline_seen(slot,true)
-- 回傳伺服器量到的「距離上次回報」毫秒數，遊戲端只結算這段時間（裝置時間怎麼改都沒用）。
begin;
create table if not exists public.dragon_offline_seen(
    user_id uuid not null references auth.users(id) on delete cascade,
    slot smallint not null check (slot >= 0 and slot < 8),
    seen_at timestamptz not null default now(),
    primary key (user_id, slot));
alter table public.dragon_offline_seen enable row level security;
revoke all on public.dragon_offline_seen from public, anon, authenticated;   -- 只能透過下面的函式

create or replace function public.offline_seen(p_slot int, p_claim boolean default false) returns bigint
language plpgsql security definer set search_path = '' as $$
declare prev timestamptz;
begin
    if auth.uid() is null then raise exception 'not logged in'; end if;
    if p_slot is null or p_slot < 0 or p_slot > 7 then raise exception 'bad slot'; end if;
    select seen_at into prev from public.dragon_offline_seen where user_id = auth.uid() and slot = p_slot for update;
    -- 第一次（安裝前就離線的角色）：用雲端存檔最後上傳的伺服器時間
    if prev is null then select updated_at into prev from public.dragon_saves where user_id = auth.uid() and slot = p_slot; end if;
    insert into public.dragon_offline_seen(user_id, slot, seen_at) values (auth.uid(), p_slot, now())
        on conflict (user_id, slot) do update set seen_at = now();
    if not coalesce(p_claim, false) then return null; end if;
    return case when prev is null then 0 else greatest(0, floor(extract(epoch from now() - prev) * 1000))::bigint end;
end $$;
revoke all on function public.offline_seen(int, boolean) from public, anon;
grant execute on function public.offline_seen(int, boolean) to authenticated;
commit;
