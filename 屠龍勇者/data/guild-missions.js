// 十二項普通公會任務；位置以正式17景安全通行格校準，與可信重播端同源。
const GuildMissions = (() => {
    const VERSION='guild-missions-1';
    const defs={
        lostMiners:{name:'失聯採礦隊',start:'harbor',maps:['harbor','forest','mine','mineInner'],limit:7200,kind:'rescue',brief:'調查採礦紀錄、救出三名礦工、擊倒巨怪，至少兩人撤離。'},
        poisonHerbs:{name:'毒霧藥草',start:'port',maps:['port','smuggler','tidal'],limit:7200,kind:'gather',brief:'採集六株解毒草，擊倒蛛后；摧毀三個毒囊可減少毒霧傷害。'},
        tradeRoad:{name:'商道清剿',start:'harbor',maps:['harbor','forest','mine'],limit:7200,kind:'camps',brief:'清除三座營地、擊倒強盜首領；救援斥候可揭露弱點。'},
        ancientSeal:{name:'古墓封印',start:'port',maps:['port','smuggler','tidal'],limit:7200,kind:'ritual',brief:'到古墓啟動三座封印，各守護二十秒，再擊退守墓者。'},
        dragonOutpost:{name:'獵龍前哨',start:'foothills',maps:['foothills','forge','cave1','cave2','cave3','dragon'],limit:9000,kind:'dragon',brief:'清除山道與洞窟前哨、擊倒幼龍並撤離；殘留龍卵會孵化。'},
        lostBanner:{name:'失落旗幟',start:'harbor',maps:['harbor','coast','fortress'],limit:7200,kind:'flag',brief:'從堡壘取回公會旗幟，持旗時步速減半；避開或解除兩處警報。'},
        lastCampfire:{name:'最後營火',start:'forest',maps:['forest'],limit:9000,kind:'defense',brief:'到東岸營地啟動防衛，守住補給核心十分鐘；營火會治療附近友軍。'},
        northGate:{name:'北境城門',start:'fortress',maps:['fortress'],limit:9000,kind:'defense',brief:'到堡壘城門啟動十分鐘防衛，攔截兩路入侵與優先攻城的巨怪。'},
        sealKeeper:{name:'守護封印師',start:'tidal',maps:['tidal'],limit:9000,kind:'defense',brief:'保護封印師完成十分鐘施法；受擊會延誤儀式，摧毀遠程祭壇可減壓。'},
        refugeeEvacuation:{name:'難民撤離',start:'forest',maps:['forest','harbor'],limit:6000,kind:'refugees',brief:'到東岸營地接應十五名村民，分三批護送，至少十人返抵港村。'},
        crystalCart:{name:'魔晶運輸車',start:'foothills',maps:['foothills','forge'],limit:6000,kind:'cart',brief:'護送魔晶車經灰燼谷到廢棄鍛爐；靠近車輛才能前進，三處補給可修車。'},
        dragonTide:{name:'龍潮之夜',start:'dragon',maps:['dragon'],limit:9000,kind:'defense',brief:'守住獵龍弩炮十分鐘，最後擊退巨龍；友軍須在弩炮旁操作，保住兩座側塔可增加火力。'}
    };
    for(const [id,d]of Object.entries(defs)){d.id=id;Object.freeze(d.maps);Object.freeze(d);}Object.freeze(defs);
    function point(s,map,p,api){const a=api.near(s.worlds[map],p);return {x:a[0],y:a[1]};}
    function object(s,id,label,type,map,p,api,extra={}){const a=Object.assign(api.actor(id,label,[0,0],extra.hp||100),point(s,map,p,api),{map,type,done:false},extra);a.px=a.x;a.py=a.y;s.objects.push(a);return a;}
    function enemy(s,id,label,map,p,api,extra={}){try{point(s,map,p,api);}catch(e){const w=s.worlds[map];let best=null,dist=161;for(let i=0;i<w.mask.length;i++)if(w.mask[i]){const at=[i%w.width*4+2,Math.floor(i/w.width)*4+2],d=Math.hypot(at[0]-p[0],at[1]-p[1]);if(d<dist){dist=d;best=at;}}if(!best)throw e;p=best;}const a=Object.assign(api.actor('beast-'+id,label,[0,0],extra.hp||100),point(s,map,p,api),{map,active:false,boss:false},extra);a.px=a.x;a.py=a.y;s.enemies.push(a);return a;}
    function npc(s,id,label,map,p,api,extra={}){const a=Object.assign(api.actor('miner-'+id,label,[0,0],extra.hp||80),point(s,map,p,api),{map,rescued:false,evacuated:false},extra);a.px=a.x;a.py=a.y;s.miners.push(a);return a;}
    function site(map,i){return GUILD_MAP_DEFS[map].sites[i].slice(1);}
    function init(s,api){const id=s.missionId,d=defs[id];s.objects=[];s.enemies=[];s.miners=[];s.done={};s.supplies=3;s.stance='gather';s.wave=0;s.defendAt=null;s.ritualTicks=0;s.alarms=0;s.cartIndex=0;s.joinedGroups=0;s.delivery={map:d.start,p:site(d.start,0)};
        if(id==='poisonHerbs'){
            for(const [i,p]of [[0,[650,430]],[1,[1120,380]],[2,[1330,340]],[3,[350,440]],[4,[1000,480]],[5,[1230,420]]])object(s,'herb'+i,'解毒草 '+(i+1),'herb',i<3?'port':'smuggler',p,api);
            [[880,410],[1140,420],[1460,460]].forEach((p,i)=>object(s,'sac'+i,'毒囊 '+(i+1),'sac',i===2?'smuggler':'port',p,api));
            enemy(s,'spider0','毒霧巨蛛','port',[1120,380],api,{skin:'spider',hp:110});enemy(s,'spider1','毒牙蛛衛','smuggler',[1000,480],api,{skin:'spider',hp:120});enemy(s,'queen','毒霧蛛后','tidal',site('tidal',1),api,{skin:'spider',hp:330,boss:true});
        }else if(id==='tradeRoad'){
            [site('forest',1),site('forest',2),site('forest',3)].forEach((p,i)=>{object(s,'camp'+i,'強盜營地 '+(i+1),'camp','forest',p,api);enemy(s,'camp'+i,'商道掠奪者','forest',p,api,{group:'camp'+i,hp:125,skin:'bandit'});});
            npc(s,'scout','受困斥候','forest',[1240,430],api,{optional:true});enemy(s,'chief','強盜首領','mine',site('mine',1),api,{hp:340,boss:true,skin:'bandit'});
        }else if(id==='ancientSeal'){
            [[280,300],[450,290],[1170,400]].forEach((p,i)=>object(s,'seal'+i,'封印石 '+(i+1),'seal','tidal',p,api,{hp:500,protected:false,progress:0}));enemy(s,'keeper','守墓者','tidal',site('tidal',3),api,{hp:360,boss:true,skin:'undead'});
        }else if(id==='dragonOutpost'){
            [['foothills',site('foothills',1)],['forge',site('forge',0)],['cave2',site('cave2',1)]].forEach(([map,p],i)=>{object(s,'outpost'+i,'獵龍前哨 '+(i+1),'camp',map,p,api);enemy(s,'outpost'+i,'焰鱗守衛',map,p,api,{hp:130,group:'outpost'+i});});
            [[300,440],[1350,430],[740,730]].forEach((p,i)=>object(s,'egg'+i,'龍卵 '+(i+1),'egg','dragon',p,api));enemy(s,'youngDragon','赤翼幼龍','dragon',site('dragon',0),api,{hp:450,boss:true,skin:'dragon'});
        }else if(id==='lostBanner'){
            object(s,'flag','失落公會旗幟','flag','fortress',site('fortress',0),api);[[800,510],[1180,450]].forEach((p,i)=>object(s,'alarm'+i,'警報繩 '+(i+1),'alarm','fortress',p,api));enemy(s,'flagGuard','旗幟守衛','fortress',site('fortress',0),api,{hp:220,skin:'bandit'});
        }else if(d.kind==='defense'){
            const map=d.start,p=id==='lastCampfire'?site(map,3):id==='northGate'?site(map,1):id==='sealKeeper'?site(map,1):site(map,1);
            const core=object(s,'core',id==='lastCampfire'?'補給營火':id==='northGate'?'北境城門':id==='sealKeeper'?'封印師':'獵龍弩炮','core',map,p,api,{hp:1200,protected:true});s.delivery={map,p};
            if(id==='sealKeeper')[[1170,400],[1270,320]].forEach((p,i)=>object(s,'altar'+i,'遠程祭壇 '+(i+1),'altar',map,p,api));
            if(id==='dragonTide')[[260,480],[420,460]].forEach((p,i)=>object(s,'tower'+i,'側翼弩塔 '+(i+1),'tower',map,p,api,{hp:450,protected:true}));
            s.spawnPoints=[[-180,100],[180,100]].map(v=>{try{return point(s,map,[(core.x*4)+v[0],(core.y*4)+v[1]],api);}catch{return point(s,map,GUILD_MAP_DEFS[map].entries.start,api);}});
        }else if(id==='refugeeEvacuation'){
            for(let i=0;i<15;i++){const p=site('forest',3);npc(s,'villager'+i,'村民 '+(i+1),'forest',[p[0]+(i%3-1)*12,p[1]+Math.floor(i/3)*8],api,{hp:55,group:Math.floor(i/5)});}
            object(s,'group0','接應第一批村民','group','forest',site('forest',3),api,{group:0});object(s,'group1','接應第二批村民','group','forest',site('forest',3),api,{group:1});object(s,'group2','接應第三批村民','group','forest',site('forest',3),api,{group:2});
            [site('forest',2),[750,600],[390,800]].forEach((p,i)=>enemy(s,'refugeeRaid'+i,'追獵村民的掠奪者','forest',p,api,{hp:120,skin:'bandit'}));s.delivery={map:'harbor',p:site('harbor',0)};
        }else if(id==='crystalCart'){
            npc(s,'cart','魔晶運輸車','foothills',GUILD_MAP_DEFS.foothills.entries.start,api,{hp:800,vehicle:true,rescued:true});s.cartStops=[['foothills',site('foothills',0)],['foothills',site('foothills',1)],['foothills',GUILD_MAP_DEFS.foothills.entries.east],['forge',site('forge',0)]];
            [['foothills',[570,360]],['foothills',[1130,530]],['forge',[620,550]]].forEach(([map,p],i)=>object(s,'supply'+i,'補給箱 '+(i+1),'supply',map,p,api));
            enemy(s,'cartRaid0','灰燼谷伏兵','foothills',site('foothills',1),api,{hp:180});enemy(s,'cartRaid1','鍛爐劫掠者','forge',[620,550],api,{hp:220});s.delivery={map:'forge',p:site('forge',0)};
        }
    }
    function canDeliver(s,api){const d=defs[s.missionId],bosses=s.enemies.filter(e=>e.boss),allBosses=()=>bosses.every(e=>e.hp<=0);
        if(d.kind==='gather')return s.objects.filter(o=>o.type==='herb'&&o.done).length===6&&allBosses();
        if(d.kind==='camps')return s.objects.filter(o=>o.type==='camp'&&o.done).length===3&&allBosses();
        if(d.kind==='ritual')return s.objects.filter(o=>o.type==='seal'&&o.done).length===3&&allBosses();
        if(d.kind==='dragon')return s.objects.filter(o=>o.type==='camp'&&o.done).length===3&&allBosses();
        if(d.kind==='flag')return !!s.flag;
        if(d.kind==='defense')return s.defendAt!==null&&(s.missionId==='sealKeeper'?s.ritualTicks>=6000:s.tick-s.defendAt>=6000)&&s.objects.find(o=>o.id==='core').hp>0&&(s.missionId!=='dragonTide'||bosses.length>0&&allBosses());
        if(d.kind==='refugees')return s.miners.filter(m=>m.hp>0&&m.evacuated).length>=10;
        if(d.kind==='cart')return s.cartIndex>=s.cartStops.length&&!s.cartGuard&&s.miners[0].hp>0&&api.distance(s.party[0],s.miners[0])<=100;
        return false;
    }
    function command(s,type,arg,api){const hero=s.party[0],d=defs[s.missionId];
        if(type==='stance'){if(!['gather','hold','retreat'].includes(arg))return false;s.stance=arg;s.focus=null;return true;}
        if(type==='deliver'){const p=s.delivery.p;if(s.map!==s.delivery.map||s.route.length||Math.hypot(hero.x*4+2-p[0],hero.y*4+2-p[1])>48||!canDeliver(s,api))return false;s.phase='success';for(const m of s.miners)if(m.rescued&&m.hp>0&&api.distance(hero,m)<=64)m.evacuated=true;return true;}
        if(type==='interact'||type==='repair'){const o=s.objects.find(o=>o.id===arg&&o.map===s.map&&o.hp>0);if(!o||s.route.length||api.distance(hero,o)>44||!api.sight(s,hero,o)||s.rescue)return false;
            if(type==='repair'){if(!o.protected||o.hp>=o.maxHp||!s.supplies)return false;}
            else if(o.done||o.type==='core'&&s.defendAt!==null||o.type==='group'&&o.group!==s.joinedGroups||o.type==='camp'&&s.enemies.some(e=>e.group===o.id&&e.hp>0)||o.type==='seal'&&s.objects.some(a=>a.type==='seal'&&a.protected&&!a.done))return false;
            s.rescue={id:o.id,kind:type,until:s.tick+30,damage:s.damage,x:hero.x,y:hero.y};return true;}
        return false;
    }
    function complete(s,r,api){const o=s.objects.find(o=>o.id===r.id);if(!o||o.map!==s.map||o.hp<=0||api.distance(s.party[0],o)>44)return;
        if(r.kind==='repair'){if(s.supplies&&o.protected){o.hp=Math.min(o.maxHp,o.hp+Math.ceil(o.maxHp*.3));s.supplies--;}return;}
        if(o.type==='core'){s.defendAt=s.tick;o.done=true;return;}
        if(o.type==='seal'){o.protected=true;o.progress=1;for(let i=0;i<2;i++)enemy(s,'ritual'+o.id+i,'封印追獵者',s.map,[o.x*4+(i?100:-100),o.y*4+80],api,{hp:90,attack:34,assault:true,skin:'undead'});return;}
        if(o.type==='group'){s.miners.filter(m=>m.group===o.group).forEach(m=>{m.rescued=true;});s.joinedGroups++;}
        if(o.type==='flag')s.flag=true;
        if(o.type==='supply'){s.supplies++;const cart=s.miners.find(m=>m.vehicle);if(cart)cart.hp=Math.min(cart.maxHp,cart.hp+200);}
        o.done=true;
    }
    function update(s,api){const id=s.missionId,d=defs[id],hero=s.party[0];
        if(id==='poisonHerbs'&&s.tick%30===0&&['port','smuggler'].includes(s.map)){const n=s.objects.filter(o=>o.type==='sac'&&!o.done&&o.map===s.map&&api.distance(hero,o)<=180).length;if(n)for(const a of s.party)if(a.hp>0)api.hit(s,a,n,false);}
        if(id==='tradeRoad'&&s.miners.some(m=>m.rescued)){const boss=s.enemies.find(e=>e.boss);boss.vulnerable=true;}
        if(id==='dragonOutpost'){const boss=s.enemies.find(e=>e.boss);if(boss.active&&!s.hatched){s.hatched=true;s.objects.filter(o=>o.type==='egg'&&!o.done).forEach((o,i)=>enemy(s,'hatch'+i,'破殼幼獸',o.map,[o.x*4+2,o.y*4+2],api,{hp:70,active:true}));}}
        if(id==='lostBanner')for(const o of s.objects.filter(o=>o.type==='alarm'&&!o.done&&o.map===s.map))if(api.distance(hero,o)<28){o.done=true;o.triggered=true;s.alarms++;enemy(s,'alarm'+o.id,'警報增援',s.map,[o.x*4+60,o.y*4+60],api,{hp:110,active:true,skin:'bandit'});}
        if(d.kind==='ritual')for(const o of s.objects.filter(o=>o.type==='seal'&&o.protected&&!o.done)){if(!o.hp){s.phase='failed';s.reason='封印石已被摧毀';return;}o.progress++;if(o.progress>=200){o.done=true;o.protected=false;}}
        if(d.kind==='defense'&&s.defendAt!==null){const core=s.objects.find(o=>o.id==='core'),elapsed=s.tick-s.defendAt;if(!core.hp){s.phase='failed';s.reason=core.label+'已被摧毀';return;}
            const wave=Math.floor(elapsed/400)+1;if(wave>s.wave&&elapsed<5700){s.wave=wave;const lane=s.wave%2,p=s.spawnPoints[lane];enemy(s,'wave'+s.wave,s.missionId==='northGate'&&wave%3===0?'攻城巨怪':s.missionId==='sealKeeper'?'遠程咒術師':'入侵掠奪者',s.map,[p.x*4+2,p.y*4+2],api,{hp:wave%3===0?140:90,assault:true,siege:id==='northGate'&&wave%3===0,reach:id==='sealKeeper'?140:36,attack:id==='northGate'&&wave%3===0?25:9});}
            if(id==='lastCampfire'&&s.tick%30===0)for(const a of s.party)if(a.hp>0&&api.distance(a,core)<=140)a.hp=Math.min(a.maxHp,a.hp+10);
            if(id==='sealKeeper'){if(!s.enemies.some(e=>e.hp>0&&e.active&&e.map===s.map&&api.distance(e,core)<=150))s.ritualTicks++;if(s.tick%30===0)for(const altar of s.objects.filter(o=>o.type==='altar'&&!o.done))api.hit(s,core,3);}
            if(id==='dragonTide'){if(elapsed>=5400&&!s.finalDragon){s.finalDragon=true;enemy(s,'finalDragon','熔火巨龍',s.map,[core.x*4+160,core.y*4+100],api,{hp:900,boss:true,active:true,assault:true,skin:'dragon',attack:24});}if(s.tick%10===0&&s.party.some(a=>a.hp>0&&api.distance(a,core)<=140)){const target=s.enemies.find(e=>e.hp>0&&e.active&&e.map===s.map);if(target){const towers=s.objects.filter(o=>o.type==='tower'&&o.hp>0).length;api.hit(s,target,8+towers*3);}}}
        }
        if(d.kind==='refugees'&&s.map==='harbor'){const dest=point(s,'harbor',s.delivery.p,api);for(const m of s.miners)if(m.rescued&&m.hp>0&&api.distance(m,dest)<=64){m.evacuated=true;m.rescued=false;}}
        if(d.kind==='refugees'&&s.miners.filter(m=>m.hp>0).length<10){s.phase='failed';s.reason='已無法讓十名村民撤離';}
        if(d.kind==='cart'){const cart=s.miners[0];if(!cart.hp){s.phase='failed';s.reason='魔晶運輸車已被摧毀';return;}if(s.cartGuard){if(s.enemies.some(e=>e.group===s.cartGuard&&e.hp>0))return;s.cartGuard=null;}const stop=s.cartStops[s.cartIndex];if(stop&&stop[0]===s.map){const p=point(s,s.map,stop[1],api);if(api.distance(cart,p)<12){s.cartIndex++;s.cartGuard='cartStop'+s.cartIndex;for(let i=0;i<2;i++)enemy(s,s.cartGuard+i,'劫掠車隊的伏兵',s.map,[cart.x*4+(i?90:-90),cart.y*4+60],api,{hp:90,active:true,group:s.cartGuard,targetId:cart.id});}else if(api.distance(hero,cart)<=140&&!s.enemies.some(e=>e.map===s.map&&e.hp>0&&e.active&&api.distance(e,cart)<50))api.approach(s,cart,p,8);}}
        if(d.kind==='defense'&&s.defendAt===null&&s.tick>=3000){s.phase='failed';s.reason='未及時抵達並啟動防衛';}
    }
    function rating(s){const id=s.missionId,d=defs[id];if(s.phase!=='success')return false;
        if(d.kind==='gather')return s.objects.filter(o=>o.type==='sac').every(o=>o.done);
        if(d.kind==='camps')return s.miners.some(m=>m.rescued&&m.hp>0);
        if(d.kind==='ritual')return s.objects.filter(o=>o.type==='seal').every(o=>o.hp>=o.maxHp*.5);
        if(d.kind==='dragon')return s.objects.filter(o=>o.type==='egg').every(o=>o.done);
        if(d.kind==='flag')return !s.alarms;
        if(id==='lastCampfire')return s.objects.find(o=>o.id==='core').hp>=900;
        if(id==='northGate')return s.enemies.filter(e=>e.siege).every(e=>e.hp===0&&!e.objectiveHits);
        if(id==='sealKeeper')return s.objects.filter(o=>o.type==='altar').every(o=>o.done);
        if(id==='dragonTide')return s.objects.filter(o=>o.type==='tower').every(o=>o.hp>0);
        if(d.kind==='refugees')return s.miners.every(m=>m.hp>0&&m.evacuated);
        if(d.kind==='cart')return s.objects.filter(o=>o.type==='supply').every(o=>o.done);
        return false;
    }
    function actions(s){const a=s.objects.filter(o=>o.map===s.map&&o.hp>0&&!o.done&&o.type!=='tower').map(o=>({label:o.type==='core'?'啟動十分鐘防衛':o.label,type:'interact',id:o.id}));for(const o of s.objects.filter(o=>o.map===s.map&&o.protected&&o.hp>0&&o.hp<o.maxHp&&s.supplies))a.push({label:'修復'+o.label+'（補給'+s.supplies+'）',type:'repair',id:o.id});return a;}
    function summary(s){const d=defs[s.missionId],o=s.objects,core=o.find(a=>a.id==='core');let progress='';if(d.kind==='gather')progress='藥草 '+o.filter(a=>a.type==='herb'&&a.done).length+'/6';if(['camps','dragon'].includes(d.kind))progress='營地 '+o.filter(a=>a.type==='camp'&&a.done).length+'/3';if(d.kind==='ritual')progress='封印 '+o.filter(a=>a.type==='seal'&&a.done).length+'/3'+(o.some(a=>a.type==='seal'&&a.protected&&!a.done)?' · 儀式 '+Math.floor(o.find(a=>a.type==='seal'&&a.protected&&!a.done).progress/10)+'/20秒':'');if(d.kind==='flag')progress=s.flag?'旗幟已取回，步速減半':'尚未取旗';if(d.kind==='refugees')progress='撤離 '+s.miners.filter(m=>m.evacuated).length+'/15 · 已接應 '+s.joinedGroups+'/3批';if(d.kind==='cart')progress='車輛 '+s.miners[0].hp+'/'+s.miners[0].maxHp+' · 路段 '+s.cartIndex+'/4';if(d.kind==='defense')progress=core.label+' '+core.hp+'/'+core.maxHp+' · '+(s.defendAt===null?'尚未啟動':idTime(s));const bosses=s.enemies.filter(e=>e.boss);if(bosses.length)progress+=' · 首領 '+bosses.filter(e=>!e.hp).length+'/'+bosses.length;const extra={poisonHerbs:['sac','毒囊'],dragonOutpost:['egg','龍卵'],sealKeeper:['altar','祭壇'],crystalCart:['supply','補給箱']}[s.missionId];if(extra){const list=o.filter(a=>a.type===extra[0]);progress+=' · '+extra[1]+' '+list.filter(a=>a.done).length+'/'+list.length;}if(d.kind==='flag')progress+=' · 警報觸發 '+s.alarms+' 次';return '剩餘 '+Math.max(0,Math.ceil((s.limit-s.tick)/10))+' 秒 · '+progress;}
    function idTime(s){return '防衛 '+Math.floor((s.missionId==='sealKeeper'?s.ritualTicks:s.tick-s.defendAt)/10)+'/600秒';}
    return Object.freeze({VERSION,defs,init,command,complete,update,canDeliver,rating,actions,summary});
})();
