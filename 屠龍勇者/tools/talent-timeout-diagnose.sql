-- 天賦退點／配點「canceling statement due to statement timeout」診斷（2026-11-08，第 325 節）
-- 只讀，不修改任何資料。在 Supabase SQL Editor 整段執行，把最後一個結果表（或每段結果）截圖給 Claude。

-- ① 各函式／存檔寫入的平均與最長耗時（毫秒）
select 'time' as part, calls, round(mean_exec_time::numeric) as avg_ms, round(max_exec_time::numeric) as max_ms,
       left(regexp_replace(query, '\s+', ' ', 'g'), 110) as query
from extensions.pg_stat_statements
where query ilike '%talent_action%' or query ilike '%talent_status%' or query ilike '%vault_put%'
   or query ilike '%dragon_vault_commit%' or query ilike '%loot_finish%' or query ilike '%dragon_saves%'
order by max_exec_time desc
limit 15;

-- ② 現在有沒有卡住、在等鎖的連線
select 'lock' as part, pid, state, wait_event_type, wait_event, round(extract(epoch from now() - query_start)) as sec,
       left(regexp_replace(query, '\s+', ' ', 'g'), 110) as query
from pg_stat_activity
where datname = current_database() and state <> 'idle' and pid <> pg_backend_pid()
order by query_start
limit 15;

-- ③ 天賦與存檔相關資料表大小
select 'size' as part, relname, n_live_tup as rows_, pg_size_pretty(pg_total_relation_size(relid)) as size
from pg_stat_user_tables
where relname like 'dragon_talent%' or relname in ('dragon_saves', 'dragon_save_log', 'dragon_vault_seq', 'dragon_loot_catalog', 'dragon_loot_jobs')
order by pg_total_relation_size(relid) desc;

-- ④ 逾時設定
select 'timeout' as part, rolname, rolconfig from pg_roles where rolname in ('authenticated', 'anon', 'authenticator');
