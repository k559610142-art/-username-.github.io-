-- 黑暗大陸：首領時間改由伺服器決定（2026-11-02，ARCHITECTURE.md 第 273 節）。接在 server-loot-install、loot-batch、loot-screen、
-- treasure-maps、mercenary-rune-drops、advance-class 之後執行；可重跑。重跑 server-loot-install.sql／loot-batch.sql 後要再跑這份。
-- 1. 野外首領：每個帳號每張地圖一個計時，60～90 分鐘隨機；時間到，下一次遇怪（非加入、非指定怪、非異界地圖）就出該圖首領，出了就重設。
--    第一次在那張圖遇怪時才建立計時，不會立刻出。取代 loot_spawn 的 random()<rare.p。
-- 2. 團隊副本冷卻：勝利領獎（loot_raid）時伺服器記「角色＋副本」冷卻（RAIDS 的 cdH）；冷卻中按「準備」被拒（raid cooldown）。
-- 3. 永夜之塔守關首領：首領憑證結算時伺服器記「角色＋樓層」6 小時；loot_spawn 改看伺服器表，不再看存檔的 towerBossCd。
-- 4. 小怪（第 274 節）：小怪不掉鑽石、二轉技能書、傭兵符石、天賦寶珠（新版遊戲小怪改本機算，這裡擋舊版與首領那群附帶的小怪）；舊 dia_drop 只剩首領。
-- 單人龍穴 dragonCd、異界地圖首領不變。
create table if not exists public.dragon_boss_cd (
    user_id uuid        not null references auth.users (id) on delete cascade,
    kind    text        not null check (kind in ('field', 'raid', 'tower')),
    key     text        not null check (char_length(key) <= 100),   -- field：地圖 id；raid：角色|副本 id；tower：角色|樓層
    until   timestamptz not null,
    primary key (user_id, kind, key)
);
alter table public.dragon_boss_cd enable row level security;
revoke all on public.dragon_boss_cd from anon, authenticated;   -- 只能透過下面的函式

-- 野外首領是否該出現（loot_spawn 呼叫；有 rare 的地圖才計時）
create or replace function public.boss_field_due(p_zone text, p_has boolean) returns boolean
language plpgsql security definer set search_path = '' as $$
declare u timestamptz; nxt timestamptz := clock_timestamp() + make_interval(mins => 60 + floor(random() * 31)::int);
begin
    if not coalesce(p_has, false) or auth.uid() is null then return false; end if;
    select until into u from public.dragon_boss_cd where user_id = auth.uid() and kind = 'field' and key = p_zone for update;
    if u is null then
        insert into public.dragon_boss_cd values (auth.uid(), 'field', p_zone, nxt) on conflict do nothing;
        return false;
    end if;
    if clock_timestamp() < u then return false; end if;
    update public.dragon_boss_cd set until = nxt where user_id = auth.uid() and kind = 'field' and key = p_zone;
    return true;
end $$;

-- 冷卻是否已過（沒有紀錄＝可以）
create or replace function public.boss_cd_ready(p_kind text, p_key text) returns boolean
language sql stable security definer set search_path = '' as $$
    select coalesce((select until <= clock_timestamp() from public.dragon_boss_cd where user_id = auth.uid() and kind = p_kind and key = p_key), true);
$$;

-- 守關首領能不能出：伺服器冷卻已過，而且沒有「打倒了但還沒結算」的同層首領憑證（批次結算最多等 60 秒，避免這段時間又出一隻）
create or replace function public.boss_tower_ready(p_char text, p_floor int) returns boolean
language sql stable security definer set search_path = '' as $$
    select public.boss_cd_ready('tower', p_char || '|' || p_floor)
        and not exists (select 1 from public.dragon_loot_jobs j where j.user_id = auth.uid() and j.char_id = p_char and j.result is null
            and not (j.context ? 'cancelled') and j.created_at > clock_timestamp() - interval '12 hours' and j.context->'monster'->>'id' = 'towerBoss' || p_floor);
$$;

create or replace function public.boss_cd_set(p_kind text, p_key text, p_hours numeric) returns void
language sql security definer set search_path = '' as $$
    insert into public.dragon_boss_cd values (auth.uid(), p_kind, p_key, clock_timestamp() + make_interval(secs => p_hours * 3600))
    on conflict (user_id, kind, key) do update set until = excluded.until;
$$;

-- 結算到守關首領（monster.id = towerBoss樓層）：記 6 小時
create or replace function public.boss_cd_kill(j public.dragon_loot_jobs) returns void
language plpgsql security definer set search_path = '' as $$
declare f text := substring(j.context->'monster'->>'id' from '^towerBoss(\d+)$');
begin
    if f is not null and coalesce((j.context->'monster'->>'boss')::boolean, false) then perform public.boss_cd_set('tower', j.char_id || '|' || f, 6); end if;
