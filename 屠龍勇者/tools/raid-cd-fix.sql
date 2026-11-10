-- 團隊副本結算修正（2026-11-10，第 328 節）。在 Supabase SQL Editor 整段執行一次，重跑無害。
-- 問題：boss-timer.sql 在 loot_raid 插入「副本冷卻」時用 r.raid；第 305 節勝利紀錄版 loot_raid 只把副本 id 放在 rid，r 是空的
--   → 依安裝順序會是：(A) 後跑 raid-wins.sql：副本冷卻沒寫到伺服器；(B) 後跑 boss-timer.sql：r.raid＝NULL，dragon_boss_cd.key not null 錯誤，副本獎勵整筆領不到。
-- 修正：只改 loot_raid 這一行，其他函式不動；不刪除任何資料。
begin;
do $patch$
declare src text;patched text;
begin
 if to_regprocedure('public.loot_raid(integer,text,uuid,integer)') is null then raise exception '找不到 loot_raid';end if;
 if to_regprocedure('public.boss_cd_set(text,text,numeric)') is null then raise exception '請先安裝 boss-timer.sql';end if;
 src:=pg_get_functiondef('public.loot_raid(integer,text,uuid,integer)'::regprocedure);
 if position('rid:=' in src)=0 then raise exception 'loot_raid 不是勝利紀錄版（第 305 節），請先執行 raid-wins.sql';end if;
 if position('boss_cd_set' in src)=0 then
  if position($q$'loot invalid raid';end if;$q$ in src)=0 then raise exception 'loot_raid 結構不同，整筆取消';end if;
  patched:=replace(src,$q$'loot invalid raid';end if;$q$,$q$'loot invalid raid';end if;perform public.boss_cd_set('raid',p_char||'|'||rid,coalesce((def->>'cdH')::numeric,2));$q$);
 else
  patched:=replace(src,$q$'|'||r.raid,coalesce((def->>'cdH')$q$,$q$'|'||rid,coalesce((def->>'cdH')$q$);
 end if;
 if patched<>src then execute patched;raise notice '已修正 loot_raid';else raise notice 'loot_raid 已是正確版本，未變更';end if;
end $patch$;
commit;

-- 執行後確認（應該是 true / false）：
select position('boss_cd_set' in d)>0 as has_raid_cd, position('||r.raid,' in d)>0 as still_broken
from (select pg_get_functiondef('public.loot_raid(integer,text,uuid,integer)'::regprocedure) d) x;
