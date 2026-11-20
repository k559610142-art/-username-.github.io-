-- 天堂網頁版 第 1 期：帳號＋雲端存檔＋密碼提示（2026-11-21）
-- 用法：Supabase 主控台 → SQL Editor → 貼上整份 → Run。可以重複執行（都用 if not exists／create or replace）。
-- 另外要在主控台設定：Authentication → Sign In / Providers → Email → 關掉「Confirm email」（帳號是假信箱，收不到驗證信）。
--
-- 帳號規則：玩家只輸入「帳號名稱」（英文小寫＋數字 4～16 字），遊戲自動轉成 名稱@tianmo.example.com 這個假信箱登入 Supabase。
--   example.com 是保留網域，沒有人能收這個網域的信，所以就算有人呼叫「寄重設密碼信」也收不到，不會被盜帳號。
-- 密碼提示：註冊時玩家自己寫的一句話（公開，輸入帳號就看得到），存在 tm_accounts.hint。
-- 存檔：tm_saves 一個帳號一筆（4 個角色欄位＋倉庫），revision 防止兩台裝置互相覆蓋。

-- ── 帳號 ──
create table if not exists public.tm_accounts(
  user_id uuid primary key references auth.users(id) on delete cascade,
  name text not null unique check (name ~ '^[a-z0-9]{4,16}$'),
  hint text not null default '' check (char_length(hint) <= 60),
  created_at timestamptz not null default now(),
  last_login timestamptz
);
alter table public.tm_accounts enable row level security;
drop policy if exists tm_accounts_own on public.tm_accounts;
create policy tm_accounts_own on public.tm_accounts for select using (user_id = auth.uid());

-- 註冊時（auth.users 新增一筆）自動建立 tm_accounts：名稱取自假信箱 @ 前面，提示取自 signUp 的 options.data.hint。
-- 只處理 @tianmo.example.com 的帳號，同專案其他用途的帳號不受影響。
create or replace function public.tm_on_signup() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if new.email like '%@tianmo.example.com' then
    insert into public.tm_accounts(user_id, name, hint)
    values (new.id, split_part(new.email, '@', 1), left(coalesce(new.raw_user_meta_data->>'hint', ''), 60));
  end if;
  return new;
end $$;
drop trigger if exists tm_on_signup on auth.users;
create trigger tm_on_signup after insert on auth.users for each row execute function public.tm_on_signup();

-- 帳號名稱可不可以用（註冊畫面即時檢查；沒登入也能呼叫）
create or replace function public.tm_name_free(p_name text) returns boolean
language sql stable security definer set search_path = public as $$
  select p_name ~ '^[a-z0-9]{4,16}$' and not exists(select 1 from public.tm_accounts where name = p_name);
$$;

-- 忘記密碼：輸入帳號 → 回傳玩家自己寫的提示（沒有這個帳號回傳 null）
create or replace function public.tm_password_hint(p_name text) returns text
language sql stable security definer set search_path = public as $$
  select hint from public.tm_accounts where name = lower(trim(p_name));
$$;

-- ── 存檔 ──
create table if not exists public.tm_saves(
  user_id uuid primary key references auth.users(id) on delete cascade,
  revision bigint not null default 0,
  payload jsonb not null,
  updated_at timestamptz not null default now()
);
alter table public.tm_saves enable row level security;
drop policy if exists tm_saves_own on public.tm_saves;
create policy tm_saves_own on public.tm_saves for select using (user_id = auth.uid());
-- 不開 insert／update 權限：一律走 tm_save()，才檢查得到 revision 與格式。

-- 登入後讀存檔：{revision, payload}；還沒有存檔回傳 revision 0、payload null。同時記錄最後登入時間。
create or replace function public.tm_load() returns jsonb
language plpgsql security definer set search_path = public as $$
declare r public.tm_saves;
begin
  if auth.uid() is null then raise exception 'TM_AUTH'; end if;
  update public.tm_accounts set last_login = now() where user_id = auth.uid();
  select * into r from public.tm_saves where user_id = auth.uid();
  if not found then return jsonb_build_object('revision', 0, 'payload', null); end if;
  return jsonb_build_object('revision', r.revision, 'payload', r.payload);
end $$;

-- 上傳存檔：p_revision 必須等於雲端目前的 revision（別台裝置先存過就回 TM_CONFLICT，遊戲會重新讀雲端）。
-- 回傳新的 revision。格式：{characters: 長度 4 的陣列, warehouse: 陣列}，大小上限 2 MB。
create or replace function public.tm_save(p_revision bigint, p_payload jsonb) returns bigint
language plpgsql security definer set search_path = public as $$
declare v_rev bigint;
begin
  if auth.uid() is null then raise exception 'TM_AUTH'; end if;
  if not exists(select 1 from public.tm_accounts where user_id = auth.uid()) then raise exception 'TM_AUTH'; end if;
  if jsonb_typeof(p_payload->'characters') <> 'array' or jsonb_array_length(p_payload->'characters') <> 4
     or jsonb_typeof(p_payload->'warehouse') <> 'array' then raise exception 'TM_FORMAT'; end if;
  if pg_column_size(p_payload) > 2000000 then raise exception 'TM_TOO_LARGE'; end if;
  if p_revision = 0 then
    insert into public.tm_saves(user_id, revision, payload) values (auth.uid(), 1, p_payload)
    on conflict (user_id) do nothing returning revision into v_rev;
  else
    update public.tm_saves set revision = revision + 1, payload = p_payload, updated_at = now()
    where user_id = auth.uid() and revision = p_revision returning revision into v_rev;
  end if;
  if v_rev is null then raise exception 'TM_CONFLICT'; end if;
  return v_rev;
end $$;

-- 權限：提示、名稱檢查不用登入；讀寫存檔要登入
revoke all on function public.tm_name_free(text), public.tm_password_hint(text), public.tm_load(), public.tm_save(bigint, jsonb) from public;
grant execute on function public.tm_name_free(text), public.tm_password_hint(text) to anon, authenticated;
grant execute on function public.tm_load(), public.tm_save(bigint, jsonb) to authenticated;
revoke all on function public.tm_on_signup() from public, anon, authenticated;
