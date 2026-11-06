// 圖鑑面板共用既有遊戲視窗的鍵盤和關閉操作。
const gameCatalogTitles = {dolls: '魔法娃娃', transforms: '變身卡冊', enchant: 'BOSS附魔', wuhun: '武魂', collection: '道具收藏'};
const gameCatalogIcons = {dolls: 'doll', transforms: 'transform', cards: 'transform', enchant: 'attack', wuhun: 'character', collection: 'collection'};
// 天地劫系統分頁（娃娃召喚、BOSS 附魔、武魂）：列表資料快取，讓選取狀態在重畫時保持同一列。
const tdjCatalogRows = {};
function tdjRows(type) {
  if (type === 'enchant') return tdjCatalogRows.enchant ??= bossEnchantData.map(e => ({name: e.stone, e}));
  if (type === 'wuhun') return tdjCatalogRows.wuhun ??= wuhunData.map(w => ({name: w.name, w}));
  return null;
}
const tdjWuhunTierTag = {下品: 'white', 上品: 'green', 極品: 'blue', 千年: 'red', 萬年: 'purple', 上古: 'gold', 四神獸: 'transcend'};
const lineageMCardTiers = {
  "white": "白卡 · 一般",
  "green": "綠卡 · 高級",
  "blue": "藍卡 · 稀有",
  "red": "紅卡 · 英雄",
  "purple": "紫卡 · 傳說",
  "gold": "金卡 · 神話"
};
// 天堂W 官方階級（gradeId）→ 名稱與卡框顏色。
const lineageWGrades = {
  1: ['一般', 'white'], 2: ['高級', 'green'], 3: ['稀有', 'blue'], 4: ['英雄', 'red'],
  5: ['傳說', 'purple'], 6: ['神話', 'gold'], 7: ['超越', 'transcend'], 8: ['唯一', 'unique']
};
const lineageMTransformCards = [
  {
    "name": "哥布林",
    "tier": "white",
    "source": "https://mineagem.pixnet.net/blog/posts/15065225772",
    "sourceLabel": "韓版公開圖鑑",
    "portrait": 3861
  },
  {
    "name": "石頭高崙",
    "tier": "green",
    "source": "https://lineagem-event.beanfun.com/EventAD/EventAD?EventADID=4199",
    "portrait": 3904
  },
  {
    "name": "菲爾菲爾",
    "tier": "blue",
    "source": "https://lineagem-event.beanfun.com/EventAD/EventAD?EventADID=4199"
  },
  {
    "name": "佩利克",
    "tier": "blue",
    "source": "https://lineagem-event.beanfun.com/EventAD/EventAD?EventADID=4199"
  },
  {
    "name": "瑪依奴",
    "tier": "blue",
    "source": "https://lineagem-event.beanfun.com/EventAD/EventAD?EventADID=4199"
  },
  {
    "name": "冰原狼人",
    "tier": "blue",
    "source": "https://lineagem-event.beanfun.com/EventAD/EventAD?EventADID=4199"
  },
  {
    "name": "凱普莉夏",
    "tier": "red",
    "source": "https://lineagem-event.beanfun.com/EventAD/EventAD?EventADID=4199"
  },
  {
    "name": "潘",
    "tier": "red",
    "source": "https://lineagem-event.beanfun.com/EventAD/EventAD?EventADID=4199"
  },
  {
    "name": "天鵝的勞安格林",
    "tier": "purple",
    "source": "https://www.gametsg.net/henshin.html",
    "sourceLabel": "天堂M透視鏡",
    "effects": [
      "攻擊速度 +145%",
      "移動速度 +5%",
      "施法速度 +20%"
    ]
  },
  {
    "name": "白金死亡騎士",
    "tier": "gold",
    "source": "https://lineagem-event.beanfun.com/EventAD/EventAD?EventADID=4199"
  },
  {
    "name": "真屠龍者",
    "tier": "gold",
    "source": "https://lineagem-event.beanfun.com/EventAD/EventAD?EventADID=12237",
    "effects": [
      "攻擊速度 +180%",
      "移動速度 +15%",
      "施法速度 +20%"
    ]
  }
];
const gameCollections = [];
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

