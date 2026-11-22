# 地監怪物

```
node tools/native-monsters/build.js
```

- 讀 `data/native-dungeon-maps.js` 列出的地圖，從 DB `spawnlist` 產生生怪資料。
- 現有 `island-monster-data.js` 沒有的怪物外觀，從 `C:/Users/User/Desktop/天地劫天堂` 的 `Sprite*.pak` 切圖，動作與時間照 `Text.pak` 的 `list.spr`。
- 輸出 `assets/native-monsters/dungeon-mob-*.png` 與 `data/dungeon-monster-data.js`（重跑會覆蓋舊的 dungeon-mob 圖）。
- `--check`：拿 Map 0／4 既有怪物比對切圖結果。
- 新增地監地圖（`tools/native-map/build.js`）後要再跑一次，並換 `index.html` 的 `dungeon-monster-data.js?v=`。

## list.spr 沒登錄的新外觀（2026-11-22 新遺忘之島）

```
node tools/native-monsters/preview-groups.js <輸出資料夾> 14043,14040 [--dir 5]   # 每組畫一列，人工辨認動作
node tools/native-monsters/custom-looks.js                                        # 依 custom-actions.json 切圖
```

- `custom-actions.json`：每個外觀的 idle／walk／attack／cast／special／death 各是第幾組（檔名 `<gfx>-<組*8+方向>.spr`），`ms` 是整段動畫長度（照舊版同名怪物）。
- 輸出 `assets/native-monsters/custom-mob-*.png` 與 `data/custom-monster-frames.js`（index.html 接在 dungeon-monster-data.js 後面，覆蓋 build.js 退回的同名舊外觀）。重跑 build.js 不會動到這些檔。
