// 屠龍勇者：二轉（職業進階）三選一分支（ARCHITECTURE.md 第 242 節；規劃 tools/ADVANCE-CLASS-PLAN.md）
// 依賴 config、classes、skills、items、spellbook、monsters、quests（載入時：把分支技能寫進 SKILL_BY_ID、二轉道具寫進 ITEMS、第 5～7 章接到 CLASS_QUESTS）
// 存檔 player.adv = { br 已完成的分支, pick 第 6 章選的試煉分支, at 完成時間, el 元素契約者的精靈元素 }（SAVE_SCHEMA 22）
// 任務進度沿用 player.quests（ch 4→7）。戰鬥效果都經由 combat／player／mercenary 的 typeof 掛鉤呼叫，沒二轉的角色完全不受影響。

const ADV_CH = 4;            // CLASS_QUESTS 的第 5 章（index 4）起是二轉
const ADV_SKILL1_LV = 60, ADV_SKILL2_LV = 70;
const ADV_RESHAPE_P = 0.003, ADV_RESHAPE_LV = 70;   // 命運重塑石：Lv.70 以上首領 0.3%
const ADV_WORLD_CUR_P = 0.05;                       // 天下：擊倒 5% 多掉 1 個通貨
const ADV_PROOF_P = 0.2;                            // 第 5 章：任何地圖首領 20% 掉職業之證
// 成長加成（二轉後每升一級的 HP／MP）
const ADV_GROW = { hp3: [0.30, 0], hp2: [0.20, 0], hp1: [0.10, 0], even: [0.10, 0.10], mp2: [0, 0.20], mp3: [0, 0.30], hp1mp: [0.10, 0.05] };
// 「N 倍魔法傷害」的基準（約一發 Lv.60 中階魔法）
function advMag(n) { return { dmg: [Math.round(30 * n), Math.round(50 * n)], spK: 1.5 * n }; }
// 共用魔法的屬性（法師／元素分支加成看這裡）
const ADV_SPELL_ELEM = {
    fireArrow: 'fire', fireball: 'fire', blaze: 'fire', mageInferno: 'fire', meteor: 'fire',
    iceDagger: 'ice', frostBreath: 'ice', iceLance: 'ice', blizzard: 'ice',
    windCutter: 'storm', auroraBolt: 'storm', lightning: 'storm', tornado: 'storm', thunderStorm: 'storm',
    holyBolt: 'holy', angelJudge: 'holy', angelRay: 'holy', angelWrath: 'holy', angelSanct: 'holy', palJudge: 'holy',
    mfThunder: 'storm', mfFlame: 'fire', mfBurst: 'elem', mfStorm: 'storm',
};

