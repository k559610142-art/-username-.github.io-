-- 傳奇財寶圖：T8～T15掉圖1%，未鑑定；只掉通貨，機率3倍、數量2倍。
-- 使用者自行執行。先安裝server-loot；若日後重跑舊loot-screen/server-loot，須再跑本檔。
begin;
create or replace function public.loot_treasure_currency(c jsonb,x jsonb) returns jsonb
language plpgsql volatile set search_path='' as $$
declare mr jsonb:=x->'map'; m jsonb:=x->'monster'; lv int:=(m->>'lv')::int;
 bonus numeric:=1; k text; dr jsonb; total numeric; r numeric; n int;
begin
 for k in select jsonb_array_elements_text(coalesce(mr->'mods','[]')) loop
  bonus:=bonus+coalesce((c->'mapMods'->k->>'bonus')::numeric,0);
 end loop;
 if random()>=least(1,(case when coalesce((m->>'boss')::boolean,false) then 0.6 else 0.03 end)*bonus*3) then return '[]'::jsonb; end if;
 select sum((v->>'w')::numeric) into total from jsonb_array_elements(c->'currency') v where coalesce((v->>'minLv')::int,0)<=lv;
 r:=random()*total;
 for dr in select * from jsonb_array_elements(c->'currency') v where coalesce((v->>'minLv')::int,0)<=lv loop
  r:=r-(dr->>'w')::numeric;
  if r<0 then
   n:=(case when coalesce((m->>'boss')::boolean,false) then public.loot_int(1,3) else 1 end)*2;
   return jsonb_build_array(public.loot_item(c,dr->>'id',n,null,lv));
  end if;
 end loop;
 return '[]'::jsonb;
end $$;
revoke all on function public.loot_treasure_currency(jsonb,jsonb) from public,anon,authenticated;
create or replace function public.loot_map(c jsonb,t int) returns jsonb language plpgsql volatile set search_path='' as $$
declare r numeric; item jsonb; tier int:=greatest(1,least(15,t));
begin
 if tier>=8 and random()<0.01 then
  item:=public.loot_item(c,'map'||tier,1,null,1);
  return (item-'mm'-'nm')||jsonb_build_object('q','legend','unidentified',true);
 end if;
 r:=random();return public.loot_item(c,'map'||tier,1,case when r<0.5 then null when r<0.85 then 'magic' else 'rare' end,1);
end $$;
revoke all on function public.loot_map(jsonb,int) from public,anon,authenticated;
do $patch$
declare fn record; src text; patched text; needle text;
begin
 for fn in select p.oid,p.proname from pg_proc p join pg_namespace ns on ns.oid=p.pronamespace
  where ns.nspname='public' and p.proname in ('loot_roll','loot_spawn','loot_spawn_screen') loop
  src:=replace(pg_get_functiondef(fn.oid),E'
',E'
');patched:=src;
  if fn.proname='loot_roll' and position('loot_treasure_currency' in src)=0 then
   patched:=regexp_replace(src,'\mbegin\M',E'begin
 if coalesce((mr->>''treasure'')::boolean,false) then return public.loot_treasure_currency(c,x); end if;','i');
  elsif fn.proname in ('loot_spawn','loot_spawn_screen') then
   needle:='''mods'',mr->''mods''';
   if position(needle in src)>0 and position('''treasure''' in src)=0 then
    patched:=replace(src,needle,needle||',''treasure'',coalesce((mr->>''treasure'')::boolean,false) and mr->>''q''=''legend'' and (mr->>''t'')::int>=8 and jsonb_array_length(mr->''mods'')=6');
   elsif fn.proname='loot_spawn' and position('''treasure''' in src)=0 then
    raise exception 'loot_spawn結構不同，未更新，請提供現有函式';
   end if;
  end if;
  if patched<>src then execute patched; end if;
 end loop;
end $patch$;
commit;
