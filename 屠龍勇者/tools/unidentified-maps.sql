-- 打怪取得的異界地圖一律未鑑定（第228節，版本20261029g）：品級／詞綴到村莊鑑定台才決定。
-- T8～T15仍有1%是傳奇財寶圖（掉落時決定、未鑑定時隱藏）。可重跑；使用者自行在Supabase執行。
-- 先裝server-loot與treasure-maps；日後重跑舊server-loot／loot-rates／treasure-maps後須再跑本檔。
begin;
create or replace function public.loot_map(c jsonb,t int) returns jsonb language plpgsql volatile set search_path='' as $$
declare item jsonb; tier int:=greatest(1,least(15,t));
begin
 item:=public.loot_item(c,'map'||tier,1,null,1)-'mm'-'nm'-'q';
 if tier>=8 and random()<0.01 then return item||jsonb_build_object('q','legend','unidentified',true); end if;
 return item||jsonb_build_object('unidentified',true);
end $$;
revoke all on function public.loot_map(jsonb,int) from public,anon,authenticated;
commit;
