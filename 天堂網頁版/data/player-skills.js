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
    if(!healing&&mob?.spawn.bot&&!window.FakePlayers?.canAttack(mob))return false;
    const range=skill.range>0?skill.range:10;
    if(!healing&&(!mob?.hp||Math.max(Math.abs(mob.x-worldX),Math.abs(mob.y-worldY))>range||
      !IslandCombat.clearShot(worldX,worldY,mob.x,mob.y)))return false;
    const result=PlayerAbilityRules.magicAmount(skill,mob,{healing});
    const amount=result.amount;
    if(!OwnedInventory.castCost(skill,healing?Math.min(maxHp,hp-skill.hp+amount):undefined))return false;
    if(!CharacterActions.play('skill'))return false;
    window.ClassBuffs?.reveal();
    cooldowns.set(id,now+skill.reuse);
    IslandMonsters.playEffect(skill.gfx,healing?worldX:mob.x,healing?worldY:mob.y,now);
    if(!healing){
      if(result.critical)mob.magicCriticalUntil=now+650;
      mob.allyTarget=null;if(amount>0)IslandMonsters.damage(mob,amount);
      if(id>=181)window.ClassBuffs?.afterCast(id,mob);
      if(id===87){if(PlayerAbilityRules.statusHits({...skill,id},mob))mob.ready=Math.max(mob.ready||0,now+skill.duration*1000);else mob.rangedMissUntil=now+650;}
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
    if(job==='妖精'&&learned().element){ // 2026-11-17：已選屬性 → 顯示目前屬性與「解除精靈力」（兩段式確認，避免誤按）
      const box=uiElement('div','elf-element-box');box.append(uiElement('span','','精靈屬性：'+learned().element+' '));
      const cost=OwnedInventory.elfResetCost(),btn=uiElement('button','','解除精靈力（'+cost.toLocaleString()+' 天幣）');btn.type='button';
      let armed=false;btn.onclick=()=>{if(!armed){armed=true;btn.textContent='確定解除？已學的屬性魔法會遺忘';return;}if(OwnedInventory.resetElfElement(false))panel('magic');};box.append(btn);
      if(OwnedInventory.hasMemoryCandle()){const c=uiElement('button','','用回憶蠟燭解除');c.type='button';let a2=false;c.onclick=()=>{if(!a2){a2=true;c.textContent='確定用回憶蠟燭解除？';return;}if(OwnedInventory.resetElfElement(true))panel('magic');};box.append(c);}
      document.querySelector('#panelContent .magic-window')?.append(box,uiElement('small','','解除後回到純真狀態，可重新選擇屬性；已學的屬性魔法會一併遺忘。天幣費用每解除一次加倍。'));
    }
    if(job==='妖精'&&!learned().element){
      const label=uiElement('label','','精靈屬性 ');
      const select=uiElement('select','');
      for(const [value,text] of [['','請選擇'],['地','地'],['風','風'],['水','水'],['火','火']]){
        const option=document.createElement('option');option.value=value;option.textContent=text;select.append(option);
      }
      select.disabled=(window.activeCharacterLevel||1)<30;
      select.onchange=()=>{if(!select.value)return;const ok=document.createElement('button');ok.type='button';ok.textContent='確定選擇「'+select.value+'」';ok.onclick=()=>{if(OwnedInventory.setElfElement(select.value))panel('magic');};label.querySelector('button')?.remove();label.append(ok);};
      label.append(select);
      document.querySelector('#panelContent .magic-window')?.append(label,uiElement('small','','30 級可選擇精靈屬性。'));
    }
  };
  syncQuickSlots();
  return {validate,knows,isBook,learn,supports,cast,syncQuickSlots};
})();
window.PlayerSkills=PlayerSkills;
