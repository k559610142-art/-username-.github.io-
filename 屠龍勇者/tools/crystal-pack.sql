-- 黑暗大陸：鑽石商人「魔法結晶包（10小時）」（2026-11-03，ARCHITECTURE.md 第 292 節）。接在 doll-shop.sql 之後執行，可重跑。
-- 50 鑽石換 1000 個魔法結晶，放進帳號共用倉庫（沿用 vault_take2 取出）。訂單另外記在 dragon_crystal_pack_orders，不算進「伺服器育養員」稱號（那個只看娃娃訂單）。
begin;
create table if not exists public.dragon_crystal_pack_orders (
 user_id uuid not null references auth.users(id) on delete cascade, request_id uuid not null,
 price int not null check(price>0), qty int not null check(qty>0), vault_id bigint not null, at timestamptz not null default now(),
 primary key(user_id,request_id)
);
alter table public.dragon_crystal_pack_orders enable row level security;
revoke all on public.dragon_crystal_pack_orders from public,anon,authenticated;
create or replace function public.crystal_pack_buy(p_price int,p_request uuid) returns jsonb
language plpgsql security definer set search_path='' as $$
declare u uuid:=auth.uid(); prior public.dragon_crystal_pack_orders; balance int; ident bigint; used int;
 c_price constant int:=50; c_qty constant int:=1000;
begin
 if u is null then raise exception 'not logged in'; end if;
 if coalesce(public.dragon_is_banned(),false) then raise exception 'banned'; end if;
 if p_request is null then raise exception 'bad request'; end if;
 perform pg_advisory_xact_lock(7713100,hashtext(u::text));
 select * into prior from public.dragon_crystal_pack_orders where user_id=u and request_id=p_request;
 if found then
  return jsonb_build_object('ok',true,'qty',prior.qty,'vaultId',prior.vault_id,'diamonds',coalesce((select diamonds from public.dragon_wallet where user_id=u),0));
 end if;
 if p_price is distinct from c_price then raise exception 'price changed'; end if;
 select count(*) into used from public.dragon_vault_items where user_id=u and taken_at is null;
 if used>=200 then raise exception 'vault full'; end if;
 insert into public.dragon_wallet(user_id) values(u) on conflict do nothing;
 select diamonds into balance from public.dragon_wallet where user_id=u for update;
 if balance<c_price then raise exception 'not enough diamonds'; end if;
 update public.dragon_wallet set diamonds=diamonds-c_price,updated_at=now() where user_id=u returning diamonds into balance;
 insert into public.dragon_vault_items(user_id,from_slot,uid,item_id,item,name)
  values(u,-1,0,'magicCrystal',jsonb_build_object('id','magicCrystal','n',c_qty),'魔法結晶') returning id into ident;
 insert into public.dragon_crystal_pack_orders(user_id,request_id,price,qty,vault_id) values(u,p_request,c_price,c_qty,ident);
 insert into public.dragon_dia_log(user_id,delta,reason) values(u,-c_price,'鑽石商人：魔法結晶包×'||c_qty||' #'||p_request::text);
 return jsonb_build_object('ok',true,'qty',c_qty,'vaultId',ident,'diamonds',balance);
end $$;
revoke execute on function public.crystal_pack_buy(int,uuid) from public,anon,authenticated;
grant execute on function public.crystal_pack_buy(int,uuid) to authenticated;
commit;
