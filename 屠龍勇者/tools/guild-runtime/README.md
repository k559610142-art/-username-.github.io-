# 公會正式接入候選核心

日期：2026-11-01。core.cjs已同源複製為data/guild-core.js接入正式名冊／編隊；world與sync仍為候選模組，任務及發獎尚未正式開放。

## 模組

- core.cjs：12職業初始三人、名冊／療養、三人選派、角色與帳號綁定、首次離線角色認領、任務憑證、暫停後驗證恢復、離場清除契約、32筆待交佇列與連續序號收據。12任務／7活動目前是目錄，不是12張已做完的可玩地圖。
- world.cjs：256×256等大型安全站立格、8向不切角、搜尋預算、32格探索分塊往返與可見塊清單；GuildAssetCache做載入去重、引用保護與LRU／容量限制。輸入mask必須先經美術碰撞標定與腳底安全距離退縮，這個模組不代替標定。48MiB是候選快取預設，不是已量測的手機峰值；不保證解碼時峰值等於快取數值。
- sync.cjs：每批最多8筆、單次最多4批、同角色請求合併、斷線與未驗證不清資料、收據錯序拒絕、儲存失敗可重送、帳號／角色切換檢查。load／persistIfCurrent／submit均為adapter介面，尚未連到正式localStorage或RPC。

## 信任邊界

verifyTicket／verifyCheckpoint／verifyReceipt沒有預設通過，缺失、拋錯或回傳Promise均拒絕；目前測試使用明確隔離回呼，不是已實作的密碼學驗證。正式adapter必須接真實伺服器憑證／重播驗證；不能把客戶端完成、摘要hash、試玩JSON或回呼回傳true當成伺服器判定。

core.receipt只映射已驗證的招募與收據序號，不提供本機加金幣／代幣／物品捷徑。服務端仍必須自己維護名冊、任務資格與原子發獎帳本。前端清理資料不是防作弊權威。

persistIfCurrent必須以綁定身份及完整舊公會狀態比較後原子寫入；不能只比較cursor後覆蓋同時更新的探索／在途任務。正式存檔讀寫仍用saveParse／saveEncode，套入player之前按專案規則走guardWrap及既有遷移。使用者已同意schema23→24，正式名冊接線見ARCHITECTURE第262節。

## 驗證

node tools/guild-runtime/test-core.cjs
node tools/guild-runtime/test-world.cjs
node tools/guild-runtime/test-sync.cjs

測試全用記憶體／隔離adapter。world測試的256×256河橋地形是驗證fixture，不是新增已完成遊戲場景；11地標四人1272步通過，不能據此宣稱美術整島每處碰撞已驗好。sync測17筆分3批及儲存失敗重送，不代表正式雲端已收取或發獎。

## 正式接線前置

見../GUILD-INTEGRATION-REVIEW.md。已獲使用者同意player.guild與schema23→24及撰寫新SQL；tools/guild-system.sql已完成隔離測試，由使用者自行執行，正式發獎預設不開。原型IndexedDB資料不直接匯入正式角色。
