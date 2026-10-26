# 荒野血狼狂戰（m25）

使用者提供的25.jpg、25-1.jfif、25-2.jfif、25-3.jfif完整原樣保留。
內建image_gen依prompts.json三向提示詞生成down/right/up-generated.png，使用真透明alpha。
prepare.py只做現有精靈流程的來源格裁切、連通區隔離、腳點註冊與縮放打包，不重繪角色。
三向來源列邊界352／684像素，保留走路腳底；registration.json與audit.json記錄每格來源。

成品：images/sprites/morph/wild-blood-wolf-v1/，四張動作圖集及36張獨立RGBA格。
preview.py輸出四向動作GIF；render.js以原生Canvas實際執行遊戲sceneDraw並輸出game-render.png。
左向沿引擎鏡射右向；維持m25原能力、卷軸價格與時效，無新增存檔欄位。
