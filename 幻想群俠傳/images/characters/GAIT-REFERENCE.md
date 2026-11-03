# 腳步修正 v2：提供檔案對照

來源根目錄：C:/Users/User/Desktop/3.63模擬器改7.6（只讀，未啟動原程式）。

已確認的設定：

- 編碼器/spr_action.sql：spr_id 0、act_id 4 的 framecount=16、framerate=24。
- src/com/lineage/server/ActionCodes.java：ACTION_SwordWalk=4、ACTION_SwordIdle=7。
- src/com/lineage/server/datatables/SprTable.java：calcActionSpeed = frameCount × 40 × (24 / frameRate)，上述記錄為 640 毫秒。
- src/com/lineage/server/clientpackets/AcceleratorChecker.java：MOVE 依角色圖形與武器選擇動作速度；isHaste 時 interval 乘 0.755。

本專案採用這組時序作參考，Shift 加速為 640 × 0.755 = 483.2 毫秒。現有地圖斜向移動為維持等世界距離速度而乘 sqrt(2)，這是本專案的選擇，不宣稱等同原客戶端。

16 是來源設定的時間單位數，並不表示本專案已有 16 張獨立步態圖。新圖仍為每方向 4 個姿勢，對應到 16 格時序；落腳姿勢略長，過腿姿勢略短。原客戶端 SPR 的影格位移與圖形尚未解碼，未假稱已匯入原生動作。

這次修正：

- 重製明顯左右交替、膝蓋彎曲的步態，改為較短衣襬，以露出腿與靴子。
- 取消人工整個人物上下浮動。
- 同列使用共同地面線與固定比例；抬腳影格不再強制最低像素貼地。
- 以透明間隙量測來源列分界，避免平均切圖截斷鞋底。
- 水平定位參考軀幹，避免衣襬寬窄改變人物中心。

新版圖：swordsman-walk-v2.png；由內建 image_gen 依既有人物圖生成，不是原模擬器人物美術。

生成提示詞：

Use case: identity-preserve. Generate a replacement game walk-cycle sprite sheet, same ivory/teal swordsman as reference, transparent background. Exactly FOUR columns by EIGHT rows, equal cells, no text. Critically this must be a REAL WALKING CYCLE with OBVIOUSLY DIFFERENT ALTERNATING LEG POSES, not 4 copies of an idle portrait. Shorten lower robe to below knees so boots and both legs are clearly visible. Keep character identity, ponytail and ivory teal costume, sword sheathed on hip so both arms counter-swing freely. Small detailed classic MMORPG sprites, elevated orthographic game camera. Row directions south, southwest, west, northwest, north, northeast, east, southeast.
Column 1: LEFT boot firmly planted forward, RIGHT leg extended backwards with heel lifted, legs visibly separated.
Column 2: LEFT leg bears weight under torso, RIGHT knee bends and swings forward, right boot clearly off ground.
Column 3: RIGHT boot firmly planted forward, LEFT leg extended backwards heel lifted; opposite arms to column1.
Column 4: RIGHT leg bears weight under torso, LEFT knee bends and swings forward, left boot clearly off ground.
Walking feet must cover a broad stride, visible boot soles in rear poses. No floating flying stance. Consistent head height and scale, SAME hips horizontal registration for every column in a row. Feet ground baseline 92% cell height. Each complete figure fits strictly inside its cell with clear padding. Exactly 32 full-body figures. No ground shadows, no glow, no scenery, no grid lines, no labels. Transparent background. Actual production walk animation assets, visibly bent knees and leg motion.
