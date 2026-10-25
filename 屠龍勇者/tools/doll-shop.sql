-- 娃娃商店：使用者同意新增；由使用者貼到Supabase執行，可重跑。
-- 先有vault.sql／vault-v2.sql與dragon_is_admin。一般玩家僅能查看，購買限定GM。
-- 娃娃直接放共用倉庫，沿既有vault_take2取出，不修改雲端角色／既有掉寶目錄。
begin;
create table if not exists public.dragon_doll_shop_catalog (
 id text primary key, name text not null, quality text not null, price int not null default 500 check(price>0), enabled boolean not null default true
);
insert into public.dragon_doll_shop_catalog(id,name,quality) values
('doll_skeleton-knight','骷髏小騎士','T4'),
('doll_frost-dragon','冰霜幼龍','T2'),
('doll_forest-sprite','森林小精靈','T3'),
('doll_lava-hound','熔岩魔犬','T3'),
('doll_forest-deer','森靈幼鹿','T4'),
('doll_star-fox','星辰靈狐','T3'),
('doll_mushroom-rabbit','蘑菇燈兔','T4'),
('doll_tidal-dragon','潮汐幼龍','T3'),
('doll_snow-owl','霜羽貓頭鷹','T4'),
('doll_flower-rabbit','花翼仙兔','T2'),
('doll_steam-squirrel','蒸氣松鼠','T4'),
('doll_golden-griffin','黃金獅鷲','T2'),
('doll_crystal-turtle','紫晶靈龜','T2'),
('doll_white-tiger','白虎','T1'),
('doll_azure-dragon','青龍','T1'),
('doll_vermillion-bird','朱雀','T1'),
('doll_golden-dragon','金龍','T0'),
('doll_phoenix','鳳凰','T0'),
('doll_black-tortoise','玄武','T1'),
('doll_qilin','麒麟','T0'),
('doll_little-demon','饕餮','T0')
on conflict(id) do update set name=excluded.name,quality=excluded.quality;
create table if not exists public.dragon_doll_shop_orders (
 user_id uuid not null references auth.users(id) on delete cascade, request_id uuid not null,
 item_id text not null, price int not null check(price>0), vault_id bigint not null, at timestamptz not null default now(),
 primary key(user_id,request_id)
);
alter table public.dragon_doll_shop_catalog enable row level security;
alter table public.dragon_doll_shop_orders enable row level security;
revoke all on public.dragon_doll_shop_catalog,public.dragon_doll_shop_orders from public,anon,authenticated;
create or replace function public.doll_shop_status() returns jsonb
language sql stable security definer set search_path='' as $$
 select jsonb_build_object('canBuy',case when auth.uid() is not null then coalesce(public.dragon_is_admin(),false) else false end,
  'diamonds',coalesce((select diamonds from public.dragon_wallet where user_id=auth.uid()),0),
  'items',coalesce((select jsonb_agg(jsonb_build_object('id',id,'name',name,'quality',quality,'price',price) order by quality,id)
   from public.dragon_doll_shop_catalog where enabled),'[]'::jsonb));
$$;
create or replace function public.doll_shop_buy(p_item text,p_price int,p_request uuid) returns jsonb
language plpgsql security definer set search_path='' as $$
declare u uuid:=auth.uid(); product public.dragon_doll_shop_catalog; prior public.dragon_doll_shop_orders;
 balance int; ident bigint; used int;
begin
 if u is null or not coalesce(public.dragon_is_admin(),false) then raise exception 'not admin'; end if;
 if p_request is null then raise exception 'bad request'; end if;
 perform pg_advisory_xact_lock(7713100,hashtext(u::text));
 select * into prior from public.dragon_doll_shop_orders where user_id=u and request_id=p_request;
 if found then
  if prior.item_id is distinct from p_item or prior.price is distinct from p_price then raise exception 'request mismatch'; end if;
  return jsonb_build_object('ok',true,'name',(select name from public.dragon_doll_shop_catalog where id=prior.item_id),
   'item',prior.item_id,'vaultId',prior.vault_id,'diamonds',coalesce((select diamonds from public.dragon_wallet where user_id=u),0));
 end if;
 select * into product from public.dragon_doll_shop_catalog where id=p_item and enabled for share;
 if not found then raise exception 'unknown doll'; end if;
 if p_price is distinct from product.price then raise exception 'price changed'; end if;
 select count(*) into used from public.dragon_vault_items where user_id=u and taken_at is null;
 if used>=200 then raise exception 'vault full'; end if;
 insert into public.dragon_wallet(user_id) values(u) on conflict do nothing;
 select diamonds into balance from public.dragon_wallet where user_id=u for update;
 if balance<product.price then raise exception 'not enough diamonds'; end if;
 update public.dragon_wallet set diamonds=diamonds-product.price,updated_at=now() where user_id=u returning diamonds into balance;
 insert into public.dragon_vault_items(user_id,from_slot,uid,item_id,item,name)
  values(u,-1,0,product.id,jsonb_build_object('id',product.id,'n',1,'ench',0),product.name) returning id into ident;
 insert into public.dragon_doll_shop_orders(user_id,request_id,item_id,price,vault_id) values(u,p_request,product.id,product.price,ident);
 insert into public.dragon_dia_log(user_id,delta,reason) values(u,-product.price,'娃娃商店：'||product.name||' #'||p_request::text);
 return jsonb_build_object('ok',true,'name',product.name,'item',product.id,'vaultId',ident,'diamonds',balance);
end $$;
revoke execute on function public.doll_shop_status(),public.doll_shop_buy(text,int,uuid) from public,anon,authenticated;
grant execute on function public.doll_shop_status() to anon,authenticated;
grant execute on function public.doll_shop_buy(text,int,uuid) to authenticated;
commit;