const catalogPortraits = {
  "transforms-8817": [
    "transforms-8817.png",
    "sprite"
  ],
  "transforms-8774": [
    "transforms-8774.png",
    "sprite"
  ],
  "transforms-8900": [
    "transforms-8900.png",
    "sprite"
  ],
  "transforms-8851": [
    "transforms-8851.png",
    "sprite"
  ],
  "transforms-8812": [
    "transforms-8812.png",
    "sprite"
  ],
  "transforms-9003": [
    "transforms-9003.png",
    "sprite"
  ],
  "transforms-8913": [
    "transforms-8913.png",
    "sprite"
  ],
  "transforms-8978": [
    "transforms-8978.png",
    "sprite"
  ],
  "dolls-55000": [
    "dolls-55000.png",
    "sprite"
  ],
  "dolls-55001": [
    "dolls-55001.png",
    "sprite"
  ],
  "dolls-55002": [
    "dolls-55002.png",
    "sprite"
  ],
  "dolls-55003": [
    "dolls-55003.png",
    "sprite"
  ],
  "dolls-55004": [
    "dolls-55004.png",
    "sprite"
  ],
  "dolls-55005": [
    "dolls-55005.png",
    "sprite"
  ],
  "dolls-55006": [
    "dolls-55006.png",
    "sprite"
  ],
  "dolls-55007": [
    "dolls-55007.png",
    "sprite"
  ],
  "dolls-55008": [
    "dolls-55008.png",
    "sprite"
  ],
  "dolls-55009": [
    "dolls-55009.png",
    "sprite"
  ],
  "dolls-55010": [
    "dolls-55010.png",
    "sprite"
  ],
  "dolls-55011": [
    "dolls-55011.png",
    "sprite"
  ],
  "dolls-55012": [
    "dolls-55012.png",
    "sprite"
  ],
  "dolls-55013": [
    "dolls-55013.png",
    "sprite"
  ],
  "dolls-55015": [
    "dolls-55015.gif",
    "item"
  ],
  "dolls-55016": [
    "dolls-55016.gif",
    "item"
  ],
  "dolls-55017": [
    "dolls-55017.gif",
    "item"
  ],
  "dolls-55018": [
    "dolls-55018.gif",
    "item"
  ],
  "dolls-55019": [
    "dolls-55019.gif",
    "item"
  ],
  "dolls-55020": [
    "dolls-55020.gif",
    "item"
  ],
  "dolls-55021": [
    "dolls-55021.gif",
    "item"
  ],
  "dolls-55022": [
    "dolls-55022.gif",
    "item"
  ],
  "dolls-55023": [
    "dolls-55023.gif",
    "item"
  ],
  "dolls-55024": [
    "dolls-55024.gif",
    "item"
  ],
  "dolls-55025": [
    "dolls-55025.gif",
    "item"
  ],
  "dolls-55026": [
    "dolls-55026.gif",
    "item"
  ],
  "dolls-55027": [
    "dolls-55027.gif",
    "item"
  ],
  "dolls-55028": [
    "dolls-55028.gif",
    "item"
  ],
  "dolls-55029": [
    "dolls-55029.png",
    "sprite"
  ],
  "dolls-55030": [
    "dolls-55030.png",
    "sprite"
  ],
  "dolls-55031": [
    "dolls-55031.png",
    "sprite"
  ],
  "dolls-55032": [
    "dolls-55032.png",
    "sprite"
  ],
  "dolls-55033": [
    "dolls-55033.gif",
    "item"
  ],
  "dolls-55034": [
    "dolls-55034.gif",
    "item"
  ],
  "dolls-55035": [
    "dolls-55035.gif",
    "item"
  ],
  "dolls-55036": [
    "dolls-55036.gif",
    "item"
  ],
  "dolls-55037": [
    "dolls-55037.gif",
    "item"
  ],
  "dolls-55038": [
    "dolls-55038.gif",
    "item"
  ],
  "dolls-55039": [
    "dolls-55039.gif",
    "item"
  ],
  "dolls-55040": [
    "dolls-55040.gif",
    "item"
  ],
  "dolls-55041": [
    "dolls-55041.png",
    "sprite"
  ],
  "dolls-55042": [
    "dolls-55042.png",
    "sprite"
  ],
  "dolls-55043": [
    "dolls-55043.png",
    "sprite"
  ],
  "dolls-55044": [
    "dolls-55044.png",
    "sprite"
  ],
  "dolls-55045": [
    "dolls-55045.png",
    "sprite"
  ],
  "dolls-55046": [
    "dolls-55046.png",
    "sprite"
  ],
  "dolls-55047": [
    "dolls-55047.png",
    "sprite"
  ],
  "dolls-55048": [
    "dolls-55048.png",
    "sprite"
  ],
  "dolls-55049": [
    "dolls-55049.png",
    "sprite"
  ],
  "dolls-55050": [
    "dolls-55050.png",
    "sprite"
  ],
  "dolls-55051": [
    "dolls-55051.png",
    "sprite"
  ],
  "dolls-55052": [
    "dolls-55052.png",
    "sprite"
  ],
  "dolls-55053": [
    "dolls-55053.gif",
    "item"
  ],
  "dolls-55054": [
    "dolls-55054.gif",
    "item"
  ],
  "dolls-55055": [
    "dolls-55055.gif",
    "item"
  ],
  "dolls-55056": [
    "dolls-55056.gif",
    "item"
  ],
  "dolls-55057": [
    "dolls-55057.gif",
    "item"
  ],
  "dolls-55058": [
    "dolls-55058.gif",
    "item"
  ],
  "dolls-55059": [
    "dolls-55059.gif",
    "item"
  ],
  "dolls-55060": [
    "dolls-55060.gif",
    "item"
  ],
  "dolls-55061": [
    "dolls-55061.gif",
    "item"
  ],
  "dolls-55062": [
    "dolls-55062.gif",
    "item"
  ],
  "dolls-55063": [
    "dolls-55063.gif",
    "item"
  ],
  "dolls-55064": [
    "dolls-55064.gif",
    "item"
  ],
  "dolls-55065": [
    "dolls-55065.gif",
    "item"
  ],
  "dolls-55066": [
    "dolls-55066.gif",
    "item"
  ],
  "dolls-55067": [
    "dolls-55067.gif",
    "item"
  ],
  "dolls-55068": [
    "dolls-55068.gif",
    "item"
  ],
  "dolls-55069": [
    "dolls-55069.gif",
    "item"
  ],
  "dolls-55070": [
    "dolls-55070.gif",
    "item"
  ],
  "dolls-55071": [
    "dolls-55071.gif",
    "item"
  ],
  "dolls-55072": [
    "dolls-55072.gif",
    "item"
  ],
  "dolls-55073": [
    "dolls-55073.gif",
    "item"
  ],
  "dolls-55074": [
    "dolls-55074.gif",
    "item"
  ],
  "dolls-55075": [
    "dolls-55075.gif",
    "item"
  ],
  "dolls-55076": [
    "dolls-55076.gif",
    "item"
  ],
  "dolls-55077": [
    "dolls-55077.gif",
    "item"
  ],
  "dolls-55078": [
    "dolls-55078.gif",
    "item"
  ],
  "dolls-55079": [
    "dolls-55079.gif",
    "item"
  ],
  "dolls-55080": [
    "dolls-55080.gif",
    "item"
  ],
  "dolls-55081": [
    "dolls-55081.gif",
    "item"
  ],
  "dolls-55082": [
    "dolls-55082.gif",
    "item"
  ],
  "transforms-947": [
    "transforms-947.png",
    "sprite"
  ],
  "transforms-979": [
    "transforms-979.png",
    "sprite"
  ],
  "transforms-3906": [
    "transforms-3906.png",
    "sprite"
  ],
  "transforms-3860": [
    "transforms-3860.png",
    "sprite"
  ],
  "transforms-3861": [
    "transforms-3861.png",
    "sprite"
  ],
  "transforms-3862": [
    "transforms-3862.png",
    "sprite"
  ],
  "transforms-3863": [
    "transforms-3863.png",
    "sprite"
  ],
  "transforms-3864": [
    "transforms-3864.png",
    "sprite"
  ],
  "transforms-3865": [
    "transforms-3865.png",
    "sprite"
  ],
  "transforms-3904": [
    "transforms-3904.png",
    "sprite"
  ],
  "transforms-29": [
    "transforms-29.png",
    "sprite"
  ],
  "transforms-1037": [
    "transforms-1037.png",
    "sprite"
  ],
  "transforms-1039": [
    "transforms-1039.png",
    "sprite"
  ],
  "transforms-3866": [
    "transforms-3866.png",
    "sprite"
  ],
  "transforms-3867": [
    "transforms-3867.png",
    "sprite"
  ],
  "transforms-3868": [
    "transforms-3868.png",
    "sprite"
  ],
  "transforms-3869": [
    "transforms-3869.png",
    "sprite"
  ],
  "transforms-3870": [
    "transforms-3870.png",
    "sprite"
  ],
  "transforms-2374": [
    "transforms-2374.png",
    "sprite"
  ],
  "transforms-2377": [
    "transforms-2377.png",
    "sprite"
  ],
  "transforms-3871": [
    "transforms-3871.png",
    "sprite"
  ],
  "transforms-2376": [
    "transforms-2376.png",
    "sprite"
  ],
  "transforms-95": [
    "transforms-95.png",
    "sprite"
  ],
  "transforms-3872": [
    "transforms-3872.png",
    "sprite"
  ],
  "transforms-3873": [
    "transforms-3873.png",
    "sprite"
  ],
  "transforms-2378": [
    "transforms-2378.png",
    "sprite"
  ],
  "transforms-3874": [
    "transforms-3874.png",
    "sprite"
  ],
  "transforms-146": [
    "transforms-146.png",
    "sprite"
  ],
  "transforms-3875": [
    "transforms-3875.png",
    "sprite"
  ],
  "transforms-3876": [
    "transforms-3876.png",
    "sprite"
  ],
  "transforms-951": [
    "transforms-951.png",
    "sprite"
  ],
  "transforms-1047": [
    "transforms-1047.png",
    "sprite"
  ],
  "transforms-3877": [
    "transforms-3877.png",
    "sprite"
  ],
  "transforms-3878": [
    "transforms-3878.png",
    "sprite"
  ],
  "transforms-3879": [
    "transforms-3879.png",
    "sprite"
  ],
  "transforms-3880": [
    "transforms-3880.png",
    "sprite"
  ],
  "transforms-2323": [
    "transforms-2323.png",
    "sprite"
  ],
  "transforms-2386": [
    "transforms-2386.png",
    "sprite"
  ],
  "transforms-2387": [
    "transforms-2387.png",
    "sprite"
  ],
  "transforms-2385": [
    "transforms-2385.png",
    "sprite"
  ],
  "transforms-3630": [
    "transforms-3630.png",
    "sprite"
  ],
  "transforms-3631": [
    "transforms-3631.png",
    "sprite"
  ],
  "transforms-3632": [
    "transforms-3632.png",
    "sprite"
  ],
  "transforms-3633": [
    "transforms-3633.png",
    "sprite"
  ],
  "transforms-3881": [
    "transforms-3881.png",
    "sprite"
  ],
  "transforms-3884": [
    "transforms-3884.png",
    "sprite"
  ],
  "transforms-3885": [
    "transforms-3885.png",
    "sprite"
  ],
  "transforms-3882": [
    "transforms-3882.png",
    "sprite"
  ],
  "transforms-3883": [
    "transforms-3883.png",
    "sprite"
  ],
  "transforms-3634": [
    "transforms-3634.png",
    "sprite"
  ],
  "transforms-3887": [
    "transforms-3887.png",
    "sprite"
  ],
  "transforms-3888": [
    "transforms-3888.png",
    "sprite"
  ],
  "transforms-3905": [
    "transforms-3905.png",
    "sprite"
  ],
  "transforms-3784": [
    "transforms-3784.png",
    "sprite"
  ],
  "transforms-2284": [
    "transforms-2284.png",
    "sprite"
  ],
  "transforms-3945": [
    "transforms-3945.png",
    "sprite"
  ],
  "transforms-3950": [
    "transforms-3950.png",
    "sprite"
  ],
  "transforms-2384": [
    "transforms-2384.png",
    "sprite"
  ],
  "transforms-4918": [
    "transforms-4918.png",
    "sprite"
  ],
  "transforms-4925": [
    "transforms-4925.png",
    "sprite"
  ],
  "transforms-3886": [
    "transforms-3886.png",
    "sprite"
  ],
  "transforms-4917": [
    "transforms-4917.png",
    "sprite"
  ],
  "transforms-4920": [
    "transforms-4920.png",
    "sprite"
  ],
  "transforms-3102": [
    "transforms-3102.png",
    "sprite"
  ],
  "transforms-4919": [
    "transforms-4919.png",
    "sprite"
  ],
  "transforms-4922": [
    "transforms-4922.png",
    "sprite"
  ],
  "transforms-4924": [
    "transforms-4924.png",
    "sprite"
  ],
  "transforms-4926": [
    "transforms-4926.png",
    "sprite"
  ],
  "transforms-3103": [
    "transforms-3103.png",
    "sprite"
  ],
  "transforms-4921": [
    "transforms-4921.png",
    "sprite"
  ],
  "transforms-4932": [
    "transforms-4932.png",
    "sprite"
  ],
  "transforms-3890": [
    "transforms-3890.png",
    "sprite"
  ],
  "transforms-3891": [
    "transforms-3891.png",
    "sprite"
  ],
  "transforms-3892": [
    "transforms-3892.png",
    "sprite"
  ],
  "transforms-5727": [
    "transforms-5727.png",
    "sprite"
  ],
  "transforms-3893": [
    "transforms-3893.png",
    "sprite"
  ],
  "transforms-3894": [
    "transforms-3894.png",
    "sprite"
  ],
  "transforms-3895": [
    "transforms-3895.png",
    "sprite"
  ],
  "transforms-5730": [
    "transforms-5730.png",
    "sprite"
  ],
  "transforms-3896": [
    "transforms-3896.png",
    "sprite"
  ],
  "transforms-3897": [
    "transforms-3897.png",
    "sprite"
  ],
  "transforms-3898": [
    "transforms-3898.png",
    "sprite"
  ],
  "transforms-5733": [
    "transforms-5733.png",
    "sprite"
  ],
  "transforms-3899": [
    "transforms-3899.png",
    "sprite"
  ],
  "transforms-3900": [
    "transforms-3900.png",
    "sprite"
  ],
  "transforms-3901": [
    "transforms-3901.png",
    "sprite"
  ],
  "transforms-5736": [
    "transforms-5736.png",
    "sprite"
  ],
  "transforms-2501": [
    "transforms-2501.png",
    "sprite"
  ],
  "transforms-2388": [
    "transforms-2388.png",
    "sprite"
  ],
  "transforms-3952": [
    "transforms-3952.png",
    "sprite"
  ],
  "transforms-4767": [
    "transforms-4767.png",
    "sprite"
  ],
  "transforms-4769": [
    "transforms-4769.png",
    "sprite"
  ],
  "transforms-4928": [
    "transforms-4928.png",
    "sprite"
  ],
  "transforms-4929": [
    "transforms-4929.png",
    "sprite"
  ],
  "transforms-938": [
    "transforms-938.png",
    "sprite"
  ],
  "transforms-2064": [
    "transforms-2064.png",
    "sprite"
  ],
  "transforms-4227": [
    "transforms-4227.png",
    "sprite"
  ],
  "transforms-3750": [
    "transforms-3750.png",
    "sprite"
  ],
  "transforms-3664": [
    "transforms-3664.png",
    "sprite"
  ],
  "transforms-6010": [
    "transforms-6010.png",
    "sprite"
  ],
  "transforms-6089": [
    "transforms-6089.png",
    "sprite"
  ],
  "transforms-4000": [
    "transforms-4000.png",
    "sprite"
  ],
  "transforms-4001": [
    "transforms-4001.png",
    "sprite"
  ],
  "transforms-4002": [
    "transforms-4002.png",
    "sprite"
  ],
  "transforms-4004": [
    "transforms-4004.png",
    "sprite"
  ],
  "transforms-4186": [
    "transforms-4186.png",
    "sprite"
  ],
  "transforms-4188": [
    "transforms-4188.png",
    "sprite"
  ],
  "transforms-4190": [
    "transforms-4190.png",
    "sprite"
  ],
  "transforms-6002": [
    "transforms-6002.png",
    "sprite"
  ],
  "transforms-6137": [
    "transforms-6137.png",
    "sprite"
  ],
  "transforms-6140": [
    "transforms-6140.png",
    "sprite"
  ],
  "transforms-6136": [
    "transforms-6136.png",
    "sprite"
  ],
  "transforms-6139": [
    "transforms-6139.png",
    "sprite"
  ],
  "transforms-6138": [
    "transforms-6138.png",
    "sprite"
  ],
  "transforms-6267": [
    "transforms-6267.png",
    "sprite"
  ],
  "transforms-6268": [
    "transforms-6268.png",
    "sprite"
  ],
  "transforms-6269": [
    "transforms-6269.png",
    "sprite"
  ],
  "transforms-6279": [
    "transforms-6279.png",
    "sprite"
  ],
  "transforms-6142": [
    "transforms-6142.png",
    "sprite"
  ],
  "transforms-6145": [
    "transforms-6145.png",
    "sprite"
  ],
  "transforms-6141": [
    "transforms-6141.png",
    "sprite"
  ],
  "transforms-6144": [
    "transforms-6144.png",
    "sprite"
  ],
  "transforms-6143": [
    "transforms-6143.png",
    "sprite"
  ],
  "transforms-6270": [
    "transforms-6270.png",
    "sprite"
  ],
  "transforms-6271": [
    "transforms-6271.png",
    "sprite"
  ],
  "transforms-6272": [
    "transforms-6272.png",
    "sprite"
  ],
  "transforms-6280": [
    "transforms-6280.png",
    "sprite"
  ],
  "transforms-6147": [
    "transforms-6147.png",
    "sprite"
  ],
  "transforms-6150": [
    "transforms-6150.png",
    "sprite"
  ],
  "transforms-6146": [
    "transforms-6146.png",
    "sprite"
  ],
  "transforms-6149": [
    "transforms-6149.png",
    "sprite"
  ],
  "transforms-6148": [
    "transforms-6148.png",
    "sprite"
  ],
  "transforms-6273": [
    "transforms-6273.png",
    "sprite"
  ],
  "transforms-6274": [
    "transforms-6274.png",
    "sprite"
  ],
  "transforms-6275": [
    "transforms-6275.png",
    "sprite"
  ],
  "transforms-6281": [
    "transforms-6281.png",
    "sprite"
  ],
  "transforms-6152": [
    "transforms-6152.png",
    "sprite"
  ],
  "transforms-6155": [
    "transforms-6155.png",
    "sprite"
  ],
  "transforms-6151": [
    "transforms-6151.png",
    "sprite"
  ],
  "transforms-6154": [
    "transforms-6154.png",
    "sprite"
  ],
  "transforms-6153": [
    "transforms-6153.png",
    "sprite"
  ],
  "transforms-6276": [
    "transforms-6276.png",
    "sprite"
  ],
  "transforms-6277": [
    "transforms-6277.png",
    "sprite"
  ],
  "transforms-6278": [
    "transforms-6278.png",
    "sprite"
  ],
  "transforms-6282": [
    "transforms-6282.png",
    "sprite"
  ],
  "transforms-6157": [
    "transforms-6157.png",
    "sprite"
  ],
  "transforms-6160": [
    "transforms-6160.png",
    "sprite"
  ],
  "transforms-6156": [
    "transforms-6156.png",
    "sprite"
  ],
  "transforms-6159": [
    "transforms-6159.png",
    "sprite"
  ],
  "transforms-6158": [
    "transforms-6158.png",
    "sprite"
  ],
  "transforms-6284": [
    "transforms-6284.png",
    "sprite"
  ],
  "transforms-3902": [
    "transforms-3902.png",
    "sprite"
  ],
  "transforms-3903": [
    "transforms-3903.png",
    "sprite"
  ],
  "transforms-5976": [
    "transforms-5976.png",
    "sprite"
  ],
  "transforms-6086": [
    "transforms-6086.png",
    "sprite"
  ],
  "transforms-6087": [
    "transforms-6087.png",
    "sprite"
  ],
  "transforms-6088": [
    "transforms-6088.png",
    "sprite"
  ],
  "transforms-6034": [
    "transforms-6034.png",
    "sprite"
  ],
  "transforms-6035": [
    "transforms-6035.png",
    "sprite"
  ],
  "transforms-9987": [
    "transforms-9987.png",
    "sprite"
  ],
  "transforms-9988": [
    "transforms-9988.png",
    "sprite"
  ],
  "transforms-9989": [
    "transforms-9989.png",
    "sprite"
  ],
  "transforms-9990": [
    "transforms-9990.png",
    "sprite"
  ],
  "transforms-9991": [
    "transforms-9991.png",
    "sprite"
  ],
  "transforms-9205": [
    "transforms-9205.png",
    "sprite"
  ],
  "transforms-9011": [
    "transforms-9011.png",
    "sprite"
  ],
  "transforms-9225": [
    "transforms-9225.png",
    "sprite"
  ],
  "transforms-9206": [
    "transforms-9206.png",
    "sprite"
  ],
  "transforms-9012": [
    "transforms-9012.png",
    "sprite"
  ],
  "transforms-9226": [
    "transforms-9226.png",
    "sprite"
  ],
  "transforms-8860": [
    "transforms-8860.png",
    "sprite"
  ],
  "transforms-8859": [
    "transforms-8859.png",
    "sprite"
  ],
  "transforms-2437": [
    "transforms-2437.png",
    "sprite"
  ],
  "transforms-2438": [
    "transforms-2438.png",
    "sprite"
  ],
  "transforms-8858": [
    "transforms-8858.png",
    "sprite"
  ],
  "transforms-8865": [
    "transforms-8865.png",
    "sprite"
  ],
  "transforms-8866": [
    "transforms-8866.png",
    "sprite"
  ],
  "transforms-8868": [
    "transforms-8868.png",
    "sprite"
  ],
  "transforms-8863": [
    "transforms-8863.png",
    "sprite"
  ],
  "transforms-8864": [
    "transforms-8864.png",
    "sprite"
  ],
  "transforms-8867": [
    "transforms-8867.png",
    "sprite"
  ],
  "transforms-8862": [
    "transforms-8862.png",
    "sprite"
  ],
  "transforms-8861": [
    "transforms-8861.png",
    "sprite"
  ],
  "transforms-8781": [
    "transforms-8781.png",
    "sprite"
  ],
  "transforms-8782": [
    "transforms-8782.png",
    "sprite"
  ],
  "transforms-8783": [
    "transforms-8783.png",
    "sprite"
  ],
  "transforms-8784": [
    "transforms-8784.png",
    "sprite"
  ],
  "transforms-8785": [
    "transforms-8785.png",
    "sprite"
  ],
  "transforms-8786": [
    "transforms-8786.png",
    "sprite"
  ],
  "transforms-8787": [
    "transforms-8787.png",
    "sprite"
  ],
  "transforms-8788": [
    "transforms-8788.png",
    "sprite"
  ],
  "transforms-8789": [
    "transforms-8789.png",
    "sprite"
  ],
  "transforms-8790": [
    "transforms-8790.png",
    "sprite"
  ],
  "transforms-8791": [
    "transforms-8791.png",
    "sprite"
  ],
  "transforms-8792": [
    "transforms-8792.png",
    "sprite"
  ],
  "transforms-8793": [
    "transforms-8793.png",
    "sprite"
  ],
  "transforms-8794": [
    "transforms-8794.png",
    "sprite"
  ],
  "transforms-8795": [
    "transforms-8795.png",
    "sprite"
  ],
  "transforms-8796": [
    "transforms-8796.png",
    "sprite"
  ],
  "transforms-8797": [
    "transforms-8797.png",
    "sprite"
  ],
  "transforms-8798": [
    "transforms-8798.png",
    "sprite"
  ],
  "transforms-8799": [
    "transforms-8799.png",
    "sprite"
  ],
  "transforms-8800": [
    "transforms-8800.png",
    "sprite"
  ],
  "transforms-8801": [
    "transforms-8801.png",
    "sprite"
  ],
  "transforms-8802": [
    "transforms-8802.png",
    "sprite"
  ],
  "transforms-8803": [
    "transforms-8803.png",
    "sprite"
  ],
  "transforms-8804": [
    "transforms-8804.png",
    "sprite"
  ],
  "transforms-8805": [
    "transforms-8805.png",
    "sprite"
  ],
  "transforms-8806": [
    "transforms-8806.png",
    "sprite"
  ],
  "transforms-8807": [
    "transforms-8807.png",
    "sprite"
  ],
  "transforms-8808": [
    "transforms-8808.png",
    "sprite"
  ],
  "transforms-945": [
    "transforms-945.png",
    "sprite"
  ],
  "dolls-39039": [
    "client-doll-13183.png",
    "sprite"
  ],
  "dolls-39149": [
    "client-doll-13344.png",
    "sprite"
  ],
  "dolls-39150": [
    "client-doll-13345.png",
    "sprite"
  ],
  "dolls-55084": [
    "client-doll-3891.png",
    "sprite"
  ],
  "dolls-55085": [
    "client-doll-3894.png",
    "sprite"
  ],
  "dolls-55086": [
    "client-doll-3897.png",
    "sprite"
  ],
  "dolls-55087": [
    "client-doll-3900.png",
    "sprite"
  ],
  "dolls-80254": [
    "client-doll-5933.png",
    "sprite"
  ],
  "dolls-80255": [
    "client-doll-5933.png",
    "sprite"
  ],
  "dolls-80256": [
    "client-doll-5933.png",
    "sprite"
  ],
  "dolls-80257": [
    "client-doll-5933.png",
    "sprite"
  ],
  "dolls-80258": [
    "client-doll-5933.png",
    "sprite"
  ],
  "dolls-80259": [
    "client-doll-11229.png",
    "sprite"
  ],
  "dolls-80260": [
    "client-doll-11227.png",
    "sprite"
  ],
  "dolls-80261": [
    "client-doll-11225.png",
    "sprite"
  ],
  "dolls-80262": [
    "client-doll-11611.png",
    "sprite"
  ],
  "dolls-80263": [
    "client-doll-11608.png",
    "sprite"
  ],
  "dolls-80264": [
    "client-doll-14303.png",
    "sprite"
  ],
  "dolls-80265": [
    "client-doll-8751.png",
    "sprite"
  ],
  "dolls-80266": [
    "client-doll-11316.png",
    "sprite"
  ],
  "dolls-80267": [
    "client-doll-11111.png",
    "sprite"
  ],
  "dolls-80268": [
    "client-doll-10717.png",
    "sprite"
  ],
  "dolls-80269": [
    "client-doll-10741.png",
    "sprite"
  ],
  "dolls-80270": [
    "client-doll-10742.png",
    "sprite"
  ],
  "dolls-80271": [
    "client-doll-10720.png",
    "sprite"
  ],
  "dolls-80272": [
    "client-doll-10723.png",
    "sprite"
  ],
  "dolls-80273": [
    "client-doll-10726.png",
    "sprite"
  ],
  "dolls-80274": [
    "client-doll-10729.png",
    "sprite"
  ],
  "dolls-80275": [
    "client-doll-10743.png",
    "sprite"
  ],
  "dolls-80276": [
    "client-doll-10744.png",
    "sprite"
  ],
  "dolls-80277": [
    "client-doll-10732.png",
    "sprite"
  ],
  "dolls-80278": [
    "client-doll-10735.png",
    "sprite"
  ],
  "dolls-80279": [
    "client-doll-10738.png",
    "sprite"
  ],
  "dolls-80280": [
    "client-doll-12991.png",
    "sprite"
  ],
  "dolls-80281": [
    "client-doll-13183.png",
    "sprite"
  ],
  "dolls-80282": [
    "client-doll-13187.png",
    "sprite"
  ],
  "dolls-80283": [
    "client-doll-13191.png",
    "sprite"
  ],
  "dolls-80286": [
    "client-doll-13250.png",
    "sprite"
  ],
  "dolls-80287": [
    "client-doll-13254.png",
    "sprite"
  ],
  "dolls-80288": [
    "client-doll-13258.png",
    "sprite"
  ],
  "dolls-80290": [
    "client-doll-13342.png",
    "sprite"
  ],
  "dolls-80291": [
    "client-doll-13342.png",
    "sprite"
  ],
  "dolls-80292": [
    "client-doll-13342.png",
    "sprite"
  ],
  "dolls-80293": [
    "client-doll-13342.png",
    "sprite"
  ],
  "dolls-80294": [
    "client-doll-13342.png",
    "sprite"
  ],
  "dolls-80295": [
    "client-doll-13342.png",
    "sprite"
  ],
  "dolls-80296": [
    "client-doll-13342.png",
    "sprite"
  ],
  "dolls-80297": [
    "client-doll-13342.png",
    "sprite"
  ],
  "dolls-80298": [
    "client-doll-13342.png",
    "sprite"
  ],
  "dolls-80299": [
    "client-doll-13342.png",
    "sprite"
  ],
  "dolls-80300": [
    "client-doll-13344.png",
    "sprite"
  ],
  "dolls-80301": [
    "client-doll-13344.png",
    "sprite"
  ],
  "dolls-80302": [
    "client-doll-13344.png",
    "sprite"
  ],
  "dolls-80303": [
    "client-doll-13344.png",
    "sprite"
  ],
  "dolls-80304": [
    "client-doll-13344.png",
    "sprite"
  ],
  "dolls-80305": [
    "client-doll-13343.png",
    "sprite"
  ],
  "dolls-80306": [
    "client-doll-13343.png",
    "sprite"
  ],
  "dolls-80307": [
    "client-doll-13343.png",
    "sprite"
  ],
  "dolls-80308": [
    "client-doll-13343.png",
    "sprite"
  ],
  "dolls-80309": [
    "client-doll-13343.png",
    "sprite"
  ],
  "dolls-80310": [
    "client-doll-13343.png",
    "sprite"
  ],
  "dolls-80311": [
    "client-doll-13343.png",
    "sprite"
  ],
  "dolls-80312": [
    "client-doll-13343.png",
    "sprite"
  ],
  "dolls-80313": [
    "client-doll-13343.png",
    "sprite"
  ],
  "dolls-80314": [
    "client-doll-13343.png",
    "sprite"
  ],
  "dolls-80315": [
    "client-doll-13345.png",
    "sprite"
  ],
  "dolls-80316": [
    "client-doll-13345.png",
    "sprite"
  ],
  "dolls-80317": [
    "client-doll-13345.png",
    "sprite"
  ],
  "dolls-80318": [
    "client-doll-13345.png",
    "sprite"
  ],
  "dolls-80319": [
    "client-doll-13345.png",
    "sprite"
  ],
  "dolls-80339": [
    "client-doll-12539.png",
    "sprite"
  ],
  "dolls-80340": [
    "client-doll-13577.png",
    "sprite"
  ],
  "dolls-80341": [
    "client-doll-13573.png",
    "sprite"
  ],
  "dolls-80342": [
    "client-doll-13524.png",
    "sprite"
  ],
  "dolls-80365": [
    "client-doll-14812.png",
    "sprite"
  ],
  "dolls-80366": [
    "client-doll-14812.png",
    "sprite"
  ],
  "dolls-80367": [
    "client-doll-14812.png",
    "sprite"
  ],
  "dolls-80368": [
    "client-doll-14809.png",
    "sprite"
  ],
  "dolls-80369": [
    "client-doll-14809.png",
    "sprite"
  ],
  "dolls-80370": [
    "client-doll-14809.png",
    "sprite"
  ],
  "dolls-80371": [
    "client-doll-14829.png",
    "sprite"
  ],
  "dolls-80372": [
    "client-doll-14829.png",
    "sprite"
  ],
  "dolls-80373": [
    "client-doll-14829.png",
    "sprite"
  ],
  "dolls-80374": [
    "client-doll-14805.png",
    "sprite"
  ],
  "dolls-80375": [
    "client-doll-14805.png",
    "sprite"
  ],
  "dolls-80376": [
    "client-doll-14805.png",
    "sprite"
  ],
  "dolls-80377": [
    "client-doll-14848.png",
    "sprite"
  ],
  "dolls-80382": [
    "client-doll-16064.png",
    "sprite"
  ],
  "dolls-300201": [
    "client-doll-5933.png",
    "sprite"
  ],
  "dolls-300202": [
    "client-doll-5933.png",
    "sprite"
  ],
  "dolls-300203": [
    "client-doll-5933.png",
    "sprite"
  ],
  "dolls-300204": [
    "client-doll-5933.png",
    "sprite"
  ],
  "dolls-300205": [
    "client-doll-5933.png",
    "sprite"
  ]
};

