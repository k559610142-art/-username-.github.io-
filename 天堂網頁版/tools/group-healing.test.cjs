const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
test('範圍治癒只補同圖十格內存活寵物及自己的隊友，失敗還原',()=>{
 const mob=(x=11,mapId=0,hp=40)=>({x,y:10,hp,spawn:{mapId,npc:{hp:50}},fp:{partyOwner:'hero'}});
 const pet=mob(),mate=mob(),far=mob(21),dead=mob(11,0,0),other=mob(11,4),enemy=mob();enemy.fp.partyOwner='other';const wall=mob(12);
 const c={activeCharacterId:'hero',activeMapId:0,worldX:10,worldY:10,Summons:{snapshot:[{}],mobs:[pet,far,dead,other,wall]},NpcSocial:{party:[mate,enemy]},IslandCombat:{clearShot:(x,y,tx)=>tx!==12},IslandMonsters:{playEffect(){}},movementTime:()=>0,GameEntry:{saveActive:()=>true}};c.window=c;vm.createContext(c);vm.runInContext(fs.readFileSync(path.join(__dirname,'../data/group-healing.js'),'utf8'),c);
 assert.equal(c.GroupHealing.applyAllies({id:49},20),2);assert.equal(pet.hp,50);assert.equal(mate.hp,50);for(const m of [far,other,enemy,wall])assert.equal(m.hp,40);assert.equal(dead.hp,0);
 pet.hp=20;c.GameEntry.saveActive=()=>false;assert.equal(c.GroupHealing.applyAllies({id:164},15),0);assert.equal(pet.hp,20);assert.equal(c.GroupHealing.applyAllies({id:1},20),0);
});
test('伺服器範圍治癒補自己及在線隊友、扣魔，精神提高補量',async()=>{
 const {createGameServer}=require('../data/server/local-test-server.cjs'),server=createGameServer({database:':memory:',settings:{items:{},classes:{騎士:{base:{str:20,dex:15,con:10,wis:10,cha:10,int:10},points:0}}}});await new Promise(r=>server.listen(0,'127.0.0.1',r));const base='http://127.0.0.1:'+server.address().port;
 async function api(route,data,cookie,method='POST'){const r=await fetch(base+route,{method,headers:{'Content-Type':'application/json',...(cookie?{Cookie:cookie}:{})},...(data?{body:JSON.stringify(data)}:{})});const result=await r.json();assert.equal(r.status,200,JSON.stringify(result));return {data:result,cookie:r.headers.get('set-cookie')?.split(';')[0]};}
 async function user(name){const a=await api('/api/auth',{name,password:'testpass',register:true});await api('/api/state',{revision:0,characters:[{id:name,name,role:'騎士',gender:0,stats:{str:20,dex:15,con:10,wis:10,cha:10,int:10},level:30,hp:25,maxHp:100,mp:200,maxMp:200,mapId:0,x:32600,y:32600,skills:{ids:[49,164]},inventory:[]},null,null,null],warehouse:[]},a.cookie,'PUT');return a.cookie;}
 try{const a=await user('healer'),b=await user('mate');await api('/api/groups/create',{characterId:'healer',kind:'party',name:'治癒隊伍'},a);const social=(await api('/api/social?characterId=healer',null,a,'GET')).data,groupId=social.groups[0].id;await api('/api/groups/invite',{characterId:'healer',groupId,name:'mate'},a);const invites=(await api('/api/social?characterId=mate',null,b,'GET')).data;await api('/api/groups/accept',{characterId:'mate',inviteId:invites.invites[0].id},b);await api('/api/presence',{characterId:'mate'},b);
 const result=(await api('/api/party/heal',{characterId:'healer',skillId:49,wis:30,int:10},a)).data;assert.equal(result.amount,12);assert.equal(result.healed.length,1);assert.equal(result.healed[0].hp,37);assert(result.cost>0);assert.equal(result.state.characters[0].hp,37);assert.equal(result.state.characters[0].mp,200-result.cost);
 const low=(await api('/api/party/heal',{characterId:'healer',skillId:164,wis:10,int:127},a)).data;assert.equal(low.amount,10);
 }finally{await new Promise(r=>server.close(r));}
});
