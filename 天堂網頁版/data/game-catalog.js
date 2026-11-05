// 圖鑑面板共用既有遊戲視窗的鍵盤和關閉操作。
const gameCatalogTitles = {dolls: '魔法娃娃', transforms: '變身', collection: '道具收藏'};
const gameCatalogIcons = {dolls: 'doll', transforms: 'transform', collection: 'collection'};
const gameCollections = [
  {
    name: '解放的哈爾巴斯：降臨',
    required: ['解放的哈爾巴斯', '覺醒支配者吉爾塔斯'],
    effect: '最大 HP +1,000',
    source: 'https://lineagem-event.beanfun.com/EventAD/EventAD?EventADID=9888'
  }
];
gameDialogClose.onclick = () => closePanel();
const catalogClosePanel = closePanel;
closePanel = function () {
  gameDialog.classList.remove('game-catalog-panel');
  catalogClosePanel();
};

function catalogButton(label, action, className = '') {
  const button = uiElement('button', className, label);
  button.type = 'button';
  button.onclick = action;
  return button;
}

function openGameCatalog(type) {
  cancelPointerGesture();
  stopMovement();
  stopReferenceAuto();
  previous = menuButton;
  gameDialog.classList.remove('reference-menu-panel', 'classic-panel');
  gameDialog.classList.add('game-catalog-panel');
  gameDialog.setAttribute('aria-label', gameCatalogTitles[type]);
  gameDialogClose.hidden = false;
  gameDialog.hidden = false;

  const title = uiElement('h2', 'game-catalog-title', gameCatalogTitles[type]);
  const tabs = uiElement('nav', 'game-catalog-tabs');
  tabs.setAttribute('aria-label', '圖鑑分類');
  for (const [key, label] of Object.entries(gameCatalogTitles)) {
    const button = catalogButton(label, () => openGameCatalog(key));
    button.setAttribute('aria-pressed', String(key === type));
    tabs.append(button);
  }
  const layout = uiElement('div', 'game-catalog-layout');
  const sidebar = uiElement('aside', 'game-catalog-sidebar');
  const results = uiElement('div', 'game-catalog-results');
  const detail = uiElement('div', 'game-catalog-detail');
  const search = uiElement('input', 'game-catalog-search');
  search.type = 'search';
  search.placeholder = type === 'collection' ? '搜尋收藏或需求卡片' : '搜尋名稱或外觀編號';
  search.setAttribute('aria-label', search.placeholder);
  const cards = uiElement('div', type === 'collection' ? 'game-catalog-sets' : 'game-catalog-cards');
  results.append(search, cards);
  layout.append(sidebar, results, detail);
  gameDialogContent.replaceChildren(title, tabs, layout);

  const entries = type === 'collection' ? gameCollections : gameCatalogData[type];
  const all = () => true;
  const filters = type === 'transforms' ? [
    ['全部', all], ['1–29 級', row => row.level < 30],
    ['30–49 級', row => row.level >= 30 && row.level < 50], ['50 級以上', row => row.level >= 50]
  ] : [['全部', all]];
  let activeFilter = all;
  let selected = null;

  function showDetails(row) {
    selected = row;
    detail.replaceChildren();
    for (const button of cards.children) button.setAttribute('aria-pressed', String(button.catalogEntry === row));
    if (!row) {
      detail.append(uiElement('p', '', '沒有符合條件的項目。'));
      return;
    }
    const picture = referenceSkinIcon(gameCatalogIcons[type]);
    picture.classList.add('game-catalog-preview');
    detail.append(picture, uiElement('h3', '', row.name));
    if (type === 'collection') {
      detail.append(uiElement('strong', '', row.effect), uiElement('h4', '', '需求卡片'));
      for (const card of row.required) detail.append(uiElement('p', '', card));
      const source = uiElement('a', '', '查看官方公告');
      source.href = row.source;
      source.target = '_blank';
      source.rel = 'noopener noreferrer';
      detail.append(source);
    } else if (type === 'dolls') {
      detail.append(uiElement('p', '', '召喚時間 ' + Math.floor(row.time / 60) + ' 分鐘 · 外觀 ' + row.gfx));
      for (const [id, amount] of row.materials) {
        detail.append(uiElement('p', '', (id === 41246 ? '魔法結晶體' : '道具 #' + id) + ' × ' + amount));
      }
      detail.append(uiElement('h4', '', '娃娃能力'));
      for (const effect of row.effects) detail.append(uiElement('p', '', effect));
    } else {
      detail.append(uiElement('p', '', '最低等級 ' + row.level + ' · 外觀 ' + row.gfx),
        uiElement('p', '', row.magic ? '可施放魔法' : '此造型限制施法'));
    }
  }

  function refreshCards() {
    const query = search.value.trim().toLowerCase();
    const visible = entries.filter(row => activeFilter(row) &&
      [row.name, row.gfx, ...(row.required || [])].join(' ').toLowerCase().includes(query));
    cards.replaceChildren();
    for (const row of visible) {
      const card = catalogButton('', () => showDetails(row), 'game-catalog-card');
      card.catalogEntry = row;
      if (type !== 'collection') card.append(referenceSkinIcon(gameCatalogIcons[type]));
      card.append(uiElement('span', '', row.name));
      if (row.effect) card.append(uiElement('small', '', row.effect));
      cards.append(card);
    }
    showDetails(visible.includes(selected) ? selected : visible[0]);
  }

  for (const [label, predicate] of filters) {
    const button = catalogButton(label + ' (' + entries.filter(predicate).length + ')', () => {
      activeFilter = predicate;
      for (const item of sidebar.children) item.setAttribute('aria-pressed', String(item === button));
      refreshCards();
    });
    button.setAttribute('aria-pressed', String(predicate === all));
    sidebar.append(button);
  }
  search.oninput = refreshCards;
  refreshCards();
  gameDialogClose.focus();
}