// ───────── 36 個分支 ─────────
// p＝核心被動（名稱與說明；效果寫在下面的掛鉤）、s1／s2＝Lv.60／Lv.70 技能（沿用 SKILLS 欄位，另加 adv 參數）
// color 名牌顏色、glow 腳下光效
const ADV_BRANCHES = {
    royal: [
        { id: 'rTyrant', name: '暴君', color: '#ff8a5c', glow: '#ffcc55', grow: 'hp2',
          p: { name: '天命所歸', desc: '持單手劍時傷害 +8%；王者之怒冷卻 10 秒縮短為 7 秒' },
          s1: { name: '霸王斬', mp: 25, type: 'strike', mult: 2, cd: 10, adv: { defDown: [5, 8] }, desc: '單體 2 倍傷害，目標防禦 −5（8 秒）' },
          s2: { name: '征服宣言', mp: 30, type: 'buff', sec: 180, cd: 180, fx: { dmg: 2 }, adv: { killHeal: 0.03 }, desc: '3 分鐘內傷害 +2，每擊倒一隻回 3% HP' } },
        { id: 'rEmperor', name: '人皇', color: '#ffd84a', glow: '#fff1a0', grow: 'even',
          p: { name: '我為人皇', desc: '傭兵全能力 +15%；激勵／鋼鐵／衝擊士氣與王命也套用到傭兵' },
          s1: { name: '王旗', mp: 30, type: 'buff', sec: 60, cd: 90, fx: { dmg: 2, reduce: 3 }, adv: { merc: { atk: 5, def: 3 } }, desc: '插旗 60 秒，自己傷害 +2、傭兵攻擊 +5，自己和傭兵減傷 3' },
          s2: { name: '近衛召喚', mp: 50, type: 'buff', sec: 60, cd: 180, adv: { summon: { n: 2, every: 1500, phys: 0.25, icon: '🛡️' } }, desc: '召喚 2 名王室近衛一起戰鬥 60 秒（冷卻 3 分鐘）' } },
        { id: 'rWorld', name: '天下', color: '#ffe9a8', glow: '#f5c542', grow: 'mp2',
          p: { name: '黃金血統', desc: '魅力超過 10 的每一點金幣 +3% 提高到 +5%；擊倒怪物 5% 機率多掉 1 個通貨' },
          s1: { name: '黃金之盾', mp: 20, type: 'buff', sec: 60, cd: 60, adv: { goldCost: 10000, shield: { lv: 20 } }, desc: '花 1 萬金幣換 60 秒護盾，可吸收（等級×20）傷害' },
          s2: { name: '點石成金', mp: 30, type: 'buff', sec: 300, cd: 300, adv: { killGold: [0.1, 50] }, desc: '5 分鐘內擊倒怪物 10% 額外掉金幣（怪物等級×50）' } },
    ],
    knight: [
        { id: 'kShield', name: '盾衛', color: '#9fc7ff', glow: '#6fa8ff', grow: 'hp3',
          p: { name: '不落城牆', desc: '持盾時受到的傷害 −8%；反擊屏障的機率從 20% 提高到 30%' },
          s1: { name: '不動要塞', mp: 20, type: 'buff', sec: 8, cd: 60, adv: { taken: 0.5, emergency: 0.6 }, desc: '8 秒內受到的傷害 −50%（冷卻 60 秒）' },
          s2: { name: '盾牆反擊', mp: 25, type: 'strike', aoe: true, cd: 20, stun: 2000, adv: { run: 'shieldWall' }, desc: '範圍：所有敵人暈眩 2 秒，並受到（防禦×5）傷害' } },
        { id: 'kBlade', name: '狂刃', color: '#ff6b6b', glow: '#ff3b3b', grow: 'hp2',
          p: { name: '破釜沉舟', desc: '拿雙手武器時傷害 +8%、攻速 +5%' },
          s1: { name: '颶風斬', mp: 15, type: 'strike', mult: 1.1, aoe: true, cd: 8, desc: '範圍：1.1 倍傷害' },
          s2: { name: '斷鋼一擊', mp: 20, type: 'strike', mult: 2.8, cd: 15, adv: { halfAc: true }, desc: '單體 2.8 倍傷害，無視目標一半防禦' } },
        { id: 'kDragoon', name: '龍騎', color: '#7fe0c0', glow: '#36c79a', grow: 'even',
          p: { name: '屠龍血誓', desc: '對首領傷害 +12%；持長矛時命中 +5' },
          s1: { name: '龍槍突刺', mp: 18, type: 'strike', mult: 1.2, aoe: true, cd: 8, adv: { maxT: 3 }, desc: '1.2 倍傷害，一槍貫穿最多 3 隻敵人' },
          s2: { name: '屠龍之誓', mp: 25, type: 'buff', sec: 180, cd: 180, adv: { bossFlat: 8, bossReduce: 5 }, desc: '3 分鐘內對首領傷害 +8、受首領傷害減 5' } },
    ],
    mage: [
        { id: 'mPyro', name: '炎魔導師', color: '#ff9a4a', glow: '#ff5a1a', grow: 'mp2',
          p: { name: '焚天', desc: '火系魔法傷害 +15%；命中後 30% 機率燃燒 4 秒（每秒 SP×1）' },
          s1: { name: '隕石術', mp: 40, type: 'spell', cd: 12, elem: 'fire', ...advMag(2.5), adv: { splash: 0.3 }, desc: '單體 2.5 倍魔法傷害，周圍敵人受到 30%' },
          s2: { name: '炎獄降臨', mp: 60, type: 'buff', sec: 10, cd: 30, adv: { field: { every: 1000, mag: 0.5, aoe: true, elem: 'fire', icon: '🔥' } }, desc: '火海 10 秒，範圍內敵人每秒受到 0.5 倍魔法傷害' } },
        { id: 'mFrost', name: '冰霜賢者', color: '#a6e4ff', glow: '#5cc8ff', grow: 'even',
          p: { name: '永凍之心', desc: '冰系魔法傷害 +10%，25% 機率凍結 1.5 秒；被近戰攻擊時減傷 +5' },
          s1: { name: '冰封結界', mp: 35, type: 'buff', sec: 20, cd: 40, adv: { shield: { int: 10 }, chill: true }, desc: '20 秒護盾，可吸收（智力×10）傷害，打你的怪會變慢' },
          s2: { name: '絕對零度', mp: 70, type: 'spell', aoe: true, cd: 40, stun: 3000, elem: 'ice', ...advMag(3), desc: '範圍 3 倍魔法傷害，並凍結所有敵人 3 秒' } },
        { id: 'mStorm', name: '雷霆法王', color: '#d4b4ff', glow: '#9b6bff', grow: 'mp2',
          p: { name: '雷神之怒', desc: '雷、風系魔法傷害 +10%；魔法暴擊率 +8%' },
          s1: { name: '連鎖閃電', mp: 25, type: 'spell', cd: 6, elem: 'storm', ...advMag(1.2), adv: { chain: [4, 0.85] }, desc: '打中後彈射到另外 4 隻，每彈一次傷害 −15%' },
          s2: { name: '天雷審判', mp: 50, type: 'buff', sec: 5, cd: 25, adv: { field: { every: 1000, mag: 1.4, rnd: true, elem: 'storm', icon: '⚡' } }, desc: '5 秒內隨機落雷 5 次，每次 1.4 倍魔法傷害' } },
    ],
    elf: [
        { id: 'eTempest', name: '風暴遊俠', color: '#9df5c8', glow: '#3ee09a', grow: 'hp1',
          p: { name: '暴風怒吼', desc: '拿弓時攻速 +8%、射程 +1；10% 機率發動三重矢，5% 機率發動精準爆破（200% 暴擊傷害）' },
          s1: { name: '疾風百矢', mp: 25, type: 'strike', mult: 0.5, hits: 10, spread: true, cd: 15, desc: '連射 10 箭，每箭 0.5 倍，分散射向附近敵人' },
          s2: { name: '鷹眼', mp: 25, type: 'buff', sec: 180, cd: 180, fx: { crit: 0.05, hit: 4 }, desc: '3 分鐘內暴擊率 +5%、命中 +4' } },
        { id: 'ePact', name: '元素契約者', color: '#c0f0ff', glow: '#7bd8ff', grow: 'mp2',
          p: { name: '元素契約', desc: '常駐 2 隻元素精靈（每隻原本的 60%）協同戰鬥；可切換火（傷害）／水（回血）／風（攻速）／地（防禦）' },
          s1: { name: '元素共鳴', mp: 30, type: 'buff', sec: 30, cd: 90, adv: { spiritBoost: true }, desc: '30 秒內精靈傷害 +50%，元素效果加倍' },
          s2: { name: '精靈王降臨', mp: 60, type: 'buff', sec: 60, cd: 180, adv: { summon: { n: 1, every: 2000, mag: 0.3, aoe: true, icon: '👑' } }, desc: '召喚精靈王 60 秒，範圍攻擊所有敵人（冷卻 3 分鐘）' } },
        { id: 'eForest', name: '森林守護者', color: '#b7ec7a', glow: '#6cc43a', grow: 'hp2',
          p: { name: '世界樹之息', desc: '持單手劍或長矛＋盾時減傷 +5；生命之泉的回血效果加倍' },
          s1: { name: '狂風暴烈斬', mp: 30, type: 'strike', mult: 1, hits: 10, cd: 30, stun: 2000, adv: { noDouble: true }, desc: '近戰單體連揮 10 刀，每刀 1 倍，並纏繞敵人 2 秒' },
          s2: { name: '世界樹庇護', mp: 40, type: 'buff', sec: 15, cd: 60, fx: { reduce: 5 }, adv: { hot: 0.03, mercHot: 0.03, mercReduce: 5, emergency: 0.7 }, desc: '15 秒內每秒回 3% HP，自己和傭兵減傷 +5' } },
    ],
    darkelf: [
        { id: 'dBlade', name: '影刃', color: '#c49bff', glow: '#8a4dff', grow: 'even',
          p: { name: '千刃', desc: '持雙刀時雙擊率 +10%；暴擊傷害 +15%' },
          s1: { name: '影舞', mp: 20, type: 'strike', mult: 0.55, hits: 6, cd: 12, adv: { noDouble: true }, desc: '連斬 6 下，每下 0.55 倍（可暴擊、不觸發雙擊）' },
          s2: { name: '千影分身', mp: 40, type: 'buff', sec: 10, cd: 45, adv: { clones: [3, 0.12] }, desc: '3 個影子分身 10 秒，跟著你攻擊，各造成 12% 傷害（不會暴擊）' } },
        { id: 'dVenom', name: '毒牙', color: '#9be86a', glow: '#4fbf2a', grow: 'mp2',
          p: { name: '蝕骨劇毒', desc: '攻擊 20% 機率上毒 5 秒（每層每秒攻擊力 15%），最多 3 層；對中毒目標傷害 +8%' },
          s1: { name: '萬毒噬心', mp: 20, type: 'strike', cd: 10, adv: { run: 'detonate' }, desc: '引爆目標身上的毒，每層造成 1 倍傷害' },
          s2: { name: '毒霧領域', mp: 40, type: 'buff', sec: 12, cd: 40, adv: { field: { every: 3000, poison: true, aoe: true, hitDown: 10, icon: '☠️' } }, desc: '毒霧 12 秒，範圍內敵人中毒、命中 −10' } },
        { id: 'dNight', name: '夜行者', color: '#8fa3ff', glow: '#4b5cff', grow: 'hp1',
          p: { name: '暗夜潛行', desc: '閃避 +8%；閃避成功後下一擊必定暴擊' },
          s1: { name: '影殺', mp: 20, type: 'strike', mult: 2.5, cd: 10, adv: { execute: [0.3, 5], autoBelow: 0.3 }, desc: '目標 HP 低於 30% 時 5 倍傷害，其他時候 2.5 倍（自動施放會等目標殘血）' },
          s2: { name: '影遁', mp: 30, type: 'buff', sec: 5, cd: 45, adv: { stealth: 3, emergency: 0.5 }, desc: '隱身 5 秒怪物不攻擊，結束後下一擊 3 倍傷害' } },
    ],
    shura: [
        { id: 'sFist', name: '拳聖', color: '#ffb36b', glow: '#ff8a1f', grow: 'even',
          p: { name: '百裂拳意', desc: '雙擊率 +10%；千手破、阿修羅多打 1 下' },
          s1: { name: '百裂拳', mp: 20, type: 'strike', mult: 0.5, hits: 8, cd: 12, adv: { noDouble: true }, desc: '連打 8 下，每下 0.5 倍（不觸發雙擊）' },
          s2: { name: '氣爆', mp: 30, type: 'strike', mult: 2, aoe: true, stun: 1000, cd: 20, desc: '範圍 2 倍傷害，並暈眩所有敵人 1 秒' } },
        { id: 'sWar', name: '鬥神', color: '#ff7070', glow: '#e01f1f', grow: 'hp2',
          p: { name: '修羅道', desc: '每次攻擊疊 1 層戰意（最多 20 層，每層傷害 +1%），5 秒沒攻擊全部清空' },
          s1: { name: '戰意爆發', mp: 20, type: 'strike', cd: 15, adv: { run: 'burst' }, desc: '消耗所有戰意，每層 0.3 倍傷害（20 層＝6 倍）' },
          s2: { name: '不滅修羅', mp: 30, type: 'buff', sec: 10, cd: 90, fx: { lifesteal: 0.10 }, adv: { undying: true, emergency: 0.4 }, desc: '10 秒內 HP 不會低於 1，吸血 +10%' } },
        { id: 'sVajra', name: '金剛', color: '#ffe08a', glow: '#d9a520', grow: 'hp3',
          p: { name: '金剛不壞', desc: '防禦 +5、減傷 +4；被打時 15% 機率反擊' },
          s1: { name: '金剛護法', mp: 25, type: 'buff', sec: 15, cd: 45, fx: { reduce: 8, thorns: 0.3 }, desc: '15 秒內減傷 +8，打你的怪受到 30% 反彈傷害' },
          s2: { name: '不動明王', mp: 35, type: 'strike', mult: 1.6, aoe: true, stun: 2000, cd: 40, adv: { selfTaken: [0.5, 5] }, desc: '範圍 1.6 倍傷害並暈眩 2 秒；自己 5 秒內受到的傷害 −50%' } },
    ],
    warrior: [
        { id: 'wBerserk', name: '狂戰士', color: '#ff5050', glow: '#b30000', grow: 'hp2',
          p: { name: '血怒', desc: '每少 10% HP 傷害 +4%（最多 +36%）；狂怒的觸發門檻從 HP 50% 提高到 60%' },
          s1: { name: '血祭', mp: 10, type: 'buff', sec: 10, cd: 40, fx: { spdMul: 0.10 }, adv: { hpCost: 0.2, dmgPct: 0.15, needHp: 0.3 }, desc: '消耗目前 HP 的 20%，10 秒內傷害 +15%、攻速 +10%' },
          s2: { name: '死鬥', mp: 20, type: 'strike', mult: 5, cd: 15, adv: { needLow: 0.3, drain: 0.3 }, desc: 'HP 低於 30% 才能使用：單體 5 倍傷害，吸回 30% 當 HP' } },
        { id: 'wRuin', name: '毀滅者', color: '#ffa04d', glow: '#c25a00', grow: 'hp2',
          p: { name: '破山', desc: '範圍技能傷害 +10%；粉碎、旋風斬、大地崩裂冷卻 −20%' },
          s1: { name: '裂地衝擊', mp: 20, type: 'strike', mult: 1.2, aoe: true, cd: 12, adv: { defDown: [5, 8] }, desc: '範圍 1.2 倍傷害，所有敵人防禦 −5（8 秒）' },
          s2: { name: '天崩地裂', mp: 35, type: 'strike', mult: 0.65, hits: 3, aoe: true, stun: 2000, cd: 30, desc: '連續震地 3 次，每次範圍 0.65 倍，最後暈眩所有敵人 2 秒' } },
        { id: 'wTitan', name: '不屈戰神', color: '#c8d0ff', glow: '#7d8cff', grow: 'hp3',
          p: { name: '泰坦血脈', desc: 'HP 上限 +12%；每 5 秒回 1% HP' },
          s1: { name: '挑釁怒吼', mp: 15, type: 'buff', sec: 10, cd: 30, fx: { reduce: 6 }, adv: { taunt: true }, desc: '10 秒內周圍的怪都只打你，自己減傷 +6' },
          s2: { name: '最後防線', type: 'passive', cd: 300, adv: { lastStand: 0.3 }, desc: '自動觸發：受到致命傷時保留 1 HP 並回 30% HP（冷卻 5 分鐘）' } },
    ],
    gunner: [
        { id: 'gHunter', name: '獵殺者', color: '#ffd27a', glow: '#e0a000', grow: 'hp1',
          p: { name: '一槍斃命', desc: '狙擊、穿甲彈傷害 +20%；對滿血目標的第一槍傷害 2 倍' },
          s1: { name: '致命狙殺', mp: 25, type: 'strike', mult: 4.5, ignoreAc: true, cd: 20, adv: { charge: 1500 }, desc: '蓄力 1.5 秒，單體 4.5 倍傷害並無視防禦' },
          s2: { name: '標記獵物', mp: 15, type: 'strike', mult: 1, cd: 30, adv: { vuln: [0.10, 15] }, desc: '標記目標 15 秒，目標受到你和傭兵的傷害 +10%' } },
        { id: 'gBomb', name: '爆破專家', color: '#ff9e6b', glow: '#ff4f1f', grow: 'even',
          p: { name: '火藥狂熱', desc: '爆裂彈、閃光彈、火箭砲傷害 +15%；普攻 10% 機率爆炸，波及周圍（0.3 倍）' },
          s1: { name: '集束手雷', mp: 25, type: 'strike', mult: 0.6, hits: 3, aoe: true, cd: 12, adv: { noAmmo: true }, desc: '丟出 3 顆手雷，每顆範圍 0.6 倍傷害' },
          s2: { name: '轟炸支援', mp: 35, type: 'buff', sec: 8, cd: 35, adv: { field: { every: 1000, phys: 0.4, aoe: true, icon: '💣' } }, desc: '8 秒內每秒轟炸一次，範圍 0.4 倍傷害' } },
        { id: 'gSling', name: '槍鬥士', color: '#9ad8ff', glow: '#2fa8ff', grow: 'hp1',
          p: { name: '槍林彈雨', desc: '攻速 +5%；連射多 1 發；15% 機率不消耗子彈' },
          s1: { name: '槍舞', mp: 25, type: 'buff', sec: 3, cd: 15, adv: { field: { every: 500, phys: 0.25, aoe: true, icon: '🔫' } }, desc: '旋轉連射 3 秒，每 0.5 秒範圍 0.25 倍傷害（共 1.5 倍）' },
          s2: { name: '翻滾射擊', mp: 20, type: 'buff', sec: 5, cd: 30, fx: { dodge: 0.20 }, adv: { dodgeShot: 1.5, emergency: 0.8 }, desc: '5 秒內閃避 +20%，閃避成功反擊一槍 1.5 倍' } },
    ],
    magicfighter: [
        { id: 'fSword', name: '魔劍聖', color: '#b9a8ff', glow: '#6f5bff', grow: 'even',
          p: { name: '劍魔合一', desc: '普攻附加 SP×0.5 魔法傷害；魔刃、雷電斬、火焰斬冷卻 −20%' },
          s1: { name: '千魔劍', mp: 30, type: 'strike', mult: 1, hits: 5, cd: 12, magic: { dmg: [0, 0], spK: 5 }, adv: { noDouble: true }, desc: '5 把魔法劍刺向目標，每把 1 倍攻擊＋SP 魔法傷害' },
          s2: { name: '魔劍解放', mp: 40, type: 'buff', sec: 15, cd: 60, fx: { spdMul: 0.08 }, adv: { swordMagic2: true }, desc: '15 秒內魔法附加傷害加倍、攻速 +8%' } },
        { id: 'fElem', name: '元素騎士', color: '#8ff0e6', glow: '#1fc9b9', grow: 'mp2',
          p: { name: '元素輪轉', desc: '元素技能輪流留下火（燃燒）、冰（減速）、雷（連鎖）印記；三種集齊時下一招 +50%' },
          s1: { name: '三元素斬', mp: 30, type: 'strike', mult: 1.1, hits: 3, cd: 14, elem: 'elem', adv: { allMarks: true, noDouble: true }, desc: '火、冰、雷連斬 3 下，每下 1.1 倍，附帶各自效果' },
          s2: { name: '元素領域', mp: 45, type: 'buff', sec: 12, cd: 45, adv: { elemBoost: 0.2, field: { every: 2000, mag: 0.5, aoe: true, icon: '🌀' } }, desc: '12 秒內元素技能傷害 +20%，每 2 秒對周圍造成 0.5 倍魔法傷害' } },
        { id: 'fArcane', name: '秘法守衛', color: '#a0c4ff', glow: '#4a7dff', grow: 'mp3',
          p: { name: '魔力護體', desc: '法力護盾改成 45% 傷害由 MP 承受，每點 MP 擋傷效率 +30%；回魔 +2' },
          s1: { name: '秘法屏障', mp: 30, type: 'buff', sec: 10, cd: 40, adv: { shield: { sp: 20 }, breakBoom: 2 }, desc: '10 秒護盾，可吸收（SP×20）傷害，被打破時範圍爆炸 2 倍傷害' },
          s2: { name: '魔力逆流', type: 'spell', aoe: true, cd: 25, adv: { run: 'manaBurst', mpPct: 0.3, needMp: 0.5 }, desc: '消耗 30% MP，對範圍敵人造成（消耗 MP×1.5）魔法傷害' } },
    ],
    paladin: [
        { id: 'pJudge', name: '審判者', color: '#fff3a0', glow: '#ffd21f', grow: 'even',
          p: { name: '神罰', desc: '對不死、惡魔傷害 +15%；聖光打擊、制裁之錘冷卻 −20%' },
          s1: { name: '天譴之錘', mp: 25, type: 'strike', mult: 3, cd: 12, adv: { evil2: true }, desc: '單體 3 倍傷害，對不死和惡魔再 ×2' },
          s2: { name: '審判之日', mp: 40, type: 'spell', aoe: true, cd: 30, elem: 'holy', ...advMag(2), adv: { vuln: [0.10, 10] }, desc: '範圍 2 倍神聖傷害，敵人 10 秒內受到的傷害 +10%' } },
        { id: 'pGuard', name: '守護聖者', color: '#c8ffd8', glow: '#5ce08c', grow: 'mp2',
          p: { name: '慈悲之心', desc: '治癒效果 +20%；虔誠光環、神聖祝福的回血也套用到傭兵' },
          s1: { name: '聖療之泉', mp: 35, type: 'buff', sec: 10, cd: 45, adv: { hot: 0.04, mercHot: 0.04, emergency: 0.7 }, desc: '10 秒內每秒幫自己和傭兵回 4% HP' } ,
          s2: { name: '神聖復甦', type: 'passive', cd: 180, adv: { revive: true }, desc: '自動觸發：傭兵受到致命傷時保住 1 HP 並回 50%；沒帶傭兵時自己 HP 低於 30% 回 40%（冷卻 3 分鐘）' } },
        { id: 'pRadiant', name: '光明聖騎', color: '#ffe7b8', glow: '#ffb84a', grow: 'hp3',
          p: { name: '光之壁壘', desc: '持盾時 MR +10、減傷 +5；被魔法攻擊時 20% 機率反射傷害' },
          s1: { name: '光輝聖盾', mp: 30, type: 'buff', sec: 12, cd: 40, adv: { shield: { wis: 15 }, holyThorn: 0.3 }, desc: '12 秒護盾，可吸收（精神×15）傷害，打你的怪受到神聖傷害' },
          s2: { name: '神聖領域', mp: 45, type: 'buff', sec: 15, cd: 50, fx: { reduce: 6 }, adv: { field: { every: 1000, mag: 0.3, aoe: true, elem: 'holy', icon: '✨' } }, desc: '15 秒內範圍敵人每秒受到 0.3 倍神聖傷害，自己減傷 +6' } },
    ],
    angel: [
        { id: 'aJudge', name: '審判天使', color: '#fff7c2', glow: '#ffe066', grow: 'mp2',
          p: { name: '天罰之光', desc: '神聖魔法傷害 +8%；對惡魔、不死的剋制從 ×1.3 提高到 ×1.45' },
          s1: { name: '光之審判槍', mp: 30, type: 'spell', aoe: true, cd: 10, elem: 'holy', ...advMag(1.3), adv: { maxT: 3 }, desc: '貫穿直線上最多 3 隻敵人，1.3 倍神聖傷害' },
          s2: { name: '天國之門', mp: 50, type: 'buff', sec: 8, cd: 35, adv: { field: { every: 1000, mag: 0.3, aoe: true, elem: 'holy', icon: '🌟' } }, desc: '天門開啟 8 秒，每秒光柱範圍 0.3 倍神聖傷害' } },
        { id: 'aWar', name: '戰天使', color: '#ffd0e0', glow: '#ff7aa8', grow: 'hp2',
          p: { name: '聖槍之誓', desc: '持長矛時普攻附加 SP×0.6 神聖傷害，攻速 +5%' },
          s1: { name: '天降聖槍', mp: 25, type: 'strike', mult: 2.5, aoe: true, stun: 1000, cd: 12, desc: '範圍 2.5 倍傷害，並暈眩敵人 1 秒' },
          s2: { name: '羽翼衝鋒', mp: 30, type: 'strike', mult: 3, aoe: true, cd: 20, adv: { selfBuff: [{ dodge: 0.15 }, 5] }, desc: '路徑上所有敵人 3 倍傷害，衝完 5 秒內閃避 +15%' } },
        { id: 'aWatch', name: '守望天使', color: '#d8f0ff', glow: '#9fd4ff', grow: 'even',
          p: { name: '天使庇護', desc: '神聖護盾效果加倍；HP 低於 30% 時自動治癒一次（冷卻 60 秒）' },
          s1: { name: '光之羽翼', mp: 25, type: 'buff', sec: 10, cd: 40, adv: { hurtHeal: 0.02, holyThorn: 0.5, emergency: 0.8 }, desc: '10 秒內每次被攻擊回 2% HP，並對攻擊者造成 0.5 倍神聖傷害' },
          s2: { name: '天使結界', mp: 40, type: 'buff', sec: 6, cd: 60, adv: { taken: 0.4, mercTaken: 0.4, store: 0.5, emergency: 0.7 }, desc: '6 秒內自己和傭兵受到的傷害 −60%，結束時把吸收傷害的 50% 化成範圍神聖傷害' } },
    ],
    demon: [
        { id: 'xAbyss', name: '深淵魔王', color: '#ff6b9e', glow: '#c2185b', grow: 'hp2',
          p: { name: '血魔領域', desc: '吸血 +3%；HP 滿了之後多吸的血轉成護盾（最多 HP 上限的 20%）' },
          s1: { name: '靈魂收割', mp: 20, type: 'strike', mult: 2.4, aoe: true, cd: 10, adv: { healPer: 0.02 }, desc: '範圍 2.4 倍傷害，每打中 1 隻回 2% HP' },
          s2: { name: '血之盛宴', mp: 30, type: 'buff', sec: 10, cd: 60, fx: { lifesteal: 0.20 }, adv: { emergency: 0.7 }, desc: '10 秒內吸血 +20%' } },
        { id: 'xReaper', name: '死神', color: '#b0b0c8', glow: '#6b6b8a', grow: 'even',
          p: { name: '死亡凝視', desc: '恐懼之眼的恐懼時間 +1 秒、冷卻 −30%；對恐懼中的敵人傷害 +15%' },
          s1: { name: '死神之鐮', mp: 25, type: 'strike', mult: 3.5, cd: 12, adv: { reap: 0.25 }, desc: '單體 3.5 倍傷害，目標 HP 低於 25% 時再追加一刀' },
          s2: { name: '亡魂詛咒', mp: 30, type: 'strike', aoe: true, cd: 40, adv: { run: 'curse', vuln: [0.12, 10], atkDown: [0.15, 10] }, desc: '範圍詛咒 10 秒，敵人受到的傷害 +12%、攻擊力 −15%' } },
        { id: 'xInferno', name: '煉獄術士', color: '#ff8c5a', glow: '#d43a00', grow: 'mp2',
          p: { name: '地獄之炎', desc: '地獄火、生命汲取、末日的魔法傷害 +15%；生命汲取的吸血效果加倍' },
          s1: { name: '煉獄火柱', mp: 30, type: 'spell', cd: 10, elem: 'dark', ...advMag(1.8), adv: { burn: [5, 1] }, desc: '單體 1.8 倍暗黑魔法傷害，並燃燒 5 秒' },
          s2: { name: '惡魔召喚', mp: 50, type: 'buff', sec: 60, cd: 180, adv: { summon: { n: 1, every: 2000, mag: 0.6, icon: '👿' } }, desc: '召喚 1 隻小惡魔協同戰鬥 60 秒（魔法攻擊）' } },
    ],
};
const ADV_BY_ID = {};
for (const cls in ADV_BRANCHES) ADV_BRANCHES[cls].forEach(b => { b.cls = cls; ADV_BY_ID[b.id] = b; });

