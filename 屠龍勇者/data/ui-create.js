// 屠龍勇者：標題畫面、人物選單（多角色欄位）、創角（依賴 ui、classes、player、save）
let createState = null;
let createSlot = 0;   // 新角色要放進哪個欄位
let selSlot = 0;      // 人物選單目前選中的欄位

// 更新版本時在最上方新增玩家可讀的更新紀錄。
const GAME_UPDATES = [
    { version: '20261026n', items: ['毒霧巢穴換上專屬毒池、紫霧、發光菌菇、獸骨與吊橋地圖，石台及橋面可行走，毒池與洞壁不可通行。'] },
    { version: '20261026m', items: ['砲擊、星隕轟擊、冰雪暴、雷電風暴、流星雨改為攻擊目前地圖畫面內的所有怪物，包含尚未參戰者；各招耗魔、傷害與冷卻維持原設定。', '需先安裝新版畫面範圍掉寶SQL；未安裝時僅攻擊畫面內已有憑證的參戰怪物並顯示提示。'] },
    { version: '20261026k', items: ['妖精「三重矢」改為對單一目標連射三箭，不再分散攻擊其他敵人。'] },
    { version: '20261026j', items: ['修正手機訊息視窗的聊天列表被擠成細線：增加視窗高度，矮螢幕也保持在畫面內，頻道與輸入列正常顯示。'] },
    { version: '20261026i', items: ['野外背景音樂再加入〈Recluse〉、〈Town Market Stargaze〉與〈Lanterns by the Pier〉，共六首輪流播放。'] },
    { version: '20261026h', items: ['野外背景音樂加入〈Seafoam and Embers〉，與原有兩首音樂輪流播放。'] },
    { version: '20261026f', items: ['手機版上方狀態列與下方兩排快捷欄新增抽屜按鈕，可各自一鍵收合／展開，收合不影響自動施放；記住這台裝置的收合偏好。'] },
    { version: '20261026e', items: ['變身卷軸的「修羅破戒僧（藍變）」加入光頭佛珠、鐵拳套與藍色氣勁的專屬外觀，支援四方向走路、攻擊、聚氣及受傷動畫。'] },
    { version: '20261026d', items: ['村莊商店重新開放販售變身卷軸，每張 10,000 金幣。'] },
    { version: '20261026c', items: ['雲端存檔上傳被伺服器擋下時，會自動判斷原因：帳號在其他裝置登入、這台登入已失效或帳號停權，並顯示清楚的提示；登入失效時會自動登出，請在標題畫面重新登入，角色進度不會遺失。'] },
    { version: '20261026b', items: ['變身卷軸的「象牙塔高階秘術師（藍變）」加入深藍星紋法袍與冰晶法杖專屬外觀，具四方向走路、攻擊、施法及受傷動畫。'] },
    { version: '20261026a', items: ['新版上線後，畫面會顯示「有新的更新檔」，點擊提示可儲存並更新；每分鐘、開啟遊戲及切回畫面時自動檢查。'] },
    { version: '20261025at', items: ['修正裝備圖鑑搜尋：可以正常用中文輸入法打字；搜尋時不會再因魔法娃娃、異界地圖分類而沒有反應。'] },
    { version: '20261025au', items: ['召喚娃娃消耗50個魔法結晶，每30分鐘自動扣50個續召；結晶不足自動收回並解除能力。', '召喚時間隨角色保存，已付費期間更換娃娃不重複扣料，重新登入不重置。'] },
    { version: '20261025ar', items: ['娃娃商人新增「分解傳說裝備」：每件傳說武器、防具或飾品可分解成 50 個魔法結晶；已裝備與鎖定裝備不能分解，操作前需確認。'] },
    { version: '20261025aq', items: ['移除永夜之塔與暮光法師塔的野外傳送師；改從世界地圖直接傳送，永夜之塔可在世界地圖選擇要去的樓層（已開放的樓層內）。'] },
    { version: '20261025ap', items: ['變身卷軸的「亞丁榮耀劍士（藍變）」新增銀甲藍袍專屬外觀與四方向走路、攻擊、施法、受傷動畫。'] },
    { version: '20261025ao', items: ['永夜之塔改成一層一層往上爬：一般樓層在該層擊殺 1000 隻才開放上一層，10、20…樓擊敗守關首領才開放上一層；擊殺數會累積保留。所有角色的永夜之塔進度重置回 1F。'] },
    { version: '20261025am', items: ['娃娃商人僅販售五款 T4 娃娃，每隻固定 500 鑽石；T0～T3 不販售。'] },
    { version: '20261025al', items: ['21 款娃娃能力正式加入：每隻提供兩項基本能力與一項特色被動，僅出場娃娃生效。', '人物、背包、圖鑑與商店可查看完整能力；臨時狀態區顯示觸發、效果及冷卻，冷卻與出場恢復進度隨角色保存。'] },
    { version: '20261025ak', items: ['全服掉寶公告改成只在地圖上方跑馬燈顯示，不再出現在聊天世界頻道。'] },
    { version: '20261025ai', items: ['娃娃名稱依品質顯色：七彩流光、紅、黃、紫、藍；移除名稱旁的 T0～T4 文字。'] },
    { version: '20261025ah', items: ['四座村莊的 NPC 分散至建築前，打通廣場與各設施前的可走路線。', '新增娃娃商人露米，上架 21 款娃娃，每隻預設 500 鑽；一般玩家可查看，暫僅 GM 可購買，商品送至共用倉庫。'] },
    { version: '20261025ag', items: ['修羅學會血戰後，技能狀態區固定顯示血戰圖示：平常顯示「待命」，HP 低於 50% 時發光顯示「生效中」。'] },
    { version: '20261025af', items: ['21 款魔法娃娃新增為背包道具，可在人物狀態裝備、更換或卸下，裝備後會在地圖跟隨。一次只能出場一隻。', '第一階段由 GM 發放測試，能力尚未設定；不加入商店與怪物掉落。'] },
    { version: '20261025ad', items: ['角色倉庫、帳號共用倉庫及倉庫頁背包清單改為每列兩件道具，減少往下捲動的長度。'] },
    { version: '20261025ac', items: ['重登後仍在排程異界地圖時，會自動接續未完成的排程；保留原進度，不重扣卷軸。手動暫停及補給不足仍維持暫停。'] },
    { version: '20261025ab', items: ['版本號現在可以點擊，查看本次及近期更新內容。'] },
    { version: '20261025aa', items: ['修羅血戰觸發時，臨時狀態區會顯示發光圖示；點擊可看效果，回血至50%以上後消失。'] },
    { version: '20261025z', items: ['自動瞬移後優先喝水補血，補到設定門檻再尋怪，避免低血量連續瞬移。'] },
    { version: '20261025y', items: ['首領紅圈自動閃避不再跨出目前區域；沒有安全路線時留在原地承受傷害。'] },
    { version: '20261025x', items: ['裝備改造視窗顯示每條詞綴可洗到的最高值，包含傳說與覺醒詞綴。'] },
    { version: '20261025w', items: ['箭、銀箭、子彈、銀子彈可加入自動販賣；回收價為0金幣，確認時會提醒。'] },
    { version: '20261025v', items: ['戰利品過濾新增自動販賣抽屜，可從背包選擇同名道具自動回收，並隨角色保存清單。', '加入清單時確認一次，之後同名掉落不論品質、保留詞綴或共鳴都直接回收；不影響背包現有物品。'] },
];
function openUpdateNotes() {
    const html = GAME_UPDATES.map((u, i) => `<section><h4>${i === 0 ? '本次更新' : '近期更新'} · v${esc(u.version)}</h4><ul>${u.items.map(t => `<li>${esc(t)}</li>`).join('')}</ul></section>`).join('');
    openDialog(`更新內容 · v${GAME_VERSION}`, html, [{ text: '關閉', cls: 'secondary' }]);
}

