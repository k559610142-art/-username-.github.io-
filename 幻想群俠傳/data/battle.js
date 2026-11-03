Game.attack = function (skill = false) {
  const { player: p, enemy: e } = this.state;
  if (!e) return;
  if (skill && p.mp < 8) return this.message('內力不足，需要 8 點。');
  if (skill) p.mp -= 8;
  const damage = (10 + p.level * 3) * (skill ? 2 : 1);
  e.hp = Math.max(0, e.hp - damage);
  this.message(`你${skill ? '施展劍訣' : '揮劍'}，造成 ${damage} 點傷害。`);
  if (!e.hp) {
    this.state.enemy = null; p.gold += 12; this.message('擊退盜匪！獲得 12 銀兩、16 經驗。'); this.gainExp(16); return;
  }
  p.hp = Math.max(0, p.hp - 9); this.message('盜匪反擊，造成 9 點傷害。');
  if (!p.hp) {
    this.state.enemy = null; p.gold = Math.floor(p.gold * 0.8); p.hp = p.maxHp; p.mp = 30;
    this.message('你負傷回鎮休養，氣血恢復，損失兩成銀兩。');
  }
};
Game.escape = function () { if (this.state.enemy) { this.state.enemy = null; this.message('你收劍撤離，安全回到鎮外。'); } };
