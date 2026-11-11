const PlayerSkills = (() => {
  const {skills,books}=playerSkillData;
  const learned=()=>OwnedInventory.owner===window.activeCharacterId?OwnedInventory.skills:{ids:[],element:''};
  const errors=message=>{document.querySelector('#log').textContent=message;return false;};
  let signature='',owner='',cooldowns=new Map();
  function validate(state){
    if(state===undefined)return null;
    if(!state||!Array.isArray(state.ids)||state.ids.some(id=>!Number.isInteger(id)||!skills[id])||
      new Set(state.ids).size!==state.ids.length||!['','地','風','水','火'].includes(state.element))return '技能存檔資料有誤。';
    return null;
  }
  function knows(id){return learned().ids.includes(id);}
  function isBook(key){return !!books[key.split(':')[1]];}
  function learn(uid){
    const item=OwnedInventory.items.find(e=>e.uid===uid);
    const book=item&&books[item.item.id];
    if(!book||window.gameFlowState!=='playing'||CharacterActions.dead)return false;
    const minimum=book.min[job];
    if(minimum===undefined)return errors('目前職業無法學習這項技能。');
    if((window.activeCharacterLevel||1)<minimum)return errors('學習「'+skills[book.skill].name+'」需要 '+minimum+' 級。');
    if(knows(book.skill))return errors('已經學會這項技能。');
    if(book.element&&learned().element!==book.element)return errors('需要選擇'+book.element+'屬性才能學習。');
    if(characterMovementBlocked()||movementAnimating())return false;
    const ok=OwnedInventory.learnSkill(uid,book.skill);
    if(ok){signature='';syncQuickSlots();}
    return ok;
  }
  function supports(id){
    const skill=skills[id];
    // Support／debuff／passive skills of every class go to data/class-buffs.js (ClassBuffs). Here: direct damage and healing;
    // for 龍騎士／幻術師／戰士 (id ≥ 181) the DB damage field of buffs is a power value, so only target 'attack' counts.
    if(window.ClassBuffs?.handles(id))return !!skill;
    if(id>=181)return !!skill&&skill.target==='attack'&&skill.damage.some(Boolean);
    return !!skill&&(skill.damage.some(Boolean)||id===87);
  }
  function cast(id){
    const skill=skills[id];
    if(skill&&knows(id)&&!supports(id))return errors('「'+skill.name+'」的效果尚未實作。');
    if(skill&&window.ClassBuffs?.handles(id))return ClassBuffs.cast(id);
    if(!skill||!knows(id)||!supports(id)||CharacterActions.dead||window.gameFlowState!=='playing'||
      characterMovementBlocked()||movementAnimating()||!TransformCards.canCast)return false;
    const now=movementTime();
    if(owner!==window.activeCharacterId){owner=window.activeCharacterId;cooldowns.clear();}
    if(now<(cooldowns.get(id)||0))return false;
    const healing=/治癒|恢復/.test(skill.name);
    const mob=IslandMonsters.target;
    const range=skill.range>0?skill.range:10;
    if(!healing&&(!mob?.hp||Math.max(Math.abs(mob.x-worldX),Math.abs(mob.y-worldY))>range||
      !IslandCombat.clearShot(worldX,worldY,mob.x,mob.y)))return false;
    let amount=skill.damage[0];
    for(let i=0;i<skill.damage[2];i++)amount+=1+Math.floor(Math.random()*Math.max(1,skill.damage[1]));
    if(!OwnedInventory.castCost(skill,healing?Math.min(maxHp,hp-skill.hp+amount):undefined))return false;
    if(!CharacterActions.play('skill'))return false;
    cooldowns.set(id,now+skill.reuse);
    IslandMonsters.playEffect(skill.gfx,healing?worldX:mob.x,healing?worldY:mob.y,now);
    if(!healing){
      IslandMonsters.damage(mob,Math.max(id===87?0:1,amount));
      if(id>=181)window.ClassBuffs?.afterCast(id,mob);
      if(id===87)mob.ready=Math.max(mob.ready||0,now+skill.duration*1000);
    }
    return true;
  }
  function syncQuickSlots(){
    if(window.QuickSlots)return QuickSlots.render();
    const active=window.gameFlowState==='playing';
    const ids=active?learned().ids:[];
    const key=[window.activeCharacterId,active,...ids].join('|');
    if(signature===key)return;
    signature=key;
    const slots=[...document.querySelectorAll('.skill-quick-group .combat-quick-slot')];
    slots.forEach((button,index)=>{
      const skill=skills[ids[index]],iconData=interfaceCatalog.skills.find(s=>s.id===skill?.id);
      button.replaceChildren(uiElement('small','quick-key','F'+(index+1)));
      button.classList.toggle('empty-quick-slot',!skill);
      button.disabled=!skill;
      button.title=skill?.name||'空技能快捷欄';
      button.setAttribute('aria-label',button.title);
      button.onclick=skill?()=>{if(supports(skill.id))cast(skill.id);else panel('magic');}:null;
      if(skill&&iconData?.icon){const image=document.createElement('img');image.src=iconData.icon;image.alt='';button.prepend(image);}
    });
  }
  const previousPanel=panel;
  panel=function(type){
    previousPanel(type);
    if(type!=='magic')return;
    if(!learned().ids.length){
      const grid=document.querySelector('.magic-grid');
      grid?.append(uiElement('p','','尚未學習技能。'));
    }
    if(job==='妖精'&&!learned().element){
      const label=uiElement('label','','精靈屬性 ');
      const select=uiElement('select','');
      for(const [value,text] of [['','請選擇'],['地','地'],['風','風'],['水','水'],['火','火']]){
        const option=document.createElement('option');option.value=value;option.textContent=text;select.append(option);
      }
      select.disabled=(window.activeCharacterLevel||1)<30;
      select.onchange=()=>{if(OwnedInventory.setElfElement(select.value))panel('magic');};
      label.append(select);
      document.querySelector('#panelContent .magic-window')?.append(label,uiElement('small','','30 級可選擇精靈屬性。'));
    }
  };
  syncQuickSlots();
  return {validate,knows,isBook,learn,supports,cast,syncQuickSlots};
})();
window.PlayerSkills=PlayerSkills;
