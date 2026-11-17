// 精靈魔法第 6 階（使用者 2026-11-17：水屬性缺污濁之水、火屬性缺屬性之火與烈焰之魂、無屬性缺精準射擊）。
//  DB skills 技能階級 22（169～176）原本沒有收進可學清單；照 DB 精靈水晶補上，學習等級照 17～21 階每階 +10 的規律＝妖精 60 級。
//  精準射擊：DB 水晶 classname 是 Skill_SpiritCrystal_Wind，依使用者指定改成無屬性（不需選屬性也能學）。
//  生命呼喚（165）、暴風疾走（172）DB 沒有對應的水晶道具，無法用書學，先不收。
//  效果寫在 data/class-buffs.js；掉落由 data/class-skill-drops.js 自動補到 60 級以上的怪物。載入順序：darkelf-skills.js 之後。
(()=>{
 const {skills,books}=playerSkillData;
 const ADD={40252:[169,'地'],40253:[170,'水'],41152:[173,'水'],40259:[171,'火'],41149:[175,'火'],41150:[176,'火'],41153:[174,'']};
 for(const [item,[skill,element]] of Object.entries(ADD))if(skills[skill])books[item]??={skill,min:{妖精:60},element};
})();
