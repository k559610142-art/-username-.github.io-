-- 黑暗大陸：傳奇裝備掉落（2026-11-07，ARCHITECTURE.md 第 315 節）。由 tools/build-unique-sql.js 從遊戲資料產生，不要手改。可重複執行。
-- 需要先裝好 server-loot（含 loot-catalog、mercenary-rune-drops 等）。重裝舊掉寶 SQL（會重建 loot_roll）後要再跑這份。
-- ① 掉寶目錄補 26 件傳奇道具（已裝過舊版會合併新增的件數）（uq_*，固定詞綴寫在遊戲裡，伺服器只給 { id, n:1, ench:0 }）與 uniques 設定；目錄 version 加尾碼 -uniques20261107c，舊憑證照舊規則。
-- ② loot_unique：只有稀有（黃色、非財寶圖）異界的異界首領，T11～T12 1%、T13～T14 2%、T15 3%，20 件平均抽一件。
-- ③ 修補 loot_roll：結尾接上 loot_unique；隨機裝備池排除傳奇（不然會被當普通裝備掉出來、還擲上隨機詞綴）。
begin;
do $catalog$
declare c public.dragon_loot_catalog%rowtype; d jsonb; v text;
begin
 select * into c from public.dragon_loot_catalog where id=1 for update;
 if not found then raise exception '請先安裝後端掉寶目錄';end if;
 if position('-uniques20261107c' in c.version)>0 then return;end if;   -- 已經是這一版：不重複；舊版（少件數）照樣合併
 d:=jsonb_set(c.data,'{items}',(c.data->'items')||$items${"uq_condemner":{"name":"斷罪者","cat":"weapon","type":"twohand","dmg":[22,28],"hit":3,"safe":6,"wt":150,"sell":50000,"reqLv":60,"unique":"condemner","sellValue":50000,"stack":false,"affixes":[],"bookLv":null},"uq_bloodpact":{"name":"血契之刃","cat":"weapon","type":"sword","dmg":[16,20],"hit":4,"safe":6,"wt":70,"sell":50000,"reqLv":60,"unique":"bloodpact","sellValue":50000,"stack":false,"affixes":[],"bookLv":null},"uq_voidwhisper":{"name":"虛空低語","cat":"weapon","type":"staff","dmg":[6,6],"hit":2,"safe":6,"wt":40,"sell":50000,"reqLv":60,"unique":"voidwhisper","sellValue":50000,"stack":false,"affixes":[],"bookLv":null},"uq_thousandfeather":{"name":"千羽","cat":"weapon","type":"bow","dmg":[14,14],"hit":3,"safe":6,"wt":80,"sell":50000,"reqLv":60,"unique":"thousandfeather","sellValue":50000,"stack":false,"affixes":[],"bookLv":null},"uq_thundereye":{"name":"雷鳴獨眼","cat":"weapon","type":"gun","dmg":[16,16],"hit":4,"safe":6,"wt":90,"sell":50000,"reqLv":60,"unique":"thundereye","sellValue":50000,"stack":false,"affixes":[],"bookLv":null},"uq_shadowmaw":{"name":"影噬","cat":"weapon","type":"claw","dmg":[12,14],"hit":3,"safe":6,"wt":60,"sell":50000,"reqLv":60,"unique":"shadowmaw","sellValue":50000,"stack":false,"affixes":[],"bookLv":null},"uq_wailingharvest":{"name":"哀嚎收割","cat":"weapon","type":"scythe","dmg":[18,24],"hit":2,"safe":6,"wt":130,"sell":50000,"reqLv":60,"unique":"wailingharvest","sellValue":50000,"stack":false,"affixes":[],"bookLv":null},"uq_undertow":{"name":"逆流之心","cat":"armor","slot":"armor","ac":8,"mr":15,"safe":4,"wt":120,"sell":50000,"reqLv":60,"unique":"undertow","sellValue":50000,"stack":false,"affixes":[],"bookLv":null},"uq_berserkskull":{"name":"狂戰之顱","cat":"armor","slot":"helm","ac":4,"mr":8,"safe":4,"wt":60,"sell":50000,"reqLv":60,"unique":"berserkskull","sellValue":50000,"stack":false,"affixes":[],"bookLv":null},"uq_thornweave":{"name":"荊棘織衣","cat":"armor","slot":"tshirt","ac":4,"safe":4,"wt":25,"sell":50000,"reqLv":60,"unique":"thornweave","sellValue":50000,"stack":false,"affixes":[],"bookLv":null},"uq_phantomcloak":{"name":"幻影披風","cat":"armor","slot":"cloak","ac":3,"mr":12,"safe":4,"wt":20,"sell":50000,"reqLv":60,"unique":"phantomcloak","sellValue":50000,"stack":false,"affixes":[],"bookLv":null},"uq_midas":{"name":"點金之手","cat":"armor","slot":"gloves","ac":3,"safe":4,"wt":30,"sell":50000,"reqLv":60,"unique":"midas","sellValue":50000,"stack":false,"affixes":[],"bookLv":null},"uq_martyr":{"name":"殉道者的長靴","cat":"armor","slot":"boots","ac":4,"mr":8,"safe":4,"wt":50,"sell":50000,"reqLv":60,"unique":"martyr","sellValue":50000,"stack":false,"affixes":[],"bookLv":null},"uq_oathshield":{"name":"堅守誓約","cat":"armor","slot":"shield","ac":7,"mr":15,"safe":4,"wt":120,"sell":50000,"reqLv":60,"unique":"oathshield","sellValue":50000,"stack":false,"affixes":[],"bookLv":null},"uq_soulhunter":{"name":"獵魂者之索","cat":"armor","slot":"belt","ac":2,"weight":500,"safe":-1,"wt":15,"sell":50000,"reqLv":60,"unique":"soulhunter","sellValue":50000,"stack":false,"affixes":[],"bookLv":null},"uq_bottomless":{"name":"無底行囊","cat":"armor","slot":"belt","weight":2000,"safe":-1,"wt":10,"sell":50000,"reqLv":60,"unique":"bottomless","sellValue":50000,"stack":false,"affixes":[],"bookLv":null},"uq_voidring":{"name":"虛空之戒","cat":"armor","slot":"ring","safe":-1,"wt":2,"sell":50000,"reqLv":60,"unique":"voidring","sellValue":50000,"stack":false,"affixes":[],"bookLv":null},"uq_gambler":{"name":"賭徒之指","cat":"armor","slot":"ring","safe":-1,"wt":2,"sell":50000,"reqLv":60,"unique":"gambler","sellValue":50000,"stack":false,"affixes":[],"bookLv":null},"uq_mercoath":{"name":"傭兵之誓","cat":"armor","slot":"amulet","safe":-1,"wt":5,"sell":50000,"reqLv":60,"unique":"mercoath","sellValue":50000,"stack":false,"affixes":[],"bookLv":null},"uq_hourglass":{"name":"時之沙漏","cat":"armor","slot":"amulet","safe":-1,"wt":5,"sell":50000,"reqLv":60,"unique":"hourglass","sellValue":50000,"stack":false,"affixes":[],"bookLv":null},"uq_forgeheart":{"name":"熔爐之心","cat":"weapon","type":"twohand","dmg":[20,26],"hit":3,"safe":6,"wt":150,"sell":50000,"reqLv":60,"unique":"forgeheart","sellValue":50000,"stack":false,"affixes":[],"bookLv":null},"uq_frostvein":{"name":"霜脈","cat":"weapon","type":"bow","dmg":[13,13],"hit":3,"safe":6,"wt":80,"sell":50000,"reqLv":60,"unique":"frostvein","sellValue":50000,"stack":false,"affixes":[],"bookLv":null},"uq_thundergrip":{"name":"雷霆之握","cat":"armor","slot":"gloves","ac":3,"safe":4,"wt":30,"sell":50000,"reqLv":60,"unique":"thundergrip","sellValue":50000,"stack":false,"affixes":[],"bookLv":null},"uq_dualflame":{"name":"冰火同源","cat":"armor","slot":"ring","safe":-1,"wt":2,"sell":50000,"reqLv":60,"unique":"dualflame","sellValue":50000,"stack":false,"affixes":[],"bookLv":null},"uq_stormeye":{"name":"風暴之眼","cat":"armor","slot":"amulet","safe":-1,"wt":5,"sell":50000,"reqLv":60,"unique":"stormeye","sellValue":50000,"stack":false,"affixes":[],"bookLv":null},"uq_elementalist":{"name":"元素使徒","cat":"weapon","type":"staff","dmg":[6,6],"hit":2,"safe":6,"wt":40,"sell":50000,"reqLv":60,"unique":"elementalist","sellValue":50000,"stack":false,"affixes":[],"bookLv":null}}$items$::jsonb);
 d:=jsonb_set(d,'{uniques}',$cfg${"ids":["uq_condemner","uq_bloodpact","uq_voidwhisper","uq_thousandfeather","uq_thundereye","uq_shadowmaw","uq_wailingharvest","uq_undertow","uq_berserkskull","uq_thornweave","uq_phantomcloak","uq_midas","uq_martyr","uq_oathshield","uq_soulhunter","uq_bottomless","uq_voidring","uq_gambler","uq_mercoath","uq_hourglass","uq_forgeheart","uq_frostvein","uq_thundergrip","uq_dualflame","uq_stormeye","uq_elementalist"],"p":{"11":0.01,"12":0.01,"13":0.02,"14":0.02,"15":0.03}}$cfg$::jsonb);
 v:=c.version||'-uniques20261107c';d:=jsonb_set(d,'{version}',to_jsonb(v));
 insert into public.dragon_loot_rules(version,data) values(c.version,c.data) on conflict do nothing;
 insert into public.dragon_loot_rules(version,data) values(v,d) on conflict do nothing;
 update public.dragon_loot_catalog set version=v,data=d where id=1;
