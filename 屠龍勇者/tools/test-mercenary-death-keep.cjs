// 六職死亡、死亡存讀／候補名冊與復活保留裝備符石；隔離網路及玩家存檔。
const fs=require('fs'),path=require('path'),vm=require('vm'),assert=require('assert/strict');
const prefix=fs.readFileSync(path.join(__dirname,'test-mercenary.js'),'utf8').split('ctx.assert = assert;')[0];
const ctx=new Function('require','__dirname',prefix+'\nreturn ctx;')(require,__dirname);ctx.assert=assert;
vm.runInContext(`
SIM_MODE=false;saveGame=()=>{};refreshUI=()=>{};cloudMarkDirty=()=>{};sfx=()=>{};chance=()=>false;let confirmFn=null;gameConfirm=(t,h,f)=>{confirmFn=f};
assert.equal(SAVE_SCHEMA,25);assert.equal(GAME_VERSION,'20261102d');
for(const cls of Object.keys(MERC_CLASSES)){
 createPlayer('傭兵死亡保留測試','knight',CLASSES.knight.base);player.lv=30;player.gold=100000;player.loc={type:'town',id:'talking'};scene=null;
 let m=player.mercenary={cls,lv:12,exp:77,hp:1,mp:0,dead:false,active:false,equip:{},skills:['','','',''],cds:{}};
 for(const slot of MERC_SLOTS){const id=slot==='weapon'?'longSword':Object.keys(ITEMS).find(id=>ITEMS[id].cat==='armor'&&ITEMS[id].slot===slot);assert(id);const it=addItem(id);mercEquip(it.uid,slot);assert(m.equip[slot]);}
 for(const[i,id]of Object.keys(MERC_RUNES).slice(0,4).entries()){addItem('mercRune_'+id);mercSetRune(i,id);assert.equal(m.skills[i],id);}
 const gear=JSON.stringify(m.equip),skills=JSON.stringify(m.skills),inv=JSON.stringify(player.inv);m.active=true;m.hp=mercStats(m).hp;m.mp=mercStats(m).mp;
 mercTakeDamage(1000000);assert(m.dead);assert(!m.active);assert.equal(m.hp,0);assert.equal(m.mp,0);assert.equal(mercActive(),null);assert.equal(JSON.stringify(m.equip),gear);assert.equal(JSON.stringify(m.skills),skills);assert.equal(JSON.stringify(player.inv),inv);
 mercDie();mercNormalize(player);assert.equal(JSON.stringify(m.equip),gear);assert.equal(JSON.stringify(m.skills),skills);
 applySaveData(saveParse(saveEncode(JSON.stringify({schema:SAVE_SCHEMA,player}))));m=player.mercenary;assert(m.dead);assert.equal(JSON.stringify(m.equip),gear);assert.equal(JSON.stringify(m.skills),skills);
 player.mercReserve.push(m);player.mercenary=null;mercNormalize(player);applySaveData(saveParse(saveEncode(JSON.stringify({schema:SAVE_SCHEMA,player}))));assert(player.mercReserve[0].dead);assert.equal(JSON.stringify(player.mercReserve[0].equip),gear);assert.equal(JSON.stringify(player.mercReserve[0].skills),skills);
 mercSelect(0);m=player.mercenary;assert(m.dead);player.gold=11999;mercRevive();confirmFn();assert(m.dead);assert.equal(player.gold,11999);assert.equal(JSON.stringify(m.equip),gear);
 player.gold=100000;mercRevive();const revive=confirmFn;revive();revive();assert(!m.dead);assert(!m.active);assert.equal(m.lv,12);assert.equal(m.exp,77);assert.equal(player.gold,88000);assert.equal(m.hp,mercStats(m).hp);assert.equal(m.mp,mercStats(m).mp);assert.equal(JSON.stringify(m.equip),gear);assert.equal(JSON.stringify(m.skills),skills);assert.equal(JSON.stringify(player.inv),inv);
 assert(renderMercenary().includes('死亡保留身上全部裝備與已配置符石'));assert(!renderMercenary().includes('永久失去'));
}
console.log('PASS：六職全裝備／四符石致死與重複死亡、死亡正規化、加密存讀及候補轉換不流失；復活保級經驗／滿HPMP／不重扣／缺錢拒絕，背包不增加副本。');
`,ctx);
