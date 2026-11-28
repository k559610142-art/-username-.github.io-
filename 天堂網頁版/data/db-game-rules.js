const DBGameRules = (() => {
  const tables=new Map();
  for(const [name,table] of Object.entries(dbActiveSettings)){
    tables.set(name,table.rows.map(row=>Object.fromEntries(table.columns.map((c,i)=>[c.name,row[i]]))));
  }
  const rows=name=>tables.get(name)||[];
  const roleCode={'王族':0,'騎士':1,'法師':2,'妖精':3,'黑妖':4};
  const roleFlag={'王族':1,'騎士':2,'妖精':4,'法師':8,'黑妖':16};
  const byId=new Map(INTERFACE_CATALOG.items.map(item=>[item.id,item]));
  const keyFor=id=>{const item=byId.get(+id);return item?item.kind+':'+item.id:null;};
  // 古老的寶箱：權重以百萬分之一計，總和為 1,000,000，每箱選一項。
  const ancientChestRewards=[
    [40048,110000],[40049,110000],[40050,110000],[40051,110000],
    [40052,80000],[40053,80000],[40054,80000],[40055,80000],
    [350123,70000],[350124,60000],
    [67,14000],[68,14000],[182,14000],
    [20092,14000],[20093,14000],[20094,14000],[20095,14000],
    [40076,6000],[39186,6000]
  ].map(([get_item_id,random])=>({
    box_item_id:39185,get_item_id,random,randomint:1000000,
    min_count:1,max_count:1,bless:-1,enchant:0
  }));
  tables.set('etcitem_box',[
    ...rows('etcitem_box').filter(row=>row.box_item_id!==39185&&row.box_item_id!==40636&&row.box_item_id!==40639),
    ...ancientChestRewards,
    // 原始核心 Box_DarkSpiritArmy 的法令軍王印記盒獎勵。
    ...[[40635,30,3],[40675,22,3],[40703,10,1],[20030,9,1],[20129,9,1],[20176,9,1],[20208,9,1],[20109,1,1],[20253,1,1]]
      .map(([get_item_id,random,count])=>({box_item_id:40636,get_item_id,random,randomint:100,min_count:count,max_count:count,bless:-1,enchant:0})),
    // 原始核心 Box_DarkPowerArmy 的魔獸軍王印記盒獎勵。
    ...[[40638,30,3],[40675,22,3],[40703,10,1],[20020,9,1],[20058,9,1],[20168,9,1],[20201,9,1],[155,1,1],[20200,1,1]]
      .map(([get_item_id,random,count])=>({box_item_id:40639,get_item_id,random,randomint:100,min_count:count,max_count:count,bless:-1,enchant:0}))
  ]);
  const split=value=>String(value??'').split(',').filter(Boolean).map(Number);
  const clone=value=>JSON.parse(JSON.stringify(value));
  const boxRolls=new Map(),cooldowns=new Map();
  function automaticSkills(role,level,current={ids:[],element:''}){
    const ids=new Set(current.ids);
    for(const row of rows('自動學習技能設置')){
      if(row['職業代號']===roleCode[role]&&row['等級']<=level)
        for(const id of split(row['技能編號']))if(playerSkillData.skills[id])ids.add(id);
    }
    return {...current,ids:[...ids]};
  }
  // 隨身傳送的眠龍洞穴 1～3 樓，實際地圖編號為 19～21。
  const dragonCaveMaterials=new Map([
    [19,[40515,40503,40505,40519]],
    [20,[3,19,20]],
    [21,[89,100,41351]]
  ]);
  const clothDrops=[40455,40456,40457];
  const dragonValleyGear=[272,273,21105,21106];
  const addedMapDrops=new Map([
    ...[53,54,55,56].map(map=>[map,{ids:clothDrops,chance:20000}]),
    ...[35,36].map(map=>[map,{ids:dragonValleyGear,chance:2000}])
  ]);
  const supplementalDropNames=map=>[...(dragonCaveMaterials.get(map)||[]),...(addedMapDrops.get(map)?.ids||[])].map(id=>byId.get(id).name);
  function extraDrops(mob){
    const map=mob?.spawn?.mapId??window.activeMapId??0;
    const added=addedMapDrops.get(map);
    const spawn=mob?.spawn;
    const template=spawn&&(spawn.npc?.name?spawn.npc:typeof islandMonsterTemplates!=='undefined'?islandMonsterTemplates[spawn.npcId]:null);
    const boss=spawn&&!spawn.resident&&!spawn.ally&&!spawn.bot&&(spawn.boss||/BOSS/i.test(template?.name||''));
    const proof=39189;
    return [
      // 2026-11-18 使用者：武魂結晶（39287）掉落提高 → 0.5% 改 5%（50000／1000000），數量仍 1～3；平均約 1 萬隻怪做一個下品武魂（結晶×1000）
      ...rows('怪物掉落全圖設置').map(row=>({id:row['道具'],min:row['最小量'],max:row['最大量'],chance:row['道具']===39287?50000:row['機率'],fixedRate:true})),
      ...rows('droplist_map').filter(row=>row.mapid===map&&(!boss||row.itemid!==proof)).map(row=>({id:row.itemid,min:row.min,max:row.max,chance:row.chance})),
      ...(boss?[{id:proof,min:1,max:1,chance:200000,fixedRate:true}]:[]),
      ...(dragonCaveMaterials.get(map)||[]).map(id=>({id,min:1,max:1,chance:20000,fixedRate:true})),
      ...(added?.ids.map(id=>({id,min:1,max:1,chance:added.chance,fixedRate:true}))||[]),
      ...(window.LevelQuests?.drops(mob)||[]) // 等級任務補的掉落（data/level-quests.js）
    ].filter(drop=>drop.id!==39288&&!/娃娃/.test(byId.get(drop.id)?.name||''));
  }
  function killRewards(mob){
    const rewards=[];
    for(const row of rows('怪物擊殺獎勵系統')){
      if(row['Npc編號']!==mob.spawn.npcId)continue;
      for(const id of [row['一般攻擊者獎勵道具編號'],row['最後攻擊者獎勵道具編號']]){
        if(id>0&&id!==39288&&byId.has(id)&&!/娃娃/.test(byId.get(id)?.name||''))rewards.push({key:keyFor(id),name:byId.get(id).name,count:1});
      }
    }
    return rewards;
  }
  function xpMultiplier(level){
    const row=rows('mapids_exp').find(r=>r.mapid===(window.activeMapId||0)&&level>=r.min&&level<=r.max);
    const poly=rows('system_poly_orginal').find(r=>r.gfxId===window.activeTransformCard?.p?.gfx);
    const gear=(window.OwnedInventory?.items||[]).filter(i=>i.slot).reduce((n,i)=>n+(+i.item.sourceRules?.exp_point||0),0);
    return (row?.exp||1)*(1+(+poly?.addExp||0)/100+gear/100);
  }
  function add(next,key,count,enchant=0,bless){
    const rule=ITEM_USE_RULES.definitions[key];
    if(key==='etcitem:39288'||!key||!rule||!Number.isSafeInteger(count)||count<1)return false;
    const existing=rule.stackable?next.find(e=>e.key===key&&!e.slot&&(!enchant||e.enchant===enchant)):null;
    if(existing){
      if(existing.count+count>2147483647)return false;
      existing.count+=count;return true;
    }
    if(next.length+(rule.stackable?1:count)>=ITEM_USE_RULES.maxSizeExclusive)return false;
    for(let i=0;i<(rule.stackable?1:count);i++)next.push({uid:crypto.randomUUID(),key,count:rule.stackable?count:1,slot:null,...(enchant?{enchant}:{}),...(bless>=0?{bless}:{})});
    return true;
  }
  function take(next,key,count,enchant=null){
    let needed=count;
    for(const entry of next){
      if(entry.key!==key||entry.slot||enchant!==null&&(entry.enchant||0)!==enchant)continue;
      const used=Math.min(needed,entry.count);entry.count-=used;needed-=used;
      if(!needed)break;
    }
    if(needed)return false;
    for(let i=next.length-1;i>=0;i--)if(!next[i].count)next.splice(i,1);
    return true;
  }
  // 新角色背包（2026-11-13 使用者指定，取代 DB beginner 表）：金幣 10 萬、自我加速藥水（綠水）50、治癒藥水（紅水）1000、傳送回家的卷軸 10、
  // 修練者防具一套（頭盔／T恤／盔甲／手套／涼鞋／盾牌／銀戒指）＋職業新手武器：戰士 修練者斧頭、妖精 修練者長弓＋修練者短劍＋箭 1000、
  // 龍騎士 修練者單手劍（DB 沒有龍騎士能用的矛）、幻術師 修練者魔杖（DB 幻術師不能用匕首）、王族／騎士／法師 修練者短劍
  const STARTER_KIT={
    common:[[990103,1],[40308,100000],[40013,50],[40010,1000],[40079,10],[20028,1],[20082,1],[20126,1],[20173,1],[20206,1],[20232,1],[20282,1]],
    '黑妖':[[73,1]],'王族':[[7,1]],'騎士':[[7,1]],'法師':[[7,1]],'妖精':[[175,1],[7,1],[40743,1000]],'戰士':[[147,1]],'龍騎士':[[35,1]],'幻術師':[[120,1]]
  };
  function starter(role,existing){
    const next=clone(existing);
    const equipment=role==='油傘女'
      ? [...STARTER_KIT.common.filter(([id])=>id!==20232),[OilParasolRules.weapon.id,1],[OilParasolRules.starterBookId,1]]
      : [...STARTER_KIT.common,...(STARTER_KIT[role]||[])];
    for(const [id,count] of equipment){
      if(!add(next,keyFor(id),count))throw Error('新手道具設定錯誤：'+id);
    }
    if(role==='油傘女')next.find(item=>item.key===OilParasolRules.weaponKey).slot='weapon';
    return next;
  }
  function prepareOilParasolKit(character,inventory,warehouse){
    if(character.role!=='油傘女')return null;
    let needsSave=false;
    for(const row of inventory){
      const item=byId.get(Number(row.key?.split(':')[1]));
      if(row.slot&&item&&!CreationRules.canEquip(character.role,item)){row.slot=null;needsSave=true;}
    }
    if(character.oilParasolKit)return needsSave?{}:null;
    const key=OilParasolRules.weaponKey;
    if(![...inventory,...warehouse].some(row=>row.key===key)){
      if(!add(inventory,key,1))return needsSave?{}:null;
      if(!inventory.some(row=>row.slot==='weapon'))inventory.at(-1).slot='weapon';
    }
    return {oilParasolKit:true};
  }
  function potion(uid,row){
    const entry=OwnedInventory.items.find(e=>e.uid===uid);
    const config=ITEM_USE_RULES.definitions[entry.key],now=movementTime();
    const cooldownKey=window.activeCharacterId+'/'+(config.delayId||entry.key);
    if(now<(cooldowns.get(cooldownKey)||0))return false;
    const next=OwnedInventory.snapshot;
    if(row['是否刪除']&&!take(next,entry.key,1))return false;
    const h=row['補血量固定值']+Math.floor(Math.random()*(row['補血量隨機值']+1));
    const m=row['補魔量固定值']+Math.floor(Math.random()*(row['補魔量隨機值']+1));
    if(!OwnedInventory.applyChange(next,{hp:Math.min(maxHp,hp+h),mp:Math.min(maxMp,mp+m)}))return false;
    cooldowns.set(cooldownKey,now+(config.delayMs||300));
    IslandMonsters.playEffect(row['特效編號'],worldX,worldY,now);
    return true;
  }
  function openBox(uid){
    const entry=OwnedInventory.items.find(e=>e.uid===uid),id=entry?.item.id;
    const availableReward=row=>row.box_item_id===id&&(typeof REMOVED_ITEM_IDS==='undefined'||!REMOVED_ITEM_IDS.has(row.get_item_id));
    const fixed=rows('etcitem_boxs').filter(availableReward);
    const random=rows('etcitem_box').filter(availableReward);
    if(!fixed.length&&!random.length)return null;
    const cacheKey=window.activeCharacterId+'/'+uid;
    let selected=boxRolls.get(cacheKey);
    if(!selected){
      selected=fixed.filter(row=>(row.use_type&roleFlag[job])!==0).map(row=>({id:row.get_item_id,count:row.count,enchant:row.enchant,bless:row.bless}));
      if(random.length){
        const roll=Math.floor(Math.random()*random[0].randomint);
        let sum=0;
        const reward=random.find(row=>(sum+=row.random)>roll);
        if(reward)selected.push({id:reward.get_item_id,count:reward.min_count+Math.floor(Math.random()*(reward.max_count-reward.min_count+1)),enchant:reward.enchant,bless:reward.bless});
      }
      if(!selected.length)return false;
      boxRolls.set(cacheKey,selected);
    }
    const next=OwnedInventory.snapshot;
    const boxIndex=next.findIndex(row=>row.uid===uid&&!row.slot);
    if(boxIndex<0)return false;
    if(--next[boxIndex].count===0)next.splice(boxIndex,1);
    for(const reward of selected)if(!add(next,keyFor(reward.id),reward.count,reward.enchant,reward.bless))return false;
    if(!OwnedInventory.applyChange(next))return false;
    boxRolls.delete(cacheKey);
    document.querySelector('#log').textContent='開啟 '+entry.item.name+'，獲得 '+selected.map(r=>byId.get(r.id)?.name+' × '+r.count).join('、');
    return true;
  }
  function useItem(uid){
    const entry=OwnedInventory.items.find(e=>e.uid===uid);
    if(!entry)return false;
    const row=rows('system_etcitem_hpmp').find(row=>row['物品編號']===entry.item.id);
    if(row)return potion(uid,row);
    return openBox(uid);
  }
  function damageBonus(ranged){
    const gear=OwnedInventory.items.filter(i=>i.slot),set=EquipmentSets.read(gear);
    const extra=gear.reduce((sum,e)=>{
      const modifiers=ItemProperties.attackModifiers(e.item,ranged);
      const matchingWeapon=e.slot==='weapon'&&ranged===['bow','singlebow'].includes(e.item.type);
      return sum+modifiers.damage+(matchingWeapon?(e.enchant||0):0);
    },0);
    const poly=rows('system_poly_orginal').find(r=>r.gfxId===window.activeTransformCard?.p?.gfx);
    return extra+(window.SoulRings?.bonuses()[ranged?'ranged':'melee']||0)+(ranged?set.bow_modifier_dmg||0:set.modifier_dmg||0)+(ranged?poly?.addBowDmg||0:poly?.addDmg||0)+(window.ClassBuffs?.damageBonus(ranged)||0);
  }
  function weaponSkillChance(skill,enchant=0){
    if(skill.weapon_id<115200||skill.weapon_id>115207)return skill.probability;
    return Math.min(100,skill.probability+Math.floor(Math.max(0,enchant)/3));
  }
  function weaponProc(mob){
    const weapon=OwnedInventory.items.find(e=>e.slot==='weapon');
    if(!weapon)return 0;
    let damage=0;
    const power=rows('weapon_power').find(r=>r.weapon_id===weapon.item.id);
    if(power)damage+=power.add_dmg_min+Math.floor(Math.random()*(power.add_dmg_max-power.add_dmg_min+1));
    for(const row of rows('weapon_skill')){
      if(row.weapon_id!==weapon.item.id||Math.random()*100>=weaponSkillChance(row,weapon.enchant))continue;
      damage+=row.fix_damage+Math.floor(Math.random()*(row.random_damage+1));
      if(row.effect_id>0)IslandMonsters.playEffect(row.effect_id,mob.x,mob.y,movementTime());
      for(let n=1;n<=5;n++){
        const id=row[n===1?'顯示特效':'顯示特效_'+n];
        if(id>0)IslandMonsters.playEffect(id,mob.x,mob.y,movementTime());
      }
    }
    const enchanted=rows('強化武器加成系統').find(r=>r['強化值']===(weapon.enchant||0));
    if(enchanted&&Math.random()*10000<enchanted['施放機率'])damage+=enchanted['額外傷害'];
    return damage;
  }
  function syncVitals(){
    if(OwnedInventory.owner!==window.activeCharacterId||!window.activeVitalGrowth)return;
    const equipped=OwnedInventory.items.filter(e=>e.slot),sets=EquipmentSets.read(equipped);
    const poly=rows('system_poly_orginal').find(r=>r.gfxId===window.activeTransformCard?.p?.gfx);
    maxHp=Math.max(1,(window.SoulRings?.bonuses().hp||0)+activeVitalGrowth.maxHp+(sets.hp||0)+equipped.reduce((s,e)=>s+(e.item.bonuses.hp||0),0)+(poly?.addMaxHP||0)+(window.ClassBuffs?.maxHp()||0));
    maxMp=Math.max(0,(window.SoulRings?.bonuses().mp||0)+activeVitalGrowth.maxMp+(sets.mp||0)+equipped.reduce((s,e)=>s+(e.item.bonuses.mp||0),0)+(poly?.addMaxMP||0)+(window.ClassBuffs?.maxMp()||0));
    hp=Math.min(hp,maxHp);mp=Math.min(mp,maxMp);
  }
  function reduction(){
    return OwnedInventory.items.filter(e=>e.slot).reduce((n,e)=>n+(e.item.sourceRules?.damage_reduction||0),0)+
      (EquipmentSets.read(OwnedInventory.items).reduction_dmg||0)+(window.ClassBuffs?.reduction()||0)+(window.SoulRings?.bonuses().reduction||0);
  }
  // system_item_blend.checkClass 的職業代碼（DB 只用到 5＝黑妖：卡立普「死神之証」、庫普黑暗武器）；和上面 roleCode（自動學技能用）不同
  const BLEND_CLASS={'黑妖':5};
 function craftCategory(item){
  if(!item)return 'item';
  const n=item.name,t=item.type;
  if(/武魂/.test(n))return 'wuhun';
  if(/娃娃/.test(n))return 'doll';
  if(/項圈|寵物|哨子/.test(n))return 'pet';
  if(item.kind==='weapon')return 'weapon';
  if(item.kind==='armor')return /^(runeword|talisman)/.test(t)?'rune':['ring','amulet','earring','belt','necklace'].includes(t)?'acc':'armor';
  if(t==='potion'||/藥水|靈藥|萬能藥|餅乾/.test(n))return 'potion';
  if(t==='scroll'||/卷軸|強化卷/.test(n))return 'scroll';
  if(t==='gem'||/魔石|寶石|附魔石|變身石/.test(n))return 'gem';
  if(t==='treasure_box'||/寶箱|禮盒|禮包/.test(n))return 'box';
  if(t==='material')return 'material';
  return 'item';
 }
  // 2026-11-21 使用者：製作工匠移除 血盟勳章 300000、上古神話變身-劍聖 39264、上古神話變身-疾風精靈王 39263
  const hiddenCraftItems=new Set([300000,39264,39263,60228,39059,84071,44212,84001,39288,84077,84080,82202,350080,350130,44213,350061,80034,44149,44148,183002,82214,82215,60230,84002,84003,84004,84005,84006,84007,84008,84009,84010,40018,350094,350020,62015,86002,80326,80328,86200,86001,70508,80331,44150,80027,56148,56147,350070,350071,350072,350073,350074,350075,350076,350077,350078,350079,80320,80321,44143,44144,44145,44146,70048,70058,70068,70078,39166,39167,39168,39169,84078,84079,350057,350058,350059,350060,67024,67025,21229,350096,350098,350099,410300,410301,410302,410303,410304,410305,410306,410307,301,302,303,304,305,306,307,308,309,310,311,312,313,314,315,350133,350134,350135,350136,350137,410191,410192,410193,410194,410195,410196,410197,410198,410199,410200,410201,410202,410203,410204,410205,410206,600400,400023,400024,400025,400026,340017,402019,402022,402025,402028,400022,400021,400020,21137,21136,21135]); // 2026-11-16 加：聖誕王者頭飾、耶誕之魔力氣息、耶誕紅襪、耶誕綠襪 // 使用者指定移除的製作成品；依成品編號排除所有重複配方。
  // 傲慢之塔卷軸與傳送符：包含頂樓、幻象、混亂、異變，統一停止製作。
  const towerCraftItems=new Set([...byId.values()].filter(item=>/傲慢/.test(item.name)&&/卷|捲|傳送符/.test(item.name)).map(item=>item.id));
  // 2026-11-18 使用者：製作工匠新增武魂製作，只開放下品武魂（DB 1189～1191：魔蝙蝠／翼魔／污濁精靈），材料改成武魂結晶 1000（原 DB 500），成功率照原本 100%。其餘武魂配方仍不開放。
  const SOUL_CRAFT=new Set([1189,1190,1191]),SOUL_CRAFT_COST='1000';
  // 娜魯帕對話列出的材料與數量。新配方沿用資料庫中娜魯帕的 100% 成功率。
  const elvenNpcIds=new Set([70838,70852,70850,70846,70841]);
  const elvenDialogueCraft=[
    [28, [19, 1], [40507, 5], [40494, 150], [40503, 50]],
    [42, [20, 1], [40521, 2], [40508, 50], [40049, 1], [40503, 25]],
    [138, [40507, 10], [40503, 5]],
    [143, [3, 1], [40503, 5], [40507, 10], [40494, 60]],
    [97, [3, 1], [40503, 10], [40507, 10], [40494, 90]],
    [99, [89, 1], [40503, 30], [40507, 10]],
    [104, [99, 1], [100, 1], [40503, 50], [40508, 60], [40049, 1]],
    [20322, [40507, 10], [40502, 6]],
    [20097, [40505, 2], [40519, 5]],
    [20139, [40504, 2], [40502, 10]],
    [20137, [40497, 4], [40495, 80]],
    [20138, [40509, 8], [40495, 20], [40052, 1]],
    [20222, [40505, 1], [40503, 5], [40507, 5]],
    [20236, [20222, 1], [40497, 2], [40503, 5]],
    [20035, [40521, 1], [40505, 2], [40519, 10], [40503, 20]],
    [20073, [40318, 2], [40495, 10], [40520, 120]],
    [20213, [40505, 2], [40502, 4]],
    [40743, [40507, 1]],
    [20205, [40504, 2], [40502, 10]],
    [172, [40507, 1], [40502, 5]],
    [170, [40507, 10], [40494, 20], [40502, 2], [40504, 2]],
    [5, [40507, 5], [40494, 20]],
    [22, [89, 1], [40507, 10], [40044, 1], [3, 1], [40503, 50]]
  ];
  // 巴姆特原始配方（核心 data/xml/NpcActions/ItemMaking.xml）。
  const bamuteDialogueCraft=[
    [40406,[40405,20]],
    [40401,[40399,5],[40308,500]],
    [40402,[40397,5],[40308,500]],
    [40403,[40398,5],[40308,500]],
    [40404,[40400,5],[40308,500]],
    [20071,[40401,100],[40393,3],[40045,30],[40495,50],[40308,100000]],
    [20059,[40402,100],[40395,3],[40047,30],[40495,50],[40308,100000]],
    [20061,[40403,100],[40394,3],[40046,30],[40495,50],[40308,100000]],
    [20054,[40404,100],[40396,3],[40044,30],[40495,50],[40308,100000]]
  ];
  function dialogueRecipe(npcid,npcname,new_item,materials){
    return {
      id:-new_item,npcid,npcname,new_item,
      note:new_item===20322?'木製的夾克':byId.get(new_item).name,
      new_item_counts:1,new_item_Enchantlvl:0,new_item_Bless:1,
      checkLevel:0,checkClass:0,rnd:100,hpConsume:0,mpConsume:0,
      materials:materials.map(([id])=>id).join(','),
      materials_count:materials.map(([,count])=>count).join(','),
      materials_enchants:materials.map(()=>0).join(',')
    };
  }
  const isElvenCraft=recipe=>elvenNpcIds.has(recipe.npcid);
  const craftRecipes=()=>[...rows('system_item_blend'),...elvenDialogueCraft.map(([id,...materials])=>dialogueRecipe(70838,'娜魯帕',id,materials)),...giranCraftingData.map(args=>dialogueRecipe(...args)),...bamuteDialogueCraft.map(([id,...materials])=>{const recipe=dialogueRecipe(70690,"巴姆特",id,materials);return {...recipe,note:recipe.note.replace("屬性 斗篷","屬性斗篷")};})].filter(r=>!towerCraftItems.has(Number(r.new_item))&&(SOUL_CRAFT.has(r.id)||!['box','wuhun','doll'].includes(craftCategory(byId.get(Number(r.new_item)))))&&Number(r.addchanceitem)!==39288&&!split(r.materials).includes(39288)&&!/^(?:回收魔珠)|神聖魔法書|神力禮盒/.test(byId.get(Number(r.new_item))?.name||'')&&!hiddenCraftItems.has(Number(r.new_item))&&!(String(r.materials)==='40308'&&[39287,39288].includes(Number(r.new_item)))&&![50,51,576,577,578,697,698].includes(r.id)).map(r=>SOUL_CRAFT.has(r.id)?{...r,materials:'39287',materials_count:SOUL_CRAFT_COST,addchanceitem:0}:r); // 576～578：卡立普暗黑武器的舊版重複配方（沒有等級職業限制），只留 1061～1063「死神之証」 // 武魂結晶／提煉石不能用金幣做，只能打怪掉（使用者 2026-11-15）
  function craft(npcId,id,anywhere=false){ // anywhere：從目錄「製作」視窗做，不用靠近 NPC（使用者 2026-11-14 決定）
    const recipe=craftRecipes().find(r=>r.id===id&&r.npcid===npcId);
    if(!recipe||!anywhere&&!IslandMonsters.serviceNearby(npcId,3))return '請靠近對應的製作 NPC。';
    if(recipe.checkLevel>(window.activeCharacterLevel||1)||recipe.checkClass&&recipe.checkClass!==BLEND_CLASS[job])return '職業或等級不符合條件。';
    if(hp<=recipe.hpConsume||mp<recipe.mpConsume)return '生命或魔力不足。';
    const next=OwnedInventory.snapshot,materials=split(recipe.materials),counts=split(recipe.materials_count),enchants=split(recipe.materials_enchants);
    for(let i=0;i<materials.length;i++)if(!take(next,keyFor(materials[i]),counts[i]||1,enchants[i]??null))return '需要的材料不足，或材料正在穿戴。';
    const success=Math.random()*100<recipe.rnd;
    if(success&&!add(next,keyFor(recipe.new_item),recipe.new_item_counts,recipe.new_item_Enchantlvl,recipe.new_item_Bless))return '背包空間不足。';
    if(success&&recipe.bonus_item&&!add(next,keyFor(recipe.bonus_item),recipe.bonus_item_count,recipe.bonus_item_enchant))return '背包空間不足。';
    if(!success&&recipe.residue_item&&!add(next,keyFor(recipe.residue_item),recipe.residue_count,recipe.residue_enchant))return '背包空間不足。';
    if(!OwnedInventory.applyChange(next,{hp:hp-recipe.hpConsume,mp:mp-recipe.mpConsume}))return '無法存檔，製作未完成。';
    return success?'製作成功。':'製作失敗。';
  }
  function openCrafting(npcId=null){
    cancelPointerGesture({preserveNavigation:true});
    const dialog=document.querySelector('#panel'),content=document.querySelector('#panelContent');
    dialog.classList.remove('classic-panel','reference-menu-panel','game-catalog-panel');
    dialog.hidden=false;document.querySelector('#close').hidden=false;
    const title=uiElement('h2','','製作配方'),query=uiElement('input',''),list=uiElement('div',''),detail=uiElement('div','');
    query.placeholder='搜尋製作品名稱';list.style.cssText='max-height:42dvh;overflow:auto;display:grid;gap:6px';
    content.replaceChildren(title,query,list,detail);
    function refresh(){
      list.replaceChildren();
      const matches=craftRecipes().filter(r=>(npcId===null||r.npcid===npcId)&&r.note?.includes(query.value));
      for(const row of matches.slice(0,60)){
        const b=uiElement('button','classic-use',row.note+' · '+row.npcname);
        b.onclick=()=>{
          const materials=split(row.materials),counts=split(row.materials_count),enchants=split(row.materials_enchants);
          detail.replaceChildren(uiElement('h3','',row.note),uiElement('p','','成功率 '+row.rnd+'% · 需要等級 '+row.checkLevel));
          for(let i=0;i<materials.length;i++)detail.append(uiElement('p','',(enchants[i]?'+'+enchants[i]+' ':'')+(byId.get(materials[i])?.name||materials[i])+' × '+counts[i]));
          const action=uiElement('button','classic-use','製作');
          action.disabled=!IslandMonsters.serviceNearby(row.npcid,3);
          action.onclick=()=>{const result=craft(row.npcid,row.id);detail.append(uiElement('p','',result));};
          detail.append(action);
          if(action.disabled)detail.append(uiElement('p','','請靠近 '+row.npcname+' 製作。'));
        };list.append(b);
      }
      if(matches.length>60)list.append(uiElement('small','','請輸入名稱縮小範圍。'));
    }
    query.oninput=refresh;refresh();query.focus();
  }
  const previousPanel=panel;
  panel=function(type){
    previousPanel(type);
    if(type==='settings'){
      const craftButton=uiElement('button','classic-use','製作配方');craftButton.onclick=()=>CraftingWindow.open();
      document.querySelector('#panelContent').append(craftButton);
    }
  };
  return {rows,automaticSkills,extraDrops,supplementalDropNames,killRewards,xpMultiplier,starter,useItem,damageBonus,weaponProc,weaponSkillChance,syncVitals,reduction,
    craft,craftRecipes,craftCategory,isElvenCraft,openCrafting,prepareOilParasolKit,blendClass:role=>BLEND_CLASS[role],addItem:add,takeItem:take,craftNpcs:()=>new Set(craftRecipes().map(r=>r.npcid))};
})();
window.DBGameRules=DBGameRules;
