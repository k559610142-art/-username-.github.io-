# 傭兵公會正式接入審閱（2026-11-01）

狀態：使用者2026-11-01明確同意「存檔升級與撰寫獨立 SQL」。本機20261101e／SAVE_SCHEMA24已接名冊、三人編隊與村莊入口；獨立SQL已隔離測試，未執行正式庫、未提交／發布。任務場景與可信驗證／發獎仍待接線。

## 本次已獲同意的範圍與未包含事項

1. SAVE_SCHEMA由23升至24，僅新增player.guild；新角色建立及migrateSave補入公會資料。既有裝備、金幣、個人傭兵、娃娃、二轉及天賦不重置。
2. 允許另寫新的tools/guild-system.sql與安裝說明，建立獨立公會憑證／成果／領取帳本及RPC；不修改現有Supabase設定、不執行正式SQL。寫完測試後由使用者貼到Supabase。
3. 不包含同意獎勵數值、週重置／跨週寬限、付費部署或直接啟用正式發獎；這些仍須具體定案。上線開關預設關閉，不能回退到本機直接發獎。

## player.guild確切資料範圍

預計物件：{ v:1, ownerId, characterId, baseClass, members, squad, recruitProgress, explored, activeTicket, outbox, serverCursor, settled }。

- characterId沿現有cloudCharId的created|cls格式，ownerId以原存檔外層owner核對，不以角色名稱或欄位號當身份；首次離線角色綁帳走獨立認領，不允許任意換帳。
- baseClass只記首次初始化的基礎職業。初始三位依已確認12職業互補表；二轉不換人。
- members保存NPC ID、招募紀錄、療養真實期限；squad固定三名不重複且可出戰者。與player.mercenary完全獨立。
- recruitProgress只保存公會招募任務進度；正式解鎖依核准任務／驗證收據，不把試玩六職全開匯入。
- explored保存地圖版本與有界分塊探索位元，不把整張圖片、NPC場景座標或特效塞進角色存檔。
- activeTicket僅任務憑證／隊伍快照與必要恢復資訊；離任務必清位置、仇恨、指令、召喚物及暫時能力，夥伴不出現在野外。
- outbox保存有界待驗證成果索引／憑證；大量重播資料放隔離且綁角色的本機紀錄庫，不擠滿角色雲端存檔。成功、重複、拒絕與斷線重送分別處理，不丟合法未結算成果。
- serverCursor僅伺服器已確認收據序號，settled保留最近32筆已驗證處理摘要供重複／拒絕顯示。聲望／代幣／可交易獎品不能因改本機欄位而視為已入帳。

## 遷移與回復

舊角色只補公會空狀態及初始名冊；正規化去重、校驗角色與職業、拒絕無效NPC及超限資料。既有試玩IndexedDB不自動匯入正式角色，避免假成果成為正式獎勵。後續發布時正式JS一併換新版本，實玩通過才commit，由使用者Push origin。

## 預計接入位置

新增獨立公會資料／規則模組，依ARCHITECTURE載入依賴插入；createPlayer與migrateSave只增加初始化／正規化呼叫；村莊設獨立公會入口，與既有個人傭兵團長分開。公會任務場景與現有野外掛機互斥，退出必還原原村莊狀態。原型不得直接讀寫正式player或給正式掉寶。

## 正在準備的可審閱程式

先在tools/guild-runtime寫可測的角色綁定、初始名冊、三人選派、療養、任務憑證、待交付佇列及冪等收據核心。未獲上述確認前，不改data/config.js、data/player.js、data/save.js或tools/*.sql。獲確認後才移入正式載入並接線，所有步驟仍須測試及實玩驗收。