// 分支技能寫進 SKILL_BY_ID（kind 'adv'，learnedSkills 只認目前分支）；被動也是技能（Lv.60 完成二轉自動學會）
for (const b of Object.values(ADV_BY_ID)) {
    const base = { kind: 'adv', cls: b.cls, branch: b.id };
    b.passive = { ...base, id: 'adv_' + b.id + '_p', name: b.p.name, lv: ADV_SKILL1_LV, type: 'passive', fx: {}, desc: '二轉被動：' + b.p.desc };
    b.skill1 = { ...base, ...b.s1, id: 'adv_' + b.id + '_1', lv: ADV_SKILL1_LV, mp: b.s1.mp || 0, slot: 1 };
    b.skill2 = { ...base, ...b.s2, id: 'adv_' + b.id + '_2', lv: ADV_SKILL2_LV, mp: b.s2.mp || 0, slot: 2 };
    for (const s of [b.passive, b.skill1, b.skill2]) SKILL_BY_ID[s.id] = s;
    for (const s of [b.skill1, b.skill2]) {   // 二轉技能書：不在商店（沒有 price）；第一次由任務給，之後打怪掉（併入一般技能書掉落，bookMinLv＝60／70，2026-10-31 使用者改）
        ITEMS[bookIdOf(s.id)] = { name: `二轉技能書（${s.name}）`, cat: 'book', skill: s.id, wt: 1, classes: [b.cls], advBook: s.slot, sell: s.lv * 400,
            desc: `${CLASSES[b.cls].name}・${b.name}專屬二轉技能「${s.name}」` };
    }
    // 第 7 章分支專屬飾品
    ITEMS['advAcc_' + b.id] = { name: `${b.name}之證印`, cat: 'armor', slot: 'amulet', safe: -1, wt: 3, sell: 50000, classes: [b.cls], advBranch: b.id, ...ADV_ACC_FX(b), desc: `二轉「${b.name}」專屬飾品` };
}
function ADV_ACC_FX(b) {   // 依成長類型給不同的飾品能力（草案數值）
    return { hp3: { con: 2, hp: 80, ac: 2 }, hp2: { str: 2, hp: 50, dmg: 2 }, hp1: { dex: 2, hit: 3, hp: 30 }, even: { str: 1, wis: 1, hp: 40, mp: 30 }, mp2: { int: 2, mp: 60, sp: 1 }, mp3: { int: 1, wis: 2, mp: 100 }, hp1mp: { dex: 1, int: 1, hp: 30, mp: 30 } }[b.grow] || {};
}
// 命運重塑石（換分支）
ITEMS.advReshape = { name: '命運重塑石', cat: 'material', wt: 0, sell: 200000, advReshape: true, desc: '二轉完成後使用：重新選擇二轉分支（舊分支技能失效，技能書不退）。Lv.70 以上首領極稀有掉落' };

