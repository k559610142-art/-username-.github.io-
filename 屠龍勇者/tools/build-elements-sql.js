// 從遊戲資料產生 tools/elements.sql（元素系統，第 316 節）。用法：node tools/build-elements-sql.js
// ① 掉寶目錄 affixes 補 6 條元素詞綴（各物品等級上限陣列 0～110）② 可擲的裝備加上允許的元素詞綴（傳奇不加）③ 元素石（curElement）加進通貨掉落。
const fs = require('fs'), path = require('path'), vm = require('vm');
const prefix = fs.readFileSync(path.join(__dirname, 'test-mercenary.js'), 'utf8').split('ctx.assert = assert;')[0];
const ctx = new Function('require', '__dirname', prefix + '\nreturn ctx;')(require, __dirname);
const KEYS = ['fireInc', 'iceInc', 'lightInc', 'addFire', 'addIce', 'addLight'];
const catalog = JSON.parse(fs.readFileSync(path.join(__dirname, 'loot-catalog.json'), 'utf8'));
ctx.CAT_IDS = Object.keys(catalog.items);
const data = vm.runInContext(`(() => {
    const KEYS = ${JSON.stringify(KEYS)}, defs = {};
    for (const k of KEYS) { const a = AFFIXES[k]; defs[k] = { pre: a.pre, min: a.min, pct: !!a.pct, max: Array.from({ length: 111 }, (_, il) => a.max(il)) }; }
    const allow = {};
    for (const id of CAT_IDS) { const d = ITEMS[id]; if (!d || d.unique || (d.cat !== 'weapon' && d.cat !== 'armor')) continue; const ks = KEYS.filter(k => affixAllowed(k, d)); if (ks.length) allow[id] = ks; }
    const c = CURRENCY.curElement, it = ITEMS.curElement;
    return { defs, allow, cur: { id: 'curElement', w: c.w, minLv: c.minLv }, item: { name: it.name, cat: 'currency', wt: 0, sell: it.sell, desc: it.desc, sellValue: it.sell, stack: true, affixes: [], bookLv: null } };
})()`, ctx);
const VER = '-elements20261107';
const sql = `-- 黑暗大陸：元素系統（火焰／冰冷／閃電，2026-11-07，ARCHITECTURE.md 第 316 節）。由 tools/build-elements-sql.js 從遊戲資料產生，不要手改。可重複執行。
-- ① 掉寶目錄補 6 條元素詞綴：火焰／冰冷／閃電傷害 %（武器、手套、戒指、項鍊、頭盔）、附加火焰／冰冷／閃電傷害（武器、手套、戒指、項鍊）
-- ② 這些部位的裝備（傳奇除外，共 ${Object.keys(data.allow).length} 件）加進可擲詞綴清單；舊裝備不會重抽
-- ③ 元素石（curElement，Lv.${data.cur.minLv} 以上的怪物才會掉，權重 ${data.cur.w}）加進通貨
-- 目錄 version 加尾碼 ${VER}，舊憑證照舊規則。之後要再跑一次 tools/unique-items.sql（第二期 6 件轉換傳奇）。
begin;
do $elements$
declare c public.dragon_loot_catalog%rowtype; d jsonb; allow jsonb; entry record; pool jsonb; k text; v text;
begin
 select * into c from public.dragon_loot_catalog where id=1 for update;
 if not found then raise exception '請先安裝 server-loot 與既有目錄'; end if;
 if position('${VER}' in c.version)>0 then return; end if;
 d := jsonb_set(c.data,'{affixes}',(c.data->'affixes') || $defs$${JSON.stringify(data.defs)}$defs$::jsonb);
 allow := $allow$${JSON.stringify(data.allow)}$allow$::jsonb;
 for entry in select key,value from jsonb_each(allow) loop
  if d->'items'->entry.key is null then continue; end if;
  pool := coalesce(d->'items'->entry.key->'affixes','[]'::jsonb);
  for k in select jsonb_array_elements_text(entry.value) loop
   if not pool ? k then pool := pool || jsonb_build_array(k); end if;
  end loop;
  d := jsonb_set(d,array['items',entry.key,'affixes'],pool);
 end loop;
 d := jsonb_set(d,'{items,curElement}',$item$${JSON.stringify(data.item)}$item$::jsonb);
 if not exists (select 1 from jsonb_array_elements(d->'currency') x where x->>'id'='curElement') then
  d := jsonb_set(d,'{currency}',(d->'currency') || jsonb_build_array($cur$${JSON.stringify(data.cur)}$cur$::jsonb));
 end if;
 v := c.version || '${VER}';
 d := jsonb_set(d,'{version}',to_jsonb(v));
 insert into public.dragon_loot_rules(version,data) values(c.version,c.data) on conflict do nothing;
 insert into public.dragon_loot_rules(version,data) values(v,d) on conflict do nothing;
 update public.dragon_loot_catalog set version=v,data=d where id=1;
end $elements$;
commit;
`;
fs.writeFileSync(path.join(__dirname, 'elements.sql'), sql);
console.log('elements.sql：詞綴', KEYS.length, '條、裝備', Object.keys(data.allow).length, '件、', (sql.length / 1024).toFixed(1), 'KB');
