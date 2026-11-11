# 原始地圖轉換（地監、室內）

```
node tools/native-map/build.js 1 2 7 8
```

- 讀 `C:/Users/User/Desktop/天地劫天堂/map/<id>/*.s32` 與 `Tile.pak`，寫入 `assets/native-world/<id>/`、`atlas64/p-N.png`、`manifest-atlas64.json`。
- 讀 `C:/Users/User/Desktop/天地劫天堂(核心)/maps/<id>.txt` 與 DB（`data/database`）產生 `data/native-dungeon-maps.js`。
- 可用 `--client`、`--core` 指定其他路徑。Map 0／4 不能用這個工具重轉。
- 已轉過的地圖可以重轉，圖塊編號不變；新圖塊一律接在最後一頁之後。
- 新地圖只有 fetch 用的 `.json`／`.png`，沒有 `file://` 用的 `.js` 副本，所以地監要用本機伺服器或網站開。
- 轉完記得換 `index.html` 裡 `native-dungeon-maps.js?v=`（`NATIVE_DUNGEON_MAPS_VERSION` 會自動跟著變，用來更新 manifest 快取）。
