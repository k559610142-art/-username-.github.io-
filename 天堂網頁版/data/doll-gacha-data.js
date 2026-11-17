// 魔法娃娃扭蛋機（2026-11-17 使用者設定的娃娃分數；獎池＝各系列第一階共 89 隻，進化後的階段不放）。
//  計分規則（使用者訂）：1 條能力 1 分（有加經驗 2 分）；2 條 3 分（有經驗 4 分）；3 條以上 5 分（有經驗 6 分、有技能效果 7 分）；
//  可強化系列依階數：3 階 8 分、4 階 9 分、5 階 10 分、6 階 11 分；軍師娃娃 13 分；四龍娃娃 15 分；經驗BUFF娃娃：傳說魔法師帕歐 20 分（指定）。
//  稀有度與機率（2026-11-17 使用者核可）：一般 1～2 分 45%、高級 3～4 分 27%、稀有 5～6 分 15%、英雄 7～8 分 8%、傳說 9～11 分 4%、
//   神話 13～15 分 0.9%、超越 20 分 0.1%；同一級每隻機率相同。十連保底至少 1 隻高級以上，沒有大保底。價格比照武魂（單抽 150、十連 1350），目前先免費。
//  伺服器 /api/gacha/doll 與鑽石百貨公司「魔法娃娃扭蛋機」共用這個檔。
(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;else root.DOLL_GACHA=api;})(typeof window!=='undefined'?window:globalThis,()=>{
 const scores={
  1:[39039,55000,55001,55002,55005,55007,55010,55011,55012,80259,80260,80261,80339,80340,80350],
  2:[55008,80351],
  3:[55003,55004,55006,55009,55013,80265,80336,80337,80338,80341,80352,80356,80380,80382],
  4:[80357],
  5:[80263,80264,80342,80358,80360,80361,80377,80378,80379],
  6:[55015,55016,55027,55028,80262,80266,80267],
  7:[55017,55018,55019,55020,55021,55022,55023,55024,55025,55026,80343,80344,80345,80359,80362,80363,80364,80381],
  8:[80365,80368,80371,80374],
  9:[80280],
  10:[80254],
  11:[55029,55035,55041,55047,55053,55059,55065,55071,55077,80268,80274],
  13:[55084],
  15:[80383,80384,80385,80386],
  20:[39149]
 };
 const scoreOf=id=>{for(const [s,ids] of Object.entries(scores))if(ids.includes(+id))return +s;return 0;};
 const band=(lo,hi)=>Object.entries(scores).filter(([s])=>+s>=lo&&+s<=hi).flatMap(([,ids])=>ids);
 const tiers=[
  {tier:'一般',rate:45,ids:band(1,2)},{tier:'高級',rate:27,ids:band(3,4)},{tier:'稀有',rate:15,ids:band(5,6)},{tier:'英雄',rate:8,ids:band(7,8)},
  {tier:'傳說',rate:4,ids:band(9,11)},{tier:'神話',rate:.9,ids:band(13,15)},{tier:'超越',rate:.1,ids:band(20,20)}
 ];
 const FREE=true,PAID={1:150,10:1350},prices=FREE?{1:0,10:0}:PAID; // 先免費抽；要收費把 FREE 改成 false
 function roll(random,minTier=0){const pool=tiers.slice(minTier),total=pool.reduce((n,t)=>n+t.rate,0);let r=random()*total;
  for(const t of pool){if(r<t.rate){const id=t.ids[Math.min(t.ids.length-1,Math.floor(random()*t.ids.length))];return {id,key:'etcitem:'+id,tier:t.tier,rank:tiers.indexOf(t)};}r-=t.rate;}
  const t=pool[pool.length-1];return {id:t.ids[0],key:'etcitem:'+t.ids[0],tier:t.tier,rank:tiers.indexOf(t)};}
 // 十連若沒有高級以上，最後一抽改從高級以上重抽
 function draw(count,random){const out=[];for(let i=0;i<count;i++)out.push(roll(random));if(count===10&&!out.some(x=>x.rank>=1))out[9]=roll(random,1);return out;}
 return {scores,scoreOf,tiers,prices,free:FREE,roll,draw};
});
