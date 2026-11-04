// 角色狀態；創角的生命／魔力上限由原伺服器規則套用。
let hp=78,mp=64,potions=10,job='騎士',maxHp=100,maxMp=100;
function stats(){const h=Math.max(0,Math.min(100,hp/Math.max(1,maxHp)*100)),m=Math.max(0,Math.min(100,mp/Math.max(1,maxMp)*100));$('#hp').style.width=h+'%';$('#mp').style.width=m+'%';$('#hpText').textContent='HP '+hp+' / '+maxHp;$('#mpText').textContent='MP '+mp+' / '+maxMp;$('#potions').textContent=potions}