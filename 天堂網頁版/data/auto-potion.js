// Automatic healing uses the same item-use transaction, restrictions and timers as manual use.
const AutoPotion=(()=>{
 const HEAL_ORDER=['first','second','magic'];
 let owner='',state,dialog=null,busy=false,lastSignature='';
 const button=uiElement('button','auto-potion-hud');button.type='button';button.setAttribute('aria-label','設定自動喝水');button.onclick=()=>open();game.append(button);
 const style=document.createElement('style');style.textContent='.auto-potion-hud{position:absolute;z-index:12;display:flex;align-items:center;justify-content:center;width:54px;height:54px;background:#122029c9;color:#fff;border:1px solid #b6a576;border-radius:4px;padding:4px;pointer-events:auto}.auto-potion-hud img{max-width:40px;max-height:40px;object-fit:contain}.auto-potion-hud svg{width:30px;height:30px;fill:none;stroke:#eee;stroke-width:1.7}.auto-potion-hud[aria-pressed=true]{border-color:#e3c65d;box-shadow:0 0 5px #e3c65d88}.auto-potion-hud small{position:absolute;bottom:0;right:2px;color:#f4dfa4;font-size:11px;text-shadow:0 1px 2px #000}.auto-potion-hud b{position:absolute;top:0;right:2px;font:11px sans-serif;text-shadow:0 1px 2px #000}.auto-potion-hud.empty img{opacity:.45}.auto-potion-window{position:absolute;top:12%;left:20%;z-index:50;width:min(360px,calc(100% - 16px));max-height:75%;overflow:auto;box-sizing:border-box;padding:14px;background:#102635f5;border:2px solid #9b9371;color:#e9dbaf;pointer-events:auto}.auto-potion-window h2{font-size:22px;margin:0 46px 12px 0}.auto-potion-window button{min-height:42px;background:#253b37;border:1px solid #7c918d;color:#eee2c4;padding:6px 12px}.auto-potion-close{position:absolute;top:8px;right:8px}.auto-potion-enable{display:flex;align-items:center;gap:8px;margin:12px 0}.auto-potion-enable input{width:22px;height:22px}.auto-potion-percent{display:flex;gap:8px;align-items:center;margin:12px 0;flex-wrap:wrap}.auto-potion-percent input[type=number]{width:65px;min-height:38px;background:#172a38;color:#fff;border:1px solid #899987;padding:4px}.auto-potion-percent input[type=range]{width:100%}.auto-potion-options{display:grid;gap:6px;max-height:30dvh;overflow:auto}.auto-potion-option{display:flex;gap:8px;align-items:center;text-align:left}.auto-potion-option img{width:32px;height:32px;object-fit:contain}.auto-potion-option[aria-pressed=true]{border-color:#e5ca78;background:#4b512b}.auto-potion-note{font-size:12px;line-height:1.6;color:#bacbc7}.auto-potion-status{font-size:12px;color:#eac577;min-height:18px}';style.textContent+='.healing-priority{display:grid;gap:6px}.healing-priority-card{padding:8px;border:1px solid #776347;border-radius:6px;background:#101315}.healing-priority-line{display:flex;gap:7px;flex-wrap:wrap;align-items:center}.healing-priority-line select{flex:1 1 120px;min-width:0}.healing-priority-line input[type=number]{width:3.6em;color:#f4e5c5;background:#1b1c1f;border:1px solid #776347;padding:3px}.healing-priority-icon{display:grid;place-items:center;width:28px;height:28px}.healing-priority-icon img{max-width:28px;max-height:28px}.healing-priority-line+.healing-priority-line{margin-top:6px;font-size:.9em}.healing-rank{min-width:32px;min-height:28px!important;padding:2px 5px!important}.healing-rank[aria-pressed=true]{background:#725922!important;color:#fff0c7!important;border:1px solid #d9b46a!important}';document.head.append(style);
 const catalog=new Map(INTERFACE_CATALOG.items.map(i=>[i.kind+':'+i.id,i]));let lastHomeAttempt=0;
 function healingSkill(id){const s=playerSkillData.skills[id];return !!s&&PlayerSkills.supports(id)&&/治癒|恢復|體力回復|生命的祝福/.test(s.name);}
 const pct=(v,base)=>Number.isInteger(v)?Math.max(1,Math.min(99,v)):base;
 function slot(v,min=0,max=50){
  const threshold=Number.isInteger(v?.threshold)?Math.max(0,Math.min(99,v.threshold)):max;
  return {key:typeof v?.key==='string'&&catalog.has(v.key)&&NativePotions.isHealing(v.key)?v.key:null,
   minHp:Math.min(threshold,Number.isInteger(v?.minHp)?Math.max(0,v.minHp):min),threshold,enabled:v?.enabled===true};
 }
 function validate(v){
  const first=slot(v),second=slot(v?.second,36,80);
  const settings=v?.magic??(v?.skillId?{...v,key:null}:null);
  const magic=slot(settings,0,first.threshold);
  magic.skillId=Number.isInteger(settings?.skillId)&&healingSkill(settings.skillId)?settings.skillId:null;
  if(!first.key&&magic.skillId)first.enabled=false;
  const order=[...new Set(Array.isArray(v?.order)?v.order.filter(key=>HEAL_ORDER.includes(key)):[])];
  for(const key of HEAL_ORDER)if(!order.includes(key))order.push(key);
  return {...first,second,magic,order,homeEnabled:v?.homeEnabled===true,homeThreshold:pct(v?.homeThreshold,20)};
 }
 function activate(v){owner=window.activeCharacterId||'';state=validate(v);close();lastSignature='';lastHomeAttempt=0;sync();}
 function count(){return OwnedInventory.owner===owner?OwnedInventory.items.filter(e=>e.key===state.key&&!e.slot).reduce((n,e)=>n+e.count,0):0;}
 function homes(){return OwnedInventory.owner===owner?OwnedInventory.items.filter(e=>!e.slot&&ITEM_USE_RULES.definitions[e.key]?.handler==='teleport.GoHome_Reel'):[];}
 function position(){const hpBar=document.querySelector('.hud .bar'),g=game.getBoundingClientRect(),b=hpBar?.getBoundingClientRect();if(!b)return;button.style.left=Math.max(4,Math.min(g.width-58,b.right-g.left+10))+'px';button.style.top=Math.max(4,b.top-g.top-12)+'px';}
 new ResizeObserver(position).observe(game);new ResizeObserver(position).observe(document.querySelector('.hud'));
 function sync(){button.hidden=window.gameFlowState!=='playing';if(button.hidden)return;const n=count(),signature=[owner,state.key,state.skillId,state.enabled,state.threshold,state.homeEnabled,state.homeThreshold,n,mp].join('|');if(signature===lastSignature)return;lastSignature=signature;const skill=state.skillId?playerSkillData.skills[state.skillId]:null,item=skill?interfaceCatalog.skills.find(s=>s.id===state.skillId)||skill:catalog.get(state.key);button.replaceChildren();if(item)button.append(itemIcon(item));else button.innerHTML='<svg viewBox="0 0 32 32" aria-hidden="true"><path d="M13 3h6m-5 0v7L8 21a7 7 0 0 0 13 5 7 7 0 0 0 3-5L18 10V3M11 18h11"/></svg>';button.append(uiElement('small','',state.threshold+'%'));if(item)button.append(uiElement('b','',skill?'MP '+(window.PlayerAbilityRules?.manaCost(skill)??skill.mp):String(n)));button.title='自動補血：'+(item?item.name:'未選擇')+' · HP ≤ '+state.threshold+'% · '+(state.enabled?'開啟':'關閉')+(state.homeEnabled?'；HP ≤ '+state.homeThreshold+'% 自動回家':'');button.setAttribute('aria-label',button.title);button.setAttribute('aria-pressed',String(state.enabled));button.classList.toggle('empty',skill?mp<(window.PlayerAbilityRules?.manaCost(skill)??skill.mp):!n);position();}
 function configure(next,replace=false){if(window.gameFlowState!=='playing'||owner!==window.activeCharacterId)return false;const old=state;state=validate(replace?next:{...state,...next});if(state.enabled&&!state.key||state.second.enabled&&!state.second.key||state.magic.enabled&&!state.magic.skillId){state=old;return false;}if(!GameEntry.saveActive()){state=old;return false;}lastSignature='';sync();return true;}
 function tick(){sync();if(busy||owner!==window.activeCharacterId||OwnedInventory.owner!==owner||window.gameFlowState!=='playing'||CharacterActions.dead||hp<=0||!maxHp)return false;busy=true;try{
  if(state.homeEnabled&&!window.AssistSystem?.escapeFirst&&hp*100<=maxHp*state.homeThreshold&&(tile(worldX,worldY)&48)!==16&&Date.now()-lastHomeAttempt>=1000){const map=TeleportMapRules[window.activeMapId||0],scroll=homes()[0];if(scroll&&map?.escapable&&map?.usableItem){lastHomeAttempt=Date.now();if(TeleportScrolls.use(scroll.uid))return true;}}
  if(hp>=maxHp)return false;
  const percent=Math.ceil(hp*100/maxHp);
  for(const key of state.order){
   const setting=key==='first'?state:state[key];
   if(!setting.enabled||percent<setting.minHp||percent>setting.threshold)continue;
   if(key==='magic'){
    if(PlayerSkills.knows(setting.skillId)&&PlayerSkills.cast(setting.skillId))return true;
   }else{
    const entry=OwnedInventory.items.find(e=>e.key===setting.key&&!e.slot);
    if(entry&&OwnedInventory.use(entry.uid))return true;
   }
  }
  return false;
 }finally{busy=false;sync();}}
 function close(){dialog?.remove();dialog=null;}
 function healingControls(){
  const group=uiElement('div','healing-priority'),owned=OwnedInventory.healingItems;
  const refreshers=[];
  for(const [key,label] of [['first','補血藥水一'],['second','補血藥水二'],['magic','治療魔法']]){
   const magic=key==='magic',settings=()=>key==='first'?state:state[key];
   const card=uiElement('div','healing-priority-card'),top=uiElement('div','healing-priority-line'),range=uiElement('div','healing-priority-line');
   const priority=uiElement('div','healing-priority-line'),rankButtons=[];
   const check=uiElement('input'),icon=uiElement('span','healing-priority-icon'),select=uiElement('select');
   const min=uiElement('input'),max=uiElement('input');
   check.type='checkbox';check.setAttribute('aria-label','啟用'+label);
   select.setAttribute('aria-label',label);select.append(new Option(magic?'選擇治療魔法':'選擇補血藥水',''));
   if(magic){
    for(const id of PlayerSkills.availableIds().filter(healingSkill)){
     const skill=playerSkillData.skills[id];
     select.append(new Option(skill.name+' · MP '+(window.PlayerAbilityRules?.manaCost(skill)??skill.mp),String(id)));
    }
   }else{
    const keys=new Set(owned.map(e=>e.key));if(settings().key)keys.add(settings().key);
    for(const itemKey of keys){
     const item=catalog.get(itemKey);
     if(item)select.append(new Option(item.name+' ×'+owned.filter(e=>e.key===itemKey).reduce((sum,e)=>sum+e.count,0),itemKey));
    }
   }
   for(const [input,limit] of [[min,'最低'],[max,'最高']]){
    input.type='number';input.min='0';input.max='99';input.step='1';input.setAttribute('aria-label',label+' HP '+limit+'百分比');
   }
   function syncControls(){
    const setting=settings();
    check.checked=setting.enabled;min.value=setting.minHp;max.value=setting.threshold;
    select.value=magic?String(setting.skillId??''):setting.key||'';
    const item=magic?interfaceCatalog.skills.find(s=>s.id===setting.skillId):catalog.get(setting.key);
    icon.replaceChildren(...(item?[itemIcon(item)]:[]));
    rankButtons.forEach((button,index)=>button.setAttribute('aria-pressed',String(state.order[index]===key)));
   }
   function commit(){
    const lo=min.valueAsNumber,hi=max.valueAsNumber,value=select.value;
    const patch={key:magic?null:value||null,skillId:magic&&value?Number(value):null,minHp:lo,threshold:hi,enabled:check.checked};
    if(!Number.isInteger(lo)||!Number.isInteger(hi)||lo<0||hi>99||lo>hi)toast('請設定有效的 HP 區間（0～99%）。');
    else if(check.checked&&!value)toast(magic?'請先選擇治療魔法。':'請先選擇補血藥水。');
    else if(!configure(key==='first'?patch:{[key]:patch}))toast('補血設定未儲存。');
    syncControls();
   }
   priority.append(uiElement('span','','優先順序'));
   for(const index of [0,1,2]){
    const button=uiElement('button','healing-rank',String(index+1));button.type='button';
    button.setAttribute('aria-label',label+' 優先順序 '+(index+1));
    button.onclick=()=>{
     const order=[...state.order],previous=order.indexOf(key);
     [order[index],order[previous]]=[order[previous],order[index]];
     if(!configure({order}))toast('優先順序未儲存。');
     refreshers.forEach(sync=>sync());
    };
    rankButtons.push(button);priority.append(button);
   }
   check.onchange=select.onchange=min.onchange=max.onchange=commit;
   top.append(check,icon,uiElement('strong','',label),select);
   range.append(uiElement('span','','HP 使用區間'),min,uiElement('span','','% ～'),max,uiElement('span','','%'));
   card.append(top,range,priority);group.append(card);refreshers.push(syncControls);syncControls();
  }
  group.append(uiElement('p','auto-potion-note','符合 HP 區間時依 1、2、3 嘗試補血。調整名次時，兩項會互換。'));
  return group;
 }
 function open(){if(window.gameFlowState!=='playing')return false;if(dialog){dialog.style.zIndex=String(FloatingWindows.frontLevel());return true;}dialog=uiElement('section','auto-potion-window');dialog.setAttribute('role','dialog');dialog.setAttribute('aria-label','自動補血與回家設定');dialog.style.zIndex=String(FloatingWindows.frontLevel());const closeButton=uiElement('button','auto-potion-close','×');closeButton.type='button';closeButton.setAttribute('aria-label','關閉自動喝水設定');closeButton.onclick=close;const title=uiElement('h2','','自動喝水'),message=uiElement('p','auto-potion-status');
  function switcher(label,field){const row=uiElement('label','auto-potion-enable'),check=uiElement('input');check.type='checkbox';check.checked=state[field];check.setAttribute('aria-label',label);check.onchange=()=>{if(!configure({[field]:check.checked})){check.checked=state[field];message.textContent=state.key||state.skillId?'儲存失敗，設定未變更。':'請先選擇補血道具或技能。';}else message.textContent='設定已儲存。';};row.append(check,document.createTextNode(label));return row;}
  function percentage(field,label){const row=uiElement('label','auto-potion-percent'),number=uiElement('input'),range=uiElement('input');number.type='number';range.type='range';for(const input of [number,range]){input.min='1';input.max='99';input.step='1';input.value=String(state[field]);}number.setAttribute('aria-label',label);range.setAttribute('aria-label','調整'+label);function save(input){const n=Number(input.value);if(!Number.isInteger(n)||n<1||n>99||!configure({[field]:n})){number.value=range.value=String(state[field]);message.textContent='請設定 1～99％，並確認存檔可用。';return;}number.value=range.value=String(n);message.textContent='設定已儲存。';}number.onchange=()=>save(number);range.onchange=()=>save(range);range.oninput=()=>number.value=range.value;row.append(document.createTextNode('HP 低於或等於'),number,document.createTextNode('％'),range);return row;}
  dialog.append(closeButton,title,healingControls(),uiElement('h3','','自動回家'),switcher('啟用 HP 過低自動回家','homeEnabled'),percentage('homeThreshold','自動回家 HP 百分比門檻'),uiElement('p','auto-potion-note','持有回家卷軸 '+homes().reduce((n,e)=>n+e.count,0)+' 張。達到回家門檻優先使用卷軸；村莊內不會重複回家。'),uiElement('p','auto-potion-note','沿用道具及技能原本效果、冷卻與使用條件；人物死亡時停止。'),message);dialog.addEventListener('pointerdown',e=>{e.stopPropagation();dialog.style.zIndex=String(FloatingWindows.frontLevel());});game.append(dialog);return true;
 }
 state=validate();
 setInterval(tick,100);
 return {activate,configure,tick,sync,open,close,healingControls,get snapshot(){return {...state,second:{...state.second},magic:{...state.magic},order:[...state.order]};}};
})();window.AutoPotion=AutoPotion;
