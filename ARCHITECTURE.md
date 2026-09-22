# 專案架構說明（凡人修仙放置傳）

> **維護規則：本檔案需與程式碼同步更新。**
> 每次新增/刪除/搬移 `data/` 內的檔案、新增全域函式或資料、或調整 `<script>` 載入順序時，
> 都必須回來更新本檔案對應的段落（檔案清單、依賴關係表、函式對照表）。
> 這是本專案唯一的架構文件，過期的文件比沒有文件更危險。

## 1. 專案結構

```
index.html            唯一的 HTML 進入點：畫面結構、CSS（含手機 RWD，見第 6 節）、
                      彈窗(modal) DOM、<script src> 載入清單
                      ※ 檔名必須是 index.html（GitHub Pages 只把 index.html 當作預設首頁）
data/                 所有遊戲邏輯與資料，依「設定資料 / 執行狀態 / 功能模組 / 進入點」分層
  config-*.js         純資料表（不含函式，無副作用），可視為遊戲的「設計數值表」
  state.js            執行期間的可變全域狀態（player、enemies…）
  stats.js            屬性/戰力計算的純函式
  ui.js               畫面渲染共用函式（頂部狀態列、戰鬥實況、日誌、彈窗開關）
  map.js / combat.js / leveling.js
                      地圖切換、戰鬥 tick、升級與輪迴
  sect.js / shop.js / bag.js / equipment.js / lingbao-shop.js /
  servant.js / quest.js / field.js / beast.js / library.js / alchemy.js
                      每個彈出視窗(modal) 對應一支檔案，管理該功能的渲染與互動
  player-profile.js   玩家道號修改
  save.js             本地存檔/讀檔/匯出入/離線掛機結算/重置
  main.js             initGame() 與 window.onload，遊戲啟動進入點
```

這是一個**純前端、無建置工具**的專案：所有 `data/*.js` 都是傳統 `<script>`（非 `type="module"`），
彼此共享同一個全域作用域。`index.html` 內的 `onclick="xxx()"` 會直接呼叫這些全域函式，
因此**檔案拆分時一律保留原本的函式名稱**，不可改名，否則畫面按鈕會失效。

## 2. 載入順序與依賴關係

`index.html` 底部依序載入以下腳本。多數功能檔案彼此呼叫時**不受載入順序影響**
（函式宣告會先被瀏覽器解析完成，實際呼叫要等到 `window.onload` 之後才發生）。
但以下兩個檔案在載入當下就會**立即執行頂層程式碼**，因此順序不可調換：

- `config-maps.js` 必須在 `state.js` 之前載入：`state.js` 的 `player.currentMap` 直接讀取 `maps[0].items[0]`。
- `main.js` 必須放在最後：它的 `window.onload` 內會呼叫幾乎所有模組的函式，需確保全部腳本都已解析完成。