function showTitle() {
    $('version').textContent = 'v' + GAME_VERSION;
    const note = window.__wiped ? '🧹 遊戲已正式上線，測試期的角色已清除，歡迎重新開始冒險！' : TEST_NOTICE;
    $('test-notice').textContent = note;
    $('test-notice').classList.toggle('hidden', !note);
    const any = hasSave();
    if (any && !slotHasSave(currentSlot)) setCurrentSlot(nextFilledSlot());
    const sum = any ? readSlotSummary(currentSlot) : null;
    $('btn-continue').classList.toggle('hidden', !any);
    $('btn-continue').innerHTML = '📜 繼續冒險' + (sum && !sum.broken ? `<br><small>${sum.locked ? '🔒 ' : ''}${esc(sum.name)}・${CLASSES[sum.cls].name} Lv.${sum.lv}</small>` : '');
    $('btn-select').classList.toggle('hidden', !any);
    $('btn-new').classList.toggle('hidden', any);
    renderCloudEntry();
    showScreen('title');
}

function nextFilledSlot() {
    for (let i = 0; i < MAX_SLOTS; i++) if (slotHasSave(i)) return i;
    return 0;
}

// ───────── 人物選單（ARCHITECTURE.md 第 25 節）─────────
// 遊戲中開啟會先存檔、離開目前角色；其他角色若在掛機，下次進入時照常結算離線收益
function openCharSelect() {
    if (player) {
        saveGame();
        cloudFlush(true);
        hunt = null; session = null; walkHome = null;
        player = null;
    }
    selSlot = slotHasSave(currentSlot) ? currentSlot : nextFilledSlot();
    renderCharSelect();
    showScreen('select');
}

