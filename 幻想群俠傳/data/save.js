Game.save = function () {
  try { localStorage.setItem(this.config.saveKey, JSON.stringify(this.state.player)); this.message('進度已儲存。'); }
  catch { this.message('儲存失敗，請確認瀏覽器允許本機儲存。'); }
};
Game.load = function () {
  try {
    const raw = localStorage.getItem(this.config.saveKey);
    if (!raw) return this.message('尚無存檔。');
    const p = JSON.parse(raw), keys = Object.keys(this.createPlayer());
    if (!p || !keys.every(k => Number.isSafeInteger(p[k]) && p[k] >= 0) || p.level < 1 || p.maxHp < 1 || p.hp > p.maxHp || p.mp > 30 || p.exp >= p.level * 40) throw Error('Invalid save');
    this.state.player = Object.fromEntries(keys.map(k => [k, p[k]])); this.state.enemy = null;
    this.message('已讀取存檔，回到青石鎮外。');
  } catch { this.message('存檔無法讀取，目前進度保持不變。'); }
};
