// 使用者要求從變身卡冊移除的卡（2026-11-15，依截圖逐張列出；被塗黑的煉獄槍聖、beleth、darkelf ranger morph 保留）。
// 載入順序：transform-cards-data.js、extra-transform-cards-data.js 之後，transform-cards.js 之前。
// 已持有的紀錄在 transform-cards.js 讀檔時只保留卡冊裡還有的卡，所以這些卡會自動從收藏消失；正在使用的變身也會解除。
const REMOVED_TRANSFORM_CARDS = new Set([
  '胡蘿蔔曼波兔', '高等柯利', '高等浣熊', '高等熊', '曼波兔', '妖魔', '哥布林', '地靈',
  '妖魔弓箭手', '侏儒', '人形殭屍', '妖魔鬥士', '狼人', '骷髏', '骷髏弓箭手', '石頭高崙',
  '骷髏斧手', '骷髏槍兵', '都達瑪拉妖魔', '食屍鬼',
  'milkcow', 'deer', 'wild boar', 'floating eye', 'giant ant', 'giant ant soldier',
  'shelob', 're ungoliant', 'ghast', 'cerberus', 'scorpion', 'troll', 'minotaur i morph', 're cockatrice',
  'bandit bow morph', 'elmor soldier morph', 'elmor general morph', 'darkelf guard morph', 'guardian armor morph', 'darkelf spear morph',
  'vampire', 'beagle'
]);
for (let i = transformCardBook.length - 1; i >= 0; i--) if (REMOVED_TRANSFORM_CARDS.has(transformCardBook[i].n)) transformCardBook.splice(i, 1);
