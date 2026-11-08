// 主畫面的選單、快捷鍵與訊息篩選。
const gameDialog = document.querySelector('#panel');
const gameDialogContent = document.querySelector('#panelContent');
const gameDialogClose = document.querySelector('#close');
const menuButton = nav.lastElementChild;
const closeReferenceDialog = closePanel;
closePanel = function () {
  gameDialog.classList.remove('reference-menu-panel');
  closeReferenceDialog();
};
const menuLayout = [
  ['商城', '◆'], ['背包', '▣', 'bag'], ['技能', '✦', 'magic'], ['信件', '✉'], ['關閉', '×', 'close'],
  ['角色', '♙', 'character'], ['社交', '♧'], ['設定', '⚙', 'settings'], ['排行', '♜'], ['記憶座標', '⌖'],
  ['變身', '◈', 'transforms'], ['魔法娃娃', '✧', 'dolls'], ['收藏', '▤', 'collection'], ['交易所', '⚖'], ['登出', '⇥', 'logout']
];
const characterMenuLayout = [
  ['裝備', '⚔', 'equipment'], ['狀態', '♙', 'status'], ['返回選單', '‹', 'menu'], ['關閉', '×', 'close']
];

function runGameMenuAction(action) {
  if (Object.hasOwn(gameCatalogTitles, action)) {
    openGameCatalog(action);
    return;
  }
  if (action === 'character') {
    gameDialog.classList.remove('reference-menu-panel');
    panel('equipment');
    previous = menuButton;
    return;
  }
  if (action === 'menu') {
    renderGameMenu();
    return;
  }
  if (action === 'close' || action === 'logout') {
    closePanel();
    if (action === 'logout') window.GameEntry.logout();
    return;
  }
  gameDialog.classList.remove('reference-menu-panel');
  panel(action);
  previous = menuButton;
}

function renderGameMenu(showCharacter = false) {
  const layout = showCharacter ? characterMenuLayout : menuLayout;
  const title = showCharacter ? '角色' : '遊戲選單';
  const menu = uiElement('div', 'reference-menu-grid');
  for (const [label, glyph, action] of layout) {
    const button = uiElement('button', 'reference-menu-tile');
    button.type = 'button';
    const symbol = uiElement('span', 'reference-menu-glyph', glyph);
    symbol.setAttribute('aria-hidden', 'true');
    const file = referenceSkinFiles[label];
    button.append(file ? referenceSkinIcon(file) : symbol, uiElement('span', '', label));
    if (action) button.onclick = () => runGameMenuAction(action);
    else {
      button.disabled = true;
      button.title = '尚未開放';
    }
    if (action === 'close') button.classList.add('reference-menu-close');
    menu.append(button);
  }
  gameDialog.setAttribute('aria-label', title);
  gameDialogContent.replaceChildren(menu);
  menu.querySelector('button:not(:disabled)').focus();
}

menuButton.onclick = () => {
  if (window.gameFlowState !== 'playing') return;
  cancelPointerGesture({preserveNavigation:true});
  previous = menuButton;
  gameDialog.classList.remove('classic-panel', 'game-catalog-panel');
  gameDialog.classList.add('reference-menu-panel');
  gameDialogClose.hidden = true;
  gameDialog.hidden = false;
  renderGameMenu();
};
nav.replaceChildren(
  hudButton('背包', uiSymbols.bag, () => panel('bag')),
  hudButton('技能', uiSymbols.skill, () => panel('magic')),
  menuButton
);
quest.hidden = true;

const quickButtons = [...shortcuts.querySelectorAll('.combat-quick-slot')];
quickButtons.forEach((button, index) => {
  button.querySelector('.quick-key').textContent = 'F' + (index + 1);
});
addEventListener('keydown', event => {
  if (window.gameFlowState !== 'playing' || event.altKey || event.ctrlKey ||
      event.metaKey || event.shiftKey || event.target.closest?.('input, textarea, select, [contenteditable]')) return;
  const match = /^F(10|[1-9])$/.exec(event.key);
  if (!match) return;
  event.preventDefault();
  if (!event.repeat) quickButtons[Number(match[1]) - 1].click();
});

const logSource = document.querySelector('#log');
logSource.hidden = true;
const messagePanel = uiElement('section', 'reference-messages');
messagePanel.setAttribute('aria-label', '遊戲訊息');
const messageTabs = uiElement('div', 'reference-message-tabs');
const messageList = uiElement('div', 'reference-message-list');
messageList.setAttribute('aria-live', 'polite');
const messages = [];
let messageFilter = 'all';

function renderGameMessages() {
  messageList.replaceChildren(...messages
    .filter(entry => messageFilter === 'all' || entry.kind === messageFilter)
    .map(entry => uiElement('div', '', entry.text)));
  messageList.scrollTop = messageList.scrollHeight;
}

for (const [kind, label] of [['all', '全部'], ['system', '系統'], ['journal', '日誌']]) {
  const button = uiElement('button', '', label);
  button.type = 'button';
  button.setAttribute('aria-pressed', String(kind === messageFilter));
  button.onclick = () => {
    messageFilter = kind;
    for (const tab of messageTabs.children) tab.setAttribute('aria-pressed', String(tab === button));
    renderGameMessages();
  };
  messageTabs.append(button);
}
messagePanel.append(messageTabs, messageList);
game.append(messagePanel);

function captureGameMessage() {
  const text = logSource.textContent.trim();
  if (!text) return;
  messages.push({text, kind: text.startsWith('[日誌]') ? 'journal' : 'system'});
  if (messages.length > 100) messages.shift();
  renderGameMessages();
}
new MutationObserver(captureGameMessage).observe(logSource, {childList: true, characterData: true, subtree: true});
captureGameMessage();
