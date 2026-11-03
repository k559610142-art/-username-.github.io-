Game.toast = function (text) {
  const el=document.getElementById('game-toast');
  el.textContent=text;el.classList.add('visible');
  clearTimeout(this.toastTimer);this.toastTimer=setTimeout(()=>el.classList.remove('visible'),2200);
};
Game.message = function (text) {
  this.state.log.unshift(text);this.state.log.length=Math.min(30,this.state.log.length);this.toast(text);
};
Game.render = function () {
  const p=this.state.player;
  document.getElementById('player-level').textContent=`Lv.${p.level}`;
  document.getElementById('player-gold').textContent=`${p.gold} 銀兩`;
  for(const [key,value,max]of [['hp',p.hp,p.maxHp],['mp',p.mp,30]]){
    document.getElementById(key+'-fill').style.width=`${Math.max(0,Math.min(100,value/max*100))}%`;
    document.getElementById(key+'-label').textContent=`${value} / ${max}`;
    const meter=document.querySelector('.meter.'+key);meter.setAttribute('aria-valuenow',value);meter.setAttribute('aria-valuemax',max);
  }
};
