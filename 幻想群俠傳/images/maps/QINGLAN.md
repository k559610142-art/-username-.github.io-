# 青嵐平原相鄰場景

檔案：qinglan-plains-v1.png。使用內建 image_gen 依青石鎮地圖作風格與比例參考生成，未使用模擬器封裝素材。

位於青石鎮南方，世界格座標 y=28～55。兩張背景各40×28格，單格32px，以同一世界座標連接；入口 x=18～21、y=26～29 可連續步行通過。現有美術在接縫處可能仍有少量地表差異，邏輯與鏡頭不切換頁面。

data/adventure-map.js 管理相鄰場景、碰撞與區域名稱；data/camera.js 管理跟隨鏡頭及畫面點選到世界座標的換算。村鎮、平原共用同一移動角色。

目前可步行往返、點地面尋路、查看小地圖與區域狀態。野外怪物、採集、營地互動尚未加入；角色存檔目前仍只保存角色數值，不保存場景座標。

生成提示詞：

Use case: stylized-concept. Actual seamless neighboring outdoor map background for a detailed classic Chinese fantasy 2D MMORPG. Image1 is the already built village map to the NORTH; generate a NEW outdoor PLAINS map immediately SOUTH of that village, SAME near-top-down elevated orthographic camera, same scale of trees and stones, same realistic painted pre-rendered style, landscape ratio10:7, full-bleed scene. No people, enemies, labels, UI, text, borders, grid or watermark.
Layout for play: a weathered stone/dirt road enters at exact TOP CENTER x45%-55%, continuous from the village gate, runs south through the middle to BOTTOM CENTER. Mostly open verdant grassland with detailed grass and little flowers, shallow rolling texture with no horizon. A vertical blue river occupies far RIGHT x82.5%-92.5%, continuing the village river from top to bottom, keep banks rocky and unwalkable. Central road bends only slightly inside x43%-57%. A horizontal trail at y45%-53% crosses from x10%-80% and meets the main road. Dense trees and boulders confined to outermost LEFT 10%, outermost RIGHT beyondriver, and scattered isolated props in non-road grassy pockets. A small abandoned stone watchtower ruin inside x12%-25%, y22%-37%, and a modest camp with two tents inside x60%-75%, y60%-76%. Keep a large clear meadow x28%-70%,y10%-90% suitable for walking and fighting. NO giant objects on the central road, no roads leading into river. Natural warm morning light and detailed shadows matching village. Rich fine ground texture, no isometric floating island or overview painting, this must be a game ground-plane background that a character can walk across.