// ───────── 第 5～7 章任務 ─────────
QUEST_BOSS_BASE[6] = { lv: 63, hpMul: 8, dmgMul: 1.25, acAdd: -8, expMul: 12, goldMul: 6 };
QUEST_BOSS_BASE[7] = { lv: 75, hpMul: 9, dmgMul: 1.3, acAdd: -10, expMul: 15, goldMul: 8 };
const ADV_CH7_BOSS = {
    royal: ['逆王之影・格爾德', '👑'], knight: ['墮落騎士團長・維克', '⚔️'], mage: ['虛空魔導・莫爾斯', '🔮'], elf: ['枯萎樹靈・艾爾克', '🌳'],
    darkelf: ['無面刺客・夜鴉', '🗡️'], shura: ['修羅魔王・阿迦', '👊'], warrior: ['灰燼巨人・格倫德', '🪓'], gunner: ['鐵鏽砲台・哈茲', '💥'],
    magicfighter: ['崩壞魔劍・艾克西', '🗡️'], paladin: ['褻瀆主教・瑟恩', '⛪'], angel: ['墮天使・薩麥爾', '🪽'], demon: ['深淵吞噬者・巴爾', '😈'],
};
const QB_MAGIC_7 = { p: 0.28, dmg: [120, 190], name: '滅世魔法' };
for (const cls in CLASS_QUESTS) {
    const npc = CLASS_STORIES[cls].npc, cname = CLASSES[cls].name, [bn, bi] = ADV_CH7_BOSS[cls];
    CLASS_QUESTS[cls].push(
        { lv: 60, title: '超越之證', advCh: 5,
          goal: { type: 'bossCollect', itemName: `${cname}之證`, n: 5, p: ADV_PROOF_P },
          intro: `「你已經走到了${cname}之路的頂點，但頂點之上還有更高的境界。去打倒各地的強大首領，取回 5 枚「${cname}之證」。」`,
          outro: `${npc}接過五枚證物，它們同時亮了起來：「它們認同你了。接下來，選擇你要走的道路。」`,
          reward: { gold: 50000 } },
        { lv: 60, title: '試煉之影', advCh: 6, advPick: true,
          goal: { type: 'boss', zone: 'fireCave', after: 30, boss: qBoss(6, `${cname}的試煉之影`, '👤', { magic: { p: 0.25, dmg: [80, 130], name: '影之一擊' } }) },
          intro: `「選擇你要走的道路，然後到熔火煉獄戰勝自己的影子。試煉只能一個人面對：不能帶傭兵，也不能帶娃娃。」`,
          outro: `影子在你面前碎裂，化成光流進你的身體。${npc}點頭：「從今天起，你就是新的自己。」`,
          reward: { gold: 100000, advDone: true } },
        { lv: 70, title: '進階的考驗', advCh: 7,
          goal: { type: 'boss', zone: 'tower', after: 40, boss: qBoss(7, bn, bi, { magic: QB_MAGIC_7 }) },
          intro: `「新的力量引來了新的敵人。${bn}在永夜之塔高層等著你，打倒它，你的力量才算完整。」`,
          outro: `${bn}倒下了。${npc}交給你一本古老的書與一枚證印：「這是屬於你的道路的全部。」`,
          reward: { gold: 200000, advFinal: true } },
    );
}
// 第 5 章職業之證：任務道具 q_職業_4（後端也從這個 id 掉落）
for (const cls in CLASS_QUESTS) CLASS_QUESTS[cls].forEach((q, i) => {
    if (q.goal.type !== 'bossCollect') return;
    q.goal.item = `q_${cls}_${i}`;
    ITEMS[q.goal.item] = { name: q.goal.itemName, cat: 'quest', wt: 0, sell: 0, desc: `任務道具：${q.title}` };
});

// ───────── 狀態 ─────────
function advState(p = player) {
    if (!p.adv || typeof p.adv !== 'object') p.adv = { br: '', pick: '', at: 0, el: 'fire' };
    return p.adv;
}
function advBranch(p = player) { const a = p && p.adv, b = a && ADV_BY_ID[a.br]; return b && b.cls === p.cls ? b : null; }
function advIs(id, p = player) { const b = advBranch(p); return !!b && b.id === id; }
function advClassName(p = player) { const b = advBranch(p); return b ? b.name : CLASSES[p.cls].name; }
function advGrowth(kind) { const b = advBranch(); return b ? 1 + (ADV_GROW[b.grow] || [0, 0])[kind === 'mp' ? 1 : 0] : 1; }
function advNormalize(p) {
    const a = advState(p);
    if (typeof a.br !== 'string' || (a.br && !(ADV_BY_ID[a.br] && ADV_BY_ID[a.br].cls === p.cls))) a.br = '';
    if (typeof a.pick !== 'string' || (a.pick && !(ADV_BY_ID[a.pick] && ADV_BY_ID[a.pick].cls === p.cls))) a.pick = '';
    if (!Number.isFinite(a.at)) a.at = 0;
    if (!['fire', 'water', 'wind', 'earth'].includes(a.el)) a.el = 'fire';
    // 二轉已完成：被動一定要在已學技能裡（技能書學的兩招照存檔）
    const b = advBranch(p);
    if (b && Array.isArray(p.skills) && !p.skills.includes(b.passive.id)) p.skills.push(b.passive.id);
    return p;
}
// 這招是不是目前分支能用的（learnedSkills 用）
function advSkillUsable(s, p = player) { return s.kind !== 'adv' || (advBranch(p) && advBranch(p).id === s.branch); }
function advTrialActive(p = player) {
    const s = p.quests, q = s && CLASS_QUESTS[p.cls] && CLASS_QUESTS[p.cls][s.ch];
    return !!(q && q.advPick && s.active && !s.bossDone);
}

// ───────── 戰鬥執行期狀態（不存檔；換角色、離線模擬都會重來）─────────
const advRtMap = new WeakMap();
function advRt(p = player) {
    let r = advRtMap.get(p);
    if (!r) advRtMap.set(p, r = { fields: [], summons: [], shield: 0, shieldUntil: 0, shieldBoom: 0, stacks: 0, stackAt: 0, nextCrit: false, ambush: false,
        stored: 0, storeUntil: 0, regenAt: 0, marks: {}, markBoost: false, spiritAt: 0, lastFull: null, overShield: 0 });
    return r;
}
function advBuffOn(slot) { const b = advBranch(); if (!b) return null; const s = slot === 1 ? b.skill1 : b.skill2; return s.type === 'buff' && buffActive(s.id) ? s : null; }
function advBuffAdv(key) { for (const k of [1, 2]) { const s = advBuffOn(k); if (s && s.adv && s.adv[key] != null) return s.adv[key]; } return null; }
function advWeaponType(p = player) { const w = p.equip.weapon; return w ? ITEMS[w.id].type : 'fist'; }
function advHasShield(p = player) { return !!p.equip.shield; }
function advDeb(mon, key) { const d = mon && mon.advDeb && mon.advDeb[key]; return d && d.until > gameNow ? d : null; }
function advSetDeb(mon, key, v, sec) { if (!mon) return; mon.advDeb = mon.advDeb || {}; mon.advDeb[key] = { v, until: gameNow + sec * 1000 }; }

// ───────── 能力（calcStats 呼叫）─────────
function advPlayerFx(p) {
    const b = advBranch(p); if (!b) return null;
    const fx = {}, wt = advWeaponType(p), wtype = WEAPON_TYPES[wt] || {};
    const add = o => { for (const k in o) fx[k] = (fx[k] || 0) + o[k]; };
    switch (b.id) {
        case 'kBlade': if (wtype.two) add({ spdMul: 0.05 }); break;
        case 'kDragoon': add({ bossDmg: 0.12 }); if (wt === 'spear') add({ hit: 5 }); break;
        case 'kShield': if (buffActive('knightCounter')) add({ counter: 0.10 }); break;
        case 'mStorm': add({ magicCrit: 0.08 }); break;
        case 'eTempest': if (wt === 'bow') add({ spdMul: 0.08 }); break;
        case 'ePact': { const k = buffActive(b.skill1.id) ? 2 : 1.2; const e = advState(p).el;
            if (e === 'fire') add({ dmg: Math.round(2 * k) }); else if (e === 'water') add({ hpRegen: Math.round(6 * k) });
            else if (e === 'wind') add({ spdMul: 0.04 * k }); else add({ ac: Math.round(4 * k) }); break; }
        case 'eForest': if ((wt === 'sword' || wt === 'spear') && advHasShield(p)) add({ reduce: 5 }); if (buffActive('elfSpring')) add({ hpRegen: 8 }); break;
        case 'dBlade': if (wt === 'dual') add({ double: 0.10 }); add({ critDmg: 0.15 }); break;
        case 'dNight': add({ dodge: 0.08 }); break;
        case 'sFist': add({ double: 0.10 }); break;
        case 'sVajra': add({ ac: 5, reduce: 4, counter: 0.15 }); break;
        case 'wBerserk': if (p.hp < p.baseHp * 0.6 && p.hp >= p.baseHp * 0.5 && (p.skills || []).includes('warBerserk')) add({ dmg: 8 }); break;
        case 'wTitan': add({ hp: Math.round(p.baseHp * 0.12) }); break;
        case 'gSling': add({ spdMul: 0.05 }); break;
        case 'fArcane': add({ mpRegen: 2 }); if (buffActive('mfShield')) add({ absorb: 0.15 }); break;
        case 'pRadiant': if (advHasShield(p)) add({ mr: 10, reduce: 5 }); break;
        case 'aWar': if (wt === 'spear') add({ spdMul: 0.05 }); break;
        case 'aWatch': if (buffActive('angelAegis')) add({ ac: 4, mr: 10 }); break;
        case 'xAbyss': add({ lifesteal: 0.03 }); break;
    }
    const rt = advRt(p);
    if (rt.selfFx && rt.selfFxUntil > gameNow) add(rt.selfFx);   // 羽翼衝鋒：衝完 5 秒閃避
    return fx;
}
function advAbsorbEff() { return advIs('fArcane') ? 1.3 : 1; }

