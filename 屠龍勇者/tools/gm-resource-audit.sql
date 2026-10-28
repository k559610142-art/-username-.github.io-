-- 黑暗大陸：合法資金／物資核對與GM判定（20261028o）。使用者已授權；由使用者貼Supabase執行。
-- 接在vault-v2.sql、market-v2.sql、flag-trust.sql及既有掉寶／簽章更新之後。可重跑；重跑舊檔後須重跑本檔。
-- 不清除舊可疑紀錄、不改信任名單／防複製／簽章／序號／RLS守衛。整份交易安裝，任何錯誤回滾。
begin;
create table if not exists public.dragon_resource_log (
 id bigserial primary key,user_id uuid not null references auth.users(id) on delete cascade,
 slot int not null,char_id text not null,name text,kind text not null,ref bigint,
 gold_delta numeric not null default 0,detail jsonb not null default '{}'::jsonb,at timestamptz not null default clock_timestamp()
);
create index if not exists dragon_resource_log_char on public.dragon_resource_log(user_id,char_id,id);
create unique index if not exists dragon_resource_sale_once on public.dragon_resource_log(user_id,ref) where kind='market_sale';
alter table public.dragon_resource_log enable row level security;
revoke all on public.dragon_resource_log from public,anon,authenticated;
grant select on public.dragon_resource_log to authenticated;
drop policy if exists dragon_resource_admin on public.dragon_resource_log;
create policy dragon_resource_admin on public.dragon_resource_log for select to authenticated using(public.dragon_is_admin());
alter table public.dragon_save_log add column if not exists resource_cursor bigint not null default 0;
alter table public.dragon_save_log add column if not exists resource_delta numeric not null default 0;
-- 已領收入只設防重用基線，不補算為新收入（marketGot保留最近200筆，已ack成交同樣封存）。
insert into public.dragon_resource_log(user_id,slot,char_id,name,kind,ref,detail)
select m.seller,m.slot,'legacy',m.seller_name,'market_sale',m.id,jsonb_build_object('baseline',true,'item',m.item_id,'price',m.price,'fee',m.fee)
from public.dragon_market m where m.state='sold' and (m.seller_got or exists(
 select 1 from public.dragon_saves s where s.user_id=m.seller and coalesce(s.data->'player'->'marketGot','[]'::jsonb) ? ('s'||m.id::text)))
on conflict(user_id,ref) where kind='market_sale' do nothing;
-- 只由成功RPC在同一交易內呼叫，金幣差額讀取真正雲端存檔；失敗整筆回滾。
create or replace function public.dragon_resource_commit(p_slot int,p_player jsonb,p_kind text,p_ref bigint,p_detail jsonb) returns jsonb
language plpgsql security definer set search_path='' as $$
declare prev_gold numeric;begin
 select coalesce((data->'player'->>'gold')::numeric,0) into strict prev_gold from public.dragon_saves where user_id=auth.uid() and slot=p_slot for update;
 insert into public.dragon_resource_log(user_id,slot,char_id,name,kind,ref,gold_delta,detail)
 values(auth.uid(),p_slot,(p_player->>'created')||'|'||(p_player->>'cls'),p_player->>'name',p_kind,p_ref,coalesce((p_player->>'gold')::numeric,0)-prev_gold,coalesce(p_detail,'{}'::jsonb));
 return public.dragon_vault_commit(p_slot,p_player);
