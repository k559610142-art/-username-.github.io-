// 離線隔離測試；不讀寫玩家存檔、不呼叫雲端。
const fs = require('fs'), path = require('path'), vm = require('vm'), assert = require('assert/strict');
const root = path.resolve(__dirname, '..');
const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
const sandbox = { console, TextEncoder, TextDecoder, btoa, atob, setTimeout: () => 0, clearTimeout() {}, setInterval: () => 0, clearInterval() {},
    localStorage: { getItem: () => null, setItem() { throw Error('測試不准寫入存檔'); }, removeItem() { throw Error('測試不准刪除存檔'); } },
    document: { addEventListener() {}, getElementById: () => null, querySelector: () => null, documentElement: { style: {} } },
    window: { addEventListener() {}, innerWidth: 400, innerHeight: 800 }, navigator: {},
    fetch() { throw Error('測試不准連線'); }, Image: function () {} };
const ctx = vm.createContext(sandbox);
for (const [, p] of html.matchAll(/<script src="(data\/[^"?]+\.js)\?v=/g)) {
    if (p === 'data/main.js' || p === 'data/pwa.js') continue;
    vm.runInContext(fs.readFileSync(path.join(root, p), 'utf8'), ctx, { filename: p });
}


ctx.assert = assert;
vm.runInContext(String.raw`
SIM_MODE=false; lootMode='legacy';
saveGame=()=>{}; refreshUI=()=>{}; showToast=()=>{}; closeDialog=()=>{}; sfx=()=>{}; sfxHit=()=>{};
let dialog='', confirmFn=null; openDialog=(title,html)=>{dialog=html;}; gameConfirm=(title,text,fn)=>{confirmFn=fn;};
function setup(cls='spirit') {
 createPlayer('傭兵測試','knight',CLASSES.knight.base); player.lv=30; player.gold=1000000;
 mercPanelOpen=false; mercHire(cls); assert(confirmFn); const fn=confirmFn; fn(); const m=player.mercenary;
 assert(m); assert(renderMercenary().includes('C級傭兵')); fn(); assert.equal(player.mercenary,m); assert.equal(player.gold,900000); assert.equal(m.lv,1); assert(m.skills.every(x=>!x));
 const beforeHire=player.gold;mercHire('war');assert.equal(player.mercenary,m);assert.equal(player.gold,beforeHire);
 m.active=true; return m;
}
assert.equal(MERC_HIRE_COST,100000);
for(const [lv,id] of [[1,'c'],[29,'c'],[30,'b'],[40,'b'],[41,'a'],[50,'a'],[51,'s'],[60,'s'],[61,'ss'],[70,'ss'],[71,'sss'],[80,'sss'],[81,'legend'],[99,'legend']]) {
 assert.equal(mercRank({lv}).id,id); assert(mercNameHtml({cls:'spirit',lv}).includes('merc-grade-'+id));
}
assert.equal(Object.keys(MERC_CLASSES).length,6); assert.equal(Object.keys(MERC_RUNES).length,50);
assert.equal(Object.keys(ITEMS).filter(id=>id.startsWith('mercRune_')).length,50);
for(const cls of Object.keys(MERC_CLASSES)) { const m=setup(cls); assert(m.hp>0&&m.mp>0); assert(renderMercenary().includes('四格技能')); }
let m=setup(); const uid=addItem('longSword').uid, gold=player.gold;
mercEquip(uid,'weapon'); assert(!findInv(uid)); assert.equal(m.equip.weapon.uid,uid); mercUnequip('weapon'); assert(findInv(uid));
// 不受玩家／傭兵職業與武器種類限制；雙手武器和盾牌仍互斥。
for(const [id,d] of Object.entries(ITEMS).filter(([,d])=>d.cat==='weapon')) { const it=addItem(id);mercEquip(it.uid,'weapon');assert.equal(m.equip.weapon.uid,it.uid);mercUnequip('weapon'); }
assert.equal(MERC_SLOTS.length,8);
for(const slot of ['amulet','ring1','ring2','belt']) {
 const id=Object.keys(ITEMS).find(id=>ITEMS[id].cat==='armor'&&ITEMS[id].slot===(slot.startsWith('ring')?'ring':slot));
 const it=addItem(id);mercEquip(it.uid,slot);assert(findInv(it.uid));assert(!m.equip[slot]);
 it.ench=3;it.q='rare';it.af=[];it.il=40;it.sellLocked=true;removeInst(it.uid);m.equip[slot]=it;
}
const gearBefore=Object.values(m.equip).map(it=>JSON.stringify(it)), playerSlotsBefore=JSON.stringify(player.equip);
const statsWithoutRetired=mercStats(m);const migrated=guardWrap(migrateSave({schema:18,player:JSON.parse(JSON.stringify(player))}));
assert.equal(Object.keys(migrated.mercenary.equip).length,0);assert.equal(JSON.stringify(migrated.equip),playerSlotsBefore);
for(const raw of gearBefore) {const it=JSON.parse(raw);assert.equal(JSON.stringify(migrated.inv.find(x=>x.uid===it.uid)),raw);}
const repeat=migrateSave({schema:18,player:migrated});for(const raw of gearBefore){const uid=JSON.parse(raw).uid;assert.equal(repeat.inv.filter(x=>x.uid===uid).length,1);}
assert.equal(JSON.stringify(mercStats(m)),JSON.stringify(statsWithoutRetired));
player=migrated;m=player.mercenary;const html=renderMercenary();for(const slot of ['amulet','ring1','ring2','belt']) assert(!html.includes('mercPickEquip(\''+slot+'\')'));
assert.equal(SLOT_KEYS.length,12);
const locked=addItem('longSword');locked.sellLocked=true;mercEquip(locked.uid,'weapon');assert(findInv(locked.uid));
for(const id of Object.keys(MERC_RUNES)) {
 const before=countItem('mercRune_'+id); addItem('mercRune_'+id); assert.equal(countItem('mercRune_'+id),before+1);
 mercSetRune(0,id);assert.equal(m.skills[0],id);assert.equal(countItem('mercRune_'+id),before);
 mercSetRune(0,'');assert.equal(countItem('mercRune_'+id),before+1);
}
mercSetRune(0,'wolf');mercSetRune(1,'wolf');assert.equal(m.skills[1],'');
mercSetRune(0,'heavy');assert.equal(countItem('mercRune_wolf'),1);assert.equal(m.skills[0],'heavy');
const old=JSON.parse(JSON.stringify(player));delete old.mercenary;assert.equal(migrateSave({schema:17,player:old}).mercenary,null);
const encoded=saveEncode(JSON.stringify({schema:SAVE_SCHEMA,player}));const restored=migrateSave(saveParse(encoded));assert.equal(restored.mercenary.skills[0],'heavy');assert.equal(restored.mercenary.cls,'spirit');
// 50符石逐一實際執行；每次施放只扣一次MP並有冷卻。
for(const id of Object.keys(MERC_RUNES)) {
 m=setup(); m.lv=20;const st=mercStats(m);m.hp=Math.floor(st.hp*.3);m.mp=Math.floor(st.mp*.3);player.hp=1;player.mp=0;
 player.buffs.bad={negative:true,until:gameNow+10000};m.skills=[id,'','',''];gameNow+=100000;
 const mon={hp:100000,maxHp:100000,ac:0,mr:10,boss:false,stunUntil:0,dmg:[30,30],name:'測試怪'};
 hunt={state:'fight',mon,mobs:[mon]};player.hunting=true;
 mercState(m).buffs.bad={negative:true,power:1,until:gameNow+10000};
 if(id==='balance')m.hp=st.hp;
 const before=m.mp;assert(mercCast(id,mon),id+'未施放');if (!['manaSelf','convert'].includes(MERC_RUNES[id].kind)) assert.equal(m.mp,before-MERC_RUNES[id].mp,id+'扣魔');assert(!mercCast(id,mon),id+'無冷卻');
 gameNow+=1000;mercTick(1000);assert(Number.isFinite(m.hp)&&Number.isFinite(m.mp));
}
// 真實戰鬥hook、傭兵死亡與不可恢復的損失，不刪玩家背包或娃娃。
m=setup('war'); const weapon=addItem('longSword'); mercEquip(weapon.uid,'weapon'); addItem('mercRune_heavy');mercSetRune(0,'heavy');
const held=addItem('mercRune_heal',2);m.lv=8;m.exp=37;const invBefore=JSON.stringify(player.inv), dollBefore=player.equip.doll;
chance=()=>false; assert.equal(mercTakeDamage(0),0);mercTakeDamage(100000);assert(m.dead);assert(!m.active);assert.deepEqual(Object.keys(m.equip),[]);assert(m.skills.every(x=>!x));assert.equal(m.lv,8);assert.equal(JSON.stringify(player.inv),invBefore);assert.equal(player.equip.doll,dollBefore);
const beforeRevive=player.gold;mercRevive();confirmFn();assert(!m.dead);assert.equal(m.lv,8);assert.equal(player.gold,beforeRevive-8000);confirmFn();assert.equal(player.gold,beforeRevive-8000);
// 野外不可收回／換裝／拆符石；缺錢不買；SIM不參戰或取得經驗。
player.loc={type:'zone',id:'island'};const was=m.active;mercToggle();assert.equal(m.active,was);const n=held.n;mercSetRune(0,'heal');assert.equal(held.n,n);
player.loc={type:'town',id:'talking'};player.gold=0;assert.equal(typeof mercBuyRune,'undefined');assert.equal(countItem('mercRune_wolf'),0);assert(!renderMercenary().includes('符石補給'));assert(!renderMercenary().includes('>購買</button>'));for(const id of Object.keys(MERC_RUNES))assert(!shopItemIds().includes('mercRune_'+id));
m.active=true;SIM_MODE=true;assert.equal(mercActive(),null);const ex=m.exp;mercGainExp(9999);assert.equal(m.exp,ex);SIM_MODE=false;
mercGainExp(99999);assert(m.lv>8&&m.lv<=player.lv);
// 跟隨位置與原娃娃獨立，瞬移後回合法格；真實Canvas介面可繪製。
scene={pl:{x:10,y:10,rx:10,ry:10},doll:{sentinel:true}};freeTileFor=()=>true;inHuntZone=()=>true;findPath=()=>[[10,10]];
sceneMercTick(100);assert(scene.mercenary);assert(scene.doll.sentinel);scene.mercenary.rx=100;sceneMercTick(100);assert(Math.abs(scene.mercenary.rx-10)<=1);
const paint=new Proxy({}, {get:(o,k)=>o[k]||(k==='createLinearGradient'?(()=>({addColorStop(){}})):(()=>{})),set:(o,k,v)=>(o[k]=v,true)});for(const lv of [1,30,41,51,61,71,81]){m.lv=lv;sceneDrawMerc(paint,0,0);assert(renderMercenary().includes(mercRank(m).name));assert(mercCardHtml().includes('merc-grade-'+mercRank(m).id));}
// 四村9設施都有位置且可走到；事件不能引用player。
for(const [id,key] of [['talking','village'],['gludio','ash'],['giran','darkgold'],['aden','aden']]) {const bg=SCENE_ART_BGS[key];assert.equal(bg.npcs.length,9);assert(bg.npcs.some(n=>n.role==='傭兵團長'));}
player.loc={type:'town',id:'talking'};openMercenary();assert(dialog.includes('四格技能符石'));for(const x of dialog.matchAll(/onclick="([^"]+)"/g)){assert(!x[1].includes('player'));new Function(x[1]);}
// 正式huntTick由傭兵擊殺，沿原reapMobs入帳且只結算一次。
m=setup('war');player.loc={type:'zone',id:'island'};player.hunting=true;scene=null;
lootRequired=()=>false;diaRoll=()=>{};rollDrops=()=>{};questOnKill=()=>{};mapOnKill=()=>false;
const target={id:'mercTest',name:'傭兵目標',hp:1,maxHp:1,ac:0,mr:0,dmg:[1,1],gold:[1,1],exp:100,spd:1000,atkCd:9999,stunUntil:0};
hunt={state:'fight',mon:target,mobs:[target],pCd:99999,joinCd:99999,warned:{},potCd:0};session={kills:0,exp:0,gold:0,start:gameNow};
const kills=player.kills;huntTick(100);assert.equal(player.kills,kills+1);assert.equal(session.kills,1);assert(m.exp>0);assert(target.hp<=0);
console.log('PASS：6職業／50符石實際施放、自由武器、拆回與替換、防重覆確認、冷卻扣魔、舊檔／加密存讀、死亡裝備技能永久消失、復活保級、缺錢／離村／SIM隔離、跟隨標記／娃娃獨立、四村與UI事件。');
`,ctx);