end $catalog$;

create or replace function public.loot_unique(c jsonb,x jsonb) returns jsonb
language plpgsql volatile set search_path='' as $$
declare cfg jsonb:=c->'uniques'; t int; p numeric;
begin
 if cfg is null then return '[]'::jsonb;end if;
 if not coalesce((x->'monster'->>'mapBoss')::boolean,false) then return '[]'::jsonb;end if;
 if coalesce(x->'map'->>'q','')<>'rare' or coalesce((x->'map'->>'treasure')::boolean,false) then return '[]'::jsonb;end if;
 t:=coalesce((x->'map'->>'t')::int,0);p:=(cfg->'p'->>(t::text))::numeric;
 if p is null or random()>=p then return '[]'::jsonb;end if;
 return jsonb_build_array(public.loot_item(c,public.loot_pick(cfg->'ids')#>>'{}',1,null,coalesce((x->'monster'->>'lv')::int,1)));
end $$;
revoke all on function public.loot_unique(jsonb,jsonb) from public,anon,authenticated;

do $patch$
declare fn record;src text;patched text;
begin
 select p.oid into fn from pg_proc p join pg_namespace ns on ns.oid=p.pronamespace where ns.nspname='public' and p.proname='loot_roll';
 if not found then raise exception '缺少 loot_roll，請先安裝 server-loot';end if;
 src:=pg_get_functiondef(fn.oid);patched:=src;
 if position('not(value ? ''unique'')' in patched)=0 then
  if position('not(value ? ''res'')' in patched)=0 then raise exception 'loot_roll 隨機裝備池結構不同';end if;
  patched:=replace(patched,'not(value ? ''res'')','not(value ? ''res'') and not(value ? ''unique'')');
 end if;
 if position('public.loot_unique(c,x)' in patched)=0 then
  if position('return out ||' in patched)>0 then patched:=replace(patched,'return out ||','return out || public.loot_unique(c,x) ||');
  elsif position('return out;' in patched)>0 then patched:=replace(patched,'return out;','return out || public.loot_unique(c,x);');
  else raise exception 'loot_roll 結尾結構不同';end if;
 end if;
 if patched<>src then execute patched;end if;
end $patch$;
commit;
