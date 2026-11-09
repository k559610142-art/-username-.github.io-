// 原版介面圖（天地劫天堂客戶端 Sprite.pak）：
//  532.img  道具欄（223×336，4×8 格）
//  563c.img／567c.img  人物屬性（257×336，左邊能力值、右邊人形裝備欄；男／女）
// 座標都以原圖像素表示，換成百分比後跟著視窗縮放。
(()=>{
 const UI='assets/interface/client-ui/';
 const css=document.createElement('style');css.textContent=`
 .reference-game .classic-window.client-art{max-width:none!important;max-height:none!important;padding:0!important;border:0!important;border-image:none!important;background:transparent!important;box-shadow:none!important;overflow:visible!important}
 .client-art .client-art-sheet{position:relative;width:100%;background:0 0/100% 100% no-repeat;container-type:inline-size}
 .reference-game .client-art>.classic-window-header{position:absolute!important;left:0;top:0;width:16%;height:6%!important;min-height:0!important;margin:0!important;background:transparent!important;z-index:3}
 .reference-game .client-art>.classic-window-header h2{position:absolute;width:1px;height:1px;overflow:hidden;clip:rect(0 0 0 0)}
 .reference-game .client-art>.classic-window-header .classic-close{position:absolute!important;inset:0!important;width:100%!important;height:100%!important;min-height:0!important;opacity:0;cursor:pointer}
 .floating-game-window .client-art>.classic-window-header{cursor:move}
 .client-art-value{position:absolute;display:flex;align-items:center;justify-content:center;box-sizing:border-box;margin:0;padding:0 1.5%;color:#f2e7c6;font-weight:bold;font-size:4.2cqw;line-height:1;white-space:nowrap;overflow:hidden;text-shadow:0 0 2px #000,1px 1px 0 #000;font-variant-numeric:tabular-nums;pointer-events:none}
 .client-art-value.left{justify-content:flex-start}
 .client-art-value.small{font-size:3.6cqw}
 /* 人物屬性 */
 .reference-game .classic-window.client-attr{width:min(420px,94vw)!important}
 .reference-game .floating-game-window:has(>.client-attr){width:min(420px,94vw)!important;height:auto!important;min-height:0!important;overflow:visible!important}
 .client-attr .client-art-sheet{aspect-ratio:257/336}
 .client-attr .equipment-slot{position:absolute!important;margin:0!important;padding:1px!important;min-height:0!important;border:0!important;background:transparent!important;box-sizing:border-box;display:flex;align-items:center;justify-content:center;transform:none!important}
 .client-attr .equipment-slot img{width:100%;height:100%;object-fit:contain}
 .client-attr .equipment-slot .slot-symbol{display:none}
 .client-attr .equipment-slot.extra{background:#1d2227cc!important;outline:1px solid #6d6a5c}
 .client-attr .equipment-slot:hover,.client-attr .equipment-slot:focus-visible{outline:1px solid #e6c776}
 .client-attr-links{display:flex;justify-content:center;gap:8px;margin-top:4px}
 .client-attr-links button{min-height:28px;padding:2px 14px;font-size:12px;background:#1b2229;color:#e9dcb5;border:1px solid #7d7559;border-radius:3px}
 /* 道具欄 */
 .reference-game .classic-window.client-bag{width:min(334px,94vw)!important;display:block!important}
 .reference-game .floating-game-window:has(>.client-bag){width:min(334px,94vw)!important;height:auto!important;min-height:0!important;overflow:visible!important}
 .client-bag .client-art-sheet{aspect-ratio:223/336;background-image:url('${UI}532.png')}
 .client-bag .classic-grid-scroll{position:absolute!important;left:21.08%;top:6.25%;width:64.57%;height:85.71%;max-height:none!important;margin:0!important;padding:0!important;overflow:hidden!important;background:transparent!important;border:0!important}
 .client-bag .classic-item-grid{display:grid!important;grid-template-columns:repeat(4,1fr)!important;grid-template-rows:repeat(8,1fr)!important;gap:0!important;width:100%!important;height:100%!important;padding:0!important}
 .client-bag .classic-item-grid .item-slot{width:auto!important;height:auto!important;min-width:0!important;min-height:0!important;aspect-ratio:auto!important;margin:0!important;padding:5%!important;background:transparent!important;border:0!important;box-shadow:none!important;position:relative}
 .client-bag .classic-item-grid .item-slot img{width:100%!important;height:100%!important;object-fit:contain}
 .client-bag .classic-item-grid .item-slot:hover,.client-bag .classic-item-grid .item-slot.selected,.client-bag .classic-item-grid .item-slot[aria-pressed=true]{outline:1px solid #e6c776;outline-offset:-2px}
 .client-bag .classic-pager{position:absolute!important;left:21%;right:8%;bottom:1.2%;height:5%!important;min-height:0!important;margin:0!important;padding:0!important;display:flex!important;align-items:center;justify-content:flex-end;gap:2%;background:transparent!important;border:0!important}
 .client-bag .classic-pager button{min-height:0!important;height:100%!important;width:9%!important;padding:0!important;font-size:3.6cqw!important;line-height:1!important;background:transparent!important;border:0!important;color:#e9dcb5!important}
 .client-bag .classic-pager span{font-size:3.6cqw!important;color:#e9dcb5;text-shadow:1px 1px 0 #000}
 .client-bag-extras{margin-top:4px;padding:4px;background:#11171cee;border:1px solid #5d5847;border-radius:3px}
 .client-bag-extras .classic-filter{margin:0 0 4px!important}
 .client-bag-extras .classic-item-detail:empty{display:none}
 @media (max-width:520px){.reference-game .floating-game-window:has(>.client-art){left:3vw!important;right:auto!important}}
 `;document.head.append(css);
 const pct=(v,t)=>v/t*100+'%';
 function place(el,[x,y,w,h],W,H){el.style.left=pct(x,W);el.style.top=pct(y,H);el.style.width=pct(w,W);el.style.height=pct(h,H)}
 function value(key,box,text,W,H){const el=uiElement('p','client-art-value'+(box[4]?' '+box[4]:''),String(text??'—'));el.dataset.clientStatus=key;place(el,box,W,H);return el}

 // ---------- 人物屬性（狀態＋裝備） ----------
 const AW=257,AH=336;
 const ATTR={level:[78,13,142,14,'left'],hp:[78,35,52,13,'small'],mp:[78,49,52,13,'small'],ac:[78,65,52,12,'small'],weight:[57,88,46,13,'small'],food:[57,101,46,12,'small'],
  str:[35,125,38,12],dex:[35,137,38,12],con:[35,149,38,12],int:[35,161,38,12],wis:[35,173,38,12],cha:[35,185,38,12],
  magicLevel:[94,217,32,13],magicBonus:[94,230,32,13],mr:[152,242,77,13,'small'],
  earth:[53,275,62,12,'small'],water:[53,287,62,12,'small'],fire:[53,299,62,12,'small'],wind:[53,311,62,12,'small'],dodge:[153,300,46,12,'small']};
 // 人形上的裝備格（原圖暗格）；戒指 2～4 在右下補小格
 const SLOTS={earring:[173,33,34,32],helm:[138,55,32,33],cloak:[110,95,32,33],necklace:[147,95,33,33],tshirt:[183,95,34,33],weapon:[77,132,33,33],armor:[160,132,33,21],
  shield:[199,143,33,34],belt:[115,153,33,33],glove:[80,167,33,33],ring1:[193,180,34,32],boots:[196,265,33,33]};
 const EXTRA={ring2:[152,214,25,24],ring3:[179,214,25,24],ring4:[206,214,25,24]};
 const MAGIC_DIV={王族:10,騎士:50,妖精:8,法師:4,黑暗妖精:12,黑妖:12,龍騎士:9,幻術師:6};
 function maxWeight(a){return Math.max(0,Math.floor(1500+Math.floor(((a.str||0)+(a.con||0)-18)/2)*150))}
 function carried(){let t=0;for(const e of window.OwnedInventory?.items||[])t+=(e.item?.weight??0)*(e.count||1);return Math.round(t/1000)}
 function expText(){const lv=window.activeCharacterLevel||1,exp=window.activeCharacterExperience||0,t=window.killRewardData?.thresholds||(typeof killRewardData!=='undefined'?killRewardData.thresholds:null);const a=t?.find(r=>r[0]===lv)?.[1],b=t?.find(r=>r[0]===lv+1)?.[1];return Number.isFinite(a)&&Number.isFinite(b)&&b>a?Math.max(0,(exp-a)/(b-a)*100).toFixed(2)+'%':''}
 function attrValues(){const p=PlayerClassStats.read(),d=window.NativeCombatRules?.defense?.()||{},a=p.attributes||{};const w=carried(),mw=maxWeight(a);
  return {level:'Lv '+p.level+'　'+expText(),hp:hp+'/'+maxHp,mp:mp+'/'+maxMp,ac:typeof previewArmorClass==='function'?previewArmorClass():(d.ac??10),weight:(mw?Math.min(100,Math.round(w/mw*100)):0)+'%',food:'—',
   str:a.str,dex:a.dex,con:a.con,int:a.int,wis:a.wis,cha:a.cha,magicLevel:Math.floor((p.level||1)/(MAGIC_DIV[job]||50)),magicBonus:p.sp||0,mr:'魔防 '+(d.mr||0),earth:'0',water:'0',fire:'0',wind:'0',dodge:d.dodge||0}}
 const baseEquipment=renderEquipmentPane;
 function attributePane(kind){const pane=makeClassicWindow(kind==='equipment'?'裝備':'人物狀態'),sheet=uiElement('div','client-art-sheet'),v=attrValues();
  pane.classList.add('client-art','client-attr',kind==='equipment'?'equipment-window':'status-window');sheet.style.backgroundImage="url('"+UI+(characterGender===1?'567c':'563c')+".png')";
  for(const [key,box]of Object.entries(ATTR))sheet.append(value(key,box,v[key],AW,AH));
  // 裝備格沿用原本裝備視窗的按鈕（含穿脫、提示），只換位置
  const source=baseEquipment(),buttons=[...source.querySelectorAll('.equipment-slot')];
  equipmentSlots.forEach(([slot],i)=>{const b=buttons[i];if(!b)return;b.removeAttribute('style');const box=SLOTS[slot]||EXTRA[slot];if(!box)return;if(EXTRA[slot])b.classList.add('extra');place(b,box,AW,AH);sheet.append(b)});
  pane.append(sheet);const links=uiElement('div','client-attr-links');for(const [label,type]of [['道具欄','bag'],['魔法','magic']]){const b=uiElement('button','',label);b.type='button';b.onclick=()=>panel(type);links.append(b)}pane.append(links);return pane}
 renderStatusPane=()=>attributePane('status');
 renderEquipmentPane=()=>attributePane('equipment');

 // ---------- 道具欄 ----------
 inventoryPageSize=32;
 const baseInventory=renderInventoryPane;
 renderInventoryPane=function(){const pane=baseInventory(),sheet=uiElement('div','client-art-sheet'),extras=uiElement('div','client-bag-extras');pane.classList.add('client-art','client-bag');
  const grid=pane.querySelector('.classic-grid-scroll'),pager=pane.querySelector('.classic-pager');if(grid)sheet.append(grid);if(pager)sheet.append(pager);
  for(const el of [...pane.children])if(!el.classList.contains('classic-window-header'))extras.append(el);
  pane.append(sheet,extras);return pane};

 // HP／MP 變動時同步更新已開啟的人物屬性
 const baseStats=stats;stats=function(...args){const out=baseStats.apply(this,args);for(const [key,text]of [['hp',hp+'/'+maxHp],['mp',mp+'/'+maxMp]])for(const el of document.querySelectorAll('[data-client-status="'+key+'"]'))el.textContent=text;return out};
})();
