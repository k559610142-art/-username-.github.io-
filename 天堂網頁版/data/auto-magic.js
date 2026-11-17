// 1～2 階魔法到等級自動學會（使用者 2026-11-17：魔法 1～2 等級到達可直接學習）。
//  依各職業魔法書的學習等級（法師 4／8、妖精 8／16、王族 10／20、黑妖 12／24、騎士 50），等級一到就直接學會，不需要魔法書。
//  載入順序：owned-inventory.js、player-skills.js、darkelf-skills.js 之後。
(()=>{
 const {skills,books}=playerSkillData;
 function due(){
  if(window.gameFlowState!=='playing'||!window.OwnedInventory||OwnedInventory.owner!==window.activeCharacterId||typeof job==='undefined')return [];
  const lv=Number(window.activeCharacterLevel)||1,known=new Set(OwnedInventory.skills?.ids||[]),out=new Set();
  for(const b of Object.values(books)){const c=skills[b.skill]?.circle,min=b.min[job];if((c===1||c===2)&&!b.element&&min!==undefined&&min<=lv&&!known.has(b.skill))out.add(b.skill);}
  return [...out];
 }
 setInterval(()=>{const list=due();if(!list.length)return;if(OwnedInventory.grantSkills(list)){const names=list.map(id=>skills[id].name);window.GameChat?.say?.('【系統】學會魔法：'+names.join('、'),'sys');if(typeof toast==='function')toast('學會魔法：'+names.slice(0,4).join('、')+(names.length>4?' 等 '+names.length+' 種':''));window.PlayerSkills?.syncQuickSlots?.();}},1500);
})();
