// 從正式遊戲資料產生二轉後端補丁 tools/advance-class.sql（不讀玩家存檔、不連網）。用法：node tools/export-advance-sql.js
// 做法照 mercenary-rune-drops.sql／talent-system.sql：只合併新增的目錄鍵，並在正式 loot_roll 尾端接 loot_adv，不重跑整份 loot-catalog.sql。
const fs = require('fs'), path = require('path'), vm = require('vm');
const root = path.resolve(__dirname, '..');
const ctx = vm.createContext({ console, Image: function () {}, setTimeout: () => 0, clearTimeout() {}, setInterval: () => 0, clearInterval() {}, localStorage: { getItem: () => null },
    document: { addEventListener() {}, getElementById: () => null, querySelector: () => null, documentElement: { style: {} } }, window: { addEventListener() {}, innerWidth: 1280, innerHeight: 720 }, navigator: {} });
for (const [, f] of fs.readFileSync(path.join(root, 'index.html'), 'utf8').matchAll(/<script src="(data\/[^"?]+\.js)\?v=/g)) if (!['data/main.js', 'data/pwa.js'].includes(f)) vm.runInContext(fs.readFileSync(path.join(root, f), 'utf8'), ctx, { filename: f });
vm.runInContext('let s=24681;Math.random=()=>((s=(1664525*s+1013904223)>>>0)/4294967296);', ctx);
const cfg = vm.runInContext(`(()=>{
 const item = id => { const d = ITEMS[id]; return { ...d, sellValue: sellPriceOf(id), stack: isStackable(d), affixes: [], bookLv: null }; };
 const items = { advReshape: item('advReshape') }, quests = {}, questBosses = {};
 // 2026-10-31：職業技能最高 Lv.55，技能書的 bookLv／回收價跟著更新（後端怪物掉書看 bookLv）
 for (const id in ITEMS) { const d = ITEMS[id], k = d.cat === 'book' && SKILL_BY_ID[d.skill]; if (k && k.kind === 'class') items[id] = item(id); }
 for (const cls in CLASS_QUESTS) {
  const qs = CLASS_QUESTS[cls].slice(ADV_CH);
  quests[cls] = qs.map(q => q.goal);
  questBosses[cls] = qs.map(q => q.goal.type === 'boss' ? buildMonster('questBoss', q.goal.boss) : null);
  qs.forEach(q => { if (q.goal.item) items[q.goal.item] = item(q.goal.item); });
 }
 return { items, quests, questBosses, advance: { from: ADV_CH, reshapeP: ADV_RESHAPE_P, reshapeLv: ADV_RESHAPE_LV, worldBr: 'rWorld', worldP: ADV_WORLD_CUR_P }, version: GAME_VERSION };
})()`, ctx);
const tag = 'adv' + cfg.version;
const J = o => JSON.stringify(o);
const sql = `-- 黑暗大陸：二轉後端補丁（${cfg.version}；node tools/export-advance-sql.js 自動產生，不要手改）。
-- 由使用者貼到 Supabase SQL Editor 執行；可重跑。先要已安裝 server-loot.sql、loot-batch.sql、loot-screen.sql（與傭兵符石、天賦補丁不衝突）。
-- 1. 掉寶目錄只合併：命運重塑石、12 個職業之證、職業技能書（最高 Lv.55 的新 bookLv）、第 5～7 章任務目標與任務首領、二轉設定（不動其他鍵，天賦／傭兵符石設定保留）。
-- 2. 新增 loot_adv：第 5 章進行中時任何首領 20% 掉職業之證；Lv.70 以上首領 0.3% 掉命運重塑石；二轉「天下」擊倒 5% 多掉 1 個通貨。
-- 3. 正式 loot_roll 尾端接上 loot_adv；loot_spawn／loot_spawn_screen 的掉寶資料多帶 player.adv（判斷「天下」）。
begin;
do $catalog$
declare c public.dragon_loot_catalog%rowtype; d jsonb; v text; cls text; cfg jsonb := $adv$${J(cfg)}$adv$::jsonb; base int;
begin
 select * into c from public.dragon_loot_catalog where id=1 for update;
 if not found then raise exception '請先安裝後端掉寶目錄';end if;
 base := (cfg->'advance'->>'from')::int;
 d := jsonb_set(c.data, '{items}', (c.data->'items') || (cfg->'items'));
 for cls in select jsonb_object_keys(cfg->'quests') loop
  if jsonb_array_length(coalesce(d->'quests'->cls, '[]')) < base then raise exception '職業 % 的任務目錄少於 % 章', cls, base; end if;
  d := jsonb_set(d, array['quests', cls], coalesce((select jsonb_agg(e order by i) from jsonb_array_elements(d->'quests'->cls) with ordinality t(e, i) where i <= base), '[]') || (cfg->'quests'->cls));
  d := jsonb_set(d, array['questBosses', cls], coalesce((select jsonb_agg(e order by i) from jsonb_array_elements(d->'questBosses'->cls) with ordinality t(e, i) where i <= base), '[]') || (cfg->'questBosses'->cls));
 end loop;
 d := jsonb_set(d, '{advance}', cfg->'advance');
 v := regexp_replace(c.version, '-adv[0-9a-z]+$', '') || '-${tag}';
 d := jsonb_set(d, '{version}', to_jsonb(v));
 if c.version = v and c.data = d then return; end if;
 insert into public.dragon_loot_rules(version,data) values(c.version,c.data) on conflict do nothing;
 insert into public.dragon_loot_rules(version,data) values(v,d) on conflict do nothing;
 update public.dragon_loot_catalog set version=v,data=d where id=1;
end $catalog$;

create or replace function public.loot_adv(c jsonb,x jsonb) returns jsonb language plpgsql volatile set search_path='' as $$
declare m jsonb:=x->'monster';p jsonb:=x->'player';a jsonb:=c->'advance';g jsonb;n int;out jsonb:='[]';cur jsonb;
 lv int:=coalesce((x->'monster'->>'lv')::int,1);boss boolean:=coalesce((x->'monster'->>'boss')::boolean,false);
begin
 if a is null or p is null then return out;end if;
 g:=c->'quests'->(p->>'cls')->coalesce((p->'quests'->>'ch')::int,0);
 if boss and coalesce((p->'quests'->>'active')::boolean,false) and g->>'type'='bossCollect' then
  select coalesce(sum((v->>'n')::int),0) into n from jsonb_array_elements(coalesce(p->'inv','[]'::jsonb)) v where v->>'id'=g->>'item';
  if n<(g->>'n')::int and random()<(g->>'p')::numeric then out:=out||jsonb_build_array(public.loot_item(c,g->>'item',1,null,lv)||jsonb_build_object('questMax',(g->>'n')::int));end if;
 end if;
 if boss and lv>=(a->>'reshapeLv')::int and random()<(a->>'reshapeP')::numeric then out:=out||jsonb_build_array(public.loot_item(c,'advReshape',1,null,lv));end if;
 if p->'adv'->>'br'=a->>'worldBr' and random()<(a->>'worldP')::numeric then cur:=public.loot_currency(c,lv,1);if cur is not null then out:=out||jsonb_build_array(cur);end if;end if;
 return out;
end $$;
revoke all on function public.loot_adv(jsonb,jsonb) from public,anon,authenticated;

do $patch$
declare fn record;src text;patched text;needle text:='''cls'',p->>''cls'',''quests'',p->''quests''';seen int:=0;sp int:=0;ss int:=0;
begin
 for fn in select p.oid,p.proname from pg_proc p join pg_namespace ns on ns.oid=p.pronamespace
 where ns.nspname='public' and p.proname in ('loot_roll','loot_spawn','loot_spawn_screen') loop
  src:=pg_get_functiondef(fn.oid);patched:=src;
  if fn.proname='loot_roll' then
   seen:=seen+1;
   if position('public.loot_adv(c,x)' in src)=0 then
    if src !~ 'return out[^;]*;' then raise exception 'loot_roll結構不同，整筆取消';end if;
    patched:=regexp_replace(src,'return out([^;]*);',E'return out\\\\1 || public.loot_adv(c,x);');
   end if;
  else   -- 同名舊版多載（參數不同、沒有這段）略過，只要求兩種 spawn 各至少接上一個
   if position(needle in src)>0 then
    patched:=replace(src,needle,'''cls'',p->>''cls'',''adv'',p->''adv'',''quests'',p->''quests''');
   end if;
   if position('''adv'',p->''adv''' in patched)>0 then if fn.proname='loot_spawn' then sp:=sp+1;else ss:=ss+1;end if;end if;
  end if;
  if patched<>src then execute patched;end if;
 end loop;
 if seen<1 or sp<1 or ss<1 then raise exception '缺少必要掉寶函式（loot_roll／loot_spawn／loot_spawn_screen），請先安裝 server-loot、loot-batch、loot-screen';end if;
end $patch$;
commit;
-- 驗證：select data->'advance', jsonb_array_length(data->'quests'->'royal') from public.dragon_loot_catalog where id=1;  （應為設定＋7）
`;
fs.writeFileSync(path.join(__dirname, 'advance-class.sql'), sql);
console.log('advance-class.sql：', Object.keys(cfg.items).length, '道具、', Object.keys(cfg.quests).length, '職業 × 3 章');