end $$;
revoke execute on function public.dragon_resource_commit(int,jsonb,text,bigint,jsonb) from public,anon,authenticated;
create or replace function public.vault_put2(p_slot int, p_uid int, p_n int, p_gold bigint, p_name text) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare p jsonb := public.dragon_vault_row(p_slot); g numeric := coalesce((p ->> 'gold')::numeric, 0); it jsonb; idx int; have int; item jsonb; r bigint;
begin
    if p_uid is null then
        if p_gold is null or p_gold < 1 or p_gold > 2000000000 then raise exception 'bad amount'; end if;
        if g < p_gold + 100 then raise exception 'not enough gold'; end if;
        p := jsonb_set(p, '{gold}', to_jsonb(g - p_gold - 100));
        insert into public.dragon_vault (user_id, gold) values (auth.uid(), p_gold) on conflict (user_id) do update set gold = public.dragon_vault.gold + p_gold;
        return public.dragon_resource_commit(p_slot,p,'vault_deposit_gold',null,jsonb_build_object('amount',p_gold,'fee',100)) || jsonb_build_object('ok', true, 'gold', -(p_gold + 100));
    end if;
    if (select count(*) from public.dragon_vault_items where user_id = auth.uid() and taken_at is null) >= 200 then raise exception 'vault full'; end if;
    select x, (o - 1)::int into it, idx from jsonb_array_elements(coalesce(p -> 'inv', '[]'::jsonb)) with ordinality e(x, o) where (x ->> 'uid')::int = p_uid limit 1;
    if it is null then raise exception 'item not in cloud save'; end if;
    if coalesce((it ->> 'ench')::int, 0) > 15 or it ->> 'id' is null or public.dragon_item_cat(it ->> 'id') = 'quest' then raise exception 'not tradeable'; end if;
    have := greatest(coalesce((it ->> 'n')::int, 1), 1);
    if p_n is null or p_n < 1 or p_n > have then raise exception 'bad amount'; end if;
    if p_n < have then
        p := jsonb_set(p, array['inv', idx::text, 'n'], to_jsonb(have - p_n));
        item := it || jsonb_build_object('n', p_n);
    else
        p := jsonb_set(p, '{inv}', (p -> 'inv') - idx);
        item := it;
    end if;
    p := jsonb_set(p, '{gold}', to_jsonb(g - 100));
    delete from public.dragon_vault_items where user_id = auth.uid() and taken_at < now() - interval '30 days';
    -- 存的是雲端存檔裡的那一件（玩家送來的內容不採用）
    insert into public.dragon_vault_items (user_id, from_slot, uid, item_id, item, name)
        values (auth.uid(), p_slot, p_uid, it ->> 'id', item, left(p_name, 60)) returning id into r;
    return public.dragon_resource_commit(p_slot,p,'vault_deposit_item',r,jsonb_build_object('item',it->>'id','item_name',p_name,'n',p_n,'fee',100)) || jsonb_build_object('ok', true, 'id', r, 'gold', -100, 'uid', p_uid, 'n', p_n);
end $$;

create or replace function public.vault_take2(p_slot int, p_id bigint, p_gold bigint) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare p jsonb := public.dragon_vault_row(p_slot); g numeric := coalesce((p ->> 'gold')::numeric, 0); vi public.dragon_vault_items; vg bigint;
    item jsonb; idx int; nu bigint;
begin
    if p_id is null then
        select gold into vg from public.dragon_vault where user_id = auth.uid() for update;
        if p_gold is null or p_gold < 1 or coalesce(vg, 0) < p_gold then raise exception 'bad amount'; end if;
        update public.dragon_vault set gold = gold - p_gold where user_id = auth.uid();
        p := jsonb_set(p, '{gold}', to_jsonb(g + p_gold - 100));
        return public.dragon_resource_commit(p_slot,p,'vault_withdraw_gold',null,jsonb_build_object('amount',p_gold,'fee',100)) || jsonb_build_object('ok', true, 'gold', p_gold - 100);
    end if;
    select * into vi from public.dragon_vault_items where id = p_id and user_id = auth.uid() and taken_at is null for update;
    if vi.id is null then raise exception 'not available'; end if;
    update public.dragon_vault_items set taken_at = now() where id = p_id;
    item := vi.item;
    -- 可堆疊的道具（沒有 ench 欄位）併進同名那一疊，其他的給新 uid（同 player.js addItem）
    if not (item ? 'ench') then
        select (o - 1)::int into idx from jsonb_array_elements(coalesce(p -> 'inv', '[]'::jsonb)) with ordinality e(x, o)
            where x ->> 'id' = item ->> 'id' and not (x ? 'ench') limit 1;
    end if;
    if idx is not null then
        p := jsonb_set(p, array['inv', idx::text, 'n'], to_jsonb(coalesce((p -> 'inv' -> idx ->> 'n')::int, 1) + coalesce((item ->> 'n')::int, 1)));
    else
        nu := coalesce((p ->> 'nextUid')::bigint, 1);
        p := jsonb_set(p, '{inv}', coalesce(p -> 'inv', '[]'::jsonb) || jsonb_build_array(item || jsonb_build_object('uid', nu)));
        p := jsonb_set(p, '{nextUid}', to_jsonb(nu + 1));
    end if;
    p := jsonb_set(p, '{gold}', to_jsonb(g - 100));
    return public.dragon_resource_commit(p_slot,p,'vault_withdraw_item',p_id,jsonb_build_object('item',item->>'id','item_name',vi.name,'n',coalesce((item->>'n')::int,1),'from_slot',vi.from_slot,'fee',100)) || jsonb_build_object('ok', true, 'item', item, 'name', vi.name, 'gold', -100);
