// 世界 Boss（ARCHITECTURE.md 第 75 節；邏輯 world-boss.js，雲端權限 tools/firestore.rules，GM 後台 gm.html「⚔️ 世界 Boss」）
// 2026-10-04 使用者選定：全服共用一條血、各自上線挑戰（不必同時在線）；每週六 20:00～週日 20:00（台灣時間）開放，GM 也能手動開一隻；
//   每天 3 次、每次 30 回合（或倒下為止），倒下不扣壽元；單次傷害不設上限（2026-10-10 起；10/9 固定 1000 萬，更早為總血量 1%）；
//   獎勵以「參加」為主（打過就有，Boss 被打死全服 ×2），排名只給外觀稱號；Boss 結束 24 小時後才能領獎（GM 審核期間）。
// ⚠️ 下列標「規則同樣寫死」的數字，改這裡要一起改 tools/firestore.rules 並到 Firebase 主控台發布。
const WB_STATE_COLLECTION = "wboss";        // wboss/state：目前的 Boss（全服一份）
const WB_RUNS_COLLECTION = "wbossRuns";     // wbossRuns/{bid}/dmg/{uid}：每人在該隻 Boss 的累計傷害
const WB_CLAIM_COLLECTION = "wbossClaims";  // wbossClaims/{bid}_{uid}：領獎紀錄（每隻每人一次）

const WB = {
    dailyMax: 3,                  // 每天挑戰次數（台灣時間換日；規則同樣寫死）
    gapSec: 60,                   // 兩次挑戰至少間隔（規則同樣寫死）
    // 單次傷害上限：0＝不設上限（2026-10-10 使用者：「世界 Boss 改不設定傷害限制，玩家打多少算多少」；規則同步拿掉上限）
    //   歷史：10/9 前總血量 1%、10/9 固定 1000 萬（模擬：混沌道祖 10 階極限頂配 30 回合平均 599 萬、最高 829 萬；強力配置 37～77 萬，第 75 節）
    cap: 0,
    stateCap: 10000000,           // wboss/state 的 cap 欄位（只是紀錄；換隻規則仍要求 == 10000000，所以照寫）；舊規則還沒換掉前，超過它的戰果會改以它重送
    suspectDmg: 9000000,
    // 血量無限（2026-10-10 使用者：「世界 Boss 血量改成無限」；起因：有人一次打出 229 億秒殺 10 億血的 Boss）：
    //   true＝玩家的傷害只累計到自己的紀錄、Boss 永遠不扣血也不會被擊敗（沒有最後一擊、沒有擊敗 ×2），排名依累計傷害；
    //   雲端 state 的 hp／maxHp 照存（規則與 GM 後台需要），畫面一律顯示「∞」。改回 false＝恢復有血量、可擊敗
    infiniteHp: true,          // GM 後台「可疑」門檻：單次 ≥ 900 萬（超過模擬極限約 829 萬）
    rounds: 30,                   // 每次挑戰回合數
    hitsToKill: 24,               // Boss 攻擊＝同境界一般玩家氣血（含增益）÷ 24：一般玩家不防禦約 24 下倒，防禦閃避好的能撐完 30 回合
    // 開放時段：每週六 12:00 UTC（台灣 20:00）起 24 小時。規則以 startAt 毫秒 % 一週 == 216000000（1970-01-01 是週四 00:00 UTC，+2.5 天＝週六 12:00）檢查
    weekOffsetMs: 216000000,
    durationMs: 24 * 3600 * 1000,
    claimDelayMs: 24 * 3600 * 1000,   // 結束後 24 小時才能領獎（規則同樣寫死）
    // 血量（雲端存「畫面數字」的整數＝內部數值 × combatScale）：第一隻 4 億（2026-10-09 由 4000 萬調高，約頂級玩家 60～70 次）；
    //   之後每隻依上一隻：被打死 ×2、沒打死 ÷2（取整），夾在 min～max（規則同樣寫死）
    firstHp: 400000000,
    minHp: 4000000,
    maxHp: 4000000000000,
    topN: 20,                     // 排行榜讀前 20 名（規則限制單次最多 20）
    cacheMs: 3 * 60 * 1000,       // 3 分鐘內重開視窗不重讀排行榜（節省 Firebase 讀取額度）
    // 參加獎（打過 1 次以上就有；Boss 被打死 ×2）：靈石＝每小時收入 × coinsH
    rewards: { coinsH: 3, refine: 15, iron: 10, craft: { tianji: 2, hunyuan: 1 } },
    killMult: 2,
    // 外觀稱號（config-titles.js 的 cond type 'wboss'，沒有數值加成）
    titles: { top1: "wbTop1", top10: "wbTop10", lastHit: "wbLastHit" }
};