| # | 檔案 | 責任 | 依賴（讀取哪些全域） | 被誰依賴 / 誰會呼叫它 |
|---|------|------|----------------------|------------------------|
| 1 | `config-realms.js` | `realms` 境界名稱陣列 | 無 | `stats.js`(getNextExp)、`ui.js`、`leveling.js` |
| 2 | `config-maps.js` | `maps` 地圖資料、`monsterIcons` | 無 | `state.js`、`map.js`、`combat.js`、`ui.js` |
| 3 | `config-sects.js` | `sectData` 宗門與技能表 | 無 | `sect.js`、`stats.js`(getSectTier)、`combat.js` |
| 4 | `config-lingbao.js` | `lingbaoShopItems` 靈寶閣商品 | 無 | `lingbao-shop.js` |
| 5 | `config-shop.js` | `shopItems` 丹藥堂商品 | 無 | `shop.js`、`bag.js`、`combat.js`(自動補血補魔) |
| 6 | `config-beasts.js` | `beastData` 靈獸資料 | 無 | `beast.js`、`stats.js`(getBasePower)、`leveling.js`(gainExp) |
| 7 | `config-servants.js` | `servantQualities`、`servantNames` | 無 | `combat.js`(tryRescueServant) |
| 8 | `config-equipment.js` | `equipTypes`、`wuxingElements`、`equipQualities` | 無 | `equipment.js` |
| 9 | `state.js` | `player`、`enemies`、`respawnTimer`、`safeZoneTimer` | **`maps`**（必須排在 config-maps.js 之後） | 幾乎所有檔案都會讀寫 `player` |
| 10 | `stats.js` | `getEquipBonus`/`getWuxingBuff`/`getNextExp`/`getBasePower`/`getPhysAttack`/`getMagAttack`/`getMaxHp`/`getMaxMp`/`getSectTier` | `player`、`realms`、`sectData` 判斷邏輯 | `ui.js`、`combat.js`、`leveling.js`、`equipment.js`、`beast.js` 等幾乎全部功能檔 |
| 11 | `ui.js` | `updateUI`/`updateCombatVisualPanel`/`updateStudyCountsUI`/`renderSkillList`/`addLog`/`updateAutoSettings`/`syncAutoSettingsUI`/`updateSectFacilitiesUI`/`closeModal` | `player`、`realms`、`stats.js` 的計算函式 | 幾乎所有功能檔在資料變動後都會呼叫 `updateUI()`/`addLog()` |
| 12 | `map.js` | `openMapCategoryModal`/`selectMap`/`changeMap` | `maps`、`player`、`ui.js` | `quest.js`(stopQuest 由 changeMap 呼叫)、HTML 按鈕 |
| 13 | `combat.js` | `combatTick`/`checkAutoHealAndMana`/`tryRescueServant` | `player`、`enemies`、`shopItems`、`servantQualities`、`servantNames`、`stats.js`、`leveling.js`(gainExp)、`map.js`(changeMap 死亡回城) | `main.js`(setInterval 每秒呼叫) |
| 14 | `leveling.js` | `gainExp`/`triggerReincarnate` | `realms`、`player`、`stats.js` | `combat.js`、`save.js`、HTML 輪迴按鈕 |
| 15 | `sect.js` | `checkSectJoined`/`openSectModal`/`renderSects`/`joinSect` | `sectData`、`player` | 幾乎所有「需拜入宗門才能使用」的彈窗（shop/servant/field/beast/lingbao-shop/library/forge/alchemy）都會先呼叫 `checkSectJoined()` |
| 16 | `shop.js` | `openShopModal`/`renderShop`/`buyShopItem` | `shopItems`、`player`、`sect.js`(checkSectJoined) | HTML 按鈕、`bag.js` 顯示已購買道具 |
| 17 | `bag.js` | `openBagModal`/`renderBag`/`useItemFromBag`/`deleteItemFromBag`/`deleteEquipFromInventory` | `shopItems`、`player.bag`、`player.equipInventory` | `equipment.js`(equipItem 後呼叫 renderBag) |
| 18 | `equipment.js` | `initForgeSelect`/`openEquipmentModal`/`renderLingbaoUI`(注意：命名沿用舊碼，實際是角色裝備列表)/`equipItem`/`unequipItem`/`openForgeModal`/`forgeEquipment` | `equipTypes`、`wuxingElements`、`equipQualities`、`player.equipment`、`player.equipInventory` | `bag.js`(equipItem)、`sect.js`(forge 需拜入宗門) |
| 19 | `lingbao-shop.js` | `openLingbaoShopModal`/`renderLingbaoShopUI`/`buyLingbaoItem` | `lingbaoShopItems`、`player.coins`/`reputation`/`equipInventory`/`learnedSkills` | HTML 按鈕（僅在「後山禁地」顯示） |
| 20 | `servant.js` | `openServantModal`/`renderServants`/`assignServant`/`dismissServant` | `player.servants`、`player.assignedServantIds` | `quest.js`(任務加速)、`combat.js`(tryRescueServant 新增僕從) |
| 21 | `quest.js` | `openQuestModal`/`renderQuestButtons`/`startQuest`/`stopQuest`/`updateQuestUI` | `player.activeQuest`、`stats.js`(getSectTier) | `combat.js`(每 tick 累積任務進度)、`map.js`(離開演武學宮時中斷任務) |
| 22 | `field.js` | `openFieldModal`/`plantHerb` | `player.spiritGrass`/`player.herbs`/`player.coins` | HTML 按鈕（僅在「演武學宮」顯示） |
| 23 | `beast.js` | `openBeastModal`/`renderBeasts`/`tameBeast` | `beastData`、`player.beastCore`/`coins`/`beasts`、`stats.js`(getEquipBonus 算魅力折扣) | HTML 按鈕（僅在「演武學宮」顯示） |
| 24 | `library.js` | `openLibraryModal`/`studyBook` | `player.studyCounts`/`martialPoints`/`stats` | HTML 按鈕（僅在「後山禁地」顯示） |
| 25 | `alchemy.js` | `openAlchemyModal`/`craftPill` | `player.herbs`/`stats`/`coins` | HTML 按鈕（僅在「後山禁地」顯示） |
| 26 | `player-profile.js` | `changePlayerName` | `player.name` | HTML 按鈕 |
| 27 | `save.js` | `calcOfflineProgress`/`saveLocal`/`loadLocal`/`exportSave`/`importSave`/`resetGameCompletely` | `player`（整包序列化進 `localStorage`）、`leveling.js`(gainExp)、`combat.js`(tryRescueServant)、`ui.js` | `main.js`(啟動時 loadLocal)、`main.js`(initGame 內每 30 秒 saveLocal) |
| 28 | `main.js` | `initGame`/`window.onload` | 幾乎全部模組（啟動流程的膠水程式碼） | 瀏覽器 `onload` 事件 |

