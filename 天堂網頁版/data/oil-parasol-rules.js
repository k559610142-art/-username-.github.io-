const OilParasolRules = (() => {
  function makeWeapon(id, name, weight, damage, options = {}) {
    const {profile='新手', boss=false, hit=0, extraDamage=0, mpr=0, shield=0, hp=0, mp=0} = options;
    return {
      id, kind: 'weapon', name, type: 'parasol', mode: 'blunt',
      icon: id===980010?'assets/interface/items/oil-parasol.png':'assets/interface/items/parasols/'+id+'.png',
      weight, ac: 0, damage,
      allowed: ['油傘女'], twoHand: false, profile, boss, shield,
      bonuses: {hp, mp},
      sourceRules: {safenchant: 6, cant_delete: id===980010?1:0, range: 1, hitmodifier: hit, dmgmodifier: extraDamage, add_mpr: mpr}
    };
  }
  const weapon = makeWeapon(980010,'青楓油傘',3000,[8,6]);
  const weapons = [
    weapon,
    makeWeapon(980020,'丹砂油傘',3000,[11,9],{profile:'攻擊型',hit:1,extraDamage:1}),
    makeWeapon(980021,'赤燄油傘',3500,[14,11],{profile:'攻擊型',hit:2,extraDamage:2}),
    makeWeapon(980022,'緋楓金骨傘',4000,[17,14],{profile:'攻擊型',hit:2,extraDamage:3}),
    makeWeapon(980023,'夜刃裂風傘',4500,[20,16],{profile:'攻擊型',hit:3,extraDamage:4}),
    makeWeapon(980024,'朱雀焚羽傘',5000,[24,19],{profile:'攻擊型',boss:true,hit:4,extraDamage:5}),
    makeWeapon(980025,'青蘆油傘',3000,[8,7],{profile:'回魔型',mpr:1,mp:4}),
    makeWeapon(980026,'銀濤油傘',3500,[10,8],{profile:'回魔型',mpr:2,mp:8}),
    makeWeapon(980027,'蒼雲凝珠傘',4000,[12,10],{profile:'回魔型',mpr:3,mp:12}),
    makeWeapon(980028,'星潮引靈傘',4500,[14,12],{profile:'回魔型',mpr:4,mp:16}),
    makeWeapon(980029,'滄龍聚潮傘',5000,[17,15],{profile:'回魔型',boss:true,mpr:5,mp:25}),
    makeWeapon(980030,'青竹護傘',3000,[8,8],{profile:'護盾型',shield:4,hp:6}),
    makeWeapon(980031,'琥珀銅骨傘',3500,[10,10],{profile:'護盾型',shield:7,hp:10}),
    makeWeapon(980032,'翠甲六稜傘',4000,[12,12],{profile:'護盾型',shield:10,hp:15}),
    makeWeapon(980033,'磐岩鎖甲傘',4500,[14,14],{profile:'護盾型',shield:14,hp:20}),
    makeWeapon(980034,'玄武鎮岳傘',5000,[17,17],{profile:'護盾型',boss:true,shield:20,hp:32}),
    makeWeapon(980035,'春杏油傘',3000,[10,8],{profile:'平均型',hit:1,mpr:1,shield:2}),
    makeWeapon(980036,'紫梅油傘',3500,[12,10],{profile:'平均型',hit:1,extraDamage:1,mpr:1,shield:4}),
    makeWeapon(980037,'靛月雙紋傘',4000,[14,13],{profile:'平均型',hit:2,extraDamage:1,mpr:2,shield:6}),
    makeWeapon(980038,'金暮合紋傘',4500,[17,16],{profile:'平均型',hit:2,extraDamage:2,mpr:2,shield:8}),
    makeWeapon(980039,'日月同輝傘',5000,[20,19],{profile:'平均型',boss:true,hit:3,extraDamage:2,mpr:3,shield:10})
  ];
  const itemRules = Object.fromEntries(weapons.map(item=>['weapon:'+item.id,{
    kind:'weapon', type:'parasol', handler:'0', useType:'', delayId:0, delayMs:0,
    stackable:false, minLevel:0, maxLevel:0, bless:1
  }]));
  const isWeapon = item => item?.kind==='weapon'&&Object.hasOwn(itemRules,'weapon:'+item.id);
  const skillIds = {
    slash:980011,shield:980012,step:980013,shieldMastery:980014,lightfoot:980015,
    counter:980016,sweep:980017,decoy:980018,riposte:980019,twinSweep:980050
  };
  const learnAt = [
    [1,skillIds.slash],[1,skillIds.lightfoot],[8,skillIds.shield],[8,skillIds.counter],
    [16,skillIds.step],[16,skillIds.sweep],[24,skillIds.decoy],[24,skillIds.riposte],
    [32,skillIds.twinSweep],[32,skillIds.shieldMastery]
  ];
  const skill = (id, name, mp, reuse, duration, target, range) =>
    ({id, name, circle:31, mp, fixedMp:true, hp:0, material:0, materialCount:0, reuse, duration, target, range, damage:[0,0,0], gfx:0});
  const skills = {
    [skillIds.slash]: {...skill(skillIds.slash, '傘鋒斬', 2, 3500, 0, 'attack', 1), description: '近身揮傘斬擊。持傘時敏捷提高命中與傷害。'},
    [skillIds.shield]: {...skill(skillIds.shield, '張傘護身', 4, 12000, 8, 'none', 0), description: '需裝備傘類武器。8 秒內可吸收 10＋敏捷一半（捨去小數）＋武器護盾量的傷害。'},
    [skillIds.lightfoot]: {...skill(skillIds.lightfoot, '輕足', 0, 0, 0, 'none', 0), description: '被動。持傘時近距離迴避 +2。'},
    [skillIds.counter]: {...skill(skillIds.counter, '回身傘擊', 3, 6000, 0, 'attack', 1), description: '近身單體斬擊。有護盾時，此擊傷害提高 25%。'},
    [skillIds.step]: {...skill(skillIds.step, '傘影步', 50, 18000, 300, 'none', 0), description: '300 秒內敏捷 +3、近距離迴避 +4。'},
    [skillIds.sweep]: {...skill(skillIds.sweep, '旋傘掃', 5, 8000, 0, 'none', 1), description: '掃擊周圍 1 格，最多 3 隻怪物，每隻承受傘鋒斬 70% 的傷害。'},
    [skillIds.decoy]: {...skill(skillIds.decoy, '油傘影分身', 50, 120000, 10, 'none', 3), description: '召出一個分身，持續 10 秒，吸引周圍 3 格內最多 4 隻普通怪物的攻擊。'},
    [skillIds.riposte]: {...skill(skillIds.riposte, '收傘反鋒', 20, 12000, 0, 'none', 1), description: '掃擊周圍 1 格，最多 3 隻怪物。消耗最多 10 點剩餘護盾，每隻追加等量傷害。'},
    [skillIds.twinSweep]: {...skill(skillIds.twinSweep, '雙影旋傘', 18, 18000, 0, 'none', 1), description: '須有分身。本體與分身各掃擊周圍 1 格，最多 5 隻怪物，每隻只受一次傷害。'},
    [skillIds.shieldMastery]: {...skill(skillIds.shieldMastery, '傘心不破', 0, 0, 0, 'none', 0), description: '被動。張傘護身的護盾量提高 25%，持續 10 秒。'}
  };
  const bookIds = {
    [skillIds.slash]:980040,[skillIds.shield]:980041,[skillIds.step]:980042,[skillIds.shieldMastery]:980043,
    [skillIds.lightfoot]:980044,[skillIds.counter]:980045,[skillIds.sweep]:980046,[skillIds.decoy]:980047,
    [skillIds.riposte]:980048,[skillIds.twinSweep]:980049
  };
  const bookItems = learnAt.map(([level,id],index)=>({
    id:bookIds[id], kind:'etcitem', type:'spellbook', name:'油傘秘笈（'+skills[id].name+'）',
    icon:'assets/interface/items/parasols/'+bookIds[id]+'.png',
    weight:1000, allowed:['油傘女'], bonuses:{}, sourceRules:{},
    bookSkill:id, minLevel:level, tier:1+Math.floor(index/2)
  }));
  const books = Object.fromEntries(bookItems.map(item=>[item.id,{skill:item.bookSkill,min:{油傘女:item.minLevel},element:''}]));
  for(const item of bookItems)itemRules['etcitem:'+item.id]={
    kind:'etcitem',type:'spellbook',handler:'skill.Skill_OilParasol',useType:'book',delayId:3,
    delayMs:500,stackable:true,minLevel:item.minLevel,maxLevel:0,bless:1
  };
  return {
    weapon, weapons, itemRules, weaponKey: 'weapon:'+weapon.id, skillIds, skills,
    books,bookItems,starterBookId:bookIds[skillIds.slash],
    isWeapon,
    baseDamage: (item,mob) => item.damage[mob?.spawn?.npc?.size==='large'?1:0],
    shieldCapacity(dex,item,mastery=false){
      const amount=isWeapon(item)?10+Math.floor((dex||0)/2)+(item.shield||0):0;
      return mastery?Math.floor(amount*1.25):amount;
    },
    dexBonus: (dex,divisor) => Math.max(0,Math.floor(((dex||0)-10)/divisor))
  };
})();

if(typeof module!=='undefined'&&module.exports)module.exports=OilParasolRules;
else {
  INTERFACE_CATALOG.items.push(...OilParasolRules.weapons,...OilParasolRules.bookItems);
  for(const book of OilParasolRules.bookItems){
    const skill=OilParasolRules.skills[book.bookSkill];
    INTERFACE_CATALOG.skills.push({...skill,level:book.minLevel,icon:book.icon});
  }
  Object.assign(ITEM_USE_RULES.definitions,OilParasolRules.itemRules);
}
