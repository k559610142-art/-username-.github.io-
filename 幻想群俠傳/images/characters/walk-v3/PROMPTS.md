# 內建 image_gen 生成提示詞

北方向最後改用以下腳位參考提示詞，取代初版北方向：

Use case: sketch-to-render. Image1 is the primary pose-layout blueprint. Repaint EACH of its 8 stick figures as the detailed swordsman from image2, viewed strictly from the BACK. Preserve image1's exact left/right foot POSITIONS and leg attachment, not the poses from image2. Image2 provides clothing and character identity ONLY.
Output a 4 column x 2 row sprite sheet, same order as image1, eight full-body characters, transparent background, no diagram labels or sticks or text. Each figure faces away walking NORTH to TOP of image. Head, torso and pelvis same registered position in each cell. Ivory short split tunic, dark trousers, ponytail, sword sheathed, teal left boot cuff and tan right boot cuff.
In ALL EIGHT cells the teal LEFT boot MUST stay on viewer LEFT, tan RIGHT boot on viewer RIGHT. Never swap colors. Follow the vertical positions in image1: top-left cell has teal boot HIGHER UP than tan boot; bottom-left cell has tan boot HIGHER UP than teal boot. This is the key requirement. Their ground positions exchange vertically across the cycle. Show foreshortened forward shin and extended trailing shin as needed. Frames3 and7 show one knee bent lifted and sole visible. Both feet must alternate support, normal human gait. Do not give all 8 figures the same left-side trailing leg. Do not copy a single pose. Prioritize exact leg pose blueprint over fluttering cloth. Clear exposed knees and boots, tunic hem ends at upper thighs. Realistic painted MMORPG sprite style; no shadows, no glow, no scenery.

## e

Use case: identity-preserve. Production game sprite animation sheet of the referenced ivory/teal swordsman. Exactly EIGHT full-body sprites in a 4-column by 2-row regular sheet. Transparent background. No labels, no grid lines, no text, no shadow, no scenery. All sprites must face ONLY the requested direction. Same size, same torso registration, orthographic elevated game camera, full body each cell with 15% padding, feet visible. Original character identity and upper clothing, but knee-length split tunic and clearly exposed dark trousers and boots. Sword sheathed at belt so arms can counter-swing. Anatomical LEFT boot has a clearly TEAL ankle wrap; anatomical RIGHT boot has a clearly TAN ankle wrap. These two distinct cuffs remain attached to their corresponding physical leg in EVERY frame, so the legs can be tracked. Do not swap cuff colors.
This is a true TWO-STEP HUMAN WALK CYCLE, NOT repeated idle poses. Read frames left to right on top row, then left to right on bottom row.
Frame1 LEFT TEAL boot heel strikes FORWARD and supports body; RIGHT TAN boot BEHIND on toes.
Frame2 LEFT TEAL sole planted forward carrying weight, RIGHT TAN heel lifts behind.
Frame3 LEFT TEAL leg under torso supports body, RIGHT TAN knee bends and swings FORWARD through past left.
Frame4 LEFT TEAL foot behind, RIGHT TAN leg extends forward about to land.
Frame5 RIGHT TAN boot heel strikes FORWARD and supports body; LEFT TEAL boot BEHIND on toes. This MUST be opposite legs to frame1.
Frame6 RIGHT TAN sole planted forward carrying weight, LEFT TEAL heel lifts behind.
Frame7 RIGHT TAN leg under torso supports body, LEFT TEAL knee bends and swings FORWARD through past right.
Frame8 RIGHT TAN foot behind, LEFT TEAL leg extends forward about to land, ready to loop.
Both legs must be independently drawn and visibly exchange fore/aft position. Arm swing reverses between frames1 and5. Strong readable bent knees and lifted soles. Head/torso face fixed direction; don't rotate whole character between poses. No duplicated frames or single-leg hopping. Detailed hand-painted classic fantasy MMORPG sprites, not flat vector.
DIRECTION: EAST, walking to the RIGHT edge of image. Strict right-facing side profile in every cell. Nose, chest, knees and toe tips face image-right. Anatomical LEFT (teal) leg is the farther leg; RIGHT (tan) is the nearer leg. Frame1 teal boot visibly farther RIGHT than tan. Frame5 tan boot visibly farther RIGHT than teal. Use clear alternating legs.

## s

