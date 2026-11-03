// 世界圖片分塊與可進入的場景分開管理。圖片資產完成後才填入 image。
Game.world = (() => {
  const columns = 20, rows = 12;
  const regions = [
    { id: 'plains', name: '青嵐平原', terrain: 'plains' },
    { id: 'forest', name: '翡翠林海', terrain: 'forest' },
    { id: 'snow', name: '北境雪原', terrain: 'snow' },
    { id: 'desert', name: '赤沙荒漠', terrain: 'desert' },
    { id: 'volcano', name: '燼火山脈', terrain: 'volcano' },
    { id: 'ocean', name: '滄溟群島', terrain: 'ocean' }
  ];
  const tiles = Array.from({ length: columns * rows }, (_, i) => {
    const x = i % columns, y = Math.floor(i / columns);
    const region = regions[Math.floor(y / 6) * 3 + Math.min(2, Math.floor(x / 7))];
    return { id: `world-${x}-${y}`, x, y, regionId: region.id, image: null };
  });
  const scenes = [];
  function add(id, name, kind, regionIndex, x, y, extra = {}) {
    scenes.push({ id, name, kind, regionId: regions[regionIndex].id, tileId: `world-${x}-${y}`, status: 'planned', asset: null, ...extra });
  }
  const settlements = ['青石鎮', '翠林村', '霜雪村', '流沙鎮', '熔岩村', '望海村'];
  const anchors = [[3,3],[10,3],[17,3],[3,9],[10,9],[17,9]];
  settlements.forEach((name, i) => add(`village-${i+1}`, name, 'village', i, ...anchors[i]));
  add('castle-1', '青嵐王城', 'castle', 0, 5, 1);
  add('castle-2', '霜冠城堡', 'castle', 2, 18, 1);
  add('castle-3', '赤焰要塞', 'castle', 4, 12, 7);
  const fields = [
    ['青草原野','古道丘陵','迷霧濕地','風語湖畔'],
    ['古木密林','螢光沼澤','精靈溪谷','幽暗森林'],
    ['寒風雪原','冰封湖泊','雪嶺山道','極光冰川'],
    ['黃金沙丘','乾涸峽谷','荒漠綠洲','失落遺跡'],
    ['熔岩荒地','黑曜石谷','火山隘口','灰燼高原'],
    ['珊瑚海岸','潮汐沙灘','風暴群島','沉船海灣']
  ];
  fields.forEach((names, i) => names.forEach((name, n) => {
    const [x,y] = anchors[i]; add(`field-${i+1}-${n+1}`, name, 'field', i, x-2+n, y-1);
  }));
  ['廢棄礦坑','古樹地窟','冰封墓穴','沙漠神殿','熔火洞窟','海盜密窟'].forEach((name, i) => {
    const [x,y] = anchors[i];
    for (let floor=1; floor<=5; floor++) add(`dungeon-${i+1}-${floor}`, `${name} B${floor}`, 'dungeon', i, x-1, y+1, { floor, groupId: `dungeon-${i+1}` });
  });
  ['淺海珊瑚林','海底裂谷','沉沒古城','深海神殿','無光海溝','海龍巢穴'].forEach((name,i) => add(`undersea-${i+1}`, name, 'undersea', 5, 15+i%3, 10+Math.floor(i/3)));
  for (let floor=1; floor<=100; floor++) add(`chaos-${floor}`, `混沌之塔 ${floor} 層`, 'tower', 4, 11, 10, { floor, groupId: 'chaos-tower', bossFloor: floor%10===0 });
  // 明確的傳送連接；不能從地圖圖片位置推定碰撞或可行走道路。
  const links = [];
  const connect = (from,to,type) => links.push({ from,to,type,bidirectional:true });
  for (let i=0;i<6;i++) {
    for (let n=1;n<=4;n++) connect(`village-${i+1}`, `field-${i+1}-${n}`, 'road');
    connect(`field-${i+1}-4`, `dungeon-${i+1}-1`, 'entrance');
    for(let floor=1;floor<5;floor++) connect(`dungeon-${i+1}-${floor}`, `dungeon-${i+1}-${floor+1}`, 'stairs');
    if(i<5) connect(`village-${i+1}`, `village-${i+2}`, 'road');
  }
  connect('castle-1','village-1','road'); connect('castle-2','village-3','road'); connect('castle-3','village-5','road');
  connect('village-6','undersea-1','diving');
  for(let i=1;i<6;i++) connect(`undersea-${i}`,`undersea-${i+1}`,'diving');
  connect('field-5-4','chaos-1','entrance');
  for(let floor=1;floor<100;floor++) connect(`chaos-${floor}`,`chaos-${floor+1}`,'stairs');
  return { version: 1, columns, rows, tilePixels: 1024, regions, tiles, scenes, links };
})();
