Game.state={player:Game.createPlayer(),enemy:null,log:[]};
Game.render();
Game.initVillage();
const menu=document.getElementById('game-menu');
const actions={
  stop:()=>Game.stopWalking?.(),
  rest:()=>{Game.stopWalking?.();const p=Game.state.player;p.hp=Math.min(p.maxHp,p.hp+30);p.mp=Math.min(30,p.mp+12);Game.render();},
  save:()=>Game.save(),load:()=>{Game.stopWalking?.();Game.load();Game.render();}
};
menu.querySelectorAll('[data-action]').forEach(button=>button.onclick=()=>{actions[button.dataset.action]();menu.hidden=true;});
document.addEventListener('pointerdown',e=>{if(!menu.contains(e.target))menu.hidden=true;});
document.getElementById('npc-close').onclick=()=>document.getElementById('npc-dialog').close();
document.getElementById('npc-dialog').addEventListener('click',e=>{if(e.target===e.currentTarget){const r=e.currentTarget.getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)e.currentTarget.close();}});