Use case: identity-preserve. Production game sprite animation sheet of the referenced ivory/teal swordsman. Exactly EIGHT full-body sprites in a 4-column by 2-row regular sheet. Transparent background. No labels, no grid lines, no text, no shadow, no scenery. All sprites must face ONLY the requested direction. Same size, same torso registration, orthographic elevated game camera, full body each cell with 15% padding, feet visible. Original character identity and upper clothing, but knee-length split tunic and clearly exposed dark trousers and boots. Sword sheathed at belt so arms can counter-swing. Anatomical LEFT boot has a clearly TEAL ankle wrap; anatomical RIGHT boot has a clearly TAN ankle wrap. These two distinct cuffs remain attached to their corresponding physical leg in EVERY frame, so the legs can be tracked. Do not swap cuff colors.
This is a true TWO-STEP HUMAN WALK CYCLE, NOT repeated idle poses. Read frames left to right on top row, then left to right on bottom row.
Frame1 LEFT TEAL boot heel strikes FORWARD and supports body; RIGHT TAN boot BEHIND on toes.
Frame2 LEFT TEAL sole planted forward carrying weight, RIGHT TAN heel lifts behind.
Frame3 LEFT TEAL leg under torso supports body, RIGHT TAN knee bends and swings FORWARD through past left.
Frame4 LEFT TEAL foot behind, RIGHT TAN leg extends forward about to land.
Frame5 RIGHT TAN boot heel strikes FORWARD and supports body; LEFT TEAL boot BEHIND on toes. This MUST be opposite legs to frame1.
Frame6 RIGHT TAN sole planted forward carrying weight, LEFT TEAL heel lifts behind.
Frame7 RIGHT TAN leg under torso supports body, LEFT TEAL knee bends and swings FORWARD through past right.
Frame8 RIGHT TAN foot behind, LEFT TEAL leg extends forward about to land, ready to loop.
Both legs must be independently drawn and visibly exchange fore/aft position. Arm swing reverses between frames1 and5. Strong readable bent knees and lifted soles. Head/torso face fixed direction; don't rotate whole character between poses. No duplicated frames or single-leg hopping. Detailed hand-painted classic fantasy MMORPG sprites, not flat vector.
Input image1 is character identity, input image2 is the east-facing eight-pose walk cycle to preserve costume and alternation, but reconstruct all eight poses in the new direction, do not simply mirror the east image.
DIRECTION: SOUTH, walking toward the BOTTOM of image, front view. Face and chest visible, nose centered. Anatomical LEFT TEAL boot appears on viewer RIGHT; RIGHT TAN boot viewer LEFT. Frame1 teal foot down-forward, frame5 tan foot down-forward.

## sw

Use case: identity-preserve. Production game sprite animation sheet of the referenced ivory/teal swordsman. Exactly EIGHT full-body sprites in a 4-column by 2-row regular sheet. Transparent background. No labels, no grid lines, no text, no shadow, no scenery. All sprites must face ONLY the requested direction. Same size, same torso registration, orthographic elevated game camera, full body each cell with 15% padding, feet visible. Original character identity and upper clothing, but knee-length split tunic and clearly exposed dark trousers and boots. Sword sheathed at belt so arms can counter-swing. Anatomical LEFT boot has a clearly TEAL ankle wrap; anatomical RIGHT boot has a clearly TAN ankle wrap. These two distinct cuffs remain attached to their corresponding physical leg in EVERY frame, so the legs can be tracked. Do not swap cuff colors.
This is a true TWO-STEP HUMAN WALK CYCLE, NOT repeated idle poses. Read frames left to right on top row, then left to right on bottom row.
Frame1 LEFT TEAL boot heel strikes FORWARD and supports body; RIGHT TAN boot BEHIND on toes.
Frame2 LEFT TEAL sole planted forward carrying weight, RIGHT TAN heel lifts behind.
Frame3 LEFT TEAL leg under torso supports body, RIGHT TAN knee bends and swings FORWARD through past left.
Frame4 LEFT TEAL foot behind, RIGHT TAN leg extends forward about to land.
Frame5 RIGHT TAN boot heel strikes FORWARD and supports body; LEFT TEAL boot BEHIND on toes. This MUST be opposite legs to frame1.
Frame6 RIGHT TAN sole planted forward carrying weight, LEFT TEAL heel lifts behind.
Frame7 RIGHT TAN leg under torso supports body, LEFT TEAL knee bends and swings FORWARD through past right.
Frame8 RIGHT TAN foot behind, LEFT TEAL leg extends forward about to land, ready to loop.
Both legs must be independently drawn and visibly exchange fore/aft position. Arm swing reverses between frames1 and5. Strong readable bent knees and lifted soles. Head/torso face fixed direction; don't rotate whole character between poses. No duplicated frames or single-leg hopping. Detailed hand-painted classic fantasy MMORPG sprites, not flat vector.
Input image1 is character identity, input image2 is the east-facing eight-pose walk cycle to preserve costume and alternation, but reconstruct all eight poses in the new direction, do not simply mirror the east image.
DIRECTION: SOUTHWEST, walking diagonally to image BOTTOM LEFT, FRONT three-quarter view. Face/chest visible and nose points left. LEFT TEAL and RIGHT TAN legs must exchange forward position toward bottom-left.

