-- 緊急停止正式天賦入口／操作。由使用者在Supabase SQL Editor執行。
-- 不刪除、清空或回滾玩家配點、寶珠、天賦石、試煉、交易紀錄。
begin;
do $$
declare signature text;target regprocedure;
begin
 foreach signature in array array['public.talent_status(integer,text)','public.talent_action(integer,text,uuid,text,text,bigint)'] loop
  target:=to_regprocedure(signature);
  if target is not null then execute format('revoke all on function %s from public,anon,authenticated',target);end if;
 end loop;
end $$;
notify pgrst,'reload schema';
commit;