end $$;

-- 遊戲端顯示用：自己的副本／塔冷卻與野外首領下次時間
create or replace function public.boss_cd_status() returns jsonb
language sql stable security definer set search_path = '' as $$
    select coalesce(jsonb_agg(jsonb_build_object('kind', kind, 'key', key, 'until', until, 'now', clock_timestamp())), '[]'::jsonb)   -- now：遊戲端換算裝置時鐘誤差
    from public.dragon_boss_cd where user_id = auth.uid() and until > clock_timestamp() - interval '1 day';
$$;

-- 團隊副本按「準備」：這個角色這個副本還在冷卻就拒絕
create or replace function public.raid_members_cd_check() returns trigger
language plpgsql security definer set search_path = '' as $$
declare rid text;
begin
    if new.ready_round <> 0 and new.ready_round is distinct from old.ready_round then
        select raid into rid from public.raid_rooms where id = new.room_id;
        if exists (select 1 from public.dragon_boss_cd where user_id = new.user_id and kind = 'raid' and key = coalesce(new.char_id, '') || '|' || rid and until > clock_timestamp()) then
            raise exception 'raid cooldown';
        end if;
    end if;
    return new;
end $$;
drop trigger if exists raid_members_cd_check on public.raid_members;
create trigger raid_members_cd_check before update on public.raid_members for each row execute function public.raid_members_cd_check();

revoke execute on function public.boss_field_due(text, boolean), public.boss_cd_ready(text, text), public.boss_tower_ready(text, int), public.boss_cd_set(text, text, numeric),
    public.boss_cd_kill(public.dragon_loot_jobs), public.raid_members_cd_check() from public, anon, authenticated;
revoke execute on function public.boss_cd_status() from public, anon;
grant execute on function public.boss_cd_status() to authenticated;

