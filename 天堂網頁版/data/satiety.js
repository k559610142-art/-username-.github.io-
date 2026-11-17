// 飽食系統（使用者 2026-11-17 定：照 L1J）。飽食度 0～225，存在瀏覽器（每個角色各自一份）。
//  吃食物（DB use_type food）加 food_volume÷10 點（沒標的加 5）；每 5 分鐘 −1；3 以下自然回血停止（player-class-stats.js tick）。
window.Satiety=(()=>{
 const MAX=225,KEY='lineage-web-satiety-v1:',VOL={};
 const id=()=>window.activeCharacterId||'';
 function load(){try{const v=JSON.parse(localStorage.getItem(KEY+id())||'null');if(v&&Number.isFinite(v.n))return v;}catch{}return {n:MAX,t:Date.now()};}
 function save(v){try{localStorage.setItem(KEY+id(),JSON.stringify(v));}catch{}}
 function value(){if(!id())return null;const v=load(),steps=Math.floor((Date.now()-v.t)/300000);if(steps>0){v.n=Math.max(0,v.n-steps);v.t+=steps*300000;save(v);}return v.n;}
 addEventListener('DOMContentLoaded',()=>{try{GameDatabase.rows('etcitem').then(rows=>{for(const r of rows)if(r.use_type==='food')VOL[+r.item_id]=+r.food_volume||0;});}catch{}});
 function use(uid){const e=OwnedInventory.items.find(x=>x.uid===uid);if(!e||e.item?.kind!=='etcitem'||!(e.item.id in VOL))return null;
  const cur=value();if(cur>=MAX){toast('已經吃飽了。');return false;}
  const next=OwnedInventory.snapshot,row=next.find(x=>x.uid===uid);if(!row)return false;if(row.count>1)row.count--;else next.splice(next.indexOf(row),1);
  if(!OwnedInventory.applyChange(next))return false;const add=Math.floor(VOL[e.item.id]/10)||5,v=load();v.n=Math.min(MAX,cur+add);save(v);toast('吃了'+e.item.name+'，飽食度 '+v.n+'／'+MAX);return true;}
 return {value,use,starving:()=>{const n=value();return n!==null&&n<=3;},MAX};
})();
