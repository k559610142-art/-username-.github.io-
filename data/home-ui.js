// 洞府主畫面（ARCHITECTURE.md 第 31 節）
// 背景圖 images/home-bg.jpg 已畫好頭像框、名字框、資源框、側邊按鈕與底部導覽；
// 這裡負責：舞台等比縮放、HUD 數值、底部導覽分頁切換、建築熱點與「興建中」提示。

const STAGE_IMG_W = 704;    // 背景圖原始尺寸（換圖時要一起改，並重新量 index.html 內各元素的 % 座標）
const STAGE_IMG_H = 1520;

const TAB_TITLES = { cultivate: "修仙", battle: "戰鬥", sect: "宗門", world: "世界" };

// 依視窗大小等比縮放舞台（完整顯示整張圖，多出的邊用模糊背景補），並設定 --u = 每個圖片像素對應的螢幕像素
function layoutStage() {
    const stage = document.getElementById('app-stage');
    if (!stage) return;
    const vw = window.innerWidth, vh = window.innerHeight;
    let w = vw, h = vw * STAGE_IMG_H / STAGE_IMG_W;
    if (h > vh) { h = vh; w = vh * STAGE_IMG_W / STAGE_IMG_H; }
    stage.style.width = w + 'px';
    stage.style.height = h + 'px';
    stage.style.setProperty('--u', (w / STAGE_IMG_W) + 'px');
}

function initHomeUi() {
    layoutStage();
    window.addEventListener('resize', layoutStage);
    window.addEventListener('orientationchange', layoutStage);
    switchTab('home');
}

// 底部導覽：home（洞府）只顯示背景與熱點；其他分頁在 #tab-sheet 顯示 data-tab 相符的面板
function switchTab(tab) {
    document.body.dataset.tab = tab;
    document.querySelectorAll('#bottom-nav .nav-btn').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.nav === tab);
    });
    if (TAB_TITLES[tab]) {
        document.getElementById('sheet-title').innerText = TAB_TITLES[tab];
        document.getElementById('sheet-body').scrollTop = 0;
    }
}

// 圖上有、遊戲尚未實作的功能（郵件、充值…）
let stageToastTimer = null;
function showStageToast(msg) {
    const el = document.getElementById('stage-toast');
    if (!el) return;
    el.innerText = msg;
    el.classList.add('show');
    clearTimeout(stageToastTimer);
    stageToastTimer = setTimeout(() => el.classList.remove('show'), 1800);
}
function showUnderConstruction(name) {
    showStageToast(`🏗️【${name}】興建中，敬請期待！`);
}

// 升仙台：修為圓滿時渡劫；否則提示進度（轉世在「世界」分頁的命運抉擇）
function openAscensionPlatform() {
    if (player.pendingTribulation) { triggerTribulation(); return; }
    let pct = Math.min(100, player.exp / getNextExp() * 100);
    let tip = player.realmIndex >= 10 ? "（已可於「世界 → 命運抉擇」轉世輪迴）" : "";
    showStageToast(`☁️ ${realms[player.realmIndex]} ${player.stage}階・修為 ${pct.toFixed(1)}%，圓滿後方可渡劫${tip}`);
}

// 數字縮寫：125.6萬、3.2億
function formatShortNumber(n) {
    n = Math.floor(n || 0);
    if (n >= 1e8) return (n / 1e8).toFixed(n >= 1e10 ? 0 : 1) + "億";
    if (n >= 1e4) return (n / 1e4).toFixed(n >= 1e6 ? 0 : 1) + "萬";
    return n.toLocaleString();
}

// 修煉效率：宗門經驗倍率 × 靈寵經驗加成（與 leveling.js 的 gainExp 相同）
function getCultivationRate() {
    let mult = player.sect ? player.sect.expMult : 1;
    if (hasLiveBeast('fox')) mult *= 1.1;
    if (hasLiveBeast('dragon')) mult *= 1.2;
    return mult;
}

// 由 ui.js 的 updateUI() 每次呼叫：把數值寫進疊在圖上的 HUD
function updateHomeHud() {
    const set = (id, text) => { const el = document.getElementById(id); if (el) el.innerText = text; };
    const width = (id, pct) => { const el = document.getElementById(id); if (el) el.style.width = Math.max(0, Math.min(100, pct)) + '%'; };

    const avatar = document.getElementById('hud-avatar');
    const avatarSrc = (PLAYER_AVATARS[player.gender] || PLAYER_AVATARS.male).img;
    if (avatar && avatar.getAttribute('src') !== avatarSrc) avatar.setAttribute('src', avatarSrc);

    set('hud-player-name', player.name);
    set('hud-realm', `${realms[player.realmIndex]} ${player.stage}階${player.pendingTribulation ? '・待渡劫' : ''}`);
    let levelPct = player.level >= MAX_PLAYER_LEVEL ? 100 : player.levelExp / getLevelExpNeeded(player.level) * 100;
    set('hud-level', `Lv.${player.level.toLocaleString()}`);
    width('hud-level-bar', levelPct);
    set('hud-power', formatShortNumber(getPhysAttack()));

    set('hud-coins', formatShortNumber(player.coins));
    set('hud-rep', formatShortNumber(player.reputation || 0));   // 圖上的「仙玉」欄位改顯示聲望

    width('hud-hp-bar', player.hp / player.maxHp * 100);
    set('hud-hp-text', `${formatShortNumber(player.hp)}/${formatShortNumber(player.maxHp)}`);
    width('hud-mp-bar', player.mp / player.maxMp * 100);
    set('hud-mp-text', `${formatShortNumber(player.mp)}/${formatShortNumber(player.maxMp)}`);
    let expPct = Math.min(100, player.exp / getNextExp() * 100);
    width('hud-exp-bar', expPct);
    set('hud-exp-text', player.pendingTribulation ? '圓滿・待渡劫' : `${expPct.toFixed(1)}%`);
    set('hud-rate', `${Math.round(getCultivationRate() * 100)}%`);

    // 待渡劫時升仙台牌匾亮紅點
    const plaque = document.getElementById('plaque-ascend');
    if (plaque) plaque.classList.toggle('alert', !!player.pendingTribulation);
}