// 技能冷卻調整（combat.js skillCd）
const ADV_CD_MUL = {
    rTyrant: { royalWrath: 0.7 }, wRuin: { warSmash: 0.8, warWhirl: 0.8, warQuake: 0.8 }, fSword: { mfSlash: 0.8, mfThunder: 0.8, mfFlame: 0.8 },
    pJudge: { palStrike: 0.8, palHammer: 0.8 }, xReaper: { demonFear: 0.7 },
};
function advCd(k, cd) { const b = advBranch(); const m = b && ADV_CD_MUL[b.id] && ADV_CD_MUL[b.id][k.id]; return m ? cd * m : cd; }

// 自動施放的額外條件（金幣、HP、MP、殘血目標）
function advCanCast(k, manual) {
    const a = k.adv; if (!a) return true;
    if (a.goldCost && player.gold < a.goldCost) return false;
    if (a.needLow && player.hp >= calcStats().maxHp * a.needLow) return false;
    if (a.needHp && player.hp < calcStats().maxHp * a.needHp) return false;
    if (a.needMp && player.mp < calcStats().maxMp * a.needMp) return false;
    if (manual) return true;
    if (a.emergency && player.hp >= calcStats().maxHp * a.emergency) return false;
    if (a.autoBelow && hunt && hunt.mon && hunt.mon.hp >= hunt.mon.maxHp * a.autoBelow) return false;
    if (a.run === 'burst' && advRt().stacks < 10) return false;
    if (a.run === 'detonate' && !(hunt && hunt.mon && advPoison(hunt.mon))) return false;
    if (a.taunt && !(typeof mercActive === 'function' && mercActive())) return false;
    return true;
}

// ───────── 傷害（physicalAttack／castSpell／doStrike 呼叫）─────────
function advDefMod(mon, opt) {
    let v = 0; const d = advDeb(mon, 'defDown'); if (d) v += d.v;
    if (opt && opt.skill && opt.skill.adv && opt.skill.adv.halfAc) v += Math.max(0, (10 - mon.ac) / 2);
    return v;
}
function advPoison(mon) { return (mon.advPoison || []).filter(x => x.until > gameNow).length; }
// 物理傷害倍率（每一下）
function advPhysMult(st, mon, opt) {
    const b = advBranch(); let m = advVuln(mon);
    if (!b) return m;
    const k = opt && opt.skill, wt = advWeaponType(), rt = advRt();
    switch (b.id) {
        case 'rTyrant': if (wt === 'sword') m *= 1.08; break;
        case 'kBlade': if ((WEAPON_TYPES[wt] || {}).two) m *= 1.08; break;
        case 'dVenom': if (advPoison(mon)) m *= 1.08; break;
        case 'sWar': m *= 1 + rt.stacks * 0.01; break;
        case 'wBerserk': { const st2 = st || calcStats(); m *= 1 + Math.min(0.36, Math.floor((1 - player.hp / st2.maxHp) * 10) * 0.04); if (buffActive(b.skill1.id)) m *= 1.15; break; }
        case 'wRuin': if (k && (k.aoe || k.spread)) m *= 1.10; break;
        case 'gHunter': if (k && (k.id === 'gunSnipe' || k.id === 'gunPierce')) m *= 1.2; if (mon.hp >= mon.maxHp) m *= 2; break;
        case 'gBomb': if (k && ['gunBlast', 'gunFlash', 'gunRocket'].includes(k.id)) m *= 1.15; break;
        case 'pJudge': if (mon.undead || mon.demon) m *= 1.15; break;
        case 'xReaper': if (mon.stunUntil > gameNow) m *= 1.15; break;
        case 'aJudge': if (slayerMult(mon) > 1) m *= 1.45 / 1.3; break;
    }
    if (k && k.adv && k.adv.evil2 && (mon.undead || mon.demon)) m *= 2;
    if (rt.markBoost && k && advIsElemSkill(k)) m *= 1.5;
    return m;
}
function advPhysAdd(mon) { return mon.boss && advBuffAdv('bossFlat') ? advBuffAdv('bossFlat') : 0; }
function advVuln(mon) { let m = 1; const v = advDeb(mon, 'vuln'); if (v) m *= 1 + v.v; return m; }
// 爆擊：夜行者閃避後必爆、風暴遊俠精準爆破、影遁伏擊
function advCritRoll(st, mon, opt) {
    const b = advBranch(), rt = advRt(); if (!b) return null;
    if (b.id === 'dNight' && rt.nextCrit) { rt.nextCrit = false; return st.critDmg; }
    if (b.id === 'eTempest' && !opt.label && advWeaponType() === 'bow' && chance(0.05)) { addLog('🎯 精準爆破！', 'crit'); return Math.max(st.critDmg, 2); }
    return null;
}
function advAmbushMult() { const rt = advRt(); if (rt.ambush && !buffActive((advBranch() || {}).skill2 ? advBranch().skill2.id : '')) { rt.ambush = false; addLog('🌑 影遁伏擊！3 倍傷害', 'crit'); return 3; } return 1; }
// 子彈：槍鬥士 15% 不消耗、集束手雷不用子彈
function advSaveAmmo(opt) { if (opt && opt.skill && opt.skill.adv && opt.skill.adv.noAmmo) return true; return advIs('gSling') && chance(0.15); }
// 普攻／技能命中後
function advOnPhysHit(mon, total, crit, opt, st) {
    const b = advBranch(); if (!b || !mon) return;
    const rt = advRt(), k = opt && opt.skill;
    if (b.id === 'sWar') { rt.stacks = Math.min(20, rt.stacks + 1); rt.stackAt = gameNow; }
    if (b.id === 'dVenom' && chance(0.2)) advAddPoison(mon, st);
    if (b.id === 'fSword' || (b.id === 'aWar' && advWeaponType() === 'spear')) {
        const spK = b.id === 'fSword' ? 0.5 * (advBuffAdv('swordMagic2') ? 2 : 1) : 0.6;
        if (mon.hp > 0) { const d = magicDamage([0, 0], spK, st, 0, mon); mon.hp -= d; }
    }
    const cl = advBuffAdv('clones');
    if (cl && total > 0) { const extra = Math.max(1, Math.round((crit ? total / (st.critDmg || 1.5) : total) * cl[1] * cl[0])); if (mon.hp > 0) { mon.hp -= extra; addLog(`👥 影子分身追擊 ${extra}`, 'magic'); } }
    if (opt.label || opt.advExtra) return;   // 以下只看普攻
    if (b.id === 'eTempest' && advWeaponType() === 'bow' && chance(0.1)) {
        addLog('🏹 三重矢！', 'crit');
        const others = mobTargets().filter(m => m.hp > 0);
        for (let i = 0; i < 2; i++) { const t = others[(i + 1) % others.length] || mon; if (t && t.hp > 0) physicalAttack(st, 1, { advExtra: true, label: '三重矢' }, t); }
    }
    if (b.id === 'gBomb' && chance(0.1)) {
        const near = mobTargets().filter(m => m !== mon && m.hp > 0);
        if (near.length) { const d = Math.max(1, Math.round(advPhysBase(st, null) * 0.3)); near.forEach(m => m.hp -= d); addLog(`💥 火藥爆炸，波及 ${near.length} 隻（各 ${d}）`, 'magic'); }
    }
}
// 物理基準傷害（場地／召喚用，不耗彈藥、不觸發其他效果）
function advPhysBase(st, mon) {
    const w = st.weapon, die = w ? (w.dmg[mon && mon.large ? 1 : 0] + 1) / 2 : 1.5;
    let d = die + st.dmgBonus;
    if (mon) d *= slayerMult(mon) * bossDmgMult(mon, st) * advVuln(mon);
    return d;
}
function advMagicBase(n, st, mon) { const r = advMag(n); return magicDamage(r.dmg, r.spK, st, 0, mon); }
// 魔法倍率（castSpell 的每個目標、doStrike 的附加魔法）
function advIsElemSkill(k) { return !!(k && (ADV_SPELL_ELEM[k.id] || k.elem)); }
function advMagicMult(k, mon) {
    const b = advBranch(); let m = advVuln(mon); if (!b) return m;
    const e = k && (k.elem || ADV_SPELL_ELEM[k.id]);
    switch (b.id) {
        case 'mPyro': if (e === 'fire') m *= 1.15; break;
        case 'mFrost': if (e === 'ice') m *= 1.10; break;
        case 'mStorm': if (e === 'storm') m *= 1.10; break;
        case 'aJudge': if (e === 'holy') m *= 1.08; if (slayerMult(mon) > 1) m *= 1.45 / 1.3; break;
        case 'xInferno': if (k && ['demonHellfire', 'demonDrain', 'demonDoom'].includes(k.id)) m *= 1.15; break;
        case 'pJudge': if (mon.undead || mon.demon) m *= 1.15; break;
        case 'fElem': if (advBuffAdv('elemBoost') && e) m *= 1.2; if (advRt().markBoost && e) m *= 1.5; break;
    }
    return m;
}
// 魔法命中後（燃燒、凍結、印記）
function advOnSpellHit(k, mon, d, st) {
    const b = advBranch(); if (!b || !mon || !k) return;
    const e = k.elem || ADV_SPELL_ELEM[k.id];
    if (b.id === 'mPyro' && e === 'fire' && chance(0.3)) advAddDot(mon, 'burn', Math.max(1, st.sp), 4, true);
    if (b.id === 'mFrost' && e === 'ice' && chance(0.25)) { mon.stunUntil = Math.max(mon.stunUntil || 0, gameNow + 1500); }
    if (b.id === 'xInferno' && k.id === 'demonDrain') lifeSteal(d, st);
    if (k.adv && k.adv.burn) advAddDot(mon, 'burn', Math.max(1, Math.round(st.sp * k.adv.burn[1])), k.adv.burn[0], true);
}
// 元素騎士：記錄印記
function advElemMark(k, targets, st) {
    if (!advIs('fElem') || !k) return;
    const e = ADV_SPELL_ELEM[k.id] || k.elem; if (!e) return;
    const rt = advRt();
    if (rt.markBoost) { rt.markBoost = false; rt.marks = {}; }
    const ALL = ['fire', 'ice', 'storm'];
    const list = k.adv && k.adv.allMarks ? ALL : e === 'elem' ? [ALL[Math.floor(Math.random() * 3)]] : ALL.includes(e) ? [e] : [];
    for (const el of list) {
        rt.marks[el] = true;
        for (const m of targets) {
            if (m.hp <= 0) continue;
            if (el === 'fire') advAddDot(m, 'burn', Math.max(1, st.sp), 3, true);
            else if (el === 'ice') advSetDeb(m, 'slow', 1, 3);
            else if (el === 'storm') { const o = hunt.mobs.find(x => x !== m && x.hp > 0); if (o) { const d = Math.max(1, Math.round(advPhysBase(st, o) * 0.5)); o.hp -= d; } }
        }
    }
    if (rt.marks.fire && rt.marks.ice && rt.marks.storm) { rt.markBoost = true; addLog('🌀 三元素印記集齊！下一招傷害 +50%', 'rare'); }
}
// 持續傷害
function advAddDot(mon, kind, perSec, sec, magic) {
    mon.advDots = (mon.advDots || []).filter(x => x.until > gameNow && x.kind !== kind);
    mon.advDots.push({ kind, v: perSec, until: gameNow + sec * 1000, at: gameNow + 1000, magic });
}
function advAddPoison(mon, st) {
    const list = (mon.advPoison || []).filter(x => x.until > gameNow);
    if (list.length >= 3) list.sort((a, b) => a.until - b.until).shift();
    list.push({ v: Math.max(1, Math.round(advPhysBase(st, mon) * 0.15)), until: gameNow + 5000, at: gameNow + 1000 });
    mon.advPoison = list;
}

