// 角色視窗＋背包：照網頁奇岩城的畫面排版重寫（只對照截圖的位置與分頁，程式與樣式為本專案自寫）。
//  角色（status）：裝備／能力／隊伍／血盟／好友分頁。
//  背包（bag）：全部(數量)／武器／防具／道具分頁；裝備欄移至角色視窗。
//  角色內裝備欄（equipment）：名字等級職業、HP／MP 條、左右兩排裝備格夾著人物、下方戒指與 3×3 數值
(()=>{
 const css=document.createElement('style');css.textContent=`
 .reference-game .classic-window.qy-win{display:flex!important;flex-direction:column;padding:0 7px 7px!important;border:0!important;border-image:none!important;border-radius:3px;
  background:linear-gradient(90deg,#6e5a33 0,#c9a85e 2px,#3b3020 4px,transparent 5px,transparent calc(100% - 5px),#3b3020 calc(100% - 4px),#c9a85e calc(100% - 2px),#6e5a33 100%),linear-gradient(#17191c,#121416)!important;
  box-shadow:0 0 0 1px #000,0 8px 24px #000b!important;overflow:hidden!important;color:#d8cfb8;font-size:12px;container-type:inline-size}
 .reference-game .qy-win>.classic-window-header{position:relative!important;display:flex;align-items:center;justify-content:center;height:30px!important;min-height:30px!important;margin:0 -7px!important;padding:0!important;
  background:linear-gradient(#2c2a26,#1b1a18)!important;border-bottom:1px solid #5b4b2c;box-shadow:inset 0 1px 0 #6b5a36}
 .reference-game .qy-win>.classic-window-header h2{position:static;width:auto;height:auto;clip:auto;margin:0;font-size:15px;letter-spacing:6px;color:#efd9a4;text-shadow:0 1px 2px #000}
 .reference-game .qy-win>.classic-window-header .classic-close{position:absolute!important;right:5px;top:4px;width:34px!important;height:21px!important;min-height:0!important;padding:0!important;font-size:0!important;
  background:linear-gradient(#4a3d26,#2a2216)!important;border:1px solid #9b8150!important;border-radius:2px;color:#f0dcae!important;opacity:1}
 .reference-game .qy-win>.classic-window-header .classic-close::after{content:'關閉';font-size:11px}
 .qy-tabs{display:flex;gap:2px;margin:6px 0 0;flex:none}
 .qy-tabs button{flex:1;min-width:0;min-height:24px!important;padding:2px 0!important;font-size:12px!important;white-space:nowrap;overflow:hidden;
  background:linear-gradient(#2a2b2e,#1e1f22)!important;color:#9d9583!important;border:1px solid #3c3a35!important;border-radius:2px!important}
 .qy-tabs button[aria-selected=true]{background:linear-gradient(#5e4c2a,#3b2f1b)!important;color:#ffe2a0!important;border-color:#a3864d!important}
 .qy-tabs sup{font-size:9px;color:#d9c48f;margin-left:2px}
 .qy-body{flex:1;min-height:0;overflow:auto;margin-top:6px;scrollbar-width:thin;scrollbar-color:#7a6740 #121416}
 .qy-box{background:#0d0f11;border:1px solid #2e2c28;border-radius:2px;padding:4px 6px;margin-bottom:5px}
 .qy-stats{display:grid;grid-template-columns:1fr 1fr;gap:3px;padding:3px}
 .qy-stat{display:flex;justify-content:space-between;align-items:center;padding:3px 8px;background:#1a1c1f;border:1px solid #2c2b27;border-radius:2px;color:#b7ad95}
 .qy-stat b{font-size:13px;font-variant-numeric:tabular-nums}
 .qy-stat.str b{color:#ff6a50}.qy-stat.dex b{color:#69d86a}.qy-stat.con b{color:#f0a64a}.qy-stat.int b{color:#7aaaff}.qy-stat.wis b{color:#b98cff}.qy-stat.cha b{color:#ff86c4}
 .qy-row{display:flex;justify-content:space-between;align-items:center;padding:3px 4px;font-variant-numeric:tabular-nums}
 .qy-row span{color:#9d9583}.qy-row b{color:#efe6cf;font-weight:normal}
 .qy-meter{position:relative;height:6px;margin:1px 4px 4px;background:#2b2720;border:1px solid #1a1814;overflow:hidden}
 .qy-meter i{position:absolute;inset:0 auto 0 0;background:linear-gradient(#e9c06a,#a77a2a)}
 .qy-empty{padding:30px 8px;text-align:center;color:#857d6a;line-height:1.8}
 /* 背包 */
 .qy-bag-info{display:flex;align-items:center;gap:6px;margin-top:5px;flex:none;font-size:11px;color:#9d9583;white-space:nowrap}
 .qy-bag-info .w{flex:1 1 50px;min-width:0;overflow:hidden}.qy-bag-info>span{flex:none}.qy-bag-info{font-size:10.5px;gap:4px}.qy-bag-info .cap{padding:0 5px}.qy-bag-info .w .qy-meter{margin:2px 0 0}
 .qy-bag-info b{color:#efe6cf;font-weight:normal}
 .qy-bag-info .cap{padding:1px 6px;background:#0d0f11;border:1px solid #2e2c28;border-radius:9px}
 .qy-win.qy-bag .classic-grid-scroll{flex:1;min-height:90px;max-height:none!important;margin:5px 0 0!important;padding:4px!important;overflow:auto!important;background:#0d0f11!important;border:1px solid #2e2c28!important;scrollbar-width:thin;scrollbar-color:#7a6740 #121416}
 .qy-win.qy-bag .classic-item-grid{display:grid!important;grid-template-columns:repeat(4,1fr)!important;grid-auto-rows:auto!important;gap:4px!important;width:auto!important;height:auto!important;padding:0!important}
 .qy-win.qy-bag .classic-item-grid .item-slot{position:relative;width:auto!important;height:auto!important;min-width:0!important;min-height:0!important;aspect-ratio:1!important;margin:0!important;padding:4px!important;
  background:radial-gradient(#25272b,#17181b)!important;border:1px solid #34322d!important;border-radius:3px;box-shadow:inset 0 0 6px #000!important;box-sizing:border-box}
 .qy-win.qy-bag .classic-item-grid .item-slot img{width:100%!important;height:100%!important;object-fit:contain}
 .qy-win.qy-bag .classic-item-grid .item-slot.empty{background:#141518!important;border-color:#23221f!important}
 .qy-win.qy-bag .classic-item-grid .item-slot:not(.empty):hover,.qy-win.qy-bag .classic-item-grid .item-slot[aria-pressed=true]{border-color:#d7b464!important}
 .qy-win.qy-bag .inventory-count{position:absolute;right:3px;bottom:1px;font-size:11px;color:#fff;text-shadow:0 0 2px #000,1px 1px 0 #000}
 .qy-win.qy-bag .inventory-enchant{position:absolute;z-index:1;right:2px;top:1px;padding:0 2px;border-radius:2px;background:#18130eea;color:#ffd782;font:bold 11px/1.2 sans-serif;pointer-events:none}
 .qy-win.qy-bag .equipped-mark{position:absolute;left:2px;top:1px;font-size:9px;padding:0 3px;background:#2f6bd0;color:#fff;border-radius:2px}
 .qy-win.qy-bag .missing-item-icon{display:flex;align-items:center;justify-content:center;width:100%;height:100%;font-size:14px;color:#c9b98e}
 .qy-win.qy-bag .classic-pager{display:none!important}
 .qy-bag-foot{display:flex;align-items:center;gap:4px;margin-top:5px;flex:none}
 .qy-win.qy-bag .qy-bag-foot>.classic-filter{flex:1 1 0!important;min-width:0!important;margin:0!important;display:flex}
 .qy-win.qy-bag .classic-filter select{display:none}
 .qy-bag-foot input{width:100%!important;min-width:0!important;box-sizing:border-box;min-height:28px!important;padding:2px 6px!important;font-size:12px;background:#0d0f11!important;border:1px solid #3c3a35!important;color:#d8cfb8!important}
 .qy-bag-foot>:not(.classic-filter){display:flex!important;gap:3px;flex:none;width:auto!important;margin:0!important;padding:0!important;background:transparent!important;border:0!important;position:static!important;transform:none!important}
 .qy-bag-foot button{width:32px!important;height:30px!important;min-height:0!important;min-width:0!important;padding:2px!important;margin:0!important;flex:none;background:linear-gradient(#3a3020,#221c13)!important;border:1px solid #8a6f40!important;border-radius:3px}
 .qy-bag-foot .inventory-tools-count:empty{display:none}
 .qy-win.qy-bag.qy-equip-view .classic-grid-scroll,.qy-win.qy-bag.qy-equip-view .qy-bag-foot,.qy-win.qy-bag.qy-equip-view .qy-bag-info{display:none!important}
 .qy-win.qy-bag:not(.qy-equip-view) .qy-equip{display:none}
 /* 裝備欄 */
 .qy-equip{flex:1;min-height:0;overflow:auto;margin-top:6px;padding:6px;background:#0d0f11;border:1px solid #2e2c28;scrollbar-width:thin}
 .qy-eq-name{text-align:center;color:#efe6cf;line-height:1.3}.qy-eq-name small{display:block;color:#9d9583;font-size:11px}
 .qy-eq-bar{position:relative;height:12px;margin:3px 22% 0;background:#2b2720;border:1px solid #000}
 .qy-eq-bar i{position:absolute;inset:0 auto 0 0}.qy-eq-bar.hp i{background:linear-gradient(#e05a4c,#8f1a14)}.qy-eq-bar.mp i{background:linear-gradient(#5d8ee6,#1d419b)}
 .qy-eq-bar span{position:relative;display:block;text-align:center;font-size:9px;line-height:12px;color:#fff;text-shadow:1px 1px 0 #000}
 .qy-doll{display:grid;grid-template-columns:16% 1fr 16%;gap:4px;margin-top:6px}
 .qy-doll-col{display:grid;gap:4px;align-content:start}
 .qy-doll-figure{display:flex;align-items:flex-end;justify-content:center;overflow:hidden;background:radial-gradient(ellipse at 50% 80%,#2c2618,transparent 70%)}
 .qy-doll-figure{position:relative}.qy-doll-figure img{position:absolute;bottom:0;left:50%;transform:translateX(-50%);height:100%;max-width:none;object-fit:contain}
 /* 2026-11-17 使用者指定：男女共用人形剪影，裝備格由上到下 頭盔／項鍊／內衣 盔甲 披風／戒指 腰帶 戒指／手套／左手 右手（盾牌、臂甲或戰士第二把斧）；耳環、長靴、第 3～4 枚戒指放空位 */
 .qy-doll2{position:relative;display:grid;grid-template-columns:repeat(3,21%);justify-content:space-between;row-gap:5px;margin:8px 4% 0;padding:2px 0;
  background:var(--qy-doll-figure) center/auto 100% no-repeat}
 .qy-doll2>.qy-doll-gap{aspect-ratio:1}
 /* 2026-11-17 使用者：要沿用原版裝備圖（拱門背景＋金屬格框）→ 底圖 equipment-doll.png 已把格子照新排列重畫並加剪影，按鈕透明疊在格子上 */
 .qy-doll3{position:relative;flex:none;width:260px;max-width:100%;aspect-ratio:152/330;margin:8px auto 0;background:url('assets/interface/player-panels/equipment-doll.png?v=1') center/100% 100% no-repeat;image-rendering:auto;border:1px solid #2e2c28}
 .qy-win .qy-doll3 .equipment-slot{position:absolute!important;left:var(--x)!important;top:var(--y)!important;right:auto!important;bottom:auto!important;width:23.03%!important;height:10.61%!important;aspect-ratio:auto;padding:2px!important;background:transparent!important;border:1px solid transparent!important}
 .qy-win .qy-doll3 .equipment-slot:hover,.qy-win .qy-doll3 .equipment-slot:focus-visible{border-color:#d7b464!important;box-shadow:0 0 6px #d7b46488}
 .qy-win .qy-doll3 .equipment-slot .slot-symbol{display:none}
 .qy-win .qy-doll3 .equipment-slot img{background:#15161a}
 .qy-doll3 .qy-slot-lock{position:absolute;right:2px;bottom:1px;font-size:10px;color:#c9c2b0;text-shadow:1px 1px 0 #000;pointer-events:none}
 .qy-win .qy-doll3 .equipment-slot.qy-locked{background:#0a0b0dbb!important}
 .qy-doll2 .equipment-slot{background:radial-gradient(#25272b8c,#17181b99)!important;border-color:#5a554a!important}
 .qy-ring-row{display:grid;grid-template-columns:repeat(5,16%);justify-content:space-between;margin-top:4px}
 .qy-win .equipment-slot{position:relative!important;inset:auto!important;width:auto!important;height:auto!important;aspect-ratio:1;min-height:0!important;margin:0!important;padding:3px!important;display:flex;align-items:center;justify-content:center;
  background:radial-gradient(#25272b,#17181b)!important;border:1px solid #3c3a35!important;border-radius:3px;box-sizing:border-box;transform:none!important;cursor:pointer}
 .qy-win .equipment-slot img{width:100%;height:100%;object-fit:contain}
 .qy-win .equipment-slot .slot-symbol{font-size:10px;color:#5f5a4e;line-height:1.1;text-align:center}
 .qy-win .equipment-slot:hover,.qy-win .equipment-slot:focus-visible{border-color:#d7b464!important}
 .qy-eq-stats{display:grid;grid-template-columns:repeat(3,1fr);gap:2px 8px;margin-top:6px;padding-top:5px;border-top:1px solid #2e2c28}
 .qy-eq-stats div{display:flex;justify-content:space-between;color:#9d9583}.qy-eq-stats b{color:#efe6cf;font-weight:normal}
 @container (max-width:250px){.qy-tabs button{font-size:11px!important;letter-spacing:-.5px}.qy-bag-info{flex-wrap:wrap}.qy-bag-info .w{flex-basis:100%}.qy-eq-stats{grid-template-columns:1fr 1fr}}
 `;document.head.append(css);
 // 裝備欄人形剪影（2026-11-17 本專案自繪、男女共用）：寫成 data URI，本機伺服器 SVG 型別不對也能顯示
 const DOLL_SVG='<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 400"><defs><linearGradient id="g" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#5d574a"/><stop offset="1" stop-color="#35322b"/></linearGradient></defs><g fill="url(#g)" stroke="#8a7d5e" stroke-width="1.4" stroke-linejoin="round" opacity=".85"><ellipse cx="100" cy="40" rx="21" ry="26"/><path d="M91 62h18v20H91z"/><path d="M100 79L64 87Q48 91 46 108L34 190Q30 214 34 232H45Q48 214 48 196L59 130L64 200Q61 215 66 228L70 330L68 380Q66 392 80 392H92L92 380L96 250L100 240L104 250L108 380L108 392H120Q134 392 132 380L130 330L134 228Q139 215 136 200L141 130L152 196Q152 214 155 232H166Q170 214 166 190L154 108Q152 91 136 87Z"/></g></svg>';
 document.documentElement.style.setProperty('--qy-doll-figure','url("data:image/svg+xml,'+encodeURIComponent(DOLL_SVG)+'")');

 const el=(tag,cls,text)=>uiElement(tag,cls,text);
 function weightPct(){return Math.min(100,ItemProperties.weightPercent(window.OwnedInventory?.items||[],window.PlayerClassStats?.read?.().attributes||window.playerAttributes,window.ClassBuffs?.maxWeight));}
 function expInfo(){const lv=window.activeCharacterLevel||1,exp=window.activeCharacterExperience||0,t=typeof killRewardData!=='undefined'?killRewardData.thresholds:null;const a=t?.find(r=>r[0]===lv)?.[1],b=t?.find(r=>r[0]===lv+1)?.[1];return {exp,pct:Number.isFinite(a)&&Number.isFinite(b)&&b>a?Math.max(0,Math.min(100,(exp-a)/(b-a)*100)):0}}
 function row(label,value,key){const r=el('div','qy-row');r.append(el('span','',label));const b=el('b','',String(value??'—'));if(key)b.dataset.qyVital=key;r.append(b);return r}
 function meter(pct){const m=el('div','qy-meter'),i=el('i');i.style.width=Math.max(0,Math.min(100,pct))+'%';m.append(i);return m}
 function tabs(list,current,pick){const bar=el('div','qy-tabs');bar.setAttribute('role','tablist');for(const [key,label,badge]of list){const b=el('button','',label);b.type='button';b.dataset.key=key;b.setAttribute('role','tab');b.setAttribute('aria-selected',String(key===current));if(badge!==undefined)b.append(el('sup','',String(badge)));b.onclick=()=>{for(const x of bar.children)x.setAttribute('aria-selected',String(x===b));pick(key)};bar.append(b)}return bar}
 // 立繪跟左上頭像同一來源（classic-panels.js currentPortrait：新職業優先用正式立繪 art，不再用建角像素圖）
 function portrait(){const img=el('img');img.alt='';img.src=currentPortrait();img.onerror=()=>img.remove();return img}

 // ---------- 角色（status） ----------
 let charTab='equip';
 function abilityTab(){const p=PlayerClassStats.read(),a=p.attributes||{},d=window.NativeCombatRules?.defense?.()||{},x=expInfo(),frag=document.createDocumentFragment();
  const st=el('div','qy-box qy-stats');for(const [k,l]of [['str','力量'],['int','智力'],['dex','敏捷'],['wis','精神'],['con','體質'],['cha','魅力']]){const s=el('div','qy-stat '+k);s.append(el('span','',l),el('b','',String(a[k]??'—')));st.append(s)}frag.append(st);
  const box=el('div','qy-box');box.append(row('等級',p.level),row('經驗值',x.exp.toLocaleString()+' ('+x.pct.toFixed(2)+'%)'),row('體力',hp+' / '+maxHp,'hp'),row('魔力',mp+' / '+maxMp,'mp'),
   row('防禦',previewArmorClass()),row('魔防',(d.mr||0)+'%'),row('正義值',window.activeCharacterLawful??0));frag.append(box);
  const w=weightPct(),bars=el('div','qy-box');bars.append(row('負重程度',w+'%'),meter(w),row('飽食程度',(window.Satiety?.value()??0)+' / '+(window.Satiety?.MAX??225)),meter((window.Satiety?.value()??0)/(window.Satiety?.MAX??225)*100));frag.append(bars);
  const signed=n=>(n>=0?'+':'')+n;
  const section=(title,rows)=>{const box=el('div','qy-box');box.append(el('h3','',title));for(const [label,value,note]of rows){const r=row(label,value);if(note)r.title=note;box.append(r)}frag.append(box)};
  section('物理能力',[
   ['近距離傷害',signed(p.meleeBonus||0),'固定加成，不含武器隨機傷害與觸發技能'],
   ['近距離命中',signed(p.meleeHitBonus||0),'依等級、力量、命中加成與目標防禦和迴避判定（5%～95%）'],
   ['遠距離傷害',signed(p.rangedBonus||0),'固定加成，不含武器隨機傷害與觸發技能'],
   ['遠距離命中',signed(p.rangedHitBonus||0),'敏捷、裝備、套裝、變身及技能命中加成；實際機率依等級與目標防禦計算（5%～95%）'],
   ['武器傷害',p.weapon?.damage?.join(' / ')??'空手'],
   ['迴避修正',d.dodge||0,'用於怪物命中擲骰，迴避率依攻擊者與防禦決定'],
   ['HP恢復量',p.hpRecoveryText],['MP恢復量',p.mpRecoveryText],
   ['傷害減免',d.reduction||0],['魔法傷害減免',d.magicReduction||0]]);
  section('魔法能力',[
   ['魔攻',PlayerAbilityRules.intelligencePower(a.int)+(p.sp||0),'智力魔法加成加上裝備、藥水與技能 SP；每點增加 5% 攻擊魔法傷害'],
   ['魔法命中修正',signed(PlayerAbilityRules.magicAccuracy(p))+'%', '攻擊魔法依雙方等級、智力、命中加成與目標魔防判定（5%～95%）'],
   ['精神治癒加成',signed(5*PlayerAbilityRules.intelligencePower(a.wis))+'%', '精神越高，治癒魔法回復的體力越多'],
   ['魔法爆擊率',PlayerAbilityRules.magicCritical(a.int,OwnedInventory.items)+'%','攻擊魔法暴擊造成 1.5 倍傷害'],
   ['智力省魔',PlayerAbilityRules.manaReduction(a.int)+'%','依當前智力降低 MP 消耗'],['創角智力省魔',PlayerAbilityRules.originalManaReduction(playerAttributes.int)+' MP','百分比省魔後再扣除；正消耗技能最低 1 MP']]);
  section('屬性抗性',[['火屬性抗性',d.elements?.fire||0],['水屬性抗性',d.elements?.water||0],['風屬性抗性',d.elements?.wind||0],['地屬性抗性',d.elements?.earth||0]]);
  section('異常抗性',[['石化抗性',(d.status?.stone||0)+'%'],['束縛／緩速抗性',(d.status?.sustain||0)+'%']]);
  frag.append(el('p','qy-ability-note','近戰、遠攻和攻擊魔法依目標判定命中。精神會提高治癒魔法的回復量。四屬性抗性降低對應魔法傷害，每 100 點抗性減少 32%。'));return frag}
 const SOCIAL={party:['隊伍','目前沒有隊伍。'],clan:['血盟','尚未加入血盟。'],friend:['好友','好友名單是空的。']};
 function characterPane(){const pane=makeClassicWindow('角色');pane.classList.add('qy-win','qy-char','status-window');
  const body=el('div','qy-body'),fill=()=>{body.dataset.ability=String(charTab==='ability');body.replaceChildren(charTab==='equip'?equipView():charTab==='ability'?abilityTab():el('div','qy-empty',SOCIAL[charTab][1]));};
  pane.append(tabs([['equip','裝備'],['ability','能力'],['party','隊伍'],['clan','血盟'],['friend','好友']],charTab,k=>{charTab=k;fill()}),body);fill();return pane}
 renderStatusPane=characterPane;
 setInterval(()=>{const body=document.querySelector('.qy-char .qy-body[data-ability="true"]');if(!body||window.gameFlowState!=='playing')return;const p=PlayerClassStats.read(),d=NativeCombatRules.defense(),key=JSON.stringify([p.attributes,p.sp,p.meleeBonus,p.meleeHitBonus,PlayerAbilityRules.magicAccuracy(p),p.rangedBonus,p.rangedHitBonus,p.hpRecoveryText,p.mpRecoveryText,d,PlayerAbilityRules.magicCritical(p.attributes.int,OwnedInventory.items),hp,mp]);if(body.abilitySignature===key)return;body.abilitySignature=key;const scroll=body.scrollTop;body.replaceChildren(abilityTab());body.scrollTop=scroll;},500);

 // ---------- 背包（bag）＋裝備欄 ----------

 inventoryPageSize=999;
 catalogMatches=function(){return OwnedInventory.items.filter(e=>(catalogKind==='all'||e.item.kind===catalogKind)&&(!catalogQuery||e.item.name.includes(catalogQuery)||String(e.item.id)===catalogQuery))};
 if(!['all','weapon','armor','etcitem'].includes(catalogKind))catalogKind='all';
 const baseEquipment=renderEquipmentPane,baseInventory=renderInventoryPane;
 function equipView(){const box=el('div','qy-equip'),p=PlayerClassStats.read(),a=p.attributes||{},d=window.NativeCombatRules?.defense?.()||{};
  const source=baseEquipment(),buttons=new Map();[...source.querySelectorAll('.equipment-slot')].forEach((b,i)=>{b.removeAttribute('style');buttons.set(equipmentSlots[i]?.[0],b)});
  const col=keys=>{const c=el('div','qy-doll-col');for(const k of keys){const b=buttons.get(k);if(b)c.append(b)}return c};
  const right=OwnedInventory.items.some(e=>e.slot==='weapon2')?'weapon2':'shield'; // 右手欄：裝了第二把斧就顯示斧，否則盾牌／臂甲
  // 2026-11-17 使用者：人物狀態／裝備直接用天地劫天堂客戶端的介面圖（Sprite.idx 563c.img，257×336，狀態與裝備同一張）。
  //  12 個裝備格照原圖位置（左上角座標，格寬 33）；原圖沒有的耳環、第 3～4 枚戒指放在圖下方一排。數值填進原圖的欄位。
  const SLOT={helm:[174,33],necklace:[138,55],tshirt:[110,95],armor:[147,95],cloak:[184,95],weapon:[77,133],belt:[160,131],[right]:[199,143],ring1:[80,167],glove:[115,153],ring2:[193,179],boots:[196,265]};
  const sheet=el('div','qy-sheet'),lv=Number(window.activeCharacterLevel)||1,LOCK={ring3:76,ring4:81},X=v=>(v/257*100)+'%',Y=v=>(v/336*100)+'%';
  const put=(cls,text,x,y,w,h,key)=>{const t=el('span','qy-f '+cls,String(text??''));t.style.left=X(x);t.style.top=Y(y);t.style.width=X(w);t.style.height=Y(h);if(key)t.dataset.qyVital=key;sheet.append(t);return t};
  const x=expInfo(),circle={法師:[4,10],妖精:[8,6],王族:[10,2],騎士:[50,1],黑妖:[12,2]}[job],magicLv=circle?Math.min(circle[1],Math.floor(lv/circle[0])):0;
  put('wide','Lv.'+lv+'　'+x.pct.toFixed(2)+'%',80,13,140,12);
  put('',hp+'/'+maxHp,80,35,50,12,'hp');put('',mp+'/'+maxMp,80,50,50,12,'mp');put('',previewArmorClass(),80,65,50,12);
  put('',weightPct()+'%',59,88,44,12);put('',window.Satiety?.value()??'—',59,101,44,12);
  [a.str,a.dex,a.con,a.int,a.wis,a.cha].forEach((v,i)=>put('',v??'—',38,125+i*13,34,12));
  put('',magicLv,96,218,30,12);put('',p.sp||0,96,231,30,12);put('name',window.activeCharacterName||'',153,242,77,13);
  [d.elements?.earth,d.elements?.water,d.elements?.fire,d.elements?.wind].forEach((v,i)=>put('',v||0,82,274+i*13,32,12));
  put('',d.dodge||0,154,300,45,12);
  for(const [k,[sx,sy]]of Object.entries(SLOT)){const b=buttons.get(k);if(!b)continue;b.classList.add('qy-sheet-slot');b.style.setProperty('--x',X(sx));b.style.setProperty('--y',Y(sy));sheet.append(b)}
  box.append(sheet);
  const extra=el('div','qy-sheet-extra');for(const [k,l]of [['earring','耳環'],['ring3','戒指'],['ring4','戒指']]){const b=buttons.get(k);if(!b)continue;const cell=el('label','qy-extra-cell');cell.append(b,el('span','',l));if(LOCK[k]&&lv<LOCK[k]){b.classList.add('qy-locked');b.append(el('span','qy-slot-lock','Lv.'+LOCK[k]));b.title='Lv.'+LOCK[k]+' 開放';}extra.append(cell)}
  box.append(extra);return box}
 function padGrid(grid){const items=grid.querySelectorAll('.item-slot:not(.empty)').length,blanks=[...grid.querySelectorAll('.item-slot.empty')],want=Math.max(32,Math.ceil(items/4)*4)-items;
  if(blanks.length===want)return;for(const b of blanks.slice(want))b.remove();for(let i=blanks.length;i<want;i++){const b=el('div','item-slot empty');b.setAttribute('aria-hidden','true');grid.append(b)}}
 renderInventoryPane=function(){const pane=baseInventory();pane.classList.add('qy-win','qy-bag');
  const header=pane.querySelector('.classic-window-header'),filter=pane.querySelector('.classic-filter'),scroll=pane.querySelector('.classic-grid-scroll'),grid=pane.querySelector('.classic-item-grid'),query=filter?.querySelector('input'),tools=pane.lastElementChild;
  const bar=tabs([['all','全部',OwnedInventory.items.length],['weapon','武器'],['armor','防具'],['etcitem','道具']],catalogKind,k=>{
   catalogKind=k;query?.dispatchEvent(new Event('input'))});
  const info=el('div','qy-bag-info'),w=weightPct(),wd=el('div','w');wd.append('負重 ',el('b','',w+'%'),meter(w));const cap=el('span','cap');cap.append('格數 ',el('b','',OwnedInventory.items.length+'/180'));const ac=el('span');ac.append('防禦 ',el('b','',String(previewArmorClass())));info.append(wd,cap,ac);
  const foot=el('div','qy-bag-foot');if(filter)foot.append(filter);if(tools&&tools!==filter&&tools!==scroll&&!tools.classList.contains('classic-item-detail'))foot.append(tools);
  // 2026-11-17 使用者：背包用天地劫天堂客戶端的背包圖（Sprite.idx 538c.img，223×336，4×8 格），物品排在原圖格子裡、可捲動；下方 S.power／M.resist。
  const frame=el('div','qy-bagframe');if(scroll)frame.append(scroll);
  {const p=PlayerClassStats.read(),d=window.NativeCombatRules?.defense?.()||{};const sp=el('span','qy-bf-sp',String(PlayerAbilityRules.intelligencePower(p.attributes?.int)+(p.sp||0))),mr=el('span','qy-bf-mr',String(d.mr||0));frame.append(sp,mr);}
  {const close=el('button','qy-bf-close');close.type='button';close.setAttribute('aria-label','關閉背包');close.onclick=()=>pane.querySelector('.classic-close')?.click();frame.append(close);} // 原圖左上角畫的「Close」也能按
  // 2026-11-17 使用者：原版道具框要看得清楚、分類放側邊 → 左側直排分類＋負重資訊，右側道具框用整個高度
  // 2026-11-17 使用者：背包只要原版框圖，分類與整理／自動販售按鈕放進框圖左側的空白條（外框、上方分頁、負重、下方工具列都不顯示）
  pane.classList.add('qy-bag-frameonly');
  {const strip=el('div','qy-bf-strip');const tabBtn=(k,label)=>{const b=el('button','qy-bf-btn',label);b.type='button';b.setAttribute('aria-pressed',String(catalogKind===k));b.onclick=()=>{catalogKind=k;for(const x of strip.querySelectorAll('[data-kind]'))x.setAttribute('aria-pressed',String(x.dataset.kind===k));query?.dispatchEvent(new Event('input'));};b.dataset.kind=k;return b;};
   const toolBtn=(label,title)=>{const b=el('button','qy-bf-btn qy-bf-tool',label);b.type='button';b.title=title;b.onclick=()=>pane.querySelector('.qy-bag-foot button[title="'+title+'"]')?.click();return b;};
   const sort=toolBtn('整理','整理背包'),sell=toolBtn('販售','自動販賣');
   const remove=toolBtn('刪除','選擇刪除'),check=toolBtn('確定','確認刪除所選物品');
   remove.classList.add('qy-bf-delete');
   const hiddenConfirm=tools.querySelector('[data-tool=check]');
   function syncDeleteControls(){
    const selecting=InventoryTools.selecting;
    sort.disabled=selecting;
    sell.hidden=selecting;
    check.hidden=!selecting;
    check.disabled=hiddenConfirm.disabled;
    check.setAttribute('aria-label','確認刪除所選物品（'+InventoryTools.selected.size+' 格）');
    remove.textContent=selecting?'取消':'刪除';
    remove.setAttribute('aria-pressed',String(selecting));
   }
   const toggleDelete=remove.onclick;
   remove.onclick=()=>{toggleDelete();syncDeleteControls();};
   grid.addEventListener('click',syncDeleteControls);
   strip.append(tabBtn('all','全部'),tabBtn('weapon','武器'),tabBtn('armor','防具'),tabBtn('etcitem','道具'),sort,sell,check,remove);
   syncDeleteControls();
   frame.append(strip);for(const pos of ['top','bottom']){const d=el('div','qy-bf-drag qy-bf-drag-'+pos);d.title='拖動背包';frame.append(d);}}
  const main=el('div','qy-bag-main'),side=el('div','qy-bag-side'),wrap=el('div','qy-bagframe-wrap');side.append(bar,info);wrap.append(frame);main.append(side,wrap);header.after(main,foot);
  if(grid&&scroll){
   const up=el('button','qy-bf-scroll up','▲'),down=el('button','qy-bf-scroll down','▼');
   for(const [button,direction,label] of [[up,-1,'背包向上捲動一排'],[down,1,'背包向下捲動一排']]){
    button.type='button';button.title=label;button.setAttribute('aria-label',label);
    button.onclick=()=>{
     const rowHeight=grid.querySelector('.item-slot')?.getBoundingClientRect().height||0;
     scroll.scrollTop+=direction*rowHeight;
     syncScrollButtons();
    };
   }
   function syncScrollButtons(){
    up.disabled=scroll.scrollTop<=1;
    down.disabled=scroll.scrollTop+scroll.clientHeight>=scroll.scrollHeight-1;
   }
   frame.append(up,down);
   scroll.addEventListener('scroll',syncScrollButtons,{passive:true});
   padGrid(grid);
   new MutationObserver(()=>{padGrid(grid);syncScrollButtons();}).observe(grid,{childList:true});
   requestAnimationFrame(syncScrollButtons);
  }
  return pane};
 // 裝備（E）與角色選單開角色的裝備分頁；人物狀態開能力分頁。
 renderEquipmentPane=characterPane;
 const prevPanel=panel;panel=function(type){if(type==='equipment'){charTab='equip';return prevPanel('equipment')}if(type==='status'){charTab='ability';return prevPanel('equipment')}return prevPanel(type)};

 // HP／MP 變動時更新已開啟的視窗
 const baseStats=stats;stats=function(...args){const out=baseStats.apply(this,args);
  for(const [key,v,m]of [['hp',hp,maxHp],['mp',mp,maxMp]]){for(const b of document.querySelectorAll('[data-qy-vital="'+key+'"]'))b.textContent=v+' / '+m;
   for(const s of document.querySelectorAll('[data-qy-bar="'+key+'"]')){s.textContent=key.toUpperCase()+' '+v+' / '+m;s.previousSibling.style.width=(m?Math.max(0,Math.min(100,v/m*100)):0)+'%'}}return out};

 // 天地劫天堂原版介面圖（563c 人物狀態＋裝備、538c 背包）的樣式
 {const st=document.createElement('style');st.textContent=`
 .qy-sheet{position:relative;width:min(100%,386px);aspect-ratio:257/336;margin:2px auto 0;background:url('assets/interface/client-ui/563c.png?v=1') center/100% 100% no-repeat;container-type:inline-size;flex:none}
 .qy-sheet .qy-f{position:absolute;display:flex;align-items:center;justify-content:center;font-size:4.1cqw;line-height:1;color:#f1e6c8;text-shadow:1px 1px 0 #000;white-space:nowrap;overflow:hidden;font-variant-numeric:tabular-nums}
 .qy-sheet .qy-f.wide,.qy-sheet .qy-f.name{justify-content:flex-start;padding-left:1.5cqw;box-sizing:border-box}
 .qy-sheet .qy-f.name{color:#ffe2a0}
 .qy-win .qy-sheet .equipment-slot.qy-sheet-slot{position:absolute!important;left:var(--x)!important;top:var(--y)!important;right:auto!important;bottom:auto!important;width:12.84%!important;height:9.82%!important;min-width:0!important;min-height:0!important;aspect-ratio:auto;padding:1px!important;margin:0!important;background:transparent!important;border:1px solid transparent!important;border-radius:0!important}
 .qy-win .qy-sheet .equipment-slot.qy-sheet-slot:hover,.qy-win .qy-sheet .equipment-slot.qy-sheet-slot:focus-visible{border-color:#d7b464!important;box-shadow:0 0 6px #d7b46488}
 .qy-win .qy-sheet .equipment-slot .slot-symbol,.qy-win .qy-sheet-extra .equipment-slot .slot-symbol{display:none}
 .qy-win .qy-sheet .equipment-slot img{width:100%;height:100%;object-fit:contain;background:transparent!important}
 .qy-sheet-extra{display:flex;justify-content:center;gap:10px;margin:6px auto 0;width:min(100%,386px)}
 .qy-extra-cell{display:flex;flex-direction:column;align-items:center;gap:2px;font-size:11px;color:#b7ad95}
 .qy-win .qy-sheet-extra .equipment-slot{position:relative!important;inset:auto!important;width:44px!important;height:44px!important;min-height:0!important;padding:2px!important;background:#2a2a2e99!important;border:1px solid #55524b!important;border-radius:0!important}
 .qy-win .qy-sheet-extra .equipment-slot img{width:100%;height:100%;object-fit:contain}
 .qy-win .qy-sheet-extra .equipment-slot.qy-locked{background:#0a0b0dbb!important}
 .qy-sheet-extra .qy-slot-lock{position:absolute;right:2px;bottom:1px;font-size:10px;color:#c9c2b0;text-shadow:1px 1px 0 #000;pointer-events:none}
 /* 2026-11-17 使用者：背包拉不到最下面 → 外框依視窗剩下的高度縮放（高度優先，寬度照 223:336 比例），不再固定寬度被視窗切掉 */
 .qy-bag-main{flex:1 1 auto;min-height:0;display:flex;gap:6px;margin-top:6px}
 .qy-bag-side{flex:0 0 86px;display:flex;flex-direction:column;gap:8px;min-width:0}
 .qy-bag-side .qy-tabs{flex-direction:column;margin:0;gap:4px}.qy-bag-side .qy-tabs button{flex:none;min-height:34px!important;font-size:13px!important}
 .qy-bag-side .qy-bag-info{flex-direction:column;align-items:stretch;gap:6px;margin:0;white-space:normal;font-size:11px}.qy-bag-side .qy-bag-info .w{flex:none}.qy-bag-side .qy-bag-info>span{text-align:center}
 .qy-bagframe-wrap{flex:1 1 auto;min-width:0;min-height:0;display:flex;justify-content:center;align-items:flex-start;container-type:size}
 .qy-bagframe{position:relative;flex:none;height:min(100cqh,calc(100cqw * 336 / 223));width:auto;aspect-ratio:223/336;margin:0;background:url('assets/interface/client-ui/538c.png?v=1') center/100% 100% no-repeat;container-type:inline-size}
 .qy-win.qy-bag .qy-bagframe .classic-grid-scroll{position:absolute!important;left:23.9%;top:5.45%;width:61.4%;height:81.4%;min-height:0!important;max-height:none!important;margin:0!important;padding:0!important;background:transparent!important;border:0!important;overflow-y:auto!important;scrollbar-width:none;touch-action:pan-y;overscroll-behavior-y:contain}
 .qy-win.qy-bag .qy-bagframe .classic-grid-scroll::-webkit-scrollbar{display:none}
 .qy-win.qy-bag .qy-bagframe .classic-item-grid{gap:0!important;padding:0!important;background:transparent!important}
 .qy-win.qy-bag .qy-bagframe .classic-item-grid .item-slot{aspect-ratio:1/1;padding:8%!important;background:transparent!important;border:1px solid transparent!important;border-radius:0!important}
 .qy-win.qy-bag .qy-bagframe .classic-item-grid .item-slot.empty{background:transparent!important;border-color:transparent!important}
 .qy-win.qy-bag .qy-bagframe .classic-item-grid .item-slot:not(.empty):hover,.qy-win.qy-bag .qy-bagframe .classic-item-grid .item-slot[aria-pressed=true]{border-color:#d7b464!important;box-shadow:inset 0 0 6px #d7b46488}
 .qy-bagframe .qy-bf-sp,.qy-bagframe .qy-bf-mr{position:absolute;top:91.4%;height:3.6%;display:flex;align-items:center;justify-content:center;font-size:4.6cqw;color:#f1e6c8;text-shadow:1px 1px 0 #000}
 .qy-bagframe .qy-bf-sp{left:34.5%;width:13%}.qy-bagframe .qy-bf-mr{left:72.2%;width:17.9%}
 .qy-win.qy-bag.qy-bag-frameonly{padding:0!important;background:none!important;border:0!important;box-shadow:none!important;overflow:visible!important}
 .qy-win.qy-bag.qy-bag-frameonly>.classic-window-header,.qy-bag-frameonly .qy-bag-side,.qy-bag-frameonly .qy-bag-foot{display:none!important}
 .qy-bag-frameonly .qy-bag-main{margin:0;gap:0;height:100%}
 .qy-bag-frameonly .qy-bagframe{filter:drop-shadow(0 6px 14px #000c)}
 .qy-bf-strip{position:absolute;left:5.6%;top:9.5%;width:13.5%;height:80%;display:flex;flex-direction:column;justify-content:flex-start;gap:2.2%}
 .qy-bf-btn{width:100%;aspect-ratio:1/1.05;min-height:0!important;padding:0!important;display:flex;align-items:center;justify-content:center;writing-mode:vertical-rl;letter-spacing:0;font:700 4.6cqw/1 system-ui;color:#e9d6a4;background:linear-gradient(#3b3326,#1c1813)!important;border:1px solid #6e5a35!important;border-radius:3px!important;box-shadow:inset 0 0 4px #000;text-shadow:0 1px 1px #000;cursor:pointer}
 .qy-bf-btn[aria-pressed=true]{color:#fff2c8;background:linear-gradient(#6a5428,#3a2c14)!important;border-color:#e2c27a!important;box-shadow:0 0 6px #e2c27a88,inset 0 0 4px #000}
 .qy-bf-btn.qy-bf-tool{color:#bfe0f0;border-color:#4e6b7a!important}
 .qy-bf-strip .qy-bf-btn[hidden]{display:none!important}
 .qy-bf-strip .qy-bf-delete{color:#ffd3c2;border-color:#9c5144!important}
 .qy-bf-btn:hover{border-color:#e2c27a!important}
 .qy-bf-drag{position:absolute;cursor:move;touch-action:none;user-select:none}.qy-bf-drag-top{left:16%;right:0;top:0;height:5.4%}.qy-bf-drag-bottom{left:0;right:0;top:87.5%;bottom:0}
 .qy-bagframe .qy-bf-scroll{position:absolute;z-index:2;right:2%;width:10%;height:7%;min-height:0!important;padding:0!important;display:grid;place-items:center;color:#f5dc9f;background:linear-gradient(#453924,#211a11)!important;border:1px solid #a3844a!important;border-radius:4px;font-size:4.3cqw;line-height:1;cursor:pointer;touch-action:manipulation}
 .qy-bagframe .qy-bf-scroll.up{top:5.45%}
 .qy-bagframe .qy-bf-scroll.down{top:79.85%}
 .qy-bagframe .qy-bf-scroll:disabled{opacity:.48;cursor:default}
 .qy-bagframe .qy-bf-close{position:absolute;left:1%;top:0;width:15%;height:5.5%;min-height:0!important;padding:0!important;background:transparent!important;border:0!important;cursor:pointer}
 .qy-win.qy-bag .qy-bagframe .inventory-count{font-size:3.6cqw;right:2px;bottom:0}
 `;document.head.append(st);}
})();
