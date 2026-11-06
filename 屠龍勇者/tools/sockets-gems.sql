-- 黑暗大陸：裝備開孔＋技能／輔助寶石（2026-11-07，ARCHITECTURE.md 第 317 節）。由 tools/build-gems-sql.js 從遊戲資料產生，不要手改。可重複執行。
-- ⚠️ 請在新版遊戲（20261107d）上線前後盡快執行：① 會改防改檔簽章，沒執行前「有孔的裝備／寶石」上傳後簽章不符，交易所與共用倉庫會暫時不能用（沒有孔的舊道具不受影響）。
-- ① dragon_item_canon：道具有寶石等級（gl／gx）、孔（so）、串聯（ln）時，在原本的簽章字串後面接上 ,G:等級:經驗／,S:孔…,L:串聯（跟 data/guard.js guardItemCanon 一模一樣）；沒有這些欄位的道具簽章不變。
-- ② 掉寶目錄補 13 種輔助寶石、開孔石／連結石（version 尾碼 -gems20261107，舊憑證照舊規則）
-- ③ loot_gem：後端首領每隻 10% 掉一顆輔助寶石；修補 loot_roll 結尾接上。小怪在遊戲裡本機掉（0.3%）。
-- 裝備的孔數與串聯由遊戲端在拿到新裝備時擲（和通貨改造一樣在遊戲端），伺服器不產生孔。
begin;
create or replace function public.dragon_item_canon(x jsonb) returns text language plpgsql immutable set search_path = '' as $$
declare s text;
begin
    s := concat_ws(',', coalesce(x ->> 'uid', ''), coalesce(x ->> 'id', ''), coalesce(x ->> 'n', ''), coalesce(x ->> 'ench', ''), coalesce(x ->> 'q', ''),
        coalesce((select string_agg(coalesce(a.v ->> 'k', '') || ':' || coalesce(a.v ->> 'v', ''), '/' order by a.o)
                  from jsonb_array_elements(case when jsonb_typeof(x -> 'af') = 'array' then x -> 'af' else '[]'::jsonb end) with ordinality a(v, o)), ''));
    if (x ? 'gl' and jsonb_typeof(x -> 'gl') <> 'null') or (x ? 'gx' and jsonb_typeof(x -> 'gx') <> 'null') then
        s := s || ',G:' || coalesce(x ->> 'gl', '') || ':' || coalesce(x ->> 'gx', '');
    end if;
    if jsonb_typeof(x -> 'so') = 'array' then
        s := s || ',S:' || coalesce((select string_agg(case when e.v is null or jsonb_typeof(e.v) = 'null' then '_'
                                                           when e.v ->> 't' = 'skill' then 's' || coalesce(e.v ->> 'sk', '')
                                                           else '{' || public.dragon_item_canon(e.v) || '}' end, '~' order by e.o)
                                     from jsonb_array_elements(x -> 'so') with ordinality e(v, o)), '')
               || ',L:' || coalesce((select string_agg(l.v #>> '{}', '' order by l.o)
                                     from jsonb_array_elements(case when jsonb_typeof(x -> 'ln') = 'array' then x -> 'ln' else '[]'::jsonb end) with ordinality l(v, o)), '');
    end if;
    return s;
end $$;
revoke execute on function public.dragon_item_canon(jsonb) from public, anon, authenticated;

do $gems$
declare c public.dragon_loot_catalog%rowtype; d jsonb; v text; x jsonb;
begin
 select * into c from public.dragon_loot_catalog where id=1 for update;
 if not found then raise exception '請先安裝後端掉寶目錄';end if;
 if position('-gems20261107' in c.version)>0 then return;end if;
 d:=jsonb_set(c.data,'{items}',(c.data->'items')||$items${"gem_multistrike":{"name":"輔助寶石・多重打擊","cat":"gem","gem":"multistrike","wt":1,"sell":2000,"desc":"鑲在裝備的孔裡，跟技能寶石串聯才有效果；鑲在身上時擊殺會累積經驗升級（最高 20 級）","sellValue":2000,"stack":false,"affixes":[],"bookLv":null},"gem_aoeExpand":{"name":"輔助寶石・範圍擴大","cat":"gem","gem":"aoeExpand","wt":1,"sell":2000,"desc":"鑲在裝備的孔裡，跟技能寶石串聯才有效果；鑲在身上時擊殺會累積經驗升級（最高 20 級）","sellValue":2000,"stack":false,"affixes":[],"bookLv":null},"gem_addFireG":{"name":"輔助寶石・附加火焰","cat":"gem","gem":"addFireG","wt":1,"sell":2000,"desc":"鑲在裝備的孔裡，跟技能寶石串聯才有效果；鑲在身上時擊殺會累積經驗升級（最高 20 級）","sellValue":2000,"stack":false,"affixes":[],"bookLv":null},"gem_addIceG":{"name":"輔助寶石・附加冰冷","cat":"gem","gem":"addIceG","wt":1,"sell":2000,"desc":"鑲在裝備的孔裡，跟技能寶石串聯才有效果；鑲在身上時擊殺會累積經驗升級（最高 20 級）","sellValue":2000,"stack":false,"affixes":[],"bookLv":null},"gem_addLightG":{"name":"輔助寶石・附加閃電","cat":"gem","gem":"addLightG","wt":1,"sell":2000,"desc":"鑲在裝備的孔裡，跟技能寶石串聯才有效果；鑲在身上時擊殺會累積經驗升級（最高 20 級）","sellValue":2000,"stack":false,"affixes":[],"bookLv":null},"gem_elemFocus":{"name":"輔助寶石・元素集中","cat":"gem","gem":"elemFocus","wt":1,"sell":2000,"desc":"鑲在裝備的孔裡，跟技能寶石串聯才有效果；鑲在身上時擊殺會累積經驗升級（最高 20 級）","sellValue":2000,"stack":false,"affixes":[],"bookLv":null},"gem_critBoost":{"name":"輔助寶石・暴擊強化","cat":"gem","gem":"critBoost","wt":1,"sell":2000,"desc":"鑲在裝備的孔裡，跟技能寶石串聯才有效果；鑲在身上時擊殺會累積經驗升級（最高 20 級）","sellValue":2000,"stack":false,"affixes":[],"bookLv":null},"gem_leechG":{"name":"輔助寶石・吸血","cat":"gem","gem":"leechG","wt":1,"sell":2000,"desc":"鑲在裝備的孔裡，跟技能寶石串聯才有效果；鑲在身上時擊殺會累積經驗升級（最高 20 級）","sellValue":2000,"stack":false,"affixes":[],"bookLv":null},"gem_efficiency":{"name":"輔助寶石・耗魔降低","cat":"gem","gem":"efficiency","wt":1,"sell":2000,"desc":"鑲在裝備的孔裡，跟技能寶石串聯才有效果；鑲在身上時擊殺會累積經驗升級（最高 20 級）","sellValue":2000,"stack":false,"affixes":[],"bookLv":null},"gem_cdrG":{"name":"輔助寶石・冷卻縮減","cat":"gem","gem":"cdrG","wt":1,"sell":2000,"desc":"鑲在裝備的孔裡，跟技能寶石串聯才有效果；鑲在身上時擊殺會累積經驗升級（最高 20 級）","sellValue":2000,"stack":false,"affixes":[],"bookLv":null},"gem_chainG":{"name":"輔助寶石・連鎖","cat":"gem","gem":"chainG","wt":1,"sell":2000,"desc":"鑲在裝備的孔裡，跟技能寶石串聯才有效果；鑲在身上時擊殺會累積經驗升級（最高 20 級）","sellValue":2000,"stack":false,"affixes":[],"bookLv":null},"gem_brutality":{"name":"輔助寶石・殘忍","cat":"gem","gem":"brutality","wt":1,"sell":2000,"desc":"鑲在裝備的孔裡，跟技能寶石串聯才有效果；鑲在身上時擊殺會累積經驗升級（最高 20 級）","sellValue":2000,"stack":false,"affixes":[],"bookLv":null},"gem_ailmentG":{"name":"輔助寶石・異常強化","cat":"gem","gem":"ailmentG","wt":1,"sell":2000,"desc":"鑲在裝備的孔裡，跟技能寶石串聯才有效果；鑲在身上時擊殺會累積經驗升級（最高 20 級）","sellValue":2000,"stack":false,"affixes":[],"bookLv":null},"curSocket":{"name":"開孔石","cat":"currency","wt":0,"sell":1000,"desc":"製作通貨：重擲武器／防具的孔數（1～上限：盔甲與雙手武器 6、其他防具 4、單手武器 3；戒指、項鍊、腰帶沒有孔）。孔裡要先清空","sellValue":1000,"stack":true,"affixes":[],"bookLv":null},"curLink":{"name":"連結石","cat":"currency","wt":0,"sell":1600,"desc":"製作通貨：重擲孔與孔之間的串聯（每兩孔 50%）。要有 2 孔以上、孔裡要先清空","sellValue":1600,"stack":true,"affixes":[],"bookLv":null}}$items$::jsonb);
 for x in select * from jsonb_array_elements($cur$[{"id":"curSocket","w":4,"minLv":15},{"id":"curLink","w":2.5,"minLv":25}]$cur$::jsonb) loop
  if not exists (select 1 from jsonb_array_elements(d->'currency') y where y->>'id'=x->>'id') then d:=jsonb_set(d,'{currency}',(d->'currency')||jsonb_build_array(x));end if;
 end loop;
 d:=jsonb_set(d,'{gems}',$cfg${"ids":["gem_multistrike","gem_aoeExpand","gem_addFireG","gem_addIceG","gem_addLightG","gem_elemFocus","gem_critBoost","gem_leechG","gem_efficiency","gem_cdrG","gem_chainG","gem_brutality","gem_ailmentG"],"bossP":0.1}$cfg$::jsonb);
 v:=c.version||'-gems20261107';d:=jsonb_set(d,'{version}',to_jsonb(v));
 insert into public.dragon_loot_rules(version,data) values(c.version,c.data) on conflict do nothing;
 insert into public.dragon_loot_rules(version,data) values(v,d) on conflict do nothing;
 update public.dragon_loot_catalog set version=v,data=d where id=1;
end $gems$;

create or replace function public.loot_gem(c jsonb,x jsonb) returns jsonb
language plpgsql volatile set search_path='' as $$
declare cfg jsonb:=c->'gems';
begin
 if cfg is null or not coalesce((x->'monster'->>'boss')::boolean,false) then return '[]'::jsonb;end if;
 if random()>=(cfg->>'bossP')::numeric then return '[]'::jsonb;end if;
 return jsonb_build_array(public.loot_item(c,public.loot_pick(cfg->'ids')#>>'{}',1,null,coalesce((x->'monster'->>'lv')::int,1)));
end $$;
revoke all on function public.loot_gem(jsonb,jsonb) from public,anon,authenticated;

do $patch$
declare fn record;src text;patched text;
begin
 select p.oid into fn from pg_proc p join pg_namespace ns on ns.oid=p.pronamespace where ns.nspname='public' and p.proname='loot_roll';
 if not found then raise exception '缺少 loot_roll，請先安裝 server-loot';end if;
 src:=pg_get_functiondef(fn.oid);patched:=src;
 if position('public.loot_gem(c,x)' in patched)=0 then
  if position('return out ||' in patched)>0 then patched:=replace(patched,'return out ||','return out || public.loot_gem(c,x) ||');
  elsif position('return out;' in patched)>0 then patched:=replace(patched,'return out;','return out || public.loot_gem(c,x);');
  else raise exception 'loot_roll 結尾結構不同';end if;
 end if;
 if patched<>src then execute patched;end if;
end $patch$;
commit;
