// m25專屬圖：實際卷軸使用、等級門檻、戰鬥動作、到期與圖集；隔離存檔／網路。
const fs=require('fs'),path=require('path'),vm=require('vm'),assert=require('assert/strict');
const root=path.resolve(__dirname,'..');
const ctx=vm.createContext({console,assert,Image:function(){},setTimeout:()=>0,clearTimeout(){},setInterval:()=>0,clearInterval(){},
 localStorage:{getItem:()=>null,setItem(){throw Error('不准寫存檔');},removeItem(){throw Error('不准刪存檔');}},
 document:{addEventListener(){},getElementById:()=>null,querySelector:()=>null,documentElement:{style:{}}},window:{addEventListener(){},innerWidth:1280,innerHeight:720},navigator:{},fetch(){throw Error('不准連線');}});
for(const[,file]of fs.readFileSync(path.join(root,'index.html'),'utf8').matchAll(/<script src="(data\/[^"?]+\.js)\?v=/g)){
 if(file==='data/main.js'||file==='data/pwa.js')continue;
 vm.runInContext(fs.readFileSync(path.join(root,file),'utf8'),ctx,{filename:file});
}
vm.runInContext(String.raw`
SIM_MODE=true;createPlayer('血狼測試','knight',CLASSES.knight.base);player.lv=15;unequipSlot('weapon');
player.loc={type:'zone',id:'island'};buildScene();
const fxBefore=JSON.stringify(MORPH_BY_ID.m25.fx);
addItem('polyScroll',2);const scrolls=countItem('polyScroll');
player.lv=14;assert.match(usePotion('polyScroll','m25'),/15/);assert.equal(countItem('polyScroll'),scrolls);player.lv=15;unequipSlot('weapon');
assert.equal(MORPH_BY_ID.m25.group,'claw');assert.equal(MORPH_BY_ID.m25.lv,15);
assert.equal(MORPH_BY_ID.m25.fx.hit,2);assert.equal(MORPH_BY_ID.m25.fx.dmg,2);assert(Math.abs(MORPH_BY_ID.m25.fx.spdMul-.06)<1e-9);assert.equal(MORPH_BY_ID.m25.fx.crit,.01);assert.equal(MORPH_BY_ID.m25.fx.lifesteal,.01);
assert.equal(MORPH_BY_ID.m10.sprite,'brudikaShadow');
assert.equal(morphWeaponErr(MORPH_BY_ID.m25),'');
unequipSlot('weapon');
assert.equal(usePotion('polyScroll','m25'),'');assert.equal(countItem('polyScroll'),scrolls-1);
assert.equal(player.buffs.morph.form,'m25');assert.equal(player.settings.lastMorph,'m25');
assert.equal(playerSprite(),MORPHS.wildBloodWolf);assert.equal(playerMorph().name,'荒野血狼狂戰');
assert.equal(MORPH_FORMS.length,32);
const m={x:scene.pl.x+1,y:scene.pl.y,rx:scene.pl.x+1,ry:scene.pl.y,mid:'skeleton',lastHp:100,inst:{hp:90,maxHp:100}};
scene.mons=[m];scene.engaged=m;gameLog.length=0;
for(const dir of ['down','right','up','left']){
 scene.pl.dir=dir;scene.pl.anim=null;m.lastHp=100;m.inst.hp=90;scene.lastPlayerHp=player.hp;
 sceneReadEvents();assert.equal(scene.pl.anim.name,'attack');assert.equal(scene.pl.anim.dur,560);
 scene.pl.anim.t=210;playAnim('hit');assert.equal(scene.pl.anim.name,'attack');assert.equal(scene.pl.anim.t,210);
}
scene.pl.anim=null;m.lastHp=m.inst.hp;gameLog.push({seq:999999,cls:'miss',msg:'你的攻擊沒有命中'});scene.lastSeq=0;
sceneReadEvents();assert.equal(scene.pl.anim.name,'attack');
gameLog.push({seq:1000000,cls:'magic',msg:'🔮 施放測試魔法'});sceneReadEvents();
assert.equal(scene.pl.anim.name,'cast');assert.equal(scene.pl.anim.dur,440);
scene.pl.anim=null;scene.lastPlayerHp=player.hp+1;sceneReadEvents();
assert.equal(scene.pl.anim.name,'hit');assert.equal(scene.pl.anim.dur,300);
player.buffs.morph.until=gameNow;assert.equal(playerMorph(),null);
assert.equal(usePotion('polyScroll'),'');assert.equal(player.buffs.morph.form,'m25');
assert.equal(countItem('polyScroll'),scrolls-2);assert.equal(JSON.stringify(MORPH_BY_ID.m25.fx),fxBefore);
for(const[id,key]of[['m01','wolfRanger'],['m02','moonRanger'],['m03','hellfireArcher'],['m04','skyValkyrie'],['m05','dwarfGunner']])assert.equal(MORPH_BY_ID[id].sprite,key);
player.buffs.morph.form='m14';assert.equal(playerMorph(),MORPHS.wolfRanger);
console.log('PASS：卷軸扣量／上次選擇、m25專屬外觀、四向命中／MISS／施法／受傷、到期與其他變身回歸。');
`,ctx);
const dir=path.join(root,'images/sprites/morph/wild-blood-wolf-v1');
const manifest=JSON.parse(fs.readFileSync(path.join(dir,'manifest.json'),'utf8'));
assert.deepEqual(manifest.footAnchor,[192,270]);
for(const[a,n]of[['walk',4],['attack',4],['cast',2],['hit',2]]){
 const src=manifest.actions[a].src,png=fs.readFileSync(path.join(root,src));
 assert.equal(png.readUInt32BE(16),384*n);assert.equal(png.readUInt32BE(20),960);assert.equal(png[25],6);
 assert(fs.readFileSync(path.join(root,'sw.js'),'utf8').includes(src));
 assert.equal(manifest.actions[a].cells.length,n*3);
}
console.log('PASS：四張RGBA圖集、36格來源及離線預載。');

module.exports=ctx;