## 3. 資料流總覽（文字版流程圖）

```
使用者開啟 index.html
        │
        ▼
瀏覽器依序載入 config-*.js → state.js → stats.js → ui.js
        → map/combat/leveling → 各彈窗功能檔 → save.js → main.js
        │
        ▼
window.onload (main.js)
        │
        ├─ loadLocal() [save.js] 讀 localStorage
        │       ├─ 成功 → calcOfflineProgress() 結算離線收益 → updateUI()
        │       └─ 失敗 → prompt() 選性別，建立新 player [state.js 的預設值]
        │
        ▼
initGame() [main.js]
        ├─ initForgeSelect()      [equipment.js]
        ├─ syncAutoSettingsUI()   [ui.js]
        ├─ updateUI()             [ui.js]
        ├─ setInterval(combatTick, 1000)   [combat.js]  ← 遊戲主迴圈
        └─ setInterval(saveLocal, 30000)   [save.js]    ← 自動存檔

combatTick() 每秒執行 [combat.js]
        ├─ 安全區：回血回魔、每 5 秒 gainExp() [leveling.js]
        ├─ 野外：刷怪 / 攻擊 / 技能 [stats.js 算傷害] / 擊殺結算
        │       └─ 擊殺 → gainExp()、加靈石、tryRescueServant() [combat.js]
        ├─ 任務進度累積 [quest.js 的 activeQuest]
        └─ checkAutoHealAndMana() 自動補給 [combat.js]

任何彈窗操作（購買/裝備/宗門/任務…）
        └─ 修改 player 狀態 → 呼叫 updateUI()/addLog() [ui.js] → 畫面即時更新
```

## 4. HTML `onclick` → 函式 → 所在檔案 對照表

新增/修改 HTML 按鈕時，務必同步確認函式名稱與下表一致（全域函式，不可加 `type="module"`）。

| onclick 呼叫 | 定義檔案 |
|---|---|
| `changePlayerName` | `data/player-profile.js` |
| `openEquipmentModal`, `unequipItem`, `equipItem`, `forgeEquipment` | `data/equipment.js` |
| `openMapCategoryModal`, `selectMap` | `data/map.js` |
| `openSectModal`, `joinSect` | `data/sect.js` |
| `openShopModal`, `buyShopItem` | `data/shop.js` |
| `openBagModal`, `useItemFromBag`, `deleteItemFromBag`, `deleteEquipFromInventory` | `data/bag.js` |
| `openServantModal`, `assignServant`, `dismissServant` | `data/servant.js` |
| `openQuestModal`, `startQuest`, `stopQuest` | `data/quest.js` |
| `openFieldModal`, `plantHerb` | `data/field.js` |
| `openBeastModal`, `tameBeast` | `data/beast.js` |
| `openLingbaoShopModal`, `buyLingbaoItem` | `data/lingbao-shop.js` |
| `openLibraryModal`, `studyBook` | `data/library.js` |
| `openForgeModal` | `data/equipment.js` |
| `openAlchemyModal`, `craftPill` | `data/alchemy.js` |
| `triggerReincarnate` | `data/leveling.js` |
| `resetGameCompletely`, `saveLocal`, `loadLocal`, `exportSave`, `importSave` | `data/save.js` |
| `updateAutoSettings` | `data/ui.js` |
| `closeModal` | `data/ui.js` |