## w

Use case: identity-preserve. Production game sprite animation sheet of the referenced ivory/teal swordsman. Exactly EIGHT full-body sprites in a 4-column by 2-row regular sheet. Transparent background. No labels, no grid lines, no text, no shadow, no scenery. All sprites must face ONLY the requested direction. Same size, same torso registration, orthographic elevated game camera, full body each cell with 15% padding, feet visible. Original character identity and upper clothing, but knee-length split tunic and clearly exposed dark trousers and boots. Sword sheathed at belt so arms can counter-swing. Anatomical LEFT boot has a clearly TEAL ankle wrap; anatomical RIGHT boot has a clearly TAN ankle wrap. These two distinct cuffs remain attached to their corresponding physical leg in EVERY frame, so the legs can be tracked. Do not swap cuff colors.
This is a true TWO-STEP HUMAN WALK CYCLE, NOT repeated idle poses. Read frames left to right on top row, then left to right on bottom row.
Frame1 LEFT TEAL boot heel strikes FORWARD and supports body; RIGHT TAN boot BEHIND on toes.
Frame2 LEFT TEAL sole planted forward carrying weight, RIGHT TAN heel lifts behind.
Frame3 LEFT TEAL leg under torso supports body, RIGHT TAN knee bends and swings FORWARD through past left.
Frame4 LEFT TEAL foot behind, RIGHT TAN leg extends forward about to land.
Frame5 RIGHT TAN boot heel strikes FORWARD and supports body; LEFT TEAL boot BEHIND on toes. This MUST be opposite legs to frame1.
Frame6 RIGHT TAN sole planted forward carrying weight, LEFT TEAL heel lifts behind.
Frame7 RIGHT TAN leg under torso supports body, LEFT TEAL knee bends and swings FORWARD through past right.
Frame8 RIGHT TAN foot behind, LEFT TEAL leg extends forward about to land, ready to loop.
Both legs must be independently drawn and visibly exchange fore/aft position. Arm swing reverses between frames1 and5. Strong readable bent knees and lifted soles. Head/torso face fixed direction; don't rotate whole character between poses. No duplicated frames or single-leg hopping. Detailed hand-painted classic fantasy MMORPG sprites, not flat vector.
Input image1 is character identity, input image2 is the east-facing eight-pose walk cycle to preserve costume and alternation, but reconstruct all eight poses in the new direction, do not simply mirror the east image.
DIRECTION: WEST, walking toward LEFT edge, strict LEFT-FACING side profile, nose and toe tips point LEFT. Frame1 teal boot farther LEFT than tan. Frame5 tan boot farther LEFT than teal.

## nw

Use case: identity-preserve. Production game sprite animation sheet of the referenced ivory/teal swordsman. Exactly EIGHT full-body sprites in a 4-column by 2-row regular sheet. Transparent background. No labels, no grid lines, no text, no shadow, no scenery. All sprites must face ONLY the requested direction. Same size, same torso registration, orthographic elevated game camera, full body each cell with 15% padding, feet visible. Original character identity and upper clothing, but knee-length split tunic and clearly exposed dark trousers and boots. Sword sheathed at belt so arms can counter-swing. Anatomical LEFT boot has a clearly TEAL ankle wrap; anatomical RIGHT boot has a clearly TAN ankle wrap. These two distinct cuffs remain attached to their corresponding physical leg in EVERY frame, so the legs can be tracked. Do not swap cuff colors.
This is a true TWO-STEP HUMAN WALK CYCLE, NOT repeated idle poses. Read frames left to right on top row, then left to right on bottom row.
Frame1 LEFT TEAL boot heel strikes FORWARD and supports body; RIGHT TAN boot BEHIND on toes.
Frame2 LEFT TEAL sole planted forward carrying weight, RIGHT TAN heel lifts behind.
Frame3 LEFT TEAL leg under torso supports body, RIGHT TAN knee bends and swings FORWARD through past left.
Frame4 LEFT TEAL foot behind, RIGHT TAN leg extends forward about to land.
Frame5 RIGHT TAN boot heel strikes FORWARD and supports body; LEFT TEAL boot BEHIND on toes. This MUST be opposite legs to frame1.
Frame6 RIGHT TAN sole planted forward carrying weight, LEFT TEAL heel lifts behind.
Frame7 RIGHT TAN leg under torso supports body, LEFT TEAL knee bends and swings FORWARD through past right.
Frame8 RIGHT TAN foot behind, LEFT TEAL leg extends forward about to land, ready to loop.
Both legs must be independently drawn and visibly exchange fore/aft position. Arm swing reverses between frames1 and5. Strong readable bent knees and lifted soles. Head/torso face fixed direction; don't rotate whole character between poses. No duplicated frames or single-leg hopping. Detailed hand-painted classic fantasy MMORPG sprites, not flat vector.
Input image1 is character identity, input image2 is the east-facing eight-pose walk cycle to preserve costume and alternation, but reconstruct all eight poses in the new direction, do not simply mirror the east image.
DIRECTION: NORTHWEST, walking toward TOP LEFT, BACK three-quarter view. Back of head and back of tunic visible, face mostly hidden, nose points left. Boots point top-left.

