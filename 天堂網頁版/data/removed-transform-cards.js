// 使用者要求從變身卡冊移除的卡（2026-11-15，依截圖逐張列出；被塗黑的煉獄槍聖、beleth、darkelf ranger morph 保留）。
// 載入順序：transform-cards-data.js、extra-transform-cards-data.js 之後，transform-cards.js 之前。
// 已持有的紀錄在 transform-cards.js 讀檔時只保留卡冊裡還有的卡，所以這些卡會自動從收藏消失；正在使用的變身也會解除。
const REMOVED_TRANSFORM_CARDS = new Set([
  "鷹眼",
  "光輝使者", "赤焰使者", "迷你八風特", "戰神呂布", "魔神呂布",
  "赤炎聖使", "冰炎聖使", "劍聖", "殞滅箭神",
  "巴風特雕像", "未使用", "法令軍王蕾雅-變形術(歐姆民兵)", "墮落-變形術(人形殭屍)", "安特-變形術(妖魔)", "生日蛋糕怪物-集體變形術(生日慶祝妖精)", "變身 15115",
  '胡蘿蔔曼波兔', '高等柯利', '高等浣熊', '高等熊', '曼波兔', '妖魔', '哥布林', '地靈',
  '妖魔弓箭手', '侏儒', '人形殭屍', '妖魔鬥士', '狼人', '骷髏', '骷髏弓箭手', '石頭高崙',
  '骷髏斧手', '骷髏槍兵', '都達瑪拉妖魔', '食屍鬼',
  'milkcow', 'deer', 'wild boar', 'floating eye', 'giant ant', 'giant ant soldier',
  'shelob', 're ungoliant', 'ghast', 'cerberus', 'scorpion', 'troll', 'minotaur i morph', 're cockatrice',
  'bandit bow morph', 'elmor soldier morph', 'elmor general morph', 'darkelf guard morph', 'guardian armor morph', 'darkelf spear morph',
  'vampire', 'beagle',
  '變身 14491', '新手狂暴將軍',
  '迷你漫波兔', '白髮白金神射手', '紅髮白金神射手',
  '紫髮白金神射手', '金髮白金神射手',
  // 2026-11-15：使用者補充截圖中的未使用卡。
  '未使用（原始#324）', '未使用（原始#325）', '未使用（原始#326）',
  '未使用（原始#327）', '未使用（原始#328）',
  // 2026-11-16：使用者截圖要求移除超越卡「死神」（鐮刀死神；死神披肩等其他卡不受影響）。
  '死神'
]);
// 裝備附帶的造型不列為獨立變身卡；依原始用途標記辨識，避免誤刪同造型的一般卡。
for (let i = transformCardBook.length - 1; i >= 0; i--) {
  const card = transformCardBook[i];
  if (REMOVED_TRANSFORM_CARDS.has(card.n) || /^競賽變身(?:（原始#\d+）)?$/.test(card.n) || card.aliases?.includes('套裝變身系統專用')) transformCardBook.splice(i, 1);
}