## 5. 新增功能的建議流程

1. **新增資料（怪物/裝備/宗門/商品…）**：優先修改對應的 `data/config-*.js`，不要動邏輯檔。
2. **新增彈窗/系統玩法**：比照現有模式新增一支 `data/新功能.js`（`open高X高Modal` + `render高X高` + 互動函式），
   在 `index.html` 對應位置加上按鈕與彈窗 DOM，並在 `<script>` 清單中加入 `<script src="data/新功能.js"></script>`
   （放在 `state.js`/`ui.js` 之後、`main.js` 之前即可，除非新檔案有頂層立即執行的程式碼且依賴其他資料）。
3. **修改屬性公式**：只改 `data/stats.js`。
4. **修改存檔結構**：修改 `data/state.js` 的 `player` 初始值，並檢查 `data/save.js` 的
   `loadLocal`/`importSave` 是否需要補上舊存檔缺欄位時的預設值（目前已有 `gender`/`name`/`stats.cha`/`studyCounts` 的相容處理）。
5. **新增畫面元素時**：先確認電腦版排版，再到 `index.html` 的 media query 區塊
   （第 6 節）補上手機版的調整，避免手機出現破版或水平捲動。
6. **完成任何修改後，回來更新本檔案（ARCHITECTURE.md）對應章節。**

## 6. 版型與 RWD 規則（電腦版 / 手機版）

所有樣式集中在 `index.html` 的 `<style>` 內，分成兩段：

1. **共用 / 電腦版樣式**（檔案前半，`@media` 之前）：原本的三欄式版型，未加任何條件，行為與改版前完全相同。
2. **手機 / 平板樣式**（檔案末端，兩個 `@media` 區塊）：**只在窄螢幕生效**，因此不會影響電腦版。

| 斷點 | 目標裝置 | 主要調整 |
|---|---|---|
| `@media (max-width: 900px)` | 手機、平板直式 | 三欄 `300px 1fr 300px` → 單欄；用 `order` 重排為 **狀態列 → 戰場實況 → 角色/地圖 → 宗門設施**；狀態列改直式堆疊（境界/戰力、靈石/聲望各自橫向排）；按鈕加大為觸控尺寸並取消 hover 位移；彈窗寬度 94%、卡片自動排成雙欄；靈寶閣雙按鈕改上下排列；鍛造閣下拉選單與按鈕改整列 |
| `@media (max-width: 480px)` | 一般手機（360–430px） | 進一步縮小 padding、字級、日誌高度、頭像尺寸，卡片最小寬度降為 135px 以維持雙欄 |

維護注意事項：

- **不要為了手機去改電腦版的既有規則**；所有手機調整一律寫進 media query 內，這是「手機有自己的 UI、電腦版不受影響」的前提。
- HTML 內有不少**行內樣式**（如 `style="width: auto; margin-left: 10px;"`）。行內樣式優先權高於 CSS，
  若手機版需要覆蓋它，必須在 media query 內使用 `!important`（目前 `#forge-modal .shop-btn`、
  `#battle-player-icon img`、狀態列子項的 `margin-top` 即是這種情況）。
- `#game-container > div:nth-of-type(n)` 依賴四個直接子元素的順序（header / 角色欄 / 戰場欄 / 設施欄）。
  若之後在 `#game-container` 內新增或調換區塊，必須同步更新 media query 內的 `order` 規則。
- 驗證方式：瀏覽器開發者工具切換 375px、360px 與 >900px 三種寬度，確認
  `document.documentElement.scrollWidth === clientWidth`（無水平捲動），且電腦版維持三欄。