## n

Use case: identity-preserve. Production game sprite animation sheet of the referenced ivory/teal swordsman. Exactly EIGHT full-body sprites in a 4-column by 2-row regular sheet. Transparent background. No labels, no grid lines, no text, no shadow, no scenery. All sprites must face ONLY the requested direction. Same size, same torso registration, orthographic elevated game camera, full body each cell with 15% padding, feet visible. Original character identity and upper clothing, but knee-length split tunic and clearly exposed dark trousers and boots. Sword sheathed at belt so arms can counter-swing. Anatomical LEFT boot has a clearly TEAL ankle wrap; anatomical RIGHT boot has a clearly TAN ankle wrap. These two distinct cuffs remain attached to their corresponding physical leg in EVERY frame, so the legs can be tracked. Do not swap cuff colors.
This is a true TWO-STEP HUMAN WALK CYCLE, NOT repeated idle poses. Read frames left to right on top row, then left to right on bottom row.
Frame1 LEFT TEAL boot heel strikes FORWARD and supports body; RIGHT TAN boot BEHIND on toes.
Frame2 LEFT TEAL sole planted forward carrying weight, RIGHT TAN heel lifts behind.
Frame3 LEFT TEAL leg under torso supports body, RIGHT TAN knee bends and swings FORWARD through past left.
Frame4 LEFT TEAL foot behind, RIGHT TAN leg extends forward about to land.
Frame5 RIGHT TAN boot heel strikes FORWARD and supports body; LEFT TEAL boot BEHIND on toes. This MUST be opposite legs to frame1.
Frame6 RIGHT TAN sole planted forward carrying weight, LEFT TEAL heel lifts behind.
Frame7 RIGHT TAN leg under torso supports body, LEFT TEAL knee bends and swings FORWARD through past right.
Frame8 RIGHT TAN foot behind, LEFT TEAL leg extends forward about to land, ready to loop.
Both legs must be independently drawn and visibly exchange fore/aft position. Arm swing reverses between frames1 and5. Strong readable bent knees and lifted soles. Head/torso face fixed direction; don't rotate whole character between poses. No duplicated frames or single-leg hopping. Detailed hand-painted classic fantasy MMORPG sprites, not flat vector.
Input image1 is character identity, input image2 is the east-facing eight-pose walk cycle to preserve costume and alternation, but reconstruct all eight poses in the new direction, do not simply mirror the east image.
DIRECTION: NORTH, walking toward TOP of image, strict BACK view. No face visible. Anatomical LEFT TEAL boot appears viewer LEFT; RIGHT TAN boot viewer RIGHT. Alternate which boot extends forward away from viewer.

## ne

