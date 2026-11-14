// Native potion handlers carry their amount, effect and class parameters in classname.
const NativePotions=(()=>{
  const timers=new Map();
  const buffIcons={haste:43,brave:52,elfBrave:150,braveX:54,blue:32,wisdom:26};
  const buffNames={haste:'加速',brave:'勇敢',elfBrave:'精靈餅乾',braveX:'三段加速',blue:'魔力回復',wisdom:'慎重',exp:'經驗加成'};
  // 原版職業位元：王族 1、騎士 2、妖精 4、法師 8、黑妖 16、龍騎士 32、幻術師 64、戰士 128（例：綠水 255＝全職業、勇水 130＝騎士＋戰士、生命之樹果實 96＝龍騎士＋幻術師）
  const flags={'王族':1,'騎士':2,'妖精':4,'法師':8,'黑暗妖精':16,'龍騎士':32,'幻術師':64,'戰士':128};
  const bar=document.createElement('div');
  bar.className='native-potion-buffs';
  bar.style.cssText='position:absolute;left:var(--ui-left,12px);top:calc(var(--ui-top,12px) + 60px);z-index:3;display:flex;gap:4px;max-width:260px;flex-wrap:wrap;pointer-events:none';
  game.append(bar);
  function positionBuffs(){
    // 2026-11-14：狀態圖示（藥水＋技能 class-buff-bar）排在左上「輔助」鈕右邊同一排，往右到小地圖前，不再壓到頭像框的防禦／魔防
    const assist=document.querySelector('.assist-hud');
    if(assist&&!assist.hidden&&assist.offsetWidth){
      const g=game.getBoundingClientRect(),a=assist.getBoundingClientRect(),mini=document.querySelector('.minimap-button')?.getBoundingClientRect();
      const left=a.right-g.left+8,top=a.top-g.top+6,max=Math.max(60,(mini&&mini.width?mini.left-g.left:g.width)-left-8);
      bar.style.left=left+'px';bar.style.top=top+'px';bar.style.maxWidth=max+'px';
      const cb=document.querySelector('.class-buff-bar');
      if(cb){const used=bar.hidden||!bar.children.length?0:bar.getBoundingClientRect().width+6;cb.style.setProperty('left',(left+used)+'px','important');cb.style.setProperty('top',top+'px','important');cb.style.setProperty('max-width',Math.max(60,max-used)+'px','important');}
      return;
    }
    const mana=document.querySelector('.hud .bar.mana');if(!mana)return;
    const g=game.getBoundingClientRect(),m=mana.getBoundingClientRect(),left=m.left-g.left+2;
    bar.style.left=left+'px';bar.style.top=(m.bottom-g.top+8)+'px';bar.style.maxWidth=Math.max(28,Math.min(260,g.width-left-8))+'px';
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
  function clearOnDeath(){const b=window.activePotionBuffs||{};window.activePotionBuffs=Number(b.exp)>Date.now()?{exp:b.exp,expRate:b.expRate,expIcon:b.expIcon}:{};timers.clear();sync();} // 經驗藥水倒下不消失
  function sync(){
    window.playerMovementModifiers=window.playerMovementModifiers||{};
    for(const key of ['haste','brave','elfBrave','braveX'])window.playerMovementModifiers[key]=active(key);
    bar.hidden=window.gameFlowState!=='playing';bar.replaceChildren();
    if(bar.hidden)return;
    positionBuffs();
    for(let [key,name]of Object.entries(buffNames)){
      if(!active(key))continue;
      const label=document.createElement('span'),image=document.createElement('img'),timer=document.createElement('small');
      image.src=key==='exp'&&window.activePotionBuffs?.expIcon?window.activePotionBuffs.expIcon:'assets/interface/skills/'+(buffIcons[key]||43)+'.png';image.alt='';image.style.cssText='width:24px;height:24px;display:block;image-rendering:pixelated';
      if(key==='exp')name=name+' '+Math.round((Number(window.activePotionBuffs.expRate)||1)*100)+'%';
      label.title=name;label.setAttribute('aria-label',name);timer.style.cssText='position:absolute;bottom:0;right:1px;font:10px sans-serif;color:white;text-shadow:0 1px 2px black';
      label.style.cssText='position:relative;width:26px;height:26px;background:#162733d9;border:1px solid #8d986480';
      timer.textContent=Math.ceil((activePotionBuffs[key]-Date.now())/1000);label.append(image,timer);
      bar.append(label);
    }
  }
  function use(uid){
    const entry=OwnedInventory.items.find(e=>e.uid===uid),config=entry&&parse(entry.key);
    if(!config)return null;
    if(window.gameFlowState!=='playing'||CharacterActions.dead)return false;
    const {handler,parameters:p,rule}=config;
    if((activeCharacterLevel||1)<rule.minLevel||rule.maxLevel&&(activeCharacterLevel||1)>rule.maxLevel)return false;
    if(window.playerItemState?.decayPotion)return false;
    const cooldown=window.activeCharacterId+'/'+(rule.delayId||entry.key);
    if(movementTime()<(timers.get(cooldown)||0))return false;
    const next=OwnedInventory.snapshot,buffs={...(window.activePotionBuffs||{})};
    const effect={hp,mp,potionBuffs:buffs};
    let gfx=0;
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
      if(handler.startsWith('brave.')){
        const allowed=Number(p[2]);
        if(!Number.isInteger(allowed)||!(allowed&flags[job]))return false;
      }
      const priceId=Number(p[3])||0,priceCount=Number(p[4])||0;
      if(priceId){
        if(priceCount>0&&!take(next,'etcitem:'+priceId,priceCount))return false;
      }else if(!take(next,entry.key,1))return false;
      const duration=Number(p[0])||0;
      gfx=Number(p[1])||0;
      const key=handler==='mp.UserMprBlue'?'blue':handler.includes('WisdomPotion')?'wisdom':
        handler.includes('ElfBrave')?'elfBrave':handler.includes('BraveCake')?'braveX':
        handler.includes('Haste')?'haste':handler.includes('Brave')?'brave':null;
      if(key)buffs[key]=Date.now()+duration*1000;
    }
    if(!OwnedInventory.applyChange(next,effect))return false;
    timers.set(cooldown,movementTime()+(rule.delayMs||0));
    if(handler==='Disintoxicat_Potion'){
      window.IslandNpcAi?.curePoison?.();
      if(window.playerItemState){delete playerItemState.poison;delete playerItemState.poisoned;}
    }
    if(window.playerItemState)window.playerItemState.absoluteBarrier=false;
    if(!hp)window.TransformCards?.onDeath();
    if(gfx)IslandMonsters.playEffect(gfx,worldX,worldY,movementTime());
    sync();return true;
  }
  function durationState(key){const c=parse(key);if(!c||Number(c.parameters[0])<=0||c.rule.minLevel>(window.activeCharacterLevel||1)||c.rule.maxLevel&&c.rule.maxLevel<(window.activeCharacterLevel||1))return null;const h=c.handler;if(h.startsWith('brave.')&&!(Number(c.parameters[2])&flags[job]))return null;const buff=h==='mp.UserMprBlue'?'blue':h.includes('WisdomPotion')?'wisdom':h.includes('ElfBrave')?'elfBrave':h.includes('BraveCake')?'braveX':h.includes('Haste')?'haste':h.includes('Brave')?'brave':null;if(!buff)return null;return {key:buff,duration:Number(c.parameters[0])*1000,until:Number(window.activePotionBuffs?.[buff])||0};}
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
      if(active('braveX'))factor*=.755;
    }
    return factor;
  }
  setInterval(sync,500);
  return {clearOnDeath,use,isHealing,sync,durationState,recoveryBonus,actionMultiplier,get spBonus(){return active('wisdom')?2:0;}};
})();
window.NativePotions=NativePotions;
