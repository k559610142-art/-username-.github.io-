const DBGameRules = (() => {
  const tables=new Map();
  for(const [name,table] of Object.entries(dbActiveSettings)){
    tables.set(name,table.rows.map(row=>Object.fromEntries(table.columns.map((c,i)=>[c.name,row[i]]))));
  }
  const rows=name=>tables.get(name)||[];
  const roleCode={'王族':0,'騎士':1,'法師':2,'妖精':3};
  const roleFlag={'王族':1,'騎士':2,'妖精':4,'法師':8};
  const byId=new Map(INTERFACE_CATALOG.items.map(item=>[item.id,item]));
  const keyFor=id=>{const item=byId.get(+id);return item?item.kind+':'+item.id:null;};
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
  function extraDrops(mob){
    const map=window.activeMapId||0;
    return [
      ...rows('怪物掉落全圖設置').map(row=>({id:row['道具'],min:row['最小量'],max:row['最大量'],chance:row['機率'],fixedRate:true})),
      ...rows('droplist_map').filter(row=>row.mapid===map).map(row=>({id:row.itemid,min:row.min,max:row.max,chance:row.chance}))
    ];
  }
  function killRewards(mob){
    const rewards=[];
    for(const row of rows('怪物擊殺獎勵系統')){
      if(row['Npc編號']!==mob.spawn.npcId)continue;
      for(const id of [row['一般攻擊者獎勵道具編號'],row['最後攻擊者獎勵道具編號']]){
        if(id>0&&byId.has(id))rewards.push({key:keyFor(id),name:byId.get(id).name,count:1});
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
    if(!key||!rule||!Number.isSafeInteger(count)||count<1)return false;
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
    common:[[40308,100000],[40013,50],[40010,1000],[40079,10],[20028,1],[20082,1],[20126,1],[20173,1],[20206,1],[20232,1],[20282,1]],
    '王族':[[7,1]],'騎士':[[7,1]],'法師':[[7,1]],'妖精':[[175,1],[7,1],[40743,1000]],'戰士':[[147,1]],'龍騎士':[[35,1]],'幻術師':[[120,1]]
  };
  function starter(role,existing){
    const next=clone(existing);
    for(const [id,count] of [...STARTER_KIT.common,...(STARTER_KIT[role]||[])]){
      if(!add(next,keyFor(id),count))throw Error('新手道具設定錯誤：'+id);
    }
    return next;
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
    const fixed=rows('etcitem_boxs').filter(row=>row.box_item_id===id);
    const random=rows('etcitem_box').filter(row=>row.box_item_id===id);
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
    if(!take(next,entry.key,1))return false;
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
      const r=e.item.sourceRules||{};
      return sum+(ranged?(r.bow_dmg_modifier||0):(r.dmgmodifier||r.dmg_modifier||0))+(e.slot==='weapon'?(e.enchant||0):0);
    },0);
    const poly=rows('system_poly_orginal').find(r=>r.gfxId===window.activeTransformCard?.p?.gfx);
    return extra+(ranged?set.bow_modifier_dmg||0:set.modifier_dmg||0)+(ranged?poly?.addBowDmg||0:poly?.addDmg||0)+(window.ClassBuffs?.damageBonus(ranged)||0);
  }
  function weaponProc(mob){
    const weapon=OwnedInventory.items.find(e=>e.slot==='weapon');
    if(!weapon)return 0;
    let damage=0;
    const power=rows('weapon_power').find(r=>r.weapon_id===weapon.item.id);
    if(power)damage+=power.add_dmg_min+Math.floor(Math.random()*(power.add_dmg_max-power.add_dmg_min+1));
    for(const row of rows('weapon_skill')){
      if(row.weapon_id!==weapon.item.id||Math.random()*100>=row.probability)continue;
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
    maxHp=Math.max(1,activeVitalGrowth.maxHp+(sets.hp||0)+equipped.reduce((s,e)=>s+(e.item.bonuses.hp||0),0)+(poly?.addMaxHP||0)+(window.ClassBuffs?.maxHp()||0));
    maxMp=Math.max(0,activeVitalGrowth.maxMp+(sets.mp||0)+equipped.reduce((s,e)=>s+(e.item.bonuses.mp||0),0)+(poly?.addMaxMP||0)+(window.ClassBuffs?.maxMp()||0));
    hp=Math.min(hp,maxHp);mp=Math.min(mp,maxMp);
  }
  function reduction(){
    return OwnedInventory.items.filter(e=>e.slot).reduce((n,e)=>n+(e.item.sourceRules?.damage_reduction||0),0)+
      (EquipmentSets.read(OwnedInventory.items).reduction_dmg||0)+(window.ClassBuffs?.reduction()||0);
  }
  function craft(npcId,id){
    const recipe=rows('system_item_blend').find(r=>r.id===id&&r.npcid===npcId);
    if(!recipe||!IslandMonsters.serviceNearby(npcId,3))return '請靠近對應的製作 NPC。';
    if(recipe.checkLevel>(window.activeCharacterLevel||1)||recipe.checkClass&&recipe.checkClass!==roleCode[job])return '職業或等級不符合條件。';
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
      const matches=rows('system_item_blend').filter(r=>(npcId===null||r.npcid===npcId)&&r.note?.includes(query.value));
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
      const craftButton=uiElement('button','classic-use','製作配方');craftButton.onclick=()=>openCrafting();
      document.querySelector('#panelContent').append(craftButton);
    }
  };
  return {rows,automaticSkills,extraDrops,killRewards,xpMultiplier,starter,useItem,damageBonus,weaponProc,syncVitals,reduction,
    craft,openCrafting,craftNpcs:()=>new Set(rows('system_item_blend').map(r=>r.npcid))};
})();
window.DBGameRules=DBGameRules;