// 輪替的 Boss（依開放的週次輪流；圖片沿用鎮魔塔 BOSS 圖）。數值不用 realm：強度跟著挑戰者的境界（world-boss.js 的 wbBossStats）
// ⚠️ 新 Boss 一律加在最後：雲端 wboss/state 存的是 bossIdx（索引），插在中間會讓進行中的那隻變成別隻（規則允許 0～15）。
// 選填 videos／videoLoopFrom：戰鬥畫面的專屬動畫，依序播放，播完從 videoLoopFrom 那支開始循環，直到戰鬥結束（不能跳過）
const WB_BOSSES = [
    {
        name: "八岐大蛇", title: "八首噬天", img: "images/zhenmo/boss-yamata.jpg", imgPos: "50% 25%", race: "beast", element: "水",
        def: 20, eva: 10, affix: "fire", affixVal: 20, atkMult: 1, icon: "🐍",
        intro: "八首巨蛇自東海深淵甦醒，吞雲吐焰，諸天修士須合力斬之。",
        skills: ["八首齊噬", "怒濤吐焰", "毒鱗風暴", "深淵咆哮"],
        auras: [{ name: "八首齊噬", player: { curse: 0.05 }, self: { def: 5 } }]
    },
    {
        name: "需佐能呼", title: "暴風荒神", img: "images/zhenmo/boss-susanoo.jpg", imgPos: "55% 22%", race: "demon", element: "水",
        def: 22, eva: 12, affix: "thunder", affixVal: 20, atkMult: 1, icon: "⚡",
        intro: "被逐出高天原的荒神，雷火纏身、颶風護體，所過之處山河崩裂。",
        skills: ["天叢雲劍", "雷火灼身", "颶風斬", "荒神怒"],
        auras: [{ name: "雷火灼身", player: { burn: 0.05 }, self: { def: 5 } }]
    },
    {
        name: "六道極聖", title: "六道輪迴", img: "images/zhenmo/boss-liudao.jpg", imgPos: "50% 25%", race: "demon", element: "土",
        def: 24, eva: 10, affix: "poison", affixVal: 20, atkMult: 1, icon: "☯️",
        intro: "魔道老祖破塔而出，六道漩渦吞噬萬物，欲煉化諸天修士的元神。",
        skills: ["六道輪迴", "七寶虯杖", "萬魔噬魂", "紫雷天劫"],
        auras: [{ name: "六道威壓", player: { atk: 0.05 }, self: { regen: 0.001 } }]
    },
    {
        name: "天照大神", title: "八咫神鏡", img: "images/zhenmo/boss-amaterasu.jpg", imgPos: "50% 22%", race: "heart", element: "火",
        def: 20, eva: 14, affix: "fire", affixVal: 20, atkMult: 1, icon: "☀️",
        intro: "八咫神鏡照見眾生心魔，日輪神威之下，唯有道心堅定者方能久戰。",
        skills: ["日輪神威", "八咫照心", "天岩戶封印", "烈日灼魂"],
        auras: [{ name: "天岩戶封印", player: { freeze: 0.03 }, self: { atk: 0.05 } }]
    },
    {
        // 2026-10-05 使用者提供 op1／OP2／OP3 動畫：「影片專屬 OP王」「1→2→3 後循環 2→3 不停」。（OP2 與 OP3 原本是同一個檔案，10/6 第三段換成新影片）
        name: "OP王", title: "金甲武神", img: "images/zhenmo/boss-opwang.jpg", imgPos: "60% 60%", race: "demon", element: "金",
        def: 22, eva: 12, affix: "metal", affixVal: 20, atkMult: 1, icon: "⚔️",
        intro: "金甲覆身、紫焰為刃的域外武神，一劍劈開星河，諸天修士須合力方能抵擋。",
        skills: ["紫焰天斬", "金甲護體", "星河一劍", "武神降世"],
        auras: [{ name: "金甲護體", player: { atk: 0.05 }, self: { def: 5 } }],
        // 2026-10-06 使用者提供新的第三段（20 秒）：「op王第三段動畫 換成這個」→ op3.mp4
        videos: ["videos/world-boss/op1.mp4", "videos/world-boss/op2.mp4", "videos/world-boss/op3.mp4"],
        videoLoopFrom: 1,
        // 動畫對白（2026-10-06 使用者：「影片op王加上一下對白：愚蠢的刁民 吃我一劍!! 登! 龍! 閃!」）：跟 videos 一一對應，null＝那段沒有對白；
        // 每句 { at 該段開播後第幾秒出現, end 第幾秒消失, text, cls（row＝獨立一行、big＝大字、chant＝招式喊聲逐字蹦出）, hit（出現時震動＋白光）, log（同時寫進戰況） }；循環重播時對白也重播
        // 使用者：「字可以放在第三段影片，登龍閃放在最後絕招使用」→ 全部放 op3；第 30 回合約在 op3 第 19 秒結束
        // 「登龍閃可以提早兩秒，因為閃字一出直接回合結束跳出」→ 15～16.8 秒（「閃!」之後約 2.5 秒才結算，看得到）
        videoLines: [
            null,
            null,
            [{ at: 1.0, end: 8, text: "愚蠢的刁民", cls: "row" }, { at: 2.6, end: 8, text: "吃我一劍!!", cls: "row big" },
             { at: 15.0, end: 20.5, text: "登!", cls: "chant" }, { at: 15.9, end: 20.5, text: "龍!", cls: "chant" },
             { at: 16.8, end: 20.5, text: "閃!", cls: "chant", hit: true, log: "💥 OP王施展絕招【登龍閃】！" }]
        ],
        // 使用者選「戰鬥時間跟著動畫走」：三段共 10＋10＋20 秒，一回合 1.34 秒，30 回合約 40 秒＝三段動畫剛好播完一輪；有動畫的 Boss 不能加速（隱藏 ×1／×2／×4）
        roundMs: 1340
    },
    {
        // 2026-10-10 使用者提供兩部影片：「兩部影片做成一個動畫，世界 Boss 宇宙領主-羅峰專用動畫」。
        //   第 2 部（20 秒）的前 10 秒就是第 1 部（逐秒比對 PSNR 約 44 dB），所以動畫＝第 2 部整支（開場 10 秒＋出劍 10 秒），轉成 854×480 → luofeng.mp4（約 3.3 MB）；
        //   Boss 圖是動畫第 1.5 秒的畫面。一回合 667 毫秒，30 回合約 20 秒＝動畫剛好播完一次（最後是雙劍合擊）；倒下提早結束則播到哪停到哪
        name: "羅峰", title: "宇宙領主", img: "images/zhenmo/boss-luofeng.jpg", imgPos: "50% 30%", race: "demon", element: "金",
        def: 24, eva: 14, affix: "metal", affixVal: 20, atkMult: 1, icon: "🌌",
        intro: "掌中握星河、披風藏萬界的宇宙領主，一念之間星辰崩滅，諸天修士須合力方能撼動。",
        skills: ["宇宙之心", "星河劍域", "渾源一劍", "領主降臨"],
        auras: [{ name: "宇宙領域", player: { atk: 0.05 }, self: { def: 5 } }],
        videos: ["videos/world-boss/luofeng.mp4"],
        videoLoopFrom: 0,
        roundMs: 667
    }
];