end $$;

create or replace function public.market_list2(p_slot int, p_uid int, p_n int, p_price bigint, p_seller_name text, p_name text, p_cat text) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare p jsonb := public.dragon_market_row(p_slot, true); it jsonb; idx int; have int; item jsonb; r bigint; v_cat text;
begin
    if p_price is null or p_price < 1 or p_price > 2000000000 then raise exception 'bad price'; end if;
    -- 名額只算還沒過期的（過期沒取回的不佔名額，2026-10-24 第 117 節）
    if (select count(*) from public.dragon_market where seller = auth.uid() and state = 'active' and expires_at > now()) >= 10 then raise exception 'too many listings'; end if;
    select x, (o - 1)::int into it, idx from jsonb_array_elements(coalesce(p -> 'inv', '[]'::jsonb)) with ordinality e(x, o) where (x ->> 'uid')::int = p_uid limit 1;
    if it is null then raise exception 'item not in cloud save'; end if;
    v_cat := coalesce(public.dragon_item_cat(it ->> 'id'), p_cat);   -- 分類以伺服器為準，不採用玩家送來的 p_cat
    if v_cat = 'quest' then raise exception 'not tradeable'; end if;
    if it ->> 'id' is null or coalesce((it ->> 'ench')::int, 0) > 15 then raise exception 'not tradeable'; end if;
    have := greatest(coalesce((it ->> 'n')::int, 1), 1);
    if p_n is null or p_n < 1 or p_n > have then raise exception 'bad amount'; end if;
    if p_n < have then
        p := jsonb_set(p, array['inv', idx::text, 'n'], to_jsonb(have - p_n));
        item := it || jsonb_build_object('n', p_n);
    else
        p := jsonb_set(p, '{inv}', (p -> 'inv') - idx);
        item := it;
    end if;
    delete from public.dragon_market where state <> 'active' and buyer_got and seller_got and listed_at < now() - interval '30 days';
    delete from public.dragon_market where state = 'cancelled' and listed_at < now() - interval '30 days';
    insert into public.dragon_market (seller, seller_name, slot, item, item_id, uid, n, cat, name, price, fee, expires_at)
        values (auth.uid(), left(p_seller_name, 40), p_slot, item, it ->> 'id', p_uid, p_n, left(v_cat, 20), left(p_name, 60), p_price, ceil(p_price * 0.05), now() + interval '48 hours')
        returning id into r;
    return public.dragon_resource_commit(p_slot,p,'market_list',r,jsonb_build_object('item',item->>'id','item_name',p_name,'n',p_n,'price',p_price)) || jsonb_build_object('ok', true, 'id', r, 'uid', p_uid, 'n', p_n);
end $$;

create or replace function public.market_cancel2(p_id bigint, p_slot int) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare p jsonb := public.dragon_market_row(p_slot, false); m public.dragon_market;
begin
    select * into m from public.dragon_market where id = p_id and seller = auth.uid() for update;
    if m.id is null or m.state <> 'active' then raise exception 'not available'; end if;
    update public.dragon_market set state = 'cancelled' where id = p_id;
    p := public.dragon_inv_add(p, m.item);
    return public.dragon_resource_commit(p_slot,p,'market_cancel',m.id,jsonb_build_object('item',m.item_id,'item_name',m.name,'n',m.n)) || jsonb_build_object('ok', true, 'id', m.id, 'item', m.item, 'name', m.name);
end $$;

