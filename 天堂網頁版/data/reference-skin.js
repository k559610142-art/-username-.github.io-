// 套用備份中的公開圖檔，沿用遊戲原本的按鈕事件。
const referenceSkinFiles = {
  商城: 'shop', 背包: 'bag', 技能: 'skill', 信件: 'mail', 關閉: 'close',
  角色: 'character', 社交: 'social', 設定: 'settings', 排行: 'ranking', 記憶座標: 'memory',
  變身: 'transform', 魔法娃娃: 'doll', 收藏: 'collection', 交易所: 'exchange', 登出: 'logout', 返回選擇英雄: 'back', 製作: 'craft.svg',
  選單: 'menu', 返回選單: 'back', 裝備: 'attack', 狀態: 'character'
};

function referenceSkinIcon(file) {
  const image = document.createElement('img');
  image.className = 'reference-skin-icon';
  image.alt = '';
  image.draggable = false;
  image.src = 'assets/interface/reference-skin/' + file + (file.includes('.') ? '' : '.png'); // 有副檔名（例如 craft.svg）就照用
  return image;
}

for (const button of nav.querySelectorAll('button')) {
  const file = referenceSkinFiles[button.getAttribute('aria-label')];
  if (file) button.querySelector('svg')?.replaceWith(referenceSkinIcon(file));
}
document.querySelector('#attack svg')?.replaceWith(referenceSkinIcon('attack'));
interact.querySelector('svg')?.replaceWith(referenceSkinIcon('pickup'));
game.classList.add('reference-skin');
