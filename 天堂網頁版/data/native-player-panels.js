// Restore complete local UI artwork, with live controls above the original image.
(()=>{
 const style=document.createElement('style');style.textContent=`
 .reference-game .equipment-window .equipment-sheet.native-equipment-sheet{display:block;aspect-ratio:183/408;padding:0;border:0;background:url('assets/interface/player-panels/equipment.webp') center/100% 100% no-repeat;min-height:0;width:min(100%,max(180px,calc((100dvh - 320px)*183/408)));margin:0 auto}
 .reference-game .native-equipment-sheet:before{display:none}
 .reference-game .native-equipment-sheet .equipment-slot{position:absolute;width:19.2%;height:8.6%;min-height:0!important;aspect-ratio:auto;padding:1px;background:#17242ab8;border:1px solid #8b846a;box-sizing:border-box}
 .reference-game .native-equipment-sheet .equipment-slot img{width:100%;height:100%;max-height:100%;object-fit:contain}
 .reference-game .native-equipment-sheet .slot-symbol{font-size:10px;color:#d5c8a3}
 .reference-game .native-attribute-sheet{position:relative;width:100%;aspect-ratio:396/825;background:url('assets/interface/player-panels/status.png') center/100% 100% no-repeat;color:#e9d7aa;font-size:12px}
 .native-attribute-value{position:absolute;transform:translate(-50%,-50%);font-weight:bold;font-size:15px}
 .native-attribute-sheet .native-detail-row{position:absolute;display:flex;justify-content:space-between;align-items:center;width:35%;height:2.7%;font-size:10px;color:#e9dcc0}
 .native-attribute-footer{position:absolute;left:9%;right:9%;top:73%;font-size:12px;line-height:1.8;color:#e9dcc0}
 .reference-game .status-window.native-player-status{border-image-source:url('assets/interface/frame.webp')}
 `;document.head.append(style);
 const equipment=renderEquipmentPane;renderEquipmentPane=function(){const pane=equipment(),sheet=pane.querySelector('.equipment-sheet');sheet.classList.add('native-equipment-sheet');const positions=[[18,57],[75,48],[130,57],[18,112],[75,112],[130,112],[18,167],[75,160],[130,167],[18,222],[75,213],[130,222],[18,274],[75,290],[130,274]];[...sheet.children].forEach((button,i)=>{const [x,y]=positions[i];button.style.left=x/183*100+'%';button.style.top=y/408*100+'%'});return pane};
 const status=renderStatusPane;renderStatusPane=function(){const pane=status(),profile=PlayerClassStats.read(),sheet=uiElement('div','native-attribute-sheet');pane.classList.add('native-player-status');sheet.setAttribute('aria-label','角色能力');const keys=['str','dex','con','int','wis','cha'];keys.forEach((key,i)=>{const value=uiElement('span','native-attribute-value',String(profile.attributes[key]??'—'));value.style.left=(i<3?145:359)/396*100+'%';value.style.top=[83,107,132][i%3]/825*100+'%';sheet.append(value)});
 const defense=window.NativeCombatRules?.defense()||{},rows=[
 [['近距傷害',profile.meleeBonus],['武器小型',profile.weapon?.damage?.[0]??0],['武器大型',profile.weapon?.damage?.[1]??0],['防禦 AC',previewArmorClass()],['等級',profile.level]],
 [['遠距傷害',profile.rangedBonus],['生命上限',maxHp],['魔力上限',maxMp],['魔法防禦',defense.mr||0],['裝備件數',OwnedInventory.items.filter(e=>e.slot).length]],
 [['自然回血',profile.hpRecoveryText],['基礎生命',window.activeVitalGrowth?.maxHp??maxHp],['裝備生命',window.NativeCombatRules?.vitals().gearHp||0]],
 [['自然回魔',profile.mpRecoveryText],['基礎魔力',window.activeVitalGrowth?.maxMp??maxMp],['裝備魔力',window.NativeCombatRules?.vitals().gearMp||0]],
 [['體質',profile.attributes.con],['初始體質',playerAttributes.con]],
 [['魅力',profile.attributes.cha],['初始精神',playerAttributes.wis]]];
 rows.forEach((group,i)=>group.forEach(([label,value],j)=>{const row=uiElement('div','native-detail-row');row.style.left=(i%2?236:49)/396*100+'%';row.style.top=(200+Math.floor(i/2)*126+j*25)/825*100+'%';row.append(uiElement('span','',label),uiElement('strong','',String(value)));sheet.append(row)}));const footer=uiElement('div','native-attribute-footer');footer.append(uiElement('strong','',window.activeCharacterName||job),uiElement('div','',job+' · Lv. '+profile.level),statusVital('hp','生命　'+hp+' / '+maxHp),statusVital('mp','魔力　'+mp+' / '+maxMp));sheet.append(footer);pane.querySelector('.classic-stats-grid')?.remove();pane.querySelector('.classic-window-header').after(sheet);return pane};
})();
