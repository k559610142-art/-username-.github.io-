# 專案架構說明（凡塵修仙傳-紅塵篇）

> **維護規則：本檔案需與程式碼同步更新。**
> 每次新增/刪除/搬移 `data/` 內的檔案、新增全域函式或資料、或調整 `<script>` 載入順序時，
> 都必須回來更新本檔案對應的段落（檔案清單、依賴關係表、函式對照表）。
> 這是本專案唯一的架構文件，過期的文件比沒有文件更危險。

## 1. 專案結構

```
index.html            唯一的 HTML 進入點：畫面結構、CSS（含手機 RWD，見第 6 節）、
                      彈窗(modal) DOM、<script src> 載入清單
                      ※ 檔名必須是 index.html（GitHub Pages 只把 index.html 當作預設首頁）
images/               圖片素材
  home-bg.jpg         洞府主畫面背景・手機版（704×1520，頭像框／資源框／側邊按鈕／底部導覽已畫在圖上，見第 31 節）
  home-bg-pc.jpg      洞府主畫面背景・PC 版（1376×768，玩家提供；上方五顆導覽鈕已用程式修圖移除，見第 34 節）
  avatar-male.jpg     男修頭像（韓立，597×335 橫式）
  avatar-female.jpg   女修頭像（南宮婉，599×333 橫式）
                      ※ 頭像原本放在外部圖床 postimg.cc，已改為本地檔案；橫式圖裁成圓形時依 PLAYER_AVATARS.pos 對準臉部
  avatars/            可解鎖更換的頭像（256×256 正方形、臉部置中，由玩家提供的原圖裁切縮小），見第 32 節
  cover.jpg           主頁封面・橫式（1264x843），電腦與橫向螢幕使用
  cover-portrait.jpg  主頁封面・直式（960x1920），手機直向使用（由橫式圖重新構圖而成）
data/                 所有遊戲邏輯與資料，依「設定資料 / 執行狀態 / 功能模組 / 進入點」分層
  config-*.js         純資料表（原則上不含函式、無副作用），可視為遊戲的「設計數值表」：
                      realms / level / lifespan / maps / sects / lingbao / shop / beasts /
                      servants / equipment / tribulation / quests / activities / daily-quests / elements / merit / talisman / avatars / home-pc
                      （config-realms.js 另含修煉節奏表 realmPacing，經驗門檻與壽元流逝都由它換算，見第 26 節）
                      （config-sects.js 例外：尾端有一段迴圈補上技能倍率，並提供 findSectByName()）
  state.js            執行期間的可變全域狀態（player、enemies、靈寵輔助效果計時…）
  stats.js            屬性/戰力/等級經驗門檻計算的純函式，以及 getAllSkills()
  elements.js         戰鬥屬性引擎：減傷、閃避、屬性傷害（冰凍/燒傷/中毒/金重擊/雷擊）、五行相剋與持續傷害
  ui.js               畫面渲染共用函式（頂部狀態列、戰鬥實況、日誌、彈窗開關）
  map.js / combat.js / leveling.js / tribulation.js
                      地圖切換、戰鬥 tick、境界與人物等級成長、渡劫
  lifespan.js         壽元：突破增加、死亡扣除、耗盡時遊戲結束
  beast-combat.js     靈寵的經驗/升級、陣亡、戰鬥中協助出手
  sect.js / shop.js / bag.js / equipment.js / lingbao-shop.js /
  servant.js / quest.js / field.js / beast.js / library.js / alchemy.js
                      每個彈出視窗(modal) 對應一支檔案，管理該功能的渲染與互動
                      （library.js 另含第二階段屬性秘典，並提供戰鬥用的 getElementBookBonus()）
  activity.js         活動選單：統一把關各活動的解鎖條件（聲望＋境界）
  daily-quest.js      每日任務（每 4 小時刷新 10 項）
  auction.js          千寶閣拍賣場（每 3 小時刷新 5 件商品，含壽元丹）＋常駐珍貴物資區
  merit.js            功德系統：獵殺邪修、功德兌換七彩補天石、購買破障丹（第 27 節）
  talisman.js         符寶坊：礦石煉製符寶、橙裝孔位鑲嵌／打掉（第 28 節）
  player-profile.js   玩家道號修改
  save.js             本地存檔/讀檔/匯出入/離線掛機結算＋背景補發（第 33 節）/重置/舊存檔相容
  avatar.js           頭像更換：解鎖判定、選擇視窗（設定在 config-avatars.js，第 32 節）
  home-ui.js          洞府主畫面：舞台縮放（手機／PC 版面）、HUD 數值、底部導覽分頁、建築熱點、興建中提示（第 31 節）
  settings.js         設定視窗（洞府右上 ⚙️）：顯示尺寸 手機 9:16／PC 16:9／自動、全螢幕（第 34 節）
  title-screen.js     遊戲主頁（標題畫面）與進入世界
  main.js             initGame()/startGame() 與 window.onload，遊戲啟動進入點
```

這是一個**純前端、無建置工具**的專案：所有 `data/*.js` 都是傳統 `<script>`（非 `type="module"`），
彼此共享同一個全域作用域。`index.html` 內的 `onclick="xxx()"` 會直接呼叫這些全域函式，
因此**檔案拆分時一律保留原本的函式名稱**，不可改名，否則畫面按鈕會失效。

## 2. 載入順序與依賴關係

`index.html` 底部依序載入以下腳本（每個都帶 `?v=版本號`，發佈前要更新，見第 30 節）。多數功能檔案彼此呼叫時**不受載入順序影響**
（函式宣告會先被瀏覽器解析完成，實際呼叫要等到 `window.onload` 之後才發生）。
但以下兩個檔案在載入當下就會**立即執行頂層程式碼**，因此順序不可調換：

- `config-maps.js` 必須在 `state.js` 之前載入：`state.js` 的 `player.currentMap` 直接讀取 `maps[0].items[0]`。
- `main.js` 必須放在最後：它的 `window.onload` 內會呼叫幾乎所有模組的函式，需確保全部腳本都已解析完成。
- `config-sects.js` 尾端也有頂層迴圈（替技能補 `tier`/`mult`），但只讀取同檔的常數，放在哪都安全。

