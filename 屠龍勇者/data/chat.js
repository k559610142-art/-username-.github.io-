// 屠龍勇者：聊天（ARCHITECTURE.md 第 32 節）
// 依賴 cloud（cloudSb／cloudUser／cloudBan）、raid（raidRoom）、ui-panels（TABS／PANEL_FNS 在載入時加分頁）。
// 頻道：world 世界、room:<隊伍id> 隊伍（只有團隊副本隊員）。資料在 Supabase dragon_chat；每則 1～100 字、每人 3 秒一則、保留 3 天（規則在 tools/supabase.sql）。
// 聊天分頁開著時每 4 秒抓一次新訊息（只抓比手上最新一則更新的），沒開時不連網。

const CHAT_MAX_LEN = 100;
const CHAT_COOLDOWN_MS = 3000;
const CHAT_POLL_MS = 4000;
const CHAT_SHOW = 60;          // 每個頻道畫面上留幾則

let chatChannel = 'world';
let chatMsgs = {};             // 頻道 → 訊息陣列（舊→新）
let chatLastSent = 0;
let chatDraft = '';
let chatLoading = false;
let chatErr = '';
let chatMute = null;           // 自己被禁言：{ until, reason }
let chatMuteChecked = false;

function chatRoomChannel() { return raidRoom ? 'room:' + raidRoom.id : null; }
function chatReady() { return isCloudConfigured() && cloudLoggedIn(); }

function chatOpen(ch) {
    if (ch === 'room') ch = chatRoomChannel() || 'world';
    if (ch) chatChannel = ch;
    switchTab('chat');
}

function chatSwitch(ch) {
    chatChannel = ch === 'room' ? (chatRoomChannel() || 'world') : 'world';
    renderPanel();
    chatFetch();
}

async function chatFetch() {
    if (!chatReady() || chatLoading) return;
    if (chatChannel !== 'world' && chatChannel !== chatRoomChannel()) chatChannel = 'world';   // 離開隊伍了
    const ch = chatChannel, list = chatMsgs[ch] || [];
    chatLoading = true;
    try {
        let q = cloudSb.from('dragon_chat').select('id, user_id, name, cls, lv, text, at').eq('channel', ch);
        const rows = list.length
            ? await raidQ(q.gt('id', list[list.length - 1].id).order('id', { ascending: true }).limit(50))
            : (await raidQ(q.order('id', { ascending: false }).limit(CHAT_SHOW))).reverse();
        if (rows.length || !chatMsgs[ch]) {
            chatMsgs[ch] = list.concat(rows).slice(-CHAT_SHOW);
            chatRenderList();
        }
        chatErr = '';
    } catch (e) {
        chatErr = cloudErrText(e);
        chatRenderList();
    }
    chatLoading = false;
}

async function chatCheckMute() {
    try {
        const { data } = await cloudTimeout(cloudSb.from('dragon_mutes').select('until, reason').eq('user_id', cloudUser.id).maybeSingle());
        chatMute = data && Date.parse(data.until) > Date.now() ? data : null;
    } catch (e) { chatMute = null; }
}

async function chatSend() {
    const el = document.getElementById('chat-input');
    const text = ((el && el.value) || '').replace(/\s+/g, ' ').trim().slice(0, CHAT_MAX_LEN);
    if (!text || !chatReady() || !player) return;
    if (cloudBan) { showToast('帳號已停權，無法發言'); return; }
    const wait = CHAT_COOLDOWN_MS - (Date.now() - chatLastSent);
    if (wait > 0) { showToast(`說話太快了，${Math.ceil(wait / 1000)} 秒後再試`); return; }
    chatLastSent = Date.now();
    try {
        await raidQ(cloudSb.from('dragon_chat').insert({ channel: chatChannel, user_id: cloudUser.id, name: player.name, cls: player.cls, lv: player.lv, text }));
        chatDraft = '';
        if (el) el.value = '';
        chatFetch();
    } catch (e) {
        const m = String((e && e.message) || '');
        if (/too fast/.test(m)) showToast('說話太快了，3 秒後再試');
        else if (/row-level security/.test(m)) {
            await chatCheckMute();
            showToast(chatMute ? `你被禁言到 ${new Date(chatMute.until).toLocaleString('zh-TW', { hour12: false })}` : '無法在這個頻道發言');
            renderPanel();
        } else showToast('發送失敗：' + cloudErrText(e));
    }
}

function chatKey(ev) {
    if (ev.key === 'Enter' && !ev.isComposing) { ev.preventDefault(); chatSend(); }
}

