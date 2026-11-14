// 假玩家社交：收購密語、約地點交易、隊伍邀請與共同狩獵。
const NpcSocial=(()=>{
 const known=new Map(),party=new Set();let owner=null,invite=null,deal=null,win=null,nextInvite=0;
 const now=()=>movementTime(),map=()=>window.activeMapId||0;
 const distance=(a,b)=>Math.max(Math.abs(a.x-b.x),Math.abs(a.y-b.y));
 const player=()=>({x:worldX,y:worldY});
 const safe=(x,y)=>(tile(x,y)&48)===16;
 const usable=b=>b?.fp&&!b.fp.red&&!b.fp.stall&&!b.fp.hidden&&!b.fp.vanish&&b.hp>0;
 const items=()=>INTERFACE_CATALOG.items;
 const towns=[
  {name:'銀騎士村莊',aliases:/騎村|銀騎|銀村/,map:4,x:33080,y:33395},
  {name:'奇岩村莊',aliases:/奇岩|奇村/,map:4,x:33421,y:32813},
  {name:'古魯丁村莊',aliases:/古魯丁|古村|古丁/,map:4,x:32608,y:32734},
  {name:'說話之島村莊',aliases:/說話之島|話島|說島/,map:0,x:32583,y:32924}
 ];
 function whisper(b,text){window.GameChat?.say('[密語] '+b.spawn.npc.name+'：'+text,'whisper');}
 function message(text){window.GameChat?.say('【社交】'+text,'sys');}
 function reset(){
  for(const b of party){b.fp.partyOwner=null;b.fp.target=null;}
  party.clear();invite=null;if(deal)release(deal.bot);deal=null;win?.remove();win=null;
 }
 function checkOwner(){const id=window.gameFlowState==='playing'?window.activeCharacterId:null;if(id!==owner){reset();known.clear();owner=id;nextInvite=now()+60000;}return !!id;}
 function remember(b){if(b?.fp)known.set(b.spawn.npc.name,b);}
 function lookup(name){return IslandMonsters.botList.find(b=>b.spawn.npc.name===name)||known.get(name);}
 function currentTown(){return towns.find(t=>t.map===map()&&distance(t,player())<75&&safe(worldX,worldY));}
 function locationName(b){const town=towns.find(t=>t.map===(b.spawn.mapId||0)&&distance(t,b)<75);return town?.name||((window.WorldMaps?.name(b.spawn.mapId||0)||'野外')+' '+b.x+', '+b.y);}
 function destination(text){
  const named=towns.find(t=>t.aliases.test(text));if(named)return {...named};
  const coordinates=text.match(/(?:座標|坐標|到|在)?\s*(\d{5})\s*[,，、 ]\s*(\d{5})/);
  if(coordinates){const x=+coordinates[1],y=+coordinates[2];return TeleportScrolls.canLand(x,y)?{name:'約定座標 '+x+', '+y,map:map(),x,y}:null;}
  if(/這裡|這邊|目前|當前|原地|我這|村莊|村裡/.test(text)){
   const town=currentTown();return town?{...town,x:worldX,y:worldY}:null;
  }
  return null;
 }
 function reference(item){
  let price=Infinity;
  const shops=typeof NATIVE_NPC_DIALOGS!=='undefined'?Object.values(NATIVE_NPC_DIALOGS.shops||{}):[];
  if(typeof islandNpcServiceData!=='undefined')shops.push(islandNpcServiceData.shop||[]);
  for(const rows of shops)for(const [id,,buy,pack,,enchant]of rows)if(id===item.id&&buy>0&&!enchant)price=Math.min(price,buy/Math.max(1,pack||1));
  return Number.isFinite(price)?Math.max(1,Math.floor(price*.7)):0;
 }
 function findItem(text){
  const aliases=[[/紅水|紅色藥水/,[40010]],[/綠水|加速藥水/,[40013]],[/回卷|回家卷|回城卷/,[40079]]];
  for(const [re,ids]of aliases)if(re.test(text)){const found=items().find(i=>ids.includes(i.id));if(found)return found;}
  return items().filter(i=>i.id!==40308&&i.name&&text.includes(i.name)).sort((a,b)=>b.name.length-a.name.length)[0]||null;
 }
 function onSpeech(b,text){
  if(!checkOwner()||!usable(b))return;remember(b);
  if(/誰有|有沒有|(?:^|【)收|喝完|不夠/.test(text)){
   const item=findItem(text);if(item&&!/\+\d/.test(text))b.fp.need={key:item.kind+':'+item.id,item,remaining:10,until:now()+180000};
  }
  if(/組隊|一起.*(?:打|練)|缺補|求帶/.test(text)&&!party.size&&!invite&&!deal&&distance(b,player())<=18)offerParty(b);
 }
 function offerParty(b){
  if(!usable(b)||b.fp.social||party.has(b)||party.size>=3||CharacterActions.dead||window.NpcContext&&!NpcContext.available(b))return false;
  invite={bot:b,owner,until:now()+45000};remember(b);
  whisper(b,'要不要組隊一起打怪？密我「好，組隊」，或到選單 → 社交接受邀請。');render();return true;
 }
 function join(b){
  if(!checkOwner()||!usable(b)||b.fp.social==='leaving'||party.size>=3)return false;
  if(deal?.bot===b){whisper(b,'先完成這筆交易，再一起練功吧。');return false;}
  party.add(b);b.fp.partyOwner=owner;b.fp.pk=false;b.fp.target=null;b.fp.goal=null;b.fp.route=null;
  invite=null;remember(b);whisper(b,'組好了！你帶路，我會跟著你、幫打你正在打的怪。');render();return true;
 }
 function release(b){if(!b?.fp)return;if(b.fp.hidden&&!b.fp.vanish)b.fp.hidden=false;b.fp.social=null;b.fp.target=null;b.fp.goal=null;b.fp.route=null;b.fp.think=now()+2500;}
 function cancelDeal(text='交易取消。'){
  if(!deal)return;whisper(deal.bot,text);release(deal.bot);deal=null;render();
 }
 function startDeal(b,item,text){
  if(party.has(b)){whisper(b,'我還在隊伍裡，先離隊再約交易吧。');return;}
  if(deal&&deal.bot!==b){whisper(b,'你先完成手上那筆交易，再來找我。');return;}
  const old=deal?.bot===b?deal:null,gift=/送你|送給|給你|不用錢|免費/.test(text)&&!/賣給|賣你/.test(text);
  const price=gift?0:reference(item);
  if(!gift&&!price){whisper(b,'這件東西我目前沒有收購價，先不收；如果是贈送，請明確告訴我。');return;}
  const qty=text.match(/(\d+)\s*(?:個|瓶|張|支|顆|件)/);
  deal={bot:b,owner,item,key:item.kind+':'+item.id,price,qty:Math.max(1,Math.min(10,qty?+qty[1]:old?.qty||1)),until:now()+300000,stage:'negotiating',destination:old?.destination||null};
  b.fp.social='trade';b.fp.pk=false;b.fp.target=null;b.fp.goal=null;b.fp.route=null;remember(b);
  whisper(b,'好，我要 '+item.name+' ×'+deal.qty+'，'+(gift?'你要送我。':'每個 '+price+' 天幣。')+'我目前在'+locationName(b)+'。你在哪個村莊？也可以密我「到騎村交易」。');
  const target=destination(text);if(target)meetAt(target);render();
 }
 function meetAt(target){
  if(!deal)return;deal.destination=target;deal.stage='travelling';deal.arriveAt=now()+1800;deal.until=now()+300000;
  const b=deal.bot;if((b.spawn.mapId||0)===map())IslandMonsters.playEffect(169,b.x,b.y,now());
  // 立即從原地出發，跨圖由同一個人物物件轉移，不複製角色。
  b.fp.hidden=true;b.step=null;IslandMonsters.transferBot(b,target.map,target.x,target.y);
  whisper(b,'好，我飛去'+target.name+'。你到了我會過去找你，五分鐘內交易。');render();
 }
 function handleWhisper(name,text){
  if(!checkOwner())return false;const b=lookup(name);if(!usable(b)&&deal?.bot!==b)return false;remember(b);
  if(/取消|算了|不交易|不用了/.test(text)&&deal?.bot===b){cancelDeal();return true;}
  if(/離隊|退隊|解散/.test(text)&&party.has(b)){party.delete(b);b.fp.partyOwner=null;release(b);whisper(b,'好，先離隊了。');render();return true;}
  if(window.NpcContext?.busy(b)&&deal?.bot!==b){whisper(b,b.fp.retreatUntil||b.hp<b.spawn.npc.hp*.4?'我在撤退補血，等安全了再聊。':'正在打怪，等我打完再聊。');return true;}
  if(/組隊|入隊|一起打|一起練|加入/.test(text)||invite?.bot===b&&/好|可以|走|接受|要/.test(text)){join(b);return true;}
  if(/你在哪|在哪裡|哪個村|你的位置|你在什麼地方/.test(text)){
   whisper(b,'我目前在'+(deal?.bot===b&&deal.destination?deal.destination.name:locationName(b))+'。'+(deal?.bot===b?'要換地點可以說「到騎村交易」。':'有要交易的東西可以告訴我，也能另外約村莊。'));return true;
  }
  const target=destination(text);
  if(deal?.bot===b){
   if(target){meetAt(target);return true;}
   if(/在哪|哪裡|到了|交易/.test(text)){whisper(b,deal.destination?'我在'+deal.destination.name+'等你；靠近後到社交視窗確認交易。':'你在哪個村莊？可以約騎村、奇岩、古魯丁、話島，或提供座標。');render();return true;}
   if(/價|錢|便宜|多少/.test(text)){whisper(b,deal.price?'我收 '+deal.item.name+'，每個 '+deal.price+' 天幣，數量可以在交易視窗調整。':'這筆是贈送，金額 0 天幣。');return true;}
  }
  const need=b.fp.need&&b.fp.need.until>now()?b.fp.need:null;
  if(/我有|有東|給你|送你|賣你|賣給|交易/.test(text)){
   const named=findItem(text),item=named||need?.item;
   if(!item){whisper(b,'你要給我什麼？請說完整物品名稱，例如「我有紅水，要給你」。');return true;}
   if(!need||need.key!==item.kind+':'+item.id){whisper(b,'我目前沒有在收 '+item.name+'，等我喊收購再密我。');return true;}
   startDeal(b,item,text);return true;
  }
  if(target){whisper(b,'先告訴我你要交易的物品，例如「我有紅水」，再約地點。');return true;}
  return false;
 }
 function handlePublic(text){
  if(!checkOwner())return false;
  if(invite&&/^(?:好|可以|接受|組隊|加入|\+1)[！!。，\s]*(?:組隊|一起|走)?[！!。，\s]*$/.test(text)){join(invite.bot);return true;}
  return false;
 }
 function landing(x,y,min=2,max=5){
  for(let r=min;r<=max;r++)for(let dx=-r;dx<=r;dx++)for(let dy=-r;dy<=r;dy++){
   if(Math.max(Math.abs(dx),Math.abs(dy))!==r)continue;
   const tx=x+dx,ty=y+dy;if(TeleportScrolls.canLand(tx,ty)&&!IslandMonsters.occupied(tx,ty))return {x:tx,y:ty};
  }
  return null;
 }
 function closeEnough(b){return (b.spawn.mapId||0)===map()&&!b.fp.hidden&&distance(b,player())<=3&&!CharacterActions.dead;}
 function completeTrade(count){
  if(!checkOwner()||!deal||deal.stage!=='ready'||deal.owner!==owner||now()>deal.until||!closeEnough(deal.bot))return '請先到約定地點，靠近交易對象。';
  if(!Number.isSafeInteger(count)||count<1||count>10)return '數量必須是 1～10。';
  const d=deal,next=OwnedInventory.snapshot;let left=count;
  // 依 uid 扣掉未穿戴、未強化物品，不用相同 key 誤扣強化裝備。
  for(const row of next){if(row.key!==d.key||row.slot||row.enchant)continue;const n=Math.min(left,row.count);row.count-=n;left-=n;if(!left)break;}
  if(left)return '背包沒有足夠的未穿戴、未強化物品。';
  const rows=next.filter(r=>r.count>0),gold=d.price*count;
  if(gold){const money=rows.find(r=>r.key==='etcitem:40308'&&!r.slot);if(money)money.count+=gold;else rows.push({uid:'social-gold-'+Date.now(),key:'etcitem:40308',count:gold,slot:null});}
  if(!OwnedInventory.applyChange(rows))return '儲存失敗，交易未完成。';
  const b=d.bot;whisper(b,'收到了 '+d.item.name+' ×'+count+'，'+(gold?'付你 '+gold+' 天幣。':'謝謝你送我！')+'我先走了。');
  message('與 '+b.spawn.npc.name+' 完成交易：'+d.item.name+' ×'+count+(gold?'，獲得 '+gold+' 天幣':'（贈送）'));
  b.fp.need=null;deal=null;b.fp.social='leaving';b.fp.leaveAt=now()+3500;b.fp.goal=null;b.fp.route=null;render();return '';
 }
 function update(b,time,stepToward){
  if(!checkOwner())return false;
  if(b.fp.social==='leaving'){
   if(time>=b.fp.leaveAt){IslandMonsters.playEffect(169,b.x,b.y,time);b.fp.social=null;b.fp.hidden=true;b.fp.vanish=time+20000;return true;}
   if(!b.step)stepToward(b,b.homeX+6,b.homeY+3,time);return true;
  }
  if(deal?.bot===b){
   if(b.fp.hidden||b.step||deal.stage==='negotiating'||map()!==deal.destination?.map||distance(player(),deal.destination)>45)return true;
   if(distance(b,player())<=3){if(deal.stage!=='ready'){deal.stage='ready';whisper(b,'我找到你了，打開選單 → 社交，確認物品和金額後交易。');render();}return true;}
   deal.stage='approaching';if(time>=(b.fp.socialWalkAt||0)){b.fp.socialWalkAt=time+400;stepToward(b,worldX,worldY,time);}return true;
  }
  if(!party.has(b)||b.fp.partyOwner!==owner)return false;
  if(b.fp.pk||b.fp.retreatUntil)return false;
  if(b.step||b.action&&time<b.action.end)return true;
  if(CharacterActions.dead)return true;
  const target=IslandMonsters.target;b.fp.partyTarget=null;
  if(target?.hp&&!target.spawn.bot&&!target.spawn.ally&&!target.spawn.resident&&!safe(worldX,worldY)&&!safe(b.x,b.y)&&!safe(target.x,target.y)&&distance(target,player())<=12){
   b.fp.partyTarget=target;const reach=b.spawn.npc.ranged||1;
   if(distance(b,target)>reach||!IslandCombat.clearShot(b.x,b.y,target.x,target.y)){stepToward(b,target.x,target.y,time);return true;}
   if(time<(b.fp.ready||0))return true;
   const duration=b.fp.look.attackMs,teamOwner=owner,teamMap=map();b.fp.ready=time+duration+200;
   const dx=Math.sign(target.x-b.x),dy=Math.sign(target.y-b.y),heading=[[0,-1],[1,-1],[1,0],[1,1],[0,1],[-1,1],[-1,0],[-1,-1]].findIndex(([x,y])=>x===dx&&y===dy);if(heading>=0)b.heading=heading;
   b.action={clip:'attack',start:time,end:time+duration};
   setTimeout(()=>{
    if(owner!==teamOwner||map()!==teamMap||!party.has(b)||!usable(b)||b.fp.retreatUntil||CharacterActions.dead||!target.hp||distance(b,target)>reach||safe(b.x,b.y)||safe(target.x,target.y)||safe(worldX,worldY)||!IslandCombat.clearShot(b.x,b.y,target.x,target.y))return;
    IslandMonsters.botHit(target,3+Math.floor(b.spawn.npc.level*.6),{party:true,attacker:b});
    b.hp=Math.max(1,b.hp-Math.max(1,Math.floor((target.spawn.npc.level||1)*.5)));b.fp.hpShow=now()+3000;
   },duration*.45);return true;
  }
  if(distance(b,player())>3)stepToward(b,worldX,worldY,time);return true;
 }
 function tick(){
  if(!checkOwner())return;
  for(const b of IslandMonsters.botList)remember(b);
  if(invite&&now()>invite.until){invite=null;render();}
  if(deal){
   if(now()>deal.until||CharacterActions.dead){cancelDeal('等不到你，這次先取消交易。');}
   else if(deal.destination&&now()>=deal.arriveAt&&map()===deal.destination.map){
    const b=deal.bot;
    if(b.fp.hidden){const anchor=distance(player(),deal.destination)<=45?player():deal.destination,spot=landing(anchor.x,anchor.y);if(spot){IslandMonsters.transferBot(b,map(),spot.x,spot.y);b.fp.hidden=false;IslandMonsters.playEffect(169,b.x,b.y,now());deal.stage='waiting';}}
    else if(distance(player(),deal.destination)<=45&&distance(b,player())>18){const spot=landing(worldX,worldY,4,6);if(spot){IslandMonsters.transferBot(b,map(),spot.x,spot.y);deal.stage='approaching';}}
    if(distance(player(),deal.destination)>45){if(deal.stage!=='waiting'){deal.stage='waiting';render();}}
   }
  }
  for(const b of party){
   if(!usable(b)){party.delete(b);b.fp.partyOwner=null;message(b.spawn.npc.name+' 暫時離隊。');render();continue;}
   if((b.spawn.mapId||0)!==map()||distance(b,player())>20){const spot=landing(worldX,worldY,3,6);if(spot){IslandMonsters.transferBot(b,map(),spot.x,spot.y);IslandMonsters.playEffect(169,b.x,b.y,now());}}
  }
  if(now()>=nextInvite){nextInvite=now()+90000;if(!party.size&&!invite&&!deal){const b=IslandMonsters.botList.find(b=>usable(b)&&(b.spawn.mapId||0)===map()&&!b.fp.social&&distance(b,player())<=12&&(!window.NpcContext||NpcContext.available(b)));if(b&&(b.spawn.mapId||0)===map())offerParty(b);}}
 }
 const el=(tag,text)=>{const node=document.createElement(tag);if(text!==undefined)node.textContent=text;return node;};
 function button(label,fn){const b=el('button',label);b.type='button';b.onclick=fn;return b;}
 function render(){
  if(!win)return;win.replaceChildren();const head=el('div');head.className='npc-social-heading';const close=button('✕ 關閉',()=>{win.remove();win=null;});close.className='npc-social-close';close.setAttribute('aria-label','關閉社交視窗');head.append(el('strong','社交・隊伍與交易'),close);win.append(head);if(window.LocalServerClient?.online)win.append(button('真人玩家・好友・血盟・交易',()=>{win.remove();win=null;window.LocalServerClient.open('players');}));
  win.append(el('p','點聊天中的名字可密語。收購喊話後密「我有紅水，要給你」，再說「到騎村交易」。'));
  if(invite){const row=el('section');row.append(el('p',invite.bot.spawn.npc.name+' 邀請你組隊（45 秒內接受）'),button('接受組隊',()=>join(invite.bot)),button('拒絕',()=>{invite=null;render();}));win.append(row);}
  if(deal){const d=deal,section=el('section');section.append(el('strong','與 '+d.bot.spawn.npc.name+' 交易'),el('p',d.item.name+'｜單價 '+d.price+' 天幣'+(!d.price?'（贈送）':'')),el('p','地點：'+(d.destination?.name||'尚未約定')+'｜'+({negotiating:'請約地點',travelling:'傳送中',waiting:'等待玩家抵達',approaching:'正在走向你',ready:'已碰面，可以交易'}[d.stage]||'等待中')));
   const qty=el('input');qty.type='number';qty.min='1';qty.max='10';qty.value=String(d.qty);qty.setAttribute('aria-label','交易數量');const total=el('p','總金額：'+d.qty*d.price+' 天幣');qty.oninput=()=>{d.qty=Number(qty.value);total.textContent='總金額：'+(Number.isSafeInteger(d.qty)?d.qty*d.price:0)+' 天幣';};
   section.append(qty,total);const confirm=button('確認交易',()=>{const error=completeTrade(Number(qty.value));if(error){message(error);render();}});confirm.disabled=d.stage!=='ready'||!closeEnough(d.bot);section.append(confirm,button('取消交易',()=>cancelDeal()));
   for(const t of towns)section.append(button('約'+t.name,()=>meetAt({...t})));
   const here=currentTown();if(here)section.append(button('約目前村莊',()=>meetAt({...here,x:worldX,y:worldY})));win.append(section);
  }
  const team=el('section');team.append(el('strong','目前隊伍（'+(party.size+1)+'/4）'),el('p',party.size?'隊友跟隨你，協助攻擊你選定的野外怪物；隊友擊殺也會給你經驗與掉落。':'尚未組隊；可以接受邀請，或邀請附近的假玩家。'));
  for(const b of party)team.append(el('p',b.spawn.npc.name+'｜HP '+Math.ceil(b.hp)+'/'+b.spawn.npc.hp),button('請他離隊',()=>{party.delete(b);b.fp.partyOwner=null;release(b);render();}));win.append(team);
  const nearby=el('section');nearby.append(el('strong','附近玩家'));
  const list=IslandMonsters.botList.filter(b=>usable(b)&&(b.spawn.mapId||0)===map()&&distance(b,player())<=20);
  if(!list.length)nearby.append(el('p','附近目前沒有可互動的玩家。'));
  for(const b of list){const row=el('div');row.className='npc-social-row';row.append(el('span',b.spawn.npc.name+(b.fp.need?.until>now()?'｜收 '+b.fp.need.item.name:'')),button('邀請組隊',()=>join(b)),button('密語',()=>{const input=document.querySelector('.qh-chat input');if(input){input.value='/密 '+b.spawn.npc.name+' ';input.focus();}else message('在聊天框輸入 /密 '+b.spawn.npc.name+' 內容');}));nearby.append(row);}win.append(nearby);
 }
 function open(){if(!checkOwner())return;if(!win){win=el('div');win.className='npc-social-window';document.querySelector('.game').append(win);}render();}
 const css=el('style');css.textContent='.npc-social-window{position:absolute;z-index:150;left:50%;top:12%;transform:translateX(-50%);width:min(470px,94%);max-height:75%;overflow:auto;box-sizing:border-box;padding:14px;background:#14171bee;color:#e9dfc5;border:1px solid #a48b54;border-radius:8px;pointer-events:auto;font:13px sans-serif}.npc-social-heading,.npc-social-row{display:flex;align-items:center;justify-content:space-between;gap:8px}.npc-social-heading{position:sticky;top:-14px;z-index:1;margin:-14px -14px 10px;padding:8px 14px;background:#14171b;border-bottom:1px solid #655a40}.npc-social-window .npc-social-close{flex:none;min-width:72px;min-height:44px!important;background:#302a20;border:1px solid #a48b54;border-radius:4px;color:#fff1ce}.npc-social-window section{border-top:1px solid #655a40;margin-top:12px;padding-top:12px}.npc-social-window p{line-height:1.6}.npc-social-window button{min-height:28px!important;padding:4px 8px!important;margin:3px;font-size:12px!important}.npc-social-window input{width:70px;color:#eee;background:#262626;border:1px solid #987;padding:5px}.npc-social-row{flex-wrap:wrap;margin-top:8px}.npc-social-row span{flex:1}';document.head.append(css);
 setInterval(tick,750);
 return {open,onSpeech,handleWhisper,handlePublic,update,lookup,completeTrade,get party(){return [...party];},get meeting(){return deal;}};
})();window.NpcSocial=NpcSocial;
