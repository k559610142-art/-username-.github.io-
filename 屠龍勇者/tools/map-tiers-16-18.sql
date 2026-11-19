-- 黑暗大陸 T16～T18。先安裝既有後端掉落與未鑑定地圖補丁。
-- 由管理者貼到 Supabase SQL Editor 執行，可重跑。
begin;

do $maps$
declare
    current_rules public.dragon_loot_catalog%rowtype;
    new_version text;
    new_data jsonb;
begin
    select * into strict current_rules from public.dragon_loot_catalog where id = 1 for update;
    new_version := current_rules.version || '-map18-20261119a';
    if right(current_rules.version, length('-map18-20261119a')) = '-map18-20261119a' then
        return;
    end if;

    -- 舊首領票券仍使用原始規則。
    insert into public.dragon_loot_rules(version, data)
    values (current_rules.version, current_rules.data) on conflict do nothing;

    new_data := current_rules.data || jsonb_build_object(
        'version', new_version,
        'items', (current_rules.data->'items') || $items${"map16":{"name":"異界地圖 T16","cat":"map","tier":16,"wt":0,"sell":38400,"desc":"放進「異界裝置」開啟「霜骨要塞」的異界（強化 ×1.4）。","sellValue":38400,"stack":false,"affixes":[],"bookLv":null},"map17":{"name":"異界地圖 T17","cat":"map","tier":17,"wt":0,"sell":43350,"desc":"放進「異界裝置」開啟「灰燼地宮」的異界（強化 ×1.4）。","sellValue":43350,"stack":false,"affixes":[],"bookLv":null},"map18":{"name":"異界地圖 T18","cat":"map","tier":18,"wt":0,"sell":48600,"desc":"放進「異界裝置」開啟「裂界王庭」的異界（強化 ×1.4）。","sellValue":48600,"stack":false,"affixes":[],"bookLv":null}}$items$::jsonb,
        'zones', (current_rules.data->'zones') || $zones${"frostBoneFortress":{"id":"frostBoneFortress","name":"霜骨要塞","icon":"❄️","type":"dungeon","town":"aden","mapTier":16,"lv":[86,92],"mons":["frostBoneFootman","iceCrossbowSentry","coldMistPriest","frozenArmorGolem"],"rare":{"id":"frostBoneWarlord","p":0},"drops":[]},"ashCatacombs":{"id":"ashCatacombs","name":"灰燼地宮","icon":"🔥","type":"dungeon","town":"aden","mapTier":17,"lv":[91,98],"mons":["slagHound","ashLancer","lavaSorcerer","cryptOverseer"],"rare":{"id":"ashHighPriest","p":0},"drops":[]},"riftRoyalCourt":{"id":"riftRoyalCourt","name":"裂界王庭","icon":"🌌","type":"dungeon","town":"aden","mapTier":18,"lv":[97,105],"mons":["riftWraith","riftRoyalGuard","voidWatcher","voidBeast"],"rare":{"id":"riftKing","p":0},"drops":[]}}$zones$::jsonb,
        'monsters', (current_rules.data->'monsters') || $monsters${"frostBoneFootman":{"human":false,"demon":false,"holy":false,"id":"frostBoneFootman","name":"霜骨步兵","icon":"💀","lv":86,"hp":6200,"maxHp":6200,"ac":-76,"hit":86,"dmg":[62,148],"spd":1500,"exp":7397,"gold":[172,430],"mr":50,"large":false,"undead":true,"boss":false,"dragon":false,"magic":null,"drops":[],"towerFloor":0},"iceCrossbowSentry":{"human":false,"demon":false,"holy":false,"id":"iceCrossbowSentry","name":"冰弩哨兵","icon":"🏹","lv":88,"hp":6445,"maxHp":6445,"ac":-78,"hit":88,"dmg":[63,153],"spd":1500,"exp":7745,"gold":[176,440],"mr":50,"large":false,"undead":true,"boss":false,"dragon":false,"magic":{"p":0.35,"dmg":[189,287],"name":"霜矢"},"drops":[],"towerFloor":0},"coldMistPriest":{"human":false,"demon":false,"holy":false,"id":"coldMistPriest","name":"寒霧祭司","icon":"🧙","lv":90,"hp":6700,"maxHp":6700,"ac":-80,"hit":90,"dmg":[64,155],"spd":1500,"exp":8101,"gold":[180,450],"mr":50,"large":false,"undead":true,"boss":false,"dragon":false,"magic":{"p":0.45,"dmg":[210,308],"name":"寒霧咒"},"drops":[],"towerFloor":0},"frozenArmorGolem":{"human":false,"demon":false,"holy":false,"id":"frozenArmorGolem","name":"凍甲巨像","icon":"🧊","lv":92,"hp":9744,"maxHp":9744,"ac":-92,"hit":92,"dmg":[66,158],"spd":1500,"exp":8465,"gold":[184,460],"mr":50,"large":true,"undead":false,"boss":false,"dragon":false,"magic":null,"drops":[],"towerFloor":0},"frostBoneWarlord":{"human":false,"demon":false,"holy":false,"id":"frostBoneWarlord","name":"霜骨軍督","icon":"🪓","lv":96,"hp":89880,"maxHp":89880,"ac":-86,"hit":96,"dmg":[110,264],"spd":1500,"exp":138255,"gold":[1920,4800],"mr":50,"large":false,"undead":true,"boss":true,"dragon":false,"magic":null,"drops":[],"towerFloor":0},"slagHound":{"human":false,"demon":false,"holy":false,"id":"slagHound","name":"熔渣獵犬","icon":"🐺","lv":91,"hp":6830,"maxHp":6830,"ac":-81,"hit":91,"dmg":[66,157],"spd":1200,"exp":8282,"gold":[182,455],"mr":50,"large":false,"undead":false,"boss":false,"dragon":false,"magic":null,"drops":[],"towerFloor":0},"ashLancer":{"human":false,"demon":false,"holy":false,"id":"ashLancer","name":"灰燼槍兵","icon":"⚔️","lv":93,"hp":7090,"maxHp":7090,"ac":-83,"hit":99,"dmg":[67,161],"spd":1500,"exp":8650,"gold":[186,465],"mr":50,"large":false,"undead":false,"boss":false,"dragon":false,"magic":null,"drops":[],"towerFloor":0},"lavaSorcerer":{"human":false,"demon":false,"holy":false,"id":"lavaSorcerer","name":"熔火咒師","icon":"🔥","lv":96,"hp":7490,"maxHp":7490,"ac":-86,"hit":96,"dmg":[69,165],"spd":1500,"exp":9217,"gold":[192,480],"mr":50,"large":false,"undead":false,"boss":false,"dragon":false,"magic":{"p":0.45,"dmg":[231,336],"name":"熔火彈"},"drops":[],"towerFloor":0},"cryptOverseer":{"human":false,"demon":false,"holy":false,"id":"cryptOverseer","name":"地宮督衛","icon":"🛡️","lv":98,"hp":10864,"maxHp":10864,"ac":-100,"hit":98,"dmg":[70,169],"spd":1500,"exp":9605,"gold":[196,490],"mr":50,"large":true,"undead":false,"boss":false,"dragon":false,"magic":null,"drops":[],"towerFloor":0},"ashHighPriest":{"human":false,"demon":false,"holy":false,"id":"ashHighPriest","name":"灰燼大祭司","icon":"🔥","lv":102,"hp":99840,"maxHp":99840,"ac":-92,"hit":102,"dmg":[116,280],"spd":1500,"exp":156075,"gold":[2040,5100],"mr":50,"large":false,"undead":false,"boss":true,"dragon":false,"magic":null,"drops":[],"towerFloor":0},"riftWraith":{"human":false,"demon":false,"holy":false,"id":"riftWraith","name":"裂界遊魂","icon":"👻","lv":97,"hp":7625,"maxHp":7625,"ac":-87,"hit":97,"dmg":[70,167],"spd":1500,"exp":9410,"gold":[194,485],"mr":50,"large":false,"undead":true,"boss":false,"dragon":false,"magic":null,"drops":[],"towerFloor":0},"riftRoyalGuard":{"human":false,"demon":false,"holy":false,"id":"riftRoyalGuard","name":"王庭禁衛","icon":"⚔️","lv":100,"hp":8040,"maxHp":8040,"ac":-103,"hit":100,"dmg":[71,172],"spd":1500,"exp":10001,"gold":[200,500],"mr":50,"large":false,"undead":false,"boss":false,"dragon":false,"magic":null,"drops":[],"towerFloor":0},"voidWatcher":{"human":false,"demon":false,"holy":false,"id":"voidWatcher","name":"虛空觀測者","icon":"👁️","lv":103,"hp":8465,"maxHp":8465,"ac":-93,"hit":103,"dmg":[74,178],"spd":1500,"exp":10610,"gold":[206,515],"mr":50,"large":false,"undead":false,"boss":false,"dragon":false,"magic":{"p":0.45,"dmg":[259,364],"name":"虛空凝視"},"drops":[],"towerFloor":0},"voidBeast":{"human":false,"demon":false,"holy":false,"id":"voidBeast","name":"蝕空巨獸","icon":"🐉","lv":105,"hp":13133,"maxHp":13133,"ac":-95,"hit":105,"dmg":[76,181],"spd":1500,"exp":11026,"gold":[210,525],"mr":50,"large":true,"undead":false,"boss":false,"dragon":false,"magic":null,"drops":[],"towerFloor":0},"riftKing":{"human":false,"demon":false,"holy":false,"id":"riftKing","name":"裂界君王","icon":"👑","lv":110,"hp":114000,"maxHp":114000,"ac":-100,"hit":110,"dmg":[129,312],"spd":1500,"exp":181515,"gold":[2200,5500],"mr":50,"large":false,"undead":true,"boss":true,"dragon":false,"magic":null,"drops":[],"towerFloor":0}}$monsters$::jsonb,
        'resTiers', (select jsonb_agg(case when t >= 15 then to_jsonb(4) else current_rules.data->'resTiers'->t end order by t)
                     from generate_series(0, 18) as g(t))
    );
    insert into public.dragon_loot_rules(version, data) values (new_version, new_data)
    on conflict (version) do nothing;
    update public.dragon_loot_catalog
    set version = new_version, data = (select data from public.dragon_loot_rules where version = new_version)
    where id = 1;
end
$maps$;

create or replace function public.loot_map(c jsonb,t int) returns jsonb
language plpgsql volatile set search_path='' as $
declare
    item jsonb;
    tier int := greatest(1, least(case when c->'items' ? 'map18' then 18 else 15 end, t));
begin
    item := public.loot_item(c,'map'||tier,1,null,1)-'mm'-'nm'-'q';
    if tier >= 8 and random() < 0.01 then
        return item || jsonb_build_object('q','legend','unidentified',true);
    end if;
    return item || jsonb_build_object('unidentified',true);
end $;
revoke all on function public.loot_map(jsonb,int) from public,anon,authenticated;

commit;