function agoText(t) {
    const m = Math.floor((Date.now() - t) / 60000);
    if (!t || m < 1) return '剛剛';
    if (m < 60) return `${m} 分鐘前`;
    if (m < 1440) return `${Math.floor(m / 60)} 小時前`;
    return `${Math.floor(m / 1440)} 天前`;
}

function charCardHtml(i, s) {
    if (!s) return `<button class="char-card empty" onclick="openCreate(${i})"><span class="char-plus">＋</span>建立新角色<small>欄位 ${i + 1}</small></button>`;
    if (s.locked) return `<button class="char-card broken ${i === selSlot ? 'sel' : ''}" onclick="pickSlot(${i})"><span class="char-plus">🔒</span>${esc(s.name)}・Lv.${s.lv}<small>屬於其他帳號${s.ownerEmail ? '：' + esc(s.ownerEmail) : ''}</small></button>`;
    if (s.broken) return `<button class="char-card broken ${i === selSlot ? 'sel' : ''}" onclick="pickSlot(${i})"><span class="char-plus">⚠️</span>存檔損毀<small>欄位 ${i + 1}</small></button>`;
    const c = CLASSES[s.cls];
    const next = s.lv >= MAX_LEVEL ? 'MAX' : fmt(expToNext(s.lv) - s.exp);
    const pct = (a, b) => b > 0 ? clamp(a / b * 100, 0, 100) : 0;
    const face = c.art
        ? `<img src="${c.art}?v=${GAME_VERSION}" alt="${c.name}" loading="lazy">`
        : `<span class="char-emoji">${c.icon}</span>`;
    return `<button class="char-card ${i === selSlot ? 'sel' : ''}" onclick="pickSlot(${i})" ondblclick="playSlot(${i})">
        <div class="char-face">${face}</div>
        <div class="char-top">
            <div class="char-name">${esc(s.name)}</div>
            <div class="char-cls">${c.name}</div>
            <div class="char-row"><i>Lv</i><b>${s.lv}</b></div>
            <div class="char-row"><i>Next</i><b>${next}</b></div>
        </div>
        <div class="char-bottom">
            <div class="char-bar hp"><div style="width:${pct(s.hp, s.maxHp)}%"></div><i>HP</i><b>${fmt(Math.max(0, s.hp))}/${fmt(s.maxHp)}</b></div>
            <div class="char-bar mp"><div style="width:${pct(s.mp, s.maxMp)}%"></div><i>MP</i><b>${fmt(Math.max(0, s.mp))}/${fmt(s.maxMp)}</b></div>
            <div class="char-loc">${s.hunting ? '⚔️' : '📍'} ${s.loc}</div>
            <div class="char-loc muted">💰 ${fmt(s.gold)}・${agoText(s.t)}</div>
        </div>
    </button>`;
}

