// Recovery timing and natural amounts follow the server HprExecutor/MprExecutor.
const PlayerClassStats = (() => {
  let owner = null, hpCount = 0, mpCount = 0;
  function read() {
    const base = window.playerAttributes || {};
    const attributes = {...base};
    const level = Number(window.activeCharacterLevel) || 1;
    let gearHp = 0, gearMp = 0, weapon = null;
    const items = window.OwnedInventory?.items || [];
    const equipmentSets = EquipmentSets.read(items);
    for (const entry of items) {
      if (!entry.slot) continue;
      const item = entry.item;
      if (entry.slot === 'weapon') weapon = item;
      for (const key of Object.keys(attributes)) attributes[key] += item.bonuses?.[key] || 0;
      const [hpr, mpr] = item.nativeDb?[item.sourceRules?.add_hpr||0,item.sourceRules?.add_mpr||0]:playerGearRecovery[item.kind + ':' + item.id] || [0, 0];
      gearHp += hpr;
      gearMp += mpr;
    }
    for(const key of Object.keys(attributes))attributes[key]+=equipmentSets[key]||0;
    gearHp += equipmentSets.hpr;
    gearMp += equipmentSets.mpr;
    const con = attributes.con || 0, wis = attributes.wis || 0;
    const highStat = score => score >= 45 ? 5 : score >= 25 ? Math.trunc((score - 15) / 10) : 0;
    const hpDie = Math.max(1, (level < 12 ? 0 : con <= 17 ? 5 : 6 + Math.trunc((con - 12) / 2)) + highStat(base.con));
    const naturalMp = wis <= 9 ? 1 : 1 + Math.trunc((wis - 5) / 5);
    const mpAmount = naturalMp + highStat(base.wis) + gearMp + (window.NativePotions?.recoveryBonus(wis,base.wis)||0);
    const hpMin = 1 + gearHp, hpMax = hpDie + gearHp;
    return {attributes, level, weapon, sp:items.filter(e=>e.slot).reduce((n,e)=>n+(e.item.sourceRules?.add_sp||0),0)+(equipmentSets.sp||0)+(window.NativePotions?.spBonus||0), hpDie, gearHp, mpAmount, equipmentSets,
      meleeBonus: (job === '騎士' ? Math.trunc(level / 10) : 0)+(window.DBGameRules?.damageBonus(false)||0),
      rangedBonus: (job === '妖精' ? Math.trunc(level / 10) : 0)+(window.DBGameRules?.damageBonus(true)||0),
      hpRecoveryText: (hpMin === hpMax ? hpMin : hpMin + '～' + hpMax) + ' HP／次',
      mpRecoveryText: mpAmount + ' MP／次'};
  }
  function tick() {
    const active = window.gameFlowState === 'playing' ? window.activeCharacterId : null;
    if (active !== owner) { owner = active; hpCount = mpCount = 0; }
    if (!active || hp <= 0 || document.hidden) return;
    const action = typeof characterLastAction === 'string' ? characterLastAction : 'idle';
    const points = action === 'attack' ? 1 : action === 'walk' ? 2 : 4;
    hpCount += points;
    mpCount += points;
    const healHp = hpCount >= 12, healMp = mpCount >= 64;
    if (!healHp && !healMp) return;
    if (healHp) hpCount = 0;
    if (healMp) mpCount = 0;
    if ((!healHp || hp >= maxHp) && (!healMp || mp >= maxMp)) return;
    const profile = read();
    const nextHp = healHp ? Math.min(maxHp, Math.max(1, hp + 1 + Math.floor(Math.random() * profile.hpDie) + profile.gearHp)) : hp;
    const nextMp = healMp ? Math.min(maxMp, Math.max(0, mp + profile.mpAmount)) : mp;
    if (nextHp === hp && nextMp === mp) return;
    hp = nextHp; mp = nextMp;
    stats();
    window.GameEntry?.saveActive();
  }
  setInterval(tick, 1000);
  return {read};
})();