// ───────── 技能施放前後（doStrike／castSpell／castBuff 呼叫）─────────
// 施放前：回傳要實際使用的技能物件（可能是複製後改過的），null＝這次不放
function advPrepSkill(k, st) {
    const b = advBranch(); if (!b) return k;
    let x = k;
    const clone = () => { if (x === k) x = { ...k }; return x; };
    if (b.id === 'sFist' && (k.id === 'shuraThousand' || k.id === 'shuraAsura')) clone().hits = (k.hits || 1) + 1;
    if (b.id === 'gSling' && k.id === 'gunRapid') clone().hits = (k.hits || 1) + 1;
    if (b.id === 'xReaper' && k.id === 'demonFear') clone().stun = (k.stun || 2500) + 1000;
    const a = k.adv; if (!a) return x;
    if (a.maxT && hunt) clone().screenTargets = mobTargets().slice(0, a.maxT);
    if (a.execute && hunt && hunt.mon && hunt.mon.hp < hunt.mon.maxHp * a.execute[0]) clone().mult = a.execute[1];
    if (a.charge && hunt) hunt.pCd += a.charge;
    return x;
}
// 自訂執行（回傳 true＝已經處理，不走一般 doStrike／castSpell）
function advRunSkill(k, st) {
    const a = k.adv; if (!a || !a.run || !hunt || !hunt.mon) return false;
    useSkillCost(k);
    const mon = hunt.mon, rt = advRt();
    if (a.run === 'shieldWall') {
        const d = Math.max(1, defenseOf(st) * 5);
        for (const m of mobTargets()) { if (m.hp <= 0) continue; m.hp -= Math.round(d * advVuln(m)); m.stunUntil = gameNow + (k.stun || 2000); }
        addLog(`🛡️ ${k.name}！所有敵人受到 ${d} 傷害並暈眩`, 'magic'); worldVfxSkill(k, mon); return true;
    }
    if (a.run === 'detonate') {
        const n = advPoison(mon); mon.advPoison = [];
        const d = Math.max(1, Math.round(advPhysBase(st, mon) * 1 * Math.max(1, n) * advPhysMult(st, mon, { skill: k })));
        mon.hp -= d; addLog(`☠️ ${k.name}！引爆 ${n} 層毒，${mon.name}受到 ${d} 傷害`, 'magic'); worldVfxSkill(k, mon); return true;
    }
    if (a.run === 'burst') {
        const n = rt.stacks; rt.stacks = 0;
        addLog(`🔥 ${k.name}：消耗 ${n} 層戰意`, 'magic');
        doStrike({ ...k, adv: null, mult: Math.max(0.3, n * 0.3), screenPaid: true }, st); return true;
    }
    if (a.run === 'manaBurst') {
        const use = Math.floor(player.mp * a.mpPct); player.mp -= use;
        for (const m of mobTargets()) { if (m.hp <= 0) continue; const d = Math.max(1, Math.round(use * 1.5 * (1 - clamp(m.mr, 0, 100) / 200) * advVuln(m))); m.hp -= d; }
        hunt.pCd = st.castMs; addLog(`🌀 ${k.name}！消耗 ${use} MP，範圍敵人受到約 ${Math.round(use * 1.5)} 傷害`, 'magic'); worldVfxSkill(k, mon); return true;
    }
    if (a.run === 'curse') {
        for (const m of mobTargets()) { if (m.hp <= 0) continue; advSetDeb(m, 'vuln', a.vuln[0], a.vuln[1]); advSetDeb(m, 'atkDown', a.atkDown[0], a.atkDown[1]); }
        addLog(`💀 ${k.name}！敵人受到的傷害 +12%、攻擊力 −15%`, 'magic'); worldVfxSkill(k, mon); return true;
    }
    return false;
}
// 施放後（攻擊技能）
function advAfterSkill(k, st, targets, hp0) {
    const a = k.adv, b = advBranch();
    if (b) advElemMark(k, targets, st);
    if (k.kind === 'adv' && k.type === 'spell' && k.stun) for (const m of targets) if (m && m.hp > 0) m.stunUntil = gameNow + k.stun;   // 絕對零度：凍結
    if (!a) return;
    for (const m of targets) {
        if (!m || m.hp <= 0) continue;
        if (a.defDown) advSetDeb(m, 'defDown', a.defDown[0], a.defDown[1]);
        if (a.vuln) advSetDeb(m, 'vuln', a.vuln[0], a.vuln[1]);
    }
    const mon = targets[0];
    if (a.splash && mon) { const d = Math.max(1, Math.round(advMagicBase(2.5, st, mon) * a.splash)); hunt.mobs.filter(m => m !== mon && m.hp > 0).forEach(m => m.hp -= d); }
    if (a.chain && mon) {
        let d = advMagicBase(1.2, st, mon) * advMagicMult(k, mon);
        hunt.mobs.filter(m => m !== mon && m.hp > 0).slice(0, a.chain[0]).forEach(m => { d *= a.chain[1]; m.hp -= Math.max(1, Math.round(d)); });
    }
    if (a.healPer) { const n = targets.filter(m => m).length; player.hp = Math.min(st.maxHp, player.hp + Math.round(st.maxHp * a.healPer * n)); }
    if (a.drain && mon && hp0) { const dealt = Math.max(0, hp0[0] - Math.max(0, mon.hp)); if (dealt) player.hp = Math.min(st.maxHp, player.hp + Math.round(dealt * a.drain)); }   // 死鬥：吸回 30%
    if (a.reap && mon && mon.hp > 0 && mon.hp < mon.maxHp * a.reap) { addLog(`⚰️ ${k.name}追加一刀！`, 'crit'); physicalAttack(st, k.mult, { label: k.name, skill: { ...k, adv: null } }, mon); }
    if (a.selfTaken) { const r = advRt(); r.takenMul = a.selfTaken[0]; r.takenUntil = gameNow + a.selfTaken[1] * 1000; }
    if (a.selfBuff) { const r = advRt(); r.selfFx = a.selfBuff[0]; r.selfFxUntil = gameNow + a.selfBuff[1] * 1000; }
}
// 增益施放後：護盾、召喚、場地、扣血扣金
function advAfterBuff(k, st) {
    const a = k.adv; if (!a) return;
    const rt = advRt();
    if (a.goldCost) { player.gold = Math.max(0, player.gold - a.goldCost); addLog(`💰 ${k.name}花費 ${fmt(a.goldCost)} 金幣`, 'sys'); }
    if (a.hpCost) player.hp = Math.max(1, Math.round(player.hp * (1 - a.hpCost)));
    if (a.shield) {
        const s = a.shield, v = Math.round((s.lv ? player.lv * s.lv : 0) + (s.int ? st.int * s.int : 0) + (s.sp ? st.sp * s.sp : 0) + (s.wis ? st.wis * s.wis : 0));
        rt.shield = v; rt.shieldUntil = gameNow + k.sec * 1000; rt.shieldBoom = a.breakBoom || 0;
        addLog(`🛡️ ${k.name}：護盾 ${v}`, 'heal');
    }
    if (a.summon) for (let i = 0; i < a.summon.n; i++) rt.summons.push({ ...a.summon, until: gameNow + k.sec * 1000, at: gameNow + 600 + i * 300, name: k.name });
    if (a.field) rt.fields.push({ ...a.field, until: gameNow + k.sec * 1000 + 50, at: gameNow + 200, name: k.name });
    if (a.stealth) rt.ambush = true;
    if (a.store) { rt.stored = 0; rt.storeUntil = gameNow + k.sec * 1000; }
}

