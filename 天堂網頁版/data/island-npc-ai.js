// Talking Island monster behaviour, driven by the server's Map 0 tables.
const IslandNpcAi = (() => {
  const distance = (x, y, tx, ty) => Math.max(Math.abs(x - tx), Math.abs(y - ty));
  const safe = (x, y) => (tile(x, y) & 48) === 16;
  // 強制攻擊：被打的常駐警衛／守護者（有血量）會生氣反擊，安全區也一樣；玩家離開範圍或死亡後消氣、走回原位（island-monsters.js advance）。
  const retaliates = mob => mob.spawn.resident && mob.spawn.npc.hp > 0 && (mob.spawn.npc.kind === 'L1Guard' || mob.spawn.npc.kind === 'L1Guardian');
  const canFight = mob => !mob.spawn.resident && mob.spawn.npc.attack > 0 || !!mob.angry && retaliates(mob);
  const calm = mob => { mob.alert = false; mob.windup = null; mob.angry = false; mob.botEnemy = null; };
  const swing = npc => npc.attack || 1000; // 部分警衛 DB 沒有攻擊動作時間
  let owner, slowedUntil = 0, cursedUntil = 0, immuneUntil = 0;

  function reset(mob) {
    mob.aiOwner = owner;
    mob.alert = false;
    mob.angry = false;
    mob.windup = null;
    mob.botEnemy = null;
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
    if (mob.aiOwner !== owner) reset(mob);
    if (playerActive() && retaliates(mob)) mob.angry = true;
    if (!playerActive() || !canFight(mob) || !mob.angry && (safe(worldX, worldY) || safe(mob.x, mob.y))) return;
    if(mob.botEnemy){mob.botEnemy=null;mob.windup=null;}
    mob.alert = true;
    const npc = mob.spawn.npc;
    for (const ally of nearby) {
      // 附近 6 格內同種類的警衛／守護者一起反擊
      if (mob.angry && ally !== mob && ally.hp && retaliates(ally) && ally.spawn.npc.kind === npc.kind && distance(mob.x, mob.y, ally.x, ally.y) <= 6) {
        if (ally.aiOwner !== owner) reset(ally);
        ally.angry = ally.alert = true;
        continue;
      }
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
      window.NativePotions?.sync();
      return;
    }
    const result=NativeCombatRules.resolve(mob,skill);if(!result.hit||result.damage<=0)return;
    const dealt=window.ClassBuffs?ClassBuffs.onHurt(mob,result.damage,skill):result.damage;if(dealt<=0)return;
    CharacterActions.damage(dealt, {
      animate: !movementAnimating() && !navigationPath.length && !characterMovementBlocked()
    });
  }

  function provokeBot(mob, attacker){
    playerActive();if(mob.aiOwner!==owner)reset(mob);
    if(!mob.hp||!canFight(mob)||!attacker?.hp||!attacker.spawn.bot||attacker.fp?.hidden||safe(mob.x,mob.y)||safe(attacker.x,attacker.y)||(mob.spawn.mapId||0)!==(attacker.spawn.mapId||0))return false;
    if(mob.botEnemy!==attacker)mob.windup=null;
    mob.botEnemy=attacker;mob.alert=true;return true;
  }
  function fightBot(mob,now,steps,stepToward){
    const target=mob.botEnemy;
    if(!target?.hp||target.fp?.hidden||!canFight(mob)||(mob.spawn.mapId||0)!==(target.spawn.mapId||0)||safe(mob.x,mob.y)||safe(target.x,target.y)||distance(mob.x,mob.y,target.x,target.y)>18||distance(mob.homeX,mob.homeY,target.x,target.y)>(mob.spawn.movement||12)+2){calm(mob);return false;}
    if(mob.step)return true;
    const gap=distance(mob.x,mob.y,target.x,target.y),reach=Math.max(1,mob.spawn.npc.ranged||1),clear=IslandCombat.clearShot(mob.x,mob.y,target.x,target.y);
    if(mob.windup){const hit=mob.windup;if(now>=hit.at){mob.windup=null;if(hit.bot===target&&gap<=reach&&clear)window.FakePlayers?.monsterHurt(target,Math.max(1,Math.floor((mob.spawn.npc.level||1)*.6)+1+Math.floor(Math.random()*6)),now);}return true;}
    if(now<mob.ready)return true;
    if(gap&&gap<=reach&&clear){const heading=steps.findIndex(([x,y])=>x===Math.sign(target.x-mob.x)&&y===Math.sign(target.y-mob.y));if(heading>=0)mob.heading=heading;const duration=swing(mob.spawn.npc);mob.action={clip:'attack',start:now,end:now+duration};mob.windup={bot:target,at:now+duration*.45};mob.ready=now+duration;CombatSound.monsterAttack(mob,null,duration);}
    else if(!window.ClassBuffs?.rooted(mob))stepToward(mob,target.x,target.y,now);
    return true;
  }
  function update(mob, now, mobs, steps, stepToward) {
    if (mob.aiOwner !== owner) {
      reset(mob);
    }
    if(mob.botEnemy){fightBot(mob,now,steps,stepToward);return true;}
    if (window.Summons?.drive(mob, now, stepToward)) return true;
    if (!canFight(mob) || !playerActive() || now < immuneUntil || !mob.angry && (safe(worldX, worldY) || safe(mob.x, mob.y)) || window.ClassBuffs?.invisible()) {
      calm(mob);
      return false;
    }
    const gap = distance(mob.x, mob.y, worldX, worldY);
    const leash = mob.spawn.movement || 12;
    if (gap > 18 || distance(mob.homeX, mob.homeY, worldX, worldY) > leash + 2) {
      calm(mob);
      return false;
    }
    const clear = gap <= 14 && IslandCombat.clearShot(mob.x, mob.y, worldX, worldY);
    if (!mob.alert && mob.spawn.npc.aggressive && gap <= 14 && clear) provoke(mob, mobs);
    if (!mob.alert) return false;
    if (mob.step) return true;
    // 攻擊最小距離 1 格：跟玩家同一格（重疊）時先退到旁邊空格再出手
    if (gap === 0) {
      const first = Math.floor(Math.random() * steps.length);
      for (let i = 0; i < steps.length; i++) { const [dx, dy] = steps[(first + i) % steps.length]; if (stepToward(mob, mob.x + dx * 2, mob.y + dy * 2, now)) break; }
      return true;
    }
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
    const skill = clear && !window.ClassBuffs?.silenced(mob) ? pickSkill(mob, gap, now, basicRange) : null;
    if (clear && (skill || gap <= basicRange)) {
      const dx = Math.sign(worldX - mob.x), dy = Math.sign(worldY - mob.y);
      const heading = steps.findIndex(([x, y]) => x === dx && y === dy);
      if (heading >= 0) mob.heading = heading;
      const duration = skill?.type === 2 ? npc.cast || swing(npc) : swing(npc);
      if (skill) {
        const use = mob.skillUse.get(skill.order);
        mob.skillUse.set(skill.order, {count: (use?.count || 0) + 1, ready: now + Math.max(skill.reuse, skill.spell?.reuse || 0)});
        mob.mp -= skill.spell?.mp || 0;
      }
      mob.action = {clip: skill?.type === 2 ? 'cast' : skill?.action === 30 ? 'special' : 'attack', start: now, end: now + duration};
      CombatSound.monsterAttack(mob,skill,duration);
      mob.windup = {skill, range: skill ? range(skill, basicRange) : basicRange, at: now + duration * .45};
      mob.ready = now + duration * (window.ClassBuffs?.slowed(mob) ? 1.33 : 1);
    } else if (!window.ClassBuffs?.rooted(mob)) {
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
    // Converted dungeon maps: restart at the DB getback town (dungeon-portals.js), like the home scroll.
    const dungeon = window.WorldMaps?.isDungeon(window.activeMapId || 0) && window.DungeonPortals?.homeTarget(NATIVE_DUNGEON_MAPS[window.activeMapId]);
    const spot = dungeon?.points?.[Math.floor(Math.random() * dungeon.points.length)];
    if (spot) {
      revive.hidden = true; slowedUntil = cursedUntil = 0; immuneUntil = movementTime() + 3000;
      WorldMaps.travel(dungeon.mapId, spot[0], spot[1]).then(ok => { if (ok) DungeonPortals.settle(); window.GameEntry?.saveActive(); });
      return;
    }
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
  return {reset, playerActive, provoke, provokeBot, update, canFight,
    updateRevive(){revive.hidden = window.gameFlowState !== 'playing' || !CharacterActions.dead;},
    cure(){slowedUntil = cursedUntil = 0;window.NativePotions?.sync();},
    get negativeEffects(){
      if(window.gameFlowState!=='playing'||CharacterActions.dead||window.activeCharacterId!==owner)return [];
      const now=movementTime(),effects=[];
      if(now<cursedUntil)effects.push({id:'petrify',name:'石化',icon:'assets/interface/skills/33.png',description:'無法移動或行動',remainingMs:cursedUntil-now});
      if(now<slowedUntil)effects.push({id:'slow',name:'緩速',icon:'assets/interface/skills/29.png',description:'移動速度降低',remainingMs:slowedUntil-now});
      return effects;
    },
    get cursed(){return window.activeCharacterId === owner && movementTime() < cursedUntil;},
    get slowed(){return window.activeCharacterId === owner && movementTime() < slowedUntil;}
  };
})();window.IslandNpcAi=IslandNpcAi;
