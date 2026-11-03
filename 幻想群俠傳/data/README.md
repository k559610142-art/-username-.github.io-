# 幻想群俠傳

直接用瀏覽器開啟上層 index.html 即可遊玩，不需安裝套件。
功能透過 window.Game 共用狀態，使用 defer script 依序載入，支援本機 file://。

- config.js：設定與命名空間。
- world.js：240 個世界分塊、169 個場景與場景連接草案。
- world-ui.js：可點選的世界規劃圖與場景分類；尚未接入角色移動。
- player.js：角色、經驗與升級。
- save.js：本機存讀檔、資料驗證；讀檔返回鎮外。
- battle.js：攻擊、劍訣、勝敗與撤離。
- exploration.js：探索與休息。
- ui.js：畫面與記事。
- main.js：啟動與按鈕事件。
- style.css：畫面樣式。

新增功能請建立獨立 JS，於 index.html 的 main.js 前載入。
存檔位於目前瀏覽器，戰鬥期間無法儲存。既有素材總覽保留於 materials.html。

## 新手村原型

- village-map.js：40 × 28 格青石鎮，房屋、河流、橋樑、NPC、出生點與碰撞。
- village.js：Canvas 程式繪圖、鍵盤／觸控按鈕移動、點地面尋路檢查、鄰近 NPC 交談。
- 目前採固定俯視畫面；點選移動先檢查可達性再直接抵達，尚未加入路徑動畫。
- 村內位置為獨立展示狀態，不寫入角色存檔；室內、野外傳送與商店尚未開放。
- 未使用或解碼外部模擬器素材；地圖由程式繪製。

## 新手村美術 v2

背景改用 images/maps/qingshi-village-v2.png（內建 image_gen 生成），生成提示詞記錄在 images/maps/README.md。村莊碰撞已依圖片重設，支援展開地圖及窄畫面捲動跟隨角色。原程式繪圖保留作圖片載入失敗時的備用畫面；仍需進一步拆分前景遮擋層及精修碰撞邊緣。

## 玩家人物

characters.js 定義初行俠客的美術路徑、顯示高度與腳底錨點。images/characters/swordsman-v1.png 是內建 image_gen 生成的透明 2D 人物圖，已用於村莊玩家與角色展示。移動目前使用單張精靈；尚無八方向素材、走路／攻擊逐格動畫，也不是 3D 模型。生成提示詞存於 images/characters/README.md。

## 八方向移動更新

已加入 movement.js、character-frames.js 及 swordsman-walk-v1.png，取代先前的瞬間移動與單張玩家顯示。
WASD／方向鍵可持續行走及斜向移動，Shift 加速；點地面逐步尋路，點村民走近交談，Esc 停止路徑。手機可按住方向按鈕移動。
八方向各四格走路循環，待機保留朝向；跑步沿用走路循環加快步頻。動作素材與生成提示詞詳見 images/characters/WALK.md。

## 依模擬器設定修正步態 v2

最新生效版本使用 swordsman-walk-v2.png。參考使用者提供的 spr_action.sql、SprTable.java 與 AcceleratorChecker.java，步行每格 640ms，Shift 為 0.755 倍時長；以同一時序驅動位移和姿勢。
修正來源列切割以保留鞋底；地面線同方向固定，保留抬腳高度，不再對每格最低像素貼地，也取消人工上下起伏。來源與改編界線記錄於 images/characters/GAIT-REFERENCE.md，該文件取代前述 v1 步頻設定說明。

## 最新：交替雙腿骨架

人物下半身已改由 character-gait.js 的雙腿關節動畫繪製，取代原動作圖的腿部；每半週期交換支撐腳，支撐腳鎖住地面。此實作取代前述直接輪播整張動作圖的方式。詳見 images/characters/GAIT-RIG.md。

## 最新：完整人物八方向

已移除 character-gait.js 的頁面載入，改用 character-renderer.js 繪製整張人物八方向動作；不再拼接腿部。index.html 加入八方向放大同步預覽。最新說明見 images/characters/EIGHT-DIRECTIONS.md。

## 目前遊戲主畫面與相鄰場景

index.html 主畫面已改為可行走場景、角色狀態、區域標題、行旅目標與小地圖。八方向逐格預覽、世界規劃與獨立戰鬥試玩收在折疊區域。
新增 adventure-map.js（青石鎮與南方青嵐平原）、camera.js（畫面內跟隨鏡頭及點選換算）。地圖40×56格，角色穿過南門可直接往返，不需要按傳送按鈕。
新版人物為 walk-v3 八個獨立方向，每方向8格共64格，沒有方向鏡像替代；北面另以腳位參考重製，原四格及拼接骨架均未載入。素材與生成提示詞位於 images/characters/walk-v3。
驗證：node tools/test-character-animation.mjs 及 node tools/test-adventure-world.mjs。

## 最新：純滑鼠遊戲畫面

index.html 改用 game-screen.css，移除頁首、方向操作列、目標說明及所有開發展示。點地面移動，點村民自動走近對話；右鍵收納停止、調息與存讀檔。場景鋪滿視窗，匕首SVG游標取代十字游標。舊預覽與規劃程式檔仍保留於專案，但不在遊戲入口載入。詳見 data/遊戲畫面說明.md。

## 最新：目標游標與手機觸控

移動使用手指、NPC對話使用泡泡、可攻擊目標使用匕首；目標判斷與點擊處理統一於 interactions.js。手機單指點選、550ms長按選單、拖動與多指取消均有事件測試，並檢查直橫向版面。場景目前無怪物，攻擊游標以可攻擊實體接口與測試驗證。詳見 data/目標游標與觸控.md。
