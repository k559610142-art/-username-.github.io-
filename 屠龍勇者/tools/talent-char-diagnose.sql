-- 單一角色天賦退點／配點一直逾時的診斷（2026-11-09，第 327 節）
-- 只讀，不修改任何資料。把下面的「角色名」換成那個角色在遊戲裡的名字（保留單引號），整段執行後截圖。
with s as (
  select user_id, slot, name, cls, lv, data,
         (data->'player'->>'created')||'|'||(data->'player'->>'cls') as char_id
  from public.dragon_saves
  where name = '角色名'
)
select s.name, s.cls, s.lv, s.slot,
       pg_size_pretty(pg_column_size(s.data)::bigint)                          as save_size,
       jsonb_array_length(coalesce(s.data->'player'->'talent'->'nodes','[]')) as save_nodes,
       (select jsonb_array_length(coalesce(t.data->'nodes','[]')) from public.dragon_talent_state t
         where t.user_id=s.user_id and t.char_id=s.char_id)                   as server_nodes,
       (select count(*) from public.dragon_talent_ops o where o.user_id=s.user_id and o.char_id=s.char_id) as talent_ops,
       (select count(*) from public.dragon_loot_jobs j where j.user_id=s.user_id and j.char_id=s.char_id) as loot_jobs,
       (select count(*) from public.dragon_loot_jobs j where j.user_id=s.user_id and j.char_id=s.char_id and j.result is null) as loot_pending,
       (select count(*) from public.dragon_loot_receipts r where r.user_id=s.user_id and r.char_id=s.char_id) as loot_receipts,
       (select l.issued||' / '||l.acknowledged from public.dragon_loot_state l
         where l.user_id=s.user_id and l.char_id=s.char_id)                   as loot_issued_ack,
       (select count(*) from public.dragon_save_log g where g.user_id=s.user_id) as save_log_rows,
       (select count(*) from pg_locks k where k.locktype='advisory' and not k.granted) as waiting_locks
from s;
