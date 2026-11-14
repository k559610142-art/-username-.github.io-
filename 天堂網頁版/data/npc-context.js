// 假玩家公開發言只描述眼前情境；成功、掉寶、擊殺等由實際事件發言。
const NpcContext=(()=>{
 const gap=(a,b)=>Math.max(Math.abs(a.x-b.x),Math.abs(a.y-b.y));
 const safe=b=>(tile(b.x,b.y)&48)===16;
 function canHear(b){return window.gameFlowState==='playing'&&!CharacterActions.dead&&!!b?.fp&&!b.fp.hidden&&!b.fp.vanish&&b.hp>0&&(b.spawn.mapId||0)===(window.activeMapId||0)&&gap(b,{x:worldX,y:worldY})<=18;}
 function busy(b){const f=b.fp;return !!(f.pk||f.retreatUntil||f.target?.hp||f.partyTarget?.hp||b.hp<b.spawn.npc.hp*.4||b.action&&movementTime()<b.action.end);}
 function available(b){return canHear(b)&&!b.fp.red&&!b.fp.stall&&!b.fp.social&&!busy(b);}
 function nearby(b){return IslandMonsters.around(b.x,b.y,12).filter(m=>m.hp>0);}
 function ambient(b){
  if(!available(b)||b.fp.partyOwner)return [];
  const f=b.fp,town=safe(b),dungeon=!!window.WorldMaps?.isDungeon?.(b.spawn.mapId||0),monsters=nearby(b);
  const lines=town?['休息一下再出發','先整理背包','有沒有要一起出村練功的','在村裡補給一下']:dungeon?['先看清楚路再往前','這層慢慢走','有人要一起練這層嗎']:['換個地方找怪','有人要一起練功嗎','先看看附近的路'];
  if(town&&(b.spawn.mapId||0)===0){const count=IslandMonsters.botList.filter(m=>m!==b&&(m.spawn.mapId||0)===0&&!m.fp?.hidden&&!m.fp?.vanish&&gap(m,b)<=14).length;if(count>=5)lines.push('說話之島村莊今天好熱鬧');}
  if(Number.isFinite(f.potions)&&f.potions<=2)lines.push('誰有多的紅水');
  if(!town&&monsters.length>=5)lines.push('這邊怪不少，小心一點');
  if(!town&&!monsters.length)lines.push('附近沒什麼怪，再往前找找');
  if(!town&&monsters.some(m=>/骷髏/.test(m.spawn.npc.name)))lines.push('前面有骷髏，小心一點');
  if(f.look?.weapon==='bow'&&town)lines.push('出發前先補點箭');
  return lines;
 }
 function reply(b,text){
  if(!available(b))return null;
  if(/組|隊|一起/.test(text))return safe(b)?'要組隊可以，準備好再一起出村。':'可以組隊，先說好在哪裡集合。';
  if(/王|boss|巴風特|死亡騎士/i.test(text)){
   const boss=nearby(b).find(m=>/BOSS|巴風特|死亡騎士/i.test(m.spawn.npc.name)||m.spawn.count===1&&m.spawn.npc.hp>=1500);
   return boss?'附近有 '+boss.spawn.npc.name+'，別自己衝。':'我這附近沒看到王。';
  }
  if(/賣|收|買|交易/.test(text))return safe(b)?'要交易請密語我物品名稱。':'先練功，要交易等回村再談。';
  if(/強化|衝|\+\d/.test(text))return safe(b)?'衝裝前先確認卷軸和裝備。':'回村再慢慢聊衝裝吧。';
  if(/殺|PK|紅名/i.test(text))return safe(b)?'村莊是安全區。':'野外小心紅名，別落單。';
  if(/哈囉|你好|嗨|安安|hi|hello/i.test(text))return '嗨，'+(safe(b)?'準備出村嗎？':'路上小心。');
  if(/謝/.test(text))return '不客氣。';
  return null;
 }
 return {canHear,busy,available,ambient,reply};
})();window.NpcContext=NpcContext;
