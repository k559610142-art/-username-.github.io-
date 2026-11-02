-- 黑暗大陸：管理頁在線人數（2026-11-02，ARCHITECTURE.md 第 271 節）
-- 讀 dragon_online（single-login.sql／supabase.sql）：90 秒內有心跳＝使用中，一個帳號一列。
-- 只有管理者拿得到資料，其他人呼叫回空的；不新增表、不改心跳。可重複執行。
create or replace function public.gm_online() returns table (user_id uuid, device text, beat_at timestamptz)
language sql stable security definer set search_path = '' as $$
    select o.user_id, o.device, o.beat_at from public.dragon_online o
    where public.dragon_is_admin() and o.beat_at > now() - interval '90 seconds'
    order by o.beat_at desc;
$$;
revoke execute on function public.gm_online() from public, anon;
grant execute on function public.gm_online() to authenticated;
