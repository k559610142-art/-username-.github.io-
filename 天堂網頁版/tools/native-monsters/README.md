# 地監怪物

```
node tools/native-monsters/build.js
```

- 讀 `data/native-dungeon-maps.js` 列出的地圖，從 DB `spawnlist` 產生生怪資料。
- 現有 `island-monster-data.js` 沒有的怪物外觀，從 `C:/Users/User/Desktop/天地劫天堂` 的 `Sprite*.pak` 切圖，動作與時間照 `Text.pak` 的 `list.spr`。
- 輸出 `assets/native-monsters/dungeon-mob-*.png` 與 `data/dungeon-monster-data.js`（重跑會覆蓋舊的 dungeon-mob 圖）。
- `--check`：拿 Map 0／4 既有怪物比對切圖結果。
- 新增地監地圖（`tools/native-map/build.js`）後要再跑一次，並換 `index.html` 的 `dungeon-monster-data.js?v=`。
