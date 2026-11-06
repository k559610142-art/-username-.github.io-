-- 黑暗大陸：小地圖下方顯示線上人數（2026-11-07，ARCHITECTURE.md 第 318 節）。可重複執行。
-- online_ping_count()：做原本的心跳（online_ping，單一登入照舊），再回傳「90 秒內有心跳的帳號數」。
-- 遊戲每 60 秒的心跳改呼叫這個，一次請求同時完成，不增加請求量；還沒執行這份時遊戲自動改回原本的 online_ping（不顯示人數）。
-- 一個帳號算一個（dragon_online 主鍵是 user_id），同帳號多開角色不重複算。
create or replace function public.online_ping_count() returns jsonb
language plpgsql security definer set search_path = '' as $$
declare ok boolean;
begin
    ok := public.online_ping();
    return jsonb_build_object('ok', ok, 'n', (select count(*) from public.dragon_online o where o.beat_at > now() - interval '90 seconds'));
end $$;
revoke execute on function public.online_ping_count() from public, anon;
grant execute on function public.online_ping_count() to authenticated;
