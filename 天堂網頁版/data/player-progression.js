const PlayerProgression = (() => {
  const {drops,thresholds,rates}=killRewardData;
  const catalog=new Map(INTERFACE_CATALOG.items.map(item=>[item.id,item]));
  const maximum=thresholds.at(-1)[1]-1;
  function levelFor(value){
    let result=1;
    for(const [level,required]of thresholds){
      if(value<required)break;
      result=level;
    }
    return result;
  }
  function initialExperience(character){
    if(Number.isSafeInteger(character.experience)&&character.experience>=0)return Math.min(maximum,character.experience);
    return thresholds.find(([level])=>level===(character.level||1))?.[1]||0;
  }
  function percentage(){
    const value=window.activeCharacterExperience||0,level=levelFor(value);
    const minimum=thresholds.find(([number])=>number===level)?.[1]||0;
    const next=thresholds.find(([number])=>number===level+1)?.[1];
    return next?Math.max(0,Math.min(99.99,(value-minimum)/(next-minimum)*100)):100;
  }
  function weekend(){
    const parts=new Intl.DateTimeFormat('en-US',{timeZone:'Asia/Taipei',weekday:'short',hour:'numeric',hourCycle:'h23'}).formatToParts(new Date());
    const day=parts.find(p=>p.type==='weekday').value,hour=+parts.find(p=>p.type==='hour').value;
    return day==='Sat'||day==='Sun'||day==='Fri'&&hour>=19||day==='Mon'&&hour<7;
  }
  function roll(mob){
    const loot=[],weekendRate=rates.weekend&&weekend()?rates.WeekendRateDropItems:1;
    for(const drop of [...(drops[mob.spawn.npcId]||[]),...DBGameRules.extraDrops(mob)]){
      if(typeof REMOVED_ITEM_IDS!=='undefined'&&REMOVED_ITEM_IDS.has(drop.id))continue;
      const item=catalog.get(drop.id);
      if(!item)throw Error('掉落道具不存在：'+drop.id);
      const coin=drop.id===40308;
      const multiplier=drop.fixedRate?1:coin?1:rates.RateDropItems*weekendRate;
      if(Math.random()*1000000>=Math.min(1000000,drop.chance*multiplier))continue;
      const low=Math.min(drop.min,drop.max),high=Math.max(drop.min,drop.max);
      const count=Math.floor((low+Math.floor(Math.random()*(high-low+1)))*(coin?rates.RateDropAdena:1));
      if(count>0)loot.push({key:item.kind+':'+item.id,count,name:item.name});
    }
    loot.push(...DBGameRules.killRewards(mob));
    return {experience:Math.max(0,Math.floor(mob.spawn.npc.exp*rates.RateXp*DBGameRules.xpMultiplier(window.activeCharacterLevel)*(window.ItemEffects?.expRate()||1))),loot}; // 經驗藥水倍率
  }
  function award(mob){
    if(window.gameFlowState!=='playing'||CharacterActions.dead||OwnedInventory.owner!==window.activeCharacterId)return false;
    const reward=mob.reward??=roll(mob),before=window.activeCharacterLevel;
    // 正義值：打死 lawful 為負的怪（邪惡怪物）加回絕對值（DB npc.lawful，例：骷髏 −12 → +12、巴風特 −500 → +500），上限 32767；先加再存檔，獎勵失敗就退回
    const lawfulBefore=Number(window.activeCharacterLawful)||0,lawfulGain=Math.max(0,-(Number(mob.spawn.npc.raw?.lawful)||0));
    if(lawfulGain)window.activeCharacterLawful=Math.min(32767,lawfulBefore+lawfulGain);
    if(!OwnedInventory.reward(reward.experience,reward.loot)){
      window.activeCharacterLawful=lawfulBefore;
      IslandCombat.stop();
      document.querySelector('#log').textContent='獎勵尚未領取，請確認背包空間及本機存檔可用後再擊殺。';
      return false;
    }
    const text=['擊殺 '+mob.spawn.npc.name,'經驗 +'+reward.experience,...(window.activeCharacterLawful>lawfulBefore?['正義 +'+(window.activeCharacterLawful-lawfulBefore)]:[]),...reward.loot.map(item=>item.name+' × '+item.count)];
    if(window.activeCharacterLevel>before)text.push('升至 Lv. '+window.activeCharacterLevel);
    document.querySelector('#log').textContent=text.join(' · ');
    updateReferenceHud();
    return true;
  }
  return {levelFor,initialExperience,percentage,award,get maxExperience(){return maximum;}};
})();
window.PlayerProgression=PlayerProgression;
