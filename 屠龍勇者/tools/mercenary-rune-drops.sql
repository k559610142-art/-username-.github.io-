-- 傭兵符石掉落增量；由使用者貼Supabase執行，不修改既有SQL。
-- 先有server-loot與loot-screen；重裝舊掉寶SQL後須重跑本檔。
-- 黃色稀有異界：普通怪0.1%基本，首領5%特殊；團隊副本勝利每人5%特殊。
begin;
do $catalog$
declare c public.dragon_loot_catalog%rowtype; d jsonb; v text;
begin
 select * into c from public.dragon_loot_catalog where id=1 for update;
 if not found then raise exception '請先安裝後端掉寶目錄';end if;
 if c.data->'mercRunes' is not null then return;end if;
 d:=jsonb_set(c.data,'{items}',(c.data->'items')||$items${"mercRune_wolf":{"name":"傭兵符石・靈狼契約","cat":"mercRune","rune":"wolf","wt":0.1,"sell":0,"sellValue":0,"stack":true,"affixes":[],"bookLv":null},"mercRune_golem":{"name":"傭兵符石・石衛契約","cat":"mercRune","rune":"golem","wt":0.1,"sell":0,"sellValue":0,"stack":true,"affixes":[],"bookLv":null},"mercRune_butterfly":{"name":"傭兵符石・靈蝶契約","cat":"mercRune","rune":"butterfly","wt":0.1,"sell":0,"sellValue":0,"stack":true,"affixes":[],"bookLv":null},"mercRune_hawk":{"name":"傭兵符石・風鷹契約","cat":"mercRune","rune":"hawk","wt":0.1,"sell":0,"sellValue":0,"stack":true,"affixes":[],"bookLv":null},"mercRune_flameSpirit":{"name":"傭兵符石・火靈契約","cat":"mercRune","rune":"flameSpirit","wt":0.1,"sell":0,"sellValue":0,"stack":true,"affixes":[],"bookLv":null},"mercRune_iceSpirit":{"name":"傭兵符石・冰靈契約","cat":"mercRune","rune":"iceSpirit","wt":0.1,"sell":0,"sellValue":0,"stack":true,"affixes":[],"bookLv":null},"mercRune_thunderSpirit":{"name":"傭兵符石・雷靈契約","cat":"mercRune","rune":"thunderSpirit","wt":0.1,"sell":0,"sellValue":0,"stack":true,"affixes":[],"bookLv":null},"mercRune_treeSpirit":{"name":"傭兵符石・樹靈契約","cat":"mercRune","rune":"treeSpirit","wt":0.1,"sell":0,"sellValue":0,"stack":true,"affixes":[],"bookLv":null},"mercRune_swarm":{"name":"傭兵符石・蟲群契約","cat":"mercRune","rune":"swarm","wt":0.1,"sell":0,"sellValue":0,"stack":true,"affixes":[],"bookLv":null},"mercRune_cover":{"name":"傭兵符石・護衛","cat":"mercRune","rune":"cover","wt":0.1,"sell":0,"sellValue":0,"stack":true,"affixes":[],"bookLv":null},"mercRune_shield":{"name":"傭兵符石・堅壁護盾","cat":"mercRune","rune":"shield","wt":0.1,"sell":0,"sellValue":0,"stack":true,"affixes":[],"bookLv":null},"mercRune_taunt":{"name":"傭兵符石・挑釁","cat":"mercRune","rune":"taunt","wt":0.1,"sell":0,"sellValue":0,"stack":true,"affixes":[],"bookLv":null},"mercRune_iron":{"name":"傭兵符石・鋼鐵壁壘","cat":"mercRune","rune":"iron","wt":0.1,"sell":0,"sellValue":0,"stack":true,"affixes":[],"bookLv":null},"mercRune_ward":{"name":"傭兵符石・魔法結界","cat":"mercRune","rune":"ward","wt":0.1,"sell":0,"sellValue":0,"stack":true,"affixes":[],"bookLv":null},"mercRune_thorn":{"name":"傭兵符石・荊棘守護","cat":"mercRune","rune":"thorn","wt":0.1,"sell":0,"sellValue":0,"stack":true,"affixes":[],"bookLv":null},"mercRune_sacrifice":{"name":"傭兵符石・挺身保護","cat":"mercRune","rune":"sacrifice","wt":0.1,"sell":0,"sellValue":0,"stack":true,"affixes":[],"bookLv":null},"mercRune_barrier":{"name":"傭兵符石・團隊屏障","cat":"mercRune","rune":"barrier","wt":0.1,"sell":0,"sellValue":0,"stack":true,"affixes":[],"bookLv":null},"mercRune_heal":{"name":"傭兵符石・急救之光","cat":"mercRune","rune":"heal","wt":0.1,"sell":0,"sellValue":0,"stack":true,"affixes":[],"bookLv":null},"mercRune_renew":{"name":"傭兵符石・回春祝福","cat":"mercRune","rune":"renew","wt":0.1,"sell":0,"sellValue":0,"stack":true,"affixes":[],"bookLv":null},"mercRune_mend":{"name":"傭兵符石・共鳴療癒","cat":"mercRune","rune":"mend","wt":0.1,"sell":0,"sellValue":0,"stack":true,"affixes":[],"bookLv":null},"mercRune_haste":{"name":"傭兵符石・進軍鼓舞","cat":"mercRune","rune":"haste","wt":0.1,"sell":0,"sellValue":0,"stack":true,"affixes":[],"bookLv":null},"mercRune_might":{"name":"傭兵符石・力量祝福","cat":"mercRune","rune":"might","wt":0.1,"sell":0,"sellValue":0,"stack":true,"affixes":[],"bookLv":null},"mercRune_focus":{"name":"傭兵符石・專注祝福","cat":"mercRune","rune":"focus","wt":0.1,"sell":0,"sellValue":0,"stack":true,"affixes":[],"bookLv":null},"mercRune_mana":{"name":"傭兵符石・魔力贈禮","cat":"mercRune","rune":"mana","wt":0.1,"sell":0,"sellValue":0,"stack":true,"affixes":[],"bookLv":null},"mercRune_purify":{"name":"傭兵符石・淨化之光","cat":"mercRune","rune":"purify","wt":0.1,"sell":0,"sellValue":0,"stack":true,"affixes":[],"bookLv":null},"mercRune_rally":{"name":"傭兵符石・戰地整備","cat":"mercRune","rune":"rally","wt":0.1,"sell":0,"sellValue":0,"stack":true,"affixes":[],"bookLv":null},"mercRune_heavy":{"name":"傭兵符石・重擊","cat":"mercRune","rune":"heavy","wt":0.1,"sell":0,"sellValue":0,"stack":true,"affixes":[],"bookLv":null},"mercRune_sweep":{"name":"傭兵符石・橫掃","cat":"mercRune","rune":"sweep","wt":0.1,"sell":0,"sellValue":0,"stack":true,"affixes":[],"bookLv":null},"mercRune_pierce":{"name":"傭兵符石・破甲刺擊","cat":"mercRune","rune":"pierce","wt":0.1,"sell":0,"sellValue":0,"stack":true,"affixes":[],"bookLv":null},"mercRune_flurry":{"name":"傭兵符石・連環突擊","cat":"mercRune","rune":"flurry","wt":0.1,"sell":0,"sellValue":0,"stack":true,"affixes":[],"bookLv":null},"mercRune_execute":{"name":"傭兵符石・終結斬","cat":"mercRune","rune":"execute","wt":0.1,"sell":0,"sellValue":0,"stack":true,"affixes":[],"bookLv":null},"mercRune_bleed":{"name":"傭兵符石・撕裂","cat":"mercRune","rune":"bleed","wt":0.1,"sell":0,"sellValue":0,"stack":true,"affixes":[],"bookLv":null},"mercRune_bash":{"name":"傭兵符石・震盪擊","cat":"mercRune","rune":"bash","wt":0.1,"sell":0,"sellValue":0,"stack":true,"affixes":[],"bookLv":null},"mercRune_siphon":{"name":"傭兵符石・汲血斬","cat":"mercRune","rune":"siphon","wt":0.1,"sell":0,"sellValue":0,"stack":true,"affixes":[],"bookLv":null},"mercRune_selfHeal":{"name":"傭兵符石・自我療癒","cat":"mercRune","rune":"selfHeal","wt":0.1,"sell":0,"sellValue":0,"stack":true,"affixes":[],"bookLv":null},"mercRune_evasion":{"name":"傭兵符石・靈巧步伐","cat":"mercRune","rune":"evasion","wt":0.1,"sell":0,"sellValue":0,"stack":true,"affixes":[],"bookLv":null},"mercRune_meditate":{"name":"傭兵符石・冥想","cat":"mercRune","rune":"meditate","wt":0.1,"sell":0,"sellValue":0,"stack":true,"affixes":[],"bookLv":null},"mercRune_cleanse":{"name":"傭兵符石・淨身","cat":"mercRune","rune":"cleanse","wt":0.1,"sell":0,"sellValue":0,"stack":true,"affixes":[],"bookLv":null},"mercRune_fortify":{"name":"傭兵符石・生命強韌","cat":"mercRune","rune":"fortify","wt":0.1,"sell":0,"sellValue":0,"stack":true,"affixes":[],"bookLv":null},"mercRune_recover":{"name":"傭兵符石・自然復甦","cat":"mercRune","rune":"recover","wt":0.1,"sell":0,"sellValue":0,"stack":true,"affixes":[],"bookLv":null},"mercRune_lastStand":{"name":"傭兵符石・背水一戰","cat":"mercRune","rune":"lastStand","wt":0.1,"sell":0,"sellValue":0,"stack":true,"affixes":[],"bookLv":null},"mercRune_balance":{"name":"傭兵符石・生命轉魔","cat":"mercRune","rune":"balance","wt":0.1,"sell":0,"sellValue":0,"stack":true,"affixes":[],"bookLv":null},"mercRune_firebolt":{"name":"傭兵符石・火焰彈","cat":"mercRune","rune":"firebolt","wt":0.1,"sell":0,"sellValue":0,"stack":true,"affixes":[],"bookLv":null},"mercRune_frost":{"name":"傭兵符石・冰霜束縛","cat":"mercRune","rune":"frost","wt":0.1,"sell":0,"sellValue":0,"stack":true,"affixes":[],"bookLv":null},"mercRune_lightning":{"name":"傭兵符石・雷電衝擊","cat":"mercRune","rune":"lightning","wt":0.1,"sell":0,"sellValue":0,"stack":true,"affixes":[],"bookLv":null},"mercRune_nova":{"name":"傭兵符石・烈焰新星","cat":"mercRune","rune":"nova","wt":0.1,"sell":0,"sellValue":0,"stack":true,"affixes":[],"bookLv":null},"mercRune_poison":{"name":"傭兵符石・腐蝕毒霧","cat":"mercRune","rune":"poison","wt":0.1,"sell":0,"sellValue":0,"stack":true,"affixes":[],"bookLv":null},"mercRune_chain":{"name":"傭兵符石・連鎖雷光","cat":"mercRune","rune":"chain","wt":0.1,"sell":0,"sellValue":0,"stack":true,"affixes":[],"bookLv":null},"mercRune_silence":{"name":"傭兵符石・衰弱咒印","cat":"mercRune","rune":"silence","wt":0.1,"sell":0,"sellValue":0,"stack":true,"affixes":[],"bookLv":null},"mercRune_star":{"name":"傭兵符石・星辰墜落","cat":"mercRune","rune":"star","wt":0.1,"sell":0,"sellValue":0,"stack":true,"affixes":[],"bookLv":null}}$items$::jsonb);
 d:=jsonb_set(d,'{mercRunes}',$pools${"basic":["mercRune_wolf","mercRune_golem","mercRune_butterfly","mercRune_hawk","mercRune_cover","mercRune_shield","mercRune_taunt","mercRune_iron","mercRune_heal","mercRune_renew","mercRune_mend","mercRune_haste","mercRune_heavy","mercRune_sweep","mercRune_pierce","mercRune_flurry","mercRune_selfHeal","mercRune_evasion","mercRune_meditate","mercRune_cleanse","mercRune_firebolt","mercRune_frost","mercRune_lightning","mercRune_nova"],"special":["mercRune_flameSpirit","mercRune_iceSpirit","mercRune_thunderSpirit","mercRune_treeSpirit","mercRune_swarm","mercRune_ward","mercRune_thorn","mercRune_sacrifice","mercRune_barrier","mercRune_might","mercRune_focus","mercRune_mana","mercRune_purify","mercRune_rally","mercRune_execute","mercRune_bleed","mercRune_bash","mercRune_siphon","mercRune_fortify","mercRune_recover","mercRune_lastStand","mercRune_balance","mercRune_poison","mercRune_chain","mercRune_silence","mercRune_star"],"normalP":0.001,"bossP":0.05}$pools$::jsonb);
 v:=c.version||'-mercRunes20261028a';d:=jsonb_set(d,'{version}',to_jsonb(v));
 insert into public.dragon_loot_rules(version,data) values(c.version,c.data) on conflict do nothing;
 insert into public.dragon_loot_rules(version,data) values(v,d) on conflict do nothing;
 update public.dragon_loot_catalog set version=v,data=d where id=1;
