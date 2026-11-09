# 輕量底圖產生工具（assets/native-world/lite）

進地圖時，原始地圖要下載 30～70 張圖集（13～28 MB）才畫得出來。
`lite/<地圖>/page_YY_XX.webp` 是「地面＋前景」先合成、縮成一半（1536×768）的底圖，
每張約 150 KB，和原始 SEG/S32/TIL 用同一個像素座標，載入期間先蓋在畫面上（`data/native-world.js` 的 `paintImmediate`）。

## 重新產生（換了地圖分頁圖才需要）

1. 終端機：`node tools/lite-pages/recv.js assets/native-world/lite`（開在 127.0.0.1:8799 接收檔案）
2. 用本機伺服器開遊戲（`.claude/launch.json` 的 lineage-web），在 Console 貼上 `browser-snippet.js` 的內容執行。
3. 完成後關掉 recv.js，記得把 `index.html` 裡 `native-world.js?v=` 換新。
