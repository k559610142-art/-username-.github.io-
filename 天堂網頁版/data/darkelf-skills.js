// 黑妖學法術（使用者 2026-11-17：補黑妖學法術）。原本 playerSkillData.books 沒有任何黑妖可學的書。
//  黑暗精靈水晶（DB etcitem classname skill.Skill_DarkSpiritCrystal，40265～40279、80038）→ 黑妖技能 97～112：
//   第 1 階（DB skill_level 13）15 級、第 2 階（skill_level 14）30 級。
//  一般魔法：照原版天堂，黑妖可學 1 階（12 級）、2 階（24 級）魔法書。
//  技能效果寫在 data/class-buffs.js。載入順序：extra-class-skills.js 之後、player-skills.js 之前。
(()=>{
 const {skills,books}=playerSkillData;
 const CRYSTAL={40265:97,40266:98,40267:99,40268:100,40269:109,40270:101,40271:102,40272:103,40273:104,40274:110,40275:105,40276:106,40277:107,40278:108,40279:111,80038:112};
 for(const [item,skill] of Object.entries(CRYSTAL))if(skills[skill])books[item]={skill,min:{黑妖:skills[skill].circle===13?15:30},element:''};
 for(const book of Object.values(books)){const c=skills[book.skill]?.circle;if(book.min.法師!==undefined&&(c===1||c===2))book.min.黑妖??=c===1?12:24;}
})();