function renderCharSelect() {
    const sums = [];
    for (let i = 0; i < MAX_SLOTS; i++) sums.push(readSlotSummary(i));
    const used = sums.filter(Boolean).length;
    $('select-count').textContent = `${used} / ${MAX_SLOTS}`;
    // 已有角色全部列出，空欄位只顯示第一個（＋建立新角色）
    const empty = sums.indexOf(null);
    $('char-grid').innerHTML = sums.map((s, i) => s || i === empty ? charCardHtml(i, s) : '').join('');
    const s = sums[selSlot];
    $('btn-play').disabled = !s || !!s.broken || !!s.locked;
    $('btn-delchar').disabled = !s;
    $('select-hint').textContent = s && s.locked ? `「${s.name}」屬於其他帳號${s.ownerEmail ? '（' + s.ownerEmail + '）' : ''}，要登入那個帳號才能玩` : s && !s.broken ? `選中：${s.name}（${CLASSES[s.cls].name} Lv.${s.lv}）` : '點選角色卡片，或點空欄位建立新角色';
}

function pickSlot(i) { selSlot = i; renderCharSelect(); }

function playSlot(i) {
    if (!slotHasSave(i)) return;
    setCurrentSlot(i);
    continueGame();
}

function playSelected() { playSlot(selSlot); }

function deleteSelectedChar() {
    const s = readSlotSummary(selSlot);
    if (!s) return;
    const who = s.broken ? `欄位 ${selSlot + 1} 的損毀存檔` : `「${s.name}」（${CLASSES[s.cls].name} Lv.${s.lv}）`;
    // 🔒 別的帳號的角色：只刪這台的那份，原帳號雲端不動；目前帳號雲端如果混有同一個角色也一起刪（cloud.js cloudDeleteSlot）
    const note = s.locked ? `\n\n這個角色屬於其他帳號${s.ownerEmail ? `（${s.ownerEmail}）` : ''}：只刪除這台裝置上的資料，原帳號雲端的角色不受影響；目前登入的帳號雲端如果也混有同一個角色，會一起刪除。` : '';
    gameConfirm('刪除角色', `${who}與所有道具會永久刪除，無法復原！確定刪除？${note}`, () => {
        deleteSave(selSlot);
        if (!hasSave()) { showTitle(); return; }
        selSlot = nextFilledSlot();
        renderCharSelect();
        showToast('已刪除角色');
    }, '永久刪除');
}

function openCreate(slot) {
    const i = slot != null ? slot : (slotHasSave(0) ? firstEmptySlot() : 0);
    if (i < 0) { showToast(`角色欄位已滿（${MAX_SLOTS} 個），請先刪除一個角色`); return; }
    createSlot = i;
    createState = null;
    stageCls = null;
    $('create-name').value = '';
    renderCreate();
    showScreen('create');
}

function createBack() {
    if (hasSave()) openCharSelect();
    else showTitle();
}

function selectClass(cls) {
    createState = { cls, stats: { ...CLASSES[cls].base }, name: $('create-name').value || (createState ? createState.name : '') };
    renderCreate();
}

function createPointsLeft() {
    return CREATE_TOTAL - STAT_KEYS.reduce((a, k) => a + createState.stats[k], 0);
}

function adjustCreateStat(k, d) {
    const v = createState.stats[k] + d;
    if (v < CLASSES[createState.cls].base[k] || v > CREATE_STAT_MAX) return;
    if (d > 0 && createPointsLeft() <= 0) return;
    createState.stats[k] = v;
    renderCreate();
}

