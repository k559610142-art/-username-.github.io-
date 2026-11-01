# 傭兵公會 SQL 安裝（2026-11-01）

這是schema24的公會基礎，不是完整任務／發獎部署。使用者已同意撰寫，由使用者自行在Supabase SQL Editor執行同資料夾的guild-system.sql；AI未連正式資料庫執行。

依賴既有dragon_saves、auth.uid()、dragon_is_banned()、dragon_save_ok(uuid,int)。請先保留正式資料庫備份，再按現有專案方式貼入執行。可重跑，既有名冊與設定不重置。

預設enabled=false。只有guild_status、guild_register、guild_submit、guild_receipts四個登入RPC；禁止authenticated直接操作公會資料表，沒有用戶端發獎／核准驗證的RPC。submit只排pending，不信任report中的成功、hash或時長。真正固定規則重播驗證、發獎政策、憑證核發與任務場景尚待後續部署；現在不要自行打開enabled。

正式版目前可以保存初始三人與編隊、從村莊接待員或左側選單進入公會；任務路線維持整備狀態。試玩IndexedDB成果不匯入正式角色。
