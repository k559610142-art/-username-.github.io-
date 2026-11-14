// 假玩家（2026-11-14 第 1 期，參考使用者另一款遊戲「龍脈紀元」的假人）：讓單機地圖看起來有其他玩家。
//  外觀：原版 8 種角色動作圖（CHARACTER_ACTION_ASSETS：騎士、法師、王族、妖精 × 男女），轉成怪物影格格式（[檔, x, y, w, h, 毫秒, sx, sy]）
//   掛在 islandMonsterFrames 的虛擬外觀編號 990000＋，所以沿用 island-monsters.js 的繪製、尋路與走路（spawn.bot）。
//  行為：村莊（安全區）閒逛；野外找附近、等級合適、沒被你鎖定的怪打（近戰／妖精射箭／法師遠距），
//   用 IslandMonsters.botHit 扣血（不激怒怪打你、不給你經驗）；血量低於 25% 喊一句後用回家卷軸消失，過一陣子在你附近重新出現。
//  人數：每張地圖約 12 人，散在你周圍 8～20 格；離你超過 28 格的會換到你附近 16～22 格（假人跟怪物一樣只有在你 22 格內才會動）。
//  聊天：每 20～70 秒有機會說一句（頭上泡泡＋訊息框「一般」）；你在訊息框打字提到 組隊／王／買賣／強化／你好／PK 時，附近假人會回話。
//  不能點選、不會被 AUTO／技能選到、不會被怪打死。
// 第 3 期（2026-11-14）：（設定開關已拿掉，玩家不能控制假人）；妖精箭矢／法師魔法彈飛行特效（drawShots）；
//  假人被打時頭上短暫顯示血條；地監裡說地監台詞；擺攤商人：玩家附近有安全區時 1 個假人在安全區固定擺攤，
//  3～5 件貨（NPC 商店有賣的東西，價格 0.9～1.6 倍），每 40～90 秒喊「【賣】…」，點他打開攤位用金幣買，賣完或 4～7 分鐘換貨。
// 第 2 期（2026-11-14）：
//  紅名：每張地圖 2 個（血手、夜梟…，血盟「血月」，身體染暗紅、名字紅色），只在野外；冷卻到了且你在野外 8 格內就盯上你
//   （訊息框【警告】），追著打（命中看等級差與你的防禦），你進安全區、倒下或跑出 14 格就放棄。紅名可以點選、攻擊（不用強制攻擊），
//   被打會反擊；擊敗得到 等級×40 金幣，紅名消失一分鐘後在別處出現。
//  寶物公告：遊戲沒有地上掉落物，改成假人殺怪時照那隻怪的掉寶表擲骰（掉率 ≤ 2% 的道具、機率 ×2），打到就發【全服】公告。
//  打王：名字有 BOSS、或單隻生成且血量 ≥ 1500 的怪出現在你 30 格內時，14 級以上的一般假人有機會喊「王出了!集合!」跑去打。
const FakePlayers=(()=>{
 const A=window.CHARACTER_ACTION_ASSETS;
 const DIRS=['NW','N','NE','E','SE','S','SW','W'],TICK=40;
 const WEAPON={騎士:['sword1','sword2','blunt'],王族:['sword1','dagger'],法師:['wand','dagger'],妖精:['bow','dagger']};
 const RANGED={bow:6,wand:5};
 // ---- 外觀：每個角色＋武器做一組影格 ----
 const looks=[];let gfxId=990000;
 for(const [avatar,a] of Object.entries(A?.avatars||{})){
  for(const weapon of WEAPON[a.role]||['sword1']){
   const need=['idle','walk','attack'].map(k=>weapon+'_'+k);if(!need.every(c=>a.timelines?.[c]&&DIRS.every(d=>a.directions[d]?.[c])))continue;
   const [W,H]=a.size,foot=a.footY,sw=Math.min(170,W),sx=Math.round(W/2-sw/2),sy=Math.max(0,foot-100),sh=Math.min(H-sy,foot+22-sy);
   const frames={};
   DIRS.forEach((dir,d)=>{for(const key of ['idle','walk','attack']){const clip=weapon+'_'+key,count=a.directions[dir][clip];
    frames['d'+d+'/'+key]=a.timelines[clip].frames.filter(f=>f.frame<count).map(f=>['../character-actions/'+avatar+'/'+dir+'/'+clip+'_'+f.frame+'.png',sx-W/2,sy-foot,sw,sh,Math.max(1,f.ticks)*TICK,sx,sy,W]);}});
   const id=gfxId++;islandMonsterFrames[id]=frames;looks.push({id,avatar,role:a.role,weapon,attackMs:a.timelines[weapon+'_attack'].frames.reduce((s,f)=>s+Math.max(1,f.ticks)*TICK,0)});
  }
 }
 // ---- 名字、血盟、台詞 ----
 // 名字跟職業、性別要對得上（使用者 2026-11-14：王子叫「法師老李」不合理）：通用名＋性別名＋職業名，職業名只給那個職業
 const NAMES=['夜行俠','小雨點','劍無痕','黑貓貓','星辰雨','月下影','冰咖啡','焦糖布丁','北風','米漿加蛋','風之谷','咖哩飯','孤狼','雷霆一擊','無名氏','天堂老玩家','肝帝','打寶仔','紅水不夠','閃電貂','銀色月光','喵喵拳','鐵頭','碎星','白目王'];
 const GENDER_NAMES=[['阿翔哥','阿凱','老王出擊','大叔來了','型男一號'],['血色玫瑰','奶茶微糖','小公主喵','櫻花雨','甜心兔']];
 const CLASS_NAMES={騎士:{any:['小騎士','鐵壁騎士','聖光之盾'],m:['重甲阿強'],f:['女武神']},法師:{any:['魔導研究生','火球專家','冰封千里'],m:['法師老李'],f:['魔女小玲']},
  妖精:{any:['森林射手','風之箭','月光弓手'],m:['精靈王子'],f:['精靈公主','綠葉小妖']},王族:{any:['血盟君主'],m:['小王子','王者之劍'],f:['公主殿下','女王陛下']},
  戰士:{any:['狂戰','斧頭幫','怒吼戰神'],m:[],f:['戰場女神']},龍騎士:{any:['飛龍騎','龍之血','赤焰龍騎'],m:[],f:['龍騎少女']}};
 const CLANS=['風雲','天堂之戰','傲世','夜城','龍騎團','銀月','狂嵐','聖騎士團'];
 const LINES=['收 +7 長劍 私我','賣 精靈餅乾 便宜賣','組隊打死亡騎士 缺補','有人要一起去龍之谷嗎','升等了 開心','讚啦','剛衝 +8 成功!!!','嗚嗚 +7 蒸發了','說話之島人好多','誰有多的紅水','求帶 新手','6666','今天掉寶好爛','骷髏好硬','奇岩城門口集合','有人看到巴風特嗎','收 魔法娃娃','綠水喝完了 誰有','練功練到睡著','這裡怪被搶光了 哈','回家卷軸剩一張 先回了','妖精的箭好貴','法師沒藍好痛苦','今天要衝到 40 等'];
 const REPLY=[[/組|隊|一起/,['我可以!','+1','等我一下','缺什麼職業?']],[/王|boss|巴風特|死亡騎士/i,['王快出了吧','我也要打!','王在哪?']],[/哈囉|你好|嗨|安安|hi|hello/i,['嗨~','哈囉','安安','新人嗎?']],[/賣|收|買|交易/,['多少?','私我','太貴了吧','我有 等等']],[/強化|衝|\+\d/,['+6 以上小心','祝你過!','蒸發不要哭']],[/殺|PK|pk|紅名/i,['不要殺我啦','紅名去死','來啊']],[/謝/,['不客氣','小事','^^']]];
 const FLEE=['快死了 先跑','血不夠 回村','救命','先回家補一下'];
 const RED_NAMES=['血手','夜梟','狂刀','暗刃','屠夫','毒蛇'],RED_LINES=['嘿嘿 新人','裝備交出來','這條路是我的','跑啊 怎麼不跑','又一個','哈哈哈'],RED_WIN=['嘿嘿 新人','太弱了','下次帶多點紅水','哈哈哈'],RED_PER_MAP=2;
 const isBoss=m=>/BOSS/i.test(m.spawn.npc.name)||(m.spawn.count===1&&m.spawn.npc.hp>=1500);
 const itemById=new Map(INTERFACE_CATALOG.items.map(i=>[i.id,i]));
 const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
 const pick=a=>a[Math.floor(Math.random()*a.length)],rnd=(a,b)=>a+Math.random()*(b-a),ri=(a,b)=>Math.floor(rnd(a,b+1));
 const dist=(ax,ay,bx,by)=>Math.max(Math.abs(ax-bx),Math.abs(ay-by));
 const safe=(x,y)=>(tile(x,y)&48)===16;
 // 玩家不能自行開關假人（使用者 2026-11-14 決定）：永遠開啟，不讀本機設定
 let enabled=true,redOn=true;
 const DUN_LINES=['這層好難','誰有回家卷軸','王在哪','組隊嗎','爆了一個祝福卷!','差點死','上樓上樓','掉寶率真低','這裡好暗','怪好多 小心','紅水快沒了','下一層是什麼'];
 const isDungeon=()=>!!window.WorldMaps?.isDungeon?.(window.activeMapId||0);
 const PER_MAP=12,used=new Set();let mapNow=null;
 function say(mob,text){mob.bubble={text,until:movementTime()+4500};window.GameChat?.say(mob.spawn.npc.name+'：'+text,'say');}
 function spotNear(cx,cy,minR,maxR,wantSafe=null){for(let i=0;i<80;i++){const r=rnd(minR,maxR),a=Math.random()*Math.PI*2,x=Math.round(cx+Math.cos(a)*r),y=Math.round(cy+Math.sin(a)*r);
   if(dist(x,y,worldX,worldY)<minR||!TeleportScrolls.canLand(x,y))continue;if(wantSafe!==null&&safe(x,y)!==wantSafe)continue;return [x,y];}return null;}
 function make(x,y,red=false){const look=pick(looks);const g=A.avatars[look.avatar]?.gender?1:0,cls=CLASS_NAMES[look.role]||{any:[],m:[],f:[]},own=[...cls.any,...(g?cls.f:cls.m)].filter(n=>!used.has(n));
  let name=pick((red?RED_NAMES:own.length&&Math.random()<.35?own:[...NAMES,...GENDER_NAMES[g],...own]).filter(n=>!used.has(n)));if(!name)return null;used.add(name);const lv=red?ri(18,40):ri(5,45);
  const npc={name,kind:'L1Bot',gfx:look.id,level:lv,hp:40+lv*14,mp:0,ac:0,walk:look.weapon==='bow'?600:640,attack:look.attackMs,ranged:RANGED[look.weapon]||1,skills:[],regeneration:null,aggressive:false};
  const mob={spawn:{bot:true,mapId:window.activeMapId||0,npc,heading:ri(0,7),respawn:[0,0]},region:[x-50,y-50,x+50,y+50],x,y,homeX:x,homeY:y,hp:npc.hp,heading:ri(0,7),rest:0,phase:Math.random()*1800,step:null,
   fp:{look,red,clan:red?'血月':Math.random()<.8?pick(CLANS):null,state:safe(x,y)?'town':'hunt',think:0,chatAt:movementTime()+rnd(6000,40000),ready:0,target:null,since:movementTime(),pk:false,pkCd:movementTime()+rnd(20000,60000)}};
  preloadLook(look);IslandMonsters.addAlly(mob);return mob;}
 const preloaded=new Set();
 function preloadLook(look){if(preloaded.has(look.id))return;preloaded.add(look.id);const files=new Set();for(const list of Object.values(islandMonsterFrames[look.id]||{}))for(const f of list)files.add(f[0]);IslandMonsters.preload([...files]);}
 function place(mob,x,y){mob.x=mob.homeX=x;mob.y=mob.homeY=y;mob.step=null;mob.fp.target=null;mob.fp.state=safe(x,y)?'town':'hunt';mob.fp.since=movementTime();mob.spawn.mapId=window.activeMapId||0;}
 function bots(){return IslandMonsters.botList.filter(m=>(m.spawn.mapId||0)===(window.activeMapId||0));}
 // 人數維持與換位置（每 2 秒）
 function maintain(){
  if(window.gameFlowState!=='playing'||!sceneStarted||!looks.length)return;
  const map=window.activeMapId||0;if(map!==mapNow){mapNow=map;}
  const list=bots();
  if(!enabled){for(const b of IslandMonsters.botList){IslandMonsters.removeAlly(b);used.delete(b.spawn.npc.name);}return;}
  for(const b of list)if(dist(b.x,b.y,worldX,worldY)>28&&!b.step&&!b.fp.vanish&&!b.fp.stall){const s=spotNear(worldX,worldY,16,22,b.fp.red?false:null);if(s){place(b,...s);b.fp.pk=false;}}
  if(!redOn)for(const b of list.filter(b=>b.fp.red)){IslandMonsters.removeAlly(b);used.delete(b.spawn.npc.name);if(IslandMonsters.target===b){IslandMonsters.setTarget(null);IslandCombat.stop();}}
  const reds=redOn?list.filter(b=>b.fp.red).length:RED_PER_MAP;
  // 擺攤：附近有安全區（村莊）時一個假人固定擺攤；離開太遠就收攤換人
  const stall=list.find(b=>b.fp.stall);
  if(stall&&dist(stall.x,stall.y,worldX,worldY)>26){stall.fp.stall=null;stall.fp.state='town';}
  if(!stall&&!isDungeon()){const s=spotNear(worldX,worldY,3,14,true);const b=s&&list.find(b=>!b.fp.red&&!b.fp.vanish&&!b.fp.target&&b.fp.state!=='boss');if(b){place(b,...s);b.fp.stall=genStall();b.fp.shoutAt=movementTime()+rnd(3000,9000);}}
  if(reds<RED_PER_MAP){const s=spotNear(worldX,worldY,16,22,false);if(s)make(...s,true);}
  else if(list.length<PER_MAP){const s=spotNear(worldX,worldY,list.length<PER_MAP/2?8:16,20);if(s)make(...s);}
 }
 setInterval(maintain,2000);
 // ---- 每隻假人的行為（island-monsters.js advance 呼叫） ----
 const claimed=new WeakMap();
 function face(mob,tx,ty){const dx=Math.sign(tx-mob.x),dy=Math.sign(ty-mob.y),h=[[0,-1],[1,-1],[1,0],[1,1],[0,1],[-1,1],[-1,0],[-1,-1]].findIndex(([x,y])=>x===dx&&y===dy);if(h>=0)mob.heading=h;}
 function wander(mob,now,stepToward,r){const f=mob.fp;if(now<f.think)return;f.think=now+rnd(1500,5000);if(Math.random()<.35)return;
  for(let i=0;i<6;i++){const x=mob.homeX+ri(-r,r),y=mob.homeY+ri(-r,r);if(stepToward(mob,x,y,now)){f.goal=[x,y];return;}}}
 function update(mob,now,stepToward){
  const f=mob.fp;if(!f)return;
  if(mob.bubble&&now>mob.bubble.until)mob.bubble=null;
  if(now>=f.chatAt){f.chatAt=now+rnd(20000,70000);if(Math.random()<.55&&dist(mob.x,mob.y,worldX,worldY)<=18&&!f.stall)say(mob,pick(isDungeon()?DUN_LINES:LINES));}
  if(f.vanish){if(now>=f.vanish){f.vanish=0;f.hidden=false;f.pk=false;mob.hp=mob.spawn.npc.hp;const s=f.red?spotNear(worldX,worldY,16,22,false):spotNear(worldX,worldY,16,22,true)||spotNear(worldX,worldY,16,22);if(s)place(mob,...s);}return;}
  if(mob.step)return;
  if(f.stall){mob.hp=mob.spawn.npc.hp;if(now>=f.shoutAt){f.shoutAt=now+rnd(40000,90000);shout(mob);}if(now>=f.stall.restock||!f.stall.items.length)f.stall=genStall();return;}
  if(f.red&&pk(mob,now,stepToward))return;
  // 打王：王出現在你附近時集合
  const lvl=mob.spawn.npc.level;
  if(!f.red&&lvl>=14&&f.state!=='boss'&&now>=(f.bossLook||0)){f.bossLook=now+3000;const boss=IslandMonsters.around(worldX,worldY,30).find(isBoss);
   if(boss&&Math.random()<.2){claimed.delete(f.target);f.state='boss';f.boss=boss;f.target=boss;f.goal=null;if(Math.random()<.45)say(mob,pick(['王出了!集合!','衝王!','打王打王','有王!']));}}
  if(f.state==='boss'){if(!f.boss?.hp||dist(mob.x,mob.y,f.boss.x,f.boss.y)>40){if(f.boss&&!f.boss.hp&&Math.random()<.4)say(mob,pick(['王倒了!!','太爽了','有掉什麼嗎']));f.state='hunt';f.boss=null;f.target=null;}else f.target=f.boss;}
  // 繼續走向目標點（每步走完一格，下一格接著走）
  if(f.goal&&!f.target){if(dist(mob.x,mob.y,...f.goal)<=0||!stepToward(mob,...f.goal,now))f.goal=null;return;}
  if(f.state==='town'){
   wander(mob,now,stepToward,5);
   if(now-f.since>rnd(25000,70000)){f.state='hunt';f.since=now;const s=spotNear(mob.x,mob.y,8,16,false);if(s){mob.homeX=s[0];mob.homeY=s[1];f.goal=s;}}
   return;}
  // 打怪
  if(f.state!=='boss'&&f.target&&(!f.target.hp||dist(mob.x,mob.y,f.target.x,f.target.y)>14||f.target===IslandMonsters.target)){claimed.delete(f.target);f.target=null;}
  if(!f.target&&now>=f.think){f.think=now+800;const lv=mob.spawn.npc.level;
   const c=IslandMonsters.around(mob.x,mob.y,10).filter(m=>!claimed.has(m)&&m!==IslandMonsters.target&&!m.alert&&(m.spawn.npc.level||1)<=lv+4&&!safe(m.x,m.y))
    .sort((a,b)=>dist(mob.x,mob.y,a.x,a.y)-dist(mob.x,mob.y,b.x,b.y))[0];
   if(c){f.target=c;claimed.set(c,mob);}else{const far=IslandMonsters.around(mob.x,mob.y,24).filter(m=>!claimed.has(m)&&!safe(m.x,m.y)&&(m.spawn.npc.level||1)<=lv+4).sort((a,b)=>dist(mob.x,mob.y,a.x,a.y)-dist(mob.x,mob.y,b.x,b.y))[0];if(far){mob.homeX=far.x;mob.homeY=far.y;f.goal=[far.x,far.y];return;}wander(mob,now,stepToward,8);if(now-f.since>rnd(60000,120000)&&Math.random()<.4){f.state='town';f.since=now;}}}
  const t=f.target;if(!t)return;
  const reach=mob.spawn.npc.ranged||1,d=dist(mob.x,mob.y,t.x,t.y);
  if(d>reach||!IslandCombat.clearShot(mob.x,mob.y,t.x,t.y)){if(!stepToward(mob,t.x,t.y,now)){claimed.delete(t);f.target=null;f.think=now+1500;}return;}
  if(d===0){for(const [dx,dy] of [[1,0],[0,1],[-1,0],[0,-1]])if(stepToward(mob,mob.x+dx*2,mob.y+dy*2,now))return;}
  if(now<f.ready)return;
  face(mob,t.x,t.y);const dur=f.look.attackMs;mob.action={clip:'attack',start:now,end:now+dur};f.ready=now+dur+rnd(150,500);
  const lv=mob.spawn.npc.level;
  if(reach>1)shoot(mob,t,now+dur*.45,f.look.weapon);
  setTimeout(()=>{if(!t.hp||!mob.hp)return;IslandMonsters.botHit(t,ri(3,9)+Math.floor(lv*.6));if(!t.hp){claimed.delete(t);if(f.target===t)f.target=null;loot(mob,t);if(Math.random()<.08)say(mob,pick(['又一隻','好爽','經驗+1','掉寶吧拜託']));}},dur*.45);
  // 怪物反擊（簡化：不真的追打，只扣假人血）
  if(Math.random()<.5){mob.hp=Math.max(1,mob.hp-ri(1,Math.max(3,Math.floor((t.spawn.npc.level||1)*1.2))));f.hpShow=now+3000;}
  if(mob.hp<mob.spawn.npc.hp*.25){claimed.delete(t);f.target=null;f.state=f.state==='boss'?'hunt':f.state;f.boss=null;if(Math.random()<.6)say(mob,pick(FLEE));f.vanish=now+1600;setTimeout(()=>{if(mob.fp.vanish)IslandMonsters.playEffect(169,mob.x,mob.y,movementTime());},1500);}
 }
 // ---- 紅名 PK ----
 function pk(mob,now,stepToward){const f=mob.fp,name=mob.spawn.npc.name,lv=mob.spawn.npc.level,pd=dist(mob.x,mob.y,worldX,worldY);
  const ok=window.gameFlowState==='playing'&&!CharacterActions.dead&&!safe(worldX,worldY);
  if(f.pk){
   if(!ok||pd>14||safe(mob.x,mob.y)){if(CharacterActions.dead)say(mob,pick(RED_WIN));f.pk=false;f.pkCd=now+rnd(45000,90000);return false;}
   const reach=mob.spawn.npc.ranged||1;
   if(pd===0){for(const [dx,dy] of [[1,0],[0,1],[-1,0],[0,-1]])if(stepToward(mob,mob.x+dx*2,mob.y+dy*2,now))return true;}
   if(pd>reach||!IslandCombat.clearShot(mob.x,mob.y,worldX,worldY)){stepToward(mob,worldX,worldY,now);return true;}
   if(now<f.ready)return true;
   face(mob,worldX,worldY);const dur=f.look.attackMs;mob.action={clip:'attack',start:now,end:now+dur};f.ready=now+dur+rnd(200,600);
   if(reach>1)shoot(mob,{x:worldX,y:worldY},now+dur*.45,f.look.weapon);
   setTimeout(()=>{if(!f.pk||CharacterActions.dead||safe(worldX,worldY))return;
    const ac=typeof previewArmorClass==='function'?Number(previewArmorClass())||10:10,plv=window.activeCharacterLevel||1;
    if(Math.random()<clamp(.6+(lv-plv)*.02+(ac-10)*.025,.1,.95)){CharacterActions.damage(ri(3,9)+Math.floor(lv*.6)+4,{animate:!movementAnimating()&&!navigationPath.length});
     if(CharacterActions.dead){say(mob,pick(RED_WIN));window.GameChat?.say('【系統】你被紅名 '+name+' 擊倒了。','sys');f.pk=false;f.pkCd=movementTime()+rnd(60000,120000);}}},dur*.45);
   return true;}
  if(now>=f.pkCd&&ok&&!safe(mob.x,mob.y)&&pd<=8&&IslandCombat.clearShot(mob.x,mob.y,worldX,worldY)){f.pk=true;claimed.delete(f.target);f.target=null;f.goal=null;f.pkCd=now+rnd(45000,90000);say(mob,pick(RED_LINES));window.GameChat?.say('【警告】'+name+'（紅名）盯上你了！','sys');window.toast?.(name+'（紅名）盯上你了！');return true;}
  return false;}
 // 玩家打到假人（只有紅名能被點選）：被打就反擊；打倒得金幣，消失一分鐘
 function hurt(mob,amount){const f=mob.fp;if(!f||f.hidden||!mob.hp)return;mob.hp=Math.max(0,mob.hp-Math.max(1,Math.floor(amount)));f.hpShow=movementTime()+3000;window.CombatSound?.monsterHit?.(mob);
  if(f.red&&!f.pk&&mob.hp>0&&!CharacterActions.dead){f.pk=true;f.target=null;f.goal=null;say(mob,pick(['你敢打我?','找死','來啊']));}
  if(mob.hp>0)return;
  const gold=mob.spawn.npc.level*40;IslandMonsters.playEffect(169,mob.x,mob.y,movementTime());
  window.OwnedInventory?.receive('etcitem',40308,gold);
  window.GameChat?.say('【系統】你擊敗了紅名 '+mob.spawn.npc.name+'！獲得 '+gold.toLocaleString()+' 金幣。','sys');window.toast?.('擊敗紅名 '+mob.spawn.npc.name+'，獲得 '+gold.toLocaleString()+' 金幣');
  mob.hp=mob.spawn.npc.hp;f.pk=false;f.target=null;f.goal=null;f.hidden=true;f.vanish=movementTime()+60000;mob.bubble=null;
  if(IslandMonsters.target===mob){IslandMonsters.setTarget(null);IslandCombat.stop();}}
 // 寶物公告：照怪物掉寶表擲骰（只看掉率 ≤ 2% 的道具，機率 ×2）
 function loot(mob,t){const drops=(typeof killRewardData!=='undefined'?killRewardData:window.killRewardData)?.drops?.[t.spawn.npcId]||[];
  for(const d of drops){if(d.id===40308||!(d.chance>0)||d.chance>20000||Math.random()*1e6>=d.chance*2)continue;const item=itemById.get(d.id);if(!item)continue;
   window.GameChat?.say('【全服】'+mob.spawn.npc.name+' 打倒了 '+t.spawn.npc.name+'，獲得了【'+item.name+'】！','drop');
   if(dist(mob.x,mob.y,worldX,worldY)<=18)say(mob,pick(['哈哈哈 我的了!!!','發財了','感謝施主','出了出了!!']));return;}}
 // ---- 遠程飛行物：妖精的箭、法師的魔法彈 ----
 const shots=[];
 function shoot(mob,t,at,weapon){shots.push({fx:mob.x,fy:mob.y,tx:t.x,ty:t.y,start:at,end:at+Math.max(160,dist(mob.x,mob.y,t.x,t.y)*55),kind:weapon==='bow'?'arrow':'bolt',map:window.activeMapId||0});if(shots.length>40)shots.shift();}
 function drawShots(pen,view,now){if(!shots.length)return;const s=typeof characterRenderScale==='function'?characterRenderScale():1;
  for(let i=shots.length-1;i>=0;i--){const k=shots[i];if(now>=k.end||k.map!==(window.activeMapId||0)){shots.splice(i,1);continue;}if(now<k.start)continue;
   const p=(now-k.start)/(k.end-k.start),wx=k.fx+(k.tx-k.fx)*p,wy=k.fy+(k.ty-k.fy)*p,[px,py]=project(wx,wy),x=px*view.zoom+view.ox,y=py*view.zoom+view.oy-34*s;
   const [qx,qy]=project(k.tx,k.ty),ang=Math.atan2(qy*view.zoom+view.oy-34*s-y,qx*view.zoom+view.ox-x);
   pen.save();pen.translate(x,y);pen.rotate(ang);
   if(k.kind==='arrow'){pen.strokeStyle='#e8dcb0';pen.lineWidth=2*s;pen.beginPath();pen.moveTo(-12*s,0);pen.lineTo(8*s,0);pen.stroke();pen.fillStyle='#f4f0e0';pen.beginPath();pen.moveTo(10*s,0);pen.lineTo(5*s,-3*s);pen.lineTo(5*s,3*s);pen.fill();}
   else{const g=pen.createRadialGradient(0,0,0,0,0,9*s);g.addColorStop(0,'rgba(220,240,255,1)');g.addColorStop(.4,'rgba(120,190,255,.9)');g.addColorStop(1,'rgba(60,120,255,0)');pen.fillStyle=g;pen.beginPath();pen.arc(0,0,9*s,0,Math.PI*2);pen.fill();}
   pen.restore();}}
 // ---- 擺攤商人 ----
 // 商店資料（native-npc-dialog-data.js）比這支晚載入，第一次擺攤時才建價目表
 let SHOP_PRICE=null,stallPool=[],usefulPool=[];
 function prices(){if(SHOP_PRICE)return;SHOP_PRICE=new Map();for(const rows of [...Object.values((typeof NATIVE_NPC_DIALOGS!=='undefined'?NATIVE_NPC_DIALOGS:null)?.shops||{}),(typeof islandNpcServiceData!=='undefined'?islandNpcServiceData:null)?.shop||[]])for(const [id,,buy,pack,,ench] of rows){if(!(buy>0)||ench||id===40308)continue;const unit=buy/Math.max(1,pack|0);if(!SHOP_PRICE.has(id)||unit<SHOP_PRICE.get(id))SHOP_PRICE.set(id,unit);}
  stallPool=[...SHOP_PRICE.keys()].filter(id=>itemById.get(id)?.icon&&SHOP_PRICE.get(id)>=5&&SHOP_PRICE.get(id)<=30000);
  usefulPool=stallPool.filter(id=>{const it=itemById.get(id),h=ITEM_USE_RULES.definitions[it.kind+':'+id]?.handler||'';return /^(hp.|mp.|brave.|teleport.)/.test(h)||it.type==='arrow'});}
 function genStall(){prices();const items=[],n=ri(3,5),ids=new Set();while(items.length<n&&ids.size<stallPool.length){const id=pick(usefulPool.length&&Math.random()<.7?usefulPool:stallPool);/* 七成賣實用品：藥水、卷軸、箭 */if(ids.has(id))continue;ids.add(id);const item=itemById.get(id),stack=!!ITEM_USE_RULES.definitions[item.kind+':'+id]?.stackable;
   const unit=SHOP_PRICE.get(id),qty=stack?Math.max(1,Math.min(pick([5,10,20,50,100]),Math.floor(200000/unit))):1,price=Math.max(1,Math.round(unit*rnd(.9,1.6)));items.push({id,key:item.kind+':'+id,qty,price});}
  return {items,restock:movementTime()+rnd(240000,420000)};}
 function shout(mob){const it=mob.fp.stall?.items?.[0]&&pick(mob.fp.stall.items);if(!it)return;const name=itemById.get(it.id)?.name||'道具';
  say(mob,'【賣】'+name+(it.qty>1?' ×'+it.qty:'')+' '+it.price.toLocaleString()+' 金');}
 let stallWin=null;
 function openStall(mob){if(window.gameFlowState!=='playing')return;stallWin?.remove();const f=mob.fp;if(!f?.stall)return;
  const el=(t,c,x)=>uiElement(t,c,x),w=el('section','fp-stall');w.style.zIndex=String(window.FloatingWindows?.frontLevel?.()||40);
  const head=el('div','fp-stall-head'),x=el('button','','✕');x.type='button';x.onclick=()=>{w.remove();stallWin=null;};head.append(el('b','',mob.spawn.npc.name+' 的攤位'),x);
  const list=el('div','fp-stall-list'),msg=el('div','fp-stall-msg');
  const gold=()=>OwnedInventory.items.filter(e=>e.key==='etcitem:40308').reduce((n,e)=>n+e.count,0);
  function render(){list.replaceChildren();for(const it of f.stall.items){const item=itemById.get(it.id),row=el('div','fp-stall-row'),buy=el('button','','買 1 個');buy.type='button';
    row.append(itemIcon(item),el('span','nm',item.name+(it.qty>1?'（剩 '+it.qty+'）':'')),el('span','pr',it.price.toLocaleString()+' 金'),buy);
    buy.disabled=gold()<it.price;buy.onclick=()=>{if(dist(mob.x,mob.y,worldX,worldY)>8){msg.textContent='離攤位太遠了。';return;}const err=OwnedInventory.trade(it.key,1,it.price,false);
     if(err){msg.textContent=err;return;}it.qty--;if(!it.qty)f.stall.items.splice(f.stall.items.indexOf(it),1);msg.textContent='買到 '+item.name+'。';if(Math.random()<.5)say(mob,pick(['謝謝惠顧','感謝老闆','歡迎再來']));render();};
    list.append(row);}
   if(!f.stall.items.length)list.append(el('div','fp-stall-msg','賣完了，等老闆補貨。'));msg.dataset.gold='目前金幣 '+gold().toLocaleString();}
  w.append(head,list,msg);game.append(w);stallWin=w;render();msg.textContent='目前金幣 '+gold().toLocaleString();}
 const stallCss=document.createElement('style');stallCss.textContent='.fp-stall{position:absolute;left:50%;top:50%;transform:translate(-50%,-50%);width:min(340px,92%);padding:8px 10px 10px;box-sizing:border-box;pointer-events:auto;background:linear-gradient(#1b1d21,#121417);border:1px solid #6e5a33;border-radius:8px;box-shadow:0 10px 30px #000c;color:#e8dcc0}'
  +'.fp-stall-head{display:flex;align-items:center;justify-content:space-between;margin-bottom:6px}.fp-stall-head b{color:#f0cf7c;font-size:15px}.fp-stall-head button{width:26px;height:24px;min-height:0!important;padding:0!important;background:linear-gradient(#4a3d26,#2a2216)!important;border:1px solid #9b8150!important;border-radius:4px;color:#f0dcae!important}'
  +'.fp-stall-list{display:grid;gap:5px;max-height:52vh;overflow:auto}.fp-stall-row{display:flex;align-items:center;gap:8px;padding:5px 8px;background:#0e0f11;border:1px solid #2e2c28;border-radius:6px;font-size:13px}'
  +'.fp-stall-row img{width:28px;height:28px;object-fit:contain;image-rendering:pixelated}.fp-stall-row .nm{flex:1;min-width:0}.fp-stall-row .pr{color:#ffd77a;font-variant-numeric:tabular-nums}'
  +'.fp-stall-row button{min-height:0!important;height:26px;padding:0 10px!important;font-size:12px!important;background:linear-gradient(#5e4c2a,#3b2f1b)!important;color:#ffe2a0!important;border:1px solid #a3864d!important;border-radius:5px!important}.fp-stall-row button:disabled{opacity:.45}'
  +'.fp-stall-msg{margin-top:6px;text-align:center;font-size:12px;color:#c9bd9c;min-height:16px}';document.head.append(stallCss);
 // ---- 名牌與對話泡泡（island-monsters.js 繪製時呼叫） ----
 function label(pen,mob,x,y,now){if(mob.fp?.vanish&&now>=mob.fp.vanish-150)return;y+=36*(typeof characterRenderScale==='function'?characterRenderScale():1); /* 影格上方留了武器揮動的空間，名牌往下貼近頭頂 */
  const name=mob.spawn.npc.name,clan=mob.fp?.clan;pen.textAlign='center';pen.lineWidth=3;pen.strokeStyle='#101010';
  pen.font='12px sans-serif';pen.fillStyle=mob.fp?.red?'#ff6a5a':'#e9f1ff';pen.strokeText(name,x,y);pen.fillText(name,x,y);
  let top=y-14;
  if(mob.fp?.stall){pen.font='10px sans-serif';pen.fillStyle='#ffd77a';pen.strokeText('【擺攤中】點我購買',x,y+13);pen.fillText('【擺攤中】點我購買',x,y+13);pen.font='12px sans-serif';}
  if(mob.fp?.hpShow>now){const w=36,h=4,r=Math.max(0,mob.hp/mob.spawn.npc.hp);pen.fillStyle='#1a1410';pen.fillRect(x-w/2-1,y+3,w+2,h+2);pen.fillStyle=mob.fp.red?'#e04030':'#c83a32';pen.fillRect(x-w/2,y+4,w*r,h);}
  if(clan){pen.font='10px sans-serif';pen.fillStyle=mob.fp?.red?'#d05050':'#9fd18b';pen.strokeText('['+clan+']',x,top);pen.fillText('['+clan+']',x,top);top-=13;}
  const b=mob.bubble;if(b&&now<b.until){pen.font='12px sans-serif';const w=Math.min(190,pen.measureText(b.text).width+14),h=20,bx=x-w/2,by=top-h-2;
   pen.fillStyle='rgba(255,252,240,.94)';pen.strokeStyle='#5a4a2a';pen.lineWidth=1;pen.beginPath();pen.roundRect?pen.roundRect(bx,by,w,h,6):pen.rect(bx,by,w,h);pen.fill();pen.stroke();
   pen.fillStyle='#2a2216';pen.fillText(b.text.length>14?b.text.slice(0,14)+'…':b.text,x,by+14);}
 }
 // ---- 回話 ----
 document.addEventListener('player-chat',e=>{const text=String(e.detail||'');for(const [re,ans] of REPLY){if(!re.test(text))continue;
  const near=bots().filter(b=>!b.fp?.vanish&&dist(b.x,b.y,worldX,worldY)<=20);if(near.length)setTimeout(()=>say(pick(near),pick(ans)),rnd(900,2200));break;}});
 function setEnabled(on){enabled=!!on;maintain();}
 function setRed(on){redOn=!!on;maintain();}
 return {update,label,hurt,drawShots,openStall,setRed,get redOn(){return redOn;},get count(){return bots().length;},get enabled(){return enabled;},setEnabled,looks};
})();window.FakePlayers=FakePlayers;