// 創角舞台（ARCHITECTURE.md 第 18 節）：十二職業合照 all.jpg 上，選中的職業用去背圖 stage/職業.webp 疊在原位置「走出來」，其他人變暗
// 數值是角色在原圖（2000×1493）的範圍 [左, 上, 右, 下]；陣列順序＝由後往前（後面的蓋在前面，點擊優先）
const CLASS_STAGE = {
    demon: [644, 149, 1220, 707], warrior: [1326, 247, 1681, 770], shura: [1128, 345, 1336, 765], angel: [175, 172, 683, 762],
    paladin: [615, 353, 824, 791], elf: [38, 466, 355, 1158], gunner: [675, 642, 973, 1241], magicfighter: [1027, 669, 1331, 1178],
    darkelf: [1693, 607, 1970, 1216], royal: [1460, 560, 1758, 1242], knight: [329, 638, 726, 1317], mage: [1231, 915, 1651, 1360],
};
const STAGE_W = 2000, STAGE_H = 1493;
// 立繪（images/classes/職業.jpg，960×536）去背的全身像 images/classes/hero/職業.webp 在立繪中的範圍 [左, 上, 右, 下]（tools/stage/artcut.py 印出）
const CLASS_FRONT = {
    royal: [273, 18, 721, 535], knight: [188, 17, 772, 535], mage: [204, 18, 787, 535], elf: [287, 43, 712, 535],
    darkelf: [309, 35, 651, 535],   // 2026-10-16 新全身像 478×700（寬高比 0.683），高 500、置中 shura: [395, 21, 617, 459], warrior: [320, 1, 737, 536], gunner: [208, 35, 768, 535],
    magicfighter: [330, 67, 621, 523], paladin: [235, 0, 739, 532], angel: [149, 0, 844, 437], demon: [86, 2, 913, 481],
};
const ART_W = 960, ART_H = 536, FRONT_H = 0.8;   // 整張立繪高度＝舞台高的 80%
// 去背全身像路徑：職業有 hero 欄位就用它（黑暗妖精 2026-10-16 新立繪是 PNG），否則 hero/職業.webp
function heroSrc(cls) { return (CLASSES[cls] && CLASSES[cls].hero) || `images/classes/hero/${cls}.webp?v=1`; }
let stageCls = null;

function stagePos(b, shrink = 0) {
    const w = b[2] - b[0], h = b[3] - b[1];
    return `left:${(b[0] + w * shrink) / STAGE_W * 100}%;top:${(b[1] + h * shrink) / STAGE_H * 100}%;width:${w * (1 - 2 * shrink) / STAGE_W * 100}%;height:${h * (1 - 2 * shrink) / STAGE_H * 100}%`;
}

// 舞台左右箭頭：照 CLASSES 順序切換職業
function stageStep(d) {
    const ids = Object.keys(CLASSES), i = ids.indexOf(createState.cls);
    selectClass(ids[(i + d + ids.length) % ids.length]);
}

function renderStage() {
    const el = $('class-stage');
    if (!el) return;
    const cls = createState.cls, c = CLASSES[cls], b = CLASS_STAGE[cls], f = CLASS_FRONT[cls];
    if (!el.dataset.ready) {
        el.dataset.ready = '1';
        el.innerHTML = `<img class="stage-bg" src="images/classes/all.jpg?v=2" alt="十二職業">
            <img class="stage-pick" id="stage-pick" alt="">
            <div class="stage-glow" id="stage-glow"></div>
            <img class="stage-front" id="stage-front" alt="">
            ${Object.keys(CLASS_STAGE).map(id => `<button class="stage-hit" style="${stagePos(CLASS_STAGE[id], 0.12)}" onclick="selectClass('${id}')" aria-label="${CLASSES[id].name}"></button>`).join('')}
            <button class="stage-arrow l" onclick="stageStep(-1)" aria-label="上一個職業">‹</button>
            <button class="stage-arrow r" onclick="stageStep(1)" aria-label="下一個職業">›</button>
            <div class="stage-title"><small>選擇英雄職業・點人物或左右切換</small><b id="stage-name"></b><span id="stage-desc"></span></div>`;
        for (const id in CLASS_FRONT) new Image().src = heroSrc(id);   // 預先載入，切換時不會閃
    }
    if (stageCls === cls) return;
    stageCls = cls;
    $('stage-name').textContent = c.name;
    $('stage-desc').textContent = c.desc.split('。')[0] + '。';
    const pick = $('stage-pick'), front = $('stage-front'), glow = $('stage-glow');
    // ① 合照上原位置的人亮起來
    pick.style.cssText = b ? stagePos(b) : 'display:none';
    if (b) pick.src = `images/classes/stage/${cls}.webp?v=1`;
    if (!f) { front.style.display = glow.style.display = 'none'; return; }
    // ② 立繪去背的全身像走到舞台前方：把整張立繪（960×536）想成高 FRONT_H 的框，腳底貼舞台底部，水平中心跟著合照位置（限制在 28%～72%）
    const k = FRONT_H * STAGE_H / ART_H;                 // 立繪 1px ＝ 原圖幾 px
    const g = b ? (b[0] + b[2]) / 2 : STAGE_W / 2;
    const cx = Math.max(STAGE_W * 0.28, Math.min(STAGE_W * 0.72, g));
    const L = cx + (f[0] - ART_W / 2) * k, T = STAGE_H - (ART_H - f[1]) * k, W = (f[2] - f[0]) * k, H = (f[3] - f[1]) * k;
    front.style.cssText = `left:${L / STAGE_W * 100}%;top:${T / STAGE_H * 100}%;width:${W / STAGE_W * 100}%;height:${H / STAGE_H * 100}%`;
    front.src = heroSrc(cls);
    const gw = Math.min(W, 260 * k * 2);
    glow.style.cssText = `left:${(cx - gw / 2) / STAGE_W * 100}%;top:${(STAGE_H - 70) / STAGE_H * 100}%;width:${gw / STAGE_W * 100}%;height:${110 / STAGE_H * 100}%`;
    // 走出來：從合照上的位置（腳底、身高）放大移到前方
    const r = el.getBoundingClientRect(), px = r.width / STAGE_W;
    const fx = L + W / 2, fy = T + H;                     // 前方全身像的腳底中心
    const sx = b ? (b[0] + b[2]) / 2 : fx, sy = b ? b[3] : fy, s0 = b ? Math.min(1, (b[3] - b[1]) / (ART_H * k)) : 0.6;
    for (const x of [pick, glow]) { x.classList.remove('step'); void x.offsetWidth; x.classList.add('step'); }
    if (front.animate) front.animate([
        { transform: `translate(${(sx - fx) * px}px, ${(sy - fy) * px}px) scale(${s0})`, opacity: 0.15, filter: 'brightness(.5)' },
        { opacity: 1, offset: 0.35 },
        { transform: 'none', opacity: 1, filter: 'brightness(1)' },
    ], { duration: 750, easing: 'cubic-bezier(.25,.75,.3,1)' });
}

