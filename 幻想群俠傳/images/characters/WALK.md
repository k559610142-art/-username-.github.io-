# 初行俠客移動動作

內建 image_gen 依 swordsman-v1.png 生成 swordsman-walk-v1.png，4 欄 × 8 列，共 32 格。
方向依序為南、西南、西、西北、北、東北、東、東南。每列為 4 格循環走路。
來源框由透明像素範圍量測，存於 data/character-frames.js；每格依中心與腳底定位。

待機保留目前朝向，停止播放走路循環；Shift 跑步共用走路循環並提高步頻及移動速度。尚無獨立跑步、攻擊、受傷動畫。

移動由 data/movement.js 負責：8 方向、斜向等速、防穿角、插值行走、尋路、途中改目標。UI 接線位於 data/village.js。

生成提示詞：

Use case: identity-preserve. Create a production 2D game WALK CYCLE SPRITE SHEET based on the referenced swordsman character. Preserve ivory teal robes, dark ponytail, belt and sword. Transparent background. Exactly 4 columns and 8 rows, 32 distinct small full-body sprites, absolutely regular equal-size rectangular cells, no dividers or text. Every cell contains ONE complete character with generous clear margin and feet aligned to 90% of cell height, same scale and pivot. Elevated orthographic game camera matching classic detailed painted Chinese MMORPG. Row 1 faces south (toward viewer), row2 southwest, row3 west profile, row4 northwest back three-quarter, row5 north (back view), row6 northeast back three-quarter, row7 east profile, row8 southeast. Each row four WALKING animation poses: left foot forward/right arm forward, passing feet center, right foot forward/left arm forward, opposite passing pose. Visible alternating leg movement, arms counter swing, ponytail and robe hems follow motion. Sword stays attached and consistent. Not portraits. Small full-body game sprites with clear silhouette. All 32 sprites equal height approximately 78% of their own cell. Each sprite strictly within its cell; never overlap. No shadows, ground, labels, UI, glow, borders. Transparent empty space everywhere around each individual sprite. Wide landscape sheet overall ratio 1:2 is fine; cells individually square. NO extra images.

## 腳底接地修正

移動速度調整為步行每秒 2.1 格、跑步每秒 3.6 格。走路四格循環依實際距離推進（每循環 40 像素），取代依時間獨立播放；斜向步幅與直走一致，阻擋時不會繼續踏步。
同方向各動作格使用固定縮放倍率，腳底固定在地面基準；落腳／過腿加入不超過 1.2 像素的身體起伏，地面接觸影保持固定，選取圈降低亮度。
