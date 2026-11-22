// Display families only. Never change doll ownership, effects, recipe costs or rates.
window.DollEvolution=(()=>{
 const byId=new Map(gameCatalogData.dolls.map(d=>[d.id,d]));
 const range=(start,count)=>Array.from({length:count},(_,i)=>start+i);
 const definitions=[
  ...[55029,55035,55041,55047,55053,55059,55065,55071,55077,80268,80274].map(id=>({paths:[range(id,6)]})),
  {paths:[range(55084,4)]},{paths:[range(80254,5)]},
  // 2026-11-22 使用者：火焰之子 → 帕歐／帕克路線（含附魔 1～15）不開放，火焰之子當不能進化的娃娃（那 36 隻在 doll-dedup.js 移除）
  {paths:[[39149,39150]]},
  ...[80365,80368,80371,80374].map(id=>({paths:[range(id,3)]})),
  {paths:[[80385,80512]]},{paths:[[80384,80513]]},{paths:[[80386,80514]]},{paths:[[80383,80515]]}
 ];
 const families=[],familyById=new Map();
 for(const definition of definitions){
  const paths=definition.paths.map(ids=>ids.filter(id=>byId.has(id))).filter(ids=>ids.length>1);
  if(!paths.length)continue;
  const variants=(definition.variants||[]).filter(v=>byId.has(v.parent)).map(v=>({...v,ids:v.ids.filter(id=>byId.has(id))}));
  const ids=[...new Set([...paths.flat(),...variants.flatMap(v=>v.ids)])],family={root:paths[0][0],paths,variants,ids};
  families.push(family);for(const id of ids){if(familyById.has(id))throw Error('Duplicate doll family '+id);familyById.set(id,family);}
 }
 const get=id=>byId.get(Number(id));
 const family=id=>familyById.get(Number(id))||null;
 const rootId=id=>family(id)?.root??Number(id);
 const members=id=>(family(id)?.ids||[Number(id)]).map(get).filter(Boolean);
 // Display-only comparison across combat, survival and utility bonuses. This is
 // a general reference, not a class-specific DPS calculation or a rarity tier.
 const strengthCache=new Map();
 function strength(value){
  const d=typeof value==='object'?value:get(value);if(!d)return 0;
  if(strengthCache.has(d.id))return strengthCache.get(d.id);
  let score=0;
  for(const fx of d.effects){let m;
   if((m=fx.match(/^(\d+(?:\.\d+)?)%機率攻擊傷害\+(\d+(?:\.\d+)?)/)))score+=Number(m[1])/100*Number(m[2])*4;
   else if((m=fx.match(/^(\d+(?:\.\d+)?)%機率施展/)))score+=Number(m[1])*1.2;
   else if((m=fx.match(/^每(\d+)秒(體力|魔力)恢復(\d+(?:\.\d+)?)/)))score+=Number(m[3])*64/Number(m[1])*(m[2]==='魔力'?.18:.04);
   else if((m=fx.match(/^每(\d+)分鐘給予金幣(\d+)/)))score+=Number(m[2])/Number(m[1])*.0005;
   else if((m=fx.match(/^(?:HP|體力上限)\+(\d+(?:\.\d+)?)/)))score+=Number(m[1])/25;
   else if((m=fx.match(/^(?:MP|魔力上限)\+(\d+(?:\.\d+)?)/)))score+=Number(m[1])/15;
   else if((m=fx.match(/^(?:AC|防禦)([+-]\d+(?:\.\d+)?)/)))score-=Number(m[1])*2;
   else if((m=fx.match(/^傷害減免\+(\d+(?:\.\d+)?)/)))score+=Number(m[1])*5;
   else if((m=fx.match(/^(?:近距離攻擊|遠距離攻擊|額外攻擊點數)\+(\d+(?:\.\d+)?)/)))score+=Number(m[1])*4;
   else if((m=fx.match(/^魔攻\+(\d+(?:\.\d+)?)/)))score+=Number(m[1])*5;
   else if((m=fx.match(/^(?:近距離命中|遠距離命中|魔法命中|恐怖命中)\+(\d+(?:\.\d+)?)/)))score+=Number(m[1])*2;
   else if((m=fx.match(/^(?:力量|敏捷|體質|智力|精神|魅力)\+(\d+(?:\.\d+)?)/)))score+=Number(m[1])*3;
   else if((m=fx.match(/^狩獵經驗值\+(\d+(?:\.\d+)?)/)))score+=Number(m[1])*.12;
   else if((m=fx.match(/^負重增加\+(\d+(?:\.\d+)?)/)))score+=Number(m[1])/250;
   else if((m=fx.match(/^魔力恢復量\+(\d+(?:\.\d+)?)/)))score+=Number(m[1])*2;
   else if((m=fx.match(/^(?:昏迷等級|破壞盔甲等級)\+(\d+(?:\.\d+)?)/)))score+=Number(m[1])*.25;
   else if((m=fx.match(/^屠宰者階段別傷害\+(\d+(?:\.\d+)?)/)))score+=Number(m[1])*.3;
   else if((m=fx.match(/耐性\+(\d+(?:\.\d+)?)/)))score+=Number(m[1])*.15;
   else if((m=fx.match(/^人物速度 x(\d+(?:\.\d+)?)/)))score+=(Number(m[1])-1)*15;
   else if((m=fx.match(/^現有負重 \/(\d+(?:\.\d+)?)/)))score+=(1-1/Number(m[1]))*5;
   else if((m=fx.match(/^泰坦發動HP\+(\d+(?:\.\d+)?)/)))score+=Number(m[1])*.4;
   else score+=fx==='能在水底呼吸'?1:3;
  }
  const result=Math.round(score*1000)/1000;strengthCache.set(d.id,result);return result;
 }
 const effectKey=d=>d.effects.slice().sort().join('|');
 const compare=(a,b)=>strength(a)-strength(b)||effectKey(a).localeCompare(effectKey(b),'zh-Hant')||a.id-b.id;
 const bases=()=>gameCatalogData.dolls.filter(d=>rootId(d.id)===d.id).sort(compare);
 return {get,family,rootId,members,bases,families,strength,compare};
})();
