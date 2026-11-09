-- 存檔寫入（天賦退點／倉庫／交易所都走這條）各觸發器耗時剖析（2026-11-09，第 327 節）
-- 以玩家身分對「最近有在玩的 6 個角色」各做一次假寫入，用 EXPLAIN ANALYZE 量每個觸發器花幾毫秒。
-- 最後一定 raise exception → 整筆自動復原，不會寫入任何資料；結果在紅色錯誤訊息裡，整段截圖給 Claude。
-- 執行期間那幾格存檔會被鎖住約 1～數秒，玩家存檔會稍等一下，不會失敗。
do $diag$
declare r record; line text; out text := ''; n int := 0;
begin
 for r in select s.user_id, s.slot, s.name, s.cls, pg_column_size(s.data) as sz
          from public.dragon_saves s order by s.updated_at desc limit 6 loop
  n := n + 1;
  out := out || E'\n== ' || n || '. ' || coalesce(r.name, '?') || '（' || coalesce(r.cls, '?') || '）存檔 ' || pg_size_pretty(r.sz::bigint);
  begin
   perform set_config('request.jwt.claims', json_build_object('sub', r.user_id, 'role', 'authenticated')::text, true);
   perform set_config('request.jwt.claim.sub', r.user_id::text, true);
   perform set_config('request.jwt.claim.role', 'authenticated', true);
   execute 'set local role authenticated';
   for line in execute format('explain (analyze, timing) update public.dragon_saves set data = data || %L::jsonb where user_id = %L and slot = %s',
                              '{"diagProbe":1}', r.user_id, r.slot) loop
    if line ~ '^\s*(Trigger|Execution Time)' then out := out || E'\n  ' || trim(line); end if;
   end loop;
   execute 'reset role';
  exception when others then
   out := out || E'\n  錯誤：' || sqlerrm;
  end;
 end loop;
 raise exception '診斷結果（已自動復原，沒有寫入任何資料）：%', out;
end $diag$;
