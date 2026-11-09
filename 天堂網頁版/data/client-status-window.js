// 人物狀態視窗：底圖用「天地劫天堂」客戶端 Sprite.pak 的 982c.img（179×275，中文版角色狀態），數值疊在原圖的格子上。
// 座標單位是原圖像素；換成百分比後跟著視窗縮放。
(()=>{
 const ART='assets/interface/client-ui/982c.png',W=179,H=275;
 const style=document.createElement('style');style.textContent=`
 .reference-game .classic-window.client-status{width:min(358px,92vw)!important;max-width:none!important;max-height:none!important;height:auto;aspect-ratio:${W}/${H};padding:0!important;border:0!important;border-image:none!important;background:url('${ART}') 0 0/100% 100% no-repeat!important;box-shadow:0 6px 18px #000a;overflow:visible!important;container-type:inline-size;image-rendering:auto}
 .reference-game .floating-game-window:has(>.client-status){width:min(358px,92vw)!important;height:auto!important;min-height:0!important;overflow:visible!important}
 .reference-game .floating-game-window>.classic-window.client-status{width:100%!important;height:auto!important;aspect-ratio:${W}/${H}}
 .reference-game .client-status>.classic-window-header{position:absolute!important;left:0;right:0;top:0;height:7%!important;min-height:0!important;margin:0!important;background:transparent!important;z-index:2}
 .reference-game .client-status>.classic-window-header h2{position:absolute;width:1px;height:1px;overflow:hidden;clip:rect(0 0 0 0)}
 .reference-game .client-status>.classic-window-header .classic-close{top:2px!important;right:2px!important;width:26px!important;height:26px!important;min-height:26px!important;font-size:18px!important;line-height:22px!important}
 .client-status-value{position:absolute;display:flex;align-items:center;justify-content:center;box-sizing:border-box;margin:0;padding:0 1%;color:#f1e6c4;font-weight:bold;font-size:5.4cqw;line-height:1;white-space:nowrap;overflow:hidden;text-shadow:0 0 2px #000,1px 1px 0 #000;font-variant-numeric:tabular-nums;pointer-events:none}
 .client-status-value.left{justify-content:flex-start;padding-left:2%}
 .client-status-value.small{font-size:4.4cqw}
 `;document.head.append(style);
 // [key, x, y, width, height, class]（原圖像素）
 const BOXES={level:[62,39,88,12,'left'],hp:[62,54,88,12,'left'],mp:[62,68,88,12,'left'],weight:[104,83,46,13,'small'],food:[104,96,46,13,'small'],
  str:[51,115,36,13],dex:[51,128,36,13],con:[51,141,36,13],int:[114,115,36,13],wis:[114,128,36,13],cha:[114,141,36,13],
  magicLevel:[86,161,25,13],magicBonus:[86,174,25,13],mr:[118,174,36,13,'small'],
  earth:[57,195,19,12,'small'],water:[57,207,19,12,'small'],fire:[124,195,19,12,'small'],wind:[124,207,19,12,'small'],dodge:[46,221,22,12,'small']};
 // 原版各職業魔法等級：等級 ÷ 職業係數（王族 10、騎士 50、妖精 8、法師 4、黑暗妖精 12、龍騎士 9、幻術師 6）
 const MAGIC_DIV={王族:10,騎士:50,妖精:8,法師:4,黑暗妖精:12,黑妖:12,龍騎士:9,幻術師:6};
 function carried(){let total=0;for(const e of window.OwnedInventory?.items||[]){const w=e.item?.weight??0;total+=w*(e.count||1)}return Math.round(total/1000)}
 // 原版負重上限：1500 ＋（力量＋體質－18）÷ 2 × 150（L1J L1PcInventory）
 function maxWeight(a){return Math.max(0,Math.floor(1500+Math.floor(((a.str||0)+(a.con||0)-18)/2)*150))}
 function values(){const p=PlayerClassStats.read(),d=window.NativeCombatRules?.defense?.()||{},a=p.attributes||{},div=MAGIC_DIV[job]||50;
  return {level:p.level,hp:hp+' / '+maxHp,mp:mp+' / '+maxMp,weight:carried()+"/"+maxWeight(a),food:'—',str:a.str,dex:a.dex,con:a.con,int:a.int,wis:a.wis,cha:a.cha,
   magicLevel:Math.floor((p.level||1)/div),magicBonus:p.sp||0,mr:'MR '+(d.mr||0),earth:0,water:0,fire:0,wind:0,dodge:d.dodge||0}}
 function place(el,[x,y,w,h]){el.style.left=x/W*100+'%';el.style.top=y/H*100+'%';el.style.width=w/W*100+'%';el.style.height=h/H*100+'%'}
 renderStatusPane=function(){const pane=makeClassicWindow('人物狀態'),v=values();pane.classList.add('status-window','client-status');pane.setAttribute('aria-label','人物狀態');
  for(const [key,box]of Object.entries(BOXES)){const el=uiElement('p','client-status-value'+(box[4]?' '+box[4]:''),String(v[key]??'—'));el.dataset.clientStatus=key;place(el,box);pane.append(el)}
  return pane};
 // HP／MP 變動時同步更新已開啟的視窗
 const baseStats=stats;stats=function(...args){const out=baseStats.apply(this,args);for(const [key,text]of [['hp',hp+' / '+maxHp],['mp',mp+' / '+maxMp]])for(const el of document.querySelectorAll('[data-client-status="'+key+'"]'))el.textContent=text;return out};
})();
