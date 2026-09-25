// 城內場景（第二頁面）：全螢幕城內畫面與傳送點；資料在 config-towns.js（ARCHITECTURE.md 第 20 節）
// 版面：場景圖高度填滿畫面、寬度依比例延伸；比畫面寬時可左右滑動，比畫面窄時改以寬度填滿、可上下捲動。
//       畫面直向且該城有 portrait（直式圖）時改用直式圖，手機上剛好滿版。
//       傳送點以「圖上像素」換算成 %，任何尺寸都對得準；橫圖與直式圖各有一組傳送點。

let currentTownScene = null;   // 目前開著的城鎮名稱（null = 沒開）
let currentTownView = null;    // 目前使用的圖（橫圖設定本身，或其 portrait）

function hasTownScene(name) {
    return !!townScenes[name];
}

// 依畫面方向選圖：直向（寬 < 高）且有直式圖 → portrait，否則橫圖
function pickTownView(scene) {
    return scene.portrait && window.innerWidth < window.innerHeight ? scene.portrait : scene;
}

function openTownScene(name) {
    const scene = townScenes[name];
    if (!scene) return;
    currentTownScene = name;
    currentTownView = null;   // 強制 applyTownView 重新套用
    document.getElementById('town-scene-title').innerText = scene.title;
    document.getElementById('town-scene').style.display = 'block';
    applyTownView(true);
}

function closeTownScene() {
    currentTownScene = null;
    currentTownView = null;
    document.getElementById('town-scene').style.display = 'none';
}

// 換圖（第一次開啟或轉向時）＋重排；recenter = 視角置中
function applyTownView(recenter) {
    const scene = townScenes[currentTownScene];
    if (!scene) return;
    const view = pickTownView(scene);
    if (view !== currentTownView) {
        currentTownView = view;
        const img = document.getElementById('town-scene-img');
        if (img.getAttribute('src') !== view.img) img.setAttribute('src', view.img);
        renderTownHotspots(view);
        recenter = true;
    }
    layoutTownScene(recenter);
}

function renderTownHotspots(view) {
    const layer = document.getElementById('town-scene-hotspots');
    const pct = (v, total) => (v / total * 100).toFixed(3) + '%';
    layer.innerHTML = (view.hotspots || []).filter(h => h.enabled !== false).map(h => {
        const [x, y, w, hh] = h.rect;
        return `<button class="town-hotspot" style="left: ${pct(x, view.imgW)}; top: ${pct(y, view.imgH)}; width: ${pct(w, view.imgW)}; height: ${pct(hh, view.imgH)};"
                    onclick="${h.action}" aria-label="${h.label}"><span class="town-plaque">${h.label}</span></button>`;
    }).join('');
}

// 依視窗大小設定舞台尺寸
function layoutTownScene(recenter) {
    const v = currentTownView;
    if (!v) return;
    const box = document.getElementById('town-scene-view');
    const stage = document.getElementById('town-scene-stage');
    const vw = box.clientWidth, vh = box.clientHeight;
    const ratio = v.imgW / v.imgH;
    let h = vh, w = vh * ratio;
    if (w < vw) { w = vw; h = vw / ratio; }
    stage.style.width = w + 'px';
    stage.style.height = h + 'px';
    if (recenter) {
        box.scrollLeft = (w - vw) / 2;
        box.scrollTop = (h - vh) / 2;
    }
    const hint = document.getElementById('town-scene-hint');
    hint.innerText = '↔ 左右滑動瀏覽';
    hint.style.display = w > vw + 4 ? '' : 'none';
}

window.addEventListener('resize', () => { if (currentTownScene) applyTownView(false); });

// 電腦版瀏覽：滑鼠滾輪改成左右平移（畫面只有左右可捲時）、按住拖曳平移；手機直接用手指滑動（瀏覽器原生捲動）
(function initTownScenePan() {
    const view = document.getElementById('town-scene-view');
    if (!view) return;
    view.addEventListener('wheel', e => {
        const canX = view.scrollWidth > view.clientWidth, canY = view.scrollHeight > view.clientHeight;
        if (canX && !canY && Math.abs(e.deltaY) > Math.abs(e.deltaX)) { view.scrollLeft += e.deltaY; e.preventDefault(); }
    }, { passive: false });
    let drag = null;
    view.addEventListener('mousedown', e => {
        if (e.button !== 0) return;
        drag = { x: e.clientX, y: e.clientY, left: view.scrollLeft, top: view.scrollTop, moved: false };
    });
    window.addEventListener('mousemove', e => {
        if (!drag) return;
        const dx = e.clientX - drag.x, dy = e.clientY - drag.y;
        if (!drag.moved && Math.abs(dx) + Math.abs(dy) < 6) return;   // 小於 6px 視為點擊，不拖曳
        drag.moved = true;
        view.scrollLeft = drag.left - dx;
        view.scrollTop = drag.top - dy;
        view.style.cursor = 'grabbing';
    });
    let suppressClick = false;
    window.addEventListener('mouseup', () => {
        if (!drag) return;
        view.style.cursor = '';
        suppressClick = drag.moved;          // 拖曳後放開，不要觸發傳送點
        drag = null;
        setTimeout(() => { suppressClick = false; }, 0);
    });
    view.addEventListener('click', e => { if (suppressClick) { e.stopPropagation(); e.preventDefault(); } }, true);

    // 座標工具：網址加 ?townedit=1，點城內畫面任一處會顯示「圖上像素座標」（目前是橫圖或直式圖會一併標示），用來設定傳送點 rect
    if (/[?&]townedit=1/.test(location.search)) {
        view.addEventListener('click', e => {
            const v = currentTownView;
            if (!v || suppressClick) return;
            const r = document.getElementById('town-scene-stage').getBoundingClientRect();
            const x = Math.round((e.clientX - r.left) / r.width * v.imgW);
            const y = Math.round((e.clientY - r.top) / r.height * v.imgH);
            const which = v === townScenes[currentTownScene] ? '橫圖' : '直式圖';
            const hint = document.getElementById('town-scene-hint');
            hint.style.display = '';
            hint.innerText = `📍 ${which}座標 (${x}, ${y})`;
            console.log(`[townedit] ${currentTownScene} ${which} (${x}, ${y})`);
        });
    }
})();