let transformBookCache = null;
function transformBookRows() {
  transformBookCache ??= TransformCards.book.map(card => ({name: card.n, grade: card.g, card}));
  return transformBookCache;
}

function catalogPortrait(type, row, preview = false) {
  if (type === 'enchant' || type === 'wuhun') {
    const src = type === 'enchant' ? TdjSystems.enchant.image(row.e) : TdjSystems.wuhun.image(row.w);
    if (!src) return uiElement('span', 'game-catalog-missing', '尚無外觀圖');
    const img = uiElement('img', 'game-catalog-portrait' + (preview ? ' game-catalog-preview' : ''));
    if (type === 'wuhun') img.classList.add('game-catalog-wuhun-phantom');
    img.src = src; img.alt = preview ? row.name : ''; img.loading = preview ? 'eager' : 'lazy'; img.decoding = 'async';
    img.onerror = () => img.replaceWith(uiElement('span', 'game-catalog-missing', '圖片未能載入'));
    return img;
  }
  if (type === 'transforms') {
    const img = uiElement('img', 'game-catalog-portrait' + (preview ? ' game-catalog-preview' : ''));
    img.src = TransformCards.portrait(row.card);
    img.alt = preview ? row.name + '外觀' : '';
    img.loading = preview ? 'eager' : 'lazy';
    img.decoding = 'async';
    img.onerror = () => img.replaceWith(uiElement('span', 'game-catalog-missing', '圖片未能載入'));
    return img;
  }
  const asset = type === "cards" ? catalogPortraits["transforms-" + row.portrait] : catalogPortraits[type + "-" + row.id] || (row.img ? [row.img, "sprite"] : null);
  const className = "game-catalog-portrait" + (preview ? " game-catalog-preview" : "");
  if (!asset && type !== "collection" && type !== "cards") {
    return uiElement("span", "game-catalog-missing", "尚無外觀圖");
  }
  if (!asset) {
    const fallback = referenceSkinIcon(gameCatalogIcons[type]);
    fallback.classList.add("game-catalog-preview");
    return fallback;
  }
  const img = uiElement("img", className);
  img.src = "assets/interface/catalog-portraits/" + asset[0];
  img.alt = preview ? row.name + (asset[1] === "item" ? "道具圖示" : "外觀") : "";
  img.title = asset[1] === "item" ? "原本道具圖示" : row.name;
  img.loading = preview ? "eager" : "lazy";
  img.decoding = "async";
  img.onerror = () => img.replaceWith(uiElement("span", "game-catalog-missing", "圖片未能載入"));
  return img;
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
  search.placeholder = '搜尋名稱或外觀編號';
  search.setAttribute('aria-label', search.placeholder);
  const cards = uiElement('div', type === 'collection' ? 'game-catalog-sets' : 'game-catalog-cards');
  results.append(search);
  results.append(cards);
  layout.append(sidebar, results, detail);
  gameDialogContent.replaceChildren(title, tabs, layout);

  if (type === 'collection') {
    renderEquipmentCollection(sidebar, results, cards, detail, search, gameCollections);
    return;
  }
  const entries = type === 'cards' ? lineageMTransformCards
    : type === 'transforms' ? transformBookRows() : tdjRows(type) || gameCatalogData[type];
  const all = () => true;
  const usedGrades = type === 'transforms' ? [...new Set(entries.map(row => row.grade))].sort((a, b) => a - b) : [];
  const filters = type === 'cards' ? [['全部', all], ...Object.entries(lineageMCardTiers).map(([tier, label]) => [label, row => row.tier === tier])]
    : type === 'transforms' ? [['全部', all], ['已收集', row => TransformCards.owned(row.name) > 0], ...usedGrades.map(grade => [lineageWGrades[grade][0], row => row.grade === grade])]
    : type === 'dolls' ? [['全部', all], ['已擁有', row => TdjSystems.dolls.owned(row.id) > 0]]
    : type === 'enchant' ? [['全部', all], ['已擁有', row => TdjSystems.enchant.stones(row.e.id) > 0]]
    : type === 'wuhun' ? [['全部', all], ['已擁有', row => TdjSystems.wuhun.owned(row.w.id) > 0], ...wuhunTiers.map(tier => [tier, row => row.w.tier === tier])]
    : [['全部', all]];
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
    const picture = catalogPortrait(type, row, true);
    detail.append(picture, uiElement('h3', '', row.name));
    if (type === 'cards') {
      detail.append(uiElement('strong', '', lineageMCardTiers[row.tier]));
      for (const effect of row.effects || []) detail.append(uiElement('p', '', effect));
      const source = uiElement('a', '', row.sourceLabel || '查看台服官方公告');
      source.href = row.source;
      source.target = '_blank';
      source.rel = 'noopener noreferrer';
      detail.append(uiElement('p', '', '天堂M 公開資料'), source);
    } else if (type === 'dolls') {
      detail.append(uiElement('p', '', '召喚時間 ' + Math.floor(row.time / 60) + ' 分鐘 · 外觀 ' + row.gfx));
      for (const [id, amount] of row.materials) {
        detail.append(uiElement('p', '', (id === 41246 ? '魔法結晶體' : '道具 #' + id) + ' × ' + amount));
      }
      detail.append(uiElement('h4', '', '娃娃能力'));
      for (const effect of row.effects) detail.append(uiElement('p', '', effect));
      if (!row.effects.length) detail.append(uiElement('p', '', '能力未設定'));
      if (row.note) detail.append(uiElement('small', '', row.note));
      const owned = TdjSystems.dolls.owned(row.id), active = String(TdjSystems.dolls.active) === String(row.id);
      detail.append(uiElement('p', '', owned ? '擁有 ' + owned + ' 隻' + (active ? ' · 召喚中' : '') : '尚未擁有'));
      const action = active ? catalogButton('解除召喚', () => { TdjSystems.dolls.dismiss(); refreshCards(); }, 'game-catalog-action')
        : catalogButton(owned ? '召喚' : '擁有才能召喚', () => { if (TdjSystems.dolls.summon(row.id)) refreshCards(); }, 'game-catalog-action');
      action.disabled = !owned;
      detail.append(action);
    } else if (type === 'enchant') {
      const e = row.e, stones = TdjSystems.enchant.stones(e.id), cur = TdjSystems.enchant.current();
      const mine = cur && cur.data.id === e.id ? cur.lv : 0;
      detail.append(uiElement('strong', '', e.boss + '的靈魂 · 技能「' + e.skill + '」'),
        uiElement('p', '', '擁有附魔石 ' + stones + ' 個'),
        uiElement('p', '', cur ? '目前武器：' + cur.weapon.item.name + ' · ' + cur.level.name : '目前武器沒有 BOSS 附魔'),
        uiElement('h4', '', '各階設定'));
      e.levels.forEach((lv, i) => detail.append(uiElement('p', '', (i + 1 === mine ? '▶ ' : '') + lv.name + '：附魔成功 ' + lv.rate + '% · 攻擊發動 ' + lv.proc + '%' + (lv.dmg || lv.rnd ? ' · 傷害 ' + lv.dmg + '～' + (lv.dmg + lv.rnd) : '') + (lv.drain ? ' · 吸血 ' + lv.drain : ''))));
      detail.append(uiElement('small', '', '附魔在目前裝備的武器上；同一種石頭可往上升階，換不同石頭會從 LV1 重來；失敗會消耗石頭。'));
      const action = catalogButton(mine >= e.levels.length ? '已達最高階' : stones ? '附魔到武器（LV' + (mine + 1) + '）' : '沒有附魔石', () => { TdjSystems.enchant.enchant(e.id); updateCounts(); refreshCards(); }, 'game-catalog-action');
      action.disabled = !stones || mine >= e.levels.length;
      detail.append(action);
    } else if (type === 'wuhun') {
      const w = row.w, owned = TdjSystems.wuhun.owned(w.id), active = String(TdjSystems.wuhun.active) === String(w.id);
      detail.append(uiElement('strong', '', w.tier + (w.desc ? ' · ' + w.desc : '')), uiElement('p', '', owned ? '擁有' + (active ? ' · 裝備中' : '') : '尚未擁有'), uiElement('h4', '', '武魂能力'));
      for (const effect of w.fx) detail.append(uiElement('p', '', effect));
      detail.append(uiElement('small', '', '武魂外觀 ' + w.skin + ' · 原怪物 ' + (TdjSystems.wuhun.baseGfx(w) ?? '未查到') + (TdjSystems.wuhun.image(w) ? ' · 半透明原怪物圖' : ' · 尚缺原圖，使用光暈')));
      const action = active ? catalogButton('卸下武魂', () => { TdjSystems.wuhun.unequip(); refreshCards(); }, 'game-catalog-action')
        : catalogButton(owned ? '裝備武魂' : '擁有才能裝備', () => { if (TdjSystems.wuhun.equip(w.id)) refreshCards(); }, 'game-catalog-action');
      action.disabled = !owned;
      detail.append(action);
    } else {
      const card = row.card, owned = TransformCards.owned(row.name), active = TransformCards.active === row.name;
      const rule = TransformCards.rules(card);
      detail.append(uiElement('strong', '', lineageWGrades[row.grade][0] + (rule ? ' · 等級 ' + rule.level + ' 以上' : ' · 建議等級 ' + card.lv)),
        uiElement('p', '', owned ? '已收集 ' + owned + ' 張' + (active ? ' · 變身中' : '') : '尚未收集'),
        uiElement('h4', '', '變身能力'));
      for (const effect of card.fx) detail.append(uiElement('p', '', effect));
      detail.append(uiElement('small', '', card.src === '天堂W' ? '能力：天堂W 官方圖鑑（' + card.w + '）' : '能力：參考天堂W 同階平均'));
      detail.append(uiElement('small', '', card.wk ? '動作：8 方向走路' + (card.wa ? '、待機、攻擊' : '') : card.f.walk ? '動作：單方向走路（往左時翻面）' : '動作：沒有走路圖，只有單方向待機（走路時原地擺動）'));
      if (rule) {
        if (rule.bonus) {
          detail.append(uiElement('h4', '', '伺服器變身能力（' + rule.bonus.note + '）'));
          for (const effect of rule.bonus.fx) detail.append(uiElement('p', '', effect));
        }
        detail.append(uiElement('h4', '', '變身限制'),
          uiElement('p', '', rule.magic ? '可施放魔法' : '無法施放魔法'),
          uiElement('p', '', '武器：' + rule.weapons),
          uiElement('p', '', '防具：' + rule.armors));
        if (rule.rebirth) detail.append(uiElement('p', '', '需轉生 ' + rule.rebirth + ' 次'));
        detail.append(uiElement('small', '', '天地劫天堂變身表：' + rule.en));
      } else detail.append(uiElement('small', '', '天地劫天堂變身表沒有這個變身，不限等級與裝備'));
      const action = active ? catalogButton('解除變身', () => { TransformCards.deactivate(); refreshCards(); }, 'game-catalog-action')
        : catalogButton(owned ? '變身' : '收集到才能變身', () => { if (TransformCards.activate(row.name)) refreshCards(); }, 'game-catalog-action');
      action.disabled = !owned;
      detail.append(action);
    }
  }

  if (type === 'transforms') {
    const status = uiElement('span', 'game-catalog-status', '');
    const drawButton = times => catalogButton('抽 ' + times + ' 張', () => {
      const got = TransformCards.draw(times);
      if (!got.length) return;
      toast('獲得：' + got.map(card => card.n + '（' + lineageWGrades[card.g][0] + '）').join('、'));
      updateCounts();
      refreshCards();
    });
    const toolbar = uiElement('div', 'game-catalog-toolbar');
    toolbar.append(drawButton(1), drawButton(10), status);
    results.prepend(toolbar);
    status.update = () => { status.textContent = '已收集 ' + TransformCards.collected + ' / ' + entries.length + (TransformCards.active ? ' · 變身中：' + TransformCards.active : ''); };
    var transformStatus = status;
  }
  if (type === 'dolls' || type === 'enchant' || type === 'wuhun') {
    const status = uiElement('span', 'game-catalog-status', '');
    const toolbar = uiElement('div', 'game-catalog-toolbar');
    const add = (label, fn) => toolbar.append(catalogButton(label, () => { const got = fn(); if (!got.filter(Boolean).length) return; toast('獲得：' + got.filter(Boolean).map(x => x.stone || x.name).join('、')); updateCounts(); refreshCards(); }));
    const times = (n, fn) => () => Array.from({length: n}, fn);
    if (type === 'dolls') { add('抽 1 隻', times(1, () => TdjSystems.dolls.draw())); add('抽 10 隻', times(10, () => TdjSystems.dolls.draw())); }
    if (type === 'enchant') { add('取得附魔石', times(1, () => TdjSystems.enchant.get())); add('取得 5 個', times(5, () => TdjSystems.enchant.get())); }
    if (type === 'wuhun') { add('取得武魂', times(1, () => TdjSystems.wuhun.get())); add('取得 5 個', times(5, () => TdjSystems.wuhun.get())); }
    toolbar.append(status);
    results.prepend(toolbar);
    status.update = () => {
      if (type === 'dolls') { const d = entries.find(x => String(x.id) === String(TdjSystems.dolls.active)); status.textContent = '測試用（免費）· ' + (d ? '召喚中：' + d.name : '未召喚'); }
      if (type === 'enchant') { const c = TdjSystems.enchant.current(); status.textContent = '測試用（免費）· ' + (c ? c.weapon.item.name + '：' + c.level.name : '武器未附魔'); }
      if (type === 'wuhun') { const w = entries.find(x => String(x.w.id) === String(TdjSystems.wuhun.active)); status.textContent = '測試用（免費）· ' + (w ? '裝備中：' + w.name : '未裝備'); }
    };
    var tdjStatus = status;
  }
  function updateCounts() {
    for (const item of sidebar.children) item.textContent = item.filterLabel + ' (' + entries.filter(item.filterPredicate).length + ')';
  }

  function refreshCards() {
    const query = search.value.trim().toLowerCase();
    const visible = entries.filter(row => activeFilter(row) &&
      [row.name, row.gfx, ...(row.required || [])].join(' ').toLowerCase().includes(query));
    cards.replaceChildren();
    for (const row of visible) {
      const card = catalogButton('', () => showDetails(row), 'game-catalog-card');
      card.catalogEntry = row;
      if (type === 'cards') {
        card.setAttribute('data-tier', row.tier);
        card.append(uiElement('small', '', lineageMCardTiers[row.tier]));
      } else if (type === 'transforms') {
        const owned = TransformCards.owned(row.name);
        card.setAttribute('data-tier', lineageWGrades[row.grade][1]);
        if (!owned) card.classList.add('game-catalog-locked');
        card.append(uiElement('small', '', lineageWGrades[row.grade][0] + (owned ? ' ×' + owned : ' · 未收集')));
      } else if (type === 'dolls' || type === 'enchant' || type === 'wuhun') {
        const owned = type === 'dolls' ? TdjSystems.dolls.owned(row.id) : type === 'enchant' ? TdjSystems.enchant.stones(row.e.id) : TdjSystems.wuhun.owned(row.w.id);
        if (type === 'wuhun') card.setAttribute('data-tier', tdjWuhunTierTag[row.w.tier] || 'white');
        if (!owned) card.classList.add('game-catalog-locked');
        card.append(uiElement('small', '', (type === 'wuhun' ? row.w.tier + ' · ' : '') + (owned ? '×' + owned : '未擁有')));
      }
      card.append(catalogPortrait(type, row));
      card.append(uiElement('span', '', row.name));
      if (row.effect) card.append(uiElement('small', '', row.effect));
      cards.append(card);
    }
    showDetails(visible.includes(selected) ? selected : visible[0]);
    if (type === 'transforms') transformStatus.update();
    if (tdjStatus) tdjStatus.update();
  }

  for (const [label, predicate] of filters) {
    const button = catalogButton(label + ' (' + entries.filter(predicate).length + ')', () => {
      activeFilter = predicate;
      for (const item of sidebar.children) item.setAttribute('aria-pressed', String(item === button));
      refreshCards();
    });
    button.setAttribute('aria-pressed', String(predicate === all));
    button.filterLabel = label;
    button.filterPredicate = predicate;
    sidebar.append(button);
  }
  search.oninput = refreshCards;
  refreshCards();
  gameDialogClose.focus();
}