function chatTime(at) {
    const d = new Date(at), now = new Date();
    const hm = d.toLocaleTimeString('zh-TW', { hour: '2-digit', minute: '2-digit', hour12: false });
    return d.toDateString() === now.toDateString() ? hm : `${d.getMonth() + 1}/${d.getDate()} ${hm}`;
}

function chatListHtml() {
    if (chatErr) return `<div class="muted">⚠️ ${esc(chatErr)}</div>`;
    const list = chatMsgs[chatChannel];
    if (!list) return '<div class="muted">讀取中…</div>';
    if (!list.length) return `<div class="muted">還沒有人說話，打個招呼吧！</div>`;
    return list.map(m => {
        const c = CLASSES[m.cls] || {}, mine = cloudUser && m.user_id === cloudUser.id;
        return `<div class="chat-line ${mine ? 'mine' : ''}"><span class="chat-time">${chatTime(m.at)}</span>
            <b class="chat-name">${c.icon || ''}${esc(m.name)}<small> Lv.${m.lv || '?'}</small></b><span class="chat-text">${esc(m.text)}</span></div>`;
    }).join('');
}

// 只更新訊息列表（不重畫整個分頁，打到一半的字不會不見）
function chatRenderList() {
    const box = document.getElementById('chat-list');
    if (!box) return;
    const atBottom = box.scrollHeight - box.scrollTop - box.clientHeight < 40;
    box.innerHTML = chatListHtml();
    if (atBottom) box.scrollTop = box.scrollHeight;
}

function renderChat() {
    if (!isCloudConfigured()) return `<div class="panel notice">聊天需要雲端伺服器，目前尚未開通。</div>`;
    if (!cloudLoggedIn()) return `<div class="panel notice">聊天要先登入帳號。
        <div class="btn-row"><button onclick="cloudLoginFromGame()">☁️ 回標題畫面登入</button></div></div>`;
    if (chatChannel !== 'world' && chatChannel !== chatRoomChannel()) chatChannel = 'world';
    // 分頁重畫（例如打怪時畫面更新）前輸入框有焦點，畫完要還回去
    const hadFocus = !!(document.activeElement && document.activeElement.id === 'chat-input');
    const room = chatRoomChannel();
    const chips = `<div class="chips"><button class="chip-btn ${chatChannel === 'world' ? 'active' : ''}" onclick="chatSwitch('world')">🌏 世界</button>
        <button class="chip-btn ${chatChannel !== 'world' ? 'active' : ''}" onclick="chatSwitch('room')" ${room ? '' : 'disabled title="加入團隊副本隊伍後才能用"'}>🐉 隊伍</button></div>`;
    const blocked = cloudBan ? '帳號已停權，無法發言' : chatMute && Date.parse(chatMute.until) > Date.now() ? `禁言中，到 ${new Date(chatMute.until).toLocaleString('zh-TW', { hour12: false })}` : '';
    const input = blocked ? `<div class="muted">⛔ ${esc(blocked)}</div>`
        : `<div class="chat-input-row"><input type="text" id="chat-input" maxlength="${CHAT_MAX_LEN}" placeholder="${chatChannel === 'world' ? '對全世界說…' : '對隊友說…'}" value="${esc(chatDraft)}"
            oninput="chatDraft = this.value" onkeydown="chatKey(event)" autocomplete="off">
            <button onclick="chatSend()">發送</button></div>`;
    if (!chatMsgs[chatChannel]) setTimeout(chatFetch, 0);
    if (!chatMuteChecked) { chatMuteChecked = true; chatCheckMute().then(() => { if (chatMute) renderPanel(); }); }
    setTimeout(() => {
        const box = document.getElementById('chat-list');
        if (box) box.scrollTop = box.scrollHeight;
        const el = document.getElementById('chat-input');
        if (el && hadFocus) { el.focus(); el.setSelectionRange(el.value.length, el.value.length); }
    }, 0);
    return `<div class="panel chat-panel">${chips}<div id="chat-list" class="chat-list">${chatListHtml()}</div>${input}
        <small class="muted">${chatChannel === 'world' ? '所有玩家都看得到。' : '只有隊伍裡的人看得到。'}每則最多 ${CHAT_MAX_LEN} 字、3 秒一則，訊息保留 3 天。請友善發言，管理者可以禁言。</small></div>`;
}

setInterval(() => {
    if (typeof currentTab !== 'undefined' && currentTab === 'chat' && player && !document.hidden && !SIM_MODE) chatFetch();
}, CHAT_POLL_MS);

TABS.chat = ['💬', '聊天'];
PANEL_FNS.chat = renderChat;
