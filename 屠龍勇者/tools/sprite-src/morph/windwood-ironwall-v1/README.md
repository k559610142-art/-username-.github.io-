# 風木鐵壁重裝兵（m28藍變）

四張使用者參考原稿完整保存；28-2與28-3均為背面參考。內建image_gen產生三方向各12格，提示詞見prompts.json與repair-prompts.json；*-initial.png保留初稿，*-generated.png為所選生成稿。
右背聚氣第10格沒有完整武器，未採用；第二格聚氣選用初稿第9格完整錘盾分鏡，來源記錄於registration.json／audit.json。僅裁切／腳底註冊／圖集打包，未手工補畫。

prepare.py與preview.py以本機bundled Python執行（Pillow、numpy），四動作walk4／attack4／cast2／hit2，三列down／right／up，left由引擎鏡射；384×320格、foot192／270、身高160、遊戲drawH48。
render.js使用原生Canvas執行正式sceneDraw，game-render.png僅隔離角色，不讀寫存檔／連線或開啟瀏覽器。
既有m28接MORPHS.windwoodIronwall，能力、等級、武器、卷軸與存檔規則不改。