end $catalog$;

create or replace function public.loot_merc_rune(c jsonb,x jsonb) returns jsonb
language plpgsql volatile set search_path='' as $$
declare cfg jsonb:=c->'mercRunes'; special boolean:=coalesce((x->'monster'->>'boss')::boolean,false);
 raid boolean:=coalesce((x->>'mercRaid')::boolean,false); pool jsonb; id text;
begin
 if cfg is null then return '[]'::jsonb;end if;
 if not raid and (coalesce(x->'map'->>'q','')<>'rare' or coalesce((x->'map'->>'treasure')::boolean,false)) then return '[]'::jsonb;end if;
 special:=special or raid;
 if random()>=(cfg->>(case when special then 'bossP' else 'normalP' end))::numeric then return '[]'::jsonb;end if;
 pool:=cfg->(case when special then 'special' else 'basic' end);
 id:=public.loot_pick(pool)#>>'{}';
 return jsonb_build_array(public.loot_item(c,id,1,null,coalesce((x->'monster'->>'lv')::int,1)));
end $$;
revoke all on function public.loot_merc_rune(jsonb,jsonb) from public,anon,authenticated;

do $patch$
declare fn record;src text;patched text;needle text;seen int:=0;
begin
 for fn in select p.oid,p.proname from pg_proc p join pg_namespace ns on ns.oid=p.pronamespace
 where ns.nspname='public' and p.proname in ('loot_roll','loot_spawn','loot_spawn_screen','loot_raid') loop
  src:=pg_get_functiondef(fn.oid);patched:=src;
  if fn.proname='loot_roll' then
   seen:=seen+1;
   if position('public.loot_merc_rune(c,x)' in src)=0 then
    needle:='return out;';
    if position(needle in src)=0 then raise exception 'loot_roll結構不同';end if;
    patched:=replace(src,needle,'return out || public.loot_merc_rune(c,x);');
   end if;
  elsif fn.proname='loot_raid' then
   seen:=seen+1;
   if position('''mercRaid''' in src)=0 then
    needle:='jsonb_build_object(''monster'',c->''monsters''->(def->>''boss'')';
    if position(needle in src)=0 then raise exception 'loot_raid結構不同';end if;
    patched:=replace(src,needle,needle||',''mercRaid'',true');
   end if;
  else
   needle:='''mods'',mr->''mods''';
   if position(needle in src)>0 then
    if fn.proname='loot_spawn' then seen:=seen+1;else seen:=seen+10;end if;
    if position('''q'',mr->''q''' in src)=0 then patched:=replace(src,needle,needle||',''q'',mr->''q''');end if;
   elsif fn.proname='loot_spawn' then raise exception 'loot_spawn結構不同';end if;
  end if;
  if patched<>src then execute patched;end if;
 end loop;
 if seen<13 then raise exception '缺少必要掉寶函式，請先安裝server-loot與loot-screen';end if;
end $patch$;
commit;
