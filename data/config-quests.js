// 門派任務定義：同一個任務在不同宗門等級 (getSectTier) 有不同的名稱與獎勵
// 這份資料同時供「任務面板顯示獎勵」與「實際發放獎勵」使用，修改此處即可同步兩邊。
// 宗門任務只給道具，不給靈石；唯一例外是初級宗門的「打掃清潔」給 50 靈石（新手起步用）。
//
// 每個等級的定義可選填：
//   rewards 的值可為固定數字，或 [最小, 最大]（每次完成隨機整數）
//   requiredQuality = 限定此品質的僕從才能接（玩家本人也不能親自執行）
//   duration        = 固定耗時（秒），不受僕從效率影響；未填則為 QUEST_REQUIRED_PROGRESS / QUEST_PROGRESS_PER_TICK 秒 ÷ 僕從效率
//   某等級不填（例：mine 沒有 1）代表該宗門等級沒有此任務
const questData = {
    clean: {
        1: { name: "打掃清潔", icon: "🧹", rewards: { coins: 50 } },
        2: { name: "餵養靈獸", icon: "🥩", rewards: { beastCore: 10 } },
        3: { name: "餵養仙獸", icon: "🐉", rewards: { beastCore: 50 } }
    },
    plant: {
        1: { name: "種植靈草", icon: "🌱", rewards: { spiritGrass: 1 } },
        2: { name: "種植靈草", icon: "🌱", rewards: { spiritGrass: 10 } },
        3: { name: "種植靈草", icon: "🌱", rewards: { spiritGrass: 50 } }
    },
    book: {
        1: { name: "整理武學秘典", icon: "📚", rewards: { martialPoints: 1 } },
        2: { name: "整理武學秘典", icon: "📚", rewards: { martialPoints: 10 } },
        3: { name: "整理武學秘典", icon: "📚", rewards: { martialPoints: 50 } }
    },
    // 礦脈採礦：中級、高級宗門限定，只有傳說僕從能接，固定 60 秒一趟
    mine: {
        2: { name: "礦脈採礦", icon: "⛏️", rewards: { ore: [1, 30] }, requiredQuality: "傳說", duration: 60 },
        3: { name: "礦脈採礦", icon: "⛏️", rewards: { ore: [1, 30] }, requiredQuality: "傳說", duration: 60 }
    }
};

// 獎勵代號 -> 顯示名稱與 player 物件上對應的欄位
const questRewardInfo = {
    coins:         { label: "靈石",     field: "coins" },
    beastCore:     { label: "獸丹",     field: "beastCore" },
    spiritGrass:   { label: "靈草",     field: "spiritGrass" },
    martialPoints: { label: "武學積分", field: "martialPoints" },
    ore:           { label: "礦石",     field: "ore" }
};

const QUEST_REQUIRED_PROGRESS = 30;    // 完成一次任務所需進度
const QUEST_PROGRESS_PER_TICK = 1.5;   // 每秒累積的基礎進度（僕從再乘上自身效率 mult）
const MAX_ASSIGNED_SERVANTS = 3;       // 可同時派遣執行任務的僕從上限
