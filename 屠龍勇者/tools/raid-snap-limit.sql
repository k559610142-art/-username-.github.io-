-- 團隊副本「準備」失敗：new row for relation "raid_members" violates check constraint "raid_members_snap_check"（2026-11-11，第 329 節）
-- 原因：準備時上傳的角色快照（整份角色、不含倉庫）限制 < 1MB，但存檔本身上限是 2MB；資料大的角色存得了卻準備不了。
-- 修正：快照上限改成和存檔一樣 2MB（快照是存檔的一部分，能存檔的角色一定放得下）。不刪任何資料，重跑無害。
begin;
alter table public.raid_members drop constraint if exists raid_members_snap_check;
alter table public.raid_members add constraint raid_members_snap_check check (snap is null or pg_column_size(snap) < 2000000);
commit;

-- 確認（應顯示 2000000）：
select pg_get_constraintdef(oid) from pg_constraint where conname = 'raid_members_snap_check';
