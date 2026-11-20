-- 黑暗大陸 T16～T18 首領鍛造材料。新版遊戲上線後，由使用者在 Supabase 執行。
-- 需要 T16～T18 地圖補丁及既有財寶圖掉落補丁。整份執行，可重跑。
begin;

create or replace function public.loot_map_boss_craft(c jsonb, x jsonb) returns jsonb
language sql stable set search_path='' as $craft$
    select case when x->'monster'->>'mapBoss' = 'true'
              and rule->>'boss' = x->'monster'->>'id'
              and rule->>'zone' = x->'zone'->>'id'
              and c->'items' ? (rule->>'material')
        then jsonb_build_array(jsonb_build_object('id', rule->>'material', 'n', 1))
        else '[]'::jsonb end
    from (select c->'mapBossCraft'->(x->'map'->>'t') as rule) rules;
$craft$;
revoke all on function public.loot_map_boss_craft(jsonb,jsonb) from public,anon,authenticated;

do $install$
declare
    current_rules public.dragon_loot_catalog%rowtype;
    version_suffix constant text := '-mapBossCraft20261120a';
    new_version text;
    new_data jsonb;
    src text;
    marker constant text := 'out:=out||public.loot_map_boss_craft(c,x);';
    treasure_return constant text := 'return public.loot_treasure_currency(c,x);';
begin
    select * into strict current_rules from public.dragon_loot_catalog where id = 1 for update;
    if not (current_rules.data->'items' ? 'map18')
        or not (current_rules.data->'zones' ? 'riftRoyalCourt') then
        raise exception '請先安裝 T16～T18 地圖補丁';
    end if;

    src := pg_get_functiondef('public.loot_roll(jsonb,jsonb)'::regprocedure);
    if strpos(src, marker) = 0 then
        if strpos(src, treasure_return) = 0 then
            raise exception '找不到財寶圖掉落分支，請確認既有財寶圖補丁';
        end if;
        src := regexp_replace(src, E'\nbegin[[:blank:]]*\r?\n', E'\nbegin\n ' || marker || E'\n', 'i');
        if strpos(src, marker) = 0 then raise exception '未找到 loot_roll 的函式開頭'; end if;
        src := replace(src, treasure_return, 'return out||public.loot_treasure_currency(c,x);');
        execute src;
    end if;

    if strpos(current_rules.version, version_suffix) > 0 then return; end if;
    insert into public.dragon_loot_rules(version, data)
    values (current_rules.version, current_rules.data) on conflict do nothing;

    new_version := current_rules.version || version_suffix;
    new_data := current_rules.data || jsonb_build_object(
        'version', new_version,
        'items', current_rules.data->'items' || $items${
          "frostBoneCore":{"name":"霜骨軍督的冰核","cat":"material","wt":0,"sell":0,"sellValue":0,"stack":true},
          "ashFireSeal":{"name":"灰燼大祭司的火印","cat":"material","wt":0,"sell":0,"sellValue":0,"stack":true},
          "riftCrownShard":{"name":"裂界君王的王冠碎片","cat":"material","wt":0,"sell":0,"sellValue":0,"stack":true},
          "uq_frostBoneBoots":{"name":"霜骨戰靴","cat":"armor","slot":"boots","ac":4,"mr":8,"safe":4,"wt":50,"sell":50000,"sellValue":50000,"reqLv":60,"unique":"frostBoneBoots","stack":false,"affixes":[]},
          "uq_ashRing":{"name":"灰燼指環","cat":"armor","slot":"ring","safe":-1,"wt":2,"sell":50000,"sellValue":50000,"reqLv":60,"unique":"ashRing","stack":false,"affixes":[]},
          "uq_riftRoyalAmulet":{"name":"裂界王權墜飾","cat":"armor","slot":"amulet","mr":12,"safe":-1,"wt":5,"sell":50000,"sellValue":50000,"reqLv":60,"unique":"riftRoyalAmulet","stack":false,"affixes":[]}
        }$items$::jsonb,
        'mapBossCraft', $rules${
          "16":{"zone":"frostBoneFortress","boss":"frostBoneWarlord","material":"frostBoneCore"},
          "17":{"zone":"ashCatacombs","boss":"ashHighPriest","material":"ashFireSeal"},
          "18":{"zone":"riftRoyalCourt","boss":"riftKing","material":"riftCrownShard"}
        }$rules$::jsonb
    );
    insert into public.dragon_loot_rules(version, data) values (new_version, new_data)
    on conflict (version) do nothing;
    update public.dragon_loot_catalog
    set version = new_version, data = (select data from public.dragon_loot_rules where version = new_version)
    where id = 1;
end;
$install$;

commit;
