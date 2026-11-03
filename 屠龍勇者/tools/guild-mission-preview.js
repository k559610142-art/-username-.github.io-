// 只供禁止連外／記憶體存檔的驗收頁。固定fixture不會送到正式伺服器。
(async()=>{
 playerOwner='11111111-1111-4111-8111-111111111111';guildNormalize(player,playerOwner);saveGame();
 const tickets=new Map(),receipts=new Map();let sequence=0;
 guildMissionBackend.begin=async team=>{const ticket={ticketId:crypto.randomUUID(),ownerId:playerOwner,characterId:player.guild.characterId,missionId:'lostMiners',ruleVersion:GuildCore.RULE_VERSION,missionVersion:GuildMissionCore.VERSION,team,seed:123456,issuedAt:Date.now(),expiresAt:Date.now()+7*86400000};tickets.set(ticket.ticketId,ticket);return ticket;};
 guildMissionBackend.submit=async report=>{if(receipts.has(report.ticketId))return receipts.get(report.ticketId);const ticket=tickets.get(report.ticketId);if(!ticket)throw Error('隔離頁重開後憑證不保留');const s=GuildMissionCore.replay(ticket.team,ticket.seed,player.cls,report.events,report.ticks),pending=player.guild.outbox.find(r=>r.ticketId===ticket.ticketId);if(!pending||s.phase!=='success')throw Error('測試重播未通過');const result={receipt:{...pending,seq:++sequence,status:'accepted',recruits:[]},reward:{rep:100,tokens:s.miners.every(m=>m.evacuated)&&!s.downed.length?12:10,badges:20}};receipts.set(ticket.ticketId,result);return result;};
 guildMissionBackend.cancel=async id=>{tickets.delete(id);};
 const bar=document.getElementById('guild-preview-tools'),note=document.createElement('div');note.textContent='失聯採礦隊：測試憑證／測試收據，不是正式獎勵';bar.appendChild(note);
 const button=document.createElement('button');button.textContent='載入已重播驗證的礦坑救援中途紀錄';button.addEventListener('click',async()=>{
  if(guildTrip)guildMapExit();if(!player.guild.activeTicket){if(!await guildMissionStart())return;guildMapExit();}
  const ticket=player.guild.activeTicket.ticket,proof=await(await fetch('tools/guild-lost-miners/test-proof.json')).json(),index=proof.events.findIndex(e=>e[1]==='rescue'),events=proof.events.slice(0,index),ticks=proof.events[index][0];
  guildMissionWrite(player.guild,ticket.ticketId,{version:GuildMissionCore.VERSION,ticketId:ticket.ticketId,events,ticks});await guildMissionResume();
 });bar.appendChild(button);const deliver=document.createElement('button');deliver.textContent='載入已重播驗證的返程交付前紀錄';deliver.addEventListener('click',async()=>{if(guildTrip)guildMapExit();if(!player.guild.activeTicket){if(!await guildMissionStart())return;guildMapExit();}const ticket=player.guild.activeTicket.ticket,proof=await(await fetch('tools/guild-lost-miners/test-proof.json')).json();guildMissionWrite(player.guild,ticket.ticketId,{version:GuildMissionCore.VERSION,ticketId:ticket.ticketId,events:proof.events.slice(0,-1),ticks:proof.ticks});await guildMissionResume();});bar.appendChild(deliver);guildRefresh();
})().catch(e=>console.error(e));
