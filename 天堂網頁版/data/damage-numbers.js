// 2026-11-21 傷害顯示：打中怪物／假玩家、玩家被打時，在頭上飄出傷害數字（往上飄、淡出）。
// 怪物受傷：白字；暴擊（magicCriticalUntil 期間）：金色放大；玩家受傷：紅字。
// 掛勾：island-monsters.js damage()（含假玩家）、character-actions.js damage()；畫在 island-monsters.js draw() 最後（怪物圖層之上）。
// 設定 → 系統 → 畫面「傷害數字」可關閉（localStorage damageNumbers＝'off'）。
const DamageNumbers=(()=>{
 const LIFE=900,RISE=30,MAX=80,KEY='damageNumbers';
 const list=[];
 let on=true;try{on=localStorage.getItem(KEY)!=='off'}catch{}
 function setOn(v){on=!!v;try{localStorage.setItem(KEY,on?'on':'off')}catch{}if(!on)list.length=0}
 // target：怪物物件或 'player'；kind：'hit'｜'crit'｜'player'
 function add(target,amount,kind='hit'){
  if(!on||window.gameFlowState!=='playing'||!(amount>0))return;
  const now=movementTime(),same=list.filter(n=>n.target===target&&now-n.start<250).length; // 同時多段傷害往上錯開
  list.push({target,amount:Math.floor(amount),kind,start:now,dx:(Math.random()-.5)*16,lift:same*14});
  if(list.length>MAX)list.splice(0,list.length-MAX);
 }
 // head(target,now) 回傳 [螢幕 x, 頭頂 y]，拿不到就略過
 function draw(pen,now,head){
  if(!list.length)return;
  pen.save();pen.textAlign='center';pen.textBaseline='alphabetic';pen.lineJoin='round';
  for(let i=list.length-1;i>=0;i--){
   const n=list[i],t=now-n.start;
   if(t>=LIFE||t<-50||n.target?.fp?.hidden){list.splice(i,1);continue}
   const p=head(n.target,now);if(!p)continue;
   const k=Math.max(0,t)/LIFE,pop=k<.12?1+.35*(1-k/.12):1,alpha=k<.6?1:1-(k-.6)/.4;
   const size=(n.kind==='crit'?20:16)*pop;
   pen.globalAlpha=alpha;pen.font='bold '+size.toFixed(1)+'px "Microsoft JhengHei",sans-serif';
   pen.lineWidth=3.5;pen.strokeStyle='#160d08';
   pen.fillStyle=n.kind==='player'?'#ff5a4a':n.kind==='crit'?'#ffd34d':'#fff6e0';
   const x=p[0]+n.dx,y=p[1]-10-n.lift-RISE*(1-(1-k)*(1-k)),text=String(n.amount);
   pen.strokeText(text,x,y);pen.fillText(text,x,y);
  }
  pen.restore();
 }
 return {add,draw,setOn,get on(){return on},get count(){return list.length}};
})();window.DamageNumbers=DamageNumbers;
