// 本機動作展示；傷害判定、目標與法術特效尚未連接遊戲伺服器。
function flash(){const a=$('.body');a.classList.remove('pulse');void a.offsetWidth;a.classList.add('pulse')}
$('#attack').onclick=()=>{if(window.gameFlowState!=='playing')return;IslandCombat.attack()};
$('#magic').onclick=()=>{if(window.gameFlowState!=='playing')return;if(window.TransformCards&&!TransformCards.canCast)return toast('目前的變身無法施放魔法。');const cost=Math.min(4,maxMp);if(mp<cost)return toast('魔力不足');if(!window.CharacterActions?.play('skill'))return;mp-=cost;stats();window.GameEntry?.saveActive()};
$('#heal').onclick=()=>{if(window.gameFlowState!=='playing')return;return window.OwnedInventory?OwnedInventory.usePotion():toast('背包中沒有回復藥水。')};
