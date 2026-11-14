// Live party and summon bars below the player's HUD; all values come from current game state.
const PartyHud=(()=>{
 const game=document.querySelector('.game'),root=document.createElement('aside');root.className='party-hud';root.hidden=true;root.setAttribute('aria-label','目前隊伍與召喚怪物');game.append(root);
 const el=(tag,cls,text)=>{const n=document.createElement(tag);n.className=cls;if(text!==undefined)n.textContent=text;return n;};
 let signature='',owner=null;
 function snapshot(){
  if(window.gameFlowState!=='playing'||!window.activeCharacterId)return {party:[],summons:[]};
  const party=[];
  for(const b of window.NpcSocial?.party||[]){if(b.fp?.partyOwner!==window.activeCharacterId||b.fp?.hidden)continue;party.push({id:String(b.spawn.spawnId??b.spawn.npcId??b.spawn.npc.name),name:b.spawn.npc.name,hp:b.hp,maxHp:b.spawn.npc.hp,label:'NPC',online:true});}
  for(const p of window.LocalServerClient?.party||[])party.push({...p,label:'玩家'});
  const summons=(window.Summons?.snapshot.length?Summons.mobs:[]).filter(m=>m.hp>0).map(m=>({id:String(m.spawn.npcId),name:m.spawn.npc.name,hp:m.hp,maxHp:m.spawn.npc.hp,label:'召喚',online:true}));
  return {party,summons};
 }
 function position(){
  const g=game.getBoundingClientRect(),hud=game.querySelector(':scope>.hud')?.getBoundingClientRect();
  const chat=['.oh-msg','.qh-chat','.reference-messages'].map(s=>game.querySelector(s)?.getBoundingClientRect()).find(r=>r?.height>0);
  let top=Math.max(8,(hud?.bottom??g.top+110)-g.top+14),bottom=g.height-100;const left=Math.max(6,(hud?.left??g.left+8)-g.left);
  if(chat){if(chat.top>=g.top+top+80)bottom=chat.top-g.top-10;else if(chat.bottom>g.top+top&&chat.bottom<g.top+g.height-100)top=chat.bottom-g.top+10;}
  root.style.left=left+'px';root.style.top=top+'px';root.style.maxHeight=Math.max(70,bottom-top)+'px';root.style.width=Math.min(210,Math.max(145,g.width*.38))+'px';
 }
 function row(member){
  const box=el('div','party-hud-member'+(member.online===false?' offline':'')),line=el('div','party-hud-name');
  const name=el('span','',member.name||member.id),type=el('small','',member.online===false?'離線':member.label);name.title=(member.name||'')+'｜ID：'+member.id;line.append(name,type);box.append(line);
  const known=Number.isFinite(member.hp)&&Number.isFinite(member.maxHp)&&member.maxHp>0,hp=known?Math.max(0,Math.min(member.maxHp,Math.ceil(member.hp))):0,max=known?Math.ceil(member.maxHp):0;
  const bar=el('div','party-hud-bar'),fill=el('i',''),text=el('span','',known?hp+' / '+max:'HP 資料待同步');fill.style.width=(known?hp/max*100:0)+'%';bar.append(fill,text);bar.setAttribute('role','meter');bar.setAttribute('aria-label',(member.name||member.id)+' 血量');if(known){bar.setAttribute('aria-valuemin','0');bar.setAttribute('aria-valuemax',String(max));bar.setAttribute('aria-valuenow',String(hp));}box.append(bar);return box;
 }
 function section(title,members,empty){const section=el('section',''),heading=el('div','party-hud-heading',title+'（'+members.length+'）');section.append(heading);if(members.length)for(const m of members)section.append(row(m));else section.append(el('p','party-hud-empty',empty));return section;}
 function tick(){
  root.hidden=window.gameFlowState!=='playing';if(root.hidden){signature='';return;}
  if(owner!==window.activeCharacterId){owner=window.activeCharacterId;signature='';}
  const data=snapshot(),key=JSON.stringify(data);if(key===signature)return;signature=key;
  const scroll=root.scrollTop;root.replaceChildren(section('目前隊伍',data.party,'尚未組隊'),section('召喚怪物',data.summons,'目前沒有召喚物'));position();root.scrollTop=scroll;
 }
 const observer=new ResizeObserver(position);observer.observe(game);for(const node of [game.querySelector(':scope>.hud'),game.querySelector('.oh-msg'),game.querySelector('.qh-chat'),game.querySelector('.reference-messages')])if(node)observer.observe(node);
 setInterval(tick,250);tick();return {snapshot,refresh:tick};
})();window.PartyHud=PartyHud;
