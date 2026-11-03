Game.villageMap = {
  id: 'village-1', name: '青石鎮', width: 40, height: 28, tileSize: 32,
  spawn: { x: 20, y: 18 },
  buildings: [
    { x: 4, y: 3, w: 11, h: 6, name: '雲來客棧', color: '#9b5944' },
    { x: 21, y: 4, w: 9, h: 5, name: '百草藥鋪', color: '#567b6b' },
    { x: 4, y: 13, w: 11, h: 6, name: '青石鐵鋪', color: '#626976' },
    { x: 22, y: 13, w: 9, h: 6, name: '村長居所', color: '#a27c48' },
    { x: 16, y: 1, w: 6, h: 4, name: '民居', color: '#896148' }
  ],
  npcs: [
    { x: 26, y: 20, name: '村長', color: '#dcba66', text: '歡迎來到青石鎮。沿南方道路穿過村口，就能前往青嵐平原。' },
    { x: 25, y: 10, name: '藥師', color: '#91c7aa', text: '行走江湖，記得調息。村裡可以安心休息，恢復氣血與內力。' },
    { x: 10, y: 20, name: '鐵匠', color: '#d39b7a', text: '好劍也需要好身手。鐵鋪正在準備開張，先去廣場練練腳步吧。' },
    { x: 21, y: 21, name: '守衛', color: '#91aec9', text: '南方是青嵐平原，沿中央道路穿過村口就能抵達。返回時也走這條路。' }
  ],
  isWater(x, y) { return x >= 32 && x <= 37 && !(y >= 11 && y <= 12); },
  isRoad(x, y) { return (x >= 18 && x <= 21 && y >= 7) || (y >= 12 && y <= 14 && x >= 4) || (x >= 10 && x <= 11 && y >= 10 && y <= 22) || (x >= 27 && x <= 28 && y >= 10 && y <= 22) || (y >= 21 && y <= 22 && x >= 10 && x <= 28); },
  isBlocked(x, y) {
    const inWalkZone = (x >= 18 && x <= 21 && y >= 5 && y <= 26) ||
      (y >= 10 && y <= 12 && x >= 4 && x <= 38) ||
      (y >= 9 && y <= 10 && x >= 6 && x <= 30) ||
      (y >= 19 && y <= 21 && x >= 6 && x <= 30) ||
      (x >= 14 && x <= 17 && y >= 5 && y <= 21) ||
      (x >= 21 && x <= 23 && y >= 6 && y <= 21);
    return !inWalkZone || x < 2 || y < 2 || x >= this.width - 1 || y >= this.height - 1 || this.isWater(x,y) ||
      this.buildings.some(b => x >= b.x && x < b.x+b.w && y >= b.y && y < b.y+b.h) ||
      (x >= 15 && x <= 17 && y >= 9 && y <= 11) || this.npcs.some(n => n.x === x && n.y === y);
  }
};
