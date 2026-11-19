// 範圍治癒：自身由正常施法交易回復，寵物／召喚物與NPC隊友在成功施法後回復。
window.GroupHealing=(()=>{let busy=false;const isGroup=skill=>[49,164].includes(skill.id);
 function applyAllies(skill,amount){if(!isGroup(skill)||amount<=0)return 0;const id=window.activeCharacterId,map=window.activeMapId||0,range=10;
  const pets=[...(window.Summons?.snapshot?.length?window.Summons.mobs:[]),...(window.Pets?.mobs||[])],party=(window.NpcSocial?.party||[]).filter(m=>m.fp?.partyOwner===id&&!m.fp.hidden&&!m.fp.vanish),changed=[];
  for(const m of new Set([...pets,...party])){if(!(m.hp>0)||m.spawn.mapId!==map||Math.max(Math.abs(m.x-worldX),Math.abs(m.y-worldY))>range||!IslandCombat.clearShot(worldX,worldY,m.x,m.y))continue;const max=Number(m.spawn.npc.hp);if(!(max>0)||m.hp>=max)continue;changed.push([m,m.hp]);m.hp=Math.min(max,m.hp+amount);IslandMonsters.playEffect(skill.gfx,m.x,m.y,movementTime());}
  if(changed.length&&window.GameEntry?.saveActive?.()===false){for(const [m,hp]of changed)m.hp=hp;window.toast?.('隊友回復儲存失敗，已還原。');return 0;}window.PartyHud?.refresh?.();return changed.length;
 }
 function castOnline(skill,extra={}){if(busy)return false;busy=true;const id=window.activeCharacterId,p=PlayerClassStats.read();
  window.LocalServerClient.act('/api/party/heal',{...extra,skillId:skill.id,wis:Math.max(0,Math.min(127,p.attributes.wis||0)),int:Math.max(0,Math.min(127,p.attributes.int||0))}).then(async result=>{await new Promise(r=>setTimeout(r,300));if(window.activeCharacterId!==id||window.gameFlowState!=='playing')return;applyAllies(skill,result.amount);CharacterActions.play('skill');IslandMonsters.playEffect(skill.gfx,worldX,worldY,movementTime());}).catch(e=>window.toast?.(e.message)).finally(()=>{busy=false;});return true;
 }
 return {isGroup,applyAllies,castOnline};
})();
