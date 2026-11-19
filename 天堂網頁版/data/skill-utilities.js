// Target selection for resurrection and clan travel; no resource is paid until a valid target is confirmed.
window.SkillUtilities=(()=>{
 const ids=new Set([61,75,73,116,118,165]),cooldowns=new Map();let busy=false;
 const handles=id=>ids.has(id),say=message=>{document.querySelector('#log').textContent=message;return false;};
 function ready(id){return window.gameFlowState==='playing'&&!CharacterActions.dead&&!characterMovementBlocked()&&!movementAnimating()&&TransformCards.canCast&&movementTime()>=(cooldowns.get(window.activeCharacterId+':'+id)||0);}
 function finished(id,skill){cooldowns.set(window.activeCharacterId+':'+id,movementTime()+(skill.reuse||0));CharacterActions.play('skill');IslandMonsters.playEffect(skill.gfx,worldX,worldY,movementTime());}
 function menu(title,choices){if(!choices.length)return say('目前沒有符合條件的目標，未消耗資源。');const panel=document.querySelector('#panel'),body=document.querySelector('#panelContent');panel.classList.remove('classic-panel','reference-menu-panel','game-catalog-panel','npc-shop-panel');body.replaceChildren(uiElement('h2','',title));document.querySelector('#close').hidden=false;panel.hidden=false;for(const choice of choices){const button=uiElement('button','',choice.name);button.type='button';button.onclick=()=>{closePanel();choice.run();};body.append(button);}return true;}
 function cast(id,skill,options={}){
  if(!ready(id)||busy)return false;const owner=window.activeCharacterId,pay=options.pay||(()=>OwnedInventory.castCost(skill));
  if(id===73){const row=OwnedInventory.items.find(e=>e.slot==='weapon'&&e.key.startsWith('weapon:'));if(!row)return say('請先裝備要製作的武器。');if((row.enchant||0)>=6)return say('創造魔法武器只能將武器強化至 +6，未消耗資源。');if(options.scroll)return say('這項製作需要直接施法。');if(!OwnedInventory.castCost({...skill,enchantUid:row.uid}))return say('魔力、體力或材料不足。');finished(id,skill);say('創造魔法武器成功：武器強化 +1。');return true;}
  if(window.LocalServerClient?.online){busy=true;LocalServerClient.market().then(data=>{
   if(window.activeCharacterId!==owner)return;const kind=[61,75,165].includes(id)?'party':'guild',group=data.groups.find(g=>g.kind===kind);
   menu(skill.name+' · 選擇'+(kind==='party'?'隊友':'盟友'),(group?.members||[]).filter(m=>m.id!==owner).map(m=>({name:m.name,run:()=>{
    if(window.activeCharacterId!==owner||!ready(id)||busy)return;busy=true;const p=PlayerClassStats.read();LocalServerClient.act('/api/skills/utility',{skillId:id,targetId:m.id,scrollUid:options.scrollUid,int:p.attributes.int}).then(()=>{if(window.activeCharacterId===owner)finished(id,skill);}).catch(e=>say(e.message)).finally(()=>{busy=false;});
   }})));
  }).catch(e=>say(e.message)).finally(()=>{busy=false;});return true;}
  if(id===116||id===118)return say('請登入多人伺服器並加入血盟，才能選擇盟友。');
  const dead=(window.NpcSocial?.party||[]).filter(m=>m.fp?.partyOwner===owner&&(m.hp<=0||m.fp.hidden&&m.fp.vanish)&&(m.spawn.mapId||0)===(window.activeMapId||0)&&Math.max(Math.abs(m.x-worldX),Math.abs(m.y-worldY))<=10&&IslandCombat.clearShot(worldX,worldY,m.x,m.y));
  return menu(skill.name+' · 選擇倒下的隊友',dead.map(m=>({name:m.spawn.npc.name,run:()=>{if(window.activeCharacterId!==owner||!ready(id)||m.fp?.partyOwner!==owner||(m.spawn.mapId||0)!==(window.activeMapId||0)||Math.max(Math.abs(m.x-worldX),Math.abs(m.y-worldY))>10||!IslandCombat.clearShot(worldX,worldY,m.x,m.y)||!(m.hp<=0||m.fp.hidden&&m.fp.vanish))return;if(!pay())return say('魔力、體力或材料不足。');m.hp=id===75?m.spawn.npc.hp:Math.max(1,Math.floor(m.spawn.npc.hp/2));m.fp.hidden=false;m.fp.vanish=0;m.fp.pk=false;m.windup=null;finished(id,skill);window.GameEntry?.saveActive?.();window.PartyHud?.refresh?.();}})));
 }
 return {handles,cast};
})();
