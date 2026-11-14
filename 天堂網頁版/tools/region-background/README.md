# 分區背景圖

遊戲直接顯示預先合成的無損 WebP 底圖，移動時用 CSS 移動圖片。原始通行資料、角色座標和怪物資料保留。

每區 1024×1024 原始像素。建築室內版本由原始事件格的實際隱藏組合產生；人物和怪物前景遮擋按區域打包。地圖索引、區域遮擋資料分開載入，避免一開始下載整片大陸的事件資料。

建置需要 `@napi-rs/canvas`、`sharp`，可透過 `NODE_PATH` 指到已安裝的 Node 套件目錄。

```powershell
node --expose-gc tools/region-background/build.cjs
node tools/region-background/finalize.cjs
```

指定地圖或只更新遮擋打包：

```powershell
node --expose-gc tools/region-background/build.cjs --reuse-pages 0 4
node tools/region-background/finalize.cjs
```

長時間轉換中斷時，使用 `--resume` 檢查既有圖片並接續建置；已完成的圖片不重畫。建置完整地圖後才執行 `finalize.cjs`，它會拆分區域資料、檢查引用並清除本工具產生的過期圖片。`validate.cjs` 進一步核對全部地圖、圖檔、室內組合和遮擋裁切範圍。

```powershell
node --expose-gc tools/region-background/build.cjs --resume 4
node tools/region-background/finalize.cjs
node tools/region-background/validate.cjs
```

產物在 `assets/region-background/` 與 `data/region-background-index.js`。完成全部轉換、驗證後，`index.html` 依序載入地圖索引、`region-background.js`、`native-world.js`。新模式不啟動原始地圖繪製 worker，也不下載原始圖集。

```powershell
node --test tools/region-background.test.cjs
```

原始圖集仍保留供建置與核對使用。重新產生底圖後應更新 `index.html` 的版本參數。