// ───────── 受到攻擊（monsterAttack 呼叫）─────────
function advStealthOn() { const s = advBuffOn(2); return !!(s && s.adv && s.adv.stealth); }
function advMonHitMod(mon) { return advDeb(mon, 'hitDown') ? advDeb(mon, 'hitDown').v : 0; }
function advIncoming(mon, dmg, magic, st) {
    const b = advBranch(); if (!b || dmg <= 0) return dmg;
    const rt = advRt();
    let d = dmg;
    const ad = advDeb(mon, 'atkDown'); if (ad) d *= 1 - ad.v;
    if (b.id === 'kShield' && advHasShield()) d *= 0.92;
    if (b.id === 'mFrost' && !magic) d -= 5;
    if (mon.boss && advBuffAdv('bossReduce')) d -= advBuffAdv('bossReduce');
    const t = advBuffAdv('taken'); if (t) { const before = d; d *= t; if (rt.storeUntil > gameNow) rt.stored += before - d; }
    if (rt.takenUntil > gameNow) d *= rt.takenMul;
    d = Math.max(0, Math.round(d));
    // 護盾（技能護盾、深淵魔王溢血護盾）
    if (rt.shield > 0 && rt.shieldUntil > gameNow && d > 0) {
        const n = Math.min(rt.shield, d); rt.shield -= n; d -= n;
        if (rt.shield <= 0) advShieldBreak(st);
    }
    if (rt.overShield > 0 && d > 0) { const n = Math.min(rt.overShield, d); rt.overShield -= n; d -= n; }
    if (advBuffAdv('chill') && !magic) advSetDeb(mon, 'slow', 1, 3);
    return d;
}
function advShieldBreak(st) {
    const rt = advRt();
    if (rt.shieldBoom && hunt && hunt.mon) {
        const d = Math.max(1, Math.round(advPhysBase(st, hunt.mon) * rt.shieldBoom));
        hunt.mobs.filter(m => m.hp > 0).forEach(m => m.hp -= d);
        addLog(`💥 秘法屏障破裂，範圍爆炸 ${d}`, 'magic');
    }
    rt.shieldBoom = 0;
}
// 被打到之後（反射、回血、反擊）
function advOnHurt(mon, dmg, magic, st) {
    const b = advBranch(); if (!b || !mon) return;
    if (b.id === 'pRadiant' && magic && dmg > 0 && chance(0.2)) { mon.hp -= dmg; addLog(`✨ 光之壁壘反射 ${dmg}`, 'crit'); }
    const ht = advBuffAdv('holyThorn'); if (ht && mon.hp > 0) mon.hp -= Math.max(1, Math.round(advMagicBase(ht, st, mon)));
    const hh = advBuffAdv('hurtHeal'); if (hh) player.hp = Math.min(st.maxHp, player.hp + Math.round(st.maxHp * hh));
}
function advOnDodge(mon, st) {
    const b = advBranch(); if (!b) return;
    if (b.id === 'dNight') advRt().nextCrit = true;
    const ds = advBuffAdv('dodgeShot');
    if (ds && mon && mon.hp > 0) { const d = Math.max(1, Math.round(advPhysBase(st, mon) * ds)); mon.hp -= d; addLog(`🔫 翻滾射擊反擊 ${d}`, 'crit'); }
}
// 致命傷：不滅修羅、最後防線、神聖復甦（自己沒帶傭兵時的版本在 advTick）
function advPreventDeath(st) {
    const b = advBranch(); if (!b || player.hp > 0) return false;
    if (advBuffAdv('undying')) { player.hp = 1; return true; }
    if (b.id === 'wTitan' && hasSkill(b.skill2.id) && !(player.cds[b.skill2.id] > gameNow)) {
        player.cds[b.skill2.id] = gameNow + b.skill2.cd * 1000;
        player.hp = 1 + Math.round(st.maxHp * 0.3); addLog('🛡️ 最後防線！保住一命並回復 30% HP', 'heal'); worldVfxEmit('progress-0', null, { follow: true }); return true;
    }
    return false;
}
// 傭兵（mercenary.js 呼叫）
function advMercMod(out, m) {
    if (advIs('rEmperor')) {
        out.atk = Math.round(out.atk * 1.15); out.magic = Math.round(out.magic * 1.15); out.def = Math.round(out.def * 1.15); out.mr = Math.round(out.mr * 1.15); out.hp = Math.round(out.hp * 1.15); out.mp = Math.round(out.mp * 1.15);
        for (const id of ['royalMorale', 'royalIron', 'royalImpact', 'royalDecree']) {
            if (!buffActive(id)) continue; const fx = SKILL_BY_ID[id].fx;
            out.atk += fx.dmg || 0; out.def += fx.ac || 0; if (fx.spdMul) out.speed /= 1 + fx.spdMul;
        }
    }
    const mm = advBuffAdv('merc'); if (mm) { out.atk += mm.atk || 0; out.def += mm.def || 0; }
    return out;
}
function advMercTaken(damage) {
    let d = damage;
    const r = advBuffAdv('mercReduce'); if (r) d -= r;
    const t = advBuffAdv('mercTaken'); if (t) { const before = d; d *= t; const rt = advRt(); if (rt.storeUntil > gameNow) rt.stored += before - d; }
    return Math.max(0, Math.round(d));
}
function advMercSave(m) {   // 守護聖者：傭兵受到致命傷時保住
    const b = advBranch(); if (!b || b.id !== 'pGuard' || !hasSkill(b.skill2.id) || player.cds[b.skill2.id] > gameNow) return false;
    player.cds[b.skill2.id] = gameNow + b.skill2.cd * 1000;
    m.hp = Math.max(1, Math.round(mercStats(m).hp * 0.5)); addLog('✨ 神聖復甦！傭兵保住一命並回復 50% HP', 'heal'); return true;
}
function advTauntOn() { return !!advBuffAdv('taunt'); }
function advMercHitMult(mon) { return advVuln(mon); }

// ───────── 擊倒、金幣、治癒、吸血 ─────────
function advRoyalGoldK() { return advIs('rWorld') ? 0.05 : 0.03; }
function advOnKill(mon, st) {
    const b = advBranch(); if (!b) return;
    const kh = advBuffAdv('killHeal'); if (kh) player.hp = Math.min(st.maxHp, player.hp + Math.round(st.maxHp * kh));
    const kg = advBuffAdv('killGold');
    if (kg && chance(kg[0])) { const g = mon.lv * kg[1]; player.gold += g; if (session) session.gold += g; addLog(`💰 點石成金！額外金幣 +${fmt(g)}`, 'rare'); }
}
function advHealMult() { return advIs('pGuard') ? 1.2 : 1; }
function advOverflowHeal(over, st) {   // 深淵魔王：滿血後多吸的血轉成護盾
    if (!advIs('xAbyss') || over <= 0) return;
    const rt = advRt(); rt.overShield = Math.min(Math.round(st.maxHp * 0.2), rt.overShield + over);
}

// ───────── 每次戰鬥更新（huntTick 呼叫）─────────
function advTick(dt, st) {
    const b = advBranch(); if (!b || !hunt) return;
    const rt = advRt(), now = gameNow, mobs = hunt.mobs.filter(m => m.hp > 0);
    if (b.id === 'sWar' && rt.stacks && now - rt.stackAt > 5000) rt.stacks = 0;
    // 每秒：回血類增益、泰坦血脈、神聖復甦（自己）、天使庇護、治癒套用傭兵
    if (now >= rt.regenAt) {
        rt.regenAt = now + 1000;
        const hot = advBuffAdv('hot'); if (hot) player.hp = Math.min(st.maxHp, player.hp + Math.round(st.maxHp * hot));
        const mh = advBuffAdv('mercHot'), m = typeof mercActive === 'function' && mercActive();
        if (mh && m) m.hp = Math.min(mercStats(m).hp, m.hp + Math.round(mercStats(m).hp * mh));
        if (b.id === 'wTitan' && Math.floor(now / 1000) % 5 === 0) player.hp = Math.min(st.maxHp, player.hp + Math.round(st.maxHp * 0.01));
        if (b.id === 'pGuard' && m && Math.floor(now / 1000) % 5 === 0) { const r = (hasSkill('palAura') ? 3 : 0) + (buffActive('palBless') ? 10 : 0); if (r) m.hp = Math.min(mercStats(m).hp, m.hp + r); }
        if (b.id === 'pGuard' && !m && hasSkill(b.skill2.id) && !(player.cds[b.skill2.id] > now) && player.hp < st.maxHp * 0.3) {
            player.cds[b.skill2.id] = now + b.skill2.cd * 1000; player.hp = Math.min(st.maxHp, player.hp + Math.round(st.maxHp * 0.4)); addLog('✨ 神聖復甦！回復 40% HP', 'heal');
        }
        if (b.id === 'aWatch' && player.hp < st.maxHp * 0.3 && !(player.cds._advWatch > now)) {
            player.cds._advWatch = now + 60000; player.hp = Math.min(st.maxHp, player.hp + Math.round(st.maxHp * 0.25)); addLog('✨ 天使庇護：自動治癒', 'heal');
        }
        if (rt.storeUntil && now >= rt.storeUntil) {   // 天使結界結束：吸收量的 50% 化成範圍神聖傷害
            const d = Math.round(rt.stored * 0.5); rt.storeUntil = 0; rt.stored = 0;
            if (d > 0 && mobs.length) { mobs.forEach(x => x.hp -= d); addLog(`🌟 天使結界釋放，範圍敵人受到 ${d} 神聖傷害`, 'magic'); }
        }
    }
    // 持續傷害
    for (const mon of mobs) {
        for (const x of mon.advDots || []) if (x.until > now && x.at <= now) { x.at += 1000; mon.hp -= Math.max(1, Math.round(x.v * (x.magic ? 1 - clamp(mon.mr, 0, 100) / 200 : 1) * advVuln(mon))); }
        for (const x of mon.advPoison || []) if (x.until > now && x.at <= now) { x.at += 1000; mon.hp -= Math.max(1, Math.round(x.v * advVuln(mon))); }
    }
    // 場地
    rt.fields = rt.fields.filter(f => f.until > now);
    for (const f of rt.fields) {
        if (f.at > now || !mobs.length) continue;
        f.at = now + f.every;
        const tg = f.rnd ? [mobs[Math.floor(Math.random() * mobs.length)]] : f.aoe ? mobs : [hunt.mon || mobs[0]];
        let total = 0;
        for (const m of tg) {
            if (!m || m.hp <= 0) continue;
            if (f.poison) { advAddPoison(m, st); if (f.hitDown) advSetDeb(m, 'hitDown', f.hitDown, 3); continue; }
            const d = f.mag ? Math.round(advMagicBase(f.mag, st, m) * advMagicMult({ elem: f.elem }, m)) : Math.max(1, Math.round(advPhysBase(st, m) * f.phys * advPhysMult(st, m, { skill: { aoe: true } })));
            m.hp -= d; total += d;
        }
        if (total) { addLog(`${f.icon || '✨'} ${f.name}：造成 ${total} 傷害`, 'magic'); if (tg[0] && typeof worldVfxEmit === 'function') worldVfxEmit('impact-2', tg[0]); }
    }
    // 召喚物（王室近衛、精靈王、小惡魔）與元素精靈
    rt.summons = rt.summons.filter(s => s.until > now);
    const spirits = b.id === 'ePact' ? [{ mag: 0.15 * (buffActive(b.skill1.id) ? 1.5 : 1), every: 2000, icon: '🧚' }, { mag: 0.15 * (buffActive(b.skill1.id) ? 1.5 : 1), every: 2000, icon: '🧚' }] : [];
    if (spirits.length && now >= rt.spiritAt && mobs.length) {
        rt.spiritAt = now + 2000;
        const t = hunt.mon && hunt.mon.hp > 0 ? hunt.mon : mobs[0];
        let d = 0; for (const s of spirits) d += Math.max(1, Math.round(advMagicBase(s.mag, st, t))); t.hp -= d;
        addLog(`🧚 元素精靈攻擊 ${t.name}，${d} 傷害`, 'magic');
    }
    for (const s of rt.summons) {
        if (s.at > now || !mobs.length) continue;
        s.at = now + s.every;
        const tg = s.aoe ? mobs : [hunt.mon && hunt.mon.hp > 0 ? hunt.mon : mobs[0]];
        let total = 0;
        for (const m of tg) { const d = s.mag ? Math.round(advMagicBase(s.mag, st, m)) : Math.max(1, Math.round(advPhysBase(st, m) * s.phys)); m.hp -= d; total += d; }
        addLog(`${s.icon} ${s.name}：${total} 傷害`, 'magic');
    }
}
function advResetRuntime() { advRtMap.delete(player); }
function advDrawCount() { const b = advBranch(); if (!b) return 0; const rt = advRt(); return rt.summons.filter(s => s.until > gameNow).length + (b.id === 'ePact' ? 2 : 0); }

