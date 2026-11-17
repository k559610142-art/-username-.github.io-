// 武魂扭蛋機（2026-11-17 使用者審核）：鑽石百貨公司「扭蛋機」改名「武魂扭蛋機」，伺服器（/api/gacha/wuhun）與遊戲共用。
//  獎池：上品～四神獸共 42 種武魂。單抽 150 鑽、十連 1350 鑽（九折）；十連保底至少 1 個極品以上；沒有大保底。
//  機率（該等級合計，等級內平均分配）：上品 55%、極品 25%、千年 12%、萬年 5.6%、上古 2%、四神獸 0.4%。
(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;else root.WUHUN_GACHA=api;})(typeof window!=='undefined'?window:globalThis,()=>{
 const tiers=[
  {tier:'上品',rate:55,ids:[39301,39302,39303,39304,39305,39306,39307,39308,39309,39310]},
  {tier:'極品',rate:25,ids:[39291,39292,39293,39294,39295,39296,39297,39298,39299,39300]},
  {tier:'千年',rate:12,ids:[39266,39269,39270,39275,39276,39277]},
  {tier:'萬年',rate:5.6,ids:[39265,39278,39279,39280,39281,39282,39285]},
  {tier:'上古',rate:2,ids:[39267,39268,39283,39284,39286]},
  {tier:'四神獸',rate:.4,ids:[39271,39272,39273,39274]}
 ];
 // 2026-11-17 使用者：先改免費抽（原價 單抽 150、十連 1350；要恢復把 FREE 改成 false）
 const FREE=true,PAID={1:150,10:1350},prices=FREE?{1:0,10:0}:PAID;
 // 依機率抽一次；random 回傳 [0,1)。minTier＝保底最低等級（十連保底用），從該等級以上依原比例重抽。
 function roll(random,minTier=0){const pool=tiers.slice(minTier),total=pool.reduce((n,t)=>n+t.rate,0);let r=random()*total;
  for(const t of pool){if(r<t.rate){const id=t.ids[Math.min(t.ids.length-1,Math.floor(random()*t.ids.length))];return {id,key:'etcitem:'+id,tier:t.tier,rank:tiers.indexOf(t)};}r-=t.rate;}
  const t=pool[pool.length-1];return {id:t.ids[0],key:'etcitem:'+t.ids[0],tier:t.tier,rank:tiers.indexOf(t)};}
 // 一次召喚：十連若沒有極品以上，最後一抽改從極品以上重抽。
 function draw(count,random){const out=[];for(let i=0;i<count;i++)out.push(roll(random));
  if(count===10&&!out.some(x=>x.rank>=1))out[9]=roll(random,1);return out;}
 return {tiers,prices,free:FREE,roll,draw};
});
