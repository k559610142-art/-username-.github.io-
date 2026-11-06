-- 黑暗大陸：伺服器擋經驗暴增（2026-11-06，ARCHITECTURE.md 第 311 節）。可重複執行。
-- 問題：玩家開加速器或改遊戲程式，Lv.50 每 6 分鐘 +270 萬經驗（正常約 5～6 萬）。原本的 dragon_saves_audit 只記錄不擋，
--       而且每次只跟上一筆比、時間最少算 0.5 小時（上限 302 萬），每 6 分鐘上傳一次就永遠不會被記到。
-- 做法：雲端存檔寫入前（before 觸發器）用「額度桶」檢查總經驗：
--   每小時可增加 dragon_exp_guard_rate(等級)＝2000 ×((等級+5)²+1)× 遞減（同 config.js huntExpRate），約正常最快的 3～10 倍、
--   全部經驗加成疊滿的理論極限附近；額度最多存 6 小時份（離線收益 12 小時 × 50% 也在內）。
--   超過就拒收（hint dragon_exp_rate），雲端停在上一份；遊戲顯示提示並呼叫 dragon_exp_block_report 記一筆 exp_block 給管理者。
--   管理頁把那筆 exp_block 按「已處理」＝放行：下一次上傳照收並補滿額度。未處理期間交易所也不能用（dragon_market_hold 本來就會擋）。
--   同一欄位換了角色（建立時間 created 不同）＝從 0 起算、額度只有 Lv.1 的 6 小時份（匯入大號存檔要管理者放行）。
-- 只擋玩家端（authenticated）寫入；管理者在 SQL Editor 改資料不受影響。新角色第一次上傳（insert）不擋，只起算（照舊由 dragon_saves_audit 記錄）。
-- 伺服器自己維護 exp_total／exp_credit 兩欄，玩家送來的值一律忽略。

alter table public.dragon_saves add column if not exists exp_total numeric;
alter table public.dragon_saves add column if not exists exp_credit numeric;

-- 狩獵遞減（與 data/config.js 的 huntExpRate 相同，2026-10-31 起 60 級開始遞減）
create or replace function public.dragon_exp_guard_hunt(l int) returns numeric
language sql immutable set search_path = '' as $$
    select case when l < 60 then 1 when l < 65 then 0.75 when l < 70 then 0.5 when l < 75 then 0.25 when l < 79 then 0.125 when l < 80 then 0.0625
        when l < 82 then 1.0 / 32 when l < 84 then 1.0 / 64 when l < 86 then 1.0 / 128 when l < 87 then 1.0 / 256 else 1.0 / 512 end::numeric;
$$;
-- 每小時最多可增加的經驗
create or replace function public.dragon_exp_guard_rate(l int) returns numeric
language sql immutable set search_path = '' as $$
    select 2000 * (power(greatest(l, 1) + 5, 2) + 1) * public.dragon_exp_guard_hunt(greatest(l, 1));
$$;
create or replace function public.dragon_exp_guard_hours() returns numeric language sql immutable as $$ select 6::numeric $$;
-- 存檔 player → 總經驗（解析失敗回 null）
create or replace function public.dragon_exp_guard_total(p jsonb) returns numeric
language plpgsql immutable set search_path = '' as $$
begin
    return public.dragon_total_exp(least(greatest(coalesce((p ->> 'lv')::int, 1), 1), 120), coalesce((p ->> 'exp')::numeric, 0));
exception when others then return null;
end $$;
revoke execute on function public.dragon_exp_guard_hunt(int), public.dragon_exp_guard_rate(int), public.dragon_exp_guard_total(jsonb) from public, anon, authenticated;

create or replace function public.dragon_saves_exp_guard() returns trigger
language plpgsql security definer set search_path = '' as $$
declare
    p jsonb := new.data -> 'player'; op jsonb;
    v_lv int; o_lv int; v_total numeric; o_total numeric; rate numeric; cap numeric; credit numeric; gain numeric;
