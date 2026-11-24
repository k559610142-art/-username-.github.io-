// Native potion handlers carry their amount, effect and class parameters in classname.
const NativePotions=(()=>{
  const timers=new Map();
  // 2026-11-17 使用者：藥水狀態圖跟技能狀態圖混在一起 → 藥水效果改顯示藥水道具圖（加速＝自我加速藥水、勇敢／精靈餅乾＝勇敢藥水、三段加速＝巧克力蛋糕、魔力回復＝加速魔力回復藥水、慎重＝慎重藥水）
  const POTION_ICONS={haste:'assets/interface/items/etcitem-77.png',brave:'assets/interface/items/etcitem-79.png',elfBrave:'assets/interface/items/etcitem-79.png',braveX:'assets/interface/client-icons/2901.png',blue:'assets/interface/client-icons/75.png',wisdom:'assets/interface/items/etcitem-1529.png'};
  const buffIcons={haste:43,brave:52,elfBrave:52 /* 2026-11-17 使用者：精靈餅乾 BUFF 圖示改用勇敢藥水的 */,braveX:54,blue:32,wisdom:26};
  const buffNames={haste:'加速',brave:'勇敢',elfBrave:'精靈餅乾',braveX:'三段加速',blue:'魔力回復',wisdom:'慎重',exp:'經驗加成'};
  // 原版職業位元：王族 1、騎士 2、妖精 4、法師 8、黑妖 16、龍騎士 32、幻術師 64、戰士 128（例：綠水 255＝全職業、勇水 130＝騎士＋戰士、生命之樹果實 96＝龍騎士＋幻術師）
  const flags={'王族':1,'騎士':2,'妖精':4,'法師':8,'黑妖':16,'黑暗妖精':16,'龍騎士':32,'幻術師':64,'戰士':128};
  const bar=document.createElement('div');
  bar.className='native-potion-buffs';
  bar.style.cssText='position:absolute;left:var(--ui-left,12px);top:calc(var(--ui-top,12px) + 60px);z-index:3;display:flex;gap:4px;max-width:260px;flex-wrap:wrap;pointer-events:none';
  const statusRow=document.createElement('div');statusRow.className='status-effects-row';
  statusRow.style.cssText='position:absolute;z-index:30;display:flex;align-items:center;gap:4px;flex-wrap:nowrap;overflow-x:auto;overflow-y:hidden;max-width:260px;pointer-events:auto;touch-action:pan-x;scrollbar-width:thin;scrollbar-color:#b49a59 #111c27';
  bar.style.cssText='position:static;display:flex;align-items:center;gap:4px;flex-wrap:nowrap;flex:0 0 auto;pointer-events:none';
  statusRow.append(bar);game.append(statusRow);
  const statusStyle=document.createElement('style');statusStyle.textContent='.status-effects-row .class-buff-bar{position:static!important;display:flex;align-items:center;flex-wrap:nowrap!important;max-width:none!important;flex:0 0 auto;gap:4px}.status-effects-row .class-buff-bar img,.status-effects-row .native-potion-buffs>span{flex-shrink:0}.status-effects-row .native-potion-buffs[hidden]{display:none!important}';document.head.append(statusStyle);
  const details=document.createElement('section');
  details.className='buff-effect-details';details.hidden=true;
  details.setAttribute('aria-label','狀態效果');
  const detailTitle=document.createElement('strong'),detailText=document.createElement('p'),close=document.createElement('button');
  close.type='button';close.textContent='關閉';
  close.onclick=()=>{details.hidden=true;};
  details.append(detailTitle,close,detailText);game.append(details);
  statusStyle.textContent += `
    .status-effects-row .native-potion-buffs>span,.status-effects-row .class-buff-bar>img{pointer-events:auto;cursor:pointer}
    .reference-game .buff-effect-details{position:absolute;z-index:32;box-sizing:border-box;width:min(300px,calc(100% - 16px));max-height:min(260px,45%);overflow:auto;padding:10px;color:#f6e5be;background:#13222e;border:1px solid #a79159;border-radius:6px;box-shadow:0 4px 14px #000a;font:14px/1.5 system-ui,sans-serif;pointer-events:auto}
    .buff-effect-details[hidden]{display:none!important}
    .buff-effect-details p{margin:6px 0 0;white-space:pre-line;clear:both}
    .buff-effect-details button{float:right;min-height:36px;color:inherit;background:#29382d;border:1px solid #8c7748;border-radius:4px}
  `;
  function stopStatusGesture(event){event.stopPropagation();}
  for(const type of ['pointerdown','pointerup','dblclick']){
    statusRow.addEventListener(type,stopStatusGesture);
    details.addEventListener(type,stopStatusGesture);
  }
  details.addEventListener('click',stopStatusGesture);
  statusRow.addEventListener('click',event=>{
    const icon=event.target.closest('.native-potion-buffs > span,.class-buff-bar > img');
    if(!icon||!icon.title)return;
    event.stopPropagation();
    detailTitle.textContent=icon.dataset.buffName||icon.title;
    detailText.textContent=icon.dataset.buffDescription||'目前生效中。';
    details.style.left=Math.max(8,Math.min(statusRow.offsetLeft,game.clientWidth-Math.min(300,game.clientWidth-16)-8))+'px';
    details.style.top=(statusRow.offsetTop+statusRow.offsetHeight+5)+'px';
    details.hidden=false;
  });
  game.addEventListener('pointerdown',event=>{
    if(!statusRow.contains(event.target)&&!details.contains(event.target))details.hidden=true;
  },true);
  const potionDescriptions={haste:'提升移動、攻擊與施法速度。',brave:'提升移動與攻擊速度。',elfBrave:'提升妖精的移動與攻擊速度。',braveX:'移動與普攻速度 ×1.05（再提高 5%），施法速度維持原值。',blue:'增加自然魔力回復量，效果依精神而定。',wisdom:'魔攻 +2，魔力回復 +2。',exp:'提升狩獵獲得的經驗值。'};
  function placeMagicBuffs(left,top,max){
    const cb=document.querySelector('.class-buff-bar');if(cb&&cb.parentNode!==statusRow)statusRow.append(cb);
    statusRow.style.left=left+'px';statusRow.style.top=top+'px';statusRow.style.maxWidth=max+'px';
    statusRow.hidden=window.gameFlowState!=='playing';
    if(statusRow.hidden)details.hidden=true;
  }
  const portraitStatusLayout=window.matchMedia('(orientation: portrait) and (max-width: 650px)');
  statusStyle.textContent+=
    '.status-effects-row[hidden]{display:none!important}.status-effects-row.mobile-status:not([hidden]){display:grid!important;grid-template-columns:repeat(10,minmax(0,20px));grid-auto-rows:20px;justify-content:start;align-content:start;gap:3px;max-height:43px;overflow-x:hidden;overflow-y:auto;touch-action:pan-y}'
    + '.status-effects-row.mobile-status .native-potion-buffs:not([hidden]),.status-effects-row.mobile-status .class-buff-bar:not([hidden]){display:contents!important}'
    + '.status-effects-row.mobile-status .native-potion-buffs>span,.status-effects-row.mobile-status .class-buff-bar img{box-sizing:border-box;width:100%!important;max-width:20px;height:20px!important;object-fit:contain}'
    + '.status-effects-row.mobile-status .native-potion-buffs>span>small{font-size:8px!important;right:1px!important;max-width:100%;overflow:hidden}'
    + '.status-effects-row.mobile-status .native-potion-buffs>span>img{width:100%!important;max-width:18px;height:18px!important;object-fit:contain}';
  function positionBuffs(){
    const mobile=portraitStatusLayout.matches;
    statusRow.classList.toggle('mobile-status',mobile);
    if(mobile){
      const hud=document.querySelector('.hud'),bag=document.querySelector('.nav button[aria-label="背包"]');
      if(hud){
        const stage=game.getBoundingClientRect(),character=hud.getBoundingClientRect(),bagBox=bag?.getBoundingClientRect();
        const left=character.left-stage.left;
        const right=bagBox?.width?bagBox.left:stage.right;
        const width=Math.max(0,right-character.left-6);
        const top=Math.max(0,character.top-stage.top-46);
        statusRow.style.width=width+'px';
        placeMagicBuffs(left,top,width);
        return;
      }
    }
    statusRow.style.width='';
    // 2026-11-14：狀態圖示（藥水＋技能 class-buff-bar）排在左上「輔助」鈕右邊同一排，往右到小地圖前，不再壓到頭像框的防禦／魔防
    const assist=document.querySelector('.assist-hud');
    if(assist&&!assist.hidden&&assist.offsetWidth){
      const g=game.getBoundingClientRect(),a=assist.getBoundingClientRect(),mini=document.querySelector('.minimap-button')?.getBoundingClientRect();
      const left=a.right-g.left+8,top=a.top-g.top+6,max=Math.max(60,(mini&&mini.width?mini.left-g.left:g.width)-left-8);
      bar.style.left=left+'px';bar.style.top=top+'px';bar.style.maxWidth=max+'px';
      placeMagicBuffs(left,top,max);
      return;
    }
    const mana=document.querySelector('.hud .bar.mana');if(!mana)return;
    const g=game.getBoundingClientRect(),m=mana.getBoundingClientRect(),left=m.left-g.left+2;
    bar.style.left=left+'px';bar.style.top=(m.bottom-g.top+8)+'px';bar.style.maxWidth=Math.max(28,Math.min(260,g.width-left-8))+'px';
    placeMagicBuffs(left,m.bottom-g.top+8,Math.max(28,Math.min(260,g.width-left-8)));
  }
  const observer=new ResizeObserver(positionBuffs);observer.observe(game);observer.observe(document.querySelector('.hud'));
  setInterval(()=>{if(window.gameFlowState==='playing')positionBuffs()},500); // 圖示數量變化、輔助鈕位置更新後跟著排
  const active=key=>window.gameFlowState==='playing'&&!CharacterActions.dead&&Number(window.activePotionBuffs?.[key])>Date.now();
  function parse(key){
    const rule=ITEM_USE_RULES.definitions[key];
    if(!rule)return null;
    const [handler,...parameters]=rule.handler.trim().split(/\s+/);
    if(!/^(hp\.UserAddHp(?:_FR)?|mp\.UserAddMp|mp\.UserMprBlue|brave\.Status(?:Haste|Brave|ElfBrave|WisdomPotion|BraveCake|Ribrave)(?:_FR)?|Disintoxicat_Potion)$/.test(handler))return null;
    return {handler,parameters,rule};
  }
  function canUseForClass(handler,parameters){
    if(handler.startsWith('brave.StatusElfBrave'))return job==='妖精';
    if(!handler.startsWith('brave.'))return true;
    const allowed=Number(parameters[2]);
    return Number.isInteger(allowed)&&!!(allowed&flags[job]);
  }
  function isHealing(key){
    if(parse(key)?.handler.startsWith('hp.UserAddHp'))return true;
    const rule=ITEM_USE_RULES.definitions[key];if(ITEM_USE_RULES.handlers[rule?.handler]?.kind==='hpGaussian')return true;
    return !!window.DBGameRules?.rows('system_etcitem_hpmp').some(row=>row['物品編號']===Number(key.split(':')[1])&&(row['補血量固定值']>0||row['補血量隨機值']>0));
  }
  function take(rows,key,count){
    for(const row of rows){
      if(row.key!==key||row.slot)continue;
      const used=Math.min(row.count,count);row.count-=used;count-=used;
      if(!count)break;
    }
    if(count)return false;
    for(let i=rows.length-1;i>=0;i--)if(!rows[i].count)rows.splice(i,1);
    return true;
  }
  function clearOnDeath(){const b=window.activePotionBuffs||{};window.activePotionBuffs=Number(b.exp)>Date.now()?{exp:b.exp,expRate:b.expRate,expIcon:b.expIcon}:{};timers.clear();window.IslandNpcAi?.cure?.();sync();} // 經驗藥水倒下不消失
  function cancelHaste(){
    if(!active('haste'))return false;
    delete window.activePotionBuffs.haste;
    window.ClassBuffs?.clearHaste?.();
    sync();
    return true;
  }
  function sync(){
    window.playerMovementModifiers=window.playerMovementModifiers||{};
    for(const key of ['haste','brave','elfBrave','braveX'])window.playerMovementModifiers[key]=active(key);
    bar.hidden=window.gameFlowState!=='playing';bar.replaceChildren();
    if(bar.hidden)return;
    positionBuffs();
    for(let [key,name]of Object.entries(buffNames)){
      if(!active(key))continue;
      const label=document.createElement('span'),image=document.createElement('img'),timer=document.createElement('small');
      image.src=key==='exp'&&window.activePotionBuffs?.expIcon?window.activePotionBuffs.expIcon:(POTION_ICONS[key]||'assets/interface/skills/'+(buffIcons[key]||43)+'.png');image.alt='';image.style.cssText='width:24px;height:24px;display:block;image-rendering:pixelated';
      if(key==='exp')name=name+' '+Math.round((Number(window.activePotionBuffs.expRate)||1)*100)+'%';
      label.title=name;label.setAttribute('aria-label',name);timer.style.cssText='position:absolute;bottom:0;right:1px;font:10px sans-serif;color:white;text-shadow:0 1px 2px black';
      label.style.cssText='position:relative;width:26px;height:26px;background:#162733d9;border:1px solid #8d986480';
      label.dataset.buffDescription=potionDescriptions[key]+' 剩餘約 '+Math.ceil((activePotionBuffs[key]-Date.now())/1000)+' 秒。';
      timer.textContent=Math.ceil((activePotionBuffs[key]-Date.now())/1000);label.append(image,timer);
      bar.append(label);
    }
    const dollBuffs=window.DollEffects?.buffs()||[];
    if(!CharacterActions.dead&&dollBuffs.length){
      const label=document.createElement('span'),image=document.createElement('img');
      label.dataset.effect='doll-buffs';
      label.title='魔法娃娃常駐加成';
      label.dataset.buffDescription=DollEffects.buffDetails().join('\n');
      label.setAttribute('aria-label',label.title);
      label.style.cssText='position:relative;width:26px;height:26px;background:#162733d9;border:1px solid #8d986480';
      const portrait=window.TdjSystems?.dolls.activeImage;
      if(portrait){
        image.src=portrait;image.alt='';
        image.style.cssText='width:100%;height:100%;object-fit:contain;display:block';
        label.append(image);
      }else label.textContent='娃';
      bar.append(label);
    }
    if(!CharacterActions.dead&&window.InnServices?.mpRecoveryActive){
      const label=document.createElement('span'),image=document.createElement('img');
      label.dataset.effect='inn-mp-recovery';
      label.title='旅館魔力回復';
      label.dataset.buffDescription='自然魔力回復速度提高。';
      label.setAttribute('aria-label',label.title);
      label.style.cssText='position:relative;width:26px;height:26px;background:#162733d9;border:1px solid #8d986480';
      image.src='assets/interface/items/etcitem-59.png';
      image.alt='';
      image.style.cssText='width:24px;height:24px;display:block;image-rendering:pixelated';
      label.append(image);bar.append(label);
    }
    for(const effect of window.IslandNpcAi?.negativeEffects||[]){
      const label=document.createElement('span'),image=document.createElement('img'),timer=document.createElement('small'),seconds=Number.isFinite(effect.remainingMs)?Math.ceil(effect.remainingMs/1000):null;
      label.className='negative-buff';label.dataset.effect=effect.id;
      label.dataset.buffName=effect.name;label.dataset.buffDescription=effect.description+(seconds===null?'':'（剩餘約 '+seconds+' 秒）');
      label.title=effect.name+'：'+effect.description+(seconds===null?'':'（剩餘 '+seconds+' 秒）');label.setAttribute('aria-label',label.title);
      label.style.cssText='position:relative;width:26px;height:26px;background:#361622e8;border:1px solid #f36d79;box-shadow:0 0 4px #b3294266';
      image.src=effect.icon;image.alt=effect.name;image.style.cssText='width:24px;height:24px;display:block;image-rendering:pixelated';
      timer.textContent=seconds===null?'':seconds;timer.style.cssText='position:absolute;bottom:0;right:1px;font:bold 10px sans-serif;color:#fff;text-shadow:0 1px 2px #000';
      label.append(image,timer);bar.append(label);
    }
    positionBuffs();
  }
  function use(uid){
    const entry=OwnedInventory.items.find(e=>e.uid===uid),config=entry&&parse(entry.key);
    if(!config)return null;
    if(window.gameFlowState!=='playing'||CharacterActions.dead)return false;
    const {handler,parameters:p,rule}=config;
    if(!canUseForClass(handler,p)){
      if(handler.startsWith('brave.StatusElfBrave'))toast('只有妖精可以使用精靈餅乾。');
      return false;
    }
    if((activeCharacterLevel||1)<rule.minLevel||rule.maxLevel&&(activeCharacterLevel||1)>rule.maxLevel)return false;
    if(window.playerItemState?.decayPotion)return false;
    // 永久古白沿用一般古白的補血冷卻群組與間隔。
    const sharedDelay=entry.key==='etcitem:67001'?ITEM_USE_RULES.definitions['etcitem:40024']:null;
    const cooldown=window.activeCharacterId+'/'+(rule.delayId||sharedDelay?.delayId||entry.key);
    const delayMs=rule.delayMs||sharedDelay?.delayMs||0;
    if(movementTime()<(timers.get(cooldown)||0))return false;
    const next=OwnedInventory.snapshot,buffs={...(window.activePotionBuffs||{})};
    const effect={hp,mp,potionBuffs:buffs};
    let gfx=0,cancelSlow=false;
    if(handler.startsWith('hp.UserAddHp')||handler==='mp.UserAddMp'){
      const min=Number(p[0]),max=Number(p[1]);
      if(!Number.isFinite(min)||!Number.isFinite(max)||min<1||max<min)return false;
      let amount=min+Math.floor(Math.random()*(max-min+1));
      const priceId=Number(p[3])||0,priceCount=Number(p[4])||0;
      if(priceId){
        if(priceCount>0&&!take(next,'etcitem:'+priceId,priceCount))return false;
      }else if(!take(next,entry.key,1))return false;
      gfx=Number(p[2])||0;
      if(handler.startsWith('hp.')){
        const state=window.playerItemState||{};
        amount=Math.floor(amount*(1+(state.healPotionBonusPct||0)/100));
        if(state.pollutedWater)amount>>=1;
        if(state.waterDragonHalf)amount>>=1;
        if(state.waterDragonInvert)amount=-amount;
        effect.hp=Math.max(0,Math.min(maxHp,hp+amount));
      }else effect.mp=Math.min(maxMp,mp+amount);
    }else{
      const priceId=Number(p[3])||0,priceCount=Number(p[4])||0;
      if(priceId){
        if(priceCount>0&&!take(next,'etcitem:'+priceId,priceCount))return false;
      }else if(!take(next,entry.key,1))return false;
      const duration=Number(p[0])||0;
      gfx=Number(p[1])||0;
      const key=handler==='mp.UserMprBlue'?'blue':handler.includes('WisdomPotion')?'wisdom':
        handler.includes('ElfBrave')?'elfBrave':handler.includes('BraveCake')?'braveX':
        handler.includes('Haste')?'haste':handler.includes('Brave')?'brave':null;
      cancelSlow=key==='haste'&&!!window.IslandNpcAi?.slowed;
      if(key&&!cancelSlow)buffs[key]=Date.now()+duration*1000;
    }
    if(!OwnedInventory.applyChange(next,effect))return false;
    timers.set(cooldown,movementTime()+delayMs);
    if(cancelSlow)window.IslandNpcAi?.cureSlow();
    if(handler==='Disintoxicat_Potion'){
      window.IslandNpcAi?.curePoison?.();
      if(window.playerItemState){delete playerItemState.poison;delete playerItemState.poisoned;}
    }
    if(window.playerItemState)window.playerItemState.absoluteBarrier=false;
    if(!hp)window.TransformCards?.onDeath();
    if(gfx)IslandMonsters.playEffect(gfx,worldX,worldY,movementTime(),{follow:'player'});
    sync();return true;
  }
  function durationState(key){const c=parse(key);if(!c||Number(c.parameters[0])<=0||c.rule.minLevel>(window.activeCharacterLevel||1)||c.rule.maxLevel&&c.rule.maxLevel<(window.activeCharacterLevel||1))return null;const h=c.handler;if(!canUseForClass(h,c.parameters))return null;const buff=h==='mp.UserMprBlue'?'blue':h.includes('WisdomPotion')?'wisdom':h.includes('ElfBrave')?'elfBrave':h.includes('BraveCake')?'braveX':h.includes('Haste')?'haste':h.includes('Brave')?'brave':null;if(!buff)return null;return {key:buff,duration:Number(c.parameters[0])*1000,until:Number(window.activePotionBuffs?.[buff])||0};}
  function recoveryBonus(wis,baseWis){
    let amount=active('wisdom')?2:0;
    if(active('blue')){
      amount+=wis<=11?1:Math.trunc((wis-12)/2)+2;
      amount+=baseWis>=45?5:baseWis>=25?Math.trunc((baseWis-15)/10):0;
    }
    return amount;
  }
  function actionMultiplier(action){
    if(!['attack','skill'].includes(action))return 1;
    let factor=active('haste') ? .755 : 1;
    if(action==='attack'){
      if(active('brave'))factor*=.755;
      if(active('elfBrave'))factor*=.855;
      if(active('braveX'))factor*=THIRD_SPEED_DURATION_FACTOR;
    }
    return factor;
  }
  setInterval(sync,500);
  return {clearOnDeath,cancelHaste,use,isHealing,sync,layout:positionBuffs,durationState,recoveryBonus,actionMultiplier,get spBonus(){return active('wisdom')?2:0;}};
})();
window.NativePotions=NativePotions;