-- 補丁現有掉寶函式（找不到原本的字串就報錯、不改；已補過的跳過）
do $patch$
declare fn record; src text; patched text; old_field text; new_field text; old_tower text; new_tower text; done int := 0;
begin
    old_field := 'not p_join and p_mid is null and not is_map and random()<coalesce((z->''rare''->>''p'')::numeric,0)';
    new_field := '(case when not p_join and p_mid is null and not is_map then public.boss_field_due(z->>''id'',z ? ''rare'') else false end)';
    old_tower := 'coalesce((p->''towerBossCd''->>f::text)::numeric,0)<=extract(epoch from clock_timestamp())*1000';
    new_tower := 'public.boss_tower_ready(p_char,f)';
    for fn in select p.oid, p.proname from pg_proc p join pg_namespace ns on ns.oid = p.pronamespace
        where ns.nspname = 'public' and p.proname in ('loot_spawn', 'loot_finish', 'loot_finish_batch', 'loot_raid') loop
        src := pg_get_functiondef(fn.oid); patched := src;
        if fn.proname = 'loot_spawn' then
            if position('boss_field_due' in src) = 0 then
                if position(old_field in src) = 0 or position(old_tower in src) = 0 then raise exception 'loot_spawn結構不同，未更新，請提供現有函式'; end if;
                patched := replace(replace(src, old_field, new_field), old_tower, new_tower);
            end if;
        elsif fn.proname = 'loot_finish_batch' then
            if position('boss_cd_kill' in src) = 0 then
                if position('boss:=coalesce((j.context->''monster''->>''boss'')::boolean,false);' in src) = 0 then raise exception 'loot_finish_batch結構不同，未更新'; end if;
                patched := replace(src, 'boss:=coalesce((j.context->''monster''->>''boss'')::boolean,false);', 'boss:=coalesce((j.context->''monster''->>''boss'')::boolean,false);perform public.boss_cd_kill(j);');
            end if;
        elsif fn.proname = 'loot_finish' then
            if position('boss_cd_kill' in src) = 0 then
                if position('cursor=s where id=j.id returning * into j;' in src) = 0 then raise exception 'loot_finish結構不同，未更新'; end if;
                patched := replace(src, 'cursor=s where id=j.id returning * into j;', 'cursor=s where id=j.id returning * into j;perform public.boss_cd_kill(j);');
            end if;
        elsif fn.proname = 'loot_raid' then
            if position('boss_cd_set' in src) = 0 then
                if position('''loot invalid raid'';end if;' in src) = 0 then raise exception 'loot_raid結構不同，未更新'; end if;
                patched := replace(src, '''loot invalid raid'';end if;', '''loot invalid raid'';end if;perform public.boss_cd_set(''raid'',p_char||''|''||r.raid,coalesce((def->>''cdH'')::numeric,2));');
            end if;
        end if;
        if patched <> src then execute patched; end if;
        done := done + 1;
    end loop;
    if done < 4 then raise exception '缺少掉寶函式（loot_spawn／loot_finish／loot_finish_batch／loot_raid），請先安裝 server-loot-install、loot-batch'; end if;
end $patch$;

-- ───── 首領走後端、小怪本機算（2026-11-02，第 274 節）─────
-- 新版遊戲小怪不再要伺服器憑證；伺服器這邊照樣替舊版遊戲、或首領那一群附帶的小怪結算，但：
--   小怪不掉鑽石（拿掉一般怪 0.1%）、不掉二轉技能書（book_adv_）、傭兵符石（mercRune_）、天賦寶珠（talentJewel_）。首領掉率不變；天賦石照舊。
create or replace function public.loot_minor_filter(items jsonb, x jsonb) returns jsonb
language sql immutable set search_path = '' as $$
    select case when coalesce((x->'monster'->>'boss')::boolean, false) then items
        else coalesce((select jsonb_agg(v) from jsonb_array_elements(coalesce(items, '[]'::jsonb)) v
            where left(v->>'id', 9) not in ('book_adv_', 'mercRune_') and left(v->>'id', 12) <> 'talentJewel_'), '[]'::jsonb) end;
$$;
revoke execute on function public.loot_minor_filter(jsonb, jsonb) from public, anon, authenticated;

-- 舊的直接領鑽石（後端掉寶停用時才用得到）：只剩首領
create or replace function public.dia_drop(p_src text) returns json language plpgsql security definer set search_path = '' as $$ begin
    if p_src is distinct from 'boss' then raise exception 'mob diamonds removed'; end if;
    if exists (select 1 from public.dragon_loot_config cfg where cfg.id = 1 and enabled) then raise exception 'loot ticket required'; end if;
    return public.loot_dia_drop_legacy(p_src);
end $$;
revoke all on function public.dia_drop(text) from public, anon;
grant execute on function public.dia_drop(text) to authenticated;

do $minor$
declare fn record; src text; patched text; done int := 0;
begin
    for fn in select p.oid, p.proname from pg_proc p join pg_namespace ns on ns.oid = p.pronamespace
        where ns.nspname = 'public' and p.proname in ('loot_finish', 'loot_finish_batch') loop
        src := pg_get_functiondef(fn.oid); patched := src;
        if position('loot_minor_filter' in src) = 0 then
            if position('public.loot_roll(c,j.context)' in src) = 0 or position(' or random()<0.001' in src) = 0 then raise exception '%結構不同，未更新', fn.proname; end if;
            patched := replace(replace(src, 'public.loot_roll(c,j.context)', 'public.loot_minor_filter(public.loot_roll(c,j.context),j.context)'), ' or random()<0.001', '');
        end if;
        if patched <> src then execute patched; end if;
        done := done + 1;
    end loop;
    if done < 2 then raise exception '缺少 loot_finish／loot_finish_batch，請先安裝 server-loot-install、loot-batch'; end if;
end $minor$;

-- ───── 傭兵符石只有首領掉：特殊、基本各自 5%（2026-11-03，第 296 節）─────
-- 黃色稀有異界地圖的首領、團隊副本勝利（同原本特殊符石的範圍）；小怪不掉。重跑 mercenary-rune-drops.sql 後要再跑這份。
create or replace function public.loot_merc_rune(c jsonb, x jsonb) returns jsonb
language plpgsql volatile set search_path = '' as $$
declare cfg jsonb := c->'mercRunes'; raid boolean := coalesce((x->>'mercRaid')::boolean, false); out jsonb := '[]'::jsonb; kind text;
begin
    if cfg is null then return out; end if;
    if not raid and (coalesce(x->'map'->>'q', '') <> 'rare' or coalesce((x->'map'->>'treasure')::boolean, false)) then return out; end if;
    if not raid and not coalesce((x->'monster'->>'boss')::boolean, false) then return out; end if;
    foreach kind in array array['special', 'basic'] loop
        if random() < (cfg->>'bossP')::numeric then
            out := out || jsonb_build_array(public.loot_item(c, public.loot_pick(cfg->kind)#>>'{}', 1, null, coalesce((x->'monster'->>'lv')::int, 1)));
        end if;
    end loop;
    return out;
end $$;
revoke all on function public.loot_merc_rune(jsonb, jsonb) from public, anon, authenticated;