Use case: identity-preserve. Production game sprite animation sheet of the referenced ivory/teal swordsman. Exactly EIGHT full-body sprites in a 4-column by 2-row regular sheet. Transparent background. No labels, no grid lines, no text, no shadow, no scenery. All sprites must face ONLY the requested direction. Same size, same torso registration, orthographic elevated game camera, full body each cell with 15% padding, feet visible. Original character identity and upper clothing, but knee-length split tunic and clearly exposed dark trousers and boots. Sword sheathed at belt so arms can counter-swing. Anatomical LEFT boot has a clearly TEAL ankle wrap; anatomical RIGHT boot has a clearly TAN ankle wrap. These two distinct cuffs remain attached to their corresponding physical leg in EVERY frame, so the legs can be tracked. Do not swap cuff colors.
This is a true TWO-STEP HUMAN WALK CYCLE, NOT repeated idle poses. Read frames left to right on top row, then left to right on bottom row.
Frame1 LEFT TEAL boot heel strikes FORWARD and supports body; RIGHT TAN boot BEHIND on toes.
Frame2 LEFT TEAL sole planted forward carrying weight, RIGHT TAN heel lifts behind.
Frame3 LEFT TEAL leg under torso supports body, RIGHT TAN knee bends and swings FORWARD through past left.
Frame4 LEFT TEAL foot behind, RIGHT TAN leg extends forward about to land.
Frame5 RIGHT TAN boot heel strikes FORWARD and supports body; LEFT TEAL boot BEHIND on toes. This MUST be opposite legs to frame1.
Frame6 RIGHT TAN sole planted forward carrying weight, LEFT TEAL heel lifts behind.
Frame7 RIGHT TAN leg under torso supports body, LEFT TEAL knee bends and swings FORWARD through past right.
Frame8 RIGHT TAN foot behind, LEFT TEAL leg extends forward about to land, ready to loop.
Both legs must be independently drawn and visibly exchange fore/aft position. Arm swing reverses between frames1 and5. Strong readable bent knees and lifted soles. Head/torso face fixed direction; don't rotate whole character between poses. No duplicated frames or single-leg hopping. Detailed hand-painted classic fantasy MMORPG sprites, not flat vector.
Input image1 is character identity, input image2 is the east-facing eight-pose walk cycle to preserve costume and alternation, but reconstruct all eight poses in the new direction, do not simply mirror the east image.
DIRECTION: NORTHEAST, walking toward TOP RIGHT, BACK three-quarter view. Back of head and back of tunic visible, face mostly hidden, nose points right. Boots point top-right.

## se

Use case: identity-preserve. Production game sprite animation sheet of the referenced ivory/teal swordsman. Exactly EIGHT full-body sprites in a 4-column by 2-row regular sheet. Transparent background. No labels, no grid lines, no text, no shadow, no scenery. All sprites must face ONLY the requested direction. Same size, same torso registration, orthographic elevated game camera, full body each cell with 15% padding, feet visible. Original character identity and upper clothing, but knee-length split tunic and clearly exposed dark trousers and boots. Sword sheathed at belt so arms can counter-swing. Anatomical LEFT boot has a clearly TEAL ankle wrap; anatomical RIGHT boot has a clearly TAN ankle wrap. These two distinct cuffs remain attached to their corresponding physical leg in EVERY frame, so the legs can be tracked. Do not swap cuff colors.
This is a true TWO-STEP HUMAN WALK CYCLE, NOT repeated idle poses. Read frames left to right on top row, then left to right on bottom row.
Frame1 LEFT TEAL boot heel strikes FORWARD and supports body; RIGHT TAN boot BEHIND on toes.
Frame2 LEFT TEAL sole planted forward carrying weight, RIGHT TAN heel lifts behind.
Frame3 LEFT TEAL leg under torso supports body, RIGHT TAN knee bends and swings FORWARD through past left.
Frame4 LEFT TEAL foot behind, RIGHT TAN leg extends forward about to land.
Frame5 RIGHT TAN boot heel strikes FORWARD and supports body; LEFT TEAL boot BEHIND on toes. This MUST be opposite legs to frame1.
Frame6 RIGHT TAN sole planted forward carrying weight, LEFT TEAL heel lifts behind.
Frame7 RIGHT TAN leg under torso supports body, LEFT TEAL knee bends and swings FORWARD through past right.
Frame8 RIGHT TAN foot behind, LEFT TEAL leg extends forward about to land, ready to loop.
Both legs must be independently drawn and visibly exchange fore/aft position. Arm swing reverses between frames1 and5. Strong readable bent knees and lifted soles. Head/torso face fixed direction; don't rotate whole character between poses. No duplicated frames or single-leg hopping. Detailed hand-painted classic fantasy MMORPG sprites, not flat vector.
Input image1 is character identity, input image2 is the east-facing eight-pose walk cycle to preserve costume and alternation, but reconstruct all eight poses in the new direction, do not simply mirror the east image.
DIRECTION: SOUTHEAST, walking toward BOTTOM RIGHT, FRONT three-quarter view. Face/chest visible and nose points right. Boots point bottom-right.
