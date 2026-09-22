// 門派任務定義：同一個任務在不同宗門等級 (getSectTier) 有不同的名稱與獎勵
// 這份資料同時供「任務面板顯示獎勵」與「實際發放獎勵」使用，修改此處即可同步兩邊。
const questData = {
    clean: {
        1: { name: "打掃清潔", icon: "🧹", rewards: { coins: 5 } },
        2: { name: "餵養靈獸", icon: "🥩", rewards: { coins: 50, beastCore: 10 } },
        3: { name: "餵養仙獸", icon: "🐉", rewards: { coins: 100, beastCore: 50 } }
    },
    plant: {
        1: { name: "種植靈草", icon: "🌱", rewards: { coins: 5, spiritGrass: 1 } },
        2: { name: "種植靈草", icon: "🌱", rewards: { coins: 50, spiritGrass: 10 } },
        3: { name: "種植靈草", icon: "🌱", rewards: { coins: 100, spiritGrass: 50 } }
    },
    book: {
        1: { name: "整理武學秘典", icon: "📚", rewards: { coins: 5, martialPoints: 1 } },
        2: { name: "整理武學秘典", icon: "📚", rewards: { coins: 50, martialPoints: 10 } },
        3: { name: "整理武學秘典", icon: "📚", rewards: { coins: 100, martialPoints: 50 } }
    }
};

// 獎勵代號 -> 顯示名稱與 player 物件上對應的欄位
const questRewardInfo = {
    coins:         { label: "靈石",     field: "coins" },
    beastCore:     { label: "獸丹",     field: "beastCore" },
    spiritGrass:   { label: "靈草",     field: "spiritGrass" },
    martialPoints: { label: "武學積分", field: "martialPoints" }
};

const QUEST_REQUIRED_PROGRESS = 30;    // 完成一次任務所需進度
const QUEST_PROGRESS_PER_TICK = 1.5;   // 每秒累積的基礎進度（僕從再乘上自身效率 mult）
const MAX_ASSIGNED_SERVANTS = 3;       // 可同時派遣執行任務的僕從上限
