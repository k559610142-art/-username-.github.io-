-- 黑暗大陸：團隊副本掉寶不受「再打一場／解散隊伍」影響（2026-11-05，ARCHITECTURE.md 第 305 節）。
-- 接在 server-loot.sql 之後執行，可重跑。內容已同步寫進 server-loot.sql／server-loot-install.sql，之後重跑那兩份也不會蓋回舊版。
begin;
-- 團隊副本勝利紀錄（2026-11-05，ARCHITECTURE.md 第 305 節）：開打且勝利時就把「房間＋回合」的結果與參戰角色存下來，
-- 隊長之後按「再打一場」（round+1、result 清空）或解散隊伍（closed），loot_raid 仍以這份紀錄結算上一場，不再回 loot raid not won。
create table if not exists public.dragon_raid_wins(
 room_id uuid not null, round int not null, raid text not null, result jsonb not null, members jsonb not null default '[]'::jsonb,
 at timestamptz not null default now(), primary key(room_id,round));
alter table public.dragon_raid_wins enable row level security;
revoke all on public.dragon_raid_wins from public,anon,authenticated;
create or replace function public.dragon_raid_win_keep() returns trigger language plpgsql security definer set search_path='' as $$
begin
 if new.status in ('fighting','done') and coalesce((new.result->>'win')::boolean,false) then
  insert into public.dragon_raid_wins(room_id,round,raid,result,members)
  values(new.id,new.round,new.raid,new.result,coalesce((select jsonb_agg(jsonb_build_object('uid',m.user_id,'char',m.char_id)) from public.raid_members m where m.room_id=new.id and m.ready_round=new.round),'[]'::jsonb))
  on conflict (room_id,round) do nothing;   -- 第一次寫入為準，之後改 result 也不覆蓋
  if found then delete from public.dragon_raid_wins where at<now()-interval '7 days'; end if;
 end if;
 return new;
end $$;
revoke all on function public.dragon_raid_win_keep() from public,anon,authenticated;
drop trigger if exists raid_rooms_keep_win on public.raid_rooms;
create trigger raid_rooms_keep_win after insert or update on public.raid_rooms for each row execute function public.dragon_raid_win_keep();
-- 安裝前已經打贏、還沒換下一場的房間也補記一筆
insert into public.dragon_raid_wins(room_id,round,raid,result,members)
select r.id,r.round,r.raid,r.result,coalesce((select jsonb_agg(jsonb_build_object('uid',m.user_id,'char',m.char_id)) from public.raid_members m where m.room_id=r.id and m.ready_round=r.round),'[]'::jsonb)
from public.raid_rooms r where r.status in ('fighting','done') and coalesce((r.result->>'win')::boolean,false)
on conflict (room_id,round) do nothing;
create or replace function public.loot_raid(p_slot int,p_char text,p_room uuid,p_round int) returns jsonb language plpgsql security definer set search_path='' as $$
declare p jsonb;r public.raid_rooms;w public.dragon_raid_wins;rid text;res jsonb;def jsonb;c jsonb;ticket uuid;event text:='raid:'||p_room||':'||p_round;begin
 p:=public.loot_player(p_slot,p_char);perform pg_advisory_xact_lock(7713201,hashtext(auth.uid()::text));
 select id into ticket from public.dragon_loot_jobs where user_id=auth.uid() and event_key=event;
 if ticket is not null then return public.loot_finish(ticket);end if;
 -- 先查勝利紀錄（第 305 節）：隊長已開下一場或解散也能結算；沒有紀錄（安裝前的舊房間）才照舊看房間現況
 select * into w from public.dragon_raid_wins where room_id=p_room and round=p_round;
 if w.room_id is not null then
  rid:=w.raid;res:=w.result;
  if not exists(select 1 from jsonb_array_elements(w.members) v where v->>'uid'=auth.uid()::text and v->>'char'=p_char)
   and not exists(select 1 from public.raid_members where room_id=p_room and user_id=auth.uid() and char_id=p_char and ready_round=p_round) then raise exception 'loot raid not member';end if;   -- 紀錄沒記到時再看隊員名單
 else
  select * into r from public.raid_rooms where id=p_room;
  if r.id is null or r.round<>p_round or r.status not in ('fighting','done') or not coalesce((r.result->>'win')::boolean,false) then raise exception 'loot raid not won';end if;
  if not exists(select 1 from public.raid_members where room_id=p_room and user_id=auth.uid() and char_id=p_char and ready_round=p_round) then raise exception 'loot raid not member';end if;
  rid:=r.raid;res:=r.result;
 end if;
 if not coalesce((res->>'win')::boolean,false) then raise exception 'loot raid not won';end if;
 if not exists(select 1 from jsonb_array_elements(res->'members') v where v->>'uid'=auth.uid()::text) then raise exception 'loot raid not member';end if;
 select data into c from public.dragon_loot_catalog catalog where catalog.id=1;def:=c->'raids'->rid;if def is null then raise exception 'loot invalid raid';end if;
 insert into public.dragon_loot_jobs(user_id,slot,char_id,event_key,created_at,context) values(auth.uid(),p_slot,p_char,event,clock_timestamp()-interval '1 second',jsonb_build_object('monster',c->'monsters'->(def->>'boss'),'zone',jsonb_build_object('id',def->>'zone','drops','[]'::jsonb),'player',jsonb_build_object('cls',p->>'cls','quests',jsonb_build_object('active',false),'inv','[]'::jsonb),'rules',c->>'version')) returning dragon_loot_jobs.id into ticket;
 return public.loot_finish(ticket);
end $$;
revoke all on function public.loot_raid(int,text,uuid,int) from public,anon;
grant execute on function public.loot_raid(int,text,uuid,int) to authenticated;
commit;
