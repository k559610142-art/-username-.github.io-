// Connect the imported cards to the same bonus table used by combat.
(() => {
  const table = dbActiveSettings.system_poly_orginal;
  const effects = {
    addStr: '力量', addDex: '敏捷', addCon: '體質',
    addInt: '智力', addWis: '精神', addCha: '魅力',
    addMaxHP: '最大HP', addMaxMP: '最大MP',
    addDmg: '近距離傷害', addHit: '近距離命中'
  };
  const columns = table.columns.map(column => column.name);
  const gfxColumn = columns.indexOf('gfxId');
  const template = Object.fromEntries(Object.keys(effects).map(key => [
    key, table.rows.find(row => row[gfxColumn] === 12229)[columns.indexOf(key)]
  ]));
  for (const card of extraTransformCards) {
    const gfx = card.p.gfx;
    if (![8486, 21170, 21175].includes(gfx)) continue;
    let row = table.rows.find(row => row[gfxColumn] === gfx);
    if (!row && gfx !== 8486) {
      const bonus = {gfxId: gfx, note: card.n, ...template};
      row = columns.map(key => bonus[key] ?? 0);
      table.rows.push(row);
    }
    if (!row) continue;
    const bonus = Object.fromEntries(columns.map((key, index) => [key, row[index]]));
    card.fx = Object.entries(effects)
      .filter(([key]) => bonus[key])
      .map(([key, label]) => label + ' +' + bonus[key]);
    card.bonusSource = gfx === 8486 ? '本機原始變身加成表' : '參考死亡騎士加成';
    card.attributeBonuses = {
      str: bonus.addStr, dex: bonus.addDex, con: bonus.addCon,
      int: bonus.addInt, wis: bonus.addWis, cha: bonus.addCha
    };
  }
})();