// ───────── 畫面：名牌顏色、腳下光效、召喚光球（ui-scene.js 呼叫）─────────
function advNameColor() { const b = advBranch(); return b ? b.color : '#9fe0ff'; }
function advDrawAura(ctx, px, py) {
    const b = advBranch(); if (!b) return;
    const t = (typeof performance !== 'undefined' ? performance.now() : Date.now()) / 1000;
    ctx.save();
    ctx.globalAlpha = 0.35 + 0.15 * Math.sin(t * 2.4);
    const g = ctx.createRadialGradient(px, py + 12, 2, px, py + 12, 26);
    g.addColorStop(0, b.glow); g.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = g;
    ctx.beginPath(); ctx.ellipse(px, py + 12, 26, 9, 0, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
}
function advDrawOrbs(ctx, px, py) {
    const n = advDrawCount(); if (!n) return;
    const b = advBranch(), t = (typeof performance !== 'undefined' ? performance.now() : Date.now()) / 1000;
    ctx.save();
    for (let i = 0; i < n; i++) {
        const a = t * 1.6 + i * Math.PI * 2 / n, x = px + Math.cos(a) * 24, y = py - 22 + Math.sin(a) * 8;
        const g = ctx.createRadialGradient(x, y, 1, x, y, 8);
        g.addColorStop(0, '#fff'); g.addColorStop(0.4, b.glow); g.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x, y, 8, 0, Math.PI * 2); ctx.fill();
    }
    ctx.restore();
}

// ───────── 任務（quests.js 呼叫）─────────
function advQuestGoalText(q) {
    if (q.goal.type === 'bossCollect') return `打倒任何地圖的首領（永夜之塔守關、異界地圖首領、四大龍等，世界首領與團隊副本不算），收集「${q.goal.itemName}」×${q.goal.n}`;
    return '';
}
// 第 6 章：接任務前先選分支
function advAcceptCheck(q) {
    if (!q.advPick) return true;
    if (typeof mercActive === 'function' && mercActive()) { showToast('試煉只能一個人面對：請先讓傭兵休息'); return false; }
    if (player.equip.doll) { showToast('試煉只能一個人面對：請先卸下娃娃'); return false; }
    if (!advState().pick) { openAdvPicker(); return false; }
    return true;
}
function advQuestReward(q, got) {
    const r = q.reward, a = advState();
    if (r.advDone && a.pick) {
        const b = ADV_BY_ID[a.pick];
        a.br = b.id; a.at = Date.now(); a.pick = '';
        if (!player.skills.includes(b.passive.id)) player.skills.push(b.passive.id);
        addItem(bookIdOf(b.skill1.id), 1); got.push(ITEMS[bookIdOf(b.skill1.id)].name);
        got.push(`二轉「${b.name}」、被動「${b.passive.name}」`);
        addLog(`🌟 二轉完成！成為「${b.name}」`, 'boss');
        if (typeof worldVfxEmit === 'function') worldVfxEmit('progress-3', null, { follow: true });
    }
    if (r.advFinal) {
        const b = advBranch();
        if (b) { addItem(bookIdOf(b.skill2.id), 1); got.push(ITEMS[bookIdOf(b.skill2.id)].name); addItem('advAcc_' + b.id, 1); got.push(ITEMS['advAcc_' + b.id].name); }
    }
}
function advQuestRewardText(q) {
    const r = q.reward, parts = [];
    if (r.item) parts.push(ITEMS[r.item].name);
    if (r.gold) parts.push(`${fmt(r.gold)} 金幣`);
    if (r.elixir) parts.push(`萬能藥 ×${r.elixir}`);
    if (r.advDone) parts.push('二轉完成：新職業名稱、核心被動、第 1 招技能書');
    if (r.advFinal) parts.push('第 2 招技能書、分支專屬飾品');
    if (q.advCh === 5) parts.push('解鎖第 6 章');
    return parts.join('、');
}
// 試煉之影打輸：不扣經驗（combat.js onDeath）
function advTrialDeath(killer) { return !!(killer && killer.questBoss && advTrialActive()); }

// ───────── 介面：選分支、換分支、買書、精靈元素 ─────────
function advBranchCardHtml(b, pickFn) {
    const s1 = b.skill1, s2 = b.skill2;
    return `<div class="adv-card" style="border-color:${b.color}">
        <div class="adv-name" style="color:${b.color}">${esc(b.name)}</div>
        <div><b>被動「${esc(b.p.name)}」</b>：${esc(b.p.desc)}</div>
        <div><b>Lv.60「${esc(s1.name)}」</b>：${esc(s1.desc)}</div>
        <div><b>Lv.70「${esc(s2.name)}」</b>：${esc(s2.desc)}</div>
        ${pickFn ? `<button onclick="${pickFn}('${b.id}')">選擇「${esc(b.name)}」</button>` : ''}</div>`;
}
function openAdvPicker() {
    const list = ADV_BRANCHES[player.cls] || [];
    openDialog('🌟 選擇二轉分支', `<p>選定後到熔火煉獄挑戰試煉之影。完成二轉前可以回來重新選，不用命運重塑石。</p><div class="adv-list">${list.map(b => advBranchCardHtml(b, 'advPick')).join('')}</div>`, [{ text: '關閉', cls: 'secondary' }]);
}
function advPick(id) {
    const b = ADV_BY_ID[id], q = currentQuest();
    if (!b || b.cls !== player.cls || !q || !q.advPick) return;
    advState().pick = id;
    closeDialog();
    addLog(`🌟 選擇試煉分支「${b.name}」`, 'sys');
    if (!questState().active) acceptQuest(); else { saveGame(); refreshUI(); }
}
function openAdvReshape() {
    const cur = advBranch();
    if (!cur) { showToast('完成二轉後才能使用命運重塑石'); return; }
    if (!inTown()) { showToast('回到村莊才能使用'); return; }
    const list = ADV_BRANCHES[player.cls].filter(b => b !== cur);
    openDialog('💎 命運重塑石', `<p>目前分支：<b style="color:${cur.color}">${esc(cur.name)}</b>。換分支後舊分支的技能全部失效，技能書不會退回；新分支的技能書要打怪取得（首領較容易掉）。</p><div class="adv-list">${list.map(b => advBranchCardHtml(b, 'advReshapeTo')).join('')}</div>`, [{ text: '關閉', cls: 'secondary' }]);
}
function advReshapeTo(id) {
    const b = ADV_BY_ID[id], cur = advBranch();
    if (!b || !cur || b.cls !== player.cls || b === cur) return;
    gameConfirm('💎 重新選擇二轉', `確定從「${cur.name}」換成「${b.name}」？會消耗 1 顆命運重塑石，「${cur.name}」的被動與技能失效。`, () => {
        if (advBranch() !== cur || !inTown() || !consumeItem('advReshape')) return;
        const old = [cur.passive.id, cur.skill1.id, cur.skill2.id];
        player.skills = player.skills.filter(x => !old.includes(x));
        player.settings.bar.forEach(x => { if (old.includes(x.id)) { x.id = ''; x.a = 0; } });
        for (const k of old) { delete player.cds[k]; delete player.buffs[k]; }
        advState().br = b.id; player.skills.push(b.passive.id);
        advResetRuntime();
        addLog(`💎 二轉分支改為「${b.name}」`, 'rare');
        closeDialog(); saveGame(); refreshUI();
        gameAlert('💎 命運重塑', `你現在是「${b.name}」。新分支的技能書要打怪取得（首領較容易掉，也可以在交易所買）。`);
    }, '重塑');
}
// 元素契約者：切換精靈元素
const ADV_ELEMS = [['fire', '🔥 火（傷害）'], ['water', '💧 水（回血）'], ['wind', '🌪️ 風（攻速）'], ['earth', '🪨 地（防禦）']];
function advElemHtml() {
    if (!advIs('ePact')) return '';
    const e = advState().el;
    return `<div class="panel"><div class="loc">🧚 元素精靈</div><div class="chips">${ADV_ELEMS.map(([k, n]) => `<button class="chip-btn ${e === k ? 'active' : ''}" onclick="advSetElem('${k}')">${n}</button>`).join('')}</div></div>`;
}
function advSetElem(k) { if (!advIs('ePact') || !ADV_ELEMS.some(x => x[0] === k)) return; advState().el = k; saveGame(); refreshUI(); }
// 任務頁：二轉狀態（目前分支、試煉分支、更換）
function advQuestPanelHtml() {
    const s = questState(), b = advBranch(), a = advState(), q = currentQuest();
    let h = '';
    if (b) h += `<div class="panel"><div class="loc">🌟 二轉：<span style="color:${b.color}">${esc(b.name)}</span></div>${advBranchCardHtml(b)}<small class="muted">持有命運重塑石時，在背包使用可以換分支。換分支後的技能書要打怪取得。</small></div>${advElemHtml()}`;
    else if (q && q.advPick) {
        const p = ADV_BY_ID[a.pick];
        h += `<div class="panel"><div class="loc">🌟 二轉試煉分支：${p ? `<span style="color:${p.color}">${esc(p.name)}</span>` : '尚未選擇'}</div>
            <button onclick="openAdvPicker()">${p ? '更換試煉分支' : '選擇分支'}</button>${s.active ? '<small class="muted">完成二轉前可以免費更換。</small>' : ''}</div>`;
    }
    return h;
}

// ───────── 掉落（本機掉寶模式；後端模式由 tools/advance-class.sql 處理）─────────
function advLocalDrops(mon) {
    if (lootActive() || SIM_MODE || !mon) return;
    if (mon.boss && mon.lv >= ADV_RESHAPE_LV && chance(ADV_RESHAPE_P)) { addItem('advReshape', 1); addLootLog('💎 獲得「命運重塑石」！', 'rare'); }
    if (advIs('rWorld') && chance(ADV_WORLD_CUR_P) && typeof rollCurrency === 'function') { const id = rollCurrency(mon.lv); if (id) { addItem(id, 1); addLootLog(`💰 黃金血統：額外獲得「${ITEMS[id].name}」`, 'rare'); } }
}
