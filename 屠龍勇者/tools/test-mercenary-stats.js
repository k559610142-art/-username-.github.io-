// 傭兵基礎／裝備／增益與實際傷害；隔離正式角色及連線。
const fs=require('fs'),path=require('path'),vm=require('vm'),assert=require('assert/strict');
const prefix=fs.readFileSync(path.join(__dirname,'test-mercenary.js'),'utf8').split('ctx.assert = assert;')[0];
const ctx=new Function('require','__dirname',prefix+'\nreturn ctx;')(require,__dirname);ctx.assert=assert;
vm.runInContext(`
SIM_MODE=false;createPlayer('能力隔離','knight',CLASSES.knight.base);player.loc={type:'zone',id:'island'};scene=null;
const m=player.mercenary={cls:'spirit',lv:49,hp:900,mp:500,active:true,dead:false,equip:{},skills:['wolf','might','',''],cds:{}};
let st=mercStats(m);assert.equal(st.atk,18);assert.equal(st.magic,27);assert.equal(st.def,5);assert.equal(st.mr,19);assert.equal(st.hp,974);assert.equal(st.mp,514);
for(const cls of Object.keys(MERC_CLASSES))for(const lv of [1,30,49,70,99]){m.cls=cls;m.lv=lv;const s=mercStats(m);assert(s.atk<50&&s.magic<50&&s.def<20&&s.mr<40);assert.equal(s.atk,s.base.atk);assert.equal(s.magic,s.base.magic);}
m.cls='spirit';m.lv=49;
const sword=addItem('longSword',1,6);m.equip.weapon=sword;st=mercStats(m);assert.equal(st.atk,18+(ITEMS.longSword.dmg[0]+ITEMS.longSword.dmg[1])/2+6);
const wand=addItem('iceQueenStaff',1,6);m.equip.weapon=wand;st=mercStats(m);assert.equal(st.magic,27+15+6);assert.equal(st.gear.magic,21);
const cap=addItem('leatherCap',1,4);m.equip.helm=cap;assert.equal(mercStats(m).def,5+ITEMS.leatherCap.ac+4);
mercState(m).buffs.might={until:gameNow+10000,power:11};mercState(m).buffs.iron={until:gameNow+10000,power:7};st=mercStats(m);assert.equal(st.buffs.atk,11);assert.equal(st.def,st.base.def+st.gear.def+7);assert(mercStatsHtml(st).includes('基礎'));assert(mercStatsHtml(st).includes('裝備'));
const mon={hp:10000,mr:0,ac:0};const magic=st.magic;assert.equal(mercHit(mon,magic,true),magic);assert.equal(mon.hp,10000-magic);
delete m.equip.weapon;mercRuntime.delete(m);assert.equal(mercStats(m).magic,27);assert.equal(mercStats(m).atk,18);
`,ctx);
// 狀態只在底部顯示，地圖不能殘留文字黑塊。
const runtime=path.join(process.env.USERPROFILE,'.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules');
const {createCanvas}=require(path.join(runtime,'@napi-rs/canvas')),c=createCanvas(300,180),g=c.getContext('2d'),icon=createCanvas(16,16);ctx.paint=g;ctx.icon=icon;ctx.labels=[];
const original=g.fillText;g.fillText=function(text,...args){ctx.labels.push({text,color:this.fillStyle});return original.call(this,text,...args);};
vm.runInContext(`spriteImage=()=>icon;scene={mons:[]};mercState(m).buffs.might={until:gameNow+10000,power:11};sceneDrawMercEffects(paint,0,0,m,{rx:3,ry:2});assert(!labels.some(x=>x.text.includes('力量祝福')));mercState(m).summons.push({id:'wolf',until:gameNow+17000,at:gameNow,power:1});mercState(m).buffs.shield={until:gameNow+5000,power:42};let hud=mercHudHtml();assert(hud.includes('merc-hud-icon'));assert(hud.includes('靈狼 17秒'));assert(hud.includes('力量祝福'));assert(hud.includes('盾42'));assert(!hud.includes('10秒'));m.active=false;assert.equal(mercHudHtml(),'');m.active=true;gameNow+=18000;assert(!mercHudHtml().includes('17秒'));assert(!mercHudHtml().includes('merc-hud-text'));`,ctx);
console.log('PASS：6職業5等級空裝上限、Lv49新數值、武器／強化／魔杖／防具、增益分解、實際傷害與卸裝、底部技能／召喚倒數／增益／盾值、過期及收回隱藏、地圖無殘留狀態。');

