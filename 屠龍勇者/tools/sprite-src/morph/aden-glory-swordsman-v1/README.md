# 亞丁榮耀劍士（藍變）

使用者提供15.jpg與15-1／15-2／15-3.jfif，原稿完整保存。
以內建image_gen依參考製作正面／右側／背面各12格，另修正完整劍尖、羽飾與動作間留白。
prompts.json保存三方向完整生成提示詞；*-generated.png為初稿、*-repaired.png為修正稿，原圖不覆寫。

prepare.py沿既有RGBA打包與腳底註冊流程輸出walk4／attack4／cast2／hit2三向圖集，左向由引擎鏡射。
格384×320、foot192／270、charH160、drawH48，圖集、36格單圖、manifest與audit保留來源對照。
preview.py產生四方向動作預覽。

接既有m15與變身卷軸，維持Lv15、單手劍系原能力與武器限制、一張30分鐘、32種變身總數；不改存檔與SQL。
僅原生canvas與隔離VM測試，不啟動或關閉瀏覽器。
