// Pure utility AI, usable unchanged by Node servers and the browser simulation.
(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;else root.FakePlayerBrain=api;})(typeof window!=='undefined'?window:globalThis,()=>{
 const clamp=(n,a,b)=>Math.max(a,Math.min(b,n)),distance=(a,b)=>Math.max(Math.abs(a.x-b.x),Math.abs(a.y-b.y));
 const PROFILES=[{name:'謹慎',courage:.25,greed:.35,error:.025},{name:'均衡',courage:.5,greed:.5,error:.045},{name:'好戰',courage:.8,greed:.4,error:.075},{name:'貪心',courage:.45,greed:.9,error:.08},{name:'探索',courage:.6,greed:.6,error:.06}];
 function hash(text){let n=2166136261;for(const c of String(text))n=Math.imul(n^c.charCodeAt(0),16777619);return n>>>0;}
 function random(b){let n=b.rng;n^=n<<13;n^=n>>>17;n^=n<<5;b.rng=n>>>0||1;return b.rng/4294967296;}
 function create(identity,saved=null,now=0){
  const seed=hash(identity)||1,brain={v:1,rng:seed,profile:{...PROFILES[seed%PROFILES.length]},reaction:300+seed%450,nextThink:0,target:null,commitUntil:0,last:null,dangers:[],species:{},attackers:{},blocked:{},nextMistake:0};
  if(saved?.v===1){
   for(const d of (Array.isArray(saved.dangers)?saved.dangers:[]).slice(-12))if([d.map,d.x,d.y,d.ttl,d.severity].every(Number.isFinite)&&d.ttl>0)brain.dangers.push({map:d.map,x:d.x,y:d.y,until:now+clamp(d.ttl,0,300000),severity:clamp(d.severity,0,5)});
   for(const [id,s]of Object.entries(saved.species||{}).slice(0,32))brain.species[id]={wins:clamp(Number(s.wins)||0,0,100),losses:clamp(Number(s.losses)||0,0,100)};
  }
  return brain;
 }
 function danger(b,point,map,now){return b.dangers.filter(d=>d.map===map&&d.until>now&&distance(d,point)<=4).reduce((s,d)=>s+d.severity,0);}
 function remember(b,event,info,now){
  if(event==='hurt'){if(info.id)b.attackers[info.id]={until:now+30000,species:info.species};const keys=Object.keys(b.attackers);for(const key of keys.slice(0,Math.max(0,keys.length-12)))delete b.attackers[key];b.nextThink=0;return;}
  if(event==='blocked'){b.blocked[info.id]=now+12000;if(b.target===info.id){b.target=null;b.last=null;b.nextThink=0;}return;}
  if(event==='win'||event==='death'){const key=String(info.species||'unknown'),s=b.species[key]??={wins:0,losses:0};s[event==='win'?'wins':'losses']=Math.min(100,s[event==='win'?'wins':'losses']+1);}
  if(event==='death'||event==='retreat'){
   const d={map:info.map,x:info.x,y:info.y,until:now+(event==='death'?300000:90000),severity:event==='death'?3:1};
   b.dangers=b.dangers.filter(x=>x.until>now&&!(x.map===d.map&&distance(x,d)<=2));b.dangers.push(d);b.dangers=b.dangers.slice(-12);b.target=null;b.last=null;b.commitUntil=0;
  }
  b.nextThink=0;
 }
 function checkpoint(b,now){return {v:1,dangers:b.dangers.filter(d=>d.until>now).map(d=>({map:d.map,x:d.x,y:d.y,severity:d.severity,ttl:d.until-now})),species:b.species};}
 function observe(b,c){return (c.enemies||[]).filter(e=>e.alive!==false&&e.visible!==false&&e.lineOfSight!==false&&e.map===c.map&&distance(c,e)<=(c.vision||12));}
 function candidates(b,c){return observe(b,c).filter(e=>!e.safe&&!e.playerClaim&&!e.claimedOther&&(!e.engaged||e.attackingSelf)&&!(b.blocked[e.id]>c.now));}
 function targetScore(b,c,e,seen){const level=Math.max(1,c.level),hp=clamp(c.hp/Math.max(1,c.maxHp),0,1),s=b.species[String(e.species)]||{wins:0,losses:0};
  const risk=Math.max(0,e.level-level)*5+(e.boss?32:0)+(1-hp)*26+danger(b,e,c.map,c.now)*24+s.losses*12;
  const crowd=seen.filter(m=>m.id!==e.id&&distance(m,e)<3).length;
  return 35+Math.min(14,e.level/level*8)+Math.min(12,Number(e.value)||0)*b.profile.greed+(e.quest?16:0)+Math.min(5,s.wins)-distance(c,e)*(1.4-b.profile.greed*.3)-risk*(1.3-b.profile.courage*.7)-crowd*(4-b.profile.courage*2);
 }
 function decide(b,c){
  const hp=clamp(c.hp/Math.max(1,c.maxHp),0,1),seen=observe(b,c),targets=candidates(b,c),threats=c.safe?[]:seen.filter(e=>e.attackingSelf||b.attackers[e.id]?.until>c.now||e.aggressive&&distance(c,e)<=3),critical=.44-b.profile.courage*.22;
  const valid=targets.find(e=>e.id===b.target),panic=threats.length>0&&(hp<critical||threats.length>=3&&hp<.65);
  if(c.now<b.nextThink&&!panic&&(!b.target||valid))return {...(b.last||{kind:'observe'}),held:true};
  b.dangers=b.dangers.filter(d=>d.until>c.now);for(const [id,until]of Object.entries(b.blocked))if(until<=c.now)delete b.blocked[id];
  const choices=[];
  if(panic)choices.push({kind:'retreat',score:100+(critical-hp)*100+threats.length*12});
  if(c.potions>0&&c.now>=(c.healAt||0)&&hp<.78)choices.push({kind:'heal',score:(1-hp)*100+threats.length*8-(c.potions<=2?14:0)});
  if(c.potions<=1||c.load>=c.capacity*.85)choices.push({kind:'restock',score:(c.potions<=0?65:c.potions<=1?40:0)+(c.load>=c.capacity*.85?45:0)-threats.length*20});
  const loot=(c.loot||[]).filter(l=>l.expires>c.now&&l.map===c.map&&distance(c,l)<=12).sort((a,b)=>b.value-a.value)[0];
  if(loot&&hp>.35&&threats.length===0)choices.push({kind:'loot',lootId:loot.id,score:30+loot.value*(1+b.profile.greed)-distance(c,loot)*1.5-danger(b,loot,c.map,c.now)*25});
  let best=targets.map(e=>({e,score:targetScore(b,c,e,seen)})).sort((a,b)=>b.score-a.score)[0];
  if(valid){const current=targetScore(b,c,valid,seen);if(c.now<b.commitUntil||!best||best.score<current+10)best={e:valid,score:current+4};}
  if(best&&best.score>0){const e=best.e;let kind=c.safe||distance(c,e)>c.reach?'approach':'attack';
   if(!c.safe&&distance(c,e)<=c.reach&&c.role==='法師'&&c.mp>=12&&threats.length&&hp<.65&&c.now>=(c.controlAt||0))kind='control';
   else if(!c.safe&&distance(c,e)<=c.reach&&c.role==='法師'&&c.mp>=24&&c.now>=(c.areaAt||0)&&targets.filter(t=>distance(t,e)<=2&&distance(c,t)<=c.reach).length>=3&&hp>.5)kind='area';
   else if(c.reach>1&&distance(c,e)<=2&&c.now>=(c.kiteAt||0)&&e.attackingSelf)kind='kite';
   choices.push({kind,targetId:e.id,score:best.score});}
  choices.sort((a,b)=>b.score-a.score);let plan=choices.find(a=>a.score>0)||{kind:random(b)<.22?'observe':'wander',score:0};
  // A rare short hesitation, never a random dangerous move, and never during emergencies.
  if(hp>.6&&threats.length===0&&c.now>=b.nextMistake&&random(b)<b.profile.error){plan={kind:'observe',score:0,reason:'hesitation'};b.nextMistake=c.now+16000;}
  if(plan.targetId&&plan.targetId!==b.target){b.target=plan.targetId;b.commitUntil=c.now+1800;}
  else if(!plan.targetId&&['restock','loot','retreat','wander'].includes(plan.kind))b.target=null;
  b.nextThink=c.now+b.reaction+(plan.kind==='observe'?650:0);b.last=plan;return {...plan,held:false};
 }
 return {create,remember,checkpoint,observe,candidates,targetScore,decide,danger,distance};
});
