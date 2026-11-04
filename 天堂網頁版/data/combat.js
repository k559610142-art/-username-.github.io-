// 本機攻擊、技能與藥水示範；尚未連接遊戲伺服器。
function flash(){const a=$('.body');a.classList.remove('pulse');void a.offsetWidth;a.classList.add('pulse')}
$('#attack').onclick=()=>{flash();toast('揮擊動作示意 · 尚未連接戰鬥系統')};$('#magic').onclick=()=>{const skillCost=Math.min(4,maxMp);if(mp<skillCost)return toast('魔力不足，請到設定重置展示');mp-=skillCost;stats();flash();toast('技能按鈕示範 · 消耗 '+skillCost+' MP')};$('#heal').onclick=()=>{if(!potions)return toast('示範藥水已用完');if(hp===maxHp)return toast('生命值已滿');potions--;hp=Math.min(maxHp,hp+25);stats();toast('使用示範藥水 · 恢復生命值')};
