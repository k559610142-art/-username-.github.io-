// 假玩家（2026-11-14 第 1 期，參考使用者另一款遊戲「龍脈紀元」的假人）：讓單機地圖看起來有其他玩家。
//  外觀：原版 8 種角色動作圖（CHARACTER_ACTION_ASSETS：騎士、法師、王族、妖精 × 男女），轉成怪物影格格式（[檔, x, y, w, h, 毫秒, sx, sy]）
//   掛在 islandMonsterFrames 的虛擬外觀編號 990000＋，所以沿用 island-monsters.js 的繪製、尋路與走路（spawn.bot）。
//  行為：村莊（安全區）閒逛；野外找附近、等級合適、沒被你鎖定的怪打（近戰／妖精射箭／法師遠距），
//   用 IslandMonsters.botHit 扣血（不激怒怪打你、不給你經驗）；血量低於 25% 喊一句後用回家卷軸消失，過一陣子在你附近重新出現。
//  人數：每張地圖約 12 人，散在你周圍 8～20 格；離你超過 28 格的會換到你附近 16～22 格（假人跟怪物一樣只有在你 22 格內才會動）。
//  聊天：每 20～70 秒有機會說一句（頭上泡泡＋訊息框「一般」）；你在訊息框打字提到 組隊／王／買賣／強化／你好／PK 時，附近假人會回話。
//  不能點選、不會被 AUTO／技能選到、不會被怪打死。
// 第 4 期（2026-11-14 使用者規則）：
//  名單存檔：一般假人的名字、外觀、等級、血盟存在 localStorage lineage-fake-roster，重登後同一批人回來（位置仍在你附近）。
//  擺攤商人：約 55 人的商人池（名字＝人名＋店名，跟外觀性別對得上），時間表存在 localStorage lineage-fake-stalls，照真實時間走（重登不影響）：
//   每次擺 30 分鐘～3 小時，到時間就下線消失；下線 3 小時後才再出來，開攤那一刻才決定去「奇岩村莊」（約 8 成）或「銀騎士村莊」，不固定點；
//   同時在攤人數不固定：奇岩上限 20、平常 10～20 人；銀騎士上限 6、平常 1～6 人（兩村都滿就這輪不擺）。
//   擺攤時只喊【賣】／【收】，不聊天、不回公開對話、不回密語；點他開攤位：可以買他賣的，也可以把他收的東西賣給他。
//  時間線（2026-11-14 使用者規則）：localStorage lineage-fake-world-start 記開服第一天，強化值跟著天數慢慢變高：
//   第 1 天沒有強化裝備、第 2 天 +3、第 3 天 +4、第 4～5 天 +5、第 6～7 天 +6、第 8～13 天 +7、第 14 天起 +8（防具最多 +6）；聊天台詞的 +N 也照這個過濾。
//  強化裝備：只賣一般人會衝的（長劍、銀長劍、大馬士革刀、武士刀、雙手劍、巨劍、闊矛、戰斧、巨斧；鋼盔、騎士面甲、抗魔斗篷、金屬盔甲、鱗甲、
//   鋼鐵手套、鋼鐵長靴、大盾、塔盾），不賣匕首、弓、皮甲；價格照衝裝成本：武捲 8 萬、防捲 4 萬，+7 武器約 100～150 萬。不賣高級、稀有裝備。
//  收購（防洗錢）：只收對武器施法的卷軸（7.5～7.9 萬）、對盔甲施法的卷軸（3.7～3.95 萬），一攤最多收幾張，收購價一定低於任何攤位賣價與商店價。
// 第 3 期（2026-11-14）：（設定開關已拿掉，玩家不能控制假人）；妖精箭矢／法師魔法彈飛行特效（drawShots）；
//  假人被打時頭上短暫顯示血條；地監裡說地監台詞；擺攤商人：玩家附近有安全區時 1 個假人在安全區固定擺攤，
//  3～5 件貨（NPC 商店有賣的東西，價格 0.9～1.6 倍），每 40～90 秒喊「【賣】…」，點他打開攤位用金幣買，賣完或 4～7 分鐘換貨。
// 第 2 期（2026-11-14）：
//  紅名：每張地圖 2 個（血手、夜梟…，血盟「血月」，只有名字紅色、身體不染色），只在野外；冷卻到了且你在野外 8 格內就盯上你
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
   const id=gfxId++;islandMonsterFrames[id]=frames;looks.push({id,avatar,role:a.role,weapon,walkProfile:window.SPRITE_MOVEMENT?.profiles[a.role+':'+(a.gender?1:0)]?.actions[A.weapons[weapon].base],attackMs:a.timelines[weapon+'_attack'].frames.reduce((s,f)=>s+Math.max(1,f.ticks)*TICK,0)});
  }
 }
 // ---- 名字、血盟、台詞 ----
 // 名字跟職業、性別要對得上（使用者 2026-11-14：王子叫「法師老李」不合理）：通用名＋性別名＋職業名，職業名只給那個職業
 const NAMES=['夜行俠','小雨點','劍無痕','黑貓貓','星辰雨','月下影','冰咖啡','焦糖布丁','北風','米漿加蛋','風之谷','咖哩飯','孤狼','雷霆一擊','無名氏','天堂老玩家','肝帝','打寶仔','紅水不夠','閃電貂','銀色月光','喵喵拳','鐵頭','碎星','白目王'];
 const GENDER_NAMES=[['阿翔哥','阿凱','老王出擊','大叔來了','型男一號'],['血色玫瑰','奶茶微糖','小公主喵','櫻花雨','甜心兔']];
 // 擺攤商人名字：人名（男／女／通用）＋店名
 const STALL_FIRST=[['阿福','老張','大雄','阿明','胖虎','老陳','阿德','阿勇','老林','阿達','老吳','阿財','大頭'],['小美','小芳','阿珠','小翠','小倩','米米','阿花','小琪','阿蓮','小鳳'],['肥貓','小黑','阿寶','招財貓','大福','金元寶','旺旺']];
 const STALL_SHOP=['雜貨','商行','小舖','批發','二手','百貨','賣場','當舖','的店','便宜賣','老店','工作室'];
 const stallNames=()=>new Set((stalls||[]).map(s=>s.name));
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
 function say(mob,text){mob.bubble={text,until:movementTime()+4500};if(mob.fp)mob.fp.lastLine=text;window.GameChat?.say(mob.spawn.npc.name+'：'+text,'say');window.NpcSocial?.onSpeech(mob,text);}
 function spotNear(cx,cy,minR,maxR,wantSafe=null){for(let i=0;i<80;i++){const r=rnd(minR,maxR),a=Math.random()*Math.PI*2,x=Math.round(cx+Math.cos(a)*r),y=Math.round(cy+Math.sin(a)*r);
   if(dist(x,y,worldX,worldY)<minR||!TeleportScrolls.canLand(x,y))continue;if(wantSafe!==null&&safe(x,y)!==wantSafe)continue;return [x,y];}return null;}
 const ROSTER_KEY='lineage-fake-roster',STALL_KEY='lineage-fake-stalls';
 const loadJson=k=>{try{const v=JSON.parse(localStorage.getItem(k));return Array.isArray(v)?v:null}catch{return null}};
 const saveJson=(k,v)=>{try{localStorage.setItem(k,JSON.stringify(v))}catch{}};
 const lookKey=l=>l.avatar+'|'+l.weapon,lookOf=k=>looks.find(l=>lookKey(l)===k);
 // 約四成有血盟、六成無血盟；舊名單只調整一次，重登不重抽。
 const rollClan=red=>Math.random()<.4?(red?'血月':pick(CLANS)):null;
 function migrateClans(list,key){let changed=false;for(const r of list)if(r.clanV!==1){r.clan=Math.random()<.4?(r.clan||(r.red?'血月':pick(CLANS))):null;r.clanV=1;changed=true;}if(changed)saveJson(key,list);}
 let roster=loadJson(ROSTER_KEY)||[];
 migrateClans(roster,ROSTER_KEY);
 function remember(mob){const r={name:mob.spawn.npc.name,look:lookKey(mob.fp.look),lv:mob.spawn.npc.level,clan:mob.fp.clan,clanV:1,red:!!mob.fp.red};roster=[r,...roster.filter(x=>x.name!==r.name)].slice(0,40);saveJson(ROSTER_KEY,roster);}
 function make(x,y,red=false){
  const saved=roster.find(r=>!used.has(r.name)&&!!r.red===red&&lookOf(r.look)&&!stallNames().has(r.name));
  const look=saved?lookOf(saved.look):pick(looks);const g=A.avatars[look.avatar]?.gender?1:0,cls=CLASS_NAMES[look.role]||{any:[],m:[],f:[]},own=[...cls.any,...(g?cls.f:cls.m)].filter(n=>!used.has(n));
  let name=saved?saved.name:pick((red?RED_NAMES:own.length&&Math.random()<.35?own:[...NAMES,...GENDER_NAMES[g],...own]).filter(n=>!used.has(n)));if(!name)return null;used.add(name);const lv=saved?saved.lv:red?ri(18,40):ri(5,45);
  const npc={name,kind:'L1Bot',gfx:look.id,level:lv,hp:40+lv*14,mp:0,ac:0,walk:look.walkProfile?.stepMs||640,attack:look.attackMs,ranged:RANGED[look.weapon]||1,skills:[],regeneration:null,aggressive:false};
  const mob={spawn:{bot:true,mapId:window.activeMapId||0,npc,heading:ri(0,7),respawn:[0,0]},region:[x-50,y-50,x+50,y+50],x,y,homeX:x,homeY:y,hp:npc.hp,heading:ri(0,7),rest:0,phase:Math.random()*1800,step:null,
   fp:{look,red,clan:rollClan(red),state:safe(x,y)?'town':'hunt',think:0,chatAt:movementTime()+rnd(6000,40000),ready:0,target:null,since:movementTime(),pk:false,pkCd:movementTime()+rnd(20000,60000)}};
  if(saved)mob.fp.clan=saved.clan;
  preloadLook(look);IslandMonsters.addAlly(mob);remember(mob);return mob;}
 const preloaded=new Set();
 function preloadLook(look){if(preloaded.has(look.id))return;preloaded.add(look.id);const files=new Set();for(const list of Object.values(islandMonsterFrames[look.id]||{}))for(const f of list)files.add(f[0]);IslandMonsters.preload([...files]);}
 function place(mob,x,y){mob.x=mob.homeX=x;mob.y=mob.homeY=y;mob.step=null;mob.fp.route=null;mob.fp.goal=null;mob.fp.target=null;mob.fp.state=safe(x,y)?'town':'hunt';mob.fp.since=movementTime();mob.spawn.mapId=window.activeMapId||0;}
 function bots(){return IslandMonsters.botList.filter(m=>(m.spawn.mapId||0)===(window.activeMapId||0));}
 // 人數維持與換位置（每 2 秒）
 function maintain(){
  if(window.gameFlowState!=='playing'||!sceneStarted||!looks.length)return;
  const map=window.activeMapId||0;if(map!==mapNow){mapNow=map;}
  const list=bots();
  if(!enabled){for(const b of IslandMonsters.botList){IslandMonsters.removeAlly(b);used.delete(b.spawn.npc.name);}return;}
  for(const b of list)if(dist(b.x,b.y,worldX,worldY)>28&&!b.step&&!b.fp.vanish&&!b.fp.stall&&!b.fp.social&&!b.fp.partyOwner){const s=spotNear(worldX,worldY,16,22,b.fp.red?false:null);if(s){place(b,...s);b.fp.pk=false;}}
  if(!redOn)for(const b of list.filter(b=>b.fp.red)){IslandMonsters.removeAlly(b);used.delete(b.spawn.npc.name);if(IslandMonsters.target===b){IslandMonsters.setTarget(null);IslandCombat.stop();}}
  const reds=redOn?list.filter(b=>b.fp.red).length:RED_PER_MAP;
  stallTick();
  // 紅名找不到野外位置（例如人在大村莊中央）時，照樣補一般假人，不然村裡一個路人都沒有
  const redSpot=reds<RED_PER_MAP&&spotNear(worldX,worldY,16,22,false);
  if(redSpot)make(...redSpot,true);
  else{const roam=list.filter(b=>!b.fp.stall).length;if(roam<PER_MAP){const s=spotNear(worldX,worldY,roam<PER_MAP/2?8:16,20);if(s)make(...s);}}
 }
 setInterval(maintain,2000);
 // ---- 每隻假人的行為（island-monsters.js advance 呼叫） ----
 const claimed=new WeakMap();
 function face(mob,tx,ty){const dx=Math.sign(tx-mob.x),dy=Math.sign(ty-mob.y),h=[[0,-1],[1,-1],[1,0],[1,1],[0,1],[-1,1],[-1,0],[-1,-1]].findIndex(([x,y])=>x===dx&&y===dy);if(h>=0)mob.heading=h;}
 function wander(mob,now,stepToward,r){const f=mob.fp;if(now<f.think)return;f.think=now+rnd(1500,5000);if(Math.random()<.35)return;
  for(let i=0;i<6;i++){const x=mob.homeX+ri(-r,r),y=mob.homeY+ri(-r,r);if(stepToward(mob,x,y,now)){f.goal=[x,y];return;}}}
 // 村莊雙向保護：出手與傷害落下時都檢查，踏入安全區立即停戰。
 function canFight(mob){return !!mob?.fp&&!mob.fp.hidden&&!mob.fp.vanish&&!mob.fp.stall&&mob.fp.partyOwner!==window.activeCharacterId&&mob.hp>0&&(mob.spawn.mapId||0)===(window.activeMapId||0)&&!safe(worldX,worldY)&&!(typeof movementTween!=='undefined'&&movementAnimating()&&safe(movementTween.fromTileX,movementTween.fromTileY))&&!safe(mob.x,mob.y)&&(!mob.step||!safe(mob.step.x,mob.step.y));}
 function survival(mob,now,stepToward){
  const f=mob.fp,max=mob.spawn.npc.hp;
  f.potions??=ri(5,12);f.nerve??=rnd(.25,.48);
  if(safe(mob.x,mob.y)){f.potions=Math.max(f.potions,8);}
  if(mob.hp<max*.7&&now>=(f.healAt||0)&&f.potions>0){
   const magic=f.look.role==='法師'&&Math.random()<.5;
   mob.hp=Math.min(max,mob.hp+Math.round(max*(magic ? .3 : .22)));f.potions--;f.healAt=now+(magic?4500:1800);f.hpShow=now+3000;
   f.bubbleHeal=magic?'施放治癒術':'喝下紅色藥水';mob.bubble={text:f.bubbleHeal,until:now+1200};
  }
  const fighting=f.pk||f.target||f.partyTarget;
  if(!f.retreatUntil&&fighting&&mob.hp/max<f.nerve){f.retreatUntil=now+rnd(4000,7500);f.escapeAt=now+rnd(800,2200);f.escapeMap=window.activeMapId||0;f.pk=false;claimed.delete(f.target);f.target=null;f.partyTarget=null;f.boss=null;f.goal=null;f.route=null;f.state='hunt';say(mob,pick(FLEE));}
  if(!f.retreatUntil)return false;
  if(now>=f.escapeAt&&!mob.step){
   const spot=spotNear(mob.x,mob.y,10,20,null);
   if(spot){IslandMonsters.playEffect(169,mob.x,mob.y,now);place(mob,...spot);IslandMonsters.playEffect(169,mob.x,mob.y,now);f.pkCd=now+60000;f.retreatUntil=0;if(IslandMonsters.target===mob){IslandCombat.stop();IslandMonsters.setTarget(null);}return true;}
   f.escapeAt=now+1000;
  }
  if(now>=f.retreatUntil){f.retreatUntil=0;f.pkCd=now+30000;return false;}
  if(!mob.step){const dx=Math.sign(mob.x-worldX)||1,dy=Math.sign(mob.y-worldY);stepToward(mob,mob.x+dx*5,mob.y+dy*5,now);}
  return true;
 }
 function update(mob,now,stepToward){
  const f=mob.fp;if(!f)return;
  if(mob.bubble&&now>mob.bubble.until)mob.bubble=null;
  if(now>=f.chatAt){f.chatAt=now+rnd(20000,70000);if(Math.random()<.55&&dist(mob.x,mob.y,worldX,worldY)<=18&&!f.stall&&!f.social&&!f.partyOwner)say(mob,pick(isDungeon()?DUN_LINES:LINES.filter(lineOk)));}
  if(f.vanish){if(now>=f.vanish){f.vanish=0;f.hidden=false;f.pk=false;mob.hp=mob.spawn.npc.hp;const s=f.red?spotNear(worldX,worldY,16,22,false):spotNear(worldX,worldY,16,22,true)||spotNear(worldX,worldY,16,22);if(s)place(mob,...s);}return;}
  if(!f.stall&&survival(mob,now,stepToward))return;
  if(window.NpcSocial?.update(mob,now,stepToward))return;
  if(mob.step)return;
  if(f.stall){mob.hp=mob.spawn.npc.hp;if(now>=f.shoutAt){f.shoutAt=now+rnd(40000,90000);shout(mob);}return;}
  if((f.red||f.pk)&&pk(mob,now,stepToward))return;
  // 打王：王出現在你附近時集合
  const lvl=mob.spawn.npc.level;
  if(!f.red&&lvl>=14&&f.state!=='boss'&&now>=(f.bossLook||0)){f.bossLook=now+3000;const boss=IslandMonsters.around(worldX,worldY,30).find(isBoss);
   if(boss&&Math.random()<.2){claimed.delete(f.target);f.state='boss';f.boss=boss;f.target=boss;f.goal=null;if(Math.random()<.45)say(mob,pick(['王出了!集合!','衝王!','打王打王','有王!']));}}
  if(f.state==='boss'){if(!f.boss?.hp||dist(mob.x,mob.y,f.boss.x,f.boss.y)>40){if(f.boss&&!f.boss.hp&&Math.random()<.4)say(mob,pick(['王倒了!!','太爽了','有掉什麼嗎']));f.state='hunt';f.boss=null;f.target=null;}else f.target=f.boss;}
  // 繼續走向目標點（每步走完一格，下一格接著走）
  if(f.goal&&!f.target){if(dist(mob.x,mob.y,...f.goal)<=0||!stepToward(mob,...f.goal,now)){f.goal=null;f.think=now+rnd(900,3500);}return;}
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
  setTimeout(()=>{if(!t.hp||!mob.hp||f.hidden||f.retreatUntil||f.target!==t||(mob.spawn.mapId||0)!==(window.activeMapId||0))return;IslandMonsters.botHit(t,ri(3,9)+Math.floor(lv*.6));if(!t.hp){claimed.delete(t);if(f.target===t)f.target=null;loot(mob,t);if(Math.random()<.08)say(mob,pick(['又一隻','好爽','經驗+1','掉寶吧拜託']));}},dur*.45);
  // 怪物反擊（簡化：不真的追打，只扣假人血）
  if(Math.random()<.5){mob.hp=Math.max(1,mob.hp-ri(1,Math.max(3,Math.floor((t.spawn.npc.level||1)*1.2))));f.hpShow=now+3000;}
  survival(mob,now,stepToward);
 }
 // ---- 紅名 PK ----
 function pk(mob,now,stepToward){const f=mob.fp,name=mob.spawn.npc.name,lv=mob.spawn.npc.level,pd=dist(mob.x,mob.y,worldX,worldY);
  const ok=window.gameFlowState==='playing'&&!CharacterActions.dead&&canFight(mob);
  if(f.pk){
   if(!ok||f.enemyId!==window.activeCharacterId||pd>14||safe(mob.x,mob.y)){if(CharacterActions.dead)say(mob,pick(RED_WIN));f.pk=false;f.pkCd=now+rnd(45000,90000);return false;}
   const reach=mob.spawn.npc.ranged||1;
   if(pd===0){for(const [dx,dy] of [[1,0],[0,1],[-1,0],[0,-1]])if(stepToward(mob,mob.x+dx*2,mob.y+dy*2,now))return true;}
   if(pd>reach||!IslandCombat.clearShot(mob.x,mob.y,worldX,worldY)){stepToward(mob,worldX,worldY,now);return true;}
   if(now<f.ready)return true;
   face(mob,worldX,worldY);const dur=f.look.attackMs;mob.action={clip:'attack',start:now,end:now+dur};f.ready=now+dur+rnd(200,600);
   if(reach>1)shoot(mob,{x:worldX,y:worldY},now+dur*.45,f.look.weapon);
   const attackMap=window.activeMapId||0,attackOwner=window.activeCharacterId;
   setTimeout(()=>{if(!f.pk||f.retreatUntil||CharacterActions.dead||!canFight(mob)||(window.activeMapId||0)!==attackMap||window.activeCharacterId!==attackOwner||dist(mob.x,mob.y,worldX,worldY)>reach||!IslandCombat.clearShot(mob.x,mob.y,worldX,worldY))return;
    const ac=typeof previewArmorClass==='function'?Number(previewArmorClass())||10:10,plv=window.activeCharacterLevel||1;
    if(Math.random()<clamp(.6+(lv-plv)*.02+(ac-10)*.025,.1,.95)){CharacterActions.damage(ri(3,9)+Math.floor(lv*.6)+4,{animate:!movementAnimating()&&!navigationPath.length});
     if(CharacterActions.dead){say(mob,pick(RED_WIN));window.GameChat?.say('【系統】你被 '+name+' 擊倒了。','sys');f.pk=false;f.pkCd=movementTime()+rnd(60000,120000);}}},dur*.45);
   return true;}
  if(f.red&&now>=f.pkCd&&ok&&!safe(mob.x,mob.y)&&pd<=8&&IslandCombat.clearShot(mob.x,mob.y,worldX,worldY)){f.pk=true;f.enemyId=window.activeCharacterId;claimed.delete(f.target);f.target=null;f.goal=null;f.pkCd=now+rnd(45000,90000);say(mob,pick(RED_LINES));window.GameChat?.say('【警告】'+name+'（紅名）盯上你了！','sys');window.toast?.(name+'（紅名）盯上你了！');return true;}
  return false;}
 // 玩家打到假人（只有紅名能被點選）：被打就反擊；打倒得金幣，消失一分鐘
 function hurt(mob,amount){const f=mob.fp;if(!f||!canFight(mob))return;mob.hp=Math.max(0,mob.hp-Math.max(1,Math.floor(amount)));f.hpShow=movementTime()+3000;window.CombatSound?.monsterHit?.(mob);
  if(!f.pk&&!f.retreatUntil&&mob.hp>0&&!CharacterActions.dead){f.pk=true;f.enemyId=window.activeCharacterId;claimed.delete(f.target);f.target=null;f.goal=null;f.route=null;say(mob,pick(['你敢打我?','找死','來啊']));}
  if(mob.hp>0)return;
  const gold=f.red?mob.spawn.npc.level*40:0;IslandMonsters.playEffect(169,mob.x,mob.y,movementTime());
  if(gold)window.OwnedInventory?.receive('etcitem',40308,gold);
  window.GameChat?.say('【系統】你擊敗了 '+mob.spawn.npc.name+(gold?'，獲得 '+gold.toLocaleString()+' 金幣。':'。'),'sys');
  mob.hp=mob.spawn.npc.hp;f.retreatUntil=0;f.pk=false;f.target=null;f.goal=null;f.hidden=true;f.vanish=movementTime()+60000;mob.bubble=null;
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
  stallPool=[...SHOP_PRICE.keys()].filter(id=>itemById.get(id)?.icon&&SHOP_PRICE.get(id)>=5&&SHOP_PRICE.get(id)<=30000&&stallOk(itemById.get(id)));
  usefulPool=stallPool.filter(id=>{const it=itemById.get(id),h=ITEM_USE_RULES.definitions[it.kind+':'+id]?.handler||'';return /^(hp.|mp.|brave.|teleport.)/.test(h)||it.type==='arrow'});}
 // 擺攤白名單（使用者 2026-11-14：假人不該賣家具這類）：裝備、箭、魔法書／精靈水晶、魔法材料、藥水、實用卷軸、磨刀石；家具、煙火、食物、船票、骰子、花束等不賣
 const STALL_HANDLER=/^(hp.|mp.|brave.|teleport.|magicreel.|Disintoxicat_Potion|Water_Essence|Appraisal_Reel|Scroll_CurseRemoval|Reactivating_Reel|Blank_MagicReel|Hone)/;
 function stallOk(it){if(!it)return false;if(it.kind==='weapon'||it.kind==='armor')return !/結婚|活動|紀念/.test(it.name);if(['arrow','material','spellbook'].includes(it.type))return true;const h=ITEM_USE_RULES.definitions[it.kind+':'+it.id]?.handler||'';if(it.type==='other'&&!/^Hone/.test(h))return false;return STALL_HANDLER.test(ITEM_USE_RULES.definitions[it.kind+':'+it.id]?.handler||'');}
 // ---- 時間線：開服第幾天決定市面上最高強化值 ----
 const WORLD_KEY='lineage-fake-world-start',DAY=86400000;
 function worldDay(){let s=0;try{s=Number(localStorage.getItem(WORLD_KEY))}catch{}if(!(s>0)){s=Date.now();try{localStorage.setItem(WORLD_KEY,String(s))}catch{}}return Math.floor((Date.now()-s)/DAY)+1;}
 function maxEnchant(day=worldDay()){return day<=1?0:day===2?3:day===3?4:day<=5?5:day<=7?6:day<=13?7:8;}
 const armorMax=()=>Math.min(6,Math.max(0,maxEnchant()-1));
 const lineOk=l=>{const m=l.match(/\+(\d+)/);return !m||Number(m[1])<=maxEnchant();};
 // ---- 擺攤貨品 ----
 // 強化裝備白名單：一般人會衝的武器／防具（不賣匕首、弓、皮甲；不賣高級、稀有裝備）
 const ENCH_WEAPONS=[31,29,37,41,52,64,98,143,148],ENCH_ARMORS=[20043,20006,20056,20154,20122,20163,20194,20242,20231];
 const W_SCROLL=40087,A_SCROLL=40074;
 // 價格＝衝裝成本：武捲 8 萬、防捲 4 萬；安定值內照張數，過安定值要算蒸發風險（+7 武器約 100～150 萬）
 function enchPrice(id,n,weapon){const base=Math.max(500,Math.round((SHOP_PRICE.get(id)||20000)*rnd(.9,1.2)));let p;
  if(weapon)p=n<=6?80000*n*rnd(1,1.15):n===7?560000*rnd(1.8,2.7):640000*rnd(4,5.5);
  else p=n<=4?40000*n*rnd(1,1.15):n===5?200000*rnd(1.8,2.6):240000*rnd(3.5,5);
  return Math.round((p+base)/1000)*1000;}
 function enchItem(){const weapon=Math.random()<.6,max=weapon?maxEnchant():armorMax();if(max<1)return null;
  let n=ri(Math.max(1,max-3),max);if(n>=7&&Math.random()<.5)n=ri(4,6);/* 高強化比較少見 */
  const id=pick(weapon?ENCH_WEAPONS:ENCH_ARMORS),item=itemById.get(id);if(!item)return null;
  return {id,key:item.kind+':'+id,qty:1,price:enchPrice(id,n,weapon),enchant:n};}
 const stallName=it=>(it.enchant?'+'+it.enchant+' ':'')+(itemById.get(it.id)?.name||'道具');
 function genStall(){prices();const items=[],ids=new Set();
  // 約 4 成攤位有強化裝備（第 1 天沒有）
  if(maxEnchant()>0&&Math.random()<.4)for(let i=ri(1,2);i>0;i--){const e=enchItem();if(e&&!ids.has(e.key+'+'+e.enchant)){ids.add(e.key+'+'+e.enchant);items.push(e);}}
  // 施法卷軸：武捲 8～8.4 萬、防捲 4～4.1 萬（商店 8.5 萬／4.1 萬）
  if(Math.random()<.45){const w=Math.random()<.5,id=w?W_SCROLL:A_SCROLL;ids.add(id);items.push({id,key:'etcitem:'+id,qty:ri(1,5),price:w?ri(80,84)*1000:ri(400,410)*100});}
  const n=items.length+ri(2,4);let guard=0;
  while(items.length<n&&guard++<200){const id=pick(usefulPool.length&&Math.random()<.7?usefulPool:stallPool);/* 七成賣實用品：藥水、卷軸、箭 */if(ids.has(id))continue;ids.add(id);const item=itemById.get(id),stack=!!ITEM_USE_RULES.definitions[item.kind+':'+id]?.stackable;
   const unit=SHOP_PRICE.get(id),qty=stack?Math.max(1,Math.min(pick([5,10,20,50,100]),Math.floor(200000/unit))):1,price=Math.max(1,Math.round(unit*rnd(.9,1.6)));items.push({id,key:item.kind+':'+id,qty,price});}
  return {items,restock:movementTime()+rnd(240000,420000)};}
 function shout(mob){const st=mob.fp.stall,b=st?.buys?.length&&Math.random()<.35?pick(st.buys):null;
  if(b){say(mob,'【收】'+(itemById.get(b.id)?.name||'道具')+' 每張 '+b.price.toLocaleString()+' 金');return;}
  const it=st?.items?.length&&pick(st.items);if(!it)return;
  say(mob,'【賣】'+stallName(it)+(it.qty>1?' ×'+it.qty:'')+' '+it.price.toLocaleString()+' 金');}
 // 收購（防洗錢，使用者 2026-11-14）：只收武捲、防捲，價錢低於任何攤位賣價（武 8 萬起、防 4 萬起）與商店價，一攤最多收幾張
 function genBuys(){if(Math.random()<.5)return [];const out=[];
  if(Math.random()<.6)out.push({id:W_SCROLL,key:'etcitem:'+W_SCROLL,want:ri(1,5),price:ri(750,790)*100});
  if(!out.length||Math.random()<.4)out.push({id:A_SCROLL,key:'etcitem:'+A_SCROLL,want:ri(1,5),price:ri(370,395)*100});
  return out;}
 // ---- 擺攤商人時間表（只在奇岩村莊、銀騎士村莊）----
 const STALL_TOWNS={giran:{name:'奇岩村莊',map:4,x:33421,y:32813,cap:20,r:[3,16]},silver:{name:'銀騎士村莊',map:4,x:33080,y:33395,cap:6,r:[2,9]}};
 const H=3600000,MIN=60000,STALL_POOL=55,STALL_VER=2;
 let stalls=loadJson(STALL_KEY);
 if(stalls)migrateClans(stalls,STALL_KEY);
 function stallInit(){if(stalls&&stalls.length&&stalls.every(s=>s.v===STALL_VER&&lookOf(s.look)))return;const now=Date.now(),pool=looks.filter(l=>l.weapon!=='bow'),names=new Set();stalls=[];
  for(let i=0;i<STALL_POOL*4&&stalls.length<STALL_POOL;i++){const look=pick(pool),g=A.avatars[look.avatar]?.gender?1:0,name=pick([...STALL_FIRST[g],...STALL_FIRST[2]])+pick(STALL_SHOP);if(names.has(name))continue;names.add(name);
   // 一開始就是「穩定狀態」：每人隨機落在自己週期（擺攤＋休息 3 小時）的某一點
   const d=rnd(30*MIN,3*H),start=now-rnd(0,d+3*H);stalls.push({v:STALL_VER,name,look:lookKey(look),clan:rollClan(false),clanV:1,town:null,spot:null,start,end:start+d,items:null,buys:null});}
  saveJson(STALL_KEY,stalls);}
 function roll(s,now){let changed=false;while(now>=s.end){const off=s.end+3*H;s.start=off;s.end=off+rnd(30*MIN,3*H);s.town=null;s.spot=null;s.items=null;s.buys=null;changed=true;}return changed;}
 const isLive=(s,now)=>now>=s.start&&now<s.end;
 // 開攤時才選村：奇岩約 8 成；奇岩不到 10 人優先補奇岩、銀騎士沒人優先補銀騎士；滿了去另一村，兩村都滿這輪不擺
 function pickTown(now){const c={giran:0,silver:0};for(const o of stalls)if(o.town&&isLive(o,now))c[o.town]++;
  let t=c.giran<10?'giran':c.silver<1?'silver':Math.random()<.8?'giran':'silver';if(c[t]>=STALL_TOWNS[t].cap)t=t==='giran'?'silver':'giran';return c[t]>=STALL_TOWNS[t].cap?null:t;}
 function stallSpot(s){const t=STALL_TOWNS[s.town];for(let i=0;i<160;i++){const r=rnd(...t.r),a=Math.random()*Math.PI*2,x=Math.round(t.x+Math.cos(a)*r),y=Math.round(t.y+Math.sin(a)*r);
   if(!TeleportScrolls.canLand(x,y)||!safe(x,y))continue;if(stalls.some(o=>o!==s&&o.town===s.town&&o.spot&&dist(o.spot[0],o.spot[1],x,y)<2))continue;return [x,y];}return null;}
 let stallSaveAt=0;
 function stallTick(){if(!looks.length)return;stallInit();const now=Date.now(),map=window.activeMapId||0;let dirty=false;
  // 舊版時間表留下的攤位假人（已不在名單）直接收掉
  for(const m of [...IslandMonsters.botList])if(m.fp?.stall&&!stalls.includes(m.fp.stallRef)){IslandMonsters.removeAlly(m);used.delete(m.fp.stallName);}
  for(const s of stalls){if(roll(s,now))dirty=true;let live=isLive(s,now);
   if(live&&!s.town){s.town=pickTown(now);if(!s.town){s.end=now;live=false;}dirty=true;}
   const t=live&&STALL_TOWNS[s.town],mob=IslandMonsters.botList.find(m=>m.fp?.stallRef===s||m.fp?.stallName===s.name);
   if(live&&map===t.map){if(!s.spot){s.spot=stallSpot(s);dirty=true;}if(!s.items){s.items=genStall().items;s.buys=genBuys();dirty=true;}}
   const near=live&&map===t.map&&s.spot&&dist(s.spot[0],s.spot[1],worldX,worldY)<=32;
   if(near&&!mob)makeStallMob(s);
   else if(mob&&!near){if(!live&&dist(mob.x,mob.y,worldX,worldY)<=20)IslandMonsters.playEffect(169,mob.x,mob.y,movementTime());IslandMonsters.removeAlly(mob);used.delete(s.name);}
   else if(mob)mob.fp.stall=s;}
  if(dirty||now-stallSaveAt>30000){stallSaveAt=now;saveJson(STALL_KEY,stalls);}}
 // 買強化裝備：一般交易沒有強化值，這裡自己扣金幣、放一筆帶 enchant 的物品
 function buyEnchanted(it){const next=OwnedInventory.snapshot,gold=next.find(e=>e.key==='etcitem:40308'&&!e.slot);
  if(!gold||gold.count<it.price)return '天幣不足。';gold.count-=it.price;if(!gold.count)next.splice(next.indexOf(gold),1);
  next.push({uid:'item-'+Date.now().toString(36)+'-fp'+Math.random().toString(36).slice(2,7),key:it.key,count:1,slot:null,enchant:it.enchant});
  return OwnedInventory.applyChange(next)?'':'背包欄位不足，交易未完成。';}
 function makeStallMob(s){const look=lookOf(s.look)||pick(looks),[x,y]=s.spot;used.add(s.name);
  const npc={name:s.name,kind:'L1Bot',gfx:look.id,level:ri(20,45),hp:500,mp:0,ac:0,walk:640,attack:look.attackMs,ranged:1,skills:[],regeneration:null,aggressive:false};
  const mob={spawn:{bot:true,mapId:STALL_TOWNS[s.town].map,npc,heading:4,respawn:[0,0]},region:[x-5,y-5,x+5,y+5],x,y,homeX:x,homeY:y,hp:npc.hp,heading:ri(3,5),rest:0,phase:Math.random()*1800,step:null,
   fp:{look,clan:s.clan,stall:s,stallRef:s,stallName:s.name,state:'stall',think:0,chatAt:Infinity,ready:0,target:null,since:movementTime(),shoutAt:movementTime()+rnd(3000,15000)}};
  preloadLook(look);IslandMonsters.addAlly(mob);return mob;}
 const saveStalls=()=>saveJson(STALL_KEY,stalls);
 let stallWin=null;
 function openStall(mob){if(window.gameFlowState!=='playing')return;stallWin?.remove();const f=mob.fp;if(!f?.stall)return;
  const el=(t,c,x)=>uiElement(t,c,x),w=el('section','fp-stall');w.style.zIndex=String(window.FloatingWindows?.frontLevel?.()||40);
  const head=el('div','fp-stall-head'),x=el('button','','✕');x.type='button';x.onclick=()=>{w.remove();stallWin=null;};head.append(el('b','',mob.spawn.npc.name+' 的攤位'),x);
  const list=el('div','fp-stall-list'),msg=el('div','fp-stall-msg');
  const gold=()=>OwnedInventory.items.filter(e=>e.key==='etcitem:40308').reduce((n,e)=>n+e.count,0);
  const have=key=>OwnedInventory.items.filter(e=>e.key===key&&!e.slot).reduce((n,e)=>n+e.count,0);
  function render(){list.replaceChildren();list.append(el('div','fp-stall-msg','【賣】'));for(const it of f.stall.items){const item=itemById.get(it.id),row=el('div','fp-stall-row'),buy=el('button','','買 1 個');buy.type='button';
    row.append(itemIcon(item),el('span','nm',stallName(it)+(it.qty>1?'（剩 '+it.qty+'）':'')),el('span','pr',it.price.toLocaleString()+' 金'),buy);
    buy.disabled=gold()<it.price;buy.onclick=()=>{if(dist(mob.x,mob.y,worldX,worldY)>8){msg.textContent='離攤位太遠了。';return;}const err=it.enchant?buyEnchanted(it):OwnedInventory.trade(it.key,1,it.price,false);
     if(err){msg.textContent=err;return;}it.qty--;if(!it.qty)f.stall.items.splice(f.stall.items.indexOf(it),1);msg.textContent='買到 '+stallName(it)+'。';saveStalls();render();};
    list.append(row);}
   if(!f.stall.items.length)list.append(el('div','fp-stall-msg','（賣完了）'));
   if(f.stall.buys?.length){list.append(el('div','fp-stall-msg','【收】把你身上的東西賣給他'));
    for(const b of f.stall.buys){const item=itemById.get(b.id),row=el('div','fp-stall-row'),sell=el('button','','賣給他 1 個');sell.type='button';
     row.append(itemIcon(item),el('span','nm',item.name+'（還收 '+b.want+'，你有 '+have(b.key)+'）'),el('span','pr',b.price.toLocaleString()+' 金'),sell);
     sell.disabled=have(b.key)<1;sell.onclick=()=>{if(dist(mob.x,mob.y,worldX,worldY)>8){msg.textContent='離攤位太遠了。';return;}const err=OwnedInventory.trade(b.key,1,b.price,true);
      if(err){msg.textContent=err;return;}b.want--;if(!b.want)f.stall.buys.splice(f.stall.buys.indexOf(b),1);msg.textContent='賣出 '+item.name+'，得到 '+b.price.toLocaleString()+' 金。';saveStalls();render();};
     list.append(row);}}
   msg.dataset.gold='目前金幣 '+gold().toLocaleString();}
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
  if(mob.fp?.stall){pen.font='10px sans-serif';pen.fillStyle='#ffd77a';pen.strokeText('【擺攤中】點頭部購買',x,y+13);pen.fillText('【擺攤中】點我購買',x,y+13);pen.font='12px sans-serif';}
  if(mob.fp?.hpShow>now){const w=36,h=4,r=Math.max(0,mob.hp/mob.spawn.npc.hp);pen.fillStyle='#1a1410';pen.fillRect(x-w/2-1,y+3,w+2,h+2);pen.fillStyle=mob.fp.red?'#e04030':'#c83a32';pen.fillRect(x-w/2,y+4,w*r,h);}
  if(clan){pen.font='10px sans-serif';pen.fillStyle=mob.fp?.red?'#d05050':'#9fd18b';pen.strokeText('['+clan+']',x,top);pen.fillText('['+clan+']',x,top);top-=13;}
  const b=mob.bubble;if(b&&now<b.until){pen.font='12px sans-serif';const w=Math.min(190,pen.measureText(b.text).width+14),h=20,bx=x-w/2,by=top-h-2;
   pen.fillStyle='rgba(255,252,240,.94)';pen.strokeStyle='#5a4a2a';pen.lineWidth=1;pen.beginPath();pen.roundRect?pen.roundRect(bx,by,w,h,6):pen.rect(bx,by,w,h);pen.fill();pen.stroke();
   pen.fillStyle='#2a2216';pen.fillText(b.text.length>14?b.text.slice(0,14)+'…':b.text,x,by+14);}
 }
 // ---- 回話 ----
 document.addEventListener('player-chat',e=>{const text=String(e.detail||'');if(window.NpcSocial?.handlePublic(text))return;for(const [re,ans] of REPLY){if(!re.test(text))continue;
  const near=bots().filter(b=>!b.fp?.vanish&&!b.fp?.stall&&dist(b.x,b.y,worldX,worldY)<=20);if(near.length)setTimeout(()=>say(pick(near),pick(ans)),rnd(900,2200));break;}});
 // ---- 密語：玩家 /密 名字 內容 → 找同名假人（任何地圖），1.5～4 秒後回密語；找不到就「不在線上」 ----
 const W_TRADE_ASK=/有|賣|收|多少|價|錢|幾|算|便宜|出/;
 function whisperReply(b,text){const f=b.fp||{},last=f.lastLine||'',item=(last.match(/^(?:收|賣)\s*(.+?)(?:\s+(?:私我|便宜賣|\d+).*)?$/)||[])[1];
  if(f.red)return pick(['滾','想死嗎','嘿嘿 野外見','找我幹嘛']);
  if(f.stall)return null; // 擺攤中（掛機）不回密語
  if(/^收/.test(last)&&W_TRADE_ASK.test(text))return pick(['你有'+(item||'喔')+'? 開價多少','還在收 你出個價','剛剛收到了 抱歉','給你 '+ri(3,30)*1000+' 金 要不要']);
  if(/^賣/.test(last)&&W_TRADE_ASK.test(text))return pick([(item||'東西')+' '+ri(2,40)*500+' 金 要嗎','可以算便宜點','剛賣掉了 sorry','你出多少?']);
  for(const [re,ans] of REPLY)if(re.test(text))return pick(ans);
  if(/\?|？|嗎/.test(text))return pick(['不知道耶','應該吧','我也不確定','你問問看別人']);
  return pick(['嗯?','怎麼了','打怪中 等等','?','有事嗎','哈哈','好喔']);}
 document.addEventListener('player-whisper',e=>{const to=String(e.detail?.to||''),text=String(e.detail?.text||'');
  if(window.NpcSocial?.handleWhisper(to,text))return;
  const b=IslandMonsters.botList.find(x=>x.spawn.npc.name===to);
  if(!b||b.fp?.hidden){setTimeout(()=>window.GameChat?.say('【系統】'+to+' 目前不在線上。','sys'),300);return;}
  const reply=whisperReply(b,text);if(reply)setTimeout(()=>window.GameChat?.say('[密語] '+to+'：'+reply,'whisper'),rnd(1500,4000));});
 function setEnabled(on){enabled=!!on;maintain();}
 function setRed(on){redOn=!!on;maintain();}
 return {canFight,update,label,hurt,drawShots,openStall,get stalls(){stallInit();return stalls;},sampleStall:()=>genStall().items.map(i=>itemById.get(i.id)?.name),setRed,get redOn(){return redOn;},get count(){return bots().length;},get enabled(){return enabled;},setEnabled,looks};
})();window.FakePlayers=FakePlayers;
