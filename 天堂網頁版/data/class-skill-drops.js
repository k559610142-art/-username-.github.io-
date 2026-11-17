// 職業技能書全部改由打怪取得（使用者 2026-11-17：取消技能商人，職業技能都用打怪取得）。
//  職業技能＝各職業專屬技能（技能階級 11 以上：騎士、王族、黑妖、精靈魔法、龍騎士、幻術師、戰士）。
//  原版掉寶表已有掉落的保留不動；沒有任何怪物會掉的書，補到遊戲裡有出現的怪物身上：
//   挑等級在「學習等級～學習等級+20」之間、最接近的 6 種怪（不夠就取等級最高的怪），機率 1%（學習等級 30 以上 0.5%、50 以上 0.3%）。
//  RARE：使用者標記的稀有技能，機率再乘 RARE_RATE（之後依使用者標記填入書的道具編號）。
//  載入順序：kill-reward-data.js、dungeon-monster-data.js、darkelf-skills.js 之後。
(()=>{
 const {skills,books}=playerSkillData,drops=killRewardData.drops,RARE=new Set([]),RARE_RATE=.2;
 const dropped=new Set();for(const list of Object.values(drops))for(const d of list)dropped.add(d.id);
 const mobs=new Map();for(const s of islandMonsterSpawns){const n=s.npc||islandMonsterTemplates[s.npcId];if(n?.kind==='L1Monster'&&!s.resident&&n.level>0)mobs.set(s.npcId,n.level);}
 const pool=[...mobs].sort((a,b)=>a[1]-b[1]);
 for(const [id,b] of Object.entries(books)){
  const sk=skills[b.skill];if(!sk||sk.circle<=10)continue;
  const item=+id,lv=Math.min(...Object.values(b.min));
  let chance=lv>=50?3000:lv>=30?5000:10000;if(RARE.has(item))chance=Math.max(1,Math.round(chance*RARE_RATE));
  for(const list of Object.values(drops))for(const d of list)if(d.id===item&&RARE.has(item))d.chance=Math.min(d.chance,chance);
  if(dropped.has(item))continue;
  let pick=pool.filter(([,l])=>l>=lv&&l<=lv+20).sort((a,c)=>a[1]-c[1]).slice(0,6);if(!pick.length)pick=pool.slice(-6);
  for(const [mob] of pick)(drops[mob]??=[]).push({id:item,min:1,max:1,chance});
 }
})();
