// Ability-based rarity. Original card effects, restrictions and owned names stay intact.
(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;else{root.TransformRarity=api;api.apply(transformCardBook);}})(typeof window!=='undefined'?window:globalThis,()=>{
 const FIXED=Object.freeze({賽尼斯:7,飄揚射手:7,/* 2026-11-17 使用者：黑暗精靈王（疾風精靈王）、獄火死亡騎士（關刀聖使）、飄揚射手、賽尼斯放入超越 */狂暴將軍:2,德雷克:2,/* 2026-11-17 使用者：從傳說移到高級 */反王肯恩:3,布魯迪卡:3,/* 2026-11-17 使用者：從傳說移到稀有 */巴風特:1,死亡騎士:2,黑暗精靈:2,黑暗騎士:2,黑暗法師:2,黑暗巡守:2,炎魔:5,銀光刺客:3,銀光法師:3,銀光騎士:3,銀光巡守:3,關刀聖使:7,疾風精靈王:7,
  // 2026-11-16：使用者截圖要求改成高級卡（神威剛彈）；光刃死騎、死亡戰騎、紫刃死騎後來再改成稀有卡；火焰弓箭手、小惡魔、思克巴女皇、反恐菁英(走)、歐姆裝甲兵、獨眼巨人改成高級；神話・炎魔改成高級；紫警衛(弓)、紫警衛(槍)改成英雄
  光刃死騎:3,死亡戰騎:3,神威剛彈:2,紫刃死騎:3,
  火焰弓箭手:2,小惡魔:2,思克巴女皇:2,'反恐菁英(走)':2,歐姆裝甲兵:2,獨眼巨人:2,'神話・炎魔':2,'神話・舊版賽尼斯':6,'神話・新版賽尼斯':6,'神話・戰將反王肯恩':6,'歪曲的潔尼斯女王':6,'不幸的幻象眼魔':6,'恐怖的吸血鬼':6,'死亡的殭屍王':6,'地獄的黑豹':6,'不滅的巫妖':6,'傲慢的烏格奴斯':6,'邪惡的鐮刀死神':6, /* 2026-11-17：新版炎魔（卡名「炎魔」，gfx 13362）改傳說；舊版外觀的「神話・炎魔」顯示名改成「炎魔」（transform-cards.js DISPLAY_NAMES） */'紫警衛(弓)':4,'紫警衛(槍)':4,
  // 2026-11-16：使用者截圖要求改成一般卡（含原本固定高級的黑暗妖精刺客）
  果凍怪:1,甘地妖魔:1,阿魯巴:1,羅孚妖魔:1,食人妖精王:1,長老:1,食人妖精:1,黑長者:1,史巴托:1,巨人:1,思克巴:1,格利芬:1,紙人:1,雪怪:1,黑暗妖精刺客:1,黑暗妖精運送員:1,歐吉:1,歐姆民兵:1,巴土瑟:1,馬庫爾:1,卡士柏:1,西瑪:1});
 const LIMITS=Object.freeze([14,30,60,105,145,220]);
 const LABELS={
  攻擊速度:['attackSpeed',1],施展速度:['castSpeed',.7],移動速度:['moveSpeed',1.3],
  近距離傷害:['meleeDamage',3],遠距離傷害:['rangedDamage',3],魔法傷害:['magicDamage',3],
  近距離命中:['meleeHit',2],遠距離命中:['rangedHit',2],魔法命中:['magicHit',2],命中:['hit',.45],
  力量:['str',1.5],STR:['str',1.5],敏捷:['dex',1.5],DEX:['dex',1.5],體質:['con',1.5],CON:['con',1.5],智力:['int',1.5],INT:['int',1.5],精神:['wis',1.5],WIS:['wis',1.5],魅力:['cha',1.5],CHA:['cha',1.5],
  最大HP:['hp',.01],HP:['hp',.01],最大MP:['mp',.018],MP:['mp',.018],HP恢復:['hpr',.5],MP恢復:['mpr',1],
  魔法增幅力:['sp',3],傷害減免:['reduction',3],無視傷害減免:['ignoreReduction',3],
  物理防禦力:['ac',.6],魔法防禦力:['mr',.4],抗性:['resist',.4],
  近距離迴避力:['meleeDodge',.8],遠距離迴避力:['rangedDodge',.8],無視近距離迴避力:['ignoreMeleeDodge',1],無視遠距離迴避力:['ignoreRangedDodge',1],
  遠距離暴擊:['rangedCritical',.8],狀態傷害量增加:['statusDamage',.4]
 };
 function score(card){
  const fields=new Map();
  for(const effect of [...(card.fx||[]),...(card.pb?.fx||[])]){
   const text=String(effect).replace(/\s+/g,''),m=text.match(/^(PVP|PVE)?(.+?)\+(\d+(?:\.\d+)?)(%)?$/);if(!m)continue;
   const definition=LABELS[m[2]];if(!definition)continue;const key=(m[1]||'')+':'+definition[0],value=Number(m[3])*definition[1]*(m[1]==='PVP'?.6:m[1]==='PVE'?.7:1);
   // Some original card sheets repeat the server bonus in the visible effect list.
   fields.set(key,Math.max(fields.get(key)||0,value));
  }
  return Math.round([...fields.values()].reduce((a,b)=>a+b,0)*1000)/1000;
 }
 function grade(score){return 1+LIMITS.filter(limit=>score>=limit).length;}
 function evaluate(card){const power=score(card),fixed=Object.hasOwn(FIXED,card.n);return {score:power,grade:fixed?FIXED[card.n]:grade(power),fixed};}
 function apply(book){for(const card of book){const result=evaluate(card);card.g=result.grade;card.powerScore=result.score;card.fixedRarity=result.fixed;}return book;}
 const compare=(a,b)=>a.g-b.g||(a.powerScore??score(a))-(b.powerScore??score(b))||a.n.localeCompare(b.n,'zh-Hant');
 return {score,grade,evaluate,apply,compare,fixed:FIXED,limits:LIMITS};
});
