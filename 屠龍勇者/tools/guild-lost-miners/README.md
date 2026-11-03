# 失聯採礦隊部署與驗收

本機版本20261104e。使用者已同意新增獨立SQL，未執行正式資料庫、未部署函式、未推送。

## 先試玩

http://localhost:8790/tools/guild-integration-preview.html?lost-miners=1

這頁載正式遊戲腳本，存檔僅在記憶體、禁止連外；憑證／收據為明示fixture，不是真正獎勵。公會「接取並出發」後自行走港村→中央古林→礦坑，調查作業廣場，再進內部。點敵人名牌集火，點礦工名牌或救援按鈕，停止三秒且不受擊才完成。三名礦工全救出、巨怪擊倒後，等礦工跟上再逐出口撤離，至少兩人到港村公會門前報到。旁邊測試工具可載入由同一模擬完整重播得到的礦坑／返程中途紀錄，加速驗收；不會匯入正式帳號。

## 正式安裝（由使用者操作）

1. 若尚未裝過公會基礎，先在Supabase SQL Editor執行`tools/guild-system.sql`。不必開該檔的整體任務開關。
2. 執行新增的`tools/guild-lost-miners.sql`，預設本任務關閉。重跑保留進度／帳本。
3. Supabase → Edge Functions → 新增函式，名稱必須是`guild-lost-miners`。把本目錄`deploy.ts`完整內容貼入編輯器後部署，保留JWT驗證。它是包含正式模擬與實際四張通行圖的單檔，不需要另傳simulation.mjs。平台內建環境變數`SUPABASE_URL`／`SUPABASE_ANON_KEY`／`SUPABASE_SERVICE_ROLE_KEY`只在伺服器讀取，勿把服務金鑰放到遊戲。
4. 實玩與本機檢查通過後，再於SQL Editor執行：

```sql
update public.dragon_guild_lost_config set enabled=true where id=1;
```

5. 登入正式角色，等待原本雲端角色同步，再到公會保存三人編隊、接取任務。完成後按「交付採礦隊成果」。首次每週100聲望／10代幣／20徽章；三人生還且夥伴未曾倒地，代幣12。重打無聲望，代幣2（完美3）／徽章5。公會「查看公會公告」可讀伺服器公會餘額；帳本在獨立`dragon_guild_lost_wallet`，尚未接公會商店或培養消費。金幣／道具不在本機補發。

停發新票：把enabled改false；既有合法成果仍可交付。完整停止驗證需停用Edge Function，已保存成果應保留。

## 驗證與界線

- `node tools/test-guild-mission.cjs`：正式地圖四景往返、三人救援護送、巨怪實戰、返程交付、超時／篡改／救援中斷、固定100ms重播。
- `node tools/test-guild-mission-ui.cjs`：正式index、加密暫停續玩、待交付與收據、財物保留、退出回收。
- `node tools/test-guild-lost-db.cjs`：隔離PGlite，SQL重跑、身份／隊伍／療養、服務角色權限、冪等與帳本、重打25%、取消。
- `node tools/test-guild-verifier.mjs`：實際Edge handler與共用模擬；只mock網路與環境，無正式金鑰。重新產生：`node tools/prepare-guild-verifier.cjs`。

使用伺服器票據的種子與隊伍，在Edge Function重播移動、出口、戰鬥、救援、護送與交付；不採信客戶端success／獎勵。一次最多7200個100ms步長、10000指令、每步最多4指令、最多200萬尋路節點、512KiB輸入；同票驗證每10秒一次，資料庫只做有界原子帳本。票據有效7日，已完成成果有72小時交付寬限；同票同hash重送返回原收據，不重發。

這驗證的是可重播策略結果，不能證明真人逐秒操作。普通首關使用獨立戰術HP／傷害與三類隊伍職能，未改正式角色能力、裝備或技能；裝備壓制／四難度／養成與其他任務尚未接入。礦工暫沿用既有原創人型圖集，巨怪沿用原創獸兵放大模型，未新增專屬動畫。任務紀錄保存在綁帳號／角色／票據的加密本機key，換裝置需回原裝置取得完整紀錄；雲端只同步既有憑證與待交付索引。

本機量測：2791步完整重播約142ms、602133尋路節點；16組四景路徑與原八向BFS逐字一致。這不是正式Edge平台的效能保證，部署後仍需實測第一筆真實憑證與交付。
