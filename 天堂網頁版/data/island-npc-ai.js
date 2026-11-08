// Talking Island monster behaviour, driven by the server's Map 0 tables.
const IslandNpcAi = (() => {
  const distance = (x, y, tx, ty) => Math.max(Math.abs(x - tx), Math.abs(y - ty));
  const safe = (x, y) => (tile(x, y) & 48) === 16;
  const canFight = mob => !mob.spawn.resident && mob.spawn.npc.attack > 0;
  let owner, slowedUntil = 0, cursedUntil = 0, immuneUntil = 0;

  function reset(mob) {
    mob.aiOwner = owner;
    mob.alert = false;
    mob.windup = null;
    mob.ready = 0;
    mob.action = null;
    mob.skillUse = new Map();
    mob.mp = mob.spawn.npc.mp;
  }

  function playerActive() {
    const id = window.gameFlowState === 'playing' ? window.activeCharacterId : null;
    if (id !== owner) {
      owner = id;
      slowedUntil = cursedUntil = immuneUntil = 0;
    }
    return id && !CharacterActions.dead;
  }

  function provoke(mob, nearby) {
    if (!playerActive() || !canFight(mob) || safe(worldX, worldY) || safe(mob.x, mob.y)) return;
    if (mob.aiOwner !== owner) reset(mob);
    mob.alert = true;
    const npc = mob.spawn.npc;
    for (const ally of nearby) {
      if (ally === mob || !ally.hp || !canFight(ally)) continue;
      if (mob.pack && ally.pack === mob.pack ||
          npc.family && ally.spawn.npc.family === npc.family && ally.spawn.npc.familyAggro &&
          distance(mob.x, mob.y, ally.x, ally.y) <= 6) {
        if (ally.aiOwner !== owner) reset(ally);
        ally.alert = true;
      }
    }
  }

  function range(skill, basicRange) {
    return skill.range || (skill.spell?.range > 0 ? skill.spell.range : basicRange);
  }

  function pickSkill(mob, gap, now, basicRange) {
    return mob.spawn.npc.skills.find(skill => {
      if (skill.type !== 1 && (skill.type !== 2 || !skill.spell)) return false;
      if (gap > range(skill, basicRange) || skill.triggerRange > 0 && gap > skill.triggerRange ||
          skill.triggerRange < 0 && gap > -skill.triggerRange ||
          skill.hp && mob.hp * 100 > mob.spawn.npc.hp * skill.hp ||
          (skill.spell?.mp || 0) > mob.mp) return false;
      const use = mob.skillUse.get(skill.order);
      if (use && (now < use.ready || skill.limit > 0 && use.count >= skill.limit)) return false;
      return !skill.chance || Math.random() * 100 < skill.chance;
    });
  }

  function strike(mob, skill, now) {
    const npc = mob.spawn.npc;
    if (skill) {
      IslandMonsters.playEffect(skill.gfx || skill.spell?.gfx, worldX, worldY, now, {heading:mob.heading});
      IslandMonsters.playEffect(skill.spell?.gfx2, worldX, worldY, now);
    }
    if (skill?.id === 33 || skill?.id === 29) {
      const until = now + skill.spell.duration * 1000;
      if (skill.id === 33) cursedUntil = Math.max(cursedUntil, until);
      else slowedUntil = Math.max(slowedUntil, until);
      return;
    }
    const result=NativeCombatRules.resolve(mob,skill);if(!result.hit||result.damage<=0)return;
    CharacterActions.damage(result.damage, {
      animate: !movementAnimating() && !navigationPath.length && !characterMovementBlocked()
    });
  }

  function update(mob, now, mobs, steps, stepToward) {
    if (mob.aiOwner !== owner) {
      reset(mob);
    }
    if (!canFight(mob) || !playerActive() || now < immuneUntil || safe(worldX, worldY) || safe(mob.x, mob.y)) {
      mob.alert = false;
      mob.windup = null;
      return false;
    }
    const gap = distance(mob.x, mob.y, worldX, worldY);
    const leash = mob.spawn.movement || 12;
    if (gap > 18 || distance(mob.homeX, mob.homeY, worldX, worldY) > leash + 2) {
      mob.alert = false;
      mob.windup = null;
      return false;
    }
    const clear = gap <= 14 && IslandCombat.clearShot(mob.x, mob.y, worldX, worldY);
    if (!mob.alert && mob.spawn.npc.aggressive && gap <= 14 && clear) provoke(mob, mobs);
    if (!mob.alert) return false;
    if (mob.step) return true;
    const npc = mob.spawn.npc, basicRange = Math.max(1, npc.ranged);
    if (mob.windup) {
      const hit = mob.windup;
      if (now >= hit.at) {
        mob.windup = null;
        if (clear && gap <= hit.range) strike(mob, hit.skill, now);
      }
      return true;
    }
    if (now < mob.ready) return true;
    const skill = clear ? pickSkill(mob, gap, now, basicRange) : null;
    if (clear && (skill || gap <= basicRange)) {
      const dx = Math.sign(worldX - mob.x), dy = Math.sign(worldY - mob.y);
      const heading = steps.findIndex(([x, y]) => x === dx && y === dy);
      if (heading >= 0) mob.heading = heading;
      const duration = skill?.type === 2 ? npc.cast || npc.attack : npc.attack;
      if (skill) {
        const use = mob.skillUse.get(skill.order);
        mob.skillUse.set(skill.order, {count: (use?.count || 0) + 1, ready: now + Math.max(skill.reuse, skill.spell?.reuse || 0)});
        mob.mp -= skill.spell?.mp || 0;
      }
      mob.action = {clip: skill?.type === 2 ? 'cast' : skill?.action === 30 ? 'special' : 'attack', start: now, end: now + duration};
      CombatSound.monsterAttack(mob,skill,duration);
      mob.windup = {skill, range: skill ? range(skill, basicRange) : basicRange, at: now + duration * .45};
      mob.ready = now + duration;
    } else {
      stepToward(mob, worldX, worldY, now);
    }
    return true;
  }

  const revive = document.createElement('button');
  revive.type = 'button';
  revive.textContent = '回村復活';
  revive.hidden = true;
  revive.style.cssText = 'position:absolute;z-index:18;left:50%;top:63%;transform:translateX(-50%);background:#231d12;color:#ffedbf;border:1px solid #b8924f;border-radius:6px;padding:12px 24px';
  revive.onclick = () => {
    if (!CharacterActions.dead || !CharacterActions.revive()) return;
    worldX = island.spawn.x;
    worldY = island.spawn.y;
    resetMovementState();
    slowedUntil = cursedUntil = 0;
    immuneUntil = movementTime() + 3000;
    recenter();
    window.GameEntry?.saveActive();
    revive.hidden = true;
  };
  game.append(revive);
  return {reset, playerActive, provoke, update, canFight,
    updateRevive(){revive.hidden = window.gameFlowState !== 'playing' || !CharacterActions.dead;},
    get cursed(){return window.activeCharacterId === owner && movementTime() < cursedUntil;},
    get slowed(){return window.activeCharacterId === owner && movementTime() < slowedUntil;}
  };
})();
