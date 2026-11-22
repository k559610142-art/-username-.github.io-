// 魔法娃娃能力實際生效（使用者 2026-11-17：圖鑑上寫的加成要在戰鬥時真的有作用）。
//  只算「召喚中」的那隻（TdjSystems.dolls.active）。把圖鑑 effects 文字換成數值：
//   能力值／HP／MP／近遠距攻擊／遠距命中／魔攻／傷害減免／狩獵經驗 → 併入 SoulRings.bonuses()（武魂同一套計算，data/soul-rings.js）
//   防禦（AC）、魔法防禦 → NativeCombatRules.armorClass／defense；昏迷／石化／支撐／寒冰耐性 → PlayerAbilityRules.statusResistances
//   每 N 秒恢復 HP／MP、每分鐘給天幣 → 這裡的計時器；N% 機率施展法術或額外傷害 → onHit（island-combat.js 普攻命中時呼叫）
//   N% 機率傷害減免 → chanceReduction（native-combat-rules.js 怪物打玩家時呼叫）
//   娃娃附帶的輔助魔法（通暢氣脈術、體魄強健術、魔法武器…）照 class-buffs.js 同名技能的數值常駐。
//  目前沒有對應系統、只顯示的：負重、人物速度、水底呼吸、屠宰者／破壞盔甲／昏迷等級、西遊記三招、泰坦、恐怖命中。
window.DollEffects=(()=>{
 const STAT={力量:'str',敏捷:'dex',體質:'con',智力:'int',精神:'wis',魅力:'cha'};
 const BUFF={通暢氣脈術:{dex:5},體魄強健術:{str:5},祝福魔法武器:{melee:2},魔法武器:{melee:2},狂暴術:{melee:5,ac:10},大地防護:{ac:-6},鋼鐵防護:{ac:-10},魔法屏障:{mr:10},生命之泉:{hpRegen:[16,10]},靈魂昇華:{hp:50,mp:50}};
 // 機率法術的傷害（娃娃版，固定範圍）；緩速術／岩牢／毒咒給較小的傷害代替控制效果
 const SPELL={'火焰衝擊':[15,25],'列炎術':[20,35],'爆擊火焰衝擊':[30,50],'地獄火':[40,60],'極道落雷':[30,50],'魔法箭矢':[10,20],'毒咒':[8,14],'緩速術':[5,10],'岩牢':[8,14]};
 const cache=new Map();
 function parse(d){
  if(!d)return null;if(cache.has(d.id))return cache.get(d.id);
  const o={bonus:{},ac:0,mr:0,status:{},regen:[],gold:null,procs:[],guard:null};const add=(k,n)=>{o.bonus[k]=(o.bonus[k]||0)+n};
  for(const raw of d.effects||[]){const e=String(raw).trim();let m;
   if(BUFF[e]){for(const [k,v]of Object.entries(BUFF[e])){if(k==='ac')o.ac+=v;else if(k==='mr')o.mr+=v;else if(k==='hpRegen')o.regen.push({hp:true,sec:v[0],n:v[1]});else add(k,v);}continue;}
   if((m=e.match(/^(力量|敏捷|體質|智力|精神|魅力)\+(\d+)$/)))add(STAT[m[1]],+m[2]);
   else if((m=e.match(/^(體力上限|HP)\+(\d+)$/)))add('hp',+m[2]);
   else if((m=e.match(/^(魔力上限|MP)\+(\d+)$/)))add('mp',+m[2]);
   else if((m=e.match(/^(近距離攻擊|額外攻擊點數)\+(\d+)$/)))add('melee',+m[2]);
   else if((m=e.match(/^遠距離攻擊\+(\d+)$/)))add('ranged',+m[1]);
   else if((m=e.match(/^近距離命中\+(\d+)$/)))add('meleeHit',+m[1]);
   else if((m=e.match(/^魔法命中\+(\d+)$/)))add('magicHit',+m[1]);
   else if((m=e.match(/^遠距離命中\+(\d+)$/)))add('rangedHit',+m[1]);
   else if((m=e.match(/^魔攻\+(\d+)$/)))add('sp',+m[1]);
   else if((m=e.match(/^傷害減免\+(\d+)$/)))add('reduction',+m[1]);
   else if((m=e.match(/^狩獵經驗值\+([\d.]+)%$/)))add('exp',+m[1]);
   else if((m=e.match(/^魔力恢復量\+(\d+)$/)))add('mpr',+m[1]);
   else if((m=e.match(/^(防禦|AC)([+-]\d+)$/)))o.ac+=+m[2];
   else if((m=e.match(/^魔法防禦\+(\d+)$/)))o.mr+=+m[1];
   else if((m=e.match(/^(昏迷|石化|支撐|寒冰)耐性\+(\d+)$/)))o.status[{昏迷:'stun',石化:'stone',支撐:'sustain',寒冰:'freeze'}[m[1]]]=(o.status[{昏迷:'stun',石化:'stone',支撐:'sustain',寒冰:'freeze'}[m[1]]]||0)+ +m[2];
   else if((m=e.match(/^每(\d+)秒，?(體力|魔力)恢復(\d+)$/)))o.regen.push({hp:m[2]==='體力',sec:+m[1],n:+m[3]});
   else if((m=e.match(/^每(\d+)分鐘給予金幣(\d+)$/)))o.gold={sec:+m[1]*60,n:+m[2]};
   else if((m=e.match(/^(\d+)%機率施展「(.+)」$/))&&SPELL[m[2]])o.procs.push({p:+m[1]/100,name:m[2],range:SPELL[m[2]]});
   else if((m=e.match(/^(\d+)%機率攻擊傷害\+(\d+)$/)))o.procs.push({p:+m[1]/100,name:'',range:[+m[2],+m[2]]});
   else if((m=e.match(/^(\d+)%機率傷害減免\+(\d+)$/)))o.guard={p:+m[1]/100,n:+m[2]};
  }
  cache.set(d.id,o);return o;
 }
 function active(){if(window.gameFlowState!=='playing')return null;const id=window.TdjSystems?.dolls?.active;if(!id||typeof gameCatalogData==='undefined')return null;const real=(typeof DOLL_ID_ALIASES!=='undefined'&&DOLL_ID_ALIASES[id])||id;return parse(gameCatalogData.dolls.find(d=>String(d.id)===String(real)));}
 const bonuses=()=>active()?.bonus||null;
 function onHit(mob){const a=active();if(!a?.procs.length)return 0;let extra=0;for(const p of a.procs)if(Math.random()<p.p){const n=p.range[0]+Math.floor(Math.random()*(p.range[1]-p.range[0]+1));extra+=n;if(p.name&&typeof toast==='function'&&Math.random()<.3)window.GameChat?.say?.('【娃娃】施展「'+p.name+'」造成 '+n+' 點傷害','sys');}return extra;}
 function chanceReduction(){const g=active()?.guard;return g&&Math.random()<g.p?g.n:0;}
 // 每秒檢查：恢復與天幣
 const last=new Map();let dollId=null;
 setInterval(()=>{const a=active(),id=window.TdjSystems?.dolls?.active;if(!a){dollId=null;return;}if(id!==dollId){dollId=id;last.clear();}const now=Date.now();
  a.regen.forEach((r,i)=>{const k='r'+i;if(!last.has(k)){last.set(k,now);return;}if(now-last.get(k)<r.sec*1000)return;last.set(k,now);if(window.CharacterActions?.dead)return;
   if(r.hp){if(typeof hp!=='undefined'&&hp<maxHp){hp=Math.min(maxHp,hp+r.n);window.stats?.();}}else if(typeof mp!=='undefined'&&mp<maxMp){mp=Math.min(maxMp,mp+r.n);window.stats?.();}});
  if(a.gold){if(!last.has('g'))last.set('g',now);else if(now-last.get('g')>=a.gold.sec*1000){last.set('g',now);if(window.OwnedInventory?.reward(0,[{key:'etcitem:40308',count:a.gold.n}])&&typeof toast==='function')toast('魔法娃娃帶來 '+a.gold.n.toLocaleString()+' 天幣');}}
 },1000);
 return {bonuses,ac:()=>active()?.ac||0,mr:()=>active()?.mr||0,status:()=>active()?.status||{},onHit,chanceReduction,parse};
})();
