// 從遊戲資料（data/uniques.js 載入後的 ITEMS）產生 tools/unique-items.sql（第 315 節）。用法：node tools/build-unique-sql.js
// 伺服器掉寶目錄只補進 20 件傳奇道具與掉率設定，不重匯整份目錄；目錄 version 加尾碼，舊憑證照舊規則。
const fs = require('fs'), path = require('path'), vm = require('vm');
const prefix = fs.readFileSync(path.join(__dirname, 'test-mercenary.js'), 'utf8').split('ctx.assert = assert;')[0];
const ctx = new Function('require', '__dirname', prefix + '\nreturn ctx;')(require, __dirname);
const data = vm.runInContext(`({ ids: UNIQUE_IDS, p: UNIQUE_DROP_P, items: Object.fromEntries(UNIQUE_IDS.map(id => {
    const d = ITEMS[id], o = {};
    for (const k of ['name', 'cat', 'type', 'slot', 'dmg', 'hit', 'ac', 'mr', 'weight', 'safe', 'wt', 'sell', 'reqLv', 'unique']) if (d[k] != null) o[k] = d[k];
    return [id, Object.assign(o, { sellValue: d.sell, stack: false, affixes: [], bookLv: null })];
})) })`, ctx);
const VER = '-uniques20261107a';
const sql = `-- 黑暗大陸：傳奇裝備掉落（2026-11-07，ARCHITECTURE.md 第 315 節）。由 tools/build-unique-sql.js 從遊戲資料產生，不要手改。可重複執行。
-- 需要先裝好 server-loot（含 loot-catalog、mercenary-rune-drops 等）。重裝舊掉寶 SQL（會重建 loot_roll）後要再跑這份。
-- ① 掉寶目錄補 20 件傳奇道具（uq_*，固定詞綴寫在遊戲裡，伺服器只給 { id, n:1, ench:0 }）與 uniques 設定；目錄 version 加尾碼 ${VER}，舊憑證照舊規則。
-- ② loot_unique：只有稀有（黃色、非財寶圖）異界的異界首領，T11～T12 1%、T13～T14 2%、T15 3%，20 件平均抽一件。
-- ③ 修補 loot_roll：結尾接上 loot_unique；隨機裝備池排除傳奇（不然會被當普通裝備掉出來、還擲上隨機詞綴）。
begin;
do $catalog$
declare c public.dragon_loot_catalog%rowtype; d jsonb; v text;
begin
 select * into c from public.dragon_loot_catalog where id=1 for update;
 if not found then raise exception '請先安裝後端掉寶目錄';end if;
 if c.data->'uniques' is not null then return;end if;
 d:=jsonb_set(c.data,'{items}',(c.data->'items')||$items$${JSON.stringify(data.items)}$items$::jsonb);
 d:=jsonb_set(d,'{uniques}',$cfg$${JSON.stringify({ ids: data.ids, p: data.p })}$cfg$::jsonb);
 v:=c.version||'${VER}';d:=jsonb_set(d,'{version}',to_jsonb(v));
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
`;
fs.writeFileSync(path.join(__dirname, 'unique-items.sql'), sql);
console.log('unique-items.sql：', data.ids.length, '件，', (sql.length / 1024).toFixed(1), 'KB');