function renderCreate() {
    if (!createState) createState = { cls: 'knight', stats: { ...CLASSES.knight.base }, name: '' };
    if ($('create-name').value) createState.name = $('create-name').value;   // 重繪前保留已輸入的名字
    const c = CLASSES[createState.cls], left = createPointsLeft();
    renderStage();
    $('create-desc').innerHTML =   // 立繪已移到上方舞台（全身像走出來），這裡只留介紹
        `<b>${c.icon} ${c.name}</b><p>${c.desc}</p><p class="story-text">${CLASS_STORIES[createState.cls].story}</p>
        <small class="muted">可用武器：${c.weapons.map(w => WEAPON_TYPES[w].name).join('、')}${c.shield ? '、盾牌' : '（不能用盾）'}</small>`;
    $('create-stats').innerHTML = STAT_KEYS.map(k => `
        <div class="stat-row">
            <span>${STAT_NAMES[k]}</span>
            <button class="mini secondary" onclick="adjustCreateStat('${k}',-1)">−</button>
            <b>${createState.stats[k]}</b>
            <button class="mini" onclick="adjustCreateStat('${k}',1)" ${left <= 0 ? 'disabled' : ''}>＋</button>
        </div>`).join('') + `<div class="points-left">剩餘點數：<b>${left}</b></div>`;
    $('create-name').value = createState.name;
}

function confirmCreate() {
    const name = $('create-name').value.trim().slice(0, 12);
    createState.name = name;
    if (!name) { showToast('請輸入角色名稱'); return; }
    if (createPointsLeft() > 0) { showToast('能力點數還沒分配完'); return; }
    if (slotHasSave(createSlot)) { showToast('這個欄位已經有角色，請選空欄位'); return; }
    setCurrentSlot(createSlot);
    resetSessionState();
    createPlayer(name, createState.cls, createState.stats);
    playerOwner = ''; playerOwnerEmail = '';   // 新角色：登入中 saveGame 會歸到目前帳號，沒登入就是訪客角色
    saveGame();
    addLog(`歡迎來到低語海岸，${name}！先去「地圖」傳送到低語海岸狩獵吧。Lv.15 起可以在「📜 任務」接職業任務。`, 'sys');
    enterGame();
    gameAlert('序章', `四大龍甦醒，黑暗大陸陷入恐懼。\n\n${CLASS_STORIES[createState.cls].story}\n\n小提示：掛機會自動戰鬥、喝水、施法，記得帶足紅水與回家卷軸。Lv.15 起到「📜 任務」接職業任務。`);
}
