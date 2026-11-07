const PlayerGrowth = (() => {
  function roll(id,level,channel,size){
    let hash=2166136261;
    for(const char of id+'/'+level+'/'+channel)hash=Math.imul(hash^char.charCodeAt(0),16777619);
    hash=(Math.imul(hash>>>0,1664525)+1013904223)>>>0;
    return Math.floor(hash/4294967296*size);
  }
  function grow(record,role,attributes,id,target){
    const config=playerGrowthData[role],next={...record};
    if(!config)return next;
    const con=attributes.con||0,wis=Math.max(0,Math.min(45,attributes.wis||0));
    for(let level=next.level+1;level<=target;level++){
      const hpGain=Math.max(0,con-15)+config.hpBase+roll(id,level,'hp',2);
      const [min,max]=config.mp[wis];
      const mpGain=min+roll(id,level,'mp',max-min+1);
      next.maxHp=Math.min(config.hpCap,next.maxHp+hpGain);
      next.maxMp=Math.min(config.mpCap,next.maxMp+mpGain);
      next.level=level;
    }
    return next;
  }
  function fromCharacter(character,base,target){
    const saved=character.vitalGrowth;
    const valid=saved&&Number.isInteger(saved.level)&&saved.level>=1&&saved.level<=target&&
      Number.isInteger(saved.maxHp)&&saved.maxHp>=base.hp&&
      Number.isInteger(saved.maxMp)&&saved.maxMp>=base.mp;
    const initial=valid?saved:{level:1,maxHp:base.hp,maxMp:base.mp};
    return grow(initial,character.role,character.stats,character.id,target);
  }
  function advance(target){
    const old=window.activeVitalGrowth||{level:1,maxHp,maxMp};
    const next=grow(old,job,window.playerAttributes||{},window.activeCharacterId,target);
    const hpGear=maxHp-old.maxHp,mpGear=maxMp-old.maxMp;
    if(hp>0)hp+=next.maxHp-old.maxHp;
    mp+=next.maxMp-old.maxMp;
    maxHp=next.maxHp+hpGear;maxMp=next.maxMp+mpGear;
    window.activeVitalGrowth=next;
  }
  return {fromCharacter,advance};
})();
window.PlayerGrowth=PlayerGrowth;