begin
    -- 這兩欄只有伺服器能寫：玩家送什麼都蓋掉
    if tg_op = 'INSERT' then new.exp_total := null; new.exp_credit := null;
    else new.exp_total := old.exp_total; new.exp_credit := old.exp_credit; end if;
    v_total := public.dragon_exp_guard_total(p);
    if v_total is null then return new; end if;   -- 格式不對交給其他檢查
    v_lv := least(greatest(coalesce((p ->> 'lv')::int, 1), 1), 120);
    if tg_op = 'INSERT' then
        new.exp_total := v_total; new.exp_credit := public.dragon_exp_guard_rate(v_lv) * public.dragon_exp_guard_hours();
        return new;
    end if;
    if new.data is not distinct from old.data then return new; end if;
    if coalesce(auth.role(), '') <> 'authenticated' then   -- 管理者：照收、重新起算
        new.exp_total := v_total; new.exp_credit := public.dragon_exp_guard_rate(v_lv) * public.dragon_exp_guard_hours();
        return new;
    end if;
    op := old.data -> 'player';
    o_total := coalesce(old.exp_total, public.dragon_exp_guard_total(op), 0);
    o_lv := least(greatest(coalesce((op ->> 'lv')::int, 1), 1), 120);
    rate := greatest(public.dragon_exp_guard_rate(o_lv), public.dragon_exp_guard_rate(least(v_lv, o_lv + 5)));
    cap := rate * public.dragon_exp_guard_hours();
    credit := least(cap, coalesce(old.exp_credit, cap) + rate * greatest(0, extract(epoch from now() - old.updated_at) / 3600));
    if (p ->> 'created') is distinct from (op ->> 'created') then   -- 同一欄位換了角色：從 0 起算
        o_total := 0; credit := public.dragon_exp_guard_rate(1) * public.dragon_exp_guard_hours();
    end if;
    gain := v_total - o_total;
    if gain > credit then
        -- 管理者在管理頁把這次之後的 exp_block 按「已處理」＝放行
        if exists (select 1 from public.dragon_flags f where f.user_id = new.user_id and f.slot = new.slot and f.kind = 'exp_block'
                   and f.resolved and f.at > old.updated_at) then
            new.exp_total := v_total; new.exp_credit := cap;
            return new;
        end if;
        raise exception 'exp rate' using errcode = 'P0001', hint = 'dragon_exp_rate',
            detail = format('經驗 +%s，可增加 %s', round(gain), round(credit));
    end if;
    new.exp_total := v_total; new.exp_credit := credit - greatest(gain, 0);
    return new;
end $$;
drop trigger if exists dragon_saves_exp_guard on public.dragon_saves;
create trigger dragon_saves_exp_guard before insert or update on public.dragon_saves for each row execute function public.dragon_saves_exp_guard();

-- 被拒收時遊戲回報（觸發器拒收會整筆回滾，沒辦法在裡面寫紀錄）：記一筆 exp_block，同一欄位 24 小時內未處理的不重複記
create or replace function public.dragon_exp_block_report(p_slot int, p_lv int, p_total numeric) returns boolean
language plpgsql security definer set search_path = '' as $$
declare s public.dragon_saves; rate numeric; credit numeric;
begin
    if auth.uid() is null then raise exception 'not logged in'; end if;
    if p_slot is null or p_slot < 0 or p_slot > 7 then raise exception 'bad slot'; end if;
    if exists (select 1 from public.dragon_flags f where f.user_id = auth.uid() and f.slot = p_slot and f.kind = 'exp_block'
               and not f.resolved and f.at > now() - interval '24 hours') then return false; end if;
    select * into s from public.dragon_saves where user_id = auth.uid() and slot = p_slot;
    if s.user_id is null then return false; end if;
    rate := public.dragon_exp_guard_rate(coalesce(s.lv, 1));
    credit := least(rate * public.dragon_exp_guard_hours(), coalesce(s.exp_credit, 0) + rate * greatest(0, extract(epoch from now() - s.updated_at) / 3600));
    insert into public.dragon_flags (user_id, email, slot, name, lv, kind, detail)
        values (auth.uid(), auth.jwt() ->> 'email', p_slot, s.name, s.lv, 'exp_block',
                format('經驗增加過快，雲端存檔被拒收：遊戲回報 Lv.%s、總經驗 %s；雲端 Lv.%s、總經驗 %s，目前可增加約 %s（每小時 %s）。按「已處理」＝放行下一次上傳',
                       least(greatest(coalesce(p_lv, 0), 0), 999), round(least(greatest(coalesce(p_total, 0), 0), 1e15)), s.lv, round(coalesce(s.exp_total, 0)), round(credit), round(rate)));
    return true;
end $$;
revoke execute on function public.dragon_exp_block_report(int, int, numeric) from public, anon;
grant execute on function public.dragon_exp_block_report(int, int, numeric) to authenticated;