create or replace function public.market_buy2(p_id bigint, p_slot int, p_buyer_name text) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare p jsonb := public.dragon_market_row(p_slot, true); m public.dragon_market; g numeric := coalesce((p ->> 'gold')::numeric, 0);
    v_email text := auth.jwt() ->> 'email'; v_seller_email text;
begin
    select * into m from public.dragon_market where id = p_id for update;
    if m.id is null or m.state <> 'active' or m.expires_at <= now() then raise exception 'not available'; end if;
    if m.seller = auth.uid() then raise exception 'own listing'; end if;
    if g < m.price then raise exception 'not enough gold'; end if;
    update public.dragon_market set state = 'sold', buyer = auth.uid(), buyer_name = left(p_buyer_name, 40), sold_at = now(), buyer_got = true where id = p_id;
    if m.price >= 50000000 then
        select email into v_seller_email from public.dragon_profiles where user_id = m.seller;
        insert into public.dragon_flags (user_id, email, slot, name, kind, detail) values
            (auth.uid(), v_email, p_slot, left(p_buyer_name, 40), 'market_big', format('交易所 #%s 以 %s 金幣買下「%s」（賣家 %s）', m.id, m.price, m.name, coalesce(m.seller_name, '?'))),
            (m.seller, v_seller_email, m.slot, m.seller_name, 'market_big', format('交易所 #%s 以 %s 金幣賣出「%s」（買家 %s）', m.id, m.price, m.name, left(p_buyer_name, 40)));
    end if;
    p := jsonb_set(public.dragon_inv_add(p, m.item), '{gold}', to_jsonb(g - m.price));
    return public.dragon_resource_commit(p_slot,p,'market_buy',m.id,jsonb_build_object('item',m.item_id,'item_name',m.name,'n',m.n,'price',m.price,'seller',m.seller,'seller_name',m.seller_name)) || jsonb_build_object('ok', true, 'id', m.id, 'item', m.item, 'price', m.price, 'name', m.name, 'gold', -m.price);
end $$;

create or replace function public.dragon_saves_audit() returns trigger
language plpgsql security definer set search_path = '' as $$
declare
    p jsonb := new.data -> 'player';
    v_lv int; v_exp numeric; v_gold numeric; v_created bigint; v_total numeric;
    prev record; hrs numeric; unit numeric; lim numeric; f text[] := '{}'; d text[] := '{}'; k int;
    v_prev_cursor bigint := 0; v_cursor bigint := 0; v_resource numeric := 0; v_ch text; sale record;
    v_email text := auth.jwt() ->> 'email'; v_last timestamptz;
