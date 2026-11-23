const PlayerGrowth = (() => {
  function roll(id,level,channel,size){
    let hash=2166136261;
    for(const char of id+'/'+level+'/'+channel)hash=Math.imul(hash^char.charCodeAt(0),16777619);
    hash=(Math.imul(hash>>>0,1664525)+1013904223)>>>0;
    return Math.floor(hash/4294967296*size);
  }
  const statNames={str:'力量',dex:'敏捷',con:'體質',int:'智力',wis:'精神',cha:'魅力'};
  const earned=level=>Math.max(0,level-50);
  function allocations(value,level){
    if(!Array.isArray(value))return [];
    const valid=value.filter(point=>point&&Object.hasOwn(statNames,point.key)&&Number.isInteger(point.level)&&point.level>=50&&point.level<=level);
    const result=[];
    for(const {key,level:allocatedLevel} of valid.sort((a,b)=>a.level-b.level)){
      // 舊版多給的一點延到有合法點數的等級，保留仍可成立的分配。
      const effectiveLevel=Math.max(allocatedLevel,51+result.length);
      if(effectiveLevel<=level)result.push({key,level:effectiveLevel});
    }
    return result;
  }
  function attributesWithPoints(base,points){
    const result={...base};
    for(const {key} of points)result[key]++;
    return result;
  }
  function available(){
    return earned(window.activeCharacterLevel||1)-(window.activeStatAllocations?.length||0);
  }
  function allocate(key){
    if(window.gameFlowState!=='playing'||!window.activeCharacterId||!Object.hasOwn(statNames,key)||available()<1)return false;
    const previous=window.activeStatAllocations,attributes=window.playerAttributes;
    window.activeStatAllocations=[...previous,{key,level:window.activeCharacterLevel}];
    window.playerAttributes={...attributes,[key]:attributes[key]+1};
    if(!GameEntry.saveActive()){
      window.activeStatAllocations=previous;
      window.playerAttributes=attributes;
      return false;
    }
    return true;
  }
  function grow(record,role,base,id,target,points=[],random=roll){
    const config=playerGrowthData[role],next={...record};
    if(!config)return next;
    const attributes={...base};
    let pointIndex=0;
    for(let level=next.level+1;level<=target;level++){
      while(pointIndex<points.length&&points[pointIndex].level<level){
        const {key}=points[pointIndex++];
        attributes[key]++;
      }
      const con=attributes.con||0,wis=Math.max(0,Math.min(45,attributes.wis||0));
      const hpGain=Math.max(0,con-15)+config.hpBase+random(id,level,'hp',2);
      const [min,max]=config.mp[wis];
      const mpGain=min+random(id,level,'mp',max-min+1);
      next.maxHp=Math.min(config.hpCap,next.maxHp+hpGain);
      next.maxMp=Math.min(config.mpCap,next.maxMp+mpGain);
      next.level=level;
    }
    return next;
  }
  function fromCharacter(character,base,target){
    const saved=character.vitalGrowth;
    const valid=saved&&Number.isInteger(saved.level)&&saved.level>=1&&saved.level<=target&&Number.isInteger(saved.maxHp)&&Number.isInteger(saved.maxMp);
    let initial=valid?{...saved}:{level:1,maxHp:base.hp,maxMp:base.mp};delete initial.repairedHp;delete initial.repairedMp;
    const points=allocations(character.statAllocations,target);
    if(valid){
      const start={level:1,maxHp:base.hp,maxMp:base.mp};
      const growToSaved=random=>grow(start,character.role,character.stats,character.id,saved.level,points,random);
      const minimum=growToSaved(()=>0),maximum=growToSaved((id,level,channel,size)=>size-1);
      const repairHp=saved.maxHp<minimum.maxHp||saved.maxHp>maximum.maxHp;
      const repairMp=saved.maxMp<minimum.maxMp||saved.maxMp>maximum.maxMp;
      if(repairHp||repairMp){
        const expected=growToSaved(roll);
        if(repairHp){initial.maxHp=expected.maxHp;initial.repairedHp=true;}
        if(repairMp){initial.maxMp=expected.maxMp;initial.repairedMp=true;}
      }
    }
    return grow(initial,character.role,character.stats,character.id,target,points);
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
  return {fromCharacter,advance,allocations,attributesWithPoints,available,allocate,statNames};
})();
window.PlayerGrowth=PlayerGrowth;