| # | 檔案 | 責任 | 依賴（讀取哪些全域） | 被誰依賴 / 誰會呼叫它 |
|---|------|------|----------------------|------------------------|
| 1 | `config-realms.js` | `realms` 境界名稱陣列、修煉節奏表 `realmPacing`（每境界目標時數/主要地圖/估算加成）、`REALM_PACING_KILLS_PER_SEC` | 無（`realmPacing.map` 是地圖名稱字串，執行期才查 `maps`） | `stats.js`(getRealmStageExp/getNextExp)、`lifespan.js`(getAgingHours)、`ui.js`、`leveling.js` |
| 2 | `config-level.js` | `MAX_PLAYER_LEVEL`、`LEVEL_UP_*` 成長值、`LEVEL_EXP_SEGMENTS` 經驗曲線 | 無 | `stats.js`(getLevelExpNeeded、getMaxHp/getMaxMp)、`leveling.js`(gainLevelExp)、`ui.js` |
| 3 | `config-lifespan.js` | `lifespanByRealm` 各境界壽元增加量與死亡折壽、歲月流逝常數 `LIFESPAN_MIN_AGING_HOURS`/`LIFESPAN_PACE_MULT`/`LIFESPAN_DANGER_MULT`/`LIFESPAN_TRIBULATION_MULT`/`LIFESPAN_OFFLINE_RATE`/`LIFESPAN_FLOOR_DEATHS`、起始年齡 `LIFESPAN_START_AGE` | 無 | `lifespan.js`、`leveling.js`(轉世重設壽元與年齡)、`ui.js`(年齡顯示) |
| 4 | `config-maps.js` | `SECT_MAP_NAME`（"宗門"，唯一安全區的名稱）、`maps` 地圖資料（含各圖 `coins` 每隻靈石）、`KILLS_PER_HOUR_ESTIMATE`、`REPUTATION_MAX_BY_MAP_CATEGORY`（各區擊殺聲望上限）、`OFFLINE_COMBAT_RATE`/`OFFLINE_REPUTATION_RATE`、`monsterIcons` | 無 | `state.js`、`map.js`(isInSect)、`combat.js`、`ui.js`、`save.js`(migrateCurrentMap) |
| 5 | `config-sects.js` | `sectData` 宗門與技能表、`SECT_SKILL_BONUS`、`SECT_TIER_NAMES`、`findSectByName()`；尾端迴圈替每招補上 `tier`/`mult` | 無 | `sect.js`、`stats.js`(getSectTier/getAllSkills)、`ui.js`、`save.js`(重新綁定宗門) |
| 6 | `config-lingbao.js` | `legacySkillAdjustments` 舊版禁術下修數值、`lingbaoTierCosts` 各階段兌換價格、`lingbaoShopItems` 三階段戰略級寶物與武學 | 無 | `lingbao-shop.js`、`equipment.js`(五行說明列固定屬性裝備) |
| 7 | `config-shop.js` | `shopItems` 丹藥堂商品、`shopSections` 分區、`POTION_COOLDOWN_SECONDS` 丹藥冷卻、`SHOP_MAX_BUY_QTY` 單次購買上限(9999) | 無 | `shop.js`、`bag.js`、`combat.js`(自動補血補魔) |
| 8 | `config-beasts.js` | `beastData` 靈寵兌換與被動、`BEAST_REVIVE_COST_CORE`、維持費 `BEAST_UPKEEP_INTERVAL`/`beastUpkeepTiers`（第 16 節）、`BEAST_SKILL_LEVELS`、`BEAST_SKILL_CHANCE`、`beastElementInfo`、`beastSkillTree` | 無 | `beast.js`、`beast-combat.js`、`save.js`(舊存檔轉換) |
| 9 | `config-servants.js` | `MAX_SERVANTS`、`servantQualities`、`SERVANT_TRIP_COST`(每趟任務靈石花費)、`servantNames` | 無 | `combat.js`(tryRescueServant)、`servant.js`(派遣花費) |
| 10 | `config-equipment.js` | `MAX_EQUIP_INVENTORY`、`equipTypes`（含 artifact 神器欄）、`NON_FORGEABLE_SLOTS`、裝備等級 `EQUIP_LEVELS`/`EQUIP_LEVEL_STAT_MULT`/`FORGE_LEVEL_CAP_BY_TIER`、`FORGE_COST`(10,000)、`wuxingElements`、靈根表 `wuxingArrayEffects`(單屬性)/`pureRootEffects`(純化)/`dualRootEffects`(雙屬性)/`supremeRootEffect`(五行聖)、門檻常數 `ROOT_SINGLE_COUNT`/`ROOT_SUPREME_SETS`/`ROOT_PURE_SETS`/`ROOT_PURE_REST`/`ROOT_DUAL_SETS`/`ROOT_DUAL_REST`、`equipQualities`(含各品質的減傷/閃避/屬性傷害值) | 無 | `equipment.js`(鍛造、靈根說明視窗)、`stats.js`(getSpiritRoots/getRootBonus/getPlayerElement)、`save.js`(補齊欄位)、`beast.js`(五行選項) |
| 11 | `config-tribulation.js` | 渡劫門檻、勝算常數 `TRIBULATION_*`（含合體期起加劇 `TRIBULATION_HARD_REALM_INDEX`/`TRIBULATION_HARD_PENALTY_PER_REALM`/`TRIBULATION_HARD_PENALTY_MAX`）、心魔倍率與技能 | 無 | `leveling.js`、`tribulation.js`、`save.js` |
| 12 | `config-quests.js` | `questData` 門派任務（可選欄位：範圍獎勵 `[min,max]`、`requiredQuality`、`duration`；某等級可不填）、`questRewardInfo` 獎勵名稱與對應欄位（含礦石 `ore`）、`QUEST_*` 進度常數、`MAX_ASSIGNED_SERVANTS` | 無 | `quest.js`、`servant.js`、`combat.js` |
| 13 | `config-activities.js` | `activityData` 活動清單與解鎖條件 | 無 | `activity.js` |
| 14 | `config-daily-quests.js` | 每日任務 `DAILY_REFRESH_HOURS`/`DAILY_QUEST_COUNT`/`dailyQuestPool`/`dailyQuestRewards`、千寶閣 `AUCTION_*`、`auctionQualityOdds`、`auctionLifePills`(壽元丹) | 無 | `daily-quest.js`、`auction.js` |
| 15 | `config-elements.js` | 戰鬥屬性上限 `DEF_CAP`/`EVA_CAP`/`AFFIX_CAP`、效果常數（凍結/燒傷/中毒/金重擊/雷擊 `THUNDER_BONUS`）、`combatAttrInfo`、`AFFIX_TYPES`(玩家武器)/`MONSTER_AFFIX_TYPES`(怪物異屬性：冰/毒/雷)、五行相剋 `WUXING_COUNTERS`/`WUXING_COUNTER_BONUS`/`WUXING_COUNTERED_PENALTY`、`monsterAttrsByMapCategory` | 無 | `elements.js`、`stats.js`(getPlayerElement)、`ui.js`、`equipment.js`(鍛造屬性、五行說明視窗) |
| 15a | `config-merit.js` | 邪修 `EVIL_SPAWN_CHANCE`/`EVIL_POWER_MULT`/`EVIL_MERIT_MIN`/`EVIL_MERIT_MAX`/`EVIL_ICON`、兌換 `MERIT_PER_BUTIAN_STONE`/`BREAK_PILL_STONE_COST`、破障丹效果 `BREAK_PILL_DEMON_POWER_MULT`/`BREAK_PILL_CHANCE_BONUS`/`BREAK_PILL_MAX_CHANCE`、`preciousItems`(顯示資料) | 無 | `merit.js`、`combat.js`(邪修生成)、`save.js`(離線功德)、`tribulation.js`(破障丹)、`bag.js`、`ui.js` |
| 15d | `config-home-pc.js` | PC 版洞府：`PC_STAGE_IMG_W`/`PC_STAGE_IMG_H`(1376×768)、分頁面板位置 `PC_SHEET_RECT`、按鈕與建築熱點表 `pcStageButtons`（圖上座標、功能 action、牌匾、nav、enabled） | 無（action 是字串，點擊時才呼叫各模組函式） | `home-ui.js`(renderPcStage/layoutStage) |
| 15c | `config-avatars.js` | `avatarList`（頭像 id／名稱／圖片／裁切位置／解鎖條件） | 無 | `avatar.js` |
| 15b | `config-talisman.js` | 孔位 `SOCKET_QUALITY`/`SOCKET_MIN`/`SOCKET_MAX`、`talismanTypes`(11 種)、`talismanGrades`(下/中/上品的效果與出現機率)、`TALISMAN_CRAFT_COST`(每次 500 礦石＋5 萬靈石) | 無 | `talisman.js` |
| 16 | `state.js` | `player`（含 `lingbaoSold`、渡劫失敗虛弱 `weakened`、頭像 `avatarId`/`unlockedAvatars`、礦石 `ore`、符寶 `talismans`、藏書閣屬性秘典次數 `elementStudy`、轉世保留的上限 `reincarnateBonus`、年齡 `age`、功德系統 `merit`/`butianStones`/`breakPills`/`evilKills`）、`DEFAULT_PLAYER_JSON`（全新角色預設值快照，讀檔/匯入的合併基底）、`enemies`（每隻帶 `attrs`/`status`）、`respawnTimer`、`safeZoneTimer`；不存檔的執行期狀態：`inTribulation`/`heartDemon`/`tribulationFatedWin`/丹藥冷卻/`gameOver`/背景補發 `lastTickAt`/`missedTickMs`/`playerStatus`(玩家身上的凍結/燒傷/中毒)/靈寵輔助計時(`petBuff*`/`petShield*`/`petRegen*`) | **`maps`**（必須排在 config-maps.js 之後） | 幾乎所有檔案都會讀寫 `player` |
| 17 | `stats.js` | `EQUIP_STAT_KEYS`、`getEquipBonus`(四維＋減傷/閃避/屬性傷害)/`getElementCounts`/`getSpiritRoots`(靈根判定)/`getRootBonus`(靈根加成總和)/`getPlayerElement`(本命五行，五行相剋用)/`getRealmStageExp`(依 realmPacing 換算每階經驗基數，有快取)/`getNextExp`/`getLevelExpNeeded`/`hasLiveBeast`(出戰中才算，呼叫 beast-combat.js 的 isBeastActive)/`getBasePower`/`getPhysAttack`/`getMagAttack`/`getMaxHp`/`getMaxMp`(兩者皆加上轉世保留值)/`getReincarnateBonus`/`getSectTier`/`getAllSkills` | `player`、`realms`、`sectData`、`LEVEL_*`、`equipTypes`/`WUXING_COUNTERS`、靈寵輔助計時 | `ui.js`、`combat.js`、`leveling.js`、`tribulation.js`、`beast-combat.js` 等幾乎全部功能檔 |
| 18 | `elements.js` | `newStatus`/`getPlayerCombatAttrs`(含 `element`)/`getWuxingCounterMult`/`withSkillEffect`/`getMapCategoryIndex`/`rollMonsterAttrs`/`resolveHit`/`addDotStack`/`tickStatus`/`formatStatus`/`summarizeTags`/`formatEquipStats` | `config-elements.js`、`stats.js`(getEquipBonus/getPlayerElement)、`library.js`(getElementBookBonus)、`wuxingElements`、`maps`、`playerStatus` | `combat.js`、`tribulation.js`、`ui.js`、`bag.js`/`equipment.js`/`auction.js`/`lingbao-shop.js`(裝備屬性文字) |
| 19 | `ui.js` | 常數 `PLAYER_AVATARS`（頭像 `img`（本地 images/avatar-*.jpg）/裁切位置 `pos`/預設道號，洞府頭像框、戰鬥實況、性別選擇共用；性別選擇視窗的兩張 `<img>` 寫在 index.html，換圖時要一起改）、`updateUI`/`updateCombatVisualPanel`/`formatWuxingCounterTip`/`updateTribulationUI`/`updatePotionCooldownUI`/`updateStudyCountsUI`/`renderSkillList`/`addLog`/`refreshCombatStatusText`/`updateAutoSettings`/`syncAutoSettingsUI`/`updateSectFacilitiesUI`/`closeModal`/`toggleDrawer`/`formatCountdown`/`resolveBatchCount`(×1/×10/最高 共用)/批次刪除工具 `renderBulkDeleteBar`/`getCheckedBulkQualities`/`toggleAllBulkQualities` | `player`、`realms`、`stats.js` 的計算函式、`lifespan.js`(getDeathLifespanCost) | 幾乎所有功能檔在資料變動後都會呼叫 `updateUI()`/`addLog()` |
| 20 | `map.js` | `isInSect`(是否身在宗門)/`openMapCategoryModal`/`selectMap`/`changeMap` | `maps`、`SECT_MAP_NAME`、`player`、`ui.js` | `ui.js`(updateSectFacilitiesUI)、`combat.js`/`quest.js`(門派任務須在宗門)、HTML 按鈕；changeMap 離開宗門時呼叫 `quest.js` 的 stopQuest |
| 21 | `combat.js` | `combatTick`/`playerAttackTurn`(普攻/技能出手，渡劫共用)/`onPlayerKilledInField`/`checkAutoHealAndMana`/`tryRescueServant` | `player`、`enemies`、`shopItems`、`servantQualities`、`servantNames`、`stats.js`、`elements.js`(resolveHit/tickStatus)、`leveling.js`(gainExp)、`beast-combat.js`(petAssistTick/applyPetDamageReduction/tickBeastUpkeep 每秒維持費計時)、`lifespan.js`(handlePlayerDeath)、`map.js`(changeMap 死亡回城)、`merit.js`(isEvilHuntUnlocked/rollEvilMerit，邪修生成與功德)、`config-merit.js` | `main.js`(setInterval 每秒呼叫) |
| 22 | `leveling.js` | `REINCARNATE_KEEP_RATE`(轉世保留比例 5%)、`gainExp`/`gainLevelExp`/`advanceRealm`/`triggerReincarnate`（規則見第 25 節） | `realms`、`player`、`stats.js`、`ui.js`(updateSectFacilitiesUI)、`beast-combat.js`(gainBeastExp)、`lifespan.js`(gainRealmLifespan) | `combat.js`、`tribulation.js`、`save.js`、HTML 輪迴按鈕 |
| 23 | `lifespan.js` | `getDeathLifespanCost`/`formatLifespan`/`getLifespanFloor`/`getAgingHours`(依 realmPacing 算出一境界壽元可撐時數)/`getAgingMultiplier`/`getAgingPerMinute`/`ageLifespan`(同時增加年齡 `player.age`)/`checkLifespanWarnings`(提示旗標 `lifespanWarned`，不存檔)/`getInitialLifespanForRealm`/`gainRealmLifespan`/`handlePlayerDeath`/`triggerLifespanGameOver` | `lifespanByRealm`、`LIFESPAN_*`、`player`、`inTribulation`、`elements.js`(getMapCategoryIndex)、`beast-combat.js`(killAllBeasts) | `combat.js`(每秒 ageLifespan、死亡)、`tribulation.js`(死亡)、`leveling.js`(突破)、`save.js`(離線流逝、舊存檔)、`ui.js`、`auction.js` |
| 24 | `tribulation.js` | `getTribulationChance`/`getTribulationHardPenalty`(合體期起勝算扣除量)/`formatChance`/`triggerTribulation`/`tribulationTick`/`resolvePlayerFall`/`endTribulation` | `player`、`config-tribulation.js`、`config-merit.js`(破障丹)、`player.breakPills`、`shopItems`(丹藥加成)、`sectData`(技能加成)、`stats.js`、`elements.js`、`combat.js`(playerAttackTurn)、`beast-combat.js`、`lifespan.js`、`leveling.js`(advanceRealm) | `combat.js`(渡劫中接管 tick)、`ui.js`(按鈕顯示勝算)、HTML 渡劫按鈕 |
| 25 | `sect.js` | `checkSectJoined`/`openSectModal`/`renderSects`/`joinSect` | `sectData`、`player.sect`/`sectSkills` | 幾乎所有「需拜入宗門才能使用」的彈窗（shop/servant/field/beast/lingbao-shop/library/forge/alchemy）都會先呼叫 `checkSectJoined()` |
| 26 | `shop.js` | `openShopModal`/`renderShop`/`renderShopCard`/`getShopQty`/`setShopQty`/`setShopQtyMax`/`updateShopTotal`/`buyShopItem` | `shopItems`、`player`、`sect.js`(checkSectJoined) | HTML 按鈕、`bag.js` 顯示已購買道具 |
| 27 | `bag.js` | `openBagModal`/`hasEquipInventorySpace`(背包上限檢查，鍛造/千寶閣/靈寶閣/卸下裝備共用)/`renderBag`/`useItemFromBag`/`deleteItemFromBag`/`deleteEquipFromInventory`/`bulkDeleteEquipment` | `shopItems`、`player.bag`、`player.equipInventory` | `equipment.js`(equipItem 後呼叫 renderBag) |
| 28 | `equipment.js` | `EQUIP_CATEGORY_NAMES`(部位分類中文名)、`formatEquipLevel`/`getForgeLevelCap`/`renderForgeLevelSelect`(裝備等級，第 29 節)、`initForgeSelect`/`openEquipmentModal`/`renderLingbaoUI`(注意：命名沿用舊碼，實際是角色裝備列表)/`openWuxingInfo`/`equipItem`/`unequipItem`/`openForgeModal`/`forgeEquipment`/`forgeOneEquipment`/`generateEquipStats`(鍛造與千寶閣共用的屬性產生)、常數 `FORGE_COST`（已移到 config-equipment.js） | `equipTypes`、`wuxingElements`、`wuxingArrayEffects`、`equipQualities`、`lingbaoShopItems`(說明視窗列固定屬性裝備)、`player.equipment`、`player.equipInventory`、`ui.js`(resolveBatchCount) | `bag.js`(equipItem)、`sect.js`(forge 需拜入宗門) |
| 29 | `lingbao-shop.js` | `openLingbaoShopModal`/`renderLingbaoShopUI`/`buyLingbaoItem(itemId)` | `lingbaoShopItems`、`lingbaoTierCosts`、`player.sectSkills`/`lingbaoSold`/`coins`/`reputation`/`equipInventory`/`learnedSkills`、`bag.js`(hasEquipInventorySpace) | HTML 按鈕（僅在「宗門」顯示） |
| 30 | `servant.js` | `openServantModal`/`renderServants`/`assignServantQuest`/`dismissServant`/`bulkDismissServants`/`tickServantQuests`/`getAssignedServantCount`/`getServantTripCost`/`payServantTrip` | `questData`、`SERVANT_TRIP_COST`、`player.servants`(每位自帶 `quest`/`timer`)/`coins`、`quest.js` 的任務與獎勵函式 | `combat.js`(每 tick 呼叫 tickServantQuests)、`quest.js`(顯示派遣狀態) |
| 31 | `quest.js` | `openQuestModal`/`renderQuestButtons`/`startQuest`/`stopQuest`/`updateQuestUI` + 共用任務函式 `getQuestDef`/`getAvailableQuestIds`/`getQuestRequiredProgress`/`getQuestSpeed`/`canServantTakeQuest`/`formatQuestRewards`/`grantQuestRewards`(回傳實際獲得文字) | `questData`(config-quests.js)、`player.activeQuest`、`stats.js`(getSectTier)、`map.js`(isInSect) | `combat.js`(玩家任務結算)、`servant.js`(僕從任務結算)、`map.js`(離開宗門時中斷) |
| 32 | `activity.js` | `renderActivityList`/`getActivityLockReason`/`openActivity` | `activityData`、`player.reputation`/`realmIndex` | `ui.js`(updateUI 每秒重繪) |
| 33 | `daily-quest.js` | `openDailyQuestModal`/`renderDailyQuests`/`claimDailyQuest`/`claimAllDailyQuests`/`addDailyProgress`/`refreshDailyQuestsIfDue` | `config-daily-quests.js`、`player.daily*` | 各功能的 `addDailyProgress()` 埋點 |
| 34 | `auction.js` | `openAuctionModal`/`refreshAuctionIfDue`/`rollAuctionItem`/`rollAuctionEquip`/`buyAuctionItem`(壽元丹轉交 `buyAuctionLifePill`)/`buyAuctionLifePill`/`renderAuction`/`renderAuctionLifePillCard` | `auctionQualityOdds`、`auctionLifePills`、`equipQualities`、`player.auctionItems`/`coins`/`reputation`/`lifespan`、`merit.js`(renderPreciousSection 嵌在商品下方) | `activity.js`(千寶閣按鈕)、`merit.js`(兌換/購買後重繪) |
| 34a | `merit.js` | `isEvilHuntUnlocked`/`isMeritSystemOpen`(暫停開關)/`rollEvilMerit`/`openEvilHuntModal`/`renderEvilHunt`/`renderPreciousSection`/`exchangeMeritForStone`/`buyBreakPill` | `config-merit.js`、`activityData`、`activity.js`(getActivityLockReason)、`player.merit`/`butianStones`/`breakPills`/`evilKills`、`ui.js`(resolveBatchCount)、`auction.js`(renderAuction) | `combat.js`、`save.js`、`auction.js`、`activity.js`(獵殺邪修按鈕 openFn) |
| 34b | `talisman.js` | `talismanKey`/`getTalismanType`/`getTalismanGrade`/`getTalismanValue`/`formatTalisman`/`ensureSockets`(橙裝開孔，可重複呼叫)/`getSocketStats`/`formatSockets`/`findEquipById`/`openTalismanModal`/`renderTalismanWorkshop`/`renderSocketCard`/`craftTalisman`/`inlayTalisman`/`removeTalisman` | `config-talisman.js`、`equipTypes`、`player.talismans`/`ore`/`coins`/`equipment`/`equipInventory`、`ui.js`(resolveBatchCount)、`sect.js`(checkSectJoined) | `stats.js`(getEquipBonus 加總符寶)、`equipment.js`/`auction.js`/`lingbao-shop.js`(取得橙裝時 ensureSockets)、`bag.js`/`equipment.js`/`auction.js`(formatSockets 顯示)、`save.js`(migrateEquipSockets)、HTML 符寶坊按鈕 |
| 35 | `field.js` | `herbRecipes`、`openFieldModal`/`plantHerb` | `player.spiritGrass`/`player.herbs`/`player.coins`、`ui.js`(resolveBatchCount) | HTML 按鈕（僅在「宗門」顯示） |
| 36 | `beast-combat.js` | `createBeast`/`getBeastName`/`isBeastActive`(存活且出戰中)/維持費 `getBeastUpkeep`/`payBeastUpkeep`/`restBeastForUpkeep`/`tickBeastUpkeep`/`settleOfflineBeastUpkeep`/`getBeastSkill`/`describeBeastSkill`/`gainBeastExp`/`killAllBeasts`/`applyPetDamageReduction`/`petAssistTick` | `beastData`、`beastSkillTree`、`beastUpkeepTiers`/`BEAST_UPKEEP_INTERVAL`、`player.beasts`/`level`/`coins`/`beastCore`、`stats.js`(getLevelExpNeeded/getPhysAttack)、`beast.js`(renderBeasts，靈獸園開著時重繪) | `leveling.js`(gainExp)、`combat.js`(每秒 tickBeastUpkeep)/`tribulation.js`(每回合)、`lifespan.js`(死亡)、`stats.js`(hasLiveBeast)、`beast.js`、`save.js`(離線維持費) |
| 37 | `beast.js` | `openBeastModal`/`getBeastDiscountMult`(魅力折扣倍率)/`renderBeasts`/`tameBeast`/`reviveBeast`/`toggleBeastActive`(出戰／召回休息)/`learnBeastSkill` | `beastData`、`player.beastCore`/`coins`/`beasts`、`beast-combat.js`、`stats.js`(getEquipBonus 算魅力折扣) | HTML 按鈕（僅在「宗門」顯示） |
| 38 | `library.js` | 第一階段 `STUDY_COST`/`STUDY_GAIN`/`STUDY_MAX_COUNT`、`openLibraryModal`/`studyBook`；第二階段屬性秘典（第 24 節）`ELEMENT_BOOK_TIER`/`ELEMENT_BOOK_GAIN`/`ELEMENT_BOOK_MAX`/`ELEMENT_BOOK_COST`/`elementBooks`、`isElementBookUnlocked`/`getElementBookBonus`/`formatElementBookPercent`/`renderElementBooks`/`studyElementBook` | `player.studyCounts`/`elementStudy`/`martialPoints`/`spiritGrass`/`coins`/`stats`/`sectSkills`、`SECT_TIER_NAMES`、`ui.js`(resolveBatchCount) | HTML 按鈕（僅在「宗門」顯示）、`elements.js`(getPlayerCombatAttrs 呼叫 getElementBookBonus) |
| 39 | `alchemy.js` | `pillRecipes`、`openAlchemyModal`/`craftPill` | `player.herbs`/`stats`/`coins`、`ui.js`(resolveBatchCount) | HTML 按鈕（僅在「宗門」顯示） |
| 40 | `player-profile.js` | `PLAYER_NAME_MAX_LENGTH`、`sanitizePlayerName`(移除 HTML 特殊字元，讀檔/匯入也套用)/`changePlayerName`(開啟 #name-modal)/`confirmPlayerName` | `player.name` | HTML 按鈕、`save.js`(applySaveData) |
| 41 | `save.js` | `calcOfflineProgress`(讀檔時的離線結算，呼叫 settleIdleSeconds)/`settleIdleSeconds`(離線與背景共用的收益結算，含 settleOfflineBeastUpkeep 靈寵維持費)/`formatIdleDuration`/背景補發 `checkBackgroundCatchUp`＋常數 `BACKGROUND_TICK_SLACK_MS`/`BACKGROUND_SETTLE_MIN_SECONDS`（第 33 節）/`saveLocal`/`loadLocal`/`applySaveData`(讀檔與匯入共用)/`resetGameCompletely` + 舊存檔相容 `migrateServantAssignments`/`migrateEquipmentSlots`/`migrateActivityFields`/`migrateCurrentMap`/`migrateProgressionFields`/`migrateLegacySkills`(舊禁術下修＋已兌換武學耗魔同步)/`migrateRealmExp`(經驗曲線改版：待渡劫者修為壓回滿格)/`migrateEquipSockets`(只補 talismans 欄位) + 讀檔失敗保護 `saveLoadFailed`/`reportLoadFailure`/`retryLoadAfterFailure`/`showRawSaveForCopy`/`abandonSaveAndStartNew`（第 30 節） + 離線斬殺邪修的功德 + `reloadLocalSave`(選單按鈕，無存檔時給提示) + 存檔代碼（常數 `SAVE_CODE_PREFIX`="FS2:"、兩段式確認暫存 `pendingImportData`；編解碼皆為 async）`encodeSaveCode`/`decodeSaveCode`/`bytesToBase64`/`base64ToBytes`/`pipeBytes`/`openSaveCodeModal`/`setSaveCodeStatus`/`exportSave`/`selectSaveCodeText`/`copySaveCode`/`downloadSaveCode`/`importSave`/`pasteSaveCodeFromClipboard`/`importSaveFromFile`/`confirmImportSave`/`resetImportConfirm` | `player`（整包序列化進 `localStorage`）、`maps`(migrateCurrentMap)、`legacySkillAdjustments`/`lingbaoShopItems`(migrateLegacySkills)、`leveling.js`(gainExp)、`combat.js`(tryRescueServant)、`lifespan.js`、`beast-combat.js`(createBeast)、`ui.js` | `main.js`(啟動時 loadLocal)、`main.js`(initGame 內每 30 秒 saveLocal) |
| 41b | `avatar.js` | `getPlayerAvatar`/`isAvatarUnlocked`/`checkAvatarCondition`/`checkAvatarUnlocks`/`openAvatarModal`/`renderAvatarModal`/`selectAvatar` | `avatarList`、`player.avatarId`/`unlockedAvatars`/`gender`/`realmIndex`/`level`/`reputation`/`tribulationCount`、`realms` | `ui.js`(updateUI 呼叫 checkAvatarUnlocks；戰鬥實況頭像)、`home-ui.js`(頭像框)、HTML 頭像點擊 |
| 41c | `settings.js` | `DISPLAY_MODE_KEY`(localStorage 鍵)/`DISPLAY_MODES`/`AUTO_PC_MIN_WIDTH`/`AUTO_PC_MIN_RATIO`、`getDisplayMode`/`resolveDisplayLayout`(回傳 'phone'／'pc')/`setDisplayMode`/`openSettingsModal`/`renderSettingsModal`/`isFullscreen`/`toggleFullscreen`；頂層註冊 `fullscreenchange` 監聽（只綁函式，載入順序不影響） | `home-ui.js`(layoutStage)、`#settings-modal` DOM、`localStorage` | `home-ui.js`(layoutStage 呼叫 resolveDisplayLayout)、HTML ⚙️ 設定按鈕 |
| 41a | `home-ui.js` | `STAGE_IMG_W`/`STAGE_IMG_H`、`TAB_TITLES`、`layoutStage`(手機／PC 版面切換，第 34 節)/`renderPcStage`(依 config-home-pc.js 產生 PC 版按鈕與熱點)/`initHomeUi`/`switchTab`/`showStageToast`/`showUnderConstruction`/`openAscensionPlatform`/`formatShortNumber`/`getCultivationRate`/`updateHomeHud`(同時寫入手機版 hud-xxx 與 PC 版 pc-hud-xxx) | `player`、`realms`、`PLAYER_AVATARS`、`stats.js`、`tribulation.js`(triggerTribulation)、`activity.js`(openActivity)、`config-home-pc.js`、`settings.js`(resolveDisplayLayout) | `ui.js`(updateUI 結尾呼叫 updateHomeHud)、`main.js`(onload 呼叫 initHomeUi)、HTML 熱點與底部導覽 |
| 42 | `title-screen.js` | `TITLE_HOTSPOTS`(光環座標)/`currentTitleHotspot`/`positionTitleHotspot`/`enterWorld`/`initTitleScreen`、旗標 `worldEntered` | `main.js`(startGame)、`#title-screen` DOM | `main.js`(onload 呼叫 initTitleScreen)、標題頁按鈕 |
| 43 | `main.js` | `initGame`(含每 30 秒存檔與切到背景時存檔)/`startGame`(讀檔失敗時不進入開新角色)/`chooseGender`/`window.onload`、旗標 `gameStarted` | 幾乎全部模組（啟動流程的膠水程式碼） | 瀏覽器 `onload`、`title-screen.js`(enterWorld 呼叫 startGame) |

## 3. 資料流總覽（文字版流程圖）

```
使用者開啟 index.html
        │
        ▼
瀏覽器依序載入 config-*.js → state.js → stats.js → ui.js
        → map/combat/leveling → 各彈窗功能檔 → save.js → main.js
        │
        ▼
window.onload (main.js) → initTitleScreen() [title-screen.js]
        │
        ▼
顯示遊戲主頁 #title-screen（此時 <body class="title-mode"> 會隱藏 #game-container）
        │
        │  玩家點擊光環熱區 / 「進入世界」按鈕 / 按 Enter、空白鍵
        ▼
enterWorld() [title-screen.js] → 標題頁淡出、移除 body.title-mode → startGame()
        │
        ▼
startGame() [main.js]
        ├─ loadLocal() [save.js] 讀 localStorage
        │       ├─ 成功 → calcOfflineProgress() 結算離線收益 → updateUI() → initGame()
        │       └─ 失敗（第一次進入）→ 顯示 #gender-modal 性別選擇視窗
        │               └─ 玩家點選 → chooseGender() [main.js]：設定性別與預設道號 → initGame() → 立即 saveLocal()
        │
        ▼
initGame() [main.js]
        ├─ initForgeSelect()      [equipment.js]
        ├─ syncAutoSettingsUI()   [ui.js]
        ├─ updateUI()             [ui.js]
        ├─ setInterval(combatTick, 1000)   [combat.js]  ← 遊戲主迴圈
        └─ setInterval(saveLocal, 30000)   [save.js]    ← 自動存檔

combatTick() 每秒執行 [combat.js]
        ├─ checkBackgroundCatchUp() [save.js]：分頁在背景被放慢／暫停時，把沒跑到的秒數以離線公式補發（第 33 節）
        ├─ 安全區：回血回魔、每 5 秒 gainExp() [leveling.js]
        ├─ 野外：玩家狀態結算(燒傷/中毒/凍結) → 攻擊/技能（每擊經 resolveHit() [elements.js]）
        │        → 靈寵協助 petAssistTick() [beast-combat.js] → 怪物狀態結算 → 擊殺結算 → 怪物逐隻反擊（同樣經 resolveHit()）
        │       ├─ 擊殺 → gainExp()（同時累積境界、人物等級、靈寵等級）、加靈石、tryRescueServant() [combat.js]
        │       └─ 戰死 → handlePlayerDeath() [lifespan.js]：折壽、靈寵全數陣亡；壽元歸零 → 清除存檔重新開始
        ├─ 玩家任務進度（須在宗門）[quest.js 的 activeQuest]
        ├─ tickServantQuests() 每位僕從各自的任務進度 [servant.js]
        └─ checkAutoHealAndMana() 自動補給 [combat.js]

任何彈窗操作（購買/裝備/宗門/任務…）
        └─ 修改 player 狀態 → 呼叫 updateUI()/addLog() [ui.js] → 畫面即時更新
```

## 4. HTML `onclick` → 函式 → 所在檔案 對照表

新增/修改 HTML 按鈕時，務必同步確認函式名稱與下表一致（全域函式，不可加 `type="module"`）。
※ `plantHerb(type, qty)`、`craftPill(type, qty)`、`studyBook(stat, qty)`、`studyElementBook(key, qty)`、`forgeEquipment(qty)` 的 `qty` 為 `1`、`10` 或 `'max'`（見第 9 節批次操作）。

| onclick 呼叫 | 定義檔案 |
|---|---|
| `changePlayerName`, `confirmPlayerName` | `data/player-profile.js` |
| `openEquipmentModal`, `unequipItem`, `equipItem`, `forgeEquipment` | `data/equipment.js` |
| `openMapCategoryModal`, `selectMap` | `data/map.js` |
| `openSectModal`, `joinSect` | `data/sect.js` |
| `openShopModal`, `buyShopItem` | `data/shop.js` |
| `openBagModal`, `useItemFromBag`, `deleteItemFromBag`, `deleteEquipFromInventory` | `data/bag.js` |
| `openServantModal`, `dismissServant` | `data/servant.js` |
| `openQuestModal`, `startQuest`, `stopQuest` | `data/quest.js` |
| `openFieldModal`, `plantHerb` | `data/field.js` |
| `openBeastModal`, `tameBeast`, `reviveBeast`, `toggleBeastActive`, `learnBeastSkill` | `data/beast.js` |
| `openLingbaoShopModal`, `buyLingbaoItem(itemId)`（舊版的第二個參數 payType 已移除，改為同時扣靈石＋聲望） | `data/lingbao-shop.js` |
| `openLibraryModal`, `studyBook`, `studyElementBook`（後者的按鈕由 `renderElementBooks()` 動態產生） | `data/library.js` |
| `openForgeModal`, `openWuxingInfo` | `data/equipment.js` |
| `openAlchemyModal`, `craftPill` | `data/alchemy.js` |
| `triggerReincarnate` | `data/leveling.js` |
| `triggerTribulation` | `data/tribulation.js` |
| `setShopQty`, `setShopQtyMax`, `updateShopTotal` | `data/shop.js` |
| `resetGameCompletely`, `saveLocal`, `reloadLocalSave`, `exportSave`, `importSave`, `copySaveCode`, `downloadSaveCode`, `pasteSaveCodeFromClipboard`, `importSaveFromFile`, `confirmImportSave`, `resetImportConfirm` | `data/save.js` |
| `updateAutoSettings` | `data/ui.js` |
| `closeModal`, `toggleDrawer`, `toggleAllBulkQualities` | `data/ui.js` |
| `bulkDeleteEquipment` | `data/bag.js` |
| `bulkDismissServants`, `assignServantQuest` | `data/servant.js` |
| `openActivity` | `data/activity.js` |
| `openDailyQuestModal`, `claimDailyQuest`, `claimAllDailyQuests` | `data/daily-quest.js` |
| `openAuctionModal`, `buyAuctionItem` | `data/auction.js` |
| `openTalismanModal`、`craftTalisman(qty)`（隨機煉製）、`inlayTalisman(equipId, idx)`、`removeTalisman(equipId, idx)`（後三者由 `renderTalismanWorkshop()` 動態產生） | `data/talisman.js` |
| `exchangeMeritForStone`, `buyBreakPill`（千寶閣珍貴物資區，動態產生）、`openEvilHuntModal`（經由 `openActivity('evil')`） | `data/merit.js` |
| `enterWorld` | `data/title-screen.js` |
| `retryLoadAfterFailure`, `showRawSaveForCopy`, `abandonSaveAndStartNew`（讀檔失敗視窗） | `data/save.js` |
| `switchTab`, `openAscensionPlatform`, `showUnderConstruction`（洞府主畫面） | `data/home-ui.js` |
| PC 版洞府的所有按鈕與建築熱點（onclick 字串寫在 `config-home-pc.js` 的 `pcStageButtons[].action`，改名函式時要一起改） | 各功能檔 |
| `openSettingsModal`（洞府右上 ⚙️、PC 版「設置」）、`setDisplayMode(mode)`、`toggleFullscreen`（後兩者由 `renderSettingsModal()` 動態產生） | `data/settings.js` |
| `openAvatarModal`（點洞府頭像）、`selectAvatar(id)`（選擇視窗內動態產生） | `data/avatar.js` |
| `chooseGender` | `data/main.js` |

## 5. 新增功能的建議流程

1. **新增資料（怪物/裝備/宗門/商品…）**：優先修改對應的 `data/config-*.js`，不要動邏輯檔。
2. **新增彈窗/系統玩法**：比照現有模式新增一支 `data/新功能.js`（`open高X高Modal` + `render高X高` + 互動函式），
   在 `index.html` 對應位置加上按鈕與彈窗 DOM，並在 `<script>` 清單中加入 `<script src="data/新功能.js"></script>`
   （放在 `state.js`/`ui.js` 之後、`main.js` 之前即可，除非新檔案有頂層立即執行的程式碼且依賴其他資料）。
3. **修改屬性公式**：只改 `data/stats.js`。
4. **修改存檔結構**：修改 `data/state.js` 的 `player` 初始值，並檢查 `data/save.js` 的
   `loadLocal`/`importSave` 是否需要補上舊存檔缺欄位時的預設值（目前已有 `gender`/`name`/`stats.cha`/`studyCounts`/`pendingTribulation`/`tribulationCount` 的相容處理，
   以及 `migrate*()` 系列：僕從任務、裝備欄位、活動欄位、`migrateCurrentMap()`（所在地圖改指向最新設定，已刪除的地圖回到宗門）、`migrateProgressionFields()`（等級/壽元/宗門技能/靈寵）。
   讀檔與匯入都走 `applySaveData(data)`，它會把存檔合併到**全新角色的預設值**（`state.js` 的 `DEFAULT_PLAYER_JSON`）上，
   **不是**合併到目前的 `player`——否則遊戲中匯入缺欄位的舊存檔，會沿用目前角色的等級、宗門技能等資料（曾發生過）。
   ⚠️ 因為已合併過預設值，**判斷「存檔裡原本有沒有這個欄位」要看原始 `data`，不能看 `player`**，
   否則預設值（例如壽元 60）會蓋過應補的值。新增的 `migrate*()` 一律加進 `applySaveData()`，讀檔與匯入就會同時生效。
5. **新增畫面元素時**：先確認電腦版排版，再到 `index.html` 的 media query 區塊
   （第 6 節）補上手機版的調整，避免手機出現破版或水平捲動。
6. **完成任何修改後，回來更新本檔案（ARCHITECTURE.md）對應章節。**

## 6. 版型與 RWD 規則（電腦版 / 手機版）

> ⚠️ **2026-09-24 起主畫面改為「洞府」舞台版面（第 31 節）**：舊的三欄 `#game-container` 已搬進舞台內的分頁區 `#tab-sheet`，
> 各面板依 `data-tab` 分到修仙／戰鬥／宗門／世界分頁，不再是三欄。本節下方的三欄與 `nth-of-type` 排序規則仍留在 CSS 內，
> 但已被 `<style>` 最後的舞台樣式覆蓋；**新增畫面元素請依第 31 節的做法**。彈出視窗（`.modal-bg`）的 RWD 規則照舊有效。

所有樣式集中在 `index.html` 的 `<style>` 內，分成兩段：

1. **共用 / 電腦版樣式**（檔案前半，`@media` 之前）：原本的三欄式版型，未加任何條件，行為與改版前完全相同。
2. **手機 / 平板樣式**（檔案末端，兩個 `@media` 區塊）：**只在窄螢幕生效**，因此不會影響電腦版。

| 斷點 | 目標裝置 | 主要調整 |
|---|---|---|
| `@media (max-width: 900px)` | 手機、平板直式 | 三欄 `300px 1fr 300px` → 單欄；用 `order` 重排為 **狀態列 → 戰場實況 → 角色/地圖 → 宗門設施**；狀態列改直式堆疊（境界/戰力、靈石/聲望各自橫向排）；按鈕加大為觸控尺寸並取消 hover 位移；彈窗寬度 94%、卡片自動排成雙欄；靈寶閣雙按鈕改上下排列；鍛造閣下拉選單改整列（×1/×10/最高 按鈕由 `.batch-btns` 自動排成一列，不需額外規則） |
| `@media (max-width: 480px)` | 一般手機（360–430px） | 進一步縮小 padding、字級、日誌高度、頭像尺寸，卡片最小寬度降為 135px 以維持雙欄 |

維護注意事項：

- **不要為了手機去改電腦版的既有規則**；所有手機調整一律寫進 media query 內，這是「手機有自己的 UI、電腦版不受影響」的前提。
- HTML 內有不少**行內樣式**（如 `style="width: auto; margin-left: 10px;"`）。行內樣式優先權高於 CSS，
  若手機版需要覆蓋它，必須在 media query 內使用 `!important`（目前 `#battle-player-icon img`、
  狀態列子項的 `margin-top` 即是這種情況）。新寫的按鈕盡量用 class 而非行內樣式，就不需要 `!important`。
- `#game-container > div:nth-of-type(n)` 依賴四個直接子元素的順序（header / 角色欄 / 戰場欄 / 設施欄）。
  若之後在 `#game-container` 內新增或調換區塊，必須同步更新 media query 內的 `order` 規則。
- 驗證方式：瀏覽器開發者工具切換 375px、360px 與 >900px 三種寬度，確認
  `document.documentElement.scrollWidth === clientWidth`（無水平捲動），且電腦版維持三欄。

## 7. 渡劫系統（心魔試煉）

**從「築基 → 金丹」開始**，小境界修滿 10 階後不會自動晉升，必須擊敗心魔才能進入下一個大境界。
門檻由 `config-tribulation.js` 的 `TRIBULATION_MIN_REALM_INDEX`（預設 2 =【築基】）控制；
在此之前（凡人 → 煉氣、煉氣 → 築基）滿 10 階會直接突破，溢出的經驗會保留到新境界。

| 環節 | 位置 | 說明 |
|---|---|---|
| 修為封頂 | `leveling.js` 的 `gainExp()` | 小境界到 10 階且經驗滿格時：若 `realmIndex >= TRIBULATION_MIN_REALM_INDEX` 則 `pendingTribulation = true`，之後 `gainExp()` 一律回傳 0（經驗完全停止累積，含離線收益）；未達門檻則直接呼叫 `advanceRealm()` 突破並保留溢出經驗 |
| 渡劫按鈕 | `index.html` 的 `#btn-tribulation` + `ui.js` 的 `updateTribulationUI()` | 只在待渡劫時顯示，並即時顯示目前勝算；渡劫進行中改為顯示心魔剩餘氣血並鎖定 |
| 勝算計算 | `tribulation.js` 的 `getTribulationChance()` | 基礎 + 丹藥 + 技能，上限 80%（見下方） |
| 天命擲骰 | `triggerTribulation()` | 確認視窗列出勝算明細與提升建議；開打時 `tribulationFatedWin = Math.random() < 勝算`（`state.js`，不存檔） |
| 心魔數值 | `config-tribulation.js` | 戰力 = 玩家 100%（`HEART_DEMON_POWER_MULT`）、氣血 = 玩家 100%（`HEART_DEMON_HP_MULT`）、4 個魔功技能；只影響戰鬥過程的觀感 |
| 戰鬥流程 | `tribulation.js` 的 `tribulationTick()` | 由 `combat.js` 的 `combatTick()` 在 `inTribulation` 為 true 時接管，暫停掛機、刷怪與宗門任務。戰況與天命相反時在關鍵一刻收尾：天命勝卻將戰死 →「絕處逢生」判勝；天命敗卻將擊殺心魔 →「心魔反噬」判敗 |
| 成功 | `endTribulation(true)` → `leveling.js` 的 `advanceRealm()` | 晉升大境界並給予屬性獎勵，`pendingTribulation` 解除、經驗恢復累積 |
| 失敗 | `endTribulation(false)` | **視同死亡**：先呼叫 `handlePlayerDeath()` 折壽並使靈寵陣亡（壽元歸零即遊戲結束），再損失 10% 靈石、氣血歸 1、回到安全區；接著 `applyTribulationFailDrop()` **境界跌落並陷入虛弱**（見下方） |

**渡劫失敗的境界懲罰（`config-tribulation.js`）**：
- **跌落**：小境界掉 `TRIBULATION_FAIL_STAGE_DROP`(3) 階（10 階 → 7 階，不低於 1 階，大境界不倒退）、修為歸零、`pendingTribulation` 解除——
  **必須重新修回 10 階才能再次渡劫**。同時扣回這幾階升階時加的屬性（每階四維 -5、魅力 -2），避免「失敗→重升」刷屬性。
- **虛弱**：`player.weakened = true`，`stats.js` 的 `getWeaknessMult()` 讓**物理／術法攻擊、氣血上限、靈力上限 × `WEAKNESS_STAT_MULT`(0.7)**（-30%）。
  `leveling.js` 的 `gainExp()` 在小境界升回 10 階時解除並寫日誌；轉世也會解除。渡劫只能在 10 階發起，所以心魔的戰力／氣血不會吃到虛弱。
- **顯示**：洞府名牌「金丹 7階・虛弱」轉紅（`.hud-realm.weak`，滑鼠移上去有說明）、修仙分頁境界旁「虛弱 -30%」標籤、戰場實況「😵虛弱」；
  渡劫確認視窗也會事先警告這項懲罰。
- ⚠️ 平衡注意：依新修煉節奏（第 26 節），第 8～10 階佔一個境界約一半的修煉時間（(8+9+10)/55 ≈ 49%），
  例如渡劫期失敗約要重修 15 天。若太嚴苛，可調小 `TRIBULATION_FAIL_STAGE_DROP`。

**勝算規則**（`config-tribulation.js` 的 `TRIBULATION_*` 常數）：

| 項目 | 加成 | 條件 |
|---|---|---|
| 基礎 | 60% | 無 |
| 合體期後天劫加劇 | -5% ～ -30% | `realmIndex >= TRIBULATION_HARD_REALM_INDEX`(7 =【合體】，即「合體 → 大乘」起)：每高一境 -5%，最多 -30%（合體 55%、大乘 50%、渡劫 45%、仙人初境 40%、天仙 35%、真仙起 30%）；心魔戰力同步 ×(1 + 扣除量)。由 `getTribulationHardPenalty()` 計算，確認視窗會列出這一項 |
| 丹藥準備 | 最多 +10% | 需開啟【自動補血】；背包氣血丹藥「回復量 × 數量」總和 ÷ 3.0（10 顆九轉還魂丹／30 顆培元丹／60 株凝血草即拿滿） |
| 宗門技能 | 最多 +10% | 目前境界已開放的宗門階段中已學會的比例（築基只開放初級；金丹起開放中級；仙人初境起開放高級） |
| 破障丹 | +10% | 背包有破障丹時，渡劫開打自動服用 1 顆（`config-merit.js`），並讓心魔戰力 ×0.9 |
| 上限 | 80%（服用破障丹時 90%） | `TRIBULATION_MAX_CHANCE` / `BREAK_PILL_MAX_CHANCE`；合體期後的扣除量是先從基礎扣，所以實際可達上限也跟著降低（例：真仙全滿 30+10+10+10 = 60%） |

- 確認視窗在**沒有破障丹**且功德系統開放（`isMeritSystemOpen()`）時會提醒「沒把握？可至千寶閣以七彩補天石購買破障丹」；有破障丹時列出 +10% 並註明服用後剩幾顆。

**為什麼不用純數值平衡**：模擬顯示渡劫結果幾乎由數值決定，勝率曲線非常陡——
調到「無藥約 60%」時，帶滿藥必定 99～100%；且學到越多階段技能越容易（同設定下真仙比築基高約 40 個百分點）。
無法同時做到「基礎 60%、準備後不超過 80%」，因此改成開打前擲骰。
實測每種情境各 1000 場，實際勝率與顯示勝算誤差在 ±3% 內（抽樣誤差），平均 13～17 回合分出勝負。
調整勝算只需改 `TRIBULATION_*` 常數，**不受宗門技能倍率或屬性數值影響**。

## 8. 丹藥與冷卻規則

- 回復量（`config-shop.js` 的 `amount`）：凝血草 5%／培元丹 10%／九轉還魂丹 30%；聚氣散 5%／回天靈液 10%／造化神髓液 30%。
- **使用冷卻**：`POTION_COOLDOWN_SECONDS = 5`。氣血類與靈力類**各自獨立**計時
  （全域變數 `potionCooldownHp` / `potionCooldownMp`，在 `combatTick()` 開頭每秒遞減）。
  手動使用（`bag.js`）與自動輔助（`combat.js`）共用同一組冷卻。
- **分區顯示**：丹藥堂依 `config-shop.js` 的 `shopSections` 分成「氣血丹藥／靈力丹藥」兩區，
  中間以分隔線隔開（`shop.js` 的 `renderShop()` 產生，每區各自一個 `.grid-container`）。
  新增丹藥類型時只要在 `shopSections` 加一筆即可，不必改 `renderShop()`。
  注意 `#shop-list-container` 本身**不可**再掛 `grid-container` class，格線由各分區自己套用。
- **自動購買限制**：`shopItems` 中標記 `noAutoBuy: true` 的丹藥（九轉還魂丹、造化神髓液，
  即兩個類別各自的最高階丹藥）永遠不會被自動輔助花靈石購買；
  但玩家手動買進背包後，自動輔助仍會優先服用它們。
- 自動輔助的選藥邏輯為「背包內回復量最高者 → 否則買得起且未標記 `noAutoBuy` 的回復量最高者」，
  新增丹藥只要加進 `config-shop.js` 就會自動納入，不需改動 `combat.js`。

## 9. 介面慣例（抽屜、批次刪除、神器欄）

- **大量列表的渲染規則（效能）**：僕從（`renderServants`）與背包裝備（`renderBag`）的數量**沒有上限**，
  長期掛機可累積上千筆。這類列表一律先把每張卡片放進陣列、最後 `container.innerHTML = parts.join("")` 一次寫入，
  **禁止在迴圈內寫 `container.innerHTML += ...`**：每次 `+=` 都會把整個列表重新解析一遍，成本隨數量平方成長。
  實測 600 名僕從用 `+=` 會卡住約 12 秒（玩家回報「點開僕從小屋卡住」即此原因），改寫後只要 33 毫秒，3000 名約 0.2 秒。
  固定少量的列表（宗門、地圖、靈寶閣、裝備欄位）不受影響，但新寫的列表請比照同樣做法。
- **數量上限**：僕從 `MAX_SERVANTS`（`config-servants.js`）、背包裝備 `MAX_EQUIP_INVENTORY`（`config-equipment.js`，不含已穿戴）皆為 100。
  - 僕從：`tryRescueServant()` 已滿時不收留（日誌提示），回傳是否真的救出；離線結算只計算真正救出的人數。
  - 背包：`bag.js` 的 `hasEquipInventorySpace()` 已滿時跳提示並回傳 false。**鍛造、千寶閣、靈寶閣裝備、卸下裝備**
    都在扣靈石／聲望「之前」檢查。穿戴裝備是一換一，不受影響。**日後新增任何會把裝備放進背包的功能，都要先呼叫它。**
  - 舊存檔已超過上限的不會被刪除，只是要先解僱／刪除到上限以下才能再增加。
  - 僕從小屋與背包頂端顯示「目前數量 / 上限」，滿了轉為提示文字。
- **僕從 id**：`tryRescueServant()` 產生 `時間戳_8 碼隨機英數`。離線結算會在同一毫秒內救出多名僕從，
  舊版只用 0～999 的隨機數，id 可能重複，重複時解僱一名會連帶刪掉另一名。

- **技能面板位置**：「當前可用技能」(`#skill-list`) 放在**左欄角色面板、「🛡️ 角色裝備與狀態」按鈕正下方**
  （四維屬性 `.stat-grid` → 裝備按鈕 → 技能面板 → 輪迴次數），不在右側設施欄。內容由 `ui.js` 的 `renderSkillList()` 以 `getElementById` 填入，
  搬移 DOM 位置不需改 JS，只要保留 `id="skill-list"`。
- **抽屜式區塊**：`ui.js` 的 `toggleDrawer(id, btn)` 切換 `.drawer-body.open`。
  「命運與系統」拆成【存檔管理】與【命運抉擇】兩個抽屜，兩者**預設收合**，
  用意是把「轉世輪迴／完全重置」與日常存檔操作隔開，避免誤觸。
  藏書閣視窗內也用同一套抽屜：「第一階段・四維古籍」(`#drawer-library-1`) 與「第二階段・屬性秘典」(`#drawer-library-2`)，
  兩者**預設收合**，點選才展開可學習的秘笈；按鈕樣式為 `.library-drawer-toggle`。關閉視窗再開啟會維持上次的展開狀態。
- **依品級批次刪除**：`ui.js` 的 `renderBulkDeleteBar()` 產生共用工具列，
  搭配 `getCheckedBulkQualities()` / `toggleAllBulkQualities()`。目前兩處使用：
  - 背包裝備 → `bag.js` 的 `bulkDeleteEquipment()`（品級取自 `equipQualities`，**只刪背包內、不動已穿戴的**）
  - 僕從小屋 → `servant.js` 的 `bulkDismissServants()`（品級取自 `servantQualities`，會一併中止其任務）
- **神器欄位**：`equipTypes` 新增 `"神器": "artifact"`。三個相關注意事項：
  1. `NON_FORGEABLE_SLOTS` 讓鍛造閣選單排除神器（神器只能在靈寶閣高級宗門兌換，見第 18 節）。
  2. `getElementCounts()` 會**濾掉 artifact 分類**再統計，神器不影響靈根判定。
  3. `save.js` 的 `migrateEquipmentSlots()` 會替舊存檔補上新欄位，並移除 `equipTypes` 以外的部位
     （舊版「降魔伏虎杖」的部位「杖」不存在，會干擾靈根判定；穿著中的裝備退回背包）。
     **日後再新增部位時，這三處都要一併確認。**（靈根說明視窗的部位數量是依 `equipTypes` 自動計算，不必改）
- **靈根說明（「!」按鈕）**：角色裝備視窗標題旁的 `.info-btn` 呼叫 `equipment.js` 的 `openWuxingInfo()`，
  開啟 `#wuxing-info-modal`（點背景或「知道了」關閉）。內容包含：激活條件、目前靈根、五行相剋、
  各屬性穿戴進度與套數、單屬性／純化／雙屬性／聖靈根對照表、湊裝方式（靈寶閣固定屬性裝備自動從 `lingbaoShopItems` 列出）。
  裝備視窗頂端的 `#wuxing-status-modal` 與說明視窗共用 `formatSpiritRoots()`。
  ※ 土靈根舊標籤寫「防禦 +20%」，但遊戲沒有防禦屬性，實際是總體質 ×1.2，已更正為「體質 +20%」。
- **批次操作（×1 / ×10 / 最高）**：藏書閣、煉丹房、鍛造閣、宗門靈田的每個動作都有三顆按鈕（`.batch-btns`）。
  各功能先算出「目前資源與上限允許的最多次數」，再交給 `ui.js` 的 `resolveBatchCount(qty, 可執行次數, 動作名)`：
  - `'max'`：直接執行最多次數。
  - `×10` 不足 10 次時**不做部分執行**，跳提示並建議改按「最高」。
  - 一次結算、只寫一筆日誌，每日任務進度用 `addDailyProgress(type, n)` 一次加 n。
  - 各功能的上限：藏書閣受每本 100 次上限（第二階段屬性秘典每本 1000 次，且同時受武學積分／靈草／靈石限制）；煉丹房的魅力丹同時受仙品靈草與靈石限制；
    鍛造閣受靈石與**背包空位**（100 件）限制，連續開爐的日誌會統計品質與五行分布。
  - 配方集中在各檔案頂端：`herbRecipes`(field.js)、`pillRecipes`(alchemy.js)、`STUDY_*`(library.js)、`FORGE_COST`(config-equipment.js，每次 10,000 靈石)。

## 10. 活動系統（每日任務 / 千寶閣 / 待實作項目）

所有活動集中在右側「活動」抽屜，按鈕由 `activity.js` 的 `renderActivityList()` 依
`config-activities.js` 產生，並在 `updateUI()` 內每秒重繪，因此解鎖狀態會即時反映聲望與境界變化。

| 活動 | 聲望門檻 | 境界門檻 | 狀態 |
|---|---|---|---|
| 每日任務 | 1,000 | 無 | ✅ 已實作（每 4 小時刷新 10 項） |
| 千寶閣（拍賣場） | 5,000 | 無 | ✅ 已實作（每 3 小時刷新 5 件） |
| 秘境 | 5,000 | 煉虛 | ⏳ 敬請期待 |
| 獵殺邪修 | 8,000 | 金丹 | ⏸️ 已實作但**暫停開放**（`implemented: false`，仍需調整；見第 27 節） |
| 域外天魔（世界BOSS） | 10,000 | 大乘 | ⏳ 敬請期待 |

- **解鎖判定**一律走 `getActivityLockReason()`，未達標會說明缺什麼；
  `implemented: false` 的活動即使達標也只顯示「敬請期待」。
  **新增活動時只要在 `config-activities.js` 加一筆**，按鈕與把關都會自動生效。
- **刷新機制**：兩者都用「下次刷新時間戳」判斷（`dailyRefreshAt` / `auctionRefreshAt`），
  開啟面板時呼叫 `refreshDailyQuestsIfDue()` / `refreshAuctionIfDue()`。
  時間戳存進存檔，所以關掉網頁再回來，倒數仍然正確（不是以「開啟次數」計算）。
- **每日任務進度**：任務池剛好 10 項且每次全用上，各自隨機難度（普通/困難/艱鉅）。
  進度靠各功能呼叫 `addDailyProgress(type, n)` 累加，目前已接上的埋點：
  `kill`(combat.js 擊殺)、`sectQuest`(combat.js 玩家任務 + servant.js 僕從任務)、
  `potion`(bag.js 手動服用 + combat.js 自動補給)、`forge`(equipment.js)、`plant`(field.js)、
  `study`(library.js)、`craft`(alchemy.js)、`rescue`(combat.js)、`buy`(shop.js)、
  `breakthrough`(leveling.js 小境界升階)。
  **新增任務類型時，務必到對應功能補上 `addDailyProgress()`，否則進度永遠是 0。**
- **千寶閣商品**：每個欄位由 `rollAuctionItem()` 先依 `auctionLifePills` 判定是否上架壽元丹，
  沒抽中才交給 `rollAuctionEquip()` 依 `auctionQualityOdds` 抽裝備品質、玩家境界決定數值與售價；
  神器不在拍賣場流通（沿用 `NON_FORGEABLE_SLOTS`）。
- **壽元丹**（`config-daily-quests.js` 的 `auctionLifePills`）：商品物件帶 `kind: "lifePill"`，
  需**同時**支付靈石與聲望，標下後立即服用增加壽元（不進背包）。舊存檔的裝備商品沒有 `kind`，一律當裝備處理。

  | 壽元丹 | 品質 | 續命 | 每欄上架機率 | 靈石 | 聲望 |
  |---|---|---|---|---|---|
  | 普通壽元丹 | 白色 | +10 年 | 10% | 10,000 | 1,000 |
  | 一紋壽元丹 | 綠色 | +20 年 | 8% | 20,000 | 2,000 |
  | 二紋壽元丹 | 藍色 | +30 年 | 5% | 50,000 | 3,000 |
  | 三紋壽元丹 | 紫色 | +50 年 | 3% | 80,000 | 5,000 |
  | 四紋壽元丹 | 橙色 | +100 年 | 1% | 100,000 | 10,000 |

  合計每欄 27% 為壽元丹、73% 為裝備（10 萬次抽樣實測吻合）。

## 11. 遊戲主頁（標題畫面）

- 畫面結構在 `index.html` 的 `#title-screen`，樣式集中在 `<style>` 內同名的區塊，邏輯在 `data/title-screen.js`。
- **滿版呈現**：封面 `#title-art` 使用 `position: absolute; inset: 0` + `object-fit: cover`，
  一定填滿整個視窗，不會有任何未覆蓋區域。
- **橫式／直式兩張封面**：用 `<picture>` + `media="(max-aspect-ratio: 3/4)"` 自動切換，
  直式螢幕（手機）載入 `images/cover-portrait.jpg`，其餘載入 `images/cover.jpg`。
  直式版的構圖原則（重製時請遵守）：
  **人物與場景一律 1:1 原比例貼上，絕不垂直拉伸**（拉伸會產生明顯的模糊色帶，很難看）。
  作法是把原圖裁成 960 寬（保留人物＋標題＋光環）後原尺寸貼在下半部，
  上方天空改用漸層色（由深藍過渡到原圖天空色），再從原圖裁出飛禽靈獸等比縮放、
  橢圓羽化後貼上點綴，愈高處愈淡以模擬空氣遠近感；底部僅做一小段漸層收進遊戲底色。
  ※ 裁切素材時務必避開標題文字與光環所在區域，否則天空會出現文字殘影。
  產生腳本保留在對話紀錄中（使用 .NET System.Drawing），重製時可依上述規則重寫。
- **唯一進入點**：畫面中央光環上的透明按鈕 `#title-hotspot`，除此之外沒有其他按鈕或提示文字。
- **熱區如何對準光環**：因為 `cover` 會裁切，無法用固定百分比對齊，
  改由 `positionTitleHotspot()` 依 cover 縮放公式即時計算：
  `scale = max(容器寬/圖片寬, 容器高/圖片高)`，再加上置中裁切的位移量，
  把「該圖原始座標」換算成螢幕像素。兩張圖各有一組座標：

  | 圖片 | 尺寸 | 光環座標 (x, y, w, h) |
  |---|---|---|
  | `cover.jpg` | 1264 × 843 | 652, 527, 330, 290 |
  | `cover-portrait.jpg` | 960 × 1920 | 632, 1427, 330, 290 |

  `currentTitleHotspot()` 依 `img.currentSrc` 判斷目前載入哪張圖來選用對應座標；
  `positionTitleHotspot()` 會在圖片 `load`、`resize`、`orientationchange` 時重算
  （`<picture>` 切換來源時也會觸發 `load`，所以跨斷點縮放會自動校正）。
  ※ 若日後更換封面圖，只需重新量測光環座標並改 `TITLE_HOTSPOTS`，其餘不必動。
- **啟動時機**：`window.onload` 只呼叫 `initTitleScreen()`，**不會**直接開始遊戲。
  讀檔、性別選擇、離線收益結算全部延後到玩家點擊後才執行（`main.js` 的 `startGame()`）。
- **第一次進入（沒有存檔）**：顯示 `#gender-modal` 性別選擇視窗（男修／女修，含頭像與預設道號），
  **沒有關閉按鈕**，必須選一個才會 `initGame()` 開始遊戲；選完立即存檔，之後進入不會再問。
  以前用 `prompt()` 讓玩家輸入 1/2，按取消或瀏覽器擋掉對話框都會直接變成男性，因此改成視窗。
  頭像與預設道號來自 `ui.js` 的 `PLAYER_AVATARS`。`gameStarted` 旗標防止連點重複啟動主迴圈。
- `<body>` 出廠時就帶著 `class="title-mode"`（CSS 會隱藏 `#game-container` 並鎖住捲動），
  避免遊戲畫面在 JS 執行前閃一下；`enterWorld()` 會移除這個 class。
- `worldEntered` 旗標確保只會觸發一次（避免重複建立 `setInterval`）。

## 12. 門派任務與僕從派遣

任務的**名稱、圖示、獎勵**全部集中在 `config-quests.js` 的 `questData`（以宗門等級 1/2/3 分層）。
任務面板顯示的獎勵與實際發放的獎勵讀取同一份資料，**改數值只需要改這一個檔案**。

| 角色 | 執行條件 | 進度速度 | 結算位置 |
|---|---|---|---|
| 玩家本人 | 必須待在「宗門」（`isInSect()`），離開即自動中斷 | 每秒 `QUEST_PROGRESS_PER_TICK`(1.5) | `combat.js` 的 `combatTick()` |
| 每位僕從 | 在「僕從小屋」各自指派任務，**不受玩家所在地點限制**；每趟依品質付靈石 | 每秒 `1.5 × 該僕從的 mult`（固定耗時任務不乘） | `servant.js` 的 `tickServantQuests()` |

- 僕從資料結構：`{ id, name, quality, mult, quest, timer }`；`quest` 是任務代號（或 `null` 表示閒置），
  `timer` 是該僕從自己的進度，因此多名僕從可同時跑**不同**任務、互不干擾。
- 同時派遣上限為 `MAX_ASSIGNED_SERVANTS`(3)；僅在「從閒置變成接任務」時檢查，單純更換任務不受限。
- 完成一次任務所需時間 = `QUEST_REQUIRED_PROGRESS / QUEST_PROGRESS_PER_TICK` = 20 秒（僕從再除以效率 `mult`）
  （舊版 UI 寫「基礎30秒」是錯的，實際是 20 秒；現在由程式自動算出顯示）。
  有 `duration` 的任務為**固定秒數、不受僕從效率影響**（`getQuestRequiredProgress()`/`getQuestSpeed()`）。
- **任務獎勵（只給道具）**：宗門任務不給靈石，唯一例外是初級宗門「打掃清潔」給 50 靈石。

  | 任務 | 初級 | 中級 | 高級 |
  |---|---|---|---|
  | 打掃／餵養 | 50 靈石 | 10 獸丹 | 50 獸丹 |
  | 種植靈草 | 1 靈草 | 10 靈草 | 50 靈草 |
  | 整理武學秘典 | 1 武學積分 | 10 武學積分 | 50 武學積分 |
  | ⛏️ 礦脈採礦 | — | 1~30 礦石 | 1~30 礦石 |

- **礦脈採礦**（`questData.mine`）：只有中級、高級宗門有；`requiredQuality: "傳說"` → **只有傳說僕從能接**，
  玩家本人不能親自執行（任務面板按鈕顯示「僅限傳說僕從」），其他品質僕從的選單不會出現此任務；
  `duration: 60` 固定 60 秒一趟；每趟隨機 1~30 礦石（`player.ore`，角色資源列顯示）。礦石用於符寶坊煉製符寶（第 28 節）。
  換到沒有此任務的宗門（或品質不符）時，`tickServantQuests()` 會讓僕從自動回到閒置；玩家的 `activeQuest` 同理由 `combatTick()` 中止。
- **派遣花費**（`config-servants.js` 的 `SERVANT_TRIP_COST`）：每趟任務**開始時**依僕從品質扣靈石——
  一般（白）50／優秀（綠）100／稀有（藍）150／史詩（紫）200（需求未指定，暫定）／傳說（橙）300。
  指派（或換任務）時先付第一趟，付不起就無法指派；每趟完成後自動付下一趟，付不起則該僕從停工回到閒置並寫日誌。
  玩家親自執行不需付費。
- 新增任務只要在 `questData` 加一筆；獎勵值可寫 `[最小, 最大]` 表示隨機，`grantQuestRewards()` 會回傳實際獲得的文字供日誌使用。
- **舊存檔相容**：早期版本使用「單一 `activeQuest` + `assignedServantIds` 共同加速」，
  `save.js` 的 `migrateServantAssignments()` 會在讀檔/匯入時把舊結構轉成每位僕從自帶 `quest`/`timer`，
  並移除 `assignedServantIds`。

## 13. 宗門技能（分階段學習、永久保留）

- 宗門分三個階段，對應 `sectData` 每個分類的 `tier`：凡俗 1（初級）/ 修真 2（中級）/ 至高 3（高級）。
- **每個階段只能拜入一個宗門**：`player.sectSkills = { 1, 2, 3 }` 記錄各階段選定的宗門名稱，
  第一次加入時會跳確認並鎖定；之後同階段的其他宗門按鈕會被停用。
- **境界只擋下限，不擋上限**：新拜入時只檢查 `player.realmIndex >= cat.minRealm`，
  **超過 `maxRealm` 仍可補拜入該階段尚未選擇的宗門**（例：金丹前沒加入任何宗門，金丹後仍可回頭挑一個初級宗門，
  否則該階段的 2 招技能就永遠拿不到了）。`cat.maxRealm` 現在只是分類說明用，不再封鎖加入。
  拜入後一律鎖定，**無法退出、也無法改投同階段的其他宗門**。
- **已選定的宗門永遠可以回歸**（`sect.js` 的 `joinSect()`）：**境界檢查只套用在「新拜入」**。
  ⚠️ 舊版把境界檢查寫在最前面，導致境界一旦超過該階段的 `maxRealm`（例：凡俗宗門 `maxRealm: 3`），
  連按自己的宗門都會跳「境界不符合」，晉升並拜入下一階段後就再也回不去舊宗門（玩家回報「加入宗門後就離開宗門了」即此）。
  現在判定順序是：**是不是自己已選定的宗門 → 該階段是否已選別家 → 境界是否達 `minRealm` → 確認並鎖定**。
  宗門列表的按鈕也照這個順序顯示「當前宗門／回歸宗門／此階段已選定【X】／境界不符」，並在頂端列出各階段已選宗門與目前所屬。
- 切換所屬宗門**只改變經驗/戰力倍率與設施歸屬，技能不會消失**，所以可以視情況在已選定的宗門之間來回切換。
- **技能永久保留**：戰鬥用的技能由 `stats.js` 的 `getAllSkills()` 依 `sectSkills` 組合（初級→高級）
  再加上靈寶閣的 `learnedSkills`，**不再讀 `player.sect.skills`**。因此換到下一階段宗門時，舊技能仍在，
  最終可同時擁有 3 個門派共 6 招技能。`player.sect` 只決定目前的經驗/戰力倍率與設施權限。
  ※「永久」指同一世內；**轉世輪迴會清空 `sect` 與 `sectSkills`**，下一世可重新選擇各階段宗門（第 25 節）。
- **傷害公式**：技能傷害 = 對應攻擊力 × `mult`，`mult = 1 + SECT_SKILL_BONUS[tier]`
  （初級 150% / 中級 200% / 高級 300%）。`dmgType: "phys"` 用物理攻擊（受**力量**影響），
  `"mag"` 用法術攻擊（受**悟性**影響）。每個宗門各有 1 招力量型、1 招悟性型；全部都是傷害技（單體或群體）。
  **傷害若過高，只需調整 `config-sects.js` 的 `SECT_SKILL_BONUS`**，所有宗門技能會一起生效。
- **數值依據**：+50/100/200% 是在「渡劫仍由戰鬥決定」時，依模擬選出的第一次渡劫約 65% 的數值
  （+10/20/50% 只有 14～18%）。渡劫改成勝算擲骰後（第 7 節），技能倍率只影響野外戰鬥：
  技能觸發率 40%，單體平均輸出比普攻高約 20%／40%／80%，不會出現異常爆量。
- `mult`/`tier` 是在 `config-sects.js` 尾端用迴圈補上的，新增宗門技能時不要手寫 `mult`。
- **耗魔（`mpCost`）已全面調為原本的 3 倍**（宗門技能與靈寶閣武學皆然）：
  初級宗門 45～90、中級 105～150、高級 180～300；靈寶閣武學初級 90～120、中級 180、高級 300～360。
  宗門技能每次都從 `sectData` 讀取，改 `config-sects.js` 即時生效；靈寶閣武學見第 18 節的同步說明。
  靈力不足時該回合自動改為普通攻擊（`combat.js` 的 `playerAttackTurn()`）。
- 舊存檔的 `player.sect` 是整包存進去的舊物件（含舊技能），`migrateProgressionFields()` 會用
  `findSectByName()` 改指向最新設定，並把該宗門登記進 `sectSkills` 對應階段。
- ⚠️ 靈寶閣禁術不受上述倍率限制：《大羅天經》群體 ×5.0、《神魔九變》攻擊 ×4.0 持續 3 回合，
  遠高於宗門高級技能的 ×1.5，若要全面控制傷害需另外調整 `config-lingbao.js`。

## 14. 人物等級

- 與境界是**兩條獨立的成長線**：`player.level`（1～`MAX_PLAYER_LEVEL` 10000）與 `player.levelExp`。
  `gainExp()` 算出最終經驗（含宗門與靈寵倍率）後，會同時餵給 `gainLevelExp()` 與 `gainBeastExp()`，
  **待渡劫時境界修為暫停，但人物等級與靈寵等級仍繼續成長**。
- 每升 1 級：力量/體質/悟性/靈力各 +1（直接加進 `player.stats`），
  生命上限 +10、靈力上限 +5（在 `getMaxHp()`/`getMaxMp()` 以 `(level-1) × 10 / × 5` 計算，不寫入 stats）。
  ※ 體質/靈力 +1 本身也會讓生命 +10 / 靈力 +10，所以實際每級是生命 +20、靈力 +15。
- 升級不會補滿氣血（避免戰鬥中連續升級變相無敵）。
- 經驗曲線（`config-level.js` 的 `LEVEL_EXP_SEGMENTS`）：每級所需 = 係數 × 等級^1.5

  | 等級區間 | 係數 | 累積到區間末的總經驗 |
  |---|---|---|
  | Lv1～99 | 100 | 約 400 萬（Lv100） |
  | Lv100～999 | 300 | 約 38 億（Lv1000） |
  | Lv1000～4999 | 1000 | 約 6,980 億（Lv5000） |
  | Lv5000～10000 | 3000 | 約 10.6 兆（Lv10000） |

  以擊殺經驗估算：天南（每殺約 4,500）約可練到 Lv100 附近；禁區可推到數千級；
  Lv10000 需在最高戰場（每殺約 500 萬）長期掛機。
- 等級與壽元、戰力無掛鉤（戰力不影響壽元）。轉世輪迴會把人物等級**重置為 Lv1**（見第 25 節）。

## 15. 壽元

- `player.lifespan`（年），數值表在 `config-lifespan.js` 的 `lifespanByRealm`（索引對應 `realms`）。
  凡人初始 60 年；`advanceRealm()` 晉升時呼叫 `gainRealmLifespan()` 加上該境界的 `gain`
  （包含築基以前不需渡劫的自動突破）。
- 壽元會因兩件事減少：**歲月流逝**（有底線，見下方）與**死亡**。與戰力無關。
  死亡點：`combat.js` 野外戰死、`tribulation.js` 渡劫失敗，皆呼叫 `handlePlayerDeath()`：依**當前境界**的 `deathCost` 折壽，並讓所有靈寵陣亡。
- **歲月流逝（方案一＋三混合）**：`combatTick()` 每秒呼叫 `ageLifespan(1)`；離線結算呼叫 `ageLifespan(離線秒數, LIFESPAN_OFFLINE_RATE)`。
  - 每分鐘流逝 = 目前境界的 `gain` ÷（`getAgingHours()` × 60）× 所在地倍率。
    `getAgingHours(境界)` = max(`LIFESPAN_MIN_AGING_HOURS` 6, 修煉時數 × `LIFESPAN_PACE_MULT` 5 × 主要地圖的所在地倍率)，
    修煉時數與主要地圖取自 `config-realms.js` 的 `realmPacing`（第 26 節）。
    → **在該境界的主要地圖掛機，一個境界給的壽元約可撐「修滿該境界所需時間」的 5 倍**；前期（凡人）至少維持安全區 6 小時。
    改修煉時數時壽元會自動跟著對齊，不需另外調整。
  - 所在地倍率 `LIFESPAN_DANGER_MULT`：安全區 ×1、野外 ×1.5、開放世界 ×2、禁區 ×3、至高戰場 ×4；渡劫中 ×4。離線 ×0.5（倍率依離線時所在地）。

    | 境界 | 主要地圖 | 修滿約需 | 壽元在主要地圖可撐 | 底線 |
    |---|---|---|---|---|
    | 凡人 | 靈山大川 | 0.5 時 | 4 時（下限 6 時×安全區） | 3 年 |
    | 金丹 | 上古遺跡 | 3 時 | 15 時 | 15 年 |
    | 化神 | 亂星海 | 10 時 | 50 時 | 15 年 |
    | 渡劫 | 鬼谷八荒 | 30 天 | 150 天 | 30 年 |
    | 大羅金仙 | 仙界戰場 | 200 天 | 1,000 天 | 150 年 |

  - 後期流逝很慢（每分鐘不到 0.1 年），`#lifespan-rate` 會自動改以「年/時」顯示。
- **年齡（當前壽命）**：`player.age`，新角色與轉世後從 `LIFESPAN_START_AGE`(16) 歲起算，`ageLifespan()` 依**實際流逝的年數**同步增加，
  `handlePlayerDeath()` 的死亡折壽也同樣加進年齡（重傷折壽 = 老了 N 歲）。
  因此恆成立：**年齡 = 16 + 累計損失的壽元（流逝＋折壽）**；觸底歲月停止時年齡也停住，突破境界或壽元丹增加壽元不影響年齡。舊存檔沒有此欄位，由 `DEFAULT_PLAYER_JSON` 補 16 歲。
  頂部狀態列在剩餘壽元前顯示「當前壽命：X 歲」（`#age-display`）。
  - **底線** `getLifespanFloor()` = 目前境界 `deathCost × LIFESPAN_FLOOR_DEATHS(3)`：剩餘壽元觸底後自然流逝**完全停止**（線上、離線都一樣）。
    **時間永遠不會直接害死玩家**，只有死亡會；但觸底後再死 3 次就身死道消，形成「越接近底線越不敢冒險」的緊張感。
  - 提示（`checkLifespanWarnings()`，各只出現一次，壽元回升後重置）：剩餘 ≤ 底線×2 時「壽元日漸枯竭」；觸底時「壽元將盡，再死亡 3 次便身死道消」。
  - 壽元可能帶小數，所有顯示一律經 `formatLifespan()` 取整數。
  - 恢復方式：突破境界（加上新境界的 `gain`，底線也會跟著新境界調整）或千寶閣壽元丹。
  - ⚠️ 平衡注意：壽元丹是固定年數（+10～+100 年），後期境界的 `gain` 以萬年計，效果相對有限。
    若後期玩家常卡在底線，可考慮讓壽元丹改為「目前境界 gain 的百分比」。
- **壽元歸零 → `triggerLifespanGameOver()`**：設 `gameOver = true`（`combatTick()` 停止、`saveLocal()` 不再寫入）、
  刪除 `localStorage` 存檔、跳出提示後重新整理，回到標題畫面以新角色開始。
- 需求表的「仙王／仙帝」在遊戲中不存在，對應方式：大羅金仙＝仙王（+20000 / -50）、混元大羅金仙＝仙帝（+50000 / -100）；
  需求表沒有的境界補值：仙人初境 +4000 / -15、天仙 +4500 / -15、混沌道祖 +100000 / -200。
- 轉世輪迴時壽元重設為凡人的 60 年。舊存檔沒有壽元欄位時，依目前境界補上累積值（`getInitialLifespanForRealm()`）。
- 頂部狀態列 `#lifespan-display` 顯示剩餘壽元（綠 → 剩餘 ≤ 底線×2 轉黃 → 觸底轉紅），
  旁邊的 `#lifespan-rate` 顯示目前流逝速度（例「⌛-2.1年/分」，在野外轉橘色；觸底顯示「（歲月已止）」）；
  滑鼠移上去顯示本境界的折壽量與底線。

## 16. 靈寵（靈獸園）

- 兌換費用（`config-beasts.js`，靈石仍套用魅力折扣）：靈幻狐 1000 獸丹 + 10000 靈石、
  青蒼狼 3000 + 30000、九幽蛟龍 5000 + 50000。被動加成（經驗/戰力）只在靈寵**出戰中**（存活且未召回休息）時生效（`hasLiveBeast()` → `isBeastActive()`）。
- 資料結構：`player.beasts = [{ id, level, exp, alive, active, upkeepTimer, skills }]`，`skills` 為 6 格、存放已選的五行屬性（或 `null`）。
  舊存檔的字串陣列（`['fox', ...]`）由 `migrateProgressionFields()` 轉成 Lv1 靈寵；缺 `active`/`upkeepTimer` 的補成出戰中、計時 0。
- **維持費（出戰／休息）**：每隻出戰中的靈寵各自計時（`b.upkeepTimer`，隨存檔保存），每滿 `BEAST_UPKEEP_INTERVAL`(60) 秒扣一次，
  費用依**該靈寵的等級**查 `beastUpkeepTiers`：

  | 靈寵等級 | 每 60 秒 |
  |---|---|
  | Lv1～99 | 2,000 靈石＋50 獸丹 |
  | Lv100～299 | 5,000 靈石＋100 獸丹 |
  | Lv300～499 | 20,000 靈石＋150 獸丹 |
  | Lv500 以上 | 50,000 靈石＋200 獸丹 |

  - 線上：`combat.js` 的 `combatTick()` 每秒呼叫 `tickBeastUpkeep()`（在渡劫接管之前，所以渡劫中也計費）。
    付不起（靈石或獸丹任一不足）→ `restBeastForUpkeep()` 自動召回休息並寫日誌，不會部分扣款。
  - 離線／背景補發：`settleIdleSeconds()` 結尾呼叫 `settleOfflineBeastUpkeep(秒數)`，在離線靈石入帳後逐次扣，付不起就從那一刻召回；
    離線經驗加成以離線**開始時**的出戰狀態計算（簡化）。
  - 靈獸園可手動「召回休息／出戰」（`toggleBeastActive()`）；休息中不收費、不給被動、不出手、不累積經驗。
    計時存在靈寵身上，召回只是暫停，再出戰時接續，**反覆切換無法躲費用**。出戰前會檢查付得起一次費用。
  - 陣亡的靈寵不計費；復活後維持原本的出戰／休息狀態。
- **等級**：兌換後一律 Lv1；與人物共用經驗（`gainBeastExp()`，同一條經驗曲線），
  **等級不可超過人物等級**，到達上限後經驗不再累積。
- **技能**：Lv30 / 60 / 100 / 300 / 500 / 1000（`BEAST_SKILL_LEVELS`）各領悟一招，
  每一格可自由選擇五行方向，第 N 格選某屬性就學會該屬性的第 N 招（`beastSkillTree`），選定後不可更改。

  | 屬性 | 類型 | 效果範圍（第 1 招 → 第 6 招） |
  |---|---|---|
  | 金 | 單體傷害 | 人物物理攻擊 × 20% → 100% |
  | 木 | 增益 | 人物攻擊 × 1.10 → × 1.50，持續 3～4 回合 |
  | 水 | 治療 | 立即回復 / 群體（氣血＋靈力）/ 持續回復，5%～18% |
  | 火 | 群體傷害 | 每隻 人物物理攻擊 × 12% → 60% |
  | 土 | 防禦守護 | 受到傷害 -10% → -40%，持續 3～4 回合 |

- **戰鬥**：靈寵沒有氣血，不會被攻擊。**所有出戰中的靈寵**每回合各以 `BEAST_SKILL_CHANCE`(30%) 機率施展一招已學技能
  （`petAssistTick()`，野外與渡劫都會觸發）。木/土/水的持續效果存在 `state.js` 的 `petBuff*`/`petShield*`/`petRegen*`，
  同類效果取最高值、不疊乘；木屬性增益在 `getPhysAttack()`/`getMagAttack()` 生效，土屬性減傷由 `applyPetDamageReduction()` 套用。
- **陣亡與復活**：玩家死亡時所有靈寵立即陣亡（`killAllBeasts()`），輔助效果清空；
  陣亡（或休息中）的靈寵不出手、不給被動、不累積經驗。在靈獸園每隻消耗 `BEAST_REVIVE_COST_CORE`(5000) 獸丹復活。
- 靈寵的攻擊**不經過** `resolveHit()`（不受怪物閃避/減傷影響，也不觸發屬性傷害），見第 17 節。

## 17. 戰鬥屬性（減傷／閃避／屬性傷害／五行相剋）

設定在 `config-elements.js`，引擎在 `elements.js`。**玩家、怪物、心魔完全套用同一套規則**。
※ 這裡的「冰/火/毒/金/雷 屬性傷害」與裝備上的「五行」（金木水火土，用於靈根與五行相剋）是**兩套不同系統**，UI 以「冰傷／火傷／毒傷／金傷／雷傷」區分。

| 屬性 | 效果 | 玩家上限 |
|---|---|---|
| 🛡️ 減傷 `def` | 受到的傷害 -N% | 60% |
| 💨 閃避 `eva` | N% 機率完全閃過一擊（物理、術法都可閃） | 40% |
| ❄️ 冰傷 `ice` | N% 機率凍結目標 1 回合（該回合無法行動） | 50% |
| 🔥 火傷 `fire` | N% 機率燒傷：每層每回合扣「施放者攻擊力 × 15%」，**最多 3 層**、持續 3 回合 | 50% |
| ☠️ 毒傷 `poison` | N% 機率中毒：每層每回合扣「施放者攻擊力 × 8%」，**最多 5 層**、持續 3 回合 | 50% |
| ⚔️ 金傷 `metal` | N% 機率重擊：該次傷害 ×2（大量物理傷害） | 50% |
| ⚡ 雷傷 `thunder` | N% 機率雷擊：該次傷害 ×1.3，且**無視目標減傷** | 50% |

- **單位**：全部以 % 存在裝備的 `stats` 內（`def: 8` = 減傷 8%），由 `getEquipBonus()` 加總、`getPlayerCombatAttrs()` 套上限。
  燒傷/中毒再次命中會「疊一層並刷新回合數」，每層傷害取較高者。
- **單次命中結算順序**（`resolveHit()`）：閃避 → 藏書閣屬性秘典（本命五行、目標凍結中）→ 金重擊 → 雷擊 → 五行相剋 → 減傷（雷擊時略過）→ 附加冰/火/毒狀態。
  屬性秘典的加成放在攻擊方 `attrs.book`（只有 `getPlayerCombatAttrs()` 會帶，怪物沒有），詳見第 24 節。
- **回合流程**（`combat.js`）：
  1. 玩家先結算自身燒傷/中毒（`tickStatus(playerStatus)`），被凍結則本回合不出手。
  2. 玩家普攻/技能（`playerAttackTurn()`，渡劫也共用），每一擊都經 `resolveHit()`；範圍技對每隻怪各自判定。
  3. 靈寵協助（不經 `resolveHit()`）。
  4. 每隻怪物結算自身燒傷/中毒，並記錄是否被凍結。
  5. 擊殺結算。
  6. 存活且未凍結的怪物**逐隻**攻擊玩家（經 `resolveHit()`：玩家的閃避/減傷生效、怪物的屬性傷害可施加在玩家身上），
     最後再套用靈寵土屬性減傷。
  - 日誌每回合只彙整一行（例：「✨ 屬性效果：❄️凍結 🔥燒傷×2｜持續傷害 1,200」），避免洗版。
  - 回到安全區、戰死、渡劫結束時，玩家身上的狀態全部清除（`playerStatus = newStatus()`）。
- **玩家來源**：
  - 鍛造閣／千寶閣（`equipment.js` 的 `generateEquipStats()`，兩邊共用）：
    武器隨機帶一種屬性傷害（冰/火/毒/金/雷，`AFFIX_TYPES`）、防具帶減傷、飾品帶閃避，數值依品質（`equipQualities` 的 `affix`/`def`/`eva`）。
    例：6 件橙色防具 = 減傷 24%，5 件橙色飾品 = 閃避 15%，武器同屬性可疊加到上限 50%。
  - 靈寶閣寶物（第 18 節）數值更高；靈寶閣武學自帶 `effect: { type, chance }`，施展時與裝備取較高者，**不受 50% 上限限制**。
  - 舊裝備沒有這些欄位，一律視為 0。
- **怪物來源**（`rollMonsterAttrs()`，依所在地圖分類 `monsterAttrsByMapCategory`）：

  | 地圖分類 | 減傷 | 閃避 | 帶異屬性的機率 | 觸發率 |
  |---|---|---|---|---|
  | 二、野外歷練 | 0% | 2% | 30% | 5% |
  | 三、開放世界 | 5% | 4% | 50% | 10% |
  | 四、上古禁區 | 10% | 6% | 70% | 15% |
  | 五、諸天戰場 | 15% | 8% | 90% | 20% |

  - 每隻怪物隨機一種**五行**（ttrs.element，五種機率相同）。
  - 怪物的**異屬性**只會是冰／毒／雷（`MONSTER_AFFIX_TYPES`），不再帶火傷、金傷（火、金已屬於五行）；玩家武器仍可帶全部五種。
- **心魔**：開打時複製玩家當下的戰鬥屬性與本命五行（鏡像，同五行所以不相剋）。渡劫勝負仍由勝算擲骰決定（第 7 節），屬性只影響過程。
- **顯示**：角色面板四維下方的 `#combat-attr-display` 列出本命五行＋七項數值（滑鼠移上去看效果說明／相剋關係）；
  戰鬥實況在氣血旁顯示雙方狀態（❄️凍結、🔥×層數、☠️×層數）；玩家名稱後顯示本命五行（例「韓立【火】」），怪物欄第二行彙整五行與異屬性（例「五行 火×2 金×1｜⚡雷×1」）；裝備卡片用 `formatEquipStats()` 只列出非 0 屬性。

### 五行相剋

- 相剋關係（`config-elements.js` 的 `WUXING_COUNTERS`，key 剋 value）：**木剋土、土剋水、水剋火、火剋金、金剋木**。
- **本命五行**（`stats.js` 的 `getPlayerElement()`）：已穿戴裝備（不含神器）中數量最多的五行；同數時取部位順序（`equipTypes`，武器在前）最先出現者；
  沒穿裝備則為 `null`，不參與相剋。五行聖靈根則完全免疫相剋（見第 21 節）。
- **效果**（`elements.js` 的 `getWuxingCounterMult()`，在 `resolveHit()` 內套用，玩家與怪物雙向對稱）：
  攻擊方剋制防守方 → 傷害 ×1.3（`WUXING_COUNTER_BONUS`）；攻擊方被防守方剋制 → 傷害 ×0.7（`WUXING_COUNTERED_PENALTY`）；其餘 ×1。
  例：本命火打金怪 +30%、金怪打你 -30%；本命火遇水怪則反過來。
- 只影響直接命中；燒傷/中毒的持續傷害、靈寵攻擊（不經 `resolveHit()`）不受五行影響。
- 日誌標籤：`counter`「☯️五行剋制」、`countered`「☯️五行被剋」。五行說明視窗（`openWuxingInfo()`）也有一段相剋說明。

## 18. 靈寶閣（三階段戰略級寶物）

- 商品在 `config-lingbao.js`：三個階段（初級／中級／高級宗門）各 **2 件寶物＋2 部武學**，高級宗門另有 5 件神器，共 17 件。
- **兌換條件**：必須已拜入該階段的宗門（`player.sectSkills[tier]`），並**同時**支付靈石與聲望：

  | 階段 | 靈石 | 聲望 |
  |---|---|---|
  | 初級宗門 | 100,000 | 10,000 |
  | 中級宗門 | 500,000 | 100,000 |
  | 高級宗門 | 1,000,000 | 500,000 |

- **唯一性**：兌換後 id 記入 `player.lingbaoSold`，該商品永久顯示「已兌換（不再補貨）」。轉世輪迴不會重置。
- **品階保證「高一階一定更好」**：同部位裝備每一項數值都更高（劍：玄鐵重劍 → 紫電青霜劍 → 誅仙劍；
  盔甲：赤焰護心甲 → 玄武鎮獄甲），武學倍率逐階提高（初級 180～200% → 中級 260～350% → 高級 400～600%）。
  **新增或調整商品時請維持這個原則**。
- **神器**（`category: "artifact"`）：共 6 件，全部在高級宗門靈寶閣兌換（價格同高級階段、各自唯一），裝在神器欄、不計入五行與靈根判定。
  神器欄只有一格，所以各件**走不同路線**（四維總量都約 8 萬、戰鬥屬性約 30～40 點），避免任何一件完全取代其他件：

  | 神器 | id | 定位 | 屬性 |
  |---|---|---|---|
  | 混沌鐘 | `lb3_artifact` | 均衡防禦 | 四維各 2 萬、減傷 20%、閃避 10% |
  | 三世銅棺（九龍拉棺） | `lb3_artifact_coffin` | 極致守護 | 體質 4.5 萬（其餘 1～1.5 萬）、減傷 30%、閃避 5% |
  | 荒天帝大羅劍胎 | `lb3_artifact_sword` | 極致物理 | 力量 4.5 萬（其餘 1～1.5 萬）、金傷 25%、雷傷 15% |
  | 萬物母氣鼎（天帝鼎） | `lb3_artifact_cauldron` | 四維最高 | 四維各 2.2 萬、減傷 10%、火傷 20% |
  | 吞天魔罐（狠人大帝） | `lb3_artifact_jar` | 極致術法 | 悟性 4.5 萬（其餘 1～1.5 萬）、毒傷 25%、冰傷 15% |
  | 無始鐘（一見無始道成空） | `lb3_artifact_wushi` | 極致閃避 | 四維各 1.8 萬、閃避 25%、減傷 10% |

  新增神器時請比照這個預算，並在描述寫明定位。
- 裝備兌換前會檢查背包空位（`hasEquipInventorySpace()`），不足時不扣資源。
- 舊版靈寶閣商品（降魔伏虎杖、紫電青霜劍〔舊〕、太素霓裳羽衣、神魔九變、大羅天經）已下架；
  已購買的玩家仍保有物品與技能（技能存在 `learnedSkills` 內，技能列表標示為「[靈寶閣]」）。
- **舊禁術已下修到新標準**：舊版售價僅 1～1.5 萬靈石，遠低於新版初級的 10 萬，因此由 `migrateLegacySkills()`
  依 `legacySkillAdjustments` 於每次讀檔／匯入時校正（結果固定，重複套用不會越改越低）：

  | 技能 | 舊數值 | 新數值 |
  |---|---|---|
  | 大羅天經 | 群體 ×5.0、耗魔 80 | 群體 ×1.8、耗魔 120（同初級《烈火刀法》，但無屬性效果） |
  | 神魔九變 | 攻擊 ×4.0、3 回合 | 攻擊 ×1.5、3 回合、耗魔 150（與靈寵木屬性最高階相同） |

- **已兌換武學的耗魔同步**：兌換時是把 `skillData` 複製一份存進 `player.learnedSkills`，
  所以 `migrateLegacySkills()` 讀檔／匯入時也會依名稱從 `lingbaoShopItems` 取回最新的 `mpCost`。
  **日後調整靈寶閣武學耗魔只要改 `config-lingbao.js`**，舊存檔自動生效（其他欄位如倍率目前不會同步）。

- 舊版「降魔伏虎杖」的部位「杖」不在 `equipTypes` 內（鍛造閣選單由 `equipTypes` 產生，**從來沒有「杖」選項**）。
  讀檔時會移除這個欄位、把杖退回背包，且 `equipItem()` 會拒絕穿戴 `equipTypes` 以外的部位，見第 9 節神器欄位。

## 19. 存檔代碼（匯出／匯入）

- **介面**：`#save-code-modal` 視窗，取代舊版 `prompt()` 對話框。
  舊版的問題：存檔代碼動輒 3～5 萬字，手機上的 `prompt()` 幾乎無法全選複製，部分 App 內建瀏覽器（LINE、Facebook 等）更會直接擋掉 `prompt()`，導致按了沒反應。
- ⚠️ **此視窗內禁止使用 `alert`/`confirm`/`prompt`**：App 內建瀏覽器擋掉 `confirm()` 時會直接回傳 false，
  造成「按了確認匯入卻什麼都沒發生」。所有訊息都寫進 `#save-code-status`（`setSaveCodeStatus(訊息, 'ok'|'warn'|'error')`），
  覆蓋進度改為**按兩次確認**：第一次按解析代碼並顯示存檔的道號／境界，按鈕變成「⚠️ 再按一次，覆蓋目前進度」；
  修改文字框內容會重置確認（`resetImportConfirm()`）。
  - 匯出：文字框顯示代碼＋「📋 複製代碼」＋「💾 下載存檔檔案」。
    - 複製：先在點擊事件內**同步**執行 `execCommand('copy')`（iOS 舊版只接受這種），失敗才用 `navigator.clipboard`，
      再失敗就把文字全選並提示長按複製。文字框不設 `readOnly`（iOS 無法用程式選取唯讀文字框），改用 `inputmode="none"` 避免跳出鍵盤。
    - 下載：檔名 `fanchen-save_日期.txt`（英數字，避免手機瀏覽器中文檔名亂碼）。App 內建瀏覽器常不支援下載且無法偵測，
      所以只提示「若沒有出現下載，請改用複製」。
  - 匯入：貼上（或「📋 從剪貼簿貼上」，`navigator.clipboard.readText`）／「📂 從檔案讀取」（`FileReader`；
    `<input type="file">` **不設 accept**，部分 Android 會把 .txt 標成其他類型導致選不到）→「✅ 確認匯入」按兩次。
    匯入成功後**立刻 `saveLocal()`**；套用失敗會還原成匯入前的進度。
- **格式**（`encodeSaveCode`/`decodeSaveCode`，皆為 async）：
  - 新：`"FS2:"` + Base64(deflate-raw 壓縮的 UTF-8 JSON)，用瀏覽器內建的 `CompressionStream`。
    實測：100 名僕從＋100 件裝備的存檔，最舊版 47,527 字 → 未壓縮 Base64 約 3～4 萬字 → **壓縮後約 2,000～4,000 字**。
    **可以完整貼進 LINE**（LINE 單則訊息上限約 1 萬字，過長會被截斷或拆成多則，是手機匯入失敗的主因之一）。
  - 瀏覽器沒有 `CompressionStream`（iOS 16.3 以前）時自動退回未壓縮 Base64；
    在這類舊瀏覽器匯入 FS2 代碼會提示「瀏覽器版本過舊，請更新」。
  - 匯入相容四種輸入：FS2 壓縮代碼、未壓縮 Base64（允許夾雜換行與前後空白）、`%7B` 開頭的最舊版代碼、直接貼上的 JSON。
- **驗證**：解析失敗或缺 `realmIndex` 一律提示「存檔代碼無效」（常見原因：只複製到一部分、通訊軟體拆成多則訊息），不會改動目前進度。
- **切換存檔時的清理**：`applySaveData()` 會清空進行中的戰鬥、渡劫與身上狀態（`enemies`/`inTribulation`/`heartDemon`/`playerStatus`），
  再做離線收益結算；並用 `sanitizePlayerName()` 清理道號（別人分享的代碼可能夾帶 HTML，道號會被插進日誌的 innerHTML）。
- **手機背景存檔**：`main.js` 的 `initGame()` 在 `visibilitychange`（切到背景）與 `pagehide`（關閉分頁）時立刻 `saveLocal()`。
  手機瀏覽器常在背景直接結束分頁，只靠 30 秒自動存檔會遺失最後一段進度，重開時像是「讀檔失敗、進度倒退」。
- **修改道號**（`player-profile.js`）也改用 `#name-modal` 視窗（不用 `prompt()`），最多 12 字，並移除 `< > & " ' \`` 等字元。
- **仍使用原生對話框的地方**（在 App 內建瀏覽器可能失效）：拜入宗門、渡劫、靈寶閣兌換、轉世、完全重置等的 `confirm()` 確認，
  以及各處資源不足的 `alert()` 提示。若玩家回報這些按鈕在 LINE 內沒反應，比照本節改為視窗內確認。

## 20. 宗門地圖（第一區）

- 舊版第一區有三張安全區地圖，設施分散：「洞府 / 弟子居」(經驗 ×1，無設施)、「演武學宮」(×1.5，門派任務／靈田／靈獸園)、
  「後山禁地」(×3，靈寶閣／藏書閣／鍛造閣／煉丹房)。現已**合併為單一地圖「宗門」**（`config-maps.js` 的 `SECT_MAP_NAME`），
  經驗倍率沿用三者最高的 ×3、難度 1。
- **身在宗門即可使用全部七項宗門設施**：`ui.js` 的 `updateSectFacilitiesUI()` 只看 `map.js` 的 `isInSect()`，
  一次顯示或隱藏所有設施按鈕。親自執行門派任務也改為「待在宗門」即可（`combat.js`／`quest.js`／`map.js` 皆呼叫 `isInSect()`）。
  **日後判斷「是否在宗門」一律呼叫 `isInSect()`**，不要再把地圖名稱字串寫死在各檔案。
- 設施本身仍需先拜入宗門（`checkSectJoined()`），這點不變。
- **舊存檔相容**：存檔裡的 `currentMap` 是當時地圖物件的副本。`save.js` 的 `migrateCurrentMap()` 在讀檔／匯入時依名稱改指向
  `maps` 內的最新設定（順便讓倍率調整生效），找不到的地圖（三張舊地圖）一律回到宗門。
  日後刪除或改名任何地圖，都靠這個函式自動處理，不必另外寫轉換。

## 21. 靈根系統（取代舊版「17 件全同屬性成陣」）

判定在 `stats.js` 的 `getSpiritRoots()`，數值表與門檻常數全部在 `config-equipment.js`。
先統計 17 個部位（不含神器）各五行件數，再算出**套數** `sets`（五種件數的最小值，即能湊出幾組完整的「金木水火土」）
與**餘數** `rest[屬性] = 件數 - 套數`。

| 類型 | 條件 | 數量 | 表 |
|---|---|---|---|
| 單屬性靈根 | 某屬性 ≥ `ROOT_SINGLE_COUNT`(5) 件 | 最多同時 3 種（17 格） | `wuxingArrayEffects`（沿用原五行法陣的五種效果） |
| 五行聖靈根 | `sets` ≥ `ROOT_SUPREME_SETS`(3)（15 件，剩 2 件不論屬性） | 只有一個 | `supremeRootEffect` |
| 純化靈根 | `sets` ≥ 2 且某屬性 `rest` ≥ 6 | 只有一個 | `pureRootEffects`（水→冰、火→炎、金→罡、木→生、土→岩） |
| 雙屬性靈根 | `sets` ≥ 1 且兩屬性 `rest` 各 ≥ 5 | 只有一個 | `dualRootEffects`（10 組，key 依 `wuxingElements` 排序後以 `+` 相連） |

- **特殊靈根只會有一個**，優先序：聖 > 純化 > 雙屬性；**與單屬性靈根並存**（例：2 套 + 6 水 = 水靈根 + 冰靈根）。
- **金＋水**依 `rest` 較多者分成兩種結果（`dualRootEffects["金+水"].byMain`）：水多 → 雷靈根、金多（或相同）→ 毒靈根。其餘組合不分主副。
- **效果一律寫在各靈根的 `bonus` 內**，由 `getRootBonus()` 加總後供各計算處取用，**不要再把數值寫死在計算處**：

  | bonus 欄位 | 合併方式 | 套用位置 |
  |---|---|---|
  | `atkMult` | 相乘 | `stats.js` 的 `getPhysAttack()`/`getMagAttack()` |
  | `hpMult` / `conMult` | 相乘 | `stats.js` 的 `getMaxHp()` |
  | `skillMult` | 相乘 | `combat.js` 的 `playerAttackTurn()`（技能傷害，渡劫共用） |
  | `healMult` | 相乘 | `combat.js` 安全區每秒回血 |
  | `def`/`ice`/`fire`/`poison`/`metal`/`thunder` | 相加 | `elements.js` 的 `getPlayerCombatAttrs()`，**與裝備加總後一起套上限**（減傷 60%、屬性傷害 50%） |
  | `regen` | 相加 | `combat.js` 的 `applyRootRegen()`，野外與渡劫每回合回復（日誌顯示「🌿靈根回復」） |
  | `freezeResist` | 取最高 | `resolveHit()` 內折減「被凍結」的機率 |
  | `burnMax` / `poisonMax` | 取最高 | `resolveHit()` 內覆蓋自己造成的燒傷/中毒層數上限 |
  | `ignoreCounter` | 任一為真即成立 | `resolveHit()`：任一方持有即雙向不受五行相剋影響 |

- **新增靈根或改效果只要動 `config-equipment.js`**；若要新增 `bonus` 欄位，需同時在 `getRootBonus()` 的合併清單與套用處加上。
- **舊存檔不需轉換**：裝備資料本身沒變，只是判定規則改變，讀檔後自動用新規則重算。
- 顯示：角色裝備視窗頂端與「!」說明視窗共用 `equipment.js` 的 `formatSpiritRoots()`。

## 22. 聲望

| 來源 | 數量 | 位置 |
|---|---|---|
| 野外擊殺妖獸 | **每殺一隻隨機 1 ~ 該區上限**（`rollKillReputation()`，上限見下表） | `combat.js` |
| 每日任務 | 普通 20／困難 50／艱鉅 120 | `config-daily-quests.js` 的 `dailyQuestRewards` |
| 離線掛機（野外） | 戰鬥 tick 數 × 該區平均聲望 × `OFFLINE_REPUTATION_RATE`(0.7)，約為線上的 **65%** | `save.js` 的 `calcOfflineProgress()` |

擊殺聲望依**所在地圖分類**給，設定在 `config-maps.js` 的 `REPUTATION_MAX_BY_MAP_CATEGORY`（key 為 `maps` 的索引）：

| 地圖分類 | 每隻聲望 | 平均 |
|---|---|---|
| 二、野外歷練 | 1 ~ 3 | 2 |
| 三、開放世界 | 1 ~ 10 | 5.5 |
| 四、上古禁區 | 1 ~ 30 | 15.5 |
| 五、諸天戰場 | 1 ~ 100 | 50.5 |

- 舊版不分地圖一律「每殺 1 隻 = 1 點」，導致低難度地圖刷聲望效率最高；改成分區後高難度地圖才划算。
- 門派任務、僕從派遣**不給聲望**（獎勵只有道具：獸丹／靈草／武學積分／礦石，初級打掃另給 50 靈石，見 `config-quests.js`）。
- **離線掛機也給聲望**，但刻意比線上少：離線以「戰鬥 tick 數（離線秒數 × `OFFLINE_COMBAT_RATE` 0.3）× 該區平均聲望 × `OFFLINE_REPUTATION_RATE` 0.7」計算，
  換算約每秒 0.21 隻，實測穩定在線上的 0.64～0.68。
  ⚠️ 兩個係數要一起看：`OFFLINE_COMBAT_RATE` 從 0.7 降到 0.3 時，聲望倍率必須由 0.3 調高到 0.7 才能維持 65%。修改任一個都要重新實測。
  離線待在安全區（宗門）不給聲望。
- 消耗：靈寶閣兌換（初級 1 萬／中級 10 萬／高級 50 萬）、千寶閣壽元丹（1,000 ~ 10,000）；
  活動解鎖門檻見第 10 節（每日任務 1,000、千寶閣 5,000、秘境 5,000、獵殺邪修 8,000、世界BOSS 10,000）。

## 23. 靈石

- **擊殺掉落**：每隻 = 該地圖的 `coins` ±20%（`combat.js` 的 `rollKillCoins()`，數值表在 `config-maps.js` 的 `maps`）。
  ⚠️ 舊版是 `diff × (8~12)`，難度一放大靈石就爆量（混沌初界每小時 22.9 億，而靈寶閣最貴的寶物才 100 萬），
  因此改為**各地圖獨立設定 `coins`，不再跟 `diff` 連動**。調整產出只要改 `coins`。
- **換算**：滿速掛機每小時約 `KILLS_PER_HOUR_ESTIMATE`(1160) 隻（波次之間有 5 秒刷新，實測每秒 0.32 隻），
  所以「每小時靈石 ≈ coins × 1160」。

  | 地圖 | coins/隻 | 線上每小時（實測峰值） | 設計上限 |
  |---|---|---|---|
  | 靈山大川 | 20 | 2.3 萬 | — |
  | 深淵險地 | 80 | 9.5 萬 | — |
  | 上古遺跡 | 250 | 30 萬 | — |
  | 天南 | 1,000 | 118 萬 | — |
  | 亂星海 | 1,650 | 198 萬 | 200 萬 |
  | 鬼谷八荒 | 2,450 | 297 萬 | 300 萬 |
  | 荒古禁地 | 3,350 | 386 萬 | 400 萬 |
  | 太初古礦 | 4,200 | 486 萬 | 500 萬 |
  | 上蒼（葬天島） | 6,900 | 795 萬 | 800～1000 萬 |
  | 不死山 | 7,300 | 861 萬 | 〃 |
  | 神墟 | 7,750 | 898 萬 | 〃 |
  | 仙陵 | 8,200 | 936 萬 | 〃 |
  | 冥界 | 8,400 | 985 萬 | 〃 |
  | 仙界戰場 / 萬界戰場 / 混沌初界 | 8,400 | 949～970 萬 | 〃（封頂） |

- **上蒼之後靈石封頂**在每小時 800～1000 萬，不再隨難度放大；高階地圖的差異改由**經驗與聲望**體現。
  新增地圖時請照這個原則設 `coins`，並實測 3 次以上取峰值確認沒有破上限（隨機 ±20% 會讓單次結果浮動約 ±2%）。
- **離線掛機**：`save.js` 的 `calcOfflineProgress()` 以「離線秒數 × `OFFLINE_COMBAT_RATE`(0.3) × 該圖 coins」計算，
  實測約為線上的 0.89～0.97。⚠️ 舊值 0.7 會讓離線收益是線上的 2.16 倍（關掉遊戲比掛機划算）。
  這個係數同時影響離線的經驗、靈石、僕從救援與聲望（聲望另乘 `OFFLINE_REPUTATION_RATE`）。
- 主要消耗：鍛造 10,000／次、符寶煉製 5 萬／次、僕從派遣 50～300／趟、丹藥 40～500、靈寵 1～5 萬、壽元丹 1～10 萬、靈寶閣 10 萬～100 萬。
  ⚠️ 後期靈石仍遠多於消耗，真正的瓶頸是聲望（高級靈寶閣需 50 萬聲望）。若要讓靈石一直有意義，
  需要讓後期消耗（鍛造、丹藥、壽元丹）隨境界提高，而不是再調高產出。

## 24. 藏書閣第二階段：屬性秘典

- **解鎖**：已拜入中級宗門（`player.sectSkills[ELEMENT_BOOK_TIER]`，`ELEMENT_BOOK_TIER = 2`）。未解鎖時藏書閣仍可進入，第二階段區塊只顯示鎖定提示。
- **消耗**（每次，`ELEMENT_BOOK_COST`）：50 武學積分 + 100 株靈草（`player.spiritGrass`）+ 1,000 靈石。支援 ×1／×10／最高（`resolveBatchCount`），也計入每日任務的 `study`。
- **成長**：每次 +0.01% 傷害（`ELEMENT_BOOK_GAIN = 0.0001`），每本上限 1,000 次（`ELEMENT_BOOK_MAX`）→ 滿級 +10%。
  滿一本共需 5 萬武學積分、10 萬靈草、100 萬靈石；八本全滿為 8 倍。
- **存檔**：`player.elementStudy = { metal, wood, water, fire, earth, ice, thunder, poison }`（缺的鍵視為 0）。
  舊存檔沒有此欄位時由 `DEFAULT_PLAYER_JSON` 補上 `{}`，不需 migrate。**轉世輪迴會清空**（與四維古籍 `studyCounts` 一樣，見第 25 節）。
- **八本秘典與作用位置**（`library.js` 的 `elementBooks`，加成由 `getElementBookBonus()` 算出，放進 `getPlayerCombatAttrs().book`，在 `elements.js` 的 `resolveHit()` 套用）：

  | 秘典 | key | 本命五行加成（該次直接傷害） | 效果加成 |
  |---|---|---|---|
  | 《庚金劍典》 | metal | 本命為金 | ⚔️重擊觸發時，該次傷害再 ×(1+加成) |
  | 《乙木長生訣》 | wood | 本命為木 | — |
  | 《癸水真經》 | water | 本命為水 | — |
  | 《丙火焚天錄》 | fire | 本命為火 | 🔥燒傷每層傷害 ×(1+加成) |
  | 《戊土玄黃功》 | earth | 本命為土 | — |
  | 《玄冰寒魄訣》 | ice | — | 目標**凍結中**時直接傷害 ×(1+加成) |
  | 《九霄雷典》 | thunder | — | ⚡雷擊觸發時，該次傷害再 ×(1+加成) |
  | 《萬毒真經》 | poison | — | ☠️中毒每層傷害 ×(1+加成) |

  - 各項加成**相乘**（例：本命金＋重擊時 ×1.1×1.1）。本命五行取自 `getPlayerElement()`，沒穿裝備（`null`）則五行秘典不生效。
  - 心魔是鏡像玩家的 `getPlayerCombatAttrs()`，因此也帶相同的秘典加成（渡劫勝負仍由擲骰決定，只影響過程）。
  - 靈寵攻擊不經 `resolveHit()`，不吃秘典加成。
- **介面**：`index.html` 的 `#library-modal` 分成兩個預設收合的抽屜（第 9 節）：「第一階段・四維古籍」（`#drawer-library-1`，靜態 HTML）與「第二階段・屬性秘典」（`#drawer-library-2` 內的 `#element-book-section`，
  由 `renderElementBooks()` 在開啟視窗與每次參悟後重繪，並列出目前持有的武學積分／靈草／靈石）。
  **新增秘典只要在 `elementBooks` 加一筆**；若要新增新的效果類型，需同時在 `getElementBookBonus()` 的預設值與 `resolveHit()` 的套用處加上。

## 25. 轉世輪迴

`leveling.js` 的 `triggerReincarnate()`，需境界達【仙人初境】（`realmIndex >= 10`）。比例由 `REINCARNATE_KEEP_RATE`（0.05）控制。

| 分類 | 內容 |
|---|---|
| 保留 5% | 四維與魅力：新值 = `10 + floor(前世 player.stats × 5%)`（只看基礎屬性，不含裝備） |
| 保留 5% | 氣血上限、靈力上限：取前世 `getMaxHp()`/`getMaxMp()`（含裝備、宗門、靈根、等級）的 5%，存入 `player.reincarnateBonus = { hp, mp }`，由 `getMaxHp()`/`getMaxMp()` 加上 |
| 遺忘 | 境界（回凡人 1 階）、人物等級（Lv1）、`sect`（變回散修）與 `sectSkills`（可重新選宗門）、門派任務 `activeQuest`、四維古籍 `studyCounts`、屬性秘典 `elementStudy` |
| 重設 | 壽元回到凡人的 60 年、年齡回到 16 歲，氣血／靈力補滿新上限，輪迴次數 +1 |
| 不動 | 裝備與背包、靈石等資源、功德／七彩補天石／破障丹、僕從、靈寵（等級可能高於 Lv1 的人物，但之後的經驗受人物等級上限卡住）、靈寶閣武學 `learnedSkills` 與 `lingbaoSold`、每日任務／千寶閣 |

- **累積方式**：保留值是「覆寫」而不是「累加」——前世的數值本來就含上上世留下的部分，所以會自然滾動累積，不會重複計算。
- ⚠️ 舊版規則是「四維 = 10 + 輪迴次數×50、魅力 = 10 + 輪迴次數×10」且保留人物等級、宗門技能與秘典，已廢除。
- ⚠️ 平衡注意：高境界的氣血上限主要來自 `getBasePower()`（隨境界暴增），5% 仍可能是凡人境界的數萬倍
  （實測仙人初境以上約 1.5×10¹⁴ 氣血 → 保留約 7.5×10¹²），轉世後前幾個境界幾乎不會戰死。若要收斂，可改成只保留四維換算的部分，或對保留值設上限。
- **介面**：「命運抉擇」抽屜內轉世按鈕下方的 `.reincarnate-note` 備註保留／遺忘項目（文字寫死 5%，**改 `REINCARNATE_KEEP_RATE` 時要一併改這段 HTML**）；
  `confirm()` 視窗的文字則由常數自動產生。
- **舊存檔**：沒有 `reincarnateBonus` 時由 `DEFAULT_PLAYER_JSON` 補 `{hp:0,mp:0}`，`getReincarnateBonus()` 也會把缺值視為 0。已經在舊規則下轉世過的存檔維持現狀，不追溯。

## 26. 修煉節奏（境界經驗曲線）

- **舊版問題**：每階經驗 = `200 × 10^境界 × 階數`，每個大境界 ×10，但地圖經驗成長慢得多、禁區又要仙人初境才開放，
  化神後即使滿加成也要數天～數十年才能修滿（渡劫約 11 年、仙人初境之後以千年計），壽元也長期卡在底線。
- **新版**：`config-realms.js` 的 `realmPacing` 直接寫「每個境界要花幾小時」，由 `stats.js` 的 `getRealmStageExp()` 反推經驗：
  每階基數 = `hours × 3600 × (地圖 expRate × 15 × REALM_PACING_KILLS_PER_SEC(0.32) × expMult) ÷ 55`，取 2 位有效數字；
  `getNextExp()` = 基數 × 目前階數（10 階合計 55 倍基數，所以剛好是 `hours`）。
  `expMult` 是「一般玩家」的估算加成：凡俗宗門 ×1.2 → 修真宗門約 ×2＋靈幻狐 = 2.2 → 至高宗門約 ×4＋狐＋蛟龍 = 5.28。

  | 境界 | 主要地圖 | 目標時間 | 每階基數 |
  |---|---|---|---|
  | 凡人 | 靈山大川 | 30 分 | 1,500 |
  | 煉氣 | 靈山大川 | 1 時 | 3,000 |
  | 築基 | 深淵險地 | 2 時 | 15,000 |
  | 金丹 | 上古遺跡 | 3 時 | 100,000 |
  | 元嬰 | 天南 | 5 時 | 350,000 |
  | 化神 | 亂星海 | 10 時 | 2,100,000 |
  | 煉虛 | 鬼谷八荒 | 20 時 | 1,400 萬 |
  | 合體 | 鬼谷八荒 | 2 天 | 3,300 萬 |
  | 大乘 | 鬼谷八荒 | 10 天 | 1.7 億 |
  | 渡劫 | 鬼谷八荒 | 30 天 | 5 億 |
  | 仙人初境 | 荒古禁地 | 50 天 | 60 億 |
  | 天仙 | 上蒼（葬天島） | 100 天 | 200 億 |
  | 真仙 | 冥界 | 150 天 | 540 億 |
  | 大羅金仙 | 仙界戰場 | 200 天 | 1,200 億 |
  | 混元大羅金仙 | 萬界戰場 | 200 天 | 2,000 億 |
  | 混沌道祖 | 混沌初界 | 300 天 | 6,000 億 |

  全程約 1,040 天（約 25,000 小時，線上與離線合計，離線經驗約為線上的 94%）。
- **只改 `hours` 就能調整節奏**，經驗門檻與壽元流逝（第 15 節）都會自動跟著換算；`realmPacing.map` 必須是 `maps` 裡存在的地圖名稱。
- **戰力曲線不變**：`getBasePower()` 原本有一項「目前修為 ÷ 100」，改成「修為進度百分比 × 舊版滿格值（`2×10^境界×階數`，凡人 `1×階數`）」，
  所以經驗曲線怎麼調，戰力都與舊版一致（實測相同進度下數值完全相同），怪物難度不受影響。
- **舊存檔**：修為可能遠超新門檻。`save.js` 的 `migrateRealmExp()` 把「待渡劫」者的修為壓回滿格；
  其餘保留，下次獲得經驗時 `gainExp()` 會連續升階，到 10 階後照常停在待渡劫（大境界仍須渡劫，不會一次跳好幾個境界）。

## 27. 功德系統（獵殺邪修／七彩補天石／破障丹）

設定在 `config-merit.js`，邏輯在 `merit.js`。流程：**斬殺邪修 → 功德 → 七彩補天石 → 千寶閣珍貴物資（破障丹）**。功德只能兌換道具。

- ⏸️ **目前暫停開放**：`config-activities.js` 的 `evil` 設為 `implemented: false`（活動選單顯示「敬請期待」）。
  暫停期間 `isEvilHuntUnlocked()` 一律回傳 false（野外不出現邪修、離線不累積功德），
  `isMeritSystemOpen()` 為 false 時千寶閣**不顯示珍貴物資區**、渡劫確認視窗**不提醒破障丹**（避免引導去買拿不到的東西）；
  已持有的破障丹仍會在渡劫時生效。**調整完成後把 `implemented` 改回 `true` 即全部開放**，不需改其他程式。
- **獵殺邪修**（活動選單，聲望 8,000＋金丹解鎖，`isEvilHuntUnlocked()` 走 `getActivityLockReason()`）：
  - 解鎖後，`combat.js` 刷怪時每隻有 `EVIL_SPAWN_CHANCE`(1.6%) 機率是邪修（`isEvil: true`、圖示 `EVIL_ICON` 🧛、氣血與攻擊 ×`EVIL_POWER_MULT` 1.5）。
    戰鬥實況標題會顯示「邪修×N」，遭遇與斬殺都有日誌。
  - 斬殺一名得 `EVIL_MERIT_MIN`～`EVIL_MERIT_MAX`（1～10）功德，並累計 `player.evilKills`。
  - 離線（野外）：戰鬥 tick 數 × `EVIL_SPAWN_CHANCE` 名邪修 × 平均 5.5 功德（`save.js` 的 `calcOfflineProgress()`）。
  - 產量目標：**線上每小時約 100 功德**（每小時約 1,152 隻 × 1.6% ≈ 18 名邪修 × 5.5）≈ 每小時 1 顆補天石 ≈ 每 5 小時 1 顆破障丹。
    要調整產量改 `EVIL_SPAWN_CHANCE`（每 1% 約 63 功德/小時）。
  - 活動按鈕開啟 `#evil-hunt-modal`（`renderEvilHunt()`）：說明、持有數量、累計斬殺數，以及前往千寶閣的按鈕。
- **七彩補天石**：`player.butianStones`，在千寶閣以 `MERIT_PER_BUTIAN_STONE`(100) 功德兌換 1 顆（`exchangeMeritForStone(qty)`，×1/×10/最高）。
- **破障丹**：`player.breakPills`，在千寶閣以 `BREAK_PILL_STONE_COST`(5) 顆補天石購買（`buyBreakPill(qty)`）。
  渡劫時若持有會**自動服用 1 顆**：心魔戰力 ×`BREAK_PILL_DEMON_POWER_MULT`(0.9)、勝算 +`BREAK_PILL_CHANCE_BONUS`(10%)、上限提高到 `BREAK_PILL_MAX_CHANCE`(90%)。見第 7 節。
- **千寶閣珍貴物資區**：`renderPreciousSection()` 嵌在 `renderAuction()` 的商品下方，**常駐、不佔每 3 小時刷新的 5 格**。
  「只能用七彩補天石購買的珍貴物資」之後要新增，也加在這一區。
- **七彩發光外觀**：`index.html` 的 `.rainbow-text`（漸層流動文字）與 `.rainbow-glow`（卡片框線與光暈循環變色），
  用於千寶閣珍貴物資、背包、角色資源列、獵殺邪修視窗；`prefers-reduced-motion` 時停用動畫。顯示資料在 `preciousItems`。
- **背包**：`renderBag()` 會列出補天石與破障丹（七彩卡片、不能直接使用）；角色面板資源列也顯示功德／補天石／破障丹。
- **存檔**：`merit`/`butianStones`/`breakPills`/`evilKills` 都在 `player` 上，舊存檔由 `DEFAULT_PLAYER_JSON` 補 0；轉世不重置。

## 28. 符寶與鑲嵌孔（符寶坊）

設定在 `config-talisman.js`，邏輯在 `talisman.js`。流程：**傳說僕從礦脈採礦 → 礦石 → 符寶坊煉製符寶 → 鑲嵌到橙裝孔位**。

- **孔位**：`SOCKET_QUALITY`(橙色) 的武器／防具／飾品帶 `SOCKET_MIN`～`SOCKET_MAX`(1~3) 個孔，**神器不開孔**。
  資料在裝備物件上：`eq.sockets = [null 或 { type, grade }, ...]`。一律由 `ensureSockets(eq)` 產生（沒有 `sockets` 才開孔，重複呼叫不會重抽）：
  - 鍛造閣 `forgeOneEquipment()`、千寶閣 `rollAuctionEquip()`（上架時就決定，買家看得到）、靈寶閣兌換。
  - **舊裝備不補孔**：只有更新後新鍛造／上架／兌換的橙裝才有孔；更新前就持有的橙裝、更新前上架的千寶閣商品都維持無孔。
    `save.js` 的 `migrateEquipSockets()` 只負責補上 `player.talismans` 欄位。
  - **日後新增任何取得裝備的管道，都要對新裝備呼叫 `ensureSockets()`。**
- **符寶種類**（`talismanTypes`，11 種）：四維符 `str/con/int/spr`（加固定點數）、戰鬥屬性符 `def/eva/ice/fire/poison/metal/thunder`（加 %）。
- **煉製一律隨機**（`craftTalisman(qty)` → `rollTalisman()`）：無法指定種類或品階；種類 11 選 1 平均，品階依 `chance`。
  每次成本固定 `TALISMAN_CRAFT_COST` = **500 礦石＋50,000 靈石**，支援 ×1／×10／最高，日誌彙整煉出的種類與數量。

  | 品階 | 四維符 | 屬性符 | 出現機率（暫定） |
  |---|---|---|---|
  | 下品 | +100 | +1% | 70% |
  | 中品 | +400 | +2% | 25% |
  | 上品 | +1,500 | +3% | 5%（實測 200 次出 12 枚） |

- **生效**：`stats.js` 的 `getEquipBonus()` 把每件已穿戴裝備的 `getSocketStats(eq)` 加進總和，所以四維與戰鬥屬性一起生效；
  戰鬥屬性仍與裝備、靈根加總後套上限（減傷 60%、閃避 40%、屬性傷害 50%）。背包中的裝備不生效。
- **持有**：`player.talismans = { "種類_品階": 數量 }`（例 `def_3`）。
- **鑲嵌**：符寶坊列出所有有孔的裝備（穿戴中在前），空孔選符寶按「鑲嵌」（`inlayTalisman`）。
- **拆卸**：已鑲嵌的可按「打掉」（`removeTalisman`，會 `confirm`），**符寶碎裂消失**、孔位變回空的；毀棄裝備時上面的符寶一併消失。
- **顯示**：`formatSockets(eq)` 在背包、角色裝備欄、千寶閣卡片列出「🔮 孔位 N：[符寶] [空]」。
- **設施**：宗門與設施抽屜的「🔮 符寶坊」（`#btn-sect-talisman`，身在宗門才顯示，需已拜入宗門）。
- **礦石產量參考**：一名傳說僕從每小時約 60 趟 × 平均 15.5 = 930 礦石（花費 18,000 靈石），約可煉製 1.9 次。

## 29. 裝備等級（鍛造閣）

- 鍛造閣先選部位，再選**裝備等級**（`config-equipment.js` 的 `EQUIP_LEVELS`）：10／50／100／200／300／400／500／700／800／1000。
  每個等級都會隨機出白／綠／藍／紫／橙五種品質（機率不變：橙 5%、紫 10%、藍 20%、綠 30%、白 35%）。
- **可鍛造上限**依「目前所屬宗門」階段（`getSectTier()`，`FORGE_LEVEL_CAP_BY_TIER`）：初級宗門 ≤100、中級 ≤500、高級 ≤1000。
  `renderForgeLevelSelect()` 在開啟鍛造閣時只列出可選的等級（預設最高）；`forgeEquipment()` 也會再檢查一次。
- **數值**：四維基數 = 等級 × `EQUIP_LEVEL_STAT_MULT`(5) × 品質倍率（白 1／綠 2／藍 3／紫 5／橙 8），再依部位分配（`generateEquipStats()`）。
  例：500 等橙劍力量 2 萬、1000 等橙裝 4 萬（與靈寶閣高級寶物相當）。減傷／閃避／屬性傷害仍只看品質。
  ⚠️ 舊版鍛造是依「境界」算數值，改版後與境界無關。
- **穿戴限制**：裝備帶 `level` 欄位，`equipItem()` 要求**人物等級 ≥ 裝備等級**；卡片名稱前顯示「Lv.N」（`formatEquipLevel()`，等級不足時標紅）。
  舊裝備、千寶閣、靈寶閣的裝備沒有 `level`，不受限制。
- **費用**：`FORGE_COST` 每次 10,000 靈石（不分等級）。

## 30. 發佈版本號與讀檔失敗保護

### 事故紀錄（2026-09-23）
玩家更新後讀檔跳出「本地存檔格式損毀」。**存檔本身沒有壞**：GitHub Pages 會快取檔案約 10 分鐘，
瀏覽器拿到「舊 index.html（沒有 `#age-display`）＋新 ui.js」，`updateUI()` 對不存在的元素寫入而拋出 TypeError；
舊版 `loadLocal()` 把任何例外都當成「格式損毀」，接著 `startGame()` 直接跳性別選擇——**玩家一選性別，新角色就會覆蓋原存檔**。
（以 8 種舊存檔形態測試目前程式皆可正常讀取；移除 `#age-display` 即可重現同一錯誤。）

### 1. 發佈版本號（防止新舊檔案混用）
- `index.html` 的每個 `<script src="data/xxx.js?v=版本">` 都帶 `?v=`（目前 `20260924m`）。
- **每次推上 GitHub Pages 前，把所有 `?v=` 全部取代成新值**（例：日期＋序號）。新 index.html 會指向新網址的 JS，不會再拿到快取的舊檔。
- 新增 `data/*.js` 時也要記得帶上 `?v=`。

### 2. 讀檔失敗保護（`save.js`）
- `loadLocal()` 分開處理兩種失敗：`JSON.parse` 失敗（存檔真的壞了）與 `applySaveData()` 拋錯（多半是版本混用）。
- 失敗時 `reportLoadFailure()`：
  1. 設 `saveLoadFailed = true` → `saveLocal()`（含每 30 秒自動存檔、切背景存檔）**一律不寫入**。
  2. 原始存檔另存到 `localStorage['xiuxian_save_backup']`（時間在 `xiuxian_save_backup_at`）。
  3. 顯示 `#load-error-modal`：錯誤原因（真正的例外訊息）、依原因給的建議，以及三個選項（沒有關閉鈕、不用 alert/confirm）：
     - 🔄 重新整理再試一次：`retryLoadAfterFailure()` 以 `?reload=時間戳` 重新載入，避開快取的舊 index.html。
     - 📋 顯示原始存檔代碼：`showRawSaveForCopy()` 把原始存檔放進文字框並嘗試複製（可貼到「匯入存檔」救回）。
     - 🗑️ 放棄存檔開新角色：`abandonSaveAndStartNew()`，**要按兩次**；備份仍保留。
  - 若頁面是舊版 index.html（沒有這個視窗），退回用 `alert` 說明，寫入一樣被封鎖。
- `main.js` 的 `startGame()`：`loadLocal()` 失敗且 `saveLoadFailed` 時直接返回，**絕不自動進入開新角色**。
- ⚠️ 新增讀檔邏輯時，任何「可能覆蓋存檔」的路徑都要先檢查 `saveLoadFailed`。

### 3. 刪除存檔後重新整理（事故紀錄 2026-09-24）
- `main.js` 在切到背景（`visibilitychange`）與離開頁面（`pagehide`）時會自動 `saveLocal()`。
  `location.reload()` 本身就會觸發 `pagehide`，所以「刪存檔 → reload」會在離開前把目前角色**寫回去**——
  曾造成「🔄 遊戲重新開始（完全重置）」按了沒有重置。
- 規則：**任何刪除存檔的路徑，都要先設 `gameOver = true` 再 `removeItem`**（`saveLocal()` 看到 `gameOver` 就不寫入）。
  目前的 `resetGameCompletely()`（save.js）與 `triggerLifespanGameOver()`（lifespan.js）都已這樣做。

## 31. 洞府主畫面（舞台版面）

背景圖 `images/home-bg.jpg`（**704×1520**）本身就是介面：頭像框、名字框、兩個資源框、左右側按鈕、底部導覽都**畫在圖上**。
程式只負責把即時數值疊進框裡，並在圖上的按鈕位置放透明點擊區。

### 舞台與對齊
- `#app-frame`（外框，fixed 置中）包住 `#app-stage`（舞台，relative）。`home-ui.js` 的 `layoutStage()` 依**顯示尺寸設定**（第 34 節）計算：
  手機版舞台滿版填滿（最寬 9:16，背景圖 `object-fit: fill` 伸縮）；PC 版為 16:9 外框，舞台保持原圖比例在左、分頁面板在右。
  多出的邊由 `body::before` 用同一張圖放大模糊補底（PC 版換成 home-bg-pc.jpg）。視窗縮放、轉向、進出全螢幕時重算。
  ⚠️ PC 版改用獨立的 `#pc-stage` 與橫式圖（第 34 節），本節的座標只適用手機版。
- CSS 變數 `--u` = min(舞台寬 ÷ 704, 舞台高 ÷ 1520)，字級與間距一律 `calc(var(--u) * 圖上像素)`（舞台被壓扁時取較小值，文字不溢出）。
- 疊加元素的 `left/top/width/height` 一律寫成「**圖上座標 ÷ 704（橫向）或 ÷ 1520（縱向）**」的百分比。
  ⚠️ **換背景圖時**：要改 `STAGE_IMG_W`/`STAGE_IMG_H`，並重新量 index.html 內所有 `%` 座標（HUD、熱點、側邊按鈕、底部導覽、`#tab-sheet`）。

### 元素對照（圖上座標，704×1520）

| 元素 | 位置 | 內容／功能 |
|---|---|---|
| `#hud-avatar` | 頭像框 (28,34) 124×124 | 玩家頭像（`getPlayerAvatar()`：玩家選用的頭像，未選則依性別），蓋住圖上的預設頭像；**點擊開啟更換頭像視窗**（第 32 節） |
| `#hud-name` | 名字框 (159,47) | 道號、境界階數（待渡劫會標示）、Lv 與等級進度條、戰力 |
| `#hud-coins` | 左資源框（元寶） | 靈石（`formatShortNumber`：萬／億縮寫） |
| `#hud-rep` | 右資源框（圖上原為「仙玉」） | **聲望** |
| `#hud-stats` | 資源框下方（新增的半透明面板） | 氣血／靈力／修為條、修煉效率（`getCultivationRate()` = 宗門經驗倍率 × 靈寵加成）；最下列左側 `#btn-settings`「⚙️ 設定」開啟設定視窗（第 34 節） |
| 熱點「升仙台」 | 寶塔 | `openAscensionPlatform()`：待渡劫時 `triggerTribulation()`，否則提示修為進度；待渡劫時牌匾亮紅點 |
| 熱點「領物閣」 | 山中發光洞口 | `openActivity('auction')`（千寶閣，未解鎖會提示條件） |
| 熱點「宗門」 | 左側山門 | 切到宗門分頁 |
| 熱點「僕從小屋」 | 右側屋舍 | `openServantModal()` |
| 側邊「任務」「背包」 | 左側 | `openQuestModal()`、`openBagModal()` |
| 側邊「特惠商城」 | 右側 | `openShopModal()`（丹藥堂） |
| 側邊「郵件」「充值」 | 左／右 | 遊戲沒有對應功能 → `showUnderConstruction()` 顯示「興建中」 |
| 底部導覽 | 修仙／戰鬥／洞府／宗門／世界 | `switchTab()`；選中的按鈕有金色光暈（`.nav-btn.active`） |

### 分頁（底部導覽）
- `switchTab(tab)` 設定 `body[data-tab]`：`home`（洞府）只顯示背景與熱點；其他分頁在 `#tab-sheet`（圖上 y 212～1372 之間）顯示面板。
- 原本的面板仍在 `#game-container` 內（所有 id 不變，`updateUI()` 照常寫入），用 `data-tab` 標記屬於哪個分頁（可多個，以空白分隔）：

  | 分頁 | 面板 |
  |---|---|
  | 修仙 `cultivate` | `#header`（境界、壽命、狀態條等詳細資訊）、修士面板（四維、戰鬥屬性、裝備、技能、自動輔助、資源） |
  | 戰鬥 `battle` | 戰場實況＋渡劫按鈕＋日誌（`#battle-panel`，排在最前）、修仙地圖 |
  | 宗門 `sect` | 宗門與設施 |
  | 世界 `world` | 修仙地圖、活動、命運與系統（存檔、轉世、重置） |

- 分頁內的地圖、設施、活動抽屜**預設展開**（分頁本身就是選單）；存檔管理與命運抉擇仍預設收合。
- **新增面板**：放進 `#game-container` 並加上 `data-tab="分頁名"` 即可。

### 其他
- 標題畫面期間 `body.title-mode` 會隱藏 `#app-frame`。`main.js` 的 `window.onload` 先 `initHomeUi()` 再 `initTitleScreen()`。
- `updateUI()` 結尾呼叫 `updateHomeHud()`，所以 HUD 與原面板永遠同步。
- 彈出視窗（`.modal-bg`，z-index 100）仍是全螢幕，蓋在舞台上方。
- 背景圖只有 704 寬，在高解析手機上會略微放大；若之後有更大的同構圖，直接替換並依上方警語重新量座標即可。

## 32. 頭像更換（可解鎖）

- **入口**：點洞府左上的頭像（`#hud-avatar`）→ `openAvatarModal()` 開啟 `#avatar-modal`，列出全部頭像（已解鎖／使用中／鎖定與條件、目前進度）。
- **不分性別**，所有頭像男女修都能用；`player.avatarId = null` 時依性別顯示預設的韓立／南宮婉（`getPlayerAvatar()`）。
- **解鎖方式：花靈石購買**。除了預設的韓立／南宮婉，其餘 10 個頭像都是 `unlock: { type: "coins", value: AVATAR_UNLOCK_COINS }`，
  目前 **每個 10,000,000 靈石（1000 萬）**（`config-avatars.js` 的 `AVATAR_UNLOCK_COINS`，改這一個常數即可全部調價；個別頭像也可寫不同 `value`）。
  - 在選擇視窗點未解鎖的頭像 → `buyAvatar(id)`：靈石不足會提示；足夠則 `confirm` 後扣款、加進 `player.unlockedAvatars` 並**立即換上**。
  - 已解鎖的不會重複扣款；**解鎖後永久保留**（轉世也不會失去；選用中的頭像也保留）。
  - 卡片顯示「💰 10,000,000 靈石解鎖」，靈石不足時轉紅並註明。
  - 價格參考：線上掛機每小時靈石約 2 萬（野外初期）～1000 萬（禁區以上封頂，第 23 節），所以一個頭像約是後期 1 小時的收入。

  | 頭像 | id |
  |---|---|
  | 韓立／南宮婉（預設，免費） | `male` / `female` |
  | 執扇仙子、琵琶仙子、花仙童女 | `fan-fairy` / `pipa-fairy` / `flower-girl` |
  | 藍衣少年、亂星海大善人、銀髮劍仙 | `blue-youth` / `starsea` / `silver-swordswoman` |
  | 妖妖、羅峰、姜太虛、少年人皇 石昊 | `yaoyao` / `luofeng` / `jiang-taixu` / `golden-emperor` |

- **條件類型**（`checkAvatarCondition()`）：`coins`（購買）之外，程式仍支援「達成即自動解鎖」的 `realm`／`level`／`reputation`／`tribulation`，
  由 `updateUI()` 呼叫的 `checkAvatarUnlocks()` 判定（`coins` 類型會被略過，一定要玩家自己買）。之後想讓特定頭像改回成就解鎖，改該筆的 `unlock` 即可。
  ※ 改版前曾短暫使用成就解鎖；當時已自動解鎖的頭像記錄在存檔的 `unlockedAvatars`，會維持已解鎖。
- **新增頭像**：圖片裁成正方形（建議 256×256、臉部置中）放進 `images/avatars/`，在 `config-avatars.js` 的 `avatarList` 加一筆。
  `id` 會寫進存檔，**上線後不要改名**（改名會讓已解鎖／使用中的紀錄失效，退回預設頭像）。
- **圖片處理紀錄**：`images/avatars/` 的圖是用 .NET System.Drawing 從玩家提供的原圖依臉部位置裁正方形、縮成 256×256（JPEG 品質 90）。
  三位仙子取自三聯圖（解析度較高），妖妖的原圖只有 225×225，放大後較模糊，有更清楚的圖可直接替換同檔名。
- **顯示位置**：洞府頭像框（`home-ui.js`）、戰鬥分頁的戰場實況（`ui.js` 的 `updateCombatVisualPanel`）都用 `getPlayerAvatar()`；
  開場性別選擇視窗仍固定顯示韓立／南宮婉。

## 33. 背景掛機補發（縮小視窗／切 App／鎖螢幕）

**問題（2026-09-24 實測）**：遊戲靠 `setInterval(combatTick, 1000)` 推進，瀏覽器會節流背景分頁的計時器——
App 內建瀏覽器隱藏約 2 分鐘後降到每分鐘約 31 次（半速）；一般 Chrome 背景 5 分鐘後可能降到每分鐘 1 次；手機切 App／鎖屏通常完全暫停。
而離線結算只在讀檔時執行，所以回到畫面後這段損失**不會補回**。

**做法**（`save.js`）：
- `combatTick()` 開頭呼叫 `checkBackgroundCatchUp()`：記下每次 tick 的時間 `lastTickAt`，兩次間隔超過 `BACKGROUND_TICK_SLACK_MS`(1500ms)
  就把「間隔 − 1 秒」累積到 `missedTickMs`（只算沒跑到的時間，已執行的 tick 不重複計）。
- 累積滿 `BACKGROUND_SETTLE_MIN_SECONDS`(10) 秒就以 `settleIdleSeconds(秒數, "背景掛機時")` 補發，只寫日誌、不跳 alert；單次上限 24 小時（同離線）。
- `settleIdleSeconds()` 是從 `calcOfflineProgress()` 抽出的共用結算：經驗、靈石、聲望、功德、救僕從、壽元流逝（×`LIFESPAN_OFFLINE_RATE`）、靈寵維持費，
  **公式與離線掛機完全相同**，改離線收益時兩者同步生效。
- 渡劫中、已死亡、`gameOver` 時不補發，並丟棄累積時間。
- 與讀檔離線結算不會重複：切到背景時 `visibilitychange` 會存檔更新 `lastSaveTime`；
  若分頁在背景被瀏覽器結束，下次讀檔從該時間算離線；若分頁恢復執行，則由背景補發處理。
- 附帶效果：`alert`/`confirm` 視窗開著時 JS 會暫停，關閉後這段時間也會被補發（視同時間流逝）。
- 目前離線／背景補發**不推進門派任務與僕從任務**（沿用原本離線結算的行為）。

## 34. 設定：顯示尺寸與全螢幕（`settings.js`）＋ PC 版洞府

入口：手機版為洞府 HUD 右上面板最下列的「⚙️ 設定」（`#btn-settings`）；PC 版為圖上左下的「設置」鈕。都呼叫 `openSettingsModal()` → `#settings-modal`。

| 選項 | 版面（`resolveDisplayLayout()`） | 說明 |
|---|---|---|
| 📱 手機 9:16 | `phone` | 舞台高 = 視窗高、寬 = min(視窗寬, 高 × 9/16)：手機上**滿版**；電腦上是置中的 9:16 直式畫面。背景圖伸縮填滿（真實手機約 9:19.5，變形很小；純 9:16 會壓扁約 18%），疊加元素都是 % 座標所以仍對齊 |
| 🖥️ PC 16:9 | `pc` | 整面顯示 PC 專用橫式圖 `images/home-bg-pc.jpg`（1376×768），等比塞進視窗，多出的邊用同圖模糊補底；分頁面板開在畫面中央（見下方） |
| 自動尺寸（預設） | 視窗寬 ≥ `AUTO_PC_MIN_WIDTH`(900) 且寬高比 ≥ `AUTO_PC_MIN_RATIO`(1.2) → `pc`，否則 `phone` | 設定視窗會標示目前實際使用哪一種 |
| ⛶ 全螢幕 | （開關，不是版面） | `toggleFullscreen()` 用 Fullscreen API（含 webkit 前綴）；不支援時（iPhone Safari）提示改用「加入主畫面」。進出全螢幕觸發 resize，版面自動重算；按 Esc 離開時 `fullscreenchange` 會更新按鈕狀態 |

- **儲存**：`localStorage['xiuxian_display_mode']`（`phone`／`pc`／`auto`），讀寫都包 try/catch，讀不到就用 `auto`。
  屬於**裝置偏好，不寫進遊戲存檔**，所以匯入別台的存檔不會改變版面。全螢幕狀態不儲存（瀏覽器規定必須由使用者點擊觸發）。
### PC 版洞府（`#pc-stage`）
- **結構**：`#app-frame` 內有兩個舞台：手機版 `#app-stage`（直式圖）與 PC 版 `#pc-stage`（橫式圖）。`body.layout-pc` 時只顯示 `#pc-stage`。
  `layoutStage()` 依版面設定舞台大小與 `--u`（= 螢幕像素 ÷ 圖上像素，PC 圖寬 1376），並把**唯一一份** `#tab-sheet` 用 `appendChild` 搬進目前的舞台
  （只搬 DOM 節點，所有 id 與事件不變，`updateUI()` 照常寫入）。`#stage-toast` 放在 `#app-frame`，兩種版面共用。
- **HUD**（寫在 index.html，座標 = 圖上像素 ÷ 1376 或 768 的 %）：id 一律是手機版的 `hud-xxx` 加 `pc-` 前綴，`updateHomeHud()` 同時寫入兩邊。

  | 元素 | 圖上位置 | 內容 |
  |---|---|---|
  | `#pc-hud-avatar` | 頭像框內圓 (26,25) 104×104 | 玩家頭像，點擊更換 |
  | `#pc-hud-name` | 名字框 (135,38) 143×84 | 道號、境界（虛弱變紅）、Lv 與進度條、戰力 |
  | `#pc-hud-coins` | 第 1 個資源框（藍晶） | 靈石 |
  | `#pc-hud-core` | 第 2 個資源框（元寶） | **獸丹**（只有 PC 版顯示，靈寵維持費要看） |
  | `#pc-hud-rep` | 第 3 個資源框（藍鑽） | 聲望；`.pc-pill-cover` 深色底蓋掉圖上的假數字「5.366」 |
  | `.pc-stat-label` ×3 | 狀態框標籤 (1183,71/101/131) | 深色底蓋掉圖上的「體力／靈力／仙力」，改寫氣血／靈力／修為 |
  | `.pc-stat-bar` ×3 | 狀態框內三條空條 (1219,75/105/135) 115×11 | 氣血／靈力／修為進度與數字 |
  | `#pc-hud-rate-line` | 狀態框最下列 | 修煉效率 |

  圖上資源框與狀態框右邊的「＋」目前沒有功能。
- **按鈕與建築熱點**：全部定義在 `config-home-pc.js` 的 `pcStageButtons`，`home-ui.js` 的 `renderPcStage()`（`initHomeUi()` 時執行一次）依表產生。
  **要調整按鈕功能或開關，只改這張表**：`action` 是 onclick 字串；`enabled: false` 可停用；`nav` 填分頁名稱會跟著分頁亮選中光暈；
  `kind: 'hotspot'` 只在洞府（面板關閉）時可點，可加程式牌匾 `plaque`；`kind: 'button'` 一直可點。

  | 圖上 | 功能 |
  |---|---|
  | 寶塔（牌匾「升仙台」） | `openAscensionPlatform()`（待渡劫亮紅點，`#pc-plaque-ascend`） |
  | 中央山門（「宗門」） | 宗門分頁 |
  | 右側屋舍（「僕從小屋」） | `openServantModal()` |
  | 左側樓閣（「煉丹房」） | `openAlchemyModal()` |
  | 傳送門（圖上已有牌匾） | `openMapCategoryModal()` |
  | 湖中光環（「領物閣」） | `openActivity('auction')` |
  | 左側 信件／背包／設置 | 興建中／`openBagModal()`／`openSettingsModal()` |
  | 右下 修煉加速／信件 | 興建中 |
  | 右下 修仕／戰鬥／洞府／福袋 | 修仙／戰鬥／洞府（關閉面板）／**世界**分頁（福袋暫作世界入口） |

- **分頁面板**：位置在 `PC_SHEET_RECT`（圖上 (300,40) 845×625，避開左上 HUD、右上狀態框與底部按鈕），
  `renderPcStage()` 換算成 CSS 變數 `--pc-sheet-left/top/width/height`。開啟時隱藏建築熱點，按鈕仍可點；✕ 或「洞府」關閉。
  面板字級 15px、卡片最小寬 170px、日誌高 34vh。
- **圖片處理紀錄**：原圖上方有五顆導覽圓鈕，以 System.Drawing 將圓形區域用周圍像素反覆平均填補（調和填補＋輕微雜訊）移除，
  「修仙」「洞府」原位置因鄰近鳳凰翅膀留有淡光暈，正常大小不明顯。圖上的紅點與右下「修仕」錯字保留（畫死在圖上）。
  ⚠️ 換 PC 圖時要改 `PC_STAGE_IMG_W/H`、重量 `pcStageButtons`／`PC_SHEET_RECT` 與 index.html `#pc-stage` 內 HUD 的 % 座標。
- ⚠️ 全域樣式 `button.active` 會把按鈕底色改成金色，新的 `.xxx.active` 按鈕樣式要自己覆蓋 `background`/`color`（`.settings-option.active` 即是）。
- 驗證紀錄（2026-09-24）：1376×768 自動 → PC 版滿框，HUD 與圖上框對齊（放大檢查）、9 個按鈕＋6 個熱點、戰鬥分頁面板與「洞府」關閉、「設置」開設定；
  1440×900（16:10）→ PC 版上下補模糊邊；375×812 自動 → 手機滿版、無水平捲動；1280×720 強制手機 → 置中 405×720。全螢幕需使用者手勢，未自動化測試。
