// 超越卡統一核心加成，依近戰與弓系分配命中及傷害。
(()=>{
 const profiles=new Map([
  ['賽尼斯',['addDmg','addHit']],
  ['飄揚射手',['addBowDmg','addBowHit']],
  ['煉獄巴風特',['addDmg','addHit']],
  ['關刀聖使',['addDmg','addHit']],
  ['疾風精靈王',['addBowDmg','addBowHit']]
 ]);
 const table=dbActiveSettings.system_poly_orginal;
 const columns=table.columns.map(column=>column.name);
 const gfxIndex=columns.indexOf('gfxId');
 const attributes={addStr:['str','力量'],addDex:['dex','敏捷'],addCon:['con','體質'],addInt:['int','智力'],addWis:['wis','精神'],addCha:['cha','魅力']};
 const labels={...Object.fromEntries(Object.entries(attributes).map(([key,[,label]])=>[key,label])),
  addMaxHP:'HP',addMaxMP:'MP',addDmg:'近距離傷害',addHit:'近距離命中',addBowDmg:'遠距離傷害',addBowHit:'遠距離命中'};
 const speeds=[['攻擊速度','attackSpeedPct',120],['移動速度','moveSpeedPct',16],['施展速度','castSpeedPct',43]];

 for(const card of transformCardBook){
  const profile=profiles.get(card.n);
  if(!profile)continue;
  const gfx=card.p.gfx;
  const index=table.rows.findIndex(row=>row[gfxIndex]===gfx);
  const row=table.rows[index];
  const bonus=Object.fromEntries(columns.map((key,i)=>[key,row?.[i]??0]));
  bonus.gfxId=gfx;
  bonus.note=card.n;
  for(const key of [...Object.keys(attributes),...profile])bonus[key]=10;
  for(const key of ['addMaxHP','addMaxMP'])bonus[key]=500;
  const updated=columns.map(key=>bonus[key]);
  if(index<0)table.rows.push(updated);
  else table.rows[index]=updated;

  card.attributeBonuses=Object.fromEntries(Object.entries(attributes).map(([key,[stat]])=>[stat,bonus[key]]));
  card.pb={...card.pb,fx:Object.entries(labels).filter(([key])=>bonus[key]).map(([key,label])=>label+'+'+bonus[key])};
  const effects=card.fx.filter(effect=>!speeds.some(([label])=>effect.startsWith(label)));
  const speedEffects=speeds.map(([label,field,floor])=>{
   const effect=card.fx.find(text=>text.startsWith(label));
   card[field]=field==='attackSpeedPct'?floor:Math.max(floor,Number(effect?.match(/\+\s*(\d+(?:\.\d+)?)%/)?.[1])||0);
   return label+' +'+card[field]+'%';
  });
  card.fx=[...speedEffects,...effects];
 }
})();
