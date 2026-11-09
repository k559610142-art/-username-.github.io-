-- 天賦退點／配點逾時修正（2026-11-09，第 327 節）。由使用者在 Supabase SQL Editor 整段執行一次。
-- 剖析結果：寫一次存檔只要 0.08～0.44 秒，逾時是「排隊等鎖」。
-- 修正：talent_action 先排掉寶結算的鎖（7713201，和 loot_finish_batch 同順序，不會互卡），
--       並把等鎖上限設 4 秒；等不到就立刻失敗（整筆復原、不扣天賦石），由遊戲用同一張單號自動重試。
-- 不刪除、重置任何角色／配點／寶珠／天賦石資料；重複執行無害。
begin;
do $patch$
declare src text;
 needle text:=$old$perform pg_advisory_xact_lock(7713100,hashtext(auth.uid()::text));$old$;
 replacement text:=$new$perform set_config('lock_timeout','4000',true);perform pg_advisory_xact_lock(7713201,hashtext(auth.uid()::text));perform pg_advisory_xact_lock(7713100,hashtext(auth.uid()::text)); /* talent_lock_order_v1 */$new$;
begin
 if to_regprocedure('public.talent_action(integer,text,uuid,text,text,bigint)') is null then raise exception '請先安裝原talent-system.sql';end if;
 select pg_get_functiondef('public.talent_action(integer,text,uuid,text,text,bigint)'::regprocedure) into src;
 if position('talent_lock_order_v1' in src)>0 then return;end if;
 if position(needle in src)=0 then raise exception 'talent_action 版本不同，整筆取消';end if;
 execute replace(src,needle,replacement);
end $patch$;
revoke all on function public.talent_action(int,text,uuid,text,text,bigint) from public,anon;
grant execute on function public.talent_action(int,text,uuid,text,text,bigint) to authenticated;
notify pgrst,'reload schema';
commit;
