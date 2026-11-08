const QuickSlots=(()=>{
  shortcuts.style.zIndex='20';
  const buttons=[...document.querySelectorAll('.combat-quick-slot')],rows=[];
  for(let row=0;row<3;row++){const group=uiElement('div','quick-expanded-row');group.dataset.quickRow=String(row+1);for(let col=0;col<10;col++){const index=row*10+col,b=buttons[index]||uiElement('button','combat-quick-slot');b.type='button';b.dataset.quickIndex=String(index);if(!buttons[index])buttons.push(b);group.append(b);}rows.push(group);}shortcuts.replaceChildren(...rows);
  const arrow=uiElement('button','quick-expand-arrow','⌃');arrow.type='button';arrow.setAttribute('aria-label','展開第二排快捷欄');shortcuts.append(arrow);
  const extraStyle=document.createElement('style');extraStyle.textContent='main.game.reference-game .quick-slots{display:flex!important;flex-direction:column-reverse!important;align-items:stretch!important;gap:4px!important;overflow:visible!important;height:auto!important}.quick-expanded-row{display:flex;gap:3px;flex:none}.quick-expanded-row[hidden]{display:none!important}.reference-game .quick-slots .quick-expand-arrow{position:absolute!important;left:calc(100% + 4px)!important;bottom:0!important;top:auto!important;width:28px!important;min-width:28px!important;min-height:44px!important;height:44px!important;background:#142730d9;color:#e7e0c7;border:1px solid #9d9976;font-size:22px;padding:0;touch-action:manipulation}.combat-quick-slot.quick-auto-on:after{content:"";position:absolute;inset:2px;border:2px solid #59c5ff;border-radius:6px;box-shadow:0 0 9px 2px #168dff,inset 0 0 8px #168dff;pointer-events:none}.quick-auto-note{position:absolute;left:0;bottom:2px;font-size:7px;color:#91dcff}';document.head.append(extraStyle);
  arrow.onclick=()=>{const before=window.activeQuickRows||1;window.activeQuickRows=before%3+1;if(!GameEntry.saveActive())window.activeQuickRows=before;signature='';render();};
  const catalog=new Map(INTERFACE_CATALOG.items.map(item=>[item.kind+':'+item.id,item]));
  let signature='',drag=null,ghost=null,picking=null,suppressUntil=0;
  function valid(value){
    if(!value||typeof value!=='object')return null;
    if(value.kind==='item'&&catalog.has(value.key))return {kind:'item',key:value.key,...(value.auto&&window.NativePotions?.durationState(value.key)?{auto:true}:{})};
    if(value.kind==='skill'&&Number.isInteger(value.id)&&PlayerSkills.knows(value.id))return {kind:'skill',id:value.id};
    return null;
  }
  function current(){
    if(Array.isArray(window.activeQuickSlots)&&[10,30].includes(activeQuickSlots.length))return Array.from({length:30},(_,i)=>valid(activeQuickSlots[i]));
    const slots=Array(30).fill(null);
    OwnedInventory.skills.ids.slice(0,5).forEach((id,i)=>{slots[i]={kind:'skill',id};});
    const healing=OwnedInventory.healingItems[0];
    if(healing)slots[5]={kind:'item',key:healing.key};
    return slots;
  }
  function label(payload){
    if(payload?.kind==='item')return catalog.get(payload.key)?.name||'道具';
    if(payload?.kind==='skill')return playerSkillData.skills[payload.id]?.name||'技能';
    return '空快捷欄';
  }
  function persist(slots){
    const previous=window.activeQuickSlots;
    window.activeQuickSlots=slots;
    if(!GameEntry.saveActive()){window.activeQuickSlots=previous;return false;}
    signature='';render();return true;
  }
  function assign(index,payload){
    if(window.gameFlowState!=='playing'||index<0||index>=30)return false;
    const next=current();
    if(payload?.kind==='slot'){
      const other=payload.index;
      if(!Number.isInteger(other)||other<0||other>=30)return false;
      [next[index],next[other]]=[next[other],next[index]];
    }else{
      const item=valid(payload);
      if(!item)return false;
      next[index]=item;
    }
    picking=null;
    return persist(next);
  }
  function clear(index){const next=current();next[index]=null;return persist(next);}
  function activate(index){
    if(picking)return assign(index,picking);
    const payload=current()[index];
    if(!payload||window.gameFlowState!=='playing'||CharacterActions.dead)return false;
    if(payload.kind==='item'){
      const entry=OwnedInventory.items.find(e=>e.key===payload.key);
      return entry?OwnedInventory.use(entry.uid):false;
    }
    return PlayerSkills.cast(payload.id);
  }
  function render(){
    const slots=window.gameFlowState==='playing'?current():Array(30).fill(null);
    const amounts=OwnedInventory.items.reduce((map,item)=>{map[item.key]=(map[item.key]||0)+item.count;return map;},{});
    const key=JSON.stringify([window.activeCharacterId,window.gameFlowState,slots,amounts,picking,window.activeQuickRows||1]);
    if(signature===key)return;signature=key;
    const expanded=Math.max(1,Math.min(3,window.activeQuickRows||1));rows.forEach((row,i)=>row.hidden=i>=expanded);arrow.textContent=expanded===3?'⌄':'⌃';arrow.setAttribute('aria-label',expanded===3?'收回第一排快捷欄':'展開第'+(expanded+1)+'排快捷欄');arrow.title='快捷欄 '+expanded+' / 3 排';
    buttons.forEach((button,index)=>{
      const payload=slots[index],name=label(payload);
      button.replaceChildren(uiElement('small','quick-key',index<10?'F'+(index+1):(Math.floor(index/10)+1)+'-'+(index%10+1)));
      button.disabled=false;
      button.classList.toggle('empty-quick-slot',!payload);
      button.style.outline=picking?'2px solid #d6be72':'';
      button.title=name+' · 拖曳交換，向下拉切換自動使用，右鍵清空';button.classList.toggle('quick-auto-on',!!payload?.auto);if(payload?.auto)button.append(uiElement('small','quick-auto-note','AUTO'));
      button.setAttribute('aria-label','F'+(index+1)+' '+name);
      button.setAttribute('aria-disabled',String(!payload&&!picking));
      button.onclick=()=>{if(performance.now()>=suppressUntil)activate(index);};
      if(payload){
        const data=payload.kind==='item'?catalog.get(payload.key):interfaceCatalog.skills.find(s=>s.id===payload.id);
        if(data?.icon){const img=document.createElement('img');img.src=data.icon;img.alt='';img.draggable=false;button.prepend(img);}
        else button.prepend(uiElement('span','',name.slice(0,1)));
        if(payload.kind==='item')button.append(uiElement('b','shortcut-potions',String(amounts[payload.key]||0)));
      }
    });
  }
  function cleanup(){
    if(drag?.timer)clearTimeout(drag.timer);
    drag=null;ghost?.remove();ghost=null;
  }
  function startTouch(){
    if(!drag||drag.owner!==window.activeCharacterId)return cleanup();
    drag.dragging=true;
    ghost=document.createElement('div');ghost.textContent=label(drag.payload.kind==='slot'?current()[drag.payload.index]:drag.payload);
    ghost.style.cssText='position:fixed;z-index:99999;pointer-events:none;padding:8px;background:#10232be8;border:1px solid #d6bd70;color:#fff1cc;font-size:13px;transform:translate(-50%,-140%)';
    document.body.append(ghost);
    ghost.style.left=drag.x+'px';ghost.style.top=drag.y+'px';
  }
  function bindSource(button,payload){
    if(payload.kind==='slot')return bindSlot(button,payload.index);
    if(button.dataset.quickBound)return;
    button.dataset.quickBound='true';button.draggable=true;
    button.style.touchAction='none';
    button.addEventListener('dragstart',event=>{
      event.dataTransfer.setData('application/x-lineage-shortcut',JSON.stringify({...payload,owner:window.activeCharacterId}));
      event.dataTransfer.effectAllowed=payload.kind==='slot'?'move':'copy';
    });
    button.addEventListener('dragend',()=>{suppressUntil=performance.now()+300;});
    button.addEventListener('click',event=>{if(performance.now()<suppressUntil){event.preventDefault();event.stopImmediatePropagation();}},true);
    button.addEventListener('pointerdown',event=>{
      if(!['touch','pen'].includes(event.pointerType))return;
      cleanup();
      drag={pointer:event.pointerId,payload,owner:window.activeCharacterId,x:event.clientX,y:event.clientY,startX:event.clientX,startY:event.clientY,lastY:event.clientY,scrolling:false,dragging:false};
      drag.timer=setTimeout(startTouch,250);
      button.setPointerCapture(event.pointerId);
    },true);
    button.addEventListener('pointermove',event=>{
      if(!drag||drag.pointer!==event.pointerId)return;
      const dx=event.clientX-drag.startX,dy=event.clientY-drag.startY;
      drag.x=event.clientX;drag.y=event.clientY;
      if(!drag.dragging&&(Math.abs(dx)>9||Math.abs(dy)>9)){
        clearTimeout(drag.timer);
        if(!drag.scrolling&&Math.abs(dx)>Math.abs(dy)*1.4)startTouch();
        else drag.scrolling=true;
      }
      if(drag?.dragging){
        event.preventDefault();
        ghost.style.left=drag.x+'px';ghost.style.top=drag.y+'px';
      }else if(drag?.scrolling){
        const scroller=button.closest('.classic-grid-scroll,.classic-window,#panel');
        if(scroller)scroller.scrollTop-=event.clientY-drag.lastY;
        event.preventDefault();
      }
      if(drag)drag.lastY=event.clientY;
    },{passive:false});
    button.addEventListener('pointerup',event=>{
      if(!drag||drag.pointer!==event.pointerId)return;
      if(drag.dragging){
        event.preventDefault();event.stopImmediatePropagation();
        const target=document.elementFromPoint(event.clientX,event.clientY)?.closest('.combat-quick-slot');
        if(target&&drag.owner===window.activeCharacterId)assign(buttons.indexOf(target),drag.payload);
        suppressUntil=performance.now()+500;
      }else if(drag.scrolling)suppressUntil=performance.now()+500;
      cleanup();
    },true);
    button.addEventListener('pointercancel',cleanup);
    button.addEventListener('lostpointercapture',()=>{if(drag?.pointer)cleanup();});
  }

  function toggleAuto(index){const next=current(),p=next[index];if(p?.kind!=='item'||!NativePotions.durationState(p.key)){buttons[index].title='此格沒有可追蹤的持續狀態；補血請使用自動喝水設定。';return false;}next[index]={...p,auto:!p.auto};return persist(next);}
  function bindSlot(button,index){
   if(button.dataset.quickBound)return;button.dataset.quickBound='true';button.draggable=false;button.style.touchAction='none';
   button.addEventListener('pointerdown',event=>{if(event.button!==0)return;cleanup();drag={pointer:event.pointerId,payload:{kind:'slot',index},owner:window.activeCharacterId,x:event.clientX,y:event.clientY,startX:event.clientX,startY:event.clientY,dragging:false,pull:false};button.setPointerCapture(event.pointerId);});
   button.addEventListener('pointermove',event=>{if(!drag||drag.pointer!==event.pointerId)return;const dx=event.clientX-drag.startX,dy=event.clientY-drag.startY;drag.x=event.clientX;drag.y=event.clientY;if(dy>14&&dy>Math.abs(dx)*1.4){drag.pull=true;ghost?.remove();ghost=null;}else if(Math.hypot(dx,dy)>9){drag.pull=false;if(!drag.dragging||!ghost)startTouch();}if(ghost){ghost.style.left=event.clientX+'px';ghost.style.top=event.clientY+'px';}if(drag.pull||drag.dragging)event.preventDefault();},{passive:false});
   button.addEventListener('pointerup',event=>{if(!drag||drag.pointer!==event.pointerId)return;if(drag.pull){toggleAuto(index);suppressUntil=performance.now()+500;event.preventDefault();}else if(drag.dragging){const target=document.elementFromPoint(event.clientX,event.clientY)?.closest('.combat-quick-slot');if(target&&drag.owner===window.activeCharacterId)assign(buttons.indexOf(target),drag.payload);suppressUntil=performance.now()+500;event.preventDefault();}cleanup();});
   button.addEventListener('pointercancel',cleanup);button.addEventListener('lostpointercapture',()=>{if(drag?.pointer===undefined)return;cleanup();});
  }
  let autoBusy=false,lastAttempt=new Map();
  function tickAuto(){if(autoBusy||window.gameFlowState!=='playing'||CharacterActions.dead||OwnedInventory.owner!==window.activeCharacterId)return;autoBusy=true;try{for(const p of current()){if(p?.kind!=='item'||!p.auto)continue;const status=NativePotions.durationState(p.key);if(!status||status.until>Date.now())continue;const key=window.activeCharacterId+'/'+status.key;if(Date.now()-(lastAttempt.get(key)||0)<500)continue;const e=OwnedInventory.items.find(e=>e.key===p.key&&!e.slot);if(!e)continue;lastAttempt.set(key,Date.now());OwnedInventory.use(e.uid);}}finally{autoBusy=false;}}

  buttons.forEach((button,index)=>{
    bindSource(button,{kind:'slot',index});
    button.addEventListener('dragover',event=>{if(event.dataTransfer.types.includes('application/x-lineage-shortcut'))event.preventDefault();});
    button.addEventListener('drop',event=>{
      event.preventDefault();event.stopPropagation();
      try{
        const payload=JSON.parse(event.dataTransfer.getData('application/x-lineage-shortcut'));
        if(payload.owner===window.activeCharacterId)assign(index,payload);
      }catch{}
      suppressUntil=performance.now()+350;
    });
    button.addEventListener('contextmenu',event=>{event.preventDefault();clear(index);});
  });
  const previousPanel=panel;
  panel=function(type){
    previousPanel(type);
    if(type==='settings')document.querySelector('#panelContent').append((()=>{
      const b=uiElement('button','classic-use','重設快捷欄');
      b.onclick=()=>{const old=activeQuickSlots;activeQuickSlots=null;if(!GameEntry.saveActive())activeQuickSlots=old;signature='';render();};
      return b;
    })());
  };
  setInterval(tickAuto,200);
  setInterval(()=>{if(drag&&drag.owner!==window.activeCharacterId)cleanup();render();},500);
  render();
  return {render,bindSource,assign,clear,activate,toggleAuto,tickAuto,pick(payload){picking=valid(payload);signature='';render();}};
})();
window.QuickSlots=QuickSlots;