begin
    begin
        v_lv := coalesce((p ->> 'lv')::int, 1);
        v_exp := coalesce((p ->> 'exp')::numeric, 0);
        v_gold := coalesce((p ->> 'gold')::numeric, 0);
        v_created := (p ->> 'created')::numeric::bigint;
        v_ch := (p->>'created')||'|'||(p->>'cls');
        -- 只有真實成交、屬於本帳號、尚未ack的賣款可認列；跨角色同一成交僅一次。
        for sale in select m.* from public.dragon_market m
          where m.seller=new.user_id and m.state='sold' and not m.seller_got
            and coalesce(p->'marketGot','[]'::jsonb) ? ('s'||m.id::text) order by m.id for update
        loop
          insert into public.dragon_resource_log(user_id,slot,char_id,name,kind,ref,gold_delta,detail)
          values(new.user_id,new.slot,v_ch,new.name,'market_sale',sale.id,sale.price-sale.fee,
            jsonb_build_object('item',sale.item_id,'item_name',sale.name,'n',sale.n,'price',sale.price,'fee',sale.fee,'buyer_name',sale.buyer_name))
          on conflict(user_id,ref) where kind='market_sale' do nothing;
        end loop;
        select coalesce(max(id),0) into v_cursor from public.dragon_resource_log where user_id=new.user_id and char_id=v_ch;
        v_total := public.dragon_total_exp(least(greatest(v_lv, 1), 120), v_exp);
        if v_lv > 99 or v_lv < 1 then f := array_append(f, 'level'); d := array_append(d, format('等級 %s', v_lv)); end if;
        if v_gold < 0 then f := array_append(f, 'gold_negative'); d := array_append(d, format('金幣 %s', v_gold)); end if;
        if (select max(value::numeric) from jsonb_each_text(coalesce(p -> 'stats', '{}'::jsonb))) > 40 then
            f := array_append(f, 'stat'); d := array_append(d, ('能力值 ' || (p -> 'stats')::text));
        end if;
        if coalesce((p ->> 'elixirs')::int, 0) > 5 then f := array_append(f, 'elixir'); d := array_append(d, format('萬能藥 %s 瓶', p ->> 'elixirs')); end if;
        select max((x ->> 'ench')::int) into k from (
            select jsonb_array_elements(coalesce(p -> 'inv', '[]'::jsonb)) x
            union all select jsonb_array_elements(coalesce(p -> 'storage', '[]'::jsonb))
            union all select value from jsonb_each(coalesce(p -> 'equip', '{}'::jsonb))) s;
        if k > 15 then f := array_append(f, 'enchant'); d := array_append(d, format('裝備強化 +%s', k)); end if;
        if new.client_t > (extract(epoch from now()) * 1000 + 3600000) then
            f := array_append(f, 'clock'); d := array_append(d, format('存檔時間比伺服器快 %s 分鐘（可能改了裝置時間）', round((new.client_t - extract(epoch from now()) * 1000) / 60000)));
        end if;
        -- 和這個角色上一筆比較
        select * into prev from public.dragon_save_log l
            where l.user_id = new.user_id and l.slot = new.slot and l.char_created is not distinct from v_created and l.cls = new.cls
            order by l.id desc limit 1;
        if found then
            v_prev_cursor := coalesce(prev.resource_cursor,0);
            hrs := greatest(extract(epoch from now() - prev.at) / 3600, 0.5);
            unit := (power(prev.lv + 5, 2) + 1);
            lim := 2000 * unit * public.dragon_hunt_rate(prev.lv) * hrs;
            if v_total - prev.total_exp > lim then
                f := array_append(f, 'exp_rate'); d := array_append(d, format('%s 小時內經驗 +%s（Lv.%s→%s，上限約 %s）', round(hrs, 2), round(v_total - prev.total_exp), prev.lv, v_lv, round(lim)));
            end if;
            select coalesce(sum(gold_delta),0) into v_resource from public.dragon_resource_log
              where user_id=new.user_id and char_id=v_ch and id>prev.resource_cursor and id<=v_cursor;
            lim := greatest(300000, 3000 * unit) * hrs;
            if v_gold - prev.gold - v_resource > lim then
                f := array_append(f, 'gold_rate'); d := array_append(d, format('%s 小時內金幣變化 %s；已核實交易／倉庫淨轉移 %s，扣除後 +%s（上限約 %s）', round(hrs, 2), round(v_gold-prev.gold), round(v_resource), round(v_gold-prev.gold-v_resource), round(lim)));
            end if;
        elsif v_created is not null and v_created > 0 then
            hrs := greatest((extract(epoch from now()) * 1000 - v_created) / 3600000, 0.5);
            lim := 2000 * 226 * hrs + 100000;   -- 新角色：用 Lv.10 的上限估算（前期升級最快）
            if v_total > lim and v_lv >= 20 then
                f := array_append(f, 'exp_rate'); d := array_append(d, format('角色建立 %s 小時就有 Lv.%s（總經驗 %s）', round(hrs, 2), v_lv, round(v_total)));
            end if;
        end if;
    exception when others then
        f := array_append(f, 'parse'); d := array_append(d, ('存檔格式無法解析：' || sqlerrm));
    end;

    -- 2026-10-23 減少寫入（第 101 節）：同一欄位 5 分鐘內已有歷程、這次也沒有異常，就不再記一筆（歷程與「上一筆比較」改成約 5 分鐘一筆）
    select l.at into v_last from public.dragon_save_log l where l.user_id = new.user_id and l.slot = new.slot order by l.id desc limit 1;
    if v_cursor > v_prev_cursor or f <> '{}' or v_last is null or v_last < now() - interval '5 minutes' then
        insert into public.dragon_save_log (user_id, slot, char_created, name, cls, lv, total_exp, gold, client_t, flags, resource_cursor, resource_delta)
            values (new.user_id, new.slot, v_created, new.name, new.cls, v_lv, v_total, v_gold, new.client_t, nullif(f, '{}'), v_cursor, v_resource);
        -- 每個欄位只留最近 200 筆
        delete from public.dragon_save_log l where l.user_id = new.user_id and l.slot = new.slot
            and l.id < (select id from public.dragon_save_log x where x.user_id = new.user_id and x.slot = new.slot order by x.id desc offset 199 limit 1);
    end if;
    -- 最後上線時間 5 分鐘內、名字與 email 沒變就不改
    insert into public.dragon_profiles (user_id, email, last_name, last_seen) values (new.user_id, v_email, new.name, now())
        on conflict (user_id) do update set email = coalesce(excluded.email, public.dragon_profiles.email), last_name = excluded.last_name, last_seen = now()
        where public.dragon_profiles.last_seen < now() - interval '5 minutes' or public.dragon_profiles.last_name is distinct from excluded.last_name
           or public.dragon_profiles.email is distinct from coalesce(excluded.email, public.dragon_profiles.email);
    -- 2026-10-23（第 111 節）：信任名單的帳號不記可疑紀錄（歷程照記）；
    -- 同一種異常、同一角色，24 小時內已經有紀錄（不論有沒有按「已處理」）就不重複記，所以按了「已處理」至少 24 小時內有效
    if exists (select 1 from public.dragon_trusted tr where tr.user_id = new.user_id) then return null; end if;
    for k in 1 .. coalesce(array_length(f, 1), 0) loop
        if not exists (select 1 from public.dragon_flags x where x.user_id = new.user_id and x.slot = new.slot and x.kind = f[k]
                and x.at > now() - interval '24 hours') then
            insert into public.dragon_flags (user_id, email, slot, name, lv, kind, detail) values (new.user_id, v_email, new.slot, new.name, v_lv, f[k], d[k]);
        end if;
    end loop;
    return null;
