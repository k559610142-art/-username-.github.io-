// 本機動作展示；傷害判定、目標與法術特效尚未連接遊戲伺服器。
function flash(){const a=$('.body');a.classList.remove('pulse');void a.offsetWidth;a.classList.add('pulse')}
$('#attack').onclick=()=>{if(window.gameFlowState!=='playing')return;if(!window.CharacterActions?.play('attack'))return toast('請等目前動作結束；倒地時請先恢復站立。');window.TdjSystems?.onAttack();toast('播放目前武器攻擊動作','journal')};
$('#magic').onclick=()=>{if(window.gameFlowState!=='playing')return;if(window.TransformCards&&!TransformCards.canCast)return toast('目前的變身無法施放魔法。');const cost=Math.min(4,maxMp);if(mp<cost)return toast('魔力不足');if(!window.CharacterActions?.play('skill'))return toast('請等目前動作結束；倒地時請先恢復站立。');mp-=cost;stats();window.GameEntry?.saveActive();toast('播放施法動作 · 消耗 '+cost+' MP','journal')};
$('#heal').onclick=()=>{if(window.gameFlowState!=='playing')return;return window.OwnedInventory?OwnedInventory.usePotion():toast('背包中沒有回復藥水。')};
