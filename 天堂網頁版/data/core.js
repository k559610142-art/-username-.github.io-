// 入口頁啟動後，完成本機選角才能操作場景。
window.gameFlowState='login';
// 共用 DOM 工具與通知計時器。以 index.html 的順序載入傳統腳本，可直接從本機開啟。
const $ = selector => document.querySelector(selector);
let timer;
// 正式移動實作由 scene-renderer.js 接管。
function move() { return false; }
