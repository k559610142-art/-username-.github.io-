Game.createPlayer = () => ({ level: 1, hp: 100, maxHp: 100, mp: 30, exp: 0, gold: 0 });
Game.gainExp = function (amount) {
  const p = this.state.player;
  p.exp += amount;
  while (p.exp >= p.level * 40) {
    p.exp -= p.level * 40; p.level++; p.maxHp += 15; p.hp = p.maxHp; p.mp = 30;
    this.message(`升至 ${p.level} 級！氣血與內力恢復。`);
  }
};