end $$;
create or replace function public.wb_attack(p_wb bigint, p_dmg bigint, p_name text, p_cls text) returns json
language plpgsql security definer set search_path = '' as $$
declare w public.dragon_wb; lv int; used int; cap bigint; d bigint; v_email text := auth.jwt() ->> 'email';
begin
    if auth.uid() is null then raise exception 'not logged in'; end if;
    if public.dragon_is_banned() then raise exception 'banned'; end if;
    select * into w from public.dragon_wb where id = p_wb for update;
    if w.id is null or w.hp <= 0 or w.killed_at is not null or w.ends_at < now() then raise exception 'boss gone'; end if;
    select max(s.lv) into lv from public.dragon_saves s where s.user_id = auth.uid();
    if lv is null then raise exception 'no cloud save'; end if;
    select count(*) into used from public.dragon_wb_hits where user_id = auth.uid() and at >= public.wb_day_start();
    if used >= 3 then raise exception 'no attempts'; end if;
    cap := 8 * (1500 + 70 * lv);
    d := least(greatest(coalesce(p_dmg, 0), 0), cap);
    if p_dmg > cap then
        insert into public.dragon_flags (user_id, email, slot, name, lv, kind, detail)
            values (auth.uid(), v_email, 0, left(p_name, 40), lv, 'wb_dmg', format('世界首領單次傷害 %s，超過上限 %s（Lv.%s）', p_dmg, cap, lv));
    end if;
    d := least(d, w.hp);
    update public.dragon_wb set hp = hp - d,
        killed_at = case when hp - d <= 0 then now() end,
        killer = case when hp - d <= 0 then auth.uid() end,
        killer_name = case when hp - d <= 0 then left(p_name, 40) end
        where id = w.id returning * into w;
    insert into public.dragon_wb_hits (wb_id, user_id, name, cls, lv, dmg) values (w.id, auth.uid(), left(p_name, 40), left(p_cls, 20), lv, d);
    return json_build_object('dmg', d, 'hp', w.hp, 'killed', w.killed_at is not null, 'attempts_left', greatest(0, 2 - used), 'capped', p_dmg > cap);
end $$;
commit;
