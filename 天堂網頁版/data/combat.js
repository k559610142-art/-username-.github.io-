// 本機動作展示；傷害判定、目標與法術特效尚未連接遊戲伺服器。
function flash(){const a=$('.body');a.classList.remove('pulse');void a.offsetWidth;a.classList.add('pulse')}
$('#attack').onclick=()=>{if(window.gameFlowState!=='playing')return;IslandCombat.attack()};
$('#magic').onclick=()=>{if(window.gameFlowState==='playing')panel('magic')};
$('#heal').onclick=()=>{if(window.gameFlowState!=='playing')return;return window.OwnedInventory?OwnedInventory.usePotion():toast('背包中沒有回復藥水。')};
