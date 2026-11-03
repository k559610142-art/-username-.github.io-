Game.explore = function () {
  if (this.state.enemy) return;
  if (Math.random() < 0.7) { this.state.enemy = { name: '山道盜匪', hp: 40 }; this.message('山道盜匪攔住去路，準備迎戰！'); }
  else { this.state.player.gold += 5; this.message('替商旅指路，獲贈 5 銀兩。'); }
};
Game.rest = function () {
  if (this.state.enemy) return;
  const p = this.state.player; p.hp = Math.min(p.maxHp, p.hp + 30); p.mp = Math.min(30, p.mp + 12);
  this.message('靜坐調息，恢復 30 氣血、12 內力（不超過上限）。');
};
