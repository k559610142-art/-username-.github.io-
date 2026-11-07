const quickSettingsPanel=panel;
panel=function(type){
 quickSettingsPanel(type);if(type!=='settings')return;
 const label=document.createElement('label'),input=document.createElement('input'),value=document.createElement('span');
 label.textContent='掛機索敵範圍 ';input.type='range';input.min='12';input.max='48';input.step='1';input.value=IslandCombat.autoRange;
 value.textContent=IslandCombat.autoRange+' 格';input.oninput=()=>{IslandCombat.setAutoRange(Number(input.value));value.textContent=IslandCombat.autoRange+' 格';};
 label.append(input,value);document.querySelector('#panelContent').append(label);
};
