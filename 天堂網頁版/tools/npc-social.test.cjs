const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const source=fs.readFileSync(require('node:path').join(__dirname,'../data/npc-social.js'),'utf8');

function fixture(){
 let clock=1000,rows=[{uid:'potion',key:'etcitem:40010',count:8,slot:null}],failSave=false;
 const intervals=[],timeouts=[],messages=[],effects=[],transfers=[],hits=[];
 function element(tag){return {tag,children:[],append(...nodes){this.children.push(...nodes);},replaceChildren(...nodes){this.children=nodes;},setAttribute(){},remove(){this.removed=true;},focus(){}};}
 const game=element('div'),document={createElement:element,head:element('head'),querySelector:q=>q==='.game'?game:null};
 const c={window:{activeCharacterId:'hero',activeMapId:0,gameFlowState:'playing'},document,worldX:32583,worldY:32924,
  movementTime:()=>clock,tile:()=>16,TeleportScrolls:{canLand:()=>true},CharacterActions:{dead:false},
  INTERFACE_CATALOG:{items:[{id:40010,kind:'etcitem',name:'治癒藥水'},{id:40308,kind:'etcitem',name:'金幣'}]},
  NATIVE_NPC_DIALOGS:{shops:{one:[[40010,0,100,1,0,0]]}},
  setInterval:fn=>{intervals.push(fn);},setTimeout:fn=>{timeouts.push(fn);},
  OwnedInventory:{get snapshot(){return structuredClone(rows);},applyChange(next){if(failSave)return false;rows=structuredClone(next);return true;}},
  IslandCombat:{clearShot:()=>true},IslandMonsters:{botList:[],occupied:()=>false,target:null,
   playEffect:(...args)=>effects.push(args),transferBot(b,map,x,y){transfers.push({b,map,x,y});b.spawn.mapId=map;b.x=b.homeX=x;b.y=b.homeY=y;b.step=null;b.fp.route=null;},
   botHit:(...args)=>hits.push(args)}
 };
 c.window.GameChat={say:(text,kind)=>messages.push({text,kind})};
 vm.createContext(c);vm.runInContext(source,c);
 const social=c.window.NpcSocial;
 function bot(name='小雨點'){const b={x:c.worldX+4,y:c.worldY,hp:200,homeX:c.worldX+4,homeY:c.worldY,spawn:{mapId:c.window.activeMapId,npc:{name,hp:200,level:10,ranged:1}},fp:{look:{role:'騎士',attackMs:640},ready:0}};c.IslandMonsters.botList.push(b);return b;}
 return {c,social,bot,game,messages,effects,transfers,hits,timeouts,tick(){intervals[0]();},advance(ms){clock+=ms;},get rows(){return rows;},set rows(v){rows=v;},set failSave(v){failSave=v;}};
}
function negotiate(f,text='我有紅水，賣給你 2 瓶'){
 const b=f.bot();f.social.onSpeech(b,'誰有多的紅水');assert.equal(f.social.handleWhisper('小雨點',text),true);return b;
}
function arrive(f,b){
 f.social.handleWhisper('小雨點','到騎村交易');f.advance(2500);f.tick();assert.equal(b.fp.hidden,true);
 f.c.window.activeMapId=4;f.c.worldX=33080;f.c.worldY=33395;f.tick();assert.equal(b.fp.hidden,false);
 f.social.update(b,f.c.movementTime(),()=>true);assert.equal(f.social.meeting.stage,'ready');
}
test('收購喊話 → 密語 → 騎村跨圖碰面 → 確認交易 → 離開，不重複成交',()=>{
 const f=fixture(),b=negotiate(f);assert.equal(f.social.meeting.price,70);assert.equal(f.social.meeting.qty,2);
 arrive(f,b);assert.equal(f.transfers[0].map,4);assert.equal(f.rows[0].count,8);
 assert.equal(f.social.completeTrade(2),'');assert.equal(f.rows.find(r=>r.uid==='potion').count,6);assert.equal(f.rows.find(r=>r.key==='etcitem:40308').count,140);
 assert.equal(f.social.meeting,null);assert.equal(b.fp.social,'leaving');const saved=JSON.stringify(f.rows);assert.notEqual(f.social.completeTrade(2),'');assert.equal(JSON.stringify(f.rows),saved);
 f.advance(4000);f.social.update(b,f.c.movementTime(),()=>true);assert.equal(b.fp.hidden,true);assert.ok(b.fp.vanish>f.c.movementTime());
});
test('給你視為贈送；遠距、裝備數量不足和存檔失敗都不能扣物品',()=>{
 const f=fixture(),b=negotiate(f,'我有東西，要給你');assert.equal(f.social.meeting.price,0);const before=JSON.stringify(f.rows);
 assert.notEqual(f.social.completeTrade(1),'');assert.equal(JSON.stringify(f.rows),before);arrive(f,b);
 f.rows=[{uid:'equipped',key:'etcitem:40010',count:8,slot:'weapon'},{uid:'enchanted',key:'etcitem:40010',count:8,enchant:3}];const protectedRows=JSON.stringify(f.rows);
 assert.notEqual(f.social.completeTrade(1),'');assert.equal(JSON.stringify(f.rows),protectedRows);
 f.rows=[{uid:'potion',key:'etcitem:40010',count:3,slot:null}];f.failSave=true;assert.notEqual(f.social.completeTrade(1),'');assert.equal(f.rows[0].count,3);assert.ok(f.social.meeting);
 f.failSave=false;assert.equal(f.social.completeTrade(1),'');assert.equal(f.rows[0].count,2);assert.equal(f.rows.length,1);
});
test('交易期間可密語追問、取消；換角色與逾時會取消交易',()=>{
 const f=fixture();negotiate(f);assert.equal(f.social.handleWhisper('小雨點','你在哪個村莊'),true);assert.equal(f.social.meeting.destination,null,'詢問位置不會被誤認為改約目前村莊');f.social.handleWhisper('小雨點','取消');assert.equal(f.social.meeting,null);
 negotiate(f);f.advance(301000);f.tick();assert.equal(f.social.meeting,null);assert.equal(f.rows[0].count,8);
 f.social.onSpeech(f.c.IslandMonsters.botList[0],'誰有多的紅水');f.social.handleWhisper('小雨點','我有紅水');assert.ok(f.social.meeting);f.c.window.activeCharacterId='other';f.tick();assert.equal(f.social.meeting,null);
});
test('NPC 先邀請，玩家接受才入隊；隊友跟隨跨圖且只幫打野外怪物',()=>{
 const f=fixture(),b=f.bot();f.social.onSpeech(b,'組隊打怪，缺補');assert.equal(f.social.party.length,0);assert.ok(f.messages.some(m=>m.text.includes('邀請')||m.text.includes('組隊')));
 f.social.handleWhisper('小雨點','好，組隊');assert.equal(f.social.party.length,1);
 f.c.window.activeMapId=4;f.c.worldX=33080;f.c.worldY=33395;f.tick();assert.equal(b.spawn.mapId,4);
 b.x=f.c.worldX+1;b.y=f.c.worldY;const target={x:b.x+1,y:b.y,hp:20,spawn:{npc:{level:2}}};f.c.IslandMonsters.target=target;
 f.social.update(b,f.c.movementTime(),()=>true);assert.equal(f.timeouts.length,0,'村莊內不發動攻擊');
 f.c.tile=()=>1;f.social.update(b,f.c.movementTime(),()=>true);assert.equal(f.timeouts.length,1);f.timeouts[0]();assert.equal(f.hits.length,1);assert.equal(f.hits[0][2].party,true);
 f.advance(2000);f.social.update(b,f.c.movementTime(),()=>true);f.c.tile=()=>16;f.timeouts[1]();assert.equal(f.hits.length,1,'進村後取消延遲傷害');
 f.social.handleWhisper('小雨點','離隊');assert.equal(f.social.party.length,0);
});
test('社交視窗呈現交易確認、數量、總金額、隊伍與附近玩家',()=>{
 const f=fixture();negotiate(f);f.social.open();const text=node=>[node.textContent||'',...(node.children||[]).map(text)].join(' ');const rendered=text(f.game);
 assert.match(rendered,/確認交易/);assert.match(rendered,/總金額：140/);assert.match(rendered,/約銀騎士村莊/);assert.match(rendered,/目前隊伍/);assert.match(rendered,/附近玩家/);
});
test('實際地圖人口管理轉移同一人物，首次進圖仍生成原有怪物，不留下分身',()=>{
 const source=fs.readFileSync(require('node:path').join(__dirname,'../data/island-monsters.js'),'utf8');
 const b={spawn:{bot:true,mapId:0},fp:{},x:1,y:1},monster={spawn:{mapId:0}},c={window:{activeMapId:0},populationMap:0,mobs:[b,monster],populations:new Map(),incomingBots:new Map(),taken:new Set(),selected:b,occupancyTick:0};
 c.seedPopulation=()=>c.mobs.push({spawn:{mapId:c.window.activeMapId},seeded:true});vm.createContext(c);
 vm.runInContext(source.slice(source.indexOf('  function ensurePopulation('),source.indexOf('  function startStep(')),c);
 c.transferBot(b,4,33080,33395);assert.equal(c.mobs.includes(b),false);assert.equal(c.incomingBots.get(4)[0],b);
 c.window.activeMapId=4;c.ensurePopulation();assert.ok(c.mobs.some(m=>m.seeded));assert.equal(c.mobs.filter(m=>m===b).length,1);
 c.window.activeMapId=0;c.ensurePopulation();assert.equal(c.mobs.includes(monster),true);assert.equal(c.mobs.includes(b),false);
 c.transferBot(b,0,32583,32924);assert.equal(c.mobs.filter(m=>m===b).length,1);assert.equal(c.populations.get(4).includes(b),false);
});
test('隊友擊殺走正式獎勵流程；存檔失敗不擊殺，也不重複發獎',()=>{
 const source=fs.readFileSync(require('node:path').join(__dirname,'../data/island-monsters.js'),'utf8');let awards=0,save=true;
 const c={PlayerProgression:{award:()=>{awards++;return save;}},CombatSound:{monsterHit(){}},movementTime:()=>1000,Math,selected:null,islandMonsterFrames:{},loadSheet(){}};vm.createContext(c);
 vm.runInContext(source.slice(source.indexOf("  function markDead("),source.indexOf("  function damage(")),c);
 const body=source.slice(source.indexOf('    botHit(mob,amount,options={})'),source.indexOf('    transferBot,get botList'));
 vm.runInContext('globalThis.api={'+body+'};',c);
 const mob={hp:10,spawn:{respawn:[1,2],npc:{gfx:1}}};save=false;assert.equal(c.api.botHit(mob,20,{party:true}),false);assert.equal(mob.hp,10);
 save=true;assert.equal(c.api.botHit(mob,20,{party:true}),true);assert.equal(mob.hp,0);assert.equal(awards,2);
 assert.equal(c.api.botHit(mob,20,{party:true}),false);assert.equal(awards,2);
 const other={hp:10,spawn:{respawn:[1,2],npc:{gfx:1}}};c.api.botHit(other,20);assert.equal(awards,2,'路人假人擊殺不發玩家獎勵');
});
