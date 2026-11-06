// Piece IDs come from the local 2022 armor_set table. The browser edition uses smaller bonuses.
const EquipmentSets = (() => {
  const definitions = [
    ['冒險者配對',['weapon:1','armor:20001','armor:20090'],{hpr:1}],
    ['皮製套裝',[20001,20090,20193,20219],{ac:-1}],
    ['歐西斯套裝',[20034,20072,20135,20237],{ac:-1}],
    ['侏儒套裝',[20007,20052,20223],{ac:-1}],
    ['銀釘皮製套裝',[20038,20148,20241,20212],{ac:-1}],
    ['骷髏套裝',[20045,20124,20221],{ac:-1}],
    ['惡魔套裝',[20009,20099,20165,20197],{ac:-1,hpr:1}],
    ['死亡騎士套裝',[20010,20100,20166,20198],{ac:-2}],
    ['反王套裝',[20024,20118,20170,20203],{ac:-1,hpr:1}],
    ['克特套裝',[20041,20150,20184,20214],{ac:-2}],
    ['賽尼斯套裝',[20042,20151,20185,20215],{ac:-1,mpr:1}],
    ['妖精套裝',[20389,20393,20401,20409,20406],{ac:-2}],
    ['法師套裝',[20012,20111],{mpr:1}],
    ['鋼鐵套裝',[20003,20091,20163,20194,20220],{ac:-2}],
    ['藍海賊套裝',[20044,20155,20188,20217],{ac:-1}],
    ['慈愛．勇氣套裝',[20418,20433],{hpr:1,mpr:1}]
  ].map(([name,keys,bonus])=>({name,keys:keys.map(id=>typeof id==='number'?'armor:'+id:id),bonus}));
  function progress(set, items) {
    const owned = new Map(items.map(entry=>[entry.key,{owned:false,equipped:false}]));
    for (const entry of items) {
      const state=owned.get(entry.key);
      state.owned=true;
      state.equipped ||= !!entry.slot;
    }
    return set.keys.map(key=>owned.get(key)||{owned:false,equipped:false});
  }
  function read(items) {
    const result={ac:0,hpr:0,mpr:0,active:[]};
    const equipped=new Set(items.filter(e=>e.slot).map(e=>e.key));
    for (const set of definitions) if(set.keys.every(key=>equipped.has(key))){
      for(const [key,value] of Object.entries(set.bonus))result[key]+=value;
      result.active.push(set.name);
    }
    return result;
  }
  function label(bonus) {
    return [['ac','AC'],['hpr','回血'],['mpr','回魔']].filter(([key])=>bonus[key])
      .map(([key,name])=>name+' '+(bonus[key]>0?'+':'')+bonus[key]).join('、');
  }
  return {definitions,progress,read,label};
})();
