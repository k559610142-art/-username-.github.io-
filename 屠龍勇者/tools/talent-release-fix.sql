-- 命運星盤開放／合法配點存檔排序修復。由使用者在Supabase SQL Editor執行。
-- 不刪除、重置或回滾角色／配點／寶珠／天賦石／試煉。
begin;
do $patch$
declare src text;needle text:=$old$coalesce(t->'nodes','[]') is distinct from expected->'nodes'$old$;
 replacement text:=$new$(select coalesce(jsonb_agg(value order by value),'[]'::jsonb) from jsonb_array_elements(coalesce(t->'nodes','[]'::jsonb))) is distinct from (select coalesce(jsonb_agg(value order by value),'[]'::jsonb) from jsonb_array_elements(coalesce(expected->'nodes','[]'::jsonb))) /* talent_order_set_v1 */$new$;
begin
 if to_regprocedure('public.talent_save_guard()') is null or to_regprocedure('public.talent_action(integer,text,uuid,text,text,bigint)') is null then raise exception '請先安裝原talent-system.sql';end if;
 select pg_get_functiondef('public.talent_save_guard()'::regprocedure) into src;
 if position('talent_order_set_v1' in src)=0 then
  if position(needle in src)=0 then raise exception '存檔驗證版本不同，整筆取消；請勿略過此檢查';end if;
  execute replace(src,needle,replacement);
 end if;
end $patch$;

create or replace function public.talent_status(p_slot int,p_char text) returns jsonb language plpgsql security definer set search_path='' as $$
declare p jsonb;cfg jsonb;trials jsonb;
begin
 p:=public.loot_player(p_slot,p_char);select data->'talentSystem' into cfg from public.dragon_loot_catalog where id=1;
 if cfg is null then raise exception 'talent not open';end if;
 select coalesce(jsonb_agg(trial order by trial),'[]') into trials from public.dragon_talent_trials where user_id=auth.uid() and char_id=p_char;
 return jsonb_build_object('version',cfg->>'version','trials',trials,'saveOrder',1);
end $$;
revoke all on function public.talent_status(int,text),public.talent_action(int,text,uuid,text,text,bigint) from public,anon;
grant execute on function public.talent_status(int,text),public.talent_action(int,text,uuid,text,text,bigint) to authenticated;
notify pgrst,'reload schema';
commit;
